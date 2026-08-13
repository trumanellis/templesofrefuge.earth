# Compliance plan: exemption, Covenant integrity, member privacy

Sequenced work across the three concerns that actually drive this, in the order
they were ranked:

1. **The exemption itself** — the legal shelter every temple node relies on.
2. **Covenant integrity** — money must not buy standing, membership, or peer
   recognition.
3. **Member privacy** — religious affiliation joined to financial records is
   GDPR Article 9 special-category data.

Donor tax deductibility is addressed last and deliberately. It is real, it has a
January deadline, and it is not what this is for.

Specced against the code as it stands. Everything below is unbuilt except the
four edits in "Already done."

---

## Already done

In the working tree. **Not deployed, not pushed, not committed.**

**Solicitation language:**

| File | Change |
|---|---|
| `join.html` | Mission + control statement above the amount grid; §170 acknowledgment below the fineprint |
| `checkout-worker/src/index.js` | Same substance appended to `COVENANT_MESSAGE` (Stripe payment form); new `INVOICE_FOOTER` set on `invoice_creation[invoice_data][footer]`, offering branch only |
| `shared/cta-widgets.js` | `memberCTA` default text carries mission + control language, with the reason recorded in a comment |

Within Stripe's field limits (478/1200 and 292/5000). A Ceremony Mat is a
purchase, not a contribution, and deliberately carries none of this language.

**Phase 0 + Phase 3 (see those sections for detail):**

| Item | Change |
|---|---|
| 0.1 | `agualila.earth` dropped from the origins, repo **and box** — the conduit surface is closed |
| 0.2 | Third-party tax claim deleted from `found-a-temple.html` |
| 3.1 | Ubuntu + Ubuntu Mono self-hosted to `shared/fonts/`; every Google Fonts reference and preconnect gone |
| 3.2 | `marked` + `jsvectormap` vendored to `shared/vendor/` |
| 3.4 | Substack embed is click-to-load |
| 3.5 | `customer_email` removed from `/session-status` |
| 4.1 | Footer wording changed to the approved formulation on nine surfaces + the JSON-LD + `BRAND.md`; deductibility line added to `/join` |

| 1 | `/inquiry` route + Migadu relay; Web3Forms gone from the site |

**Still open in the CSP** (`infra/Caddyfile`). Three grants are now dead and can
be removed, all purely hardening rather than functional:

- `script-src … https://cdn.jsdelivr.net` — vendored in 3.2
- `style-src … https://fonts.googleapis.com` and `font-src … https://fonts.gstatic.com` — self-hosted in 3.1
- `connect-src … https://api.web3forms.com` — replaced in Phase 1

Left untouched deliberately; the header is Report-Only, so none of these change
behaviour today.

**Verified in a browser against a local server**, not assumed: no console errors
on `/covenant`, `/index`, or `/found-a-temple`; the Covenant renders through the
vendored `marked` (12,113 chars, 26 headings, no error state); the network map
draws from the vendored `jsvectormap` (176 paths); **zero iframes on page load**
where there was one, and the Substack signup still loads and works on click.

---

## Decisions taken

| Question | Decision |
|---|---|
| Transactional email | **Migadu SMTP + `nodemailer`** |
| Founding-gift code | **Issue on membership**, not on a paid session |
| Declaration retention | **Inbox only** — forward to `ola@`, build no second copy |
| Footer tax wording | **Change** to the approved formulation |
| Deductibility line on `/join` | **Add** it |
| Closing the box origins | Truman runs the steps; not automated from here |

### Why Migadu, and why self-hosting mail was ruled out

Mail for `templesofrefuge.earth` is on **Migadu** (MX `aspmx1/2.migadu.com`),
and SPF is `v=spf1 include:spf.migadu.com -all`.

That `-all` is a hard fail, so mail sent from the Hetzner box claiming to be
`@templesofrefuge.earth` would fail SPF at the receiving end. Self-hosting an MTA
would mean weakening SPF to `~all` or authorizing the Hetzner IP, degrading the
domain's anti-spoofing posture — on top of Hetzner blocking outbound port 25 by
default and a fresh IP having no sending reputation. **A magic link in the spam
folder is a donor who cannot get their tax statement.**

