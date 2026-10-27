// @ts-check
/* global CSSLayerBlockRule */
/**
 * F7 of .claude/plans/ai-and-catalog-only.md, "De core a catalog" (decisions 27 to 38): the navbar, the sidebar, the
 * terminal and the timeline moved from @luz-ds/core to @luz-ds/catalog, with no change of classes or markup. What a
 * browser sees of the move, and the older specs do not already pin:
 *
 *   1  the loader: `catalog.js` loads the sidebar's chunk (its scroll spy) for a `.luz-sidebar` and for a
 *      `[data-luz-spy]` list, and nothing on a page with neither; a page with core alone has no scroll spy, and the
 *      drawer (a native popover) opens with or without a script
 *   2  the layer: each of the four is a stylesheet of catalog in `luz.catalog`, declared after `luz.utilities`, so a
 *      `.u-*` utility on the same element does not win over them any more (decision 29)
 *   3  the pages: each of the four is at /docs/catalog/<name>/ and its old route under /docs/components/ answers 404
 *      (English and Spanish), the gallery of Core no longer lists it, and the Spanish timeline page names its buttons
 *      in Spanish
 *
 * (The timeline's own loading is in tests/timeline.spec.js, its languages in tests/i18n-loader.spec.js, the groups and
 * the "Fits best" lines in tests/docs-catalog-patterns.spec.js.) Fixtures: tests/fixtures/catalog-sidebar-loader.html
 * and catalog-layers.html. Everything but the loader needs no script: it runs in `chromium` and `chromium-nojs`.
 */
import { test, expect } from '@playwright/test';

const LOADER = '/tests/fixtures/catalog-sidebar-loader.html';
const LAYERS = '/tests/fixtures/catalog-layers.html';
const MOVED = ['navbar', 'sidebar', 'terminal', 'timeline'];
const PHONE = { width: 390, height: 844 };

/** Requests for the sidebar's chunk, whatever its name (sidebar.js or sidebar.min.js), as they happen. */
function watchChunk(page) {
  const requested = /** @type {string[]} */ ([]);
  page.on('request', (r) => {
    const path = new URL(r.url()).pathname;
    if (/\/sidebar(\.min)?\.js$/.test(path)) requested.push(path);
  });
  return requested;
}

/** The link of the list gets the mark of the current location, as the scroll spy writes it. */
const marked = (page, id) => page.locator(`#${id}`).evaluate((a) => ({ current: a.getAttribute('aria-current'), active: a.classList.contains('is-active') }));

/* ---- 1. The loader ------------------------------------------------------------------------------- */

test.describe('catalog.js loads the sidebar chunk by presence', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript');

  test('a .luz-sidebar: the chunk comes from catalog, and a link chosen is marked as the current location', async ({ page }) => {
    const requested = watchChunk(page);
    await page.goto(`${LOADER}?sidebar`);
    await page.waitForLoadState('networkidle');
    expect(requested.length, 'the chunk is requested').toBeGreaterThan(0);
    for (const path of requested) expect(path, 'it is catalog\'s').toMatch(/^\/packages\/catalog\/dist\/sidebar(\.min)?\.js$/);
    expect(await marked(page, 'side-2')).toEqual({ current: null, active: false });
    await page.locator('#side-2').evaluate((a) => a.click());
    expect(await marked(page, 'side-2')).toEqual({ current: 'true', active: true });
    expect((await marked(page, 'side-1')).current, 'one mark only').toBeNull();
  });

  test('a [data-luz-spy] list with no .luz-sidebar: the same chunk, and the section on screen marks its link', async ({ page }) => {
    const requested = watchChunk(page);
    await page.goto(`${LOADER}?spy`);
    await page.waitForLoadState('networkidle');
    expect(await page.locator('.luz-sidebar').count(), 'the page has no sidebar').toBe(0);
    expect(requested.length, 'the chunk is requested').toBeGreaterThan(0);
    for (const path of requested) expect(path).toMatch(/^\/packages\/catalog\/dist\/sidebar(\.min)?\.js$/);
    await page.locator('#s3').evaluate((section) => section.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await expect.poll(() => marked(page, 'toc-3'), { timeout: 5000 }).toEqual({ current: 'true', active: true });
    expect((await marked(page, 'toc-1')).current).toBeNull();
  });

  test('a page with neither asks for no sidebar chunk, and marks nothing', async ({ page }) => {
    const requested = watchChunk(page);
    await page.goto(`${LOADER}?none`);
    await page.waitForLoadState('networkidle');
    expect(requested).toEqual([]);
    await page.locator('#toc-2').evaluate((a) => a.click());
    expect((await marked(page, 'toc-2')).current).toBeNull();
  });

  test('a page with core alone has no scroll spy: no chunk, and a chosen link is not marked', async ({ page }) => {
    const requested = watchChunk(page);
    await page.goto(`${LOADER}?core&sidebar`);
    await page.waitForLoadState('networkidle');
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--luz-z-toast').trim()), 'core is there').not.toBe('');
    expect(requested).toEqual([]);
    await page.locator('#side-2').evaluate((a) => a.click());
    expect(await marked(page, 'side-2')).toEqual({ current: null, active: false });
  });
});

