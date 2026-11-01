// @ts-check
/**
 * The picture on the docs 404 page (apps/docs/404.html, styled in apps/docs/reference.css): the Earth and the Sun
 * with a plug, in the page's neon green, the main content of the page and so never lazy.
 *
 *  - `img.docs-not-found__image` has a real alt, its width and height (1000 x 800) so the page does not jump,
 *    `decoding="async"` and no `loading="lazy"`;
 *  - it is drawn (naturalWidth > 0), also with JavaScript off: the page has no script of its own;
 *  - at 320 px the page does not scroll sideways, and at 1024 x 700 the last of the three links is still inside
 *    the window: the picture is capped at max(30vh, 12rem) tall and never pushes the buttons out of view;
 *  - axe finds nothing serious in the dark mode the layout hard-codes and in high contrast.
 * Reduced motion is asked for, as the other specs of this page do, so the CRT switch-on (about 4 s) is already
 * over when the geometry is read. Runs in `chromium`; the no-JS describe sets `javaScriptEnabled: false` itself.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const IMAGE = 'img.docs-not-found__image';
const LAST_LINK = 'main .docs-not-found__links li:last-child a';

/** @param {import('@playwright/test').Page} page */
async function open(page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/404.html');
  await expect(page.locator(IMAGE)).toHaveCount(1);
}

/** @param {import('@playwright/test').Page} page */
const drawn = (page) => page.locator(IMAGE).evaluate((img) => /** @type {HTMLImageElement} */ (img).complete && /** @type {HTMLImageElement} */ (img).naturalWidth);

test.describe('the picture on the not-found page', () => {
  test('is an img with a real alt, its dimensions, async decoding and no lazy loading', async ({ page }) => {
    await open(page);
    const img = page.locator(IMAGE);
    const alt = await img.getAttribute('alt');
    expect(alt?.trim().length ?? 0, 'a descriptive alt').toBeGreaterThan(20);
    await expect(img).toHaveAttribute('width', '1000');
    await expect(img).toHaveAttribute('height', '800');
    await expect(img).toHaveAttribute('decoding', 'async');
    expect(await img.getAttribute('loading'), 'the main content is never lazy').not.toBe('lazy');
  });

  test('is loaded and drawn', async ({ page }) => {
    await open(page);
    await expect.poll(() => drawn(page)).toBeGreaterThan(0);
  });

  test('does not scroll sideways at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await open(page);
    await expect.poll(() => drawn(page)).toBeGreaterThan(0);
    const facts = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth, right: document.querySelector('img.docs-not-found__image')?.getBoundingClientRect().right ?? 0 }));
    expect(facts.scroll, 'no sideways scroll').toBeLessThanOrEqual(facts.inner);
    expect(facts.right, 'the picture ends inside the window').toBeLessThanOrEqual(facts.inner);
  });

  test('is no taller than max(30vh, 12rem), so at 1024 x 700 the last link is still in the window', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 700 });
    await open(page);
    await expect.poll(() => drawn(page)).toBeGreaterThan(0);
    const facts = await page.evaluate(() => {
      const img = /** @type {HTMLElement} */ (document.querySelector('img.docs-not-found__image'));
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
      return { cap: getComputedStyle(img).maxBlockSize, expected: Math.max(window.innerHeight * 0.3, 12 * rem), height: img.getBoundingClientRect().height };
    });
    expect(parseFloat(facts.cap), 'max-block-size is max(30vh, 12rem)').toBeCloseTo(facts.expected, 0);
    expect(facts.height, 'drawn within its cap').toBeLessThanOrEqual(facts.expected + 0.5);
    const link = await page.locator(LAST_LINK).boundingBox();
    expect(link, 'the last link is drawn').not.toBeNull();
    expect((link?.y ?? 0) + (link?.height ?? 0), 'the last link ends inside 700px').toBeLessThanOrEqual(700);
  });

  for (const theme of ['dark', 'high-contrast']) {
    test(`has no serious or critical axe violation in ${theme}`, async ({ page }) => {
      await open(page);
      await expect.poll(() => drawn(page)).toBeGreaterThan(0);
      // The layout fixes data-theme="dark"; the other mode is set by hand
      await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
      await page.waitForTimeout(400);
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      const blocking = violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''));
      expect(blocking.map((v) => `${v.impact} ${v.id}: ${v.nodes[0]?.target?.join(' ')}`)).toEqual([]);
    });
  }
});

test.describe('without JavaScript the picture is still drawn', () => {
  test.use({ javaScriptEnabled: false });

  test('loads, with its alt', async ({ page }) => {
    await open(page);
    await expect.poll(() => drawn(page)).toBeGreaterThan(0);
    expect((await page.locator(IMAGE).getAttribute('alt'))?.trim().length ?? 0).toBeGreaterThan(20);
  });
});