Relaying through Migadu instead: Article 9 declaration content stays in the
EU/EEA (Swiss company, European infrastructure), SPF already authorizes it, no
new processor enters the picture, and it costs nothing beyond the existing plan.

The tradeoff accepted: Migadu is SMTP-only with no HTTP API, so this takes
`nodemailer` — the first dependency in a service that has been deliberately
zero-dep.

**Architectural note for whoever builds it:** `nodemailer` is Node-only and will
not run on Cloudflare Workers. `src/index.js` is a Worker-style handler that
`node-server.js` wraps. Keep the mail send in `node-server.js` (or inject a
sender through `env`) so the shared handler stays runtime-agnostic; putting the
import in `index.js` breaks the Worker path.

### Why inbox-only retention

Forwarding does not make the data disappear — it lands in `ola@`'s Migadu
mailbox and lives there. So "store nothing" means "do not build a *second*
copy." One place to manage, erasure means deleting an email, and no database of
special-category data to encrypt, age out, and defend.

---

## Phase 0 — immediate, no dependencies

**Status: done, repo and box. Applied to `/etc/tor-checkout/env` on 2026-08-13.**

### 0.1 Remove `agualila.earth` from the checkout origins

Eliminates the latent conduit surface: a donation session opened from a
Portuguese-branded domain into the US charity's Stripe account is precisely the
appearance Rev. Rul. 63-252 punishes. No checkout page exists there today; the
authorization does.

**Three places, and only one of them affects production:**

| Where | Effect | Status |
|---|---|---|
| `/etc/tor-checkout/env` on the box | **The live allowlist.** `infra/RUNBOOK.md:154` — no deploy updates this | **Applied 2026-08-13.** Backup at `/etc/tor-checkout/env.bak.2026-08-13`. Checkout verified unaffected — the `/join` payment panel still mounts |
| `checkout-worker/deploy/env.example` | The documented intended value | Done |
| `checkout-worker/wrangler.toml:8` | The Cloudflare path; vestigial since the move to self-hosted, but it should not disagree | Done |
| `checkout-worker/src/index.js` `EXTENSIONLESS_ORIGINS` | Return-path defaults | Done |

Each edit carries a comment saying why the origin is absent, so nobody
"fixes" the inconsistency later.

**The remaining step, for a human:** edit `ALLOWED_ORIGINS` in
`/etc/tor-checkout/env` to drop `https://agualila.earth` and
`https://www.agualila.earth`, restart `tor-checkout`, and run the RUNBOOK health
checks. **Until that happens, production still accepts checkout calls from
agualila.earth** — the repo change alone reads as done and changes nothing.

### 0.2 Cut the third-party tax claim — **done**

`found-a-temple.html:723` — "Tax-exempt by definition — no IRS determination
letter required." This told *prospective temple founders* about *their* legal
position, which is advice we are not placed to give.

Removed as a **pure deletion** — nothing was reworded and no new claim was
invented, so the standing "flag, don't rewrite" rule on tax copy is intact. The
surrounding card still reads cleanly. **Confirm this is the cut you wanted.**

Every other tax claim is untouched pending the Phase 4 decision.

### 0.3 Open the governance and cross-repo tracks

Both have long lead times and neither blocks code. Start them now — see
"Parallel tracks" below.

---

## Phase 1 — close the live privacy exposure

The sharpest finding on the site, and live today for any European applicant.

### The problem

`found-a-temple.html` posts its declaration through `CTAWidgets.wireForm`, which
sends **every field** to `api.web3forms.com`:

- seven free-text answers about religious practice and belief (`essence`,
  `land`, `building`, `practice`, `held`, `not`, `one_sentence`)
- `name`, `email`, `holding`
- `member_name`, `member_status`, and **`member_reference`** — a founding-gift
  code or a **Stripe session reference**

That is Article 9 special-category data joined to a payment identifier, sent to
a US processor with no DPA and no Article 46 transfer mechanism.

`shared/cta-widgets.js:36` still holds `REPLACE_ME_WEB3FORMS_KEY`, so today it
degrades to `mailto:` instead. **Do not fix the key.** Filling it in is what
turns this from a latent exposure into an active one.

### The work — **DONE**

