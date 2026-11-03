// @ts-check
/**
 * `.luz-stacked-bar` of @luz-ds/catalog (`components/stacked-bar.css`, a sheet that a page links after luz.css): the shares
 * of a whole in one bar, and a legend that says them in text. The bar is a picture, hidden from assistive technology, one
 * `__part` for each share, whose `--v` is its weight (the bar always fills its width and a part takes `--v` of the sum). The
 * legend is the data: one `__item` for each part, in the same order, with its name and its figure. The series take
 * `--luz-chart-1` to `-6` in the order of the markup.
 *
 * tests/fixtures/stacked-bar.html: tokens, core's luz.css and catalog's sheet, no script. Everything is CSS, so it runs in
 * `chromium` and in `chromium-nojs` (playwright.config.js: `'**\/stacked-bar.spec.js'` in the `testMatch` of
 * `chromium-nojs`). Axe needs script and is skipped there.
 */
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

import { MODES } from './helpers/design-tokens.js';
import { near, paintOf, readRow } from './helpers/pixels.js';
import { colorOf, ratio, sideways, styleOf } from './helpers/chart-probes.js';
import { settled } from './helpers/settle.js';

const FIXTURE = '/tests/fixtures/stacked-bar.html';
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

/** The boxes of the parts of a figure's bar, and the box of the bar. */
const partsOf = (page, id) => page.locator(`#${id} .luz-stacked-bar__part`).evaluateAll((parts) => ({
  bar: (({ left, right, top, bottom, width, height }) => ({ left, right, top, bottom, width, height }))(parts[0].parentElement.getBoundingClientRect()),
  parts: parts.map((p) => { const { left, right, top, bottom, width, height } = p.getBoundingClientRect(); return { left, right, top, bottom, width, height, v: parseFloat(p.style.getPropertyValue('--v')) }; }),
}));

/** The pixels of the middle row of the bar of a figure, one for each CSS px from its left. */
async function barRow(page, id) {
  const bar = page.locator(`#${id} .luz-stacked-bar__bar`);
  await bar.scrollIntoViewIfNeeded();
  const png = await bar.screenshot();
  return readRow(page, png, Math.floor(/** @type {{ height: number }} */ (await bar.boundingBox()).height / 2));
}

/** The length a token is in px: the page resolves it. */
const lengthOf = (page, id, token) => hostOf(page, id).evaluate((el, t) => {
  const probe = document.createElement('div');
  probe.style.cssText = `position:absolute;visibility:hidden;inline-size:var(${t})`;
  el.append(probe);
  const width = probe.getBoundingClientRect().width;
  probe.remove();
  return width;
}, token);

