// @ts-check
/**
 * axe on the home page and the docs under each of the six lights (F2 of
 * .claude/plans/luz-home-docs-identity.md, section 3.4). The light is set the
 * way a visitor gets it: an hour pinned, which is what the home's slider leaves
 * under "luz-light" (catalog's theme-time-boot.js before the first paint, then
 * <luz-theme-time>); with nothing pinned the page is the system's mode and the
 * default moment of it, which the last two cases check too. The four lights
 * that override tokens (apps/site/theme-light.css) meet the same contrast as the
 * modes under them.
 * Serious and critical violations fail; Chromium only (tests/a11y.spec.js
 * samples the other engines on the base modes).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { faded, idle } from './helpers/settle.js';
import { LIGHTS, pinHour } from './helpers/site-lights.js';

const PAGES = ['/', '/docs/', '/docs/components/button/'];
const BLOCKING = ['serious', 'critical'];

for (const path of PAGES) {
  for (const [light, time, mode] of LIGHTS) {
    test(`axe: ${path} in the ${light} light (${time} pinned, ${mode})`, async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Chromium only');
      await pinHour(page, time);
      await page.goto(path);
      await expect.poll(() => page.evaluate(() => document.documentElement.dataset.moment)).toBe(light);
      expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(mode);
      await idle(page);
      // The boot script sets the light before the first frame, so there is nothing to wait for:
      // a fade running at load would be measured mid-way by axe, so it is a failure, not a delay
      expect(await page.evaluate(() => document.documentElement.getAnimations().map((a) => /** @type {any} */ (a).transitionProperty))).toEqual([]);
      await faded(page);

      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      const summary = violations
        .filter((v) => BLOCKING.includes(v.impact ?? ''))
        .map((v) => `${v.impact} ${v.id}: ${v.nodes.length} node(s) — ${v.nodes[0]?.target?.join(' ')}`);
      expect(summary, 'serious/critical axe violations').toEqual([]);
    });
  }
}

// Auto with nothing pinned: the system's mode, and the default moment of it (afternoon over light, night over dark)
for (const path of PAGES) {
  for (const [scheme, moment] of [['light', 'afternoon'], ['dark', 'night']]) {
    test(`axe: ${path} in Auto, the system is ${scheme} (the ${moment} light, nothing pinned)`, async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Chromium only');
      await page.emulateMedia({ colorScheme: /** @type {'light' | 'dark'} */ (scheme) });
      await page.goto(path);
      await expect.poll(() => page.evaluate(() => document.documentElement.dataset.moment)).toBe(moment);
      expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(scheme);
      await idle(page);
      expect(await page.evaluate(() => document.documentElement.getAnimations().map((a) => /** @type {any} */ (a).transitionProperty))).toEqual([]);
      await faded(page);

      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      const summary = violations
        .filter((v) => BLOCKING.includes(v.impact ?? ''))
        .map((v) => `${v.impact} ${v.id}: ${v.nodes.length} node(s) — ${v.nodes[0]?.target?.join(' ')}`);
      expect(summary, 'serious/critical axe violations').toEqual([]);
    });
  }
}
