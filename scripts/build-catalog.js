/**
 * LUZ Catalog — Dist builder
 * Regenerates packages/catalog/dist from packages/catalog/src through the shared
 * builder (scripts/build-package.js): catalog.css and catalog.min.css in the
 * luz.catalog layer, one stylesheet per component in dist/components/, and
 * print.css; catalog.js, the entry (the presence loader), and its three lazy
 * chunks, search.js (<luz-search>), consent.js (<luz-consent>) and mode.js
 * (<luz-mode>), each copied and bundled alone (catalog.min.js loads
 * ./search.min.js, ./consent.min.js and ./mode.min.js, SEC-CHUNK-1/2).
 *
 * Usage: node scripts/build-catalog.js (from the repo root)
 */

import { buildPackage } from "./build-package.js";

await buildPackage({ name: "catalog", js: ["catalog.js"], chunks: ["search.js", "consent.js", "mode.js"] });