test.describe('stacked bar: the legend is the data, and the bar is a picture', () => {
  test('a figure with a caption, a bar of one part for each share, and a legend of one item for each part, in the same order', async ({ page }) => {
    await open(page);
    const figures = await page.locator('figure.luz-stacked-bar').evaluateAll((all) => all.map((fig) => ({
      id: fig.id,
      caption: fig.querySelector(':scope > figcaption')?.textContent?.trim(),
      bar: fig.querySelector(':scope > .luz-stacked-bar__bar')?.getAttribute('aria-hidden'),
      parts: fig.querySelectorAll(':scope > .luz-stacked-bar__bar > .luz-stacked-bar__part').length,
      items: [...fig.querySelectorAll(':scope > ul.luz-stacked-bar__legend > li.luz-stacked-bar__item')].map((li) => [...li.children].map((c) => `${c.tagName.toLowerCase()}.${c.className}`)),
    })));
    expect(figures.map((f) => f.id)).toEqual(['base', 'six', 'own', 'five', 'long']);
    for (const f of figures) {
      expect(f.caption, `#${f.id}`).toBeTruthy();
      expect(f.bar, `#${f.id}: the bar is a picture`).toBe('true');
      expect(f.items.length, `#${f.id}: an item for each part`).toBe(f.parts);
      for (const kids of f.items) expect(kids, `#${f.id}`).toEqual(['span.luz-stacked-bar__name', 'span.luz-stacked-bar__figure']);
    }
  });

  test('a reader gets the caption, then every name and figure in the order of the parts, and nothing from the picture', async ({ page }) => {
    await open(page);
    await expect(page.locator('#six')).toHaveAccessibleName('Parcels by status, six series');
    const snapshot = await page.locator('#six').ariaSnapshot();
    const order = ['Delivered', '62 %', 'In transit', '21 %', 'At depot', '9 %', 'Delayed', '5 %', 'Returned', '2 %', 'Lost', '1 %'];
    let at = -1;
    for (const word of order) {
      const next = snapshot.indexOf(word, at + 1);
      expect(next, `${word} is in the tree after the one before`).toBeGreaterThan(at);
      at = next;
    }
    await expect(page.locator('#six').getByRole('listitem')).toHaveCount(6);
    await expect(page.locator('#six .luz-stacked-bar__bar')).toHaveAttribute('aria-hidden', 'true');
  });

  test('the name and the figure of every item are real text, and no figure is drawn by CSS', async ({ page }) => {
    await open(page);
    const items = await page.locator('li.luz-stacked-bar__item').evaluateAll((all) => all.map((li) => ({
      name: li.querySelector('.luz-stacked-bar__name')?.textContent?.trim() ?? '',
      figure: li.querySelector('.luz-stacked-bar__figure')?.textContent?.trim() ?? '',
      after: getComputedStyle(li, '::after').content,
      figureBefore: getComputedStyle(li.querySelector('.luz-stacked-bar__figure'), '::before').content,
    })));
    expect(items.length).toBeGreaterThan(10);
    for (const item of items) {
      expect(item.name.length, 'a name is text').toBeGreaterThan(0);
      expect(item.figure, `the figure of ${item.name}`).toMatch(/\d/);
      expect([item.after, item.figureBefore], item.name).toEqual(['none', 'none']);
    }
  });

  test('the figure is a layout box, not the surface the bare element is: no margin, no padding, no background', async ({ page }) => {
    await open(page);
    const look = await styleOf(page.locator('#base'), ['display', 'margin-block-start', 'margin-inline-start', 'padding-block-start', 'padding-inline-start', 'background-image', 'background-color']);
    expect(look.display).toBe('grid');
    for (const key of ['margin-block-start', 'margin-inline-start', 'padding-block-start', 'padding-inline-start']) expect(look[key], key).toBe('0px');
    expect(look['background-image']).toBe('none');
    expect(look['background-color']).toBe('rgba(0, 0, 0, 0)');
    const legend = await styleOf(page.locator('#base ul'), ['list-style-type', 'padding-inline-start', 'margin-block-start']);
    expect(legend['list-style-type'], 'no bullets').toBe('none');
    expect(legend['padding-inline-start']).toBe('0px');
    expect(legend['margin-block-start']).toBe('0px');
  });

  test('the bar is above the legend, the caption above the bar, and an item puts its name and its figure on one line', async ({ page }) => {
    await open(page);
    const g = await page.locator('#base').evaluate((fig) => {
      const rect = (selector) => { const r = fig.querySelector(selector).getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; };
      return { caption: rect('figcaption'), bar: rect('.luz-stacked-bar__bar'), legend: rect('.luz-stacked-bar__legend'), name: rect('.luz-stacked-bar__name'), figure: rect('.luz-stacked-bar__figure') };
    });
    expect(g.bar.top).toBeGreaterThanOrEqual(g.caption.bottom - EPS);
    expect(g.legend.top).toBeGreaterThanOrEqual(g.bar.bottom - EPS);
    expect(Math.abs(g.name.top - g.figure.top), 'name and figure share a line').toBeLessThan(g.name.bottom - g.name.top);
  });
});

