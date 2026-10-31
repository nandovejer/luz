# @luz-ds/catalog

Components that are not core's, each one stylesheet: light-DOM `<luz-*>` tags (search, cookie consent, theme time, language switch, submenu, announcement, FAQ and timeline), the navigation of a site (the navbar and the sidebar, which are classes with no tag), the terminal, and the patterns of a landing page, a blog, an app and a documentation site. Catalog is the navigation of the site and the pieces with JS or an identity of their own; everything else is in `@luz-ds/core`, which names nothing of catalog.

The rest are the patterns of a kind of site: the page structure of a landing page, a blog or newspaper, a web application and a documentation site. They are catalog components too, one file each, `<block>.css`. The name says what the piece is, with no kind of site in it, and its docs page says which kinds of site it fits best. See [Patterns of a kind of site](#patterns-of-a-kind-of-site).

> **Beta.** The tokens, components and patterns work and are tested, but names, classes and behavior can still change before the stable release. Pin an exact version and read the changelog before you upgrade.

## Prerequisites

Requires `@luz-ds/tokens` and `@luz-ds/core` (both declared as peer dependencies), loaded in that order before this package.

## Installation

```bash
npm install @luz-ds/tokens @luz-ds/core @luz-ds/catalog
```

## Usage

Tokens and core are one stylesheet each. Catalog has no bundle: each component is a file of its own, `components/<name>.css` (and `.min.css`), and a page links only the ones it uses, after core, in any order (no two of them style the same element). Each file carries its own print rules. The page of each component in the docs starts its markup with its two lines.

### Via npm/bundler

```js
import '@luz-ds/tokens/css'
import '@luz-ds/core/css'
// One import per component the page uses: here the search and the time of day
import '@luz-ds/catalog/components/search.css'
import '@luz-ds/catalog/components/theme-time.css'

import '@luz-ds/core'        // optional: the core behaviors
import '@luz-ds/catalog'    // the loader: the chunks of the search, the cookie banner, the time of day, the timeline and the sidebar, when the page has them
```

`@luz-ds/core` and `@luz-ds/catalog` without `/css` are the scripts.

### Via CDN

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/tokens@0.3.0/dist/luz-tokens.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.3.0/dist/luz.min.css">
<!-- One link per component the page uses: here the search and the time of day -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.3.0/dist/components/search.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.3.0/dist/components/theme-time.min.css">
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.3.0/dist/luz.min.js"></script>
<!-- The loader: it loads search.min.js on a page with a <luz-search>,
     cookie-consent.min.js on a page with a <luz-cookie-consent>, theme-time.min.js on a
     page with a <luz-theme-time> (and theme-time-bar.min.js after it for a
     variant="bar"), timeline.min.js on a page with a <luz-timeline> and
     sidebar.min.js on a page with a .luz-sidebar, and nothing else -->
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.3.0/dist/catalog.min.js"></script>
```

With Subresource Integrity, an `integrity` on the `<script>` covers `catalog.min.js` only. To check each chunk the page may load, put an import map with an `integrity` section before the first module script. It works in Chrome 127 and later, Safari 18 and later and Firefox 138 and later; an older browser ignores the key and loads the chunks unchecked.

```html
<script type="importmap">
{
  "integrity": {
    "https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.3.0/dist/search.min.js": "sha384-…",
    "https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.3.0/dist/cookie-consent.min.js": "sha384-…",
    "https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.3.0/dist/theme-time.min.js": "sha384-…",
    "https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.3.0/dist/theme-time-bar.min.js": "sha384-…",
    "https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.3.0/dist/timeline.min.js": "sha384-…",
    "https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.3.0/dist/sidebar.min.js": "sha384-…"
  }
}
</script>
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.3.0/dist/catalog.min.js" integrity="sha384-…" crossorigin></script>
```

A `<link rel="modulepreload" integrity>` is not a guard outside Chromium: Safari and Firefox do not block a chunk with a wrong hash. Add `modulepreload` only as a performance hint.

## Package exports

- **`.`** → `catalog.js` — The presence loader. Warns when core is not loaded, scans the page once and loads `search.js` when it has a `<luz-search>` (on the first pointerdown or focus in it, Ctrl+K, or idle) `cookie-consent.js` when it has a `<luz-cookie-consent>` (on idle) `theme-time.js` when it has a `<luz-theme-time>` (on idle, and `theme-time-bar.js` after it when that has `variant="bar"`), `timeline.js` when it has a `<luz-timeline>` and `sidebar.js` when it has a `.luz-sidebar`, both as soon as the page is scanned. `catalog.min.js` imports `./search.min.js`, `./cookie-consent.min.js`, `./theme-time.min.js`, `./theme-time-bar.min.js`, `./timeline.min.js` and `./sidebar.min.js` and nothing else
- **`./search`** → `search.js` — defines `<luz-search>`, a custom element (light DOM) that holds the fallback link, the trigger and the search `<dialog>`, and wires them when it connects; importing it in a page defines the element (once, however many copies), importing it in Node does nothing. Import it by hand for a `<luz-search>` added after the page has loaded
- **`./cookie-consent`** → `cookie-consent.js` — defines `<luz-cookie-consent>`, the cookie banner (light DOM), and exports `getConsent(key?)`. Importing it in Node does nothing but give `getConsent`
- **`./theme-time`** → `theme-time.js` — defines `<luz-theme-time>` (light DOM), which gives the Auto of core's `<luz-theme-mode>` the time of day, in the moments the markup declares. Importing it defines the element
- **`./theme-time-bar`** → `theme-time-bar.js` — exports `initThemeTimeBar(root)`: builds the slider of the 24 hours inside each `<luz-theme-time variant="bar">`. The loader starts it after `theme-time.js`; call it for a bar added later
- **`./theme-time-boot`** → `theme-time-boot.js` — an optional classic script for the `<head>`, after core's `theme-boot.js`, that writes `data-moment` (and the mode of that moment, in Auto) before the first paint, from the `data-moments` on its own tag
- **`./timeline`** → `timeline.js` — defines `<luz-timeline>`, a timeline with a rail of dates (light DOM), and exports `initTimeline(root, translate)`. It carries its own four strings, in English and Spanish, and reads `data-luz-label-<key>` on the element or an ancestor, then the nearest `lang`, as the search and the cookie banner do (EX-010). A language added with `registerLocale()` does not reach it by itself: call `initTimeline(document, t)` with core's `t`. Importing it in Node does nothing
- **`./sidebar`** → `sidebar.js` — exports `initSidebar()`: the scroll spy that marks the link of the section on screen (`.luz-sidebar__link`, and every in-page link inside `[data-luz-spy]`), and closes the drawer when a link is chosen. The loader calls it when the page has a `.luz-sidebar`; call it yourself for a sidebar added later. The drawer itself is a native popover and works without it. Importing it has no side effects
- **`./components/*`** → `dist/components/` — the package's only CSS: one stylesheet per component, `<name>.css` and `<name>.min.css`, its screen rules in `luz.catalog` and what it does on paper in `luz.print`: `announcement`, `cookie-consent`, `faq`, `lang-switch`, `navbar`, `search`, `sidebar`, `submenu`, `terminal`, `theme-time`, `timeline` and the patterns of a kind of site, each named by its block (`hero`, `site-header`, `page-rail` and the others of the table below). `classes.json` says the file of each class (`files`) and `custom-elements.json` the file of each tag (`stylesheet`)

There is no `./css`, `./css/min` or `./print.css` since 0.3: link the components instead.

The four packages `@luz-ds/landing`, `@luz-ds/cms`, `@luz-ds/app` and `@luz-ds/docs` are not published any more; see [Patterns of a kind of site](#patterns-of-a-kind-of-site).

## Tags and classes included

Each tag is the block; its parts are `.luz-<tag>__<part>`.

- `<luz-submenu>` — An item of the header's links that holds more links: a tag (no class, no script, `display: contents`) around a native `<details name>`, in the flow in the menu panel and a box under its button from 769 px
- `<luz-faq>` and its parts `.luz-faq__*` (`__title`, `__lead`, `__nav`, `__group`, `__group-title`, `__item`, `__question`, `__answer`, `__more`) — A tag (no script) around native `details`, one question each, in groups under their headings; the `id` goes on the answer, so a link to it opens the question; a plus that turns to a minus, and the answers print open
- `<luz-announcement>` (`tone="warning"`) — A tag (no class, no script) around one `<section aria-labelledby>`: a band above the header with one short announcement and one link; no close button
- `<luz-cookie-consent>` and `.luz-cookie-consent` (`__title`, `__choices`) — The cookie banner, first after the skip link in the markup and shown as a band fixed at the bottom of the window (in the flow under 30rem tall), hidden until `cookie-consent.js` shows it; its confirmation has a `[data-luz-consent-close]` button, and while it shows `cookie-consent.js` sets `--luz-consent-h` on `:root` so the page keeps room for it
- `.luz-navbar` (`__list`, `__link`) — The links of a header: a `nav[popover]` that is a row of the bar from 769 px and a native popover panel under it below, opened by a `.luz-nav-toggle`. No script
- `.luz-sidebar` (`__brand`, `__logo`, `__brand-name`, `__version`, `__section`, `__section-label`, `__link`, `__footer`) with `.luz-nav-toggle` (`--fixed`, `__bar`) — Sidebar navigation and its drawer, a native popover on small screens. The brand is the part of the sidebar that holds the logo, the name and the version. `sidebar.js` adds the scroll spy
- `.luz-terminal` (`__tabs`, `__pane`, `__code`) — A command in a framed block: tabs as its title bar and a copy button at the end of the line it copies. No script of its own; the copy button is core's
- `<luz-timeline>` with `.luz-timeline` (`__item`, `__date`, `__title`, `__text`, `__rail`, `__stage`, `__track`, `__stop`, `__arrow`, `__toggle`) — Dated events in order, one card at a time on a rail of dates or all at once down a line; without JavaScript it is a list
- `<luz-theme-time>` with `.luz-theme-time__moments`, `__moment`, `__bar`, `__slider` — Theme time: a tag around core's `<luz-theme-mode>` that gives its Auto the hour, in moments declared in the markup, with an optional slider of the 24 hours (`variant="bar"`); `theme-time.js` and `theme-time-bar.js`
- `<luz-lang-switch>` with `.luz-lang-switch__button`, `__menu`, `__list`, `__link`, `__name`, `__title`, `__icon` — Language switch: a tag (no script) around a button that opens a native popover list of links; `--luz-lang-switch-top` (default `--luz-bar-h`) places the list
- `<luz-search>` with `.luz-search__fallback` (`__fallback-label`), `.luz-search__trigger` (`--compact`, `__trigger-icon`, `__trigger-label`, `__trigger-key`) and `.luz-search` (`__body`, `__head`, `__title`, `__field`, `__status`, `__close`, `__results`, `__foot`) — Site search: a link to your index that a button replaces, in the same space, and a native `<dialog>` of grouped links

## Search

A button shaped like a field ("Search docs…", <kbd>Ctrl K</kbd>) opens a native `<dialog>` with a field and the results as links, grouped under Pages, Sections and HTML elements (8 per group at most). Ctrl+K and ⌘K open it too, also before its script has loaded. Without JavaScript the button stays hidden and a plain link to your index page shows in its place. Every fixed text is in your markup, and the few the script writes (the count, "no results", loading, error) are `data-luz-label-*` attributes on the dialog, in the page's language. The full markup, the keyboard model and the index format are on the [Search page of the docs](https://nandovejer.github.io/luz/docs/catalog/search/).

The index is a JSON file on the same origin (`data-luz-search-src`), format version 1, with URLs relative to the file:

```json
{ "version": 1,
  "pages": [["Button", "components/button/", "Components"]],
  "sections": [["When to use, Button › Design", "components/button/#when"]],
  "elements": [["<table> element, Tables", "html/tables/#el-table"]] }
```

Each item is `[text, url, meta?, lang?]`. The component fetches it only from the page's own origin, without following redirects (your CSP needs `connect-src 'self'`), keeps only `http:` and `https:` links, writes every text as text, and has limits: 1,000,000 characters of JSON, 10,000 results, 300 characters a text, 8 words a search. Unknown fields are ignored.

## Cookie consent

A band fixed at the bottom of the window asks once whether the site may use optional cookies: Accept and Reject side by side, with the same style, and a `<details>` with one checkbox per category. It is `hidden` in the markup and `cookie-consent.js` shows it when no answer is stored, when the stored one has expired (180 days by default, `data-luz-consent-days`, 395 at most), or when it offers a category the stored answer was not asked about. It does not take focus, and while it shows it reserves the page's height, so it covers nothing; Escape is not an answer. Without JavaScript it stays hidden: none of your scripts run either, and the cookie policy is a link on every page.

The answer is stored in `localStorage` under `luz-consent` (or `data-luz-consent-key`, starting with `luz-`), as `{"version":1,"expires":<ms>,"asked":[…],"granted":[…]}`. Read it with `getConsent()`, which returns `{ asked, granted, expires }` or `null`, and listen for `luz:consent` on `document`, dispatched with the same object as `detail` on every new answer. A button with `data-luz-consent-open` (and `hidden`) shows the banner again. The script writes no text. Full markup on the [Cookie consent page of the docs](https://nandovejer.github.io/luz/docs/catalog/cookie-consent/).

```js
import { getConsent } from "@luz-ds/catalog/cookie-consent";
const granted = (answer) => answer?.granted.includes("analytics");
if (granted(getConsent())) startMeasuring();
document.addEventListener("luz:consent", (e) => (granted(e.detail) ? startMeasuring() : location.reload()));
```

## Theme time

`<luz-theme-time>` wraps core's [`<luz-theme-mode>`](https://nandovejer.github.io/luz/docs/components/theme-mode/) and gives its Auto the hour. The moments of the day are declared in the markup, one radio each: its `value` is the name, its label the visible name, `data-from` where it starts (`HH:MM`, the visitor's clock) and `data-theme` the base it is painted over (`light` or `dark`); `data-default` marks the one a chosen mode shows. In Auto the mode is the base of the moment now, and the moment's name goes to `data-moment` on `<html>`, checked again each minute (the system's `prefers-contrast: more` still wins). The colors of each moment are yours: a rule on `:root[data-theme="light"][data-moment="morning"]`. Optional `latitude` and `longitude` use today's real sunrise and sunset of that place, worked out in the page, with no location prompt and no network. Without JavaScript the moments are not shown and Auto is light.

```html
<luz-theme-time>
  <luz-theme-mode>…core's fieldset and its four radios…</luz-theme-mode>
  <fieldset class="luz-theme-time__moments">
    <legend class="luz-theme-time__legend">Time of day</legend>
    <label class="luz-theme-time__moment"><input class="luz-theme-time__input" type="radio" name="luz-theme-moment" value="dawn" data-from="05:00" data-theme="dark">Dawn</label>
    <label class="luz-theme-time__moment"><input class="luz-theme-time__input" type="radio" name="luz-theme-moment" value="afternoon" data-from="12:00" data-theme="light" data-default>Afternoon</label>
    <label class="luz-theme-time__moment"><input class="luz-theme-time__input" type="radio" name="luz-theme-moment" value="night" data-from="22:30" data-theme="dark" data-default>Night</label>
  </fieldset>
</luz-theme-time>
```

`variant="bar"` adds the slider of the 24 hours: dragging previews the hour on the page, letting go pins it (stored under `luz-light`, in minutes of the day) until a mode or Auto is chosen with core's button, or Escape is pressed on the slider. By default the bar is the slider alone; `show` adds `time`, `place`, `saved` and `moments`. The slider's name and the note "Saved" are `data-luz-label-scrub` and `data-luz-label-saved`, with no English fallback. The element has `hour`, `moment`, `pinned`, `place`, `preview(hour)`, `pin(hour)` and `unpin()`, and dispatches `luz-theme-time:change`, bubbling, with `{ moment, pinned }`. The optional `theme-time-boot.min.js` applies the moment before the first paint (it ignores `latitude` and `longitude`). All the options are on the [Theme time page of the docs](https://nandovejer.github.io/luz/docs/catalog/theme-time/).

## Patterns of a kind of site

Each pattern is CSS only, in `luz.catalog`, with no script and no tag of its own: the classes go on the markup the docs page shows. A landing page, a blog, an application and a documentation site were four packages; they are files of this one. Link the ones your page uses, after core, in the order of the table, which is the order the stylesheet of the kind had them. A file that two kinds use is listed once.

```js
import '@luz-ds/catalog/components/site-header.css'
import '@luz-ds/catalog/components/hero.css'
```

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.3.0/dist/components/hero.min.css">
```

| Fits best | File in `components/` | Block | Docs page |
| --- | --- | --- | --- |
| Landing page, blog or newspaper | `site-header.css` | `.luz-site-header` (`--publication` for a blog) | [site-header](https://nandovejer.github.io/luz/docs/catalog/site-header/) |
| Landing page | `hero.css` | `.luz-hero` | [hero](https://nandovejer.github.io/luz/docs/catalog/hero/) |
| Landing page | `main.css` | `.luz-main` | none |
| Landing page | `section.css` | `.luz-section` | [section](https://nandovejer.github.io/luz/docs/catalog/section/) |
| Landing page | `stat.css` | `.luz-stat` | [stat](https://nandovejer.github.io/luz/docs/catalog/stat/) |
| Landing page, blog or newspaper | `site-footer.css` | `.luz-site-footer` | [site-footer](https://nandovejer.github.io/luz/docs/catalog/site-footer/) |
| Landing page | `glow.css` | `.luz-glow` | none |
| Blog or newspaper | `masthead.css` | `.luz-masthead` | [masthead](https://nandovejer.github.io/luz/docs/catalog/masthead/) |
| Blog or newspaper | `page-header.css` | `.luz-page-header` | [page-header](https://nandovejer.github.io/luz/docs/catalog/page-header/) |
| Blog or newspaper | `article-header.css` | `.luz-article-header` | [article-header](https://nandovejer.github.io/luz/docs/catalog/article-header/) |
| Blog or newspaper | `article.css` | `.luz-article`, `.luz-toc` | [toc](https://nandovejer.github.io/luz/docs/catalog/toc/) |
| Web application | `app-bar.css` | `.luz-app-bar` | [app-bar](https://nandovejer.github.io/luz/docs/catalog/app-bar/) |
| Web application | `dashboard.css` | `.luz-dashboard` | [dashboard](https://nandovejer.github.io/luz/docs/catalog/dashboard/) |
| Documentation site | `docs-layout.css` | `.luz-docs-layout` | [docs-layout](https://nandovejer.github.io/luz/docs/catalog/docs-layout/) |
| Documentation site | `doc-header.css` | `.luz-doc-header` | [doc-header](https://nandovejer.github.io/luz/docs/catalog/doc-header/) |
| Documentation site | `page-rail.css` | `.luz-page-rail` | [page-rail](https://nandovejer.github.io/luz/docs/catalog/page-rail/) |
| Documentation site | `example.css` | `.luz-example` | [example](https://nandovejer.github.io/luz/docs/catalog/example/) |
| Documentation site | `do-dont.css` | `.luz-do-dont` | [do-dont](https://nandovejer.github.io/luz/docs/catalog/do-dont/) |
| Documentation site | `pager.css` | `.luz-pager` | [pager](https://nandovejer.github.io/luz/docs/catalog/pager/) |
| Documentation site | `page-footer.css` | `.luz-page-footer` | [page-footer](https://nandovejer.github.io/luz/docs/catalog/page-footer/) |

Load `hero.css` with `section.css`: the head of a section shares its rules. The blog and the newspaper work with any CMS.

## What moved out

Before 0.1, this package also held the page structure. The skip link, the image frame (`.luz-image`, a flat surface with no placeholder), the band, the action group (`.o-actions`), the sticky bar (`.o-sticky`), the page column (`.o-page`) are in `@luz-ds/core`. The header, hero, sections and footer of a landing page, the pieces of a blog, an application and a documentation site were in four packages and are now the files above. The image placeholders are no longer published. Their classes lost the kind of site: `.luz-landing-hero` is `.luz-hero`, `.luz-docs-rail` is `.luz-page-rail`, and `<luz-mode>`, `<luz-consent>` and `<luz-banner>` are `<luz-theme-time>`, `<luz-cookie-consent>` and `<luz-announcement>`. The old names do nothing; the changelog has the full table, and `luz-check` names the new one.

This package also holds four components that were core's: the navbar, the sidebar (with its brand and `.luz-nav-toggle`), the terminal and the timeline. The classes, the markup and the look are the same; the package, the layer (`luz.catalog`) and the import path changed. `@luz-ds/core/sidebar` is now `@luz-ds/catalog/sidebar`, `@luz-ds/core/timeline` is `@luz-ds/catalog/timeline`, and `luz.css` no longer includes the four stylesheets: link `@luz-ds/catalog/components/<name>.css` for each one you use.

<!-- luz:ai-agents:start -->
## For AI agents

`@luz-ds/catalog` 0.3.0 is in beta: any release may break anything. Read the breaking changes below before you update, and use only what the files under "Read first" list.

### Breaking changes

No breaking changes in 0.3.0.

Older versions: https://github.com/nandovejer/luz/blob/main/packages/catalog/CHANGELOG.md

### Read first

1. `dist/classes.json` in this package: the classes and custom properties its CSS defines. Write only those.
2. `dist/custom-elements.json` in this package: the `<luz-*>` elements it defines, with their attributes.
3. https://nandovejer.github.io/luz/llms.txt: the index of the documentation, short enough for a small context.
4. https://nandovejer.github.io/luz/llms-full.txt: the same pages in full.
5. https://nandovejer.github.io/luz/examples/: one standalone page of markup for each component and pattern.

### Load order

This package needs `@luz-ds/tokens` and `@luz-ds/core` loaded first.

### Check what you write

Run `npx @luz-ds/check@0.3.0 <files>` on every HTML and CSS file you write, and fix what it reports. To copy the accessibility reviewer into your project: `npx @luz-ds/check@0.3.0 agent > .claude/agents/luz-accessibility-reviewer.md`.

<!-- luz:ai-agents:end -->

## License

MIT
