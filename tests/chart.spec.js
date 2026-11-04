// @ts-check
/**
 * <luz-chart> of @luz-ds/catalog: a line chart, an area chart or a small line (a spark) drawn from the table, or the
 * list of <data> elements, that the author already wrote. The table is the content and stays in the page; the drawing
 * is an SVG beside it that a screen reader never meets.
 * tests/fixtures/chart.html, loading the real loader, catalog.min.js. `?only=<case>` keeps one section of the page
 * (so a test of the page's width or of its Tab order has nothing else on it), `?only=none` keeps none.
 *
 * Runs in `chromium` and `chromium-nojs`: without JavaScript the table is all there is, complete, and there is no
 * button (playwright.config.js: `'**\/chart.spec.js'` in the `testMatch` of `chromium-nojs`).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

import { MODES } from './helpers/design-tokens.js';
import { channels, vejer } from './helpers/site-lights.js';
import { settled } from './helpers/settle.js';

const PAGE = '/tests/fixtures/chart.html';
const only = (name) => `${PAGE}?only=${name}`;
const CHUNK = /\/chart\.min\.js(\?.*)?$/;
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
/** Sub-pixel rounding of a box. */
const EPS = 1.5;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

const jsOff = () => test.info().project.use.javaScriptEnabled === false;

/** Open a case of the fixture and wait until its chart is drawn. */
async function open(page, name = 'lines', id = name) {
  await page.goto(name === 'all' ? PAGE : only(name));
  await expect.poll(() => page.evaluate(() => !!customElements.get('luz-chart')), { message: 'the loader defines <luz-chart>' }).toBe(true);
  await expect(page.locator(`#${id}`)).toHaveAttribute('data-luz-ready', '');
}

/** The plain figures a tick says: "1.5K" is 1500, a minus sign of its own is a minus. */
const figure = (text) => Number(text.replace('−', '-').replace(/K$/i, 'e3'));

/** The text and place of every tick of a chart, the figures of the Y axis from the foot up and the names of the X axis from left to right. */
async function ticksOf(host, rows) {
  const all = await host.locator('.luz-chart__tick').evaluateAll((nodes) => nodes.map((n) => {
    const box = n.getBoundingClientRect();
    return { text: (n.textContent ?? '').trim(), x: box.left + box.width / 2, y: box.top + box.height / 2 };
  }));
  return {
    y: all.filter((t) => !rows.includes(t.text)).sort((a, b) => b.y - a.y),
    x: all.filter((t) => rows.includes(t.text)).sort((a, b) => a.x - b.x),
  };
}

/** The numbers of a path's `d`, in pairs: [[x, y], …]. */
const pointsOf = (d) => {
  const numbers = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  return Array.from({ length: Math.floor(numbers.length / 2) }, (_, i) => [numbers[2 * i], numbers[2 * i + 1]]);
};

/** What the box of an element is: its size, and whether it is taken out of sight with clipping. */
const boxOf = (locator) => locator.evaluate((el) => {
  const style = getComputedStyle(el);
  const box = el.getBoundingClientRect();
  return { width: box.width, height: box.height, display: style.display, visibility: style.visibility, clipPath: style.clipPath, position: style.position };
});

/** The shape of a marker, its drawing commands with the numbers taken out. */
const shapeOf = (d) => d.replace(/[-\d.\s,]/g, '');

/** Whether a table is taken out of the flow and clipped away, and leaves the host as tall as its bar and its drawing. */
async function tableIsAway(host) {
  const away = await host.evaluate((el) => {
    const table = getComputedStyle(el.querySelector('table'));
    const figure = el.querySelector('.luz-chart__figure').getBoundingClientRect();
    return { position: table.position, clipPath: table.clipPath, display: table.display, visibility: table.visibility, below: el.getBoundingClientRect().bottom - figure.bottom };
  });
  return away;
}

const toggleOf = (host) => host.locator('button');
const docWidth = (page) => page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));

test.describe('chart without JavaScript', () => {
  test('the tables and the list are all there is: complete, in the flow, with no button and no drawing', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-nojs', 'the state without JavaScript');
    await page.goto(PAGE);
    const lines = page.locator('#lines');
    await expect(lines.locator('table caption')).toHaveText('Parcels per route, January to June');
    await expect(lines.getByRole('columnheader')).toHaveText(['Month', 'Sevilla', 'Cádiz', 'Jerez']);
    await expect(lines.getByRole('cell')).toHaveText(['1,204', '312', '640', '1,310', '340', '620', '1,180', '365', '700', '1,420', '410', '690', '1,390', '398', '760', '1,480', '452', '810']);
    expect((await boxOf(lines.locator('table'))).width, 'the table has its own width').toBeGreaterThan(200);
    // The stylesheet is there (the tag is a block, the small line a row) and hides nothing: it waits for the script
    expect(await lines.evaluate((el) => getComputedStyle(el).display), 'the stylesheet of the chart is linked and applies').toBe('block');
    expect(await page.locator('#spark').evaluate((el) => getComputedStyle(el).display)).toBe('inline-flex');
    await expect(page.locator('luz-chart button')).toHaveCount(0);
    await expect(page.locator('luz-chart svg')).toHaveCount(0);
    await expect(page.locator('luz-chart[data-luz-ready]')).toHaveCount(0);
    await expect(page.locator('luz-chart[data-luz-view]')).toHaveCount(0);
    // The small line is the list of its figures, every one of them
    const figures = page.locator('#spark data');
    await expect(figures).toHaveCount(7);
    for (const one of await figures.all()) expect((await boxOf(one)).width, 'a figure of the list is on screen').toBeGreaterThan(8);
  });
});

