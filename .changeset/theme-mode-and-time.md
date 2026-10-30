---
"@luz-ds/core": minor
"@luz-ds/catalog": minor
"@luz-ds/check": patch
---

The color mode is now two elements: `<luz-theme-mode>` in core (a round fixed button that cycles Auto, light, dark and high contrast) and `<luz-theme-time>` in catalog (the same button plus the time of day). **Breaking:** the 0.2.1 names below are gone, with no aliases. `luz-check` names the new one when it finds an old one.

| 0.2.1 | 0.3.0 |
| --- | --- |
| `<luz-mode>` (catalog) | `<luz-theme-time>` around core's `<luz-theme-mode>`, or `<luz-theme-mode>` alone |
| `.luz-mode-switcher`, `--cycle`, `--inline`, `__label` | `<luz-theme-mode>`; `--cycle` is the default; `--inline` is the `inline` attribute; the legend is `.luz-theme-mode__legend` |
| `.luz-mode-btn`, `__input`, `__icon` | `.luz-theme-mode__option`, `__input`, `__icon` |
| `.luz-mode-cycle` (the button `initThemeCycle` added) | `.luz-theme-mode__button`, added by the element |
| `components/mode-switcher.css` (core) | `components/theme-mode.css` (core); `components/theme-time.css` (catalog) |
| `initThemeCycle()` (`@luz-ds/core`) | none: the element does it |
| `@luz-ds/catalog/mode`, `dist/mode.js` | `@luz-ds/catalog/theme-time`, `dist/theme-time.js` |
| `components/mode.css` (catalog) | `components/theme-time.css` |
| (none) | `@luz-ds/core/theme-mode`, `@luz-ds/core/theme-boot`, `@luz-ds/catalog/theme-time-bar`, `@luz-ds/catalog/theme-time-boot` |
| radio `name="luz-theme"` | radio `name="luz-theme-mode"` |
| `data-theme` on `<html>` set by the mode | `data-mode` on `<html>`; `data-theme` stays the brand (it takes the mode only while the page names no brand) |
| `data-light="<phase>"` on `<html>` | `data-moment="<moment>"` |
| `remember` attribute | on by default; `no-remember` turns it off |
| `by="clock"` attribute | the `data-from` of the moments in the markup |
| `for` and `light-attr` attributes | none |
| the event `luz-mode:change` | `luz-theme-mode:change` (detail `{ mode, auto, user }`) |

The storage keys `luz-theme` (the choice) and `luz-light` (a pinned hour) do not change.

- With no JavaScript the radios still pick the mode. A theme copied from an older `_template.css` needs one selector line per block (see `theme-template-radios`).
- Optional head scripts set the mode before the first paint: `@luz-ds/core/theme-boot` (`data-mode`, `data-theme`) and `@luz-ds/catalog/theme-time-boot` (`data-moment`). Both are classic scripts that block rendering (EX-009, EX-012). Without them the elements do the same after the first paint.
- `<luz-theme-time>` takes its moments from the markup (`data-from="HH:MM"`, `data-theme="light|dark"`), and optional `latitude` and `longitude` for the real sunrise and sunset. `variant="bar"` adds the 24 h slider; it needs `data-luz-label-scrub` for its name, or `luz-check` reports `a11y/slider-no-name`.
- To drop the clock, use `<luz-theme-mode>` alone and link only core.
- The fixed button rides on top of `<luz-cookie-consent>` while the banner shows, and the sticky page rail keeps the banner's height as end padding.
- `@luz-ds/check` adds the rules `names/renamed:inline`, `names/renamed:cycle`, `names/renamed:element` and `names/renamed:element-wrap` for the names above, and `a11y/slider-no-name`.
