# Site split: Temples of Earth and Temples of Refuge

**Started 2026-09-18.** Status: phase A begun locally, nothing deployed.

## 1. Why

Until now the two domains were one site: one checkout on disk, one Caddy block,
every page canonical to `templesof.earth`, branded Temples of Earth, with
Temples of Refuge named in the footer as "the legal entity behind it"
(`BRAND.md`). That was coherent while Temples of Refuge was the operating
entity. It no longer is.

The structure decided in September 2026 separates two things that the old site
fuses:

| | **Temples of Earth** | **Temples of Refuge** |
|---|---|---|
| What it is | The brand, becoming Temples of Earth, Lda, a steward-owned Portuguese company | A network of temples: a cosmology, a charter, a council with one delegate per temple |
| What it does | Makes and sells the Ceremony Mat; runs the Synchronicity Engine network and its memberships | Keeps the charter and the name; convenes the temples |
| Money | Sales and memberships, invoiced, VAT, company revenue | **None.** No donations, no sales, no checkout |
| Owns | Copyright, stock, the business | **Nothing.** Each temple owns its own things |
| Legal claims it may make | Seller identity, VAT, consumer terms | **None.** No exemption, deductibility or "legal shelter" claims |
| Domain | `templesof.earth` | `templesofrefuge.earth` |

The rule underneath all of it: **the network is a covenant, a council and a
name, and it never carries the company's money or the company's name. The
company never borrows the network's religious standing.** Every page decision
below is an application of that rule.

## 2. Page map

| Page today | Goes to | Notes |
|---|---|---|
| `/` (index.html) | **Split.** | It is mostly a Refuge page already: Religion in Its True Sense, How We See Reality, the Body as Temple, Death Is Not Failure, the Twelve Affirmations, Network of Temples. Those sections move to Refuge. "Gift Over Extraction", "The Synchronicity Engine" and "The Ceremony Mat" are Earth. Earth gets a new, shorter home. |
| `/cosmology` | Refuge | Unchanged in substance; retitle "— Temples of Refuge". |
| `/bylaws` | Refuge, as `/charter` | Reframed as the **draft charter of a network in formation**, not the bylaws of an operating Utah association. Needs a rewrite, not a rename; see §5. 301 from `/bylaws`. |
| `/found-a-temple` | Refuge | Keep the declaration form and the scrollytelling. **Remove the Members' door** (membership is an Earth thing and must not gate a Refuge conversation) and **remove the "Legal shelter" card** (§4). |
| `/covenant` | Earth | The Indra's Network Membership Covenant is an agreement with members of the Synchronicity Engine network. Its counterparty becomes Temples of Earth when Covenant v3 is adopted (Structure Drafts, file 50). Until then it still names Temples of Refuge; see §4. |
| `/join` | Earth | Becomes a **membership purchase from the company**, not an offering to a church. Blocked on the seller changing; see §3 phase B. |
| `/mats` | Earth | Already a purchase, already carries no donation language. Seller identity changes in phase B. |
| `/coherence-engine` | Earth | Unchanged. |
| `/articles/` | Earth for now | Open question §6: the essays are teaching, which argues for Refuge; "Refuge Is Also a Legal Word" in particular needs a read against §4 before it stays anywhere. |
| `LICENSE.md`, `BRAND.md`, `DESIGN.md` | Repo docs | `BRAND.md` line 3–6 ("Temples of Refuge is the legal 508(c)(1)(A) entity behind it") is now wrong and should be rewritten when phase B lands. |

## 3. Phases

### Phase A — identity and content (done on branch `site-split`, 2026-09-21)

Launched to the live site on 2026-09-21: both design systems, the path-aware
chrome and the first Refuge page. Then, on the branch, awaiting review:

- [x] `refuge/cosmology.html`. `/cosmology` is a forwarding stub.
- [x] `CHARTER.md` and `refuge/charter.html`: the draft Charter (§5). `/bylaws`
      forwards to it. `BYLAWS.md` stays in the repo as the Utah entity's
      historical instrument. Counsel-annotated copy: Structure Drafts, file 61.
