// @ts-check
/**
 * The boot script of catalog, theme-time-boot.js: a classic script for the
 * <head>, after core's theme-boot.js, that writes the moment of the day before
 * the first paint, from the `data-moments` of its own tag (`name@HH:MM=light|dark`,
 * a `*` marking the moment a chosen mode shows), so a page that is dark at this
 * hour is never drawn light first.
 *
 *   1. a mode stored under "luz-theme" shows its default moment;
 *   2. else an hour pinned under "luz-light" (minutes of the day, rounded to 5)
 *      is the moment at that hour, and data-mode (and data-theme, when the page
 *      names no brand) take that moment's base, unless the system asks for more
 *      contrast, which still wins;
 *   3. else Auto is the system's (owner, 2026-11-04): the mode is the one core's
 *      script wrote, and the moment is the default one of that mode (afternoon over
 *      light, night over dark or high contrast). The script never reads the clock.
 *
 * The fixtures load the two boot scripts and nothing else, and record what
 * <html> holds when the parser leaves the <head> (window.__atHead): before the
 * body exists, so before anything is painted. It reads the storage and never
 * writes it.
 */
import { test, expect } from '@playwright/test';
import { NO_CHOICE, TIMEZONE, atTime } from './helpers/site-lights.js';
import { BOOT, BOOT_BRAND, HOURS } from './helpers/theme-time.js';

test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript');
test.use({ timezoneId: TIMEZONE, storageState: NO_CHOICE });

const atHead = (page) => page.evaluate(() => window.__atHead);

test.describe('Auto is the system\'s: the default moment of its mode, before the body, at any hour', () => {
  for (const [hhmm] of HOURS) {
    test(`a light system at ${hhmm} is the afternoon over light`, async ({ page }) => {
      await atTime(page, hhmm);
      await page.goto(BOOT);
      expect(await atHead(page)).toEqual({ moment: 'afternoon', mode: 'light', theme: 'light' });
    });
  }

  for (const hhmm of ['03:00', '09:00', '14:00', '21:00']) {
    test(`a dark system at ${hhmm} is the night over dark: the stars show as with Dark chosen`, async ({ browser }) => {
      const context = await browser.newContext({ colorScheme: 'dark', timezoneId: TIMEZONE, storageState: NO_CHOICE });
      const page = await context.newPage();
      await atTime(page, hhmm);
      await page.goto(BOOT);
      expect(await atHead(page)).toEqual({ moment: 'night', mode: 'dark', theme: 'dark' });
      await context.close();
    });
  }

  test('high contrast asked by the system is the high contrast mode with the night, at any hour', async ({ page }) => {
    await page.emulateMedia({ contrast: 'more' });
    await atTime(page, '14:00');
    await page.goto(BOOT);
    expect(await atHead(page)).toEqual({ moment: 'night', mode: 'high-contrast', theme: 'high-contrast' });
  });

  test('more contrast wins over a dark system', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'dark', contrast: 'more', timezoneId: TIMEZONE, storageState: NO_CHOICE });
    const page = await context.newPage();
    await page.goto(BOOT);
    expect(await atHead(page)).toEqual({ moment: 'night', mode: 'high-contrast', theme: 'high-contrast' });
    await context.close();
  });

  test('a stored value that is not a mode, or not an hour, is not a choice: the system decides', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('luz-theme', 'auto');
      localStorage.setItem('luz-light', '1440');
    });
    await atTime(page, '21:00');
    await page.goto(BOOT);
    expect(await atHead(page)).toEqual({ moment: 'afternoon', mode: 'light', theme: 'light' });
  });
});

test.describe('a stored choice', () => {
  for (const [mode, moment] of [
    ['light', 'afternoon'],
    ['dark', 'night'],
    ['high-contrast', 'night'],
  ]) {
    test(`${mode} stored: its default moment, whatever the hour`, async ({ page }) => {
      await page.addInitScript((m) => localStorage.setItem('luz-theme', m), mode);
      await atTime(page, '06:00');
      await page.goto(BOOT);
      expect(await atHead(page)).toMatchObject({ moment, mode });
    });
  }

  test('a pinned hour is the hour, at any clock and over any system: 06:30 pinned is dawn at 14:00', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('luz-light', '390'));
    await atTime(page, '14:00');
    await page.goto(BOOT);
    expect(await atHead(page)).toEqual({ moment: 'dawn', mode: 'dark', theme: 'dark' });
  });

  test('a pinned hour wins over the system: a light moment over a dark system, a dark one over a light system', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'dark', timezoneId: TIMEZONE, storageState: NO_CHOICE });
    const page = await context.newPage();
    await page.addInitScript(() => localStorage.setItem('luz-light', '540'));
    await page.goto(BOOT);
    expect(await atHead(page)).toEqual({ moment: 'morning', mode: 'light', theme: 'light' });
    await context.close();
  });

  test('a pinned hour is still overridden by a system that asks for more contrast, with the moment told', async ({ page }) => {
    await page.emulateMedia({ contrast: 'more' });
    await page.addInitScript(() => localStorage.setItem('luz-light', '1050'));
    await page.goto(BOOT);
    expect(await atHead(page)).toEqual({ moment: 'sunset', mode: 'high-contrast', theme: 'high-contrast' });
  });

  test('a pinned hour that is not a multiple of 5 is rounded to 5: 12:07 is 12:05, the afternoon', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('luz-light', '727'));
    await atTime(page, '03:00');
    await page.goto(BOOT);
    expect(await atHead(page)).toEqual({ moment: 'afternoon', mode: 'light', theme: 'light' });
  });

  test('a pinned hour stands only in Auto: with a mode chosen, the mode\'s default moment shows', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('luz-light', '390');
      localStorage.setItem('luz-theme', 'light');
    });
    await atTime(page, '23:00');
    await page.goto(BOOT);
    expect(await atHead(page)).toMatchObject({ moment: 'afternoon', mode: 'light' });
  });

  test('it reads the storage and never writes it', async ({ page }) => {
    await atTime(page, '14:00');
    await page.goto(BOOT);
    expect(await atHead(page), 'the boot script has run').toMatchObject({ moment: 'afternoon' });
    expect(await page.evaluate(() => [localStorage.getItem('luz-theme'), localStorage.getItem('luz-light'), localStorage.length])).toEqual([null, null, 0]);
  });
});

test.describe('a page that names its own brand', () => {
  test('a pinned hour: data-mode takes the base of the moment and data-theme stays the brand\'s', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('luz-light', '1260'));
    await page.goto(BOOT_BRAND);
    expect(await atHead(page)).toEqual({ moment: 'dusk', mode: 'dark', theme: 'my-brand' });
  });

  test('a pinned hour at 09:00: the base is light, the brand still the brand\'s', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('luz-light', '540'));
    await page.goto(BOOT_BRAND);
    expect(await atHead(page)).toEqual({ moment: 'morning', mode: 'light', theme: 'my-brand' });
  });

  test('nothing pinned: the system\'s mode and its default moment, at any hour, the brand still the brand\'s', async ({ page }) => {
    await atTime(page, '21:00');
    await page.goto(BOOT_BRAND);
    expect(await atHead(page)).toEqual({ moment: 'afternoon', mode: 'light', theme: 'my-brand' });
  });

  test('nothing pinned, a dark system: dark over the night', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'dark', timezoneId: TIMEZONE, storageState: NO_CHOICE });
    const page = await context.newPage();
    await atTime(page, '09:00');
    await page.goto(BOOT_BRAND);
    expect(await atHead(page)).toEqual({ moment: 'night', mode: 'dark', theme: 'my-brand' });
    await context.close();
  });
});
