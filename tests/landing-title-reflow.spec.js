// @ts-check
/**
 * The title of the "modes" section of the home (`#modes-title`) at 400 % text and 320 px (WCAG 1.4.10 Reflow:
 * no loss of content). The titles of the four levels sit in a `container: inside` and step down one size when
 * their column is narrow (`@container inside (max-inline-size: 16em)`); this one sat outside any such container,
 * missed the step and was wider than the column (found in the Safari review of 2026-10-24, where /ar/ was 4 px
 * wider than the window). It steps down with the others, and nothing of it leaves its section.
 * Runs in `chromium` (the section is plain markup with or without JavaScript).
 */
import { test, expect } from '@playwright/test';

for (const route of ['/', '/es/', '/ar/']) {
  test(`400 % text at 320 px: the title of the modes section fits its column (${route})`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(route);
    await page.waitForLoadState('load');
    await page.evaluate(() => { document.documentElement.style.fontSize = '400%'; });

    const { title, column } = await page.evaluate(() => {
      const heading = /** @type {HTMLElement} */ (document.querySelector('section#modes #modes-title'));
      const section = /** @type {HTMLElement} */ (document.querySelector('section#modes'));
      return { title: heading.getBoundingClientRect().width, column: section.clientWidth };
    });

    expect(title, `title ${Math.round(title)} px in a column of ${column} px`).toBeLessThanOrEqual(column + 0.5);
  });

  test(`400 % text at 320 px: the title of the modes section is no larger than the title of a level (${route})`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(route);
    await page.waitForLoadState('load');
    await page.evaluate(() => { document.documentElement.style.fontSize = '400%'; });

    const sizes = await page.evaluate(() => ({
      modes: parseFloat(getComputedStyle(/** @type {Element} */ (document.querySelector('#modes-title'))).fontSize),
      level: parseFloat(getComputedStyle(/** @type {Element} */ (document.querySelector('#inside-1-title'))).fontSize),
    }));

    expect(sizes.modes, `modes ${sizes.modes}px, level ${sizes.level}px`).toBeLessThanOrEqual(sizes.level);
  });
}
