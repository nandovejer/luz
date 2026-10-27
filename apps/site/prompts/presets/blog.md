## The kind of site: a blog

A blog is a site of articles: a newspaper, a magazine, a personal blog, the news of a company. It works with any CMS (WordPress, Ghost, Drupal, a headless CMS, a static site generator) and any stack: LUZ is the markup the templates write. Second round:

1. The CMS or the generator, and where its templates are. Ask for the folder before you change a template.
2. The templates: the home, the list of posts (by section, tag or author), the article, a plain page (About, Contact), search, 404. All are recommended for a new site.
3. The header: one row with the sections and a search, or a masthead of three rows.
4. The article: a table of contents for long ones, the author box, related posts, comments (which service, if any).

Start from `luz-site-header` (with `--publication`), `luz-article-header`, `luz-article`, `luz-toc`, `luz-page-header` and `luz-site-footer`. A post card is core's card; the search is `<luz-search>` from catalog.
