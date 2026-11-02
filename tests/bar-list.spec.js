// @ts-check
/**
 * `.luz-bar-list` of @luz-ds/core (`components/bar-list.css`, a loose sheet that a page links after luz.css; component-gaps
 * plan, section 4.2): a figure that holds a list of rows, each a name, its figure and a bar under them. The name and the
 * figure are text; the bar is a native <meter>, a picture of the figure, hidden from assistive technology.
 *
 *   base                  a continuous bar: the fill is --luz-chart-1 on the track --luz-chart-track
 *   --luz-bar-list-row-h  one height for every row, to line up lists side by side
 *   --cells               a mask cuts the bar into small cells
 *   __row--zero           the figure in the brand colour
 *
 * tests/fixtures/bar-list.html: tokens, core's luz.css and the loose sheet, no script. Everything is CSS, so it runs in
 * `chromium` and in `chromium-nojs` (playwright.config.js: `'**\/bar-list.spec.js'` in the `testMatch` of
 * `chromium-nojs`). Axe needs script and is skipped there.
 */
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

import { MODES } from './helpers/design-tokens.js';
import { near, paintOf, readRow } from './helpers/pixels.js';
import { settled } from './helpers/settle.js';

const FIXTURE = '/tests/fixtures/bar-list.html';
const REM = 16;
/** Sub-pixel rounding of a box. */
const EPS = 1.5;

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
}

/** The box of the first element a selector finds. */
const box = async (page, selector) => {
  const r = await page.locator(selector).first().evaluate((el) => {
    const b = el.getBoundingClientRect();
    return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, width: b.width, height: b.height };
  });
  return r;
};

const style = (page, selector, properties) => page.locator(selector).first().evaluate((el, props) => {
  const cs = getComputedStyle(el);
  return Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p)]));
}, properties);

/**
 * The pixel a CSS colour paints as the background of a box, read from a screenshot: the engine paints the system
 * `Highlight` of a background a little differently from the `color` of a text (it is translucent), and a bar is a background.
 */
