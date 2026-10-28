// @ts-check
/**
 * F6 of .claude/plans/ai-and-catalog-only.md (decisions 40, 42 and 43): core's
 * round colour mode button is fixed at the end corner of the window, and
 * catalog's cookie band (<luz-cookie-consent>) is fixed along the bottom edge, so
 * the two meet. While the band shows, the button rides on its top edge (the
 * margin of the corner above the band), the window and the sticky docs rail
 * (from 80rem) keep the room of both for what Tab reaches (WCAG 2.4.11), and
 * <luz-color-mode> around a fixed button leaves no empty block in the flow.
 *
 * On tests/fixtures/mode-consent.html: a page with a docs rail, a long main
 * part with links at the end corner, and a footer with <luz-color-mode>, loaded
 * through luz.min.js and catalog.min.js, the real path. The button itself is
 * tests/mode-cycle.spec.js; the band alone is tests/consent-band.spec.js.
 *
 * Needs JavaScript: the button and the band are both written by it.
 */
import { test, expect } from '@playwright/test';

const PAGE = '/tests/fixtures/mode-consent.html';
const BAND = '#consent';

test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript');

/** Open the page with the band showing and the button written. */
async function open(page, { width = 1280, height = 800, dir = 'ltr' } = {}) {
  // Reduced motion: the window and the rail scroll to a focused link at once, not smoothly
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width, height });
  await page.goto(`${PAGE}${dir === 'rtl' ? '?dir=rtl' : ''}`);
  await expect(page.locator('.luz-mode-cycle')).toBeVisible();
  await expect(page.locator(BAND)).toBeVisible();
}

/** Answer with Accept and close the saved notice: the band is gone. */
async function answer(page) {
  await page.click('#accept');
  await page.click('#close');
  await expect(page.locator(BAND)).toBeHidden();
}

/** A CSS length as the browser resolves it, in px. */
const length = (page, expr) => page.evaluate((value) => {
  const probe = document.createElement('div');
  probe.style.inlineSize = value;
  document.body.append(probe);
  const px = probe.getBoundingClientRect().width;
  probe.remove();
  return px;
}, expr);
const box = (page, selector) => page.evaluate((s) => {
  const r = document.querySelector(s).getBoundingClientRect();
  return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
}, selector);
/** --luz-consent-h as the page computes it on :root, in px (NaN when it is not published). */
const consentH = (page) => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--luz-consent-h')));

/** Focus each Tab stop in turn; report the ones that are fully covered (every sample of the box is something else). */
async function tabStopsCovered(page, limit = 160) {
  const covered = [];
  let stops = 0;
  await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
  for (let i = 0; i < limit; i++) {
    await page.keyboard.press('Tab');
    const seen = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      if (el.closest('luz-cookie-consent')) return { band: true };
      const r = el.getBoundingClientRect();
      const samples = [];
      for (const fx of [0.1, 0.5, 0.9]) for (const fy of [0.1, 0.5, 0.9]) samples.push([r.left + r.width * fx, r.top + r.height * fy]);
      const free = samples.filter(([x, y]) => {
        const hit = document.elementFromPoint(x, y);
        return hit && (hit === el || el.contains(hit));
      });
      return { band: false, id: el.id || el.className || el.localName, free: free.length };
    });
    if (!seen) break;
    if (seen.band) continue;
    stops++;
    if (seen.free === 0) covered.push(seen.id);
  }
  return { covered, stops };
}

