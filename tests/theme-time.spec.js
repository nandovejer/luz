// @ts-check
/**
 * <luz-theme-time> (catalog): core's color mode with the hour. It wraps a
 * <luz-theme-mode>; the moments of the day are options inside it with their
 * `data-from` (HH:MM) and the `data-theme` they are painted over; with moments
 * declared, the Auto of core's button follows the visitor's LOCAL clock.
 *
 * The page is tests/fixtures/theme-time.html (the moments, core's inline
 * button, no bar): dawn 05:00 dark, morning 07:30 light, afternoon 12:00 light
 * (the default of a chosen light), sunset 17:30 light, dusk 20:30 dark, night
 * 22:30 dark (the default of a chosen dark or high contrast). The clock is the
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
import { NO_CHOICE, TIMEZONE, atTime, seedMode, vejer } from './helpers/site-lights.js';
import { ABSENT, BAR, HOURS, PLAIN, open, rootState } from './helpers/theme-time.js';

const jsOff = () => test.info().project.use.javaScriptEnabled === false;

test.use({ timezoneId: TIMEZONE, storageState: NO_CHOICE });

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** The core button, the element and its API, from the page. */
const element = (page) => page.locator('luz-theme-time').first();

test.describe('Auto follows the local clock', () => {
  test.skip(jsOff, 'needs JavaScript');

  for (const [hhmm, moment, base] of HOURS) {
    test(`${hhmm} is ${moment}, over ${base}`, async ({ page }) => {
      await open(page, PLAIN, { time: hhmm });
      expect(await rootState(page)).toEqual({ moment, mode: base, theme: base });
      await expect(element(page)).toHaveJSProperty('moment', moment);
    });
  }

  test('the clock decides, not the system: a dark system at 14:00 is the afternoon over light', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'dark', timezoneId: TIMEZONE, storageState: NO_CHOICE });
    const page = await context.newPage();
    await open(page, PLAIN, { time: '14:00' });
    expect(await rootState(page)).toEqual({ moment: 'afternoon', mode: 'light', theme: 'light' });
    await context.close();
  });

  test('a light system at dusk is the dusk over dark', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'light', timezoneId: TIMEZONE, storageState: NO_CHOICE });
    const page = await context.newPage();
    await open(page, PLAIN, { time: '21:00' });
    expect(await rootState(page)).toEqual({ moment: 'dusk', mode: 'dark', theme: 'dark' });
    await context.close();
  });

  test('the page moves to the next moment when the minute comes, with no reload', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-06-15T17:29:30+02:00') });
    await page.goto(PLAIN);
    await expect.poll(() => page.evaluate(() => !!customElements.get('luz-theme-time'))).toBe(true);
    expect((await rootState(page)).moment).toBe('afternoon');
    await page.clock.runFor(31_000);
    await expect(page.locator('html')).toHaveAttribute('data-moment', 'sunset');
  });

  test('past midnight the night goes on: the moment that starts last also runs back from midnight', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-06-15T23:59:30+02:00') });
    await page.goto(PLAIN);
    await expect.poll(() => page.evaluate(() => !!customElements.get('luz-theme-time'))).toBe(true);
    await page.clock.runFor(31_000);
    expect(await page.evaluate(() => new Date().getHours())).toBe(0);
    expect(await rootState(page)).toEqual({ moment: 'night', mode: 'dark', theme: 'dark' });
  });

  test('high contrast asked by the system wins over every moment, and the moment is still told', async ({ page }) => {
    await page.emulateMedia({ contrast: 'more' });
    await open(page, PLAIN, { time: '14:00' });
    expect(await rootState(page)).toEqual({ moment: 'afternoon', mode: 'high-contrast', theme: 'high-contrast' });
  });

  test('high contrast chosen in core\'s button wins too, over a morning that is light', async ({ page }) => {
    await open(page, PLAIN, { time: '09:00' });
    await element(page).evaluate((el) => {
      el.querySelector('luz-theme-mode').choice = 'high-contrast';
    });
    const state = await rootState(page);
    expect(state.mode).toBe('high-contrast');
    expect(state.theme).toBe('high-contrast');
  });
});

test.describe('a chosen mode shows its default moment; Auto goes back to the clock', () => {
  test.skip(jsOff, 'needs JavaScript');

  test('light is the afternoon, dark and high contrast are the night, whatever the hour', async ({ page }) => {
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
    expect(await rootState(page), 'Auto at 06:00').toEqual({ moment: 'dawn', mode: 'dark', theme: 'dark' });
  });

  test('the button of core steps through them and the page follows', async ({ page }) => {
    await open(page, PLAIN, { time: '06:00' });
    const button = page.locator('.luz-theme-mode__button');
    await button.click();
    expect(await rootState(page)).toMatchObject({ moment: 'afternoon', mode: 'light' });
    await button.click();
    expect(await rootState(page)).toMatchObject({ moment: 'night', mode: 'dark' });
    await button.click();
    await button.click();
    expect(await rootState(page), 'back to Auto after four').toMatchObject({ moment: 'dawn', mode: 'dark' });
  });

  test('a mode that is stored is the one the next visit starts in', async ({ page }) => {
    await seedMode(page, 'light');
    await open(page, PLAIN, { time: '23:00' });
    expect(await rootState(page)).toMatchObject({ moment: 'afternoon', mode: 'light' });
  });
});

test.describe('the API and the event', () => {
  test.skip(jsOff, 'needs JavaScript');

  test('preview(hour) shows that hour in Auto without storing it, and preview(null) goes back to the clock', async ({ page }) => {
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

  test('unpin() lets go of the hour: the clock again, and nothing stored', async ({ page }) => {
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

test.describe('latitude and longitude: the real sunrise and sunset of a place, asked of nobody', () => {
  test.skip(jsOff, 'needs JavaScript');

  const MADRID = '?latitude=40.42&longitude=-3.7';

  // 15 June: the sun rises in Madrid about 06:50 and sets about 21:40 (CEST). The declared hours say 07:30 and 20:30.
  for (const [hhmm, declared, real] of [
    ['06:30', 'dawn', 'dawn'],
    ['07:10', 'dawn', 'morning'],
    ['14:00', 'afternoon', 'afternoon'],
    ['21:00', 'dusk', 'sunset'],
    ['21:55', 'dusk', 'dusk'],
  ]) {
    test(`${hhmm}: ${declared} by the declared hours`, async ({ page }) => {
      await open(page, PLAIN, { time: hhmm });
      expect((await rootState(page)).moment).toBe(declared);
    });

    test(`${hhmm}: ${real} by the sun of Madrid`, async ({ page }) => {
      await open(page, `${PLAIN}${MADRID}`, { time: hhmm });
      expect((await rootState(page)).moment).toBe(real);
    });
  }

  test('the base follows the moment the sun sets: 21:00 in Madrid in June is still light', async ({ page }) => {
    await open(page, `${PLAIN}${MADRID}`, { time: '21:00' });
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
    await open(page, `${PLAIN}${MADRID}`, { time: '21:00' });
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

  test('if the chunk never arrives, core\'s button still works (the clock is an addition)', async ({ page }) => {
    await page.route(/theme-time(-bar)?\.min\.js/, (route) => route.abort());
    await atTime(page, '23:00');
    await page.goto(PLAIN);
    await expect(page.locator('.luz-theme-mode__button')).toBeVisible();
    await page.locator('.luz-theme-mode__button').click();
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'light');
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
