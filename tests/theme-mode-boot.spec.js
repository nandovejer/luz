// @ts-check
/**
 * The boot script of the color mode (dist/theme-boot.min.js), in a real page:
 * a classic script in the <head> that applies the stored mode, or the system's,
 * before the first paint and before any module has run, so a visitor who is in
 * the dark never sees the page light first. The module and the chunk are blocked
 * here to prove it is the script and nothing else; the page with both is the
 * last test. What the script reads and writes, in isolation:
 * tests/theme-boot.test.js.
 *
 * tests/fixtures/theme-mode-boot.html has the script in its <head> and, at the
 * end of <body>, a classic script that records what <html> had by then.
 */
import { test, expect } from '@playwright/test';
import { resolveColor } from './helpers/design-tokens.js';

const PAGE = '/tests/fixtures/theme-mode-boot.html';
const KEY = 'luz-theme';

test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript');

const attr = (page, name) => page.evaluate((n) => document.documentElement.getAttribute(n), name);
const surface = (mode) => resolveColor(mode, 'surface-page').toLowerCase();

/** Record, at DOMContentLoaded and at the first frame, what the page has. Modules are deferred: both come after the parse. */
async function watch(page) {
  await page.addInitScript(() => {
    window.__seen = {};
    const read = () => {
      const html = document.documentElement;
      return { mode: html.getAttribute('data-mode'), theme: html.getAttribute('data-theme'), surface: getComputedStyle(html).getPropertyValue('--luz-surface-page').trim().toLowerCase() };
    };
    document.addEventListener('DOMContentLoaded', () => (window.__seen.dcl = read()));
    requestAnimationFrame(() => (window.__seen.frame = read()));
  });
}
const seen = (page) => page.evaluate(() => window.__seen);

/** The page as the visitor has it before any module runs: luz.min.js and the chunk do not arrive. */
async function bootOnly(page, { stored, scheme = 'light', contrast = 'no-preference' } = {}) {
  await page.route('**/luz.min.js', (route) => route.abort());
  await page.route('**/theme-mode.min.js', (route) => route.abort());
  if (stored !== undefined) await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [KEY, stored]);
  await page.emulateMedia({ colorScheme: scheme, contrast });
  await watch(page);
  await page.goto(PAGE);
}

test.describe('before any module runs', () => {
  for (const mode of ['light', 'dark', 'high-contrast']) {
    test(`applies the stored mode ${mode}, against a system that says otherwise`, async ({ page }) => {
      await bootOnly(page, { stored: mode, scheme: mode === 'dark' ? 'light' : 'dark' });
      expect(await page.evaluate(() => window.__atParse), 'by the end of <body>, before a module').toEqual({ mode, theme: mode });
      expect((await seen(page)).dcl).toEqual({ mode, theme: mode, surface: surface(mode) });
      expect(await page.evaluate(() => typeof customElements.get('luz-theme-mode'))).toBe('undefined');
    });
  }

  test('with nothing stored applies the mode of the system: dark', async ({ page }) => {
    await bootOnly(page, { scheme: 'dark' });
    expect((await seen(page)).dcl).toEqual({ mode: 'dark', theme: 'dark', surface: surface('dark') });
  });

  test('with nothing stored applies the mode of the system: contrast first, then light', async ({ page }) => {
    await bootOnly(page, { scheme: 'dark', contrast: 'more' });
    expect((await seen(page)).dcl).toMatchObject({ mode: 'high-contrast', surface: surface('high-contrast') });
    const light = await page.context().newPage();
    await light.route('**/luz.min.js', (route) => route.abort());
    await light.emulateMedia({ colorScheme: 'light' });
    await watch(light);
    await light.goto(PAGE);
    expect((await seen(light)).dcl).toMatchObject({ mode: 'light', surface: surface('light') });
  });

  test('has the mode at the first frame: the page is not drawn light first', async ({ page }) => {
    await bootOnly(page, { stored: 'dark', scheme: 'light' });
    await expect.poll(async () => (await seen(page)).frame).toBeDefined();
    expect((await seen(page)).frame).toMatchObject({ mode: 'dark', surface: surface('dark') });
  });

  test('ignores a stored value that is not a mode and follows the system', async ({ page }) => {
    await bootOnly(page, { stored: 'purple', scheme: 'dark' });
    expect((await seen(page)).dcl).toMatchObject({ mode: 'dark', theme: 'dark' });
  });

  test('ignores "auto" as a stored value: Auto is the absence of one', async ({ page }) => {
    await bootOnly(page, { stored: 'auto', scheme: 'dark' });
    expect((await seen(page)).dcl).toMatchObject({ mode: 'dark' });
  });

  test('reads the storage and never writes it', async ({ page }) => {
    await bootOnly(page, { scheme: 'dark' });
    expect(await attr(page, 'data-mode'), 'the script ran').toBe('dark');
    expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBeNull();
    await page.goto('about:blank');
    await bootOnly(page, { stored: 'purple' });
    expect(await attr(page, 'data-mode'), 'the script ran').toBe('light');
    expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBe('purple');
  });

  test('keeps a brand: data-mode is written and data-theme is left as it is', async ({ page }) => {
    await page.route('**/luz.min.js', (route) => route.abort());
    await page.route('**/theme-mode.min.js', (route) => route.abort());
    await page.route(`**${PAGE}`, async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()).replace('<html lang="en">', '<html lang="en" data-theme="my-brand">') });
    });
    await page.emulateMedia({ colorScheme: 'dark' });
    await watch(page);
    await page.goto(PAGE);
    expect(await page.evaluate(() => window.__atParse)).toEqual({ mode: 'dark', theme: 'my-brand' });
  });
});

test.describe('then the element', () => {
  test('finds the mode the script applied and keeps it: the button says Auto, or the stored choice', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto(PAGE);
    await expect(page.locator('luz-theme-mode .luz-theme-mode__button')).toBeVisible();
    await expect(page.locator('luz-theme-mode .luz-theme-mode__button')).toHaveAccessibleName('Color mode: Auto');
    expect(await attr(page, 'data-mode')).toBe('dark');
    expect(await attr(page, 'data-theme')).toBe('dark');
  });

  test('a stored mode: the script applies it and the button says so, with no flash on the way', async ({ page }) => {
    await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [KEY, 'high-contrast']);
    await page.emulateMedia({ colorScheme: 'light' });
    await watch(page);
    await page.goto(PAGE);
    await expect(page.locator('luz-theme-mode .luz-theme-mode__button')).toHaveAccessibleName('Color mode: High contrast');
    const modes = await page.evaluate(() => window.__seen);
    expect(modes.dcl.mode).toBe('high-contrast');
    expect(await attr(page, 'data-mode')).toBe('high-contrast');
  });

  test('the first press after a boot in the dark goes to light, not to a mode the page was not in', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto(PAGE);
    const button = page.locator('luz-theme-mode .luz-theme-mode__button');
    await expect(button).toBeVisible();
    await button.click();
    await expect(button).toHaveAccessibleName('Color mode: Light');
    expect(await attr(page, 'data-mode')).toBe('light');
  });
});
