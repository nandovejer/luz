// @ts-check
/**
 * `<luz-chart type="column" interactive>` and `<luz-chart type="line" interactive>` of @luz-ds/catalog: the table is the
 * chart, and with `interactive` the script adds a header with a toggle button per series (its name and its total, a sum),
 * a readout of the day under the pointer or the focus, and the keys. What the same tables are without the script is in
 * tests/chart.spec.js (it runs in `chromium-nojs`); the CSS-only column chart is in tests/column-chart.spec.js.
 *
 * tests/fixtures/chart-interactive.html, loading the real loader, catalog.min.js. `?only=<case>` keeps one section.
 * Needs JavaScript: it runs in `chromium` only (a spec that runs without it is in chart.spec.js).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

import { MODES } from './helpers/design-tokens.js';
import { paintOf } from './helpers/pixels.js';
import { sideways } from './helpers/chart-probes.js';
import { settled } from './helpers/settle.js';

const PAGE = '/tests/fixtures/chart-interactive.html';
const only = (name) => `${PAGE}?only=${name}`;
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
/** Sub-pixel rounding of a box. */
const EPS = 1.5;

/** The figures of the fixture: Desktop of Apr 4 says "380 (peak)" in its text and 380 in its value. */
const DAYS = ['Apr 1', 'Apr 2', 'Apr 3', 'Apr 4', 'Apr 5', 'Apr 6', 'Apr 7'];
const DESKTOP = [252, 271, 182, 380, 194, 191, 179];
const MOBILE = [148, 276, 128, 247, 203, 74, 98];
const DESKTOP_TEXT = DESKTOP.map((n, i) => (i === 3 ? '380 (peak)' : String(n)));
/** What a screen reader says of a row: the name of the day, then every series with the text of its cell. */
const LABELS = DAYS.map((day, i) => `${day}, Desktop ${DESKTOP_TEXT[i]}, Mobile ${MOBILE[i]}`);
const sum = (list) => list.reduce((a, b) => a + b, 0);

const KINDS = [
  { kind: 'column', id: 'column' },
  { kind: 'line', id: 'line' },
];

test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript: the state without it is in chart.spec.js');

/** Open a case of the fixture and wait until its chart is drawn. */
async function open(page, name, id = name, width = 1280) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(only(name));
  await expect.poll(() => page.evaluate(() => !!customElements.get('luz-chart')), { message: 'the loader defines <luz-chart>' }).toBe(true);
  await expect(page.locator(`#${id}`)).toHaveAttribute('data-luz-ready', '');
}

const rgb = (text) => (text.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
const boxOf = (locator) => locator.evaluate((el) => {
  const b = el.getBoundingClientRect();
  return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, width: b.width, height: b.height };
});
const focusedRow = (page, host) => host.locator('tbody tr').evaluateAll((rows) => rows.indexOf(/** @type {any} */ (document.activeElement)));
/** The number of `keydown` listeners the page has on `document` (see the init script of the tests that read it). */
const documentKeydowns = (page) => page.evaluate(() => /** @type {any} */ (window).__documentKeydown());

