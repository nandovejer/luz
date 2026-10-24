# @luz-ds/tokens

## 0.2.1

### Patch Changes

- e113295: The commands the READMEs tell an AI agent to run, `npx @luz-ds/check` and `npx @luz-ds/tokens check-contrast`, now name the version (`npx @luz-ds/check@0.2.0 <files>`), so a release of the tool nobody read does not run by itself in a consumer's agent session; `pnpm release:version` keeps the version in step.
- 4cb60fd: The README of each package shows the CDN snippets with the version of the package itself (the catalog README cited 0.1.0, which never existed), and from now on `pnpm release:version` writes them.

## 0.2.0

### Minor Changes

- 5bb83bb: The layer statement that every stylesheet repeats now names `luz.app`, after `luz.cms` and before `luz.print` (`luz.tokens, luz.themes, luz.settings, luz.generic, luz.elements, luz.objects, luz.components, luz.utilities, luz.catalog, luz.landing, luz.cms, luz.app, luz.print`). No existing layer moves. If you repeat the statement in your own stylesheet, add `luz.app` before `luz.print`; a stylesheet that does not is not affected unless it loads `@luz-ds/app`.

  **Fix (core).** `.o-main` no longer sets `overflow-y: auto`. The page scrolls, not `.o-main` (the sidebar sticks to the window the same way), so a bar with `.o-sticky` inside `.o-main` stuck to nothing and scrolled away with the page. A wide child that has no wrapper of its own (a table with no `.luz-table-wrap`) now makes the page scroll sideways, as it does outside `.o-shell`, instead of scrolling inside `.o-main`.

- d9124a9: Three size knobs, set on `:root`: `--luz-type-base` (`1rem`), `--luz-type-ratio` (`1.25`) and `--luz-space-unit` (`0.25rem`). Every `--luz-text-*` step is now computed from the base and the ratio, each step rounded to 1/16 rem inside `@supports (width: round(1px, 1px))` (a browser without `round()` keeps the plain chain, at most 0.25px away on three heading sizes), and every `--luz-space-*` step is a multiple of the unit. No visual change at the defaults: the nine type sizes and the ten space steps keep their values. Spacing is now in rem, so it follows the reader's browser font size like the type does (at the default 16px root nothing moves). A knob set on `body` or on a section changes nothing; set it on `:root`. `--luz-control-*` (target sizes) are not knobs.

  `--luz-text-body` is a new core setting: running text, `calc(var(--luz-text-base) * 1.0625)` (17px at the defaults), read by `body`, so the base knob moves running text too. On touch screens and at 768px or less `--luz-text-control` is `max(1rem, var(--luz-text-base))`: a base below 16px never takes a form field under 16px.

  `tokens.json` entries with a formula gain `from` (the plain chain) and, for type, `fromRounded`; `value` stays the resolved default. `luz-tokens.dtcg.json` has `--luz-type-ratio` as a DTCG `number` and the formula of a derived size in `$extensions["com.luz-ds"].from`. The theme template's header says sizes are not set in a theme.

