# @luz-ds/core

## 0.3.1

### Patch Changes

- 6c92889: `MidiPlayer.load(url)` no longer follows redirects: it calls `fetch(url, { redirect: "error" })`, so a MIDI address that redirects fails through the player's error path instead of loading a file from wherever it points. Host the file at the address you give: a redirect now needs its final address.

## 0.3.0

### Minor Changes

- 94920c1: The patterns of a landing page, a blog, a web application and a documentation site are components of `@luz-ds/catalog` now, one stylesheet each. `@luz-ds/landing`, `@luz-ds/cms`, `@luz-ds/app` and `@luz-ds/docs` are not published any more, and the layers `luz.landing`, `luz.cms`, `luz.app` and `luz.docs` are gone. **Breaking:** if you use one of the four packages, follow the steps below.

  The look is the same. The name of each file is the name of its block, `<block>.css`, with no kind of site in it, and the classes and the elements are renamed in the same release (the table is in the notes on the names of catalog). The page of each pattern says which kinds of site it fits best.

  **1. Replace the package.**

  Remove the four packages from your `package.json`. Keep `@luz-ds/tokens`, `@luz-ds/core` and `@luz-ds/catalog`, and update them together: they share one version.

  **2. Link the files.**

  There is no `landing.css`, `cms.css`, `app.css` or `docs.css`, and no single file replaces one of them. Link the patterns your pages use, after core, in the order of the table: it is the order the stylesheet of each kind had them.

  | Old file                                    | New file                                                                          |
  | ------------------------------------------- | --------------------------------------------------------------------------------- |
  | `@luz-ds/landing/components/header.css`     | `@luz-ds/catalog/components/site-header.css`                                      |
  | `@luz-ds/landing/components/hero.css`       | `@luz-ds/catalog/components/hero.css`                                             |
  | `@luz-ds/landing/components/main.css`       | `@luz-ds/catalog/components/main.css`                                             |
  | `@luz-ds/landing/components/section.css`    | `@luz-ds/catalog/components/section.css`                                          |
  | `@luz-ds/landing/components/stat.css`       | `@luz-ds/catalog/components/stat.css`                                             |
  | `@luz-ds/landing/components/footer.css`     | `@luz-ds/catalog/components/site-footer.css`                                      |
  | `@luz-ds/landing/components/glow.css`       | `@luz-ds/catalog/components/glow.css`                                             |
  | `@luz-ds/cms/components/header.css`         | `@luz-ds/catalog/components/site-header.css`, and `masthead.css` for the masthead |
  | `@luz-ds/cms/components/page-header.css`    | `@luz-ds/catalog/components/page-header.css`                                      |
  | `@luz-ds/cms/components/article-header.css` | `@luz-ds/catalog/components/article-header.css`                                   |
  | `@luz-ds/cms/components/article.css`        | `@luz-ds/catalog/components/article.css`                                          |
  | `@luz-ds/cms/components/footer.css`         | `@luz-ds/catalog/components/site-footer.css`                                      |
  | `@luz-ds/app/components/header.css`         | `@luz-ds/catalog/components/app-bar.css`                                          |
  | `@luz-ds/app/components/dashboard.css`      | `@luz-ds/catalog/components/dashboard.css`                                        |
  | `@luz-ds/docs/components/shell.css`         | `@luz-ds/catalog/components/docs-layout.css`                                      |
  | `@luz-ds/docs/components/page-head.css`     | `@luz-ds/catalog/components/doc-header.css`                                       |
  | `@luz-ds/docs/components/rail.css`          | `@luz-ds/catalog/components/page-rail.css`                                        |
  | `@luz-ds/docs/components/example.css`       | `@luz-ds/catalog/components/example.css`                                          |
  | `@luz-ds/docs/components/dodont.css`        | `@luz-ds/catalog/components/do-dont.css`                                          |
  | `@luz-ds/docs/components/pager.css`         | `@luz-ds/catalog/components/pager.css`                                            |
  | `@luz-ds/docs/components/page-foot.css`     | `@luz-ds/catalog/components/page-footer.css`                                      |

  Link `hero.css` with `section.css`: the head of a section shares its rules with the hero. The table of contents of a blog is in `article.css`.

  On a CDN, a file is `https://cdn.jsdelivr.net/npm/@luz-ds/catalog@<version>/dist/components/<block>.min.css`. Add the `integrity` hash of the published file, as for any other file.

  ```html
  <link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@<version>/dist/components/site-header.min.css"
  />
  <link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@<version>/dist/components/hero.min.css"
  />
  ```

  ```js
  import "@luz-ds/catalog/components/site-header.css";
  import "@luz-ds/catalog/components/hero.css";
  ```

  **3. Drop the old layers.**

  The patterns are in `luz.catalog`, with the other catalog components. The order of the layers is now `luz.tokens`, `luz.themes`, `luz.settings`, `luz.generic`, `luz.elements`, `luz.objects`, `luz.components`, `luz.utilities`, `luz.catalog`, `luz.print`, and core and tokens repeat that statement in every file. **Breaking:** if your own `@layer` statement names `luz.landing`, `luz.cms`, `luz.app` or `luz.docs`, remove the name.

  A pattern used to win over the catalog components by the order of the layers. In one layer, the order of the links decides, so link the pattern files after core and after the other catalog files.

  **4. Check the page.**

  `luz-check` tells you which file a class needs. For a page that uses `.luz-hero` and does not link its file, it says that the class is in `@luz-ds/catalog/components/hero.css` and that the file is added after core. It no longer reads a link to one of the four packages, and the data it bundles now comes from catalog's `classes.json`.

  The size budget changes with it: the rows of the four packages go, and each pattern file has a ceiling of its own (PRINCIPLES.md §8).

