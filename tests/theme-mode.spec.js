// @ts-check
/**
 * <luz-theme-mode> (core): the color mode as one round button.
 *
 * The author writes a fieldset of radios (Auto, light, dark, high contrast)
 * inside the element, as tests/fixtures/theme-mode.html does. With scripting the
 * element adds one round button that steps through them: fixed in the end
 * corner of the window (`inline` keeps it in the flow), Auto > light > dark >
 * high contrast, by click, Enter and Space. Auto follows the system
 * (prefers-contrast: more, then prefers-color-scheme). The mode goes to <html>
 * as data-mode; data-theme mirrors it, unless the page names a brand
 * (a theme made from themes/_template.css), which data-theme keeps. The choice
 * is stored under "luz-theme" (Auto removes it).
 *
 * Without the script, and with it blocked: tests/theme-mode-nojs.spec.js and
 * the second half of this file. The boot script: tests/theme-mode-boot.spec.js.
 * Contrast, axe, forced colours, reduced motion, reflow: theme-mode-a11y.spec.js.
 */
import { test, expect } from '@playwright/test';
import { resolveColor } from './helpers/design-tokens.js';

const PAGE = '/tests/fixtures/theme-mode.html';
const TWO = '/tests/fixtures/theme-mode-two.html';
const BRAND = '/tests/fixtures/theme-mode-brand.html';
const BUTTON = 'luz-theme-mode .luz-theme-mode__button';
const KEY = 'luz-theme';

test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript');

const attr = (page, name) => page.evaluate((n) => document.documentElement.getAttribute(n), name);
const stored = (page) => page.evaluate((k) => localStorage.getItem(k), KEY);
const token = (page, name) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim().toLowerCase(), name);
/** The checked radio's value, in the first element. */
const checked = (page) => page.evaluate(() => document.querySelector('luz-theme-mode input:checked')?.value);

/** A CSS length as the browser resolves it, in px. */
const length = (page, expr) => page.evaluate((value) => {
  const probe = document.createElement('div');
  probe.style.inlineSize = value;
  document.body.append(probe);
  const px = probe.getBoundingClientRect().width;
  probe.remove();
  return px;
}, expr);

async function open(page, { url = PAGE, scheme = 'light', contrast = 'no-preference' } = {}) {
  await page.emulateMedia({ colorScheme: scheme, contrast });
  await page.goto(url);
  await expect(page.locator(BUTTON).first()).toBeVisible();
}

