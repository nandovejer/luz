// @ts-check
/**
 * The example "With data" of the Dashboard page (/docs/catalog/dashboard/): four panels in `ul.o-grid > li.luz-card.luz-dashboard__panel`,
 * a figure (`.luz-stat`), a bar list, a `<luz-chart type="line">` in the wide panel over a native table, and a stacked bar.
 * What the unit test cannot see: that each piece is drawn, that the sheets of the bar list and the stacked bar (sheets of
 * catalog, which the docs link through catalog-patterns.css) are loaded and core has no sheet of them, the colours in the three modes, the reflow at 320 px and at 200% text, the equal
 * height of the panels in a row, the order, and the width of the wide panel (tests/dashboard-data.test.js has the markup, the
 * sums and the prompt).
 *
 * The no-JS state has its own block, which switches JavaScript off itself, so it runs in `chromium` and in `chromium-nojs`
 * alike; the tests that need the script skip themselves in `chromium-nojs`.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

import { MODES } from './helpers/design-tokens.js';
import { faded } from './helpers/settle.js';

const PAGE = '/docs/catalog/dashboard/';
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
/** Sub-pixel rounding of a box. */
const EPS = 1.5;
const REM = 16;
/** The specimen of the second example: the one after the heading `#example-data`. */
const SPECIMEN = '#example-data ~ .docs-example';
const PANELS = `${SPECIMEN} .luz-dashboard ul.o-grid > li.luz-dashboard__panel`;

const jsOff = () => test.info().project.use.javaScriptEnabled === false;

/**
 * @param {import('@playwright/test').Page} page
 * @param {{ width?: number, height?: number, ready?: boolean }} [options]
 */
async function open(page, { width = 1280, height = 900, ready = true } = {}) {
  await page.setViewportSize({ width, height });
  await page.goto(PAGE);
  await expect(page.locator(SPECIMEN).first()).toBeVisible();
  if (ready) await expect(page.locator(`${SPECIMEN} luz-chart`)).toHaveAttribute('data-luz-ready', '');
}

/** The boxes of the panels, in the order of the document. */
const boxes = (page) => page.locator(PANELS).evaluateAll((els) => els.map((el) => {
  const r = el.getBoundingClientRect();
  return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height, wide: el.classList.contains('luz-dashboard__panel--wide') };
}));

const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe('dashboard with data: four panels, each piece drawn', () => {
  test.skip(() => jsOff(), 'these need the script; the no-JS state is the last block');

  test('the example has four panels in the order a figure, a bar list, a line chart and a stacked bar', async ({ page }) => {
    await open(page);
    await expect(page.locator(PANELS)).toHaveCount(4);
    const pieces = await page.locator(PANELS).evaluateAll((lis) => lis.map((li) => [
      li.querySelector('.luz-stat') && 'stat',
      li.querySelector('figure.luz-bar-list') && 'bar-list',
      li.querySelector('luz-chart[type="line"]') && 'chart',
      li.querySelector('figure.luz-stacked-bar') && 'stacked-bar',
    ].filter(Boolean)));
    expect(pieces).toEqual([['stat'], ['bar-list'], ['chart'], ['stacked-bar']]);
    for (const li of await page.locator(PANELS).all()) {
      await expect(li.locator('h3.luz-card__title')).toBeVisible();
      expect(await li.evaluate((el) => getComputedStyle(el).backgroundColor), 'a card has a surface of its own').not.toBe('rgba(0, 0, 0, 0)');
    }
  });

  test('the figure, the bar list and the stacked bar are drawn: the numbers are visible, the meters and the parts have a size', async ({ page }) => {
    await open(page);
    const [stat, barList, , stacked] = await page.locator(PANELS).all();
    await expect(stat.locator('.luz-stat__value')).toBeVisible();
    await expect(stat.locator('.luz-stat__value')).toHaveText('1,204');
    const meters = await barList.locator('meter.luz-bar-list__meter').evaluateAll((all) => all.map((m) => {
      const r = m.getBoundingClientRect();
      return { width: r.width, height: r.height };
    }));
    expect(meters).toHaveLength(3);
    for (const m of meters) {
      expect(m.width, 'a meter has its row\'s width').toBeGreaterThan(40);
      expect(m.height, 'and a height').toBeGreaterThan(2);
    }
    const bar = await stacked.locator('.luz-stacked-bar__bar').evaluate((el) => {
      const r = el.getBoundingClientRect();
      const parts = [...el.children].map((p) => ({ left: p.getBoundingClientRect().left, right: p.getBoundingClientRect().right, width: p.getBoundingClientRect().width, color: getComputedStyle(p).backgroundColor }));
      return { left: r.left, right: r.right, height: r.height, parts };
    });
    expect(bar.height, 'the bar has a height').toBeGreaterThan(2);
    expect(bar.parts[0].left, 'the parts start at the start of the bar').toBeLessThanOrEqual(bar.left + EPS);
    expect(bar.parts.at(-1)?.right, 'and end at its end').toBeGreaterThanOrEqual(bar.right - EPS);
    expect(bar.parts[0].width, '62 of 100 is the widest').toBeGreaterThan(bar.parts[1].width);
    expect(new Set(bar.parts.map((p) => p.color)).size, 'each part has its own colour').toBe(bar.parts.length);
    await expect(stacked.locator('li.luz-stacked-bar__item')).toHaveCount(4);
  });

  test('the line chart is drawn as an SVG over its table, with the button that swaps one for the other', async ({ page }) => {
    await open(page);
    const chart = page.locator(`${SPECIMEN} luz-chart`);
    const plot = chart.locator('svg.luz-chart__plot');
    await expect(plot).toBeVisible();
    const box = /** @type {{ width: number, height: number }} */ (await plot.boundingBox());
    expect(box.width).toBeGreaterThan(200);
    expect(box.height).toBeGreaterThan(80);
    await expect(plot.locator('path.luz-chart__line')).toHaveCount(1);
    await expect(chart.locator('button')).toBeVisible();
    await expect(chart.locator('table')).toHaveCount(1);
    expect(await chart.locator('.luz-chart__tick').evaluateAll((all) => all.map((t) => t.textContent?.trim())), 'the months are on the axis').toEqual(expect.arrayContaining(['Jan', 'Jun']));
  });

  test('the chart stays inside its card and never widens its column', async ({ page }) => {
    await open(page);
    const [card, chart] = await Promise.all([
      page.locator(`${PANELS}.luz-dashboard__panel--wide`).boundingBox(),
      page.locator(`${SPECIMEN} luz-chart`).boundingBox(),
    ]);
    const c = /** @type {{ x: number, width: number }} */ (card);
    const h = /** @type {{ x: number, width: number }} */ (chart);
    expect(h.x).toBeGreaterThanOrEqual(c.x - EPS);
    expect(h.x + h.width).toBeLessThanOrEqual(c.x + c.width + EPS);
  });
});

