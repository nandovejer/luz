# @luz-ds/check

## 0.3.1

### Patch Changes

- 6c92889: `MidiPlayer.load(url)` no longer follows redirects: it calls `fetch(url, { redirect: "error" })`, so a MIDI address that redirects fails through the player's error path instead of loading a file from wherever it points. Host the file at the address you give: a redirect now needs its final address.

## 0.3.0

### Minor Changes

- 038c96c: New component: `<luz-faq>`, frequently asked questions, in `@luz-ds/catalog/components/faq.css`. A CSS-only tag around native `details`: every answer is in the served HTML, opens with the keyboard and works without JavaScript.

  - Parts: `__title`, `__lead`, `__nav` (links to the groups, for a long FAQ), `__group` with its `__group-title`, `__item` (the `details`), `__question` (the `summary`), `__answer` and `__more`.
  - Put the `id` on the answer, not on the `details`: a link to it, and the browser's find in page, open the closed question.
  - A plus turns into a minus when the question is open, and the open question takes the brand colour. The answers print open.

- 4d3e938: Catalog has no bundle any more: each component is a stylesheet of its own, and a page links only the ones it uses. **Breaking:** `@luz-ds/catalog/css` (`dist/catalog.css`), `@luz-ds/catalog/css/min` (`dist/catalog.min.css`) and `@luz-ds/catalog/print.css` (`dist/print.css`) are gone.

  - Each component is `@luz-ds/catalog/components/<name>.css`, and `dist/components/<name>.min.css` on a CDN. Its screen rules are in `luz.catalog`, as before, and what it does on paper is in the same file, in `luz.print`: linking a component brings its print rules.
  - Link them after core, in any order: no two of them style the same element.
  - `classes.json` says the file of each class (`files`), and `custom-elements.json` gives each element the file it needs (`stylesheet`).
  - Each docs page of a component now starts "Copy the markup" with the two lines that load its file, for a bundler and from the CDN with its hash.

  If you loaded the whole of `catalog.css`, link these six files instead, or only the ones your pages use:

  | Component                             | npm                                             | CDN                                      |
  | ------------------------------------- | ----------------------------------------------- | ---------------------------------------- |
  | `<luz-search>`                        | `@luz-ds/catalog/components/search.css`         | `dist/components/search.min.css`         |
  | `<luz-lang-switch>`                   | `@luz-ds/catalog/components/lang-switch.css`    | `dist/components/lang-switch.min.css`    |
  | `<luz-submenu>`                       | `@luz-ds/catalog/components/submenu.css`        | `dist/components/submenu.min.css`        |
  | `<luz-announcement>`                  | `@luz-ds/catalog/components/announcement.css`   | `dist/components/announcement.min.css`   |
  | `<luz-cookie-consent>`                | `@luz-ds/catalog/components/cookie-consent.css` | `dist/components/cookie-consent.min.css` |
  | `<luz-theme-time>` (was `<luz-mode>`) | `@luz-ds/catalog/components/theme-time.css`     | `dist/components/theme-time.min.css`     |

  ```html
  <link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.3.0/dist/components/search.min.css"
  />
  <link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.3.0/dist/components/theme-time.min.css"
  />
  ```

  If you loaded `print.css` beside the component files, remove it: each file has its print rules. The scripts do not change: `catalog.js` still loads the chunk of each element the page has.

  The size budget changes with it: the row `catalog CSS` (4 kB for the bundle) goes, and each component file has a ceiling of its own, 1.5 kB (PRINCIPLES.md §8).

- 79208da: Every component of `@luz-ds/catalog` is named for what it is, with no kind of site in the name: the block of a landing page is `hero`, not `landing-hero`. The classes, the elements, the files, the exports and the docs pages follow the new names. **Breaking:** if you use one of the names in the first column of the tables below, replace it. There are no aliases: the old names do nothing. `luz-check` tells you the new name when it finds an old one.

  The look and the markup of each piece are the same, with two unions, below. A part (`__x`) and a modifier (`--x`) keep their name under the new block: `.luz-landing-hero__lead` is `.luz-hero__lead`.

  **1. Classes.**

  | Old class                                | New class                                               |
  | ---------------------------------------- | ------------------------------------------------------- |
  | `.luz-landing-hero`                      | `.luz-hero`                                             |
  | `.luz-landing-section`                   | `.luz-section`                                          |
  | `.luz-landing-stat`                      | `.luz-stat`                                             |
  | `.luz-landing-glow`                      | `.luz-glow`                                             |
  | `.luz-landing-main`                      | `.luz-main`                                             |
  | `.luz-landing-header`                    | `.luz-site-header` (union)                              |
  | `.luz-cms-header`                        | `.luz-site-header.luz-site-header--publication` (union) |
  | `.luz-cms-header--masthead`              | `.luz-masthead`                                         |
  | `.luz-landing-footer`, `.luz-cms-footer` | `.luz-site-footer` (union)                              |
  | `.luz-app-header`                        | `.luz-app-bar`                                          |
  | `.luz-app-dashboard`                     | `.luz-dashboard`                                        |
  | `.luz-cms-page-header`                   | `.luz-page-header`                                      |
  | `.luz-cms-article-header`                | `.luz-article-header`                                   |
  | `.luz-cms-article`                       | `.luz-article`                                          |
  | `.luz-cms-toc`                           | `.luz-toc`                                              |
  | `.luz-docs-shell`                        | `.luz-docs-layout`                                      |
  | `.luz-docs-page-head`                    | `.luz-doc-header`                                       |
  | `.luz-docs-rail`                         | `.luz-page-rail`                                        |
  | `.luz-docs-pager`                        | `.luz-pager`                                            |
  | `.luz-docs-page-foot`                    | `.luz-page-footer`                                      |
  | `.luz-docs-example`                      | `.luz-example`                                          |
  | `.luz-docs-dodont`                       | `.luz-do-dont`                                          |
  | `.luz-consent`                           | `.luz-cookie-consent`                                   |

  `.luz-pager` is the Previous and Next links of a page of documentation; it is not core's `.luz-pagination`. `.luz-docs-main` and `.luz-docs-nav` keep their names, as parts of the docs layout.

  **2. Elements and their scripts.**

  | Old                                      | New                                                                    |
  | ---------------------------------------- | ---------------------------------------------------------------------- |
  | `<luz-mode>`                             | `<luz-theme-time>` (see `theme-mode-and-time`)                         |
  | `<luz-consent>`                          | `<luz-cookie-consent>` (`getConsent()` keeps its name)                 |
  | `<luz-banner>`                           | `<luz-announcement>` (in ARIA, "banner" is the landmark of the header) |
  | `@luz-ds/catalog/mode`                   | `@luz-ds/catalog/theme-time`                                           |
  | `@luz-ds/catalog/consent`                | `@luz-ds/catalog/cookie-consent`                                       |
  | `dist/mode.js`, `dist/mode.min.js`       | `dist/theme-time.js`, `dist/theme-time.min.js`                         |
  | `dist/consent.js`, `dist/consent.min.js` | `dist/cookie-consent.js`, `dist/cookie-consent.min.js`                 |
  | the event `luz-mode:change`              | `luz-theme-mode:change`                                                |

  `<luz-search>`, `<luz-lang-switch>`, `<luz-submenu>` and `<luz-timeline>`, and the classes `.luz-navbar`, `.luz-sidebar` (with `__brand`) and `.luz-terminal`, do not change. Nor do `getConsent()`, the `data-luz-label-*` attributes, the `luz-theme` and `luz-consent` keys of `localStorage`, the `data-luz-consent*` attributes, the custom property `--luz-consent-h` and the event `luz:consent`.

  **3. Stylesheets.**

  The file of a block is `components/<block>.css`, and `dist/components/<block>.min.css` on a CDN. Link the new file in place of the old one, after core.

  | Old file                                                                                              | New file                                                                                |
  | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
  | `landing-hero.css`, `landing-section.css`, `landing-stat.css`, `landing-glow.css`, `landing-main.css` | `hero.css`, `section.css`, `stat.css`, `glow.css`, `main.css`                           |
  | `landing-header.css`                                                                                  | `site-header.css`                                                                       |
  | `cms-header.css`                                                                                      | `site-header.css` for the bar, `masthead.css` for the masthead                          |
  | `landing-footer.css`, `cms-footer.css`                                                                | `site-footer.css`                                                                       |
  | `app-header.css`                                                                                      | `app-bar.css`                                                                           |
  | `app-dashboard.css`                                                                                   | `dashboard.css`                                                                         |
  | `cms-page-header.css`, `cms-article-header.css`, `cms-article.css`                                    | `page-header.css`, `article-header.css`, `article.css` (`.luz-toc` is in `article.css`) |
  | `docs-shell.css`, `docs-page-head.css`, `docs-rail.css`                                               | `docs-layout.css`, `doc-header.css`, `page-rail.css`                                    |
  | `docs-pager.css`, `docs-page-foot.css`                                                                | `pager.css`, `page-footer.css`                                                          |
  | `docs-example.css`, `docs-dodont.css`                                                                 | `example.css`, `do-dont.css`                                                            |
  | `consent.css`, `mode.css`, `banner.css`                                                               | `cookie-consent.css`, `theme-time.css`, `announcement.css`                              |

  **4. Custom properties.**

  | Old                                                | New                                        |
  | -------------------------------------------------- | ------------------------------------------ |
  | `--luz-landing-glow-x`, `--luz-landing-glow-start` | `--luz-glow-x`, `--luz-glow-start`         |
  | `--luz-landing-title-accent`                       | `--luz-title-accent`                       |
  | `--luz-cms-toc-top`                                | `--luz-toc-top`                            |
  | `--luz-docs-rail-top`, `--luz-docs-rail-w`         | `--luz-page-rail-top`, `--luz-page-rail-w` |
  | `--luz-docs-example-w`                             | `--luz-example-w`                          |

  **5. The two unions.**

  The bar of a landing page and the base bar of a blog were nearly the same, and the two footers were the same. Each pair is one component now.

  - `.luz-site-header` is the bar of a landing page. Add `.luz-site-header--publication` for the bar of a blog or a newspaper: it keeps the heading font, the larger size, the underline on hover and the flex layout on short screens that `.luz-cms-header` had. The parts are `.luz-site-header__brand` and `.luz-site-header__actions` in both.
  - `.luz-masthead` is what `.luz-cms-header--masthead` was: the three rows, the date, the large brand and the sections. It is not a modifier of the bar. Its parts are `.luz-masthead__top`, `__brand`, `__date`, `__sections` and `__actions`.
  - `.luz-site-footer` replaces `.luz-landing-footer` and `.luz-cms-footer`. Its parts (`__brand`, `__col`, `__col-title`) were the landing footer's and keep their names.

  **6. Docs pages.**

  The route of a page is `/docs/catalog/<block>/`. There are no redirects. `/docs/catalog/mode/` is `/docs/catalog/theme-time/`, `consent/` is `cookie-consent/`, `banner/` is `announcement/`, `landing-header/` is `site-header/`, `cms-header/` is `site-header/` (and `masthead/` for the masthead), `landing-footer/` and `cms-footer/` are `site-footer/`, `app-header/` is `app-bar/`, `app-dashboard/` is `dashboard/`, `docs-shell/` is `docs-layout/`, `docs-page-head/` is `doc-header/`, `docs-rail/` is `page-rail/`, `docs-page-foot/` is `page-footer/`, `docs-dodont/` is `do-dont/`, and `landing-hero/`, `landing-section/`, `landing-stat/`, `cms-page-header/`, `cms-article-header/`, `cms-toc/`, `docs-pager/` and `docs-example/` lose their prefix.

  **7. Check your pages.**

  Run `luz-check` on your HTML and CSS. It names the new class or element for each old one it finds, and the file to link.

