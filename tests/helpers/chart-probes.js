/**
 * What the specs of the three charts (column-chart, stacked-bar, heat-map) read from the page: the pixels a box paints, the
 * colour of a text, the contrast between two of them. They run in `chromium` and in `chromium-nojs`, so nothing here needs
 * a script of the page: Playwright reads through its own connection.
 */
import { readPoints, readRow } from './pixels.js';

/** The ratio of two sRGB colours ([r, g, b], 0 to 255), as WCAG 2.2 defines it. */
export function ratio(a, b) {
  const light = (rgb) => {
    const [r, g, bl] = rgb.slice(0, 3).map((v) => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [light(a), light(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** The computed colour of an element (or of a pseudo-element of it) as [r, g, b]. */
export const colorOf = (locator, property = 'color', pseudo = null) => locator.evaluate((el, [p, ps]) => {
  const value = getComputedStyle(el, ps)[p];
  return value.match(/[\d.]+/g).slice(0, 3).map(Number);
}, [property, pseudo]);

/** The computed values of some properties of an element (or of a pseudo-element of it). */
export const styleOf = (locator, properties, pseudo = null) => locator.evaluate((el, [props, ps]) => {
  const cs = getComputedStyle(el, ps);
  return Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p)]));
}, [properties, pseudo]);

/**
 * The pixel a CSS colour paints as the background of a box, read from a screenshot: the engine paints the system
 * `Highlight` of a background a little differently from the `color` of a text (it is translucent), and a mark is a background.
 * @param {import('@playwright/test').Page} page
 * @param {string} value a CSS colour (it may be a `color-mix()`)
 * @param {import('@playwright/test').Locator} host the element the probe goes inside, so `var(--luz-…)` is read in its mode
 */
export async function backgroundOf(page, value, host) {
  const probe = await host.evaluateHandle((el, v) => {
    const div = document.createElement('div');
    div.style.cssText = `position:absolute;inset-block-start:0;inset-inline-start:0;inline-size:20px;block-size:20px;forced-color-adjust:none;background:${v}`;
    el.append(div);
    return div;
  }, value);
  const png = await probe.asElement().screenshot();
  const pixel = (await readRow(page, png, 10))[10];
  await probe.evaluate((el) => el.remove());
  return pixel;
}

/**
 * A vertical strip of a box: the pixels of one column of the screenshot of `locator`, from `from` to `to` (CSS px, from the
 * top of the box, `to` not included), at `x` px from the left of the box.
 */
export async function stripOf(page, locator, x, from, to) {
  await locator.scrollIntoViewIfNeeded();
  const png = await locator.screenshot();
  const points = [];
  for (let y = from; y < to; y++) points.push([x, y]);
  return readPoints(page, png, points);
}

/** The sideways overflow of the page: 0 when nothing scrolls. */
export const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
