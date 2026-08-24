# grip-site

Static site builder for **grip.health**, built with [Astro](https://astro.build) and MDX.

Every page is one `.mdx` file with YAML frontmatter. Page layout is composed from a
small set of block components that reproduce the visual language of the live site.

## Getting started

```bash
npm install
npm run dev      # dev server on http://localhost:4321
npm run build    # static output in dist/
npm run preview  # serve the built site
npm run check    # type-check .astro / .mdx
```

## URLs

Paths mirror the live site exactly, so this is a drop-in replacement with no
redirects needed:

| Source file                            | URL                      |
| -------------------------------------- | ------------------------ |
| `src/content/pages/home.mdx`           | `/`                      |
| `src/content/pages/huisarts.mdx`       | `/pages/huisarts`        |
| `src/content/pages/prijs-grip-reuma.mdx` | `/pages/prijs-grip-reuma` |

The filename is the slug. `home.mdx` is special-cased to render at `/`.

## Content model

### Frontmatter

```yaml
---
title: Voor de behandelaar # rendered as "Grip – Voor de behandelaar"
description: '' # meta description + og:description
type: page # 'page' or 'news'
date: 2018-10-20 # news only; the index sorts on it
image: /assets/media/... # og:image, news masthead, news index card
imageAlt: ''
crumb: '' # breadcrumb label; defaults to title
nav: huisarts # which nav item to mark active
---
```

Pages with `type: news` automatically get the article masthead, share links,
publication date and a back-link to the news index — do not add those by hand.
They also appear on `/pages/nieuws` automatically, newest first.

### Blocks

Block components are available in every `.mdx` file **without an import**
(they are injected by the page routes via `src/components/mdx-components.ts`).
Markdown inside a block is rendered normally, so `**bold**`, links and lists
all work.

| Block           | Purpose                                                       |
| --------------- | ------------------------------------------------------------- |
| `<Hero>`        | Full-bleed landing hero with background photo and lead        |
| `<PageHeader>`  | Navy interior page header with the orange squiggle artwork    |
| `<HeaderImage>` | Rounded photo overlapping up into the header above it         |
| `<Lined>`       | Half-width text hanging off the pale-blue vertical rule       |
| `<LineButton>`  | CTA attached to that rule (inside `<Lined>`'s `buttons` slot) |
| `<LineEnding>`  | The rule's closing flourish plus device/QR artwork            |
| `<Columns>`     | Media beside text, either order; image or video               |
| `<Banner>`      | Dark navy rounded banner, centred white text                  |
| `<Card>`        | White rounded card; two in a row sit side by side             |
| `<TextBlock>`   | Plain prose, half or full measure, optionally centred         |
| `<TextColumns>` | Long-form prose in two balanced columns (legal pages)         |
| `<People>`      | Grid of circular portraits with name and affiliation          |
| `<NewsGrid>`    | The news index, generated from the content collection         |
| `<NewsText>`    | Body copy inside a news article                               |
| `<Button>`      | Pill link inside prose                                        |

Example:

```mdx
---
title: Voor de behandelaar
nav: huisarts
---

<Hero heading="Maak kennis met Grip" image="/assets/media/media-134-original.jpg">
  Grip draagt bij aan het vergroten van eigen regie.
</Hero>

<Lined>
  ## Ondersteuning bij aanhoudende klachten

  Grip is geschikt voor **volwassen** personen met aanhoudende klachten.

  <div slot="buttons">
    <LineButton href="/pages/patient" color="orange">Voor de patiënt</LineButton>
  </div>
</Lined>

<Columns image="/assets/media/grip_intro.png" alt="Grip" side="left" lined>
  ## Grip biedt hulp

  Aanhoudende lichamelijke klachten komen veel voor.

  <Button href="/pages/werking">Lees meer</Button>
</Columns>
```

## Project layout

```
src/
  content/pages/       # one .mdx per page — this is where you edit content
  content.config.ts    # frontmatter schema
  components/blocks/    # the block components above
  components/mdx-components.ts  # blocks injected into every MDX page
  config/site.ts       # nav, footer links, contact details, copyright
  layouts/BaseLayout.astro
  pages/index.astro          # renders home.mdx at /
  pages/pages/[slug].astro   # renders every other page at /pages/<slug>
  styles/global.css    # the design system
  lib/date.ts          # Dutch date formatting
public/
  assets/media/        # page photography and video
  assets/site/         # logos, artwork, social icons
  assets/team/         # portraits
  fonts/               # IBM Plex Sans (woff2)
tools/
  import-from-live.mjs # one-shot importer, HTML snapshot -> MDX
  snapshots/           # the HTML this content was imported from
```

## Chrome and shared content

Navigation, footer links, contact details and the copyright line live in
`src/config/site.ts` — edit them there, not in the components.

## Fonts

**IBM Plex Sans** is vendored in `public/fonts/` (SIL Open Font License).

Headings on the live site use **Objectivity**, a commercial font that is *not*
bundled here. `global.css` references it by name with an IBM Plex Sans fallback,
so licensed machines render it correctly and everything else degrades cleanly.
To enable it everywhere, drop the licensed `.woff2` files into `public/fonts/`
and uncomment the `@font-face` block near the top of `src/styles/global.css`.

## Re-running the importer

`tools/import-from-live.mjs` regenerates `src/content/pages/*.mdx` from the HTML
snapshots in `tools/snapshots/`:

```bash
node tools/import-from-live.mjs
```

**This overwrites the MDX files.** It exists so the original conversion is
reproducible and auditable; once you start editing content by hand, treat the
`.mdx` files as the source of truth and leave the importer alone.

## Styling notes

`src/styles/global.css` is a cleaned-up transcription of the live stylesheet
(design tokens, block layouts and responsive breakpoints).

One deliberate omission: there is **no** universal `box-sizing: border-box`
reset. The original leaves elements as `content-box` and opts individual rules
in. Adding a global reset subtracts padding from `.half-width` and narrows every
text measure on the site.
