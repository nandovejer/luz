// @ts-check
/**
 * <luz-theme-time> (catalog): core's color mode with the moments of the day. It
 * wraps a <luz-theme-mode>; the moments are options inside it with their
 * `data-from` (HH:MM) and the `data-theme` they are painted over.
 *
 * Auto is the visitor's system (prefers-color-scheme, and prefers-contrast: more
 * for high contrast) and the clock decides nothing (owner, 2026-11-04). The hour
 * counts only when it is pinned or previewed (`pin(hour)`, `preview(hour)`, a
 * stored `luz-light`): then the page shows the moment at that hour, in Auto, and
 * Auto is the radio checked and the name of the button. With nothing pinned, the
 * radio checked is the mode in use (Light, Dark or High contrast) and nothing is
 * stored; data-moment is the default moment of the mode in use.
 *
 * The page is tests/fixtures/theme-time.html (the moments, core's inline
 * button, no bar): dawn 05:00 dark, morning 07:30 light, afternoon 12:00 light
 * (the default of a light mode), sunset 17:30 light, dusk 20:30 dark, night
 * 22:30 dark (the default of a dark or high contrast mode). The clock is the
 * page's own (a June day in Madrid); the bar has tests/theme-time-bar.spec.js
 * and the boot script tests/theme-time-boot.spec.js.
 *
 * This file also runs in chromium-nojs: with JavaScript off the page is
 * core's radios and nothing else, and the moments are a declaration that
 * shows nothing. Every other describe needs JavaScript and skips itself there.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { faded } from './helpers/settle.js';
import { NO_CHOICE, TIMEZONE, atTime, pinHour, seedMode, vejer } from './helpers/site-lights.js';
import { ABSENT, BAR, HOURS, PLAIN, open, rootState } from './helpers/theme-time.js';

const jsOff = () => test.info().project.use.javaScriptEnabled === false;

test.use({ timezoneId: TIMEZONE, storageState: NO_CHOICE });

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** The core button, the element and its API, from the page. */
const element = (page) => page.locator('luz-theme-time').first();
const button = (page) => page.locator('.luz-theme-mode__button');
/** The values of core's radios that are checked (one, or none): the mode in use, or Auto while an hour is chosen. */
const checked = (page) => page.evaluate(() => [...document.querySelectorAll('luz-theme-mode input[type=radio]:checked')].map((i) => i.value));
/** The moments of the day that are checked: only while the hour is a choice. */
const momentsChecked = (page) => page.evaluate(() => [...document.querySelectorAll('luz-theme-time input[data-from]:checked')].map((i) => i.value));
const stored = (page, key) => page.evaluate((k) => localStorage.getItem(k), key);
const LIGHT = { moment: 'afternoon', mode: 'light', theme: 'light' };
const DARK = { moment: 'night', mode: 'dark', theme: 'dark' };
const CONTRAST = { moment: 'night', mode: 'high-contrast', theme: 'high-contrast' };

