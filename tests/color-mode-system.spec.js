// @ts-check
/**
 * The default colour mode follows the system, with no JavaScript (plan
 * component-gaps, section 18; owner, 2026-11-03). A page that names no mode (no
 * data-mode and no data-theme on <html>, and no checked light, dark or high
 * contrast radio of <luz-theme-mode>) takes the dark tokens under
 * prefers-color-scheme: dark and the high contrast tokens under
 * prefers-contrast: more (which wins, as theme-boot.js has it), and is light
 * otherwise. Any explicit choice wins over the system; a brand theme is
 * untouched. The date picker and the open list of a select read the same choice
 * through color-scheme.
 *
 * The file turns JavaScript off itself (the page has no script either), so it
 * runs the same in both projects. The CSS of the tokens and of core is in
 * tests/color-mode-system.test.js; here is the page.
 */
import { test, expect } from '@playwright/test';
import { resolveColor } from './helpers/design-tokens.js';
import { parseColor } from '../packages/tokens/lib/contrast.js';

test.use({ javaScriptEnabled: false, reducedMotion: 'reduce' });

const PAGE = '/tests/fixtures/color-mode-system.html';
const BRAND = '/tests/fixtures/theme-mode-brand.html';
const CONDITIONAL = '/tests/fixtures/conditional.html';
const DOCS = '/docs/tokens/modes/';

/** The system's two preferences, as the emulation names them. */
const LIGHT = { colorScheme: 'light', contrast: 'no-preference' };
const DARK = { colorScheme: 'dark', contrast: 'no-preference' };
const LIGHT_MORE = { colorScheme: 'light', contrast: 'more' };
const DARK_MORE = { colorScheme: 'dark', contrast: 'more' };
const SYSTEMS = { light: LIGHT, dark: DARK, 'light with more contrast': LIGHT_MORE, 'dark with more contrast': DARK_MORE };
/** What each system asks for, with nothing chosen. */
const FOLLOWS = { light: 'light', dark: 'dark', 'light with more contrast': 'high-contrast', 'dark with more contrast': 'high-contrast' };

const TOKENS = ['surface-page', 'text-primary', 'brand-fill'];

const open = async (page, system, url = PAGE) => {
  await page.emulateMedia(system);
  await page.goto(url);
};

