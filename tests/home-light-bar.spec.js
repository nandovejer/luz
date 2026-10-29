// @ts-check
/**
 * The bar of <home-light> on the home page, now catalog's <luz-theme-time variant="bar">
 * (the theme-mode plan, 2026-10-29, section 5):
 *
 *   - the bar is the slider alone: `.home-light__bar` has one child, `.luz-theme-time__bar`; the hour, the place,
 *     the "Saved" note and the name of the moment are not displayed;
 *   - it is CLOSED at rest at every width (the desktop's "always open at 70 %" is gone) and the sentence button,
 *     `.home-light__line`, opens and closes it (`aria-expanded`); Escape closes it and gives focus back to the sentence
 *     (Escape on the slider lets go of a pinned hour first, and goes on to close the bar when nothing is pinned);
 *   - pinning is announced through a visually hidden status;
 *   - the layout does not jump when it opens (the page, the visual, the hero's buttons and the sentence stay where
 *     they are), nothing the bar covers is a button of the hero, and the page does not scroll sideways.
 *
 * The hour is the page's clock (14:00 in Madrid), and the globe is stopped by reduced motion (RL-8): these tests
 * are about the bar.
 */
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { NO_CHOICE, TIMEZONE, atTime } from './helpers/site-lights.js';
import { isVisuallyHidden } from './helpers/theme-time.js';

test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript');
test.use({ timezoneId: TIMEZONE, storageState: NO_CHOICE });

const catalog = (lang) => JSON.parse(readFileSync(new URL(`../apps/landing/i18n/${lang}.json`, import.meta.url), 'utf-8'));
const ROUTES = [
  ['/', 'en'],
  ['/es/', 'es'],
];
const WIDTHS = [
  [1280, 800],
  [1024, 768],
  [768, 900],
  [360, 740],
];

const line = (page) => page.locator('home-light .home-light__line');
const bar = (page) => page.locator('home-light .home-light__bar');
const slider = (page) => page.locator('home-light .luz-theme-time__slider');

async function open(page, path = '/', [width, height] = WIDTHS[0]) {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await atTime(page, '14:00');
  await page.goto(path);
  await expect(line(page)).toBeVisible();
  await expect(page.locator('home-light').locator('home-globe').filter({ visible: true })).toHaveCount(1);
  // The chunk of the bar builds it inside the (hidden) element
  await expect(page.locator('home-light .home-light__bar > .luz-theme-time__bar')).toHaveCount(1);
}

test.describe('closed at rest, at every width', () => {
  for (const [width, height] of WIDTHS) {
    test(`${width} px: the bar is closed and the sentence says so`, async ({ page }) => {
      await open(page, '/', [width, height]);
      await expect(bar(page)).toBeHidden();
      await expect(line(page)).toHaveAttribute('aria-expanded', 'false');
    });

    test(`${width} px: the sentence opens it and closes it`, async ({ page }) => {
      await open(page, '/', [width, height]);
      await line(page).click();
      await expect(bar(page)).toBeVisible();
      await expect(line(page)).toHaveAttribute('aria-expanded', 'true');
      await expect(slider(page)).toBeVisible();
      await line(page).click();
      await expect(bar(page)).toBeHidden();
      await expect(line(page)).toHaveAttribute('aria-expanded', 'false');
    });
  }

  test('a hover-capable desktop does not keep it open either: after a pointer moves over the visual it is still closed', async ({ page }) => {
    await open(page, '/', WIDTHS[0]);
    await page.mouse.move(640, 500);
    await page.mouse.move(700, 560);
    await expect(bar(page)).toBeHidden();
  });

  test('the keyboard opens it from the sentence: Enter, and Escape closes it and gives focus back to the sentence', async ({ page }) => {
    await open(page, '/', WIDTHS[2]);
    await line(page).focus();
    await page.keyboard.press('Enter');
    await expect(bar(page)).toBeVisible();
    await slider(page).focus();
    await page.keyboard.press('Escape');
    await expect(bar(page)).toBeHidden();
    await expect(line(page)).toBeFocused();
    await expect(line(page)).toHaveAttribute('aria-expanded', 'false');
  });

  test('a press outside the bar and the sentence closes it', async ({ page }) => {
    await open(page, '/', WIDTHS[2]);
    await line(page).click();
    await expect(bar(page)).toBeVisible();
    await page.mouse.click(8, 8);
    await expect(bar(page)).toBeHidden();
  });
});

