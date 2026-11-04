// @ts-check
/**
 * Specimens under the light of the site (F2 of
 * .claude/plans/luz-home-docs-identity.md, section 3.4): the site's light
 * changes the page, never what is being documented. A specimen of the docs
 * (`[data-docs-specimen]`, `.luz-do-dont__stage`) is re-anchored to the
 * colour mode of <html> with a data-theme of its own, so under any of the six
 * lights its tokens are Vejer's for that mode. apps/docs/reference.js does it
 * (initSpecimenTheme) and follows `luz-theme-time:change`. Nothing is served with
 * data-theme on a specimen: without JavaScript the specimens inherit Vejer's
 * light and the no-JS radios still re-scope them (tests/nojs.spec.js).
 *
 * A light is reached the way a visitor reaches it: an hour pinned (`luz-light`, what the
 * slider of the home stores; `pinHour`), or the system's mode in Auto (the clock decides
 * nothing: a test that moves it moves nothing).
 */
import { test, expect } from '@playwright/test';
import { routeOf } from './helpers/docs-site.js';
import { faded } from './helpers/settle.js';
import { LIGHTS, atTime, channels, colorOf, lightToken, pinHour, seedMode, vejer } from './helpers/site-lights.js';

const PAGE = '/docs/components/button/';
const SPECIMENS = '[data-docs-specimen], .luz-do-dont__stage';
const TOKENS = ['--luz-surface-page', '--luz-text-primary', '--luz-brand-fill'];

const ready = async (page) => {
  await page.goto(PAGE);
  await expect.poll(() => page.evaluate(() => !!customElements.get('luz-theme-time'))).toBe(true);
};

test.describe('a specimen keeps the colours of the mode, whatever the light', () => {
  for (const [light, time, mode] of LIGHTS) {
    test(`${light} (${time} pinned): <html> is ${mode} and every specimen carries data-theme="${mode}" with Vejer's tokens`, async ({ page }) => {
      await pinHour(page, time);
      await ready(page);
      expect(await page.evaluate(() => [document.documentElement.dataset.theme, document.documentElement.dataset.moment])).toEqual([mode, light]);

      const specimens = page.locator(SPECIMENS);
      expect(await specimens.count(), 'the page has specimens').toBeGreaterThan(1);
      const themes = await specimens.evaluateAll((all) => all.map((el) => el.getAttribute('data-theme')));
      expect(themes.filter((t) => t !== mode), 'specimens that do not follow <html>').toEqual([]);

      // Not the first and the last only: a specimen of each kind
      for (const selector of ['[data-docs-specimen]', '.luz-do-dont__stage']) {
        const one = page.locator(selector).first();
        await expect(one).toHaveCount(1);
        for (const token of TOKENS) {
          expect(channels(await colorOf(one, token)), `${selector} ${token} in ${light}`).toEqual(vejer(mode, token));
        }
      }
    });
  }

  // Afternoon and night are Vejer itself, so the token comparison above says nothing there but the
  // data-theme attribute; the four lights that override tokens are where it means something
  for (const [light, time, mode] of LIGHTS.filter(([name]) => ['morning', 'sunset', 'dawn', 'dusk'].includes(name))) {
    test(`${light} (${time} pinned): the page is the light of the block, the specimen is Vejer ${mode}: the site changes around the specimens`, async ({ page }) => {
      await pinHour(page, time);
      await ready(page);
      await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; }' });
      const body = channels(await colorOf(page.locator('body'), '--luz-surface-page'));
      const specimen = channels(await colorOf(page.locator('[data-docs-specimen]').first(), '--luz-surface-page'));
      expect(body, `the ${light} page`).toEqual(lightToken(light, '--luz-surface-page'));
      expect(specimen).toEqual(vejer(mode, '--luz-surface-page'));
      expect(body, `the ${light} page is not Vejer ${mode}`).not.toEqual(specimen);
    });
  }
});