test.describe('Auto is the visitor\'s system, and the clock decides nothing', () => {
  test.skip(jsOff, 'needs JavaScript');

  for (const [hhmm] of HOURS) {
    test(`a light system at ${hhmm} is the afternoon over light`, async ({ page }) => {
      await open(page, PLAIN, { time: hhmm });
      expect(await rootState(page)).toEqual(LIGHT);
      await expect(element(page)).toHaveJSProperty('moment', 'afternoon');
    });
  }

  for (const hhmm of ['02:00', '09:00', '14:00', '21:00']) {
    test(`a dark system at ${hhmm} is the night over dark`, async ({ browser }) => {
      const context = await browser.newContext({ colorScheme: 'dark', timezoneId: TIMEZONE, storageState: NO_CHOICE });
      const page = await context.newPage();
      await open(page, PLAIN, { time: hhmm });
      expect(await rootState(page)).toEqual(DARK);
      await context.close();
    });
  }

  test('the page does not move when the minute or the hour comes: no timer follows the clock', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-06-15T17:29:30+02:00') });
    await page.goto(PLAIN);
    await expect.poll(() => page.evaluate(() => !!customElements.get('luz-theme-time'))).toBe(true);
    expect(await rootState(page)).toEqual(LIGHT);
    await page.clock.runFor(31_000);
    expect(await page.evaluate(() => new Date().getMinutes())).toBe(30);
    expect(await rootState(page), 'sunset has begun by the clock').toEqual(LIGHT);
    await page.clock.runFor(6 * 3600 * 1000);
    expect(await rootState(page), 'and it is the night by the clock').toEqual(LIGHT);
  });

  test('a system that asks for more contrast is the high contrast mode with the night, at any hour', async ({ page }) => {
    await page.emulateMedia({ contrast: 'more' });
    await open(page, PLAIN, { time: '14:00' });
    expect(await rootState(page)).toEqual(CONTRAST);
  });

  test('the system changing while the page is open is followed, the moment and the button with it', async ({ page }) => {
    await open(page, PLAIN, { time: '14:00' });
    expect(await rootState(page)).toEqual(LIGHT);
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect.poll(() => rootState(page)).toEqual(DARK);
    expect(await checked(page)).toEqual(['dark']);
    await expect(button(page)).toHaveAccessibleName('Color mode: Dark');
    await page.emulateMedia({ colorScheme: 'light' });
    await expect.poll(() => rootState(page)).toEqual(LIGHT);
    expect(await checked(page)).toEqual(['light']);
    await expect(button(page)).toHaveAccessibleName('Color mode: Light');
    expect(await stored(page, 'luz-theme'), 'the system is not a choice').toBeNull();
  });

  test('high contrast chosen in core\'s button wins too, over a light system', async ({ page }) => {
    await open(page, PLAIN, { time: '09:00' });
    await element(page).evaluate((el) => {
      el.querySelector('luz-theme-mode').choice = 'high-contrast';
    });
    const state = await rootState(page);
    expect(state.mode).toBe('high-contrast');
    expect(state.theme).toBe('high-contrast');
  });
});

test.describe('the radio checked and the button are the mode in use; Auto only while an hour is chosen', () => {
  test.skip(jsOff, 'needs JavaScript');

  for (const [name, scheme, contrast, value, label] of [
    ['a light system', 'light', 'no-preference', 'light', 'Color mode: Light'],
    ['a dark system', 'dark', 'no-preference', 'dark', 'Color mode: Dark'],
    ['a system that asks for more contrast', 'light', 'more', 'high-contrast', 'Color mode: High contrast'],
  ]) {
    test(`${name}, with nothing stored: ${value} is checked, the button is named "${label}", and nothing is stored`, async ({ browser }) => {
      const context = await browser.newContext({ colorScheme: scheme, contrast, timezoneId: TIMEZONE, storageState: NO_CHOICE });
      const page = await context.newPage();
      await open(page, PLAIN);
      expect(await checked(page)).toEqual([value]);
      await expect(button(page)).toHaveAccessibleName(label);
      expect(await stored(page, 'luz-theme')).toBeNull();
      expect(await stored(page, 'luz-light')).toBeNull();
      expect(await momentsChecked(page), 'no moment is a choice').toEqual([]);
      await context.close();
    });
  }

  test('pin(8) checks Auto and names the button "Color mode: Auto", with the morning checked; nothing is stored under luz-theme', async ({ page }) => {
    await open(page, PLAIN);
    await element(page).evaluate((node) => node.pin(8));
    expect(await rootState(page)).toMatchObject({ moment: 'morning', mode: 'light' });
    expect(await checked(page)).toEqual(['auto']);
    expect(await momentsChecked(page)).toEqual(['morning']);
    await expect(button(page)).toHaveAccessibleName('Color mode: Auto');
    expect(await stored(page, 'luz-light')).toBe('480');
    expect(await stored(page, 'luz-theme')).toBeNull();
  });

  test('an hour pinned survives a reload: Auto is checked, the moment is the hour\'s', async ({ page }) => {
    await open(page, PLAIN);
    await element(page).evaluate((node) => node.pin(8));
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!customElements.get('luz-theme-time'))).toBe(true);
    expect(await rootState(page)).toMatchObject({ moment: 'morning', mode: 'light' });
    expect(await checked(page)).toEqual(['auto']);
    await expect(button(page)).toHaveAccessibleName('Color mode: Auto');
  });

  test('preview(21) checks Auto while it lasts, and preview(null) gives the system\'s radio back', async ({ page }) => {
    await open(page, PLAIN);
    await element(page).evaluate((node) => node.preview(21));
    expect(await rootState(page)).toMatchObject({ moment: 'dusk', mode: 'dark' });
    expect(await checked(page)).toEqual(['auto']);
    await expect(button(page)).toHaveAccessibleName('Color mode: Auto');
    await element(page).evaluate((node) => node.preview(null));
    expect(await rootState(page)).toEqual(LIGHT);
    expect(await checked(page)).toEqual(['light']);
    await expect(button(page)).toHaveAccessibleName('Color mode: Light');
    expect(await momentsChecked(page)).toEqual([]);
  });

  test('unpin() gives the system\'s radio back and stores nothing', async ({ page }) => {
    await open(page, PLAIN);
    await element(page).evaluate((node) => node.pin(8));
    await element(page).evaluate((node) => node.unpin());
    expect(await checked(page)).toEqual(['light']);
    await expect(button(page)).toHaveAccessibleName('Color mode: Light');
    expect(await stored(page, 'luz-light')).toBeNull();
    expect(await stored(page, 'luz-theme')).toBeNull();
  });

  test('a pinned hour wins over a dark system: Auto is checked and the morning is light', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'dark', timezoneId: TIMEZONE, storageState: NO_CHOICE });
    const page = await context.newPage();
    await open(page, PLAIN);
    expect(await checked(page)).toEqual(['dark']);
    await element(page).evaluate((node) => node.pin(8));
    expect(await rootState(page)).toMatchObject({ moment: 'morning', mode: 'light' });
    expect(await checked(page)).toEqual(['auto']);
    await context.close();
  });

  test('the status text follows the radio shown: back in Auto it names the system\'s mode, not the word Auto', async ({ page }) => {
    await open(page, PLAIN);
    const status = page.locator('luz-theme-mode').first().getByRole('status');
    await button(page).click();
    await expect(status).toHaveText('Color mode: Dark');
    await button(page).click();
    await expect(status).toHaveText('Color mode: High contrast');
    // The third press is Auto: the page shows the system's Light, and so do the button and the status
    await button(page).click();
    await expect(button(page)).toHaveAccessibleName('Color mode: Light');
    await expect(status).toHaveText('Color mode: Light');
    expect(await checked(page)).toEqual(['light']);
  });
});