for (const { kind, id } of KINDS) {
  test.describe(`${kind} chart, interactive`, () => {
    test.beforeEach(async ({ page }) => {
      await open(page, kind, id);
    });

    test('the header has a toggle button per series, with aria-pressed, its name and the sum of its figures; the picker has no role', async ({ page }) => {
      const host = page.locator(`#${id}`);
      const picker = host.locator('.luz-chart__picker');
      await expect(picker).toHaveCount(1);
      expect(await picker.getAttribute('role'), 'the picker is no tablist, group or toolbar').toBeNull();
      const buttons = picker.locator('button');
      await expect(buttons).toHaveCount(2);
      for (const button of await buttons.all()) {
        expect(await button.evaluate((el) => [el.localName, el.getAttribute('type'), el.getAttribute('role')]), 'a native button').toEqual(['button', 'button', null]);
        await expect(button).toHaveAttribute('aria-pressed', 'true');
      }
      const total = (list) => new Intl.NumberFormat('en').format(sum(list));
      expect(total(DESKTOP)).toBe('1,649');
      await expect(buttons.nth(0)).toHaveAccessibleName(new RegExp(`^Desktop\\s*${total(DESKTOP)}$`));
      await expect(buttons.nth(1)).toHaveAccessibleName(new RegExp(`^Mobile\\s*${total(MOBILE)}$`));
    });

    test('the caption is the title of the chart, and the table is still named by it', async ({ page }) => {
      const host = page.locator(`#${id}`);
      const caption = (await host.locator('caption').textContent())?.trim() ?? '';
      expect(caption).toMatch(/^Visitors per day, April 1 to 7/);
      await expect(host.locator('.luz-chart__title')).toHaveText(caption);
      await expect(host.getByRole('table', { name: caption })).toHaveCount(1);
    });

    test('turning a series off sets data-luz-off on its cells, which stay in the accessibility tree; turning it on takes it off', async ({ page }) => {
      const host = page.locator(`#${id}`);
      const mobile = host.locator('.luz-chart__pick').nth(1);
      await mobile.click();
      await expect(mobile).toHaveAttribute('aria-pressed', 'false');
      const off = await host.locator('[data-luz-off]').evaluateAll((cells) => cells.map((c) => [c.localName, /** @type {any} */ (c).cellIndex]));
      expect(off, 'the head cell and the seven cells of the second series, and no other').toEqual([['th', 2], ...DAYS.map(() => ['td', 2])]);
      // clipped, not removed: a reader still gets every figure
      await expect(host.getByRole('columnheader')).toHaveText(['Day', 'Desktop', 'Mobile']);
      await expect(host.getByRole('cell')).toHaveCount(14);
      await expect(host.getByRole('cell', { name: '148' })).toHaveCount(1);
      await mobile.click();
      await expect(mobile).toHaveAttribute('aria-pressed', 'true');
      await expect(host.locator('[data-luz-off]')).toHaveCount(0);
    });

    test('the last series still on cannot be turned off: the click changes nothing', async ({ page }) => {
      const host = page.locator(`#${id}`);
      const [desktop, mobile] = [host.locator('.luz-chart__pick').nth(0), host.locator('.luz-chart__pick').nth(1)];
      await mobile.click();
      await desktop.click();
      await expect(desktop).toHaveAttribute('aria-pressed', 'true');
      await expect(mobile).toHaveAttribute('aria-pressed', 'false');
      await expect(host.locator('tr > :nth-child(2)[data-luz-off]'), 'no cell of the series that stays is turned off').toHaveCount(0);
      await expect(host.locator('tr > :nth-child(3)[data-luz-off]')).toHaveCount(8);
      // the same from the other side, and from the keyboard (a native button: Enter and Space press it)
      await mobile.focus();
      await page.keyboard.press('Enter');
      await expect(mobile).toHaveAttribute('aria-pressed', 'true');
      await desktop.focus();
      await page.keyboard.press('Space');
      await expect(desktop).toHaveAttribute('aria-pressed', 'false');
      await mobile.focus();
      await page.keyboard.press('Space');
      await expect(mobile).toHaveAttribute('aria-pressed', 'true');
      await expect(host.locator('tr > :nth-child(3)[data-luz-off]')).toHaveCount(0);
    });

    test('the rows are one Tab stop: Tab reaches the first row, Tab again leaves the chart, and the arrows, Home and End move between them', async ({ page }) => {
      const host = page.locator(`#${id}`);
      const rows = host.locator('tbody tr');
      await expect(rows).toHaveCount(7);
      expect(await rows.evaluateAll((all) => all.filter((r) => /** @type {any} */ (r).tabIndex === 0).length), 'one row is in the Tab order').toBe(1);
      await host.locator('.luz-chart__pick').last().focus();
      await page.keyboard.press('Tab');
      await expect(rows.nth(0), 'the table\'s frame is no Tab stop between the header and the rows').toBeFocused();
      await page.keyboard.press('ArrowRight');
      expect(await focusedRow(page, host)).toBe(1);
      expect(await rows.evaluateAll((all) => all.map((r) => /** @type {any} */ (r).tabIndex)), 'the Tab stop moves with the focus').toEqual([-1, 0, -1, -1, -1, -1, -1]);
      await page.keyboard.press('ArrowDown');
      expect(await focusedRow(page, host)).toBe(2);
      await page.keyboard.press('ArrowUp');
      expect(await focusedRow(page, host)).toBe(1);
      await page.keyboard.press('End');
      expect(await focusedRow(page, host)).toBe(6);
      await page.keyboard.press('Home');
      expect(await focusedRow(page, host)).toBe(0);
      await page.keyboard.press('ArrowLeft');
      expect(await focusedRow(page, host), 'Left goes back (the page is left to right)').toBe(0);
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      expect(await focusedRow(page, host)).toBe(2);
      await page.keyboard.press('ArrowLeft');
      expect(await focusedRow(page, host)).toBe(1);
      await page.keyboard.press('Tab');
      await expect(page.locator('#after'), 'the next Tab leaves the chart').toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await expect(rows.nth(1), 'Shift+Tab comes back to the row that was the Tab stop').toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await expect(host.locator('.luz-chart__pick').last()).toBeFocused();
    });

    test('every row is named by its own cells, every series, on or off: "Apr 1, Desktop 252, Mobile 148"', async ({ page }) => {
      const host = page.locator(`#${id}`);
      const rows = host.locator('tbody tr');
      expect(await rows.evaluateAll((all) => all.map((r) => r.getAttribute('aria-label')))).toEqual(LABELS);
      await expect(host.getByRole('row', { name: 'Apr 4, Desktop 380 (peak), Mobile 247' }), 'from the text of the cells, not their values').toHaveCount(1);
      await host.locator('.luz-chart__pick').nth(1).click();
      expect(await rows.evaluateAll((all) => all.map((r) => r.getAttribute('aria-label'))), 'a series turned off is still said').toEqual(LABELS);
    });

    test('the script writes the roles of the table: table, rowgroup, row, columnheader, rowheader and cell', async ({ page }) => {
      const roles = await page.locator(`#${id} table`).evaluate((table) => ({
        table: table.getAttribute('role'),
        groups: [...table.children].filter((c) => /^t(head|body|foot)$/.test(c.localName)).map((c) => c.getAttribute('role')),
        rows: [...table.rows].map((r) => r.getAttribute('role')),
        heads: [...table.querySelectorAll('th')].map((c) => [c.getAttribute('scope'), c.getAttribute('role')]),
        cells: [...table.querySelectorAll('td')].map((c) => c.getAttribute('role')),
      }));
      expect(roles.table).toBe('table');
      expect(roles.groups).toEqual(['rowgroup', 'rowgroup']);
      expect(new Set(roles.rows)).toEqual(new Set(['row']));
      expect(roles.heads.filter(([scope]) => scope === 'col').map(([, role]) => role)).toEqual(['columnheader', 'columnheader', 'columnheader']);
      expect(roles.heads.filter(([scope]) => scope === 'row').map(([, role]) => role)).toEqual(DAYS.map(() => 'rowheader'));
      expect(new Set(roles.cells)).toEqual(new Set(['cell']));
      expect(roles.cells).toHaveLength(14);
    });

    test('the focused row shows a readout of its day: aria-hidden, beside the day and not over it, in the chart', async ({ page }) => {
      const host = page.locator(`#${id}`);
      const readout = host.locator('.luz-chart__readout');
      await expect(readout, 'nothing before a day is pointed at or focused').toBeHidden();
      await host.locator('.luz-chart__pick').last().focus();
      await page.keyboard.press('Tab');
      await expect(readout).toBeVisible();
      expect(await readout.getAttribute('aria-hidden')).toBe('true');
      await expect(readout).toContainText('Apr 1');
      await expect(readout).toContainText('Desktop');
      await expect(readout).toContainText('252');
      await expect(readout).toContainText('Mobile');
      await expect(readout).toContainText('148');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      await expect(readout).toContainText('Apr 4');
      await expect(readout).toContainText('380 (peak)');
      await expect(readout).not.toContainText('Apr 1');
      const rows = host.locator('tbody tr');
      expect(await rows.evaluateAll((all) => all.map((r) => r.hasAttribute('data-luz-active'))), 'only the day that has the focus is active').toEqual([false, false, false, true, false, false, false]);
      const [r, hostBox, day] = [await boxOf(readout), await boxOf(host), await boxOf(kind === 'column' ? rows.nth(3) : host.locator('.luz-chart__band'))];
      expect(r.left >= day.right - EPS || r.right <= day.left + EPS, 'the readout is beside the day, never over it (WCAG 2.4.11)').toBe(true);
      expect(r.left, 'inside the chart, at the start').toBeGreaterThanOrEqual(hostBox.left - EPS);
      expect(r.right, 'inside the chart, at the end').toBeLessThanOrEqual(hostBox.right + EPS);
    });

    test('Escape puts the readout away and takes the band off while the focus stays in the row, with no preventDefault; another row brings it back', async ({ page }) => {
      const host = page.locator(`#${id}`);
      const rows = host.locator('tbody tr');
      const readout = host.locator('.luz-chart__readout');
      const band = kind === 'line' ? host.locator('rect.luz-chart__band') : host.locator('tbody tr[data-luz-active]');
      await rows.nth(1).focus();
      await expect(readout).toBeVisible();
      await expect(band).toHaveCount(1);
      await page.keyboard.press('Escape');
      await expect(readout).toBeHidden();
      await expect(band, 'no band, no active day').toHaveCount(0);
      await expect(host.locator('[data-luz-active]')).toHaveCount(0);
      await expect(rows.nth(1), 'the focus stays').toBeFocused();
      await page.keyboard.press('ArrowRight');
      await expect(readout, 'it comes back on another row').toBeVisible();
      await expect(readout).toContainText('Apr 3');
      await expect(band).toHaveCount(1);
      // the keydown is not cancelled: an Escape that closes a dialog around the chart still does
      const prevented = await rows.nth(2).evaluate((row) => {
        const event = new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
        row.dispatchEvent(event);
        return event.defaultPrevented;
      });
      expect(prevented).toBe(false);
      await expect(readout, 'the dispatched Escape was heard too').toBeHidden();
    });

    test('Escape is heard wherever the focus is while the readout shows: the pointer on a day, then Escape, hides it; the same day does not bring it back, another does', async ({ page }) => {
      const host = page.locator(`#${id}`);
      const readout = host.locator('.luz-chart__readout');
      // The place of two days: a row of the table for the columns, the name of the day on the axis for the plot of a line
      const rows = host.locator('tbody tr');
      const points = kind === 'column'
        ? await Promise.all([0, 2].map(async (i) => {
          const b = await boxOf(rows.nth(i));
          return { name: DAYS[i], x: b.left + b.width / 2, y: b.top + b.height / 2 };
        }))
        : await (async () => {
          const plot = await boxOf(host.locator('.luz-chart__plot'));
          const ticks = await host.locator('.luz-chart__tick').evaluateAll((all) => all.map((t) => {
            const b = t.getBoundingClientRect();
            return { name: (t.textContent ?? '').trim(), x: b.left + b.width / 2 };
          }));
          return ticks.filter((t) => /^Apr \d$/.test(t.name)).slice(0, 2).map((t) => ({ ...t, y: plot.top + plot.height / 2 }));
        })();
      expect(points).toHaveLength(2);
      await page.mouse.move(points[0].x, points[0].y);
      await expect(readout).toBeVisible();
      await expect(readout).toContainText(points[0].name);
      await page.keyboard.press('Escape');
      await expect(readout).toBeHidden();
      await page.mouse.move(points[0].x + 1, points[0].y);
      await expect(readout, 'the pointer is on the same day: it stays away').toBeHidden();
      await page.mouse.move(points[1].x, points[1].y);
      await expect(readout, 'another day brings it back').toBeVisible();
      await expect(readout).toContainText(points[1].name);
    });

    test('the pointer on a day shows its readout and a band; moving off hides them', async ({ page }) => {
      const host = page.locator(`#${id}`);
      const readout = host.locator('.luz-chart__readout');
      if (kind === 'column') {
        const row = host.locator('tbody tr').nth(2);
        await row.hover();
        await expect(readout).toBeVisible();
        await expect(readout).toContainText('Apr 3');
        await expect(readout).toContainText('182');
        await expect(row).toHaveAttribute('data-luz-active', '');
        // a light band over the day: the hover surface; the others have none, and there is no track behind the columns
        const surface = await paintOf(page, 'var(--luz-surface-hover)', host);
        expect(rgb(await row.evaluate((el) => getComputedStyle(el).backgroundColor))).toEqual(surface);
        expect(await host.locator('tbody tr').nth(0).evaluate((el) => getComputedStyle(el).backgroundColor), 'the other days have no band').toBe('rgba(0, 0, 0, 0)');
        expect(await host.locator('table').evaluate((el) => getComputedStyle(el).getPropertyValue('--luz-column-chart-track').trim()), 'no track').toBe('transparent');
      } else {
        // a day is the share of the plot around the place of its name on the axis
        const plot = host.locator('.luz-chart__plot');
        const ticks = await host.locator('.luz-chart__tick').evaluateAll((all) => all.map((t) => {
          const b = t.getBoundingClientRect();
          return { text: (t.textContent ?? '').trim(), x: b.left + b.width / 2 };
        }));
        const days = ticks.filter((t) => /^Apr \d$/.test(t.text));
        expect(days.length, 'the plot names some of its days').toBeGreaterThanOrEqual(2);
        const plotBox = await boxOf(plot);
        for (const day of days) {
          await page.mouse.move(day.x, plotBox.top + plotBox.height / 2);
          await expect(readout, day.text).toContainText(day.text);
          const index = DAYS.indexOf(day.text);
          expect(await host.locator('tbody tr').evaluateAll((all) => all.findIndex((r) => r.hasAttribute('data-luz-active'))), day.text).toBe(index);
          // the band is a rect of the plot, behind the lines, centred on the day
          const band = host.locator('rect.luz-chart__band');
          await expect(band).toHaveCount(1);
          const b = await boxOf(band);
          expect(b.left - EPS <= day.x && day.x <= b.right + EPS, `${day.text}: the band is over its day`).toBe(true);
          expect(await band.evaluate((rect) => {
            const line = rect.ownerSVGElement?.querySelector('.luz-chart__line');
            return !!line && !!(rect.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING);
          }), `${day.text}: the band is behind the lines`).toBe(true);
          const surface = await paintOf(page, 'var(--luz-surface-hover)', host);
          expect(rgb(await band.evaluate((rect) => getComputedStyle(rect).fill))).toEqual(surface);
        }
      }
      await page.mouse.move(0, 0);
      await expect(readout).toBeHidden();
      await expect(host.locator('[data-luz-active]')).toHaveCount(0);
      if (kind === 'line') await expect(host.locator('rect.luz-chart__band')).toHaveCount(0);
    });

    test('the keydown listener on document exists only while the readout shows', async ({ page }) => {
      await page.addInitScript(() => {
        const live = new Set();
        const proto = window.EventTarget.prototype;
        const add = proto.addEventListener;
        const remove = proto.removeEventListener;
        proto.addEventListener = function (type, fn, ...rest) {
          if (this === document && type === 'keydown') live.add(fn);
          return add.call(this, type, fn, ...rest);
        };
        proto.removeEventListener = function (type, fn, ...rest) {
          if (this === document && type === 'keydown') live.delete(fn);
          return remove.call(this, type, fn, ...rest);
        };
        /** @type {any} */ (window).__documentKeydown = () => live.size;
      });
      await open(page, kind, id);
      const host = page.locator(`#${id}`);
      const rows = host.locator('tbody tr');
      const readout = host.locator('.luz-chart__readout');
      const before = await documentKeydowns(page);
      await rows.nth(0).focus();
      await expect(readout).toBeVisible();
      expect(await documentKeydowns(page), 'listening while it shows').toBe(before + 1);
      await page.keyboard.press('Escape');
      await expect(readout).toBeHidden();
      expect(await documentKeydowns(page), 'not once it is away').toBe(before);
      await page.keyboard.press('ArrowRight');
      await expect(readout).toBeVisible();
      expect(await documentKeydowns(page)).toBe(before + 1);
      await page.keyboard.press('Tab');
      await expect(readout).toBeHidden();
      await expect.poll(() => documentKeydowns(page), { message: 'not once the focus has left' }).toBe(before);
    });

    test('style: the header and the title are in the sans, the hairlines are thin, and the names of the days sit above the bands', async ({ page }) => {
      const host = page.locator(`#${id}`);
      const sans = await host.evaluate((el) => {
        const probe = document.createElement('span');
        probe.style.fontFamily = 'var(--luz-font-sans)';
        el.append(probe);
        const family = getComputedStyle(probe).fontFamily;
        probe.remove();
        return family;
      });
      expect(sans.length).toBeGreaterThan(0);
      for (const selector of ['.luz-chart__pick', '.luz-chart__title']) {
        expect(await host.locator(selector).first().evaluate((el) => getComputedStyle(el).fontFamily), selector).toBe(sans);
      }
      const hairline = await host.locator('.luz-chart__picker').evaluate((el) => getComputedStyle(el).borderBlockEndWidth);
      expect(hairline, 'thin is a hairline').toBe('1px');
      expect(await host.locator('.luz-chart__pick').nth(1).evaluate((el) => getComputedStyle(el).borderInlineStartWidth), 'between two buttons').toBe('1px');
      if (kind === 'column') {
        const raised = await host.evaluate((el) => getComputedStyle(el).getPropertyValue('--luz-z-raised').trim());
        expect(raised).toMatch(/^\d+$/);
        expect(await host.locator('tbody th').first().evaluate((el) => getComputedStyle(el).zIndex), 'a name is raised above the bands').toBe(raised);
      }
    });
  });
}