- c0572dd: The HTML comes out complete with no class. **Breaking:** `classless.css` (`@luz-ds/core/classless.css`) and the `[data-luz-classless]` attribute are gone, with no alias: what they did is now in `luz.css`, for the whole page.

  - A bare `button`, `input`, `textarea`, `select`, `label`, checkbox, radio, range, colour and file input, `fieldset` with its `legend`, and `table` with its `caption`, `thead`, `tbody`, `tfoot`, `tr`, `th` and `td` take the look of their component, in `luz.elements` and inside `:where()`, so any class and any rule of yours wins. The space between blocks of text (paragraphs, lists, quotations, headings, `hr`) applies on every page.
  - A variant is told by the HTML: a `button` with no `type` and `type="submit"` are the primary action, `type="button"` and `type="reset"` the secondary one, `aria-invalid="true"` an error, `aria-current="page"` the current link, `disabled` disabled. Classes are for what HTML cannot say: `a.luz-btn`, the roles (danger, ghost), the sizes, and what needs markup.
  - A bare `details` has no box (a summary and a divider); `.luz-accordion` adds the box and the group. A bare `meter`, `progress`, `textarea`, `pre` and `dialog` are as close as the element allows to `.luz-meter`, `.luz-progress`, `.luz-input--textarea`, `.luz-code-block` and `.luz-modal`.
  - Structure has no style: `div`, `span`, `section`, `article`, `aside`, `header`, `footer`, `main`, `search`, `form`, `nav`, `hgroup`, `col` and `colgroup`. `nav` is no longer set in the sans and `hgroup > p` no longer has a subtitle style: put your own font on a component that sits on a `nav`.
  - New: `luz.conditional.css` (`@luz-ds/core/conditional.css`), `luz.css` with the reset and the bare elements only inside `[data-luz]`, for a project that already has a design: the document's font, colour and background go to the root of the zone, the tokens stay on `:root`, and objects, components and utilities are not scoped.
  - The navbar's links and the links of the contents of an article (`.luz-toc`) set their own `text-decoration`, since `nav a` no longer does; the hover of those links changes colour and does not underline.

  If you linked `classless.css`, link `luz.css` and drop the attribute; if you want LUZ in one region of an existing page, link `luz.conditional.css` and put `data-luz` on it.