- [x] `refuge/found-a-temple.html`. The Members' door is gone (open-door seam,
      inert hidden elements kept for the script). "What the network holds"
      became "What comes with the Charter"; the Legal shelter card is removed.
      The form still posts to `/inquiry`; tested end to end locally.
- [x] Home split by slicing the existing sections. Earth: hero, mat, engine,
      Gift Over Extraction, a short kindred section, writings. Refuge: the
      facade, then Religion in Its True Sense, the cosmology scrollytelling,
      the Central Teaching, Body as Temple, Radical Inclusion, Death Is Not
      Failure, the Twelve Affirmations and the Network of Temples map.
- [x] `shared/brand.js` tells from the path whether Refuge answers under
      `/refuge/` or at a domain root. Refuge pages link to each other
      relatively. Nothing needs flipping at phase C.
- [x] `infra/Caddyfile.split-proposal` regenerated from the current, longer
      Caddyfile. `caddy validate` passes, and it was run locally on two ports:
      every Refuge route, every redirect in both directions, same-origin
      `Cosmology.md` and `CHARTER.md`, and zero third-party requests on the
      Refuge domain were checked.

**For Truman to review on the branch before it merges:**

1. The Charter text, especially the bracketed choices and Articles 1.3, 4.5
   and 9.2.
2. The four new cards on Found a Temple, and the removal of the Members' door.
3. The new Earth hero line and the "kindred work" paragraph.
4. Whether the Refuge home is too long now that it carries the whole
   cosmology. The Illuminated system says nothing moves, so the scrollytelling
   switches stages without transitions there.

Still open from this phase: a Refuge Open Graph image and mark; the Earth
pages' uppercase mono eyebrows.

### Phase B — seller and money, blocked on the structure

These change **who the visitor is dealing with**, so they go live only when it
is true.

- [ ] `/mats` and `/join` sold by Truman's registered activity, then by Temples
      of Earth, Lda (Structure Drafts, file 70, weeks 1 and 3). New Stripe
      account in the seller's name; the church Stripe account stops taking
      money the same day.
- [ ] `/join` rewritten as a membership purchase: price, what it includes, VAT,
      right of withdrawal, membership terms (Structure Drafts, file 50). All
      offering, mission-and-control and §170 language removed, because it will
      no longer be a contribution to anyone.
- [ ] Earth footer on every page: the seller's legal name, NIF or NIPC, and
      address. Replaces the current footer block.
- [ ] `checkout-worker`: `COVENANT_MESSAGE`, `INVOICE_FOOTER`, the offering
      branch and the contribution-statement plan in `MEMBERSHIP-SERVICE.md` are
      all built for a US charity receiving gifts. They need a pass once the
      seller is a company. The `DonationSeedEvent` naming in the engine is a
      separate, cross-repo question.
- [ ] `BRAND.md` rewritten: Temples of Earth stands on its own; Temples of
      Refuge is a separate site with its own short brand note.

### Phase C — cut the domains apart on the box

- [ ] Apply `infra/Caddyfile.split-proposal`. From that moment
      `templesofrefuge.earth/` serves the Refuge root and the two domains can
      no longer show each other's pages.
- [ ] 301s on `templesofrefuge.earth` for the paths that moved to Earth
      (`/mats`, `/join`, `/covenant`, `/articles/*`, `/coherence-engine`), so
      printed QR codes and shared links survive. The mat QR code prints
      `/mats`; check which domain it prints before choosing the direction.
- [ ] 301s on `templesof.earth` for `/cosmology`, `/bylaws`, `/found-a-temple`.
- [ ] `webhook-deploy` `sites.json`: both hostnames still map to the one
      checkout. No second deploy target is needed because both roots live in
      one repo.

## 4. Claims to resolve (flagged, not rewritten)

`plans/COMPLIANCE.md` sets a standing rule on tax copy: **flag, do not
rewrite**. These are flagged under that rule. Proposed wording is given so the
decision is quick, but no existing page has been changed.

