// @ts-check
/**
 * A deep link into a page of controls stays where it landed when the web font arrives late (Firefox review, 2026-11).
 *
 * /docs/components/form-inputs/#month-keyboard: the browser scrolls to the target while the page is set in the fallback face.
 * Then ET Book loads, the lines get shorter and the page shrinks by some 190 px. Chromium keeps the target in place by scroll
 * anchoring; Firefox does not compensate, and the target ends under the site header and the stuck tab row. The docs script
 * (apps/docs/view.js) puts the target back where it belongs once the fonts are ready, when the page was opened with a hash and
 * the reader has not scrolled; a reader who has scrolled is never taken back.
 *
 * Firefox is emulated in Chromium, which re-scrolls to the fragment by itself when the page has loaded (so a real ET Book that
 * arrives before the load event is no test). Four things are made to happen as they do in Firefox: scroll anchoring is off
 * (`overflow-anchor: none`); the page is set in a wide face (monospace) while a font is pending; that font (a late `FontFace`,
 * answered after a second) arrives after the target was scrolled to; and then the page is set in a narrower face (serif), so it
 * shrinks by more than a thousand pixels, as it does when ET Book replaces the fallback. `document.fonts.ready` resolves at
 * that moment. It needs JavaScript, so it runs in the chromium project only.
 */
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

const ROUTE = '/docs/components/form-inputs/#month-keyboard';
const TARGET = 'month-keyboard';
const HELD_BACK = 1000;
const FONT = readFileSync(new URL('../packages/tokens/fonts/serif/ETBook-Roman.woff2', import.meta.url));

/** Firefox's lack of scroll anchoring, a wide face first, and a font that arrives late and brings the narrow one. */
async function emulateFirefoxAndLateFont(page) {
  await page.addInitScript(() => {
    const sheet = new window.CSSStyleSheet();
    sheet.replaceSync(
      'html { overflow-anchor: none; } ' +
        ':root { --luz-font-body: monospace !important; --luz-font-heading: monospace !important; } ' +
        ':root.late-font { --luz-font-body: serif !important; --luz-font-heading: serif !important; }',
    );
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    const face = new window.FontFace('LuzLate', 'url(/luz-late-font.woff2)');
    document.fonts.add(face);
    face.load().then(() => document.documentElement.classList.add('late-font'));
  });
  await page.route('**/luz-late-font.woff2', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, HELD_BACK));
    await route.fulfill({ body: FONT, contentType: 'font/woff2' });
  });
}

/** Where the target is, and where the stuck chrome ends: the site header and the tab row of the target's control. */
const measure = (page) =>
  page.evaluate((id) => {
    const target = document.getElementById(id);
    const header = document.querySelector('.site-header').getBoundingClientRect().bottom;
    const row = target.closest('.docs-control').querySelector('nav.docs-view-tabs').getBoundingClientRect().bottom;
    return { top: target.getBoundingClientRect().top, header, row, height: window.innerHeight, scrollY: window.scrollY, late: document.documentElement.classList.contains('late-font') };
  }, TARGET);

/** Open the page with the late font on its way, the target scrolled to in the wide face. */
async function open(page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await emulateFirefoxAndLateFont(page);
  await page.goto(ROUTE, { waitUntil: 'commit' });
  await expect(page.locator(`#${TARGET}`)).toBeVisible();
  const first = await measure(page);
  expect(first.late, 'the late font is still on its way').toBe(false);
  expect(first.top, 'the target was scrolled to, below the header and the tab row').toBeGreaterThanOrEqual(Math.max(first.header, first.row) - 1);
}

/** The late font has arrived, the page has shrunk and the fonts are ready. */
async function fontArrived(page) {
  await expect.poll(async () => (await measure(page)).late, { timeout: 10_000 }).toBe(true);
  await page.evaluate(() => document.fonts.ready);
}

test.describe('a deep link on a page of controls, with the font arriving late', () => {
  test.beforeEach(({ browserName, javaScriptEnabled }) => {
    test.skip(browserName !== 'chromium' || javaScriptEnabled === false, 'the chromium project, with JavaScript');
  });

  test('the target is below the site header and the stuck tab row, and in the window, once the fonts are ready', async ({ page }) => {
    await open(page);
    await fontArrived(page);
    // Give the script the frames it needs to put the target back
    await page.waitForTimeout(500);
    const { top, header, row, height } = await measure(page);
    expect(top, `target ${top}px, header ends at ${header}px, tab row at ${row}px`).toBeGreaterThanOrEqual(Math.max(header, row) - 1);
    expect(top, 'in the window').toBeLessThan(height);
  });

  test('a reader who scrolled before the fonts arrived is not taken back to the target', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    // The reader scrolls away with the wheel, while the font is on its way
    await page.mouse.move(700, 500);
    await page.mouse.wheel(0, 1200);
    await expect.poll(async () => (await measure(page)).scrollY, { timeout: 5000 }).toBeGreaterThan(0);
    let before = -1;
    await expect
      .poll(async () => {
        const y = (await measure(page)).scrollY;
        const settled = y === before;
        before = y;
        return settled;
      })
      .toBe(true);
    expect((await measure(page)).late, 'still before the font').toBe(false);
    await fontArrived(page);
    await page.waitForTimeout(500);
    expect(Math.abs((await measure(page)).scrollY - before), 'the page did not move after the fonts').toBeLessThanOrEqual(2);
  });
});