test.describe('the button\'s first step: a light system goes to Dark, a dark one to Light', () => {
  test.skip(jsOff, 'needs JavaScript');

  test('a light system, untimed Auto: the first press is Dark, then High contrast, then Auto again (Light, the system\'s)', async ({ page }) => {
    await open(page, PLAIN);
    expect(await checked(page)).toEqual(['light']);
    await button(page).click();
    expect(await rootState(page)).toEqual(DARK);
    expect(await checked(page)).toEqual(['dark']);
    await expect(button(page)).toHaveAccessibleName('Color mode: Dark');
    expect(await stored(page, 'luz-theme')).toBe('dark');
    await button(page).click();
    expect(await rootState(page)).toEqual(CONTRAST);
    expect(await checked(page)).toEqual(['high-contrast']);
    expect(await stored(page, 'luz-theme')).toBe('high-contrast');
    await button(page).click();
    expect(await rootState(page), 'Auto shows the system\'s mode again').toEqual(LIGHT);
    expect(await checked(page)).toEqual(['light']);
    await expect(button(page)).toHaveAccessibleName('Color mode: Light');
    expect(await stored(page, 'luz-theme'), 'Auto is the absence of a choice').toBeNull();
  });

  test('a dark system: Dark (the system\'s) goes to Light, then Dark, High contrast and Auto', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'dark', timezoneId: TIMEZONE, storageState: NO_CHOICE });
    const page = await context.newPage();
    await open(page, PLAIN);
    expect(await checked(page)).toEqual(['dark']);
    const steps = [];
    for (let i = 0; i < 4; i++) {
      await button(page).click();
      steps.push([(await rootState(page)).mode, (await checked(page))[0]]);
    }
    expect(steps).toEqual([
      ['light', 'light'],
      ['dark', 'dark'],
      ['high-contrast', 'high-contrast'],
      ['dark', 'dark'],
    ]);
    expect(await stored(page, 'luz-theme'), 'back in Auto').toBeNull();
    await context.close();
  });

  test('while an hour is chosen the button steps from Auto to Light as it always did', async ({ page }) => {
    await open(page, PLAIN);
    await element(page).evaluate((node) => node.pin(21));
    expect(await checked(page)).toEqual(['auto']);
    await button(page).click();
    expect(await rootState(page)).toEqual(LIGHT);
    expect(await checked(page)).toEqual(['light']);
    expect(await stored(page, 'luz-theme')).toBe('light');
    expect(await stored(page, 'luz-light'), 'the button lets go of the hour').toBeNull();
  });
});

