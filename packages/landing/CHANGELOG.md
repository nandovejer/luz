# @luz-ds/landing

## 0.2.0

### Minor Changes

- 446ebae: **Breaking.** Landing now holds the page structure of a landing page, moved from site: its header, hero, main, sections, footer and glow. Each is a class of the landing on a native element, laid out in the markup by core's objects (`.o-page`, `.o-sticky`, `.o-container`, `.o-container--inline`, `.o-row`, `.o-stack`, `.o-grid--split`, `.o-actions`) and core's navbar; the landing adds only its skin and its rhythm. Site is an optional peer: with tokens, core and landing alone, the header, hero and footer render, and the rules that refine site's `<luz-lang-switch>` match nothing. The feature grid is gone: it had no CSS of its own after core's split grid, so it is a template, a `ul.o-grid.o-grid--split`.

  **What each one is.**

  - `.luz-landing-header`, `__brand`, `__actions`: `header.luz-landing-header.o-sticky > div.o-container.o-container--inline.o-row`, with core's `.luz-nav-toggle` and `nav.luz-navbar[popover]`. The page surface, a 1 px divider, the brand (semibold, the text colour, no underline, 44 px), the row's gaps (8 px between rows, 16 px between items, 24 px from 769 px), and `anchor-name` / `anchor-scope: --luz-bar`, so the navbar's panel and the language list open under it, on two rows as on one, where anchor positioning is supported. Stickiness is `.o-sticky`'s.
  - `.luz-landing-hero`, `__copy`, `__eyebrow`, `__title`, `__lead`, `__media`: `section.luz-landing-hero.o-grid.o-grid--split`, with `--luz-grid-min: 24rem`; the same gaps, room above, type steps and Arabic rules as site's hero had.
  - `.luz-landing-main`: `main.o-container.o-stack.luz-landing-main`, 64 px between the blocks and under the last one, none above the first.
  - `.luz-landing-section`: `section.o-stack.luz-landing-section`, 16 px between its children; add core's `.luz-band` for the tint.
  - `.luz-landing-footer`: `footer.luz-landing-footer > div.o-container.o-container--inline.o-row`, a 1 px divider above, its items at the two ends, a column aligned to the start at 768 px and below.
  - `.luz-landing-glow`: on the `.o-page` element, the tint in the corner where reading starts (top right in right-to-left pages); none in print.

  | Was                                                                        | Now                                                                                                                                                                                                                 | Package       |
  | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
  | `.luz-site-header`, `__inner`, `__brand`, `__nav`, `__actions`, `--sticky` | `header.luz-landing-header.o-sticky > .o-container.o-container--inline.o-row`; `.luz-landing-header__brand`; `nav.luz-navbar > ul.luz-navbar__list > li > a.luz-navbar__link`; `.o-row.luz-landing-header__actions` | landing, core |
  | `.luz-site-hero`, `__copy`, `__eyebrow`, `__title`, `__lead`, `__media`    | `.luz-landing-hero.o-grid.o-grid--split`, `.luz-landing-hero__copy`, `__eyebrow`, `__title`, `__lead`, `__media`                                                                                                    | landing, core |
  | `.luz-site-footer` (the row itself)                                        | `footer.luz-landing-footer > .o-container.o-container--inline.o-row` (the divider is on the `<footer>`)                                                                                                             | landing, core |
  | `.luz-site-page`, `.luz-site-page--gradient`                               | `.o-page`, `.o-page.luz-landing-glow`                                                                                                                                                                               | core, landing |
  | `.luz-site-main`                                                           | `main.o-container.o-stack.luz-landing-main`                                                                                                                                                                         | landing, core |
  | `.luz-site-section`, `--band`                                              | `.o-stack.luz-landing-section`, `.luz-band`                                                                                                                                                                         | landing, core |
  | `.luz-site-actions`                                                        | `.o-actions`                                                                                                                                                                                                        | core          |
  | `.luz-landing-feature-grid`                                                | `ul.o-grid.o-grid--split` (a template on the landing templates page)                                                                                                                                                | core          |
  | `components/feature-grid.css`                                              | `components/header.css`, `hero.css`, `main.css`, `section.css`, `footer.css`, `glow.css`                                                                                                                            | landing       |
  | Docs: `/docs/landing/feature-grid/`                                        | `/docs/landing/header/`, `/hero/`, `/section/`, `/footer/`; the feature grid block on `/docs/landing/templates/`                                                                                                    | —             |

  Site's old page classes (`.luz-site-header`, `.luz-site-hero`, `.luz-site-footer` and the rest of the table above) are gone from `@luz-ds/catalog` in this release.

- 9f1c747: One stylesheet per component in site, landing and cms, as core already has: each `src/components/<name>.css` is also published as `dist/components/<name>.css` and `<name>.min.css`, in the package's own layer (`luz.catalog`, `luz.landing`, `luz.cms`), exported as `./components/*` (`@luz-ds/landing/components/header.css`). Site's print rules are also published on their own as `dist/print.css` (+ `.min`), exported as `@luz-ds/catalog/print.css`, for a page that loads components one by one; `catalog.css` still contains them. `./css` and `./css/min` stay the bundles.

  `@luz-ds/landing` and `@luz-ds/cms` now take `@luz-ds/catalog` as an optional peer (`peerDependenciesMeta`): their CSS works with `@luz-ds/tokens` and `@luz-ds/core` alone, and site, when you use it, is loaded before them. Tokens and core stay required.

  Core no longer names site's footer: `.o-shell` places its `footer` child across the bottom, as before, and nothing else. Site's footer class is gone (see below); put your footer in a `<footer>` that is a direct child of `.o-shell`.

  **Migration: the rest of site's page classes and exports.**

  | Was                              | Now                                                  |
  | -------------------------------- | ---------------------------------------------------- |
  | `.luz-site-content`              | `.o-container`                                       |
  | `.luz-site-skip-link`            | `.luz-skip-link` (core)                              |
  | `.luz-site-image*`               | `.luz-image*` (core), with no placeholder background |
  | `@luz-ds/catalog/placeholders/*` | removed: the placeholders are no longer published    |