test.describe('the sidebar drawer is a native popover', () => {
  test.use({ viewport: PHONE });

  test.describe('with the loader', () => {
    test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'the no-JS describe below');

    test('it opens from its button and closes with Escape', async ({ page }) => {
      await page.goto(`${LOADER}?sidebar`);
      await page.waitForLoadState('networkidle');
      await page.locator('#toggle').click();
      expect(await page.locator('#drawer').evaluate((el) => el.matches(':popover-open'))).toBe(true);
      await page.keyboard.press('Escape');
      expect(await page.locator('#drawer').evaluate((el) => el.matches(':popover-open'))).toBe(false);
    });
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('it opens from its button and closes with Escape, with catalog\'s stylesheet and no script', async ({ page }) => {
      await page.goto(`${LOADER}?sidebar`);
      await expect(page.locator('#drawer')).toBeHidden();
      await page.locator('#toggle').click();
      expect(await page.locator('#drawer').evaluate((el) => el.matches(':popover-open'))).toBe(true);
      await expect(page.locator('#drawer')).toBeVisible();
      await page.keyboard.press('Escape');
      expect(await page.locator('#drawer').evaluate((el) => el.matches(':popover-open'))).toBe(false);
    });
  });

  test.describe('on a page with core alone', () => {
    test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript');

    test('it still opens from its button: core\'s entry does not start the sidebar, and does not need to', async ({ page }) => {
      await page.goto(`${LOADER}?core&sidebar`);
      await page.waitForLoadState('networkidle');
      await page.locator('#toggle').click();
      expect(await page.locator('#drawer').evaluate((el) => el.matches(':popover-open'))).toBe(true);
    });
  });
});

/* ---- 2. The layer -------------------------------------------------------------------------------- */

