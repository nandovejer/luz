# Dist Rules — CRITICAL

**`dist/` folders are generated from `src/`. Never edit them directly.**

Nothing under `dist/` is committed (it is gitignored). `pnpm dev` runs
`scripts/check-dist.js` first and rebuilds automatically if any package's
dist is missing.

## Full Build

```bash
pnpm build  # Runs tokens:build + core:build + catalog:build + luzcheck:build
```

## @luz-ds/tokens

`dist/luz-tokens.css` is composed from three tracked sources:

| Part | Source | Edit here |
| --- | --- | --- |
| `@font-face` | `packages/tokens/fonts/fonts.css` | yes |
| Layer 1 — primitives | `packages/tokens/tokens.json` | yes |
| Layer 2 — semantic themes | `packages/tokens/src/semantic.css` | yes |

```bash
pnpm tokens:build
```

- **Adding a primitive:** edit `tokens.json`, rebuild.
- **Adding a semantic token:** edit `src/semantic.css` in all three blocks
  (`:root, [data-theme="light"]`, `[data-theme="dark"]`,
  `[data-theme="high-contrast"]`), rebuild.

## @luz-ds/core

After editing any file in `packages/core/src/`:

```bash
pnpm core:build
```

This:

1. Inlines the `@import` graph of `src/index.css` → `dist/luz.css` (+ `.min`).
   The import list in `src/index.css` (and `src/components/index.css`) is the
   **single source of truth** for cascade order.
2. Emits every `src/components/*.css` as `dist/components/<name>.css`
   (+ `.min`) for standalone consumption.
3. Bundles `src/luz.js` with Rollup → `dist/luz.js` (`midi.js` stays a
   separate lazy chunk).
4. Copies the individual ESM modules (`theme.js`,
   `clipboard.js`, `modal.js`, `highlight.js`, `player.js`, `utils.js`)
   verbatim to `dist/` — the source IS the artifact (vanilla-first).
5. Copies + minifies `src/themes/*.css` → `dist/themes/`.

## @luz-ds/catalog

After editing `packages/catalog/src/`:

```bash
pnpm catalog:build
```

Catalog has no bundle (`buildPackage({ bundle: false })`): there is no
`src/index.css`, no `dist/catalog.css` and no `dist/print.css`. The shared
builder, `scripts/build-package.js`, emits every `src/components/*.css` as
`dist/components/<name>.css` (+ `.min`), its screen rules in `luz.catalog` and
its top-level `@media print` blocks, with the comment before each, in
`luz.print`; a `src/components/_*.css` fails the build. It syncs `catalog.js`,
`search.js`, `consent.js`, `mode.js`, `timeline.js` and `sidebar.js` and bundles each into a `.min.js`. The navbar, the sidebar, the terminal and the timeline are catalog components, built like the others (`src/components/<name>.css`, in `luz.catalog`), and core's `luz.css` does not include them.

The patterns of a kind of site (landing, cms, app and docs) are catalog
components, `src/components/<kind>-<name>.css`: they build like the others, in
`luz.catalog`, to `dist/components/<kind>-<name>.css` (+ `.min`), with no
JavaScript. There is no package for a kind of site, and no `landing:build`,
`cms:build`, `app:build` or `docs:build`. After adding or removing a published
file, run `node scripts/check-pack.js --update`. The apps link the files from
`/packages/catalog/dist/components/`, so rebuild catalog before you look at
them.

## @luz-ds/check

After editing `packages/check/src/`:

```bash
pnpm luzcheck:build
```

This bundles `src/main.js` and the modules it imports into one file,
`dist/luz-check.js` (the bin; Node, ESM, not minified, a shebang, no source
map), through `scripts/build-check.js`. It has no CSS and no layer. It has its
own version (0.x): after adding or removing a published file, run
`node scripts/check-pack.js --update`.

---

## Custom Fonts in Theme Files

The theme template (`themes/_template.css`)
use self-hosted fonts via `@font-face` — no Google Fonts request at runtime.
The woff2 files live in `packages/core/fonts/custom-faces/` and are copied
into `packages/core/dist/fonts/custom-faces/` by `pnpm core:build` so the
relative `../fonts/custom-faces/…` URLs resolve from `dist/themes/`.

### Why Not Google Fonts?

Vanilla-first principle: **0 external runtime dependencies**. Self-hosted fonts are:

- ✅ Offline-ready
- ✅ Zero latency (bundled with the CSS)
- ✅ No analytics tracking
- ✅ Aligned with vanilla-first architecture
