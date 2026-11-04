// @ts-check
/**
 * `.luz-column-chart` of @luz-ds/catalog (`components/column-chart.css`, a sheet that a page links after luz.css): a native
 * table drawn as columns. A cell holds its figure as text, `--v` (0 to 1) is the share of the top of the scale, and the cell
 * draws a column under its figure, from the foot up to that share, on the chart track. The figure is above its column and the
 * name below it, as an axis; a bar is --luz-column-chart-bar wide and never wider than its column. With a row per category
 * (a th scope="row", a cell per series, up to six) each row is a group of columns, --luz-column-chart-gap apart, the name of
 * the row below the group and the head row the legend.
 *
 * tests/fixtures/column-chart.html: tokens, core's luz.css and catalog's sheet, no script. Everything is CSS, so it runs in
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

  test('the figure is above its column and the name below it, as an axis: the head row is drawn after the body', async ({ page }) => {
    await open(page);
    const first = page.locator('#base tbody td').first();
    const geometry = await first.evaluate((td) => {
      const th = td.closest('table').querySelector('thead th').getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(td);
      const text = range.getBoundingClientRect();
      const cell = td.getBoundingClientRect();
      const h = parseFloat(getComputedStyle(td, '::after').blockSize);
      return { thTop: th.top, textTop: text.top, textBottom: text.bottom, columnTop: cell.bottom - h, columnBottom: cell.bottom, thLeft: th.left, thRight: th.right, textLeft: text.left, textRight: text.right };
    });
    expect(geometry.textBottom, 'the column is under the figure').toBeLessThanOrEqual(geometry.columnTop + EPS);
    expect(geometry.thTop, 'the name is under the column').toBeGreaterThanOrEqual(geometry.columnBottom - EPS);
    expect((geometry.textLeft + geometry.textRight) / 2, 'the figure is centred over its name').toBeCloseTo((geometry.thLeft + geometry.thRight) / 2, 0);
    expect(await page.locator('#base thead').evaluate((el) => getComputedStyle(el).display), 'the head row is a footer group').toBe('table-footer-group');
    // ...and it is still the head of the table for a reader
    await expect(page.locator('#base').getByRole('columnheader')).toHaveText(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
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

/** The width in CSS px of a length written with tokens, measured on a probe inside `host`: `lengthOf(host, 'var(--luz-space-xs)')`. */
const lengthOf = (host, value) => host.evaluate((el, v) => {
  const probe = document.createElement('div');
  probe.style.cssText = `position:absolute;visibility:hidden;inline-size:${v}`;
  el.append(probe);
  const width = probe.getBoundingClientRect().width;
  probe.remove();
  return width;
}, value);

/** The boxes of the elements a locator finds. */
const boxesOf = (locator) => locator.evaluateAll((nodes) => nodes.map((n) => {
  const b = n.getBoundingClientRect();
  return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, width: b.width, height: b.height };
}));

test.describe('column chart: the bar', () => {
  test('is --luz-column-chart-bar wide, the space-lg step by default, and centred in its column', async ({ page }) => {
    await open(page);
    const host = hostOf(page, 'base');
    expect(await lengthOf(host, 'var(--luz-space-lg)')).toBe(24);
    const cell = page.locator('#base tbody td').first();
    const bar = await cell.evaluate((td) => {
      const after = getComputedStyle(td, '::after');
      const own = getComputedStyle(td);
      const room = td.clientWidth - parseFloat(own.paddingLeft) - parseFloat(own.paddingRight);
      return { width: parseFloat(after.width), left: parseFloat(after.marginLeft), right: parseFloat(after.marginRight), room };
    });
    expect(bar.room, 'the column has room for a wider bar than the default').toBeGreaterThan(30);
    expect(bar.width, 'the bar is the space-lg step wide').toBeCloseTo(await lengthOf(host, 'var(--luz-space-lg)'), 0);
    expect(bar.left, 'the bar is centred: the same room at each side').toBeCloseTo(bar.right, 0);
    expect(bar.left).toBeGreaterThan(1);
  });

  test('--luz-column-chart-bar sets another width', async ({ page }) => {
    await open(page);
    await page.locator('#base').evaluate((el) => el.style.setProperty('--luz-column-chart-bar', '2rem'));
    const width = await page.locator('#base tbody td').first().evaluate((td) => parseFloat(getComputedStyle(td, '::after').width));
    expect(width).toBeCloseTo(32, 0);
  });

  test('is never wider than its column, whatever --luz-column-chart-bar says', async ({ page }) => {
    await open(page);
    const cells = await page.locator('#bar tbody td').evaluateAll((nodes) => nodes.map((td) => {
      const own = getComputedStyle(td);
      const room = td.clientWidth - parseFloat(own.paddingLeft) - parseFloat(own.paddingRight);
      return { width: parseFloat(getComputedStyle(td, '::after').width), room };
    }));
    expect(cells).toHaveLength(3);
    for (const { width, room } of cells) {
      expect(width, 'a bar of 10rem in a column that is narrower').toBeLessThanOrEqual(room + 0.5);
      expect(width, 'it fills the column').toBeGreaterThan(room - 1);
    }
    expect(await sideways(page)).toBeLessThanOrEqual(0);
  });
});

