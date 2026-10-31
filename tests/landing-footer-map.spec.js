// @ts-check
/**
 * The footer of the home as a site map (`nav.landing-foot-nav`: four groups, Documentation, Reference, Resources,
 * Community, each an h2 title over a list), in English, Spanish and Arabic. The links, their order and the labels are
 * tests/landing-footer-map.test.js; this file is what a browser draws.
 *
 * - The titles are small mono capitals in the strong ink (Arabic: no capitals and no letter-spacing).
 * - Below 768 px the groups are two by two; from 768 px four columns; the brand is on the left from 1280 px. The
 *   titles of a row share the same line (the same top), at 375, 700, 900, 1100 and 1440 px, whatever a group's links
 *   wrap to.
 * - Every link is a target of at least 24 px high. Nothing scrolls sideways at 320 px, with or without JavaScript.
 */
import { test, expect } from '@playwright/test';

const ROUTES = ['/', '/es/', '/ar/'];
const WIDTHS = [375, 700, 900, 1100, 1440];
const TITLES = 'footer .landing-foot-group > .luz-site-footer__col-title';

/** @param {import('@playwright/test').Page} page */
const tops = (page) => page.locator(TITLES).evaluateAll((all) => all.map((el) => el.getBoundingClientRect().top));

for (const route of ROUTES) {
  test.describe(route, () => {
    test('the four titles are small mono capitals in the strong ink (Arabic: no capitals, no letter-spacing)', async ({ page }) => {
      await page.goto(route);
      const titles = page.locator(TITLES);
      await expect(titles).toHaveCount(4);
      const found = await titles.evaluateAll((all) => {
        const probe = document.createElement('p');
        probe.style.cssText = 'position:absolute;font-family:var(--luz-font-mono);color:var(--luz-text-primary)';
        document.body.append(probe);
        const wanted = { family: getComputedStyle(probe).fontFamily, ink: getComputedStyle(probe).color };
        probe.remove();
        return all.map((el) => {
          const s = getComputedStyle(el);
          return { tag: el.tagName, family: s.fontFamily, transform: s.textTransform, spacing: s.letterSpacing, color: s.color, weight: Number(s.fontWeight), lang: el.closest('[lang]')?.getAttribute('lang'), wanted };
        });
      });
      for (const title of found) {
        expect(title.tag).toBe('H2');
        expect(title.color, 'the strong ink').toBe(title.wanted.ink);
        expect(title.weight).toBeGreaterThanOrEqual(600);
        if (route === '/ar/') {
          expect(title.transform, 'no capitals in Arabic').toBe('none');
          expect(['normal', '0px']).toContain(title.spacing);
        } else {
          expect(title.transform).toBe('uppercase');
          expect(title.family, 'the mono').toBe(title.wanted.family);
          expect(parseFloat(title.spacing), 'spaced capitals').toBeGreaterThan(0);
        }
      }
    });

    for (const width of WIDTHS) {
      test(`${width}px: the titles share their row (${width < 768 ? 'two by two' : 'four columns'}) and the brand is ${width >= 1280 ? 'on the left' : 'above'}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route);
        const y = await tops(page);
        expect(y).toHaveLength(4);
        const same = (a, b) => Math.abs(a - b) <= 1;
        if (width < 768) {
          expect(same(y[0], y[1]), `groups 1 and 2 share a row: ${y}`).toBe(true);
          expect(same(y[2], y[3]), `groups 3 and 4 share a row: ${y}`).toBe(true);
          expect(y[2], 'the second pair is under the first').toBeGreaterThan(y[0] + 1);
        } else {
          expect(y.every((v) => same(v, y[0])), `the four titles share a row: ${y}`).toBe(true);
        }
        const boxes = await page.evaluate(() => {
          const rect = (selector) => {
            const r = document.querySelector(selector)?.getBoundingClientRect();
            return r ? { left: r.left, right: r.right, top: r.top, bottom: r.bottom } : null;
          };
          return { brand: rect('footer .luz-site-footer__brand'), nav: rect('footer .landing-foot-nav') };
        });
        const brand = /** @type {any} */ (boxes.brand);
        const nav = /** @type {any} */ (boxes.nav);
        if (width >= 1280) {
          // In LTR the brand is at the start and the nav after it; in RTL the other way round: either way side by side
          const sideBySide = brand.right <= nav.left + 1 || nav.right <= brand.left + 1;
          expect(sideBySide, 'the brand and the site map share a row').toBe(true);
          if (route !== '/ar/') expect(brand.right, 'the brand is on the left').toBeLessThanOrEqual(nav.left + 1);
        } else {
          expect(brand.bottom, 'the brand sits above the groups').toBeLessThanOrEqual(nav.top + 1);
        }
        const scroll = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(scroll, 'sideways scroll').toBeLessThanOrEqual(0);
      });
    }

    for (const width of [320, 375, 1440]) {
      test(`${width}px: every link of the site map is a target at least 24 px high`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route);
        const links = page.locator('footer .landing-foot-nav a');
        await expect(links).toHaveCount(20);
        const heights = await links.evaluateAll((all) => all.map((a) => ({ text: a.textContent, height: a.getBoundingClientRect().height })));
        for (const link of heights) expect(link.height, link.text ?? '').toBeGreaterThanOrEqual(24);
      });
    }

    test('320px: nothing scrolls sideways', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 900 });
      await page.goto(route);
      const scroll = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(scroll).toBeLessThanOrEqual(0);
      const outside = await page.locator('footer .landing-foot-nav a').evaluateAll((all) => all.filter((a) => a.getBoundingClientRect().right > 320.5 || a.getBoundingClientRect().left < -0.5).map((a) => a.textContent));
      expect(outside, 'links outside the window').toEqual([]);
    });
  });
}

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the site map is there, two by two at 375 px and in four columns at 1100 px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto('/');
    await expect(page.locator('footer .landing-foot-nav a')).toHaveCount(20);
    const narrow = await tops(page);
    expect(Math.abs(narrow[0] - narrow[1])).toBeLessThanOrEqual(1);
    expect(narrow[2]).toBeGreaterThan(narrow[0] + 1);
    await page.setViewportSize({ width: 1100, height: 900 });
    const wide = await tops(page);
    expect(wide.every((v) => Math.abs(v - wide[0]) <= 1)).toBe(true);
  });
});
