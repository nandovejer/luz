// @ts-check
/**
 * `.luz-ring` of @luz-ds/catalog (`components/ring.css`, a sheet that a page links after luz.css): one value over a goal, or
 * the shares of a total, as half a ring over the figure that says it. The text is the data (a caption, a paragraph with the
 * figure and its label, and, for series, a legend); the ring is a picture of it, drawn by the two pseudo-elements of the
 * paragraph, so it has no node and no text. `--v1` to `--v4` are the series (plain numbers), `--max` the goal: the series fill
 * their share of the larger of `--max` and their sum, from the left, clockwise, with a square end and a thin gap of the track
 * between two series.
 *
 * tests/fixtures/ring.html: tokens, core's luz.css and catalog's sheet, no script. Everything is CSS, so it runs in
 * `chromium` and in `chromium-nojs` (playwright.config.js: `'**\/ring.spec.js'` in the `testMatch` of `chromium-nojs`). Axe
 * needs script and is skipped there.
 *
 * The ring is measured from the pixels the page paints: a screenshot of the paragraph, sampled along the middle of the band
 * (its thickness is read from the screenshot, not typed), and told by colour: a series, the track or something else.
 */
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

import { MODES } from './helpers/design-tokens.js';
import { near, paintOf, readPoints, readRow } from './helpers/pixels.js';
import { backgroundOf, colorOf, ratio, sideways, styleOf } from './helpers/chart-probes.js';
import { settled } from './helpers/settle.js';

const FIXTURE = '/tests/fixtures/ring.html';
/** Sub-pixel rounding of a box. */
const EPS = 1.5;
/** How many samples along the band, from the left end to the right one. */
const STEPS = 360;
/** Every figure of the fixture that has text to lay out. */
const ALL = ['base', 'stacked', 'four', 'over', 'empty', 'zero', 'own', 'narrow', 'long'];

/**
 * @param {import('@playwright/test').Page} page
 * @param {{ width?: number, dir?: string, mode?: string }} [options]
 */
async function open(page, { width = 1280, dir = 'ltr', mode = '' } = {}) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(FIXTURE);
  await page.evaluate(({ d, m }) => {
    document.documentElement.dir = d;
    if (m) document.documentElement.dataset.theme = m;
  }, { d: dir, m: mode });
  // a mode may fade its colours in: end the fade, so the colours are the mode's (`settled` waits on a frame, which a page with no script never gets)
  if (mode) await page.evaluate(() => { for (const a of document.getAnimations()) a.finish(); });
}

const hostOf = (page, id) => page.locator(`#${id}`);
const valueOf = (page, id) => page.locator(`#${id} .luz-ring__value`);

/**
 * The colours a ring is told by: the series (1 to 4) and the track, as the page resolves them in the mode of the figure.
 * @param {import('@playwright/test').Page} page
 * @param {string} id
 * @param {Record<string, string>} [own] a series that has another colour: `{ 1: 'var(--luz-chart-5)' }`
 */
async function palette(page, id, own = {}) {
  /** @type {Record<string, number[]>} */
  const colours = {};
  for (const n of [1, 2, 3, 4]) colours[n] = await paintOf(page, own[n] ?? `var(--luz-chart-${n})`, hostOf(page, id));
  colours.t = await paintOf(page, 'var(--luz-chart-track)', hostOf(page, id));
  return colours;
}

/**
 * Read the half ring of a paragraph: the screenshot of the box, sampled along the middle of the band from the left end to the
 * right, one character for each step: the number of the series, `t` for the track, `x` for anything else (a gap's edge, the
 * page). The ring's box is as wide as the arc and the arc is the top half of a 2:1 box, so its centre is at half the width,
 * whatever the box below it holds.
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} value the paragraph `.luz-ring__value`
 * @param {Record<string, number[]>} colours see palette()
 * @param {number[]} [page_] the colour the page is behind the ring, when it is not the surface of the page (forced colors: Canvas)
 */
