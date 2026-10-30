// @ts-check
/**
 * The Icons page (/docs/components/icons/ and /es/docs/components/icons/, apps/docs/pages/components/icons.html),
 * in the browser. It replaces the Icon grid page: the site's icons as one family, each with a button that copies
 * its SVG, and one that copies the whole set as a sprite. The markup (the 24 grid, the 1.5 stroke, no colour typed,
 * no duplicate id) is tests/icons-family.test.js; the old page's route is gone from tests/icons.spec.js.
 *
 *  - the grid shows the icons, and the logo apart, each drawn (a box) and named in words;
 *  - the page carries each icon once: its copy button has no `data-copy` in the HTML, and with JavaScript each
 *    button copies the `<svg>` of the icon beside it, as the server wrote it;
 *  - the sprite block shows a sample; its Copy button copies the whole sprite, with one symbol for each icon of the
 *    grid (the count is the grid's, never typed) and the same drawing;
 *  - no number of icons is written in the prose; no sideways scroll at 320 px; axe in the three modes;
 *  - the page is under the docs page row of budgets.json; no console error, no failed request;
 *  - without JavaScript the copy buttons are hidden and the icons stay.
 * The no-JS describe sets `javaScriptEnabled: false` itself, so the file runs in `chromium`.
 */
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { copiedText, recordCopies } from './helpers/clipboard.js';
import { faded, idle } from './helpers/settle.js';

const PAGES = { en: '/docs/components/icons/', es: '/es/docs/components/icons/' };
const THEMES = ['light', 'dark', 'high-contrast'];
const BUDGET = JSON.parse(readFileSync(new URL('../budgets.json', import.meta.url), 'utf-8'));
const DOCS_ROW = findRow(BUDGET, 'docs page HTML (each, uncompressed)');

/** The row of budgets.json with this name, wherever the file keeps its list. */
function findRow(node, name) {
  if (Array.isArray(node)) return node.map((n) => findRow(n, name)).find(Boolean);
  if (node && typeof node === 'object') {
    if (node.name === name) return node;
    for (const value of Object.values(node)) {
      const hit = findRow(value, name);
      if (hit) return hit;
    }
  }
  return undefined;
}

/** Empty the clipboard, press the button, and wait for what it copies. */
async function copyWith(page, button) {
  await page.evaluate(() => navigator.clipboard.writeText('')).catch(() => {});
  await button.click();
  await expect.poll(() => copiedText(page)).toMatch(/\S/);
  return copiedText(page);
}

const items = (page) => page.locator('.docs-example .luz-icon-item');

/** Open the page and fail in five seconds, with this message, when it has no icons (everything below needs them). */
async function openPage(page, route) {
  await page.goto(route);
  await idle(page);
  await expect(items(page).first(), `${route} has a grid of icons`).toBeVisible({ timeout: 5000 });
}

/**
 * The icons of the grid as the server wrote them: parsed from the response text, so the script of the page
 * cannot have changed them. `svg` is the outerHTML the browser makes of each, `grid24` is the 24 grid.
 */
async function icons(page, route) {
  const html = await (await page.request.get(route)).text();
  return page.evaluate((source) => {
    const doc = new window.DOMParser().parseFromString(source, 'text/html');
    return [...doc.querySelectorAll('.docs-example .luz-icon-item')].map((li) => {
      const svg = li.querySelector('.luz-icon-display svg');
      return {
        id: (li.querySelector('.luz-icon-name')?.id ?? '').replace(/^c-icons-/, ''),
        label: li.querySelector('.luz-icon-name')?.textContent?.trim() ?? '',
        svg: svg?.outerHTML ?? '',
        inner: svg?.innerHTML ?? '',
        grid24: svg?.getAttribute('viewBox') === '0 0 24 24',
      };
    });
  }, html);
}

