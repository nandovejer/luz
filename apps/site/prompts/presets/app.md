## The kind of site: an app

An app is a web application: a dashboard, a back office, a tool the person signs in to. Ask:

1. The navigation: a sidebar (recommended for more than five views), a header only, or both.
2. The first views, by name: dashboard, list with a table, detail, form, settings.
3. What the data comes from (an API, a store) and who renders it (server or client). LUZ is the markup either way.
4. The empty, loading and error states of each view: what each says.

Start from this skeleton. A menu is a `luz-dropdown` with a `popover`, like the account menu; `luz-btn` goes on a `button` or an `a`, never a `summary`. Numbers are cards; tables, forms, dialogs, tabs and alerts are core's.

```html
<body>
 <a class="luz-skip-link" href="#main-content">Skip to content</a>
 <div class="o-shell">
  <nav class="luz-sidebar" id="app-nav" aria-label="Main" popover>
   <a class="luz-sidebar__brand" href="./"><span class="luz-sidebar__brand-name">Bodega</span></a>
   <div class="luz-sidebar__section">
    <a class="luz-sidebar__link" href="./" aria-current="page">Overview</a>
    <a class="luz-sidebar__link" href="stock/">Stock</a>
   </div>
  </nav>
  <div class="o-main">
   <header class="luz-app-bar o-sticky">
    <div class="o-row">
     <button class="luz-nav-toggle" type="button" popovertarget="app-nav" aria-label="Menu"><span class="luz-nav-toggle__bar"></span><span class="luz-nav-toggle__bar"></span><span class="luz-nav-toggle__bar"></span></button>
     <p class="luz-app-bar__product">Bodega</p>
     <div class="o-row luz-app-bar__actions">
      <div class="luz-dropdown">
       <button class="luz-btn luz-btn--ghost luz-app-bar__account" type="button" popovertarget="account-menu"><span class="luz-avatar luz-avatar--sm">AR</span> <span class="luz-app-bar__account-name">Ana Ruiz</span></button>
       <div class="luz-dropdown__menu" id="account-menu" popover>
        <ul class="luz-dropdown__list">
         <li><a class="luz-dropdown__item" href="account/">Account settings</a></li>
         <li><a class="luz-dropdown__item" href="logout/">Sign out</a></li>
        </ul>
       </div>
      </div>
     </div>
    </div>
   </header>
   <main class="luz-dashboard" id="main-content" tabindex="-1">
    <div class="luz-dashboard__head">
     <h1 class="luz-dashboard__title">Overview</h1>
     <div class="o-actions"><a class="luz-btn luz-btn--primary" href="reports/new/">New report</a></div>
    </div>
    <ul class="o-grid o-grid--auto">
     <li class="luz-card luz-dashboard__panel"><h2 class="luz-card__title">Orders</h2><p class="luz-card__body">1,204</p></li>
     <li class="luz-card luz-dashboard__panel luz-dashboard__panel--wide">
      <h2 class="luz-card__title">Latest orders</h2>
      <div class="luz-table-wrap" role="region" aria-label="Latest orders" tabindex="0">
       <table class="luz-table">
        <thead><tr><th scope="col">Order</th><th scope="col">Total</th></tr></thead>
        <tbody><tr><td data-label="Order">INV-0042</td><td data-label="Total">120.00</td></tr></tbody>
       </table>
      </div>
     </li>
    </ul>
   </main>
  </div>
 </div>
</body>
```