- 65efde3: Every package now exports `./classes.json`, the classes, custom properties and `data-luz-*` hooks its CSS and script define, and core and catalog also export `./custom-elements.json`, their custom elements with the attributes each one reads, for editors and AI agents. Both are generated from the built `dist/`, and the Pages site serves a copy of each under `/manifests/<package>/`, beside `llms.txt`, `llms-full.txt` and one example page per component. `pnpm check:ai` regenerates all of them and fails when a file on disk is stale. `luz-check` carries a snapshot of these manifests. No runtime or style change.
- 3202d14: Landing 0.2: what any landing page wants, with no data of its own. All additions; nothing that worked before changes.

  - `.luz-landing-hero--centered`: one column (core's split grid with `--luz-grid-min: 100%`), the text centred, the copy at most 48rem wide and centred, the lead and the `.o-actions` row centred under the title.
  - `.luz-landing-hero__media--bleed`, in a centred hero: the media runs from edge to edge of the window in both directions, with no sideways scroll. No viewport unit: on a page that has one, the root is an inline-size query container and the media's margins are `calc(50% - 50cqi)`, so a visible scrollbar is not counted.
  - The head of a section: `.luz-landing-section__eyebrow`, `__title` and `__lead`. They share the hero's rules (one selector list in `hero.css`: load it with `section.css`); the title is one step smaller (`--luz-text-3xl`, `2xl` below 1024px, `xl` at 640px and below), the lead `lg` (`base` at 640px and below). The same Arabic rules as the hero: the sans for the eyebrow, no letter-spacing.
  - `--luz-landing-title-accent`: the colour of the `em` in a hero or section title. Unset, the title's colour.
  - `.luz-landing-stat`, `__value`, `__label` (new `components/stat.css`): a big number in the heading face with tabular figures, and secondary text under it; alone or inside core's `.luz-card`.
  - `.luz-landing-footer__brand` and `.luz-landing-footer__col` with `__col-title`, on `footer > .o-container.o-container--inline.o-grid`: a brand block and columns of links (a small heading over a plain list), side by side from 768px, the brand twice as wide as a column, one under the other below. Each link of a column is a box as tall as `--luz-control-sm`, so it is a target of 24px or more with no CSS of your own. The `> .o-row` footer is unchanged.
  - `--luz-landing-glow-x`: where along the top edge the glow's tint sits, a physical position (`0%` the left, `100%` the right). Unset, the edge where reading starts, as before. The right-to-left rule no longer repeats the gradient.

- 84f5646: First release of LUZ, formerly CAI (its packages were last published as 2.0.0, under another scope). Migration from those packages: install `@luz-ds/*` instead; every old prefix becomes `luz` (classes `.luz-*`, hooks `data-luz-*`, tokens `--luz-*`, elements `<luz-*>`, layers `luz.*`, events `luz:*`, storage keys `luz-*`); the stylesheet and the script are now `luz.css` and `luz.js`. Display preferences stored under the old keys are not read.
- 5fffc0f: Breaking: `@luz-ds/site` is now `@luz-ds/catalog`, the name the home and the docs already gave to level 3. Install `@luz-ds/catalog` and load `catalog.css` / `catalog.min.css` and `catalog.js` / `catalog.min.js` where you loaded the `site.*` files; its subpaths (`/search`, `/consent`, `/mode`, `/css`, `/css/min`, `/print.css`, `/components/*`, `/classes.json`, `/custom-elements.json`) keep their names. The cascade layer is `luz.catalog` instead of `luz.site`, in the order statement every stylesheet repeats (so tokens and core change too). The landing, cms, app and docs packages take `@luz-ds/catalog` as their optional peer. `luz-check` reads the new names and its `load/order` rule says tokens, core, catalog. The docs of the package are at `/docs/catalog/` (was `/docs/site/`). The tags (`<luz-search>`, `<luz-consent>`, `<luz-mode>`, `<luz-lang-switch>`, `<luz-submenu>`, `<luz-banner>`) and their classes do not change.

### Patch Changes

- 1464a9c: The hero's copy no longer widens the page when a word is longer than the line, for example with 400 % text on a 320 px screen (WCAG 1.4.10). A word in `.luz-landing-hero__copy` now breaks (`overflow-wrap: anywhere`), and the copy of a `--centered` hero is never wider than its column (`max-inline-size: min(100%, 48rem)`). At usual text sizes nothing moves.
- 423be2f: The peer dependencies on `@luz-ds/*` are `^0.1.0 || ^0.2.0`, so the next release (0.2.0 of tokens, core and catalog) is in range. With `^0.1.0` it was not, and changesets would have taken every dependent to 1.0.0.