test.describe('column chart, interactive: its own layout', () => {
  test('the table is fixed, the rows share its width and the columns are drawn with no track, whatever the number of days', async ({ page }) => {
    await open(page, 'column28', 'column28', 320);
    const host = page.locator('#column28');
    expect(await host.locator('table').evaluate((el) => [getComputedStyle(el).tableLayout, el.classList.contains('luz-column-chart')])).toEqual(['fixed', true]);
    const rows = await host.locator('tbody tr').evaluateAll((all) => all.map((r) => r.getBoundingClientRect().width));
    expect(rows).toHaveLength(28);
    expect(Math.max(...rows) - Math.min(...rows), 'the rows are as wide as each other').toBeLessThanOrEqual(EPS);
    const cells = await host.locator('tbody td').evaluateAll((all) => all.map((c) => c.getBoundingClientRect().width));
    expect(Math.min(...cells), 'at 320 px every column still has a width').toBeGreaterThanOrEqual(2);
  });

  for (const width of [320, 360, 768]) {
    test(`at ${width}px nothing scrolls sideways, and only the names of the days that fit are shown`, async ({ page }) => {
      await open(page, 'column28', 'column28', width);
      const host = page.locator('#column28');
      expect(await sideways(page), 'the page').toBeLessThanOrEqual(0);
      const wrap = await host.locator('.luz-table-wrap').evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
      expect(wrap.scroll, 'the frame of the table').toBeLessThanOrEqual(wrap.client + 1);
      const table = await boxOf(host.locator('table'));
      expect(table.right, 'the table is inside the window').toBeLessThanOrEqual(width + EPS);
      const names = await host.locator('tbody th').evaluateAll((all) => all.map((th) => {
        const range = document.createRange();
        range.selectNodeContents(th);
        const r = range.getBoundingClientRect();
        return { shown: th.hasAttribute('data-luz-tick'), clipped: getComputedStyle(th).clipPath !== 'none', left: r.left, right: r.right };
      }));
      const shown = names.filter((n) => n.shown);
      expect(shown.length, 'some names are shown').toBeGreaterThanOrEqual(2);
      expect(shown.length, 'not all of them: they do not fit').toBeLessThan(names.length);
      for (const n of names.filter((x) => !x.shown)) expect(n.clipped, 'a name that is not shown is clipped').toBe(true);
      for (const n of shown) {
        expect(n.clipped, 'a name that is shown is not clipped').toBe(false);
        expect(n.left, 'inside the table, at the start').toBeGreaterThanOrEqual(table.left - EPS);
        expect(n.right, 'inside the table, at the end').toBeLessThanOrEqual(table.right + EPS);
      }
      shown.sort((a, b) => a.left - b.left);
      for (let i = 1; i < shown.length; i++) expect(shown[i].left, 'two names never touch').toBeGreaterThan(shown[i - 1].right);
      // the days stay in the table for a reader
      await expect(host.getByRole('rowheader')).toHaveCount(28);
    });
  }

  test('--luz-column-chart-bar sets the width of a bar in the interactive chart too, and it is never wider than its column', async ({ page }) => {
    await open(page, 'column', 'column');
    const table = page.locator('#column table');
    const bar = () => table.locator('tbody td').first().evaluate((td) => parseFloat(getComputedStyle(td, '::after').width));
    await table.evaluate((el) => el.style.setProperty('--luz-column-chart-bar', '0.5rem'));
    expect(await bar()).toBeCloseTo(8, 0);
    await table.evaluate((el) => el.style.setProperty('--luz-column-chart-bar', '100rem'));
    const [wide, cell] = [await bar(), await table.locator('tbody td').first().evaluate((td) => td.getBoundingClientRect().width)];
    expect(wide, 'never wider than the column').toBeLessThanOrEqual(cell + 0.5);
  });
});

