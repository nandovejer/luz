// @ts-check
/**
 * The Privacy and storage page, /docs/privacy/ and /es/docs/privacy/ (its sources and its table are
 * tests/privacy-page.test.js). In `chromium` and `chromium-nojs`:
 *
 * - With JavaScript, a visitor with no stored answer is asked about YouTube videos in the band at the end of the
 *   window; Accept and Reject are the same button (same classes, same height, same colors); answering writes
 *   `luz-consent` and no other key; with an answer stored the band stays away and the button in #cookie-settings
 *   brings it back.
 * - Without JavaScript the page reads in full: the band and the button stay hidden, every section and the table of
 *   keys show, and nothing is stored.
 * - With the band shown: axe finds nothing serious in light, dark and high contrast (axe is a script, so with
 *   JavaScript only). In both: nothing scrolls sideways at 320 px.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

import { faded } from './helpers/settle.js';

const PAGES = [
  { route: '/docs/privacy/', lang: 'en' },
  { route: '/es/docs/privacy/', lang: 'es' },
];
const KEY = 'luz-consent';
const THEMES = ['light', 'dark', 'high-contrast'];
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const BAND = 'luz-cookie-consent section.luz-cookie-consent';
const jsOff = () => test.info().project.use.javaScriptEnabled === false;

const keys = (page) => page.evaluate(() => Object.keys(localStorage).sort());
const stored = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), KEY);
const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const { route, lang } of PAGES) {
  test.describe(`${route}`, () => {
    test('reads in full: the sections, the table of keys and the contact, whatever the script does', async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('h1')).toBeVisible();
      for (const id of ['who', 'hosting', 'storage', 'videos', 'cookie-settings', 'questions']) await expect(page.locator(`h2#${id}`), id).toBeVisible();
      const rows = page.locator('h2#storage ~ div table tbody tr');
      expect(await rows.locator('code').first().textContent()).toBe('luz-theme');
      await expect(page.locator('main a[href="https://github.com/nandovejer/luz/issues"]')).toHaveCount(1);
    });

    test.describe('without JavaScript', () => {
      test.skip(() => !jsOff(), 'the state without JavaScript');

      test('the band and the button that reopens it stay hidden, and nothing is stored', async ({ page }) => {
        await page.goto(route);
        await expect(page.locator(BAND)).toHaveCount(1);
        await expect(page.locator(BAND)).toBeHidden();
        await expect(page.locator('h2#cookie-settings ~ p [data-luz-consent-open]')).toHaveCount(1);
        await expect(page.locator('h2#cookie-settings ~ p [data-luz-consent-open]')).toBeHidden();
        expect((await keys(page)).filter((k) => k !== 'luz-light')).toEqual([]);
      });
    });

    test.describe('with JavaScript', () => {
      test.skip(() => jsOff(), 'needs JavaScript');

      test('asks a visitor who has not answered, in a band that offers YouTube as the one category', async ({ page }) => {
        await page.goto(route);
        const band = page.locator(BAND);
        await expect(band).toBeVisible();
        await expect(band.locator('[data-luz-consent-ask]')).toBeVisible();
        await expect(band.locator('input[type=checkbox]')).toHaveCount(1);
        await expect(band.locator('input[type=checkbox]')).toHaveAttribute('value', 'youtube');
        expect(await band.locator('input[type=checkbox]').evaluate((input) => /** @type {HTMLInputElement} */ (input).checked), 'not ticked').toBe(false);
        await expect(page.locator('luz-cookie-consent')).toHaveCount(1);
      });

      test('Accept and Reject are the same button: same classes, height, font and colors', async ({ page }) => {
        await page.goto(route);
        await expect(page.locator(BAND)).toBeVisible();
        const look = (value) => page.locator(`${BAND} [data-luz-consent-ask] > form button[value="${value}"]`).evaluate((el) => {
          const s = getComputedStyle(el);
          return {
            classes: el.className,
            height: Math.round(el.getBoundingClientRect().height * 10) / 10,
            fontSize: s.fontSize,
            fontWeight: s.fontWeight,
            color: s.color,
            background: s.backgroundColor,
            border: s.borderTopWidth + s.borderTopColor,
            visible: el.getBoundingClientRect().width > 0,
          };
        });
        const accept = await look('all');
        const reject = await look('none');
        expect(accept.visible && reject.visible).toBe(true);
        expect(accept.classes).toContain('luz-btn--primary');
        expect(reject).toEqual({ ...accept, classes: reject.classes, height: reject.height, visible: true });
        expect(reject.classes).toBe(accept.classes);
        expect(Math.abs(reject.height - accept.height)).toBeLessThanOrEqual(1);
      });

      for (const [value, granted] of [['all', ['youtube']], ['none', []]]) {
        test(`answering ${value === 'all' ? 'Accept' : 'Reject'} writes ${KEY} and no other key, and says the answer is saved`, async ({ page }) => {
          await page.goto(route);
          const before = await keys(page);
          expect(before).not.toContain(KEY);
          await expect(page.locator(BAND)).toBeVisible();
          await page.locator(`${BAND} [data-luz-consent-ask] > form button[value="${value}"]`).click();
          await expect(page.locator(`${BAND} [data-luz-consent-done]`)).toBeVisible();
          expect(await keys(page)).toEqual([...before, KEY].sort());
          const answer = await stored(page);
          expect(answer.asked).toEqual(['youtube']);
          expect(answer.granted).toEqual(granted);
          expect(answer.expires).toBeGreaterThan(Date.now());
        });
      }

      test('with an answer stored the band stays away, and the button in #cookie-settings asks again', async ({ page }) => {
        await page.addInitScript((k) => {
          if (!sessionStorage.getItem('seeded')) {
            localStorage.setItem(k, JSON.stringify({ version: 1, asked: ['youtube'], granted: [], expires: Date.now() + 864e5 }));
            sessionStorage.setItem('seeded', '1');
          }
        }, KEY);
        await page.goto(route);
        const open = page.locator('h2#cookie-settings ~ p [data-luz-consent-open]');
        await expect(open).toBeVisible();
        await expect(page.locator(BAND)).toBeHidden();
        await open.click();
        await expect(page.locator(BAND)).toBeVisible();
        await expect(page.locator(`${BAND} [data-luz-consent-ask]`)).toBeVisible();
      });
    });

    test('nothing scrolls sideways at 320 px, with the band shown or not', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto(route);
      await expect(page.locator('h2#storage')).toBeVisible();
      if (!jsOff()) await expect(page.locator(BAND)).toBeVisible();
      expect(await sideways(page)).toBeLessThanOrEqual(0);
    });

    for (const theme of THEMES) {
      test(`axe: nothing serious or critical in ${theme}`, async ({ page }) => {
        test.skip(jsOff(), 'axe runs a script in the page');
        await page.goto(route);
        await expect(page.locator(BAND)).toBeVisible();
        await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
        await faded(page);
        await page.waitForTimeout(400);
        const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
        const blocking = violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''));
        expect(blocking.map((v) => `${v.impact} ${v.id}: ${v.nodes[0]?.target?.join(' ')}`), `${lang} ${theme}`).toEqual([]);
      });
    }
  });
}
