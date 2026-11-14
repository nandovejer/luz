---
"@luz-ds/core": patch
"@luz-ds/check": patch
---

`.luz-accordion`: the chevron of a summary keeps its size. At 320 px, when the summary's text wrapped onto two lines, the glyph shrank, from 20 px to 13 px with a short second line and to a few pixels with a long one, because an SVG that is a flex child can shrink; it is now `flex: none`. It costs 7 B of the core stylesheet. `@luz-ds/check` is released with it because it carries a snapshot of the core's classes.