test.describe('line chart, interactive: the header replaces the legend', () => {
  test.beforeEach(async ({ page }) => {
    await open(page, 'line', 'line');
  });

  test('the legend is gone, the header is there and the Show table / Show chart button is kept', async ({ page }) => {
    const host = page.locator('#line');
    expect(await host.locator('.luz-chart__legend').evaluate((el) => getComputedStyle(el).display)).toBe('none');
    await expect(host.locator('.luz-chart__pick')).toHaveCount(2);
    const toggle = host.getByRole('button', { name: 'Show table' });
    await expect(toggle).toHaveCount(1);
    await toggle.click();
    await expect(host.getByRole('button', { name: 'Show chart' })).toHaveCount(1);
    await expect(host).toHaveAttribute('data-luz-view', 'table');
  });

  test('a line turned off is not drawn, the other keeps its place on the same scale, and the last line shown stays', async ({ page }) => {
    const host = page.locator('#line');
    // the lines of the plot (the legend, hidden here, has a mark of its own for each series)
    const lines = host.locator('.luz-chart__plot .luz-chart__line');
    await expect(lines).toHaveCount(2);
    const first = await lines.nth(0).getAttribute('d');
    const ticks = await host.locator('.luz-chart__tick').allTextContents();
    await host.locator('.luz-chart__pick').nth(1).click();
    await expect(lines).toHaveCount(1);
    await expect(host.locator('.luz-chart__series[data-n="1"]')).toHaveCount(1);
    await expect(host.locator('.luz-chart__series[data-n="2"]')).toHaveCount(0);
    expect(await lines.first().getAttribute('d'), 'the same scale: the other line has not moved').toBe(first);
    expect(await host.locator('.luz-chart__tick').allTextContents(), 'and the same axis').toEqual(ticks);
    await host.locator('.luz-chart__pick').nth(0).click();
    await expect(lines, 'the last line stays').toHaveCount(1);
    await host.locator('.luz-chart__pick').nth(1).click();
    await expect(lines).toHaveCount(2);
  });
});