test.describe('dashboard with data: the sheets of the bar list and the stacked bar', () => {
  test('are sheets of catalog that the page loads (through catalog-patterns.css), and core has no sheet of them', async ({ page }) => {
    await page.goto(PAGE);
    await page.waitForLoadState('load');
    const links = await page.evaluate(() => [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => new URL(/** @type {HTMLLinkElement} */ (l).href).pathname));
    expect(links.filter((href) => href.startsWith('/packages/core/')), 'core\'s one stylesheet').toEqual(['/packages/core/dist/luz.css']);
    expect(links, 'the docs\' catalog sheets').toContain('/apps/docs/catalog-patterns.css');
    // the rules of the page, whatever sheet holds them (the dev server inlines the @import rules of catalog-patterns.css): the
    // selectors of the bar list and of the stacked bar are there, and so is the layer of catalog that holds them
    const selectors = await page.evaluate(() => {
      const out = [];
      const walk = (rules) => {
        for (const rule of rules) {
          if (/** @type {CSSStyleRule} */ (rule).selectorText) out.push(/** @type {CSSStyleRule} */ (rule).selectorText);
          if (/** @type {CSSGroupingRule} */ (rule).cssRules) walk(/** @type {CSSGroupingRule} */ (rule).cssRules);
        }
      };
      for (const sheet of document.styleSheets) {
        try { walk(sheet.cssRules); } catch { /* a sheet of another origin */ }
      }
      return out;
    });
    for (const block of ['.luz-bar-list__meter', '.luz-stacked-bar__part']) expect(selectors.some((s) => s.includes(block)), `${block} is styled on the page`).toBe(true);
  });
});

test.describe('dashboard with data: axe', () => {
  for (const mode of MODES) {
    test(`axe finds nothing serious in the example in ${mode}`, async ({ page }) => {
      test.skip(jsOff(), 'axe needs JavaScript');
      await open(page);
      await page.evaluate((m) => {
        document.documentElement.dataset.theme = m;
        document.documentElement.dataset.mode = m;
        // a specimen keeps the theme the page had when it loaded (apps/docs/reference.js): follow the mode
        for (const el of document.querySelectorAll('[data-docs-specimen]')) /** @type {HTMLElement} */ (el).dataset.theme = m;
      }, mode);
      await faded(page);
      const { violations } = await new AxeBuilder({ page }).include(SPECIMEN).withTags(WCAG).analyze();
      const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    });
  }
});

test.describe('dashboard with data: reflow', () => {
  test('at 320 px nothing scrolls sideways, the panels are one column in the order of the markup, and the wide panel is as wide as the others', async ({ page }) => {
    await open(page, { width: 320, height: 700, ready: !jsOff() });
    expect(await sideways(page), 'the page does not scroll sideways').toBeLessThanOrEqual(0);
    const all = await boxes(page);
    expect(all).toHaveLength(4);
    for (const b of all) expect(b.right, 'inside the window').toBeLessThanOrEqual(320 + EPS);
    expect(new Set(all.map((b) => Math.round(b.left))).size, 'one column').toBe(1);
    expect(all.map((b) => b.top), 'in the order of the markup').toEqual([...all.map((b) => b.top)].sort((a, b) => a - b));
    const widths = all.map((b) => b.width);
    expect(Math.max(...widths) - Math.min(...widths), 'the wide panel has one column here').toBeLessThanOrEqual(EPS);
  });

  test('at 320 px with the text at 200% the page does not scroll sideways (with the script) and no panel leaves the window', async ({ page }) => {
    await open(page, { width: 320, height: 700, ready: !jsOff() });
    // the layout is synchronous: the next read of a box is the one at 200%
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    // Without the script the docs page itself (the stacked Code and Design tabs, the tables of its Design panel) already scrolls
    // at 200%, on every component page: what the example owns is that its panels stay in the window
    if (!jsOff()) expect(await sideways(page)).toBeLessThanOrEqual(0);
    for (const b of await boxes(page)) expect(b.right).toBeLessThanOrEqual(320 + EPS);
  });
});