async function backgroundOf(page, value, host) {
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

const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** The pixels of the middle row of a meter, without the two at each end (anti-aliasing of the corners). */
async function rowOf(page, meter) {
  await meter.scrollIntoViewIfNeeded();
  const png = await meter.screenshot();
  const middle = Math.floor((await meter.boundingBox()).height / 2);
  return (await readRow(page, png, middle)).slice(2, -2);
}

/** The element the colours are read inside: a probe in the figure sees the tokens of the mode the page is in. */
const hostOf = (page, id) => page.locator(`#${id}`);

test.describe('bar list: the structure is text, and the bar is a picture', () => {
  test('a figure holds a ul of li rows, each a name, a figure and a meter, in that order', async ({ page }) => {
    await open(page);
    const lists = await page.locator('figure.luz-bar-list').evaluateAll((figures) => figures.map((fig) => ({
      id: fig.id,
      rows: [...fig.querySelectorAll(':scope > ul.luz-bar-list__rows > li.luz-bar-list__row')].map((li) => [...li.children].map((c) => `${c.tagName.toLowerCase()}.${c.className}`)),
      all: fig.querySelectorAll('li').length,
    })));
    expect(lists.length, 'the fixture has eight lists').toBe(8);
    for (const list of lists) {
      expect(list.rows.length, `#${list.id}: every li is a row of the list`).toBe(list.all);
      expect(list.rows.length).toBeGreaterThan(0);
      for (const kids of list.rows) {
        expect(kids, `#${list.id}`).toEqual(['span.luz-bar-list__name', 'span.luz-bar-list__figure', 'meter.luz-bar-list__meter']);
      }
    }
  });

  test('the name and the figure of every row are real text, and the meter is hidden from assistive technology', async ({ page }) => {
    await open(page);
    const rows = await page.locator('li.luz-bar-list__row').evaluateAll((all) => all.map((li) => ({
      name: li.querySelector('.luz-bar-list__name')?.textContent?.trim() ?? '',
      figure: li.querySelector('.luz-bar-list__figure')?.textContent?.trim() ?? '',
      hidden: li.querySelector('meter')?.getAttribute('aria-hidden'),
      // text that is drawn: a pseudo-element's content would not be in textContent
      before: getComputedStyle(li.querySelector('.luz-bar-list__figure'), '::before').content,
      after: getComputedStyle(li.querySelector('.luz-bar-list__figure'), '::after').content,
    })));
    expect(rows.length).toBeGreaterThan(10);
    for (const row of rows) {
      expect(row.name.length, 'a name is text').toBeGreaterThan(0);
      expect(row.figure, `the figure of ${row.name} is a number in text`).toMatch(/\d/);
      expect(row.hidden, `the meter of ${row.name} is decorative`).toBe('true');
      expect([row.before, row.after], `${row.name}: no figure is drawn by CSS`).toEqual(['none', 'none']);
    }
  });

  test('a reader gets the names and the figures in the order of the rows, and no meter', async ({ page }) => {
    await open(page);
    const snapshot = await page.locator('#base').ariaSnapshot();
    expect(snapshot, 'the accessibility tree has no meter').not.toMatch(/meter/);
    const at = (word) => snapshot.indexOf(word);
    for (const [a, b] of [['tokens', '100 KB'], ['100 KB', 'core'], ['core', '200 KB'], ['200 KB', 'catalog'], ['catalog', '50 KB']]) {
      expect(at(a), `${a} is in the tree`).toBeGreaterThan(-1);
      expect(at(b), `${b} is in the tree`).toBeGreaterThan(-1);
      expect(at(a), `${a} before ${b}`).toBeLessThan(at(b));
    }
    expect(await page.locator('#base').getByRole('meter').count()).toBe(0);
    await expect(page.locator('#base ul')).toHaveAccessibleName('Packages by size');
    await expect(page.locator('#base').getByRole('listitem')).toHaveCount(3);
  });

  test('a row puts the name and the figure on one line, and the bar under them, as wide as the row', async ({ page }) => {
    await open(page);
    const name = await box(page, '#base li:first-child .luz-bar-list__name');
    const figure = await box(page, '#base li:first-child .luz-bar-list__figure');
    const meter = await box(page, '#base li:first-child meter');
    const rows = await box(page, '#base ul');
    expect(Math.abs(name.top - figure.top), 'name and figure share a line').toBeLessThan(name.height);
    expect(meter.top, 'the bar is under them').toBeGreaterThanOrEqual(Math.max(name.bottom, figure.bottom) - EPS);
    expect(meter.left).toBeCloseTo(rows.left, 0);
    expect(meter.right).toBeCloseTo(rows.right, 0);
  });

  test('there are no bullets and no indent: the list is laid out by the stylesheet', async ({ page }) => {
    await open(page);
    const look = await style(page, '#base ul', ['list-style-type', 'padding-inline-start', 'margin-block-start']);
    expect(look['list-style-type']).toBe('none');
    expect(look['padding-inline-start']).toBe('0px');
    expect(look['margin-block-start']).toBe('0px');
    const fig = await style(page, '#base', ['margin-block-start', 'margin-inline-start', 'background-image']);
    expect(fig['margin-block-start'], 'the figure is a layout box, not an indented one').toBe('0px');
    expect(fig['margin-inline-start']).toBe('0px');
  });
});

test.describe('bar list: the rows', () => {
  test('--luz-bar-list-row-h gives every row that height, in two lists with a different number of rows', async ({ page }) => {
    await open(page);
    for (const id of ['side-a', 'side-b']) {
      const heights = await page.locator(`#${id} li`).evaluateAll((all) => all.map((li) => li.getBoundingClientRect().height));
      expect(heights.length).toBeGreaterThan(1);
      for (const h of heights) expect(h, `#${id}: a row is 3rem tall`).toBeCloseTo(3 * REM, 0);
    }
    const a = await box(page, '#side-a li:nth-child(2)');
    const b = await box(page, '#side-b li:nth-child(2)');
    expect(a.top, 'the second rows line up').toBeCloseTo(b.top, 0);
  });

  test('without it the rows of a list are one height whatever their content, and a long name stays on one line', async ({ page }) => {
    await open(page);
    const heights = await page.locator('#wide li').evaluateAll((all) => all.map((li) => li.getBoundingClientRect().height));
    expect(heights.length).toBe(2);
    expect(heights[0]).toBeCloseTo(heights[1], 0);
    const name = await style(page, '#wide .luz-bar-list__name', ['white-space', 'text-overflow', 'overflow-x']);
    expect(name['white-space']).toBe('nowrap');
    expect(name['text-overflow']).toBe('ellipsis');
    expect(name['overflow-x']).toBe('hidden');
  });

  test('a row at 0 shows its figure in the brand colour, and the others do not', async ({ page }) => {
    await open(page);
    const brand = await paintOf(page, 'var(--luz-brand-primary)', hostOf(page, 'zero'));
    const colorOf = (selector) => page.locator(selector).first().evaluate((el) => getComputedStyle(el).color.match(/[\d.]+/g).slice(0, 3).map(Number));
    expect(near(await colorOf('#zero .luz-bar-list__row--zero .luz-bar-list__figure'), brand, 1)).toBe(true);
    expect(near(await colorOf('#zero li:first-child .luz-bar-list__figure'), brand, 1), 'a row with a count is not in the brand colour').toBe(false);
  });

  test('the name is the secondary text colour and the figure keeps the numbers the same width', async ({ page }) => {
    await open(page);
    const secondary = await paintOf(page, 'var(--luz-text-secondary)', hostOf(page, 'base'));
    const name = await page.locator('#base .luz-bar-list__name').first().evaluate((el) => getComputedStyle(el).color.match(/[\d.]+/g).slice(0, 3).map(Number));
    expect(near(name, secondary, 1)).toBe(true);
    const figure = await style(page, '#base .luz-bar-list__figure', ['font-variant-numeric']);
    expect(figure['font-variant-numeric']).toContain('tabular-nums');
  });
});

test.describe('bar list: the bar', () => {
  test('the fill is --luz-chart-1 and the track --luz-chart-track, and the fill is value / max of the bar', async ({ page }) => {
    await open(page);
    const [fill, track] = await Promise.all([paintOf(page, 'var(--luz-chart-1)', hostOf(page, 'base')), paintOf(page, 'var(--luz-chart-track)', hostOf(page, 'base'))]);
    for (const [row, share] of [[1, 0.5], [2, 1], [3, 0.25]]) {
      const pixels = await rowOf(page, page.locator(`#base li:nth-child(${row}) meter`));
      const filled = pixels.filter((p) => near(p, fill)).length;
      const empty = pixels.filter((p) => near(p, track)).length;
      expect(filled + empty, `row ${row}: the bar is only fill and track`).toBeGreaterThanOrEqual(pixels.length - 2);
      expect(Math.abs(filled - share * pixels.length), `row ${row}: ${filled} of ${pixels.length} px for ${share}`).toBeLessThanOrEqual(3);
    }
  });

  test('the fill starts at the left end of the bar', async ({ page }) => {
    await open(page);
    const [fill, track] = await Promise.all([paintOf(page, 'var(--luz-chart-1)', hostOf(page, 'base')), paintOf(page, 'var(--luz-chart-track)', hostOf(page, 'base'))]);
    const pixels = await rowOf(page, page.locator('#base li:first-child meter'));
    expect(near(pixels[0], fill), 'the first pixel is the fill').toBe(true);
    expect(near(pixels.at(-1), track), 'the last pixel is the track').toBe(true);
  });

  test('low, high and optimum change nothing: every state of the engine is the chart colour', async ({ page }) => {
    await open(page);
    const fill = await paintOf(page, 'var(--luz-chart-1)', hostOf(page, 'states'));
    for (let row = 1; row <= 3; row++) {
      const pixels = await rowOf(page, page.locator(`#states li:nth-child(${row}) meter`));
      expect(near(pixels[0], fill), `row ${row}: the start of the fill`).toBe(true);
    }
  });

  test('the meter is a native meter with no engine look: appearance none, no border, and its own track', async ({ page }) => {
    await open(page);
    const look = await style(page, '#base meter', ['appearance', 'border-top-width', 'min-inline-size', 'overflow-x']);
    expect(look.appearance).toBe('none');
    expect(look['border-top-width']).toBe('0px');
    expect(await page.locator('#base meter').first().evaluate((el) => el.tagName)).toBe('METER');
  });

  test('--cells draws cells with a mask, and the base bar draws none', async ({ page }) => {
    await open(page);
    const masked = (selector) => page.locator(selector).first().evaluate((el) => { const cs = getComputedStyle(el); return cs.maskImage || cs.webkitMaskImage || 'none'; });
    expect(await masked('#base meter'), 'the continuous bar has no mask').toBe('none');
    expect(await masked('#cells meter'), 'the cells are a mask').toMatch(/gradient/);
    const { 'block-size': height } = await style(page, '#cells meter', ['block-size']);
    expect(height, 'a cell is upright').toBe('12px');
  });

  test('--cells cuts the bar into cells with the page showing between them, whole where the bar is full', async ({ page }) => {
    await open(page);
    const page_ = await paintOf(page, 'var(--luz-surface-page)', hostOf(page, 'cells'));
    const [fill, track] = await Promise.all([paintOf(page, 'var(--luz-chart-1)', hostOf(page, 'cells')), paintOf(page, 'var(--luz-chart-track)', hostOf(page, 'cells'))]);
    const meter = page.locator('#cells li:first-child meter');
    await meter.scrollIntoViewIfNeeded();
    const png = await meter.screenshot();
    const row = await readRow(page, png, 6);
    // 6px of cell and 3px between, from the start: pixels 0 to 5 are a cell, 6 to 8 are the gap
    for (let cell = 0; cell < 5; cell++) {
      const at = cell * 9;
      expect(near(row[at + 2], fill), `cell ${cell} is the fill`).toBe(true);
      expect(near(row[at + 7], fill) || near(row[at + 7], track), `the gap after cell ${cell} shows neither fill nor track`).toBe(false);
      expect(near(row[at + 7], page_, 12), `the gap after cell ${cell} is the page`).toBe(true);
    }
    // the second row is half full: its empty cells are the track
    const half = page.locator('#cells li:nth-child(2) meter');
    const halfRow = await readRow(page, await half.screenshot(), 6);
    expect(near(halfRow[2], fill), 'the first cell of a half-full bar is the fill').toBe(true);
    const end = halfRow.length - 1;
    const lastCell = end - ((end + 3) % 9) - 2;
    expect(near(halfRow[Math.max(2, lastCell)], track), 'the last cell of a half-full bar is the track').toBe(true);
  });

  test('a bar at 0 is all track', async ({ page }) => {
    await open(page);
    const track = await paintOf(page, 'var(--luz-chart-track)', hostOf(page, 'zero'));
    const fill = await paintOf(page, 'var(--luz-chart-1)', hostOf(page, 'zero'));
    const row = await readRow(page, await page.locator('#zero .luz-bar-list__row--zero meter').screenshot(), 6);
    expect(near(row[2], track), 'the first cell is the track').toBe(true);
    expect(row.filter((p) => near(p, fill)).length, 'no cell is the fill').toBe(0);
  });
});

test.describe('bar list: a narrow container, a large text and small windows', () => {
  test('the meter has no minimum width, so a container narrower than 8rem is not widened', async ({ page }) => {
    await open(page);
    const look = await style(page, '#narrow meter', ['min-inline-size']);
    expect(look['min-inline-size']).toBe('0px');
    const frame = await box(page, '#frame-narrow');
    const meter = await box(page, '#narrow meter');
    expect(frame.width).toBeCloseTo(120, 0);
    expect(meter.width, 'the bar is as wide as its container').toBeLessThanOrEqual(frame.width + EPS);
    expect(meter.right).toBeLessThanOrEqual(frame.right + EPS);
  });

  test('at 200% text the container is still not widened, and nothing scrolls sideways', async ({ page }) => {
    await open(page);
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    const frame = await box(page, '#frame-narrow');
    const meter = await box(page, '#narrow meter');
    const row = await box(page, '#narrow li');
    expect(frame.width, 'the container is in px').toBeCloseTo(120, 0);
    expect(meter.width).toBeLessThanOrEqual(frame.width + EPS);
    expect(row.width).toBeLessThanOrEqual(frame.width + EPS);
    expect(await sideways(page)).toBeLessThanOrEqual(0);
  });

  test('at 320px nothing scrolls sideways and no list leaves the window', async ({ page }) => {
    await open(page, { width: 320 });
    expect(await sideways(page)).toBeLessThanOrEqual(0);
    for (const id of ['base', 'cells', 'zero', 'states', 'side', 'narrow', 'wide']) {
      const b = await box(page, `#${id}`);
      expect(b.left, `#${id}`).toBeGreaterThanOrEqual(-EPS);
      expect(b.right, `#${id}`).toBeLessThanOrEqual(320 + EPS);
    }
  });

  test('a name too long for its row is cut with an ellipsis and its whole text stays in the page', async ({ page }) => {
    await open(page, { width: 320 });
    const name = page.locator('#wide .luz-bar-list__name').first();
    const cut = await name.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth, text: el.textContent }));
    expect(cut.scroll, 'the text is wider than its box').toBeGreaterThan(cut.client);
    expect(cut.text).toContain('with its unit and its period');
    const figure = await box(page, '#wide li:first-child .luz-bar-list__figure');
    expect(figure.right, 'the figure is not pushed out of the window').toBeLessThanOrEqual(320 + EPS);
  });
});