test.describe('right to left', () => {
  test.beforeEach(async ({ page }) => {
    await open(page, 'rtl', 'column-rtl');
    await expect(page.locator('#line-rtl')).toHaveAttribute('data-luz-ready', '');
  });

  test('the columns follow the page: Left goes to the next day and Right to the previous one', async ({ page }) => {
    const host = page.locator('#column-rtl');
    await host.locator('tbody tr').nth(0).focus();
    await page.keyboard.press('ArrowLeft');
    expect(await focusedRow(page, host)).toBe(1);
    await page.keyboard.press('ArrowLeft');
    expect(await focusedRow(page, host)).toBe(2);
    await page.keyboard.press('ArrowRight');
    expect(await focusedRow(page, host)).toBe(1);
    await page.keyboard.press('ArrowDown');
    expect(await focusedRow(page, host), 'Down is the next day in any direction').toBe(2);
    const first = await boxOf(host.locator('tbody tr').nth(0));
    const second = await boxOf(host.locator('tbody tr').nth(1));
    expect(first.left, 'the first day is at the right').toBeGreaterThan(second.left);
  });

  test('the plot of a line is always left to right: Right goes to the next day, whatever the page', async ({ page }) => {
    const host = page.locator('#line-rtl');
    await host.locator('tbody tr').nth(0).focus();
    await page.keyboard.press('ArrowRight');
    expect(await focusedRow(page, host)).toBe(1);
    await page.keyboard.press('ArrowRight');
    expect(await focusedRow(page, host)).toBe(2);
    await page.keyboard.press('ArrowLeft');
    expect(await focusedRow(page, host)).toBe(1);
    const x = (i) => host.locator('.luz-chart__tick').evaluateAll((all, name) => all.find((t) => t.textContent?.trim() === name)?.getBoundingClientRect().left ?? NaN, `Apr ${i}`);
    const [a, b] = [await x(1), await x(3)];
    if (Number.isFinite(a) && Number.isFinite(b)) expect(a, 'Apr 1 is at the left of Apr 3').toBeLessThan(b);
  });
});

