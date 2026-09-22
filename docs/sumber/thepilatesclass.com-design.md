---
version: alpha
name: The Pilates Class
description: A light, editorial fitness system balancing soft luxury with high-energy clarity.
colors:
  primary: "#BCFF88"
  secondary: "#222325"
  tertiary: "#E5E7EB"
  neutral: "#FFFFFF"
  surface: "#FFFFFF"
  on-surface: "#222325"
  muted: "#C8C0B2"
  accent-warm: "#CBBEA3"
  border: "#E5E7EB"
  overlay: "#4B3F3A"
  error: "#C94B4B"
typography:
  headline-display:
    fontFamily: "Euclid Circular A"
    fontSize: "60px"
    fontWeight: 400
    lineHeight: "72px"
    letterSpacing: "-0.6px"
  headline-lg:
    fontFamily: "Canela"
    fontSize: "53px"
    fontWeight: 200
    lineHeight: "64px"
    letterSpacing: "1.28px"
  headline-md:
    fontFamily: "Euclid Circular A"
    fontSize: "41px"
    fontWeight: 200
    lineHeight: "49px"
    letterSpacing: "-0.3px"
  headline-sm:
    fontFamily: "sans-serif"
    fontSize: "46px"
    fontWeight: 200
    lineHeight: "55px"
    letterSpacing: "0px"
  body-lg:
    fontFamily: "Euclid Circular A"
    fontSize: "36px"
    fontWeight: 200
    lineHeight: "59.22px"
    letterSpacing: "-0.36px"
  body-md:
    fontFamily: "Euclid Circular A"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: "30px"
    letterSpacing: "0px"
  body-sm:
    fontFamily: "Euclid Circular A"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "22px"
    letterSpacing: "0px"
  label-lg:
    fontFamily: "Euclid Circular A"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: "20px"
    letterSpacing: "0.04em"
  label-md:
    fontFamily: "Euclid Circular A"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "16px"
    letterSpacing: "0.04em"
  label-sm:
    fontFamily: "Euclid Circular A"
    fontSize: "10px"
    fontWeight: 500
    lineHeight: "12px"
    letterSpacing: "0.08em"
  nav-link:
    fontFamily: "Euclid Circular A"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
    letterSpacing: "0px"
  caption:
    fontFamily: "Euclid Circular A"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "18px"
    letterSpacing: "0px"
rounded:
  none: 0px
  sm: 4px
  md: 8px
  lg: 12px
  xl: 20px
  full: 9999px
spacing:
  xs: 10px
  sm: 20px
  md: 40px
  lg: 60px
  xl: 100px
  gutter: 24px
  section: 80px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.sm}"
    padding: "17px 37px"
    height: "48px"
    width: "260px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.sm}"
    padding: "17px 37px"
    height: "48px"
    width: "260px"
  button-tertiary:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.none}"
    padding: "0px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: "16px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: "14px 16px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "8px 12px"
  cookie-bar:
    backgroundColor: "{colors.overlay}"
    textColor: "{colors.neutral}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.none}"
    padding: "16px 24px"
  nav-link:
    backgroundColor: "transparent"
    textColor: "{colors.neutral}"
    typography: "{typography.nav-link}"
    rounded: "{rounded.none}"
    padding: "0px"
---


> **Arsip mentah — bukan sumber kebenaran.**
> Hasil ekstraksi otomatis dari `thepilatesclass.com`, disimpan apa adanya sebagai
> rujukan asal. Sistem desain yang dipakai ada di [../07-design.md](../07-design.md):
> skala hurufnya sudah dipisah pemasaran vs aplikasi, dua aksen teks di sini gagal
> kontras WCAG dan sudah diganti (DS-18), dan warna status domain ditambahkan.
> Jangan menyalin nilai dari berkas ini ke kode.

# The Pilates Class

## Overview
The Pilates Class feels airy, editorial, and aspirational, with a wellness-first tone that still reads polished and premium. The visual language is intentionally minimal so the imagery and messaging can carry most of the emotional weight. It suits an audience looking for contemporary fitness content that feels calm, stylish, and confidence-building rather than aggressive or highly technical.

