/**
 * LUZ Catalog — Dist builder
 * Regenerates packages/catalog/dist from packages/catalog/src through the shared
 * builder (scripts/build-package.js), with no bundle (plan ai-and-catalog-only,
 * decisions 59 and 62): one stylesheet per component in dist/components/
 * (+ .min.css), in the luz.catalog layer, each with its own print rules in
 * luz.print, and nothing else of CSS (no catalog.css, no print.css): a site
 * links the components it uses; catalog.js, the entry (the presence loader), theme-time-boot.js
 * (a classic script for the <head>), and its six lazy
 * chunks, search.js (<luz-search>), cookie-consent.js (<luz-cookie-consent>), theme-time.js
 * (<luz-theme-time>), theme-time-bar.js (its slider), timeline.js (<luz-timeline>) and sidebar.js (the scroll spy of
 * a .luz-sidebar), each copied and bundled alone (catalog.min.js loads
 * ./search.min.js, ./cookie-consent.min.js, ./theme-time.min.js, ./theme-time-bar.min.js, ./timeline.min.js and
 * ./sidebar.min.js, SEC-CHUNK-1/2).
 *
 * Usage: node scripts/build-catalog.js (from the repo root)
 */

import { buildPackage } from "./build-package.js";

await buildPackage({ name: "catalog", bundle: false, js: ["catalog.js", "theme-time-boot.js"], chunks: ["search.js", "cookie-consent.js", "theme-time.js", "theme-time-bar.js", "timeline.js", "sidebar.js"] });