test.describe('the totals are written in the language of the page', () => {
  test('a Spanish page gets its own grouping of 1,649: 1649', async ({ page }) => {
    await open(page, 'spanish', 'column-es');
    const host = page.locator('#column-es');
    const total = new Intl.NumberFormat('es').format(sum(DESKTOP));
    expect(total, 'es groups from five digits').not.toContain(',');
    await expect(host.locator('.luz-chart__pick').nth(0)).toContainText(total);
    await expect(host.locator('.luz-chart__pick').nth(0)).not.toContainText('1,649');
  });
});

test.describe('forced colors', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
  });

  test('column: the band of a day is a dashed outline, and the columns have no edge', async ({ page }) => {
    await open(page, 'column', 'column');
    const host = page.locator('#column');
    const row = host.locator('tbody tr').nth(2);
    await row.hover();
    await expect(row).toHaveAttribute('data-luz-active', '');
    const text = await paintOf(page, 'CanvasText', host);
    const outline = await row.evaluate((el) => {
      const s = getComputedStyle(el);
      return { style: s.outlineStyle, width: s.outlineWidth, color: s.outlineColor };
    });
    expect(outline.style, 'a dashed edge, since a background is Canvas here').toBe('dashed');
    expect(parseFloat(outline.width)).toBeGreaterThanOrEqual(1);
    expect(rgb(outline.color)).toEqual(text);
    const edge = await host.locator('tbody td').first().evaluate((td) => getComputedStyle(td, '::after').borderTopWidth);
    expect(edge, 'with no track there is nothing to edge: the fill alone').toBe('0px');
  });

  test('line: the band is a dashed outline in the text colour, with no fill', async ({ page }) => {
    await open(page, 'line', 'line');
    const host = page.locator('#line');
    await host.locator('tbody tr').nth(2).focus();
    const band = host.locator('rect.luz-chart__band');
    await expect(band).toHaveCount(1);
    const look = await band.evaluate((rect) => {
      const s = getComputedStyle(rect);
      return { fill: s.fill, stroke: s.stroke, dash: s.strokeDasharray };
    });
    expect(look.fill).toBe('none');
    expect(look.dash).not.toBe('none');
    expect(rgb(look.stroke)).toEqual(await paintOf(page, 'CanvasText', host));
  });
});

