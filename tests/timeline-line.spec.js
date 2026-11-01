// @ts-check
/**
 * The timeline's line and the base of its hump are one kind of drawing. The line used to be a 1px border of the
 * rail, moved up half its height with `translate`, and the base of the hump a 1px stroke of an SVG: Firefox
 * snaps a border to the device pixel and draws a stroke with anti-aliasing, so the line was one crisp row and
 * the base of the hump two soft ones, half a pixel higher: the blue base of the hump did not meet the grey
 * line, which is what showed. Now the line is an SVG too, with the same viewBox, the same path and the same box
 * as the hump (`.luz-timeline__line`), so the two land on the same rows in every engine, by construction.
 * It needs JavaScript: the rail is built by it.
 */
import { test, expect } from '@playwright/test';

const PAGE = '/docs/catalog/timeline/';

test.describe('the timeline line is drawn as the base of its hump', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript: the rail is built by it');

  async function railOf(page) {
    await page.goto(PAGE);
    const rail = page.locator('luz-timeline[data-luz-ready] .luz-timeline__rail').first();
    await expect(rail).toHaveCount(1);
    await rail.scrollIntoViewIfNeeded();
    return rail;
  }

  test('the rail starts with an SVG line that has the viewBox, the path and the box of the hump', async ({ page }) => {
    const rail = await railOf(page);
    const found = await rail.evaluate((el) => {
      const line = el.querySelector(':scope > svg.luz-timeline__line');
      const hump = el.querySelector(':scope > svg.luz-timeline__hump');
      if (!line || !hump) return { line: !!line, hump: !!hump };
      const a = line.getBoundingClientRect();
      const b = hump.getBoundingClientRect();
      return {
        line: true,
        hump: true,
        hidden: line.getAttribute('aria-hidden'),
        viewBox: [line.getAttribute('viewBox'), hump.getAttribute('viewBox')],
        ratio: [line.getAttribute('preserveAspectRatio'), hump.getAttribute('preserveAspectRatio')],
        d: [line.querySelector('path')?.getAttribute('d'), hump.querySelector('path')?.getAttribute('d')],
        paths: line.querySelectorAll('path').length,
        top: [a.top, b.top],
        height: [a.height, b.height],
        first: el.firstElementChild === line,
      };
    });
    expect(found.line, 'a line svg in the rail').toBe(true);
    expect(found.hump, 'the hump svg in the rail').toBe(true);
    expect(found.first, 'the line comes first, under the hump').toBe(true);
    expect(found.hidden, 'the drawing is decoration').toBe('true');
    expect(found.paths, 'one stroke').toBe(1);
    expect(found.viewBox[0], 'the same viewBox as the hump').toBe(found.viewBox[1]);
    expect(found.ratio[0], 'stretched as the hump is').toBe(found.ratio[1]);
    expect(found.d[0], 'the same path as the hump\'s ground stroke').toBe(found.d[1]);
    expect(found.top[0], 'the same top').toBeCloseTo(found.top[1], 2);
    expect(found.height[0], 'the same height').toBeCloseTo(found.height[1], 2);
  });

  test('the rail draws no line of its own with a border', async ({ page }) => {
    const rail = await railOf(page);
    const content = await rail.evaluate((el) => getComputedStyle(el, '::before').content);
    expect(content, 'no ::before line on the rail').toBe('none');
  });

  test('the line takes the outline colour, and in forced colours the same system colour as the hump', async ({ page }) => {
    const rail = await railOf(page);
    const stroke = (selector) => rail.evaluate((el, s) => getComputedStyle(el.querySelector(s)).stroke, selector);
    const outline = await rail.evaluate((el) => {
      const probe = document.createElement('i');
      probe.style.color = 'var(--luz-outline)';
      el.append(probe);
      const colour = getComputedStyle(probe).color;
      probe.remove();
      return colour;
    });
    expect(await stroke('.luz-timeline__line path')).toBe(outline);
    await page.emulateMedia({ forcedColors: 'active' });
    expect(await stroke('.luz-timeline__line path'), 'forced colours: the hump\'s own system colour').toBe(await stroke('.luz-timeline__hump'));
  });
});
