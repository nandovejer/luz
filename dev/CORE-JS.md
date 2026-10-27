# LUZ core JavaScript — module reference

Moved out of [AGENTS.md](../AGENTS.md) so the file every session loads stays short. The same facts, unchanged.

## JS in `packages/core/src/`

Vanilla JS, ES modules — JavaScript only enhances what the browser already does (native `dialog`, `popover`, `input type=range|radio|checkbox`, `progress`, forms). One module per concern, all re-exported (and auto-initialized) by the `luz.js` entry. Importing an individual module has no side effects until you call its `init*()`. Published exports: `@luz-ds/core/theme`, `/clipboard`, `/modal`, `/highlight`, `/player`, `/tabs`, `/utils`, `/i18n`, `/i18n/<code>`, `/midi`, `/table-sort`.

| Module         | Key exports                                                    |
| -------------- | -------------------------------------------------------------- |
| `theme.js`     | `applyTheme(theme)` (sets `data-theme` on `<html>`, persists), `applyMode`, `getInitialTheme`, `getCustomThemes()` (the names in `<html data-luz-themes="…">`; LUZ ships none), `initThemeSystem()`, `initThemeCycle()` (one button for a `.luz-mode-switcher--cycle` group) |
| `clipboard.js` | `copyToClipboard(text, el, type)` (visual feedback), `initCopyButtons()` |
| `modal.js`     | `initModals()` — fallback for `command`/`commandfor` on a native `<dialog>`; `supportsCommands()` |
| `highlight.js` | `highlightBlock(pre)` — dependency-free highlight for `pre.luz-code-block`, `initHighlight()` |
| `player.js`    | `initSeekbar(bar, onSeek)`, `wrapHTMLMedia(el)`, `bindPlayerUI(root, controls, mediaLike)`, `mountPlayer(root)`, `mountMidiPlayer(root)` (async), `initPlayers()` |
| `tabs.js`      | `activateTab(tab)`, `initTabs()` — upgrades linked panels to the ARIA tabs pattern; a fragment or in-page link into a hidden panel opens its tab; inactive panels are `hidden="until-found"` |
| `utils.js`     | `formatTime(seconds)` (`mm:ss`), `escapeHtml`, `calculateProgress`, `enableJs()` (sets `data-luz-js` on `<html>`), … |
| `i18n.js`      | `t(key, el, vars?)` — string for the language of `el` (nearest `lang`, then subtag, then English; `data-luz-label-<key>` overrides), `getLang(el)`, `registerLocale(lang, messages)`, `loadLocales(root?)` (fetches the files of the languages the page uses; `en` is in the entry, every other language is a lazy chunk built from `src/i18n/<code>.json` and exported as `/i18n/<code>`) |
| `midi.js`      | `MidiPlayer` — MIDI Format 0/1 parser + Web Audio scheduler (lazy-loaded chunk) |
| `table-sort.js` | `initTableSort(root, translate)` — sorts a table with `th[data-luz-sort]` in the browser (lazy-loaded chunk, no imports: `luz.js` passes its `t`) |

## Catalog's loader and the chunks that were core's

Core names nothing of catalog. The scroll spy of the sidebar and the timeline element were core's modules; they are catalog's now, in `packages/catalog/src/`, and are started by the presence loader of catalog (`catalog.js`), which scans the page once and imports the chunk of each piece the page has. The loader's map is a constant of string literals (SEC-CHUNK-1), and a page that loads only core has neither.

| Module (catalog) | Published as | Key exports |
| ---------------- | ------------ | ----------- |
| `sidebar.js`     | `@luz-ds/catalog/sidebar` | `initSidebar(root?)` — scroll-spy active link (`.luz-sidebar__link`, and every in-page link inside `[data-luz-spy]`); closes the popover drawer on navigation. The one selector of the loader that is a class, not a tag: it starts the chunk when the scan ends, with no wait for idle, and calls `initSidebar()`. The drawer is a native popover and needs no script |
| `timeline.js`    | `@luz-ds/catalog/timeline` | `<luz-timeline>` — a rail of dates, Previous / Next, opt-in autoplay with a visible Pause / Play, or a vertical layout that marks the item in view; `initTimeline(root, translate)`. The loader imports it when the page has a `luz-timeline` and gives it no `translate`: its four strings travel with it (English and Spanish), then `data-luz-label-*` and the nearest `lang` (EX-010), as `search.js` and `consent.js` do (EX-005) |

`registerLocale()` no longer reaches the timeline by itself. A page that registers a language for it calls `initTimeline(document, t)` with core's `t`. Each chunk guards `customElements.get()`, imports nothing and has its own budget row.
