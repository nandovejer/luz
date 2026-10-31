# @luz-ds/catalog

## 0.3.1

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

### Patch Changes

- 1c3e6b4: The menu of `<luz-lang-switch>` read `--luz-radius-lg`, a radius the scale does not have, so its corner declaration was dropped and the menu had square corners: it takes the medium radius like every menu.
- c8a6ba7: `<luz-faq>` breaks a long word at any point (`overflow-wrap: anywhere`, not `break-word`), so an answer with a long word or address no longer widens the page at 400 % text on a phone.
- c0d9479: One family of icons: a 24 grid and a 1.5 stroke in `currentColor`.

  - `@luz-ds/core`: the icons of `<luz-theme-mode>` (Auto, Light, Dark, High contrast) are drawn with a stroke, not filled, and `.luz-theme-mode__icon` sets the stroke itself (`fill: none`, `stroke: currentcolor`, `stroke-width: 1.5`, round caps and joins), so the markup of an icon holds its shapes only. An icon of your own in that radio takes the same rule: draw it on a 24 grid.
  - `@luz-ds/catalog`: the icons of the search (trigger, field, close) and of the language switch use the 1.5 stroke, as the rest of the set.
  - The docs: the Icons page replaces Icon grid, with the whole set and the logo, and the Button page tries an icon before the label, after it or alone.

- 363d77b: A full-screen modal on a small screen (the core modal, the search dialog) keeps a focused control clear of its pinned header and footer in Firefox and Safari too: `scroll-padding-block` now adds `--luz-space-md` to the height of each bar, because Firefox ignores the padding when the control is already in view and Safari's keyboard-focus scroll stops short of it.

## 0.2.1

### Patch Changes

- e113295: The commands the READMEs tell an AI agent to run, `npx @luz-ds/check` and `npx @luz-ds/tokens check-contrast`, now name the version (`npx @luz-ds/check@0.2.0 <files>`), so a release of the tool nobody read does not run by itself in a consumer's agent session; `pnpm release:version` keeps the version in step.
- 4cb60fd: The README of each package shows the CDN snippets with the version of the package itself (the catalog README cited 0.1.0, which never existed), and from now on `pnpm release:version` writes them.

## 0.2.0

### Minor Changes

- 9ca1bb1: **New: `<luz-mode>`, a color mode switcher with an Auto state.** Wrap core's color mode radios (`.luz-mode-switcher`, with or without `--cycle`) in `<luz-mode>` and add an "Auto" radio, first. Without JavaScript the radios change the mode through the tokens and Auto leaves the page light. With it, Auto follows the system (`prefers-contrast: more`, then `prefers-color-scheme: dark`, live) or, with `by="clock"`, the phase of the day from the local hour: `data-light` is `dawn`, `morning`, `afternoon`, `sunset`, `dusk` or `night` (dawn, dusk and night are dark), checked again at each minute (the page changes only when the phase does, so a `data-theme` set by hand stays until the next phase) and when the tab shows again, and `prefers-contrast: more` still wins. A chosen mode sets `data-theme`; with the clock its light is pinned (light: `afternoon`, dark and high contrast: `night`) and the minute does not touch it. `remember` stores the choice under core's `luz-theme` key and Auto removes it; without `remember` nothing is stored, and the key `luz.js` writes on a choice is removed. `for` names the element that gets the attributes (default `<html>`) and `light-attr` the attribute of the light (a `data-*` name, default `data-light`). A custom theme of `<html data-luz-themes>` is left to core. The element has `mode`, `light` and `preview(phase | hour | null)`, and dispatches `luz-mode:change`, bubbling, with `{ mode, theme, light, remembered, simulated }`. It writes no text. With `luz.js`, core's cycle button steps through the four states with no new code.

  `catalog.min.js` loads its third chunk, `mode.min.js`, on idle when the page has a `<luz-mode>` (exported as `@luz-ds/catalog/mode`, with `phaseOf(hour)`); `dist/components/mode.css` is new. A page with full Subresource Integrity adds `mode.min.js` to the `integrity` section of its import map (SECURITY.md).

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

