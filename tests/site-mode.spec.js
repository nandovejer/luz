// @ts-check
/**
 * <luz-theme-time> (catalog) around <luz-theme-mode> (core) on one page, with core's
 * luz.js and the boot scripts of the <head> (.claude/plans/theme-mode.md; before it
 * this file was <luz-color-mode> of F1 of .claude/plans/luz-home-docs-identity.md).
 * tests/fixtures/site-mode.html loads the two chunks on their own;
 * tests/fixtures/site-mode-luz.html adds core's luz.js, as a real page has it;
 * tests/fixtures/site-loader-mode-luz.html is the real loading path (luz.js, the boot
 * snippet and catalog.min.js, which loads theme-time.min.js on idle). The query
 * string authors the page: ?boot=dark&themes=brand&mode=dark&no-remember.
 *
 * What is here is what only the two elements and luz.js can show together: the
 * attributes of <html> never take a value they will not keep (no flash of the
 * wrong mode), the stored choice, the key, the throwing storage, the round
 * button with its names, and axe in each mode. The behaviour of each element
 * alone is tests/theme-mode.spec.js, tests/theme-mode-nojs.spec.js,
 * tests/theme-mode-a11y.spec.js, tests/theme-time.spec.js,
 * tests/theme-time-bar.spec.js and tests/theme-time-boot.spec.js.
 *
 * Not ported, with the element they tested (`by`, `for`, `light-attr`, `remember`,
 * the properties `mode` and `light`, and `preview("dawn")` by the name of a phase
 * are gone; the moments are the page's markup now): the clock's phases and their
 * boundaries, the attributes on another element, the preview and pin API and its
 * event are in tests/theme-time.spec.js and tests/theme-time-boot.spec.js.
 *
 * Without JavaScript the radios change the mode through tokens' :root:has(), and
 * the `auto` radio leaves the page light. That block switches JavaScript off for
 * itself; every other test needs JavaScript and skips itself where it is off.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { faded } from './helpers/settle.js';

const FIXTURE = '/tests/fixtures/site-mode.html';
const WITH_LUZ = '/tests/fixtures/site-mode-luz.html';
const LOADED = '/tests/fixtures/site-loader-mode-luz.html';
const KEY = 'luz-theme';

// A fixed zone, so "the local hour" is the same on every machine
test.use({ timezoneId: 'Europe/Madrid' });

/** An ISO time at `hh:mm[:ss]` on a June day in Madrid (UTC+2). */
const at = (hhmm) => `2026-06-15T${hhmm.length === 5 ? `${hhmm}:00` : hhmm}+02:00`;

/**
 * Open the fixture and wait for both elements to be defined and for <luz-theme-time> to have
 * fired its first luz-theme-time:change, so a missing chunk fails here, as a timeout of the poll.
 * @param {import('@playwright/test').Page} page
 * @param {string} query the query string that authors the page
 * @param {{ fixture?: string, time?: string, scheme?: 'light'|'dark', contrast?: 'more'|'no-preference', stored?: string, throwingStorage?: boolean }} [options]
 */
async function open(page, query = '', { fixture = FIXTURE, time = at('09:30'), scheme = 'light', contrast = 'no-preference', stored, throwingStorage = false } = {}) {
  await page.clock.install({ time });
  await page.emulateMedia({ colorScheme: scheme, contrast });
  await page.addInitScript(() => {
    const w = /** @type {any} */ (window);
    w.__changes = [];
    w.__modeChanges = [];
    w.__theme = [];
    w.__themeFirst = false;
    document.addEventListener('luz-theme-time:change', (e) => w.__changes.push({ ...(/** @type {CustomEvent} */ (e)).detail }));
    document.addEventListener('luz-theme-mode:change', (e) => w.__modeChanges.push({ ...(/** @type {CustomEvent} */ (e)).detail }));
    // Every value data-theme takes on <html>, from the first script on: each write is
    // read from the next record's oldValue (two writes in one task are two values), and
    // the last one from the attribute. The first record's oldValue is the attribute
    // before the page wrote it, which is no value of the page.
    const drain = (/** @type {MutationRecord[]} */ records) => {
      for (const r of records) {
        if (r.target !== document.documentElement) continue;
        if (w.__themeFirst || r.oldValue !== null) w.__theme.push(r.oldValue);
        w.__themeFirst = true;
      }
    };
    const observer = new MutationObserver(drain);
    observer.observe(document, { attributes: true, subtree: true, attributeFilter: ['data-theme'], attributeOldValue: true });
    w.__themeHistory = () => {
      drain(observer.takeRecords());
      return [...w.__theme, document.documentElement.getAttribute('data-theme')];
    };
  });
  if (stored !== undefined) {
    await page.addInitScript(([k, v]) => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem(k, v);
        sessionStorage.setItem('seeded', '1');
      }
    }, [KEY, stored]);
  }
  if (throwingStorage) {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('denied', 'SecurityError'); } });
    });
  }
  await page.goto(`${fixture}${query ? `?${query}` : ''}`);
  await expect.poll(() => page.evaluate(() => !!(customElements.get('luz-theme-time') && customElements.get('luz-theme-mode')))).toBe(true);
  await expect.poll(() => page.evaluate(() => /** @type {any} */ (window).__changes.length)).toBeGreaterThan(0);
}

