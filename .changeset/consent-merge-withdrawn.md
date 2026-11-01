---
"@luz-ds/catalog": patch
"@luz-ds/check": patch
---

`<luz-cookie-consent>` and `<luz-embed>` now merge their answer into the stored `luz-consent` record, so each keeps the categories the other granted (before, saving the banner erased what an embed had granted, and the other way round). The `luz:consent` event gains `withdrawn` (what was granted before and is not now) and `given` (the time of the answer), and a banner with `data-luz-consent-policy` stores the version of the policy shown as `policy`; the record stays at version 1, with `given` and `policy` optional. `detail.asked` and `detail.granted` now describe the whole record, not only the categories of the banner that answered. "Always" in `<luz-embed>` lasts the `data-luz-consent-days` of the page's banner (180 by default, 395 at most) and stores `given` and `policy`.
