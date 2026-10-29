// @ts-check
/**
 * The globe's bar and the footer's mode share the page's light, and the last
 * one the visitor touched wins (the owner's decision, 2026-10-18; the bar and
 * the footer are catalog's <luz-theme-time> and core's <luz-theme-mode> since
 * 2026-10-29):
 *
 *   - a first visit takes the moment of the local hour;
 *   - moving the globe's slider pins that hour: the page takes its moment,
 *     keeps it after a reload and on the docs, and the bar says it is saved
 *     (a status region that a screen reader hears; it is not shown unless the
 *     page asks with show="saved"); the hour is stored under "luz-light"
 *     (minutes of the day) and the footer's choice is removed;
 *   - choosing Light, Dark or High contrast in the footer wins and removes
 *     the pinned hour, until the slider is moved again;
 *   - the footer has Auto first, checked while the moment follows the clock
 *     or the globe.
 *
 * The bar is the slider alone (the hour, the place and the note are not
 * drawn: tests/home-light-bar.spec.js). It is closed at rest at every width and
 * opens from the line; Escape on the slider lets go of a pinned hour.
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { NO_CHOICE, TIMEZONE, atTime } from './helpers/site-lights.js';

// The file is about state (the light, the mode, what is stored), not about the motion of the globe: reduced motion stops the globe's frame loop (RL-8). A frame costs the main thread tens of milliseconds in software rendering, so on a loaded runner the loop leaves every round trip into the page seconds long.
test.use({ timezoneId: TIMEZONE, storageState: NO_CHOICE, reducedMotion: 'reduce' });

/** The bar is a disclosure at every width; the size of the window does not matter here. */
const NARROW = { width: 800, height: 900 };
const en = JSON.parse(readFileSync(new URL('../apps/landing/i18n/en.json', import.meta.url), 'utf-8'));

test.beforeEach(() => {
  test.skip(test.info().project.use.javaScriptEnabled === false, 'needs JavaScript');
});

const state = (page) =>
  page.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
    light: document.documentElement.getAttribute('data-moment'),
    pinned: localStorage.getItem('luz-light'),
    mode: localStorage.getItem('luz-theme'),
    checked: [...document.querySelectorAll('footer luz-theme-mode input[type="radio"]')].filter((r) => /** @type {HTMLInputElement} */ (r).checked).map((r) => /** @type {HTMLInputElement} */ (r).value),
  }));

const bar = (page) => page.locator('home-light .home-light__bar');
async function openBar(page) {
  if (!(await bar(page).isVisible())) await page.locator('home-light .home-light__line').click();
  await expect(bar(page)).toBeVisible();
}
/** Move the slider to hh:mm as a visitor would: input while it moves, change when it is let go. */
async function slideTo(page, hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  await openBar(page);
  await page.locator('home-light input[type="range"]').fill(String(h * 60 + m));
}
async function chooseInFooter(page, value) {
  await page.locator(`footer luz-theme-mode input[value="${value}"]`).evaluate((r) => /** @type {HTMLInputElement} */ (r).click());
}

test('the footer has Auto first: Auto, Light, Dark and High contrast, Auto checked on a first visit, and the light is the hour\'s', async ({ page }) => {
  await atTime(page, '10:05');
  await page.goto('/');
  await expect(page.locator('home-light .home-light__line')).toBeVisible();
  const values = await page.locator('footer luz-theme-mode input[type="radio"]').evaluateAll((rs) => rs.map((r) => /** @type {HTMLInputElement} */ (r).value));
  expect(values).toEqual(['auto', 'light', 'dark', 'high-contrast']);
  await expect.poll(() => state(page)).toMatchObject({ theme: 'light', light: 'morning', pinned: null, mode: null, checked: ['auto'] });
});

test('the docs footer has the same four', async ({ page }) => {
  await page.goto('/docs/');
  const values = await page.locator('footer luz-theme-mode input[type="radio"]').evaluateAll((rs) => rs.map((r) => /** @type {HTMLInputElement} */ (r).value));
  expect(values).toEqual(['auto', 'light', 'dark', 'high-contrast']);
});

// Legacy, not ported: the bar shows the place, the moment and the hour in large type. The bar is the slider alone now (2026-10-29);
// show="time place saved" brings the parts back and tests/theme-time-bar.spec.js covers each.

test('moving the slider pins its hour: saved, shown for a moment, kept on closing, after a reload and on the docs', async ({ page }) => {
  await page.setViewportSize(NARROW);
  await atTime(page, '10:05');
  await page.goto('/');
  const saved = page.locator('home-light [role="status"]');
  await openBar(page);
  await expect(saved).toHaveText('');
  await slideTo(page, '19:30');
  await expect.poll(() => state(page)).toMatchObject({ theme: 'light', light: 'sunset', pinned: '1170', mode: null, checked: ['auto'] });
  // The note is for a screen reader (the bar shows none by default): it is in the status region, in the page's own words
  await expect(saved).toContainText(en['light.saved']);
  await expect(saved).toHaveAttribute('role', 'status');
  // A notice, not a state: gone after a couple of seconds
  await page.waitForTimeout(3500);
  await expect(saved).toHaveText('');
  // Closing the bar with the sentence keeps the pinned hour (Escape on the slider would let it go)
  await page.locator('home-light .home-light__line').click();
  await expect(bar(page)).toBeHidden();
  expect((await state(page)).light).toBe('sunset');

  await page.reload();
  await expect(page.locator('home-light .home-light__line')).toBeVisible();
  await expect.poll(() => state(page)).toMatchObject({ light: 'sunset', pinned: '1170', checked: ['auto'] });
  await openBar(page);
  await expect(page.locator('home-light input[type="range"]')).toHaveValue('1170');
  await expect(saved, 'no notice on a reload: nothing was saved').toHaveText('');

  await page.goto('/docs/');
  await expect.poll(() => state(page)).toMatchObject({ light: 'sunset', theme: 'light' });
});

test('the footer wins over the globe, and the globe wins back when the slider is moved again', async ({ page }) => {
  await atTime(page, '10:05');
  await page.goto('/');
  await slideTo(page, '21:30');
  await expect.poll(() => state(page)).toMatchObject({ theme: 'dark', light: 'dusk', pinned: '1290', mode: null });

  await chooseInFooter(page, 'light');
  await expect.poll(() => state(page)).toMatchObject({ theme: 'light', pinned: null, mode: 'light', checked: ['light'] });
  await page.reload();
  await expect.poll(() => state(page)).toMatchObject({ theme: 'light', pinned: null, mode: 'light', checked: ['light'] });

  await slideTo(page, '06:00');
  await expect.poll(() => state(page)).toMatchObject({ theme: 'dark', light: 'dawn', pinned: '360', mode: null, checked: ['auto'] });
  await page.reload();
  await expect.poll(() => state(page)).toMatchObject({ theme: 'dark', light: 'dawn', pinned: '360', mode: null, checked: ['auto'] });

  await chooseInFooter(page, 'high-contrast');
  await expect.poll(() => state(page)).toMatchObject({ theme: 'high-contrast', pinned: null, mode: 'high-contrast', checked: ['high-contrast'] });
});
