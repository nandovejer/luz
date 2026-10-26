---
"@luz-ds/core": minor
"@luz-ds/catalog": minor
"@luz-ds/check": patch
---

Every `.luz-modal` now fills the screen on a small one: up to 640 px wide, or in a window under 30 rem tall (a phone held sideways). It has no margin, radius, border or shadow, uses the dynamic viewport height, and keeps its padding clear of the safe areas. The header with the close button (44 px) stays at the top and the footer at the bottom, and the content is the one thing that scrolls. Above that, nothing changes. The search dialog of `<luz-search>` follows the same rule, so it goes full screen at 640 px instead of 768 px. If you sized your own modal for small screens (with `min()`, `max-inline-size` or margins), remove that rule: your unlayered CSS overrides the new one and leaves the modal floating. A page that only uses the stock modal needs no change.
