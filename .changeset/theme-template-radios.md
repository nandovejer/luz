---
"@luz-ds/core": minor
"@luz-ds/tokens": patch
"@luz-ds/check": minor
---

The theme template (`themes/_template.css`) answers to the checked radio of `<luz-theme-mode>` with no JavaScript: each of its three blocks gains a `:is(:root[data-theme="my-brand"]:not([data-mode]):has(input[name="luz-theme-mode"][value="…"]:checked))` selector. A theme copied from an older template needs that line added to each block (see Themes). `luz-tokens check-contrast` no longer lists the new selector as ignored.