- 94920c1: The patterns of a landing page, a blog, a web application and a documentation site are components of `@luz-ds/catalog` now, one stylesheet each. `@luz-ds/landing`, `@luz-ds/cms`, `@luz-ds/app` and `@luz-ds/docs` are not published any more, and the layers `luz.landing`, `luz.cms`, `luz.app` and `luz.docs` are gone. **Breaking:** if you use one of the four packages, follow the steps below.

  The look is the same. The name of each file is the name of its block, `<block>.css`, with no kind of site in it, and the classes and the elements are renamed in the same release (the table is in the notes on the names of catalog). The page of each pattern says which kinds of site it fits best.

  **1. Replace the package.**

  Remove the four packages from your `package.json`. Keep `@luz-ds/tokens`, `@luz-ds/core` and `@luz-ds/catalog`, and update them together: they share one version.

  **2. Link the files.**

  There is no `landing.css`, `cms.css`, `app.css` or `docs.css`, and no single file replaces one of them. Link the patterns your pages use, after core, in the order of the table: it is the order the stylesheet of each kind had them.

  | Old file                                    | New file                                                                          |
  | ------------------------------------------- | --------------------------------------------------------------------------------- |
  | `@luz-ds/landing/components/header.css`     | `@luz-ds/catalog/components/site-header.css`                                      |
  | `@luz-ds/landing/components/hero.css`       | `@luz-ds/catalog/components/hero.css`                                             |
  | `@luz-ds/landing/components/main.css`       | `@luz-ds/catalog/components/main.css`                                             |
  | `@luz-ds/landing/components/section.css`    | `@luz-ds/catalog/components/section.css`                                          |
  | `@luz-ds/landing/components/stat.css`       | `@luz-ds/catalog/components/stat.css`                                             |
  | `@luz-ds/landing/components/footer.css`     | `@luz-ds/catalog/components/site-footer.css`                                      |
  | `@luz-ds/landing/components/glow.css`       | `@luz-ds/catalog/components/glow.css`                                             |
  | `@luz-ds/cms/components/header.css`         | `@luz-ds/catalog/components/site-header.css`, and `masthead.css` for the masthead |
  | `@luz-ds/cms/components/page-header.css`    | `@luz-ds/catalog/components/page-header.css`                                      |
  | `@luz-ds/cms/components/article-header.css` | `@luz-ds/catalog/components/article-header.css`                                   |
  | `@luz-ds/cms/components/article.css`        | `@luz-ds/catalog/components/article.css`                                          |
  | `@luz-ds/cms/components/footer.css`         | `@luz-ds/catalog/components/site-footer.css`                                      |
  | `@luz-ds/app/components/header.css`         | `@luz-ds/catalog/components/app-bar.css`                                          |
  | `@luz-ds/app/components/dashboard.css`      | `@luz-ds/catalog/components/dashboard.css`                                        |
  | `@luz-ds/docs/components/shell.css`         | `@luz-ds/catalog/components/docs-layout.css`                                      |
  | `@luz-ds/docs/components/page-head.css`     | `@luz-ds/catalog/components/doc-header.css`                                       |
  | `@luz-ds/docs/components/rail.css`          | `@luz-ds/catalog/components/page-rail.css`                                        |
  | `@luz-ds/docs/components/example.css`       | `@luz-ds/catalog/components/example.css`                                          |
  | `@luz-ds/docs/components/dodont.css`        | `@luz-ds/catalog/components/do-dont.css`                                          |
  | `@luz-ds/docs/components/pager.css`         | `@luz-ds/catalog/components/pager.css`                                            |
  | `@luz-ds/docs/components/page-foot.css`     | `@luz-ds/catalog/components/page-footer.css`                                      |

  Link `hero.css` with `section.css`: the head of a section shares its rules with the hero. The table of contents of a blog is in `article.css`.

  On a CDN, a file is `https://cdn.jsdelivr.net/npm/@luz-ds/catalog@<version>/dist/components/<block>.min.css`. Add the `integrity` hash of the published file, as for any other file.

  ```html
  <link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@<version>/dist/components/site-header.min.css"
  />
  <link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@<version>/dist/components/hero.min.css"
  />
  ```

  ```js
  import "@luz-ds/catalog/components/site-header.css";
  import "@luz-ds/catalog/components/hero.css";
  ```

  **3. Drop the old layers.**

  The patterns are in `luz.catalog`, with the other catalog components. The order of the layers is now `luz.tokens`, `luz.themes`, `luz.settings`, `luz.generic`, `luz.elements`, `luz.objects`, `luz.components`, `luz.utilities`, `luz.catalog`, `luz.print`, and core and tokens repeat that statement in every file. **Breaking:** if your own `@layer` statement names `luz.landing`, `luz.cms`, `luz.app` or `luz.docs`, remove the name.

  A pattern used to win over the catalog components by the order of the layers. In one layer, the order of the links decides, so link the pattern files after core and after the other catalog files.

  **4. Check the page.**

  `luz-check` tells you which file a class needs. For a page that uses `.luz-hero` and does not link its file, it says that the class is in `@luz-ds/catalog/components/hero.css` and that the file is added after core. It no longer reads a link to one of the four packages, and the data it bundles now comes from catalog's `classes.json`.

  The size budget changes with it: the rows of the four packages go, and each pattern file has a ceiling of its own (PRINCIPLES.md §8).

- 4d3e938: The load rule knows that `@luz-ds/catalog` has no bundle. A class or an element of catalog now asks for the file of its component: `load/package-missing` says, for example, "`<luz-announcement>` is in @luz-ds/catalog/components/announcement.css, which this page does not load; add it after core". A link to another catalog component does not count, and a link to the `catalog.css` of an older release still counts as all of catalog. The data bundled with `luz-check` carries the file of each catalog class and element.
- c0572dd: The HTML comes out complete with no class. **Breaking:** `classless.css` (`@luz-ds/core/classless.css`) and the `[data-luz-classless]` attribute are gone, with no alias: what they did is now in `luz.css`, for the whole page.

  - A bare `button`, `input`, `textarea`, `select`, `label`, checkbox, radio, range, colour and file input, `fieldset` with its `legend`, and `table` with its `caption`, `thead`, `tbody`, `tfoot`, `tr`, `th` and `td` take the look of their component, in `luz.elements` and inside `:where()`, so any class and any rule of yours wins. The space between blocks of text (paragraphs, lists, quotations, headings, `hr`) applies on every page.
  - A variant is told by the HTML: a `button` with no `type` and `type="submit"` are the primary action, `type="button"` and `type="reset"` the secondary one, `aria-invalid="true"` an error, `aria-current="page"` the current link, `disabled` disabled. Classes are for what HTML cannot say: `a.luz-btn`, the roles (danger, ghost), the sizes, and what needs markup.
  - A bare `details` has no box (a summary and a divider); `.luz-accordion` adds the box and the group. A bare `meter`, `progress`, `textarea`, `pre` and `dialog` are as close as the element allows to `.luz-meter`, `.luz-progress`, `.luz-input--textarea`, `.luz-code-block` and `.luz-modal`.
  - Structure has no style: `div`, `span`, `section`, `article`, `aside`, `header`, `footer`, `main`, `search`, `form`, `nav`, `hgroup`, `col` and `colgroup`. `nav` is no longer set in the sans and `hgroup > p` no longer has a subtitle style: put your own font on a component that sits on a `nav`.
  - New: `luz.conditional.css` (`@luz-ds/core/conditional.css`), `luz.css` with the reset and the bare elements only inside `[data-luz]`, for a project that already has a design: the document's font, colour and background go to the root of the zone, the tokens stay on `:root`, and objects, components and utilities are not scoped.
  - The navbar's links and the links of the contents of an article (`.luz-toc`) set their own `text-decoration`, since `nav a` no longer does; the hover of those links changes colour and does not underline.

  If you linked `classless.css`, link `luz.css` and drop the attribute; if you want LUZ in one region of an existing page, link `luz.conditional.css` and put `data-luz` on it.

