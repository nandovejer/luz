## The kind of site: a landing page

A landing page presents one thing (a product, an event, a person) and leads the visitor to one action. Ask:

1. The sections, in reading order. Offer: hero, features, stats, programme, speakers, pricing, testimonials, call to action, sign-up form, footer; the hero and the footer are recommended.
2. The one main action: what the button says and where it goes.
3. The header: the name only, or the name with links and the colour mode switcher.
4. Any form, and where its data goes. LUZ styles the form; it does not send it.

Start from this skeleton.

```html
<body class="o-page luz-glow">
 <a class="luz-skip-link" href="#main-content">Skip to content</a>
 <header class="luz-site-header o-sticky">
  <div class="o-container o-container--inline o-row">
   <button class="luz-nav-toggle" type="button" popovertarget="site-nav" aria-label="Menu"><span class="luz-nav-toggle__bar"></span><span class="luz-nav-toggle__bar"></span><span class="luz-nav-toggle__bar"></span></button>
   <a class="luz-site-header__brand" href="./">Acme Stock</a>
   <nav class="luz-navbar" id="site-nav" aria-label="Main" popover>
    <ul class="luz-navbar__list"><li><a class="luz-navbar__link" href="./" aria-current="page">Product</a></li></ul>
   </nav>
  </div>
 </header>
 <main id="main-content" class="o-container o-stack luz-main" tabindex="-1">
  <section class="luz-hero o-grid o-grid--split" aria-labelledby="hero-title">
   <div class="luz-hero__copy">
    <h1 class="luz-hero__title" id="hero-title">…</h1>
    <p class="luz-hero__lead">…</p>
    <div class="o-actions"><a class="luz-btn luz-btn--primary" href="trial/">Start free trial</a></div>
   </div>
   <div class="luz-hero__media"><div class="luz-image luz-image--4x3"><img src="shop.jpg" width="1280" height="960" alt="…"></div></div>
  </section>
  <section class="o-stack luz-section" aria-labelledby="why-title">
   <h2 class="luz-section__title" id="why-title">…</h2>
   <ul class="o-grid o-grid--split">
    <li class="luz-card"><h3 class="luz-card__title">…</h3><p class="luz-card__body">…</p></li>
   </ul>
  </section>
 </main>
 <footer class="luz-site-footer"><div class="o-container o-container--inline o-row"><p>Acme Inc.</p></div></footer>
</body>
```