- 65efde3: Every package now exports `./classes.json`, the classes, custom properties and `data-luz-*` hooks its CSS and script define, and core and catalog also export `./custom-elements.json`, their custom elements with the attributes each one reads, for editors and AI agents. Both are generated from the built `dist/`, and the Pages site serves a copy of each under `/manifests/<package>/`, beside `llms.txt`, `llms-full.txt` and one example page per component. `pnpm check:ai` regenerates all of them and fails when a file on disk is stale. `luz-check` carries a snapshot of these manifests. No runtime or style change.
- 3d2461e: Each package that ships a tag now ships `dist/custom-elements.json`, a Custom Elements Manifest (schema 2.1.0) for editors and AI agents: core describes `<luz-timeline>`; site describes `<luz-search>`, `<luz-consent>` and the CSS-only `<luz-lang-switch>`, `<luz-submenu>` and `<luz-banner>`, with their attributes, events and the docs page of each. It is exported as `./custom-elements.json` and named in the `customElements` field of `package.json`. It is generated from `@element`, `@attr` and `@fires` lines in the header comment of each source file, and the build fails when they and the code disagree. No runtime or style change.
- 84f5646: First release of LUZ, formerly CAI (its packages were last published as 2.0.0, under another scope). Migration from those packages: install `@luz-ds/*` instead; every old prefix becomes `luz` (classes `.luz-*`, hooks `data-luz-*`, tokens `--luz-*`, elements `<luz-*>`, layers `luz.*`, events `luz:*`, storage keys `luz-*`); the stylesheet and the script are now `luz.css` and `luz.js`. Display preferences stored under the old keys are not read.
- 5fffc0f: Breaking: `@luz-ds/site` is now `@luz-ds/catalog`, the name the home and the docs already gave to level 3. Install `@luz-ds/catalog` and load `catalog.css` / `catalog.min.css` and `catalog.js` / `catalog.min.js` where you loaded the `site.*` files; its subpaths (`/search`, `/consent`, `/mode`, `/css`, `/css/min`, `/print.css`, `/components/*`, `/classes.json`, `/custom-elements.json`) keep their names. The cascade layer is `luz.catalog` instead of `luz.site`, in the order statement every stylesheet repeats (so tokens and core change too). The landing, cms, app and docs packages take `@luz-ds/catalog` as their optional peer. `luz-check` reads the new names and its `load/order` rule says tokens, core, catalog. The docs of the package are at `/docs/catalog/` (was `/docs/site/`). The tags (`<luz-search>`, `<luz-consent>`, `<luz-mode>`, `<luz-lang-switch>`, `<luz-submenu>`, `<luz-banner>`) and their classes do not change.
- 275b991: `<luz-mode>` can pin an hour: `pin(x)` (a phase name or an hour from 0 to 24, `by="clock"` only) keeps Auto at that hour instead of now, and `pinned` reads it. With `remember` the hour is stored under `luz-light`, in minutes of the day, and the stored mode is removed; choosing a mode, or `pin(null)`, unpins it. `preview(null)` returns to the pinned hour when there is one, and `luz-mode:change` carries `pinned` in its `detail`. Auto no longer needs a radio of its own: without one, no radio is checked while Auto is applied.

### Patch Changes

- b06814a: Fixes from the Safari and Firefox reviews. An import map with an `integrity` section is the way to check every lazy chunk in all three engines: `integrity` on a `modulepreload` link is not a guard in Safari and Firefox, only a performance hint, and the "Choose your snippet" page and SECURITY.md now say so and give the map. In Safari, focusing a text field with Tab no longer leaves it under the cookie band: `<luz-consent>` scrolls it back above the band. The timeline's Pause / Play button is no longer rewritten when its text has not changed, so a click on it is not lost in Safari. The site loader starts its idle chunks (search, cookie banner) after the `load` event, so they no longer delay it in Firefox.
- 6175ac8: `dist/classes.json` of a package now ends with `hooks`, the `data-luz-*` attribute names the package's own CSS selects and its script reads or writes (`data-luz-classless`, `data-luz-sort`, `data-luz-spy`…), sorted, when there is at least one. `luz-check` reads them to tell a hook LUZ uses from an attribute it does not. No runtime or style change.
- 423be2f: The peer dependencies on `@luz-ds/*` are `^0.1.0 || ^0.2.0`, so the next release (0.2.0 of tokens, core and catalog) is in range. With `^0.1.0` it was not, and changesets would have taken every dependent to 1.0.0.
- d6b4b29: `<luz-search>` ranks results that match at the same place by the length of the title, not of the title plus its area and keywords, so the page named exactly like the query comes first ("Page head" before "Page header").
