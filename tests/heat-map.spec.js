// @ts-check
/**
 * `.luz-heat-map` of @luz-ds/catalog (`components/heat-map.css`, a sheet that a page links after luz.css): a native table
 * whose cells show how much by colour and by figure. A cell holds its figure as text and `--v` (0 to 1) is its share of the
 * strongest value; the cell draws a swatch above the figure, the chart colour mixed into the chart track in proportion to
 * `--v`. The figure stays on the surface of the page, in the text colour, so it is as readable at 1 as at 0.
 *
 * tests/fixtures/heat-map.html: tokens, core's luz.css and catalog's sheet, no script. Everything is CSS, so it runs in
 * `chromium` and in `chromium-nojs` (playwright.config.js: `'**\/heat-map.spec.js'` in the `testMatch` of `chromium-nojs`).
 * Axe needs script and is skipped there.
 */
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

import { MODES } from './helpers/design-tokens.js';
import { near, paintOf } from './helpers/pixels.js';
import { backgroundOf, colorOf, ratio, sideways, stripOf, styleOf } from './helpers/chart-probes.js';
import { settled } from './helpers/settle.js';

const FIXTURE = '/tests/fixtures/heat-map.html';
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
/** The cells of the first row of a table of the fixture, as locators. */
const row = (page, id, n = 0) => page.locator(`#${id} tbody tr`).nth(n).locator('td');

/**
 * The pixel of the middle of the swatch of a cell (its ::before, the first box of the cell): read from the screenshot of the cell.
 */
async function swatchOf(page, cell) {
  const look = await styleOf(cell, ['padding-top'], null);
  const swatch = await styleOf(cell, ['block-size'], '::before');
  const box = /** @type {{ width: number }} */ (await cell.boundingBox());
  expect(parseFloat(swatch['block-size']), 'the cell draws a swatch: its ::before has a height').toBeGreaterThan(0);
  const y = Math.round(parseFloat(look['padding-top']) + parseFloat(swatch['block-size']) / 2);
  const [pixel] = await stripOf(page, cell, Math.floor(box.width / 2), y, y + 1);
  return pixel;
}

/** The colour a mix of two series is, in the page's mode: the contract is the chart colour mixed into the track by --v. */
const mixOf = (page, id, v, fill = 'var(--luz-chart-1)') => backgroundOf(page, `color-mix(in oklab, ${fill} ${v * 100}%, var(--luz-chart-track))`, hostOf(page, id));
/** How far two pixels are, as the biggest step of a channel. */
const distance = (a, b) => Math.max(...[0, 1, 2].map((i) => Math.abs(a[i] - b[i])));

