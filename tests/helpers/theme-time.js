/**
 * Shared by the specs of <luz-theme-time> (catalog): the pages that carry it
 * (tests/fixtures/theme-time*.html), the six moments those pages declare, and
 * the reader of the track's edge.
 *
 * The moments are the ones the fixtures write in their markup (`data-from`,
 * `data-theme`): a test names an hour inside each and what the page must show
 * there. The clock is the page's own (`atTime`, a June day in Madrid).
 */
import { expect } from '@playwright/test';
import { parseColor, ratio } from '../../packages/tokens/lib/contrast.js';
import { atTime } from './site-lights.js';

/** The page with the moments and core's button, no bar. */
export const PLAIN = '/tests/fixtures/theme-time.html';
/** The same with `variant="bar"`: the slider of the day. The query string sets `show`, `latitude`, `longitude`, `place`, `no-remember`, `lang` or `dir`. */
export const BAR = '/tests/fixtures/theme-time-bar.html';
/** The bar on a site that sets no `--luz-theme-time-sky-*`. */
export const NEUTRAL = '/tests/fixtures/theme-time-bar-neutral.html';
/** Core's button and the catalog loader, and no <luz-theme-time>. */
export const ABSENT = '/tests/fixtures/theme-time-absent.html';
/** The two boot scripts and nothing else. */
export const BOOT = '/tests/fixtures/theme-time-boot.html';
/** The same on a page that names its own brand. */
export const BOOT_BRAND = '/tests/fixtures/theme-time-boot-brand.html';

/** The moments of the fixtures, by start: [name, from (hours), base, label]. */
export const MOMENTS = [
  ['dawn', 5, 'dark', 'Dawn'],
  ['morning', 7.5, 'light', 'Morning light'],
  ['afternoon', 12, 'light', 'Afternoon light'],
  ['sunset', 17.5, 'light', 'Sunset'],
  ['dusk', 20.5, 'dark', 'Dusk'],
  ['night', 22.5, 'dark', 'Night'],
];

/** [hh:mm, the moment it is in, its base]: both sides of every boundary and the turn of midnight. */
export const HOURS = [
  ['00:00', 'night', 'dark'],
  ['04:59', 'night', 'dark'],
  ['05:00', 'dawn', 'dark'],
  ['07:29', 'dawn', 'dark'],
  ['07:30', 'morning', 'light'],
  ['11:59', 'morning', 'light'],
  ['12:00', 'afternoon', 'light'],
  ['17:29', 'afternoon', 'light'],
  ['17:30', 'sunset', 'light'],
  ['20:29', 'sunset', 'light'],
  ['20:30', 'dusk', 'dark'],
  ['22:29', 'dusk', 'dark'],
  ['22:30', 'night', 'dark'],
  ['23:59', 'night', 'dark'],
];

/**
 * Open a fixture, optionally at a clock hour, and wait until <luz-theme-time> is defined
 * (and, for a bar, built).
 * @param {import('@playwright/test').Page} page
 * @param {string} url
 * @param {{ time?: string, bar?: boolean }} [options]
 */
export async function open(page, url = PLAIN, { time, bar = false } = {}) {
  if (time) await atTime(page, time);
  await page.goto(url);
  await expect.poll(() => page.evaluate(() => !!customElements.get('luz-theme-time')), { message: 'the chunk defines <luz-theme-time>' }).toBe(true);
  if (bar) await expect(page.locator('luz-theme-time > .luz-theme-time__bar')).toHaveCount(1);
}

/** What <html> says about the mode and the moment. */
export const rootState = (page) =>
  page.evaluate(() => {
    const { dataset } = document.documentElement;
    return { moment: dataset.moment ?? null, mode: dataset.mode ?? null, theme: dataset.theme ?? null };
  });

/** A box too small to be seen: the 1px clip of a visually hidden text. */
export const isVisuallyHidden = async (locator) => {
  const box = await locator.boundingBox();
  return box === null || (box.width <= 1 && box.height <= 1);
};

/**
 * The stops of the gradient `--luz-theme-time-sky` of a bar, as the browser resolves it:
 * { way, stops: [{ colour, at }] } with `at` in percent. null when the property is not set.
 */
