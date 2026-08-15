# Membership service

Accounts, giving records, and contribution statements for Temples of Earth —
self-hosted on the Hetzner box, with Stripe as the payment rail but **our** system
as the ledger.

Supersedes `plans/DONOR-LOGIN.md`. Nothing here is built.

---

## Why build rather than buy

Stripe can email a per-gift invoice, but it **prices post-payment invoices for
one-time Checkout payments separately, per gift** — a recurring cost for a
document we can render ourselves. It also doesn't give the thing donors actually
need: an aggregated year's giving, and a statement they can hand to a tax
preparer.

The deeper reason: with `metadata[account_id]` on the Checkout Session we get
**exact attribution**, which Stripe's own Customer objects can't give us — Stripe
does not dedupe Customers by email, so a donor who gives three times becomes three
Customer objects. Owning the ledger is both cheaper and more correct.

---

## Stack

**Node + `node:sqlite`, in this repo, as a sibling to `tor-checkout`.**

Verified on the box: Node **v22.23.1**, and `node:sqlite` works (ran a real
insert/select through it). That means durable, transactional, WAL-mode storage
with **zero runtime dependencies** — preserving the property `tor-checkout`
already has.

Why this over the alternatives:

| Option | Verdict |
|---|---|
| **Node + `node:sqlite`, this repo** | ✅ zero deps, push-to-deploy, same repo as the pages, and it's where Checkout Sessions are already created |
| Rust + axum + redb (like the gateway) | Matches SyncEngine, but lands in the private repo with hand-installed binaries and no push-to-deploy |
| Postgres | Nothing on the box uses it; 3 GB RAM; overkill for this scale |
| Extend `indras-donation-gateway` | Already has a ledger — but it's the hardest service on the box to deploy, and it should stay focused on issuing seeds |

Precedent: SQLite is already the storage idiom here (`work-agualila` runs on it,
albeit via a 58 MB `node_modules` — ours needs none).

Deployment inherits the existing path: it lives in this repo, so `git push` is the
deploy. Add `restart-tor-membership` to the `tor-post-deploy` token vocabulary
(root helper reinstall, out of band — see `infra/RUNBOOK.md`).

---

## Authentication: three doors, deliberately unequal

Three methods, but **parallel methods are only as strong as the weakest one**. An
attacker with the inbox doesn't attack the passkey; they request a magic link. So
the methods are graded, and privileges follow the grade — the same shape as the
verification levels already in `found-a-temple.html`.

| Method | Strength | Role |
|---|---|---|
| SyncEngine attestation | Dilithium, post-quantum, no third party | strongest |
| Passkey (WebAuthn) | phishing-resistant, device-bound | strong |
| Magic link | inbox-dependent, third-party mail | bootstrap + recovery |

**Privileges by level:**

- *any session* — membership status, member-since
- *passkey or attestation* — full giving history
- *fresh passkey or attestation (step-up, re-auth within ~5 min)* — download a
  statement, change email, add/remove credentials

### The escalation rule — the load-bearing part

> **A magic-link session may never add, remove, or replace a credential, nor
> change the account email, once a stronger credential exists on the account.**

Without this the design collapses: inbox compromise → request link → enrol
attacker's own passkey → attacker now holds a *stronger* credential than the owner
and can lock them out. That is the classic account-recovery takeover, and it is
how most "we added passkeys" implementations still get owned.

When a link session *is* used for recovery (owner genuinely lost their device),
notify every channel on the account and impose a waiting period before the change
takes effect.

### Why not just magic links

Not for quantum reasons — a 15-minute single-use token has no harvest-now-
decrypt-later value; decrypting it in 2035 yields a string that expired in 2026.
The real reasons are present-tense: inbox compromise is account compromise, mail
sits in plaintext at rest at Gmail/Outlook, and corporate link scanners pre-fetch
URLs and can burn a single-use token before the human clicks.

(For context on what's already fine: `templesof.earth` negotiates
`X25519MLKEM768` — hybrid post-quantum TLS — today. The site channel is not the
weak link. The mail hop is.)

### Magic-link hygiene

- The link and nothing else — **never an amount** in email.
- Land on a **confirm page that POSTs**; do not consume the token on a bare `GET`,
  or a scanner burns it.
- 15-minute expiry, single use.
- Identical response whether or not the address exists — **no enumeration**. This
  is a church; membership is not public.
- Rate limit per address and per IP.

---

## Data model

```sql
account          id, email (unique, citext-ish), created_at, display_name
credential       id, account_id, kind('passkey'|'syncengine'),
                 public_key/user_root_id, label, created_at, last_used_at
session          id, account_id, level('link'|'passkey'|'attested'),
                 created_at, expires_at, last_step_up_at
magic_token      hash, account_id, expires_at, consumed_at
gift             id, account_id, stripe_session_id (unique),
                 stripe_payment_intent, amount_cents, currency,
                 created_at, kind('offering'|'mat'), status
```

`gift` is the ledger. It is written **only** by the Stripe webhook, never by the
browser.

**Stripe stays the source of truth for money**; this table is a projection of it.
Reconciliation should be possible at any time by replaying Stripe's records — so
store `stripe_session_id` and `payment_intent` on every row, and make the webhook
insert idempotent on `stripe_session_id`.