test.describe('the button', () => {
  test('replaces the radios with one button named by the legend and the checked label', async ({ page }) => {
    await open(page);
    await expect(page.locator(BUTTON)).toHaveCount(1);
    await expect(page.locator(BUTTON)).toHaveAccessibleName('Color mode: Auto');
    await expect(page.locator('luz-theme-mode input[value="dark"]')).toBeHidden();
    await expect(page.locator(`${BUTTON} svg`)).toHaveCount(1);
  });

  test('is 44 by 44 px and round', async ({ page }) => {
    await open(page);
    const look = await page.locator(BUTTON).evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { w: r.width, h: r.height, radius: parseFloat(getComputedStyle(el).borderTopLeftRadius) };
    });
    expect(look.w).toBeCloseTo(44, 0);
    expect(look.h).toBeCloseTo(44, 0);
    expect(look.radius).toBeGreaterThanOrEqual(22);
  });

  test('is fixed in the end corner of the window by default: bottom right, bottom left in a right-to-left page', async ({ page }) => {
    for (const dir of ['ltr', 'rtl']) {
      await open(page, { url: `${PAGE}?dir=${dir}` });
      const margin = await length(page, 'var(--luz-space-md)');
      const b = await page.locator(BUTTON).evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { position: getComputedStyle(el).position, left: r.left, right: document.documentElement.clientWidth - r.right, bottom: window.innerHeight - r.bottom };
      });
      expect(b.position, dir).toBe('fixed');
      expect(b.bottom, `${dir} bottom`).toBeCloseTo(margin, 0);
      expect(dir === 'ltr' ? b.right : b.left, `${dir} end edge`).toBeCloseTo(margin, 0);
    }
  });

  test('stays in the corner while the page scrolls', async ({ page }) => {
    await open(page);
    await page.evaluate(() => { document.querySelector('main').style.minBlockSize = '300vh'; });
    const top = () => page.locator(BUTTON).evaluate((el) => el.getBoundingClientRect().top);
    const before = await top();
    await page.evaluate(() => window.scrollTo(0, 800));
    expect(await top()).toBeCloseTo(before, 0);
  });

  test('inline keeps it in the flow, in both directions', async ({ page }) => {
    for (const dir of ['ltr', 'rtl']) {
      await open(page, { url: `${PAGE}?inline&dir=${dir}` });
      const look = await page.locator(BUTTON).evaluate((el) => {
        const r = el.getBoundingClientRect();
        const slot = document.getElementById('slot').getBoundingClientRect();
        return { position: getComputedStyle(el).position, inSlot: r.top >= slot.top - 1 && r.bottom <= slot.bottom + 1 && r.left >= slot.left - 1 && r.right <= slot.right + 1 };
      });
      expect(look.position, dir).not.toBe('fixed');
      expect(look.inSlot, `${dir}: inside the block the markup puts it in`).toBe(true);
    }
  });

  test('leaves the fieldset out of sight and out of the Tab order', async ({ page }) => {
    await open(page);
    await page.locator('#before').focus();
    await page.keyboard.press('Tab');
    await expect(page.locator(BUTTON)).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#after')).toBeFocused();
  });

  test('has a 2 px focus ring, 2 px away from the button', async ({ page }) => {
    await open(page);
    await page.locator('#before').focus();
    await page.keyboard.press('Tab');
    const ring = await page.locator(BUTTON).evaluate((el) => {
      const s = getComputedStyle(el);
      return { style: s.outlineStyle, width: parseFloat(s.outlineWidth), offset: parseFloat(s.outlineOffset) };
    });
    expect(ring.style).not.toBe('none');
    expect(ring.width).toBe(2);
    expect(ring.offset).toBe(2);
  });
});

test.describe('the cycle', () => {
  test('goes Auto, light, dark, high contrast and back to Auto, by click', async ({ page }) => {
    await open(page, { scheme: 'dark' });
    // Auto in a dark system is dark; then each press is a choice
    const steps = [
      ['Auto', 'dark', 'auto'],
      ['Light', 'light', 'light'],
      ['Dark', 'dark', 'dark'],
      ['High contrast', 'high-contrast', 'high-contrast'],
      ['Auto', 'dark', 'auto'],
    ];
    for (const [i, [label, mode, radio]] of steps.entries()) {
      if (i) await page.locator(BUTTON).click();
      await expect(page.locator(BUTTON), label).toHaveAccessibleName(`Color mode: ${label}`);
      expect(await attr(page, 'data-mode'), `${label}: data-mode`).toBe(mode);
      expect(await checked(page), `${label}: the radio underneath`).toBe(radio);
    }
  });

  test('works from the keyboard: Enter and Space', async ({ page }) => {
    await open(page);
    await page.locator(BUTTON).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator(BUTTON)).toHaveAccessibleName('Color mode: Light');
    await page.keyboard.press('Space');
    await expect(page.locator(BUTTON)).toHaveAccessibleName('Color mode: Dark');
    expect(await attr(page, 'data-mode')).toBe('dark');
    await page.keyboard.press('Enter');
    await expect(page.locator(BUTTON)).toHaveAccessibleName('Color mode: High contrast');
    expect(await attr(page, 'data-mode')).toBe('high-contrast');
  });

  test('shows the icon of the choice: each step changes the drawing', async ({ page }) => {
    await open(page);
    const drawings = [];
    for (let i = 0; i < 4; i++) {
      drawings.push(await page.locator(`${BUTTON} svg`).evaluate((svg) => svg.innerHTML));
      await page.locator(BUTTON).click();
    }
    expect(new Set(drawings).size).toBe(4);
  });

  test('the colours of the page change with the mode', async ({ page }) => {
    await open(page);
    expect(await token(page, '--luz-surface-page')).toBe(resolveColor('light', 'surface-page').toLowerCase());
    await page.locator(BUTTON).click(); // light
    await page.locator(BUTTON).click(); // dark
    expect(await token(page, '--luz-surface-page')).toBe(resolveColor('dark', 'surface-page').toLowerCase());
    await page.locator(BUTTON).click(); // high contrast
    expect(await token(page, '--luz-surface-page')).toBe(resolveColor('high-contrast', 'surface-page').toLowerCase());
  });
});

