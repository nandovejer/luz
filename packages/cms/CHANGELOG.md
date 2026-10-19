# @luz-ds/cms

## 0.1.0

### Minor Changes

- 230ff25: **Breaking.** CMS now holds the page structure of a blog or a newspaper: its header, page header and footer join the article header and the table of contents. Each is a class of cms on a native element, laid out in the markup by core's objects (`.o-page`, `.o-sticky`, `.o-container`, `.o-container--inline`, `.o-row`, `.o-stack`) and core's navbar; cms adds only its skin. Site is an optional peer: with tokens, core and cms alone, every pattern renders, and the rules that refine site's `<luz-lang-switch>` match nothing.

  **What each one is.**

  - `.luz-cms-header`, `__brand`, `__actions`: the blog bar, `header.luz-cms-header.o-sticky > div.o-container.o-container--inline.o-row`, with core's `.luz-nav-toggle` and `nav.luz-navbar[popover]`. The page surface, a 1 px divider, one row of core's `--luz-bar-h`, the row's gaps (8 px between rows, 16 px between items, 24 px from 769 px), and `anchor-name` / `anchor-scope: --luz-bar`, so the navbar's panel and the language list open under it where anchor positioning is supported. The brand is the publication's name as a link: the heading font, semibold, the text colour, underlined on hover only, 44 px tall, `--luz-text-xl` (`--luz-text-lg` at 640 px and below); at 768 px and below it fills the room between the menu button and the actions and wraps there. A logo `<img>` in it is 44 px tall.
  - `.luz-cms-header--masthead`, `__top`, `__date`, `__sections`: the newspaper's masthead, three rows in an `.o-stack`, not sticky: the date (a `time[datetime]`, small and secondary, which wraps to leave the actions their row) and the actions; the brand, centred, `--luz-text-4xl` (`-3xl` below 1024 px, `-2xl` at 640 px and below), a logo 88 px tall; and the sections between two rules, centred from 769 px, which name themselves `--luz-bar` so the navbar's panel opens under them.
  - `.luz-cms-page-header`, `__title`, `__lead`: the title of a page that is not an article, with site's page header's values.
  - `.luz-cms-footer`: `footer.luz-cms-footer > div.o-container.o-container--inline.o-row`, a 1 px divider above, its items at the two ends, a column aligned to the start at 768 px and below.

  The table of contents no longer reads site's header: it sticks `--luz-bar-h` + `--luz-space-lg` from the top on a page with core's `.o-sticky` (in a window at least 30 rem tall), and `--luz-space-lg` otherwise.

  | Was                                                                        | Now                                                                                                                                                                                     | Package   |
  | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
  | `.luz-site-header`, `__inner`, `__brand`, `__nav`, `__actions`, `--sticky` | `header.luz-cms-header.o-sticky > .o-container.o-container--inline.o-row`; `.luz-cms-header__brand`; `nav.luz-navbar`; `.o-row.luz-cms-header__actions`; or `.luz-cms-header--masthead` | cms, core |
  | `.luz-site-page-header`, `__title`, `__lead`                               | `.luz-cms-page-header`, `__title`, `__lead`                                                                                                                                             | cms       |
  | `.luz-site-footer`                                                         | `footer.luz-cms-footer > .o-container.o-container--inline.o-row`                                                                                                                        | cms, core |
  | `.luz-cms-toc` under `.luz-site-header--sticky` (`--luz-site-header-h`)    | under `.o-sticky` (`--luz-bar-h`)                                                                                                                                                       | cms, core |

  Known issue: in browsers without CSS anchor positioning, the sections menu of the masthead opens near the top of the window and covers the publication name and the menu button while it is open; Escape, or a click outside, closes it.

- 9f1c747: One stylesheet per component in site, landing and cms, as core already has: each `src/components/<name>.css` is also published as `dist/components/<name>.css` and `<name>.min.css`, in the package's own layer (`luz.site`, `luz.landing`, `luz.cms`), exported as `./components/*` (`@luz-ds/landing/components/header.css`). Site's print rules are also published on their own as `dist/print.css` (+ `.min`), exported as `@luz-ds/site/print.css`, for a page that loads components one by one; `site.css` still contains them. `./css` and `./css/min` stay the bundles.

  `@luz-ds/landing` and `@luz-ds/cms` now take `@luz-ds/site` as an optional peer (`peerDependenciesMeta`): their CSS works with `@luz-ds/tokens` and `@luz-ds/core` alone, and site, when you use it, is loaded before them. Tokens and core stay required.

  Core no longer names site's footer: `.o-shell` places its `footer` child across the bottom, as before, and nothing else. Site's footer class is gone (see below); put your footer in a `<footer>` that is a direct child of `.o-shell`.

  **Migration: the rest of site's page classes and exports.**

  | Was                           | Now                                                  |
  | ----------------------------- | ---------------------------------------------------- |
  | `.luz-site-content`           | `.o-container`                                       |
  | `.luz-site-skip-link`         | `.luz-skip-link` (core)                              |
  | `.luz-site-image*`            | `.luz-image*` (core), with no placeholder background |
  | `@luz-ds/site/placeholders/*` | removed: the placeholders are no longer published    |

- 65efde3: Every package now exports `./classes.json`, the classes, custom properties and `data-luz-*` hooks its CSS and script define, and core and site also export `./custom-elements.json`, their custom elements with the attributes each one reads, for editors and AI agents. Both are generated from the built `dist/`, and the Pages site serves a copy of each under `/manifests/<package>/`, beside `llms.txt`, `llms-full.txt` and one example page per component. `pnpm check:ai` regenerates all of them and fails when a file on disk is stale. `luz-check` carries a snapshot of these manifests. No runtime or style change.
- 84f5646: First release of LUZ, formerly CAI (its packages were last published as 2.0.0, under another scope). Migration from those packages: install `@luz-ds/*` instead; every old prefix becomes `luz` (classes `.luz-*`, hooks `data-luz-*`, tokens `--luz-*`, elements `<luz-*>`, layers `luz.*`, events `luz:*`, storage keys `luz-*`); the stylesheet and the script are now `luz.css` and `luz.js`. Display preferences stored under the old keys are not read.
