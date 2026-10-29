// @ts-check
/**
 * The three buttons of the home's hero, in `.o-actions`: "Get started" (primary, to the levels, #inside), "Get started
 * with AI" (secondary, to the prompts, #inside-4) and "Read the docs" (outline, to /docs/). The third is new, and the
 * order of the source is the order a reader sees, also when they wrap and in the Arabic page. They are anchors:
 * they work with no script. No sideways scroll at 320 px, nor at 400 % zoom.
 *
 * Runs in `chromium` and `chromium-nojs`.
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { focusAndHitTest } from './helpers/obscured.js';

const CATALOG = (code) => JSON.parse(readFileSync(new URL(`../apps/landing/i18n/${code}.json`, import.meta.url), 'utf-8'));
const ROUTES = [['/', 'en', 'ltr'], ['/es/', 'es', 'ltr'], ['/ar/', 'ar', 'rtl']];
const buttons = (page) => page.locator('#hero .o-actions > a.luz-btn');

test.describe('the hero buttons', () => {
  for (const [route, code] of ROUTES) {
    test(`${route}: three buttons in the order primary, secondary, outline, with their names`, async ({ page }) => {
      await page.goto(route);
      const words = CATALOG(code);
      await expect(page.locator('#hero .o-actions')).toHaveCount(1);
      await expect(buttons(page)).toHaveCount(3);
      await expect(buttons(page).nth(0)).toHaveClass(/\bluz-btn--primary\b/);
      await expect(buttons(page).nth(1)).toHaveClass(/\bluz-btn--secondary\b/);
      await expect(buttons(page).nth(2)).toHaveClass(/\bluz-btn--outline\b/);
      for (const index of [0, 1, 2]) await expect(buttons(page).nth(index), `button ${index + 1} is large like the first`).toHaveClass(/\bluz-btn--lg\b/);
      await expect(buttons(page)).toHaveText([words['hero.start'], words['hero.start-ai'], words['hero.docs']]);
    });

    test(`${route}: they go to the levels, to the prompts and to the docs, and the prompts are on the page`, async ({ page }) => {
      await page.goto(route);
      await expect(buttons(page).nth(0)).toHaveAttribute('href', '#inside');
      await expect(buttons(page).nth(1)).toHaveAttribute('href', '#inside-4');
      await expect(buttons(page).nth(2)).toHaveAttribute('href', /\/docs\/$/);
      await expect(page.locator('#inside')).toHaveCount(1);
      await expect(page.locator('#inside-4')).toHaveCount(1);
    });

    test(`${route}: the second button lands on the prompts section from the keyboard, with no script`, async ({ page }) => {
      await page.goto(route);
      await buttons(page).nth(1).focus();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/#inside-4$/);
      await expect(page.locator('#inside-4')).toBeInViewport();
    });
  }
});

test.describe('the hero buttons: the source order is the visual order', () => {
  for (const [route, , dir] of ROUTES) {
    for (const [width, height] of [[1280, 800], [768, 900], [375, 800], [320, 700]]) {
      test(`${route} at ${width} px: the buttons are placed ${dir === 'rtl' ? 'from the right' : 'from the left'}, row by row, in the order of the source`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto(route);
        const rects = await buttons(page).evaluateAll((els) => els.map((el, index) => ({ index, ...el.getBoundingClientRect().toJSON() })));
        // Read like a page: rows from the top, and along a row from the inline start
        const rowsFirst = [...rects].sort((a, b) => (Math.abs(a.top - b.top) > 4 ? a.top - b.top : dir === 'rtl' ? b.right - a.right : a.left - b.left));
        expect(rowsFirst.map((r) => r.index), 'the visual order').toEqual([0, 1, 2]);
      });
    }
  }
});

test.describe('the hero buttons: nothing is drawn over them', () => {
  // The light under the hero reaches up behind it on a phone (a negative margin): the buttons must still take the pointer
  for (const [route] of ROUTES) {
    for (const [width, height] of [[1280, 720], [1024, 700], [768, 900], [390, 844], [320, 568]]) {
      test(`${route} at ${width} x ${height}: each button is the element under its own centre and ends`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto(route);
        for (let index = 0; index < (await buttons(page).count()); index += 1) {
          const result = await focusAndHitTest(buttons(page).nth(index));
          expect(result.focused, `button ${index + 1} takes focus`).toBe(true);
          expect(result.covered, `what is drawn over button ${index + 1}`).toEqual([]);
        }
      });
    }
  }
});

test.describe('the hero buttons: they fit', () => {
  for (const [route] of ROUTES) {
    for (const width of [320, 400]) {
      test(`${route} at ${width} px (400 % zoom of a desktop window): every button is inside the window and nothing scrolls sideways`, async ({ page }) => {
        await page.setViewportSize({ width, height: 700 });
        await page.goto(route);
        const { rects, overflow, inner } = await page.evaluate(() => ({
          rects: [...document.querySelectorAll('#hero .o-actions > a.luz-btn')].map((el) => el.getBoundingClientRect().toJSON()),
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          inner: document.documentElement.clientWidth,
        }));
        expect(rects).toHaveLength(3);
        for (const r of rects) {
          expect(r.left, 'inside, on the left').toBeGreaterThanOrEqual(-0.5);
          expect(r.right, 'inside, on the right').toBeLessThanOrEqual(inner + 0.5);
        }
        expect(overflow).toBeLessThanOrEqual(0);
      });
    }
  }

  test('at 400 % zoom (a 1280 px window seen at 320 css px) the three buttons wrap and the page does not scroll sideways', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 320, height: 200 }, deviceScaleFactor: 4 });
    const page = await context.newPage();
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    await expect(buttons(page).nth(2)).toBeVisible();
    await context.close();
  });
});
