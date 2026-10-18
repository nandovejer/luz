// @ts-check
/**
 * The footer of the home page and of the docs (F2 of
 * .claude/plans/luz-home-docs-identity.md, section 3.4): the color mode
 * switcher is <luz-mode remember by="clock"> around core's fieldset, with
 * Light, Dark and High contrast (no Auto since 2026-10-18: the light follows
 * the hour, or the hour the home's globe pinned, until a mode is chosen, and
 * then no radio is checked), an icon in every label, an icon per state in the
 * cycle button (Auto's while no radio is checked), and the choice stored
 * under core's "luz-theme" key. "luz-site-mode" is never written.
 *
 * The footer is one partial (apps/site/_partials/footer.html) on the docs and
 * written again in apps/landing/index.html, in three languages.
 */
import { test, expect } from '@playwright/test';
import { KEY, NO_CHOICE, TIMEZONE, atTime } from './helpers/site-lights.js';

test.use({ timezoneId: TIMEZONE, storageState: NO_CHOICE });

const PAGES = ['/', '/es/', '/ar/', '/docs/', '/docs/components/button/'];
const VALUES = ['light', 'dark', 'high-contrast'];

/** Record every key the page writes to localStorage, from the first script on. */
const recordWrites = (page) =>
  page.addInitScript(() => {
    const w = /** @type {any} */ (window);
    w.__writes = [];
    const set = window.Storage.prototype.setItem;
    window.Storage.prototype.setItem = function (key, value) {
      w.__writes.push(key);
      return set.call(this, key, value);
    };
  });
const writes = (page) => page.evaluate(() => /** @type {any} */ (window).__writes);

