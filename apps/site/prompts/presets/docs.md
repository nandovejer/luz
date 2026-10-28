## The kind of site: documentation

Documentation is a site of pages to read and look up: a product's docs, a guide, a handbook, an API reference. Second round:

1. The generator, if any (Astro Starlight, VitePress, Docusaurus, Eleventy, plain HTML), and where its layouts are.
2. The areas and the first pages, by name.
3. What each page has: the page head, "On this page", live examples with their code, do and don't, previous and next.
4. The search: `<luz-search>` from catalog reads a JSON index the build writes. Ask whether the build can write one.

Start from `luz-docs-layout`, `luz-doc-header`, `luz-page-rail`, `luz-example`, `luz-do-dont`, `luz-pager` and `luz-page-footer`, with catalog's `luz-sidebar` and core's `luz-code-block`.
