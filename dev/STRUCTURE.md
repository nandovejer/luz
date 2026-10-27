# LUZ Monorepo Structure

```
luz-design-system/
├── apps/                              ← internal apps (NOT publishable)
│   ├── docs/                          ← @luz-ds/docs-site (private): the documentation site, built by scripts/docs-site; consumes catalog's docs-* components
│   │   ├── site.json                  ← the areas of the docs (id, label, slug, groups)
│   │   ├── pages/                     ← one HTML fragment per page, front matter in <!-- luz:page -->; route = path
│   │   │   ├── index.html             ← /docs/ (the hub)
│   │   │   ├── a-z.html               ← /docs/a-z/ (generated index)
│   │   │   ├── accessibility.html     ← /docs/accessibility/ (the statement)
│   │   │   ├── get-started/           ← install, structure, JavaScript modules
│   │   │   ├── components/            ← gallery (index.html), one page per component, helpers; _thumbs/ = gallery thumbnails
│   │   │   ├── tokens/                ← index and one page per family
│   │   │   ├── catalog/               ← index, one page per component (the patterns of a kind of site too: <kind>-<name>), class reference
│   │   │   ├── kinds/                 ← the kinds of site: an index and one page each (landing, blog, app, docs), with their recipes
│   │   │   └── html/                  ← overview with the A–Z table, one page per element category
│   │   ├── 404.html                   ← /404.html (absolute <base>, no script)
│   │   ├── _layouts/                  ← page.html and not-found.html: head, header, sidebar, <main>, footer
│   │   ├── _partials/                 ← footer-links (the docs' own; header, site-links and footer are in apps/site/_partials)
│   │   ├── reference.css              ← docs page–only styles
│   │   ├── elements.css               ← HTML elements chapter styles
│   │   ├── reference.js               ← docs glue on every page (copy, demos, element cards, "On this page")
│   │   └── assets/                    ← demo media and images; placeholders/ (docs-only, MIT LICENSE next to them)
│   ├── site/                          ← @luz-ds/website (private): what the home page and the docs share; depends on no other app
│   │   ├── header.css, header.js      ← the header of the docs and the home page (not published)
│   │   ├── boot.js                    ← colour mode and light before the first paint (EX-009)
│   │   ├── theme-light.css            ← the four lights (morning, sunset, dawn, dusk)
│   │   ├── _partials/                 ← header, site-links, footer (the generator reads this folder and apps/docs/_partials)
│   │   └── assets/                    ← favicon set and LUZ mark
│   ├── landing/                       ← home page
│   │   ├── index.html                 ← template of the home page in every language; includes the header and site-links partials
│   │   ├── i18n/                      ← locales.json (languages and routes) + one catalog per language (en, es, ar)
│   │   ├── landing.css, landing.js    ← the home page's own; the header is ../site/header.{css,js}
├── packages/
│   ├── tokens/                        ← @luz-ds/tokens (publishable)
│   │   ├── tokens.json                ← source of truth for Layer 1 primitives
│   │   ├── src/semantic.css           ← Layer 2 semantic themes (light/dark/high-contrast)
│   │   ├── fonts/                     ← Gidole, ET Book, Monoid woff2 + fonts.css + MIT licence texts
│   │   └── dist/                      ← GENERATED (do not edit)
│   │       ├── luz-tokens.css (+ .min) ← fonts + primitives + semantic
│   │       ├── tokens.css, fonts.css  ← the same, split (bring your own fonts)
│   │       ├── tokens.json            ← primitives source, for tooling
│   │       └── fonts/                 ← woff2 files + licence texts
│   │
│   ├── core/                          ← @luz-ds/core (publishable)
│   │   ├── src/                       ← EDIT HERE
│   │   │   ├── settings/_settings.css ← core config (z-index, layout widths, field text)
│   │   │   ├── generic/_reset.css     ← reset
│   │   │   ├── elements/              ← bare HTML elements, one file per MDN category
│   │   │   │   ├── index.css          ← barrel (document, sections, text, inline, media, forms, interactive)
│   │   │   │   └── *.css              ← new rules wrapped in :where() (specificity 0)
│   │   │   ├── objects/_objects.css   ← layout abstractions (.o-)
│   │   │   ├── components/            ← ONE FILE PER COMPONENT (.luz-*)
│   │   │   │   ├── index.css          ← barrel (@import in cascade order)
│   │   │   │   ├── button.css, form.css, table.css, modal.css, player.css, …
│   │   │   │   └── _animations.css    ← shared public @keyframes
│   │   │   ├── utilities/_utilities.css   ← .u-*
│   │   │   ├── themes/                ← the theme template, _template.css
│   │   │   ├── index.css              ← entry with ITCSS imports (source of truth for layer order)
│   │   │   ├── luz.js                 ← entry: re-exports API + auto-init
│   │   │   ├── theme.js               ← theme system (applyTheme, applyMode, …)
│   │   │   ├── sidebar.js             ← sidebar nav + mobile drawer
│   │   │   ├── clipboard.js           ← copy-to-clipboard behaviors
│   │   │   ├── modal.js               ← modals + focus trap
│   │   │   ├── highlight.js           ← dependency-free syntax highlight
│   │   │   ├── player.js              ← video/audio/MIDI player UI
│   │   │   ├── tabs.js                ← tabs activation + keyboard
│   │   │   ├── midi.js                ← MIDI parser + Web Audio scheduler (lazy chunk)
│   │   │   └── utils.js               ← pure helpers (unit-tested)
│   │   ├── fonts/custom-faces/        ← theme font (Comic Shanns) + MIT licence text
│   │   └── dist/                      ← GENERATED (do not edit)
│   │       ├── luz.css (+ .min)       ← full bundle
│   │       ├── base.css (+ .min)      ← settings + reset + elements (needed by per-component files)
│   │       ├── components/*.css       ← per-component files (standalone use)
│   │       ├── luz.js                 ← bundled entry (rollup)
│   │       ├── theme.js, sidebar.js, … ← individual ESM modules
│   │       ├── midi.js                ← lazy chunk
│   │       ├── fonts/custom-faces/    ← copied for the themes
│   │       └── themes/*.css
│   │
│   ├── catalog/                   ← @luz-ds/catalog (publishable)
│   │   ├── src/                       ← EDIT HERE
│   │   │   ├── components/{search,consent,mode,lang-switch,submenu,banner}.css  ← each with its print rules; no bundle
│   │   │   ├── components/<kind>-<name>.css  ← the patterns of a kind of site (kind: landing, cms, app, docs), one file each
│   │   │   ├── catalog.js                ← the presence loader
│   │   │   └── search.js, consent.js, mode.js  ← lazy chunks
│   │   └── dist/                      ← GENERATED (do not edit)
│   │       ├── components/*.css (+ .min)  ← the only CSS: one file per component
│   │       └── catalog.js, search.js, consent.js (+ .min)
│   │
│   └── check/                     ← @luz-ds/check (publishable tool: a bin, no CSS, no layer; own version, 0.x)
│       ├── src/                       ← EDIT HERE (Node ESM: main.js is the bin's glue, cli.js is run(argv, env))
│       └── dist/                      ← GENERATED (do not edit)
│           └── luz-check.js
│
├── docs/                              ← GENERATED GitHub Pages site (pnpm pages:build), git-ignored, deployed by CI; do not edit
│
├── dev/                               ← contributor guides (this file, QUICK-REFERENCE, DIST-RULES, TESTING, VANILLA-FIRST, BROWSER-REVIEWS)
│
├── .claude/                           ← Claude Code: agents/, hooks/, settings.json and skills/ are versioned;
│                                        the maintainer's private notes (OWNER.md, CLAUDE.md, plans, reports) are not in git
│
└── scripts/
    ├── docs-site/                     ← the docs site generator (Vite plugin, dev tooling only)
    │   ├── catalog.js                    ← pure: scan pages, front matter, routes, render, link check (unit-tested)
    │   ├── html.js                    ← strict tokenizer: fails on bad nesting with file:line
    │   └── plugin.js                  ← Vite glue: build inputs, dev routes (301 without slash), relative URLs, HMR
    ├── build-tokens.js                ← fonts + primitives (tokens.json) + semantic (src/semantic.css)
    ├── build-core.js                  ← inlines src/index.css @imports + per-component dist + JS
    ├── build-package.js               ← shared builder of catalog: @import inlining, layer, min, JS bundle, assets
    ├── build-catalog.js               ← catalog: calls build-package.js (CSS, the loader and its chunks)
    ├── build-check.js                 ← check: esbuild bundle of src/main.js into dist/luz-check.js (a tool, no CSS)
    ├── luz-packages.js                ← the published packages in dependency order: PACKAGES (CSS libraries), TOOLS (check), PUBLISHED
    ├── check-dist.js                  ← predev guard (rebuilds if any dist missing)
    ├── check-pack.js                  ← tarball contract: file snapshot, licences, exports, no workspace: ranges
    └── publish.js                     ← CI-only: publishes versions missing from npm (OIDC + provenance)
```

## Dependency Chain

```
@luz-ds/tokens
    ↓
@luz-ds/core  (consumes tokens, must never import catalog)
    ↓
@luz-ds/catalog  (the components of a whole site and the patterns of a kind of site)
```

Tokens, core and catalog share one version. There are no packages for one kind of site: the patterns of a landing page, a blog, an application and a documentation site are catalog components, one file each. `@luz-ds/check` is a tool, not a layer: it sits outside the chain, has its own version and no peers, and bundles what it needs at build time.

## Key Rules

- **Never edit `dist/`** — it is generated from `src/`
- **Layer order lives in `src/index.css`** — build scripts inline its `@import` graph; there is no duplicated file list
- **What gets published** — `packages/tokens/`, `packages/core/`, `packages/catalog/`, `packages/check/` (consumers download these)
- **Where the guides live** — `dev/` holds the contributor guides. `.claude/` holds the Claude Code agents, hooks, `settings.json` and skills (all versioned) plus the maintainer's private notes (not in git)
- **What does not** — `apps/docs/`, `apps/landing/`, `apps/site/` (internal apps only)
