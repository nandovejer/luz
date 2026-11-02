// @ts-check
/**
 * The picture on the docs 404 page (apps/docs/404.html, styled in apps/docs/reference.css): the Earth and the Sun
 * with a plug, in the page's neon green, is a decorative watermark and no longer part of the content.
 *
 *  - there is no `img` and no `figure` in the main: the picture is the background of `.docs-not-found::before`;
 *  - that pseudo-element is fixed to the window (inset 0, as large as the window), sits behind the code rain
 *    (z-index lower than the rain's), takes no pointer events, paints `404-matrix-1000.webp` and is faint (opacity
 *    0.1 to 0.3), so the text over it keeps its contrast;
 *  - it is not painted in high contrast (`data-theme="high-contrast"`) nor under forced colors;
 *  - the page still has its one h1, does not scroll sideways at 320 px, keeps the three buttons in the window
 *    at 1024 x 700, and axe finds nothing serious in the dark mode the layout hard-codes and in high contrast;
 *  - the same holds with JavaScript off: the page has no script of its own.
 * Reduced motion is asked for where the geometry is read, as the other specs of this page do, so the CRT switch-on
 * (about 4 s) is over; the rain is drawn only without it, so the z-index test asks for no preference. Runs in
 * `chromium`; the no-JS describe sets `javaScriptEnabled: false` itself.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const LAST_LINK = 'main .docs-not-found__links li:last-child a';

/** @param {import('@playwright/test').Page} page @param {'reduce' | 'no-preference'} [motion] */
async function open(page, motion = 'reduce') {
  await page.emulateMedia({ reducedMotion: motion });
  await page.goto('/404.html');
  await expect(page.locator('h1')).toHaveCount(1);
}

/** The computed style of the watermark, the pseudo-element of the body. @param {import('@playwright/test').Page} page */
const watermark = (page) =>
  page.evaluate(() => {
    const s = getComputedStyle(document.body, '::before');
    return {
      display: s.display,
      position: s.position,
      top: s.top,
      right: s.right,
      bottom: s.bottom,
      left: s.left,
      width: parseFloat(s.width),
      height: parseFloat(s.height),
      zIndex: s.zIndex,
      pointerEvents: s.pointerEvents,
      opacity: parseFloat(s.opacity),
      image: s.backgroundImage,
      inner: [document.documentElement.clientWidth, window.innerHeight],
    };
  });

test.describe('the picture on the not-found page is a watermark', () => {
  test('is no img and no figure in the main, and the page keeps its one h1 and its lead', async ({ page }) => {
    await open(page);
    await expect(page.locator('main img, main figure')).toHaveCount(0);
    await expect(page.locator('h1')).toHaveText('Page not found');
    await expect(page.locator('main .docs-lead a')).toHaveCount(1);
  });

  test('covers the window, takes no pointer events and paints the published 404-matrix-1000.webp', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await open(page);
    const w = await watermark(page);
    expect(w.position).toBe('fixed');
    expect([w.top, w.right, w.bottom, w.left], 'inset 0').toEqual(['0px', '0px', '0px', '0px']);
    expect(w.width, 'as wide as the window').toBeCloseTo(w.inner[0], 0);
    expect(w.height, 'as tall as the window').toBeCloseTo(w.inner[1], 0);
    expect(w.pointerEvents).toBe('none');
    expect(w.image).toMatch(/url\(.*404-matrix-1000[^)]*\.webp/);
    const file = w.image.match(/url\("?([^")]+)"?\)/)?.[1] ?? '';
    const res = await page.request.get(new URL(file, page.url()).href);
    expect(res.ok(), 'the picture is served').toBe(true);
  });

  test('is faint: opacity between 0.1 and 0.3', async ({ page }) => {
    await open(page);
    const { opacity } = await watermark(page);
    expect(opacity).toBeGreaterThanOrEqual(0.1);
    expect(opacity).toBeLessThanOrEqual(0.3);
  });

  test('sits behind the code rain', async ({ page }) => {
    await open(page, 'no-preference');
    const facts = await page.evaluate(() => ({
      mark: getComputedStyle(document.body, '::before').zIndex,
      rain: getComputedStyle(/** @type {Element} */ (document.querySelector('.docs-not-found__rain'))).zIndex,
    }));
    expect(facts.rain, 'the rain is drawn with motion allowed').toBe('-1');
    expect(Number(facts.mark), 'z-index lower than the rain').toBeLessThan(Number(facts.rain));
    expect(facts.mark).toBe('-2');
  });

  test('is not painted in high contrast', async ({ page }) => {
    await open(page);
    expect((await watermark(page)).display, 'painted in dark').not.toBe('none');
    await page.evaluate(() => { document.documentElement.dataset.theme = 'high-contrast'; });
    expect((await watermark(page)).display).toBe('none');
  });

  test('is not painted under forced colors', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await page.goto('/404.html');
    expect((await watermark(page)).display).toBe('none');
  });

  test('does not scroll sideways at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await open(page);
    const facts = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth }));
    expect(facts.scroll, 'no sideways scroll').toBeLessThanOrEqual(facts.inner);
  });

  test('leaves the last of the three links inside the window at 1024 x 700', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 700 });
    await open(page);
    const link = await page.locator(LAST_LINK).boundingBox();
    expect(link, 'the last link is drawn').not.toBeNull();
    expect((link?.y ?? 0) + (link?.height ?? 0), 'the last link ends inside 700px').toBeLessThanOrEqual(700);
  });

  for (const theme of ['dark', 'high-contrast']) {
    test(`has no serious or critical axe violation in ${theme}`, async ({ page }) => {
      await open(page);
      // The layout fixes data-theme="dark"; the other mode is set by hand
      await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
      await page.waitForTimeout(400);
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      const blocking = violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''));
      expect(blocking.map((v) => `${v.impact} ${v.id}: ${v.nodes[0]?.target?.join(' ')}`)).toEqual([]);
    });
  }
});

test.describe('without JavaScript the watermark is still there', () => {
  test.use({ javaScriptEnabled: false });

  test('is a faint fixed background behind the rain and the page has no img', async ({ page }) => {
    await open(page);
    await expect(page.locator('main img, main figure')).toHaveCount(0);
    const w = await watermark(page);
    expect(w.position).toBe('fixed');
    expect(w.pointerEvents).toBe('none');
    expect(w.opacity).toBeGreaterThanOrEqual(0.1);
    expect(w.opacity).toBeLessThanOrEqual(0.3);
    expect(w.image).toMatch(/url\(.*404-matrix-1000[^)]*\.webp/);
  });
});
