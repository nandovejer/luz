// @ts-check
/**
 * The disclosure chevron of .luz-accordion: a summary may hold the two glyphs of
 * the Icons page, .luz-accordion__end (closed) and .luz-accordion__down (open).
 * A summary that holds the glyph is a row (text at the inline start, glyph at
 * the inline end) and loses its native marker; only the glyph of the current
 * state shows. A summary without the glyph, and a bare details, keep the native
 * marker: the open/closed cue is never lost (RL-6). It is all CSS, so the
 * fixture has no script and the spec also runs with JavaScript off.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { MODES } from './helpers/design-tokens.js';

const FIXTURE = '/tests/fixtures/accordion-chevron.html';

/** Open the fixture in a colour mode and a direction; motion is reduced so colours are read after the switch of mode. */
async function open(page, { mode = 'light', dir = 'ltr' } = {}) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(FIXTURE);
  await page.evaluate(([m, d]) => {
    document.documentElement.dataset.theme = m;
    document.documentElement.dir = d;
  }, [mode, dir]);
}

/** Computed values of `props` (kebab-case) for the element. */
const read = (page, selector, props) =>
  page.locator(selector).first().evaluate((el, list) => {
    const cs = getComputedStyle(el);
    return Object.fromEntries(list.map((p) => [p, cs.getPropertyValue(p)]));
  }, props);

const value = async (page, selector, prop) => (await read(page, selector, [prop]))[prop];

const END = '#item-1 .luz-accordion__end';
const DOWN = '#item-1 .luz-accordion__down';

/** Bounding boxes of the text and of the glyph of the first item. */
const boxes = (page, glyph) =>
  page.evaluate((g) => {
    const rect = (el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, height: r.height };
    };
    return {
      text: rect(/** @type {Element} */ (document.querySelector('#text-1'))),
      glyph: rect(/** @type {Element} */ (document.querySelector(g))),
      summary: rect(/** @type {Element} */ (document.querySelector('#sum-1'))),
    };
  }, glyph);

test.describe('the chevron of an accordion summary', () => {
  test('closed: the end glyph shows, the down glyph is hidden and the native marker is gone', async ({ page }) => {
    await open(page);
    expect(await value(page, END, 'display')).not.toBe('none');
    expect(await value(page, DOWN, 'display')).toBe('none');
    expect(await value(page, '#sum-1', 'list-style-type')).toBe('none');
    expect(await value(page, '#sum-1', 'display')).toBe('flex');
  });

  test('open: the down glyph shows, the end glyph is hidden, and the row is still one line', async ({ page }) => {
    await open(page);
    await page.locator('#sum-1').click();
    await expect(page.locator('#item-1')).toHaveAttribute('open', '');
    expect(await value(page, DOWN, 'display')).not.toBe('none');
    expect(await value(page, END, 'display')).toBe('none');
    expect(await value(page, '#sum-1', 'list-style-type')).toBe('none');
    const { text, glyph } = await boxes(page, DOWN);
    const mid = (glyph.top + glyph.bottom) / 2;
    expect(mid, 'the glyph is centred on the text line').toBeGreaterThanOrEqual(text.top);
    expect(mid).toBeLessThanOrEqual(text.bottom);
  });

  test('the glyph goes back to the end one when the item closes', async ({ page }) => {
    await open(page);
    await page.locator('#sum-1').click();
    await page.locator('#sum-1').click();
    await expect(page.locator('#item-1')).not.toHaveAttribute('open', '');
    expect(await value(page, END, 'display')).not.toBe('none');
    expect(await value(page, DOWN, 'display')).toBe('none');
  });

  test('left to right: the glyph sits at the right of the text, apart from it, and is not mirrored', async ({ page }) => {
    await open(page, { dir: 'ltr' });
    const { text, glyph, summary } = await boxes(page, END);
    const gap = Number.parseFloat(await page.locator('#sum-1').evaluate((el) => getComputedStyle(el).columnGap));
    expect(gap, 'a gap from the space token').toBeGreaterThan(0);
    expect(glyph.left).toBeGreaterThanOrEqual(text.right + gap);
    expect(summary.right - glyph.right, 'the glyph reaches the inline end of the row').toBeLessThan(summary.right - text.right);
    expect(await value(page, END, 'transform')).toBe('none');
  });

  test('right to left: the glyph sits at the left of the text and is mirrored', async ({ page }) => {
    await open(page, { dir: 'rtl' });
    const { text, glyph, summary } = await boxes(page, END);
    const gap = Number.parseFloat(await page.locator('#sum-1').evaluate((el) => getComputedStyle(el).columnGap));
    expect(gap, 'a gap from the space token').toBeGreaterThan(0);
    expect(glyph.right).toBeLessThanOrEqual(text.left - gap);
    expect(glyph.left - summary.left, 'the glyph reaches the inline end of the row').toBeLessThan(text.left - summary.left);
    expect(await value(page, END, 'transform')).toBe('matrix(-1, 0, 0, 1, 0, 0)');
  });

  for (const mode of MODES) {
    test(`the glyph is drawn in the colour of the summary, closed and open, in ${mode}`, async ({ page }) => {
      await open(page, { mode });
      const summary = await value(page, '#sum-1', 'color');
      expect(await value(page, DOWN, 'display'), 'only the glyph of the state shows').toBe('none');
      expect(await value(page, END, 'stroke')).toBe(summary);
      await page.locator('#sum-1').click();
      expect(await value(page, END, 'display'), 'only the glyph of the state shows').toBe('none');
      expect(await value(page, DOWN, 'stroke')).toBe(summary);
    });
  }

  for (const mode of MODES) {
    test(`axe finds no violation with the chevrons, and the glyphs are not exposed, in ${mode}`, async ({ page }, testInfo) => {
      await open(page, { mode });
      const hidden = await page.locator('#acc svg').evaluateAll((els) => els.map((el) => [el.getAttribute('aria-hidden'), el.getAttribute('focusable')]));
      expect(hidden.length).toBe(6);
      for (const pair of hidden) expect(pair).toEqual(['true', 'false']);
      test.skip(testInfo.project.name === 'chromium-nojs', 'axe needs JavaScript');
      const { violations } = await new AxeBuilder({ page }).include('#page').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    });
  }

  test('forced colors: the glyph keeps a stroke in a system colour', async ({ page }) => {
    await open(page);
    await page.emulateMedia({ forcedColors: 'active' });
    const summary = await value(page, '#sum-1', 'color');
    const stroke = await value(page, END, 'stroke');
    expect(stroke).not.toBe('none');
    expect(stroke).not.toBe('rgba(0, 0, 0, 0)');
    expect(stroke, 'it follows the summary').toBe(summary);
    expect(await value(page, END, 'display')).not.toBe('none');
    expect(await value(page, DOWN, 'display')).toBe('none');
  });
});

