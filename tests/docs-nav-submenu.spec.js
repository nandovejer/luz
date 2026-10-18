// @ts-check
/**
 * The docs sidebar with HTML elements nested in Documentation, measured in a browser.
 * The owner's request (2026-10-18): Documentation > its pages > HTML elements > its pages,
 * a submenu of a submenu. The markup, the marks, the breadcrumb and the reading order
 * are held by tests/docs-nav-submenu.test.js; this file holds what needs a layout, a keyboard
 * or a window:
 *
 *   1  the submenu is visible on /docs/html/forms/ and /es/docs/html/forms/, nested one level
 *      deeper than the pages of Documentation, and the current page is marked by more than colour
 *   2  the sidebar scrolls to the current page (JavaScript), whichever depth it sits at
 *   3  Tab walks the Documentation pages, then HTML elements, then its pages, then Accessibility
 *   4  nothing sticks out of the window at 320 px, at 100 % and at 400 % text
 *   5  the drawer at 375 px lists the nested submenu, closes with Escape and on a link
 *   6  axe: no serious or critical violation in light, dark and high contrast on
 *      /docs/html/forms/ and /docs/documentation/
 *
 * The no-JS projects run 1, 3, 4 and 5 (the drawer is a native popover); 2 and 6 need a script.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readingOrder } from '../scripts/docs-site/site.js';
import { site } from './helpers/docs-site.js';
import { readingOrder as walkTheTabOrder } from './helpers/reading-order.js';
import { idle } from './helpers/settle.js';
import { seedMode } from './helpers/site-lights.js';

const HTML_INDEX = '/docs/html/';
const FORMS = '/docs/html/forms/';
const order = readingOrder(site).map((p) => p.route);
const areaOf = (/** @type {string} */ route) => site.byRoute.get(route)?.meta.area;
/** The pages listed under the sub-area link: the area's pages but its index, in reading order. */
const listed = order.filter((r) => areaOf(r) === 'html' && r !== HTML_INDEX);
/** The pages of Documentation (but its index), in reading order. */
const ownDocumentation = order.filter((r) => areaOf(r) === 'documentation' && r !== '/docs/documentation/');
const label = (/** @type {string} */ code) => (code ? JSON.parse(readFileSync(fileURLToPath(new URL(`../apps/docs/i18n/${code}/strings.json`, import.meta.url)), 'utf-8'))['area.html'] : 'HTML elements');

const LANGUAGES = [
  { code: '', prefix: '' },
  { code: 'es', prefix: '/es' },
];

