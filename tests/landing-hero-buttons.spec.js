// @ts-check
/**
 * The three buttons of the home's hero, in `.o-actions`, in this order of the SOURCE: "Get started" (outline, to the
 * levels, #inside), "Get started with AI" (primary, `.landing-hero__ai`, to the prompts, #inside-4, with a robot icon
 * that adds no name) and "Read the docs" (outline, to /docs/). They are anchors: they work with no script.
 *
 * The source order is not the visual order on a phone, on purpose (owner, 2026-10-30): at 640 px and below the AI
 * button is placed first on the screen by CSS `order: -1`; from 641 px the visual order is the source order, also in
 * Arabic (right to left). The keyboard follows the DOM at every width. The deviation is written in PRINCIPLES.md
 * section 7 and listed as a known issue in the accessibility statement (WCAG 2.4.3 and 1.3.2).
 *
 * No sideways scroll at 320 px, nor at 400 % zoom.
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
    test(`${route}: three buttons in the source order outline, primary (AI), outline, with their names`, async ({ page }) => {
      await page.goto(route);
      const words = CATALOG(code);
      await expect(page.locator('#hero .o-actions')).toHaveCount(1);
      await expect(buttons(page)).toHaveCount(3);
      await expect(buttons(page).nth(0)).toHaveClass(/\bluz-btn--outline\b/);
      await expect(buttons(page).nth(1)).toHaveClass(/\bluz-btn--primary\b/);
      await expect(buttons(page).nth(1)).toHaveClass(/\blanding-hero__ai\b/);
      await expect(buttons(page).nth(2)).toHaveClass(/\bluz-btn--outline\b/);
      await expect(page.locator('#hero .o-actions .landing-hero__ai'), 'only the second button is the AI one').toHaveCount(1);
      await expect(page.locator('#hero .o-actions .luz-btn--primary'), 'only the AI button is primary').toHaveCount(1);
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

    test(`${route}: the AI button has a robot icon from the page's sprite that adds no name`, async ({ page }) => {
      await page.goto(route);
      const words = CATALOG(code);
      const ai = buttons(page).nth(1);
      const svg = ai.locator('svg');
      await expect(svg).toHaveCount(1);
      await expect(svg).toHaveAttribute('aria-hidden', 'true');
      await expect(svg.locator('use')).toHaveAttribute('href', '#i13');
      await expect(page.locator('symbol#i13'), 'the symbol exists once in the page').toHaveCount(1);
      const box = await svg.boundingBox();
      expect(box?.width ?? 0, 'the icon is drawn').toBeGreaterThan(8);
      expect(box?.height ?? 0, 'the icon is drawn').toBeGreaterThan(8);
      expect((await ai.evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ').trim(), 'the icon adds no text').toBe(words['hero.start-ai']);
      // The sprite is out of the way: the other buttons have no icon
      await expect(buttons(page).nth(0).locator('svg')).toHaveCount(0);
      await expect(buttons(page).nth(2).locator('svg')).toHaveCount(0);
    });

    test(`${route}: the AI button lands on the prompts section from the keyboard, with no script`, async ({ page }) => {
      await page.goto(route);
      await buttons(page).nth(1).focus();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/#inside-4$/);
      await expect(page.locator('#inside-4')).toBeInViewport();
    });

    test(`${route}: Tab goes through the buttons in the order of the DOM, at any width`, async ({ page }) => {
      for (const width of [1280, 375]) {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(route);
        await buttons(page).nth(0).focus();
        const seen = [];
        for (let step = 0; step < 3; step += 1) {
          seen.push(await page.evaluate(() => [...document.querySelectorAll('#hero .o-actions > a.luz-btn')].indexOf(/** @type {Element} */ (document.activeElement))));
          await page.keyboard.press('Tab');
        }
        expect(seen, `the focus order at ${width} px`).toEqual([0, 1, 2]);
      }
    });
  }
});

test.describe('the hero buttons: the visual order', () => {
  /** Rows from the top, and along a row from the inline start: the indexes of the DOM, as a reader sees them. */
  const visualOrder = async (page, dir) => {
    const rects = await buttons(page).evaluateAll((els) => els.map((el, index) => ({ index, ...el.getBoundingClientRect().toJSON() })));
    return [...rects].sort((a, b) => (Math.abs(a.top - b.top) > 4 ? a.top - b.top : dir === 'rtl' ? b.right - a.right : a.left - b.left)).map((r) => r.index);
  };

  for (const [route, , dir] of ROUTES) {
    for (const [width, height] of [[375, 800], [320, 700]]) {
      test(`${route} at ${width} px: one column, the AI button first, then Get started, then the docs`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto(route);
        const rects = await buttons(page).evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON()));
        const tops = rects.map((r) => r.top);
        expect(new Set(rects.map((r) => Math.round(r.left))).size, 'one column: the same start edge').toBe(1);
        expect(tops[1] < tops[0] && tops[0] < tops[2], `top to bottom: AI, Get started, docs (tops ${tops})`).toBe(true);
        expect(await visualOrder(page, dir), 'the visual order').toEqual([1, 0, 2]);
      });
    }

    for (const [width, height] of [[1280, 800], [768, 900]]) {
      test(`${route} at ${width} px: the visual order is the order of the source${dir === 'rtl' ? ', from the right' : ''}`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto(route);
        expect(await visualOrder(page, dir), 'the visual order').toEqual([0, 1, 2]);
      });
    }
  }

  test('the order of the AI button is moved by the style sheet only at 640 px and below', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 800 });
    await page.goto('/');
    expect(await page.locator('.landing-hero__ai').evaluate((el) => getComputedStyle(el).order)).toBe('-1');
    await page.setViewportSize({ width: 641, height: 800 });
    expect(await page.locator('.landing-hero__ai').evaluate((el) => getComputedStyle(el).order)).toBe('0');
  });
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
