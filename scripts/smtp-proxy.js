#!/usr/bin/env node
// TCP passthrough proxy — run this on any non-GCP server (Hetzner, DO, etc.)
// Railway → this proxy → smtp.titan.email (or any blocked SMTP host)
// The target SMTP server sees the proxy's IP, not Railway's GCP IP.

const net = require('net');

const ROUTES = [
  { listen: 2587, target: 'smtp.titan.email', port: 587 },
  { listen: 2465, target: 'smtp.titan.email', port: 465 },
  { listen: 2993, target: 'imap.titan.email', port: 993 }, // optional — IMAP already works from Railway
];

for (const route of ROUTES) {
  net.createServer(src => {
    const dst = net.connect(route.port, route.target);
    src.pipe(dst);
    dst.pipe(src);
    dst.on('error', err => { console.error(`[proxy] dst error ${route.target}:${route.port}`, err.message); src.destroy(); });
    src.on('error', err => { console.error(`[proxy] src error`, err.message); dst.destroy(); });
  }).listen(route.listen, '0.0.0.0', () => {
    console.log(`[proxy] :${route.listen} → ${route.target}:${route.port}`);
  });
}

console.log('SMTP proxy running. Set SMTP_PROXY_HOST to this server\'s IP in Railway env vars.');
