# LUZ Design System — agent context

**See [PRINCIPLES.md](./PRINCIPLES.md) for the principles and red lines every change must respect, [DESIGN.md](./DESIGN.md) for the design rules of how the published system looks, [VANILLA-FIRST.md](./dev/VANILLA-FIRST.md) for architectural principles, [STRUCTURE.md](./dev/STRUCTURE.md) for directory layout, and [QUICK-REFERENCE.md](./dev/QUICK-REFERENCE.md) for naming, tokens, and commands.**

---

## Critical Implementation Rules

### 1. `dist/` is generated, never edited directly

See [DIST-RULES.md](./dev/DIST-RULES.md) for full regeneration steps.

### 2. `docs/` is the generated GitHub Pages site

`docs/` at the repo root is the output of `pnpm pages:build` (Vite, `--mode pages`, relative URLs). It is git-ignored, like `dist/`: `.github/workflows/pages.yml` builds it from the sources on every push to `main` and deploys it to GitHub Pages (Settings > Pages > Source is "GitHub Actions"), and the CI of a pull request builds it too, so a broken page or link fails there. Never edit it by hand: change `apps/` or `packages/`, and run `pnpm pages:build` to look at the result; there is nothing to commit.

### 3. Everything published or served is MIT, and only MIT

Every file a package ships and every file the Pages site serves (code, fonts, icons, images, audio, examples) has the repository's licence (MIT) as its only licence (PRINCIPLES.md red line 13). Dual-licensed work is not accepted, even when MIT is one of the options, and neither is OFL or Creative Commons. Third-party MIT work keeps its notice next to it; a font's is `LICENSE-<Font>.txt` (`pnpm check:pack` enforces it). Sans and mono use the system stacks; prefer them to bundling a face.

### 4. Three levels of rules

PRINCIPLES.md has red lines (`RL-n`, absolute, never excepted) and strong rules (`SR-n`). A strong rule may be broken only with a `luz-exception: EX-nnn` comment next to the code and a row in [EXCEPTIONS.md](./EXCEPTIONS.md); `pnpm check:exceptions` keeps them in step. [DESIGN.md](./DESIGN.md) has the design rules (`DR-n`) of how tokens, core and catalog look; a design rule is broken only with the reason written next to it in DESIGN.md, never with a `luz-exception` comment or a row in EXCEPTIONS.md, and `ux-designer` runs their "Look at" lines at the end of a visual batch. Size ceilings in `budgets.json` are a red line: never raise one.

### 5. Tests first

Every change to `packages/`, `apps/` or `scripts/` is committed as a test that fails without it (PRINCIPLES.md SR-9): commit it red (`test: …`), then the change that makes it green. Explore first: prototype in the working tree without a test, and write the test once the shape is settled, before the first commit. Prove it red on the base (a worktree, never `git stash`) and green with the change, then make the two commits. A bug fix is committed with the test that reproduces it. The "Test first" step of each recipe below is the first commit, not the first thing you type. See [TESTING.md](./dev/TESTING.md).

### 6. Browsers

Test runs use `--project=chromium --project=chromium-nojs`. The `firefox` and `webkit` Playwright projects, and the Safari and Firefox reviews, are run by the maintainer before a release; the record is [BROWSER-REVIEWS.md](./dev/BROWSER-REVIEWS.md).

### 7. A pull request has its verdict in 30 minutes

From the last push of a pull request to `main`, every required check is green or red within 30 minutes (PRINCIPLES.md SR-10): the whole Playwright suite runs in shards (`ui-tests.yml`), every job has a `timeout-minutes` of 25 at most, and a red check is never merged. When the summary warns that the slowest shard passed 20 minutes, add shards; never drop a check or skip a test to fit. Merging needs only green CI: the security audit and the Safari and Firefox reviews are made before a release to npm. See [TESTING.md](./dev/TESTING.md).

---

## JS in `packages/core/src/`

Vanilla JS, ES modules; JavaScript only enhances what the browser already does. One module per concern, all re-exported (and auto-initialized) by the `luz.js` entry; importing a single module has no side effects until you call its `init*()`. The modules, their exports and the published subpaths (`@luz-ds/core/theme`, `/sidebar`, `/tabs`, `/i18n/<code>`, …) are in [dev/CORE-JS.md](./dev/CORE-JS.md): read it before touching `packages/core/src/*.js`.

---

## Vite config and the docs site generator

