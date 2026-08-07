# Superseded — see [infra/RUNBOOK.md](../infra/RUNBOOK.md)

The checkout backend's deployment is documented with the rest of the box in
**[infra/RUNBOOK.md](../infra/RUNBOOK.md)**.

The short version, because it is the part people get wrong:

- `tor-checkout` runs `node /var/www/templesofrefuge/checkout-worker/src/node-server.js`
  straight out of this repo's clone, bound to `127.0.0.1:8787` behind Caddy at
  `checkout.templesof.earth`. **It ships by `git push`** — the deploy webhook
  pulls, and a root path-unit restarts the service when `checkout-worker/src/`
  changed.
- Its secrets live in `/etc/tor-checkout/env` on the box, **not in this repo**.
  `ALLOWED_ORIGINS` in particular is not updated by any deploy; adding a domain to
  the site without adding it there fails the browser's CORS preflight and drops
  `/join` silently back to the hosted Stripe link. See `deploy/env.example`.

Do not confuse this with the **donation gateway** (`api.templesof.earth`,
`127.0.0.1:8788`), which is a prebuilt Rust binary from the IndrasNetwork repo and
is *not* updated by any git pull.
