---
"@luz-ds/core": minor
"@luz-ds/check": patch
---

Two pieces the home page had on its own are now in core. `luz-terminal` is a framed command: its tabs are the title bar and the Copy button sits at the end of the line it copies (`components/terminal.css`; its command is a `pre.luz-terminal__code`, which `highlight.js` leaves alone, so it gets no second Copy). `luz-tabs--pill` is a variant of tabs for tabs that hold an icon, with the open one as a chip instead of a rule.