test.describe('the page scripts blocked: the stylesheet alone hides nothing', () => {
  test.skip(() => jsOff(), 'the project without JavaScript has the test above');

  test('with the module blocked every table is in the flow at its own size, and the list shows its seven figures', async ({ page }) => {
    await page.route(/\/(packages|apps)\/.*\.js(\?.*)?$/, (route) => route.abort());
    await page.goto(PAGE);
    for (const id of ['lines', 'area', 'six', 'edge', 'nolabel', 'unknown']) {
      const table = await boxOf(page.locator(`#${id} table`));
      expect(table.width, `${id}: the table has a width`).toBeGreaterThan(100);
      expect(table.height, `${id}: the table has a height`).toBeGreaterThan(40);
      expect(table.display, id).not.toBe('none');
      expect(table.position, `${id}: in the flow`).not.toBe('fixed');
    }
    expect(await page.locator('#lines').evaluate((el) => getComputedStyle(el).display), 'the stylesheet of the chart applies').toBe('block');
    await expect(page.locator('luz-chart button')).toHaveCount(0);
    await expect(page.locator('luz-chart svg')).toHaveCount(0);
    for (const one of await page.locator('#spark data').all()) expect((await boxOf(one)).width).toBeGreaterThan(8);
  });
});

/**
 * `interactive` (tests/fixtures/chart-interactive.html; the behaviour with the script is tests/chart-interactive.spec.js): with no
 * script the table is a plain table, complete, in the flow, with no picker, no readout, no roles and no columns, and it fits
 * any width however many days it has. The column chart is drawn only once the script gives its table the class.
 */
const INTERACTIVE = '/tests/fixtures/chart-interactive.html';
const PLAIN = [{ name: 'column', id: 'column', days: 7 }, { name: 'line', id: 'line', days: 7 }, { name: 'column28', id: 'column28', days: 28 }];

async function expectPlainInteractive(page) {
  for (const { name, id, days } of PLAIN) {
    for (const width of [320, 360, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${INTERACTIVE}?only=${name}`);
      const host = page.locator(`#${id}`);
      await expect(host.locator('caption'), `${id}: the caption is a caption, in the flow`).toBeVisible();
      await expect(host.locator('.luz-chart__picker, .luz-chart__readout, .luz-chart__title, .luz-chart__figure, button'), `${id}: no picker, no readout, no title, no drawing, no button`).toHaveCount(0);
      await expect(host).not.toHaveAttribute('data-luz-ready', '');
      const table = await host.locator('table').evaluate((t) => ({
        drawn: t.classList.contains('luz-column-chart'),
        role: t.getAttribute('role'),
        display: getComputedStyle(t).display,
        position: getComputedStyle(t).position,
        touched: [...t.querySelectorAll('tr, th, td')].some((n) => n.hasAttribute('tabindex') || n.hasAttribute('role') || n.hasAttribute('aria-label') || n.hasAttribute('data-luz-off') || n.hasAttribute('data-luz-tick') || n.hasAttribute('data-luz-active')),
      }));
      expect(table, `${id}: a table as the author wrote it`).toEqual({ drawn: false, role: null, display: 'table', position: 'static', touched: false });
      await expect(host.getByRole('rowheader')).toHaveCount(days);
      await expect(host.getByRole('cell')).toHaveCount(days * 2);
      for (const cell of await host.getByRole('cell').all()) await expect(cell, `${id}: every figure is on screen`).toBeVisible();
      const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
      expect(widths.scroll, `${id} at ${width}px: the page does not scroll sideways`).toBeLessThanOrEqual(widths.client);
      const wrap = host.locator('.luz-table-wrap');
      if (await wrap.count()) {
        const inner = await wrap.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
        expect(inner.scroll, `${id} at ${width}px: nor does its frame`).toBeLessThanOrEqual(inner.client + 1);
      }
    }
  }
}

test.describe('interactive charts without JavaScript', () => {
  test('the tables are plain tables that fit 320, 360 and 768 px: no picker, no readout, no roles, no columns', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-nojs', 'the state without JavaScript');
    await expectPlainInteractive(page);
  });

  test('with the module blocked they are the same', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'chromium-nojs', 'the project without JavaScript has the test above');
    await page.route(/\/(packages|apps)\/.*\.js(\?.*)?$/, (route) => route.abort());
    await expectPlainInteractive(page);
  });
});