| # | Item | Where |
|---|---|---|
| 1 | `POST /inquiry` route, reusing the existing origin allowlist and CORS | `checkout-worker/src/index.js` |
| 2 | **Forward, do not store** — relays to `INQUIRY_TO`, writes nothing to disk | same |
| 3 | Never logs field contents; send failures return an opaque 502 so SMTP errors cannot quote message content or credentials | same |
| 4 | `CTAWidgets.wireForm` posts to `/inquiry`; honeypot, `mailto:` fallback and success panel unchanged | `shared/cta-widgets.js` |
| 5 | **`WEB3FORMS_ACCESS_KEY` deleted**, along with every reference | same |
| 6 | `member_reference` removed from the declaration entirely | `found-a-temple.html` |

Added beyond the original list, because the endpoint sends mail and would
otherwise be an open relay for anyone able to present an allowed Origin:

- **Field allowlist** with per-field length caps (`INQUIRY_FIELDS`). Unknown keys
  are dropped rather than forwarded, so a new field on a page cannot silently
  start travelling before someone has decided what it contains.
- **Per-IP rate limit**, 5/hour, read from `X-Forwarded-For` since Caddy proxies
  from localhost.
- **Email format validation** before the address reaches a `replyTo` header.

**Mail is optional by design.** Missing SMTP vars leave the service booting
normally and `/inquiry` returning 503 — checkout is the revenue path and must
not fail to start because the form is half-configured. The page reads 503 and
offers the `mailto:` fallback rather than pretending a declaration was received.

**On `member_reference`:** the hidden field is gone and `statusLine()` no longer
composes a Stripe session id into the status text. The verification *level*
survives, since that is what the reader can act on. The self-attested reference
is kept — that is the identity the applicant volunteered, not a payment
reference.

### Verified

17 route tests pass against a stubbed sender: origin rejection, 503 when
unconfigured, honeypot accepted-but-not-sent, malformed email rejected, happy
path with correct `replyTo`/subject/labels, non-allowlisted fields dropped,
oversized field capped at exactly its limit, rate limit at 5 then 429, and a
send failure surfacing as 502 without leaking the underlying error text.

In a browser: cross-origin POST from `localhost:8009` to the service returns the
503 with correct CORS headers, and `WEB3FORMS_ACCESS_KEY` is absent from
`CTAConfig`. The service boots without SMTP and logs that `/inquiry` is
unavailable.

**Not verified: a real send through Migadu.** That needs the mailbox password,
which belongs in `/etc/tor-checkout/env` and not here.

---

## Phase 2 — make the service door real

Right now `join.html:196-200` and `found-a-temple.html:812-818` both promise
that no one aligned with the Commandment is turned away for lack of funds. The
only route offered runs through the form Phase 1 replaces. Until that lands,
**money is the only functioning door into membership.**

This is the Covenant-integrity track. It is not a tax question.

### 2.1 A non-payment join that produces a real Member record

Today `toe-member` is written only on return from Stripe (`join.html:365`,
`:410`). A service-based join must produce the same record, or the promise has
no implementation.

`found-a-temple.html` already routes its gate through a swappable `Membership`
seam (`Membership.check()` / `Membership.claim()`), currently marked
"PROVISIONAL IMPLEMENTATION" over localStorage. That seam is the right place.

Proposed flow, consistent with what exists:

```
service-based join submitted  →  Phase 1 /inquiry route
  →  reviewed by hand
  →  membership reference issued by email
  →  redeemed through Membership.claim(), exactly as the
     "I'm already a Member" recover path already accepts one
```

The recover flow (`found-a-temple.html:786-810`) already takes an unverified
reference on trust and says so plainly — "This is a threshold, not a lock." A
service-based reference fits that model without new machinery.

Size: M.

### 2.2 Reframe payment as accompaniment, not as the act

Only after 2.1 exists — otherwise the copy points at a door that does not open.

| Location | Now | Change |
|---|---|---|
| `join.html:242` | "Donate to Join →" | "Sign the Covenant →" or "Make Your Offering →" |
| `join.html:185-186` | "seal it with an offering — your signature on the Covenant" | Signature is the act; offering accompanies it |
| `join.html:259` | "Your offering is your signature" | Same |
| `checkout-worker/src/index.js` `COVENANT_MESSAGE` | "By making this offering you sign the Covenant" | Same |

Size: S.

### 2.3 Raise the founding-gift code with IndrasNetwork