/** What the page says about the mode now. */
const state = (page) =>
  page.evaluate(() => {
    const el = /** @type {any} */ (document.getElementById('mode'));
    return {
      theme: document.documentElement.getAttribute('data-theme'),
      moment: document.documentElement.getAttribute('data-moment'),
      mode: el.choice,
      checked: document.querySelector('input[name="luz-theme-mode"]:checked')?.getAttribute('value') ?? null,
    };
  });

const choose = (page, label) => page.locator('#mode label', { hasText: new RegExp(`^${label}$`) }).click();
/** The element's own way to choose, once the button hides the radios. */
const setChoice = (page, value) => page.evaluate((v) => { /** @type {any} */ (document.getElementById('mode')).choice = v; }, value);
const stored = (page) => page.evaluate((k) => localStorage.getItem(k), KEY);
const button = (page) => page.locator('#mode .luz-theme-mode__button');
/** Every value data-theme took on <html>, in order, the last one included. */
const themeHistory = (page) => page.evaluate(() => /** @type {any} */ (window).__themeHistory());
const settled = async (page) => {
  await page.waitForLoadState('load');
  await page.waitForTimeout(200);
};

/* ---- Without JavaScript ------------------------------------------------- */

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the four radios show, auto is checked and the page is light', async ({ page }) => {
    await page.goto(FIXTURE);
    await expect(page.locator('#mode legend')).toBeVisible();
    for (const label of ['Auto', 'Light', 'Dark', 'High contrast']) await expect(page.locator('#mode label', { hasText: new RegExp(`^${label}$`) })).toBeVisible();
    await expect(page.locator('#mode input[value="auto"]')).toBeChecked();
    expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBeNull();
  });

  test('a radio changes the mode through the tokens, and auto leaves the page light', async ({ page }) => {
    await page.goto(FIXTURE);
    const surface = () => page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--luz-surface-page').trim());
    const lightSurface = await surface();
    expect(lightSurface).not.toBe('');
    await choose(page, 'Dark');
    const dark = await surface();
    expect(dark).not.toBe(lightSurface);
    await choose(page, 'High contrast');
    const contrast = await surface();
    expect(contrast).not.toBe(lightSurface);
    expect(contrast).not.toBe(dark);
    await choose(page, 'Light');
    expect(await surface()).toBe(lightSurface);
    await choose(page, 'Dark');
    await choose(page, 'Auto');
    expect(await surface()).toBe(lightSurface);
  });

  test('the moments of the day are a declaration: not shown, and no moment is written', async ({ page }) => {
    await page.goto(FIXTURE);
    await expect(page.locator('.luz-theme-time__moments')).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.hasAttribute('data-moment'))).toBe(false);
  });
});

/* ---- The chunks on their own -------------------------------------------- */

test.describe('<luz-theme-time> around <luz-theme-mode>, the two chunks and no luz.js', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript');

  for (const [mode, value] of [['Auto', 'auto'], ['Light', 'light'], ['Dark', 'dark'], ['High contrast', 'high-contrast']]) {
    test(`axe finds nothing serious with ${mode} chosen`, async ({ page }) => {
      await open(page, '', { time: at('09:30') });
      await setChoice(page, value);
      // Not inside the 1.4 s colour fade: axe would sample a colour mid-transition
      await faded(page);
      const found = (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze())
        .violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? '')).map((v) => v.id);
      expect(found).toEqual([]);
    });
  }

  test('the four radios are one group named by its legend, with the auto radio first', async ({ page }) => {
    await open(page);
    // With the button the group is out of sight: the button is named by the legend and the checked label
    await expect(button(page)).toHaveAccessibleName('Color mode: Auto');
    expect(await page.locator('#mode input[name="luz-theme-mode"]').evaluateAll((els) => els.map((e) => /** @type {HTMLInputElement} */ (e).value))).toEqual(['auto', 'light', 'dark', 'high-contrast']);
  });

  test('writes no text of its own: the markup keeps the four labels it was given', async ({ page }) => {
    await open(page);
    const labels = () => page.locator('#mode label').allInnerTexts();
    const before = await labels();
    expect(before.map((t) => t.trim())).toEqual(['Auto', 'Light', 'Dark', 'High contrast']);
    await button(page).click();
    await page.waitForTimeout(100);
    expect(await labels()).toEqual(before);
  });
});