test.describe('heat map: the structure is a table, and the swatch is a picture', () => {
  test('a table with a caption that says what the colour means, a head row of names, a head cell for each row and one cell for each figure', async ({ page }) => {
    await open(page);
    const table = await page.locator('#base').evaluate((el) => ({
      caption: el.querySelector('caption')?.textContent?.trim(),
      heads: [...el.querySelectorAll('thead th')].map((th) => [th.textContent?.trim(), th.getAttribute('scope')]),
      rows: [...el.querySelectorAll('tbody tr')].map((tr) => [tr.querySelector('th')?.textContent?.trim(), tr.querySelector('th')?.getAttribute('scope'), ...[...tr.querySelectorAll('td')].map((td) => td.textContent?.trim())]),
    }));
    expect(table.caption).toContain('The stronger the colour, the more parcels.');
    expect(table.heads).toEqual([['Mon', 'col'], ['Tue', 'col'], ['Wed', 'col'], ['Thu', 'col'], ['Fri', 'col']]);
    expect(table.rows).toEqual([
      ['Morning', 'row', '0', '150', '300', '450', '600'],
      ['Afternoon', 'row', '600', '450', '300', '150', '0'],
    ]);
  });

  test('no figure is drawn by CSS: the swatch is an empty pseudo-element above the text of the cell', async ({ page }) => {
    await open(page);
    const cell = row(page, 'base').first();
    const before = await styleOf(cell, ['content', 'display'], '::before');
    expect(before.content, 'the swatch has no text').toBe('""');
    expect(before.display).toBe('block');
    expect((await styleOf(cell, ['content'], '::after')).content).toMatch(/^(?:none|normal)$/);
  });

  test('the head row has no swatch: only the cells of the body are marks', async ({ page }) => {
    await open(page);
    for (const selector of ['#base thead th', '#base thead td', '#base tbody th']) {
      expect((await styleOf(page.locator(selector).first(), ['content'], '::before')).content, selector).toMatch(/^(?:none|normal)$/);
    }
  });

  test('a reader gets the table: the names of the columns and of the rows, and a figure for each cell, in order, and nothing for the swatches', async ({ page }) => {
    await open(page);
    const table = page.locator('#base');
    await expect(table).toHaveAccessibleName(/The stronger the colour, the more parcels\./);
    await expect(table.getByRole('columnheader')).toHaveText(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    await expect(table.getByRole('rowheader')).toHaveText(['Morning', 'Afternoon']);
    await expect(table.locator('tbody').getByRole('cell')).toHaveText(['0', '150', '300', '450', '600', '600', '450', '300', '150', '0']);
  });

  test('the bare table gives no head surface, no rule and no hover surface to a heat map: the cells have no border or background', async ({ page }) => {
    await open(page);
    for (const selector of ['#base thead th', '#base tbody th', '#base tbody td']) {
      const look = await styleOf(page.locator(selector).first(), ['border-top-width', 'border-bottom-width', 'background-color', 'background-image']);
      expect(look['border-top-width'], selector).toBe('0px');
      expect(look['border-bottom-width'], selector).toBe('0px');
      expect(look['background-color'], selector).toBe('rgba(0, 0, 0, 0)');
      expect(look['background-image'], selector).toBe('none');
    }
    expect((await styleOf(page.locator('#base tbody td').first(), ['text-align']))['text-align']).toBe('center');
    expect((await styleOf(page.locator('#base tbody th').first(), ['text-align']))['text-align'], 'a name starts at the inline start').toBe('start');
  });

  test('the column of the row names is wider than a column of figures, so a name is not cut short', async ({ page }) => {
    await open(page);
    const names = /** @type {{ width: number }} */ (await page.locator('#base tbody th').first().boundingBox());
    const figures = /** @type {{ width: number }} */ (await page.locator('#base thead th').first().boundingBox());
    expect(names.width).toBeGreaterThan(figures.width);
  });

  test('the swatch is above the figure, and the figure is on the surface of the cell, under it', async ({ page }) => {
    await open(page);
    const geometry = await row(page, 'base').first().evaluate((td) => {
      const range = document.createRange();
      range.selectNodeContents(td);
      const text = range.getBoundingClientRect();
      const cell = td.getBoundingClientRect();
      const before = getComputedStyle(td, '::before');
      const top = cell.top + parseFloat(getComputedStyle(td).paddingTop);
      return { swatchTop: top, swatchBottom: top + parseFloat(before.blockSize), textTop: text.top, textLeft: text.left, textRight: text.right, cellLeft: cell.left, cellRight: cell.right };
    });
    expect(geometry.textTop, 'the figure is under the swatch').toBeGreaterThanOrEqual(geometry.swatchBottom - EPS);
    expect((geometry.textLeft + geometry.textRight) / 2, 'centred').toBeCloseTo((geometry.cellLeft + geometry.cellRight) / 2, 0);
  });
});

test.describe('heat map: the swatch', () => {
  test('at 0 it is --luz-chart-track and at 1 it is --luz-chart-1', async ({ page }) => {
    await open(page);
    const [fill, track] = await Promise.all([paintOf(page, 'var(--luz-chart-1)', hostOf(page, 'base')), paintOf(page, 'var(--luz-chart-track)', hostOf(page, 'base'))]);
    const cells = row(page, 'base');
    expect(near(await swatchOf(page, cells.nth(0)), track, 2), 'v 0 is the track').toBe(true);
    expect(near(await swatchOf(page, cells.nth(4)), fill, 2), 'v 1 is the chart colour').toBe(true);
    // the other row has them the other way round
    const second = row(page, 'base', 1);
    expect(near(await swatchOf(page, second.nth(0)), fill, 2)).toBe(true);
    expect(near(await swatchOf(page, second.nth(4)), track, 2)).toBe(true);
  });

  test('in between it is the chart colour mixed into the track by --v, and the stronger the value the further from the track', async ({ page }) => {
    await open(page);
    const track = await paintOf(page, 'var(--luz-chart-track)', hostOf(page, 'base'));
    const cells = row(page, 'base');
    let before = -1;
    for (const [i, v] of [[0, 0], [1, 0.25], [2, 0.5], [3, 0.75], [4, 1]]) {
      const pixel = await swatchOf(page, cells.nth(i));
      if (i > 0 && i < 4) expect(distance(pixel, await mixOf(page, 'base', v)), `v ${v} is the mix`).toBeLessThanOrEqual(3);
      const away = distance(pixel, track);
      expect(away, `v ${v} is further from the track than the one before`).toBeGreaterThan(before);
      before = away;
    }
  });

  test('every cell is read on one scale: the same --v is the same swatch in two rows', async ({ page }) => {
    await open(page);
    const a = await swatchOf(page, row(page, 'base', 0).nth(2));
    const b = await swatchOf(page, row(page, 'base', 1).nth(2));
    expect(distance(a, b)).toBeLessThanOrEqual(1);
  });

  test('--luz-heat-map-color sets another series for a table', async ({ page }) => {
    await open(page);
    const [second, first] = await Promise.all([paintOf(page, 'var(--luz-chart-2)', hostOf(page, 'series')), paintOf(page, 'var(--luz-chart-1)', hostOf(page, 'series'))]);
    for (const i of [0, 1]) {
      const pixel = await swatchOf(page, row(page, 'series').nth(i));
      expect(near(pixel, second, 2), `cell ${i} is --luz-chart-2`).toBe(true);
      expect(near(pixel, first, 2), `cell ${i} is not --luz-chart-1`).toBe(false);
    }
  });

  test('--luz-heat-map-color sets another series for one cell, and the others keep --luz-chart-1', async ({ page }) => {
    await open(page);
    const [third, first] = await Promise.all([paintOf(page, 'var(--luz-chart-3)', hostOf(page, 'cell')), paintOf(page, 'var(--luz-chart-1)', hostOf(page, 'cell'))]);
    expect(near(await swatchOf(page, row(page, 'cell').nth(0)), first, 2), 'the first cell is --luz-chart-1').toBe(true);
    expect(near(await swatchOf(page, row(page, 'cell').nth(1)), third, 2), 'the second cell is --luz-chart-3').toBe(true);
  });
});

test.describe('heat map: the figure', () => {
  test('is text in the cell, in the text colour, with no surface of its own, whatever the value of the cell', async ({ page }) => {
    await open(page);
    const text = await paintOf(page, 'var(--luz-text-primary)', hostOf(page, 'base'));
    const cells = page.locator('#base tbody td');
    expect(await cells.count()).toBe(10);
    for (let i = 0; i < 10; i++) {
      expect(near(await colorOf(cells.nth(i)), text, 1), `cell ${i} is in the text colour`).toBe(true);
      expect((await styleOf(cells.nth(i), ['background-color']))['background-color'], `cell ${i}`).toBe('rgba(0, 0, 0, 0)');
    }
    const look = await styleOf(cells.first(), ['white-space', 'font-variant-numeric']);
    expect(look['white-space']).toBe('nowrap');
    expect(look['font-variant-numeric']).toContain('tabular-nums');
  });

  for (const mode of MODES) {
    test(`is 4.5:1 or more on the surface in ${mode}, in the strongest cell as in the empty one`, async ({ page }) => {
      await open(page, { mode });
      const surface = await paintOf(page, 'var(--luz-surface-page)', hostOf(page, 'base'));
      const cells = page.locator('#base tbody td');
      for (let i = 0; i < 10; i++) expect(ratio(await colorOf(cells.nth(i)), surface), `cell ${i}`).toBeGreaterThanOrEqual(4.5);
      for (const selector of ['#base thead th', '#base tbody th']) {
        const names = page.locator(selector);
        for (let i = 0; i < (await names.count()); i++) expect(ratio(await colorOf(names.nth(i)), surface), `${selector} ${i}`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});

test.describe('heat map: narrow windows', () => {
  test('at 320px the page does not scroll sideways: a calendar with seven columns scrolls in its wrap if it must, and no figure is cut', async ({ page }) => {
    await open(page, { width: 320 });
    expect(await sideways(page)).toBeLessThanOrEqual(0);
    const cut = await page.locator('#wide tbody td').evaluateAll((cells) => cells.filter((td) => {
      const range = document.createRange();
      range.selectNodeContents(td);
      const text = range.getBoundingClientRect();
      const box = td.getBoundingClientRect();
      return td.scrollWidth > td.clientWidth + 1 || text.right > box.right + 1 || text.left < box.left - 1;
    }).map((td) => td.textContent));
    expect(cut, 'a figure is never cut or let out of its cell').toEqual([]);
    const wrap = await page.locator('#wrap-wide').evaluate((el) => el.getBoundingClientRect());
    expect(wrap.right, 'the wrap is inside the window').toBeLessThanOrEqual(320 + EPS);
  });

  test('at 200% text nothing scrolls sideways in the page', async ({ page }) => {
    await open(page);
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    expect(await sideways(page)).toBeLessThanOrEqual(0);
  });
});

test.describe('heat map: right to left', () => {
  test('the row names are at the right, the first column is next to them, and the swatches keep their colours', async ({ page }) => {
    await open(page, { dir: 'rtl' });
    const name = /** @type {{ x: number }} */ (await page.locator('#base tbody th').first().boundingBox());
    const first = /** @type {{ x: number }} */ (await page.locator('#base thead th').first().boundingBox());
    const last = /** @type {{ x: number }} */ (await page.locator('#base thead th').last().boundingBox());
    expect(name.x, 'the names are at the right of the figures').toBeGreaterThan(first.x);
    expect(first.x, 'Mon is at the right of Fri').toBeGreaterThan(last.x);
    const fill = await paintOf(page, 'var(--luz-chart-1)', hostOf(page, 'base'));
    expect(near(await swatchOf(page, row(page, 'base').nth(4)), fill, 2)).toBe(true);
    expect(await sideways(page)).toBeLessThanOrEqual(0);
  });
});

test.describe('heat map: forced colors', () => {
  test('the swatch mixes the system colours, Highlight into Canvas, and has a 1px edge in CanvasText', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await open(page);
    const [highlight, canvas, edge] = await Promise.all([backgroundOf(page, 'Highlight', hostOf(page, 'base')), paintOf(page, 'Canvas', hostOf(page, 'base')), paintOf(page, 'CanvasText', hostOf(page, 'base'))]);
    const cells = row(page, 'base');
    const look = await styleOf(cells.first(), ['border-top-width', 'border-top-style', 'border-top-color'], '::before');
    expect(look['border-top-width']).toBe('1px');
    expect(look['border-top-style']).toBe('solid');
    expect(near((look['border-top-color'].match(/[\d.]+/g) ?? []).slice(0, 3).map(Number), edge, 1), 'the edge is CanvasText').toBe(true);
    expect(near(await swatchOf(page, cells.nth(0)), canvas, 2), 'v 0 is Canvas').toBe(true);
    expect(near(await swatchOf(page, cells.nth(4)), highlight, 2), 'v 1 is Highlight').toBe(true);
    const middle = await swatchOf(page, cells.nth(2));
    expect(near(middle, canvas, 2) || near(middle, highlight, 2), 'v 0.5 is a mix of the two').toBe(false);
  });

  test('the information is not in the colour: the figures are text', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await open(page);
    expect(await row(page, 'base').allInnerTexts()).toEqual(['0', '150', '300', '450', '600']);
  });
});

test.describe('heat map: axe', () => {
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

test.describe('heat map: no script', () => {
  test('it needs none: the fixture has no script, links the sheet of catalog after luz.css, and no sheet of core but luz.css, and the swatches are drawn', async ({ page }) => {
    const source = readFileSync(new URL('./fixtures/heat-map.html', import.meta.url), 'utf-8');
    expect(source).not.toMatch(/<script/i);
    const links = [...source.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
    expect(links.indexOf('/packages/catalog/dist/components/heat-map.css')).toBe(links.indexOf('/packages/core/dist/luz.css') + 1);
    expect(links.filter((href) => href.startsWith('/packages/core/')), 'core has no sheet of it').toEqual(['/packages/core/dist/luz.css']);
    await open(page);
    const fill = await paintOf(page, 'var(--luz-chart-1)', hostOf(page, 'base'));
    expect(near(await swatchOf(page, row(page, 'base').nth(4)), fill, 2)).toBe(true);
  });
});
