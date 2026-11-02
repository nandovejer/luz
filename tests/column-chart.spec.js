// @ts-check
/**
 * `.luz-column-chart` of @luz-ds/core (`components/column-chart.css`, a loose sheet that a page links after luz.css): a native
 * table drawn as columns. A cell holds its figure as text, `--v` (0 to 1) is the share of the top of the scale, and the cell
 * draws a column under its figure, from the foot up to that share, on the chart track.
 *
 * tests/fixtures/column-chart.html: tokens, core's luz.css and the loose sheet, no script. Everything is CSS, so it runs in
 * `chromium` and in `chromium-nojs` (playwright.config.js: `'**\/column-chart.spec.js'` in the `testMatch` of
 * `chromium-nojs`). Axe needs script and is skipped there.
 */
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

import { MODES } from './helpers/design-tokens.js';
import { near, paintOf } from './helpers/pixels.js';
import { backgroundOf, colorOf, ratio, sideways, stripOf, styleOf } from './helpers/chart-probes.js';
import { settled } from './helpers/settle.js';

const FIXTURE = '/tests/fixtures/column-chart.html';
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

const hostOf = (page, id) => page.locator(`#${id}`);

/** The height of the column of a cell, in CSS px: the block size of its ::after. */
const columnHeight = async (cell) => parseFloat((await styleOf(cell, ['block-size'], '::after'))['block-size']);

/**
 * The pixels of the column of a cell (its ::after, the last box of the cell, which sits at the foot): one pixel column in
 * the middle of the cell, from the top of the column to its foot.
 */
async function columnOf(page, cell) {
  const h = Math.round(await columnHeight(cell));
  expect(h, 'the cell draws a column: its ::after has a height').toBeGreaterThan(0);
  const box = /** @type {{ width: number, height: number }} */ (await cell.boundingBox());
  return stripOf(page, cell, Math.floor(box.width / 2), Math.round(box.height) - h, Math.round(box.height));
}