async function sweep(page, value, colours, page_) {
  await value.scrollIntoViewIfNeeded();
  const png = await value.screenshot();
  const box = /** @type {{ width: number, height: number }} */ (await value.boundingBox());
  const radius = box.width / 2;
  const surface = page_ ?? (await paintOf(page, 'var(--luz-surface-page)', value));
  // the thickness of the band: down the vertical through the centre from the top, while it is not the page
  const down = await readPoints(page, png, Array.from({ length: Math.floor(radius) }, (_, y) => [Math.floor(radius), y]));
  // (a box that starts between two pixels has a row of the page above the band)
  let top = 0;
  while (top < 3 && near(down[top], surface, 12)) top++;
  let end = top;
  while (end < down.length && !near(down[end], surface, 12)) end++;
  const band = end - top;
  const middle = radius - top - band / 2;
  const points = Array.from({ length: STEPS }, (_, i) => {
    const angle = (Math.PI * (i + 0.5)) / STEPS;
    return [Math.min(Math.floor(box.width) - 1, Math.max(0, Math.floor(radius - middle * Math.cos(angle)))), Math.min(Math.floor(box.height) - 1, Math.max(0, Math.floor(radius - middle * Math.sin(angle))))];
  });
  const pixels = await readPoints(page, png, points);
  const classes = pixels.map((p) => {
    for (const key of ['1', '2', '3', '4', 't']) if (near(p, colours[key], 10)) return key;
    return 'x';
  });
  return { box, radius, band, pixels, seq: classes.join(''), png };
}

/** The share of the steps of a sweep that are of a class. */
const shareOf = (seq, key) => [...seq].filter((c) => c === key).length / seq.length;
/** The pixel `dx` px in from the left (or the right, when negative) of the box and `dy` px above its baseline, read from a sweep's screenshot. */
const cornerOf = async (page, ring, dx, dy) => {
  const x = dx >= 0 ? dx : Math.floor(ring.box.width) + dx;
  const [pixel] = await readPoints(page, ring.png, [[x, Math.floor(ring.radius) - dy]]);
  return pixel;
};