test.describe('Auto follows the system', () => {
  test('prefers-color-scheme, live', async ({ page }) => {
    await open(page, { scheme: 'light' });
    expect(await attr(page, 'data-mode')).toBe('light');
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect.poll(() => attr(page, 'data-mode')).toBe('dark');
    await page.emulateMedia({ colorScheme: 'light' });
    await expect.poll(() => attr(page, 'data-mode')).toBe('light');
    await expect(page.locator(BUTTON)).toHaveAccessibleName('Color mode: Auto');
  });

  test('prefers-contrast: more wins over the color scheme', async ({ page }) => {
    await open(page, { scheme: 'dark', contrast: 'more' });
    expect(await attr(page, 'data-mode')).toBe('high-contrast');
    await page.emulateMedia({ contrast: 'no-preference' });
    await expect.poll(() => attr(page, 'data-mode')).toBe('dark');
  });

  test('a choice made by the visitor is not moved by the system', async ({ page }) => {
    await open(page, { scheme: 'light' });
    await page.locator(BUTTON).click(); // light
    await page.locator(BUTTON).click(); // dark
    await page.emulateMedia({ colorScheme: 'light', contrast: 'more' });
    await page.waitForTimeout(200);
    expect(await attr(page, 'data-mode')).toBe('dark');
  });
});

test.describe('what it writes on <html>', () => {
  test('with no brand data-theme mirrors the mode', async ({ page }) => {
    await open(page);
    for (const mode of ['light', 'dark', 'high-contrast']) {
      await page.locator(BUTTON).click();
      expect(await attr(page, 'data-mode'), mode).toBe(mode);
      expect(await attr(page, 'data-theme'), mode).toBe(mode);
    }
  });

  test('with a brand data-theme stays the brand and data-mode changes', async ({ page }) => {
    await open(page, { url: BRAND });
    for (const mode of ['light', 'dark', 'high-contrast', 'light']) {
      await page.locator(BUTTON).click();
      expect(await attr(page, 'data-mode'), mode).toBe(mode);
      expect(await attr(page, 'data-theme'), `${mode}: the brand`).toBe('my-brand');
    }
  });

  test('the brand colours are used in the three modes', async ({ page }) => {
    await open(page, { url: BRAND });
    // The tokens the fixture's copy of the template sets, in each mode (Vejer has none of these)
    const brand = { light: '#fde8ff', dark: '#12001a', 'high-contrast': '#000' };
    const vejer = (mode) => resolveColor(mode, 'surface-page').toLowerCase();
    expect(await token(page, '--luz-surface-page'), 'Auto, light').toBe(brand.light);
    for (const mode of ['light', 'dark', 'high-contrast']) {
      await page.locator(BUTTON).click();
      expect(await token(page, '--luz-surface-page'), mode).toBe(brand[mode]);
    }
    expect(vejer('light')).not.toBe(brand.light);
    expect(vejer('dark')).not.toBe(brand.dark);
  });

  test('Auto on a brand follows the system into the brand\'s dark block', async ({ page }) => {
    await open(page, { url: BRAND, scheme: 'dark' });
    expect(await attr(page, 'data-theme')).toBe('my-brand');
    expect(await attr(page, 'data-mode')).toBe('dark');
    expect(await token(page, '--luz-surface-page')).toBe('#12001a');
  });
});

