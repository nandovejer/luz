# @luz-ds/core

Reusable CSS components and vanilla JS behaviors for the LUZ Design System.

> **Beta.** The tokens, components and patterns work and are tested, but names, classes and behavior can still change before the stable release. Pin an exact version and read the changelog before you upgrade.

## Prerequisites

Requires `@luz-ds/tokens` (declared as a peer dependency), loaded first. `@luz-ds/catalog` is optional and builds on this package. Core names nothing of it.

The navbar, the sidebar (with its brand and the drawer toggle), the terminal and the timeline are not in this package: they are in `@luz-ds/catalog`, one stylesheet each. `luz.css` does not include them, and `@luz-ds/core/sidebar` and `@luz-ds/core/timeline` are `@luz-ds/catalog/sidebar` and `@luz-ds/catalog/timeline`. A page that loads only core has no scroll spy; the sidebar drawer is a native popover and works without a script.

## Installation

```bash
npm install @luz-ds/tokens @luz-ds/core
```

## Usage

### Via npm/bundler

```js
import '@luz-ds/tokens/css'
import '@luz-ds/core/css'

import '@luz-ds/core'   // optional: the JavaScript, starts every behavior
```

`@luz-ds/core` without `/css` is the script, not the stylesheet.

### Via CDN (jsDelivr)

```html
<!-- Tokens first -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/tokens@0.3.0/dist/luz-tokens.css">

<!-- Then core -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.3.0/dist/luz.css">
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.3.0/dist/luz.js"></script>

<!-- A theme of your own (optional): start from themes/_template.css -->
<link rel="stylesheet" href="/my-brand.css">
<html data-theme="my-brand" data-luz-themes="my-brand">
```

### Bare HTML elements