test.describe('a chosen mode shows its default moment; Auto goes back to the system', () => {
  test.skip(jsOff, 'needs JavaScript');

  test('light is the afternoon, dark and high contrast are the night, whatever the hour; Auto is the system\'s', async ({ page }) => {
    await open(page, PLAIN, { time: '06:00' });
    const core = page.locator('luz-theme-mode');
    for (const [choice, moment, mode] of [
      ['light', 'afternoon', 'light'],
      ['dark', 'night', 'dark'],
      ['high-contrast', 'night', 'high-contrast'],
    ]) {
      await core.evaluate((el, value) => (el.choice = value), choice);
      expect(await rootState(page), choice).toMatchObject({ moment, mode });
    }
    await core.evaluate((el) => (el.choice = 'auto'));
    expect(await rootState(page), 'Auto at 06:00 with a light system').toEqual(LIGHT);
  });

  test('Auto with a dark system goes back to the night over dark', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'dark', timezoneId: TIMEZONE, storageState: NO_CHOICE });
    const page = await context.newPage();
    await open(page, PLAIN, { time: '14:00' });
    const core = page.locator('luz-theme-mode');
    await core.evaluate((el) => (el.choice = 'light'));
    expect(await rootState(page)).toEqual(LIGHT);
    await core.evaluate((el) => (el.choice = 'auto'));
    expect(await rootState(page)).toEqual(DARK);
    await context.close();
  });

  test('the button of core steps through them and the page follows; the fourth step is the system again', async ({ page }) => {
    await open(page, PLAIN, { time: '06:00' });
    await button(page).click();
    expect(await rootState(page)).toMatchObject({ moment: 'night', mode: 'dark' });
    await button(page).click();
    expect(await rootState(page)).toMatchObject({ moment: 'night', mode: 'high-contrast' });
    await button(page).click();
    expect(await rootState(page), 'back to Auto after three, from a light system').toEqual(LIGHT);
    await button(page).click();
    expect(await rootState(page), 'and Dark again, not Light, which is what is shown').toMatchObject({ mode: 'dark' });
  });

  test('a mode that is stored is the one the next visit starts in', async ({ page }) => {
    await seedMode(page, 'light');
    await open(page, PLAIN, { time: '23:00' });
    expect(await rootState(page)).toMatchObject({ moment: 'afternoon', mode: 'light' });
    expect(await checked(page)).toEqual(['light']);
  });

  test('a mode that is stored wins over a pinned hour', async ({ page }) => {
    await seedMode(page, 'dark');
    await page.addInitScript(() => localStorage.setItem('luz-light', '480'));
    await open(page, PLAIN);
    expect(await rootState(page)).toEqual(DARK);
    expect(await checked(page)).toEqual(['dark']);
  });
});

