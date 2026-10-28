## The kind of site: a blog

A blog is a site of articles: a newspaper, a magazine, a company's news. It works with any CMS or generator. Ask:

1. The CMS or generator, and the folder of its templates. Ask before you change one.
2. The templates: home, list of posts, article, plain page, search, 404. All are recommended for a new site.
3. The header: one row with the sections and a search, or a masthead.
4. The article: contents, author box, related posts, comments.

Start from this skeleton: a list page, or an article page in the same `main`. The one-row header is `luz-site-header luz-site-header--publication`.

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
  <ul class="o-grid o-grid--auto"><li class="luz-card"><h2 class="luz-card__title"><a href="./">…</a></h2><p class="luz-card__body">…</p></li></ul>
  <!-- or, on an article page: -->
  <article class="luz-article">
   <header class="luz-article-header"><h1 class="luz-article-header__title">…</h1></header>
   <div class="luz-article__layout">
    <nav class="luz-toc" aria-labelledby="toc-title" data-luz-spy>
     <h2 class="luz-toc__title" id="toc-title">Contents</h2>
     <ol class="luz-toc__list"><li><a href="#a">…</a></li></ol>
    </nav>
    <div class="luz-prose"><h2 id="a">…</h2><p>…</p></div>
   </div>
  </article>
 </main>
 <footer class="luz-site-footer"><div class="o-container o-container--inline o-row"><p>…</p></div></footer>
</body>
```