test.describe('ring: the text is the data, and the picture has none', () => {
  test('a figure with a caption, a paragraph with the figure and its label, and, for series, a legend of items with a name and a figure', async ({ page }) => {
    await open(page);
    const figures = await page.locator('figure.luz-ring').evaluateAll((all) => all.map((fig) => ({
      id: fig.id,
      kids: [...fig.children].map((c) => `${c.tagName.toLowerCase()}${c.className ? `.${c.className}` : ''}`),
      value: [...(fig.querySelector(':scope > p.luz-ring__value')?.children ?? [])].map((c) => `${c.tagName.toLowerCase()}.${c.className}`),
      items: [...fig.querySelectorAll(':scope > ul.luz-ring__legend > li.luz-ring__item')].map((li) => [...li.children].map((c) => c.className)),
    })));
    expect(figures.map((f) => f.id)).toEqual(ALL);
    for (const f of figures) {
      expect(f.kids.slice(0, 2), `#${f.id}`).toEqual(['figcaption', 'p.luz-ring__value']);
      expect(f.value, `#${f.id}`).toEqual(['span.luz-ring__figure', 'span.luz-ring__label']);
      for (const kids of f.items) expect(kids, `#${f.id}`).toEqual(['luz-ring__name', 'luz-ring__figure']);
    }
  });

  test('a reader gets the caption, then the figure and its label as one line, then the name and the figure of every item of the legend, and nothing for the picture', async ({ page }) => {
    await open(page);
    await expect(hostOf(page, 'base')).toHaveAccessibleName('Visitors this month');
    expect(await hostOf(page, 'base').ariaSnapshot()).toMatch(/1,260 of 2,000 visitors/);
    await expect(hostOf(page, 'stacked')).toHaveAccessibleName('Visitors by device, this month');
    const snapshot = await hostOf(page, 'stacked').ariaSnapshot();
    let at = -1;
    for (const word of ['1,830 visitors', 'Desktop', '1,260', 'Mobile', '570']) {
      const next = snapshot.indexOf(word, at + 1);
      expect(next, `${word} is in the tree after the one before`).toBeGreaterThan(at);
      at = next;
    }
    await expect(hostOf(page, 'stacked').getByRole('list')).toHaveCount(1);
    await expect(hostOf(page, 'stacked').getByRole('listitem')).toHaveCount(2);
    for (const role of ['img', 'meter', 'progressbar', 'graphics-document']) {
      expect(await hostOf(page, 'stacked').getByRole(/** @type {any} */ (role)).count(), `no ${role} in the tree`).toBe(0);
    }
  });

  test('every word and figure is real text in the DOM, and the pseudo-elements that draw the ring and the swatches have no text', async ({ page }) => {
    await open(page);
    const words = await hostOf(page, 'stacked').evaluate((fig) => ({
      caption: fig.querySelector('figcaption')?.textContent?.trim(),
      value: fig.querySelector('.luz-ring__value')?.textContent?.replace(/\s+/g, ' ').trim(),
      items: [...fig.querySelectorAll('li')].map((li) => li.textContent?.replace(/\s+/g, ' ').trim()),
    }));
    expect(words).toEqual({ caption: 'Visitors by device, this month', value: '1,830 visitors', items: ['Desktop 1,260', 'Mobile 570'] });
    // the ring is drawn: both pseudo-elements exist, and what they hold is no text
    for (const pseudo of ['::before', '::after']) {
      expect((await styleOf(valueOf(page, 'stacked'), ['content'], pseudo)).content, `the ${pseudo} of the paragraph draws the ring`).toBe('""');
    }
    for (const id of ['stacked', 'four']) {
      const marks = await page.locator(`#${id} .luz-ring__item`).evaluateAll((all) => all.map((li) => [getComputedStyle(li, '::before').content, getComputedStyle(li, '::after').content]));
      expect(marks.every(([before, after]) => before === '""' && /^(?:none|normal)$/.test(after)), `#${id}: a swatch is a box with no text, and nothing after an item`).toBe(true);
    }
  });

  test('nothing takes focus: no element of a ring is in the tab order, and Tab leaves the page where it was', async ({ page }) => {
    await open(page);
    const focusable = await page.locator('figure.luz-ring').evaluateAll((all) => all.flatMap((fig) => [fig, ...fig.querySelectorAll('*')]).filter((el) => /** @type {HTMLElement} */ (el).tabIndex >= 0).length);
    expect(focusable).toBe(0);
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement === document.body || document.activeElement === document.documentElement)).toBe(true);
  });
});