- e69b828: The navbar, the sidebar (with its brand and `.luz-nav-toggle`), the terminal and the timeline (`<luz-timeline>`) move from `@luz-ds/core` to `@luz-ds/catalog`. **Breaking** for whoever imports their scripts or loads core's `luz.css` and expects them in it. The classes, the markup, the attributes and the look are the same. Catalog is now the navigation of the site and the pieces with JS or an identity of their own; core is everything else, and it names nothing of catalog.

  What changes, route by route:

  - `@luz-ds/core/sidebar` becomes `@luz-ds/catalog/sidebar`, and `@luz-ds/core/timeline` becomes `@luz-ds/catalog/timeline`. Core no longer exports `./sidebar` or `./timeline`, and `initSidebar` is no longer exported by `luz.js`. There are no shims: core cannot name catalog.
  - `components/navbar.css`, `components/sidebar.css`, `components/terminal.css` and `components/timeline.css` change package. Replace `@luz-ds/core/components/<name>.css` with `@luz-ds/catalog/components/<name>.css` (and `dist/components/<name>.min.css` on a CDN), after core.
  - `luz.css` (and `luz.min.css`) no longer include the four. Link `@luz-ds/catalog/components/<name>.css` for each one the page uses. Core’s CSS is smaller.
  - Their print rules go with them: the sidebar's and the timeline's are in their own files, in `luz.print`, so `@luz-ds/core/print.css` and the `print.css` inside `luz.css` no longer hide the sidebar or print the timeline as a list. Linking the file brings them.
  - The four are now in the layer `luz.catalog`, which comes after `luz.utilities`. A `.u-*` utility no longer wins over them by order: use a rule of your own, outside any layer. Their adjustments over core's classes (the terminal over `.luz-tab`, `.luz-code-block` and `.luz-copy-btn`, the sidebar over `.luz-btn--ghost`) now win by layer. The sidebar's place in an `.o-shell` still loses to the sidebar's own rules, now by specificity.
  - `catalog.js` loads `timeline.js` on a page with a `<luz-timeline>` and `sidebar.js` on a page with a `.luz-sidebar`, when the page is scanned. A page that loads only core has no scroll spy: the active link does not follow the scroll and the drawer does not close after a link is followed. The sidebar drawer is a native popover and works without any script.
  - The timeline carries its own English and Spanish strings, `data-luz-label-*` and `lang`, as the search and the cookie banner do. `registerLocale()` no longer reaches it. To give it a language you registered, call `initTimeline(document, t)` with core's `t`.
  - `@luz-ds/core/custom-elements.json` is gone: core defines no tag. `<luz-timeline>` is in `@luz-ds/catalog/custom-elements.json`, and the four stylesheets' classes are in `@luz-ds/catalog/classes.json`.
  - The docs pages move with them: `/docs/components/{navbar,sidebar,terminal,timeline}/` become `/docs/catalog/{navbar,sidebar,terminal,timeline}/`. There are no redirects.
  - `@luz-ds/check` knows the new package: a page that uses `.luz-sidebar`, `.luz-timeline`, `.luz-navbar` or `.luz-terminal` without the catalog file gets `load/package-missing`, with the path of the file to add.

- c0d9479: One family of icons: a 24 grid and a 1.5 stroke in `currentColor`.

  - `@luz-ds/core`: the icons of `<luz-theme-mode>` (Auto, Light, Dark, High contrast) are drawn with a stroke, not filled, and `.luz-theme-mode__icon` sets the stroke itself (`fill: none`, `stroke: currentcolor`, `stroke-width: 1.5`, round caps and joins), so the markup of an icon holds its shapes only. An icon of your own in that radio takes the same rule: draw it on a 24 grid.
  - `@luz-ds/catalog`: the icons of the search (trigger, field, close) and of the language switch use the 1.5 stroke, as the rest of the set.
  - The docs: the Icons page replaces Icon grid, with the whole set and the logo, and the Button page tries an icon before the label, after it or alone.