Cross-repo — see below. Until it is answered, 2.1 and 2.2 are honest about
membership but money remains the only route to *peer-visible standing*, which is
the part that sits closest to the Tokens firewall.

---

## Phase 3 — privacy hardening

Contained fixes, no dependencies on Phases 1–2.

| # | Item | Why | Status |
|---|---|---|---|
| 3.1 | Self-host fonts; drop `fonts.googleapis.com` / `fonts.gstatic.com` | Hands visitor IPs to Google on a religious site. German courts have fined on exactly this | **Done** — see below |
| 3.2 | Self-host `marked` and `jsvectormap`; drop `cdn.jsdelivr.net` | Same shape. Also removes a supply-chain path into every document page | **Done** — vendored to `shared/vendor/` |
| 3.3 | Trim `toe-member` | Holds name, `session_id`, and `founding_code` — **not** email, contrary to an earlier claim of mine | **Deferred to 2.1** — `session_id` is load-bearing (`SESSION_RE = /^cs_/` is the only thing the browser can genuinely re-check). Trimming it before the seam is reworked would break the gate |
| 3.4 | Substack embed | An iframe on every page carrying `aeonmyths.substack.com` | **Done** — click-to-load; zero iframes on page load, signup unchanged once chosen |
| 3.5 | Scope `/session-status` | Returned `customer_email` to anyone holding the `session_id`, which sits in the URL | **Done** — `customer_email` removed; verified unused by `join.html` and `mats.html`, which read only `customer_name` |

### 3.1 turned out small — the scary part was dead code

`shared/theme-engine.js:18` requests **15 Google Font families** for a six-skin
system, which looked like a large, risky migration. It is not: **`theme-engine.js`
is loaded by no page on the site.** `data-skin` is set nowhere, and
`shared/brand.js:4` records that it "replaces the old ThemeEngine skin switcher
with the single brand." That request never fires in production.

What actually shipped was two families — Ubuntu and Ubuntu Mono — via the
`@import` at `shared/brand.css:15`, plus a direct `<link>` in
`coherence-engine.html` and preconnects on five pages.

Now self-hosted in `shared/fonts/`: **16 woff2 files, 245 KB**, with a generated
`fonts.css`. Subsets are **latin + latin-ext only** — that covers English and
Portuguese, including "Água Lila" and the Covenant's diacritics. Greek and
Cyrillic were dropped; re-add those subsets if the site ever carries that text.

Verified in a browser: fonts load, `document.fonts.status` is `loaded`, and the
page issues **zero requests to googleapis or gstatic**.

`theme-engine.js` is now unreferenced dead code carrying a Google Fonts URL that
never executes. Deleting it is a tidy-up, not a compliance item, and was left
alone deliberately.

---

## Phase 4 — tax copy and the donor record

Deprioritized, not dropped. Two of these are decisions rather than work.

### 4.0 Newly found — FLAGGED, not changed

Four more §508(c)(1)(A) references turned up while applying the footer change.
They are a **different claim** from the one that was approved: these describe
the organization's identity rather than its deductibility, and they were not
part of "the footer on nine pages." Left untouched under the standing
flag-don't-rewrite rule.

| Location | Text |
|---|---|
| `index.html:7` | `<meta name="description">` — "A 508(c)(1)(A) network of Temples…" |
| `index.html:17` | `og:description` — same string, this is what social previews show |
| `index.html:35` | JSON-LD `description` — machine-readable |
| `found-a-temple.html:721` | "A Temple node within Temples of Refuge, a 508(c)(1)(A) association of churches under U.S. First Amendment protections." |

**The question:** apply the same approved formulation here, or is
"508(c)(1)(A)" doing identity work in the marketing copy that you want to keep?
The `found-a-temple` one is the most exposed of the four, since it describes a
*prospective founder's* legal shelter rather than ours — the same reason 0.2 was
cut from four lines above it.

### 4.1 Decisions for Truman

- **The footer on nine pages** — "an association of churches mandatorily
  tax-exempt under §501(c)(3) and §508(c)(1)(A)." Accurate, but it argues a
  legal position in a footer, and §508(c)(1)(A) is an exception from *applying*
  rather than a grant of exemption. The approved formulation — "Temples of
  Refuge is a 501(c)(3) religious organization" — invites less scrutiny.
  Appears on `join.html`, `cosmology.html`, `covenant.html`, `bylaws.html`,
  `found-a-temple.html`, `articles/read.html`, `articles/index.html`,
  `mats.html`, and `index.html:44` (JSON-LD, machine-readable).
