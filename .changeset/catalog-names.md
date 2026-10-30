---
"@luz-ds/catalog": minor
"@luz-ds/check": minor
---

Every component of `@luz-ds/catalog` is named for what it is, with no kind of site in the name: the block of a landing page is `hero`, not `landing-hero`. The classes, the elements, the files, the exports and the docs pages follow the new names. **Breaking:** if you use one of the names in the first column of the tables below, replace it. There are no aliases: the old names do nothing. `luz-check` tells you the new name when it finds an old one.

The look and the markup of each piece are the same, with two unions, below. A part (`__x`) and a modifier (`--x`) keep their name under the new block: `.luz-landing-hero__lead` is `.luz-hero__lead`.

**1. Classes.**

| Old class | New class |
| --- | --- |
| `.luz-landing-hero` | `.luz-hero` |
| `.luz-landing-section` | `.luz-section` |
| `.luz-landing-stat` | `.luz-stat` |
| `.luz-landing-glow` | `.luz-glow` |
| `.luz-landing-main` | `.luz-main` |
| `.luz-landing-header` | `.luz-site-header` (union) |
| `.luz-cms-header` | `.luz-site-header.luz-site-header--publication` (union) |
| `.luz-cms-header--masthead` | `.luz-masthead` |
| `.luz-landing-footer`, `.luz-cms-footer` | `.luz-site-footer` (union) |
| `.luz-app-header` | `.luz-app-bar` |
| `.luz-app-dashboard` | `.luz-dashboard` |
| `.luz-cms-page-header` | `.luz-page-header` |
| `.luz-cms-article-header` | `.luz-article-header` |
| `.luz-cms-article` | `.luz-article` |
| `.luz-cms-toc` | `.luz-toc` |
| `.luz-docs-shell` | `.luz-docs-layout` |
| `.luz-docs-page-head` | `.luz-doc-header` |
| `.luz-docs-rail` | `.luz-page-rail` |
| `.luz-docs-pager` | `.luz-pager` |
| `.luz-docs-page-foot` | `.luz-page-footer` |
| `.luz-docs-example` | `.luz-example` |
| `.luz-docs-dodont` | `.luz-do-dont` |
| `.luz-consent` | `.luz-cookie-consent` |

`.luz-pager` is the Previous and Next links of a page of documentation; it is not core's `.luz-pagination`. `.luz-docs-main` and `.luz-docs-nav` keep their names, as parts of the docs layout.

**2. Elements and their scripts.**

| Old | New |
| --- | --- |
| `<luz-mode>` | `<luz-theme-time>` (see `theme-mode-and-time`) |
| `<luz-consent>` | `<luz-cookie-consent>` (`getConsent()` keeps its name) |
| `<luz-banner>` | `<luz-announcement>` (in ARIA, "banner" is the landmark of the header) |
| `@luz-ds/catalog/mode` | `@luz-ds/catalog/theme-time` |
| `@luz-ds/catalog/consent` | `@luz-ds/catalog/cookie-consent` |
| `dist/mode.js`, `dist/mode.min.js` | `dist/theme-time.js`, `dist/theme-time.min.js` |
| `dist/consent.js`, `dist/consent.min.js` | `dist/cookie-consent.js`, `dist/cookie-consent.min.js` |
| the event `luz-mode:change` | `luz-theme-mode:change` |

`<luz-search>`, `<luz-lang-switch>`, `<luz-submenu>` and `<luz-timeline>`, and the classes `.luz-navbar`, `.luz-sidebar` (with `__brand`) and `.luz-terminal`, do not change. Nor do `getConsent()`, the `data-luz-label-*` attributes, the `luz-theme` and `luz-consent` keys of `localStorage`, the `data-luz-consent*` attributes, the custom property `--luz-consent-h` and the event `luz:consent`.

**3. Stylesheets.**

The file of a block is `components/<block>.css`, and `dist/components/<block>.min.css` on a CDN. Link the new file in place of the old one, after core.

| Old file | New file |
| --- | --- |
| `landing-hero.css`, `landing-section.css`, `landing-stat.css`, `landing-glow.css`, `landing-main.css` | `hero.css`, `section.css`, `stat.css`, `glow.css`, `main.css` |
| `landing-header.css` | `site-header.css` |
| `cms-header.css` | `site-header.css` for the bar, `masthead.css` for the masthead |
| `landing-footer.css`, `cms-footer.css` | `site-footer.css` |
| `app-header.css` | `app-bar.css` |
| `app-dashboard.css` | `dashboard.css` |
| `cms-page-header.css`, `cms-article-header.css`, `cms-article.css` | `page-header.css`, `article-header.css`, `article.css` (`.luz-toc` is in `article.css`) |
| `docs-shell.css`, `docs-page-head.css`, `docs-rail.css` | `docs-layout.css`, `doc-header.css`, `page-rail.css` |
| `docs-pager.css`, `docs-page-foot.css` | `pager.css`, `page-footer.css` |
| `docs-example.css`, `docs-dodont.css` | `example.css`, `do-dont.css` |
| `consent.css`, `mode.css`, `banner.css` | `cookie-consent.css`, `theme-time.css`, `announcement.css` |

**4. Custom properties.**

| Old | New |
| --- | --- |
| `--luz-landing-glow-x`, `--luz-landing-glow-start` | `--luz-glow-x`, `--luz-glow-start` |
| `--luz-landing-title-accent` | `--luz-title-accent` |
| `--luz-cms-toc-top` | `--luz-toc-top` |
| `--luz-docs-rail-top`, `--luz-docs-rail-w` | `--luz-page-rail-top`, `--luz-page-rail-w` |
| `--luz-docs-example-w` | `--luz-example-w` |

**5. The two unions.**

The bar of a landing page and the base bar of a blog were nearly the same, and the two footers were the same. Each pair is one component now.

- `.luz-site-header` is the bar of a landing page. Add `.luz-site-header--publication` for the bar of a blog or a newspaper: it keeps the heading font, the larger size, the underline on hover and the flex layout on short screens that `.luz-cms-header` had. The parts are `.luz-site-header__brand` and `.luz-site-header__actions` in both.
- `.luz-masthead` is what `.luz-cms-header--masthead` was: the three rows, the date, the large brand and the sections. It is not a modifier of the bar. Its parts are `.luz-masthead__top`, `__brand`, `__date`, `__sections` and `__actions`.
- `.luz-site-footer` replaces `.luz-landing-footer` and `.luz-cms-footer`. Its parts (`__brand`, `__col`, `__col-title`) were the landing footer's and keep their names.

**6. Docs pages.**

The route of a page is `/docs/catalog/<block>/`. There are no redirects. `/docs/catalog/mode/` is `/docs/catalog/theme-time/`, `consent/` is `cookie-consent/`, `banner/` is `announcement/`, `landing-header/` is `site-header/`, `cms-header/` is `site-header/` (and `masthead/` for the masthead), `landing-footer/` and `cms-footer/` are `site-footer/`, `app-header/` is `app-bar/`, `app-dashboard/` is `dashboard/`, `docs-shell/` is `docs-layout/`, `docs-page-head/` is `doc-header/`, `docs-rail/` is `page-rail/`, `docs-page-foot/` is `page-footer/`, `docs-dodont/` is `do-dont/`, and `landing-hero/`, `landing-section/`, `landing-stat/`, `cms-page-header/`, `cms-article-header/`, `cms-toc/`, `docs-pager/` and `docs-example/` lose their prefix.

**7. Check your pages.**

Run `luz-check` on your HTML and CSS. It names the new class or element for each old one it finds, and the file to link.