- 5f83968: Every `.luz-modal` now fills the screen on a small one: up to 640 px wide, or in a window under 30 rem tall (a phone held sideways). It has no margin, radius, border or shadow, uses the dynamic viewport height, and keeps its padding clear of the safe areas. The header with the close button (44 px) stays at the top and the footer at the bottom, and the content is the one thing that scrolls. Above that, nothing changes. The search dialog of `<luz-search>` follows the same rule, so it goes full screen at 640 px instead of 768 px. If you sized your own modal for small screens (with `min()`, `max-inline-size` or margins), remove that rule: your unlayered CSS overrides the new one and leaves the modal floating. A page that only uses the stock modal needs no change.
- 9d0b91a: The color mode is now two elements: `<luz-theme-mode>` in core (a round fixed button that cycles Auto, light, dark and high contrast) and `<luz-theme-time>` in catalog (the same button plus the time of day). **Breaking:** the 0.2.1 names below are gone, with no aliases. `luz-check` names the new one when it finds an old one.

  | 0.2.1                                                  | 0.3.0                                                                                                                       |
  | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
  | `<luz-mode>` (catalog)                                 | `<luz-theme-time>` around core's `<luz-theme-mode>`, or `<luz-theme-mode>` alone                                            |
  | `.luz-mode-switcher`, `--cycle`, `--inline`, `__label` | `<luz-theme-mode>`; `--cycle` is the default; `--inline` is the `inline` attribute; the legend is `.luz-theme-mode__legend` |
  | `.luz-mode-btn`, `__input`, `__icon`                   | `.luz-theme-mode__option`, `__input`, `__icon`                                                                              |
  | `.luz-mode-cycle` (the button `initThemeCycle` added)  | `.luz-theme-mode__button`, added by the element                                                                             |
  | `components/mode-switcher.css` (core)                  | `components/theme-mode.css` (core); `components/theme-time.css` (catalog)                                                   |
  | `initThemeCycle()` (`@luz-ds/core`)                    | none: the element does it                                                                                                   |
  | `@luz-ds/catalog/mode`, `dist/mode.js`                 | `@luz-ds/catalog/theme-time`, `dist/theme-time.js`                                                                          |
  | `components/mode.css` (catalog)                        | `components/theme-time.css`                                                                                                 |
  | (none)                                                 | `@luz-ds/core/theme-mode`, `@luz-ds/core/theme-boot`, `@luz-ds/catalog/theme-time-bar`, `@luz-ds/catalog/theme-time-boot`   |
  | radio `name="luz-theme"`                               | radio `name="luz-theme-mode"`                                                                                               |
  | `data-theme` on `<html>` set by the mode               | `data-mode` on `<html>`; `data-theme` stays the brand (it takes the mode only while the page names no brand)                |
  | `data-light="<phase>"` on `<html>`                     | `data-moment="<moment>"`                                                                                                    |
  | `remember` attribute                                   | on by default; `no-remember` turns it off                                                                                   |
  | `by="clock"` attribute                                 | the `data-from` of the moments in the markup                                                                                |
  | `for` and `light-attr` attributes                      | none                                                                                                                        |
  | the event `luz-mode:change`                            | `luz-theme-mode:change` (detail `{ mode, auto, user }`)                                                                     |

  The storage keys `luz-theme` (the choice) and `luz-light` (a pinned hour) do not change.

  - With no JavaScript the radios still pick the mode. A theme copied from an older `_template.css` needs one selector line per block (see `theme-template-radios`).
  - Optional head scripts set the mode before the first paint: `@luz-ds/core/theme-boot` (`data-mode`, `data-theme`) and `@luz-ds/catalog/theme-time-boot` (`data-moment`). Both are classic scripts that block rendering (EX-009, EX-012). Without them the elements do the same after the first paint.
  - `<luz-theme-time>` takes its moments from the markup (`data-from="HH:MM"`, `data-theme="light|dark"`), and optional `latitude` and `longitude` for the real sunrise and sunset. `variant="bar"` adds the 24 h slider; it needs `data-luz-label-scrub` for its name, or `luz-check` reports `a11y/slider-no-name`.
  - To drop the clock, use `<luz-theme-mode>` alone and link only core.
  - The fixed button rides on top of `<luz-cookie-consent>` while the banner shows, and the sticky page rail keeps the banner's height as end padding.
  - `@luz-ds/check` adds the rules `names/renamed:inline`, `names/renamed:cycle`, `names/renamed:element` and `names/renamed:element-wrap` for the names above, and `a11y/slider-no-name`.