test.describe('memory', () => {
  test('stores the mode under luz-theme, and Auto removes it', async ({ page }) => {
    await open(page);
    expect(await stored(page), 'nothing before a choice').toBeNull();
    await page.locator(BUTTON).click();
    expect(await stored(page)).toBe('light');
    await page.locator(BUTTON).click();
    expect(await stored(page)).toBe('dark');
    await page.locator(BUTTON).click();
    expect(await stored(page)).toBe('high-contrast');
    await page.locator(BUTTON).click(); // Auto
    expect(await stored(page)).toBeNull();
  });

  test('a reload keeps the choice', async ({ page }) => {
    await open(page);
    await page.locator(BUTTON).click();
    await page.locator(BUTTON).click(); // dark
    await page.reload();
    await expect(page.locator(BUTTON)).toHaveAccessibleName('Color mode: Dark');
    expect(await attr(page, 'data-mode')).toBe('dark');
    expect(await checked(page)).toBe('dark');
  });

  test('a stored mode wins over the system until Auto', async ({ page }) => {
    await page.addInitScript((k) => localStorage.setItem(k, 'light'), KEY);
    await open(page, { scheme: 'dark' });
    expect(await attr(page, 'data-mode')).toBe('light');
    await expect(page.locator(BUTTON)).toHaveAccessibleName('Color mode: Light');
  });

  test('a stored value that is not a mode is ignored', async ({ page }) => {
    await page.addInitScript((k) => localStorage.setItem(k, 'purple'), KEY);
    await open(page, { scheme: 'dark' });
    await expect(page.locator(BUTTON)).toHaveAccessibleName('Color mode: Auto');
    expect(await attr(page, 'data-mode')).toBe('dark');
  });

  test('no-remember stores nothing and does not read what is stored', async ({ page }) => {
    await page.addInitScript((k) => localStorage.setItem(k, 'dark'), KEY);
    await open(page, { url: `${PAGE}?no-remember`, scheme: 'light' });
    await expect(page.locator(BUTTON)).toHaveAccessibleName('Color mode: Auto');
    await page.locator(BUTTON).click();
    await page.locator(BUTTON).click(); // dark
    expect(await attr(page, 'data-mode')).toBe('dark');
    await page.locator(BUTTON).click();
    await page.locator(BUTTON).click(); // Auto
    expect(await stored(page), 'what the page had before is left as it was').toBe('dark');
  });

  test('no-remember writes nothing into an empty storage either', async ({ page }) => {
    await open(page, { url: `${PAGE}?no-remember` });
    await page.locator(BUTTON).click();
    expect(await attr(page, 'data-mode')).toBe('light');
    expect(await stored(page)).toBeNull();
  });
});

test.describe('the event', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__events = [];
      document.addEventListener('luz-theme-mode:change', (e) => window.__events.push({ ...e.detail, tag: e.target.localName }));
    });
  });
  const events = (page) => page.evaluate(() => window.__events);

  test('luz-theme-mode:change bubbles from the element with { mode, auto, user } when a person chooses', async ({ page }) => {
    await open(page, { scheme: 'light' });
    await page.locator(BUTTON).click();
    await page.locator(BUTTON).click();
    const last = (await events(page)).at(-1);
    expect(last).toEqual({ mode: 'dark', auto: false, user: true, tag: 'luz-theme-mode' });
  });

  test('going back to Auto says auto: true with the mode the system gives', async ({ page }) => {
    await open(page, { scheme: 'dark' });
    for (let i = 0; i < 4; i++) await page.locator(BUTTON).click();
    expect((await events(page)).at(-1)).toMatchObject({ mode: 'dark', auto: true, user: true });
  });

  test('a change of the system in Auto is an event that no person made', async ({ page }) => {
    await open(page, { scheme: 'light' });
    const before = (await events(page)).length;
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect.poll(async () => (await events(page)).length).toBeGreaterThan(before);
    expect((await events(page)).at(-1)).toMatchObject({ mode: 'dark', auto: true, user: false });
  });
});