The docs and the Pages site are generated from `apps/docs/pages/` by `scripts/docs-site/` (no route is listed by hand), and a page is a fragment with front matter in a leading `<!-- luz:page -->` comment. Links between pages are root-absolute with a trailing slash; the build fails on a broken one. The generator, the layouts and partials (`apps/site/_partials`, `apps/docs/_partials`; the shared header is `apps/site/header.js`), search, the files for AI agents (`llms.txt`, `scripts/docs-site/ai.js`), the languages of the home page and of the docs, the colour mode and the docs app are in [dev/DOCS-SITE.md](./dev/DOCS-SITE.md): read it before touching `scripts/docs-site/`, `apps/` or a docs page.

### Prompts for AI

The five prompts (`/prompts/start.txt`, `landing.txt`, `blog.txt`, `app.txt`, `docs.txt`) are assembled by `scripts/docs-site/prompts.js` from one body and a preset per kind of site in `apps/site/prompts/` (`body.md`, `presets/<kind>.md`, `stacks.json`), are listed in `llms.txt`, and are written in English. A version, a class, an element or an install line in a prompt is never typed: `{{placeholders}}` take them from the packages, and a placeholder the generator does not know fails the build with its `file:line`. Every link of a prompt is the published site's or a file of `@luz-ds` on the CDN. `pnpm check:prompts` (CI and qa-release) fails on hidden or bidi characters, a URL that is neither the site's nor a file of `@luz-ds` on the CDN, the syntax of a provider, a class or element no manifest has, and a prompt over its ceiling (`budgets.json`, 16 KB each). A prompt is text addressed to an LLM, so every change to `apps/site/prompts/` also needs the SAFE verdict of `prompt-injection-auditor` on the diff, written in the pull request, before it is merged. Each prompt has a SAFE case in `.claude/evals/prompt-injection/cases.json` whose `source` is the SHA-256 of all its prose (its body, preset, `stacks.json`, `scripts/docs-site/prompts.js` and the descriptions of the elements it lists, from the packages' `custom-elements.json`); `check:prompts` fails when any of them changes, so a change to an element's description also needs the sentinel, and only after the sentinel's SAFE is the new `source` written there.

---

## Package layering

`tokens` is standalone; `core` requires `tokens`; `catalog` requires `core` and `tokens`; `landing`, `cms`, `app` and `docs` each require `core` and `tokens`, take `catalog` as an optional peer, and never name each other. The rule between core and catalog: catalog is what can go in any section. A piece goes in `catalog` when it works anywhere on a page of any kind of site and acts for the site as a whole: it searches the site, asks the site's cookie question, switches the site's language, groups the site's links, or tells every visitor one thing. Each is a self-contained `<luz-*>` element in light DOM: its tag is the block and its parts are `.luz-<tag>__<part>`. It is defined by a lazy chunk when it needs a script (search, consent), and it is a CSS-only tag when it does not (lang-switch, submenu, banner). Everything that knows nothing about the site is `core`, including the layout every page needs (`o-page`, `o-sticky`, the skip link, the band, the image frame, the navbar). Page structure (header, footer, hero, the rhythm of a page) is never `catalog`: it belongs to the package for that kind of site, composed in the markup from core's objects (`o-container`, `o-row`, `o-stack`, `o-grid`), with only its own skin and rhythm in CSS. The rule between catalog and a package for one kind of site: a piece that only that kind of site uses (the hero of a landing page, the article header of a blog) goes in that package; a piece with no CSS of its own is a template on its docs page, not a pattern (the post card is core's card: a template); a piece that knows nothing about the site, even if only that package needs it now, is proposed for core instead. The contract is expressed as `peerDependencies` with literal ranges (never `workspace:`): required, except catalog for a package for one kind of site, which is optional (`peerDependenciesMeta`), so its CSS works with tokens and core alone. Each of catalog, landing, cms and app exports `./components/*` (one stylesheet per `src/components/<name>.css` not starting with `_`), as core does.

- Tools: `@luz-ds/check` (`packages/check/`, the `luz-check` command) is published and has no CSS, no layer and no peers: it reads the HTML and CSS of a project, offline, from one bundle, `scripts/build-check.js`, with the facts of the other packages (`classes.json`, `custom-elements.json`, the colour tokens) as data beside it for a project with no `node_modules/@luz-ds`. `TOOLS` in `scripts/luz-packages.js` lists the tools and `PUBLISHED` is `PACKAGES` then `TOOLS`: `check-pack`, `publish` and `smoke-consumer` read `PUBLISHED`; the docs tests and the CSS probes read `PACKAGES`. It has its own version, out of `fixed`. Its rules, their wording and their docs URLs are in `packages/check/src/messages.js`; the page that lists them is `get-started/ai.html`.
- Versions: `tokens`, `core` and `catalog` share one version (changesets `fixed`). A package for one kind of site has its own, starting at 0.x, out of `fixed`, with literal peer ranges on the major the base ships as (`^0.1.0 || ^0.2.0` while the base moves from 0.1 to 0.2: a range that does not hold the next version makes changesets take every dependent to 1.0.0), never on the version the workspace is at before a release. `landing` exists (CSS only, layer `luz.landing`, classes `.luz-landing-*`, docs area `/docs/landing/`) and so do `cms` (any CMS, any stack; CSS only, layer `luz.cms`, classes `.luz-cms-*`, docs area `/docs/cms/`), `app` (CSS only, layer `luz.app`, classes `.luz-app-*`, docs area `/docs/app/`) and `docs` (`@luz-ds/docs`, a documentation site; CSS only, layer `luz.docs`, classes `.luz-docs-*`, docs area `/docs/documentation/`, the one area not named as its package: `/docs/docs/` would read as a typo).
- One list of the published packages, in dependency order, is in `scripts/luz-packages.js` (`check-pack`, `publish`, `smoke-consumer` read it). `catalog` and every package for one kind of site build through `scripts/build-package.js`. Adding one (as `landing`, then `cms`, did):
  - **Package:** `packages/<name>/` with `package.json` (version `0.0.0`, `exports` `./css`, `./css/min` and `./components/*`, `files`, `sideEffects`, literal peers `^0.1.0` on tokens and core, and on catalog with `peerDependenciesMeta` optional, `workspace:*` dev dependencies), `README.md`, `LICENSE`, `pack-files.txt`, `src/index.css` and `src/components/*.css`; then `pnpm install`.
  - **Build:** `scripts/build-<name>.js` (three lines), its root `<name>:build` script chained in `build`, `SITE_KINDS` in `scripts/luz-packages.js` (check-pack, publish, smoke-consumer and the docs tests read it), the sentinel in `scripts/check-dist.js`, the regex of `scripts/qa-release.js`, the probe and the `<link>` in `scripts/smoke-consumer.js`.
  - **Layer:** `LAYERS` in `scripts/luz-layers.js` (say why it goes where it goes), then the same statement in `packages/core/src/index.css` and `tests/fixtures/theme-brand.css`, the file in `tests/layers.test.js`, and the list in VERSIONING.md, `packages/core/README.md`, this file and `get-started/layers.html`. Tokens and core get a minor changeset: their dist repeats the statement.
  - **Rules and budget:** the stylelint glob of the RL-10 override, a row in `budgets.json` and the PRINCIPLES.md §8 table (a new row, never a raised ceiling).
  - **Docs:** its area in `apps/docs/site.json`, its kind in `AREA_KIND` of `scripts/docs-site/site.js`, its blocks in `PACKAGES` of `tests/site-docs.spec.js`, the area list in `tests/docs.spec.js` (sidebar test), the count of pattern pages in `tests/docs-design.test.js` and `tests/docs-site.test.js`; its `<link>` in `apps/docs/_layouts/page.html` and its dependency in `apps/docs/package.json` (and in `apps/landing/package.json` only if the home page uses it); `pages/<name>/index.html` (gallery), a page per pattern, `pages/<name>/templates.html`, the "Packages for one kind of site" section of `get-started/index.html`, `get-started/structure.html`, the accessibility statement for any known issue, and the home page's `adopt.next.<name>` in the three catalogs.
  - **Repo:** README.md, PRINCIPLES.md (intro), `.github/CODEOWNERS`, the two issue templates, and STRUCTURE, QUICK-REFERENCE and DIST-RULES in `dev/`; a minor changeset for the package (out of `fixed`, so it releases as 0.1.0).
- The look: the default values of `semantic.css` are Vejer (warm surfaces, ET Book running text, sky-blue actions, soft radii), in the three modes. LUZ ships no theme; `packages/core/src/themes/_template.css` is the starting point of a consumer's own, and `tests/theme-template.test.js` keeps it in step with `semantic.css`.
- Cascade layers: every published stylesheet is in a layer of the container `luz` (`luz.tokens`, `luz.themes`, `luz.settings`, `luz.generic`, `luz.elements`, `luz.objects`, `luz.components`, `luz.utilities`, `luz.catalog`, `luz.landing`, `luz.cms`, `luz.app`, `luz.docs`, `luz.print`), declared by `scripts/luz-layers.js`, which every build script uses. The names are public API; a new layer or a new file goes through `LAYERS` there, and `tests/layers.test.js` fails on a top-level layer name or an unlayered rule in `dist/`.
- Classless: `packages/core/src/classless/_classless.css` is a file of its own (`dist/classless.css`, exported `@luz-ds/core/classless.css`), not in `luz.css`. It styles a bare button, text field, select and table inside `[data-luz-classless]`, in `luz.elements`, every selector inside `:where()` and `:not([class*="luz-"])`. It copies the components' declarations by hand; `tests/classless.spec.js` compares each element with its component.
- Catalog JS: `catalog.js` is the entry, the presence loader: it warns without core, scans the page once and loads a lazy chunk per element on it, `search.js` (`<luz-search>`, on the first pointerdown or focus inside it, Ctrl+K or idle; it holds the fallback link, the trigger and the dialog, exported as `@luz-ds/catalog/search`) and `consent.js` (`<luz-consent>`, the cookie banner, and `getConsent()`, on idle; exported as `@luz-ds/catalog/consent`). Before the search chunk, `catalog.js` takes Ctrl+K itself, loads the chunk and opens the dialog. Each chunk guards `customElements.get()`, imports nothing and has its own budget row (`catalog JS lazy chunk: search`, `… consent`); `buildPackage({ chunks })` keeps `import("./search.js")` an import of `./search.min.js` in `catalog.min.js`, and `pnpm check:size` fails on a static import in the loader, a dynamic import other than its two chunks, a non-literal `import()` or a chunk that imports anything (SEC-CHUNK-1/2). An element added after the scan needs its chunk imported by hand. HTML sinks (`innerHTML`, `insertAdjacentHTML`, `eval`, …) are an ESLint error in `packages/catalog/src` and `apps/` (security.md SEC-IDX-2).
- The site's colour mode: the footer of the home page and of the docs is `<luz-mode remember by="clock">` around core's switcher, with an Auto radio first (the choice is stored under core's `luz-theme` key; Auto is its absence). `apps/site/boot.js` (EX-009) sets `data-theme` and `data-light` (the phase of the local hour) before the first paint, and `apps/site/theme-light.css` (unlayered, linked by the page layout and the home page, never by the 404) gives four of the six lights their colours: morning and sunset over light, dawn and dusk over dark; afternoon and night are Vejer, high contrast is never overridden. `scripts/check-contrast.js` measures each light over its base mode. `apps/docs/reference.js` gives every `[data-docs-specimen]` and `.docs-dodont__stage` the `data-theme` of `<html>`, so specimens show Vejer whatever the light. No app names another: `apps/site` names neither `apps/docs` nor `apps/landing`, and those two never name each other (`tests/apps-boundaries.test.js`).
- The docs app (`apps/docs`, the private `@luz-ds/docs-site`) is a consumer of `@luz-ds/docs`: the page head, "On this page", Previous / Next and Do and don't are the package's `.luz-docs-*` classes, written by the generator and the pages; `apps/docs/reference.css` keeps only what teaches LUZ (galleries, swatches, scales, specimens, the Code / Design tabs, the helpers that hold a component still in a Do and don't stage, `.docs-stage__*`).
- Nothing in `packages/*/src` may reference docs-app hooks (`.docs-*`, `#demo-form`, …). Docs-only behavior lives in `apps/docs/reference.js` (and the modules it imports, such as `apps/docs/view.js`, the remembered Code / Design tab, and `apps/site/header.js`, the header shared with the home page, which both import with `apps/site/header.css`); the image placeholders are docs-only assets in `apps/docs/assets/placeholders/` (MIT `LICENSE` next to them, rendered by `pnpm placeholders:build`), and no package ships or points at them; the docs site generator in `scripts/docs-site/` is development tooling and never ships.
- `pnpm check:pack` verifies what each tarball ships against `packages/<name>/pack-files.txt`; after intentionally adding or removing a published file run `node scripts/check-pack.js --update`.
- Releases: add a changeset (`pnpm changeset`); never run `npm publish` by hand.

---

## Common workflows

### Adding a new component

1. **Check first:** is there a native HTML element or browser API that solves this? (`dialog`, `details`, `popover`, `<input type="...">`, CSS `:has()`, etc.). If so, use it as the base.
2. **Test first:** write `tests/<name>.spec.js` (what it renders, the keyboard, the no-JS state, axe) and, for logic or values, `tests/<name>.test.js`, from a fixture in `tests/fixtures/` or the docs page's demo. Run it, see it fail for the missing behaviour, and commit it (`test: …`).
3. Create `packages/core/src/components/<name>.css` (use the standard header of the sibling files) and add its `@import` to `packages/core/src/components/index.css` in cascade order
4. Run `pnpm core:build` — regenerates `dist/luz.css` AND `dist/components/<name>.css` (see [DIST-RULES.md](./dev/DIST-RULES.md)), then `node scripts/check-pack.js --update`
5. Give it a page: `apps/docs/pages/components/<slug>.html` with front matter (`title`, a one-line `description` — the summary under the h1 —, `area: components`, `group` of the gallery, `files: components/<name>.css`, `module` if it has JS, `toc: h2,h3`), then a `<div class="docs-component" id="c-<name>">` holding, in this order (PRINCIPLES.md red line 18 and SR-5; `.claude/plans/docs-redesign/ia.md` §6):
   - `<h2 id="example">Example</h2>` and the live demo in `<div class="docs-example" data-docs-specimen>`;
   - `<h2 id="known-issues">Known issues</h2>`, always, with "None known." when empty;
   - the tab row `<nav class="luz-tabs docs-view-tabs" aria-label="<Title> documentation">` with `<a class="luz-tab" href="#code-panel" data-docs-view="code">Code</a>` then the same for `design`;
   - `<div class="luz-tabpanel docs-view" id="code-panel">`: `<h2 class="docs-view__title" id="code">Code</h2>`, then the `h3` sections `#markup` Copy the markup, `#variants` Variants and options, `#how` How it works, `#no-js` Without JavaScript, `#keyboard` Keyboard and ARIA, and last `<p class="docs-view__xref">` linking to `#contrast`;
   - `<div class="luz-tabpanel docs-view" id="design-panel">`: `<h2 class="docs-view__title" id="design">Design</h2>`, then `#when` When to use, `#when-not` When not to use, `#do-dont` Do and don't, `#content` Writing the content, `#contrast` Contrast and focus, `#tokens` Tokens it uses, and last a `docs-view__xref` line linking to `#keyboard`.

   Copy `components/button.html` as a model. Write *Copy the markup* with the `docs-snippet` block (a label bar, a copy button with `data-copy-from` pointing at the `<code>` id, then the `pre.luz-code-block`) and *Variants and options* as a `luz-table`. *Do and don't* is a `div.docs-dodont` with two `figure`s, `docs-dodont__item--do` then `--dont`, each starting with `<figcaption><strong class="docs-dodont__verdict">Do</strong>` (or `Don't`) and a reason; the example is real LUZ markup in `<div class="docs-dodont__stage" inert aria-hidden="true">` (no `id` it does not need), or a `pre.luz-code-block` when the mistake would itself be a barrier (a11y.md TAB-20): never a live contrast or semantics failure. *Contrast and focus* is a `luz-table.docs-contrast` (Part, colour on background as `<code>--luz-…</code> on <code>--luz-…</code>` with ` over ` for a translucent layer, Light, Dark, High contrast, Needs) and a list that starts with `<strong>Focus:</strong>`; *Tokens it uses* is a `dl.docs-uses` of the tokens the component's CSS reads, grouped under links to their token pages. Never type a ratio, a value or a token list: compute them with `tests/helpers/design-tokens.js` (`contrast`, `formatRatio`, `tokensUsedBy`, `familyOf`); `tests/docs-design.test.js` recomputes every one and fails on drift. Without JavaScript both panels show, stacked, under their visible `h2`; with it, core `tabs.js` shows one and `apps/docs/view.js` remembers the reader's last tab. The sidebar, the gallery, "On this page", Previous / Next and the A–Z index pick the page up. `tests/docs-site.test.js` checks the structure of every component and pattern page, and `tests/docs.spec.js` finds the new page from the CSS file name. State the no-JS behavior and any known issue in the accessibility statement (`pages/accessibility.html`). A pattern page of site or of a package for one kind of site (`pages/catalog/<slug>.html`, `pages/landing/<slug>.html`, `pages/cms/<slug>.html`, `group: patterns`) has the same structure.
6. If the styles are docs-only (grids, prop tables), put them in `apps/docs/reference.css`

**Before delivering anything, read [PRINCIPLES.md](./PRINCIPLES.md): its red lines are enforced by stylelint, ESLint, `pnpm check:size`, `pnpm check:strings`, `pnpm check:exceptions` and the Playwright suites (axe, no-JS, reduced motion, forced colors).**

**Vanilla checklist before delivering any JS:**

- [ ] Zero runtime dependencies added (`package.json` unchanged)
- [ ] No `import` of external libraries in any `.js` file
- [ ] Interactivity uses native APIs wherever possible
- [ ] Component works without a bundler (plain HTML + CSS + JS)

### Adding a new semantic token

1. **Test first:** add the pair it must meet to `scripts/check-contrast.js` (or the assertion of the component that reads it) and see it fail.
2. Add it to `packages/tokens/src/semantic.css` in all three theme blocks (`:root, [data-theme="light"]`, `[data-theme="dark"]`, `[data-theme="high-contrast"]`)
3. If it references a new primitive, also add that to `tokens.json`
4. Run `pnpm tokens:build`
5. Document it on the Tokens pages of the docs site (`apps/docs/pages/tokens/`; the semantic colours are on `tokens/color.html`)

### Adding a new primitive color

1. **Test first:** the semantic token or the contrast pair that will use it (a primitive alone is never read by a component, red line 10).
2. Add it to `tokens.json` under `color.{family}.{scale}`
3. Run `pnpm tokens:build` — adds `--luz-{family}-{scale}` to Layer 1
4. Reference from semantic tokens in Layer 2 if needed in any theme

### Modifying a type or space scale

The scales are computed from three knobs in `tokens.json`: `--luz-type-base`, `--luz-type-ratio` and `--luz-space-unit`. A step carries its chain in `from` (and, for type, `fromRounded`, the `round()` form emitted inside `@supports`); `value` is the resolved default. A component reads the steps (`--luz-text-*`, `--luz-space-*`), never a knob.

1. **Test first:** the golden list in `tests/helpers/scale-golden.js` and `tests/type-space-scale.test.js`; a deliberate change to a default edits the golden and carries a changeset.
2. Edit `tokens.json` (`from`, `fromRounded`, `value` together), then run `pnpm tokens:build`.
3. Update the typed values on `tokens/typography.html`, `tokens/spacing.html` and the presets table of `get-started/make-it-yours.html`: `tests/docs-tokens-scale.test.js` and `tests/make-it-yours.test.js` recompute them with `evalLength` and fail on drift.

### Modifying a breakpoint or motion token

**Test first:** the spec of what the change must do (a layout at the new width, a duration under reduced motion). Then edit the `breakpoint`, `duration` or `easing` group of `packages/tokens/tokens.json` (the reduced-motion block is written from `duration`), run `pnpm tokens:build`, and update `tokens/layout.html` or `tokens/motion.html`.

### Adding a style for a bare HTML element

1. **Test first:** update the element's `styledBy` in `tests/fixtures/html-elements.json` and run `pnpm test:ui`: it fails until the rule exists.
2. Put the rule in the file of its MDN category under `packages/core/src/elements/` (`document`, `sections`, `text`, `inline`, `media`, `forms`, `interactive`).
3. Wrap the whole selector in `:where()` (specificity 0), so any `.luz-*` class or the consumer's own rule wins. A pseudo-element goes outside: `:where(dialog)::backdrop`. There is no exception (red line 11): stylelint's `luz/no-bare-element` rule fails on any bare type selector in `packages/`.
4. Elements that already have a component (`table`, `input`, `select`, `button`) are styled through its class, not here.
5. Update the element's card on the page of its category, `apps/docs/pages/html/<category>.html` (the A–Z table is on `html/index.html`), then run `pnpm core:build` and `pnpm test:ui`.

### Adding a language to the home page

The home page's text is not in `apps/landing/index.html`: the template says `{{t:key}}` (escaped text) or `{{html:key}}` (trusted inline HTML: only `<a href>`, `<code>`, `<span>`, `<strong>`, `<em>`, with `class`, `href`, `lang`, `data-count`), and the strings live in one flat catalog per language, `apps/landing/i18n/<code>.json`. The shared partials it includes (`header`, `site-links`) use the same keys; the docs render them with the catalog of their language (the home's, plus `apps/docs/i18n/<code>/strings.json`). `{{lang}}`, `{{dir}}`, `{{home}}`, `{{alternates}}`, `{{langswitch}}` (the header's switch) and `{{langlinks}}` (the footer's list of the languages) are written by the generator (`scripts/docs-site/i18n.js`), and `{{version}}` is the version of `packages/core/package.json` (the CDN snippet and the footer): never type a version.

A count in the copy is never typed either: a catalog value says `{n:components}`, `{n:objects}`, `{n:primitives}` or `{n:semantic}` ("{n:components} components"), and the build writes the number from the packages (`siteNumbers()` in `scripts/docs-site/i18n.js`: the stylesheets of `packages/core/src/components`, the `.o-*` blocks of `objects/_objects.css`, the colour steps of `tokens.json`, the tokens of the light block of `semantic.css`). Keep the same `{n:…}` in every language, written in its place in the sentence; an unknown name fails the build with the catalog's `file:line`. `{n}`, `{mode}` and the other single-word placeholders are the scripts' own and are left as written.

The build is the test here: it fails on a missing or extra key.

1. Add a row to `apps/landing/i18n/locales.json`: `{ "code": "fr", "name": "Français", "dir": "ltr", "route": "/fr/" }` (the name in that language; `route` is `/<code>/`; the first row is the default, at `/`).
2. Copy `en.json` to `fr.json` and translate every value. Keep `{n}`, `{mode}`, `{n:components}`… as they are, and the markup of the HTML keys.
3. Run `pnpm test:unit` and `pnpm check:strings`, then `pnpm pages:build`. Nothing else: the route, the build entry, the switcher, the alternates and the link check follow the registry.

The build fails with `file:line` on a key a template uses that a catalog lacks, on a catalog that misses a key of `en.json` or has one it does not, and on a key no template uses. Links from the home into the docs go to the docs of their language (`/es/docs/`) once `apps/docs/i18n/<code>/` exists, and say `hreflang="en"` until then; the entries of a page that is not translated are English (`lang="en"` on their lists). A language core's i18n does not ship (Arabic) still gets the scripts' strings in its own language: the landing's `<body>` carries `data-luz-label-*` from the catalog. For a right-to-left language check the page at 320 px; for a script ET Book lacks, add its `lang` value to `--luz-font-heading` and `--luz-font-body` in the `role` group of `packages/tokens/tokens.json` (the build writes the `:where(:lang())` rule), as Arabic has.

### Adding a language to core's scripts

A language for the text core's scripts write (`t()`) is one JSON file, `packages/core/src/i18n/<code>.json`, never a JavaScript file: `pnpm core:build` validates it and writes `dist/i18n-<code>.js` itself, so the module a page runs is never bytes a contributor wrote. `<code>` is the primary language subtag (two or three letters). English stays in `i18n.js`; every other language is a lazy chunk that `loadLocales()` fetches for the pages that declare it.

1. Copy `packages/core/src/i18n/es.json` to `i18n/<code>.json` and translate the values. The optional `$header` object (language, `author` and `reviewer` as GitHub handles, never an e-mail) never reaches the module.
2. Add `<code>: () => import("./i18n-<code>.js")` to the literal `files` map in `packages/core/src/i18n.js`.
3. Add the row `core JS lazy chunk: i18n-<code>` to `budgets.json` and to the table of PRINCIPLES.md §8, and the file to `scripts/docs-site/snippets.js` (`FILES.core.chunks` and a `CHUNK_WHEN` line).
4. Run `pnpm core:build`, `node scripts/check-pack.js --update` and `pnpm check:size`, then `pnpm test:unit` and `pnpm check:strings`. Add a changeset (`"@luz-ds/core": minor`).
5. For a right-to-left language, put it in a page with `dir="rtl"` and check it at 320 px.

The rules of a value, which the build enforces:

- The keys are exactly those of `en`, and every value keeps the `{placeholders}` of its English key, no more and no fewer.
- A value is at most 3 x the English value + 40 characters.
- No `://`, `www.` or `@` (an address is markup, not a translation), no `<` or `&` (strings are written with `textContent`), no raw U+2028 or U+2029 and no bidi override (U+202A to U+202E).
- In a right-to-left language, `{column}`, `{mode}` and `{lang}` sit in an isolate (U+2066 to U+2068 before, U+2069 after): the isolates are the only bidi controls allowed.

Say in the pull request that a language for core does not translate `<luz-search>` or `<luz-consent>`: their text is markup and `data-luz-label-*` (EX-005). A machine translation is not accepted without a reader of the language who says so.

### Adding a language to the docs

A language has docs when its folder exists: `apps/docs/i18n/<code>/` (the opt-in). It is a language of the home's registry, so add it there first (`apps/landing/i18n/locales.json`, as in "Adding a language to the home page"). The docs then render `/<code>/docs/…` for every English page; a page with no translation is shown in English inside the translated chrome.

1. Create `apps/docs/i18n/<code>/strings.json`: one flat catalog of the chrome (the same rules as the home's catalogs: keys `[a-z0-9.-]`, the same `{placeholders}`, the plural categories of the language). The keys are those of `apps/docs/i18n/en/strings.json` (the reference) plus the ones derived from `apps/docs/site.json` (`area.<id>`, `group.<area>.<group>`, `essential.<slug>`), and none that the home's catalog of the same language already has. The build fails with `file:line` on a missing or extra key, a changed placeholder and a key no template uses.
2. Spanish gets the strings core's scripts write from core (`loadLocales()`). A language core does not ship (Arabic) gets them from a JSON the app owns, `apps/docs/locale-scripts/<code>.json`, with exactly the keys and `{placeholders}` of `en` in `packages/core/src/i18n.js`: `apps/docs/reference.js` fetches it on a page in that language and calls `registerLocale()` with it. Delete the file when core ships the language.
3. Write the glossary terms of the language in `apps/docs/i18n/glossary.json` (see `dev/TRANSLATING.md`), then translate the pages one by one ("Translating a docs page"). Nothing else changes: the routes, the switcher, the alternates, the search index and `index.md` follow the folder.
4. Run `pnpm test:unit`, `pnpm check:strings` (a file under the folder is read in its language), `pnpm check:i18n` and `pnpm pages:build`. For a right-to-left language check a long page, the A–Z index and a table page at 320 px, and that the code blocks stay left to right. Add a changeset.

### Translating a docs page

A translation is one file in `apps/docs/i18n/<code>/pages/`, under the same path as the English page in `apps/docs/pages/` (`get-started/index.html` for `get-started/index.html`). It starts with the same `<!-- luz:page … -->` comment, with these keys only: `title`, `description`, `keywords` (optional), `source`, `reviewed` and `reviewer`. Everything else (`area`, `order`, `group`, `files`, `module`, `toc`, `lead`, `generate`) comes from the English page, so the structure cannot drift. A translation with no English page (an orphan) fails the build.

- `source` is the first 12 hex of the SHA-256 of the English body, with white space collapsed to single spaces and trimmed (`sourceHash()` in `scripts/docs-site/docs-i18n.js`; `pnpm check:i18n` prints the right one).
- What stays English: the text of every `<pre>` and `<code>` (and `<kbd>`, `<samp>`, `<var>`), byte for byte; the ids, the heading levels, the link targets, the classes and attributes (the text of `alt`, `title`, `aria-label` and the `data-label`-like attributes aside). Every figure of the English page must appear in the translation, in any order, with the language's separators. The parity test (`tests/docs-i18n-pages.test.js`) fails at the commit on any of them, with `file:line`. Demos stay English in a translation: the generator marks them `lang="en"` (and `dir="ltr"` in a right-to-left page), and `pnpm check:strings` does not read the strings inside them.
- The machine-translation rule for the docs: an agent's translation is published with `reviewed: false` and its notice ("This translation is pending review", in the page's language). The flag changes only when a named person has read the page: `reviewed: true` with `reviewer: <GitHub handle>`, committed as `docs(<code>): review <page>`. A `reviewer` without `reviewed: true`, or `reviewed: true` without a `reviewer`, is an error. The rule for core's own language files (above) is not changed.
- An edit of the English page makes `source` stale. `pnpm check:i18n` lists every stale page (and every unreviewed, orphan or invalid one) and exits 0; `pnpm check:i18n --strict` exits 1 on a stale or orphan page, and `scripts/qa-release.js` runs it, so a stale translation blocks a release, not a commit. Translate the change, then set the new `source`.
- The register, the glossary and the owner's review checklist are in `dev/TRANSLATING.md`.

---

## Not yet implemented (P2 backlog)

- `light-dark()` in `packages/tokens/src/semantic.css`: not before 2026-11-13, when it is expected to be Baseline Widely available (Newly since 2024-05-13). High contrast stays a block of its own, and `parseSemantic`, `check-contrast` and the consumer check must read it first. Decide the default (light, or the OS) before folding the blocks.