test.describe('the markup of the footer, as served', () => {
  for (const path of PAGES) {
    test(`${path}: <luz-mode remember by="clock"> wraps the fieldset, three radios, none checked`, async ({ request }) => {
      const html = await (await request.get(path)).text();
      // The footer that holds the switcher, not the first <footer> of the page (a demo may have one)
      const footer = [...html.matchAll(/<footer\b[\s\S]*?<\/footer>/g)].map((m) => m[0]).find((f) => f.includes('<luz-mode')) ?? '';
      expect(footer, 'a <footer> with <luz-mode> in it').not.toBe('');
      expect(footer).toMatch(/<luz-mode\b[^>]*\bremember\b[^>]*>/);
      expect(footer).toMatch(/<luz-mode\b[^>]*\bby="clock"[^>]*>/);
      const group = footer.slice(footer.indexOf('<luz-mode'), footer.indexOf('</luz-mode>'));
      expect(group, 'the fieldset is inside the element').toContain('<fieldset');
      const radios = [...group.matchAll(/<input\b[^>]*type="radio"[^>]*>/g)].map((m) => m[0]);
      expect(radios.map((r) => r.match(/value="([^"]+)"/)?.[1])).toEqual(VALUES);
      // The attribute, not aria-checked or data-checked
      const checked = (r) => /\schecked(?=[\s>=/])/.test(r);
      expect(radios.filter(checked)).toHaveLength(0);
      // The cycle button is in the markup with an icon per state
      const button = group.match(/<button\b[^>]*luz-mode-cycle[\s\S]*?<\/button>/)?.[0] ?? '';
      expect(button, 'the cycle button').not.toBe('');
      expect([...button.matchAll(/data-mode-icon="([^"]+)"/g)].map((m) => m[1])).toEqual(['auto', ...VALUES]);
    });
  }
});

test.describe('the footer in the page', () => {
  for (const path of PAGES) {
    test(`${path}: three radios in <luz-mode>, none checked on a first visit, an icon in every label, and the cycle button shows Auto's`, async ({ page }) => {
      await atTime(page, '14:00');
      await page.goto(path);
      await expect.poll(() => page.evaluate(() => !!customElements.get('luz-mode'))).toBe(true);

      const mode = page.locator('footer luz-mode[remember][by="clock"]');
      await expect(mode).toHaveCount(1);
      await expect(mode.locator('fieldset.luz-mode-switcher')).toHaveCount(1);
      const radios = mode.locator('input[name="luz-theme"]');
      await expect(radios).toHaveCount(3);
      expect(await radios.evaluateAll((all) => all.map((r) => /** @type {HTMLInputElement} */ (r).value))).toEqual(VALUES);
      await expect(mode.locator('input:checked')).toHaveCount(0);
      // Exactly one group drives the tokens of the page
      await expect(page.locator('input[name="luz-theme"]')).toHaveCount(3);

      const labels = mode.locator('label.luz-mode-btn');
      await expect(labels).toHaveCount(3);
      for (const label of await labels.all()) {
        await expect(label.locator('.luz-mode-btn__icon'), await label.innerText()).toHaveCount(1);
        expect((await label.innerText()).trim().length, 'the label has a text').toBeGreaterThan(0);
      }

      const button = mode.locator('.luz-mode-cycle');
      await expect(button).toHaveCount(1);
      await expect(button.locator('[data-mode-icon]')).toHaveCount(4);
      const shown = await button.locator('[data-mode-icon]').evaluateAll((icons) => icons.filter((i) => getComputedStyle(i).display !== 'none').map((i) => i.getAttribute('data-mode-icon')));
      expect(shown).toEqual(['auto']);
    });
  }
});

test.describe('the choice', () => {
  for (const path of ['/', '/docs/']) {
    test(`${path}: the cycle goes from no choice to Light, Dark, High contrast and back to Light`, async ({ page }) => {
      await atTime(page, '14:00');
      await page.goto(path);
      await expect.poll(() => page.evaluate(() => !!customElements.get('luz-mode'))).toBe(true);
      const button = page.locator('footer .luz-mode-cycle');
      // No radio is checked while the hour leads: core names no current mode
      await expect(button).toHaveAccessibleName('Change color mode. Current: —');
      for (const [value, label] of [['light', 'Light'], ['dark', 'Dark'], ['high-contrast', 'High contrast'], ['light', 'Light']]) {
        await button.click();
        await expect(page.locator('input[name="luz-theme"]:checked')).toHaveValue(value);
        await expect(button).toHaveAccessibleName(`Change color mode. Current: ${label}`);
      }
    });

    test(`${path}: choosing Dark stores luz-theme, and the next choice replaces it; luz-site-mode is never written`, async ({ page }) => {
      await atTime(page, '14:00');
      await recordWrites(page);
      await page.goto(path);
      await expect.poll(() => page.evaluate(() => !!customElements.get('luz-mode'))).toBe(true);
      const button = page.locator('footer .luz-mode-cycle');

      expect(await page.evaluate((k) => localStorage.getItem(k), KEY), 'nothing is stored before a choice').toBeNull();
      await button.click(); // Light
      await button.click(); // Dark
      expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
      expect(await page.evaluate(() => document.documentElement.dataset.light)).toBe('night');
      expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBe('dark');

      // The choice follows the visitor
      await page.reload();
      await expect.poll(() => page.evaluate(() => !!customElements.get('luz-mode'))).toBe(true);
      expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
      await expect(page.locator('input[name="luz-theme"]:checked')).toHaveValue('dark');

      await button.click(); // High contrast
      await button.click(); // Light
      await expect(page.locator('input[name="luz-theme"]:checked')).toHaveValue('light');
      expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBe('light');

      expect(await page.evaluate(() => localStorage.getItem('luz-site-mode'))).toBeNull();
      expect(await writes(page)).not.toContain('luz-site-mode');
    });

    test(`${path}: a choice made with the keyboard on the cycle button`, async ({ page }) => {
      await atTime(page, '14:00');
      await page.goto(path);
      await expect.poll(() => page.evaluate(() => !!customElements.get('luz-mode'))).toBe(true);
      await page.locator('footer .luz-mode-cycle').focus();
      await page.keyboard.press('Enter');
      await page.keyboard.press('Space');
      expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
      expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBe('dark');
    });
  }
});