test.describe('the API', () => {
  const api = (page, fn, arg) => page.evaluate(fn, arg);

  test('choice reads the choice and sets it; mode is the one in use', async ({ page }) => {
    await open(page, { scheme: 'dark' });
    expect(await api(page, () => { const el = document.querySelector('luz-theme-mode'); return [el.choice, el.mode]; })).toEqual(['auto', 'dark']);
    await api(page, () => { document.querySelector('luz-theme-mode').choice = 'light'; });
    expect(await api(page, () => { const el = document.querySelector('luz-theme-mode'); return [el.choice, el.mode]; })).toEqual(['light', 'light']);
    expect(await attr(page, 'data-mode')).toBe('light');
    await expect(page.locator(BUTTON)).toHaveAccessibleName('Color mode: Light');
    expect(await stored(page)).toBe('light');
  });

  test('a choice that is not one is ignored', async ({ page }) => {
    await open(page);
    await api(page, () => { document.querySelector('luz-theme-mode').choice = 'sepia'; });
    expect(await api(page, () => document.querySelector('luz-theme-mode').choice)).toBe('auto');
    expect(await attr(page, 'data-mode')).toBe('light');
  });

  test('autoMode lets another script say what Auto means, and refresh() applies it', async ({ page }) => {
    await open(page, { scheme: 'light' });
    await api(page, () => {
      const el = document.querySelector('luz-theme-mode');
      el.autoMode = () => 'dark';
      el.refresh();
    });
    expect(await attr(page, 'data-mode')).toBe('dark');
    expect(await api(page, () => document.querySelector('luz-theme-mode').mode)).toBe('dark');
    await expect(page.locator(BUTTON)).toHaveAccessibleName('Color mode: Auto');
    await api(page, () => {
      const el = document.querySelector('luz-theme-mode');
      el.autoMode = () => undefined;
      el.refresh();
    });
    expect(await attr(page, 'data-mode'), 'nothing returned: the system').toBe('light');
  });

  test('autoMode does not outrank a choice, nor high contrast asked by the system', async ({ page }) => {
    await open(page, { scheme: 'light' });
    await api(page, () => { document.querySelector('luz-theme-mode').autoMode = () => 'dark'; });
    await page.locator(BUTTON).click(); // light
    expect(await attr(page, 'data-mode')).toBe('light');
    await page.locator(BUTTON).click();
    await page.locator(BUTTON).click();
    await page.locator(BUTTON).click(); // Auto
    await api(page, () => document.querySelector('luz-theme-mode').refresh());
    expect(await attr(page, 'data-mode')).toBe('dark');
    await page.emulateMedia({ contrast: 'more' });
    await expect.poll(() => attr(page, 'data-mode')).toBe('high-contrast');
  });
});

test.describe('two elements on a page', () => {
  test('stay in sync, whichever button is pressed', async ({ page }) => {
    await open(page, { url: TWO });
    await expect(page.locator(BUTTON)).toHaveCount(2);
    await page.locator(BUTTON).first().click(); // light
    await page.locator(BUTTON).first().click(); // dark
    await expect(page.locator(BUTTON).nth(1)).toHaveAccessibleName('Color mode (footer): Dark');
    await page.locator(BUTTON).nth(1).click(); // high contrast
    await expect(page.locator(BUTTON).first()).toHaveAccessibleName('Color mode: High contrast');
    expect(await attr(page, 'data-mode')).toBe('high-contrast');
    expect(await page.evaluate(() => [...document.querySelectorAll('luz-theme-mode input:checked')].map((i) => i.value))).toEqual(['high-contrast', 'high-contrast']);
  });

  test('the one that is not pressed does not announce', async ({ page }) => {
    await open(page, { url: TWO });
    await page.locator(BUTTON).first().click();
    await expect(page.locator('luz-theme-mode').first().getByRole('status')).toHaveText('Color mode: Light');
    await expect(page.locator('luz-theme-mode').nth(1).getByRole('status')).toHaveText('');
  });
});