- e69b828: The navbar, the sidebar (with its brand and `.luz-nav-toggle`), the terminal and the timeline (`<luz-timeline>`) move from `@luz-ds/core` to `@luz-ds/catalog`. **Breaking** for whoever imports their scripts or loads core's `luz.css` and expects them in it. The classes, the markup, the attributes and the look are the same. Catalog is now the navigation of the site and the pieces with JS or an identity of their own; core is everything else, and it names nothing of catalog.

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

- 3aa2e71: The look of `<luz-faq>`: the question is semibold in the body face, at the size of its answer (`--luz-text-lg`); the group title is centred, in capitals and smaller than the answer (no capitals in Arabic); a question under the pointer takes the colour of an open one and is not underlined; and long words break at any point (`overflow-wrap: anywhere`).
- b4780ae: The theme template (`themes/_template.css`) answers to the checked radio of `<luz-theme-mode>` with no JavaScript: each of its three blocks gains a `:is(:root[data-theme="my-brand"]:not([data-mode]):has(input[name="luz-theme-mode"][value="…"]:checked))` selector. A theme copied from an older template needs that line added to each block (see Themes). `luz-tokens check-contrast` no longer lists the new selector as ignored.

### Patch Changes

- 2d895d1: Fix: with JavaScript off, choosing Dark in `<luz-theme-mode>` now also darkens a bare `select` and the date and time fields (and `.luz-select`, `.luz-input[type=date]`, `.luz-input[type=time]`). Four rules still looked for a radio group named `luz-theme`, which the colour mode stopped using when its radios became `luz-theme-mode`, so that branch never matched.
- 1c3e6b4: The menu of `<luz-lang-switch>` read `--luz-radius-lg`, a radius the scale does not have, so its corner declaration was dropped and the menu had square corners: it takes the medium radius like every menu.
- c8a6ba7: `<luz-faq>` breaks a long word at any point (`overflow-wrap: anywhere`, not `break-word`), so an answer with a long word or address no longer widens the page at 400 % text on a phone.
- 0afb378: The space between bare controls (a field, a label, a fieldset or a button after another control) is not added to a control that carries a `luz-` class: a `.luz-check-item` or a `.luz-btn` in a flex row of your own no longer starts lower than the first one. It keeps its own spacing.
- c0d9479: One family of icons: a 24 grid and a 1.5 stroke in `currentColor`.

  - `@luz-ds/core`: the icons of `<luz-theme-mode>` (Auto, Light, Dark, High contrast) are drawn with a stroke, not filled, and `.luz-theme-mode__icon` sets the stroke itself (`fill: none`, `stroke: currentcolor`, `stroke-width: 1.5`, round caps and joins), so the markup of an icon holds its shapes only. An icon of your own in that radio takes the same rule: draw it on a 24 grid.
  - `@luz-ds/catalog`: the icons of the search (trigger, field, close) and of the language switch use the 1.5 stroke, as the rest of the set.
  - The docs: the Icons page replaces Icon grid, with the whole set and the logo, and the Button page tries an icon before the label, after it or alone.

- 363d77b: A full-screen modal on a small screen (the core modal, the search dialog) keeps a focused control clear of its pinned header and footer in Firefox and Safari too: `scroll-padding-block` now adds `--luz-space-md` to the height of each bar, because Firefox ignores the padding when the control is already in view and Safari's keyboard-focus scroll stops short of it.
- 5f83968: Every `.luz-modal` now fills the screen on a small one: up to 640 px wide, or in a window under 30 rem tall (a phone held sideways). It has no margin, radius, border or shadow, uses the dynamic viewport height, and keeps its padding clear of the safe areas. The header with the close button (44 px) stays at the top and the footer at the bottom, and the content is the one thing that scrolls. Above that, nothing changes. The search dialog of `<luz-search>` follows the same rule, so it goes full screen at 640 px instead of 768 px. If you sized your own modal for small screens (with `min()`, `max-inline-size` or margins), remove that rule: your unlayered CSS overrides the new one and leaves the modal floating. A page that only uses the stock modal needs no change.
- 9d0b91a: The color mode is now two elements: `<luz-theme-mode>` in core (a round fixed button that cycles Auto, light, dark and high contrast) and `<luz-theme-time>` in catalog (the same button plus the time of day). **Breaking:** the 0.2.1 names below are gone, with no aliases. `luz-check` names the new one when it finds an old one.

  | 0.2.1                                                  | 0.3.0                                                                                                                       |
  | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
  | `<luz-mode>` (catalog)                                 | `<luz-theme-time>` around core's `<luz-theme-mode>`, or `<luz-theme-mode>` alone                                            |
  | `.luz-mode-switcher`, `--cycle`, `--inline`, `__label` | `<luz-theme-mode>`; `--cycle` is the default; `--inline` is the `inline` attribute; the legend is `.luz-theme-mode__legend` |
  | `.luz-mode-btn`, `__input`, `__icon`                   | `.luz-theme-mode__option`, `__input`, `__icon`                                                                              |
  | `.luz-mode-cycle` (the button `initThemeCycle` added)  | `.luz-theme-mode__button`, added by the element                                                                             |
  | `components/mode-switcher.css` (core)                  | `components/theme-mode.css` (core); `components/theme-time.css` (catalog)                                                   |
  | `initThemeCycle()` (`@luz-ds/core`)                    | none: the element does it                                                                                                   |
  | `@luz-ds/catalog/mode`, `dist/mode.js`                 | `@luz-ds/catalog/theme-time`, `dist/theme-time.js`                                                                          |
  | `components/mode.css` (catalog)                        | `components/theme-time.css`                                                                                                 |
  | (none)                                                 | `@luz-ds/core/theme-mode`, `@luz-ds/core/theme-boot`, `@luz-ds/catalog/theme-time-bar`, `@luz-ds/catalog/theme-time-boot`   |
  | radio `name="luz-theme"`                               | radio `name="luz-theme-mode"`                                                                                               |
  | `data-theme` on `<html>` set by the mode               | `data-mode` on `<html>`; `data-theme` stays the brand (it takes the mode only while the page names no brand)                |
  | `data-light="<phase>"` on `<html>`                     | `data-moment="<moment>"`                                                                                                    |
  | `remember` attribute                                   | on by default; `no-remember` turns it off                                                                                   |
  | `by="clock"` attribute                                 | the `data-from` of the moments in the markup                                                                                |
  | `for` and `light-attr` attributes                      | none                                                                                                                        |
  | the event `luz-mode:change`                            | `luz-theme-mode:change` (detail `{ mode, auto, user }`)                                                                     |

  The storage keys `luz-theme` (the choice) and `luz-light` (a pinned hour) do not change.

  - With no JavaScript the radios still pick the mode. A theme copied from an older `_template.css` needs one selector line per block (see `theme-template-radios`).
  - Optional head scripts set the mode before the first paint: `@luz-ds/core/theme-boot` (`data-mode`, `data-theme`) and `@luz-ds/catalog/theme-time-boot` (`data-moment`). Both are classic scripts that block rendering (EX-009, EX-012). Without them the elements do the same after the first paint.
  - `<luz-theme-time>` takes its moments from the markup (`data-from="HH:MM"`, `data-theme="light|dark"`), and optional `latitude` and `longitude` for the real sunrise and sunset. `variant="bar"` adds the 24 h slider; it needs `data-luz-label-scrub` for its name, or `luz-check` reports `a11y/slider-no-name`.
  - To drop the clock, use `<luz-theme-mode>` alone and link only core.
  - The fixed button rides on top of `<luz-cookie-consent>` while the banner shows, and the sticky page rail keeps the banner's height as end padding.
  - `@luz-ds/check` adds the rules `names/renamed:inline`, `names/renamed:cycle`, `names/renamed:element` and `names/renamed:element-wrap` for the names above, and `a11y/slider-no-name`.

## 0.2.1

### Patch Changes

- e113295: The commands the READMEs tell an AI agent to run, `npx @luz-ds/check` and `npx @luz-ds/tokens check-contrast`, now name the version (`npx @luz-ds/check@0.2.0 <files>`), so a release of the tool nobody read does not run by itself in a consumer's agent session; `pnpm release:version` keeps the version in step.
- 4cb60fd: The README of each package shows the CDN snippets with the version of the package itself (the catalog README cited 0.1.0, which never existed), and from now on `pnpm release:version` writes them.

