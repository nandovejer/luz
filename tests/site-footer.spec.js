// @ts-check
/**
 * The footer of the home page and of the docs (F2 of
 * .claude/plans/luz-home-docs-identity.md, section 3.4; the theme-mode plan,
 * 2026-10-29): the color mode switcher is <luz-theme-time> around core's
 * <luz-theme-mode> and its fieldset, with Auto, Light, Dark and High contrast
 * (Auto checked: the light follows the hour, or the hour the home's bar pinned,
 * until a mode is chosen), an icon in every label, the six moments of the day
 * declared after it, the round button of core, and the choice stored under
 * core's "luz-theme" key. "luz-site-mode" is never written.
 *
 * The footer is one partial (apps/site/_partials/footer.html) on the docs and
 * written again in apps/landing/index.html, in three languages.
 */
import { test, expect } from '@playwright/test';
import { KEY, NO_CHOICE, TIMEZONE, atTime } from './helpers/site-lights.js';
import { quoted } from './helpers/quoted-attributes.js';

test.use({ timezoneId: TIMEZONE, storageState: NO_CHOICE });

const PAGES = ['/', '/es/', '/ar/', '/docs/', '/docs/components/button/'];
const VALUES = ['auto', 'light', 'dark', 'high-contrast'];
const DEFINED = () => !!(customElements.get('luz-theme-mode') && customElements.get('luz-theme-time'));

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
    test(`${path}: <luz-theme-time> wraps <luz-theme-mode> and its fieldset, four radios, Auto checked, and six moments`, async ({ request }) => {
      // The home is served without the quotes a value does not need: read it with them restored
      const html = quoted(await (await request.get(path)).text(), path);
      // The footer that holds the switcher, not the first <footer> of the page (a demo may have one)
      const footer = [...html.matchAll(/<footer\b[\s\S]*?<\/footer>/g)].map((m) => m[0]).find((f) => f.includes('<luz-theme-time')) ?? '';
      expect(footer, 'a <footer> with <luz-theme-time> in it').not.toBe('');
      const time = footer.slice(footer.indexOf('<luz-theme-time'), footer.indexOf('</luz-theme-time>'));
      expect(time.indexOf('<luz-theme-mode'), 'core\'s element is inside the time').toBeGreaterThan(0);
      const group = time.slice(time.indexOf('<luz-theme-mode'), time.indexOf('</luz-theme-mode>'));
      expect(group, 'the fieldset is inside the element').toContain('<fieldset');
      const radios = [...group.matchAll(/<input\b[^>]*type="radio"[^>]*>/g)].map((m) => m[0]);
      expect(radios.map((r) => r.match(/value="([^"]+)"/)?.[1])).toEqual(VALUES);
      // The attribute, not aria-checked or data-checked
      const checked = (r) => /\schecked(?=[\s>=/])/.test(r);
      expect(radios.filter(checked).map((r) => r.match(/value="([^"]+)"/)?.[1])).toEqual(['auto']);
      // The moments follow core's element, each with its start and its base
      const moments = [...time.slice(time.indexOf('</luz-theme-mode>')).matchAll(/<input\b[^>]*data-from="[^"]+"[^>]*>/g)].map((m) => m[0]);
      expect(moments).toHaveLength(6);
      for (const m of moments) expect(m).toMatch(/data-theme="(?:light|dark)"/);
      // The round button is the script's: the markup has none
      expect(group).not.toMatch(/<button\b/);
    });
  }
});

