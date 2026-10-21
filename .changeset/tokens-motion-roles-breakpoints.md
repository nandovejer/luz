---
"@luz-ds/tokens": minor
"@luz-ds/check": patch
---

`@luz-ds/tokens` now carries the motion, the font roles and the breakpoints, so a page that loads only the tokens has them too.

- Motion: `--luz-duration-instant`, `-fast`, `-base`, `-slow`, `-slower`, `-lazy` and `--luz-easing-standard`, `-enter`, `-exit`, `-spring`, `-linear`. Under `prefers-reduced-motion: reduce` every duration is `0s`, so a page with tokens alone loses its motion too.
- Font and text roles: `--luz-font-heading`, `--luz-font-body` and `--luz-text-body`. On an element marked `lang="ar"` both fonts take the system sans, because ET Book has no Arabic letters.
- Breakpoints: `--luz-mq-sm`, `-md`, `-lg`, `-xl`, `-xxl`, `-xxxl` (reference values: a media query cannot read them).

Same names, same values. `tokens.json` has four new groups (`role`, `breakpoint`, `duration`, `easing`) and `luz-tokens.dtcg.json` has them in its primitives, with `duration` and `cubicBezier` types and the two fonts as aliases of the serif. A custom property in your own theme (the `luz.themes` layer) now wins over `--luz-font-body` and `--luz-font-heading`, as it does over every other token; before, core's settings layer came after it.

`luz-check` and `luz-tokens check-contrast` do not list LUZ's own reduced-motion rule as an ignored condition: it sets durations, not colours.
