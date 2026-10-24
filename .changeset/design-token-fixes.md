---
"@luz-ds/core": patch
"@luz-ds/catalog": patch
"@luz-ds/check": patch
---

The menu of `<luz-lang-switch>` read `--luz-radius-lg`, a radius the scale does not have, so its corner declaration was dropped and the menu had square corners: it takes the medium radius like every menu. The caption of `.luz-figure` takes a step of the text scale (`--luz-text-sm`) instead of a size derived from the surrounding text.