test.describe('the four stylesheets are catalog\'s, in the luz.catalog layer', () => {
  for (const name of MOVED) {
    test(`${name}.css is served by catalog: the layer order statement first, its rules in luz.catalog`, async ({ request }) => {
      // `?direct`: Vite serves a bare .css request as a JS module, the way it does for an import
      const response = await request.get(`/packages/catalog/dist/components/${name}.css?direct`);
      expect(response.status(), `catalog dist/components/${name}.css (pnpm catalog:build)`).toBe(200);
      const css = await response.text();
      expect(css.startsWith('@layer luz.tokens,')).toBe(true);
      expect(css).toMatch(/^@layer luz\.catalog \{$/m);
      expect(css, 'no rule of it is left in the components layer').not.toMatch(/^@layer luz\.components \{$/m);
    });

    test(`core serves no ${name}.css any more`, async ({ request }) => {
      expect((await request.get(`/packages/core/dist/components/${name}.css?direct`)).status()).toBe(404);
    });
  }

  test('the page links them after core and each sheet holds the luz.catalog layer', async ({ page }) => {
    await page.goto(LAYERS);
    const holds = await page.evaluate(() => [...document.styleSheets].slice(2).map((sheet) => [...sheet.cssRules].some((rule) => rule instanceof CSSLayerBlockRule && rule.name === 'luz.catalog')));
    expect(holds).toEqual(MOVED.map(() => true));
  });

  test('a utility on the same element does not win over them (decision 29): the terminal stays a grid', async ({ page }) => {
    await page.goto(LAYERS);
    expect(await page.locator('#terminal').evaluate((el) => getComputedStyle(el).display)).toBe('grid');
  });

  test('a utility on the same element does not win over them (decision 29): the timeline keeps no margin under it', async ({ page }) => {
    await page.goto(LAYERS);
    expect(await page.locator('#timeline').evaluate((el) => getComputedStyle(el).marginBottom)).toBe('0px');
  });

  test('a utility on the same element does not win over them (decision 29): the navbar link and the sidebar keep their colors', async ({ page }) => {
    await page.goto(LAYERS);
    const colors = await page.evaluate(() => {
      const resolve = (value) => {
        const probe = document.createElement('i');
        probe.style.color = value;
        document.body.append(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return color;
      };
      return {
        link: getComputedStyle(document.getElementById('navbar-link')).color,
        linkOwn: resolve('var(--luz-text-secondary)'),
        utility: resolve('var(--luz-text-primary)'),
        sidebar: getComputedStyle(document.getElementById('sidebar')).color,
        sidebarOwn: resolve('var(--luz-sidebar-text)'),
      };
    });
    expect(colors.linkOwn, 'the probe tells the two apart').not.toBe(colors.utility);
    expect(colors.sidebarOwn, 'the probe tells the two apart').not.toBe(colors.utility);
    expect(colors.link).toBe(colors.linkOwn);
    expect(colors.sidebar).toBe(colors.sidebarOwn);
  });
});

/* ---- 3. The pages -------------------------------------------------------------------------------- */

test.describe('the four pages are at /docs/catalog/<name>/ and nowhere else', () => {
  for (const name of MOVED) {
    for (const [code, prefix] of [['en', ''], ['es', '/es']]) {
      test(`${code}: ${name} is a page of Catalog, with its example, and its old route under Components answers 404`, async ({ page, request }) => {
        const response = await page.goto(`${prefix}/docs/catalog/${name}/`);
        expect(response?.status()).toBe(200);
        await expect(page.locator('h1.docs-title')).toHaveCount(1);
        await expect(page.locator('html')).toHaveAttribute('lang', code);
        await expect(page.locator(`#c-${name} .luz-${name}, #c-${name} luz-${name}`).first()).toBeAttached();
        // Where it fits best is on the page, as on every page of Catalog (the kinds are pinned in docs-catalog-patterns.spec.js)
        await expect(page.locator('p.docs-fits')).toHaveCount(1);
        // The old route, and its example under /examples/
        const old = await request.get(`${prefix}/docs/components/${name}/`, { maxRedirects: 0 });
        expect(old.status(), `${prefix}/docs/components/${name}/`).toBe(404);
        const example = await request.get(`/examples/components/${name}.html`, { maxRedirects: 0 });
        expect(example.status(), `/examples/components/${name}.html`).toBe(404);
      });
    }
  }

  test('the gallery of Core does not list them, and the search index has them under catalog/', async ({ page, request }) => {
    await page.goto('/docs/components/');
    const hrefs = await page.locator('main a').evaluateAll((links) => links.map((a) => a.getAttribute('href')));
    for (const name of MOVED) expect(hrefs, name).not.toContain(`/docs/components/${name}/`);
    const index = await (await request.get('/docs/search-index.json')).json();
    const paths = /** @type {string[]} */ (index.pages.map((/** @type {string[]} */ row) => row[1]));
    for (const name of MOVED) {
      expect(paths, name).toContain(`catalog/${name}/`);
      expect(paths, name).not.toContain(`components/${name}/`);
    }
  });
});

test.describe('the timeline page of the docs', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript');

  for (const [code, prefix] of [['en', ''], ['es', '/es']]) {
    test(`${code}: the examples are built by catalog's chunk, nothing is asked of core for it, and the console is clean`, async ({ page }) => {
      const chunks = /** @type {string[]} */ ([]);
      const problems = /** @type {string[]} */ ([]);
      page.on('request', (r) => {
        const path = new URL(r.url()).pathname;
        if (/\/timeline(\.min)?\.js$/.test(path)) chunks.push(path);
      });
      page.on('pageerror', (e) => problems.push(e.message));
      page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/vite/i.test(m.text())) problems.push(m.text()); });
      await page.goto(`${prefix}/docs/catalog/timeline/`);
      await page.waitForLoadState('networkidle');
      expect(chunks.length, 'the chunk is requested').toBeGreaterThan(0);
      for (const path of chunks) expect(path).toMatch(/^\/packages\/catalog\/dist\/timeline(\.min)?\.js$/);
      expect(await page.evaluate(() => !!customElements.get('luz-timeline'))).toBe(true);
      // A horizontal timeline builds a rail and says so with data-luz-ready; the vertical one is a scroll-driven state
      const horizontal = await page.locator('.docs-example luz-timeline:not([layout="vertical"])').count();
      expect(horizontal, 'the page has its examples').toBeGreaterThan(0);
      await expect(page.locator('.docs-example luz-timeline[data-luz-ready]'), 'every horizontal example is built').toHaveCount(horizontal);
      expect(problems).toEqual([]);
    });
  }

  test('es: the examples stay in English, as every demo of a translated page (lang="en"), and so do their buttons', async ({ page }) => {
    await page.goto('/es/docs/catalog/timeline/');
    await page.waitForLoadState('networkidle');
    const first = page.locator('.docs-example luz-timeline').first();
    await expect(first.locator('xpath=ancestor::*[@lang][1]')).toHaveAttribute('lang', 'en');
    await expect(first.locator('.luz-timeline__arrow--previous')).toHaveAttribute('aria-label', 'Previous');
    await expect(first.locator('.luz-timeline__arrow--next')).toHaveAttribute('aria-label', 'Next');
  });
});