## 0.2.0

### Minor Changes

- a5a116b: New package: `@luz-ds/check`, a command line (`npx @luz-ds/check`, the bin is `luz-check`) that reads the HTML and CSS of a project that uses LUZ and says what is wrong with them, offline. It is a tool for the person who writes the page and for the AI agent that writes it for them: it has no CSS, no layer and no dependency, imports only `node:fs`, `node:path` and `node:url`, and opens no connection. This version has the options `--help` and `--version`, the exit codes 0, 1 and 2, and the rules of names: it blocks a `luz-*` class, a `<luz-*>` tag or an attribute of one that no manifest has, says the closest name, and warns about a `data-luz-*` attribute LUZ does not read and about a stylesheet that defines a class with LUZ's prefix. It reads the manifests of the packages in your `node_modules` and, for a project that uses a CDN, a snapshot of this release that it carries as data; the report says which each package came from. The rules of load order, misuse and theme colours follow. `luz-check agent` prints a read-only accessibility reviewer (an agent definition for WCAG 2.2 level AA and EN 301 549 that reads source files, with the tools `Read, Grep, Glob`), and the same file is the export `@luz-ds/check/agents/accessibility.md`; it is built from the repository's own accessibility agent, between its publish fences, and fails the build on anything private. It needs Node 20 or later and has its own version, apart from tokens, core and catalog.
- 5fffc0f: Breaking: `@luz-ds/site` is now `@luz-ds/catalog`, the name the home and the docs already gave to level 3. Install `@luz-ds/catalog` and load `catalog.css` / `catalog.min.css` and `catalog.js` / `catalog.min.js` where you loaded the `site.*` files; its subpaths (`/search`, `/consent`, `/mode`, `/css`, `/css/min`, `/print.css`, `/components/*`, `/classes.json`, `/custom-elements.json`) keep their names. The cascade layer is `luz.catalog` instead of `luz.site`, in the order statement every stylesheet repeats (so tokens and core change too). The landing, cms, app and docs packages take `@luz-ds/catalog` as their optional peer. `luz-check` reads the new names and its `load/order` rule says tokens, core, catalog. The docs of the package are at `/docs/catalog/` (was `/docs/site/`). The tags (`<luz-search>`, `<luz-consent>`, `<luz-mode>`, `<luz-lang-switch>`, `<luz-submenu>`, `<luz-banner>`) and their classes do not change.

### Patch Changes

- b06814a: Fixes from the Safari and Firefox reviews. An import map with an `integrity` section is the way to check every lazy chunk in all three engines: `integrity` on a `modulepreload` link is not a guard in Safari and Firefox, only a performance hint, and the "Choose your snippet" page and SECURITY.md now say so and give the map. In Safari, focusing a text field with Tab no longer leaves it under the cookie band: `<luz-consent>` scrolls it back above the band. The timeline's Pause / Play button is no longer rewritten when its text has not changed, so a click on it is not lost in Safari. The site loader starts its idle chunks (search, cookie banner) after the `load` event, so they no longer delay it in Firefox.
- c44810d: `--luz-code-string` in light is now green-70 (8.2:1 on `--luz-surface-muted`) instead of green-60 (4.8:1), so string tokens in a code block keep 4.5:1 on a block drawn slightly darker than the page (a window with a title bar, a terminal). `pnpm check:contrast` now measures every syntax colour on `--luz-surface-hover` as well. A custom theme that copied the old value from `_template.css` should take the new one.
- cb8a8b2: `data-luz-flip` is read by LUZ: an element with it (the `chevron-end` and `arrow-end` icons of the icon grid, or an icon of your own that points to the end of the line) is mirrored in right-to-left text, by one rule of specificity zero in `luz.utilities` (`:where([data-luz-flip]):dir(rtl) { transform: scaleX(-1) }`). Nothing to write; a rule of your own still wins.
- dd01817: English stays in the entry; every other language LUZ ships is a lazy file, fetched only for the pages that declare it. `loadLocales()` is new, and `luz.js` calls it at boot, so a page with `<html lang="es">` makes one request for `i18n-es.min.js` and a page in English makes none. A language is a JSON file, `packages/core/src/i18n/<code>.json`, that the build validates and writes as `dist/i18n-<code>.js`; it is published as `@luz-ds/core/i18n/<code>`. The dictionary has two more keys, `previous` and `next`. `initTabs()`, `initCopyButtons()`, `initThemeSystem()` and `initThemeCycle()` take a `defer` flag that leaves `data-luz-js` and the strings to a later call.

  Breaking: `@luz-ds/core/i18n` and the standalone modules (`/highlight`, `/player`, `/theme`, `/clipboard`) no longer carry Spanish. Before `initHighlight()`, `initPlayers()` and `initThemeCycle()` on a page that is not in English, call `await loadLocales()` from `@luz-ds/core/i18n`, or `registerLocale("es", …)` with your own strings. The `luz.js` entry does it for you.

- c44810d: Core's settings (`luz.settings`) no longer define the motion, the font roles and the breakpoints: `--luz-duration-*`, `--luz-easing-*`, `--luz-font-heading`, `--luz-font-body`, `--luz-text-body` and `--luz-mq-*` now come from `@luz-ds/tokens`, which core already requires. Same names, same values, no visible change. The settings keep the z-index scale, `--luz-sidebar-width`, `--luz-content-max`, `--luz-bar-h`, `--luz-scrollbar-size` and `--luz-text-control`. Load the tokens before core, as before.
- 590b749: A sidebar without `popover` inside `.o-shell` is now the first block of the page on a phone (768 px and below), not a sticky full-height column. The rule moved from the objects layer to `components/sidebar.css`, where `.luz-sidebar` sets position and size. A sidebar with `popover` keeps the drawer.
- 4aeacbb: `.luz-sidebar[popover]` in forced colours: the open drawer has a 1 px inline-end border in `CanvasText`, so it stands apart from the page it covers once the backgrounds and the shadow are dropped. Nothing changes outside forced colours.
- 97ee81a: `.luz-sidebar__link` in forced colours: every link has a 3 px start border in `Canvas`, and the current page (`aria-current="page"`) has it in `Highlight`, so it stays marked when the backgrounds are dropped. Nothing moves.
- a6dfcee: New component: `<luz-timeline>`, a timeline around an ordered list (`ol.luz-timeline > li.luz-timeline__item` with a `time.luz-timeline__date`, a `.luz-timeline__title` and a `.luz-timeline__text`). Without JavaScript it is the list, with a line and a dot per item. With JavaScript, horizontal by default: a rail of date buttons under the current card, Previous and Next, the arrow keys, Home and End, and a swipe. `layout="vertical"` marks the item in the middle of the screen as active and the earlier ones as past (`data-luz-state`). Autoplay is opt-in (`autoplay`, `interval`), with a visible Pause / Play button, and never starts with reduced motion. `luz.js` loads the code only on a page that has a timeline (`dist/timeline.js`, its own size budget); `@luz-ds/core/timeline` defines the element on its own, without loading `luz.js`, for content added later or a page without the entry. Its strings (Previous, Next, Pause, Play; English and Spanish, overridden by `data-luz-label-*`) travel with the chunk; with `luz.js` on the page the entry passes its `t` through `initTimeline(root, translate)`, so a language added with `registerLocale()` reaches the timeline too. Each card has `aria-posinset` and `aria-setsize`; the focus moves to the new current date when the card it was in is hidden. `--luz-timeline-paper` on the element sets the colour the hump and the empty dots are painted with (for a timeline on a card). The styles are in `luz.css` and in `components/timeline.css`.
- d1b7032: The documentation can be in more than one language. A language has docs when its folder exists, `apps/docs/i18n/<code>/`, and is served at `/<code>/docs/`; a page with no translation is shown in English in the translated chrome, marked `lang="en"` and with a notice that links to the English page. A translation an agent wrote is published with its notice until a named reader reviews it. PRINCIPLES.md section 5 says it, `pnpm check:i18n` lists the translations that are stale, orphaned or waiting for a reader, and `pnpm check:i18n --strict` blocks a release on a stale or orphan one. `@luz-ds/check` ships the same snapshot of the packages, so it releases with them.
- 8f49c52: "On this page" comes before the content. The rail (`aside.luz-docs-rail`) now goes between the sidebar and `main` in the markup, and the shell draws it above the content in one column and from 60rem (`"nav rail" / "nav main"`); from 80rem it is still the third column, beside the content, with its sticky inner box. Move your `<aside class="luz-docs-rail">` before `<main>`; the skip link still goes to `main`, past the sidebar and the rail. A rail link's long word now breaks inside the column (`overflow-wrap: anywhere`), so a page does not scroll sideways at 400 % text. `@luz-ds/check` ships the same snapshot of the packages, so it releases with them.
- 9ca1bb1: **New: `<luz-mode>`, a color mode switcher with an Auto state.** Wrap core's color mode radios (`.luz-mode-switcher`, with or without `--cycle`) in `<luz-mode>` and add an "Auto" radio, first. Without JavaScript the radios change the mode through the tokens and Auto leaves the page light. With it, Auto follows the system (`prefers-contrast: more`, then `prefers-color-scheme: dark`, live) or, with `by="clock"`, the phase of the day from the local hour: `data-light` is `dawn`, `morning`, `afternoon`, `sunset`, `dusk` or `night` (dawn, dusk and night are dark), checked again at each minute (the page changes only when the phase does, so a `data-theme` set by hand stays until the next phase) and when the tab shows again, and `prefers-contrast: more` still wins. A chosen mode sets `data-theme`; with the clock its light is pinned (light: `afternoon`, dark and high contrast: `night`) and the minute does not touch it. `remember` stores the choice under core's `luz-theme` key and Auto removes it; without `remember` nothing is stored, and the key `luz.js` writes on a choice is removed. `for` names the element that gets the attributes (default `<html>`) and `light-attr` the attribute of the light (a `data-*` name, default `data-light`). A custom theme of `<html data-luz-themes>` is left to core. The element has `mode`, `light` and `preview(phase | hour | null)`, and dispatches `luz-mode:change`, bubbling, with `{ mode, theme, light, remembered, simulated }`. It writes no text. With `luz.js`, core's cycle button steps through the four states with no new code.

  `catalog.min.js` loads its third chunk, `mode.min.js`, on idle when the page has a `<luz-mode>` (exported as `@luz-ds/catalog/mode`, with `phaseOf(hour)`); `dist/components/mode.css` is new. A page with full Subresource Integrity adds `mode.min.js` to the `integrity` section of its import map (SECURITY.md).