- b4780ae: The theme template (`themes/_template.css`) answers to the checked radio of `<luz-theme-mode>` with no JavaScript: each of its three blocks gains a `:is(:root[data-theme="my-brand"]:not([data-mode]):has(input[name="luz-theme-mode"][value="…"]:checked))` selector. A theme copied from an older template needs that line added to each block (see Themes). `luz-tokens check-contrast` no longer lists the new selector as ignored.

### Patch Changes

- 2d895d1: Fix: with JavaScript off, choosing Dark in `<luz-theme-mode>` now also darkens a bare `select` and the date and time fields (and `.luz-select`, `.luz-input[type=date]`, `.luz-input[type=time]`). Four rules still looked for a radio group named `luz-theme`, which the colour mode stopped using when its radios became `luz-theme-mode`, so that branch never matched.
- 0afb378: The space between bare controls (a field, a label, a fieldset or a button after another control) is not added to a control that carries a `luz-` class: a `.luz-check-item` or a `.luz-btn` in a flex row of your own no longer starts lower than the first one. It keeps its own spacing.
- 363d77b: A full-screen modal on a small screen (the core modal, the search dialog) keeps a focused control clear of its pinned header and footer in Firefox and Safari too: `scroll-padding-block` now adds `--luz-space-md` to the height of each bar, because Firefox ignores the padding when the control is already in view and Safari's keyboard-focus scroll stops short of it.

## 0.2.1

### Patch Changes

- e113295: The commands the READMEs tell an AI agent to run, `npx @luz-ds/check` and `npx @luz-ds/tokens check-contrast`, now name the version (`npx @luz-ds/check@0.2.0 <files>`), so a release of the tool nobody read does not run by itself in a consumer's agent session; `pnpm release:version` keeps the version in step.
- 4cb60fd: The README of each package shows the CDN snippets with the version of the package itself (the catalog README cited 0.1.0, which never existed), and from now on `pnpm release:version` writes them.

## 0.2.0

### Minor Changes

- dd01817: English stays in the entry; every other language LUZ ships is a lazy file, fetched only for the pages that declare it. `loadLocales()` is new, and `luz.js` calls it at boot, so a page with `<html lang="es">` makes one request for `i18n-es.min.js` and a page in English makes none. A language is a JSON file, `packages/core/src/i18n/<code>.json`, that the build validates and writes as `dist/i18n-<code>.js`; it is published as `@luz-ds/core/i18n/<code>`. The dictionary has two more keys, `previous` and `next`. `initTabs()`, `initCopyButtons()`, `initThemeSystem()` and `initThemeCycle()` take a `defer` flag that leaves `data-luz-js` and the strings to a later call.

  Breaking: `@luz-ds/core/i18n` and the standalone modules (`/highlight`, `/player`, `/theme`, `/clipboard`) no longer carry Spanish. Before `initHighlight()`, `initPlayers()` and `initThemeCycle()` on a page that is not in English, call `await loadLocales()` from `@luz-ds/core/i18n`, or `registerLocale("es", …)` with your own strings. The `luz.js` entry does it for you.

- a6dfcee: New component: `<luz-timeline>`, a timeline around an ordered list (`ol.luz-timeline > li.luz-timeline__item` with a `time.luz-timeline__date`, a `.luz-timeline__title` and a `.luz-timeline__text`). Without JavaScript it is the list, with a line and a dot per item. With JavaScript, horizontal by default: a rail of date buttons under the current card, Previous and Next, the arrow keys, Home and End, and a swipe. `layout="vertical"` marks the item in the middle of the screen as active and the earlier ones as past (`data-luz-state`). Autoplay is opt-in (`autoplay`, `interval`), with a visible Pause / Play button, and never starts with reduced motion. `luz.js` loads the code only on a page that has a timeline (`dist/timeline.js`, its own size budget); `@luz-ds/core/timeline` defines the element on its own, without loading `luz.js`, for content added later or a page without the entry. Its strings (Previous, Next, Pause, Play; English and Spanish, overridden by `data-luz-label-*`) travel with the chunk; with `luz.js` on the page the entry passes its `t` through `initTimeline(root, translate)`, so a language added with `registerLocale()` reaches the timeline too. Each card has `aria-posinset` and `aria-setsize`; the focus moves to the new current date when the card it was in is hidden. `--luz-timeline-paper` on the element sets the colour the hump and the empty dots are painted with (for a timeline on a card). The styles are in `luz.css` and in `components/timeline.css`.
- 5bb83bb: The layer statement that every stylesheet repeats now names `luz.app`, after `luz.cms` and before `luz.print` (`luz.tokens, luz.themes, luz.settings, luz.generic, luz.elements, luz.objects, luz.components, luz.utilities, luz.catalog, luz.landing, luz.cms, luz.app, luz.print`). No existing layer moves. If you repeat the statement in your own stylesheet, add `luz.app` before `luz.print`; a stylesheet that does not is not affected unless it loads `@luz-ds/app`.

  **Fix (core).** `.o-main` no longer sets `overflow-y: auto`. The page scrolls, not `.o-main` (the sidebar sticks to the window the same way), so a bar with `.o-sticky` inside `.o-main` stuck to nothing and scrolled away with the page. A wide child that has no wrapper of its own (a table with no `.luz-table-wrap`) now makes the page scroll sideways, as it does outside `.o-shell`, instead of scrolling inside `.o-main`.