test.describe('column chart: several series', () => {
  const rowCells = (page, id, row = 0) => page.locator(`#${id} tbody tr`).nth(row).locator('td');

  test('the rows of the example are laid out as boxes, so its roles are written out: table, rowgroup, row, columnheader, rowheader and cell', async ({ page }) => {
    await open(page);
    const roles = await page.locator('#groups').evaluate((table) => ({
      table: table.getAttribute('role'),
      groups: [...table.children].filter((c) => /^t(head|body)$/.test(c.localName)).map((c) => c.getAttribute('role')),
      rows: [...table.rows].map((r) => r.getAttribute('role')),
      th: [...table.querySelectorAll('th')].map((c) => c.getAttribute('role')),
      td: [...table.querySelectorAll('td')].map((c) => c.getAttribute('role')),
    }));
    expect(roles.table).toBe('table');
    expect(roles.groups).toEqual(['rowgroup', 'rowgroup']);
    expect(new Set(roles.rows)).toEqual(new Set(['row']));
    expect(roles.th).toEqual(['columnheader', 'columnheader', 'columnheader', 'rowheader', 'rowheader', 'rowheader']);
    expect(new Set(roles.td)).toEqual(new Set(['cell']));
    // A reader gets the table: the legend, then a row per category, each figure with its series and its category
    const table = page.locator('#groups');
    await expect(table).toHaveAccessibleName('Visitors per month, by device, January to March');
    await expect(table.getByRole('columnheader')).toHaveText(['Month', 'Desktop', 'Mobile']);
    await expect(table.getByRole('rowheader')).toHaveText(['Jan', 'Feb', 'Mar']);
    await expect(table.getByRole('cell')).toHaveText(['186', '80', '305', '200', '237', '120']);
  });

  test('each row is a group of columns side by side, --luz-column-chart-gap apart: the space-xs step by default', async ({ page }) => {
    await open(page);
    const gap = await lengthOf(hostOf(page, 'groups'), 'var(--luz-space-xs)');
    expect(gap).toBe(8);
    for (const row of [0, 1, 2]) {
      const [a, b] = await boxesOf(rowCells(page, 'groups', row));
      expect(b.left, `row ${row}: the second column is beside the first`).toBeGreaterThan(a.left);
      expect(Math.abs(a.bottom - b.bottom), `row ${row}: both stand on the same foot`).toBeLessThanOrEqual(EPS);
      expect(b.left - a.right, `row ${row}: the gap between the two columns`).toBeCloseTo(gap, 0);
    }
    // the knob sets another
    const [a, b] = await boxesOf(rowCells(page, 'gap'));
    expect(b.left - a.right).toBeCloseTo(32, 0);
  });

  test('a cell is at least one bar wide, so every column has the same width, whatever its figure', async ({ page }) => {
    await open(page);
    const bar = await lengthOf(hostOf(page, 'groups'), 'var(--luz-space-lg)');
    const widths = (await boxesOf(page.locator('#groups tbody td'))).map((b) => b.width);
    expect(widths).toHaveLength(6);
    for (const w of widths) expect(w, 'a cell is a bar wide at least').toBeGreaterThanOrEqual(bar - 0.5);
    expect(Math.max(...widths) - Math.min(...widths), 'every column is as wide as another').toBeLessThanOrEqual(EPS);
  });

  test('the name of a row is under its group of columns, centred on it', async ({ page }) => {
    await open(page);
    for (const row of [0, 1, 2]) {
      const group = await boxesOf(rowCells(page, 'groups', row));
      const name = page.locator('#groups tbody tr').nth(row).locator('th');
      const [box] = await boxesOf(name);
      const text = await name.evaluate((th) => {
        const range = document.createRange();
        range.selectNodeContents(th);
        const r = range.getBoundingClientRect();
        return { left: r.left, right: r.right };
      });
      const foot = Math.max(...group.map((c) => c.bottom));
      expect(box.top, `row ${row}: the name is under the columns`).toBeGreaterThanOrEqual(foot - EPS);
      const middle = (Math.min(...group.map((c) => c.left)) + Math.max(...group.map((c) => c.right))) / 2;
      expect(Math.abs((text.left + text.right) / 2 - middle), `row ${row}: the name is centred on its group`).toBeLessThanOrEqual(2);
    }
  });

  test('the groups of columns stand in a row, in the order of the table', async ({ page }) => {
    await open(page);
    const firsts = await boxesOf(page.locator('#groups tbody tr td:first-of-type'));
    expect(firsts).toHaveLength(3);
    expect(firsts[0].left).toBeLessThan(firsts[1].left);
    expect(firsts[1].left).toBeLessThan(firsts[2].left);
    expect(Math.abs(firsts[0].bottom - firsts[1].bottom), 'the groups share their foot').toBeLessThanOrEqual(EPS);
  });

  test('series n is --luz-chart-n, up to six', async ({ page }) => {
    await open(page);
    const cells = rowCells(page, 'six', 0);
    await expect(cells).toHaveCount(6);
    const seen = [];
    for (let n = 1; n <= 6; n++) {
      const paint = await paintOf(page, `var(--luz-chart-${n})`, hostOf(page, 'six'));
      const pixels = await columnOf(page, cells.nth(n - 1));
      expect(near(pixels.at(-1), paint), `series ${n} is --luz-chart-${n}`).toBe(true);
      seen.push(pixels.at(-1).join());
    }
    expect(new Set(seen).size, 'six series, six colours').toBe(6);
  });

  test('the head row is the legend: a row of names on a thin hairline in --luz-divider, with a round dot of the colour of each series and no separator between names', async ({ page }) => {
    await open(page);
    const table = page.locator('#groups');
    const row = table.locator('thead tr');
    const line = await styleOf(row, ['border-bottom-width', 'border-bottom-style', 'border-bottom-color', 'display']);
    expect(line['border-bottom-width']).toBe('1px');
    expect(line['border-bottom-style']).toBe('solid');
    expect((line['border-bottom-color'].match(/[\d.]+/g) ?? []).slice(0, 3).map(Number)).toEqual(await paintOf(page, 'var(--luz-divider)', hostOf(page, 'groups')));
    expect(line.display, 'a row of names').toBe('flex');
    // the legend is above the columns
    const [head] = await boxesOf(row);
    const [firstCell] = await boxesOf(rowCells(page, 'groups'));
    expect(head.bottom).toBeLessThanOrEqual(firstCell.top + EPS);
    // the names are side by side
    const names = await boxesOf(table.locator('thead th:nth-child(n+2)'));
    expect(names[1].left).toBeGreaterThan(names[0].right - EPS);
    expect(Math.abs(names[0].top - names[1].top)).toBeLessThanOrEqual(EPS);
    // the dots: round, a step wide, in the colour of their series; no separator
    const size = await lengthOf(hostOf(page, 'groups'), 'var(--luz-space-xs)');
    for (const n of [2, 3]) {
      const th = table.locator(`thead th:nth-child(${n})`);
      const dot = await styleOf(th, ['width', 'height', 'border-top-left-radius', 'background-color', 'content'], '::before');
      expect(parseFloat(dot.width), `dot ${n - 1}: width`).toBeCloseTo(size, 0);
      expect(parseFloat(dot.height), `dot ${n - 1}: height`).toBeCloseTo(size, 0);
      expect(parseFloat(dot['border-top-left-radius']), `dot ${n - 1}: round`).toBeGreaterThanOrEqual(size / 2);
      expect((dot['background-color'].match(/[\d.]+/g) ?? []).slice(0, 3).map(Number), `dot ${n - 1} is series ${n - 1}`).toEqual(await paintOf(page, `var(--luz-chart-${n - 1})`, hostOf(page, 'groups')));
      const separator = await styleOf(th, ['border-inline-start-width', 'border-inline-end-width', 'border-top-width'], null);
      expect(Object.values(separator), `name ${n - 1}: no separator`).toEqual(['0px', '0px', '0px']);
      expect((await styleOf(th, ['content'], '::after')).content, `name ${n - 1}: nothing after it`).toMatch(/^(?:none|normal)$/);
    }
  });

  test('the first cell of the head row, the categories\' column, is clipped but still read', async ({ page }) => {
    await open(page);
    const first = page.locator('#groups thead th').first();
    const look = await styleOf(first, ['clip-path']);
    expect(look['clip-path'], 'taken out of sight with clipping').not.toBe('none');
    await expect(first).toHaveText('Month');
    await expect(page.locator('#groups').getByRole('columnheader', { name: 'Month' })).toHaveCount(1);
  });

  test('in forced colors the first series is the highlight, series 2 and later are CanvasText, and the dots of the legend have an edge', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await open(page);
    const host = hostOf(page, 'six');
    // One probe at a time: both sit at the same corner of the host
    const highlight = await backgroundOf(page, 'Highlight', host);
    const text = await backgroundOf(page, 'CanvasText', host);
    const cells = rowCells(page, 'six', 0);
    expect(near((await columnOf(page, cells.nth(0))).at(-3), highlight), 'series 1 is Highlight inside its edge').toBe(true);
    for (const n of [2, 3, 6]) expect(near((await columnOf(page, cells.nth(n - 1))).at(-3), text), `series ${n} is CanvasText inside its edge`).toBe(true);
    const edge = await paintOf(page, 'CanvasText', host);
    for (const n of [2, 3]) {
      const dot = await styleOf(page.locator(`#six thead th:nth-child(${n})`), ['border-top-width', 'border-top-style', 'border-top-color'], '::before');
      expect(dot['border-top-width'], `dot ${n - 1}`).toBe('1px');
      expect(dot['border-top-style']).toBe('solid');
      expect(near((dot['border-top-color'].match(/[\d.]+/g) ?? []).slice(0, 3).map(Number), edge, 1)).toBe(true);
    }
  });

  test('right to left: the first group is at the right, and the first series is at the right of the second inside a group', async ({ page }) => {
    await open(page, { dir: 'rtl' });
    const firsts = await boxesOf(page.locator('#groups tbody tr td:first-of-type'));
    expect(firsts[0].left, 'Jan is at the right of Feb').toBeGreaterThan(firsts[1].left);
    const [a, b] = await boxesOf(rowCells(page, 'groups'));
    expect(a.left, 'Desktop is at the right of Mobile').toBeGreaterThan(b.left);
    expect(await sideways(page)).toBeLessThanOrEqual(0);
  });

  test('at 320px three groups of two columns fit a frame as wide as the window, with no scroll at all', async ({ page }) => {
    await open(page, { width: 320 });
    const wrap = await page.locator('#frame-small .luz-table-wrap').evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
    expect(wrap.scroll).toBeLessThanOrEqual(wrap.client + 1);
    expect(await sideways(page)).toBeLessThanOrEqual(0);
  });
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
  test('it needs none: the fixture has no script, links the sheet of catalog after luz.css, and no sheet of core but luz.css, and the columns are drawn', async ({ page }) => {
    const source = readFileSync(new URL('./fixtures/column-chart.html', import.meta.url), 'utf-8');
    expect(source).not.toMatch(/<script/i);
    const links = [...source.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
    expect(links.indexOf('/packages/catalog/dist/components/column-chart.css')).toBe(links.indexOf('/packages/core/dist/luz.css') + 1);
    expect(links.filter((href) => href.startsWith('/packages/core/')), 'core has no sheet of it').toEqual(['/packages/core/dist/luz.css']);
    await open(page);
    expect(await columnHeight(page.locator('#base tbody td').first())).toBeGreaterThan(40);
    const fill = await paintOf(page, 'var(--luz-chart-1)', hostOf(page, 'base'));
    const pixels = await columnOf(page, page.locator('#base tbody td').first());
    expect(near(pixels.at(-1), fill)).toBe(true);
  });
});