- 5bb83bb: The layer statement that every stylesheet repeats now names `luz.app`, after `luz.cms` and before `luz.print` (`luz.tokens, luz.themes, luz.settings, luz.generic, luz.elements, luz.objects, luz.components, luz.utilities, luz.catalog, luz.landing, luz.cms, luz.app, luz.print`). No existing layer moves. If you repeat the statement in your own stylesheet, add `luz.app` before `luz.print`; a stylesheet that does not is not affected unless it loads `@luz-ds/app`.

  **Fix (core).** `.o-main` no longer sets `overflow-y: auto`. The page scrolls, not `.o-main` (the sidebar sticks to the window the same way), so a bar with `.o-sticky` inside `.o-main` stuck to nothing and scrolled away with the page. A wide child that has no wrapper of its own (a table with no `.luz-table-wrap`) now makes the page scroll sideways, as it does outside `.o-shell`, instead of scrolling inside `.o-main`.

- 5bb83bb: New package: the header and the dashboard of a web application, on core's shell and sidebar. CSS only (no script), in the cascade layer `luz.app`, after `luz.cms`. Requires `@luz-ds/tokens` and `@luz-ds/core` (`^0.1.0`); `@luz-ds/catalog` is an optional peer, for the search in the bar. Exports `./css`, `./css/min` and `./components/*`.

  - `.luz-app-header`, `__toggle`, `__product`, `__actions`, `__account`, `__account-name`: `header.luz-app-header.o-sticky > div.o-row` in `.o-main`, beside the sidebar. The page surface, a 1 px divider, one row of core's `--luz-bar-h`, and gutters that match the content's (16 px, 32 px from 641 px). It holds core's `.luz-nav-toggle` (it opens the sidebar drawer), the product's name (shown at 768 px and below only, so it is never twice in the tree), and the actions at the inline end: site's `<luz-search>`, then a `.luz-dropdown` whose button is the account (initials in a `.luz-avatar`, then the name, clipped to nothing at 640 px and below and kept in the button's name: "AM Ana Martín"). The account list opens ending where its button ends, so it stays in the window at the inline end of the bar. `.o-main` gets `scroll-padding-block-start: var(--luz-bar-h)`.
  - `.luz-app-dashboard`, `__head`, `__title`, `__panel`, `__panel--wide`: `main.luz-app-dashboard`, the container of its own size query, with a title row (`div.__head`: the view's one `h1` and core's `.o-actions`) and a `ul.o-grid.o-grid--auto` of `li.luz-card.__panel` with an 18 rem column. `__panel--wide` takes two columns from a 40 rem container. The panels keep the order of the markup: no dense packing, no `order`.

  The view's `h1` and its main action are the first row of the dashboard, not in the bar: the bar holds only what is the same in every view. Not in 0.1: an icon rail or collapsible sidebar, a stat or chart style, a skeleton, notifications.

- 230ff25: **Breaking.** CMS now holds the page structure of a blog or a newspaper: its header, page header and footer join the article header and the table of contents. Each is a class of cms on a native element, laid out in the markup by core's objects (`.o-page`, `.o-sticky`, `.o-container`, `.o-container--inline`, `.o-row`, `.o-stack`) and core's navbar; cms adds only its skin. Site is an optional peer: with tokens, core and cms alone, every pattern renders, and the rules that refine site's `<luz-lang-switch>` match nothing.

  **What each one is.**

  - `.luz-cms-header`, `__brand`, `__actions`: the blog bar, `header.luz-cms-header.o-sticky > div.o-container.o-container--inline.o-row`, with core's `.luz-nav-toggle` and `nav.luz-navbar[popover]`. The page surface, a 1 px divider, one row of core's `--luz-bar-h`, the row's gaps (8 px between rows, 16 px between items, 24 px from 769 px), and `anchor-name` / `anchor-scope: --luz-bar`, so the navbar's panel and the language list open under it where anchor positioning is supported. The brand is the publication's name as a link: the heading font, semibold, the text colour, underlined on hover only, 44 px tall, `--luz-text-xl` (`--luz-text-lg` at 640 px and below); at 768 px and below it fills the room between the menu button and the actions and wraps there. A logo `<img>` in it is 44 px tall.
  - `.luz-cms-header--masthead`, `__top`, `__date`, `__sections`: the newspaper's masthead, three rows in an `.o-stack`, not sticky: the date (a `time[datetime]`, small and secondary, which wraps to leave the actions their row) and the actions; the brand, centred, `--luz-text-4xl` (`-3xl` below 1024 px, `-2xl` at 640 px and below), a logo 88 px tall; and the sections between two rules, centred from 769 px, which name themselves `--luz-bar` so the navbar's panel opens under them.
  - `.luz-cms-page-header`, `__title`, `__lead`: the title of a page that is not an article, with site's page header's values.
  - `.luz-cms-footer`: `footer.luz-cms-footer > div.o-container.o-container--inline.o-row`, a 1 px divider above, its items at the two ends, a column aligned to the start at 768 px and below.

  The table of contents no longer reads site's header: it sticks `--luz-bar-h` + `--luz-space-lg` from the top on a page with core's `.o-sticky` (in a window at least 30 rem tall), and `--luz-space-lg` otherwise.

  | Was                                                                        | Now                                                                                                                                                                                     | Package   |
  | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
  | `.luz-site-header`, `__inner`, `__brand`, `__nav`, `__actions`, `--sticky` | `header.luz-cms-header.o-sticky > .o-container.o-container--inline.o-row`; `.luz-cms-header__brand`; `nav.luz-navbar`; `.o-row.luz-cms-header__actions`; or `.luz-cms-header--masthead` | cms, core |
  | `.luz-site-page-header`, `__title`, `__lead`                               | `.luz-cms-page-header`, `__title`, `__lead`                                                                                                                                             | cms       |
  | `.luz-site-footer`                                                         | `footer.luz-cms-footer > .o-container.o-container--inline.o-row`                                                                                                                        | cms, core |
  | `.luz-cms-toc` under `.luz-site-header--sticky` (`--luz-site-header-h`)    | under `.o-sticky` (`--luz-bar-h`)                                                                                                                                                       | cms, core |

  Known issue: in browsers without CSS anchor positioning, the sections menu of the masthead opens near the top of the window and covers the publication name and the menu button while it is open; Escape, or a click outside, closes it.

- b585645: Core gains the layout every kind of page needs, so a site no longer needs `@luz-ds/catalog` for it:

  - `--luz-bar-h` (settings): the height of a one-row bar of 44 px controls, `calc(var(--luz-control-lg) + var(--luz-space-xs) + 1px)`.
  - Objects: `.o-page` (a column at least as tall as the window, whose `main` grows, with any number of bands before the header), `.o-container--inline` (the container's width and side gutters, no block padding: a bar's row), `.o-sticky` (a bar stuck to the top in a window at least 30 rem tall, with the scroll padding that keeps a field reached with Tab clear of it), `.o-grid--split` (two equal columns when each gets `--luz-grid-min`, one below) and `.o-actions` (a wrapping row of actions; a column of full-width actions, whose button labels wrap, at 640 px and below).
  - Components, each also in `dist/components/<name>.css`: `.luz-skip-link` (hidden in print), `.luz-band` (a tint from edge to edge of the page; two rules in forced colors), `.luz-image` with `--4x3`, `--3x2`, `--1x1`, `--21x9`, `--9x16` (a frame of fixed ratio on the flat `--luz-surface-strong` surface; no placeholder picture), and `.luz-navbar`, `__list`, `__link` (the links of a header: a row from 769 px, a native popover panel under the bar at 768 px and below, opened by `.luz-nav-toggle`; no JavaScript).

  They take over from site's `.luz-site-page`, `.luz-site-header__inner`, `--sticky` and `--luz-site-header-h`, `.luz-site-actions`, `.luz-site-skip-link`, `.luz-site-section--band`, `.luz-site-image` and `.luz-site-header__nav`, which are gone from `@luz-ds/catalog` in this release: it keeps the search, the cookie banner, the language switch, the submenu and the banner.