/* ---- Together with core's luz.js ---------------------------------------- */

test.describe('<luz-theme-time> on a page that also loads luz.js', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript');

  test('system dark, served dark, at dusk: data-theme only ever takes "dark", and the auto radio stays checked', async ({ page }) => {
    await open(page, 'boot=dark', { fixture: WITH_LUZ, scheme: 'dark', time: at('21:30') });
    await settled(page);
    expect(new Set(await themeHistory(page))).toEqual(new Set(['dark']));
    expect(await state(page)).toEqual({ theme: 'dark', moment: 'dusk', mode: 'auto', checked: 'auto' });
  });

  test('system light, served light, in the morning: data-theme only ever takes "light", and the auto radio stays checked', async ({ page }) => {
    await open(page, 'boot=light', { fixture: WITH_LUZ });
    await settled(page);
    expect(new Set(await themeHistory(page))).toEqual(new Set(['light']));
    expect(await state(page)).toEqual({ theme: 'light', moment: 'morning', mode: 'auto', checked: 'auto' });
  });

  test('a stored dark: core and the element agree, data-theme only ever takes "dark", the dark radio is checked and the night shows', async ({ page }) => {
    await open(page, 'boot=dark', { fixture: WITH_LUZ, stored: 'dark', time: at('09:30') });
    await settled(page);
    expect(new Set(await themeHistory(page))).toEqual(new Set(['dark']));
    expect(await state(page)).toEqual({ theme: 'dark', moment: 'night', mode: 'dark', checked: 'dark' });
    expect(await stored(page)).toBe('dark');
  });

  test('the real loading path (luz.js, the boot snippet, catalog.min.js loading the chunk on idle): data-theme only ever takes "dark", the auto radio stays checked', async ({ page }) => {
    await open(page, 'boot=dark', { fixture: LOADED, scheme: 'dark', time: at('21:30') });
    await settled(page);
    expect(new Set(await themeHistory(page))).toEqual(new Set(['dark']));
    expect(await state(page)).toEqual({ theme: 'dark', moment: 'dusk', mode: 'auto', checked: 'auto' });
  });

  test('the real loading path with a stored dark: one value for data-theme, and the dark radio is checked', async ({ page }) => {
    await open(page, 'boot=dark', { fixture: LOADED, stored: 'dark', time: at('09:30') });
    await settled(page);
    expect(new Set(await themeHistory(page))).toEqual(new Set(['dark']));
    expect(await state(page)).toEqual({ theme: 'dark', moment: 'night', mode: 'dark', checked: 'dark' });
  });

  test('a storage that throws does not stop the elements or core, and a choice still applies', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await open(page, 'boot=light', { fixture: WITH_LUZ, throwingStorage: true });
    await settled(page);
    expect(await state(page)).toEqual({ theme: 'light', moment: 'morning', mode: 'auto', checked: 'auto' });
    await button(page).click(); // auto -> light
    await button(page).click(); // light -> dark
    await expect.poll(() => state(page)).toMatchObject({ theme: 'dark', mode: 'dark', checked: 'dark' });
    expect(errors).toEqual([]);
  });

  test('the auto radio is the one checked on load: no radio is left unchecked', async ({ page }) => {
    await open(page, 'boot=light', { fixture: WITH_LUZ });
    await settled(page);
    expect(await page.locator('#mode input[name="luz-theme-mode"]:checked').count()).toBe(1);
    expect(await page.locator('#mode input[value="auto"]').isChecked()).toBe(true);
  });

  test('choosing a mode agrees with core: one value for data-theme, the same one in the key', async ({ page }) => {
    await open(page, 'boot=light', { fixture: WITH_LUZ });
    await page.evaluate(() => { /** @type {any} */ (window).__themeHistory(); /** @type {any} */ (window).__theme.length = 0; });
    await button(page).click(); // auto -> light
    await button(page).click(); // light -> dark
    await expect.poll(() => state(page)).toMatchObject({ theme: 'dark', mode: 'dark', checked: 'dark' });
    expect(await stored(page)).toBe('dark');
    expect((await themeHistory(page)).filter((v) => !['light', 'dark'].includes(v))).toEqual([]);
  });

  test('with no-remember a choice stores nothing: a reload starts in auto, with no transient wrong value', async ({ page }) => {
    await open(page, 'boot=dark&no-remember', { fixture: WITH_LUZ, scheme: 'dark', time: at('21:30') });
    await settled(page);
    await button(page).click(); // auto -> light
    await expect.poll(() => state(page)).toMatchObject({ theme: 'light', mode: 'light', checked: 'light' });
    expect(await stored(page), 'nothing is stored').toBeNull();
    await button(page).click(); // light -> dark
    await button(page).click(); // dark -> high contrast
    await expect.poll(() => state(page)).toMatchObject({ theme: 'high-contrast', mode: 'high-contrast' });
    expect(await stored(page)).toBeNull();
    // A reload: the system is dark and it is dusk, nothing is stored, so auto, dark, and never another value
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!(customElements.get('luz-theme-time') && customElements.get('luz-theme-mode')))).toBe(true);
    await expect.poll(() => page.evaluate(() => /** @type {any} */ (window).__changes.length)).toBeGreaterThan(0);
    await settled(page);
    expect(await state(page)).toEqual({ theme: 'dark', moment: 'dusk', mode: 'auto', checked: 'auto' });
    expect(new Set(await themeHistory(page))).toEqual(new Set(['dark']));
    expect(await stored(page)).toBeNull();
  });

  test('going back to auto removes the key and follows the hour', async ({ page }) => {
    await open(page, 'boot=dark', { fixture: WITH_LUZ, scheme: 'dark', stored: 'high-contrast', time: at('09:30') });
    expect(await state(page)).toMatchObject({ mode: 'high-contrast' });
    await button(page).click(); // high-contrast -> auto
    await expect.poll(() => state(page)).toEqual({ theme: 'light', moment: 'morning', mode: 'auto', checked: 'auto' });
    expect(await stored(page)).toBeNull();
  });

  test.describe('the round button', () => {
    test('walks four states: auto, light, dark, high contrast, then auto again, with the moment each one shows', async ({ page }) => {
      await open(page, 'boot=light', { fixture: WITH_LUZ, time: at('09:30') });
      await expect(button(page)).toHaveCount(1);
      await expect(button(page)).toBeVisible();
      await expect(button(page)).toHaveAccessibleName('Color mode: Auto');
      // The radios give way to the button
      await expect(page.locator('#mode label').first()).toBeHidden();
      const steps = [
        ['light', 'Light', 'light', 'afternoon'],
        ['dark', 'Dark', 'dark', 'night'],
        ['high-contrast', 'High contrast', 'high-contrast', 'night'],
        ['auto', 'Auto', 'light', 'morning'], // auto in the morning
      ];
      for (const [value, label, theme, moment] of steps) {
        await button(page).click();
        await expect.poll(() => state(page), value).toMatchObject({ theme, moment, mode: value, checked: value });
        await expect(button(page)).toHaveAccessibleName(`Color mode: ${label}`);
      }
    });

    test('works from the keyboard', async ({ page }) => {
      await open(page, 'boot=light', { fixture: WITH_LUZ });
      await button(page).focus();
      await page.keyboard.press('Enter');
      await expect.poll(() => state(page)).toMatchObject({ mode: 'light', checked: 'light' });
      await page.keyboard.press('Space');
      await expect.poll(() => state(page)).toMatchObject({ mode: 'dark', theme: 'dark' });
    });

    test('luz-theme-mode:change comes with every step, and luz-theme-time:change with the moment it shows', async ({ page }) => {
      await open(page, 'boot=light', { fixture: WITH_LUZ, time: at('09:30') });
      await page.waitForTimeout(100);
      const modes = () => page.evaluate(() => /** @type {any} */ (window).__modeChanges);
      const moments = () => page.evaluate(() => /** @type {any} */ (window).__changes);
      const first = (await modes()).length; // the upgrade
      const seen = [];
      for (let i = 0; i < 4; i++) {
        await button(page).click();
        await expect.poll(async () => (await modes()).length).toBe(first + seen.length + 1);
        await page.waitForTimeout(100); // and no second event for the same click
        expect((await modes()).length).toBe(first + seen.length + 1);
        seen.push((await modes()).at(-1));
      }
      expect(seen.map((e) => [e.mode, e.auto, e.user])).toEqual([['light', false, true], ['dark', false, true], ['high-contrast', false, true], ['light', true, true]]);
      expect((await moments()).at(-1)).toMatchObject({ moment: 'morning' });
    });
  });
});
