/**
 * LUZ — the no-JavaScript state (PRINCIPLES.md §3, red line 2).
 * Runs in the `chromium-nojs` project, where JavaScript is disabled.
 * Each test says what the page must still do without scripts.
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { notFoundRoute, routes, routesWith } from './helpers/docs-site.js';
import { px } from './helpers/site-loader.js';
import { channels, colorOf, vejer } from './helpers/site-lights.js';

// The home page in each of its languages (apps/landing/i18n)
const APPS = ['/', '/es/', '/ar/', ...routes(), notFoundRoute];

for (const app of APPS) {
  test(`${app}: content is readable without JavaScript`, async ({ page }) => {
    await page.goto(app);
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('main, [role="main"]').first()).toBeVisible();
    // No horizontal scroll at 320 px (WCAG 1.4.10)
    await page.setViewportSize({ width: 320, height: 800 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test(`${app}: no JavaScript-only control is rendered dead`, async ({ page }) => {
    await page.goto(app);
    // Controls whose behaviour lives in JavaScript. Without JS they must be
    // hidden (or replaced by a native equivalent), never shown and inert.
    const jsOnly = [
      '.luz-copy-btn',
      '.luz-theme-apply-btn',
      '.luz-theme-mode-btn',
      '.luz-player button',
      '.luz-search__trigger',
      '[role="switch"]:not(input)',
      '[role="slider"]:not(input)',
    ].join(', ');
    const dead = await page.evaluate((selector) =>
      [...document.querySelectorAll(selector)]
        .filter((el) => el.checkVisibility({ visibilityProperty: true }) && !el.closest('[aria-hidden="true"]'))
        .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`),
    jsOnly);
    expect([...new Set(dead)], 'visible JavaScript-only controls').toEqual([]);
  });

  test(`${app}: no control that carries a script hook is shown dead`, async ({ page }) => {
    await page.goto(app);
    // Scripts bind to data-* hooks (PRINCIPLES.md §3). Without JavaScript, a
    // visible control with a hook must still do something natively: submit
    // or reset its form, open a popover, or run a command. A specimen button
    // with no hook is inert in both states and is not reported.
    const dead = await page.evaluate(() =>
      [...document.querySelectorAll('button, input[type="button"], [role="button"], a[href^="javascript:"]')]
        .filter((el) => el.checkVisibility({ visibilityProperty: true }) && !el.closest('[aria-hidden="true"], [inert]'))
        .filter((el) => !el.disabled)
        .filter((el) => el.matches('a') || [...el.attributes].some((a) => a.name.startsWith('data-')))
        .filter((el) => !(el.form && ['submit', 'reset'].includes(el.type)))
        .filter((el) => !el.popoverTargetElement)
        .filter((el) => !(el.getAttribute('commandfor') && 'commandForElement' in HTMLButtonElement.prototype))
        .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} [${[...el.attributes].filter((a) => a.name.startsWith('data-')).map((a) => a.name).join(' ')}] "${el.textContent.trim().slice(0, 30)}"`),
    );
    expect(dead, 'visible controls that need JavaScript').toEqual([]);
  });
}

// a11y.md TAB-1/TAB-3: the Code and Design tabs of a component or pattern page
for (const route of routesWith('docs-view-tabs')) {
  test(`${route}: Code and Design are stacked sections, each under its visible h2`, async ({ page }) => {
    await page.goto(route);
    const row = page.getByRole('navigation', { name: /documentation$/ });
    await expect(row.getByRole('link')).toHaveText(['Code', 'Design']);
    await expect(page.getByRole('tab')).toHaveCount(0);
    for (const [panel, heading, text] of [['code-panel', 'code', 'Code'], ['design-panel', 'design', 'Design']]) {
      await expect(page.locator(`#${panel}`)).toBeVisible();
      await expect(page.locator(`#${heading}`)).toBeVisible();
      await expect(page.locator(`#${heading}`)).toHaveText(text);
      expect(await page.locator(`#${heading}`).evaluate((h) => h.tagName)).toBe('H2');
    }
    // Known issues, above them, and When to use / When not to use (red line 18)
    for (const id of ['known-issues', 'when', 'when-not', 'how', 'keyboard']) await expect(page.locator(`#${id}`)).toBeVisible();
    // Code comes first, in the DOM and on screen
    const top = (id) => page.locator(`#${id}`).evaluate((el) => el.getBoundingClientRect().top);
    expect(await top('code')).toBeLessThan(await top('design'));
  });
}

// a11y.md SRCH-1, SRCH-28: no search dialog without JavaScript; the
// header's search is a plain link to the A–Z index, which lists every page
for (const app of ['/', '/docs/', '/docs/components/button/', notFoundRoute]) {
  test(`${app}: the search is a link to the A–Z index`, async ({ page }) => {
    await page.goto(app);
    const banner = page.getByRole('banner');
    const link = banner.getByRole('link', { name: 'A–Z index' });
    await expect(link).toBeVisible();
    await expect(banner.getByRole('button', { name: /^Search/ })).toBeHidden();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const href = await link.evaluate((a) => a.href);
    const response = await page.request.get(href);
    expect(response.status()).toBe(200);
  });
}

// a11y.md SRCH-4: at 320 px the header stays one row without JavaScript.
// At 768 px and below the fallback link paints the magnifier alone, a 44 px
// square; its words stay in the page, clipped, so its name stays "A–Z index"
// (2.5.3).
for (const app of ['/', '/docs/', '/docs/components/button/', notFoundRoute]) {
  test(`${app}: the header is one row at 320 px, with the magnifier as the A–Z link`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(app);
    const link = page.getByRole('banner').getByRole('link', { name: 'A–Z index', exact: true });
    await expect(link).toBeVisible();
    // a touch target: 44 px square, from the control token
    const target = await px(page, 'var(--luz-control-lg)');
    const box = await link.boundingBox();
    expect(box.width, 'link width').toBeCloseTo(target, 0);
    expect(box.height, 'link height').toBeCloseTo(target, 0);
    // the words are clipped to a point (visually hidden), not painted
    const label = await link.locator('.luz-search__fallback-label').boundingBox();
    expect(label.width, 'label width').toBeLessThanOrEqual(1);
    expect(label.height, 'label height').toBeLessThanOrEqual(1);
    const rows = await page.locator('.site-header__inner').evaluate((row) =>
      new Set([...row.children]
        .filter((el) => el.checkVisibility())
        .map((el) => Math.round(el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2))).size);
    expect(rows, 'rows of controls in the header').toBe(1);
    const { height } = await page.locator('.site-header').boundingBox();
    const oneRow = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--site-header-h')) * 16);
    expect(height).toBeLessThanOrEqual(oneRow + 1);
  });
}

test('docs: the A–Z index, both pages together, links every page', async ({ page }) => {
  const AZ = ['/docs/a-z/', '/docs/a-z/m-z/'];
  const hrefs = new Set();
  for (const route of AZ) {
    await page.goto(route);
    for (const path of await page.locator('main a').evaluateAll((links) => links.map((a) => new URL(a.href).pathname))) hrefs.add(path);
  }
  for (const route of routes().filter((r) => !AZ.includes(r))) expect(hrefs.has(route), route).toBe(true);
});

test('docs: the home shows the A–Z link in place of the big search button', async ({ page }) => {
  await page.goto('/docs/');
  await expect(page.getByRole('main').getByRole('link', { name: 'Browse the A–Z index' })).toBeVisible();
  await expect(page.getByRole('main').getByRole('button', { name: /^Search/ })).toBeHidden();
});

test('docs: the color mode switcher is three radios, none checked, that set the mode', async ({ page }) => {
  await page.goto('/docs/');
  const switcher = page.locator('footer luz-color-mode .luz-mode-switcher--cycle');
  await expect(switcher.locator('.luz-mode-btn')).toHaveCount(3);
  await expect(switcher.locator('input[name="luz-theme"]')).toHaveCount(3);
  expect(await switcher.locator('input[name="luz-theme"]').evaluateAll((all) => all.map((r) => r.value))).toEqual(['light', 'dark', 'high-contrast']);
  await expect(switcher.locator('input:checked')).toHaveCount(0);
  for (const label of await switcher.locator('.luz-mode-btn').all()) await expect(label).toBeVisible();
  await expect(page.locator('.luz-mode-cycle')).toBeHidden();
  const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  // No choice is Vejer light without JavaScript: the clock is followed only by the script
  const light = await background();
  await switcher.locator('.luz-mode-btn:has(input[value="dark"])').click();
  await expect.poll(background).not.toBe(light);
  await switcher.locator('.luz-mode-btn:has(input[value="light"])').click();
  await expect.poll(background).toBe(light);
});

for (const app of ['/', '/docs/', '/docs/components/button/']) {
  test(`${app}: nothing is served about the light, and the page is Vejer light`, async ({ page }) => {
    await page.goto(app);
    expect(await page.evaluate(() => document.documentElement.hasAttribute('data-light'))).toBe(false);
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('light');
  });
}

test('docs: the specimens carry no data-theme without JavaScript, and the radios still re-scope them', async ({ page }) => {
  await page.goto('/docs/components/button/');
  const specimens = page.locator('[data-docs-specimen], .luz-do-dont__stage');
  expect(await specimens.count()).toBeGreaterThan(1);
  expect(await specimens.evaluateAll((all) => all.filter((el) => el.hasAttribute('data-theme')).length)).toBe(0);
  const specimen = page.locator('[data-docs-specimen]').first();
  const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  // Light first: Vejer's, whatever the hour (nothing is served about the light)
  expect(channels(await colorOf(specimen, '--luz-surface-page'))).toEqual(vejer('light', '--luz-surface-page'));
  const before = await background();
  await page.locator('footer .luz-mode-btn:has(input[value="dark"])').click();
  await expect.poll(background).not.toBe(before);
  // The specimen follows: its tokens are Vejer's dark, not the light it was served in
  // (polled: the page fades between modes when motion is welcome, and the specimen inherits the fade)
  await expect.poll(async () => channels(await colorOf(specimen, '--luz-surface-page'))).toEqual(vejer('dark', '--luz-surface-page'));
  await expect.poll(async () => channels(await colorOf(specimen, '--luz-text-primary'))).toEqual(vejer('dark', '--luz-text-primary'));
  await page.locator('footer .luz-mode-btn:has(input[value="high-contrast"])').click();
  await expect.poll(async () => channels(await colorOf(specimen, '--luz-surface-page'))).toEqual(vejer('high-contrast', '--luz-surface-page'));
});

// The drawer's names on the home page in another language (apps/landing/i18n)
const DRAWER = {
  '/es/': { menu: 'Menú', site: 'Sitio', links: ['Documentación', 'GitHub'] },
  '/ar/': { menu: 'القائمة', site: 'الموقع', links: ['التوثيق', 'GitHub'] },
};

for (const app of APPS) {
  test(`${app}: the menu drawer opens and closes without JavaScript`, async ({ page }) => {
    const names = DRAWER[app] ?? { menu: 'Menu', site: 'Site', links: ['Documentation', 'GitHub'] };
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto(app);
    const toggle = page.getByRole('button', { name: names.menu, exact: true });
    const drawer = page.locator('#page-nav');
    await expect(toggle).toBeVisible();
    await expect(drawer).toBeHidden();
    await toggle.click();
    await expect(drawer).toBeVisible();
    // the site links are in the drawer, first; none stays in the header row
    await expect(page.locator('.site-header__nav a:visible')).toHaveCount(0);
    await expect(drawer.getByRole('list', { name: names.site, exact: true }).getByRole('link')).toHaveText(names.links);
    // With no script to measure it, the header's height is the CSS value:
    // the drawer opens right below the header, never over its button
    // (polled: the panel slides in from a few pixels above, and ends right below the header)
    const header = await page.locator('.site-header').boundingBox();
    await expect.poll(async () => Math.abs((await drawer.boundingBox()).y - (header.y + header.height))).toBeLessThanOrEqual(1);
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
  });
}

// <home-light> on the home (F3 of .claude/plans/luz-home-docs-identity.md): the hero is complete text, the
// light section is an empty element under a heading, and light.css keeps its room so nothing jumps in
// (the same boxes with JavaScript on are compared in tests/home-light.spec.js)
for (const home of ['/', '/es/', '/ar/']) {
  test(`${home}: the light section is an empty <home-light> under a heading and keeps its height`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(home);
    await expect(page.locator('.luz-hero h1')).toBeVisible();
    await expect(page.locator('section#light h2')).toHaveText(/\S/);
    await expect(page.locator('section#light home-light')).toHaveCount(1);
    expect(await page.locator('home-light').evaluate((el) => ({ children: el.childElementCount, text: (el.textContent ?? '').trim() }))).toEqual({ children: 0, text: '' });
    expect((await page.locator('home-light').boundingBox())?.height ?? 0).toBeGreaterThan(200);
  });
}

// The home: nine sections in a fixed order (the hero, the light, the four levels of "inside", why, native and modes), all of them
// words and native elements; what needs a script (the buttons of Modes, the copy buttons) is not shown dead
const SECTIONS = ['hero', 'light', 'inside', 'inside-2', 'inside-3', 'inside-4', 'why', 'native', 'modes', 'faq'];
const HOME_CATALOG = { '/': 'en', '/es/': 'es', '/ar/': 'ar' };
const homeCatalog = (home) => JSON.parse(readFileSync(fileURLToPath(new URL(`../apps/landing/i18n/${HOME_CATALOG[home]}.json`, import.meta.url)), 'utf-8'));

for (const home of ['/', '/es/', '/ar/']) {
  test(`${home}: the ten sections are in the page, in order, and every one but the light has words`, async ({ page }) => {
    await page.goto(home);
    expect(await page.locator('main section[id]').evaluateAll((all) => all.map((el) => el.id))).toEqual(SECTIONS);
    await expect(page.locator('h1')).toHaveCount(1);
    for (const id of SECTIONS.filter((section) => section !== 'light')) {
      const section = page.locator(`main section#${id}`);
      await expect(section.locator('h1, h2').first(), id).toBeVisible();
      expect((await section.innerText()).trim().length, id).toBeGreaterThan(30);
    }
  });

  test(`${home}: the light section is not an empty region: a sentence of the catalog is shown in it`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(home);
    const words = Object.values(homeCatalog(home)).map((value) => value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim());
    const shown = await page.locator('section#light').evaluate((section) => {
      const clean = (el) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();
      const box = section.getBoundingClientRect();
      return [...section.querySelectorAll('*')]
        // Not the heading for screen readers: a sentence a sighted reader can see
        .filter((el) => !el.closest('.u-sr-only, h1, h2, h3, h4, h5, h6, script, style'))
        .filter((el) => el.checkVisibility({ visibilityProperty: true }) && clean(el).length > 0)
        .map((el) => ({ text: clean(el), rect: el.getBoundingClientRect() }))
        .filter(({ rect }) => rect.width > 8 && rect.height > 8 && rect.bottom > box.top && rect.top < box.bottom)
        .map(({ text }) => text);
    });
    const sentences = shown.filter((text) => words.includes(text) && /\s/.test(text) && /[.!?\u061F]$/.test(text));
    expect(sentences, `visible text in #light: ${JSON.stringify(shown)}`).not.toEqual([]);
  });

  test(`${home}: the buttons of the three modes are not shown without a script, and the boxes are pictures`, async ({ page }) => {
    await page.goto(home);
    const buttons = page.locator('#modes [data-apply-mode]');
    await expect(buttons).toHaveCount(3);
    for (const button of await buttons.all()) await expect(button).toBeHidden();
    // A control that is in the page and visible must be able to do something: the boxes keep their words
    for (const picture of await page.locator('#modes .landing-cut__picture').all()) await expect(picture).toBeVisible();
  });

  test(`${home}: Native is three scenes of code and its result, plain text and native elements, with no script`, async ({ page }) => {
    // Under reduced motion the panel rests on its first scene, on its last frame (the loop is CSS)
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(home);
    const panel = page.locator('#native .landing-typed__panel');
    await expect(panel).toBeVisible();
    const scenes = panel.locator('.landing-typed__scene');
    await expect(scenes).toHaveCount(3);
    const code = scenes.nth(0).locator('pre.luz-code-block');
    await expect(code).toBeVisible();
    await expect(code).toContainText('<details open>');
    // The code of the other two scenes is in the page too, as text: a field and a button with no class, then a link and a button with one
    expect(await scenes.nth(1).locator('pre.luz-code-block').textContent()).toContain('<input');
    expect(await scenes.nth(1).locator('pre.luz-code-block').textContent()).toContain('<button');
    expect(await scenes.nth(2).locator('pre.luz-code-block').textContent()).toContain('luz-btn luz-btn--danger');
    // The result is a picture of the code: native elements, inert
    await expect(scenes.nth(0).locator('.landing-typed__result')).toHaveJSProperty('inert', true);
    await expect(scenes.nth(0).locator('.landing-typed__state--luz details')).toBeVisible();
    // The points and the link to every tag are plain links and text
    await expect(page.locator('#native a.landing-inside__cta')).toBeVisible();
  });

  test(`${home}: the three mode cards are re-scoped by their own data-theme, with no script`, async ({ page }) => {
    await page.goto(home);
    const surfaces = [];
    for (const mode of ['light', 'dark', 'high-contrast']) {
      const card = page.locator(`#modes [data-theme="${mode}"]`);
      await expect(card, mode).toHaveCount(1);
      const surface = channels(await colorOf(card, '--luz-surface-page'));
      expect(surface, mode).toEqual(vejer(mode, '--luz-surface-page'));
      surfaces.push(surface.join());
    }
    expect(new Set(surfaces).size).toBe(3);
  });

  test(`${home}: the footer lists its two columns, the three colour modes and the legal line, and the three languages are in the header`, async ({ page }) => {
    await page.goto(home);
    const footer = page.locator('footer.luz-site-footer');
    await expect(footer.locator('.luz-site-footer__col')).toHaveCount(2);
    await expect(footer.locator('.luz-site-footer__col').nth(1).locator('a')).toHaveCount(4);
    await expect(footer.locator('luz-color-mode input[name="luz-theme"]')).toHaveCount(3);
    expect((await footer.locator('p').allInnerTexts()).join(' ').length).toBeGreaterThan(40);
    // The languages are links of the header's switch (a popover nav, in the markup without a script)
    await expect(page.locator('.site-header luz-lang-switch a')).toHaveCount(3);
  });
}
