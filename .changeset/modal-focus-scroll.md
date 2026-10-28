---
"@luz-ds/core": patch
"@luz-ds/catalog": patch
---

A full-screen modal on a small screen (the core modal, the search dialog) keeps a focused control clear of its pinned header and footer in Firefox and Safari too: `scroll-padding-block` now adds `--luz-space-md` to the height of each bar, because Firefox ignores the padding when the control is already in view and Safari's keyboard-focus scroll stops short of it.
