# Temples of Earth — Brand System

**Temples of Earth** is the public brand. **Temples of Refuge** is the legal
508(c)(1)(A) entity behind it and appears only in legal instrument text
(bylaws, covenant), donation/Stripe records, email addresses, and the footer
legal line. Everything a visitor reads leads with Temples of Earth.

The identity is **ancient-future solarpunk**: organic and grounded in the soil,
embracing technology in service of regeneration. A temple at dusk (dark mode,
default) and a garden at dawn (light mode). Regeneration is the central theme —
growth, soil, sun.

## Typography — the Ubuntu family

One family, three voices, one Google Fonts import (see `shared/brand.css`):

| Voice | Face | Weights | Role |
|---|---|---|---|
| Display + body | **Ubuntu** | 300 / 400 / 500 / 700 | `--s-display`, `--s-font`, `--font-display`, `--font-body`. 300 for meditative body prose, 500 headings, 700 hero/display. |
| Technical | **Ubuntu Mono** | 400 / 700 | `--mono`, `--font-mono`. Eyebrows, labels, specs, data. Uppercase + positive letter-spacing lives ONLY here (and in the wordmark). |
| Wordmark | Ubuntu 500 | — | "TEMPLES OF EARTH", uppercase, 0.18em tracking, next to the fractal icon. |

Rules:
- Negative tracking (-0.01 to -0.02em) on Ubuntu above ~32px; it sets loose.
- Body line-height 1.7+; the reading experience is unhurried.
- No other typefaces. The Palladio arc-text seals in `assets/Final-Logo/` are
  legacy/print-ceremonial, not web chrome.

## Palette

Tokens live in `shared/brand.css` under the same `--t-*` / `--s-*` names the
pages already consume. Dark is the default; light responds to
`prefers-color-scheme` and the toggle (`data-theme` on `<html>`).

### Dark — "temple at dusk" (default)
Warm humus, never zinc/blue-black.

| Role | Token | Value |
|---|---|---|
| Page bg | `--t-bg` | `#141210` |
| Surface | `--t-sf` | `#1c1915` |
| Card | `--t-cd` | `#221e18` |
| Hover | `--t-hv` | `#2c2720` |
| Text | `--t-tx` | `#f2ede2` |
| Text 2nd | `--t-t2` | `#b3a992` |
| Muted | `--t-mt` | `#7d745f` |
| Ghost | `--t-dm` | `#4c4536` |
| Border | `--t-bd` | `#352e22` |
| Border subtle | `--t-b2` | `#262117` |
| Accent (living green) | `--t-ac` | `#7fb069` |
| Accent 2 (solar gold) | `--t-a2` | `#e9c46a` |

### Light — "garden at dawn"

| Role | Token | Value |
|---|---|---|
| Page bg | `--t-bg` | `#f7f4ec` |
| Surface | `--t-sf` | `#efeadd` |
| Card | `--t-cd` | `#fffdf6` |
| Hover | `--t-hv` | `#e6dfcc` |
| Text | `--t-tx` | `#26301f` |
| Text 2nd | `--t-t2` | `#5b6b4f` |
| Muted | `--t-mt` | `#8f957f` |
| Ghost | `--t-dm` | `#b9bfa8` |
| Border | `--t-bd` | `#ddd5bd` |
| Border subtle | `--t-b2` | `#e9e3d1` |
| Accent (living green) | `--t-ac` | `#2d7a4e` |
| Accent 2 (solar gold) | `--t-a2` | `#b08427` |

### Accent discipline
- **Living green** is the primary accent: links, focus, growth, regeneration.
- **Solar gold** is the technology/sun voice: sparing — highlights, the second
  stop of the signature gradient, never large fills.
- **Signature gradient** (`--signature`): soil-green → living green → solar
  gold, `linear-gradient(135deg,#4a7c59 0%,#7fb069 45%,#e9c46a 100%)`.
  One highest-emphasis moment per page (hero CTA).
- Status: ok = green, warn = gold, error = warm clay red (`--t-er`).

## Logo

- **Mark**: the fractal Flower-of-Life icon
  (`assets/Final-Logo/*/icon/icon-transparent.svg`). Favicons stay icon-only.
- **Web lockup**: icon + "TEMPLES OF EARTH" wordmark in Ubuntu 500 — built in
  HTML (see the brand bar in `shared/brand.js`), no baked-text SVG on the web.
- The old arc-text seals ("TEMPLES OF REFUGE", URW Palladio) are retired from
  the web; they remain valid for print/ceremonial use until regenerated.

## Chrome

- `shared/brand.js` injects a fixed 48px top **brand bar** (lockup left,
  dark/light toggle right) on every page — same slot the old ThemeEngine skin
  bar occupied, so existing `padding-top: 48px` layouts hold.
- Theme choice persists to `localStorage("toe-theme")`; default follows
  `prefers-color-scheme`, falling back to dark.
- Depth comes from surface layering + 1px borders, not drop shadows. Radius
  14px cards, 8px controls, 100px pills.

## Footer legal line (every page)

> Temples of Earth is the public name of Temples of Refuge, an association of
> churches mandatorily tax-exempt under §501(c)(3) and §508(c)(1)(A).

## Do / Don't

- **Do** lead every title, og tag, nav, and CTA with "Temples of Earth".
- **Do** keep `hello@`/`ola@templesofrefuge.earth` (no mail on the new domain)
  and `trumanellis/templesofrefuge.earth` GitHub URLs (the loaders fetch them).
- **Don't** reintroduce the skin switcher, indigo/zinc palette, or the
  Cinzel/Cormorant/Fraunces font pile on this site.
- **Don't** put "Temples of Refuge" in brand-voiced copy; it belongs to the
  legal layer only.