- f429690: **Breaking.** Site's three pieces with no script become tags that no script defines (CSS-only tags: the tag is the block, it never upgrades and adds no role), and the cookie banner becomes a band fixed at the bottom of the window.

  **CSS-only tags.** `<luz-lang-switch>`, `<luz-submenu>` and `<luz-banner>` are styled by `components/lang-switch.css`, `components/submenu.css` and `components/banner.css`; every rule that names a tag has its whole selector inside `:where()`. Their semantics stay on the native elements inside them (the button and `nav[popover]`, the `details`, the `section[aria-labelledby]`), so the accessibility tree is the one the classed markup gave. `<luz-submenu>` is `display: contents`, so the list item keeps its layout; `<luz-banner>` is a block. The old class names no longer do anything.

  **The cookie banner.** `.luz-consent` is now fixed at the bottom of the window, the whole width, at most half its height with its own scroll, under the top layer, so showing it moves nothing. In a window less than 30 rem tall it stays in the flow, where its markup is (first after the skip link), which moves the page when it appears. While it shows, `consent.js` sets its height, rounded up, as `--luz-consent-h` on `:root` (from a ResizeObserver), and the page (`<html>`), `.o-main` and `.luz-sidebar` keep that much room at their end and as scroll padding, so nothing Tab reaches stays under it. None of it applies in print, where the banner is hidden. The confirmation now has a Close button, `[data-luz-consent-close]`: it hides the banner and returns focus to the button that opened it, else the first `[data-luz-consent-open]`, else `<main>`. The confirmation also hides when focus leaves it for the page, and focus stays where it went. Escape still does nothing. `[data-luz-consent-open]` buttons keep their space while hidden, so nothing moves when the script shows them.

  | Was                                                                                            | Now                                                                                                                               |
  | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
  | `<div class="luz-site-lang-switcher">`                                                         | `<luz-lang-switch>` (no class)                                                                                                    |
  | `.luz-site-lang-switcher__button`, `__icon`, `__name`, `__menu`, `__title`, `__list`, `__link` | `.luz-lang-switch__button`, `__icon`, `__name`, `__menu`, `__title`, `__list`, `__link`                                           |
  | `--luz-site-lang-switcher-top` (default `calc(var(--luz-control-lg) + var(--luz-space-xs))`)   | `--luz-lang-switch-top` (default core's `--luz-bar-h`, 1 px more: the bar's border), set on the tag                               |
  | `<details class="luz-site-submenu" name="…">`                                                  | `<luz-submenu><details name="…">…</details></luz-submenu>`                                                                        |
  | `<section class="luz-site-notice" aria-labelledby="…">`                                        | `<luz-banner><section aria-labelledby="…">…</section></luz-banner>`                                                               |
  | `.luz-site-notice--warning`                                                                    | `<luz-banner tone="warning">` (any other value is the plain band)                                                                 |
  | `components/lang-switcher.css`, `components/banners.css`                                       | `components/lang-switch.css`, `components/banner.css` and `components/consent.css`                                                |
  | `.luz-consent` in the flow, above the header                                                   | `.luz-consent` fixed at the bottom of the window (in the flow under 30 rem tall); keep it first after the skip link in the markup |
  | `<p data-luz-consent-done tabindex="-1" hidden>…</p>`                                          | `<div data-luz-consent-done tabindex="-1" hidden><p>…</p><button type="button" data-luz-consent-close>Close</button></div>`       |
  | Docs: `/docs/catalog/lang-switcher/`, `/docs/catalog/notice/`                                  | `/docs/catalog/lang-switch/`, `/docs/catalog/banner/`                                                                             |

- 446ebae: **Breaking.** Landing now holds the page structure of a landing page, moved from site: its header, hero, main, sections, footer and glow. Each is a class of the landing on a native element, laid out in the markup by core's objects (`.o-page`, `.o-sticky`, `.o-container`, `.o-container--inline`, `.o-row`, `.o-stack`, `.o-grid--split`, `.o-actions`) and core's navbar; the landing adds only its skin and its rhythm. Site is an optional peer: with tokens, core and landing alone, the header, hero and footer render, and the rules that refine site's `<luz-lang-switch>` match nothing. The feature grid is gone: it had no CSS of its own after core's split grid, so it is a template, a `ul.o-grid.o-grid--split`.

  **What each one is.**

  - `.luz-landing-header`, `__brand`, `__actions`: `header.luz-landing-header.o-sticky > div.o-container.o-container--inline.o-row`, with core's `.luz-nav-toggle` and `nav.luz-navbar[popover]`. The page surface, a 1 px divider, the brand (semibold, the text colour, no underline, 44 px), the row's gaps (8 px between rows, 16 px between items, 24 px from 769 px), and `anchor-name` / `anchor-scope: --luz-bar`, so the navbar's panel and the language list open under it, on two rows as on one, where anchor positioning is supported. Stickiness is `.o-sticky`'s.
  - `.luz-landing-hero`, `__copy`, `__eyebrow`, `__title`, `__lead`, `__media`: `section.luz-landing-hero.o-grid.o-grid--split`, with `--luz-grid-min: 24rem`; the same gaps, room above, type steps and Arabic rules as site's hero had.
  - `.luz-landing-main`: `main.o-container.o-stack.luz-landing-main`, 64 px between the blocks and under the last one, none above the first.
  - `.luz-landing-section`: `section.o-stack.luz-landing-section`, 16 px between its children; add core's `.luz-band` for the tint.
  - `.luz-landing-footer`: `footer.luz-landing-footer > div.o-container.o-container--inline.o-row`, a 1 px divider above, its items at the two ends, a column aligned to the start at 768 px and below.
  - `.luz-landing-glow`: on the `.o-page` element, the tint in the corner where reading starts (top right in right-to-left pages); none in print.

  | Was                                                                        | Now                                                                                                                                                                                                                 | Package       |
  | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
  | `.luz-site-header`, `__inner`, `__brand`, `__nav`, `__actions`, `--sticky` | `header.luz-landing-header.o-sticky > .o-container.o-container--inline.o-row`; `.luz-landing-header__brand`; `nav.luz-navbar > ul.luz-navbar__list > li > a.luz-navbar__link`; `.o-row.luz-landing-header__actions` | landing, core |
  | `.luz-site-hero`, `__copy`, `__eyebrow`, `__title`, `__lead`, `__media`    | `.luz-landing-hero.o-grid.o-grid--split`, `.luz-landing-hero__copy`, `__eyebrow`, `__title`, `__lead`, `__media`                                                                                                    | landing, core |
  | `.luz-site-footer` (the row itself)                                        | `footer.luz-landing-footer > .o-container.o-container--inline.o-row` (the divider is on the `<footer>`)                                                                                                             | landing, core |
  | `.luz-site-page`, `.luz-site-page--gradient`                               | `.o-page`, `.o-page.luz-landing-glow`                                                                                                                                                                               | core, landing |
  | `.luz-site-main`                                                           | `main.o-container.o-stack.luz-landing-main`                                                                                                                                                                         | landing, core |
  | `.luz-site-section`, `--band`                                              | `.o-stack.luz-landing-section`, `.luz-band`                                                                                                                                                                         | landing, core |
  | `.luz-site-actions`                                                        | `.o-actions`                                                                                                                                                                                                        | core          |
  | `.luz-landing-feature-grid`                                                | `ul.o-grid.o-grid--split` (a template on the landing templates page)                                                                                                                                                | core          |
  | `components/feature-grid.css`                                              | `components/header.css`, `hero.css`, `main.css`, `section.css`, `footer.css`, `glow.css`                                                                                                                            | landing       |
  | Docs: `/docs/landing/feature-grid/`                                        | `/docs/landing/header/`, `/hero/`, `/section/`, `/footer/`; the feature grid block on `/docs/landing/templates/`                                                                                                    | —             |

  Site's old page classes (`.luz-site-header`, `.luz-site-hero`, `.luz-site-footer` and the rest of the table above) are gone from `@luz-ds/catalog` in this release.

- 9f1c747: One stylesheet per component in site, landing and cms, as core already has: each `src/components/<name>.css` is also published as `dist/components/<name>.css` and `<name>.min.css`, in the package's own layer (`luz.catalog`, `luz.landing`, `luz.cms`), exported as `./components/*` (`@luz-ds/landing/components/header.css`). Site's print rules are also published on their own as `dist/print.css` (+ `.min`), exported as `@luz-ds/catalog/print.css`, for a page that loads components one by one; `catalog.css` still contains them. `./css` and `./css/min` stay the bundles.

  `@luz-ds/landing` and `@luz-ds/cms` now take `@luz-ds/catalog` as an optional peer (`peerDependenciesMeta`): their CSS works with `@luz-ds/tokens` and `@luz-ds/core` alone, and site, when you use it, is loaded before them. Tokens and core stay required.

  Core no longer names site's footer: `.o-shell` places its `footer` child across the bottom, as before, and nothing else. Site's footer class is gone (see below); put your footer in a `<footer>` that is a direct child of `.o-shell`.

  **Migration: the rest of site's page classes and exports.**

  | Was                              | Now                                                  |
  | -------------------------------- | ---------------------------------------------------- |
  | `.luz-site-content`              | `.o-container`                                       |
  | `.luz-site-skip-link`            | `.luz-skip-link` (core)                              |
  | `.luz-site-image*`               | `.luz-image*` (core), with no placeholder background |
  | `@luz-ds/catalog/placeholders/*` | removed: the placeholders are no longer published    |

