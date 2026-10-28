// @ts-check
/**
 * The globe's bar and the footer's mode share the page's light, and the last
 * one the visitor touched wins (the owner's decision, 2026-10-18):
 *
 *   - a first visit takes the light of the local hour;
 *   - moving the globe's slider pins that hour: the page takes its light,
 *     keeps it after a reload and on the docs, and the bar says it is saved
 *     ("Saved mode" with a check, gone after a couple of seconds); the hour
 *     is stored under "luz-light" (minutes of the day) and the footer's
 *     choice is removed;
 *   - choosing Light, Dark or High contrast in the footer wins and removes
 *     the pinned hour, until the slider is moved again;
 *   - the footer has no Auto: three radios, none checked while the light
 *     follows the clock or the globe.
 *
 * The bar shows, above the slider, the place (the city of the time zone) and
 * the light's name, and under them the slider's hour in large type. Below
 * 1024px it opens from the line and Escape closes it; from 1024px with a
 * hover it is always open, so the test of closing it runs at NARROW.
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { NO_CHOICE, TIMEZONE, atTime } from './helpers/site-lights.js';

// The file is about state (the light, the mode, what is stored), not about the motion of the globe: reduced motion stops the globe's frame loop (RL-8). A frame costs the main thread tens of milliseconds in software rendering, so on a loaded runner the loop leaves every round trip into the page seconds long.
test.use({ timezoneId: TIMEZONE, storageState: NO_CHOICE, reducedMotion: 'reduce' });

/** Below 1024px the bar is a disclosure (from 1024px with a hover it is always open). */
const NARROW = { width: 800, height: 900 };
const en = JSON.parse(readFileSync(new URL('../apps/landing/i18n/en.json', import.meta.url), 'utf-8'));

test.beforeEach(() => {
  test.skip(test.info().project.use.javaScriptEnabled === false, 'needs JavaScript');
});

const state = (page) =>
  page.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
    light: document.documentElement.getAttribute('data-light'),
    pinned: localStorage.getItem('luz-light'),
    mode: localStorage.getItem('luz-theme'),
    checked: [...document.querySelectorAll('footer luz-color-mode input[type="radio"]')].filter((r) => /** @type {HTMLInputElement} */ (r).checked).map((r) => /** @type {HTMLInputElement} */ (r).value),
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
  await page.locator(`footer luz-color-mode input[value="${value}"]`).evaluate((r) => /** @type {HTMLInputElement} */ (r).click());
}

test('the footer has no Auto: Light, Dark and High contrast, none checked on a first visit, and the light is the hour\'s', async ({ page }) => {
  await atTime(page, '10:05');
  await page.goto('/');
  await expect(page.locator('home-light .home-light__line')).toBeVisible();
  const values = await page.locator('footer luz-color-mode input[type="radio"]').evaluateAll((rs) => rs.map((r) => /** @type {HTMLInputElement} */ (r).value));
  expect(values).toEqual(['light', 'dark', 'high-contrast']);
  await expect.poll(() => state(page)).toMatchObject({ theme: 'light', light: 'morning', pinned: null, mode: null, checked: [] });
});

test('the docs footer has no Auto either', async ({ page }) => {
  await page.goto('/docs/');
  const values = await page.locator('footer luz-color-mode input[type="radio"]').evaluateAll((rs) => rs.map((r) => /** @type {HTMLInputElement} */ (r).value));
  expect(values).toEqual(['light', 'dark', 'high-contrast']);
});

test('the bar shows the place and the light, and under them the slider\'s hour in large type', async ({ page }) => {
  await atTime(page, '10:05');
  await page.goto('/');
  await openBar(page);
  const time = page.locator('home-light .home-light__time');
  const where = page.locator('home-light .home-light__where');
  await expect(time).toHaveText('10:05');
  await expect(where).toHaveText(`Madrid · ${en['light.morning']}`);
  // Larger than the phrase and the place
  const size = (loc) => loc.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(await size(time)).toBeGreaterThan(1.8 * (await size(where)));
  // In the order of the bar: the place and the light, the hour, then the slider
  const tops = await page.evaluate(() => ['.home-light__where', '.home-light__time', 'input[type="range"]'].map((s) => document.querySelector(`home-light ${s}`).getBoundingClientRect().top));
  expect(tops[0]).toBeLessThan(tops[1]);
  expect(tops[1]).toBeLessThan(tops[2]);
  await slideTo(page, '19:30');
  await expect(time).toHaveText('19:30');
  await expect(where).toHaveText(`Madrid · ${en['light.sunset']}`);
});

test('moving the slider pins its hour: saved, shown for a moment, kept on closing, after a reload and on the docs', async ({ page }) => {
  await page.setViewportSize(NARROW);
  await atTime(page, '10:05');
  await page.goto('/');
  const saved = page.locator('home-light .home-light__saved');
  await openBar(page);
  await expect(saved).toBeHidden();
  await slideTo(page, '19:30');
  await expect.poll(() => state(page)).toMatchObject({ theme: 'light', light: 'sunset', pinned: '1170', mode: null, checked: [] });
  await expect(saved).toBeVisible();
  await expect(saved).toContainText(en['light.saved']);
  await expect(saved).toHaveAttribute('role', 'status');
  // A notice, not a state: gone after a couple of seconds
  await page.waitForTimeout(3500);
  await expect(saved).toBeHidden();
  // Closing the bar keeps the pinned hour
  await page.keyboard.press('Escape');
  await expect(bar(page)).toBeHidden();
  expect((await state(page)).light).toBe('sunset');

  await page.reload();
  await expect(page.locator('home-light .home-light__line')).toBeVisible();
  await expect.poll(() => state(page)).toMatchObject({ light: 'sunset', pinned: '1170', checked: [] });
  await openBar(page);
  await expect(page.locator('home-light input[type="range"]')).toHaveValue('1170');
  await expect(page.locator('home-light .home-light__time')).toHaveText('19:30');
  await expect(saved, 'no notice on a reload: nothing was saved').toBeHidden();

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
  await expect.poll(() => state(page)).toMatchObject({ theme: 'dark', light: 'dawn', pinned: '360', mode: null, checked: [] });
  await page.reload();
  await expect.poll(() => state(page)).toMatchObject({ theme: 'dark', light: 'dawn', pinned: '360', mode: null, checked: [] });

  await chooseInFooter(page, 'high-contrast');
  await expect.poll(() => state(page)).toMatchObject({ theme: 'high-contrast', pinned: null, mode: 'high-contrast', checked: ['high-contrast'] });
});
