# Deploying the checkout backend on the Hetzner VPS (behind Caddy)

Self-hosted — no Cloudflare. The service is the same fetch handler
(`src/index.js`) run under a plain Node HTTP server (`src/node-server.js`),
bound to `127.0.0.1:8787`, with Caddy terminating TLS and reverse-proxying.
Modeled on the existing `work-agualila` Node service on the same box.

Endpoint: **`https://checkout.templesofrefuge.earth`** — one cross-origin API
that serves every site in `ALLOWED_ORIGINS`. The pages call `…/create-session`
and `…/session-status`.

**The code ships inside this repo**, so it lands on the box with the site's
normal `git pull` — no separate rsync, no `npm install` (zero runtime deps).

Box: `truman@89.167.41.185`, site clone at `/var/www/templesofrefuge`,
Caddyfile at `/etc/caddy/Caddyfile`.

---

## 1. DNS (Namecheap)

Add an **A record**: host `checkout` on `templesofrefuge.earth` → **89.167.41.185**
(same IP as the apex). Wait for propagation (`dig +short checkout.templesofrefuge.earth`).

## 2. Ship the code

```
git push                                               # commit is already on the repo
ssh truman@89.167.41.185 'git -C /var/www/templesofrefuge pull --ff-only'
```

Confirms `/var/www/templesofrefuge/checkout-worker/src/node-server.js` exists on the box.

## 3. Secrets

The systemd unit uses `DynamicUser` (a throwaway user), so there's no user or
group to create. systemd reads the env file as root before dropping privileges,
so it stays root-only.

```
sudo install -d -m 755 /etc/tor-checkout
sudo cp /var/www/templesofrefuge/checkout-worker/deploy/env.example /etc/tor-checkout/env
sudo chmod 600 /etc/tor-checkout/env
sudo nano /etc/tor-checkout/env      # paste your sk_live_ key; check ALLOWED_ORIGINS + PRODUCT_ID
```

## 4. systemd service

```
sudo cp /var/www/templesofrefuge/checkout-worker/deploy/tor-checkout.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now tor-checkout
systemctl status tor-checkout --no-pager
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8787/session-status   # 403 (no Origin) = up
sudo journalctl -u tor-checkout -n 20 --no-pager        # "tor-checkout listening on http://127.0.0.1:8787"
```

## 5. Caddy

Add the block from `infra/Caddyfile` to the box's `/etc/caddy/Caddyfile`:

```
checkout.templesofrefuge.earth {
    reverse_proxy 127.0.0.1:8787
}
```

```
sudo systemctl reload caddy
```

Verify from your laptop (Caddy auto-provisions the cert on first hit):

```
curl -s -X POST https://checkout.templesofrefuge.earth/create-session \
  -H 'Origin: https://templesofrefuge.earth' -H 'Content-Type: application/json' \
  -d '{"amount":5500,"currency":"usd"}'
# expect: {"client_secret":"cs_live_..."}
```

## 6. Flip the site to live

In `shared/cta-widgets.js`:
- `STRIPE_PUBLISHABLE_KEY` → your **`pk_live_…`** key
- `CHECKOUT_API_URL` → `https://checkout.templesofrefuge.earth`

Commit, push, and `git pull` on the box (step 2). Load `/join.html`, make a
small real offering, confirm the "Welcome, Member" return state.

## Updating later

**Just `git push`.** The GitHub push webhook auto-pulls the box, and the repo's
`deploy/post-deploy.sh` restarts `tor-checkout` automatically whenever
`checkout-worker/src/` changed (the Node process loads `index.js` into memory
once at startup, so it must be restarted to pick up new code — the pull alone
isn't enough). See `site-deploy-procedure` and `syncengine.earth/deploy/README.md`.

Manual fallback if the webhook is down:
`ssh truman@89.167.41.185 'git -C /var/www/templesofrefuge pull --ff-only && sudo systemctl restart tor-checkout'`

---

## Notes

- **Local dev:** `npm run start` with `.dev.vars` (test key/product) + an inline
  `ALLOWED_ORIGINS`, or `npm run dev:worker` for the Cloudflare runtime.
- **Fallback:** if this service is ever down, `join.html` degrades to the hosted
  Stripe donation page automatically — donations keep working.
- **Logs:** `journalctl -u tor-checkout -f`.
- The `wrangler.toml` / Cloudflare path still works if ever needed (`npm run deploy:worker`), but is unused in this deployment.
