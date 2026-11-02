---
"@luz-ds/catalog": patch
"@luz-ds/check": patch
---

Adds the page transition to catalog (`components/page-transition.css`), a stylesheet with no class, tag or attribute: a site that links it on its pages gets a short cross-fade (the base duration and the standard easing of the motion tokens, no slide) when a visitor follows a link from one of them to another, in the browsers that run cross-document view transitions (Chrome and Edge 126, Safari 18.2; Firefox navigates as before). It is one `@view-transition { navigation: auto }` rule and the timing of the root pair, all inside `prefers-reduced-motion: no-preference`, so under reduced motion no transition starts. No JavaScript, no setting, no control.