- b585645: Core gains the layout every kind of page needs, so a site no longer needs `@luz-ds/catalog` for it:

  - `--luz-bar-h` (settings): the height of a one-row bar of 44 px controls, `calc(var(--luz-control-lg) + var(--luz-space-xs) + 1px)`.
  - Objects: `.o-page` (a column at least as tall as the window, whose `main` grows, with any number of bands before the header), `.o-container--inline` (the container's width and side gutters, no block padding: a bar's row), `.o-sticky` (a bar stuck to the top in a window at least 30 rem tall, with the scroll padding that keeps a field reached with Tab clear of it), `.o-grid--split` (two equal columns when each gets `--luz-grid-min`, one below) and `.o-actions` (a wrapping row of actions; a column of full-width actions, whose button labels wrap, at 640 px and below).
  - Components, each also in `dist/components/<name>.css`: `.luz-skip-link` (hidden in print), `.luz-band` (a tint from edge to edge of the page; two rules in forced colors), `.luz-image` with `--4x3`, `--3x2`, `--1x1`, `--21x9`, `--9x16` (a frame of fixed ratio on the flat `--luz-surface-strong` surface; no placeholder picture), and `.luz-navbar`, `__list`, `__link` (the links of a header: a row from 769 px, a native popover panel under the bar at 768 px and below, opened by `.luz-nav-toggle`; no JavaScript).

  They take over from site's `.luz-site-page`, `.luz-site-header__inner`, `--sticky` and `--luz-site-header-h`, `.luz-site-actions`, `.luz-site-skip-link`, `.luz-site-section--band`, `.luz-site-image` and `.luz-site-header__nav`, which are gone from `@luz-ds/catalog` in this release: it keeps the search, the cookie banner, the language switch, the submenu and the banner.

- d9124a9: Three size knobs, set on `:root`: `--luz-type-base` (`1rem`), `--luz-type-ratio` (`1.25`) and `--luz-space-unit` (`0.25rem`). Every `--luz-text-*` step is now computed from the base and the ratio, each step rounded to 1/16 rem inside `@supports (width: round(1px, 1px))` (a browser without `round()` keeps the plain chain, at most 0.25px away on three heading sizes), and every `--luz-space-*` step is a multiple of the unit. No visual change at the defaults: the nine type sizes and the ten space steps keep their values. Spacing is now in rem, so it follows the reader's browser font size like the type does (at the default 16px root nothing moves). A knob set on `body` or on a section changes nothing; set it on `:root`. `--luz-control-*` (target sizes) are not knobs.

  `--luz-text-body` is a new core setting: running text, `calc(var(--luz-text-base) * 1.0625)` (17px at the defaults), read by `body`, so the base knob moves running text too. On touch screens and at 768px or less `--luz-text-control` is `max(1rem, var(--luz-text-base))`: a base below 16px never takes a form field under 16px.

  `tokens.json` entries with a formula gain `from` (the plain chain) and, for type, `fromRounded`; `value` stays the resolved default. `luz-tokens.dtcg.json` has `--luz-type-ratio` as a DTCG `number` and the formula of a derived size in `$extensions["com.luz-ds"].from`. The theme template's header says sizes are not set in a theme.

