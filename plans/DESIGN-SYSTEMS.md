# Two design systems

**2026-09-18.** Approved and rolled out locally the same day; not yet deployed to the box. Specimen with both systems in both
modes: https://claude.ai/artifact/CACkDuu65s1CRSNXodKuiW

Supersedes the palette and type sections of `BRAND.md` ("temple at dusk /
garden at dawn", Ubuntu) once approved. `BRAND.md` itself is untouched until
then. Companion to `plans/SITE-SPLIT.md`.

## 1. The two personalities

| | **Two Skies** — Temples of Earth | **Illuminated** — Temples of Refuge |
|---|---|---|
| Drawn from | The two mats: one pattern under a day sky and a night sky | The illuminated manuscript: plaster, iron-gall ink, rubric red, lapis, gold leaf |
| Voice | A maker showing you the thing | A keeper reading the charter aloud |
| Type | **Ubuntu stays** (Truman, 2026-09-18), already self-hosted; headlines drop to weight 300 and sentence case, so they read like linework | Marcellus for inscriptions, Alegreya for reading; labels in red italic |
| Colour | Coloured grounds, jewel accents, the full spectrum once per page | Near-monochrome; colour only where a scribe would have used pigment |
| Shape | Circles and pills; the mat's 2:3 frame | Square corners everywhere; one arch |
| Layout | Left-aligned, product beside words | A centred facade at the door, a left reading column inside |
| Motion | One moment: the linework draws itself in on load | None |

## 2. Two Skies — tokens (`shared/theme-earth.css`)

| Role | Day | Night |
|---|---|---|
| Page `--t-bg` | `#EFF5F2` Day sky | `#0F0E24` Night sky |
| Surface `--t-sf` | `#E3EDE8` Sea mist | `#161533` Deep field |
| Raised `--t-cd` | `#FAFCFB` Cloud | `#1D1B42` Nebula |
| Text `--t-tx` | `#1B1A3A` Indigo ink | `#EEEAFB` Starlight |
| Body `--t-t2` | `#4A4B6B` Dusk ink | `#B5B0DC` Haze |
| Accent `--t-ac` | `#0F7B6C` Jade | `#5FE0BE` Jade light |
| Second `--t-a2` | `#6F45BD` Amethyst | `#B99BFF` Amethyst light |
| Notice `--t-wn` | `#A8740C` | `#E8D04A` Seed gold |
| `--signature` | the refraction line: `#6F45BD #3C6FE0 #1FB7A6 #7BD06A #F0D24A #F2994A #E5506E` | same |

Rules:

1. **Buttons are ink, not accent.** Primary button = text colour; jade arrives
   on hover. Colour is a response.
2. **Circles carry meaning.** One ring is one person, two overlapping are two.
   Never generic bullets.
3. **Images keep the mat's 2:3 frame**, 6px radius. Controls are full pills.
   Nothing in between, so `--radius-*` all collapse to 6px.
4. **The refraction line appears once**, under the header.
5. **One motion**: linework draws in on load, honouring
   `prefers-reduced-motion`. Everything else moves only when touched.
6. Mono (Ubuntu Mono, already self-hosted) is for code and real spec values
   only, not for labels.

## 3. Illuminated — tokens (`shared/theme-refuge.css`, scoped to `data-site="refuge"`)

| Role | Limewash (light) | Vigil (dark) |
|---|---|---|
| Page `--t-bg` | `#ECEBE6` Limewash | `#14161A` Slate |
| Surface `--t-sf` | `#E1E0DA` Plaster shadow | `#1B1E23` Soot |
| Raised `--t-cd` | `#F6F5F1` Vellum | `#22262C` Flagstone |
| Text `--t-tx` | `#1A1D24` Iron-gall | `#EAE4D6` Candlelit vellum |
| Body `--t-t2` | `#4A4E59` Faded ink | `#B4AFA2` Ash |
| Action `--t-ac` | `#A3241B` Rubric | `#D4AF5A` Gold leaf |
| Links `--t-a2` | `#24408E` Lapis | `#93A9EA` Lapis, lit |
| Rubrics `--t-rubric` | `#A3241B` | `#E27A66` |

Rules:

1. **Red marks what to read next.** A rubric (`.rub`: red, italic, sentence
   case) sits above a heading only when it says something true about it: the
   article number, the state of the network, a place. Never ornament.
2. **Blue points elsewhere.** Lapis is for links and nothing else.
3. **One arch.** The home page wears it. Inner pages are plain columns with
   square corners and one double rule at the foot.
4. **Centre the door, not the house.** Only the facade is centred. Anything
   longer than four lines is set left, about 64 characters wide.
5. **A drop cap opens a document, once.** Cosmology and Charter get one each,
   in rubric red, in Marcellus.
6. **Nothing moves.** The theme file switches off animation and transition for
   the whole site. Links underline, buttons invert.
7. All radii and shadows are zero.

## 4. Fonts

Temples of Earth keeps Ubuntu and Ubuntu Mono, already in `shared/fonts/` and
declared in `fonts.css`.

Temples of Refuge uses Marcellus 400 and Alegreya 400, 500, 400 italic and 500
italic, latin + latin-ext. The ten woff2 files are in `shared/fonts/` and are
declared in `shared/fonts/fonts-refuge.css`, which only `theme-refuge.css`
imports, so Earth pages never declare them. Source: Fontsource builds of the
Google Fonts releases, SIL Open Font License 1.1, fetched 2026-09-18. Nothing is
loaded from a third party (COMPLIANCE 3.1).

## 5. Rollout

Done locally, 2026-09-18, and checked in a browser in both modes:

- [x] `shared/theme-refuge.css` linked on `refuge/index.html`; real fonts load.
- [x] `shared/theme-earth.css` linked after `brand.css` on all nine Earth pages
      that use the brand stylesheet: `index`, `join`, `mats`, `found-a-temple`,
      `covenant`, `bylaws`, `cosmology`, `articles/index`, `articles/read`.
- [x] **Buttons are ink.** The old `--signature` token was the gradient button
      fill. It now resolves to the text colour, and the spectrum moved to its
      own `--refraction` token, used only for the line under the header. The
      call-to-action classes (`.hero-cta`, `.btn-primary`, `.toe-nav-cta`,
      `.gate-action`, `.offering-btn`, `.submit-row .cta-submit`) are restyled
      from the theme with `:root`-led selectors, because page-local `<style>`
      blocks load later and would otherwise win.
- [x] Headlines: weight 300, sentence case, tight tracking, from the theme.
- [x] Colour pass. The pages were already well tokenised. Fixed: eight gold
      literals on the home page now read `--t-wn`; the membership error colour
      reads `--t-er`.
- [x] Hero art checked against the new grounds: `temple-dusk-hero` sits well on
      the indigo night and fades cleanly into the day sky.

Left as they are, on purpose:

- `coherence-engine.html` does not use the brand stylesheet. It is a
  self-contained canvas piece with its own night palette, already close to
  Night mode.
- `shared/substack-feed.js` carries the embed's own fallback colours.
- `mats.html` keeps literal blacks and whites inside the product photography
  frames, where they are lighting, not theme.

Still to do:

- [ ] Deploy. This folder is not the git checkout; the box pulls from GitHub.
      Note HANDOFF.md: push-to-deploy was already four commits behind.
- [ ] Replace the mono uppercase eyebrows on Earth pages with plain labels, or
      remove them. They still read as the old system.
- [ ] New favicons and Open Graph images per site. The Refuge mark could be the
      arch alone.
- [ ] Rewrite `BRAND.md` as two short brand notes.
- [ ] Remove the three now-dead CSP grants noted in COMPLIANCE, and do not add
      any: neither theme needs a new origin.
