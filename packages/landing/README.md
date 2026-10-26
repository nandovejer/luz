# @luz-ds/landing

The page structure of one kind of site, a landing page: the page of a product, a service or an event that asks the visitor to act. Its header, hero, main, sections, stats, footer and glow are classes on native elements, laid out in the markup by core's objects (`.o-page`, `.o-sticky`, `.o-container`, `.o-row`, `.o-stack`, `.o-grid--split`) and core's navbar; this package adds only their skin and rhythm. `@luz-ds/catalog` is optional: load it for the search, the language switch or the cookie banner.

> **Beta, version 0.x.** Landing has a version of its own, apart from tokens, core and catalog, and grows in minor versions while it is 0.x: any of them may change a class. Pin an exact version and read the changelog before you upgrade.

## When to use it

- You build the page of a product, a service or an event, with a hero and features to show side by side.
- Not for articles or an app: `@luz-ds/cms` and core's shell have what they need.

The blocks of an event landing page (hero, programme, speakers, tickets, call to action, registration) are markup to copy, on the [Landing page templates](https://nandovejer.github.io/luz/docs/landing/templates/) page of the docs. They use the classes of core and this package; a block of features of equal weight is a list on core's split grid, `ul.o-grid.o-grid--split`.

## Prerequisites

Requires `@luz-ds/tokens` and `@luz-ds/core`, version `^0.1.0 || ^0.2.0`, declared as peer dependencies, loaded in that order before this package. `@luz-ds/catalog` (`^0.1.0 || ^0.2.0`) is an optional peer: load it before this package if you use its pieces; the patterns work without it.

## Installation

```bash
npm install @luz-ds/tokens @luz-ds/core @luz-ds/catalog @luz-ds/landing
```

## Usage

### Via npm/bundler

```js
import '@luz-ds/tokens/css'
import '@luz-ds/core/css'
import '@luz-ds/catalog/components/search.css' // optional: one per catalog component the page uses
import '@luz-ds/landing/css'
```

### Via CDN

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/tokens@0.2.1/dist/luz-tokens.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.2.1/dist/luz.min.css">
<!-- Optional: one link per catalog component the page uses, here the search -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.2.1/dist/components/search.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/landing@0.2.1/dist/landing.min.css">
```

There is no script. Add core's and catalog's if you use their behaviours.

## Package exports

- **`./css`** → `landing.css` — the patterns, in the cascade layer `luz.landing`, after `luz.catalog` (`./css/min` for the minified twin)
- **`./components/*`** → `dist/components/` — one stylesheet per pattern, `<name>.css` and `<name>.min.css`, each in `luz.landing`, for a page that loads only what it uses

## Classes included

- `.luz-landing-header`, `__brand`, `__actions` — The header: on `header.o-sticky > .o-container.o-container--inline.o-row`, with core's `.luz-nav-toggle` and `.luz-navbar`. The page surface, a rule underneath, the brand and the row's gaps; its panels open under it. [Docs](https://nandovejer.github.io/luz/docs/landing/header/)
- `.luz-landing-hero`, `__copy`, `__eyebrow`, `__title`, `__lead`, `__media` — The first block: on `section.o-grid.o-grid--split`, two equal columns when each gets 24rem, one below. `--centered`: one column, the copy centred above the media. `__media--bleed`, in a centred hero: the media runs from edge to edge of the window, with no sideways scroll. [Docs](https://nandovejer.github.io/luz/docs/landing/hero/)
- `.luz-landing-main`, `.luz-landing-section`, `__eyebrow`, `__title`, `__lead`, `.luz-landing-glow` — The rhythm of the page, on `main.o-container.o-stack` and `section.o-stack`; the head of a section, which shares the hero's rules (load `hero.css` with `section.css`) one step smaller; and a tint behind the `.o-page`. Two knobs: `--luz-landing-title-accent`, the colour of the `em` in a hero or section title (unset, the title's), and `--luz-landing-glow-x`, where along the top edge the tint sits (unset, the edge where reading starts). [Docs](https://nandovejer.github.io/luz/docs/landing/section/)
- `.luz-landing-stat`, `__value`, `__label` — A figure and what it counts, alone or in core's `.luz-card`: a big number in the heading face with tabular figures, the label under it. [Docs](https://nandovejer.github.io/luz/docs/landing/stat/)
- `.luz-landing-footer`, `__brand`, `__col`, `__col-title` — The footer: on `footer > .o-container.o-container--inline.o-row`, a rule on top and its items at the two ends of the row; or on `footer > .o-container.o-container--inline.o-grid`, a brand block and columns of links, side by side from 768px, one under the other below. [Docs](https://nandovejer.github.io/luz/docs/landing/footer/)

<!-- luz:ai-agents:start -->
## For AI agents

`@luz-ds/landing` 0.2.1 is in beta: any release may break anything. Read the breaking changes below before you update, and use only what the files under "Read first" list.

### Breaking changes

No breaking changes in 0.2.1.

Older versions: https://github.com/nandovejer/luz/blob/main/packages/landing/CHANGELOG.md

### Read first

1. `dist/classes.json` in this package: the classes and custom properties its CSS defines. Write only those.
2. https://nandovejer.github.io/luz/llms.txt: the index of the documentation, short enough for a small context.
3. https://nandovejer.github.io/luz/llms-full.txt: the same pages in full.
4. https://nandovejer.github.io/luz/examples/: one standalone page of markup for each component and pattern.

### Load order

This package needs `@luz-ds/tokens` and `@luz-ds/core` loaded first.

`@luz-ds/catalog` is optional: the CSS of this package works with the packages above alone.

### Check what you write

Run `npx @luz-ds/check@0.2.1 <files>` on every HTML and CSS file you write, and fix what it reports. To copy the accessibility reviewer into your project: `npx @luz-ds/check@0.2.1 agent > .claude/agents/luz-accessibility-reviewer.md`.

<!-- luz:ai-agents:end -->

## License

MIT