The HTML comes out styled with no class: text, links, lists, buttons, fields, `select`, `fieldset`, tables, `details` and `dialog`. A `button` with no `type`, or with `type="submit"`, is the primary action; `type="button"` is the secondary one. The tags that only structure a page (`div`, `section`, `header`, `nav` and the rest) have no style: the layout is yours. A class adds what HTML cannot say, such as `.luz-btn` on an `a`, a danger role, a size or a card. Every rule has zero specificity, so any rule of yours wins. [Which elements have a style with no class](https://nandovejer.github.io/luz/docs/html/#html-styled).

### In a project that already has a design

Load `luz.conditional.css` instead of `luz.css`: the same file, with the reset and the bare elements only inside `[data-luz]`. The element with `data-luz` takes the font, color and background of the page; objects, components and utilities apply wherever you put their class. [Migrate a project to LUZ](https://nandovejer.github.io/luz/docs/get-started/migrate/) has the steps.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/tokens@0.3.0/dist/luz-tokens.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.3.0/dist/luz.conditional.css">

<main data-luz>…</main>
```

### Using a single component (standalone CSS)

Every component also ships as its own file in `dist/components/` — load only what you need. Tokens come first, then `base.css` (core settings such as z-index and layout widths, reset, bare elements):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/tokens@0.3.0/dist/luz-tokens.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.3.0/dist/base.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.3.0/dist/components/button.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.3.0/dist/components/card.css">
```

Available: `accordion`, `alert`, `avatar`, `breadcrumb`, `button`, `card`, `code`, `copy-btn`, `dropdown`, `figure`, `form`, `icon-grid`, `modal`, `pagination`, `player`, `progress`, `select`, `table`, `tabs`, `tag`, `theme-mode`, `toast`, `tooltip` (+ `_animations` for the shared keyframes). Each has a `.min.css` twin.

### Using a single JS behavior

The behavior modules are dependency-free browser ESM — import them individually; nothing runs until you call the module's `init*()`:

```js
import { applyTheme, initThemeSystem } from "@luz-ds/core/theme";
import { copyToClipboard } from "@luz-ds/core/clipboard";
import { mountPlayer } from "@luz-ds/core/player";
```

## Language

Text that LUZ's JavaScript writes (button names such as "Pause" or "Copy", status messages such as "Copied to clipboard") follows the page language. English (`en`) is in the entry. Every other language LUZ ships (Spanish today) is a small file, fetched only for the pages that declare it: the entry makes one request for `i18n-es.min.js` on a page in Spanish and none on a page in English.

- **Language** comes from the nearest `lang` attribute of the element, then `<html lang>`. A regional tag falls back to its primary subtag (`es-MX` → `es`), and a language without strings falls back to English. A fragment with its own `lang` (WCAG 3.1.2) gets its own strings, and its file is fetched too.
- **No `lang` at all:** English, and one console warning. Set `<html lang="…">` (WCAG 2.2 SC 3.1.1).
- **Override one string** with `data-luz-label-<key>` on the element or any ancestor, such as the component root: `<div class="luz-player" data-luz-label-pause="Pausar">`. Text and `aria-label`s you write in the HTML are kept, except the names that change with the state (play or pause, mute or unmute, full screen): set those with `data-luz-label-*`.
- **A language LUZ does not ship** (a page in French, say): set all the `data-luz-label-*` once on `<html>` or `<body>`, or add the language with `registerLocale()` before the entry runs:

```js
import { registerLocale } from "@luz-ds/core/i18n";

registerLocale("fr", { play: "Lire", pause: "Pause", copy: "Copier" });
```

- **The files LUZ ships** are fetched by `loadLocales()`, which the entry calls when it starts. With the individual modules, call it yourself and wait for it before the init functions that write text when they start:

```js
import { loadLocales } from "@luz-ds/core/i18n";
import { initHighlight } from "@luz-ds/core/highlight";
import { initPlayers } from "@luz-ds/core/player";

await loadLocales();
initHighlight();
initPlayers();
```

`loadLocales()` returns nothing to wait for on a page in English, and a promise that always resolves otherwise: a file that cannot load is one console warning and the English strings. Strings written on a click (copied, sorted, play or pause) read the dictionary when they are written, so they need no wait. `@luz-ds/core/i18n/es` is the Spanish dictionary alone, as a default export.

To check the language file, put an import map with an `integrity` section before the first module script (Chrome 127, Safari 18 and Firefox 138 and later; an older browser ignores the key and loads the file unchecked), on the pages in that language only:

```html
<script type="importmap">
{
  "integrity": {
    "https://cdn.jsdelivr.net/npm/@luz-ds/core@0.3.0/dist/i18n-es.min.js": "sha384-…"
  }
}
</script>
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.3.0/dist/luz.min.js" integrity="sha384-…" crossorigin></script>
```

A `<link rel="modulepreload" integrity>` is not a guard outside Chromium: Safari and Firefox do not block a file with a wrong hash. Use it as a performance hint only.

Keys: `play`, `pause`, `mute`, `unmute`, `fullscreen`, `exitFullscreen`, `captions`, `captionsOff`, `loading`, `midiError`, `timeOf` (`{current}`, `{total}`), `copy`, `copied`, `copiedStatus`, `copyFailed`, `codeExample` (`{lang}`), `copyCode` (`{n}`), `applyTheme`, `themeApplied`, `sortedAsc` and `sortedDesc` (`{column}`), `previous` and `next`. A key in camelCase becomes kebab-case in the attribute: `data-luz-label-exit-fullscreen`. Missing keys fall back to English.

`registerLocale()` must reach the same module instance the components use: with the auto-initializing entry import it from `@luz-ds/core`, with the individual modules from `@luz-ds/core/i18n`. Strings written later (play/pause, copied, status messages) use it right away; the ones written when a component initializes (code block names) need it registered before the `init*()` call.

## Cascade layers

Every stylesheet puts its rules in a layer of one container layer, `luz`: `luz.tokens`, `luz.themes`, `luz.settings`, `luz.generic`, `luz.elements`, `luz.objects`, `luz.components`, `luz.utilities`, `luz.catalog`, `luz.print`. Your unlayered CSS wins over all of them; to order LUZ as one unit, declare `@layer reset, luz, app;` first. The names are public API.

## Package exports

- **`.`** → `luz.js` — Entry: re-exports the full API + auto-initializes everything
- **`./css`** → `luz.css` — Full CSS bundle (`./css/min` for the minified twin)
- **`./base.css`** → Settings + reset + elements: the prerequisite for per-component CSS
- **`./components/*`** → Per-component CSS files (standalone use)
- **`./print.css`** → Print styles alone, for pages that load components one by one (`luz.css` already includes them)
- **`./conditional.css`** → `luz.css` with the reset and the bare elements only inside `[data-luz]`, for a project that already has a design
- **`./theme-mode`** → `theme-mode.js` — defines `<luz-theme-mode>`, the color mode (Auto, light, dark, high contrast); a lazy chunk that `luz.js` loads when the page has the element
- **`./theme-boot`** → `theme-boot.js` — an optional classic script for the `<head>` that writes `data-mode` (and `data-theme`, with no brand) before the first paint
- **`./theme`**, **`./clipboard`**, **`./modal`**, **`./highlight`**, **`./player`**, **`./tabs`** → Individual JS behavior modules (no side effects on import)
- **`./i18n`** → Strings for the JS-generated text (`t`, `getLang`, `registerLocale`, `loadLocales`); **`./i18n/*`** → one language LUZ ships, as a dictionary (`@luz-ds/core/i18n/es`)
- **`./midi`** → `midi.js` — MIDI player (lazy-loaded)
- **`./table-sort`** → `table-sort.js` — `initTableSort(root, t)`: sorts a table whose headings carry `data-luz-sort` (lazy-loaded by `luz.js`; no imports, so pass the `t` of `./i18n` when you load it on its own)
- **`./utils`** → Pure helper functions (`formatTime`, `escapeHtml`, …)
- **`./themes/*`** → `_template.css`, the starting point for a theme of your own

## Components included

- Buttons (primary, secondary, ghost, outline, danger)
- Forms (inputs, selects, checkboxes, toggles, file upload)
- Cards, tables, tabs, breadcrumbs, pagination, dropdowns, code blocks
- Players (video, audio, MIDI)
- Alerts, toasts, badges, avatars
- And more...

## Color mode

`<luz-theme-mode>` holds the radios of the color mode (`auto`, `light`, `dark`, `high-contrast`, `name="luz-theme-mode"`). Without JavaScript they change the mode through the tokens; with it, `luz.js` loads `theme-mode.min.js` and the element becomes one round button, fixed at the end corner of the window (`inline` keeps it in the flow, `no-remember` stops it storing the choice under `luz-theme`). It writes `data-mode` on `<html>`, and `data-theme` when the page names no brand, and fires `luz-theme-mode:change`. The optional `theme-boot.min.js`, a classic script in the `<head>`, applies the stored or system mode before the first paint. The markup and the options are on the [Theme mode](https://nandovejer.github.io/luz/docs/components/theme-mode/) page. To give Auto the time of day, wrap it in `<luz-theme-time>` from `@luz-ds/catalog`.

## Themes

LUZ ships one look, Vejer, in three color modes (`light`, `dark`, `high-contrast`): ET Book for running text, whitewash and sandstone surfaces, iron-black text, sky-blue links and actions, every link underlined.

A theme of your own overrides semantic tokens under `[data-theme="my-brand"]`, with `data-mode` for its light, dark and high-contrast variants. Copy `@luz-ds/core/themes/_template.css`, and check it with `npx @luz-ds/tokens@0.3.0 check-contrast my-brand.css`. `<luz-theme-mode>` writes `data-mode` and leaves `data-theme` to your theme; list the name in `<html data-luz-themes="my-brand">` only for `applyTheme()` and the buttons of custom themes.

## Vanilla JS behaviors

The core JS (`luz.js`) provides no-dependency implementations of:

- The color mode: Auto, light, dark and high contrast, remembered (`<luz-theme-mode>`)
- Seekbar and media player controls
- Syntax highlighting for code blocks
- And more...

<!-- luz:ai-agents:start -->
## For AI agents

`@luz-ds/core` 0.3.0 is in beta: any release may break anything. Read the breaking changes below before you update, and use only what the files under "Read first" list.

### Breaking changes

No breaking changes in 0.3.0.

Older versions: https://github.com/nandovejer/luz/blob/main/packages/core/CHANGELOG.md

### Read first

1. `dist/classes.json` in this package: the classes and custom properties its CSS defines. Write only those.
2. https://nandovejer.github.io/luz/llms.txt: the index of the documentation, short enough for a small context.
3. https://nandovejer.github.io/luz/llms-full.txt: the same pages in full.
4. https://nandovejer.github.io/luz/examples/: one standalone page of markup for each component and pattern.

### Load order

This package needs `@luz-ds/tokens` loaded first.

### Check what you write

Run `npx @luz-ds/check@0.3.0 <files>` on every HTML and CSS file you write, and fix what it reports. To copy the accessibility reviewer into your project: `npx @luz-ds/check@0.3.0 agent > .claude/agents/luz-accessibility-reviewer.md`.

<!-- luz:ai-agents:end -->

## License

MIT. Core ships no fonts; the serif used for running text (ET Book, MIT) comes with `@luz-ds/tokens`.
