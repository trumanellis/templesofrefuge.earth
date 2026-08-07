# Donor login and giving records

A signed-in area on templesof.earth where someone can see what they have given
and download an annual contribution statement.

Specced against the code as it stands. Nothing here is built.

---

## Why

There is currently **no way for a donor to see their giving**, and no way for you
to issue a contribution statement. A donor's only record is the Stripe receipt
email for each individual payment.

As a 508(c)(1)(A) association of churches with US donors, the statement is the
part with a real deadline: donors want it in January for the prior tax year.

Two audiences that want different things, and should not be conflated:

| | Wants | Where it lives |
|---|---|---|
| The member, about themselves | full history, a tax statement | **this document** |
| Peers, about each other | founding gift, maybe the most recent one | SyncEngine, already designed |

This is the first one. It does **not** need the peer-to-peer gratitude chain, and
should not wait on it.

---

## The blocker: there are no Customers

`checkout-worker/src/index.js` creates Sessions with `mode: 'payment'` and never
sets `customer_creation`. Stripe's default for payment mode is `if_required`, so
**most existing donations have no Customer object** — the donor's email exists
only on the Session's `customer_details` and the resulting charge.

So "show me my giving" cannot be a customer lookup today. That splits the work:

**Forward — DONE (committed, awaiting deploy):**

```js
form.set('customer_creation', 'always');        // future gifts attach to a Customer
form.set('invoice_creation[enabled]', 'true');  // and produce a real invoice
```

`invoice_creation` is what turns a payment into a document a donor can keep and a
statement can be built from. **Neither is retroactive**, which is why they shipped
ahead of everything else here.

Verified against the API reference before shipping: `customer_creation` accepts
`always` / `if_required` and is valid in `payment` mode; `invoice_creation.enabled`
is a boolean valid in `payment` mode; neither is documented as incompatible with
`ui_mode: embedded_page`.

Note for the history view: **Stripe does not dedupe Customers by email**, so a
donor who gives three times becomes three Customer objects. Email remains the
merge key; the Customer is what carries the invoice.

**Backward:** existing gifts have to be found by searching charges on the billing
email. Confirm Stripe's supported query fields for charge search before relying
on this — do not assume. If it cannot be done cleanly, the honest fallback is a
one-off reconciliation export from the Dashboard.

---

## Auth: a magic link, not an account

No passwords, no account table.

```
POST /member/request-link   { email }
  → always 200: "if that address has given, a link is on its way"
  → never reveals whether the address is a donor

GET  /member/session?token=…
  → verifies HMAC + expiry + single-use, sets a short HttpOnly session cookie

GET  /member/giving
  → from the cookie: this donor's gifts, totals by year
GET  /member/statement/:year
  → a contribution statement (PDF or print-styled HTML)
```

Token shape: `email ‖ exp ‖ nonce` plus `HMAC-SHA256(server_secret, …)`. Stateless
apart from a single-use marker, matching how the donation gateway already builds
its challenges. **15-minute expiry, single use.**

Rules that matter more than the mechanism:

- **No enumeration.** The response is identical whether or not the address has
  ever given. This is a church; whether someone is a member is not public.
- **No amounts in the email.** Mail is forwarded, printed, and shared. The email
  carries a link and nothing else.
- **Rate limit** `request-link` per address and per IP, alongside `/redeem` and
  `/claim`.
- **A restricted key (`rk_`), not `sk_live_`.** This path only ever reads charges
  and invoices. It should not be able to move money. Today the box holds a secret
  key; the read path is a good first candidate for a RAK with minimum scope.

**New dependency:** transactional email. Web3Forms delivers contact-form mail to
you and is not an auth-mail channel. This needs a real provider (Postmark, Resend,
SES) reached over `fetch` from the checkout worker — no npm dependency required,
in keeping with that service's zero-dep design.

### Later: sign in with SyncEngine

Once `/attest/verify` exists (step 4 of the membership spec), a member holding the
app can prove membership with a signed challenge instead of an email round-trip.
It is a **second door, never the only one** — most donors will never install the
app, and gating tax statements behind a peer-to-peer client would be perverse.

---

## Ledger: Stripe stays the source of truth

Do not build a donations table. The site asks Stripe what this person gave and
renders it. Reasons: Stripe already has every charge including ones predating any
system we build; a second ledger will drift; and holding our own copy of donation
records raises the stakes of a site compromise for no benefit.

The only thing worth persisting locally is the single-use marker for spent magic
tokens.

---

## Privacy

This page puts **financial records** and **religious-association membership** —
GDPR Article 9 special-category data — behind whatever auth we build. That raises
the bar above a typical login:

- Session cookie: `HttpOnly`, `Secure`, `SameSite=Lax`, short-lived, no
  "remember me".
- Never log donor emails or amounts in the checkout worker's output.
- The statement is generated on request, not stored.
- A public donor registry is **out of scope and a separate decision**. Peer-
  visible ≠ world-visible; the peer-to-peer case was settled deliberately and
  does not extend to a web page.

---

## Sequence

1. ~~`customer_creation: 'always'` + `invoice_creation`~~ — **done**, committed
   ahead of the rest because neither is retroactive. Not yet deployed.
2. Pick and wire a transactional email provider.
3. Magic-link issue + verify, with the restricted key.
4. `/member/giving` — the history view.
5. `/member/statement/:year` — the piece with the January deadline.
6. Later: `/attest/verify` as a second door.

## Open questions

- **Charge search by email** — supported query fields need verifying against the
  Stripe docs before step 4 is designed around it.
- **Merging.** One human who gave from two addresses is two Stripe identities.
  Email is the practical merge key; decide whether merging is manual, and who
  can request it.
- **Where does this live?** `/giving` on templesof.earth, or a page inside
  `/join`? It is a different mode from the rest of the site — the only
  authenticated surface — and probably wants to look like it.
