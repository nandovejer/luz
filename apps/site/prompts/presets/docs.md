## The kind of site: documentation

Documentation is a site of pages to look up. Ask:

1. The generator, if any (Starlight, VitePress, Eleventy…), and its layouts folder.
2. The areas and the first pages, by name, and what each has (head, "On this page", examples, previous and next).
3. The search needs a JSON index from the build: can it write one?

Start from this skeleton. `luz-nav-toggle` needs `{{nav-toggle-css}}`.

`<luz-search>`: `a[data-luz-search-fallback]`, `button.luz-search__trigger[data-luz-search-open][hidden]` and `dialog.luz-modal.luz-search[data-luz-search-src]` (the JSON index) with an `input`, `[role=status]` and `[data-luz-search-results]`.

```html
<body class="o-shell luz-docs-layout">
 <a class="luz-skip-link" href="#main-content">Skip to content</a>
 <header>
  <button class="luz-nav-toggle" type="button" popovertarget="docs-nav" aria-label="Menu"><span class="luz-nav-toggle__bar"></span><span class="luz-nav-toggle__bar"></span><span class="luz-nav-toggle__bar"></span></button>
  <p><a href="./">…</a></p>
 </header>
 <nav class="luz-sidebar luz-docs-nav" id="docs-nav" aria-label="Docs" popover>…</nav>
 <aside class="luz-page-rail" aria-label="About this page">
  <div class="luz-page-rail__inner">
   <nav class="luz-page-rail__onpage" aria-label="On this page"><details class="luz-page-rail__fold" open>
    <summary class="luz-page-rail__title">On this page</summary>
    <ul class="luz-page-rail__list"><li><a class="luz-page-rail__link" href="#a">…</a></li></ul>
   </details></nav>
  </div>
 </aside>
 <main class="o-main luz-docs-main" id="main-content" tabindex="-1">
  <header class="luz-doc-header"><h1>…</h1></header>
  <nav aria-label="Previous and next page"><ul class="luz-pager">
   <li class="luz-pager__next"><a class="luz-pager__link" rel="next" href="b/"><span class="luz-pager__label">Next</span> <span class="luz-pager__title">…</span></a></li>
  </ul></nav>
 </main>
</body>
```
