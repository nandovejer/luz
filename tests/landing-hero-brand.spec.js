// @ts-check
/**
 * The brand word of the home (`.landing-hero__brand.landing-imago`, the word LUZ drawn with CSS) stays on one line
 * on a phone, with its three letters in order, and inside the column. Its size follows the window's height and the
 * title's step; at 320 px wide that was wider than the column and the old word broke into "LU" and "Z" (found by
 * the Firefox review of 2026-10-24). The letters are spans of one inline box: they must stay on one row, left to
 * right, also in Arabic (the word is `dir="ltr"` whatever the page). Runs in `chromium`.
 */
import { test, expect } from '@playwright/test';

for (const route of ['/', '/es/', '/ar/']) {
  for (const width of [320, 340, 360, 375]) {
    test(`the brand word is on one line at ${width} px wide (${route})`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(route);
      await page.waitForLoadState('load');

      const { letters, right, left, window: inner } = await page.locator('.landing-hero__brand').evaluate((el) => {
        const box = el.getBoundingClientRect();
        const rects = [...el.querySelectorAll('.landing-imago__word .ch')].map((letter) => {
          const r = letter.getBoundingClientRect();
          return { text: letter.textContent, top: r.top, bottom: r.bottom, left: r.left, right: r.right };
        });
        return { letters: rects, right: box.right, left: box.left, window: document.documentElement.clientWidth };
      });

      expect(letters.map((l) => l.text), 'the word is LUZ, letter by letter').toEqual(['L', 'U', 'Z']);
      // One row: each letter's box overlaps the first one's vertically
      for (const letter of letters) {
        expect(letter.top, `${letter.text} starts above the bottom of the row`).toBeLessThan(letters[0].bottom);
        expect(letter.bottom, `${letter.text} ends below the top of the row`).toBeGreaterThan(letters[0].top);
      }
      // Left to right, also in Arabic: the word is dir="ltr"
      expect(letters[0].left).toBeLessThan(letters[1].left);
      expect(letters[1].left).toBeLessThan(letters[2].left);
      for (const letter of letters) {
        expect(letter.left, `${letter.text} inside the window`).toBeGreaterThanOrEqual(-0.5);
        expect(letter.right, `${letter.text} inside the window`).toBeLessThanOrEqual(inner + 0.5);
      }
      expect(left).toBeGreaterThanOrEqual(-0.5);
      expect(right).toBeLessThanOrEqual(inner + 0.5);
    });
  }
}
