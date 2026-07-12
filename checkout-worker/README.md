# tor-checkout — Temples of Refuge checkout backend

A tiny Cloudflare Worker that mints Stripe **embedded Checkout Sessions** so the
static join page can render the card form inline (no hosted redirect). It exists
because Stripe requires the **secret key server-side**, and "pay what you want"
amounts aren't supported by Stripe's embedded components — so this Worker builds
the price from the donor's chosen amount.

Your **secret key lives only here.** The static site holds only the *publishable*
key (public, safe).

## Routes

| Method | Path              | Body / Query        | Returns                          |
| ------ | ----------------- | ------------------- | -------------------------------- |
| POST   | `/create-session` | `{ "amount": 2500 }` (cents) | `{ "client_secret": "..." }` |
| GET    | `/session-status` | `?session_id=cs_...` | `{ status, payment_status, customer_email, customer_name }` |

## One-time setup

You need a (free) Cloudflare account. Everything below runs in **your** terminal
— the secret key never leaves your machine / Cloudflare.

```sh
cd checkout-worker
npm install                       # installs wrangler locally
npx wrangler login                # opens browser, authorizes Cloudflare

# Paste your Stripe SECRET key when prompted (starts with sk_live_ or sk_test_).
# Get it from: Stripe Dashboard -> Developers -> API keys -> Secret key.
npx wrangler secret put STRIPE_SECRET_KEY

npx wrangler deploy               # prints your Worker URL, e.g.
                                  #   https://tor-checkout.<subdomain>.workers.dev
```

Then give the deployed **Worker URL** to wire into the site config
(`shared/cta-widgets.js` -> `CHECKOUT_API_URL`), along with your **publishable**
key (`pk_live_...`) -> `STRIPE_PUBLISHABLE_KEY`.

## Local testing

```sh
# Use a TEST-mode secret key for local dev so you can pay with test cards:
npx wrangler secret put STRIPE_SECRET_KEY   # paste sk_test_...  (or use .dev.vars)
npx wrangler dev                            # serves http://localhost:8787
```

`ALLOWED_ORIGINS` in `wrangler.toml` already includes `localhost:8000` and
`localhost:8002` for the static preview server. Point the site's
`CHECKOUT_API_URL` at `http://localhost:8787` while testing.

Test card: `4242 4242 4242 4242`, any future expiry, any CVC/ZIP.

## Notes

- The Worker only accepts requests from origins in `ALLOWED_ORIGINS`, and the
  donor's `return_url` is derived from that origin (no open-redirect surface).
- Amounts are clamped to **$1–$10,000** server-side, independent of the UI.
- It's a plain `fetch` handler with zero Stripe SDK dependency, so it ports
  cleanly to Deno Deploy / a VPS if you ever leave Cloudflare.