test.describe('the API and the event', () => {
  test.skip(jsOff, 'needs JavaScript');

  test('preview(hour) shows that hour in Auto without storing it, and preview(null) goes back to the system', async ({ page }) => {
    await open(page, PLAIN, { time: '14:00' });
    const el = element(page);
    expect(await el.evaluate((node) => node.preview(21))).toBe(true);
    expect(await rootState(page)).toMatchObject({ moment: 'dusk', mode: 'dark' });
    expect(await page.evaluate(() => localStorage.getItem('luz-light'))).toBeNull();
    expect(await el.evaluate((node) => node.pinned)).toBeNull();
    await el.evaluate((node) => node.preview(null));
    expect(await rootState(page)).toMatchObject({ moment: 'afternoon', mode: 'light' });
  });

  test('pin(hour) keeps that hour, stores minutes under luz-light and survives a reload', async ({ page }) => {
    await open(page, PLAIN, { time: '14:00' });
    const el = element(page);
    expect(await el.evaluate((node) => node.pin(6.5))).toBe(true);
    expect(await rootState(page)).toMatchObject({ moment: 'dawn', mode: 'dark' });
    expect(await page.evaluate(() => localStorage.getItem('luz-light'))).toBe('390');
    expect(await el.evaluate((node) => node.pinned)).toBe(6.5);
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!customElements.get('luz-theme-time'))).toBe(true);
    expect(await rootState(page)).toMatchObject({ moment: 'dawn', mode: 'dark' });
    expect(await element(page).evaluate((node) => node.pinned)).toBe(6.5);
  });

  test('unpin() lets go of the hour: the system again, and nothing stored', async ({ page }) => {
    await open(page, PLAIN, { time: '14:00' });
    const el = element(page);
    await el.evaluate((node) => node.pin(6.5));
    expect(await el.evaluate((node) => node.unpin())).toBe(true);
    expect(await rootState(page)).toMatchObject({ moment: 'afternoon', mode: 'light' });
    expect(await page.evaluate(() => localStorage.getItem('luz-light'))).toBeNull();
    expect(await el.evaluate((node) => node.pinned)).toBeNull();
  });

  test('an hour outside the day is refused: the methods return false and change nothing', async ({ page }) => {
    await open(page, PLAIN, { time: '14:00' });
    const el = element(page);
    const refused = await el.evaluate((node) => [node.pin(25), node.pin(-1), node.pin(Number.NaN), node.preview(24.5)]);
    expect(refused).toEqual([false, false, false, false]);
    expect(await rootState(page)).toMatchObject({ moment: 'afternoon' });
    expect(await page.evaluate(() => localStorage.getItem('luz-light'))).toBeNull();
  });

  test('a pinned hour is stored in minutes that are a multiple of 5, 1435 at most', async ({ page }) => {
    await open(page, PLAIN, { time: '14:00' });
    const el = element(page);
    const stored = [];
    for (const hour of [12.43, 3.01, 23.999, 24, 0]) {
      await el.evaluate((node, h) => node.pin(h), hour);
      stored.push(await page.evaluate(() => localStorage.getItem('luz-light')));
    }
    expect(stored).toEqual(['745', '180', '1435', '1435', '0']);
  });

  test('a stored hour that is not a multiple of 5 (an older release wrote any minute) loads rounded to 5', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('luz-light', '727'));
    await open(page, PLAIN, { time: '14:00' });
    expect(await element(page).evaluate((node) => Math.round(node.pinned * 60))).toBe(725);
    expect(await rootState(page)).toMatchObject({ moment: 'afternoon' });
  });

  test('the event luz-theme-time:change bubbles with { moment, pinned } when either changes', async ({ page }) => {
    await open(page, PLAIN, { time: '14:00' });
    await page.evaluate(() => {
      window.__events = [];
      document.addEventListener('luz-theme-time:change', (e) => window.__events.push(e.detail));
    });
    const el = element(page);
    await el.evaluate((node) => node.pin(6.5));
    await el.evaluate((node) => node.unpin());
    const events = await page.evaluate(() => window.__events);
    expect(events.at(-2)).toEqual({ moment: 'dawn', pinned: 6.5 });
    expect(events.at(-1)).toEqual({ moment: 'afternoon', pinned: null });
  });

  test('choosing a mode in core\'s button lets go of a pinned hour', async ({ page }) => {
    await open(page, PLAIN, { time: '14:00' });
    const el = element(page);
    await el.evaluate((node) => node.pin(6.5));
    await page.locator('.luz-theme-mode__button').click();
    expect(await el.evaluate((node) => node.pinned)).toBeNull();
    expect(await page.evaluate(() => localStorage.getItem('luz-light'))).toBeNull();
    expect(await rootState(page)).toMatchObject({ moment: 'afternoon', mode: 'light' });
  });

  test('no-remember: a pinned hour is not stored', async ({ page }) => {
    await open(page, `${PLAIN}?no-remember`, { time: '14:00' });
    await element(page).evaluate((node) => node.pin(6.5));
    expect(await page.evaluate(() => localStorage.getItem('luz-light'))).toBeNull();
    expect(await rootState(page)).toMatchObject({ moment: 'dawn' });
  });
});

