---
"@luz-ds/core": patch
"@luz-ds/catalog": patch
"@luz-ds/check": patch
---

Core's meta line has `.luz-meta--facts` for labelled facts in a hero (`dl.luz-meta.luz-meta--facts`, one `div` with a `dt` and a `dd` for each fact: the label in the secondary text colour above its value, no dots). Catalog's section has `.luz-section__more`, a link such as "See all talks" at the end of the section head, in a row with the title. The pager now fits any kind of site (`fits-kinds: any`) and its page says the labels and titles are the author's text; the post list's page has a template for search results, a `<search>` with a form over `.luz-post-list--compact`. `luz-check` knows the two new classes.
