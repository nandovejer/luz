---
"@luz-ds/catalog": patch
"@luz-ds/check": patch
---

The links of `.luz-page-rail` no longer depend on the order of catalog's sheets. They also carry `.luz-sidebar__link`, and with `sidebar.css` after `page-rail.css` (as a bundler may write them) the sidebar's light text and active fill won: the text was 1.3:1 on the page in light and in high contrast. The rail's link rules are one class deeper now, so the rail wins in any order.