/** Markup text parsed as HTML the way a person pastes it: the elements it makes, serialised. */
const parsed = (page, markup) =>
  page.evaluate((text) => {
    const host = document.createElement('template');
    host.innerHTML = text;
    return { count: host.content.children.length, tag: host.content.firstElementChild?.localName ?? '', outer: host.content.firstElementChild?.outerHTML ?? '', rest: host.content.textContent ?? '' };
  }, markup);

test.describe('the Icons page, with JavaScript', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript: the no-JS tests are below');
  test.beforeEach(async ({ context, browserName }) => {
    if (browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  });

  for (const [language, route] of Object.entries(PAGES)) {
    test.describe(`${language}: ${route}`, () => {
      test('shows the icons of the set, each drawn and named in words, and the logo apart', async ({ page }) => {
        await openPage(page, route);
        const source = await icons(page, route);
        const set = source.filter((i) => i.grid24);
        expect(set.length, 'icons in the page').toBeGreaterThan(0);
        expect(source.filter((i) => !i.grid24).map((i) => i.id), 'one icon is on its own grid').toEqual(['logo']);
        await expect(items(page), 'the grid shows what the server wrote').toHaveCount(source.length);
        const drawn = await page.locator('.docs-example .luz-icon-item').evaluateAll((lis) =>
          lis.map((li) => {
            const svg = li.querySelector('.luz-icon-display svg');
            const box = svg.getBoundingClientRect();
            const name = li.querySelector('.luz-icon-name');
            const shape = svg.getBBox();
            return { id: name.id, w: box.width, h: box.height, ink: shape.width + shape.height, name: name.textContent.trim(), nameVisible: name.getBoundingClientRect().height > 0, grid24: svg.getAttribute('viewBox') === '0 0 24 24' };
          }),
        );
        for (const icon of drawn) {
          expect(icon.w, `${icon.id} width`).toBeGreaterThan(0);
          expect(icon.h, `${icon.id} height`).toBeGreaterThan(0);
          expect(icon.ink, `${icon.id} draws something`).toBeGreaterThan(0);
          expect(icon.nameVisible, `${icon.id} name`).toBe(true);
          expect(icon.name.length, `${icon.id} name`).toBeGreaterThan(1);
          // The set shares one size
        }
        expect(new Set(drawn.filter((i) => i.grid24).map((i) => `${i.w}x${i.h}`)).size, 'the icons of the set share one size').toBe(1);
        // The set first, the logo after it, under its own note
        expect(drawn.at(-1).id).toBe('c-icons-logo');
      });

      test('each copy button copies the <svg> of its icon, as the server wrote it, and the HTML carries no copy of it', async ({ page }) => {
        await recordCopies(page);
        await openPage(page, route);
        const source = await icons(page, route);
        expect(source.length, 'icons').toBeGreaterThan(0);
        const buttons = items(page).locator('.luz-copy-btn');
        await expect(buttons).toHaveCount(source.length);
        // The HTML has no data-copy on them (the script gives it); the sprite button has none either
        expect(await (await page.request.get(route)).text()).not.toMatch(/data-copy="&lt;svg|data-copy="<svg/);
        for (const [i, icon] of source.entries()) {
          const button = buttons.nth(i);
          await expect(button, icon.id).toBeVisible();
          const copied = await copyWith(page, button);
          const got = await parsed(page, copied);
          const want = await parsed(page, icon.svg);
          expect(got.count, `${icon.id}: one element`).toBe(1);
          expect(got.tag, `${icon.id}: an svg`).toBe('svg');
          expect(got.rest.trim(), `${icon.id}: nothing but the svg`).toBe('');
          expect(got.outer, `${icon.id}: the markup of the icon beside the button`).toBe(want.outer);
          expect(copied.trimStart().startsWith('<svg'), `${icon.id}: starts with the svg`).toBe(true);
          expect(copied.trimEnd().endsWith('</svg>'), `${icon.id}: ends with the svg`).toBe(true);
        }
      });

      test('shows a short sample of the sprite and an ellipsis, and the Copy button copies the whole sprite: one symbol for each icon of the grid', async ({ page }) => {
        await recordCopies(page);
        await openPage(page, route);
        const source = await icons(page, route);
        const set = source.filter((i) => i.grid24);
        expect(set.length, 'icons').toBeGreaterThan(0);
        // The sample on screen
        const shown = await page.locator('#code-icon-sprite').evaluate((code) => ({ symbols: (code.textContent.match(/<symbol\b/g) ?? []).length, text: code.textContent }));
        expect(shown.symbols, 'a sample').toBeGreaterThan(0);
        expect(shown.symbols, 'fewer symbols than the set').toBeLessThan(set.length);
        expect(shown.text, 'an ellipsis comment').toMatch(/<!--[^>]*(?:…|\.\.\.)[^>]*-->/);
        // The button copies the whole set
        const button = page.locator('[data-icon-sprite]');
        await expect(button).toBeVisible();
        const copied = await copyWith(page, button);
        const sprite = await page.evaluate((markup) => {
          const host = document.createElement('template');
          host.innerHTML = markup;
          const svg = host.content.firstElementChild;
          return {
            top: host.content.children.length,
            tag: svg?.localName,
            width: svg?.getAttribute('width'),
            height: svg?.getAttribute('height'),
            ariaHidden: svg?.getAttribute('aria-hidden'),
            focusable: svg?.getAttribute('focusable'),
            symbols: [...(svg?.querySelectorAll('symbol') ?? [])].map((s) => ({ id: s.id, viewBox: s.getAttribute('viewBox'), inner: s.innerHTML })),
            other: [...(svg?.children ?? [])].filter((c) => c.localName !== 'symbol').map((c) => c.localName),
          };
        }, copied);
        expect(sprite).toMatchObject({ top: 1, tag: 'svg', width: '0', height: '0', ariaHidden: 'true', focusable: 'false', other: [] });
        expect(sprite.symbols.length, 'one symbol for each icon of the grid').toBe(set.length);
        expect(sprite.symbols.map((s) => s.id), 'in the grid order, named by the icon').toEqual(set.map((i) => `luz-icon-${i.id}`));
        for (const [i, symbol] of sprite.symbols.entries()) {
          expect(symbol.viewBox, symbol.id).toBe('0 0 24 24');
          expect(symbol.inner, `${symbol.id} draws the icon`).toBe(set[i].inner);
        }
        expect(new Set(sprite.symbols.map((s) => s.id)).size, 'unique ids').toBe(sprite.symbols.length);
      });

      test('writes no number of icons: the count is the grid\'s own', async ({ page }) => {
        await openPage(page, route);
        const text = await page.locator('main').innerText();
        expect(text.length).toBeGreaterThan(0);
        expect(text).not.toMatch(/\b\d+\s+(?:icons?|iconos?|symbols?|s[ií]mbolos?)\b/i);
      });

      test('has no console error, no failed request and no script error', async ({ page }) => {
        const problems = [];
        page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) problems.push(`${m.type()}: ${m.text()}`); });
        page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
        page.on('response', (r) => { if (r.status() >= 400) problems.push(`${r.status()} ${r.url()}`); });
        await openPage(page, route);
        await items(page).first().locator('.luz-copy-btn').click();
        expect(problems).toEqual([]);
      });

      test('has no sideways scroll at 320 px, in either tab', async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 800 });
        await openPage(page, route);
        const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(await overflow(), 'the default tab').toBeLessThanOrEqual(0);
        for (const view of ['design', 'code']) {
          const tab = page.locator(`.docs-view-tabs [data-docs-view="${view}"]`);
          await tab.click();
          await faded(page);
          expect(await overflow(), `the ${view} tab`).toBeLessThanOrEqual(0);
        }
        // And the grid itself keeps inside the window
        const outside = await page.locator('.docs-example .luz-icon-item').evaluateAll((lis) => lis.filter((li) => li.getBoundingClientRect().right > window.innerWidth + 1).length);
        expect(outside).toBe(0);
      });

      test('is under the docs page row of the size budget (uncompressed HTML)', async ({ page }) => {
        expect(DOCS_ROW?.max, 'the row "docs page HTML (each, uncompressed)" of budgets.json').toBeGreaterThan(0);
        const response = await page.request.get(route);
        const body = await response.body();
        expect(body.toString('utf-8'), `${route} is the Icons page, with its grid`).toContain('luz-icon-grid');
        expect(body.length, `${route}: ${body.length} bytes, the ceiling is ${DOCS_ROW.max}`).toBeLessThanOrEqual(DOCS_ROW.max);
      });

      for (const theme of THEMES) {
        test(`has no serious or critical axe violation in ${theme}`, async ({ page }) => {
          await openPage(page, route);
          await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
          await faded(page);
          await page.waitForTimeout(400);
          const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
          const blocking = violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''));
          expect(blocking.map((v) => `${v.impact} ${v.id}: ${v.nodes[0]?.target?.join(' ')}`)).toEqual([]);
        });
      }
    });
  }

  test('the colour mode icons of the footer are drawn in the family: no fill, the text colour, 1.5 wide, round', async ({ page }) => {
    await openPage(page, PAGES.en);
    const drawn = await page.locator('svg.luz-theme-mode__icon').evaluateAll((svgs) =>
      svgs.map((svg) => {
        const own = getComputedStyle(svg);
        const shapes = [...svg.querySelectorAll('path, circle')].map((s) => getComputedStyle(s));
        return {
          width: own.strokeWidth,
          cap: own.strokeLinecap,
          join: own.strokeLinejoin,
          fill: own.fill,
          stroke: own.stroke,
          color: own.color,
          shapes: shapes.map((s) => ({ width: s.strokeWidth, stroke: s.stroke })),
        };
      }),
    );
    expect(drawn.length, 'colour mode icons').toBeGreaterThan(0);
    for (const icon of drawn) {
      expect(parseFloat(icon.width), 'stroke width').toBe(1.5);
      expect(icon.cap).toBe('round');
      expect(icon.join).toBe('round');
      expect(icon.fill).toBe('none');
      expect(icon.stroke, 'the text colour').toBe(icon.color);
      for (const shape of icon.shapes) {
        expect(parseFloat(shape.width)).toBe(1.5);
        expect(shape.stroke).toBe(icon.color);
      }
    }
  });
});

