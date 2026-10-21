// @ts-check
/**
 * The sections of the home that came with its redesign (apps/landing/index.html):
 *
 *  - Why LUZ closes with two lists, who LUZ fits and who it does not, in every language
 *  - Modes: one box per mode, each a button (with JavaScript) that switches the whole page
 *    through the footer's <luz-mode>, which remembers it
 *  - Native: the panel that shows plain HTML elements with and without LUZ plays on a CSS loop,
 *    so it needs no script; with reduced motion it rests on its last frame
 *
 * The sources of the template and the files are tests/landing-home.test.js; the rest of the page is
 * tests/landing.spec.js. Without JavaScript the boxes of Modes are pictures: they are in the page
 * and the button is not (the footer's radios switch the mode).
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { KEY as MODE_KEY, NO_CHOICE, TIMEZONE, channels, seedMode, vejer } from './helpers/site-lights.js';

const catalog = (lang) => JSON.parse(readFileSync(fileURLToPath(new URL(`../apps/landing/i18n/${lang}.json`, import.meta.url)), 'utf-8'));
const EN = catalog('en');
const ROUTES = [
  ['/', 'en'],
  ['/es/', 'es'],
  ['/ar/', 'ar'],
];
const MODES = [
  ['light', 'modes.apply.light'],
  ['dark', 'modes.apply.dark'],
  ['high-contrast', 'modes.apply.contrast'],
];
const theme = (page) => page.evaluate(() => document.documentElement.dataset.theme);

test.use({ timezoneId: TIMEZONE, storageState: NO_CHOICE });

test.describe('Why LUZ: who it fits and who it does not', () => {
  for (const javaScriptEnabled of [true, false]) {
    test.describe(`JavaScript ${javaScriptEnabled ? 'on' : 'off'}`, () => {
      test.use({ javaScriptEnabled });

      for (const [route, lang] of ROUTES) {
        test(`${route}: two lists of three, with the words of the catalog, after the three words`, async ({ page }) => {
          const words = catalog(lang);
          await page.goto(route);
          const why = page.locator('main > section#why');
          const columns = why.locator('.landing-fit > .landing-fit__col');
          await expect(columns).toHaveCount(2);

          for (const [column, kind, items] of [
            [columns.nth(0), 'fit.good', ['public', 'server', 'own']],
            [columns.nth(1), 'fit.bad', ['react', 'grid', 'beta']],
          ]) {
            await expect(column.getByRole('heading', { level: 3 })).toHaveText(words[kind]);
            const list = column.getByRole('list');
            await expect(list.getByRole('listitem')).toHaveCount(3);
            for (const [index, item] of items.entries()) await expect(list.getByRole('listitem').nth(index)).toHaveText(words[`${kind}.${item}`]);
            // The tick and the cross are drawn: a reader gets the sentence, not a picture
            for (const icon of await column.locator('svg').all()) await expect(icon).toHaveAttribute('aria-hidden', 'true');
          }

          // Heading levels: the h2 of Why, then the h3 of each card of the words, then the two of the lists
          const levels = await why.locator('h2, h3').evaluateAll((all) => all.map((h) => h.tagName));
          expect(levels[0]).toBe('H2');
          expect(levels.slice(1).every((tag) => tag === 'H3')).toBe(true);
          expect(await why.locator('h3').count()).toBe(5);

          // They come after the three cards, inside the same section
          const order = await why.evaluate((section) => {
            const fit = section.querySelector('.landing-fit');
            const cards = section.querySelector('.landing-why');
            return Boolean(cards && fit && cards.compareDocumentPosition(fit) & Node.DOCUMENT_POSITION_FOLLOWING);
          });
          expect(order).toBe(true);
        });
      }
    });
  }

  test('the lists do not scroll sideways at 360px, and stack in one column', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/');
    const columns = page.locator('#why .landing-fit__col');
    const first = await columns.nth(0).boundingBox();
    const second = await columns.nth(1).boundingBox();
    expect(second.y, 'the second list is under the first').toBeGreaterThan(first.y + first.height - 1);
    expect(Math.abs(second.x - first.x), 'in one column').toBeLessThan(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });

  test('the second list is not a warning: no alert, no live region', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#why .landing-fit [role="alert"], #why .landing-fit .luz-alert, #why .landing-fit [aria-live]')).toHaveCount(0);
  });
});

test.describe('Modes: a box for each mode switches the page', () => {
  test('with JavaScript each box has a button named by what it does, and only the mode of the page is pressed', async ({ page }) => {
    await seedMode(page, 'light');
    await page.goto('/');
    await expect.poll(() => page.evaluate(() => !!customElements.get('luz-mode'))).toBe(true);
    for (const [mode, key] of MODES) {
      const button = page.locator(`#modes [data-apply-mode="${mode}"]`);
      await expect(button).toBeVisible();
      await expect(button).toHaveAccessibleName(EN[key]);
      await expect(button).toHaveAttribute('aria-pressed', String(mode === 'light'));
    }
  });

  test('a box switches the whole page to its mode, presses only its own button and checks the footer\'s radio', async ({ page }) => {
    await seedMode(page, 'light');
    await page.goto('/');
    await expect.poll(() => page.evaluate(() => !!customElements.get('luz-mode'))).toBe(true);

    for (const [mode] of [MODES[1], MODES[2], MODES[0]]) {
      await page.locator(`#modes [data-apply-mode="${mode}"]`).click();
      await expect.poll(() => theme(page)).toBe(mode);
      await expect(page.locator('input[name="luz-theme"]:checked')).toHaveValue(mode);
      for (const [other] of MODES) {
        await expect(page.locator(`#modes [data-apply-mode="${other}"]`)).toHaveAttribute('aria-pressed', String(other === mode));
      }
    }
  });

  test('the choice is the footer\'s: it is stored under core\'s key and survives a reload', async ({ page }) => {
    await page.goto('/');
    await expect.poll(() => page.evaluate(() => !!customElements.get('luz-mode'))).toBe(true);
    await page.locator('#modes [data-apply-mode="dark"]').click();
    await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), MODE_KEY)).toBe('dark');
    await page.reload();
    expect(await theme(page)).toBe('dark');
    await expect(page.locator('#modes [data-apply-mode="dark"]')).toHaveAttribute('aria-pressed', 'true');
  });

  test('the buttons are keyboard controls: Enter and Space press them', async ({ page }) => {
    await seedMode(page, 'light');
    await page.goto('/');
    await expect.poll(() => page.evaluate(() => !!customElements.get('luz-mode'))).toBe(true);
    const dark = page.locator('#modes [data-apply-mode="dark"]');
    await dark.focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => theme(page)).toBe('dark');
    const contrast = page.locator('#modes [data-apply-mode="high-contrast"]');
    await contrast.focus();
    await page.keyboard.press('Space');
    await expect.poll(() => theme(page)).toBe('high-contrast');
  });

  test('a box keeps its own mode when the page is in another: it is a scope, painted with its mode\'s page surface', async ({ page }) => {
    await seedMode(page, 'dark');
    await page.goto('/');
    await expect.poll(() => theme(page)).toBe('dark');
    for (const [mode] of MODES) {
      const background = await page.locator(`#modes .landing-cut[data-theme="${mode}"]`).evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(channels(background), mode).toEqual(vejer(mode, '--luz-surface-page'));
    }
  });
});

test.describe('Modes without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the three boxes are pictures with no button, and the footer\'s radios switch the mode', async ({ page }) => {
    await page.goto('/');
    for (const [mode] of MODES) {
      const box = page.locator(`#modes .landing-cut[data-theme="${mode}"]`);
      await expect(box).toBeVisible();
      await expect(box.locator('[data-apply-mode]')).toBeHidden();
      // The picture of the mode is not read: it is a drawing of the page in that mode
      await expect(box.locator('.landing-cut__picture')).toHaveAttribute('aria-hidden', 'true');
    }
    const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const before = await background();
    await page.click('footer .luz-mode-btn:has(input[value="dark"])');
    await expect(page.locator('footer input[name="luz-theme"][value="dark"]')).toBeChecked();
    await expect.poll(background).not.toBe(before);
  });
});

test.describe('Native: the panel works with no script', () => {
  test.use({ javaScriptEnabled: false, reducedMotion: 'reduce' });

  test('rests on its first scene: the whole markup, and the result of it, inert', async ({ page }) => {
    await page.goto('/');
    const panel = page.locator('#native .landing-typed__panel');
    await panel.scrollIntoViewIfNeeded();
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute('role', 'group');
    await expect(panel).toHaveAccessibleName(EN['native.panel']);

    // With reduced motion only the first scene is shown, on its last frame
    const scenes = panel.locator('.landing-typed__scene');
    await expect(scenes).toHaveCount(3);
    await expect(scenes.nth(0)).toBeVisible();
    await expect(scenes.nth(1)).toBeHidden();
    await expect(scenes.nth(2)).toBeHidden();

    const code = scenes.nth(0).locator('pre.luz-code-block');
    await expect(code).toHaveAttribute('tabindex', '0');
    await expect(code).toHaveAccessibleName(EN['typed.meter.code']);
    for (const line of await code.locator('.landing-typed__line').all()) await expect(line).toBeVisible();
    await expect(code).toContainText('<meter');
    await expect(code).toContainText('class="luz-meter"');
    await expect(code).toContainText(`aria-label="${EN['typed.name']}">`);
    await expect(code).toContainText('</meter>');

    // The result is a picture of the code: out of the tab order and of the accessibility tree
    await expect(scenes.nth(0).locator('.landing-typed__result')).toHaveJSProperty('inert', true);
    await expect(scenes.nth(0).locator('.landing-typed__state--luz meter.luz-meter')).toBeVisible();
    await expect(scenes.nth(0).locator('.landing-typed__mode')).toHaveCount(3);
    for (const [mode] of MODES) await expect(scenes.nth(0).locator(`.landing-typed__mode[data-theme="${mode}"] meter`)).toBeVisible();
  });

  test('the three scenes are one element each: a meter, an email field and a button', async ({ page }) => {
    await page.goto('/');
    const scenes = page.locator('#native .landing-typed__scene');
    await expect(scenes.nth(0).locator('.landing-typed__state--luz meter.luz-meter')).toHaveCount(1);
    await expect(scenes.nth(1).locator('.landing-typed__state--luz input.luz-input[type="email"]')).toHaveCount(1);
    await expect(scenes.nth(2).locator('.landing-typed__state--luz button.luz-btn')).toHaveCount(1);
    // The plain element beside LUZ's: the browser's own
    await expect(scenes.nth(0).locator('.landing-typed__state--raw meter:not([class])')).toHaveCount(1);
    await expect(scenes.nth(1).locator('.landing-typed__state--raw input:not([class])')).toHaveCount(1);
    await expect(scenes.nth(2).locator('.landing-typed__state--raw button:not([class])')).toHaveCount(1);
  });
});
