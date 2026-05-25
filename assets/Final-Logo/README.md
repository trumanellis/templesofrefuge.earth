# Temples of Refuge — Final Brand Assets

This folder contains every version of the official Temples of Refuge mark.

**Final design:** Fractal Flower-of-Life icon with "TEMPLES OF REFUGE" set in
URW Palladio Bold, all caps with generous tracking, arcing across the top of the seal.

---

## Folder structure

Each color palette has its own folder containing three subfolders:

```
Final-Logo/
├── 01-Royal/        ← the primary / default palette (violet + gold on indigo)
│   ├── icon/        ← the fractal mark alone (with its outer gold ring), no text
│   ├── seal/        ← full lockup with arc text + outer seal frame
│   └── web/         ← favicons + Apple touch icon + Android Chrome icons
├── 02-Aurum/        ← all gold on near-black (warm, regal)
├── 03-Lumen/        ← white on midnight (high contrast, celestial)
├── 04-Sanctum/      ← violet + gold on cream (light companion to Royal)
├── 05-Sylvan/       ← forest green + bronze on parchment (earth-rooted)
└── 06-Ink/          ← pure black on white (monochrome workhorse)
```

---

## Inside each palette's `icon/` and `seal/` folders

| File | Use it when |
|---|---|
| `icon.svg` / `seal.svg` | **Master file.** Editable vector, with the palette's background baked in. Drop into any design tool, scales infinitely. |
| `icon-transparent.svg` / `seal-transparent.svg` | Same vector, no background — for placing on photos, parchment textures, embroidery, wax-seal mockups, or any colored surface. |
| `icon.pdf` / `seal.pdf` | Print-ready vector PDF (with background). Send to a print shop for letterhead, business cards, signage. |
| `icon-256.png` … `icon-4096.png` | Raster, with background. Use for slides, social media posts, anywhere you need a JPG/PNG bitmap. |
| `icon-transparent-256.png` … `icon-transparent-4096.png` | Raster, no background. For overlaying on photos, web pages with custom backgrounds, etc. |

### PNG sizes provided
**256, 512, 1024, 2048, 4096 px** square. The 4096 is print-grade (suitable for billboards, large signage, embroidery digitization). 1024 is the everyday web/slide workhorse.

---

## Inside each palette's `web/` folder

| File | Use it for |
|---|---|
| `favicon.ico` | Multi-resolution Windows favicon (contains 16, 32, 48 px). Drop into web root as `favicon.ico`. |
| `favicon-16.png` … `favicon-512.png` | Modern browser favicons. Link from HTML `<link rel="icon">` tags. |
| `apple-touch-icon.png` | 180×180. iOS home screen icon. Link as `<link rel="apple-touch-icon">`. |
| `android-chrome-192.png` | Android home screen icon (small). |
| `android-chrome-512.png` | Android home screen icon (large) + PWA manifest icon. |

Example HTML for `templesofrefuge.earth`:

```html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" href="/favicon-32.png" sizes="32x32">
<link rel="icon" type="image/png" href="/favicon-192.png" sizes="192x192">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```

---

## Which palette goes where?

| Context | Recommended palette |
|---|---|
| Primary website (templesofrefuge.earth) | **Royal** or **Lumen** on dark backgrounds; **Sanctum** on light |
| Letterhead, business cards (printed) | **Sanctum** (color print) or **Ink** (single-color/photocopy) |
| Stamps, embossing, single-color etch | **Ink** |
| Land-temple materials (Templo da Agua Lila) | **Sylvan** |
| Premium / ceremonial — wax seals, brass plaques | **Aurum** |
| Photography overlays, video lower-thirds | the matching `-transparent` version of whichever palette |

---

## Color palette reference

| Palette | Background | Primary | Accent |
|---|---|---|---|
| Royal | `#150A26` | violet `#3F1E66 → #8A5FC2` | gold `#B8862E → #F0CE7B` |
| Aurum | `#0A0604` | bronze `#7A4F18 → #D8A857` | bright gold `#D49B30 → #FAE4A8` |
| Lumen | `#080615` | white `#A8A8C0 → #F4F4FA` | silver `#9090B0 → #FFFFFF` |
| Sanctum | `#F4ECDB` | deep violet `#2D124A → #6B3FA0` | gold `#7E5414 → #C99846` |
| Sylvan | `#F2EDDE` | forest `#162E1D → #3D6A48` | bronze `#6E4310 → #B47A2E` |
| Ink | `#FAFAF7` | black `#000000` | dark grey `#000000 → #3A3A3A` |

---

## Typography

Wordmark: **URW Palladio Bold** (Palatino-family Renaissance serif).
All text in the SVG files is converted to vector paths — no font file
required on the recipient's system; the SVGs render identically anywhere.

If you ever need to set additional brand text (taglines, body copy,
section headings), Palladio Bold for headers and a regular serif body
(EB Garamond, Cardo, or Palladio Roman) will all sit in family with the mark.

---

## Editing

To edit any SVG, open it in:
- **Figma, Sketch, Adobe Illustrator** — full vector editing
- **Inkscape** — free, cross-platform vector editor
- **VS Code or any text editor** — SVGs are XML; you can hand-edit colors,
  swap gradients, or change geometry directly

All gradients in the SVGs are named (`violetGrad`, `goldGrad`, `centerGlow`,
`violetGradSoft`); changing the `<stop>` colors inside `<defs>` shifts the
whole mark.

---

*Generated for Temples of Refuge brand identity, 2026.*