test.describe('latitude and longitude: the real sunrise and sunset of a place, when an hour is pinned, asked of nobody', () => {
  test.skip(jsOff, 'needs JavaScript');

  const MADRID = '?latitude=40.42&longitude=-3.7';
  /** The hour pinned as the slider leaves it, on a fixed June day (the sun of a place depends on the date). */
  const pinnedAt = async (page, hhmm) => {
    await atTime(page, '12:00');
    await pinHour(page, hhmm);
  };

  // 15 June: the sun rises in Madrid about 06:50 and sets about 21:40 (CEST). The declared hours say 07:30 and 20:30.
  for (const [hhmm, declared, real] of [
    ['06:30', 'dawn', 'dawn'],
    ['07:10', 'dawn', 'morning'],
    ['14:00', 'afternoon', 'afternoon'],
    ['21:00', 'dusk', 'sunset'],
    ['21:55', 'dusk', 'dusk'],
  ]) {
    test(`${hhmm} pinned: ${declared} by the declared hours`, async ({ page }) => {
      await pinnedAt(page, hhmm);
      await open(page, PLAIN);
      expect((await rootState(page)).moment).toBe(declared);
      expect(await checked(page), 'Auto, while an hour is pinned').toEqual(['auto']);
    });

    test(`${hhmm} pinned: ${real} by the sun of Madrid`, async ({ page }) => {
      await pinnedAt(page, hhmm);
      await open(page, `${PLAIN}${MADRID}`);
      expect((await rootState(page)).moment).toBe(real);
    });
  }

  test('with nothing pinned the sun moves nothing: the system\'s mode and its default moment, at 21:00 in Madrid', async ({ page }) => {
    await open(page, `${PLAIN}${MADRID}`, { time: '21:00' });
    expect(await rootState(page)).toEqual(LIGHT);
    expect(await checked(page)).toEqual(['light']);
  });

  test('the base follows the moment the sun sets: 21:00 pinned in Madrid in June is still light', async ({ page }) => {
    await pinnedAt(page, '21:00');
    await open(page, `${PLAIN}${MADRID}`);
    expect(await rootState(page)).toMatchObject({ moment: 'sunset', mode: 'light' });
  });

  test('it never asks for the visitor\'s place and never goes to the network', async ({ page }) => {
    await page.addInitScript(() => {
      window.__asked = [];
      if (navigator.geolocation) {
        for (const method of ['getCurrentPosition', 'watchPosition']) {
          const original = navigator.geolocation[method].bind(navigator.geolocation);
          navigator.geolocation[method] = (...args) => {
            window.__asked.push(method);
            return original(...args);
          };
        }
      }
      if (navigator.permissions) {
        const query = navigator.permissions.query.bind(navigator.permissions);
        navigator.permissions.query = (descriptor) => {
          if (descriptor?.name === 'geolocation') window.__asked.push('permissions.query');
          return query(descriptor);
        };
      }
    });
    const requests = [];
    page.on('request', (request) => requests.push({ url: request.url(), type: request.resourceType() }));
    await pinnedAt(page, '21:00');
    await open(page, `${PLAIN}${MADRID}`);
    expect((await rootState(page)).moment).toBe('sunset');
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    expect(await page.evaluate(() => window.__asked), 'geolocation and its permission').toEqual([]);
    const origin = new URL(test.info().project.use.baseURL).origin;
    expect(requests.filter((r) => !r.url.startsWith(origin) && !r.url.startsWith('data:')), 'a request to another origin').toEqual([]);
    expect(requests.filter((r) => ['fetch', 'xhr', 'ping', 'eventsource'].includes(r.type)), 'a request the script made').toEqual([]);
  });
});

test.describe('two chunks: the tag loads one, a bar loads the other', () => {
  test.skip(jsOff, 'needs JavaScript');

  const chunks = (urls) => urls.map((u) => u.match(/\/([a-z-]+)\.min\.js/)?.[1]).filter(Boolean);

  test('a page with <luz-theme-time> loads theme-time.min.js and not the bar', async ({ page }) => {
    const urls = [];
    page.on('request', (request) => urls.push(request.url()));
    await open(page, PLAIN, { time: '14:00' });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    expect(chunks(urls)).toContain('theme-time');
    expect(chunks(urls)).not.toContain('theme-time-bar');
    expect(chunks(urls)).not.toContain('color-mode');
    expect(await page.locator('.luz-theme-time__bar').count()).toBe(0);
  });

  test('variant="bar" also loads theme-time-bar.min.js, after the first', async ({ page }) => {
    const urls = [];
    page.on('request', (request) => urls.push(request.url()));
    await open(page, BAR, { time: '14:00', bar: true });
    const names = chunks(urls);
    expect(names).toContain('theme-time');
    expect(names).toContain('theme-time-bar');
    expect(names.indexOf('theme-time')).toBeLessThan(names.indexOf('theme-time-bar'));
  });

  test('a page without the tag loads neither (core\'s button works alone)', async ({ page }) => {
    const urls = [];
    page.on('request', (request) => urls.push(request.url()));
    await page.goto(ABSENT);
    await expect(page.locator('.luz-theme-mode__button')).toBeVisible();
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    expect(chunks(urls)).toContain('theme-mode');
    expect(chunks(urls)).not.toContain('theme-time');
    expect(chunks(urls)).not.toContain('theme-time-bar');
  });

  test('if the chunk never arrives, core\'s button still works (the moments are an addition)', async ({ page }) => {
    await page.route(/theme-time(-bar)?\.min\.js/, (route) => route.abort());
    await page.goto(PLAIN);
    await expect(page.locator('.luz-theme-mode__button')).toBeVisible();
    await page.locator('.luz-theme-mode__button').click();
    await page.locator('.luz-theme-mode__button').click();
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark');
  });
});

