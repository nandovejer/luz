// @ts-check
/**
 * The install blocks of the home (`.landing-install`) at 400 % text and 320 px (WCAG 1.4.10 Reflow: no loss
 * of content). The block clips what overflows it for its rounded corners, so what is wider than its bar is
 * lost: found in the Firefox review of 2026-10-24, where the copy button and the label of the tab were cut
 * off and "NPM" stacked one letter per line. The bar wraps instead, and nothing of it leaves the block.
 * Runs in `chromium` (the block is plain markup with or without JavaScript).
 */
import { test, expect } from '@playwright/test';

for (const route of ['/', '/es/', '/ar/']) {
  test(`400 % text at 320 px: nothing of an install bar is clipped by its block (${route})`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(route);
    await page.waitForLoadState('load');
    await page.evaluate(() => { document.documentElement.style.fontSize = '400%'; });

    const clipped = await page.locator('.landing-install').evaluateAll((blocks) =>
      blocks.flatMap((block, i) => {
        const frame = block.getBoundingClientRect();
        return [...block.querySelectorAll('.landing-install__bar > *')]
          .map((child) => ({ child, box: child.getBoundingClientRect() }))
          .filter(({ box }) => box.width > 0 && (box.right > frame.right + 0.5 || box.left < frame.left - 0.5))
          .map(({ child, box }) => `block ${i}: ${child.className || child.localName} spans ${Math.round(box.left)}-${Math.round(box.right)} in ${Math.round(frame.left)}-${Math.round(frame.right)}`);
      }),
    );

    expect(clipped, clipped.join(' | ')).toEqual([]);
  });

  test(`400 % text at 320 px: the label of an install bar does not stack one letter per line (${route})`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(route);
    await page.waitForLoadState('load');
    await page.evaluate(() => { document.documentElement.style.fontSize = '400%'; });

    const tall = await page.locator('.landing-install__label').evaluateAll((labels) =>
      labels.map((label) => {
        const box = label.getBoundingClientRect();
        const line = parseFloat(getComputedStyle(label).lineHeight) || parseFloat(getComputedStyle(label).fontSize) * 1.2;
        return Math.round(box.height / line);
      }),
    );

    expect(Math.max(...tall), `lines of each label: ${tall.join(', ')}`).toBeLessThanOrEqual(2);
  });
}