test.describe('the status region', () => {
  const status = (page) => page.locator('luz-theme-mode').first().getByRole('status');

  test('is empty on load, and after a change the system made', async ({ page }) => {
    await open(page);
    await expect(status(page)).toHaveText('');
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect.poll(() => attr(page, 'data-mode')).toBe('dark');
    await expect(status(page)).toHaveText('');
  });

  test('says the name after a choice by the visitor, and is empty again after 3 s', async ({ page }) => {
    await open(page);
    await page.locator(BUTTON).click();
    await page.locator(BUTTON).click();
    await expect(status(page)).toHaveText('Color mode: Dark');
    await expect(status(page)).toHaveText('', { timeout: 5000 });
  });

  test('is not read by browse mode while it is empty: it is out of sight', async ({ page }) => {
    await open(page);
    const box = await status(page).evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { w: r.width, h: r.height };
    });
    expect(box.w).toBeLessThanOrEqual(1);
    expect(box.h).toBeLessThanOrEqual(1);
  });
});

test.describe('the chunk', () => {
  test('is requested only when the page has a <luz-theme-mode>', async ({ page }) => {
    const requested = [];
    page.on('request', (r) => /theme-mode(\.min)?\.js/.test(r.url()) && requested.push(r.url()));
    await page.goto('/tests/fixtures/theme-mode-absent.html');
    await expect(page.locator('h1')).toBeVisible();
    await page.waitForTimeout(500);
    expect(requested).toEqual([]);
    await page.goto(PAGE);
    await expect(page.locator(BUTTON)).toBeVisible();
    expect(requested.length).toBeGreaterThan(0);
  });

  test('the radios stay usable when it is blocked', async ({ page }) => {
    await page.route('**/theme-mode.min.js', (route) => route.abort());
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(PAGE);
    await page.waitForLoadState('load');
    await expect(page.locator(BUTTON)).toHaveCount(0);
    const options = page.locator('.luz-theme-mode__option');
    await expect(options).toHaveCount(4);
    for (const option of await options.all()) await expect(option).toBeVisible();
    await page.locator('.luz-theme-mode__option', { hasText: 'Dark' }).click();
    expect(await token(page, '--luz-surface-page')).toBe(resolveColor('dark', 'surface-page').toLowerCase());
    await page.locator('.luz-theme-mode__option', { hasText: 'High contrast' }).click();
    expect(await token(page, '--luz-surface-page')).toBe(resolveColor('high-contrast', 'surface-page').toLowerCase());
    await page.locator('.luz-theme-mode__option', { hasText: 'Auto' }).click();
    expect(await token(page, '--luz-surface-page')).toBe(resolveColor('light', 'surface-page').toLowerCase());
  });

  test('keeps the focus of a radio that has it when the chunk arrives late', async ({ page }) => {
    await page.route('**/theme-mode.min.js', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' });
    await expect(page.locator(BUTTON)).toHaveCount(0);
    await page.locator('luz-theme-mode input[value="auto"]').focus();
    expect(await page.evaluate(() => document.activeElement?.localName)).toBe('input');
    await expect(page.locator(BUTTON)).toBeVisible({ timeout: 8000 });
    await expect.poll(() => page.evaluate(() => document.activeElement?.className)).toContain('luz-theme-mode__button');
  });
});
