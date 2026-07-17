// Outline branding PoC — HTML-injecting reverse proxy.
//
// Sits between Caddy and Outline:  Caddy → this proxy (:3100) → Outline (:3000).
// For text/html responses it injects a <link> to a same-origin stylesheet
// right before </head>. The CSS is served by this proxy itself, so it stays
// same-origin and passes Outline's CSP (style-src 'self' 'unsafe-inline').
//
// Zero dependencies. Node >= 18.
//
//   INJECT_PORT=3100 UPSTREAM_PORT=3000 node inject-proxy.mjs
//
// Design notes / caveats:
//  - We force `Accept-Encoding: identity` upstream so we never have to
//    gunzip/regzip the HTML we rewrite. Non-HTML responses stream through
//    untouched (including their original encoding).
//  - WebSocket upgrades (Outline realtime) are passed through raw.
//  - This is a PoC: it is unsupported and can break whenever Outline changes
//    its HTML shell. Keep the injected CSS defensive (see outline-custom.css).

import http from 'node:http';
import net from 'node:net';
import { readFileSync, appendFileSync, existsSync } from 'node:fs';

const LISTEN_HOST = process.env.INJECT_HOST || '127.0.0.1';
const LISTEN_PORT = Number(process.env.INJECT_PORT || 3100);
const UP_HOST = process.env.UPSTREAM_HOST || '127.0.0.1';
const UP_PORT = Number(process.env.UPSTREAM_PORT || 3000);

const CSS_ROUTE = '/__brand/outline-custom.css';
const cssFileUrl = new URL('./outline-custom.css', import.meta.url);
// Optional debug helper: when debug.js exists next to this file, it is
// injected too (CSP allows same-origin scripts) and may POST DOM diagnostics
// to /__brand/report, appended to debug-reports.ndjson. Delete debug.js to
// disable. Used to inspect Outline's rendered DOM without browser devtools.
const DEBUG_JS_ROUTE = '/__brand/debug.js';
const debugJsUrl = new URL('./debug.js', import.meta.url);
const REPORT_ROUTE = '/__brand/report';
const reportFileUrl = new URL('./debug-reports.ndjson', import.meta.url);
const LINK_TAG = `<link rel="stylesheet" href="${CSS_ROUTE}" data-brand-inject>`;

const server = http.createServer((req, res) => {
  const routePath = req.url.split('?')[0];

  // Debug helper script (only when the file exists).
  if (routePath === DEBUG_JS_ROUTE) {
    let js;
    try {
      js = readFileSync(debugJsUrl);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('no debug helper');
    }
    res.writeHead(200, {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Length': Buffer.byteLength(js),
    });
    return res.end(js);
  }

  // Collect DOM diagnostics POSTed by debug.js.
  if (routePath === REPORT_ROUTE && req.method === 'POST') {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        appendFileSync(reportFileUrl, Buffer.concat(chunks).toString('utf8') + '\n');
      } catch {}
      res.writeHead(204);
      res.end();
    });
    return;
  }

  // Serve our stylesheet ourselves — never hits upstream.
  if (routePath === CSS_ROUTE) {
    let css;
    try {
      css = readFileSync(cssFileUrl);
    } catch {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      return res.end('brand css missing');
    }
    res.writeHead(200, {
      'Content-Type': 'text/css; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Content-Length': Buffer.byteLength(css),
    });
    return res.end(css);
  }

  const headers = { ...req.headers, 'accept-encoding': 'identity' };
  const upReq = http.request(
    { host: UP_HOST, port: UP_PORT, method: req.method, path: req.url, headers },
    (upRes) => {
      const ct = String(upRes.headers['content-type'] || '');
      if (!ct.includes('text/html')) {
        res.writeHead(upRes.statusCode, upRes.headers);
        return upRes.pipe(res);
      }
      const chunks = [];
      upRes.on('data', (c) => chunks.push(c));
      upRes.on('end', () => {
        let body = Buffer.concat(chunks).toString('utf8');
        if (body.includes('</head>') && !body.includes('data-brand-inject')) {
          const scriptTag = existsSync(debugJsUrl)
            ? `<script src="${DEBUG_JS_ROUTE}" defer data-brand-debug></script>`
            : '';
          body = body.replace('</head>', `${LINK_TAG}${scriptTag}</head>`);
        }
        const out = Buffer.from(body, 'utf8');
        const h = { ...upRes.headers };
        delete h['content-encoding'];
        h['content-length'] = Buffer.byteLength(out);
        res.writeHead(upRes.statusCode, h);
        res.end(out);
      });
    },
  );
  upReq.on('error', (e) => {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end(`upstream error: ${e.message}`);
  });
  req.pipe(upReq);
});

// Raw pass-through for WebSocket upgrades (Outline realtime collaboration).
server.on('upgrade', (req, socket, head) => {
  const up = net.connect(UP_PORT, UP_HOST, () => {
    const reqLine = `${req.method} ${req.url} HTTP/1.1\r\n`;
    const hdrs = Object.entries(req.headers)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\r\n');
    up.write(reqLine + hdrs + '\r\n\r\n');
    if (head && head.length) up.write(head);
    up.pipe(socket);
    socket.pipe(up);
  });
  up.on('error', () => socket.destroy());
  socket.on('error', () => up.destroy());
});

server.listen(LISTEN_PORT, LISTEN_HOST, () => {
  console.log(`inject-proxy: ${LISTEN_HOST}:${LISTEN_PORT} → ${UP_HOST}:${UP_PORT} (css at ${CSS_ROUTE})`);
});
