---
"@luz-ds/catalog": patch
"@luz-ds/check": patch
---

`<luz-search>` no longer throws when its `<dialog>` lacks the field, the `role="status"` element or the `[data-luz-search-results]` block. The script leaves such a search unwired: the fallback link stays and nothing is hidden. A complete search is unchanged.
