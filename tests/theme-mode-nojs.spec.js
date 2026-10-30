// @ts-check
/**
 * <luz-theme-mode> with JavaScript off (PRINCIPLES.md: JavaScript only
 * enhances). The fieldset of radios the author wrote inside the element is a
 * native radio group, and the tokens re-scope the page from the checked radio
 * with CSS alone: Auto (the first radio, checked) is the light default, and the
 * others change the mode. The button, the storage and the system's mode need
 * the script and are in tests/theme-mode.spec.js.
 *
 * The file turns JavaScript off itself, so it runs the same in both projects.
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolveColor } from './helpers/design-tokens.js';

test.use({ javaScriptEnabled: false, reducedMotion: 'reduce' });

const PAGE = '/tests/fixtures/theme-mode.html';
const BRAND = '/tests/fixtures/theme-mode-brand.html';

const token = (page, name) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim().toLowerCase(), name);
const surface = (page, mode) => resolveColor(mode, 'surface-page').toLowerCase();
const option = (page, name) => page.locator('.luz-theme-mode__option', { hasText: name });

test.describe('the radios', () => {
  test('are a group named by its legend, with one radio for each choice and Auto checked', async ({ page }) => {
    await page.goto(PAGE);
    const group = page.getByRole('group', { name: 'Color mode' });
    await expect(group).toBeVisible();
    for (const name of ['Auto', 'Light', 'Dark', 'High contrast']) await expect(group.getByRole('radio', { name })).toHaveCount(1);
    await expect(group.getByRole('radio', { name: 'Auto' })).toBeChecked();
    await expect(page.locator('luz-theme-mode button')).toHaveCount(0);
  });

  test('show each option, with its icon and its name', async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.locator('.luz-theme-mode__option')).toHaveCount(4);
    for (const el of await page.locator('.luz-theme-mode__option').all()) {
      await expect(el).toBeVisible();
      await expect(el.locator('svg')).toBeVisible();
    }
  });

  test('change the mode of the page with CSS alone', async ({ page }) => {
    await page.goto(PAGE);
    expect(await token(page, '--luz-surface-page'), 'Auto').toBe(surface(page, 'light'));
    await option(page, 'Dark').click();
    expect(await token(page, '--luz-surface-page'), 'dark').toBe(surface(page, 'dark'));
    await option(page, 'High contrast').click();
    expect(await token(page, '--luz-surface-page'), 'high contrast').toBe(surface(page, 'high-contrast'));
    await option(page, 'Light').click();
    expect(await token(page, '--luz-surface-page'), 'light').toBe(surface(page, 'light'));
    await option(page, 'Dark').click();
    await option(page, 'Auto').click();
    expect(await token(page, '--luz-surface-page'), 'Auto again').toBe(surface(page, 'light'));
  });

  test('are a radio group for the keyboard: Tab enters it once and the arrows choose', async ({ page }) => {
    await page.goto(PAGE);
    await page.locator('#before').focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('radio', { name: 'Auto' })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('radio', { name: 'Light' })).toBeChecked();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('radio', { name: 'Dark' })).toBeChecked();
    expect(await token(page, '--luz-surface-page')).toBe(surface(page, 'dark'));
    await page.keyboard.press('Tab');
    await expect(page.locator('#after')).toBeFocused();
  });

  test('show the focus on the option, not on a hidden box', async ({ page }) => {
    await page.goto(PAGE);
    await page.locator('#before').focus();
    await page.keyboard.press('Tab');
    const ring = await page.locator('.luz-theme-mode__option').first().evaluate((el) => {
      const s = getComputedStyle(el);
      return { style: s.outlineStyle, width: parseFloat(s.outlineWidth), offset: parseFloat(s.outlineOffset) };
    });
    expect(ring.style).not.toBe('none');
    expect(ring.width).toBe(2);
    expect(ring.offset).toBe(2);
  });

  test('tell the checked option from the others without colour alone: it is filled', async ({ page }) => {
    await page.goto(PAGE);
    const fill = (name) => option(page, name).evaluate((el) => getComputedStyle(el).backgroundColor);
    const unchecked = await fill('Dark');
    expect(await fill('Auto')).not.toBe(unchecked);
    await option(page, 'Dark').click();
    expect(await fill('Dark')).not.toBe(unchecked);
    expect(await fill('Auto')).toBe(unchecked);
  });

  test('leave nothing to scroll sideways at 320 px, at 200 % text', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(PAGE);
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    const { scroll, client } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(scroll).toBeLessThanOrEqual(client);
  });
});

/**
 * The controls whose browser parts follow the mode (the arrow of a select, the picker of a date or time field)
 * choose their dark `color-scheme` from the checked radio too, in the rules of elements/forms.css,
 * components/form.css and components/select.css. The radios are named `luz-theme-mode`, so those rules must name
 * that group: with another name, Dark never reached them and a select kept its light arrow.
 */
