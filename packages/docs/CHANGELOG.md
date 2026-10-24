# @luz-ds/docs

## 0.2.1

### Patch Changes

- e113295: The commands the READMEs tell an AI agent to run, `npx @luz-ds/check` and `npx @luz-ds/tokens check-contrast`, now name the version (`npx @luz-ds/check@0.2.0 <files>`), so a release of the tool nobody read does not run by itself in a consumer's agent session; `pnpm release:version` keeps the version in step.
- 4cb60fd: The README of each package shows the CDN snippets with the version of the package itself (the catalog README cited 0.1.0, which never existed), and from now on `pnpm release:version` writes them.

## 0.2.0

### Minor Changes

- f123842: `@luz-ds/docs` exports `./classes.json`, the classes and custom properties its CSS defines, for editors and AI agents, as the other packages do. It is generated from the built `dist/`, and the Pages site serves a copy under `/manifests/docs/`. `luz-check` carries it in its snapshot. No runtime or style change.
- f123842: New package: the pieces of a documentation page, on core's shell and sidebar. CSS only (no script), in the cascade layer `luz.docs`, after `luz.app`. Requires `@luz-ds/tokens` and `@luz-ds/core` (`^0.1.0`); `@luz-ds/catalog` is an optional peer, for the search in the header. Exports `./css`, `./css/min`, the class manifest and `./components/*`.

  - `.luz-docs-shell`, `.luz-docs-nav`, `.luz-docs-main`: `body.o-shell.luz-docs-shell` > header, `nav.luz-sidebar.luz-docs-nav`, `main.o-main.luz-docs-main`, `aside.luz-docs-rail`, footer. Three columns from 80 rem (the sidebar 16.5 rem, the content, the rail 14 rem), two from 60 rem (the rail under the content), one below, in the order of the markup. Every child of the content keeps to `--luz-docs-measure`, 46 rem.
  - `.luz-docs-page-head`, `__eyebrow`, `__lead`, `__meta`: the area and group, the `h1`, one sentence and a row of chips.
  - `.luz-docs-rail`, `__onpage`, `__fold`, `__title`, `__list`, `__sub`, `__link`, `__actions`: "On this page" (a native `<details>`) and the page's actions, kept in view by native sticky positioning; a link also carries core's `.luz-sidebar__link`, so core's scroll spy marks the section in view with a start border and the weight.
  - `.luz-docs-example`, `__preview`, `__frame`, `__code`: a live example and its code in one frame; `--luz-docs-example-w` narrows the frame, which is a size container.
  - `.luz-docs-dodont`, `__item--do`, `__item--dont`, `__verdict`, `__stage`: a Do and a Don't, told apart by a word, a mark and a solid or dashed frame.
  - `.luz-docs-pager`, `__prev`, `__next`, `__link`, `__label`, `__title`: Previous and Next as two link blocks, stacked at 640 px and below.
  - `.luz-docs-page-foot`: Last updated, Edit this page, Report a problem, in small print.

  `@luz-ds/check` knows the `luz-docs-*` classes: its snapshot has the facts of the seven libraries, and a `luz-docs-` name is reported as a class of `@luz-ds/docs`.

- 5fffc0f: Breaking: `@luz-ds/site` is now `@luz-ds/catalog`, the name the home and the docs already gave to level 3. Install `@luz-ds/catalog` and load `catalog.css` / `catalog.min.css` and `catalog.js` / `catalog.min.js` where you loaded the `site.*` files; its subpaths (`/search`, `/consent`, `/mode`, `/css`, `/css/min`, `/print.css`, `/components/*`, `/classes.json`, `/custom-elements.json`) keep their names. The cascade layer is `luz.catalog` instead of `luz.site`, in the order statement every stylesheet repeats (so tokens and core change too). The landing, cms, app and docs packages take `@luz-ds/catalog` as their optional peer. `luz-check` reads the new names and its `load/order` rule says tokens, core, catalog. The docs of the package are at `/docs/catalog/` (was `/docs/site/`). The tags (`<luz-search>`, `<luz-consent>`, `<luz-mode>`, `<luz-lang-switch>`, `<luz-submenu>`, `<luz-banner>`) and their classes do not change.

### Patch Changes

- 8f49c52: "On this page" comes before the content. The rail (`aside.luz-docs-rail`) now goes between the sidebar and `main` in the markup, and the shell draws it above the content in one column and from 60rem (`"nav rail" / "nav main"`); from 80rem it is still the third column, beside the content, with its sticky inner box. Move your `<aside class="luz-docs-rail">` before `<main>`; the skip link still goes to `main`, past the sidebar and the rail. A rail link's long word now breaks inside the column (`overflow-wrap: anywhere`), so a page does not scroll sideways at 400 % text. `@luz-ds/check` ships the same snapshot of the packages, so it releases with them.
- b208b64: `.luz-docs-shell` below 60 rem: the content row takes the free height. On a page shorter than the window the header, the sidebar and the footer keep their own height instead of sharing the extra space.

  `.luz-docs-rail__inner`: a `<div>`, the one child of the rail, around "On this page" and the actions. From 80 rem the rail stretches over its grid area and the inner box is the sticky one, so it stops at the end of the rail and never covers the footer under it (WCAG 2.4.11); it scrolls by itself, with room at its start for a focus ring. Wrap the rail's two blocks in it.

  `.luz-docs-page-head__files`: a quiet line, "Files:" and each file in a `<code>`, for a page that names its files without the chips. The rail's actions draw their top rule only after the "On this page" list. The date in `.luz-docs-page-foot` is the size of the line.

  `luz-check` reads a stylesheet of `@luz-ds/docs` as loaded: `@luz-ds/docs` in a URL, `/packages/docs/` in development, or a bare `docs.css` (which may be your own). Before, a page that linked `docs.css` and used a `luz-docs-*` class was told to load `@luz-ds/docs`.

- 423be2f: The peer dependencies on `@luz-ds/*` are `^0.1.0 || ^0.2.0`, so the next release (0.2.0 of tokens, core and catalog) is in range. With `^0.1.0` it was not, and changesets would have taken every dependent to 1.0.0.
