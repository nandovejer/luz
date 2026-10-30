---
"@luz-ds/core": patch
"@luz-ds/check": patch
---

Fix: with JavaScript off, choosing Dark in `<luz-theme-mode>` now also darkens a bare `select` and the date and time fields (and `.luz-select`, `.luz-input[type=date]`, `.luz-input[type=time]`). Four rules still looked for a radio group named `luz-theme`, which the colour mode stopped using when its radios became `luz-theme-mode`, so that branch never matched.
