# Outline branding — CSS injection via reverse proxy

**Status: LIVE in prod** since 2026-07-17. `wiki.secretshop.ua` is proxied
through `outline-brand-proxy` (systemd, port `:3100`) instead of hitting
Outline (`:3000`) directly.

Outline has **no supported mechanism** for custom CSS/JS. This injects a
same-origin stylesheet into every HTML page via a tiny proxy between Caddy and
Outline. It remains **unsupported and fragile** — an Outline upgrade can
silently break it (see Limits below) — but it is running, not just a spike.

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

## Current prod wiring

1. **systemd unit** (installed, `enabled` — survives reboot and process crashes):

   `/etc/systemd/system/outline-brand-proxy.service`
   ```ini
   [Unit]
   Description=Outline branding inject-proxy (CSS injection PoC)
   After=network-online.target
   Wants=network-online.target

   [Service]
   WorkingDirectory=/root/company-wiki/ops/outline/branding
   ExecStart=/usr/bin/node /root/company-wiki/ops/outline/branding/inject-proxy.mjs
   Environment=INJECT_PORT=3100 UPSTREAM_PORT=3000
   Restart=on-failure
   RestartSec=2

   [Install]
   WantedBy=multi-user.target
   ```
   Note: this file lives only on the server (`/etc/systemd/system/`), not in
   this repo — the copy above is the source of truth for recreating it.
   ```bash
   systemctl daemon-reload && systemctl enable --now outline-brand-proxy
   systemctl status outline-brand-proxy      # active, enabled
   journalctl -u outline-brand-proxy -n 50 --no-pager   # logs
   ```

2. **`/etc/caddy/Caddyfile`** — the final upstream in the `wiki.secretshop.ua`
   block points at the proxy, not Outline directly:
   ```caddy
   reverse_proxy 127.0.0.1:3100
   ```
   (MinIO `/outline*` routes stay on `:9000`, untouched.)

3. **Editing the CSS is live** — `outline-custom.css` is read from disk on
   every request; edit and refresh the browser, no restart needed. Editing
   `inject-proxy.mjs` itself requires `systemctl restart outline-brand-proxy`.

## Rollback

```bash
sudo sed -i 's/reverse_proxy 127.0.0.1:3100/reverse_proxy 127.0.0.1:3000/' /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo systemctl disable --now outline-brand-proxy   # optional
```
No Outline data is touched either way.

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
- **`debug.js` hook (currently unused):** `inject-proxy.mjs` will also inject
  `/__brand/debug.js` and accept POSTs at `/__brand/report` (appended to
  `debug-reports.ndjson`) *if* a `debug.js` file is placed next to it — used
  once to inspect Outline's rendered DOM without browser devtools while
  debugging the sidebar buttons. Absent by default; do not leave it deployed
  after a debugging session, since it collects live DOM snapshots.
