// @ts-check
/**
 * The icons the home page draws are the one family of the Icons page (#79): a 24 grid, a 1.5 stroke, round
 * caps and joins, no fill, in the text colour. In /, /es/ and /ar/ (one template), every icon of the page, as
 * the browser paints it:
 *  - the inline outline icons (`svg` with its shapes inside, the levels, the kinds and the eyebrows): each shape
 *    has a computed stroke width of 1.5px, round line cap and join, a stroke that is not none and a fill that is
 *    none (the half disc of the mode eyebrow is the one filled shape);
 *  - the icons of the sprite, drawn by `<use href="#iN">`: the shapes of the symbol are read where the clone gets
 *    them from, the shape's own attribute, then the symbol's, then what the `<use>` inherits from the svg around it
 *    (the page's `.ic`), so an icon that drew 1.6 or 2 fails whichever way it was written;
 *  - every `<use>` points to a symbol on the 24 grid.
 * Not part of it: the logo (a filled mark on 32), the sky filter and the shared header, whose icons
 * tests/site-header-repo-icon.spec.js and tests/icons-page.spec.js own.
 * Runs in `chromium` and `chromium-nojs` (no script draws any of them). nojs needs the spec in the project's
 * `testMatch` of playwright.config.js.
 */
import { test, expect } from '@playwright/test';

const ROUTES = ['/', '/es/', '/ar/'];

/** Runs in the page: what every drawn shape of an inline icon or of a used symbol is painted with. */
function measure() {
  const SHAPES = 'path,circle,ellipse,line,polyline,polygon,rect';
  const PROPS = ['stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke', 'fill'];
  const out = { inline: [], used: [], symbols: [] };
  const where = (el) => `${el.tagName.toLowerCase()}${el.getAttribute('class') ? `.${el.getAttribute('class').trim().replace(/\s+/g, '.')}` : ''}`;

  // Inline: the shapes straight in an svg of the page's body
  for (const svg of document.querySelectorAll('main svg, footer svg')) {
    if (svg.closest('symbol') || svg.getAttribute('viewBox') === '0 0 32 32') continue;
    const shapes = [...svg.querySelectorAll(SHAPES)].filter((s) => !s.closest('symbol, defs, filter, clipPath, mask'));
    if (shapes.length === 0 || svg.querySelector('use')) continue;
    for (const shape of shapes) {
      const cs = getComputedStyle(shape);
      out.inline.push({ at: `${where(svg)} > ${shape.tagName.toLowerCase()}`, width: cs.strokeWidth, cap: cs.strokeLinecap, join: cs.strokeLinejoin, stroke: cs.stroke, fill: cs.fill, fillAttr: shape.getAttribute('fill') });
    }
  }

  // Used: for each <use>, the shapes of its symbol with the value they get in the clone
  // (the sprite's ids are i0 to i13; the globe of the light draws its own, from script)
  for (const use of document.querySelectorAll('use[href^="#i"]')) {
    const id = (use.getAttribute('href') ?? '').replace(/^#/, '');
    if (!/^i\d+$/.test(id)) continue;
    const symbol = document.getElementById(id);
    if (!symbol || symbol.tagName.toLowerCase() !== 'symbol') {
      out.symbols.push({ id, viewBox: null });
      continue;
    }
    out.symbols.push({ id, viewBox: symbol.getAttribute('viewBox') });
    const inherited = getComputedStyle(use);
    for (const shape of symbol.querySelectorAll(SHAPES)) {
      const value = {};
      for (const prop of PROPS) {
        let found;
        for (let n = shape; n; n = n.parentElement) {
          if (n.hasAttribute(prop)) { found = n.getAttribute(prop); break; }
          if (n === symbol) break;
        }
        value[prop] = found ?? inherited.getPropertyValue(prop);
      }
      out.used.push({ at: `#${id} (in ${where(use.parentElement)}) > ${shape.tagName.toLowerCase()}`, width: value['stroke-width'], cap: value['stroke-linecap'], join: value['stroke-linejoin'], stroke: value.stroke, fill: value.fill, fillAttr: shape.getAttribute('fill') });
    }
  }
  return out;
}

/** What is wrong with a drawn shape: the family's stroke, caps and joins, no fill but the explicit currentColor half disc. */
function faults(list) {
  const bad = [];
  for (const s of list) {
    const problems = [];
    if (parseFloat(s.width) !== 1.5) problems.push(`stroke-width ${s.width}`);
    if (s.cap !== 'round') problems.push(`linecap ${s.cap}`);
    if (s.join !== 'round') problems.push(`linejoin ${s.join}`);
    if (!s.stroke || s.stroke === 'none') problems.push(`stroke ${s.stroke}`);
    if (s.fill !== 'none' && s.fillAttr?.toLowerCase() !== 'currentcolor') problems.push(`fill ${s.fill}`);
    if (problems.length) bad.push(`${s.at}: ${problems.join(', ')}`);
  }
  return bad;
}

test.describe('the icons of the home page', () => {
  for (const route of ROUTES) {
    test(`${route}: every inline outline icon is drawn at 1.5 with round ends and no fill`, async ({ page }) => {
      await page.goto(route);
      const { inline } = await page.evaluate(measure);
      expect(inline.length, 'the levels, the kinds and the eyebrows are inline').toBeGreaterThan(15);
      expect(faults(inline)).toEqual([]);
    });

    test(`${route}: every icon of the sprite is drawn at 1.5 with round ends and no fill, wherever it is used`, async ({ page }) => {
      await page.goto(route);
      const { used } = await page.evaluate(measure);
      expect(used.length, 'the sprite is used').toBeGreaterThan(30);
      expect(faults(used)).toEqual([]);
    });

    test(`${route}: every <use> points to a symbol on the 24 grid`, async ({ page }) => {
      await page.goto(route);
      const { symbols } = await page.evaluate(measure);
      expect(symbols.length).toBeGreaterThan(30);
      expect(symbols.filter((s) => s.viewBox !== '0 0 24 24').map((s) => s.id)).toEqual([]);
      expect(new Set(symbols.map((s) => s.id)).size, 'i0 to i13 are all used').toBeGreaterThanOrEqual(14);
    });
  }
});