| Where | What it says | Why it is a problem now | Proposed |
|---|---|---|---|
| Footer block on `index`, `join`, `found-a-temple`, `articles/index`, and the other surfaces changed in COMPLIANCE 4.1; JSON-LD | "Temples of Earth is the public name of Temples of Refuge, an association of churches. Temples of Refuge is a 501(c)(3) religious organization." | The association has no member churches and is administered by one person abroad. The claim is the one most likely to be tested and least able to be shown. It also ties the Earth brand to the entity, which is the fusion this split exists to undo. | Earth, phase B: seller identity only. Refuge: the footer in `refuge/index.html`, which makes no status claim. **Interim, before phase B:** consider removing the second sentence everywhere and keeping only the first, which is at least a plain statement of fact about the name. |
| `join.html` | "donations are tax deductible to the extent permitted by law" | Invites US donors to rely on deductibility. A payment that buys network membership is a quid pro quo in any case. | Remove when `/join` becomes a purchase. **Interim:** the safest reading is to remove it now; this is the one line I would not leave live. |
| `found-a-temple.html`, "Legal shelter" card | "A Temple node within Temples of Refuge, a 508(c)(1)(A) association of churches under U.S. …" | Offers other communities standing under this entity's exemption. COMPLIANCE 0.2 already cut the sentence next to it for the same reason: it tells prospective founders about their legal position. The card's heading makes the same offer. | Remove the card. The Refuge home says the opposite on purpose: the network confers no legal or tax standing. |
| `index.html` meta description | "A 508(c)(1)(A) network of Temples…" | Same claim, in the snippet search engines show. | Refuge description in `refuge/index.html`. |
| `bylaws.html` meta description | "an association of churches under U.S. and Utah law" | Presents a draft structure as an operating one. | §5. |
| `join.html`, `cta-widgets.js` | "Your gift supports the mission of Temples of Refuge — the network of temples, the Synchronicity Engine, and the stewardship of sacred lands." | The three things named are now three different owners. | Goes away with phase B. |

## 5. The charter

`BYLAWS.md` is written as the governing instrument of an existing Utah
association of churches with an Inner Council. The network as now described is
not that yet. The Refuge `/charter` page should be a **draft charter offered to
the first temples**, covering: what a temple is; what a temple promises; how a
delegate is chosen; what the council may and may not decide; that the network
owns nothing, takes no money and confers no standing; how a temple leaves; how
the charter is amended. It comes into force when the first temples adopt it
together, in the place their council will meet. Draft it as
`Structure Drafts/61` and publish from there.

## 6. Open decisions (Truman)

1. **The Utah entity: dissolve or hibernate.** Decides the one line in the
   Refuge footer marked `[DECISION PENDING]`, and whether `ola@templesofrefuge.earth`
   and the domain are held personally. Neither outcome permits a status claim
   on either site.
2. **Writings: Earth or Refuge.** Teaching argues for Refuge; the Substack feed
   and the engine essays argue for Earth. A split by article is possible.
3. **Visual identity: proposed 2026-09-18.** Two full systems, not a shared one with a different accent: *Two Skies* for Earth and *Illuminated* for Refuge. See `plans/DESIGN-SYSTEMS.md` and the specimen linked there. Refuge already wears its system on `refuge/index.html`; Earth's theme file is written but unlinked, pending a yes.
4. **Which domain the printed mat QR code points at.** Decides the direction of
   the `/mats` redirect in phase C.
5. **The interim removals in §4**, in particular the deductibility line.

## 7. Technical shape

One repo, two web roots:

```
/                      → templesof.earth         (repo root, as today)
/refuge/               → templesofrefuge.earth   (new root)
/shared/, /assets/, favicons
                       → served to both from the repo root
```

Keeping one repo keeps one deploy and one copy of the brand system. The Refuge
block serves `/shared/*`, `/assets/*` and the favicons from the parent root and
everything else from `refuge/`. It carries **no** Stripe entries in its
Content-Security-Policy, because there is no checkout on that site, and that
absence is the point. See `infra/Caddyfile.split-proposal`.

Until phase C, `refuge/index.html` is reachable at `/refuge/` on either domain,
which is harmless: it declares its own canonical and its own identity.