export function skyOf(page) {
  return page.evaluate(() => {
    const bar = document.querySelector('luz-theme-time > .luz-theme-time__bar');
    const text = getComputedStyle(bar).getPropertyValue('--luz-theme-time-sky').trim();
    if (!text) return null;
    const inside = text.slice(text.indexOf('(') + 1, text.lastIndexOf(')'));
    const parts = [];
    let depth = 0;
    let from = 0;
    for (let i = 0; i < inside.length; i++) {
      if (inside[i] === '(') depth++;
      else if (inside[i] === ')') depth--;
      else if (inside[i] === ',' && depth === 0) {
        parts.push(inside.slice(from, i).trim());
        from = i + 1;
      }
    }
    parts.push(inside.slice(from).trim());
    const [way, ...stops] = parts;
    return {
      text,
      way,
      stops: stops.map((stop) => {
        const at = stop.match(/\s([\d.]+)%$/);
        return { colour: stop.replace(/\s[\d.]+%$/, '').trim(), at: at ? parseFloat(at[1]) : null };
      }),
    };
  });
}

/** Decode a PNG in the page: { width, height, data } (RGBA). */
async function decode(page, png) {
  return page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(globalThis.atob(b64), (c) => c.charCodeAt(0));
    const bitmap = await globalThis.createImageBitmap(new globalThis.Blob([bytes], { type: 'image/png' }));
    const ctx = new globalThis.OffscreenCanvas(bitmap.width, bitmap.height).getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    const { data, width, height } = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    return { width, height, data: Array.from(data) };
  }, png.toString('base64'));
}

/**
 * How well the track of the day stands apart from the page, read on the pixels of a screenshot
 * (WCAG 1.4.11, 3:1). For every column along the track: the page beside it (the row above the
 * track's edge), the track's own fill, and the ring around it (the two rows above and the two
 * below). A column is as visible as the better of its fill and its ring against the page; the
 * track is as visible as its worst stretch. The thumb is skipped (it has its own border).
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} day `.luz-theme-time__day`
 * @param {import('@playwright/test').Locator} slider the range input over it
 * @returns {Promise<{ worst: number, at: number, columns: number }>}
 */
export async function trackVisibility(page, day, slider) {
  const box = await day.boundingBox();
  const margin = 8;
  const clip = { x: box.x, y: box.y - margin, width: box.width, height: box.height + 2 * margin };
  const png = await page.screenshot({ clip, animations: 'disabled' });
  const { width, data } = await decode(page, png);
  const px = (x, y) => ({ r: data[(y * width + x) * 4], g: data[(y * width + x) * 4 + 1], b: data[(y * width + x) * 4 + 2], a: 1 });
  const top = margin;
  const bottom = margin + Math.round(box.height) - 1;
  const middle = Math.round((top + bottom) / 2);
  const thumb = await slider.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const span = r.width - 18;
    return r.left + 9 + (span * (el.value - el.min)) / (el.max - el.min);
  });
  const thumbAt = thumb - box.x;
  let worst = Infinity;
  let at = -1;
  let columns = 0;
  for (let x = 4; x < width - 4; x += 2) {
    if (Math.abs(x - thumbAt) < 16) continue;
    const page_ = px(x, 0);
    const fill = ratio(px(x, middle), page_);
    const ring = Math.max(...[top - 1, top - 2, bottom + 1, bottom + 2].map((y) => ratio(px(x, y), page_)));
    const seen = Math.max(fill, ring);
    columns++;
    if (seen < worst) {
      worst = seen;
      at = x;
    }
  }
  return { worst, at, columns };
}

/** The colour a CSS value paints, as { r, g, b, a }, read from a probe in the page. */
export async function paint(locator, value) {
  const text = await locator.evaluate((el, v) => {
    const probe = document.createElement('span');
    probe.style.color = v;
    probe.style.forcedColorAdjust = 'none';
    el.append(probe);
    const out = getComputedStyle(probe).color;
    probe.remove();
    return out;
  }, value);
  return parseColor(text);
}