test.describe('axe', () => {
  for (const id of ['column', 'line']) {
    for (const mode of MODES) {
      test(`${id}: nothing serious in ${mode}, with a series off and a day shown`, async ({ page }) => {
        await open(page, id, id);
        await page.evaluate((m) => { document.documentElement.dataset.theme = m; }, mode);
        const host = page.locator(`#${id}`);
        await host.locator('.luz-chart__pick').nth(1).click();
        await host.locator('tbody tr').nth(2).focus();
        await expect(host.locator('.luz-chart__readout')).toBeVisible();
        await settled(page);
        const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
        expect(violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? '')).map((v) => v.id)).toEqual([]);
      });
    }
  }

  for (const id of ['column', 'line']) {
    for (const mode of MODES) {
      test(`${id}: nothing serious in ${mode} when the script is blocked`, async ({ page }) => {
        await page.route(/\/(packages|apps)\/.*\.js(\?.*)?$/, (route) => route.abort());
        await page.goto(only(id));
        await page.evaluate((m) => { document.documentElement.dataset.theme = m; }, mode);
        await expect(page.locator('luz-chart [data-luz-off], luz-chart .luz-chart__picker')).toHaveCount(0);
        await settled(page);
        const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
        expect(violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? '')).map((v) => v.id)).toEqual([]);
      });
    }
  }
});