test.describe('a specimen follows the mode when the visitor changes it', () => {
  test('Dark, then High contrast, then Light, chosen in the footer: data-theme follows <html> and the tokens follow data-theme', async ({ page }) => {
    await atTime(page, '23:30'); // the clock is not the light
    await ready(page);
    const specimen = page.locator('[data-docs-specimen]').first();
    // Auto is the system's, light here, and nothing is pinned: the specimens start in light, at any hour
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    for (const mode of ['dark', 'high-contrast', 'light']) {
      await page.locator(`footer luz-theme-mode input[value="${mode}"]`).evaluate((r) => /** @type {HTMLInputElement} */ (r).click());
      await expect(page.locator('html')).toHaveAttribute('data-theme', mode);
      const themes = await page.locator(SPECIMENS).evaluateAll((all) => all.map((el) => el.getAttribute('data-theme')));
      expect(themes.filter((t) => t !== mode), mode).toEqual([]);
      expect(channels(await colorOf(specimen, '--luz-surface-page')), mode).toEqual(vejer(mode, '--luz-surface-page'));
    }
  });

  test('a write to <html>\'s data-theme from anywhere (core\'s applyTheme, another script, a test) reaches the specimens', async ({ page }) => {
    // The visual, contrast and axe suites set the mode this way: they must not meet a stale specimen
    await page.emulateMedia({ colorScheme: 'dark' });
    await ready(page);
    await expect(page.locator('[data-docs-specimen]').first()).toHaveAttribute('data-theme', 'dark');
    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'light';
    });
    await expect(page.locator('[data-docs-specimen]').first()).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('.luz-do-dont__stage').first()).toHaveAttribute('data-theme', 'light');
    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'high-contrast';
    });
    await expect(page.locator('[data-docs-specimen]').first()).toHaveAttribute('data-theme', 'high-contrast');
  });

  test("Auto with a dark system puts the specimens in dark, and Light puts them back", async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await ready(page);
    await expect(page.locator('[data-docs-specimen]').first()).toHaveAttribute('data-theme', 'dark');
    await page.locator('footer luz-theme-mode input[value="light"]').evaluate((r) => /** @type {HTMLInputElement} */ (r).click());
    await expect(page.locator('[data-docs-specimen]').first()).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('.luz-do-dont__stage').first()).toHaveAttribute('data-theme', 'light');
  });
});

test.describe('the canvas of the HTML reference is painted with the tokens of the mode the page ends in', () => {
  const pixel = (page) => page.evaluate(() => [...document.getElementById('d-canvas').getContext('2d').getImageData(60, 60, 1, 1).data].join());

  /**
   * Open the page of the canvas and wait for what the test reads, not for the network: `networkidle`
   * is not a promise (tests/helpers/settle.js), and on the loaded runner it stayed unreported on the second
   * page until the test timed out. The page is ready when the site's element has upgraded (the footer's
   * switcher can be clicked, the clock moves the page) and the canvas has been painted.
   */
  async function openCanvas(page) {
    await page.goto(routeOf('d-canvas'));
    await expect.poll(() => page.evaluate(() => !!customElements.get('luz-theme-time'))).toBe(true);
    await expect.poll(() => pixel(page)).not.toBe('0,0,0,0');
    await faded(page);
  }

  /** The pixel of a fresh load of the page in Dark, with nothing fading. */
  async function darkPixel(page) {
    const other = await page.context().newPage();
    await seedMode(other, 'dark');
    await openCanvas(other);
    const value = await pixel(other);
    await other.close();
    return value;
  }

  test('a choice repaints it, and after the fade it is the colour of a page loaded in that mode', async ({ page }) => {
    await seedMode(page, 'light');
    await openCanvas(page);
    const dark = await darkPixel(page);
    const light = await pixel(page);
    expect(light).not.toBe('0,0,0,0');
    expect(light).not.toBe(dark);
    await page.locator('footer .luz-theme-mode__button').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await faded(page);
    // Not the colours of the first frame of the fade
    await expect.poll(() => pixel(page)).toBe(dark);
  });

  test('an hour pinned repaints it from the afternoon to the night, and the clock moving alone does not', async ({ page }) => {
    await atTime(page, '14:00');
    await openCanvas(page);
    const dark = await darkPixel(page);
    const afternoon = await pixel(page);
    expect(afternoon).not.toBe(dark);
    // Nothing pinned: the hours go by and the page stays the system's
    await page.clock.fastForward('09:30:00');
    await page.waitForTimeout(300);
    await expect(page.locator('html')).toHaveAttribute('data-moment', 'afternoon');
    expect(await pixel(page)).toBe(afternoon);
    // The reader pins an hour, as the slider of the home does
    await page.evaluate(() => /** @type {any} */ (document.querySelector('luz-theme-time')).pin(23.5));
    await expect(page.locator('html')).toHaveAttribute('data-moment', 'night');
    await faded(page);
    await expect.poll(() => pixel(page)).toBe(dark);
  });
});
