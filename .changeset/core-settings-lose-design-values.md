---
"@luz-ds/core": patch
"@luz-ds/check": patch
---

Core's settings (`luz.settings`) no longer define the motion, the font roles and the breakpoints: `--luz-duration-*`, `--luz-easing-*`, `--luz-font-heading`, `--luz-font-body`, `--luz-text-body` and `--luz-mq-*` now come from `@luz-ds/tokens`, which core already requires. Same names, same values, no visible change. The settings keep the z-index scale, `--luz-sidebar-width`, `--luz-content-max`, `--luz-bar-h`, `--luz-scrollbar-size` and `--luz-text-control`. Load the tokens before core, as before.
