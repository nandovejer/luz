# @luz-ds/app

The header and the dashboard of a web application: the bar at the top of the main area (the menu button, the product's name on a phone, the search and the account) and the view's grid of panels. Each is a class on a native element, laid out in the markup by `@luz-ds/core`'s objects (`.o-shell`, `.o-main`, `.o-sticky`, `.o-row`, `.o-actions`, `.o-grid`) and its sidebar, dropdown, avatar and card; app adds only its skin and its rhythm. `@luz-ds/catalog` is optional: its search goes in the header's actions.

> **Beta, version 0.x.** App has a version of its own, apart from tokens, core and catalog, and grows in minor versions while it is 0.x: any of them may change a class. Pin an exact version and read the changelog before you upgrade.

## When to use it

- You build a tool that people sign in to, with a sidebar of sections and a view for each.
- You want a quiet bar for the global tools, and a dashboard of panels for the view's state.
- Not for a landing page (`@luz-ds/landing`), a blog (`@luz-ds/cms`) or documentation.

There is no sidebar of its own: core's `.luz-sidebar` is a column from 769 px and a drawer at 768 px and below, opened by the menu button with no script. An icon rail and a collapsible sidebar are not in 0.1. The app page, an app with no sidebar and an empty dashboard need no CSS of their own: they are markup to copy, on the [App templates](https://nandovejer.github.io/luz/docs/app/templates/) page of the docs.

## Prerequisites

Requires `@luz-ds/tokens` and `@luz-ds/core`, version `^0.1.0 || ^0.2.0`, declared as peer dependencies, loaded in that order before this package. `@luz-ds/catalog` (`^0.1.0 || ^0.2.0`) is an optional peer: load it before this package if you use its search; the patterns work without it.

## Installation

```bash
npm install @luz-ds/tokens @luz-ds/core @luz-ds/catalog @luz-ds/app
```

## Usage

### Via npm/bundler

```js
import '@luz-ds/tokens/css'
import '@luz-ds/core/css'
import '@luz-ds/catalog/css'
import '@luz-ds/app/css'
```

### Via CDN

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/tokens@0.2.0/dist/luz-tokens.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.2.0/dist/luz.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.2.0/dist/catalog.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/app@0.2.0/dist/app.min.css">
```

There is no script: the drawer and the account list are native popovers. Core's script is optional: with it, the sidebar marks the current link and closes the drawer when a link is followed.

The view's `h1` and its main action are not in the bar: they are the first row of the dashboard (`__head`), so the bar holds only what is the same in every view.

## Package exports

- **`./css`** → `app.css` — the patterns, in the cascade layer `luz.app`, after `luz.cms` (`./css/min` for the minified twin)
- **`./components/*`** → `dist/components/` — one stylesheet per pattern, `<name>.css` and `<name>.min.css`, each in `luz.app`, for a page that loads only what it uses

## Classes included

- `.luz-app-header` (`__toggle`, `__product`, `__actions`, `__account`, `__account-name`) — The bar at the top of `.o-main`, one row of core's `--luz-bar-h`, kept at the top with `.o-sticky`: the menu button, the product's name while the sidebar is a drawer, the search and the account. [Docs](https://nandovejer.github.io/luz/docs/app/header/)
- `.luz-app-dashboard` (`__head`, `__title`, `__panel`, `__panel--wide`) — The view: its title row, then a grid of panels (core's `.o-grid--auto` and `.luz-card`) as many columns as fit, none narrower than 18 rem; a wide panel takes two columns when the view is 40 rem wide. [Docs](https://nandovejer.github.io/luz/docs/app/dashboard/)

<!-- luz:ai-agents:start -->
## For AI agents

`@luz-ds/app` 0.2.0 is in beta: any release may break anything. Read the breaking changes below before you update, and use only what the files under "Read first" list.

### Breaking changes

#### Breaking: `@luz-ds/site` is now `@luz-ds/catalog`, the name the home and the docs already gave to level 3. Install `@luz-ds/catalog` and load `catalog.css` / `catalog.min.css` and `catalog.js` / `catalog.min.js` where you loaded the `site.*` files; its subpaths (`/search`, `/consent`, `/mode`, `/css`, `/css/min`, `/print.css`, `/components/*`, `/classes.json`, `/custom-elements.json`) keep their names. The cascade layer is `luz.catalog` instead of `luz.site`, in the order statement every stylesheet repeats (so tokens and core change too). The landing, cms, app and docs packages take `@luz-ds/catalog` as their optional peer. `luz-check` reads the new names and its `load/order` rule says tokens, core, catalog. The docs of the package are at `/docs/catalog/` (was `/docs/site/`). The tags (`<luz-search>`, `<luz-consent>`, `<luz-mode>`, `<luz-lang-switch>`, `<luz-submenu>`, `<luz-banner>`) and their classes do not change.

Older versions: https://github.com/nandovejer/luz/blob/main/packages/app/CHANGELOG.md

### Read first

1. `dist/classes.json` in this package: the classes and custom properties its CSS defines. Write only those.
2. https://nandovejer.github.io/luz/llms.txt: the index of the documentation, short enough for a small context.
3. https://nandovejer.github.io/luz/llms-full.txt: the same pages in full.
4. https://nandovejer.github.io/luz/examples/: one standalone page of markup for each component and pattern.

### Load order

This package needs `@luz-ds/tokens` and `@luz-ds/core` loaded first.

`@luz-ds/catalog` is optional: the CSS of this package works with the packages above alone.

### Check what you write

Run `npx @luz-ds/check@0.2.0 <files>` on every HTML and CSS file you write, and fix what it reports. To copy the accessibility reviewer into your project: `npx @luz-ds/check@0.2.0 agent > .claude/agents/luz-accessibility-reviewer.md`.

<!-- luz:ai-agents:end -->

## License

MIT
