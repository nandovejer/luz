---
"@luz-ds/catalog": patch
"@luz-ds/check": patch
---

Adds `.luz-social` to catalog (`components/social.css`): a list of links to a site's profiles and feeds, an icon and the name of the place each, in a row that wraps. `.luz-social--icons` shows the icons alone, with the name in `.u-sr-only` and a square target of 36 px (WCAG 2.5.8 asks 24 px). LUZ ships no brand logos: the icons are neutral ones of the Icons page, now with a Feed icon, or the author's own. `luz-check` knows the new class.
