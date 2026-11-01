---
"@luz-ds/catalog": patch
---

`<luz-timeline>`: the line of the rail and the base of the hump are drawn the same way, so they meet. The line was a 1px border moved up half its height with `translate`, and the base of the hump a stroke of an SVG; Firefox snaps a border to the device pixel and anti-aliases a stroke, so the line was one crisp row and the base of the hump two soft ones, half a pixel higher. The line is now an SVG of the hump's box (`.luz-timeline__line`, built with the rail, same `viewBox` and same ground stroke), so the two land on the same rows in every engine. It stays `--luz-outline`, and `CanvasText` in forced colors.