test.describe('chart', () => {
  test.skip(() => jsOff(), 'needs JavaScript: the state without it is above');

  test.describe('the loader', () => {
    test('the real loader, catalog.min.js, loads chart.min.js once and defines the element', async ({ page }) => {
      const chunks = [];
      page.on('request', (request) => CHUNK.test(request.url()) && chunks.push(request.url()));
      await open(page, 'all', 'lines');
      expect(chunks).toHaveLength(1);
      expect(await page.evaluate(() => !!customElements.get('luz-chart'))).toBe(true);
    });

    test('a page with no <luz-chart> does not load the chunk', async ({ page }) => {
      const chunks = [];
      const loader = [];
      page.on('request', (request) => {
        if (CHUNK.test(request.url())) chunks.push(request.url());
        if (/\/catalog\.min\.js(\?.*)?$/.test(request.url())) loader.push(request.url());
      });
      await page.goto(only('none'));
      await page.waitForLoadState('networkidle');
      expect(loader, 'the loader ran').toHaveLength(1);
      expect(chunks).toEqual([]);
      expect(await page.evaluate(() => !!customElements.get('luz-chart'))).toBe(false);
      // ...and the same page with its charts does load it
      await page.goto(PAGE);
      await expect.poll(() => chunks.length, { message: 'the chunk of a page that has a <luz-chart>' }).toBe(1);
    });
  });

  test.describe('what it reads from the table (readChart)', () => {
    /** readChart of the element with this id, with the gaps written out. */
    const read = (page, id) => page.evaluate(async (target) => {
      const { readChart } = await import('/packages/catalog/dist/chart.js');
      const result = readChart(document.getElementById(target));
      return result && { rows: result.rows, series: result.series.map((s) => ({ name: s.name, values: s.values.map((v) => (Number.isNaN(v) ? 'gap' : v)) })) };
    }, id);

    test('the first column is the X axis and every other column is a series, named by its head, with the value of the <data> and not its text', async ({ page }) => {
      await open(page, 'lines');
      expect(await read(page, 'lines')).toEqual({
        rows: MONTHS,
        series: [
          { name: 'Sevilla', values: [1204, 1310, 1180, 1420, 1390, 1480] },
          // Feb is a plain cell with no <data>: the text is the number
          { name: 'Cádiz', values: [312, 340, 365, 410, 398, 452] },
          { name: 'Jerez', values: [640, 620, 700, 690, 760, 810] },
        ],
      });
    });

    test('a negative figure, a decimal, the value of a <data> whose text says something else, a blank cell and a cell that is no plain number', async ({ page }) => {
      await open(page, 'edge');
      expect(await read(page, 'edge')).toEqual({
        rows: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        series: [
          // blank: a gap. -5: the value of the <data>, though its text has a minus of its own and words
          { name: 'Gain', values: [-40, 'gap', 25, 12.5, -5] },
          // "n/a" and "1,200" are not plain numbers: a gap each
          { name: 'Note', values: [8, 'gap', 'gap', 4, 0] },
        ],
      });
    });

    test('at most six series: the seventh column is not read', async ({ page }) => {
      await open(page, 'six');
      const result = await read(page, 'six');
      expect(result?.series.map((s) => s.name)).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
      expect(result?.series[0].values).toEqual([10, 15, 12]);
      expect(result?.rows).toEqual(['one', 'two', 'three']);
    });

    test('a chart with no table has nothing to read', async ({ page }) => {
      await open(page, 'spark');
      expect(await read(page, 'spark')).toBeNull();
    });
  });

  test.describe('the drawing', () => {
    test('is an SVG built from the table: one line and one mark per series, a point for every row, and the names of the rows on the axis', async ({ page }) => {
      await open(page, 'lines');
      const host = page.locator('#lines');
      expect(await host.locator('.luz-chart__plot').evaluate((el) => el instanceof globalThis.SVGSVGElement)).toBe(true);
      await expect(host.locator('.luz-chart__series')).toHaveCount(3);
      expect(await host.locator('.luz-chart__series').evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-n')))).toEqual(['1', '2', '3']);
      for (const series of await host.locator('.luz-chart__series').all()) {
        const line = await series.locator('.luz-chart__line').getAttribute('d');
        expect(pointsOf(line ?? ''), 'one point for each of the six rows').toHaveLength(6);
        await expect(series.locator('.luz-chart__marker')).toHaveCount(1);
      }
      const { x } = await ticksOf(host, MONTHS);
      expect(x.map((t) => t.text), 'every name of a row fits at this width').toEqual(MONTHS);
    });

    test('puts a larger figure higher and the rows from left to right, as the table reads, with the plain cell and the <data> on one scale', async ({ page }) => {
      await open(page, 'lines');
      const first = pointsOf((await page.locator('#lines .luz-chart__series[data-n="1"] .luz-chart__line').getAttribute('d')) ?? '');
      const sevilla = [1204, 1310, 1180, 1420, 1390, 1480];
      first.forEach(([x, y], i) => {
        if (i) expect(x, `row ${i} is to the right of row ${i - 1}`).toBeGreaterThan(first[i - 1][0]);
        sevilla.forEach((value, j) => {
          if (value > sevilla[i]) expect(first[j][1], `${value} is higher than ${sevilla[i]}`).toBeLessThan(y);
        });
      });
      const cadiz = pointsOf((await page.locator('#lines .luz-chart__series[data-n="2"] .luz-chart__line').getAttribute('d')) ?? '');
      expect(cadiz[1][1], '340 is lower than 1310').toBeGreaterThan(first[1][1]);
      expect(cadiz[1][1], '340 is higher than 312').toBeLessThan(cadiz[0][1]);
    });

    test('the scale starts at zero and goes up in round steps (1, 2 or 5 times a power of ten) to a figure above the highest', async ({ page }) => {
      await open(page, 'lines');
      const { y } = await ticksOf(page.locator('#lines'), MONTHS);
      const values = y.map((t) => figure(t.text));
      expect(values[0], 'the foot of the scale').toBe(0);
      const step = values[1] - values[0];
      values.forEach((value, i) => expect(value, 'the same step all the way up').toBeCloseTo(i * step, 6));
      expect([1, 2, 5], 'a round step').toContain(step / 10 ** Math.floor(Math.log10(step)));
      expect(values.at(-1), 'the top covers the highest figure, 1480').toBeGreaterThanOrEqual(1480);
      expect(values.at(-1) - 1480, 'and is no more than a step above it').toBeLessThan(step);
    });

    test('a negative figure takes the scale below zero, with a tick at zero, in round steps, and a blank or non-numeric cell is a gap in the line', async ({ page }) => {
      await open(page, 'edge');
      const host = page.locator('#edge');
      const { y } = await ticksOf(host, ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
      const values = y.map((t) => figure(t.text));
      expect(values[0], 'the foot is at or below the lowest figure, -40').toBeLessThanOrEqual(-40);
      expect(values, 'zero is on the scale').toContain(0);
      const step = values[1] - values[0];
      values.forEach((value, i) => expect(value).toBeCloseTo(values[0] + i * step, 6));
      expect([1, 2, 5], 'a round step').toContain(step / 10 ** Math.floor(Math.log10(step)));
      expect(values.at(-1)).toBeGreaterThanOrEqual(25);
      // Gain has a gap on Tue: two runs, the second of three points; Note has a gap on Tue and Wed: two runs
      for (const [n, runs] of [[1, [1, 3]], [2, [1, 2]]]) {
        const d = (await host.locator(`.luz-chart__series[data-n="${n}"] .luz-chart__line`).getAttribute('d')) ?? '';
        const parts = d.split('M').filter(Boolean);
        expect(parts.map((part) => pointsOf(part).length), `series ${n}`).toEqual(runs);
      }
    });

    test('a drawing that follows the language: the figures of the axis are written in the language of the page', async ({ page }) => {
      await open(page, 'spanish');
      const { y } = await ticksOf(page.locator('#spanish'), ['ene', 'feb', 'mar', 'abr']);
      expect(y.map((t) => t.text).join(' '), 'thousands as "mil", the Spanish compact form').toMatch(/\bmil\b/);
      expect(y.map((t) => t.text).join(' ')).not.toMatch(/\d\s?K\b/);
    });

    test('with variant="area" the area under the line is the colour of the series, translucent, and without it there is no area', async ({ page }) => {
      await open(page, 'area');
      const area = page.locator('#area .luz-chart__area');
      await expect(area).toHaveCount(1);
      expect(await area.getAttribute('d')).toMatch(/z/i);
      const style = await area.evaluate((el) => ({ fill: getComputedStyle(el).fill, opacity: parseFloat(getComputedStyle(el).fillOpacity) }));
      expect(channels(style.fill).slice(0, 3)).toEqual(vejer('light', 'chart-1').slice(0, 3));
      expect(style.opacity, 'the line stays readable over it').toBeGreaterThan(0);
      expect(style.opacity).toBeLessThan(0.5);
      await open(page, 'lines');
      await expect(page.locator('#lines .luz-chart__area')).toHaveCount(0);
    });

    test('a type it does not know leaves the table as it is: no drawing, no button', async ({ page }) => {
      await page.goto(only('unknown'));
      await expect.poll(() => page.evaluate(() => !!customElements.get('luz-chart'))).toBe(true);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('#unknown svg')).toHaveCount(0);
      await expect(page.locator('#unknown button')).toHaveCount(0);
      const table = await boxOf(page.locator('#unknown table'));
      expect(table.width).toBeGreaterThan(100);
      expect(table.position).not.toBe('fixed');
    });

    test('is drawn again when the box changes size: the drawing is at the size of the box in pixels', async ({ page }) => {
      await page.setViewportSize({ width: 1200, height: 800 });
      await open(page, 'lines');
      const plot = page.locator('#lines .luz-chart__plot');
      const sized = () => plot.evaluate((el) => ({ viewBox: el.getAttribute('viewBox'), width: el.getBoundingClientRect().width }));
      const before = await sized();
      expect(Number(before.viewBox?.split(' ')[2]), 'a drawing at the size it is shown at').toBeCloseTo(before.width, -1);
      const d = await page.locator('#lines .luz-chart__line').first().getAttribute('d');
      await page.setViewportSize({ width: 600, height: 800 });
      await expect.poll(async () => Number((await sized()).viewBox?.split(' ')[2]), { message: 'the drawing follows the box' }).toBeLessThan(Number(before.viewBox?.split(' ')[2]) - 100);
      const after = await sized();
      expect(Number(after.viewBox?.split(' ')[2])).toBeCloseTo(after.width, -1);
      expect(await page.locator('#lines .luz-chart__line').first().getAttribute('d'), 'the points moved with it').not.toBe(d);
      const { x } = await ticksOf(page.locator('#lines'), MONTHS);
      expect(x.at(-1)?.x ?? Infinity, 'the last name is inside the box').toBeLessThanOrEqual((await plot.boundingBox())?.x + after.width + EPS);
    });

    test('is drawn again when the table changes: a new figure moves the scale, and a new row is a new name on the axis', async ({ page }) => {
      await open(page, 'lines');
      const host = page.locator('#lines');
      const top = async () => figure((await ticksOf(host, [...MONTHS, 'Jul'])).y.at(-1)?.text ?? '');
      expect(await top()).toBeLessThan(2000);
      await page.evaluate(() => {
        const data = document.querySelector('#lines tbody tr:last-child td:nth-child(2) data');
        data?.setAttribute('value', '6000');
        if (data) data.textContent = '6,000';
      });
      await expect.poll(top, { message: 'the scale grows to hold 6000' }).toBeGreaterThanOrEqual(6000);
      await page.evaluate(() => {
        const row = /** @type {HTMLTableRowElement} */ (document.querySelector('#lines tbody tr:last-child')).cloneNode(true);
        /** @type {HTMLElement} */ (row).querySelector('th').textContent = 'Jul';
        document.querySelector('#lines tbody')?.append(row);
      });
      await expect.poll(async () => (await ticksOf(host, [...MONTHS, 'Jul'])).x.map((t) => t.text)).toEqual([...MONTHS, 'Jul']);
      const points = pointsOf((await host.locator('.luz-chart__series[data-n="1"] .luz-chart__line').getAttribute('d')) ?? '');
      expect(points, 'a point for the new row').toHaveLength(7);
    });
  });

  test.describe('the table stays, and the drawing is not read', () => {
    test('in the chart view the table is off screen, one pixel and clipped, and still in the accessibility tree with its caption, heads and cells', async ({ page }) => {
      await open(page, 'lines');
      const host = page.locator('#lines');
      await expect(host).toHaveAttribute('data-luz-view', 'chart');
      const away = await tableIsAway(host);
      expect(away.display, 'not display: none').not.toBe('none');
      expect(away.visibility, 'not visibility: hidden').toBe('visible');
      expect(away.clipPath, 'clipped away, so nothing of it is painted').not.toBe('none');
      expect(away.position, 'taken out of the flow of its scrolling ancestors').toBe('fixed');
      expect(away.below, 'it adds no height to the chart: the host ends where the drawing does').toBeLessThanOrEqual(24);
      await expect(host.getByRole('table', { name: 'Parcels per route, January to June' })).toHaveCount(1);
      await expect(host.getByRole('columnheader')).toHaveText(['Month', 'Sevilla', 'Cádiz', 'Jerez']);
      await expect(host.getByRole('cell')).toHaveCount(18);
      await expect(host.getByRole('cell').first()).toHaveText('1,204');
    });

    test('the drawing, its title, its ticks and its legend are hidden from assistive technology; the button is the only thing the script adds that is read', async ({ page }) => {
      await open(page, 'lines');
      const host = page.locator('#lines');
      const exposed = await host.evaluate((el) => {
        const added = [...el.querySelectorAll('svg, .luz-chart__title, .luz-chart__tick, .luz-chart__legend, .luz-chart__key, .luz-chart__figure, .luz-chart__plot')];
        return {
          count: added.length,
          unhidden: added.filter((node) => !node.closest('[aria-hidden="true"]')).map((node) => node.className?.baseVal ?? node.className ?? node.tagName),
          outside: added.filter((node) => !el.contains(node)).length,
        };
      });
      expect(exposed.count).toBeGreaterThan(10);
      expect(exposed.unhidden).toEqual([]);
      await expect(host.getByRole('button')).toHaveCount(1);
      await expect(host.getByRole('img')).toHaveCount(0);
      await expect(host.getByRole('list')).toHaveCount(0);
    });
  });

  test.describe('the button that swaps the drawing for the table', () => {
    test('a native button of the page\'s own words: "Show table" over the chart, "Show chart" over the table', async ({ page }) => {
      await open(page, 'lines');
      const button = toggleOf(page.locator('#lines'));
      expect(await button.evaluate((el) => [el.tagName, el.getAttribute('type')])).toEqual(['BUTTON', 'button']);
      await expect(button).toHaveText('Show table');
      await expect(button).toHaveAccessibleName('Show table');
      await button.click();
      await expect(button).toHaveText('Show chart');
      await expect(button).toHaveAccessibleName('Show chart');
      await button.click();
      await expect(button).toHaveText('Show table');
    });

    test('a click shows the table in the flow and hides the drawing, a second click brings the drawing back, and focus stays on the button', async ({ page }) => {
      await open(page, 'lines');
      const host = page.locator('#lines');
      const button = toggleOf(host);
      await button.click();
      await expect(host).toHaveAttribute('data-luz-view', 'table');
      await expect(host.locator('.luz-chart__figure')).toBeHidden();
      const table = await boxOf(host.locator('table'));
      expect(table.width).toBeGreaterThan(200);
      expect(table.height).toBeGreaterThan(100);
      expect(table.clipPath).toBe('none');
      await expect(button).toBeFocused();
      await button.click();
      await expect(host).toHaveAttribute('data-luz-view', 'chart');
      await expect(host.locator('.luz-chart__figure')).toBeVisible();
      const away = await tableIsAway(host);
      expect(away.clipPath).not.toBe('none');
      expect(away.below).toBeLessThanOrEqual(24);
      await expect(button).toBeFocused();
    });

    test('Enter and Space on the button do what a click does', async ({ page }) => {
      await open(page, 'lines');
      const host = page.locator('#lines');
      await page.keyboard.press('Tab');
      await expect(toggleOf(host)).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(host).toHaveAttribute('data-luz-view', 'table');
      await expect(toggleOf(host)).toBeFocused();
      await page.keyboard.press('Space');
      await expect(host).toHaveAttribute('data-luz-view', 'chart');
      await expect(toggleOf(host)).toBeFocused();
    });

    test('one Tab stop in the chart view, the button: the next Tab leaves the chart, for a bare table and for a table in a focusable wrapper', async ({ page }) => {
      for (const id of ['lines', 'wrapped']) {
        await open(page, id);
        await page.keyboard.press('Tab');
        await expect(toggleOf(page.locator(`#${id}`)), id).toBeFocused();
        await page.keyboard.press('Tab');
        await expect(page.locator('#after'), `${id}: the stop after the button is the link after the chart`).toBeFocused();
        await page.keyboard.press('Shift+Tab');
        await expect(toggleOf(page.locator(`#${id}`)), id).toBeFocused();
      }
    });

    test('in the table view the wrapper of the table is a stop again, after the button', async ({ page }) => {
      await open(page, 'wrapped');
      const host = page.locator('#wrapped');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      await expect(host).toHaveAttribute('data-luz-view', 'table');
      await page.keyboard.press('Tab');
      await expect(host.locator('.luz-table-wrap')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.locator('#after')).toBeFocused();
    });

    test('the words are the page\'s: from an ancestor, in its language, and with no English of the script\'s own', async ({ page }) => {
      await open(page, 'spanish');
      const button = toggleOf(page.locator('#spanish'));
      await expect(button).toHaveText('Mostrar tabla');
      await button.click();
      await expect(button).toHaveText('Mostrar gráfico');
      const text = await page.locator('#spanish').evaluate((el) => el.textContent ?? '');
      expect(text).not.toMatch(/Show|table|chart/i);
    });
  });

  test.describe('with no words for the button there is no button, and the table shows under the drawing', () => {
    for (const [id, why] of [['nolabel', 'no label at all'], ['one', 'one of the two labels'], ['blank', 'both labels only white space']]) {
      test(`${why}: no button, nothing added to read, both views at once`, async ({ page }) => {
        await open(page, id);
        const host = page.locator(`#${id}`);
        await expect(host.locator('button')).toHaveCount(0);
        await expect(host).toHaveAttribute('data-luz-view', 'both');
        await expect(host.locator('.luz-chart__plot')).toBeVisible();
        const text = (await host.evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');
        expect(text, 'no word of English of the script\'s own').not.toMatch(/Show|Mostrar/);
        // The table is in the flow, at its own size, under the drawing and not over it
        const table = await boxOf(host.locator('table'));
        expect(table.width).toBeGreaterThan(100);
        expect(table.height).toBeGreaterThan(40);
        expect(table.clipPath).toBe('none');
        const figure = await host.locator('.luz-chart__figure').boundingBox();
        const under = await host.locator('table').boundingBox();
        expect(under?.y ?? 0, 'the table is below the drawing').toBeGreaterThanOrEqual((figure?.y ?? 0) + (figure?.height ?? 0) - EPS);
      });
    }
  });

  test.describe('the look', () => {
    test('each series has its own mark, a circle, a square, a triangle, a diamond, a plus and a cross, and the legend repeats it with the name', async ({ page }) => {
      await open(page, 'six');
      const host = page.locator('#six');
      const marks = await host.locator('.luz-chart__series .luz-chart__marker').evaluateAll((nodes) => nodes.map((n) => n.getAttribute('d') ?? ''));
      expect(marks).toHaveLength(6);
      expect(new Set(marks.map(shapeOf)).size, 'six shapes, not one shape six times').toBe(6);
      const keys = host.locator('.luz-chart__key');
      await expect(keys).toHaveText(['A', 'B', 'C', 'D', 'E', 'F']);
      const legend = await keys.evaluateAll((nodes) => nodes.map((n) => (n.querySelector('.luz-chart__marker')?.getAttribute('d') ?? '')));
      expect(legend.map(shapeOf), 'the legend shows the mark of its series').toEqual(marks.map(shapeOf));
    });

    test('the legend is for more than one series: a chart of one has none', async ({ page }) => {
      await open(page, 'area');
      await expect(page.locator('#area .luz-chart__key')).toHaveCount(0);
      await open(page, 'lines');
      await expect(page.locator('#lines .luz-chart__key')).toHaveText(['Sevilla', 'Cádiz', 'Jerez']);
    });

    for (const mode of MODES) {
      test(`${mode}: each series is its token, --luz-chart-1 to --luz-chart-6, on the line, the mark and the legend`, async ({ page }) => {
        await open(page, 'six');
        await page.evaluate((m) => {
          document.documentElement.dataset.theme = m;
          document.documentElement.dataset.mode = m;
        }, mode);
        await settled(page);
        const host = page.locator('#six');
        for (let n = 1; n <= 6; n++) {
          const want = vejer(mode, `chart-${n}`).slice(0, 3);
          const paint = await host.evaluate((el, index) => {
            const series = el.querySelector(`.luz-chart__series[data-n="${index}"]`);
            const key = el.querySelector(`.luz-chart__key[data-n="${index}"]`);
            return {
              line: getComputedStyle(series.querySelector('.luz-chart__line')).stroke,
              mark: getComputedStyle(series.querySelector('.luz-chart__marker')).fill,
              swatch: getComputedStyle(key.querySelector('.luz-chart__line')).stroke,
            };
          }, n);
          expect(channels(paint.line).slice(0, 3), `${mode} series ${n}: the line`).toEqual(want);
          expect(channels(paint.mark).slice(0, 3), `${mode} series ${n}: the mark`).toEqual(want);
          expect(channels(paint.swatch).slice(0, 3), `${mode} series ${n}: the legend`).toEqual(want);
        }
      });
    }

    test('the mode repaints the drawing with no redraw: the same paths in another colour', async ({ page }) => {
      await open(page, 'lines');
      const first = page.locator('#lines .luz-chart__series[data-n="1"] .luz-chart__line');
      const d = await first.getAttribute('d');
      const light = await first.evaluate((el) => getComputedStyle(el).stroke);
      await page.evaluate(() => {
        document.documentElement.dataset.theme = 'dark';
        document.documentElement.dataset.mode = 'dark';
      });
      await settled(page);
      expect(await first.evaluate((el) => getComputedStyle(el).stroke), 'another colour').not.toBe(light);
      expect(await first.getAttribute('d'), 'the same drawing').toBe(d);
    });

    test('forced colors: one colour for every line, and a series is told by its dashes, in the drawing and in the legend', async ({ page }) => {
      await page.emulateMedia({ forcedColors: 'active' });
      await open(page, 'six');
      const host = page.locator('#six');
      const read = await host.evaluate((el) => {
        const probe = document.createElement('span');
        probe.style.color = 'CanvasText';
        el.append(probe);
        const text = getComputedStyle(probe).color;
        probe.remove();
        const lines = (scope) => [1, 2, 3, 4, 5, 6].map((n) => {
          const line = el.querySelector(`${scope}[data-n="${n}"] .luz-chart__line`);
          return { stroke: getComputedStyle(line).stroke, dashes: getComputedStyle(line).strokeDasharray };
        });
        return { text, series: lines('.luz-chart__series'), legend: lines('.luz-chart__key') };
      });
      for (const [which, list] of [['series', read.series], ['legend', read.legend]]) {
        for (const [i, one] of list.entries()) expect(one.stroke, `${which} ${i + 1} is the text colour of the system`).toBe(read.text);
        expect(list[0].dashes, `${which} 1 is solid`).toMatch(/^(?:none|0)?$/);
        const dashed = list.slice(1).map((one) => one.dashes);
        for (const dashes of dashed) expect(dashes, `${which}: dashed`).not.toMatch(/^(?:none|0)?$/);
        expect(new Set(dashed).size, `${which} 2 to 6 have a pattern each`).toBe(5);
      }
      expect(read.legend.map((l) => l.dashes), 'the legend shows the dashes of its series').toEqual(read.series.map((l) => l.dashes));
    });

    test('with colours a series is solid: the dashes are only for forced colors', async ({ page }) => {
      await open(page, 'six');
      const dashes = await page.locator('#six .luz-chart__series .luz-chart__line').evaluateAll((nodes) => nodes.map((n) => getComputedStyle(n).strokeDasharray));
      for (const one of dashes) expect(one).toMatch(/^(?:none|0)?$/);
    });

    test('nothing moves: no animation and no transition on the chart, with motion or with reduced motion', async ({ page }) => {
      for (const reducedMotion of ['no-preference', 'reduce']) {
        await page.emulateMedia({ reducedMotion: /** @type {'reduce' | 'no-preference'} */ (reducedMotion) });
        await open(page, 'lines');
        await toggleOf(page.locator('#lines')).click();
        const motion = await page.locator('#lines').evaluate((el) => {
          // What the script adds (the author's table has its own hover colour, and the button is core's, below)
          const own = [el, ...el.querySelectorAll('.luz-chart__figure, .luz-chart__figure *, .luz-chart__title')];
          return {
            // The button is core's, and the pointer is still on it after the click: its hover transition is not the chart's
            running: el.getAnimations({ subtree: true }).filter((a) => !/** @type {Element} */ (a.effect?.target)?.closest('.luz-chart__toggle')).length,
            animated: own.filter((node) => getComputedStyle(node).animationName !== 'none').length,
            transitions: own.filter((node) => getComputedStyle(node).transitionDuration.split(',').some((d) => parseFloat(d) > 0)).length,
          };
        });
        expect(motion, reducedMotion).toEqual({ running: 0, animated: 0, transitions: 0 });
        if (reducedMotion === 'reduce') {
          // The button is core's: under reduced motion nothing of it transitions either
          const button = await toggleOf(page.locator('#lines')).evaluate((el) => getComputedStyle(el).transitionDuration.split(',').every((d) => parseFloat(d) === 0));
          expect(button, 'the button does not transition under reduced motion').toBe(true);
        }
      }
    });

    for (const dir of ['ltr', 'rtl']) {
      test(`${dir}: the button keeps its end of the bar between the chart view and the table view`, async ({ page }) => {
        await open(page, 'lines');
        await page.evaluate((d) => {
          document.documentElement.dir = d;
        }, dir);
        await settled(page);
        const host = page.locator('#lines');
        const button = toggleOf(host);
        /** The button's edge on the side of the end of the bar, and its distance from the end of the host. */
        const place = () => host.evaluate((el) => {
          const box = el.querySelector('button').getBoundingClientRect();
          const bar = el.getBoundingClientRect();
          return getComputedStyle(el).direction === 'rtl' ? { fromEnd: box.left - bar.left, fromStart: bar.right - box.right } : { fromEnd: bar.right - box.right, fromStart: box.left - bar.left };
        });
        const chart = await place();
        expect(chart.fromEnd, 'at the inline end of the bar in the chart view').toBeLessThanOrEqual(EPS);
        expect(chart.fromStart, 'with the title before it').toBeGreaterThan(EPS);
        await button.click();
        await expect(host).toHaveAttribute('data-luz-view', 'table');
        const table = await place();
        expect(table.fromEnd, 'still at the inline end in the table view, with the title gone').toBeLessThanOrEqual(EPS);
        expect(Math.abs(table.fromEnd - chart.fromEnd), 'it did not move to the other end').toBeLessThanOrEqual(EPS);
        await button.click();
        expect((await place()).fromEnd, 'and back').toBeLessThanOrEqual(EPS);
      });
    }

    test('right to left: the plot is still drawn left to right, the title, the button and the legend follow the page', async ({ page }) => {
      await open(page, 'lines');
      await page.evaluate(() => {
        document.documentElement.dir = 'rtl';
      });
      const host = page.locator('#lines');
      await settled(page);
      expect(await host.locator('.luz-chart__plot').evaluate((el) => getComputedStyle(el).direction), 'a time axis runs left to right').toBe('ltr');
      const { x, y } = await ticksOf(host, MONTHS);
      expect(x.map((t) => t.text), 'the first row is at the left').toEqual(MONTHS);
      expect(y[0].x, 'the figures of the scale are at the left of the first row').toBeLessThan(x[0].x);
      const title = await host.locator('.luz-chart__title').boundingBox();
      const button = await toggleOf(host).boundingBox();
      expect((title?.x ?? 0) + (title?.width ?? 0), 'the title starts at the right').toBeGreaterThan((button?.x ?? 0) + (button?.width ?? 0));
      const keys = await host.locator('.luz-chart__key').evaluateAll((nodes) => nodes.map((n) => n.getBoundingClientRect().left));
      expect(keys[0], 'the legend starts at the right').toBeGreaterThan(keys[2]);
    });
  });

  test.describe('the small line (type="spark")', () => {
    test('draws one aria-hidden line from the values of the <data> elements, a point each, the last figure being the highest', async ({ page }) => {
      await open(page, 'spark');
      const spark = page.locator('#spark svg.luz-chart__spark');
      await expect(spark).toHaveCount(1);
      await expect(spark).toHaveAttribute('aria-hidden', 'true');
      const d = (await spark.locator('path').first().getAttribute('d')) ?? '';
      // Seven points, the second one (the <data> that says thirty-eight in its text) included: it reads the value, not the text
      const points = pointsOf(d);
      expect(points).toHaveLength(7);
      points.forEach(([x], i) => i && expect(x).toBeGreaterThan(points[i - 1][0]));
      const ys = points.map(([, y]) => y);
      expect(ys.indexOf(Math.min(...ys)), '63 is the highest').toBe(6);
      expect(ys.indexOf(Math.max(...ys)), '38 is the lowest').toBe(1);
    });

    test('shows the last figure as text, and the other six are off screen but still in the accessibility tree, in their list', async ({ page }) => {
      await open(page, 'spark');
      const host = page.locator('#spark');
      const shown = await boxOf(host.locator('data').last());
      expect(shown.width, 'the last figure is on screen').toBeGreaterThan(8);
      await expect(host.locator('data').last()).toHaveText('63');
      for (const one of (await host.locator('data').all()).slice(0, 6)) {
        const hidden = await boxOf(one);
        expect(hidden.display).not.toBe('none');
        expect(hidden.width).toBeLessThanOrEqual(EPS);
        expect(hidden.height).toBeLessThanOrEqual(EPS);
      }
      await expect(host.getByRole('listitem')).toHaveCount(7);
      await expect(host.locator('data').nth(1)).toHaveText('thirty-eight');
    });
  });

  test.describe('on paper', () => {
    test('the table prints in the flow, and the drawing, its title and its button do not', async ({ page }) => {
      await open(page, 'lines');
      await page.emulateMedia({ media: 'print' });
      const host = page.locator('#lines');
      await expect(host.locator('.luz-chart__figure')).toBeHidden();
      await expect(host.locator('.luz-chart__bar')).toBeHidden();
      await expect(toggleOf(host)).toBeHidden();
      const table = await boxOf(host.locator('table'));
      expect(table.width).toBeGreaterThan(200);
      expect(table.height).toBeGreaterThan(100);
      expect(table.clipPath).toBe('none');
      expect(table.position).not.toBe('fixed');
    });

    test('the table prints even while the page shows the table view, and the list of a small line prints all its figures with no drawing', async ({ page }) => {
      await open(page, 'lines');
      await toggleOf(page.locator('#lines')).click();
      await page.emulateMedia({ media: 'print' });
      expect((await boxOf(page.locator('#lines table'))).height).toBeGreaterThan(100);
      await expect(page.locator('#spark svg')).toBeHidden();
      for (const one of await page.locator('#spark data').all()) expect((await boxOf(one)).width, 'a figure on paper').toBeGreaterThan(8);
    });
  });

  test.describe('320 px with the text at 200%', () => {
    /** The page at 320 px with the root font at 200%, one case on it. */
    async function narrow(page, name) {
      await page.setViewportSize({ width: 320, height: 700 });
      await open(page, name);
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%';
      });
      await settled(page);
    }

    for (const id of ['wide', 'wrapped']) {
      test(`${id === 'wide' ? 'a bare table wider than the screen' : 'a table in a wrapper that scrolls by itself'}: the page does not scroll sideways in the chart view or in the table view`, async ({ page }) => {
        await narrow(page, id);
        const host = page.locator(`#${id}`);
        const chart = await docWidth(page);
        expect(chart.scroll, 'the chart view').toBe(chart.client);
        expect((await host.locator('.luz-chart__plot').boundingBox())?.width ?? 0).toBeLessThanOrEqual(chart.client);
        await toggleOf(host).click();
        await expect(host).toHaveAttribute('data-luz-view', 'table');
        const table = await docWidth(page);
        expect(table.scroll, 'the table view').toBe(table.client);
        await toggleOf(host).click();
        const back = await docWidth(page);
        expect(back.scroll, 'and the chart again').toBe(back.client);
      });
    }

    test('the table of a bare table scrolls inside the chart in the table view, and is all reachable there', async ({ page }) => {
      await narrow(page, 'wide');
      const host = page.locator('#wide');
      await toggleOf(host).click();
      const scroll = await host.evaluate((el) => ({ overflowX: getComputedStyle(el).overflowX, wide: el.scrollWidth, shown: el.clientWidth }));
      expect(scroll.wide, 'the table is wider than the screen').toBeGreaterThan(scroll.shown);
      expect(scroll.overflowX, 'and scrolls inside the chart, not the page').toMatch(/^(?:auto|scroll)$/);
    });

    test('the button wraps its words and stays inside the screen', async ({ page }) => {
      await narrow(page, 'wide');
      const button = toggleOf(page.locator('#wide'));
      const look = await button.evaluate((el) => {
        const style = getComputedStyle(el);
        const box = el.getBoundingClientRect();
        const line = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
        return { right: box.right, left: box.left, lines: box.height / line, inner: el.scrollWidth - el.clientWidth };
      });
      expect(look.left).toBeGreaterThanOrEqual(0);
      expect(look.right, 'inside the screen').toBeLessThanOrEqual(320 + EPS);
      expect(look.inner, 'its words do not run out of it').toBeLessThanOrEqual(1);
      expect(look.lines, 'the long words take two lines at least').toBeGreaterThanOrEqual(1.9);
    });
  });

  test.describe('axe', () => {
    for (const mode of MODES) {
      for (const view of ['chart', 'table']) {
        test(`${mode}, ${view} view: no serious or critical violation`, async ({ page }) => {
          await open(page, 'all', 'lines');
          for (const host of await page.locator('luz-chart[type="line"], luz-chart:not([type])').all()) await expect(host).toHaveAttribute('data-luz-ready', '');
          await page.evaluate((m) => {
            document.documentElement.dataset.theme = m;
            document.documentElement.dataset.mode = m;
          }, mode);
          if (view === 'table') for (const button of await page.locator('luz-chart button').all()) await button.click();
          await settled(page);
          const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
          const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
          expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
        });
      }
    }
  });
});