- f8f4a1f: **Breaking.** Site's two scripted pieces drop `site-` from their names, the search becomes one self-contained element, and `catalog.js` becomes a loader that loads each piece's script only on a page that has it.

  **The loader.** `catalog.min.js` no longer bundles the search. It scans the page once and loads `search.min.js` when the page has a `<luz-search>` (on the first pointerdown or focus inside it, on Ctrl+K or ⌘K, or when the browser is idle) and `consent.min.js` when it has a `<luz-consent>` (when the browser is idle, at most a second later, after the search). A page with neither loads neither. Each chunk defines its element once, however many copies of it a page loads, and imports nothing. A Ctrl+K pressed before the search's script has loaded loads it and opens the dialog. If a chunk cannot load, the page stays as it is without JavaScript. There is no MutationObserver: for a `<luz-search>` or `<luz-consent>` added after the page has loaded, import `@luz-ds/catalog/search` or `@luz-ds/catalog/consent` (or the `.min.js` file) yourself.

  **The search slot.** The fallback link and the button now sit inside `<luz-search>`, with the dialog, and share one place: the hidden one keeps its space, so nothing moves when the button takes over. If the reader is on the link at that moment (keyboard focus or a pressed pointer), the swap waits until they leave it. At 768 px and below, next to a `--compact` button, the link shows the magnifier only, 44 by 44 px, its words clipped but still its name. The button and the link use the sans. The `<kbd>` hint is `aria-hidden`.

  **Subresource Integrity.** An `integrity` on `catalog.min.js` does not cover the chunks it loads. To check the chunks too, add an import map with an `integrity` section that lists `search.min.js` and `consent.min.js`, before the first module script (SECURITY.md). A `modulepreload` link with `integrity` is not a guard outside Chromium.

  | Was                                                                                                        | Now                                                                                                                                                               |
  | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `<luz-site-search>` around the dialog; trigger and fallback outside it                                     | `<luz-search>` holding `a.luz-search__fallback`, `button.luz-search__trigger` and `dialog.luz-search`                                                             |
  | `<a data-luz-search-fallback>A–Z index</a>`                                                                | `<a class="luz-search__fallback" data-luz-search-fallback>` with a `svg.luz-search__trigger-icon` and `<span class="luz-search__fallback-label">A–Z index</span>` |
  | `.luz-site-search-trigger`, `--compact`                                                                    | `.luz-search__trigger`, `.luz-search__trigger--compact`                                                                                                           |
  | `.luz-site-search-trigger__icon`, `__label`, `__key`                                                       | `.luz-search__trigger-icon`, `.luz-search__trigger-label`, `.luz-search__trigger-key`                                                                             |
  | `.luz-site-search`, `__body`, `__head`, `__title`, `__close`, `__field`, `__status`, `__results`, `__foot` | `.luz-search`, `.luz-search__body`, `__head`, `__title`, `__close`, `__field`, `__status`, `__results`, `__foot`                                                  |
  | `<luz-site-consent>`, `.luz-site-consent`, `__title`, `__choices`                                          | `<luz-consent>`, `.luz-consent`, `__title`, `__choices`                                                                                                           |
  | `catalog.min.js` bundles the search; `consent.min.js` loaded by its own `<script>`                         | `catalog.min.js` loads `search.min.js` and `consent.min.js` when the page has their element; a page may still load either file on its own                         |
  | Budget row "catalog JS module: consent"                                                                    | "catalog JS lazy chunk: consent" (same file and ceiling), and a new row "catalog JS lazy chunk: search" (2.5 kB)                                                  |

  `[data-luz-search-open]` buttons outside `<luz-search>` still open the dialog and still show only once the search works. Every `data-luz-search*` and `data-luz-label-*` attribute, the index format, the keyboard, `getConsent()` and the `luz:consent` event are unchanged.

- d9124a9: Three size knobs, set on `:root`: `--luz-type-base` (`1rem`), `--luz-type-ratio` (`1.25`) and `--luz-space-unit` (`0.25rem`). Every `--luz-text-*` step is now computed from the base and the ratio, each step rounded to 1/16 rem inside `@supports (width: round(1px, 1px))` (a browser without `round()` keeps the plain chain, at most 0.25px away on three heading sizes), and every `--luz-space-*` step is a multiple of the unit. No visual change at the defaults: the nine type sizes and the ten space steps keep their values. Spacing is now in rem, so it follows the reader's browser font size like the type does (at the default 16px root nothing moves). A knob set on `body` or on a section changes nothing; set it on `:root`. `--luz-control-*` (target sizes) are not knobs.

  `--luz-text-body` is a new core setting: running text, `calc(var(--luz-text-base) * 1.0625)` (17px at the defaults), read by `body`, so the base knob moves running text too. On touch screens and at 768px or less `--luz-text-control` is `max(1rem, var(--luz-text-base))`: a base below 16px never takes a form field under 16px.

  `tokens.json` entries with a formula gain `from` (the plain chain) and, for type, `fromRounded`; `value` stays the resolved default. `luz-tokens.dtcg.json` has `--luz-type-ratio` as a DTCG `number` and the formula of a derived size in `$extensions["com.luz-ds"].from`. The theme template's header says sizes are not set in a theme.

- 65efde3: Every package now exports `./classes.json`, the classes, custom properties and `data-luz-*` hooks its CSS and script define, and core and catalog also export `./custom-elements.json`, their custom elements with the attributes each one reads, for editors and AI agents. Both are generated from the built `dist/`, and the Pages site serves a copy of each under `/manifests/<package>/`, beside `llms.txt`, `llms-full.txt` and one example page per component. `pnpm check:ai` regenerates all of them and fails when a file on disk is stale. `luz-check` carries a snapshot of these manifests. No runtime or style change.
- fbf2d58: `dist/classes.json` of a package can now give a class `hosts`, the elements the class may sit on, read from an `@host <class>: <selector>, …` line in the header comment of a stylesheet; core declares it for `.luz-btn` (`a`, `button` and `input` of type `button`, `submit` or `reset`). `luz-check` uses it, and adds the rules of loading (`load/tokens-missing`, `load/package-missing`, `load/layer-statement`, `load/order`, `load/no-stylesheet`), of misuse (`misuse/host-element`, `misuse/modifier-alone`, `misuse/part-orphan`, `misuse/state-class`) and of accessibility (`a11y/role-on-generic`, `a11y/link-no-href`). No runtime or style change: the comment is not in the minified CSS.
- be45c61: `luz-check` adds the theme rules and the CSS warnings. `theme/contrast` runs the contrast check of `luz-tokens check-contrast` over the stylesheets that set `--luz-*` colours (and the ones `--theme` or `themes` name), in light, dark, high contrast and each custom theme, and blocks a pair under its minimum with the overrides that made it; `theme/unreadable` blocks a colour it cannot read (`oklch()`, `color-mix()`, a name) and says to write `#rrggbb`; `theme/advisory` warns about colours no mode can place, about a wide-gamut override in `@supports`, which is not measured, and about the order of the theme files. The warnings `css/literal-colour`, `css/literal-size`, `css/knob-in-px`, `css/important`, `css/private-token` and `css/unknown-token` read every stylesheet. LUZ's tokens come from your `node_modules/@luz-ds/tokens` or, for a project that uses a CDN, from the colour tokens of this release that the package carries as data. An internal error now prints one fixed line.
- 6175ac8: `dist/classes.json` of a package now ends with `hooks`, the `data-luz-*` attribute names the package's own CSS selects and its script reads or writes (`data-luz-classless`, `data-luz-sort`, `data-luz-spy`…), sorted, when there is at least one. `luz-check` reads them to tell a hook LUZ uses from an attribute it does not. No runtime or style change.
- 3d2461e: Each package that ships a tag now ships `dist/custom-elements.json`, a Custom Elements Manifest (schema 2.1.0) for editors and AI agents: core describes `<luz-timeline>`; site describes `<luz-search>`, `<luz-consent>` and the CSS-only `<luz-lang-switch>`, `<luz-submenu>` and `<luz-banner>`, with their attributes, events and the docs page of each. It is exported as `./custom-elements.json` and named in the `customElements` field of `package.json`. It is generated from `@element`, `@attr` and `@fires` lines in the header comment of each source file, and the build fails when they and the code disagree. No runtime or style change.
- f123842: The layer statement that every stylesheet repeats now names `luz.docs`, after `luz.app` and before `luz.print` (`luz.tokens, luz.themes, luz.settings, luz.generic, luz.elements, luz.objects, luz.components, luz.utilities, luz.catalog, luz.landing, luz.cms, luz.app, luz.docs, luz.print`). No existing layer moves. If you repeat the statement in your own stylesheet, add `luz.docs` before `luz.print`; a stylesheet that does not is not affected unless it loads `@luz-ds/docs`.
- f123842: `@luz-ds/docs` exports `./classes.json`, the classes and custom properties its CSS defines, for editors and AI agents, as the other packages do. It is generated from the built `dist/`, and the Pages site serves a copy under `/manifests/docs/`. `luz-check` carries it in its snapshot. No runtime or style change.
- f123842: New package: the pieces of a documentation page, on core's shell and sidebar. CSS only (no script), in the cascade layer `luz.docs`, after `luz.app`. Requires `@luz-ds/tokens` and `@luz-ds/core` (`^0.1.0`); `@luz-ds/catalog` is an optional peer, for the search in the header. Exports `./css`, `./css/min`, the class manifest and `./components/*`.

  - `.luz-docs-shell`, `.luz-docs-nav`, `.luz-docs-main`: `body.o-shell.luz-docs-shell` > header, `nav.luz-sidebar.luz-docs-nav`, `main.o-main.luz-docs-main`, `aside.luz-docs-rail`, footer. Three columns from 80 rem (the sidebar 16.5 rem, the content, the rail 14 rem), two from 60 rem (the rail under the content), one below, in the order of the markup. Every child of the content keeps to `--luz-docs-measure`, 46 rem.
  - `.luz-docs-page-head`, `__eyebrow`, `__lead`, `__meta`: the area and group, the `h1`, one sentence and a row of chips.
  - `.luz-docs-rail`, `__onpage`, `__fold`, `__title`, `__list`, `__sub`, `__link`, `__actions`: "On this page" (a native `<details>`) and the page's actions, kept in view by native sticky positioning; a link also carries core's `.luz-sidebar__link`, so core's scroll spy marks the section in view with a start border and the weight.
  - `.luz-docs-example`, `__preview`, `__frame`, `__code`: a live example and its code in one frame; `--luz-docs-example-w` narrows the frame, which is a size container.
  - `.luz-docs-dodont`, `__item--do`, `__item--dont`, `__verdict`, `__stage`: a Do and a Don't, told apart by a word, a mark and a solid or dashed frame.
  - `.luz-docs-pager`, `__prev`, `__next`, `__link`, `__label`, `__title`: Previous and Next as two link blocks, stacked at 640 px and below.
  - `.luz-docs-page-foot`: Last updated, Edit this page, Report a problem, in small print.

  `@luz-ds/check` knows the `luz-docs-*` classes: its snapshot has the facts of the seven libraries, and a `luz-docs-` name is reported as a class of `@luz-ds/docs`.