test.describe('the glyph of a summary that wraps', () => {
  for (const dir of ['ltr', 'rtl']) {
    test(`${dir}, at 320 px: the glyph of a two-line summary is as wide as that of a one-line one, closed and open`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await open(page, { dir });
      const measure = (id) =>
        page.evaluate((i) => {
          const sum = /** @type {Element} */ (document.querySelector(`#${i}-sum`));
          const visible = /** @type {Element} */ ([...sum.querySelectorAll('svg')].find((el) => getComputedStyle(el).display !== 'none'));
          const g = visible.getBoundingClientRect();
          return { glyph: g.width, glyphHeight: g.height, summary: sum.getBoundingClientRect().height, lineHeight: Number.parseFloat(getComputedStyle(sum).lineHeight) || 0 };
        }, id);
      for (const state of ['closed', 'open']) {
        if (state === 'open') {
          await page.locator('#short-sum').click();
          await page.locator('#long-sum').click();
        }
        const short = await measure('short');
        const long = await measure('long');
        expect(long.summary, `${state}: the long summary wraps onto more than one line`).toBeGreaterThan(short.summary * 1.5);
        expect(long.glyph, `${state}: the glyph of the wrapped summary keeps its width`).toBeCloseTo(short.glyph, 0);
        expect(Math.abs(long.glyph - short.glyph), `${state}: width within 0.5 px`).toBeLessThanOrEqual(0.5);
        expect(Math.abs(long.glyphHeight - short.glyphHeight), `${state}: height within 0.5 px`).toBeLessThanOrEqual(0.5);
      }
    });
  }
});

test.describe('a summary without the glyph keeps its marker', () => {
  for (const id of ['#plain-sum', '#bare-sum']) {
    test(`${id} is not a row and shows its native marker, closed and open`, async ({ page }) => {
      await open(page);
      for (const state of ['closed', 'open']) {
        if (state === 'open') await page.locator(id).click();
        const css = await read(page, id, ['display', 'list-style-type']);
        expect.soft(css.display, `${id} ${state}`).not.toBe('flex');
        expect.soft(['block', 'list-item'], `${id} ${state}`).toContain(css.display);
        expect.soft(css['list-style-type'], `${id} ${state} marker`).not.toBe('none');
      }
    });
  }
});

test.describe('keyboard', () => {
  test('Tab reaches the summary, Enter and Space toggle it, and the focus ring stays on it', async ({ page }) => {
    await open(page);
    await page.keyboard.press('Tab');
    await expect(page.locator('#sum-1')).toBeFocused();
    const ring = await page.locator('#sum-1').evaluate((el) => {
      const cs = getComputedStyle(el);
      const probe = document.createElement('span');
      probe.style.color = 'var(--luz-focus-ring)';
      el.parentElement?.append(probe);
      const expected = getComputedStyle(probe).color;
      probe.remove();
      return { style: cs.outlineStyle, width: cs.outlineWidth, color: cs.outlineColor, expected };
    });
    expect(ring.style).toBe('solid');
    expect(ring.width).not.toBe('0px');
    expect(ring.color).toBe(ring.expected);

    await page.keyboard.press('Enter');
    await expect(page.locator('#item-1')).toHaveAttribute('open', '');
    expect(await value(page, DOWN, 'display')).not.toBe('none');
    await page.keyboard.press('Enter');
    await expect(page.locator('#item-1')).not.toHaveAttribute('open', '');
    await page.keyboard.press('Space');
    await expect(page.locator('#item-1')).toHaveAttribute('open', '');
    await expect(page.locator('#sum-1')).toBeFocused();
    expect(await value(page, END, 'display')).toBe('none');
  });
});