test.describe('dashboard with data: layout with room', () => {
  test.skip(() => jsOff(), 'the heights of the charts need the script');

  test('at 1024 px the panels of a row have the same height, and there is a row of more than one', async ({ page }) => {
    await open(page, { width: 1024, height: 900 });
    const all = await boxes(page);
    const rows = new Map();
    for (const b of all) rows.set(Math.round(b.top), [...(rows.get(Math.round(b.top)) ?? []), b]);
    expect([...rows.values()].some((row) => row.length > 1), 'two columns at this width').toBe(true);
    for (const [top, row] of rows) {
      const heights = row.map((b) => b.height);
      expect(Math.max(...heights) - Math.min(...heights), `the row at ${top}`).toBeLessThanOrEqual(EPS);
    }
  });

  test('the panels keep the order of the markup on screen: by row, then from the start', async ({ page }) => {
    await open(page, { width: 1024, height: 900 });
    const all = await boxes(page);
    const byPlace = all.map((b, i) => ({ i, top: Math.round(b.top), left: b.left })).sort((a, b) => a.top - b.top || a.left - b.left).map((p) => p.i);
    expect(byPlace).toEqual([0, 1, 2, 3]);
  });

  test('with room the wide panel spans two columns: wider than a narrow one by a column and a gap, and never past the view', async ({ page }) => {
    await open(page, { width: 1440, height: 900 });
    const stage = /** @type {{ width: number }} */ (await page.locator(`${SPECIMEN} .luz-dashboard`).boundingBox());
    expect(stage.width, 'the view is at least 40rem wide: two columns exist').toBeGreaterThanOrEqual(40 * REM);
    const all = await boxes(page);
    const narrow = all.filter((b) => !b.wide);
    const wide = all.filter((b) => b.wide);
    expect(wide).toHaveLength(1);
    const gap = await page.locator(`${SPECIMEN} ul.o-grid`).evaluate((el) => parseFloat(getComputedStyle(el).columnGap));
    const column = Math.min(...narrow.map((b) => b.width));
    expect(wide[0].width, 'two columns and the gap between').toBeGreaterThanOrEqual(2 * column + gap - EPS);
    expect(wide[0].right).toBeLessThanOrEqual(stage.width + (await page.locator(`${SPECIMEN} .luz-dashboard`).evaluate((el) => el.getBoundingClientRect().left)) + EPS);
  });
});

test.describe('dashboard with data: without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('every panel reads: the table of the chart is all there is, in the page, with no button and no drawing', async ({ page }) => {
    await open(page, { ready: false });
    await expect(page.locator(PANELS)).toHaveCount(4);
    const chart = page.locator(`${SPECIMEN} luz-chart`);
    await expect(chart.locator('table')).toBeVisible();
    await expect(chart.locator('tbody tr')).toHaveCount(6);
    await expect(chart.locator('button')).toHaveCount(0);
    await expect(chart.locator('svg')).toHaveCount(0);
    await expect(chart).not.toHaveAttribute('data-luz-ready', '');
    // the other three are CSS only: the same as with the script
    const [stat, barList, , stacked] = await page.locator(PANELS).all();
    await expect(stat.locator('.luz-stat__value')).toBeVisible();
    await expect(barList.locator('meter')).toHaveCount(3);
    expect((await barList.locator('meter').first().boundingBox())?.height ?? 0).toBeGreaterThan(2);
    expect((await stacked.locator('.luz-stacked-bar__part').first().boundingBox())?.width ?? 0).toBeGreaterThan(10);
    await expect(stacked.locator('li.luz-stacked-bar__item')).toHaveCount(4);
  });

  test('the sheets are linked, so the page does not depend on the script for them', async ({ page }) => {
    await page.goto(PAGE);
    const hrefs = await page.evaluate(() => [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => new URL(/** @type {HTMLLinkElement} */ (l).href).pathname));
    expect(hrefs.filter((href) => href.startsWith('/packages/core/')), 'core has no sheet of the pieces').toEqual(['/packages/core/dist/luz.css']);
    expect(hrefs, 'the sheets of catalog come through catalog-patterns.css').toContain('/apps/docs/catalog-patterns.css');
    expect(hrefs.indexOf('/apps/docs/catalog-patterns.css')).toBeGreaterThan(hrefs.indexOf('/packages/core/dist/luz.css'));
  });
});