test.describe('the controls that follow the mode', () => {
  const CONTROLS = '/tests/fixtures/theme-mode-controls.html';
  const IDS = ['bare-select', 'bare-date', 'bare-time', 'luz-select', 'luz-date', 'luz-time'];
  const scheme = (page, id) => page.locator(`#${id}`).evaluate((el) => getComputedStyle(el).colorScheme);

  test('start in the light scheme', async ({ page }) => {
    await page.goto(CONTROLS);
    for (const id of IDS) expect(await scheme(page, id), id).toBe('light');
  });

  test('take the dark scheme when Dark is chosen, and the light one again with Light and with Auto', async ({ page }) => {
    await page.goto(CONTROLS);
    await option(page, 'Dark').click();
    for (const id of IDS) expect(await scheme(page, id), `${id} in dark`).toBe('dark');
    await option(page, 'Light').click();
    for (const id of IDS) expect(await scheme(page, id), `${id} in light`).toBe('light');
    await option(page, 'Dark').click();
    await option(page, 'Auto').click();
    for (const id of IDS) expect(await scheme(page, id), `${id} in Auto`).toBe('light');
  });
});

/**
 * The template a developer copies, as it is published (dist/themes/_template.css, in the layer luz.themes), with
 * only the page colour changed in each of its three blocks, so the blocks can be told apart. Everything else,
 * and above all its selectors, is the template's own: the page links it in place of the fixture's copy.
 */
const SURFACE = { light: '#fde8ff', dark: '#12001a', 'high-contrast': '#010101' };
function brandTemplate() {
  const css = readFileSync(new URL('../packages/core/dist/themes/_template.css', import.meta.url), 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '');
  return css.replace(/([^{}]+)\{([^{}]*)\}/g, (block, selector, body) => {
    if (!selector.includes('data-theme="my-brand"')) return block;
    const mode = selector.includes('[data-mode="dark"]') ? 'dark' : selector.includes('[data-mode="high-contrast"]') ? 'high-contrast' : 'light';
    return `${selector}{${body.replace(/--luz-surface-page:[^;]+;/, `--luz-surface-page: ${SURFACE[mode]};`)}}`;
  });
}

test.describe('a custom theme', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/tests/fixtures/theme-mode-brand.css', (route) => route.fulfill({ contentType: 'text/css', body: brandTemplate() }));
  });

  test('starts in its light block', async ({ page }) => {
    await page.goto(BRAND);
    expect(await token(page, '--luz-surface-page')).toBe(SURFACE.light);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'my-brand');
  });

  test('follows the radios: its dark, high contrast and light blocks, and the light one for Auto', async ({ page }) => {
    // The template has, next to each data-mode selector, the checked radio of <luz-theme-mode> while no data-mode is written
    await page.goto(BRAND);
    expect(await token(page, '--luz-surface-page'), 'Auto').toBe(SURFACE.light);
    await option(page, 'Dark').click();
    expect(await token(page, '--luz-surface-page'), 'dark').toBe(SURFACE.dark);
    await option(page, 'High contrast').click();
    expect(await token(page, '--luz-surface-page'), 'high contrast').toBe(SURFACE['high-contrast']);
    await option(page, 'Light').click();
    expect(await token(page, '--luz-surface-page'), 'light').toBe(SURFACE.light);
    await option(page, 'Dark').click();
    await option(page, 'Auto').click();
    expect(await token(page, '--luz-surface-page'), 'Auto again').toBe(SURFACE.light);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'my-brand');
  });

  test('the keyboard does the same: the arrows move through the brand\'s modes', async ({ page }) => {
    await page.goto(BRAND);
    await page.locator('#before').focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('radio', { name: 'Dark' })).toBeChecked();
    expect(await token(page, '--luz-surface-page')).toBe(SURFACE.dark);
    await page.keyboard.press('ArrowDown');
    expect(await token(page, '--luz-surface-page')).toBe(SURFACE['high-contrast']);
  });
});