test.describe('ring: half a ring, and what the values fill of it', () => {
  test('the ring is the top half of a box twice as wide as tall, and the band is a band: it has a thickness', async ({ page }) => {
    await open(page);
    const box = /** @type {{ width: number, height: number }} */ (await valueOf(page, 'base').boundingBox());
    expect(box.width / box.height, 'twice as wide as tall').toBeCloseTo(2, 1);
    expect(box.width, 'it is a ring of a size, not the width of the page').toBeLessThan(500);
    const arc = await sweep(page, valueOf(page, 'base'), await palette(page, 'base'));
    expect(arc.band, 'the band is more than a hairline').toBeGreaterThan(6);
    expect(arc.band, 'and less than half the radius, so there is a hole').toBeLessThan(arc.radius / 2);
  });

  test('1,260 over a goal of 2,000 stops at 63 % of the half ring, from the left, and the rest is the track', async ({ page }) => {
    await open(page);
    const arc = await sweep(page, valueOf(page, 'base'), await palette(page, 'base'));
    expect(shareOf(arc.seq, '1'), `series 1 fills 63 %: ${arc.seq}`).toBeCloseTo(0.63, 1);
    expect(Math.abs(shareOf(arc.seq, '1') - 0.63)).toBeLessThanOrEqual(0.02);
    expect(Math.abs(shareOf(arc.seq, 't') - 0.37)).toBeLessThanOrEqual(0.02);
    expect(arc.seq.startsWith('1'), 'it starts at the left end').toBe(true);
    expect(arc.seq.endsWith('t'), 'and the right end is the track').toBe(true);
    // one run of series and one of track, in that order: no series after the track
    expect(arc.seq.replace(/x/g, '')).toMatch(/^1+t+$/);
  });

  test('with no goal the series fill the half ring, each its share of the sum, with the track in the gap between them', async ({ page }) => {
    await open(page);
    const arc = await sweep(page, valueOf(page, 'stacked'), await palette(page, 'stacked'));
    // 1,260 and 570 of 1,830: 68.9 % and 31.1 %, less a thin gap
    expect(Math.abs(shareOf(arc.seq, '1') - 1260 / 1830), arc.seq).toBeLessThanOrEqual(0.02);
    expect(Math.abs(shareOf(arc.seq, '2') - 570 / 1830), arc.seq).toBeLessThanOrEqual(0.03);
    expect(shareOf(arc.seq, '1') + shareOf(arc.seq, '2') + shareOf(arc.seq, 't') + shareOf(arc.seq, 'x'), 'only the series, the track and the edges').toBeCloseTo(1, 5);
    expect(shareOf(arc.seq, 't'), 'the track is only the gap').toBeLessThan(0.04);
    expect(arc.seq.replace(/x/g, ''), 'series 1, a gap of the track, series 2, to the right end').toMatch(/^1+t+2+$/);
    expect(arc.seq.endsWith('2'), 'the right end is series 2').toBe(true);
  });

  test('four series are 40, 30, 20 and 10 % of the half ring, in the order of the markup, a gap of the track between each', async ({ page }) => {
    await open(page);
    const arc = await sweep(page, valueOf(page, 'four'), await palette(page, 'four'));
    for (const [key, share] of [['1', 0.4], ['2', 0.3], ['3', 0.2], ['4', 0.1]]) {
      expect(Math.abs(shareOf(arc.seq, key) - Number(share)), `series ${key}: ${arc.seq}`).toBeLessThanOrEqual(0.03);
    }
    expect(arc.seq.replace(/x/g, '')).toMatch(/^1+t+2+t+3+t+4+$/);
  });

  test('when the series add up to more than the goal the half ring is full, and each series is its share of the sum', async ({ page }) => {
    await open(page);
    const arc = await sweep(page, valueOf(page, 'over'), await palette(page, 'over'));
    expect(Math.abs(shareOf(arc.seq, '1') - 1500 / 2400), arc.seq).toBeLessThanOrEqual(0.02);
    expect(arc.seq.replace(/x/g, ''), 'the track shows only in the gap').toMatch(/^1+t+2+$/);
    expect(arc.seq.endsWith('2')).toBe(true);
  });

  for (const id of ['empty', 'zero']) {
    test(`an empty value (#${id}) draws no series, and the track is still drawn all along the half ring`, async ({ page }) => {
      await open(page);
      const arc = await sweep(page, valueOf(page, id), await palette(page, id));
      expect(arc.band, 'the track is a band').toBeGreaterThan(6);
      for (const key of ['1', '2', '3', '4']) expect(shareOf(arc.seq, key), `no series ${key}: ${arc.seq}`).toBe(0);
      expect(shareOf(arc.seq, 't'), 'the track, from end to end').toBeGreaterThanOrEqual(0.97);
    });
  }

  test('the ends are cut square, the track\'s and a series\': the corner of the band at the baseline is painted', async ({ page }) => {
    await open(page);
    const colours = await palette(page, 'base');
    const base = await sweep(page, valueOf(page, 'base'), colours);
    // two px in from the outer edge and two px above the baseline: a rounded end of this band would have left it empty
    expect(near(await cornerOf(page, base, 2, 2), colours[1], 10), 'the left end of a series is square').toBe(true);
    expect(near(await cornerOf(page, base, -3, 2), colours.t, 10), 'the right end of the track is square').toBe(true);
    const stacked = await sweep(page, valueOf(page, 'stacked'), await palette(page, 'stacked'));
    expect(near(await cornerOf(page, stacked, -3, 2), (await palette(page, 'stacked'))[2], 10), 'the right end of the last series is square').toBe(true);
  });

  test('it runs from the left, clockwise, in a right-to-left page as well', async ({ page }) => {
    await open(page, { dir: 'rtl' });
    const arc = await sweep(page, valueOf(page, 'base'), await palette(page, 'base'));
    expect(arc.seq.replace(/x/g, '')).toMatch(/^1+t+$/);
    expect(Math.abs(shareOf(arc.seq, '1') - 0.63)).toBeLessThanOrEqual(0.02);
    expect(await sideways(page)).toBeLessThanOrEqual(0);
  });
});

