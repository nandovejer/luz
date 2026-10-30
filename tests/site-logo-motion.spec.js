// @ts-check
/**
 * The prism of the site's header loops without end while the system allows motion (owner, 2026-10-30; the
 * deviation from "no infinite loops" is written, see tests/site-logo-motion-written.test.js):
 *
 *  - under `prefers-reduced-motion: no-preference` its first three paths (the bands of tone .25, .45 and .65) play
 *    one animation that never ends, six lazy durations long, the second band delayed by the slow duration and the
 *    third by twice that; the fourth path, the whole prism, never moves;
 *  - over a whole loop the opacity of each band leaves its tone, reaches 1 and comes back, never outside [tone, 1];
 *  - under `reduce` the three paths have no animation and keep their own tones.
 *
 * On the home and on a docs page. It is CSS: this file is in the no-JS testMatch of playwright.config.js, and the
 * header must play the same with JavaScript off.
 */
import { test, expect } from '@playwright/test';

const PAGES = ['/', '/docs/'];
const TONES = [0.25, 0.45, 0.65];
const paths = (page) => page.locator('#site-header .site-header__mark svg path');

/** A time in seconds, as getComputedStyle writes it ("4.8s", "300ms"). */
const seconds = (value) => (value.endsWith('ms') ? parseFloat(value) / 1000 : parseFloat(value));

test.describe('the header prism', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  for (const path of PAGES) {
    test(`${path}: with motion allowed, the three bands loop forever, lazy x 6 long, staggered by the slow duration; the whole prism stays still`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' });
      await page.goto(path);
      const lazy = seconds(await page.locator('html').evaluate((el) => getComputedStyle(el).getPropertyValue('--luz-duration-lazy').trim()));
      const slow = seconds(await page.locator('html').evaluate((el) => getComputedStyle(el).getPropertyValue('--luz-duration-slow').trim()));
      expect(lazy, 'the lazy duration token').toBeGreaterThan(0);
      expect(slow, 'the slow duration token').toBeGreaterThan(0);

      const all = paths(page);
      await expect(all).toHaveCount(4);
      const styles = await all.evaluateAll((els) =>
        els.map((el) => {
          const s = getComputedStyle(el);
          return { name: s.animationName, count: s.animationIterationCount, duration: s.animationDuration, delay: s.animationDelay };
        }),
      );
      for (const [i, s] of styles.slice(0, 3).entries()) {
        expect(s.name, `band ${i + 1}: it animates`).not.toBe('none');
        expect(s.count, `band ${i + 1}: it never ends`).toBe('infinite');
        expect(seconds(s.duration), `band ${i + 1}: six lazy durations`).toBeCloseTo(lazy * 6, 2);
        expect(seconds(s.delay), `band ${i + 1}: delayed by ${i} slow durations`).toBeCloseTo(slow * i, 2);
      }
      expect(new Set(styles.slice(0, 3).map((s) => s.name)).size, 'the three bands play the same animation').toBe(1);
      expect(styles[3].name, 'the whole prism never moves').toBe('none');
    });

    test(`${path}: over one loop each band leaves its tone, reaches 1 and comes back, and stays within [tone, 1]`, async ({ page }) => {
      test.setTimeout(45_000);
      await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' });
      await page.goto(path);
      const all = paths(page);
      await expect(all).toHaveCount(4);
      /** @type {number[][]} */
      const samples = [[], [], []];
      // 6 s at 100 ms: a loop is 4.8 s and the last band starts 0.6 s late
      for (let t = 0; t < 60; t++) {
        const now = await all.evaluateAll((els) => els.slice(0, 3).map((el) => parseFloat(getComputedStyle(el).fillOpacity)));
        now.forEach((v, i) => samples[i].push(v));
        await page.waitForTimeout(100);
      }
      for (const [i, tone] of TONES.entries()) {
        const min = Math.min(...samples[i]);
        const max = Math.max(...samples[i]);
        expect(max, `band ${i + 1}: never above 1`).toBeLessThanOrEqual(1.001);
        expect(min, `band ${i + 1}: never below its tone`).toBeGreaterThanOrEqual(tone - 0.001);
        expect(max, `band ${i + 1}: reaches 1`).toBeGreaterThan(0.99);
        expect(min, `band ${i + 1}: comes down to its tone`).toBeLessThan(tone + 0.05);
        // It moves: more than a few distinct values over the loop, and it goes down after it was at 1
        expect(new Set(samples[i].map((v) => v.toFixed(2))).size, `band ${i + 1}: it is not constant`).toBeGreaterThan(5);
        const firstTop = samples[i].findIndex((v) => v > 0.99);
        expect(samples[i].slice(firstTop).some((v) => v < tone + 0.05), `band ${i + 1}: it returns to its tone after being whole`).toBe(true);
      }
    });

    test(`${path}: with reduced motion the three bands have no animation and keep their tones`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
      await page.goto(path);
      const all = paths(page);
      await expect(all).toHaveCount(4);
      const states = await all.evaluateAll((els) => els.map((el) => ({ name: getComputedStyle(el).animationName, tone: parseFloat(getComputedStyle(el).fillOpacity) })));
      for (const [i, tone] of TONES.entries()) {
        expect(states[i].name, `band ${i + 1}: no animation`).toBe('none');
        expect(states[i].tone, `band ${i + 1}: its own tone`).toBeCloseTo(tone, 2);
      }
      expect(states[3].name).toBe('none');
      // Still, over a moment
      await page.waitForTimeout(600);
      const later = await all.evaluateAll((els) => els.slice(0, 3).map((el) => parseFloat(getComputedStyle(el).fillOpacity)));
      later.forEach((v, i) => expect(v, `band ${i + 1}: still at its tone`).toBeCloseTo(TONES[i], 2));
    });
  }
});
