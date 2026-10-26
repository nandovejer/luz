---
"@luz-ds/catalog": minor
"@luz-ds/core": minor
"@luz-ds/tokens": minor
"@luz-ds/check": minor
---

The patterns of a landing page, a blog, a web application and a documentation site are components of `@luz-ds/catalog` now, one stylesheet each. `@luz-ds/landing`, `@luz-ds/cms`, `@luz-ds/app` and `@luz-ds/docs` are not published any more, and the layers `luz.landing`, `luz.cms`, `luz.app` and `luz.docs` are gone. **Breaking:** if you use one of the four packages, follow the steps below.

Nothing else changes: the classes, the markup and the look are the same. The name of each file is `<kind>-<name>.css`, where the kind is `landing`, `cms`, `app` or `docs`. The pattern of a blog keeps `cms` in its class names, whatever your CMS is.

**1. Replace the package.**

Remove the four packages from your `package.json`. Keep `@luz-ds/tokens`, `@luz-ds/core` and `@luz-ds/catalog`, and update them together: they share one version.

**2. Link the files.**

There is no `landing.css`, `cms.css`, `app.css` or `docs.css`, and no single file replaces one of them. Link the patterns your pages use, after core, in the order of the table: it is the order the stylesheet of each kind had them.

| Old file | New file |
| --- | --- |
| `@luz-ds/landing/components/header.css` | `@luz-ds/catalog/components/landing-header.css` |
| `@luz-ds/landing/components/hero.css` | `@luz-ds/catalog/components/landing-hero.css` |
| `@luz-ds/landing/components/main.css` | `@luz-ds/catalog/components/landing-main.css` |
| `@luz-ds/landing/components/section.css` | `@luz-ds/catalog/components/landing-section.css` |
| `@luz-ds/landing/components/stat.css` | `@luz-ds/catalog/components/landing-stat.css` |
| `@luz-ds/landing/components/footer.css` | `@luz-ds/catalog/components/landing-footer.css` |
| `@luz-ds/landing/components/glow.css` | `@luz-ds/catalog/components/landing-glow.css` |
| `@luz-ds/cms/components/header.css` | `@luz-ds/catalog/components/cms-header.css` |
| `@luz-ds/cms/components/page-header.css` | `@luz-ds/catalog/components/cms-page-header.css` |
| `@luz-ds/cms/components/article-header.css` | `@luz-ds/catalog/components/cms-article-header.css` |
| `@luz-ds/cms/components/article.css` | `@luz-ds/catalog/components/cms-article.css` |
| `@luz-ds/cms/components/footer.css` | `@luz-ds/catalog/components/cms-footer.css` |
| `@luz-ds/app/components/header.css` | `@luz-ds/catalog/components/app-header.css` |
| `@luz-ds/app/components/dashboard.css` | `@luz-ds/catalog/components/app-dashboard.css` |
| `@luz-ds/docs/components/shell.css` | `@luz-ds/catalog/components/docs-shell.css` |
| `@luz-ds/docs/components/page-head.css` | `@luz-ds/catalog/components/docs-page-head.css` |
| `@luz-ds/docs/components/rail.css` | `@luz-ds/catalog/components/docs-rail.css` |
| `@luz-ds/docs/components/example.css` | `@luz-ds/catalog/components/docs-example.css` |
| `@luz-ds/docs/components/dodont.css` | `@luz-ds/catalog/components/docs-dodont.css` |
| `@luz-ds/docs/components/pager.css` | `@luz-ds/catalog/components/docs-pager.css` |
| `@luz-ds/docs/components/page-foot.css` | `@luz-ds/catalog/components/docs-page-foot.css` |

Link `landing-hero.css` with `landing-section.css`: the head of a section shares its rules with the hero. The table of contents of a blog is in `cms-article.css`.

On a CDN, a file is `https://cdn.jsdelivr.net/npm/@luz-ds/catalog@<version>/dist/components/<kind>-<name>.min.css`. Add the `integrity` hash of the published file, as for any other file.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@<version>/dist/components/landing-header.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@<version>/dist/components/landing-hero.min.css">
```

```js
import "@luz-ds/catalog/components/landing-header.css";
import "@luz-ds/catalog/components/landing-hero.css";
```

**3. Drop the old layers.**

The patterns are in `luz.catalog`, with the other catalog components. The order of the layers is now `luz.tokens`, `luz.themes`, `luz.settings`, `luz.generic`, `luz.elements`, `luz.objects`, `luz.components`, `luz.utilities`, `luz.catalog`, `luz.print`, and core and tokens repeat that statement in every file. **Breaking:** if your own `@layer` statement names `luz.landing`, `luz.cms`, `luz.app` or `luz.docs`, remove the name.

A pattern used to win over the catalog components by the order of the layers. In one layer, the order of the links decides, so link the pattern files after core and after the other catalog files.

**4. Check the page.**

`luz-check` tells you which file a class needs. For a page that uses `.luz-landing-hero` and does not link its file, it says that the class is in `@luz-ds/catalog/components/landing-hero.css` and that the file is added after core. It no longer reads a link to one of the four packages, and the data it bundles now comes from catalog's `classes.json`.

The size budget changes with it: the rows of the four packages go, and each pattern file has a ceiling of its own (PRINCIPLES.md §8).