test.describe('the Icons page, without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  for (const [language, route] of Object.entries(PAGES)) {
    test(`${language}: the copy buttons are hidden and every icon still shows, with its name`, async ({ page }) => {
      await page.goto(route);
      await expect(items(page).first(), `${route} has a grid of icons`).toBeVisible({ timeout: 5000 });
      const total = await items(page).count();
      expect(total, 'items in the grid').toBeGreaterThan(0);
      const buttons = items(page).locator('.luz-copy-btn');
      await expect(buttons).toHaveCount(total);
      for (const button of await buttons.all()) await expect(button).toBeHidden();
      await expect(page.locator('[data-icon-sprite]')).toBeHidden();
      const shown = await items(page).evaluateAll((lis) =>
        lis.map((li) => {
          const svg = li.querySelector('.luz-icon-display svg').getBoundingClientRect();
          const name = li.querySelector('.luz-icon-name').getBoundingClientRect();
          return { w: svg.width, h: svg.height, nameH: name.height };
        }),
      );
      for (const [i, s] of shown.entries()) {
        expect(s.w, `icon ${i}`).toBeGreaterThan(0);
        expect(s.h, `icon ${i}`).toBeGreaterThan(0);
        expect(s.nameH, `name ${i}`).toBeGreaterThan(0);
      }
      // The sample of the sprite is text on the page: readable without a script
      await expect(page.locator('#code-icon-sprite')).toBeVisible();
    });
  }
});