- b208b64: `.luz-docs-shell` below 60 rem: the content row takes the free height. On a page shorter than the window the header, the sidebar and the footer keep their own height instead of sharing the extra space.

  `.luz-docs-rail__inner`: a `<div>`, the one child of the rail, around "On this page" and the actions. From 80 rem the rail stretches over its grid area and the inner box is the sticky one, so it stops at the end of the rail and never covers the footer under it (WCAG 2.4.11); it scrolls by itself, with room at its start for a focus ring. Wrap the rail's two blocks in it.

  `.luz-docs-page-head__files`: a quiet line, "Files:" and each file in a `<code>`, for a page that names its files without the chips. The rail's actions draw their top rule only after the "On this page" list. The date in `.luz-docs-page-foot` is the size of the line.

  `luz-check` reads a stylesheet of `@luz-ds/docs` as loaded: `@luz-ds/docs` in a URL, `/packages/docs/` in development, or a bare `docs.css` (which may be your own). Before, a page that linked `docs.css` and used a `luz-docs-*` class was told to load `@luz-ds/docs`.

- 37da54a: PRINCIPLES.md opens with the two statements of the project, "Human-first, AI-ready" and "Every change starts with a failing test". No rule changes. CONTRIBUTING.md is now short and links to the files its long sections moved to, and CODE_OF_CONDUCT.md, the issue labels and the proposal form for Discussions are new.
- 3202d14: Landing 0.2: what any landing page wants, with no data of its own. All additions; nothing that worked before changes.

  - `.luz-landing-hero--centered`: one column (core's split grid with `--luz-grid-min: 100%`), the text centred, the copy at most 48rem wide and centred, the lead and the `.o-actions` row centred under the title.
  - `.luz-landing-hero__media--bleed`, in a centred hero: the media runs from edge to edge of the window in both directions, with no sideways scroll. No viewport unit: on a page that has one, the root is an inline-size query container and the media's margins are `calc(50% - 50cqi)`, so a visible scrollbar is not counted.
  - The head of a section: `.luz-landing-section__eyebrow`, `__title` and `__lead`. They share the hero's rules (one selector list in `hero.css`: load it with `section.css`); the title is one step smaller (`--luz-text-3xl`, `2xl` below 1024px, `xl` at 640px and below), the lead `lg` (`base` at 640px and below). The same Arabic rules as the hero: the sans for the eyebrow, no letter-spacing.
  - `--luz-landing-title-accent`: the colour of the `em` in a hero or section title. Unset, the title's colour.
  - `.luz-landing-stat`, `__value`, `__label` (new `components/stat.css`): a big number in the heading face with tabular figures, and secondary text under it; alone or inside core's `.luz-card`.
  - `.luz-landing-footer__brand` and `.luz-landing-footer__col` with `__col-title`, on `footer > .o-container.o-container--inline.o-grid`: a brand block and columns of links (a small heading over a plain list), side by side from 768px, the brand twice as wide as a column, one under the other below. Each link of a column is a box as tall as `--luz-control-sm`, so it is a target of 24px or more with no CSS of your own. The `> .o-row` footer is unchanged.
  - `--luz-landing-glow-x`: where along the top edge the glow's tint sits, a physical position (`0%` the left, `100%` the right). Unset, the edge where reading starts, as before. The right-to-left rule no longer repeats the gradient.

- 1464a9c: The hero's copy no longer widens the page when a word is longer than the line, for example with 400 % text on a 320 px screen (WCAG 1.4.10). A word in `.luz-landing-hero__copy` now breaks (`overflow-wrap: anywhere`), and the copy of a `--centered` hero is never wider than its column (`max-inline-size: min(100%, 48rem)`). At usual text sizes nothing moves.
- 84f5646: First release of LUZ, formerly CAI (its packages were last published as 2.0.0, under another scope). Migration from those packages: install `@luz-ds/*` instead; every old prefix becomes `luz` (classes `.luz-*`, hooks `data-luz-*`, tokens `--luz-*`, elements `<luz-*>`, layers `luz.*`, events `luz:*`, storage keys `luz-*`); the stylesheet and the script are now `luz.css` and `luz.js`. Display preferences stored under the old keys are not read.
- 423be2f: The peer dependencies on `@luz-ds/*` are `^0.1.0 || ^0.2.0`, so the next release (0.2.0 of tokens, core and catalog) is in range. With `^0.1.0` it was not, and changesets would have taken every dependent to 1.0.0.
- 662c25f: PRINCIPLES.md section 6 now states the rule between core and catalog: site is what can go in any section, page structure is never site, and the packages for one kind of site (`landing`, `cms` and `app`) take site as an optional peer.
- d6b4b29: `<luz-search>` ranks results that match at the same place by the length of the title, not of the title plus its area and keywords, so the page named exactly like the query comes first ("Page head" before "Page header").
- ba18951: `.luz-select` can shrink to its field where the browser styles the open list (`appearance: base-select`): at 400 % text the longest option no longer pushes the page sideways (WCAG 1.4.10).
- 275b991: `<luz-mode>` can pin an hour: `pin(x)` (a phase name or an hour from 0 to 24, `by="clock"` only) keeps Auto at that hour instead of now, and `pinned` reads it. With `remember` the hour is stored under `luz-light`, in minutes of the day, and the stored mode is removed; choosing a mode, or `pin(null)`, unpins it. `preview(null)` returns to the pinned hour when there is one, and `luz-mode:change` carries `pinned` in its `detail`. Auto no longer needs a radio of its own: without one, no radio is checked while Auto is applied.
- b514ce7: Tabs: `activateTab()` shows the selected panel before it hides the others. The other way round the page was for a moment shorter than the scroll position, the browser clamped it, and a sticky element above the panels (a stuck row of tabs) came unstuck when you chose another tab while scrolled down.
- cd16c04: Two pieces the home page had on its own are now in core. `luz-terminal` is a framed command: its tabs are the title bar and the Copy button sits at the end of the line it copies (`components/terminal.css`; its command is a `pre.luz-terminal__code`, which `highlight.js` leaves alone, so it gets no second Copy). `luz-tabs--pill` is a variant of tabs for tabs that hold an icon, with the open one as a chip instead of a rule.
- c44810d: `@luz-ds/tokens` now carries the motion, the font roles and the breakpoints, so a page that loads only the tokens has them too.

  - Motion: `--luz-duration-instant`, `-fast`, `-base`, `-slow`, `-slower`, `-lazy` and `--luz-easing-standard`, `-enter`, `-exit`, `-spring`, `-linear`. Under `prefers-reduced-motion: reduce` every duration is `0s`, so a page with tokens alone loses its motion too.
  - Font and text roles: `--luz-font-heading`, `--luz-font-body` and `--luz-text-body`. On an element marked `lang="ar"` both fonts take the system sans, because ET Book has no Arabic letters.
  - Breakpoints: `--luz-mq-sm`, `-md`, `-lg`, `-xl`, `-xxl`, `-xxxl` (reference values: a media query cannot read them).

  Same names, same values. `tokens.json` has four new groups (`role`, `breakpoint`, `duration`, `easing`) and `luz-tokens.dtcg.json` has them in its primitives, with `duration` and `cubicBezier` types and the two fonts as aliases of the serif. A custom property in your own theme (the `luz.themes` layer) now wins over `--luz-font-body` and `--luz-font-heading`, as it does over every other token; before, core's settings layer came after it.

  `luz-check` and `luz-tokens check-contrast` do not list LUZ's own reduced-motion rule as an ignored condition: it sets durations, not colours.