- 65efde3: Every package now exports `./classes.json`, the classes, custom properties and `data-luz-*` hooks its CSS and script define, and core and catalog also export `./custom-elements.json`, their custom elements with the attributes each one reads, for editors and AI agents. Both are generated from the built `dist/`, and the Pages site serves a copy of each under `/manifests/<package>/`, beside `llms.txt`, `llms-full.txt` and one example page per component. `pnpm check:ai` regenerates all of them and fails when a file on disk is stale. `luz-check` carries a snapshot of these manifests. No runtime or style change.
- 3d2461e: Each package that ships a tag now ships `dist/custom-elements.json`, a Custom Elements Manifest (schema 2.1.0) for editors and AI agents: core describes `<luz-timeline>`; site describes `<luz-search>`, `<luz-consent>` and the CSS-only `<luz-lang-switch>`, `<luz-submenu>` and `<luz-banner>`, with their attributes, events and the docs page of each. It is exported as `./custom-elements.json` and named in the `customElements` field of `package.json`. It is generated from `@element`, `@attr` and `@fires` lines in the header comment of each source file, and the build fails when they and the code disagree. No runtime or style change.
- f123842: The layer statement that every stylesheet repeats now names `luz.docs`, after `luz.app` and before `luz.print` (`luz.tokens, luz.themes, luz.settings, luz.generic, luz.elements, luz.objects, luz.components, luz.utilities, luz.catalog, luz.landing, luz.cms, luz.app, luz.docs, luz.print`). No existing layer moves. If you repeat the statement in your own stylesheet, add `luz.docs` before `luz.print`; a stylesheet that does not is not affected unless it loads `@luz-ds/docs`.
- 84f5646: First release of LUZ, formerly CAI (its packages were last published as 2.0.0, under another scope). Migration from those packages: install `@luz-ds/*` instead; every old prefix becomes `luz` (classes `.luz-*`, hooks `data-luz-*`, tokens `--luz-*`, elements `<luz-*>`, layers `luz.*`, events `luz:*`, storage keys `luz-*`); the stylesheet and the script are now `luz.css` and `luz.js`. Display preferences stored under the old keys are not read.
- 5fffc0f: Breaking: `@luz-ds/site` is now `@luz-ds/catalog`, the name the home and the docs already gave to level 3. Install `@luz-ds/catalog` and load `catalog.css` / `catalog.min.css` and `catalog.js` / `catalog.min.js` where you loaded the `site.*` files; its subpaths (`/search`, `/consent`, `/mode`, `/css`, `/css/min`, `/print.css`, `/components/*`, `/classes.json`, `/custom-elements.json`) keep their names. The cascade layer is `luz.catalog` instead of `luz.site`, in the order statement every stylesheet repeats (so tokens and core change too). The landing, cms, app and docs packages take `@luz-ds/catalog` as their optional peer. `luz-check` reads the new names and its `load/order` rule says tokens, core, catalog. The docs of the package are at `/docs/catalog/` (was `/docs/site/`). The tags (`<luz-search>`, `<luz-consent>`, `<luz-mode>`, `<luz-lang-switch>`, `<luz-submenu>`, `<luz-banner>`) and their classes do not change.
- cd16c04: Two pieces the home page had on its own are now in core. `luz-terminal` is a framed command: its tabs are the title bar and the Copy button sits at the end of the line it copies (`components/terminal.css`; its command is a `pre.luz-terminal__code`, which `highlight.js` leaves alone, so it gets no second Copy). `luz-tabs--pill` is a variant of tabs for tabs that hold an icon, with the open one as a chip instead of a rule.

### Patch Changes

