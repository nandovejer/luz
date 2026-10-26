---
"@luz-ds/check": minor
---

The load rule knows that `@luz-ds/catalog` has no bundle. A class or an element of catalog now asks for the file of its component: `load/package-missing` says, for example, "`<luz-banner>` is in @luz-ds/catalog/components/banner.css, which this page does not load; add it after core". A link to another catalog component does not count, and a link to the `catalog.css` of an older release still counts as all of catalog. The data bundled with `luz-check` carries the file of each catalog class and element.