test.describe('stacked bar: the parts', () => {
  test('they fill the bar and share its width by --v, whatever the sum of the values', async ({ page }) => {
    await open(page);
    const { bar, parts } = await partsOf(page, 'base');
    expect(parts.map((p) => p.v)).toEqual([50, 30, 20]);
    const gap = await lengthOf(page, 'base', '--luz-space-3xs');
    expect(gap, 'the gap is a step of the scale').toBeGreaterThan(0);
    const widths = parts.map((p) => p.width);
    expect(widths.reduce((a, b) => a + b, 0) + gap * (parts.length - 1), 'the parts and the gaps are the whole bar').toBeCloseTo(bar.width, 0);
    const sum = widths.reduce((a, b) => a + b, 0);
    for (const [i, p] of parts.entries()) expect(p.width / sum, `part ${i}: ${p.v} of 100`).toBeCloseTo(p.v / 100, 2);
    expect(parts[0].left).toBeCloseTo(bar.left, 0);
    expect(parts.at(-1).right).toBeCloseTo(bar.right, 0);
  });

  test('the same holds for six parts of 62, 21, 9, 5, 2 and 1: each is its share of the sum, and none is smaller than a hairline', async ({ page }) => {
    await open(page);
    const { bar, parts } = await partsOf(page, 'six');
    expect(parts.map((p) => p.v)).toEqual([62, 21, 9, 5, 2, 1]);
    const gap = await lengthOf(page, 'six', '--luz-space-3xs');
    const sum = parts.reduce((a, p) => a + p.width, 0);
    expect(sum + gap * 5).toBeCloseTo(bar.width, 0);
    for (const [i, p] of parts.entries()) {
      expect(p.width / sum, `part ${i}`).toBeCloseTo(p.v / 100, 1);
      expect(p.width, `part ${i} is visible`).toBeGreaterThanOrEqual(gap - EPS);
    }
    // a bigger share is a wider part
    for (let i = 1; i < parts.length; i++) expect(parts[i].width).toBeLessThan(parts[i - 1].width);
  });

  test('the surface shows through the gap between two parts, so they are told apart without colour', async ({ page }) => {
    await open(page);
    const { bar, parts } = await partsOf(page, 'base');
    const surface = await paintOf(page, 'var(--luz-surface-page)', hostOf(page, 'base'));
    const row = await barRow(page, 'base');
    const gapAt = Math.round((parts[0].right + parts[1].left) / 2 - bar.left);
    expect(parts[1].left - parts[0].right, 'a gap').toBeGreaterThan(0);
    expect(near(row[gapAt], surface, 12), 'the gap is the surface of the page').toBe(true);
  });

  test('the series take --luz-chart-1 to -6 in the order of the markup, in the bar and in the marks of the legend', async ({ page }) => {
    await open(page);
    const { bar, parts } = await partsOf(page, 'six');
    const row = await barRow(page, 'six');
    for (let n = 1; n <= 6; n++) {
      const series = await paintOf(page, `var(--luz-chart-${n})`, hostOf(page, 'six'));
      const part = parts[n - 1];
      expect(near(row[Math.round((part.left + part.right) / 2 - bar.left)], series, 3), `part ${n} is --luz-chart-${n}`).toBe(true);
      const mark = await colorOf(page.locator(`#six li.luz-stacked-bar__item:nth-child(${n})`), 'background-color', '::before');
      expect(near(mark, series, 1), `the mark of item ${n} is --luz-chart-${n}`).toBe(true);
    }
  });

  test('--luz-stacked-bar-color sets another series for a part and its item, and --luz-stacked-bar-h sets the height of the bar', async ({ page }) => {
    await open(page);
    const [first, sixth] = await Promise.all([paintOf(page, 'var(--luz-chart-1)', hostOf(page, 'own')), paintOf(page, 'var(--luz-chart-6)', hostOf(page, 'own'))]);
    const { bar, parts } = await partsOf(page, 'own');
    expect(bar.height).toBeCloseTo(48, 0);
    for (const p of parts) expect(p.height).toBeCloseTo(48, 0);
    const row = await barRow(page, 'own');
    expect(near(row[Math.round((parts[0].left + parts[0].right) / 2 - bar.left)], first, 3), 'the first part is --luz-chart-1').toBe(true);
    expect(near(row[Math.round((parts[1].left + parts[1].right) / 2 - bar.left)], sixth, 3), 'the second part is --luz-chart-6, not --luz-chart-2').toBe(true);
    expect(near(await colorOf(page.locator('#own li').nth(1), 'background-color', '::before'), sixth, 1), 'its item has the same colour').toBe(true);
    expect(near(await colorOf(page.locator('#own li').nth(0), 'background-color', '::before'), first, 1)).toBe(true);
    // the default height is not 0
    expect((await partsOf(page, 'base')).bar.height).toBeGreaterThan(4);
  });

  test('the name is the secondary text colour in the mono face, and the figure keeps the numbers the same width', async ({ page }) => {
    await open(page);
    const secondary = await paintOf(page, 'var(--luz-text-secondary)', hostOf(page, 'base'));
    expect(near(await colorOf(page.locator('#base .luz-stacked-bar__name').first()), secondary, 1)).toBe(true);
    const figure = await styleOf(page.locator('#base .luz-stacked-bar__figure').first(), ['font-variant-numeric']);
    expect(figure['font-variant-numeric']).toContain('tabular-nums');
  });
});