- b06814a: Fixes from the Safari and Firefox reviews. An import map with an `integrity` section is the way to check every lazy chunk in all three engines: `integrity` on a `modulepreload` link is not a guard in Safari and Firefox, only a performance hint, and the "Choose your snippet" page and SECURITY.md now say so and give the map. In Safari, focusing a text field with Tab no longer leaves it under the cookie band: `<luz-consent>` scrolls it back above the band. The timeline's Pause / Play button is no longer rewritten when its text has not changed, so a click on it is not lost in Safari. The site loader starts its idle chunks (search, cookie banner) after the `load` event, so they no longer delay it in Firefox.
- c44810d: `--luz-code-string` in light is now green-70 (8.2:1 on `--luz-surface-muted`) instead of green-60 (4.8:1), so string tokens in a code block keep 4.5:1 on a block drawn slightly darker than the page (a window with a title bar, a terminal). `pnpm check:contrast` now measures every syntax colour on `--luz-surface-hover` as well. A custom theme that copied the old value from `_template.css` should take the new one.
- cb8a8b2: `data-luz-flip` is read by LUZ: an element with it (the `chevron-end` and `arrow-end` icons of the icon grid, or an icon of your own that points to the end of the line) is mirrored in right-to-left text, by one rule of specificity zero in `luz.utilities` (`:where([data-luz-flip]):dir(rtl) { transform: scaleX(-1) }`). Nothing to write; a rule of your own still wins.
- c44810d: Core's settings (`luz.settings`) no longer define the motion, the font roles and the breakpoints: `--luz-duration-*`, `--luz-easing-*`, `--luz-font-heading`, `--luz-font-body`, `--luz-text-body` and `--luz-mq-*` now come from `@luz-ds/tokens`, which core already requires. Same names, same values, no visible change. The settings keep the z-index scale, `--luz-sidebar-width`, `--luz-content-max`, `--luz-bar-h`, `--luz-scrollbar-size` and `--luz-text-control`. Load the tokens before core, as before.
- 590b749: A sidebar without `popover` inside `.o-shell` is now the first block of the page on a phone (768 px and below), not a sticky full-height column. The rule moved from the objects layer to `components/sidebar.css`, where `.luz-sidebar` sets position and size. A sidebar with `popover` keeps the drawer.
- 4aeacbb: `.luz-sidebar[popover]` in forced colours: the open drawer has a 1 px inline-end border in `CanvasText`, so it stands apart from the page it covers once the backgrounds and the shadow are dropped. Nothing changes outside forced colours.
- 97ee81a: `.luz-sidebar__link` in forced colours: every link has a 3 px start border in `Canvas`, and the current page (`aria-current="page"`) has it in `Highlight`, so it stays marked when the backgrounds are dropped. Nothing moves.
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

- fbf2d58: `dist/classes.json` of a package can now give a class `hosts`, the elements the class may sit on, read from an `@host <class>: <selector>, …` line in the header comment of a stylesheet; core declares it for `.luz-btn` (`a`, `button` and `input` of type `button`, `submit` or `reset`). `luz-check` uses it, and adds the rules of loading (`load/tokens-missing`, `load/package-missing`, `load/layer-statement`, `load/order`, `load/no-stylesheet`), of misuse (`misuse/host-element`, `misuse/modifier-alone`, `misuse/part-orphan`, `misuse/state-class`) and of accessibility (`a11y/role-on-generic`, `a11y/link-no-href`). No runtime or style change: the comment is not in the minified CSS.
- 6175ac8: `dist/classes.json` of a package now ends with `hooks`, the `data-luz-*` attribute names the package's own CSS selects and its script reads or writes (`data-luz-classless`, `data-luz-sort`, `data-luz-spy`…), sorted, when there is at least one. `luz-check` reads them to tell a hook LUZ uses from an attribute it does not. No runtime or style change.
- 423be2f: The peer dependencies on `@luz-ds/*` are `^0.1.0 || ^0.2.0`, so the next release (0.2.0 of tokens, core and catalog) is in range. With `^0.1.0` it was not, and changesets would have taken every dependent to 1.0.0.
- ba18951: `.luz-select` can shrink to its field where the browser styles the open list (`appearance: base-select`): at 400 % text the longest option no longer pushes the page sideways (WCAG 1.4.10).
- b514ce7: Tabs: `activateTab()` shows the selected panel before it hides the others. The other way round the page was for a moment shorter than the scroll position, the browser clamped it, and a sticky element above the panels (a stuck row of tabs) came unstuck when you chose another tab while scrolled down.