test.describe('the footer in the page', () => {
  for (const path of PAGES) {
    test(`${path}: four radios in <luz-theme-mode>, Auto checked on a first visit, an icon in every label, and the round button shows Auto's`, async ({ page }) => {
      await atTime(page, '14:00');
      await page.goto(path);
      await expect.poll(() => page.evaluate(DEFINED)).toBe(true);

      const mode = page.locator('footer luz-theme-time luz-theme-mode');
      await expect(mode).toHaveCount(1);
      await expect(mode.locator('fieldset.luz-theme-mode__group')).toHaveCount(1);
      const radios = mode.locator('input[name="luz-theme-mode"]');
      await expect(radios).toHaveCount(4);
      expect(await radios.evaluateAll((all) => all.map((r) => /** @type {HTMLInputElement} */ (r).value))).toEqual(VALUES);
      await expect(mode.locator('input:checked')).toHaveValue('auto');
      // Exactly one group drives the tokens of the page
      await expect(page.locator('input[name="luz-theme-mode"]')).toHaveCount(4);

      const labels = mode.locator('label.luz-theme-mode__option');
      await expect(labels).toHaveCount(4);
      for (const label of await labels.all()) {
        await expect(label.locator('.luz-theme-mode__icon'), await label.innerText()).toHaveCount(1);
        expect((await label.innerText()).trim().length, 'the label has a text').toBeGreaterThan(0);
      }

      const button = mode.locator('.luz-theme-mode__button');
      await expect(button).toHaveCount(1);
      // The button shows the icon of the checked label (Auto's), one drawing
      await expect(button.locator('svg')).toHaveCount(1);
    });
  }
});

