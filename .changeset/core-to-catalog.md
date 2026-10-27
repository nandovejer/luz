---
"@luz-ds/tokens": minor
"@luz-ds/core": minor
"@luz-ds/catalog": minor
"@luz-ds/check": minor
---

The navbar, the sidebar (with its brand and `.luz-nav-toggle`), the terminal and the timeline (`<luz-timeline>`) move from `@luz-ds/core` to `@luz-ds/catalog`. **Breaking** for whoever imports their scripts or loads core's `luz.css` and expects them in it. The classes, the markup, the attributes and the look are the same. Catalog is now the navigation of the site and the pieces with JS or an identity of their own; core is everything else, and it names nothing of catalog.

What changes, route by route:

- `@luz-ds/core/sidebar` becomes `@luz-ds/catalog/sidebar`, and `@luz-ds/core/timeline` becomes `@luz-ds/catalog/timeline`. Core no longer exports `./sidebar` or `./timeline`, and `initSidebar` is no longer exported by `luz.js`. There are no shims: core cannot name catalog.
- `components/navbar.css`, `components/sidebar.css`, `components/terminal.css` and `components/timeline.css` change package. Replace `@luz-ds/core/components/<name>.css` with `@luz-ds/catalog/components/<name>.css` (and `dist/components/<name>.min.css` on a CDN), after core.
- `luz.css` (and `luz.min.css`) no longer include the four. Link `@luz-ds/catalog/components/<name>.css` for each one the page uses. Core’s CSS is smaller.
- Their print rules go with them: the sidebar's and the timeline's are in their own files, in `luz.print`, so `@luz-ds/core/print.css` and the `print.css` inside `luz.css` no longer hide the sidebar or print the timeline as a list. Linking the file brings them.
- The four are now in the layer `luz.catalog`, which comes after `luz.utilities`. A `.u-*` utility no longer wins over them by order: use a rule of your own, outside any layer. Their adjustments over core's classes (the terminal over `.luz-tab`, `.luz-code-block` and `.luz-copy-btn`, the sidebar over `.luz-btn--ghost`) now win by layer. The sidebar's place in an `.o-shell` still loses to the sidebar's own rules, now by specificity.
- `catalog.js` loads `timeline.js` on a page with a `<luz-timeline>` and `sidebar.js` on a page with a `.luz-sidebar`, when the page is scanned. A page that loads only core has no scroll spy: the active link does not follow the scroll and the drawer does not close after a link is followed. The sidebar drawer is a native popover and works without any script.
- The timeline carries its own English and Spanish strings, `data-luz-label-*` and `lang`, as the search and the cookie banner do. `registerLocale()` no longer reaches it. To give it a language you registered, call `initTimeline(document, t)` with core's `t`.
- `@luz-ds/core/custom-elements.json` is gone: core defines no tag. `<luz-timeline>` is in `@luz-ds/catalog/custom-elements.json`, and the four stylesheets' classes are in `@luz-ds/catalog/classes.json`.
- The docs pages move with them: `/docs/components/{navbar,sidebar,terminal,timeline}/` become `/docs/catalog/{navbar,sidebar,terminal,timeline}/`. There are no redirects.
- `@luz-ds/check` knows the new package: a page that uses `.luz-sidebar`, `.luz-timeline`, `.luz-navbar` or `.luz-terminal` without the catalog file gets `load/package-missing`, with the path of the file to add.