test.describe('bar list: right to left', () => {
  test('the fill starts at the inline start, the right, and the track is at the left', async ({ page }) => {
    await open(page, { dir: 'rtl' });
    const [fill, track] = await Promise.all([paintOf(page, 'var(--luz-chart-1)', hostOf(page, 'base')), paintOf(page, 'var(--luz-chart-track)', hostOf(page, 'base'))]);
    const pixels = await rowOf(page, page.locator('#base li:first-child meter'));
    expect(near(pixels.at(-1), fill), 'the last pixel, at the right, is the fill').toBe(true);
    expect(near(pixels[0], track), 'the first pixel, at the left, is the track').toBe(true);
    const filled = pixels.filter((p) => near(p, fill)).length;
    expect(Math.abs(filled - 0.5 * pixels.length)).toBeLessThanOrEqual(3);
  });

  test('the name is at the right and the figure at the left of the row', async ({ page }) => {
    await open(page, { dir: 'rtl' });
    const name = await box(page, '#base li:first-child .luz-bar-list__name');
    const figure = await box(page, '#base li:first-child .luz-bar-list__figure');
    expect(name.left, 'the name starts at the right').toBeGreaterThan(figure.left);
  });

  test('at 320px nothing scrolls sideways', async ({ page }) => {
    await open(page, { width: 320, dir: 'rtl' });
    expect(await sideways(page)).toBeLessThanOrEqual(0);
  });
});

