# @luz-ds/app

## 0.2.1

### Patch Changes

- e113295: The commands the READMEs tell an AI agent to run, `npx @luz-ds/check` and `npx @luz-ds/tokens check-contrast`, now name the version (`npx @luz-ds/check@0.2.0 <files>`), so a release of the tool nobody read does not run by itself in a consumer's agent session; `pnpm release:version` keeps the version in step.
- 4cb60fd: The README of each package shows the CDN snippets with the version of the package itself (the catalog README cited 0.1.0, which never existed), and from now on `pnpm release:version` writes them.

## 0.2.0

### Minor Changes

- 5bb83bb: New package: the header and the dashboard of a web application, on core's shell and sidebar. CSS only (no script), in the cascade layer `luz.app`, after `luz.cms`. Requires `@luz-ds/tokens` and `@luz-ds/core` (`^0.1.0`); `@luz-ds/catalog` is an optional peer, for the search in the bar. Exports `./css`, `./css/min` and `./components/*`.

  - `.luz-app-header`, `__toggle`, `__product`, `__actions`, `__account`, `__account-name`: `header.luz-app-header.o-sticky > div.o-row` in `.o-main`, beside the sidebar. The page surface, a 1 px divider, one row of core's `--luz-bar-h`, and gutters that match the content's (16 px, 32 px from 641 px). It holds core's `.luz-nav-toggle` (it opens the sidebar drawer), the product's name (shown at 768 px and below only, so it is never twice in the tree), and the actions at the inline end: site's `<luz-search>`, then a `.luz-dropdown` whose button is the account (initials in a `.luz-avatar`, then the name, clipped to nothing at 640 px and below and kept in the button's name: "AM Ana Martín"). The account list opens ending where its button ends, so it stays in the window at the inline end of the bar. `.o-main` gets `scroll-padding-block-start: var(--luz-bar-h)`.
  - `.luz-app-dashboard`, `__head`, `__title`, `__panel`, `__panel--wide`: `main.luz-app-dashboard`, the container of its own size query, with a title row (`div.__head`: the view's one `h1` and core's `.o-actions`) and a `ul.o-grid.o-grid--auto` of `li.luz-card.__panel` with an 18 rem column. `__panel--wide` takes two columns from a 40 rem container. The panels keep the order of the markup: no dense packing, no `order`.

  The view's `h1` and its main action are the first row of the dashboard, not in the bar: the bar holds only what is the same in every view. Not in 0.1: an icon rail or collapsible sidebar, a stat or chart style, a skeleton, notifications.

- 65efde3: Every package now exports `./classes.json`, the classes, custom properties and `data-luz-*` hooks its CSS and script define, and core and catalog also export `./custom-elements.json`, their custom elements with the attributes each one reads, for editors and AI agents. Both are generated from the built `dist/`, and the Pages site serves a copy of each under `/manifests/<package>/`, beside `llms.txt`, `llms-full.txt` and one example page per component. `pnpm check:ai` regenerates all of them and fails when a file on disk is stale. `luz-check` carries a snapshot of these manifests. No runtime or style change.
- 5fffc0f: Breaking: `@luz-ds/site` is now `@luz-ds/catalog`, the name the home and the docs already gave to level 3. Install `@luz-ds/catalog` and load `catalog.css` / `catalog.min.css` and `catalog.js` / `catalog.min.js` where you loaded the `site.*` files; its subpaths (`/search`, `/consent`, `/mode`, `/css`, `/css/min`, `/print.css`, `/components/*`, `/classes.json`, `/custom-elements.json`) keep their names. The cascade layer is `luz.catalog` instead of `luz.site`, in the order statement every stylesheet repeats (so tokens and core change too). The landing, cms, app and docs packages take `@luz-ds/catalog` as their optional peer. `luz-check` reads the new names and its `load/order` rule says tokens, core, catalog. The docs of the package are at `/docs/catalog/` (was `/docs/site/`). The tags (`<luz-search>`, `<luz-consent>`, `<luz-mode>`, `<luz-lang-switch>`, `<luz-submenu>`, `<luz-banner>`) and their classes do not change.

### Patch Changes

- 423be2f: The peer dependencies on `@luz-ds/*` are `^0.1.0 || ^0.2.0`, so the next release (0.2.0 of tokens, core and catalog) is in range. With `^0.1.0` it was not, and changesets would have taken every dependent to 1.0.0.
