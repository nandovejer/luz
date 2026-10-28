// @ts-check
/**
 * The cms patterns work without the site-wide parts of @luz-ds/catalog (.claude/plans/specs/f3-package-model.md,
 * §5 and §9 step 11; since F5b they are files of catalog, one per block, and a page links only the ones it uses).
 * A page that loads tokens, core and the files `site-header`, `page-header` and `site-footer` and nothing else
 * (tests/fixtures/cms-page.html: no search, consent or language switch file, no script) still renders its header, page header and
 * footer, and axe finds nothing serious in the three modes. The rules of cms
 * that refine site's tags (`.luz-site-header luz-lang-switch`) simply match
 * nothing there.
 *
 * Also here: `.luz-site-footer`, the footer of a blog or a newspaper (before F8 `.luz-cms-footer`, the same
 * component as the landing's footer). Like the landing's, it is a native <footer> with
 * a row of core's inside (`footer.luz-site-footer > div.o-container.o-container--inline.o-row`):
 * a divider above, its items at the two ends, and at 768px and below a column
 * aligned to the start.
 * Runs in `chromium` and `chromium-nojs`: it is CSS only.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { MODES } from './helpers/design-tokens.js';

const FIXTURE = '/tests/fixtures/cms-page.html';

const resolved = (page, declaration, property) =>
  page.evaluate(([css, name]) => {
    const probe = document.createElement('div');
    probe.style.cssText = css;
    document.body.append(probe);
    const value = getComputedStyle(probe)[name];
    probe.remove();
    return value;
  }, [declaration, property]);

const color = (page, token) => resolved(page, `color:var(${token})`, 'color');
const px = (page, expression) => resolved(page, `inline-size:${expression};position:absolute`, 'inlineSize');
const style = (page, selector, property) => page.locator(selector).first().evaluate((el, p) => getComputedStyle(el)[p], property);
const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe('cms without site', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  test('the page asks for its three files (the bar of a blog, its page header and its footer), the navbar and the sidebar (from catalog since F7) and no other file or script of catalog, and has none of the site-wide tags', async ({ page }) => {
    const requests = [];
    page.on('request', (req) => requests.push(new URL(req.url()).pathname));
    await page.goto(FIXTURE);
    await page.waitForLoadState('networkidle');
    expect(requests.filter((path) => path.includes('/packages/catalog/')).sort()).toEqual([
      '/packages/catalog/dist/components/site-footer.css',
      '/packages/catalog/dist/components/site-header.css',
      '/packages/catalog/dist/components/page-header.css',
      // the navbar and the sidebar of the header's panel came from core to catalog in F7: two more stylesheets, never a script
      '/packages/catalog/dist/components/navbar.css',
      '/packages/catalog/dist/components/sidebar.css',
    ].sort());
    expect(requests.some((path) => /\/packages\/cms\/|cms\.css|catalog\.css/.test(path))).toBe(false);
    // ... and every one of them is a file catalog serves (the navbar and the sidebar are no longer core's)
    for (const file of ['navbar', 'sidebar']) expect((await page.request.get(`/packages/catalog/dist/components/${file}.css?direct`)).status(), `catalog ${file}.css`).toBe(200);
    expect(await page.evaluate(() => document.querySelectorAll('luz-search, luz-cookie-consent, luz-lang-switch, luz-submenu, luz-announcement').length)).toBe(0);
  });

  test('the header renders: the skin, the stickiness of core, the masthead brand and the row of sections', async ({ page }) => {
    await page.goto(FIXTURE);
    expect(await style(page, '#hdr', 'backgroundColor')).toBe(await color(page, '--luz-surface-page'));
    expect(await style(page, '#hdr', 'borderBlockEndWidth')).toBe('1px');
    expect(await style(page, '#hdr', 'position')).toBe('sticky');
    expect(await style(page, '#brand', 'fontWeight')).toBe('600');
    expect(await style(page, '#brand', 'fontFamily')).toBe(await resolved(page, 'font-family:var(--luz-font-heading)', 'fontFamily'));
    await expect(page.locator('#toggle')).toBeHidden();
    const tops = await page.locator('#cms-nav a').evaluateAll((els) => els.map((a) => Math.round(a.getBoundingClientRect().top)));
    expect(new Set(tops).size, 'the sections are one row').toBe(1);
    expect(await page.locator('#cms-nav a[aria-current="page"]').evaluate((a) => getComputedStyle(a).textDecorationLine)).toBe('underline');

    // At 600 px the same header has the menu button and the panel
    await page.setViewportSize({ width: 600, height: 800 });
    await expect(page.locator('#toggle')).toBeVisible();
    await expect(page.locator('#cms-nav')).toBeHidden();
    await page.click('#toggle');
    await expect(page.locator('#cms-nav')).toBeVisible();
    const { panelTop, headerBottom } = await page.evaluate(() => ({
      panelTop: document.getElementById('cms-nav').getBoundingClientRect().top,
      headerBottom: document.getElementById('hdr').getBoundingClientRect().bottom,
    }));
    expect(panelTop).toBeGreaterThanOrEqual(headerBottom - 1);
  });

  test('the page header renders: the heading font and the room below it', async ({ page }) => {
    await page.goto(FIXTURE);
    expect(await style(page, '#page-title', 'fontFamily')).toBe(await resolved(page, 'font-family:var(--luz-font-heading)', 'fontFamily'));
    expect(await style(page, '#page-header', 'marginBlockEnd')).toBe(await px(page, 'var(--luz-space-xl)'));
  });

  for (const width of [320, 768, 1280]) {
    test(`${width} px: nothing scrolls sideways`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(FIXTURE);
      expect(await sideways(page)).toBeLessThanOrEqual(0);
    });
  }

  for (const mode of MODES) {
    test(`axe finds nothing serious in ${mode}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name === 'chromium-nojs', 'axe needs JavaScript');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(FIXTURE);
      await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, mode);
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)).toEqual([]);
    });
  }
});

test.describe('cms footer', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(FIXTURE);
  });

  test('has a divider above it and room around its row: lg above, xl below', async ({ page }) => {
    expect(await style(page, '#ftr', 'borderBlockStartWidth')).toBe('1px');
    expect(await style(page, '#ftr', 'borderBlockStartStyle')).toBe('solid');
    expect(await style(page, '#ftr', 'borderBlockStartColor')).toBe(await color(page, '--luz-divider'));
    expect(await style(page, '#ftr', 'paddingBlockStart')).toBe(await px(page, 'var(--luz-space-lg)'));
    expect(await style(page, '#ftr', 'paddingBlockEnd')).toBe(await px(page, 'var(--luz-space-xl)'));
  });

  test('wide: the note is at the inline start and the links at the inline end, where the main\'s content starts and ends', async ({ page }) => {
    expect(await style(page, '#ftr-row', 'justifyContent')).toBe('space-between');
    const { note, links, main } = await page.evaluate(() => {
      const mainEl = document.getElementById('main-content');
      const cs = getComputedStyle(mainEl);
      const r = mainEl.getBoundingClientRect();
      return {
        note: document.getElementById('ftr-note').getBoundingClientRect(),
        links: document.querySelector('#ftr-row nav').getBoundingClientRect(),
        main: { left: r.left + parseFloat(cs.paddingLeft), right: r.right - parseFloat(cs.paddingRight) },
      };
    });
    expect(Math.abs(note.left - main.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(main.right - links.right)).toBeLessThanOrEqual(1);
    expect(note.right).toBeLessThan(links.left);
  });

  for (const width of [768, 320]) {
    test(`at ${width} px the row is a column aligned to the start, with no sideways scroll`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      expect(await style(page, '#ftr-row', 'flexDirection')).toBe('column');
      expect(await style(page, '#ftr-row', 'alignItems')).toMatch(/^(flex-)?start$/);
      expect(await sideways(page)).toBeLessThanOrEqual(0);
    });
  }

  test('above 768 px the row is a row again', async ({ page }) => {
    await page.setViewportSize({ width: 769, height: 900 });
    expect(await style(page, '#ftr-row', 'flexDirection')).toBe('row');
  });

  test('on a page shorter than the window the footer rests on the bottom (core\'s .o-page)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 3000 });
    const bottom = await page.evaluate(() => document.getElementById('ftr').getBoundingClientRect().bottom);
    expect(Math.abs(bottom - 3000)).toBeLessThanOrEqual(1);
  });

  test('forced colors keep the divider', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    expect(await style(page, '#ftr', 'borderBlockStartStyle')).toBe('solid');
    expect(parseFloat(await style(page, '#ftr', 'borderBlockStartWidth'))).toBeGreaterThanOrEqual(1);
  });

  test('the markup carries no class named for a kind of site (`luz-landing-*`, `luz-cms-*`, `luz-app-*`)', async ({ page }) => {
    expect(await page.evaluate(() => [...document.querySelectorAll('[class]')].flatMap((el) => [...el.classList]).filter((c) => /^luz-(?:cms|landing|app)-/.test(c)))).toEqual([]);
  });
});
