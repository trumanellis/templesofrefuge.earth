// Node HTTP adapter — self-hosted deployment.
//
// Runs the exact same fetch-style handler as the Cloudflare Worker (./index.js),
// wrapped in a plain Node HTTP server so the checkout backend lives on our own
// VPS behind Caddy — no Cloudflare dependency, one source of truth for the
// Stripe logic. Node 18+ provides the WHATWG Request/Response/fetch globals the
// handler relies on, so index.js runs unchanged; we just translate Node's
// IncomingMessage <-> Request and Response <-> ServerResponse.
//
// Config comes from the process environment (set by systemd on the box):
//   STRIPE_SECRET_KEY   — the sk_live_ (or sk_test_) key           [required]
//   ALLOWED_ORIGINS     — comma-separated origins allowed to call  [required]
//   PRODUCT_ID          — the Stripe product offerings record to   [required]
//   PORT                — listen port (default 8787)               [optional]
//   HOST                — bind address (default 127.0.0.1)         [optional]
//
// Bind to localhost only — Caddy terminates TLS and reverse-proxies to us.

import { createServer } from 'node:http';
import handler from './index.js';
import { createMailer } from './mailer.js';

const PORT = Number(process.env.PORT) || 8787;
const HOST = process.env.HOST || '127.0.0.1';

for (const key of ['STRIPE_SECRET_KEY', 'ALLOWED_ORIGINS', 'PRODUCT_ID']) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}

// The env handed to the shared handler: the process environment plus the one
// capability that only exists on Node. index.js checks for SEND_MAIL and
// degrades /inquiry to a 503 when it is absent, which is what the Worker path
// sees. Mail is optional on purpose — checkout is the revenue path and must
// still boot if SMTP is unconfigured.
// Top-level await: the service must not begin accepting requests before it
// knows whether it can send mail. createMailer never throws — a missing module
// or missing config yields null, and /inquiry answers 503.
const sendMail = await createMailer(process.env);
const ENV = { ...process.env, SEND_MAIL: sendMail };

if (!sendMail) {
  console.log('tor-checkout: mail unavailable — /inquiry will return 503');
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  try {
    const url = `http://${req.headers.host || HOST}${req.url}`;
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const body = hasBody ? await readBody(req) : undefined;

    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      body: body && body.length ? body : undefined,
    });

    const response = await handler.fetch(request, ENV);

    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    const buf = Buffer.from(await response.arrayBuffer());
    res.end(buf);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err?.message || 'Server error' }));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`tor-checkout listening on http://${HOST}:${PORT}`);
});