test.describe('stacked bar: the text', () => {
  for (const mode of MODES) {
    test(`the name and the figure are 4.5:1 or more on the surface in ${mode}`, async ({ page }) => {
      await open(page, { mode });
      const surface = await paintOf(page, 'var(--luz-surface-page)', hostOf(page, 'six'));
      for (const selector of ['#six .luz-stacked-bar__name', '#six .luz-stacked-bar__figure', '#six figcaption']) {
        const all = page.locator(selector);
        for (let i = 0; i < (await all.count()); i++) expect(ratio(await colorOf(all.nth(i)), surface), `${selector} ${i}`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});

test.describe('stacked bar: narrow windows', () => {
  test('at 320px nothing scrolls sideways, the bar and the legend stay in the window, and a long legend wraps', async ({ page }) => {
    await open(page, { width: 320 });
    expect(await sideways(page)).toBeLessThanOrEqual(0);
    for (const id of ['base', 'six', 'own', 'five', 'long']) {
      const b = await hostOf(page, id).boundingBox();
      expect(/** @type {any} */ (b).x, `#${id}`).toBeGreaterThanOrEqual(-EPS);
      expect(/** @type {any} */ (b).x + /** @type {any} */ (b).width, `#${id}`).toBeLessThanOrEqual(320 + EPS);
    }
    const tops = await page.locator('#long .luz-stacked-bar__item').evaluateAll((all) => all.map((li) => Math.round(li.getBoundingClientRect().top)));
    expect(new Set(tops).size, 'the items are on more than one line').toBeGreaterThan(1);
    const names = await page.locator('#long .luz-stacked-bar__item').evaluateAll((all) => all.map((li) => li.scrollWidth <= li.clientWidth + 1));
    expect(names, 'no item is cut').toEqual([true, true, true]);
  });

  test('at 200% text nothing scrolls sideways', async ({ page }) => {
    await open(page);
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    expect(await sideways(page)).toBeLessThanOrEqual(0);
  });
});

test.describe('stacked bar: right to left', () => {
  test('the first part is at the right, and the legend starts at the right', async ({ page }) => {
    await open(page, { dir: 'rtl' });
    const { bar, parts } = await partsOf(page, 'base');
    expect(parts[0].right, 'the first part ends at the right of the bar').toBeCloseTo(bar.right, 0);
    expect(parts[1].right).toBeLessThan(parts[0].left + EPS);
    const first = /** @type {{ x: number }} */ (await page.locator('#base li').nth(0).boundingBox());
    const second = /** @type {{ x: number }} */ (await page.locator('#base li').nth(1).boundingBox());
    expect(first.x, 'the first item is at the right of the second').toBeGreaterThan(second.x);
    expect(await sideways(page)).toBeLessThanOrEqual(0);
  });
});

test.describe('stacked bar: forced colors', () => {
  /** The pixels near `edge` in a box of a screenshot: the digit, the ink of a number. */
  async function ink(page, locator, left, right, edge) {
    await locator.scrollIntoViewIfNeeded();
    const png = await locator.screenshot();
    const height = Math.round(/** @type {{ height: number }} */ (await locator.boundingBox()).height);
    let count = 0;
    for (let y = 2; y < height - 2; y++) {
      const row = await readRow(page, png, y);
      count += row.slice(left + 2, right - 2).filter((p) => near(p, edge, 40)).length;
    }
    return count;
  }

  test('a part is Canvas with a 1px edge in CanvasText and the number of its item, and the mark of the item shows the same number', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await open(page);
    const [canvas, edge] = await Promise.all([paintOf(page, 'Canvas', hostOf(page, 'five')), paintOf(page, 'CanvasText', hostOf(page, 'five'))]);
    const part = page.locator('#five .luz-stacked-bar__part');
    const item = page.locator('#five .luz-stacked-bar__item');
    for (let n = 0; n < 5; n++) {
      const look = await styleOf(part.nth(n), ['border-top-width', 'border-top-style', 'border-top-color', 'background-color']);
      expect(look['border-top-width'], `part ${n + 1}`).toBe('1px');
      expect(look['border-top-style']).toBe('solid');
      expect(near((look['border-top-color'].match(/[\d.]+/g) ?? []).slice(0, 3).map(Number), edge, 1), 'its edge is CanvasText').toBe(true);
      expect(near((look['background-color'].match(/[\d.]+/g) ?? []).slice(0, 3).map(Number), canvas, 1), 'it is Canvas, not a series colour').toBe(true);
      const mark = await styleOf(item.nth(n), ['border-top-width', 'background-color', 'content'], '::before');
      expect(mark['border-top-width'], `the mark of item ${n + 1}`).toBe('1px');
      expect(near((mark['background-color'].match(/[\d.]+/g) ?? []).slice(0, 3).map(Number), canvas, 1)).toBe(true);
      expect(mark.content, 'the mark says a number').not.toMatch(/^(?:none|normal|""|)$/);
      expect((await styleOf(part.nth(n), ['content'], '::before')).content, 'the part says the same').toBe(mark.content);
      expect((await styleOf(part.nth(n), ['counter-increment']))['counter-increment'], 'and counts the same way').toBe((await styleOf(item.nth(n), ['counter-increment'], '::before'))['counter-increment']);
    }
    // the digits are drawn: ink in the part, and in the mark of its item
    const { bar, parts } = await partsOf(page, 'five');
    const barBox = page.locator('#five .luz-stacked-bar__bar');
    for (const [n, p] of parts.entries()) {
      expect(await ink(page, barBox, Math.round(p.left - bar.left), Math.round(p.right - bar.left), edge), `part ${n + 1} shows its number`).toBeGreaterThan(0);
    }
    const mark = await item.first().evaluate((li) => parseFloat(getComputedStyle(li, '::before').width));
    expect(await ink(page, item.first(), 0, Math.round(mark), edge), 'the mark of the first item shows its number').toBeGreaterThan(0);
  });

  test('the information is not in the colour: the legend is text, with the names and the figures', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await open(page);
    expect(await page.locator('#base .luz-stacked-bar__figure').allInnerTexts()).toEqual(['50 %', '30 %', '20 %']);
    expect(await page.locator('#base .luz-stacked-bar__name').allInnerTexts()).toEqual(['Delivered', 'In transit', 'At depot']);
  });

  test('the bar of a forced-colors page has the same parts in the same widths', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await open(page);
    const { parts } = await partsOf(page, 'base');
    const sum = parts.reduce((a, p) => a + p.width, 0);
    for (const p of parts) expect(p.width / sum).toBeCloseTo(p.v / 100, 2);
  });
});

test.describe('stacked bar: axe', () => {
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

test.describe('stacked bar: no script', () => {
  test('it needs none: the fixture has no script, links the sheet of catalog after luz.css, and no sheet of core but luz.css, and the bar is drawn', async ({ page }) => {
    const source = readFileSync(new URL('./fixtures/stacked-bar.html', import.meta.url), 'utf-8');
    expect(source).not.toMatch(/<script/i);
    const links = [...source.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
    expect(links.indexOf('/packages/catalog/dist/components/stacked-bar.css')).toBe(links.indexOf('/packages/core/dist/luz.css') + 1);
    expect(links.filter((href) => href.startsWith('/packages/core/')), 'core has no sheet of it').toEqual(['/packages/core/dist/luz.css']);
    await open(page);
    const { bar, parts } = await partsOf(page, 'base');
    expect(bar.height).toBeGreaterThan(0);
    expect(parts[0].width).toBeGreaterThan(parts[2].width);
  });
});
