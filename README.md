<div align="center">

# LUZ Design System

**LUZ — Light, Usable & Zero-dependency**

A vanilla design system in plain CSS and ES modules.<br>
No framework. No build step for consumers.

[![CI](https://github.com/nandovejer/luz/actions/workflows/ci.yml/badge.svg)](https://github.com/nandovejer/luz/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
![Status: beta](https://img.shields.io/badge/status-beta-orange)
![Runtime dependencies](https://img.shields.io/badge/runtime%20dependencies-0-brightgreen)

[Install](#install-and-load) ·
[What each package needs](#what-each-package-needs) ·
[Components](#components) ·
[Accessibility](#accessibility) ·
[Documentation](https://nandovejer.github.io/luz/docs/) ·
[Work on LUZ](#work-on-luz)

</div>

---

> [!WARNING]
> **Beta.** The tokens, components and patterns work and are tested, but names, classes and behavior can still change before the stable release. Pin an exact version and read the changelog before you upgrade.

**Human-first, AI-ready.** LUZ is made for the people who use the page, and it is plain enough for an AI agent to write correctly. **Every change starts with a failing test.** [How LUZ is built](https://nandovejer.github.io/luz/docs/get-started/how-luz-is-built/) says more.

LUZ (formerly CAI) is built with plain CSS, ES modules and native browser APIs. Adopt only the tokens, add the components, or take the catalog: the three layers are independent packages that stack in one direction.

```text
@luz-ds/tokens
      │
      ▼
@luz-ds/core ─────────────► @luz-ds/catalog

A ──► B  B needs A
```

The name stands for Light, Usable & Zero-dependency: light in weight (plain CSS and ES modules, nothing to build for the people who use it), usable by everyone (native HTML, three color modes, tested for accessibility), and with zero runtime dependencies.

- [`@luz-ds/tokens`](./packages/tokens): design tokens (CSS custom properties), the three color modes and the font.
- [`@luz-ds/core`](./packages/core): the styles of bare HTML elements (text, controls and tables come out styled with no class; the tags that only structure a page have no style), the layout objects, the components and optional JavaScript.
- [`@luz-ds/catalog`](./packages/catalog): the components that act for the site as a whole (search, cookie consent, color mode, language switch, submenu, announcement) and the patterns of a kind of site: the page structure of a landing page, a blog or newspaper, a web application and a documentation site. One stylesheet per component; you link only the ones you use.
- [`@luz-ds/check`](./packages/check): a tool, not a stylesheet. The `luz-check` command reads the HTML and CSS of your project, offline, and says which LUZ classes, elements, load order and theme colors are wrong. It has its own version, 0.x, and needs no other package.

## Install and load

Each package needs the ones below it and nothing above it. Adopt one level and stop there, or keep going.

| You want | Install | Load, in order |
| --- | --- | --- |
| Tokens only | `@luz-ds/tokens` | `luz-tokens.css` |
| Tokens + components | `@luz-ds/tokens` `@luz-ds/core` | `luz-tokens.css`, `luz.css`, optionally `luz.js` |
| Tokens + components, in a region of a project that already has a design | `@luz-ds/tokens` `@luz-ds/core` | `luz-tokens.css`, `luz.conditional.css`, with `data-luz` on the region |
| Tokens + components + page patterns | `@luz-ds/tokens` `@luz-ds/core` `@luz-ds/catalog` | `luz-tokens.css`, `luz.css`, then catalog's `components/<name>.css` for each component the page uses, optionally `luz.js` and `catalog.js` |

The HTML you write comes out styled with no class, and a class adds what HTML cannot say (a link that looks like a button, a role, a size, a component with its own markup). To add LUZ to a project that already has a design, load `luz.conditional.css` instead of `luz.css`, mark a region with `data-luz`, and migrate page by page: [Migrate a project to LUZ](https://nandovejer.github.io/luz/docs/get-started/migrate/).

`@luz-ds/core` declares `@luz-ds/tokens` as a required peer dependency; `@luz-ds/catalog` declares both. npm and pnpm install required peers automatically; Yarn only warns, so list every package explicitly.

```bash
npm install @luz-ds/tokens                                   # level 1
npm install @luz-ds/tokens @luz-ds/core                      # level 2
npm install @luz-ds/tokens @luz-ds/core @luz-ds/catalog         # level 3, the Catalog
```

### With a bundler

```js
import "@luz-ds/tokens/css";
import "@luz-ds/core/css";
import "@luz-ds/catalog/components/search.css"; // level 3 only: one per catalog component the page uses
import "@luz-ds/catalog/components/hero.css"; // a pattern of a kind of site is a component too

import "@luz-ds/core";         // optional: the JavaScript, starts every behavior
import "@luz-ds/catalog";     // level 3, only if you use the search
```

`@luz-ds/core` and `@luz-ds/catalog` without `/css` are the scripts, not the stylesheets.

### From a CDN

Drop the lines for the levels you do not use:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/tokens@0.2.1/dist/luz-tokens.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.2.1/dist/luz.min.css">
<!-- Level 3: one link per catalog component the page uses, here the search -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.2.1/dist/components/search.min.css">
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.2.1/dist/luz.min.js"></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.2.1/dist/catalog.min.js"></script>
```

Pin an exact version and add an `integrity` hash in production; see [SECURITY.md](./SECURITY.md). A console warning tells you when a layer is loaded without the one below it.

> **Release status:** LUZ is in beta. `@luz-ds/tokens`, `core` and `check` are published at `0.1.0`, which is also what this repository says. `@luz-ds/landing`, `cms`, `app` and `docs` are not published any more: their patterns are catalog components (see [Kinds of site](#kinds-of-site)). `@luz-ds/catalog` (the package `@luz-ds/site` became) is not published yet: it comes with the next release, `0.2.0`, together with tokens and core, whose layer order now names `luz.catalog`. Until then the level 3 snippets above do not resolve.

### Kinds of site

There are no packages for one kind of site. The patterns of a landing page, a blog or newspaper, a web application and a documentation site are catalog components, one stylesheet each, `components/<block>.css` and the class `.luz-<block>`. The name says what the piece is, with no kind of site in it; its docs page says which kinds of site it fits best. Link the ones your page uses, after core, in the order below.

| Kind | Files, in this order |
| --- | --- |
| Landing page | `site-header`, `hero`, `main`, `section`, `stat`, `site-footer`, `glow` |
| Blog or newspaper, any CMS | `site-header` or `masthead`, `page-header`, `article-header`, `article`, `site-footer` |
| Web application | `app-bar`, `dashboard` |
| Documentation site | `docs-layout`, `doc-header`, `page-rail`, `example`, `do-dont`, `pager`, `page-footer` |

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.2.1/dist/components/hero.min.css">
```

### Other files you can load

| File | Package | What it is |
| --- | --- | --- |
| `base.css` + `components/<name>.css` | core | The reset and bare elements, then only the components you list, instead of `luz.css` |
| `luz.conditional.css` (`@luz-ds/core/conditional.css`) | core | `luz.css` with the reset and the bare elements only inside `[data-luz]`, to add LUZ to a project that already has a design, one region at a time |
| `print.css` | core | The print styles on their own; `luz.css` already contains them |
| `themes/_template.css` | core | The starting point of a theme of your own |
| `tokens.css`, `fonts.css` | tokens | The tokens without `@font-face`, or the `@font-face` only |
| `search.js` | catalog | The search element on its own (`@luz-ds/catalog/search`) |
| `cookie-consent.js` | catalog | The cookie banner (`@luz-ds/catalog/cookie-consent`): `catalog.js` does not include it |
| `sidebar.js`, `timeline.js` | catalog | The scroll spy of the sidebar and the timeline element (`@luz-ds/catalog/sidebar`, `@luz-ds/catalog/timeline`): `catalog.js` loads each on a page that has one |
| `components/{navbar,sidebar,terminal,timeline}.css` | catalog | The navbar, the sidebar, the terminal and the timeline: `luz.css` does not include them, so link each one you use after core |

### JavaScript modules

To load one behavior instead of the auto-initializing entry:

```js
import { initTabs } from "@luz-ds/core/tabs";
import { copyToClipboard } from "@luz-ds/core/clipboard";
```

Published modules of core: `theme`, `clipboard`, `modal`, `highlight`, `player`, `tabs`, `utils`, `i18n`, `midi`, `table-sort`. Those of catalog are `search`, `cookie-consent`, `color-mode`, `sidebar` and `timeline`. Importing one has no side effects until you call its `init*()`. Every page works without JavaScript.

## What each package needs

The page shell of a whole page is catalog; the layout objects of an app with a sidebar are core; the hero of a landing page is catalog (`hero`). The full table, checked against the CSS, is on [How LUZ is organised](https://nandovejer.github.io/luz/docs/get-started/structure/#needs).

## Color modes and themes

**Color modes** belong to the tokens layer. The base system provides `light`, `dark` and `high-contrast`, selected with `data-theme` on `<html>`, or on any element to scope a mode to it:

```html
<html data-theme="dark"></html>
```

**Themes.** LUZ ships one look, Vejer, in the three modes above. A theme of your own is a set of semantic tokens under its own `data-theme`, with `data-mode` for its light, dark and high-contrast variants. Start from `@luz-ds/core/themes/_template.css` and list the name in `<html data-luz-themes="my-brand">` so the mode switcher remembers it.

Components use semantic tokens, never the primitive scales:

```css
/* Correct */
color: var(--luz-text-primary);
background: var(--luz-brand-fill);
border-color: var(--luz-divider);

/* Incorrect: breaks theming */
color: var(--luz-gray-100);
background: #0d0e11;
```

## Components

Every component has a page in the documentation with a live example, the markup to copy, when to use it and when not to.

- **Actions and input:** buttons, copy button, dropdown, form fields (text, date and time, range, color, file, checkbox and radio groups, switches), select
- **Show content:** accordion, avatar, card, code block, figure, icon grid, table, tag and badge
- **Feedback and status:** alert, modal, progress and meter, toast, tooltip
- **Navigation:** breadcrumb, pagination, tabs, color mode switcher, and, in catalog, the navbar and the sidebar
- **Media:** video, audio and MIDI player
- **Helpers:** layout objects (`.o-*`), utility classes (`.u-*`) and keyframes

## For AI agents

LUZ is plain HTML and CSS, so an AI coding agent can write it when it knows which names exist. Give it this: read [`llms.txt`](https://nandovejer.github.io/luz/llms.txt) first, use only the classes in the `classes.json` of each package, and run `npx @luz-ds/check@0.2.1` on every HTML and CSS file it writes.

What an agent can read, what the check reports and what it does not do are on [Working with AI](https://nandovejer.github.io/luz/docs/get-started/ai/). The same page has a prompt you can paste.

## Accessibility

LUZ aims for WCAG 2.2 level AA: keyboard operation, visible focus, 4.5:1 text contrast in the three modes and a high-contrast mode are part of every component. Form controls are native HTML controls where possible.

Automated checks run on every change. No assistive technology has been used to test this release. The [accessibility statement](https://nandovejer.github.io/luz/docs/accessibility/) lists what is checked, what has not been tested and the known issues.

## Use or contribute

LUZ is open source under the MIT licence. Pick the row that fits; [CONTRIBUTING.md](./CONTRIBUTING.md) has the detail, and [VERSIONING.md](./VERSIONING.md#supported) says which browsers, Node.js versions and releases are supported.

| I want to | How |
| --- | --- |
| Use it | LUZ is MIT: no registration, no telemetry. Install the packages from npm or load them from a CDN ([Get started](https://nandovejer.github.io/luz/docs/get-started/)). |
| Copy it | Copy any markup, style or script you need, and keep the MIT notice with it. |
| Fork it | MIT lets you fork, rename and ship it. Keep the notice and say what you changed. |
| Report a bug | [Open an issue](../../issues/new/choose) with the bug or accessibility form. A security problem goes private: see [SECURITY.md](./SECURITY.md). |
| Propose a change | Start in [Discussions](../../discussions) with the proposal form: the problem, who it affects, and what the platform already does. |
| Send a pull request | Commit a failing `test:` first, then the change that makes it pass. Run `pnpm check:all`. |
| Add a language | One JSON file of strings, never JavaScript, checked by a reader of the language ([the recipe](./AGENTS.md#adding-a-language-to-cores-scripts)). |
| Review in Safari/Firefox | Pick an issue labelled `needs-browser-review`, test the files it names and write what you see. |

Everyone taking part follows the [Code of Conduct](./CODE_OF_CONDUCT.md).

## License

MIT, including the fonts. Every bundled font is under the MIT License only: ET Book, in `@luz-ds/tokens`. Its notice ships next to the font files (`LICENSE-ETBook.txt`). Controls, labels, tables and code use the system fonts, so nothing else is bundled; `@luz-ds/core` ships no fonts.

---

## Work on LUZ

Everything above is for people who install the packages. The rest is for people who change them.

### Principles

- **Vanilla first.** No runtime frameworks and no browser-side dependencies. Native browser APIs are always preferred.
- **Tokens first.** Components consume semantic tokens, not primitive color scales.
- **Source-first workflow.** Edit `src/`, then regenerate `dist/`.
- **Accessibility first.** Keyboard behavior, visible focus states and ARIA contracts are part of the component surface. The rules are in [PRINCIPLES.md](./PRINCIPLES.md).

### Workspace

See [STRUCTURE.md](./dev/STRUCTURE.md) for the full annotated directory layout. Summary:

```text
luz-design-system/
├── apps/                      # Internal apps (not publishable)
│   ├── landing/               # Home page: what LUZ is for, why, and how to adopt it
│   └── docs/                  # The documentation: install, tokens, components, catalog patterns, HTML elements
├── packages/
│   ├── tokens/                # @luz-ds/tokens
│   │   ├── tokens.json        # Source of truth for primitives
│   │   ├── src/semantic.css   # Semantic tokens (light / dark / high-contrast)
│   │   ├── fonts/             # ET Book woff2 + licence
│   │   └── dist/              # Generated: do not edit directly
│   ├── core/                  # @luz-ds/core
│   │   ├── src/               # Edit here, never dist/
│   │   │   ├── settings/  generic/  elements/  objects/  utilities/
│   │   │   ├── components/    # One file per component
│   │   │   ├── print/
│   │   │   ├── themes/        # _template.css, the starting point of a theme of your own
│   │   │   └── *.js           # One module per behavior
│   │   └── dist/              # Generated: do not edit directly
│   ├── catalog/               # @luz-ds/catalog
│   │   ├── src/
│   │   └── dist/
│   └── check/                 # @luz-ds/check (its own version, 0.x)
│       ├── src/
│       └── dist/
├── docs/                      # Generated GitHub Pages site (pnpm pages:build), git-ignored: do not edit
├── scripts/                   # Build, tarball check and publish helpers
└── tests/                     # Vitest unit tests and Playwright UI tests
```

The home page (`apps/landing/`) and the documentation (`apps/docs/`) consume the packages during development.

### Requirements

- Node.js 20+ with ES module support
- `pnpm` as the package manager (`packageManager` is pinned in `package.json`)

### Development

```bash
pnpm install
pnpm dev
```

`pnpm dev` starts Vite at `localhost:5173` (home page at `/`, documentation at `/docs/`). Its `predev` hook builds `dist/` first if any package is missing one.

| App | URL | Source |
| --- | --- | --- |
| Landing | `http://localhost:5173/` | `apps/landing/` |
| Documentation | `http://localhost:5173/docs/` | `apps/docs/` |

Edits to files under `apps/` reload on save. Edits to package sources (`packages/*/src`) need a rebuild (`pnpm build`, or `pnpm tokens:build` / `pnpm core:build` / `pnpm catalog:build`), and then a restart of `pnpm dev`: Vite does not pick up regenerated `dist/` files and keeps serving the old CSS until it restarts. To use a different port, pass it through: `pnpm dev --port 3000`.

To load the packages from this repository in a page of your own, point at `dist/`: `/packages/tokens/dist/luz-tokens.css`, `/packages/core/dist/luz.css`, `/packages/catalog/dist/components/<name>.css` (one per catalog component), and `/packages/core/dist/luz.js`.

### Commands

```bash
pnpm dev             # Vite dev server
pnpm build           # tokens:build + core:build + catalog:build + luzcheck:build
pnpm tokens:build    # Regenerate packages/tokens/dist
pnpm core:build      # Regenerate packages/core/dist
pnpm catalog:build      # Regenerate packages/catalog/dist
pnpm lint:css        # Stylelint over packages/**/*.css and apps/**/*.css
pnpm lint:js         # ESLint over the JS of packages, apps, scripts and tests
pnpm test:unit       # Vitest (run `pnpm build` first: some suites read dist/)
pnpm test:ui         # Playwright; first time: pnpm test:ui:install
pnpm pages:build     # Build the GitHub Pages site into docs/
pnpm check:pack      # What each package would publish vs. the committed snapshot
pnpm audit:prod      # Production dependency audit
pnpm changeset       # Describe a change for the next release
```

### Testing

- **Unit (Vitest):** utilities, the MIDI parser (including malformed and hostile input), and dist contract checks: every `url()` in published CSS resolves, no docs-only selectors ship, `base.css` carries the settings components need.
- **UI (Playwright):** theme and mode switching, sidebar, modal focus trap, tabs keyboard behavior, the three adoption levels loaded as a consumer would load them, and the home and documentation pages (axe, no horizontal overflow, works without JavaScript, contrast of text).
- **Tarball contract (`pnpm check:pack`):** file list per package, `LICENSE` and font licences present, no sources or dotfiles, exports targets exist, no `workspace:` ranges.

See [TESTING.md](./dev/TESTING.md) for the detailed guide. Test tooling is dev-only and does not conflict with the vanilla-first runtime principle.

### Build flow

For the complete workflow see [DIST-RULES.md](./dev/DIST-RULES.md). The short version: edit `src/`, run the package's build, never edit `dist/`. Every build starts from a clean `dist/`.

**Tokens.** `packages/tokens/dist/` is composed from tracked sources: the primitives (Layer 1), generated from `packages/tokens/tokens.json`, and the handwritten `light`, `dark` and `high-contrast` blocks of `packages/tokens/src/semantic.css` (Layer 2). Outputs: `luz-tokens.css` (fonts + tokens), `tokens.css` (no `@font-face`), `fonts.css`, `tokens.json`, the DTCG files and `fonts/`.

The colour primitives are LUZ's own palette, computed in OKLCH by `scripts/build-palette.js` (one lightness curve shared by every family, a chroma curve and a hue per family): to change a colour, edit the numbers there and run `node scripts/build-palette.js`, which rewrites the `color` block of `tokens.json`. To add another primitive, edit `tokens.json`; to add a semantic token, edit all three blocks of `semantic.css`. Then:

```bash
pnpm tokens:build
```

**Core.** All source edits belong in `packages/core/src/`. After any change:

```bash
pnpm core:build
```

This regenerates `dist/luz.css`, `dist/base.css` (settings + reset + elements, the prerequisite for per-component CSS), `dist/components/*.css`, `dist/luz.conditional.css`, `dist/print.css`, the JS modules, the lazy `midi.js` and `table-sort.js` chunks and `dist/themes/*.css`. Core settings (z-index scale, layout widths, `--luz-text-control`) ship with core; motion, breakpoints and the font roles (`--luz-font-heading`, `--luz-font-body`, `--luz-text-body`) ship with tokens.

**Catalog.** `@luz-ds/catalog` holds page patterns that are too opinionated for core. It is CSS first; `dist/catalog.js` defines the search element and warns when core is not loaded.

```bash
pnpm catalog:build
```

### GitHub Pages

The public site is the optimized build of the apps, committed in `docs/` (landing at `/`, documentation at `/docs/`). Configure Pages to deploy from the `main` branch, `/docs` folder.

```bash
pnpm pages:build   # packages + Vite build with relative URLs into docs/ (git-ignored; CI deploys it)
```

`docs/` is generated: change the sources under `apps/` and `packages/`, then rebuild. URLs are relative, so the site works under `https://<user>.github.io/<repo>/` and on a custom domain.

### Releases

Tokens, core and catalog share one version and are released together with [changesets](https://github.com/changesets/changesets). `@luz-ds/check` has its own version. To release:

1. Add a changeset to your PR: `pnpm changeset`.
2. Merging to `main` opens a "version packages" PR.
3. Merging that PR runs CI, waits for approval in the `release` environment and publishes to npm with provenance (trusted publishing, no stored token).

Nobody publishes from a local machine. See [VERSIONING.md](./VERSIONING.md#publishing), [CONTRIBUTING.md](./CONTRIBUTING.md) and [SECURITY.md](./SECURITY.md).

### Working with AI agents

[AGENTS.md](./AGENTS.md) holds the project context and rules. The specialist agents live in `.claude/agents/`:

| Agent | Role |
| --- | --- |
| `frontend-engineer` | Architecture and packaging, token and component coherence, docs and microcopy |
| `ux-designer` | UX reviews and handoff specs: tokens, states, keyboard and ARIA, Figma mapping |
| `accessibility-engineer` | WCAG 2.2 and EN 301 549 audits of components and pages |
| `test-runner` | Runs the gates and the unit and Playwright suites and reports the result |
| `security-auditor` | Supply chain, published tarballs, CI/CD hardening, code review for security |
| `safari-reviewer`, `firefox-reviewer` | Browser reviews, only with the owner's permission |
| `outside-reviewer` | An outside reviewer's report, only when the owner asks |

### Documentation index

| File | Purpose |
| --- | --- |
| **[PRINCIPLES.md](./PRINCIPLES.md)** | Red lines and strong rules every change must respect |
| **[DESIGN.md](./DESIGN.md)** | Design rules (`DR-n`) of how tokens, core and catalog look |
| **[VANILLA-FIRST.md](./dev/VANILLA-FIRST.md)** | Architectural philosophy: why vanilla, decision framework |
| **[STRUCTURE.md](./dev/STRUCTURE.md)** | Annotated monorepo directory layout |
| **[DIST-RULES.md](./dev/DIST-RULES.md)** | Build workflow: `src/` to `dist/` regeneration steps |
| **[QUICK-REFERENCE.md](./dev/QUICK-REFERENCE.md)** | Commands, naming conventions, token structure, component inventory |
| **[TESTING.md](./dev/TESTING.md)** | Test infrastructure and coverage strategy |
| **[AGENTS.md](./AGENTS.md)** | Project context and rules for AI agents |
| **[CONTRIBUTING.md](./CONTRIBUTING.md)** | How to report, propose and send a pull request |
| **[DEFINITION-OF-DONE.md](./dev/DEFINITION-OF-DONE.md)** | What a component, a token and a docs page need before they merge |
| **[CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)** | Contributor Covenant 2.1 |
| **[VERSIONING.md](./VERSIONING.md)** | What is public API, how releases are made, what is supported |
| **[SECURITY.md](./SECURITY.md)** | Reporting, supply-chain practices, CDN/SRI guidance, audit history |
| **[CHANGELOG.md](./CHANGELOG.md)** | Version history and migration notes |
