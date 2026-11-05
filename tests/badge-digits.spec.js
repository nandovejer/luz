// @ts-check
/**
 * The digits of a count badge (.luz-badge, packages/core/src/components/tag.css) sit in the middle of its 20 px box.
 * The box is centred by its line box, and a mono face keeps descender room below the digits, so the digits rode
 * 0.6 to 2 px high. The test measures the ink of the digit (canvas metrics of the face, placed by the text node's
 * rect) against the badge's box, for the system mono stacks, and checks the box did not change: 20 px high, at least
 * 20 px wide, the tag the same, and the line of a link with a badge in it no taller than the line of the same link without one.
 */
import { test, expect } from '@playwright/test';

const PAGE = '/docs/components/tag/';
const FACES = [
  'ui-monospace',
  'Menlo',
  'Consolas',
  "'DejaVu Sans Mono'",
  'monospace',
  "'Liberation Mono'",
  "'Courier New'",
];
/** px of tolerance on the offset of the ink's centre from the box's centre (a pixel of the grid, and a hair) */
const TOLERANCE = 1.05;

test.describe('the digits of a count badge are in the middle of its box', () => {
  for (const face of FACES) {
    test(`${face}: the ink of the digits is centred within 1 px, and not higher`, async ({ page }) => {
      await page.goto(PAGE);
      const found = await page.evaluate((mono) => {
        document.documentElement.style.setProperty('--luz-font-mono', mono);
        const holder = document.createElement('p');
        holder.innerHTML = '<span class="luz-badge luz-badge--primary" id="probe-badge">99</span>';
        document.body.append(holder);
        const el = /** @type {HTMLElement} */ (document.getElementById('probe-badge'));
        const cs = getComputedStyle(el);
        const box = el.getBoundingClientRect();
        const ctx = /** @type {CanvasRenderingContext2D} */ (document.createElement('canvas').getContext('2d'));
        ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        const m = ctx.measureText('9');
        const range = document.createRange();
        range.selectNodeContents(/** @type {Node} */ (el.firstChild));
        const baseline = range.getBoundingClientRect().top + m.fontBoundingBoxAscent;
        const top = baseline - m.actualBoundingBoxAscent;
        const bottom = baseline + m.actualBoundingBoxDescent;
        return {
          offset: (top + bottom) / 2 - (box.top + box.bottom) / 2, // + is low, - is high
          height: box.height,
          width: box.width,
          family: cs.fontFamily,
        };
      }, face);
      expect(Math.abs(found.offset), `ink centre vs box centre, ${found.offset.toFixed(2)} px (${found.family})`).toBeLessThanOrEqual(TOLERANCE);
      expect(found.offset, 'never above the middle by more than a pixel').toBeGreaterThanOrEqual(-TOLERANCE);
      expect(found.height, 'the box is 20 px high').toBeCloseTo(20, 1);
      expect(found.width, 'the box is at least 20 px wide').toBeGreaterThanOrEqual(20 - 0.01);
    });
  }

  test('the tag keeps its height, and the line of a link with a badge in it is no taller than the line of the same link without one', async ({ page }) => {
    await page.goto(PAGE);
    const found = await page.evaluate(() => {
      const holder = document.createElement('div');
      holder.innerHTML =
        '<p><span class="luz-tag luz-tag--gray" id="probe-tag">Tag</span></p>' +
        '<p id="probe-with"><a href="/inbox/">Inbox <span class="luz-badge luz-badge--primary">3</span></a></p>' +
        '<p id="probe-without"><a href="/inbox/">Inbox</a></p>';
      document.body.append(holder);
      const h = (/** @type {string} */ id) => /** @type {HTMLElement} */ (document.getElementById(id)).getBoundingClientRect().height;
      const tag = /** @type {HTMLElement} */ (document.getElementById('probe-tag'));
      return { tag: h('probe-tag'), tagMin: parseFloat(getComputedStyle(tag).minHeight), withBadge: h('probe-with'), without: h('probe-without') };
    });
    expect(found.tag, 'the tag is its minimum height').toBeCloseTo(found.tagMin, 1);
    expect(found.withBadge, 'the line box of the link with a badge does not grow').toBeLessThanOrEqual(found.without + 0.01);
  });
});
