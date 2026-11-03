---
"@luz-ds/core": minor
"@luz-ds/catalog": minor
"@luz-ds/check": patch
---

**Breaking:** the four chart sheets move from core to catalog. `.luz-bar-list`, `.luz-column-chart`, `.luz-stacked-bar` and `.luz-heat-map` leave `@luz-ds/core/components/*` and are now `@luz-ds/catalog/components/bar-list.css`, `column-chart.css`, `stacked-bar.css` and `heat-map.css` (and their `.min.css`), each an independent stylesheet in the `luz.catalog` layer, linked after `luz.css` and only where a page uses it. Change the `href` (or the `@import`) of the ones you link: `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@<version>/dist/components/bar-list.min.css">`. The CSS and the markup are the same; the sheets still read only tokens, and a page that links them must also link `@luz-ds/catalog`'s peers (tokens and core). The rule is now that core is what every page needs and fits in `luz.css`, and what a page links on its own when it uses it is catalog; the docs pages of the four are at `/docs/catalog/<name>/`. `luz-check` takes the classes of the four from catalog.
