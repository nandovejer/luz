---
"@luz-ds/catalog": minor
"@luz-ds/check": patch
---

`<luz-mode>` can pin an hour: `pin(x)` (a phase name or an hour from 0 to 24, `by="clock"` only) keeps Auto at that hour instead of now, and `pinned` reads it. With `remember` the hour is stored under `luz-light`, in minutes of the day, and the stored mode is removed; choosing a mode, or `pin(null)`, unpins it. `preview(null)` returns to the pinned hour when there is one, and `luz-mode:change` carries `pinned` in its `detail`. Auto no longer needs a radio of its own: without one, no radio is checked while Auto is applied.
