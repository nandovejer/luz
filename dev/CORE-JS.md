# LUZ core JavaScript — module reference

Moved out of [AGENTS.md](../AGENTS.md) so the file every session loads stays short. The same facts, unchanged.

## JS in `packages/core/src/`

Vanilla JS, ES modules — JavaScript only enhances what the browser already does (native `dialog`, `popover`, `input type=range|radio|checkbox`, `progress`, forms). One module per concern, all re-exported (and auto-initialized) by the `luz.js` entry. Importing an individual module has no side effects until you call its `init*()`. Published exports: `@luz-ds/core/theme`, `/sidebar`, `/clipboard`, `/modal`, `/highlight`, `/player`, `/tabs`, `/utils`, `/i18n`, `/i18n/<code>`, `/midi`, `/table-sort`, `/timeline`.

| Module         | Key exports                                                    |
| -------------- | -------------------------------------------------------------- |
| `theme.js`     | `applyTheme(theme)` (sets `data-theme` on `<html>`, persists), `applyMode`, `getInitialTheme`, `getCustomThemes()` (the names in `<html data-luz-themes="…">`; LUZ ships none), `initThemeSystem()`, `initThemeCycle()` (one button for a `.luz-mode-switcher--cycle` group) |
| `sidebar.js`   | `initSidebar()` — scroll-spy active link (`.luz-sidebar__link`, and every in-page link inside `[data-luz-spy]`); closes the popover drawer on navigation |
| `clipboard.js` | `copyToClipboard(text, el, type)` (visual feedback), `initCopyButtons()` |
| `modal.js`     | `initModals()` — fallback for `command`/`commandfor` on a native `<dialog>`; `supportsCommands()` |
| `highlight.js` | `highlightBlock(pre)` — dependency-free highlight for `pre.luz-code-block`, `initHighlight()` |
| `player.js`    | `initSeekbar(bar, onSeek)`, `wrapHTMLMedia(el)`, `bindPlayerUI(root, controls, mediaLike)`, `mountPlayer(root)`, `mountMidiPlayer(root)` (async), `initPlayers()` |
| `tabs.js`      | `activateTab(tab)`, `initTabs()` — upgrades linked panels to the ARIA tabs pattern; a fragment or in-page link into a hidden panel opens its tab; inactive panels are `hidden="until-found"` |
| `utils.js`     | `formatTime(seconds)` (`mm:ss`), `escapeHtml`, `calculateProgress`, `enableJs()` (sets `data-luz-js` on `<html>`), … |
| `i18n.js`      | `t(key, el, vars?)` — string for the language of `el` (nearest `lang`, then subtag, then English; `data-luz-label-<key>` overrides), `getLang(el)`, `registerLocale(lang, messages)`, `loadLocales(root?)` (fetches the files of the languages the page uses; `en` is in the entry, every other language is a lazy chunk built from `src/i18n/<code>.json` and exported as `/i18n/<code>`) |
| `midi.js`      | `MidiPlayer` — MIDI Format 0/1 parser + Web Audio scheduler (lazy-loaded chunk) |
| `table-sort.js` | `initTableSort(root, translate)` — sorts a table with `th[data-luz-sort]` in the browser (lazy-loaded chunk, no imports: `luz.js` passes its `t`) |
| `timeline.js`  | `<luz-timeline>` — a rail of dates, Previous / Next, opt-in autoplay with a visible Pause / Play, or a vertical layout that marks the item in view (lazy-loaded chunk: `luz.js` imports it only on a page with a `luz-timeline` and passes its `t` to `initTimeline(root, translate)`; importing it defines the element and imports nothing, its four strings travel with it, EX-010) |

