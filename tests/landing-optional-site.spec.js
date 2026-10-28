// @ts-check
/**
 * The landing patterns work without the site-wide parts of @luz-ds/catalog (.claude/plans/specs/f3-package-model.md,
 * §5 and §9 step 10; since F5b they are files of catalog, one per block, and a page links only the ones it uses).
 * A page that loads tokens, core and the six landing files and nothing else (tests/fixtures/landing-page.html:
 * no search, consent or language switch file, no script) still renders its header, hero, main,
 * sections, band and footer, and axe finds nothing serious in the three modes.
 * The rules of landing that refine site's tags (`.luz-site-header luz-lang-switch`)
 * simply match nothing there.
 *
 * Also here: the glow of the page (`.luz-glow`, on the `.o-page` element),
 * which replaced `.luz-site-page--gradient`.
 * Runs in `chromium` and `chromium-nojs`: it is CSS only.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const FIXTURE = '/tests/fixtures/landing-page.html';

const px = (page, expression) =>
  page.evaluate((value) => {
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;visibility:hidden;inline-size:${value}`;
    document.body.append(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();
    return width;
  }, expression);

const color = (page, token) =>
  page.evaluate((value) => {
    const probe = document.createElement('div');
    probe.style.cssText = `color:var(${value})`;
    document.body.append(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    return resolved;
  }, token);

const style = (page, selector, property) => page.locator(selector).first().evaluate((el, p) => getComputedStyle(el)[p], property);

const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe('landing without site', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  test('the page asks for its six landing files, the navbar and the sidebar (from catalog since F7) and no other file or script of catalog', async ({ page }) => {
    const requests = [];
    page.on('request', (req) => requests.push(new URL(req.url()).pathname));
    await page.goto(FIXTURE);
    await page.waitForLoadState('networkidle');
    expect(requests.filter((path) => path.includes('/packages/catalog/')).sort()).toEqual(
      [
        ...['glow', 'hero', 'main', 'section', 'site-footer', 'site-header'].map((name) => `/packages/catalog/dist/components/${name}.css`),
        // the navbar and the sidebar of the header's panel came from core to catalog in F7: two more stylesheets, never a script
        '/packages/catalog/dist/components/navbar.css',
        '/packages/catalog/dist/components/sidebar.css',
      ].sort(),
    );
    expect(requests.some((path) => /\/packages\/landing\/|landing\.css|catalog\.css/.test(path))).toBe(false);
    // ... and every one of them is a file catalog serves (the navbar and the sidebar are no longer core's)
    for (const file of ['navbar', 'sidebar']) expect((await page.request.get(`/packages/catalog/dist/components/${file}.css?direct`)).status(), `catalog ${file}.css`).toBe(200);
    // And nothing on it is a site tag
    expect(await page.evaluate(() => document.querySelectorAll('luz-search, luz-cookie-consent, luz-lang-switch, luz-submenu, luz-announcement').length)).toBe(0);
  });

  test('the header renders: the skin, the stickiness of core and the row of links', async ({ page }) => {
    await page.goto(FIXTURE);
    expect(await style(page, '#hdr', 'backgroundColor')).toBe(await color(page, '--luz-surface-page'));
    expect(await style(page, '#hdr', 'borderBlockEndWidth')).toBe('1px');
    expect(await style(page, '#hdr', 'position')).toBe('sticky');
    expect(await style(page, '#brand', 'fontWeight')).toBe('600');
    await expect(page.locator('#toggle')).toBeHidden();
    const tops = await page.locator('#site-nav a').evaluateAll((els) => els.map((a) => Math.round(a.getBoundingClientRect().top)));
    expect(new Set(tops).size, 'the links are one row').toBe(1);
    expect(await page.locator('#site-nav a[aria-current="page"]').evaluate((a) => getComputedStyle(a).textDecorationLine)).toBe('underline');

    // At 600 px the same header has the menu button and the panel
    await page.setViewportSize({ width: 600, height: 800 });
    await expect(page.locator('#toggle')).toBeVisible();
    await expect(page.locator('#site-nav')).toBeHidden();
    await page.click('#toggle');
    await expect(page.locator('#site-nav')).toBeVisible();
    const { panelTop, headerBottom } = await page.evaluate(() => ({
      panelTop: document.getElementById('site-nav').getBoundingClientRect().top,
      headerBottom: document.getElementById('hdr').getBoundingClientRect().bottom,
    }));
    expect(panelTop).toBeGreaterThanOrEqual(headerBottom - 1);
  });

  test('the hero renders: two columns at 1280 px, one at 768, the title at 4xl', async ({ page }) => {
    await page.goto(FIXTURE);
    const columns = () => page.locator('#hero').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(await columns()).toBe(2);
    expect(await style(page, '#hero-title', 'fontSize')).toBe(`${await px(page, 'var(--luz-text-4xl)')}px`);
    await page.setViewportSize({ width: 768, height: 900 });
    expect(await columns()).toBe(1);
    // The picture is core's frame: its ratio, drawn with no file of site
    const frame = await page.locator('.luz-image').evaluate((el) => { const r = el.getBoundingClientRect(); return r.width / r.height; });
    expect(frame).toBeCloseTo(4 / 3, 1);
  });

  test('the main, the sections and the band render with the landing\'s rhythm', async ({ page }) => {
    await page.goto(FIXTURE);
    expect(await style(page, '#main-content', 'rowGap')).toBe(`${await px(page, 'var(--luz-space-3xl)')}px`);
    expect(await style(page, '#main-content', 'paddingBlockEnd')).toBe(`${await px(page, 'var(--luz-space-3xl)')}px`);
    expect(await style(page, '#programme', 'rowGap')).toBe(`${await px(page, 'var(--luz-space-md)')}px`);
    // The band is core's: its tint is the brand's subtle surface
    expect(await style(page, '#band', 'backgroundColor')).toBe(await color(page, '--luz-brand-subtle'));
  });

  test('the footer renders: the divider, and the note and the links at the two ends', async ({ page }) => {
    await page.goto(FIXTURE);
    expect(await style(page, '#ftr', 'borderBlockStartWidth')).toBe('1px');
    expect(await style(page, '#ftr-row', 'justifyContent')).toBe('space-between');
    // On a page shorter than the window the footer rests on the bottom (core's .o-page)
    await page.setViewportSize({ width: 1280, height: 3000 });
    const bottom = await page.evaluate(() => document.getElementById('ftr').getBoundingClientRect().bottom);
    expect(Math.abs(bottom - 3000)).toBeLessThanOrEqual(1);
  });

  for (const width of [320, 768, 1280]) {
    test(`${width} px: nothing scrolls sideways`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(FIXTURE);
      expect(await sideways(page)).toBeLessThanOrEqual(0);
    });
  }

  for (const theme of ['light', 'dark', 'high-contrast']) {
    test(`axe finds nothing serious in ${theme}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name === 'chromium-nojs', 'axe needs JavaScript');
      // Reduced motion: the colour transition of the page must not be caught half way by axe
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(FIXTURE);
      await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)).toEqual([]);
    });
  }
});

test.describe('the glow of the page', () => {
  test('`.luz-glow` on the page element paints the brand tint in the corner where reading starts', async ({ page }) => {
    await page.goto(FIXTURE);
    const glow = await page.evaluate(() => getComputedStyle(document.body).backgroundImage);
    expect(glow).toMatch(/radial-gradient\(circle at (left top|top left|0% 0%)/);
    expect(glow).toMatch(/linear-gradient/);
    // The tint is the brand's subtle surface
    const brand = await color(page, '--luz-brand-subtle');
    expect(glow).toContain(brand);
  });

  test('right to left, the tint moves to the top right', async ({ page }) => {
    await page.goto(FIXTURE);
    const glow = await page.evaluate(() => {
      document.documentElement.dir = 'rtl';
      return getComputedStyle(document.body).backgroundImage;
    });
    expect(glow).toMatch(/radial-gradient\(circle at (right top|top right|100% 0%)/);
  });

  test('on paper the glow is gone', async ({ page }) => {
    await page.goto(FIXTURE);
    await page.emulateMedia({ media: 'print' });
    expect(await style(page, 'body', 'backgroundImage')).toBe('none');
  });
});
