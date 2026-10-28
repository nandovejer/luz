---
"@luz-ds/catalog": minor
"@luz-ds/check": minor
---

Catalog has no bundle any more: each component is a stylesheet of its own, and a page links only the ones it uses. **Breaking:** `@luz-ds/catalog/css` (`dist/catalog.css`), `@luz-ds/catalog/css/min` (`dist/catalog.min.css`) and `@luz-ds/catalog/print.css` (`dist/print.css`) are gone.

- Each component is `@luz-ds/catalog/components/<name>.css`, and `dist/components/<name>.min.css` on a CDN. Its screen rules are in `luz.catalog`, as before, and what it does on paper is in the same file, in `luz.print`: linking a component brings its print rules.
- Link them after core, in any order: no two of them style the same element.
- `classes.json` says the file of each class (`files`), and `custom-elements.json` gives each element the file it needs (`stylesheet`).
- Each docs page of a component now starts "Copy the markup" with the two lines that load its file, for a bundler and from the CDN with its hash.

If you loaded the whole of `catalog.css`, link these six files instead, or only the ones your pages use:

| Component | npm | CDN |
| --- | --- | --- |
| `<luz-search>` | `@luz-ds/catalog/components/search.css` | `dist/components/search.min.css` |
| `<luz-lang-switch>` | `@luz-ds/catalog/components/lang-switch.css` | `dist/components/lang-switch.min.css` |
| `<luz-submenu>` | `@luz-ds/catalog/components/submenu.css` | `dist/components/submenu.min.css` |
| `<luz-announcement>` | `@luz-ds/catalog/components/announcement.css` | `dist/components/announcement.min.css` |
| `<luz-cookie-consent>` | `@luz-ds/catalog/components/cookie-consent.css` | `dist/components/cookie-consent.min.css` |
| `<luz-color-mode>` | `@luz-ds/catalog/components/color-mode.css` | `dist/components/color-mode.min.css` |

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.3.0/dist/components/search.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.3.0/dist/components/color-mode.min.css">
```

If you loaded `print.css` beside the component files, remove it: each file has its print rules. The scripts do not change: `catalog.js` still loads the chunk of each element the page has.

The size budget changes with it: the row `catalog CSS` (4 kB for the bundle) goes, and each component file has a ceiling of its own, 1.5 kB (PRINCIPLES.md §8).