test.describe('ring: the colours', () => {
  for (const mode of MODES) {
    test(`the series take --luz-chart-1 to -4 in the order of the markup, on --luz-chart-track, and the swatches of the legend the same, in ${mode}`, async ({ page }) => {
      await open(page, { mode });
      const colours = await palette(page, 'four');
      const arc = await sweep(page, valueOf(page, 'four'), colours);
      // the middle of each series (the first 40 %, the next 30 %, and so on) has its colour, and the gap between them the track
      for (const [key, from, to] of [['1', 0.05, 0.35], ['2', 0.45, 0.65], ['3', 0.75, 0.85], ['4', 0.92, 0.98]]) {
        const run = arc.seq.slice(Math.floor(Number(from) * STEPS), Math.floor(Number(to) * STEPS));
        expect([...run].every((c) => c === key), `series ${key} between ${from} and ${to}: ${arc.seq}`).toBe(true);
      }
      expect(arc.seq, 'the track shows between two series').toMatch(/1+t+2+t+3+t+4+/);
      for (const n of [1, 2, 3, 4]) {
        const swatch = await colorOf(page.locator(`#four li.luz-ring__item:nth-child(${n})`), 'background-color', '::before');
        expect(near(swatch, colours[n], 1), `the swatch of item ${n} is --luz-chart-${n}`).toBe(true);
      }
    });
  }

  test('--luz-ring-color recolours the first series and the first swatch, and the others keep --luz-chart-2 to -4', async ({ page }) => {
    await open(page);
    const own = await palette(page, 'own', { 1: 'var(--luz-chart-5)' });
    const normal = await palette(page, 'own');
    expect(near(own[1], normal[1], 6), '--luz-chart-5 is not --luz-chart-1, or this tests nothing').toBe(false);
    const arc = await sweep(page, valueOf(page, 'own'), own);
    expect(Math.abs(shareOf(arc.seq, '1') - 0.5), arc.seq).toBeLessThanOrEqual(0.02);
    expect(Math.abs(shareOf(arc.seq, '2') - 0.5), arc.seq).toBeLessThanOrEqual(0.02);
    expect(near(await colorOf(page.locator('#own li').nth(0), 'background-color', '::before'), own[1], 1), 'the first swatch').toBe(true);
    expect(near(await colorOf(page.locator('#own li').nth(1), 'background-color', '::before'), own[2], 1), 'the second swatch keeps --luz-chart-2').toBe(true);
    // and a figure that sets nothing is --luz-chart-1
    const plain = await sweep(page, valueOf(page, 'stacked'), await palette(page, 'stacked'));
    expect(shareOf(plain.seq, '1')).toBeGreaterThan(0.6);
  });

  for (const mode of MODES) {
    test(`the figure, the label and the names are 4.5:1 or more on the surface in ${mode}`, async ({ page }) => {
      await open(page, { mode });
      const surface = await paintOf(page, 'var(--luz-surface-page)', hostOf(page, 'four'));
      for (const selector of ['#four figcaption', '#four .luz-ring__value .luz-ring__figure', '#four .luz-ring__label', '#four .luz-ring__name', '#four li .luz-ring__figure']) {
        const all = page.locator(selector);
        expect(await all.count(), selector).toBeGreaterThan(0);
        for (let i = 0; i < (await all.count()); i++) expect(ratio(await colorOf(all.nth(i)), surface), `${selector} ${i}`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});

test.describe('ring: reflow', () => {
  /**
   * The line boxes of the text of a paragraph, from its box, with the text made invisible so the pixels under them are only
   * what is painted behind it: the page where the hole is, the band where the text touches it.
   * @returns {Promise<{ hits: number, rects: number }>} how many sampled points of the text boxes are not the page's surface
   */
  async function bandUnderText(page, id) {
    const value = valueOf(page, id);
    await value.scrollIntoViewIfNeeded();
    const rects = await value.evaluate((el) => {
      const origin = el.getBoundingClientRect();
      return [...el.children].flatMap((child) => {
        const range = document.createRange();
        range.selectNodeContents(child);
        return [...range.getClientRects()].map((r) => ({ left: r.left - origin.left, right: r.right - origin.left, top: r.top - origin.top, bottom: r.bottom - origin.top }));
      });
    });
    expect(rects.length, `#${id} has text to measure`).toBeGreaterThan(1);
    const surface = await paintOf(page, 'var(--luz-surface-page)', hostOf(page, id));
    const png = await value.screenshot();
    const box = /** @type {{ width: number, height: number }} */ (await value.boundingBox());
    const points = [];
    for (const r of rects) {
      for (let x = Math.max(0, Math.ceil(r.left) + 1); x < Math.min(Math.floor(box.width), Math.floor(r.right)); x += 2) {
        for (let y = Math.max(0, Math.ceil(r.top) + 1); y < Math.min(Math.floor(box.height), Math.floor(r.bottom)); y += 2) points.push([x, y]);
      }
    }
    expect(points.length, `#${id}: points under the text`).toBeGreaterThan(10);
    const pixels = await readPoints(page, png, points);
    return { hits: pixels.filter((p) => !near(p, surface, 12)).length, rects: rects.length };
  }

  for (const [width, size] of /** @type {[number, string][]} */ ([[320, '130%'], [320, '150%'], [320, '200%'], [1280, '200%']])) {
    test(`at ${width}px with text at ${size} nothing scrolls sideways, and the figure and its label are in the hole or under the arc, never on the band`, async ({ page }) => {
      await open(page, { width });
      await page.evaluate(() => {
        const style = document.createElement('style');
        style.textContent = '.luz-ring__value, .luz-ring__value * { color: transparent !important; text-shadow: none !important; }';
        document.head.append(style);
      });
      await page.evaluate((s) => { document.documentElement.style.fontSize = s; }, size);
      expect(await sideways(page), 'no horizontal scroll').toBeLessThanOrEqual(0);
      for (const id of ['base', 'stacked', 'four', 'narrow', 'long']) {
        const b = /** @type {{ x: number, width: number }} */ (await hostOf(page, id).boundingBox());
        expect(b.x, `#${id}`).toBeGreaterThanOrEqual(-EPS);
        expect(b.x + b.width, `#${id}`).toBeLessThanOrEqual(width + EPS);
        const { hits } = await bandUnderText(page, id);
        expect(hits, `#${id}: points of the text that sit on the band or the track`).toBe(0);
      }
    });
  }

  test('a long legend wraps instead of running out of the figure, and no item is cut', async ({ page }) => {
    await open(page, { width: 320 });
    const tops = await page.locator('#long .luz-ring__item').evaluateAll((all) => all.map((li) => Math.round(li.getBoundingClientRect().top)));
    expect(new Set(tops).size, 'the items are on more than one line').toBeGreaterThan(1);
    const whole = await page.locator('#long .luz-ring__item').evaluateAll((all) => all.map((li) => li.scrollWidth <= li.clientWidth + 1));
    expect(whole, 'no item is cut').toEqual([true, true, true]);
  });

  test('the caption is above the ring and the legend below it, as the markup reads', async ({ page }) => {
    await open(page);
    const g = await hostOf(page, 'stacked').evaluate((fig) => {
      const rect = (selector) => { const r = fig.querySelector(selector).getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; };
      return { caption: rect('figcaption'), value: rect('.luz-ring__value'), legend: rect('.luz-ring__legend') };
    });
    expect(g.value.top).toBeGreaterThanOrEqual(g.caption.bottom - EPS);
    expect(g.legend.top).toBeGreaterThanOrEqual(g.value.bottom - EPS);
  });
});

test.describe('ring: forced colors', () => {
  test('the track is Canvas, so the gaps between the series are too, and the series and the swatches keep their own colours', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await open(page);
    const canvas = await paintOf(page, 'Canvas', hostOf(page, 'four'));
    const track = await styleOf(valueOf(page, 'four'), ['background-color'], '::before');
    expect(near((track['background-color'].match(/[\d.]+/g) ?? []).slice(0, 3).map(Number), canvas, 1), `the track computes to Canvas, not ${track['background-color']}`).toBe(true);
    expect((await styleOf(valueOf(page, 'four'), ['forced-color-adjust'], '::after'))['forced-color-adjust'], 'the series are not adjusted').toBe('none');
    expect((await styleOf(page.locator('#four li').first(), ['forced-color-adjust'], '::before'))['forced-color-adjust'], 'nor the swatches').toBe('none');
  });

  test('the four series are four system colours, none of them the background, and each swatch is the colour of its series and shows its number', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await open(page);
    const canvas = await paintOf(page, 'Canvas', hostOf(page, 'four'));
    const system = [];
    for (const name of ['Highlight', 'CanvasText', 'LinkText', 'ActiveText', 'VisitedText', 'ButtonText', 'GrayText', 'Mark', 'MarkText', 'Field', 'FieldText', 'ButtonFace', 'ButtonBorder']) {
      system.push({ name, rgb: (await backgroundOf(page, name, hostOf(page, 'four'))).slice(0, 3) });
    }
    // the middle of each series, from the pixels of the arc
    const value = valueOf(page, 'four');
    const arc = await sweep(page, value, { 1: [-99, -99, -99], 2: [-99, -99, -99], 3: [-99, -99, -99], 4: [-99, -99, -99], t: canvas }, canvas);
    const found = [];
    for (const [n, at] of [[1, 0.2], [2, 0.55], [3, 0.8], [4, 0.95]]) {
      const pixel = arc.pixels[Math.floor(Number(at) * STEPS)];
      expect(near(pixel, canvas, 10), `series ${n} is not painted as the background`).toBe(false);
      const match = system.find((c) => near(pixel, c.rgb, 10));
      expect(match, `series ${n} is a system colour: ${pixel}`).toBeTruthy();
      found.push(pixel);
    }
    // two system colours may be the same one (LinkText and ActiveText often are): the number of the swatch tells them apart

    // the swatches: the series colour with the number of the series in Canvas on it, a different one for each
    const masks = [];
    for (let n = 0; n < 4; n++) {
      const item = page.locator('#four li.luz-ring__item').nth(n);
      await item.scrollIntoViewIfNeeded();
      const png = await item.screenshot();
      const box = /** @type {{ width: number, height: number }} */ (await item.boundingBox());
      const width = Math.ceil(parseFloat((await styleOf(item, ['width'], '::before')).width));
      expect(width, `the swatch of item ${n + 1} is a box`).toBeGreaterThan(4);
      /** @type {number[][][]} */
      const rows = [];
      for (let y = 0; y < Math.floor(box.height); y++) rows.push((await readRow(page, png, y)).slice(0, width));
      const painted = rows.map((row) => row.some((p) => !near(p, canvas, 10)));
      const top = painted.indexOf(true);
      const bottom = painted.lastIndexOf(true);
      expect(top, `the swatch of item ${n + 1} is painted`).toBeGreaterThanOrEqual(0);
      const region = rows.slice(top, bottom + 1);
      // the colour most of the swatch has is not the background and is the colour of its series on the arc
      const tally = new Map();
      for (const p of region.flat().filter((q) => !near(q, canvas, 10))) tally.set(p.slice(0, 3).join(','), (tally.get(p.slice(0, 3).join(',')) ?? 0) + 1);
      const main = [...tally.entries()].sort((x, y) => y[1] - x[1])[0][0].split(',').map(Number);
      expect(near(main, found[n], 10), `the swatch of item ${n + 1} is the colour of series ${n + 1}: ${main} against ${found[n]}`).toBe(true);
      // the ink is whatever differs a lot from the colour of the swatch (a digit of 12px is thin: its strokes are mostly half-covered pixels)
      const ink = region.map((row) => row.slice(1).map((p) => (near(p, main, 60) ? '0' : '1')).join(''));
      expect(ink.join('').includes('1'), `the swatch of item ${n + 1} shows a number`).toBe(true);
      masks.push(ink.join('/'));
    }
    expect(new Set(masks).size, 'each swatch shows its own number: 1, 2, 3, 4').toBe(4);
  });

  test('the information is not in the colour: the figure, the label and the legend are text', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await open(page);
    expect(await page.locator('#four .luz-ring__item .luz-ring__name').allInnerTexts()).toEqual(['Chrome', 'Safari', 'Firefox', 'Other']);
    expect(await page.locator('#four .luz-ring__item .luz-ring__figure').allInnerTexts()).toEqual(['40 %', '30 %', '20 %', '10 %']);
    expect(await valueOf(page, 'base').innerText()).toContain('1,260');
  });
});

test.describe('ring: print', () => {
  test('on paper the ring is left out and the text prints: both pseudo-elements have no content, and the paragraph keeps no aspect ratio', async ({ page }) => {
    await open(page);
    // on screen it is drawn, so the print rule is what changes it
    expect((await styleOf(valueOf(page, 'stacked'), ['content'], '::before')).content).toBe('""');
    expect((await styleOf(valueOf(page, 'stacked'), ['aspect-ratio']))['aspect-ratio']).toMatch(/^2(?: \/ 1)?$/);
    await page.emulateMedia({ media: 'print' });
    for (const pseudo of ['::before', '::after']) {
      expect((await styleOf(valueOf(page, 'stacked'), ['content'], pseudo)).content, `${pseudo} on paper`).toBe('none');
    }
    expect((await styleOf(valueOf(page, 'stacked'), ['aspect-ratio']))['aspect-ratio'], 'no box to hold the ring').toBe('auto');
    for (const selector of ['#stacked figcaption', '#stacked .luz-ring__figure', '#stacked .luz-ring__label', '#stacked .luz-ring__item']) {
      const all = page.locator(selector);
      for (let i = 0; i < (await all.count()); i++) await expect(all.nth(i), selector).toBeVisible();
    }
  });
});

test.describe('ring: axe', () => {
  for (const mode of MODES) {
    test(`axe finds nothing serious in ${mode}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name === 'chromium-nojs', 'axe needs JavaScript');
      await open(page, { mode });
      await settled(page);
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? '')).map((v) => v.id)).toEqual([]);
    });
  }
});

test.describe('ring: no script', () => {
  test('it needs none: the fixture has no script, links the sheet of catalog right after luz.css and no other sheet of core, and the ring is drawn', async ({ page }) => {
    const source = readFileSync(new URL('./fixtures/ring.html', import.meta.url), 'utf-8');
    expect(source).not.toMatch(/<script/i);
    const links = [...source.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
    expect(links.indexOf('/packages/catalog/dist/components/ring.css')).toBe(links.indexOf('/packages/core/dist/luz.css') + 1);
    expect(links.filter((href) => href.startsWith('/packages/core/')), 'core has no sheet of it').toEqual(['/packages/core/dist/luz.css']);
    await open(page);
    const arc = await sweep(page, valueOf(page, 'base'), await palette(page, 'base'));
    expect(Math.abs(shareOf(arc.seq, '1') - 0.63)).toBeLessThanOrEqual(0.02);
  });
});

test.describe('ring: its page in the docs', () => {
  test('the first example is the ring of one value over a goal: drawn, 63 % of the half, and read as its caption, figure and label', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/docs/catalog/ring/');
    const figure = page.locator('#p-ring figure.luz-ring').first();
    await expect(figure).toHaveAccessibleName('Visitors this month');
    expect(await figure.ariaSnapshot()).toMatch(/1,260 of 2,000 visitors/);
    const value = figure.locator('.luz-ring__value');
    const colours = {
      1: await paintOf(page, 'var(--luz-chart-1)', figure),
      2: await paintOf(page, 'var(--luz-chart-2)', figure),
      3: await paintOf(page, 'var(--luz-chart-3)', figure),
      4: await paintOf(page, 'var(--luz-chart-4)', figure),
      t: await paintOf(page, 'var(--luz-chart-track)', figure),
    };
    const arc = await sweep(page, value, colours);
    expect(Math.abs(shareOf(arc.seq, '1') - 0.63), arc.seq).toBeLessThanOrEqual(0.02);
  });
});