/** A colour as one string, whether the page or the source wrote it as #rrggbb or as rgb(). */
const rgb = (color) => {
  const { r, g, b } = parseColor(color);
  return `rgb(${r}, ${g}, ${b})`;
};
/** The computed value of the tokens of a mode, as the page has them. */
const tokensOf = async (page) => {
  const raw = await page.evaluate((names) => Object.fromEntries(names.map((n) => [n, getComputedStyle(document.documentElement).getPropertyValue(`--luz-${n}`).trim()])), TOKENS);
  return Object.fromEntries(Object.entries(raw).map(([name, value]) => [name, value.startsWith('#') || value.startsWith('rgb') ? rgb(value) : value]));
};
const expected = (mode) => Object.fromEntries(TOKENS.map((n) => [n, rgb(resolveColor(mode, n))]));
const bodyBackground = (page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

/** Whether the page is in this mode: its tokens, and the paint of its body. */
async function expectMode(page, mode, why) {
  expect(await tokensOf(page), why).toEqual(expected(mode));
  expect(await bodyBackground(page), `${why}: the body`).toBe(rgb(resolveColor(mode, 'surface-page')));
}

const scheme = (page, selector) => page.locator(selector).evaluate((el) => getComputedStyle(el).colorScheme);
const CONTROLS = { select: '#sel', '.luz-select': '#sel-luz', 'input[type=date]': '#date', '.luz-input[type=time]': '#time' };
async function expectControls(page, expectedScheme, why) {
  for (const [name, selector] of Object.entries(CONTROLS)) expect(await scheme(page, selector), `${why}: ${name}`).toBe(expectedScheme);
}

const option = (page, name) => page.locator('.luz-theme-mode__option', { hasText: name });
const root = (page, attrs) =>
  page.evaluate((a) => {
    for (const [name, value] of Object.entries(a)) document.documentElement.setAttribute(name, value);
  }, attrs);

test.describe('a page that names no mode follows the system, with no script', () => {
  for (const [name, system] of Object.entries(SYSTEMS)) {
    test(`takes the ${FOLLOWS[name]} tokens under a ${name} system`, async ({ page }) => {
      await open(page, system);
      await expectMode(page, FOLLOWS[name], name);
    });
  }

  test('has no data-theme and no data-mode of its own, so the tokens below are the system\'s and nothing else', async ({ page }) => {
    await open(page, DARK);
    expect(await page.evaluate(() => [document.documentElement.getAttribute('data-theme'), document.documentElement.getAttribute('data-mode')])).toEqual([null, null]);
  });

  test('follows the system when the layout of the docs is stripped of its data-theme', async ({ page }) => {
    // The real layout names light; a site that drops the attribute gets the system
    await page.route(`**${DOCS}`, async (route) => {
      const response = await route.fetch();
      const html = (await response.text()).replace(/(<html\b[^>]*?)\sdata-theme="light"/i, '$1');
      await route.fulfill({ response, body: html });
    });
    for (const [name, system] of Object.entries(SYSTEMS)) {
      await open(page, system, DOCS);
      expect(await page.evaluate(() => document.documentElement.hasAttribute('data-theme')), 'the attribute is gone').toBe(false);
      await expectMode(page, FOLLOWS[name], `docs layout, ${name}`);
    }
  });
});

test.describe('every explicit choice wins over the system', () => {
  for (const [name, system] of Object.entries(SYSTEMS)) {
    test(`data-theme names the mode under a ${name} system`, async ({ page }) => {
      for (const mode of ['light', 'dark', 'high-contrast']) {
        await open(page, system);
        await root(page, { 'data-theme': mode });
        await expectMode(page, mode, `data-theme="${mode}", ${name}`);
      }
    });

    test(`data-mode with data-theme (as <luz-theme-mode> writes them) names the mode under a ${name} system`, async ({ page }) => {
      for (const mode of ['light', 'dark', 'high-contrast']) {
        await open(page, system);
        await root(page, { 'data-mode': mode, 'data-theme': mode });
        await expectMode(page, mode, `data-mode and data-theme "${mode}", ${name}`);
      }
    });

    test(`a checked radio names the mode under a ${name} system`, async ({ page }) => {
      for (const [label, mode] of [['Light', 'light'], ['Dark', 'dark'], ['High contrast', 'high-contrast']]) {
        await open(page, system);
        await option(page, label).click();
        await expectMode(page, mode, `${label} radio, ${name}`);
      }
    });

    test(`a data-mode alone (no data-theme) leaves the system out of it under a ${name} system`, async ({ page }) => {
      await open(page, system);
      await root(page, { 'data-mode': 'light' });
      await expectMode(page, 'light', `data-mode="light", ${name}`);
    });

    test(`Auto, a radio with no value and no radio follow the system under a ${name} system`, async ({ page }) => {
      const mode = FOLLOWS[name];
      await open(page, system);
      await expectMode(page, mode, `Auto checked first, ${name}`);

      await option(page, 'Light').click();
      await option(page, 'Dark').click();
      await option(page, 'Auto').click();
      await expectMode(page, mode, `Auto checked again after another radio, ${name}`);

      await page.evaluate(() => {
        const radio = /** @type {HTMLInputElement} */ (document.querySelector('input[value="dark"]'));
        radio.removeAttribute('value');
        radio.checked = true;
      });
      await expectMode(page, mode, `a checked radio with no value, ${name}`);

      await page.evaluate(() => document.querySelector('luz-theme-mode')?.remove());
      await expectMode(page, mode, `no radio at all, ${name}`);
    });
  }
});

test.describe('a brand theme is untouched by the system', () => {
  test('keeps its first block under a dark, a high contrast and a dark high contrast system', async ({ page }) => {
    await open(page, LIGHT, BRAND);
    const brandSurface = (await tokensOf(page))['surface-page'];
    expect(brandSurface, 'the brand is in the page').toBe(rgb('#fde8ff'));
    for (const [name, system] of Object.entries({ dark: DARK, 'light with more contrast': LIGHT_MORE, 'dark with more contrast': DARK_MORE })) {
      await open(page, system, BRAND);
      expect((await tokensOf(page))['surface-page'], name).toBe(brandSurface);
      expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('my-brand');
    }
  });
});

test.describe('the date and time pickers and the list of a select follow the same choice', () => {
  test('are dark under a dark system, light under a light one, and light under more contrast', async ({ page }) => {
    await open(page, LIGHT);
    await expectControls(page, 'light', 'light system');
    await open(page, DARK);
    await expectControls(page, 'dark', 'dark system');
    await open(page, LIGHT_MORE);
    await expectControls(page, 'light', 'light system with more contrast');
    await open(page, DARK_MORE);
    await expectControls(page, 'light', 'dark system with more contrast: high contrast is light');
  });

  test('an explicit choice wins over the system', async ({ page }) => {
    await open(page, LIGHT);
    await root(page, { 'data-theme': 'dark' });
    await expectControls(page, 'dark', 'data-theme dark in a light system');
    await open(page, LIGHT);
    await root(page, { 'data-mode': 'dark', 'data-theme': 'dark' });
    await expectControls(page, 'dark', 'data-mode dark in a light system');
    await open(page, LIGHT);
    await option(page, 'Dark').click();
    await expectControls(page, 'dark', 'the dark radio in a light system');

    for (const system of [DARK, DARK_MORE]) {
      await open(page, system);
      await root(page, { 'data-theme': 'light' });
      await expectControls(page, 'light', 'data-theme light in a dark system');
      await open(page, system);
      await option(page, 'Light').click();
      await expectControls(page, 'light', 'the light radio in a dark system');
      await open(page, system);
      await option(page, 'High contrast').click();
      await expectControls(page, 'light', 'the high contrast radio in a dark system');
    }
  });

  test('a checked Auto follows the system, also after another radio', async ({ page }) => {
    await open(page, DARK);
    await expectControls(page, 'dark', 'Auto first');
    await option(page, 'Light').click();
    await expectControls(page, 'light', 'light radio');
    await option(page, 'Auto').click();
    await expectControls(page, 'dark', 'Auto again');
  });
});

test.describe('on paper', () => {
  test('the pickers and the select are light under a dark system: the print rules still win', async ({ page }) => {
    await page.emulateMedia({ ...DARK, media: 'print' });
    await page.goto(PAGE);
    await expectControls(page, 'light', 'print, dark system');
  });
});

test.describe('luz.conditional.css follows the system too', () => {
  test('a select in the zone and a component outside it are dark under a dark system, and the legacy select is left alone', async ({ page }) => {
    for (const [name, system, expectedScheme] of [['dark', DARK, 'dark'], ['light', LIGHT, 'light'], ['dark with more contrast', DARK_MORE, 'light']]) {
      await open(page, system, CONDITIONAL);
      await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));
      expect(await scheme(page, '#zone-select'), `the zone, ${name}`).toBe(expectedScheme);
      expect(await scheme(page, '#c-select'), `.luz-select outside the zone, ${name}`).toBe(expectedScheme);
      expect(await scheme(page, '#legacy-select'), `the page's own select, ${name}`).toBe('normal');
    }
  });

  test('an explicit light on <html> wins over a dark system', async ({ page }) => {
    await open(page, DARK, CONDITIONAL);
    // The fixture names light on <html>
    expect(await scheme(page, '#zone-select')).toBe('light');
    expect(await scheme(page, '#c-select')).toBe('light');
  });

  test('a dark mode on <html>, on the zone and inside the zone reaches the select in a light system', async ({ page }) => {
    await open(page, LIGHT, CONDITIONAL);
    await root(page, { 'data-theme': 'dark' });
    expect(await scheme(page, '#zone-select'), 'on <html>').toBe('dark');
    await root(page, { 'data-theme': 'light' });
    expect(await scheme(page, '#zone-select')).toBe('light');
    await page.evaluate(() => document.getElementById('zone')?.setAttribute('data-mode', 'dark'));
    expect(await scheme(page, '#zone-select'), 'on the zone').toBe('dark');
    expect(await scheme(page, '#zone-select-dark'), 'inside the zone').toBe('dark');
  });
});
