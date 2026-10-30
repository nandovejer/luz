// @ts-check
/**
 * apps/site/assets/favicon.svg animates the three bands of its prism with its own CSS (owner, 2026-10-30; Firefox
 * plays an animated SVG icon, the other browsers draw its first frame). Drawn as an <img> in a page, the opacity
 * of a band changes over a few seconds when the system allows motion, and does not under reduced motion. The
 * file's source (no script, `infinite`, inside the no-preference query) is
 * tests/site-logo-motion-written.test.js.
 *
 * Chromium only and with JavaScript on: the pixels are read through a canvas. The probe page is served by the test.
 */
import { test, expect } from '@playwright/test';

const ICON = '/apps/site/assets/favicon.svg';
const SIDE = 480;
/** A point inside each band, in the 48 x 48 box of the icon (the centroid of its triangle, then the group's translate and scale). */
const SAMPLES = [
  [17.0667, 14.3333],
  [18.7733, 17.29],
  [20.4933, 20.2533],
].map(([x, y]) => [Math.round((9 + x * 0.9375) * 10), Math.round((9.6 + y * 0.9375) * 10)]);

test.skip(({ javaScriptEnabled }) => !javaScriptEnabled, 'reads pixels through a canvas');

test.describe('the favicon as an image', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await page.route('**/favicon-motion-probe.html', (route) =>
      route.fulfill({ contentType: 'text/html', body: `<!doctype html><title>probe</title><img id="icon" src="${ICON}" width="${SIDE}" height="${SIDE}" alt="">` }),
    );
    await page.goto(`${baseURL}/favicon-motion-probe.html`);
    await page.locator('#icon').evaluate((img) => /** @type {HTMLImageElement} */ (img).decode());
  });

  /** The red channel (0 on the blue plaque, 255 on white) at each band, 0 to 1. */
  const bands = (page) =>
    page.locator('#icon').evaluate(
      (img, points) => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 480;
        const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
        ctx.drawImage(/** @type {HTMLImageElement} */ (img), 0, 0, 480, 480);
        return points.map(([x, y]) => ctx.getImageData(x, y, 1, 1).data[0] / 255);
      },
      SAMPLES,
    );

  async function sample(page, ms) {
    /** @type {number[][]} */
    const out = [[], [], []];
    for (let t = 0; t < ms; t += 150) {
      (await bands(page)).forEach((v, i) => out[i].push(v));
      await page.waitForTimeout(150);
    }
    return out;
  }

  test('with motion allowed the opacity of each band changes over a loop', async ({ page }) => {
    test.setTimeout(45_000);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.reload();
    await page.locator('#icon').evaluate((img) => /** @type {HTMLImageElement} */ (img).decode());
    const out = await sample(page, 5400);
    for (const [i, values] of out.entries()) {
      expect(Math.max(...values) - Math.min(...values), `band ${i + 1}: its opacity changes (red channel ${values.map((v) => v.toFixed(2)).join(' ')})`).toBeGreaterThan(0.2);
    }
  });

  test('with reduced motion the bands have no animation and keep their tones', async ({ page, baseURL }) => {
    // Chromium draws an SVG image with media settings of its own, which `emulateMedia` does not reach, so the file
    // is opened as a document: the same stylesheet, the same query
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${baseURL}${ICON}`);
    const read = () => page.evaluate(() => [...document.querySelectorAll('path')].slice(0, 3).map((p) => ({ name: getComputedStyle(p).animationName, tone: parseFloat(getComputedStyle(p).fillOpacity) })));
    const first = await read();
    expect(first).toHaveLength(3);
    for (const [i, band] of first.entries()) {
      expect(band.name, `band ${i + 1}: no animation`).toBe('none');
      expect(band.tone, `band ${i + 1}: its tone`).toBeCloseTo([0.25, 0.45, 0.65][i], 2);
    }
    await page.waitForTimeout(800);
    expect((await read()).map((b) => b.tone)).toEqual(first.map((b) => b.tone));
  });

  test('with motion allowed, opened as a document, the three bands play one animation that never ends, 4.8 s long', async ({ page, baseURL }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(`${baseURL}${ICON}`);
    const bands = await page.evaluate(() => [...document.querySelectorAll('path')].slice(0, 3).map((p) => ({ name: getComputedStyle(p).animationName, count: getComputedStyle(p).animationIterationCount, duration: getComputedStyle(p).animationDuration })));
    for (const [i, band] of bands.entries()) {
      expect(band.name, `band ${i + 1}`).not.toBe('none');
      expect(band.count, `band ${i + 1}: it never ends`).toBe('infinite');
      expect(parseFloat(band.duration), `band ${i + 1}: 4.8 s`).toBeCloseTo(4.8, 2);
    }
  });
});
