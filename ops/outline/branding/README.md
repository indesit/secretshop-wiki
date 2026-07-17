# Outline branding PoC — CSS injection via reverse proxy

Outline has **no supported mechanism** for custom CSS/JS. This PoC injects a
same-origin stylesheet into every HTML page by inserting a tiny proxy between
Caddy and Outline. It is **unsupported and fragile** — treat it as a spike, not
production infrastructure.

```
Caddy (:443) ──▶ inject-proxy (:3100) ──▶ Outline (:3000)
                      │
                      └── serves /__brand/outline-custom.css and injects
                          <link …> before </head> on text/html responses
```

## Why this works here

- Outline's CSP is `style-src 'self' 'unsafe-inline'`. A stylesheet served from
  the **same origin** (`wiki.secretshop.ua/__brand/…`) is allowed. No CSP change
  needed. External font/CSS hosts would be blocked (`font-src`/`style-src`).
- Standard Caddy 2.6.2 can't rewrite response bodies (no `replace_response`
  module, no nginx `sub_filter`). The small Node proxy does the rewrite instead,
  avoiding an `xcaddy` custom build.

## Files

- `inject-proxy.mjs` — zero-dependency Node reverse proxy (Node ≥ 18).
- `outline-custom.css` — the injected styles. Edit this; the proxy serves it live
  (no restart needed for CSS-only changes).

## Verified (PoC)

Against the live Outline on `127.0.0.1:3000`:
- `<link … data-brand-inject>` inserted before `</head>`; `Content-Length` fixed.
- CSS route returns `200 text/css`, same-origin ⇒ passes CSP.
- CSP header passed through unchanged; non-HTML responses stream untouched.
- WebSocket upgrades proxied raw (realtime editing keeps working).

## Try it without touching prod

```bash
cd ops/outline/branding
INJECT_PORT=3100 node inject-proxy.mjs
# then browse the proxy directly and confirm the tag is present:
curl -s http://127.0.0.1:3100/ | grep data-brand-inject
```

## Wire into prod (manual, reversible)

1. Run the proxy as a systemd unit (mirrors the existing wiki-* services):

   `/etc/systemd/system/outline-brand-proxy.service`
   ```ini
   [Unit]
   Description=Outline branding inject-proxy
   After=network-online.target
   [Service]
   WorkingDirectory=/root/company-wiki/ops/outline/branding
   ExecStart=/usr/bin/node /root/company-wiki/ops/outline/branding/inject-proxy.mjs
   Environment=INJECT_PORT=3100 UPSTREAM_PORT=3000
   Restart=on-failure
   [Install]
   WantedBy=multi-user.target
   ```
   ```bash
   systemctl daemon-reload && systemctl enable --now outline-brand-proxy
   ```

2. In `/etc/caddy/Caddyfile`, point the Outline route at the proxy — change the
   **final** upstream in the `wiki.secretshop.ua` block from `3000` to `3100`:
   ```diff
   -		reverse_proxy 127.0.0.1:3000
   +		reverse_proxy 127.0.0.1:3100
   ```
   (Leave the MinIO `/outline*` routes on `:9000` as-is.)
   ```bash
   caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
   ```

## Rollback

Revert the one Caddy line to `:3000` and `systemctl reload caddy`. Optionally
`systemctl disable --now outline-brand-proxy`. No Outline data is touched.

## Limits / risks

- **Fragile:** targets Outline's HTML shell and theme variables. An Outline
  upgrade can change the DOM/variables and silently neutralize the CSS. Keep
  `outline-custom.css` defensive (variables + semantic selectors, no hashed
  class names).
- **Extra hop:** all HTML now buffers through Node. Fine at this traffic level;
  not a general-purpose proxy.
- **Not upstream-supported:** you own this forever. For anything deeper than
  color/spacing, forking Outline (custom Docker image) is the honest path — or
  keep heavy design in the VitePress layer, which is built for it.
```
