// @ts-check
/**
 * The brand word of the home ("LUZ", `.landing-hero__brand`) stays on one line on a phone. Its size follows the
 * window's height (15svh) and the title's step; at 320 px wide that is wider than the column and the word broke
 * into "LU" and "Z" (found by the Firefox review of 2026-10-24). A share of the window's width bounds it too.
 * Runs in `chromium` (the word is plain markup with or without JavaScript).
 */
import { test, expect } from '@playwright/test';

for (const route of ['/', '/es/', '/ar/']) {
  for (const width of [320, 340, 360, 375]) {
    test(`the brand word is on one line at ${width} px wide (${route})`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(route);
      await page.waitForLoadState('load');

      const { lines, fontSize, right, window: inner } = await page.locator('.landing-hero__brand').evaluate((el) => {
        const style = getComputedStyle(el);
        const font = parseFloat(style.fontSize);
        const box = el.getBoundingClientRect();
        return { lines: Math.round(box.height / (parseFloat(style.lineHeight) || font)), fontSize: font, right: box.right, window: document.documentElement.clientWidth };
      });

      expect(lines, `the word takes ${lines} lines at a font size of ${fontSize}px`).toBe(1);
      expect(right).toBeLessThanOrEqual(inner + 0.5);
    });
  }
}
