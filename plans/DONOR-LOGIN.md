# Superseded — see [MEMBERSHIP-SERVICE.md](./MEMBERSHIP-SERVICE.md)

This spec assumed Stripe would hold the ledger and that the site would read it
back — magic-link auth over Stripe's own records, with `invoice_creation`
producing per-gift documents.

Two things changed that:

- Stripe **prices post-payment invoices for one-time Checkout payments
  separately, per gift**. Paying per donation for a document we can render is the
  wrong trade for a nonprofit. `invoice_creation` has been reverted.
- `metadata[account_id]` on the Checkout Session gives **exact** attribution,
  which Stripe's Customer objects cannot — Stripe does not dedupe Customers by
  email. Owning the ledger is both cheaper and more correct.

Everything still true here — the magic-link hygiene, the Article 9 privacy
framing, the statement requirement and its January deadline — carried over into
**[MEMBERSHIP-SERVICE.md](./MEMBERSHIP-SERVICE.md)**, which adds accounts,
passkeys, SyncEngine attestation, and the graded-privilege model.

`customer_creation: 'always'` shipped from this spec and stays: it costs nothing.