// axe needs scripts in the page, so the chromium-nojs project cannot run it: "without JavaScript" here
// is a page whose own scripts are blocked (the page as the browser leaves it before any of them runs)
for (const [name, url] of [
  ['the moments and core\'s button', PLAIN],
  ['the bar', BAR],
  ['the bar with every part', `${BAR}?show=time%20place%20saved%20moments&place=Madrid`],
]) {
  for (const scripts of [true, false]) {
    test.describe(`axe, ${name}, in main, ${scripts ? 'with' : 'without'} the page's scripts`, () => {
      test.skip(jsOff, 'axe runs in a page with scripts; the blocked-scripts case covers this project');
      for (const mode of ['light', 'dark', 'high-contrast']) {
        test(`${mode}: no serious or critical violation`, async ({ page }) => {
          if (!scripts) await page.route(/\/(packages|apps)\/.*\.js(\?.*)?$/, (route) => route.abort());
          await seedMode(page, mode);
          if (scripts) await open(page, url, { time: '14:00', bar: url.startsWith(BAR) });
          else {
            await atTime(page, '14:00');
            await page.goto(url);
          }
          // The stylesheet of catalog is what hides the moments until the bar is built: it is applied
          if (!scripts) await expect(page.locator('.luz-theme-time__moments')).toBeHidden();
          await page.evaluate((m) => {
            document.documentElement.dataset.theme = m;
            document.documentElement.dataset.mode = m;
          }, mode);
          await faded(page);
          const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
          const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
          expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
        });
      }
    });
  }
}

test.describe('320 px: reflow, no sideways scroll', () => {
  for (const [name, url] of [
    ['the moments and core\'s button', PLAIN],
    ['the bar with every part', `${BAR}?show=time%20place%20saved%20moments&place=Madrid`],
  ]) {
    test(`${name}`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 700 });
      await page.goto(url);
      if (!jsOff()) await expect.poll(() => page.evaluate(() => !!customElements.get('luz-theme-time'))).toBe(true);
      if (!jsOff() && url.startsWith(BAR)) await expect(page.locator('.luz-theme-time__bar')).toHaveCount(1);
      // The stylesheet of catalog is applied: the moments are a declaration, not shown
      if (jsOff() || !url.includes('show=')) await expect(page.locator('.luz-theme-time__moments')).toBeHidden();
      const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(wide, 'pixels beyond the window').toBeLessThanOrEqual(0);
    });
  }
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('core\'s radios are there and a checked one re-scopes the page', async ({ page }) => {
    await page.goto(PLAIN);
    const dark = page.getByRole('radio', { name: 'Dark' });
    const surface = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const before = await surface();
    await page.locator('label', { hasText: 'Dark' }).click();
    await expect(dark).toBeChecked();
    // The page fades between modes: wait for the end of it, not for a time
    const [r, g, b] = vejer('dark', 'surface-page');
    await expect.poll(surface, { message: 'the page background follows the radio, in CSS alone' }).toBe(`rgb(${r}, ${g}, ${b})`);
    expect(before).not.toBe(`rgb(${r}, ${g}, ${b})`);
  });

  test('the moments are a declaration: nothing of them is shown, there is no bar and no moment is written', async ({ page }) => {
    await page.goto(BAR);
    await expect(page.locator('.luz-theme-time__moments')).toBeHidden();
    await expect(page.locator('.luz-theme-time__bar')).toHaveCount(0);
    await expect(page.locator('html')).not.toHaveAttribute('data-moment', /.+/);
    await expect(page.getByRole('slider')).toHaveCount(0);
  });
});
