---
"@luz-ds/core": minor
"@luz-ds/catalog": patch
"@luz-ds/check": patch
---

One family of icons: a 24 grid and a 1.5 stroke in `currentColor`.

- `@luz-ds/core`: the icons of `<luz-theme-mode>` (Auto, Light, Dark, High contrast) are drawn with a stroke, not filled, and `.luz-theme-mode__icon` sets the stroke itself (`fill: none`, `stroke: currentcolor`, `stroke-width: 1.5`, round caps and joins), so the markup of an icon holds its shapes only. An icon of your own in that radio takes the same rule: draw it on a 24 grid.
- `@luz-ds/catalog`: the icons of the search (trigger, field, close) and of the language switch use the 1.5 stroke, as the rest of the set.
- The docs: the Icons page replaces Icon grid, with the whole set and the logo, and the Button page tries an icon before the label, after it or alone.
