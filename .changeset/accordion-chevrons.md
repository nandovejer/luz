---
"@luz-ds/core": patch
"@luz-ds/check": patch
---

`.luz-accordion`: a summary can hold two chevrons of the Icons page, `.luz-accordion__end` (shown while the panel is closed; `data-luz-flip` mirrors it in right-to-left text) and `.luz-accordion__down` (shown while it is open). The glyphs sit at the end of the row and replace the browser's marker, only in a summary that holds `.luz-accordion__end`: an accordion without them, and a bare `details`, keep the native marker. It is CSS only and works without JavaScript.

The same release shortens the core stylesheet by 62 B with no visual change: block-axis properties written as logical ones, a few dead fallbacks removed (`-webkit-overflow-scrolling`, the `vh` lines before `dvh`) and some rules merged. `@luz-ds/check` knows the two new classes.