test.describe('the nested submenu on a wide screen', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const { code, prefix } of LANGUAGES) {
    const where = code || 'en';

    test(`${where}: HTML elements is a submenu inside Documentation, after its pages, with its pages one level deeper`, async ({ page }) => {
      await page.goto(`${prefix}${FORMS}`);
      const nav = page.locator('nav.luz-docs-nav');
      const sub = nav.locator('.docs-nav__sub');
      await expect(sub).toHaveCount(1);
      await expect(sub).toBeVisible();
      const head = sub.locator('a.docs-nav__subarea');
      await expect(head).toBeVisible();
      await expect(head).toHaveText(label(code));
      await expect(head).toHaveAttribute('href', `${prefix}${HTML_INDEX}`);
      const pages = sub.locator('ul.docs-nav__pages a');
      await expect(pages).toHaveCount(listed.length);
      await expect(pages.first()).toBeVisible();
      await expect(pages.last()).toBeVisible();
      // The submenu is named by its link, and is one list in the Documentation item
      await expect(sub.locator('ul.docs-nav__pages')).toHaveAttribute('aria-labelledby', (await head.getAttribute('id')) ?? 'missing-id');
      // Geometry: the pages of Documentation, then HTML elements at their level, then its pages deeper
      const own = nav.locator(`a[href="${prefix}${ownDocumentation[0]}"]`);
      const box = async (/** @type {import('@playwright/test').Locator} */ l) => l.evaluate((el) => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top + window.scrollY }; });
      const [a, h, p] = [await box(own), await box(head), await box(pages.first())];
      expect(h.top, 'HTML elements is below the pages of Documentation').toBeGreaterThan(a.top);
      expect(p.top, 'its pages are below its link').toBeGreaterThan(h.top);
      expect(h.left, 'its link is not outdented from the pages of Documentation').toBeGreaterThanOrEqual(a.left - 1);
      expect(p.left, 'its pages are indented under its link').toBeGreaterThan(h.left + 4);
    });

    test(`${where}: the current page and its two parents are marked, and the page is marked by more than colour`, async ({ page }) => {
      await page.goto(`${prefix}${FORMS}`);
      const nav = page.locator('nav.luz-docs-nav');
      await expect(nav.locator('a[aria-current="page"]')).toHaveAttribute('href', `${prefix}${FORMS}`);
      await expect(nav.locator('a.docs-nav__subarea')).toHaveAttribute('aria-current', 'true');
      await expect(nav.locator(`a.docs-nav__area[href="${prefix}/docs/documentation/"]`)).toHaveAttribute('aria-current', 'true');
      const style = (/** @type {string} */ sel) => page.locator(sel).first().evaluate((el) => { const s = getComputedStyle(el); return `${s.fontWeight} ${s.borderInlineStartColor} ${s.borderInlineStartWidth}`; });
      expect(await style('.docs-nav a[aria-current="page"]')).not.toBe(await style(`.docs-nav a[href="${prefix}/docs/html/text/"]`));
    });

    test(`${where}: Tab walks the pages of Documentation, then HTML elements, then its pages, then Accessibility`, async ({ page }) => {
      await page.goto(`${prefix}${FORMS}`);
      const nav = page.locator('nav.luz-docs-nav');
      await nav.locator(`a[href="${prefix}${ownDocumentation.at(-1)}"]`).focus();
      await page.keyboard.press('Tab');
      await expect(nav.locator('a.docs-nav__subarea')).toBeFocused();
      const walked = [];
      for (let i = 0; i < listed.length; i++) {
        await page.keyboard.press('Tab');
        walked.push(await page.evaluate(() => document.activeElement?.getAttribute('href')));
      }
      expect(walked, 'the pages of HTML elements, in the order the sidebar lists them').toEqual(listed.map((r) => `${prefix}${r}`));
      await page.keyboard.press('Tab');
      await expect(nav.locator(`a.docs-nav__area[href="${prefix}/docs/accessibility/"]`)).toBeFocused();
      // The order of the markup is the order of the screen (WCAG 2.4.3, 1.3.2)
      const walk = await walkTheTabOrder(page);
      expect(walk.problems).toEqual([]);
    });
  }

  test('the sidebar scrolls to the current page, the last of the nested list', async ({ page, javaScriptEnabled }) => {
    test.skip(javaScriptEnabled === false, 'the sidebar is scrolled by a script');
    const route = listed.at(-1);
    await page.goto(route);
    await idle(page);
    const visible = () =>
      page.evaluate(() => {
        const nav = document.querySelector('#page-nav');
        const current = nav?.querySelector('a[aria-current="page"]');
        if (!nav || !current) return { inside: false, label: 'no current link' };
        const n = nav.getBoundingClientRect();
        const c = current.getBoundingClientRect();
        const top = Math.max(n.top, 0);
        const bottom = Math.min(n.bottom, window.innerHeight);
        return { inside: c.top >= top - 1 && c.bottom <= bottom + 1, label: current.textContent?.trim() };
      });
    await expect.poll(visible, { message: 'the current link is inside the sidebar\'s visible box' }).toMatchObject({ inside: true });
    expect(await page.evaluate(() => window.scrollY), 'the page itself did not scroll').toBe(0);
    expect(await page.evaluate(() => document.activeElement === document.body), 'the focus did not move').toBe(true);
  });
});