---

## Flow

1. **Checkout from inside an account.** `POST /account/checkout` creates the
   Session with `metadata[account_id]` and `client_reference_id`. This is what
   makes attribution exact.
2. **Webhook.** The membership service registers its **own** Stripe webhook
   endpoint (Stripe supports several, each with its own signing secret), so it
   doesn't disturb the gateway's. On `checkout.session.completed` with
   `payment_status == 'paid'`, insert a `gift` row keyed on `metadata.account_id`.
3. **Anonymous gifts.** Someone who donates without logging in has no
   `account_id`. Create the account from the checkout email and attach the gift —
   **the donation creates the account**, which also solves account/history
   convergence. They claim it later by logging in to that address.
4. **Giving history.** `GET /account/giving` reads `gift` for the account.
5. **Statement.** `GET /account/statement/:year` renders a print-styled HTML page
   — legal name (Temples of Refuge), EIN/status line, the year's gifts, total, and
   the acknowledgment below. Print to PDF; no dependency, no per-invoice fee.

### ⚠ The statement must carry the Rev. Rul. 63-252 acknowledgment

**There is an open compliance gap until it does.** `invoice_creation` was
reverted on 2026-08-15 to stop the per-gift fee, and the Stripe invoice was the
donor's *kept record* carrying this language (commit `0117199`). It still appears
on the payment form via `COVENANT_MESSAGE`, but a form read once is not a record
kept. **Closing this gap is the reason the statement renderer exists.**

Verbatim — do not paraphrase, and name no destination:

> Your gift supports the mission of Temples of Refuge — the network of temples,
> the Synchronicity Engine, and the stewardship of sacred lands. This
> contribution is made with the understanding that the donee organization has
> complete control and administration over the use of the donated funds.

A US donor's deduction survives only if Temples of Refuge retains complete
control and discretion over the funds; a charity that is in substance a
pass-through to a foreign recipient is disregarded, and the exemption itself is
at risk. Offerings only — **a Ceremony Mat is a purchase, not a contribution, and
must never carry this language.**

### Endpoints

```
POST /auth/request-link      { email }        → always 200, no enumeration
POST /auth/consume-link      { token }        → session (level: link)
POST /auth/passkey/register                   → step-up required
POST /auth/passkey/login
POST /auth/attest            { challenge, member_vk, signature, seed }
                                              → verified via the gateway
GET  /account                                 → status, member-since, credentials
GET  /account/giving                          → passkey|attested only
GET  /account/statement/:year                 → step-up only
POST /account/checkout       { amount, currency } → Session with account metadata
POST /stripe/webhook                          → own signing secret
```

---

## SyncEngine linkage

**Do not duplicate it.** The gateway already owns nonce issuance, `/redeem`, and
the issuer key — the part that is already correct and hardest to change.

- The account page shows the founding-gift code by calling the gateway's
  `/claim?session_id=…`.
- Attestation **links** a `user_root_id` to an existing account; it never creates
  one. The gateway knows the nonce→`user_root_id` binding at redemption and can
  hand membership that mapping.
- `POST /auth/attest` verifies through the gateway's `/attest/verify`
  (step 4 of `MEMBERSHIP-GIVING-AND-ATTESTATION.md` in the IndrasNetwork repo) —
  membership never handles Dilithium itself.

---

## Privacy

Giving records plus religious-association membership is **GDPR Article 9
special-category data**. That sets the bar above a typical login:

- Session cookies `HttpOnly; Secure; SameSite=Lax`, short-lived, no "remember me".
- Never log donor emails or amounts.
- Statements rendered on request, not stored.
- A public donor registry is **out of scope and a separate decision**.
  Peer-visible ≠ world-visible.

Calibration, so friction stays proportionate: a compromise here reveals *what
someone gave*. It exposes no payment credentials (Stripe holds those) and permits
no movement of money.

---

## Sequence

1. Service skeleton: systemd unit, Caddy route, SQLite schema, health endpoint.
2. Stripe webhook + `gift` ledger. **Start capturing immediately** — this is the
   only irreversible part; gifts not recorded now can be backfilled from Stripe,
   but only if the ids are there to match on.
3. Magic link (bootstrap) + `/account`.
4. Logged-in checkout with `metadata[account_id]`.
5. Giving history + statement renderer. ← **the January deadline AND the open
   compliance gap both live here.** Since 2026-08-15 no kept donor record carries
   the Rev. Rul. 63-252 acknowledgment; this is what restores it.
6. Passkeys + the escalation rule.
7. SyncEngine attestation (needs gateway step 4 first).

## Open decisions

- **Transactional email provider** — Resend / Postmark / SES, called over `fetch`
  to keep the zero-dep property. Web3Forms delivers *to* you and is not an auth
  channel. This is the one genuinely new external dependency.
- **Backfill.** Gifts predating this service have no `account_id`. They can be
  matched on checkout email from Stripe's records — worth doing once, before the
  first statement season.
- **Route.** `members.templesof.earth` (own Caddy block, cleanest cookie scope)
  vs `/account` on the main site (no new DNS or cert). Leaning subdomain.
- **Restricted key.** This service reads and creates Sessions; it should hold a
  `rk_` scoped to that, not the `sk_live_` currently in `/etc/tor-checkout/env`.