test.describe('the choice', () => {
  for (const path of ['/', '/docs/']) {
    test(`${path}: the cycle goes from Auto to Light, Dark, High contrast and back to Auto`, async ({ page }) => {
      await atTime(page, '14:00');
      await page.goto(path);
      await expect.poll(() => page.evaluate(DEFINED)).toBe(true);
      const button = page.locator('footer .luz-theme-mode__button');
      // Auto is checked while the hour leads: the name is the legend and the checked label
      await expect(button).toHaveAccessibleName('Color mode: Auto');
      for (const [value, label] of [['light', 'Light'], ['dark', 'Dark'], ['high-contrast', 'High contrast'], ['auto', 'Auto']]) {
        await button.click();
        await expect(page.locator('input[name="luz-theme-mode"]:checked')).toHaveValue(value);
        await expect(button).toHaveAccessibleName(`Color mode: ${label}`);
      }
    });

    test(`${path}: choosing Dark stores luz-theme, and Auto removes it; luz-site-mode is never written`, async ({ page }) => {
      await atTime(page, '14:00');
      await recordWrites(page);
      await page.goto(path);
      await expect.poll(() => page.evaluate(DEFINED)).toBe(true);
      const button = page.locator('footer .luz-theme-mode__button');

      expect(await page.evaluate((k) => localStorage.getItem(k), KEY), 'nothing is stored before a choice').toBeNull();
      await button.click(); // Light
      await button.click(); // Dark
      expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
      expect(await page.evaluate(() => document.documentElement.dataset.moment)).toBe('night');
      expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBe('dark');

      // The choice follows the visitor
      await page.reload();
      await expect.poll(() => page.evaluate(DEFINED)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
      await expect(page.locator('input[name="luz-theme-mode"]:checked')).toHaveValue('dark');

      await button.click(); // High contrast
      await button.click(); // Auto
      await expect(page.locator('input[name="luz-theme-mode"]:checked')).toHaveValue('auto');
      expect(await page.evaluate((k) => localStorage.getItem(k), KEY), 'Auto removes the key').toBeNull();

      expect(await page.evaluate(() => localStorage.getItem('luz-site-mode'))).toBeNull();
      expect(await writes(page)).not.toContain('luz-site-mode');
    });

    test(`${path}: a choice made with the keyboard on the round button`, async ({ page }) => {
      await atTime(page, '14:00');
      await page.goto(path);
      await expect.poll(() => page.evaluate(DEFINED)).toBe(true);
      await page.locator('footer .luz-theme-mode__button').focus();
      await page.keyboard.press('Enter');
      await page.keyboard.press('Space');
      expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
      expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBe('dark');
    });
  }
});

/* ---- F6 of .claude/plans/ai-and-catalog-only.md (decisions 40, 41 and 43): core draws the corner button ---- */

test.describe('the button in the corner of the window', () => {
  for (const path of PAGES) {
    test(`${path}: with scripting it is core's round button, fixed at the end corner, bottom left in Arabic`, async ({ page }) => {
      await page.goto(path);
      await expect.poll(() => page.evaluate(DEFINED)).toBe(true);
      const button = page.locator('footer .luz-theme-mode__button');
      await expect(button).toHaveCSS('position', 'fixed');
      const side = await page.evaluate(() => {
        const probe = document.createElement('div');
        probe.style.inlineSize = 'var(--luz-control-lg)';
        document.body.append(probe);
        const px = probe.getBoundingClientRect().width;
        probe.remove();
        return px;
      });
      const look = await button.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        const view = { w: document.documentElement.clientWidth, h: window.innerHeight };
        return { width: r.width, height: r.height, bottomGap: view.h - r.bottom, startGap: r.left, endGap: view.w - r.right, radius: s.borderTopLeftRadius, rtl: getComputedStyle(document.documentElement).direction === 'rtl' };
      });
      expect([look.width, look.height]).toEqual([side, side]);
      expect(look.radius.endsWith('%') ? parseFloat(look.radius) >= 50 : parseFloat(look.radius) >= side / 2, `border-radius ${look.radius}`).toBe(true);
      expect(look.rtl).toBe(path === '/ar/');
      const margin = await page.evaluate(() => {
        const probe = document.createElement('div');
        probe.style.inlineSize = 'var(--luz-space-md)';
        document.body.append(probe);
        const px = probe.getBoundingClientRect().width;
        probe.remove();
        return px;
      });
      expect(look.bottomGap).toBeCloseTo(margin, 0);
      expect(look.rtl ? look.startGap : look.endGap).toBeCloseTo(margin, 0);
    });
  }

  for (const width of [320, 1024, 1280]) {
    for (const path of ['/', '/ar/', '/docs/']) {
      test(`${path}: at ${width} px, scrolled to the end, no link of the footer is fully under the button`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.setViewportSize({ width, height: 700 });
        await page.goto(path);
        await expect.poll(() => page.evaluate(DEFINED)).toBe(true);
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        const covered = await page.evaluate(() => {
          const button = document.querySelector('footer .luz-theme-mode__button');
          const links = [...document.querySelectorAll('footer a[href], footer button')].filter((el) => el !== button && el.getClientRects().length && !el.closest('luz-theme-mode'));
          return links.filter((el) => {
            const r = el.getBoundingClientRect();
            const samples = [];
            for (const fx of [0.1, 0.5, 0.9]) for (const fy of [0.1, 0.5, 0.9]) samples.push([r.left + r.width * fx, r.top + r.height * fy]);
            // Under the button: the point is in the window, and what is drawn there is the button
            return samples.every(([x, y]) => {
              const hit = document.elementFromPoint(x, y);
              return hit && (button === hit || button.contains(hit));
            });
          }).map((el) => (el.textContent || '').trim().slice(0, 30));
        });
        expect(covered).toEqual([]);
        // The last link of the page, focused, is whole in the window and not under the button
        const last = await page.evaluate(() => {
          const links = [...document.querySelectorAll('footer a[href]')].filter((el) => el.getClientRects().length && !el.closest('luz-theme-mode'));
          const el = links[links.length - 1];
          el.focus();
          const r = el.getBoundingClientRect();
          const b = document.querySelector('footer .luz-theme-mode__button').getBoundingClientRect();
          const apart = r.right <= b.left || r.left >= b.right || r.bottom <= b.top || r.top >= b.bottom;
          return { apart, inWindow: r.top >= 0 && r.bottom <= window.innerHeight };
        });
        expect(last).toEqual({ apart: true, inWindow: true });
      });
    }
  }
});

test.describe('the footer without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  for (const path of ['/', '/es/', '/ar/', '/docs/']) {
    test(`${path}: the four radios are in the footer, in the flow, and nothing is fixed`, async ({ page }) => {
      await page.goto(path);
      const group = page.locator('footer .luz-theme-mode__group');
      expect(['static', 'relative']).toContain(await group.evaluate((el) => getComputedStyle(el).position));
      await expect(page.locator('footer .luz-theme-mode__button')).toHaveCount(0);
      const inside = await page.evaluate(() => {
        const f = document.querySelector('footer').getBoundingClientRect();
        return [...document.querySelectorAll('footer .luz-theme-mode__option')].map((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 1 && r.height > 1 && r.top >= f.top && r.bottom <= f.bottom + 1;
        });
      });
      expect(inside).toEqual([true, true, true, true]);
    });
  }
});