for (const [width, dir] of /** @type {const} */ ([[1280, 'ltr'], [1280, 'rtl'], [320, 'ltr'], [320, 'rtl']])) {
  test.describe(`the button and the band at ${width} px, ${dir}`, () => {
    test('the button rides on the top edge of the band, one margin above it, and never overlaps it', async ({ page }) => {
      await open(page, { width, dir });
      const margin = await length(page, 'var(--luz-space-md)');
      const band = await box(page, BAND);
      const button = await box(page, '.luz-mode-cycle');
      expect(band.top, 'the band is fixed along the bottom edge').toBeGreaterThan(0);
      expect(button.bottom, 'the button ends above the band').toBeLessThanOrEqual(band.top);
      expect(Math.abs(band.top - button.bottom - margin), `gap ${band.top - button.bottom}`).toBeLessThanOrEqual(1);
      const view = await page.evaluate(() => ({ w: document.documentElement.clientWidth }));
      if (dir === 'ltr') expect(view.w - button.right).toBeCloseTo(margin, 0);
      else expect(button.left).toBeCloseTo(margin, 0);
      expect(button.top, 'inside the window').toBeGreaterThanOrEqual(0);
    });

    test('when the band is answered the button goes back to the corner', async ({ page }) => {
      await open(page, { width, dir });
      await answer(page);
      const margin = await length(page, 'var(--luz-space-md)');
      const button = await box(page, '.luz-mode-cycle');
      const view = await page.evaluate(() => ({ h: window.innerHeight }));
      expect(view.h - button.bottom).toBeCloseTo(margin, 0);
    });

    test('while the band shows, the window keeps its height and the button for what Tab reaches', async ({ page }) => {
      await open(page, { width, dir });
      const padding = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).scrollPaddingBlockEnd));
      const need = (await consentH(page)) + (await length(page, 'calc(var(--luz-control-lg) + var(--luz-space-md) * 2)'));
      expect(padding).toBeGreaterThanOrEqual(need);
    });
  });
}

for (const width of [320, 1024, 1280]) {
  test(`with the band showing no Tab stop is fully covered by the band or the button at ${width} px`, async ({ page }) => {
    await open(page, { width });
    const { covered, stops } = await tabStopsCovered(page);
    expect(stops, 'the page has Tab stops').toBeGreaterThan(20);
    expect(covered).toEqual([]);
  });
}

test('in a right-to-left page no Tab stop is fully covered either, at 1280 px', async ({ page }) => {
  await open(page, { dir: 'rtl' });
  const { covered, stops } = await tabStopsCovered(page);
  expect(stops).toBeGreaterThan(20);
  expect(covered).toEqual([]);
});

test('in a window 30rem tall or less the band is in the flow and the button stays in the corner', async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 440 });
  await page.goto(PAGE);
  await expect(page.locator(BAND)).toBeVisible();
  await expect(page.locator(BAND)).toHaveCSS('position', 'static');
  const margin = await length(page, 'var(--luz-space-md)');
  const button = await box(page, '.luz-mode-cycle');
  expect(440 - button.bottom).toBeCloseTo(margin, 0);
});

test.describe('<luz-color-mode> around a fixed button', () => {
  test('is display: contents, so it leaves no empty block in the flow', async ({ page }) => {
    await open(page);
    await expect(page.locator('luz-color-mode')).toHaveCSS('display', 'contents');
    expect((await box(page, 'luz-color-mode')).height).toBe(0);
  });

  test('is a block again when the button is .luz-mode-switcher--inline', async ({ page }) => {
    await open(page);
    await page.locator('.luz-mode-switcher--cycle').evaluate((el) => el.classList.add('luz-mode-switcher--inline'));
    await expect(page.locator('luz-color-mode')).toHaveCSS('display', 'block');
  });
});

test.describe('the sticky docs rail, from 80rem', () => {
  test('keeps the height of the band as end padding and scroll padding while the band shows', async ({ page }) => {
    await open(page, { width: 1280 });
    const h = await consentH(page);
    expect(h).toBeGreaterThan(0);
    const inner = await page.locator('.luz-page-rail__inner').evaluate((el) => {
      const s = getComputedStyle(el);
      return { padding: parseFloat(s.paddingBlockEnd), scroll: parseFloat(s.scrollPaddingBlockEnd) };
    });
    expect(inner.padding).toBeCloseTo(h, 0);
    expect(inner.scroll).toBeCloseTo(h, 0);
    await answer(page);
    const after = await page.locator('.luz-page-rail__inner').evaluate((el) => parseFloat(getComputedStyle(el).paddingBlockEnd));
    expect(after).toBe(0);
  });

  test('below 80rem the rail is not a scroller of its own and keeps no padding for the band', async ({ page }) => {
    await open(page, { width: 1024 });
    const padding = await page.locator('.luz-page-rail__inner').evaluate((el) => parseFloat(getComputedStyle(el).paddingBlockEnd));
    expect(padding).toBe(0);
  });

  test('its last link, focused, is above the band', async ({ page }) => {
    await open(page, { width: 1280 });
    await page.locator('#rail-report').focus();
    await expect.poll(async () => {
      const link = await box(page, '#rail-report');
      const band = await box(page, BAND);
      return link.bottom <= band.top;
    }).toBe(true);
  });
});