test.describe('bar list: forced colors', () => {
  test('the fill is the system highlight colour and the bar has a 1px edge in CanvasText', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await open(page);
    const highlight = await backgroundOf(page, 'Highlight', hostOf(page, 'base'));
    const [canvas, edge] = await Promise.all([paintOf(page, 'Canvas', hostOf(page, 'base')), paintOf(page, 'CanvasText', hostOf(page, 'base'))]);
    const look = await page.locator('#base li:first-child meter').evaluate((el) => {
      const cs = getComputedStyle(el);
      return { width: cs.borderTopWidth, style: cs.borderTopStyle, color: cs.borderTopColor.match(/[\d.]+/g).slice(0, 3).map(Number) };
    });
    expect(look.width).toBe('1px');
    expect(look.style).toBe('solid');
    expect(near(look.color, edge, 1), 'the edge is CanvasText').toBe(true);

    const meter = page.locator('#base li:first-child meter');
    await meter.scrollIntoViewIfNeeded();
    const png = await meter.screenshot();
    const middle = Math.floor((await meter.boundingBox()).height / 2);
    const row = await readRow(page, png, middle);
    expect(near(row[0], edge), 'the first pixel is the edge').toBe(true);
    expect(near(row[3], highlight), 'the start of the bar is Highlight').toBe(true);
    expect(near(row.at(-4), canvas), 'the end of a half-full bar is Canvas').toBe(true);
  });

  test('the information is not in the colour: the figure is text, and the bar is not the only difference between rows', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await open(page);
    const figures = await page.locator('#base .luz-bar-list__figure').allInnerTexts();
    expect(figures).toEqual(['100 KB', '200 KB', '50 KB']);
  });
});

test.describe('bar list: axe', () => {
  for (const mode of MODES) {
    test(`axe finds nothing serious in ${mode}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name === 'chromium-nojs', 'axe needs JavaScript');
      await open(page, { mode });
      await settled(page);
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)).toEqual([]);
    });
  }
});

test.describe('bar list: no script', () => {
  test('it needs none: the fixture has no script, links the loose sheet after luz.css, and the rows are laid out', async ({ page }) => {
    const source = readFileSync(new URL('./fixtures/bar-list.html', import.meta.url), 'utf-8');
    expect(source).not.toMatch(/<script/i);
    const links = [...source.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
    expect(links.indexOf('/packages/core/dist/components/bar-list.css')).toBe(links.indexOf('/packages/core/dist/luz.css') + 1);
    await open(page);
    const b = await box(page, '#base');
    expect(b.height).toBeGreaterThan(0);
    await expect(page.locator('#base meter').first()).toBeVisible();
  });
});