- 65efde3: Every package now exports `./classes.json`, the classes, custom properties and `data-luz-*` hooks its CSS and script define, and core and catalog also export `./custom-elements.json`, their custom elements with the attributes each one reads, for editors and AI agents. Both are generated from the built `dist/`, and the Pages site serves a copy of each under `/manifests/<package>/`, beside `llms.txt`, `llms-full.txt` and one example page per component. `pnpm check:ai` regenerates all of them and fails when a file on disk is stale. `luz-check` carries a snapshot of these manifests. No runtime or style change.
- f123842: The layer statement that every stylesheet repeats now names `luz.docs`, after `luz.app` and before `luz.print` (`luz.tokens, luz.themes, luz.settings, luz.generic, luz.elements, luz.objects, luz.components, luz.utilities, luz.catalog, luz.landing, luz.cms, luz.app, luz.docs, luz.print`). No existing layer moves. If you repeat the statement in your own stylesheet, add `luz.docs` before `luz.print`; a stylesheet that does not is not affected unless it loads `@luz-ds/docs`.
- 84f5646: First release of LUZ, formerly CAI (its packages were last published as 2.0.0, under another scope). Migration from those packages: install `@luz-ds/*` instead; every old prefix becomes `luz` (classes `.luz-*`, hooks `data-luz-*`, tokens `--luz-*`, elements `<luz-*>`, layers `luz.*`, events `luz:*`, storage keys `luz-*`); the stylesheet and the script are now `luz.css` and `luz.js`. Display preferences stored under the old keys are not read.
- 5fffc0f: Breaking: `@luz-ds/site` is now `@luz-ds/catalog`, the name the home and the docs already gave to level 3. Install `@luz-ds/catalog` and load `catalog.css` / `catalog.min.css` and `catalog.js` / `catalog.min.js` where you loaded the `site.*` files; its subpaths (`/search`, `/consent`, `/mode`, `/css`, `/css/min`, `/print.css`, `/components/*`, `/classes.json`, `/custom-elements.json`) keep their names. The cascade layer is `luz.catalog` instead of `luz.site`, in the order statement every stylesheet repeats (so tokens and core change too). The landing, cms, app and docs packages take `@luz-ds/catalog` as their optional peer. `luz-check` reads the new names and its `load/order` rule says tokens, core, catalog. The docs of the package are at `/docs/catalog/` (was `/docs/site/`). The tags (`<luz-search>`, `<luz-consent>`, `<luz-mode>`, `<luz-lang-switch>`, `<luz-submenu>`, `<luz-banner>`) and their classes do not change.
- c44810d: `@luz-ds/tokens` now carries the motion, the font roles and the breakpoints, so a page that loads only the tokens has them too.

  - Motion: `--luz-duration-instant`, `-fast`, `-base`, `-slow`, `-slower`, `-lazy` and `--luz-easing-standard`, `-enter`, `-exit`, `-spring`, `-linear`. Under `prefers-reduced-motion: reduce` every duration is `0s`, so a page with tokens alone loses its motion too.
  - Font and text roles: `--luz-font-heading`, `--luz-font-body` and `--luz-text-body`. On an element marked `lang="ar"` both fonts take the system sans, because ET Book has no Arabic letters.
  - Breakpoints: `--luz-mq-sm`, `-md`, `-lg`, `-xl`, `-xxl`, `-xxxl` (reference values: a media query cannot read them).

  Same names, same values. `tokens.json` has four new groups (`role`, `breakpoint`, `duration`, `easing`) and `luz-tokens.dtcg.json` has them in its primitives, with `duration` and `cubicBezier` types and the two fonts as aliases of the serif. A custom property in your own theme (the `luz.themes` layer) now wins over `--luz-font-body` and `--luz-font-heading`, as it does over every other token; before, core's settings layer came after it.

  `luz-check` and `luz-tokens check-contrast` do not list LUZ's own reduced-motion rule as an ignored condition: it sets durations, not colours.

### Patch Changes

- c44810d: `--luz-code-string` in light is now green-70 (8.2:1 on `--luz-surface-muted`) instead of green-60 (4.8:1), so string tokens in a code block keep 4.5:1 on a block drawn slightly darker than the page (a window with a title bar, a terminal). `pnpm check:contrast` now measures every syntax colour on `--luz-surface-hover` as well. A custom theme that copied the old value from `_template.css` should take the new one.
- d1b7032: The documentation can be in more than one language. A language has docs when its folder exists, `apps/docs/i18n/<code>/`, and is served at `/<code>/docs/`; a page with no translation is shown in English in the translated chrome, marked `lang="en"` and with a notice that links to the English page. A translation an agent wrote is published with its notice until a named reader reviews it. PRINCIPLES.md section 5 says it, `pnpm check:i18n` lists the translations that are stale, orphaned or waiting for a reader, and `pnpm check:i18n --strict` blocks a release on a stale or orphan one. `@luz-ds/check` ships the same snapshot of the packages, so it releases with them.
- 37da54a: PRINCIPLES.md opens with the two statements of the project, "Human-first, AI-ready" and "Every change starts with a failing test". No rule changes. CONTRIBUTING.md is now short and links to the files its long sections moved to, and CODE_OF_CONDUCT.md, the issue labels and the proposal form for Discussions are new.
- 662c25f: PRINCIPLES.md section 6 now states the rule between core and catalog: site is what can go in any section, page structure is never site, and the packages for one kind of site (`landing`, `cms` and `app`) take site as an optional peer.