test.describe('the bar is the slider alone', () => {
  for (const [path, lang] of ROUTES) {
    test(`${lang}: one child, only the slider on screen, with its name and "moment, hour"`, async ({ page }) => {
      await open(page, path, WIDTHS[2]);
      await line(page).click();
      await expect(bar(page)).toBeVisible();
      expect(await bar(page).evaluate((el) => [...el.children].map((c) => c.className))).toEqual(['luz-theme-time__bar']);
      for (const part of ['hour', 'where']) await expect(page.locator(`home-light .luz-theme-time__${part}`)).toBeHidden();
      await expect(page.locator('home-light .luz-theme-time__moments')).toHaveCount(0);
      await expect(page.locator('home-light .luz-theme-time__moment')).toHaveCount(0);
      const scrub = catalog(lang)['light.scrub'];
      await expect(page.getByRole('slider', { name: scrub })).toBeVisible();
      // The moment and the hour, for a screen reader: "Afternoon light, 14:00" in the language of the page
      const value = await slider(page).getAttribute('aria-valuetext');
      expect(value, 'moment, hour').toMatch(/^.+, 14:00$/);
      expect(value.split(',')[0].trim().length).toBeGreaterThan(2);
    });
  }

  test('no text of the bar is on screen: the visible text of the bar is empty', async ({ page }) => {
    await open(page, '/', WIDTHS[2]);
    await line(page).click();
    const shown = await bar(page).evaluate((el) => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const seen = [];
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent.trim()) continue;
        const parent = node.parentElement;
        const box = parent.getBoundingClientRect();
        if (parent.checkVisibility() && box.width > 1 && box.height > 1) seen.push(node.textContent.trim());
      }
      return seen;
    });
    expect(shown).toEqual([]);
  });
});

test.describe('pinning is announced', () => {
  for (const [path, lang] of ROUTES) {
    test(`${lang}: a pinned hour writes the page's own words into a status that is visually hidden`, async ({ page }) => {
      await open(page, path, WIDTHS[2]);
      await line(page).click();
      const status = page.locator('home-light .luz-theme-time__saved');
      await expect(status).toHaveAttribute('role', 'status');
      await slider(page).focus();
      await page.keyboard.press('ArrowRight');
      await expect(status).toContainText(catalog(lang)['light.saved']);
      expect(await isVisuallyHidden(status), 'nothing of it on screen').toBe(true);
      expect(await page.evaluate(() => localStorage.getItem('luz-light'))).toBe('845');
    });
  }

  test('the hour is the page\'s until a mode is chosen: Escape on the slider lets go of it and the bar stays open', async ({ page }) => {
    await open(page, '/', WIDTHS[2]);
    await line(page).click();
    await slider(page).focus();
    await page.keyboard.press('ArrowRight');
    expect(await page.evaluate(() => localStorage.getItem('luz-light'))).toBe('845');
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => localStorage.getItem('luz-light')), 'let go').toBeNull();
    await expect(bar(page), 'the first Escape did not close the bar').toBeVisible();
    await page.keyboard.press('Escape');
    await expect(bar(page)).toBeHidden();
    await expect(line(page)).toBeFocused();
  });
});

test.describe('the layout does not jump when it opens', () => {
  for (const [width, height] of WIDTHS) {
    test(`${width} px: the page, the visual, the hero's buttons and the sentence stay where they are; no sideways scroll; no hero button under the bar`, async ({ page }) => {
      await open(page, '/', [width, height]);
      const measure = () =>
        page.evaluate(() => {
          const at = (selector) => [...document.querySelectorAll(selector)].map((el) => {
            const box = el.getBoundingClientRect();
            return [Math.round(box.top + window.scrollY), Math.round(box.left), Math.round(box.width), Math.round(box.height)];
          });
          return {
            page: document.documentElement.scrollHeight,
            wide: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            visual: at('home-light'),
            sentence: at('home-light .home-light__line'),
            heroButtons: at('.luz-hero .luz-btn'),
          };
        });
      const closed = await measure();
      expect(closed.heroButtons.length, 'the hero has its buttons').toBeGreaterThan(0);
      expect(closed.wide, 'closed: pixels beyond the window').toBeLessThanOrEqual(0);
      await line(page).click();
      await expect(bar(page)).toBeVisible();
      const opened = await measure();
      expect(opened.page, 'the height of the page').toBe(closed.page);
      expect(opened.visual, 'the visual').toEqual(closed.visual);
      expect(opened.sentence, 'the sentence').toEqual(closed.sentence);
      expect(opened.heroButtons, 'the hero\'s buttons').toEqual(closed.heroButtons);
      expect(opened.wide, 'open: pixels beyond the window').toBeLessThanOrEqual(0);
      // Nothing the bar covers is a button of the hero
      const covered = await page.evaluate(() => {
        const box = document.querySelector('home-light .home-light__bar').getBoundingClientRect();
        return [...document.querySelectorAll('.luz-hero .luz-btn')].filter((button) => {
          const b = button.getBoundingClientRect();
          return b.left < box.right && b.right > box.left && b.top < box.bottom && b.bottom > box.top;
        }).length;
      });
      expect(covered, 'hero buttons under the bar').toBe(0);
    });
  }
});