## Colors
- **Primary (#BCFF88):** A bright, lively lime accent used for the strongest calls to action. It gives the brand its energetic spark without overpowering the otherwise soft palette.
- **Secondary (#222325):** A deep charcoal used for text, icons, and structure. It provides crisp readability and keeps the brand grounded and refined.
- **Surface (#FFFFFF):** Clean white surfaces support the airy layout and preserve the editorial feel.
- **Tertiary (#E5E7EB):** A subtle neutral border tone for cards and separation when structure is needed without visible heaviness.
- **Muted (#C8C0B2):** A warm beige-gray used for secondary emphasis and soft supporting details.
- **Accent Warm (#CBBEA3):** A sand-toned accent that can be used for highlighted editorial phrases or gentle warmth in supporting UI.
- **Overlay (#4B3F3A):** A dark cocoa tone suited to cookie bars, overlays, or low-contrast utility regions.
- **Error (#C94B4B):** Reserved for validation and destructive states; it should remain rare and functional.

## Typography
The system combines a modern geometric sans with a graceful serif accent. Euclid Circular A carries the bulk of the interface: navigation, body copy, labels, buttons, and utility text. Canela provides the more expressive editorial headline voice, especially for larger marketing moments.

Headlines are intentionally light in weight, with generous sizes and comfortable leading to keep the page feeling luxurious rather than crowded. Body text stays relatively large and open, matching the spacious visual cadence of the homepage. Labels and CTAs use slightly increased letter spacing and medium weight to create clarity, structure, and a subtle premium finish.

## Layout
The composition favors a wide, full-bleed hero followed by generous whitespace and a centered content rhythm. Navigation sits on a single horizontal line with strong left-right balance, while the hero content anchors to the left and the imagery dominates the rest of the frame. Spacing is loose and measured, using the 10px to 100px scale to create calm vertical separation between sections.

Section padding should remain substantial, with large breathing room around marketing copy and cards. Use a fluid container approach with ample gutters rather than a dense grid. Content blocks should feel editorial and layered, not modular or dashboard-like.

## Elevation & Depth
The interface is mostly flat, relying on contrast, whitespace, and image layering instead of shadows. Depth comes from the hero photography, the strong CTA color, and the dark cookie bar at the bottom. Borders are minimal and subdued, used only when a component needs separation from white surfaces.

Avoid heavy shadow systems; they would conflict with the site’s calm, refined mood. If depth is needed, prefer tonal shifts, overlay bands, or thin borders over drop shadows.

## Shapes
The shape language is restrained and rectilinear. Small 4px radii define primary buttons, while cards use a soft 8px corner to stay approachable without feeling playful. Overall, the system should read clean, minimal, and lightly rounded rather than bubbly or organic.

Full pills are appropriate for chips or tags when needed, but most interactive elements should retain crisp edges. The geometry should support the premium editorial tone.

## Components
Buttons are the most expressive UI element. `button-primary` uses the lime `primary` background with dark text, strong readability, and a compact 48px height. It should feel decisive and promotional, suited to trial signups and major conversion points. `button-secondary` is outlined or light-surface in appearance and should be used for less dominant actions. `button-tertiary` should remain text-only and understated for navigation or inline utility actions.

Cards should be white, lightly bordered, and gently rounded with `card` styling. Keep padding comfortable but not oversized so content feels organized and breathable. Do not add shadows unless the design context materially changes from the source.

Inputs should follow the same quiet visual system: white fill, dark text, modest radius, and simple border treatment. They should be clear and functional rather than decorative. Focus states should be visible through contrast, not glow-heavy effects.

Chips and tags may use pill rounding with compact padding to match the brand’s soft-but-precise aesthetic. The cookie bar should use the dark overlay tone with white text and a simple rectangular form, emphasizing utility over decoration. Navigation links should stay small, light, and unobtrusive, with enough spacing to read comfortably across the header.

## Do's and Don'ts
- Do keep the interface spacious, editorial, and image-led.
- Do use the lime primary only for high-priority actions and selected emphasis.
- Do preserve the light typographic weights and generous line heights.
- Do favor flat surfaces, subtle borders, and tonal contrast over shadows.
- Don't crowd the layout with dense UI blocks or excessive component nesting.
- Don't introduce saturated secondary colors that compete with the brand accent.
- Don't use heavy rounded corners or playful shapes that weaken the premium tone.
- Don't overuse uppercase text; reserve stronger letter spacing for labels and CTA treatments only.