- **Whether to add** "donations are tax deductible to the extent permitted by
  law" to `join.html`. Approved language, standard formulation, conspicuous by
  its absence — but adding it *expands* a tax claim, so it needs a yes.

Neither gets touched without a decision.

### 4.2 The donor record — `plans/DONOR-LOGIN.md`

That spec stands and its privacy design is already right (no enumeration, no
amounts in mail, restricted key, generated-not-stored statements). Two additions:

- The acknowledgment must carry the §170(f)(8) elements for gifts of $250+:
  amount, whether goods or services were provided, and — **if true** — that the
  organization provided solely intangible religious benefits. That last clause
  is only truthful once Phase 2.3 resolves.
- It shares the Phase 1 email provider. Sequence it after, not alongside.

---

## Parallel tracks — start at Phase 0, neither blocks code

### Governance (counsel and board)

The load-bearing exemption problem is not in the codebase.

- **`BYLAWS.md` §5.3 + §9.3.** All three initial directors are Founding
  Stewards. The Água Lila land is held in private title by certain Founding
  Stewards under a use agreement with the Temple, with §4958 named in the text.
  The body approving that arrangement is the counterparty to it. The §4958
  rebuttable presumption of reasonableness requires approval by an authorized
  body composed of individuals *without* a conflict of interest, which this
  board cannot assemble and which the §7.1 Conflict of Interest Policy does not
  cure. **Recruiting at least one disinterested director outranks every website
  change on this track.**
- **Control in substance.** Disclaimer text is necessary and not sufficient.
  What survives an audit is Inner Council minutes recording discretionary
  decisions on each disbursement, written grant agreements to the Portuguese
  entity once it exists, and records showing the board evaluated and could have
  declined.
- **"Association of churches."** §170(b)(1)(A)(i) generally contemplates member
  churches; there is currently one member temple. A classification question for
  counsel.
- **`BYLAWS.md` §9.3 reporting clause** lists Form 990 Schedule F. An
  association of churches is generally exempt from filing Form 990 at all, so
  that clause is worth checking. FBAR turns on signature authority over foreign
  accounts and is unaffected either way.

### Cross-repo (IndrasNetwork)

The founding-gift code is minted by the gateway at `api.templesof.earth/claim`,
which lives in IndrasNetwork. Not to be edited from here — hand it over.

**The question to send:** can a founding-gift code be issued on *membership*
rather than on a *paid Stripe session*?

Why it matters: `join.html:262-269` promises the code is "recognized by every
peer you meet." That makes it a durable, peer-visible mark of standing, and
payment is currently the only way to get one. It is not a Token of Gratitude,
but it occupies the same socket — and Tokens are earned through service and
never bought. This is the firewall's blind side.

If decoupling is not feasible, the fallback is to make the code commemorative
with no functional unlock.

---

## Sequence

```
Phase 0  ─┬─ 0.1 origins (box + repo)      ─┐
          ├─ 0.2 third-party tax claim      │  hours
          └─ 0.3 open parallel tracks ──────┼──────────────────┐
                                            │                  │
[ email provider decision ]  ───────────────┘                  │
          │                                                    │
Phase 1  ─┴─ replace Web3Forms                                 │
          │                                                    │
Phase 2  ─┴─ 2.1 non-payment join → 2.2 copy reframe           │
                                    2.3 ← gateway answer ──────┘
Phase 3  ─── privacy hardening (independent, any time)

Phase 4  ─── tax decisions · donor login (after Phase 1 email)
```

## Open questions

- **Email provider** — Postmark, Resend, or SES. Blocks Phases 1 and 4.
- **Founding-gift code** — decouple from payment, or make commemorative? Owned
  by IndrasNetwork.
- **Declaration retention** — forward-and-forget is proposed. If declarations
  need to be kept for review, that is a storage decision with Article 9
  consequences and should be made explicitly, not by default.
- **Footer tax language** — change to the approved formulation, or keep?
- **Disinterested director** — who, and by when?
