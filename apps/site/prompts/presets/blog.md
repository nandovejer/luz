## The kind of site: a blog

A blog is a site of articles, or a newspaper. Ask:

1. The CMS or generator, and its templates folder: ask before changing one.
2. The templates: home, post list, article, page, search, 404.
3. The header: one row with sections and a search, or a masthead.
4. The article: contents, author box, related posts, comments.

Start from this skeleton: a list or an article in one `main`. One-row header: `luz-site-header luz-site-header--publication`. `luz-nav-toggle` needs `{{nav-toggle-css}}`.

`<luz-search>`: `a[data-luz-search-fallback]`, `button.luz-search__trigger[data-luz-search-open][hidden]` and `dialog.luz-modal.luz-search[data-luz-search-src]` (the JSON index) with an `input`, `[role=status]` and `[data-luz-search-results]`.

```html
<body class="o-page">
 <a class="luz-skip-link" href="#main-content">Skip to content</a>
 <header class="luz-masthead">
  <div class="o-container o-container--inline o-stack">
  <a class="luz-masthead__brand" href="./">…</a>
  <div class="o-row luz-masthead__sections">
  <button class="luz-nav-toggle" type="button" popovertarget="sections-nav" aria-label="Sections"><span class="luz-nav-toggle__bar"></span><span class="luz-nav-toggle__bar"></span><span class="luz-nav-toggle__bar"></span></button>
  <nav class="luz-navbar" id="sections-nav" aria-label="Sections" popover>
  <ul class="luz-navbar__list"><li><a class="luz-navbar__link" href="news/" aria-current="page">News</a></li></ul>
  </nav>
  </div>
  </div>
 </header>
 <main id="main-content" class="o-container o-stack" tabindex="-1">
  <div class="luz-page-header"><h1 class="luz-page-header__title">…</h1></div>
  <ul class="o-grid o-grid--auto"><li class="luz-card"><h2 class="luz-card__title"><a href="./">…</a></h2></li></ul>
  <article class="luz-article">
  <header class="luz-article-header"><h1 class="luz-article-header__title">…</h1></header>
  <div class="luz-article__layout">
  <nav class="luz-toc" aria-label="Contents" data-luz-spy><ol class="luz-toc__list"><li><a href="#a">…</a></li></ol></nav>
  <div class="luz-prose"><h2 id="a">…</h2><p>…</p></div>
  </div>
  </article>
 </main>
 <footer class="luz-site-footer"><p>…</p></footer>
</body>
```