test.describe('column chart: the structure is a table, and the column is a picture', () => {
  test('a table with a caption, a head row of names and one row of cells, each cell the figure as text', async ({ page }) => {
    await open(page);
    const table = await page.locator('#base').evaluate((el) => ({
      caption: el.querySelector('caption')?.textContent?.trim(),
      heads: [...el.querySelectorAll('thead th')].map((th) => [th.textContent?.trim(), th.getAttribute('scope')]),
      cells: [...el.querySelectorAll('tbody td')].map((td) => td.textContent?.trim()),
    }));
    expect(table.caption).toBe('Parcels per day, this week');
    expect(table.heads).toEqual([['Mon', 'col'], ['Tue', 'col'], ['Wed', 'col'], ['Thu', 'col'], ['Fri', 'col']]);
    expect(table.cells).toEqual(['200', '100', '50', '0', '160']);
  });

  test('no figure is drawn by CSS: the column is an empty pseudo-element, and the cell has nothing before its text', async ({ page }) => {
    await open(page);
    const cell = page.locator('#base tbody td').first();
    const after = await styleOf(cell, ['content', 'display'], '::after');
    expect(after.content, 'the column has no text').toBe('""');
    expect(after.display, 'the column is a box').toBe('block');
    expect((await styleOf(cell, ['content'], '::before')).content).toMatch(/^(?:none|normal)$/);
  });

  test('a reader gets the table: a column header and a cell with its figure for each column, in order, and nothing for the picture', async ({ page }) => {
    await open(page);
    const table = page.locator('#base');
    await expect(table).toHaveAccessibleName('Parcels per day, this week');
    await expect(table.getByRole('columnheader')).toHaveText(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    await expect(table.getByRole('cell')).toHaveText(['200', '100', '50', '0', '160']);
  });

  test('the bare table gives no head surface, no rule and no padding to a chart: the cells are centred, with no border or background', async ({ page }) => {
    await open(page);
    for (const selector of ['#base th', '#base td']) {
      const look = await styleOf(page.locator(selector).first(), ['border-top-width', 'border-bottom-width', 'background-color', 'background-image', 'text-align']);
      expect(look['border-top-width'], selector).toBe('0px');
      expect(look['border-bottom-width'], selector).toBe('0px');
      expect(look['background-color'], selector).toBe('rgba(0, 0, 0, 0)');
      expect(look['background-image'], selector).toBe('none');
      expect(look['text-align'], selector).toBe('center');
    }
  });

  test('the name is above its figure and the figure above its column, as the markup reads', async ({ page }) => {
    await open(page);
    const first = page.locator('#base tbody td').first();
    const geometry = await first.evaluate((td) => {
      const th = td.closest('table').querySelector('thead th').getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(td);
      const text = range.getBoundingClientRect();
      const cell = td.getBoundingClientRect();
      const h = parseFloat(getComputedStyle(td, '::after').blockSize);
      return { thBottom: th.bottom, textTop: text.top, textBottom: text.bottom, columnTop: cell.bottom - h, thLeft: th.left, thRight: th.right, textLeft: text.left, textRight: text.right };
    });
    expect(geometry.textTop, 'the figure is under the name').toBeGreaterThanOrEqual(geometry.thBottom - EPS);
    expect(geometry.textBottom, 'the column is under the figure').toBeLessThanOrEqual(geometry.columnTop + EPS);
    expect((geometry.textLeft + geometry.textRight) / 2, 'the figure is centred under its name').toBeCloseTo((geometry.thLeft + geometry.thRight) / 2, 0);
  });
});

test.describe('column chart: the column', () => {
  test('its height follows --v on one scale: the fill is --luz-chart-1 from the foot up, the rest is --luz-chart-track', async ({ page }) => {
    await open(page);
    const [fill, track] = await Promise.all([paintOf(page, 'var(--luz-chart-1)', hostOf(page, 'base')), paintOf(page, 'var(--luz-chart-track)', hostOf(page, 'base'))]);
    const cells = page.locator('#base tbody td');
    const height = await columnHeight(cells.first());
    expect(height, 'a column is tall').toBeGreaterThan(40);
    for (const [i, share] of [[0, 1], [1, 0.5], [2, 0.25], [3, 0], [4, 0.8]]) {
      const pixels = await columnOf(page, cells.nth(i));
      const filled = pixels.filter((p) => near(p, fill)).length;
      const empty = pixels.filter((p) => near(p, track)).length;
      expect(Math.abs(filled - share * pixels.length), `cell ${i}: ${filled} of ${pixels.length} px for ${share}`).toBeLessThanOrEqual(3);
      // a column is only fill and track, a corner of its radius aside
      expect(filled + empty, `cell ${i}: only fill and track`).toBeGreaterThanOrEqual(pixels.length - 2);
    }
  });

  test('the fill starts at the foot: the last pixel of a column is the fill, and the first of a part-full one is the track', async ({ page }) => {
    await open(page);
    const [fill, track] = await Promise.all([paintOf(page, 'var(--luz-chart-1)', hostOf(page, 'base')), paintOf(page, 'var(--luz-chart-track)', hostOf(page, 'base'))]);
    const half = await columnOf(page, page.locator('#base tbody td').nth(1));
    expect(near(half.at(-1), fill), 'the foot is the fill').toBe(true);
    expect(near(half[2], track), 'the head of a half column is the track').toBe(true);
    const empty = await columnOf(page, page.locator('#base tbody td').nth(3));
    expect(empty.filter((p) => near(p, fill)).length, 'a column at 0 has no fill').toBe(0);
  });

  test('every column is as tall as every other: the scale is one, whatever the figure', async ({ page }) => {
    await open(page);
    const heights = await page.locator('#base tbody td').evaluateAll((cells) => cells.map((td) => getComputedStyle(td, '::after').blockSize));
    expect(new Set(heights).size).toBe(1);
  });

  test('--luz-column-chart-h sets the height of the columns, and a share of it is still --v', async ({ page }) => {
    await open(page);
    const cells = page.locator('#tall tbody td');
    expect(await columnHeight(cells.first())).toBeCloseTo(160, 0);
    const [fill] = await Promise.all([paintOf(page, 'var(--luz-chart-1)', hostOf(page, 'tall'))]);
    const pixels = await columnOf(page, cells.nth(1));
    expect(Math.abs(pixels.filter((p) => near(p, fill)).length - 80)).toBeLessThanOrEqual(3);
  });

  test('--luz-column-chart-color sets another series for a table', async ({ page }) => {
    await open(page);
    const [second, first] = await Promise.all([paintOf(page, 'var(--luz-chart-2)', hostOf(page, 'series')), paintOf(page, 'var(--luz-chart-1)', hostOf(page, 'series'))]);
    for (const i of [0, 1]) {
      const pixels = await columnOf(page, page.locator('#series tbody td').nth(i));
      expect(near(pixels.at(-1), second), `column ${i} is --luz-chart-2`).toBe(true);
      expect(near(pixels.at(-1), first), `column ${i} is not --luz-chart-1`).toBe(false);
    }
  });

  test('--luz-column-chart-color sets another series for one cell, and the others keep --luz-chart-1', async ({ page }) => {
    await open(page);
    const [third, first] = await Promise.all([paintOf(page, 'var(--luz-chart-3)', hostOf(page, 'cell')), paintOf(page, 'var(--luz-chart-1)', hostOf(page, 'cell'))]);
    const [a, b] = await Promise.all([0, 1].map((i) => columnOf(page, page.locator('#cell tbody td').nth(i))));
    expect(near(a.at(-1), first), 'the first column is --luz-chart-1').toBe(true);
    expect(near(b.at(-1), third), 'the second column is --luz-chart-3').toBe(true);
  });
});

test.describe('column chart: the figure', () => {
  test('is text in the cell, in the text colour, on the surface of the page (the column is under it, never behind it)', async ({ page }) => {
    await open(page);
    const cells = page.locator('#base tbody td');
    const text = await paintOf(page, 'var(--luz-text-primary)', hostOf(page, 'base'));
    for (let i = 0; i < 5; i++) {
      expect(near(await colorOf(cells.nth(i)), text, 1), `cell ${i} is in the text colour`).toBe(true);
      expect((await styleOf(cells.nth(i), ['background-color']))['background-color'], `cell ${i} has no surface of its own`).toBe('rgba(0, 0, 0, 0)');
    }
    expect((await styleOf(cells.first(), ['white-space', 'font-variant-numeric']))['white-space']).toBe('nowrap');
    expect((await styleOf(cells.first(), ['font-variant-numeric']))['font-variant-numeric']).toContain('tabular-nums');
  });

  for (const mode of MODES) {
    test(`is 4.5:1 or more on the surface in ${mode}, whatever the share of its column`, async ({ page }) => {
      await open(page, { mode });
      const surface = await paintOf(page, 'var(--luz-surface-page)', hostOf(page, 'base'));
      for (let i = 0; i < 5; i++) {
        const c = ratio(await colorOf(page.locator('#base tbody td').nth(i)), surface);
        expect(c, `cell ${i}`).toBeGreaterThanOrEqual(4.5);
      }
      for (let i = 0; i < 5; i++) {
        expect(ratio(await colorOf(page.locator('#base thead th').nth(i)), surface), `name ${i}`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});

test.describe('column chart: narrow windows', () => {
  test('at 320px the page does not scroll sideways: a table with more columns than the window holds scrolls in its wrap, and no figure is cut', async ({ page }) => {
    await open(page, { width: 320 });
    expect(await sideways(page)).toBeLessThanOrEqual(0);
    const wrap = await page.locator('#wrap-wide').evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
    expect(wrap.scroll, 'twelve columns do not fit in 320px: the wrap scrolls').toBeGreaterThan(wrap.client);
    const cut = await page.locator('#wide tbody td').evaluateAll((cells) => cells.filter((td) => {
      const range = document.createRange();
      range.selectNodeContents(td);
      const text = range.getBoundingClientRect();
      const box = td.getBoundingClientRect();
      return td.scrollWidth > td.clientWidth + 1 || text.right > box.right + 1 || text.left < box.left - 1;
    }).map((td) => td.textContent));
    expect(cut, 'a figure is never cut or let out of its cell').toEqual([]);
  });

  test('at 320px the four columns of a frame narrower than the window fit with no scroll at all', async ({ page }) => {
    await open(page, { width: 320 });
    const wrap = await page.locator('#frame-base .luz-table-wrap').evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
    expect(wrap.scroll).toBeLessThanOrEqual(wrap.client + 1);
  });

  test('at 200% text nothing scrolls sideways in the page', async ({ page }) => {
    await open(page);
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    expect(await sideways(page)).toBeLessThanOrEqual(0);
  });
});

test.describe('column chart: right to left', () => {
  test('the first column is at the right, and the fill is still from the foot up', async ({ page }) => {
    await open(page, { dir: 'rtl' });
    const first = await page.locator('#base thead th').first().boundingBox();
    const last = await page.locator('#base thead th').last().boundingBox();
    expect(/** @type {any} */ (first).x, 'Mon is at the right of Fri').toBeGreaterThan(/** @type {any} */ (last).x);
    const fill = await paintOf(page, 'var(--luz-chart-1)', hostOf(page, 'base'));
    const half = await columnOf(page, page.locator('#base tbody td').nth(1));
    expect(near(half.at(-1), fill)).toBe(true);
    expect(await sideways(page)).toBeLessThanOrEqual(0);
  });
});

test.describe('column chart: forced colors', () => {
  test('the fill is the system highlight colour, the track is Canvas, and the column has a 1px edge in CanvasText', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await open(page);
    const [highlight, canvas, edge] = await Promise.all([backgroundOf(page, 'Highlight', hostOf(page, 'base')), paintOf(page, 'Canvas', hostOf(page, 'base')), paintOf(page, 'CanvasText', hostOf(page, 'base'))]);
    const cells = page.locator('#base tbody td');
    const look = await styleOf(cells.first(), ['border-top-width', 'border-top-style', 'border-top-color'], '::after');
    expect(look['border-top-width']).toBe('1px');
    expect(look['border-top-style']).toBe('solid');
    expect(near((look['border-top-color'].match(/[\d.]+/g) ?? []).slice(0, 3).map(Number), edge, 1), 'the edge is CanvasText').toBe(true);
    // the half column: Highlight at the foot, Canvas above, inside the edge
    const half = await columnOf(page, cells.nth(1));
    expect(near(half.at(-3), highlight), 'the foot of the half column is Highlight').toBe(true);
    expect(near(half[3], canvas), 'its head is Canvas').toBe(true);
    // the empty column has no Highlight at all
    const empty = await columnOf(page, cells.nth(3));
    expect(empty.filter((p) => near(p, highlight)).length).toBe(0);
  });

  test('the information is not in the colour: the figures are text', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await open(page);
    expect(await page.locator('#base tbody td').allInnerTexts()).toEqual(['200', '100', '50', '0', '160']);
  });
});

test.describe('column chart: axe', () => {
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

test.describe('column chart: no script', () => {
  test('it needs none: the fixture has no script, links the loose sheet after luz.css, and the columns are drawn', async ({ page }) => {
    const source = readFileSync(new URL('./fixtures/column-chart.html', import.meta.url), 'utf-8');
    expect(source).not.toMatch(/<script/i);
    const links = [...source.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
    expect(links.indexOf('/packages/core/dist/components/column-chart.css')).toBe(links.indexOf('/packages/core/dist/luz.css') + 1);
    await open(page);
    expect(await columnHeight(page.locator('#base tbody td').first())).toBeGreaterThan(40);
    const fill = await paintOf(page, 'var(--luz-chart-1)', hostOf(page, 'base'));
    const pixels = await columnOf(page, page.locator('#base tbody td').first());
    expect(near(pixels.at(-1), fill)).toBe(true);
  });
});
