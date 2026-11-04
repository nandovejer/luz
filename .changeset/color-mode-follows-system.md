---
"@luz-ds/tokens": minor
"@luz-ds/core": minor
"@luz-ds/catalog": minor
"@luz-ds/check": patch
---

The default color mode now follows the system, with no script. A page that names no mode is dark when the system is dark, high contrast when the system asks for more contrast (`prefers-contrast: more` wins over dark), and light otherwise. Before, only the script looked at the system, so with no JavaScript, or before it ran, the page was always light.

**Who sees a difference:** people whose system is dark or high contrast, on a page that names no mode.

**To keep a page light:** `<html data-theme="light">`.

**What still wins over the system:** `data-mode` or `data-theme` (set by your page, or by `<luz-theme-mode>` and `theme-boot.js` from the stored choice), and a checked light, dark or high contrast radio of `<luz-theme-mode>`. The Auto radio follows the system. A page that names a brand theme behaves as before.

Date and time pickers and the open list of a select are dark in the same cases.

`luz-check`: no change; version bump only.