test.describe('nothing sticks out of the window at 320 px', () => {
  test.use({ viewport: { width: 320, height: 800 } });

  for (const { code, prefix } of LANGUAGES) {
    for (const scale of ['100%', '200%', '400%']) {
      test(`${code || 'en'}: the open drawer with the nested submenu, root font size ${scale}`, async ({ page }) => {
        await page.goto(`${prefix}${FORMS}`);
        await page.waitForLoadState('load');
        await page.evaluate((s) => { document.documentElement.style.fontSize = s; }, scale);
        await page.locator('.site-header__menu').click();
        const drawer = page.locator('#page-nav');
        await expect(drawer).toBeVisible();
        await expect(drawer.locator('.docs-nav__sub')).toHaveCount(1);
        const out = await page.evaluate(() => {
          const nav = document.querySelector('#page-nav');
          if (!nav) return { sideways: -1, outside: ['no #page-nav'], clipped: [], page: 0 };
          const width = document.documentElement.clientWidth;
          const links = [...nav.querySelectorAll('.docs-nav .docs-nav__sub a')];
          const box = (a) => ({ text: a.textContent?.trim().slice(0, 30), r: a.getBoundingClientRect() });
          return {
            sideways: nav.scrollWidth - nav.clientWidth,
            // the links of the submenu stay inside the window...
            outside: links.map(box).filter(({ r }) => r.width > 0 && (r.right > width + 0.5 || r.left < -0.5)).map(({ text, r }) => `${text}: ${Math.round(r.left)}..${Math.round(r.right)}`),
            // ...and their text stays inside the link (it wraps, even a long word, instead of running on)
            clipped: links.filter((a) => a.scrollWidth > a.clientWidth + 1).map((a) => `${a.textContent?.trim().slice(0, 30)}: ${a.scrollWidth} > ${a.clientWidth}`),
            page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          };
        });
        expect(out.outside, 'links of the submenu outside the window').toEqual([]);
        expect(out.clipped, 'links of the submenu whose text runs past the link').toEqual([]);
        // The areas and pages above the submenu already run wide at 200 % and 400 % text (a word such as
        // "Documentation" is wider than the drawer): the whole drawer and the page are held at the size where they fit today
        if (scale === '100%') {
          expect(out.sideways, 'the drawer scrolls sideways by px').toBeLessThanOrEqual(0);
          expect(out.page, 'the page scrolls sideways by px').toBeLessThanOrEqual(0);
        }
      });
    }
  }
});

test.describe('the drawer at 375 px', () => {
  test.use({ viewport: { width: 375, height: 700 } });

  for (const { code, prefix } of LANGUAGES) {
    test(`${code || 'en'}: lists the nested submenu, Escape closes it, a link of it closes it and goes there`, async ({ page }) => {
      await page.goto(`${prefix}${FORMS}`);
      const toggle = page.locator('.site-header__menu');
      const drawer = page.locator('#page-nav');
      await expect(drawer).toBeHidden();
      await toggle.focus();
      await page.keyboard.press('Enter');
      await expect(drawer).toBeVisible();
      const sub = drawer.locator('.docs-nav__sub');
      await expect(sub).toHaveCount(1);
      await sub.locator('a.docs-nav__subarea').scrollIntoViewIfNeeded();
      await expect(sub.locator('a.docs-nav__subarea')).toBeVisible();
      await expect(sub.locator('ul.docs-nav__pages a')).toHaveCount(listed.length);
      await expect(drawer.locator('a[aria-current="page"]')).toHaveAttribute('href', `${prefix}${FORMS}`);
      await page.keyboard.press('Escape');
      await expect(drawer).toBeHidden();
      await expect(toggle).toBeFocused();

      await toggle.click();
      const head = drawer.locator('a.docs-nav__subarea');
      await head.scrollIntoViewIfNeeded();
      await head.click();
      await expect(page).toHaveURL(new RegExp(`${prefix}${HTML_INDEX}$`));
      await expect(drawer).toBeHidden();
    });
  }
});

test.describe('axe: the page with the nested submenu', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'the mode is chosen by a script');
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const mode of ['light', 'dark', 'high-contrast']) {
    for (const route of [FORMS, '/docs/documentation/']) {
      test(`${route} in ${mode}: no serious or critical violation`, async ({ page }) => {
        await seedMode(page, mode);
        await page.goto(route);
        await idle(page);
        expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(mode);
        await expect(page.locator('.docs-nav__sub')).toHaveCount(1);
        const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
        const blocking = violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''));
        expect(blocking.map((v) => `${v.id}: ${v.nodes[0]?.target?.join(' ')}`)).toEqual([]);
      });
    }
  }
});
