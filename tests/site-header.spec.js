// @ts-check
/**
 * The shared site header of the home page and the docs (apps/site/_partials/header.html,
 * apps/site/header.css, apps/site/header.js), as a browser lays it out and as a keyboard drives it.
 * The markup, the words in each language and the catalogs are in tests/site-header.test.js.
 *
 * Above 768px, one row: the logo (a link to the home, named "LUZ", no visible text; the version is
 * the footer's, not the header's), and at the end Documentation, GitHub, Search and Language (the home and the docs have
 * the switch). Those four are as tall as the header, have no underline, and the current
 * one (the docs page, the open search dialog, the open language list) has a 2px bar at the bottom in
 * a darker colour. The colour mode is not in the header: with scripting on, the footer's cycle
 * button is fixed at the bottom right of the window. At 768px and below the row is the logo, Search
 * and the menu button; the drawer is a native popover panel under the header, the full width.
 * The header is transparent at the top of the page and solid once it scrolls.
 *
 * Runs in `chromium` and `chromium-nojs` (this file is in the no-JS testMatch of
 * playwright.config.js): what needs a script skips itself where scripting is off, what must hold
 * without one skips itself where it is on.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { faded } from './helpers/settle.js';

const GITHUB = 'https://github.com/nandovejer/luz';
const HOME = '/';
const DOCS = '/docs/';
const COMPONENT = '/docs/components/button/';

const needsJs = (javaScriptEnabled) => test.skip(!javaScriptEnabled, 'needs JavaScript');
const withoutJs = (javaScriptEnabled) => test.skip(javaScriptEnabled, 'only where scripting is off');

/** A CSS length expression resolved to pixels, in the page. */
const px = (page, expression) =>
  page.evaluate((value) => {
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;visibility:hidden;inline-size:${value}`;
    document.body.append(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();
    return width;
  }, expression);

/** Any CSS colour as [r, g, b, a] (a is 0 to 1), read the way the page paints it. */
const rgba = (page, css) =>
  page.evaluate((value) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d', { willReadFrequently: true }));
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = value;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return [r, g, b, a / 255];
  }, css);

const luminance = ([r, g, b]) => {
  const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

const style = (locator, property) => locator.evaluate((el, p) => getComputedStyle(el)[p], property);
const box = (locator) => locator.evaluate((el) => el.getBoundingClientRect().toJSON());

/** What a sighted reader sees in an element: its text without the clipped, hidden and 1px parts. */
const visibleText = (locator) =>
  locator.evaluate((root) => {
    const hidden = (/** @type {Element|null} */ start) => {
      for (let node = start; node; node = node === root ? null : node.parentElement) {
        const s = getComputedStyle(node);
        if (s.display === 'none' || s.visibility === 'hidden') return true;
        if (s.clipPath !== 'none' || (s.position === 'absolute' && s.clip !== 'auto')) return true;
        const r = node.getBoundingClientRect();
        if (s.overflow !== 'visible' && (r.width <= 1 || r.height <= 1)) return true;
      }
      return false;
    };
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let text = '';
    for (let n = walker.nextNode(); n; n = walker.nextNode()) if (!hidden(n.parentElement)) text += n.textContent;
    return text.replace(/\s+/g, ' ').trim();
  });

/** Controls of the header that are drawn: a box of more than 2px and no clipping of their own. */
const drawnControls = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('#site-header a, #site-header button')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none';
      })
      .map((el) => ({ tag: el.tagName, name: (el.getAttribute('aria-label') ?? el.textContent ?? '').replace(/\s+/g, ' ').trim(), left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right })),
  );

/** The four controls at the end of the row. `search` is the button with scripting, the A–Z link without. */
function controls(page, javaScript) {
  const header = page.locator('#site-header');
  return {
    header,
    brand: header.locator('a[href="/"], a[href="/es/"]').first(),
    version: header.locator('a[href$="/CHANGELOG.md"]'),
    docs: header.locator('.site-header__nav a[href="/docs/"]'),
    github: header.locator(`a[href="${GITHUB}"]`),
    search: header.locator(javaScript ? '[data-luz-search-open]' : '[data-luz-search-fallback]'),
    lang: header.locator('luz-lang-switch button'),
    menu: header.getByRole('button', { name: 'Menu', exact: true }),
  };
}

/** Open a page and, with scripting on, wait for the chunks the header's controls come from. */
async function open(page, path, javaScript, { light = true } = {}) {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  if (javaScript && light) await page.addInitScript(() => localStorage.setItem('luz-theme', 'light'));
  await page.goto(path);
  if (javaScript) {
    // The search button replaces the A-Z link once its chunk has loaded (idle); the cycle button once mode.js has
    await page.locator('#site-header [data-luz-search-open]').waitFor({ state: 'visible' });
    await page.locator('.luz-mode-cycle').waitFor({ state: 'attached' });
    await faded(page);
  }
}

test.describe('the header at the top of a wide screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  for (const path of [HOME, DOCS]) {
    test(`${path}: the logo is a link to the home named LUZ, with no visible text`, async ({ page, javaScriptEnabled }) => {
      await open(page, path, javaScriptEnabled);
      const { brand, header } = controls(page, javaScriptEnabled);
      await expect(brand).toHaveAttribute('href', '/');
      await expect(brand).toHaveAccessibleName('LUZ');
      expect(await visibleText(brand), 'no visible text').toBe('');
      expect(await brand.locator('svg').count(), 'the logo is drawn').toBe(1);
      await expect(header.getByRole('link', { name: 'Home' })).toHaveCount(0);
    });

    test(`${path}: the header shows no version and no tag: the changelog is a link of the footer`, async ({ page, javaScriptEnabled }) => {
      await open(page, path, javaScriptEnabled);
      const { version: link, header } = controls(page, javaScriptEnabled);
      await expect(link).toHaveCount(0);
      expect(await visibleText(header)).not.toMatch(/\bv\d+\.\d+\.\d+/);
      await expect(header.locator('.luz-tag')).toHaveCount(0);
      if (path === HOME) await expect(page.locator('footer a[href$="/CHANGELOG.md"]').first()).toBeVisible();
    });
  }

  for (const path of [HOME, DOCS]) {
    test(`${path}: ends with Documentation, GitHub, Search and Language, each with an icon and a word`, async ({ page, javaScriptEnabled }) => {
      await open(page, path, javaScriptEnabled);
      const c = controls(page, javaScriptEnabled);
      const row = [c.docs, c.github, c.search, c.lang];
      await expect(page.locator('#site-header luz-lang-switch'), 'the language switch is on the home and on the docs').toHaveCount(1);
      const boxes = [];
      for (const control of row) {
        await expect(control).toBeVisible();
        boxes.push(await box(control));
      }
      for (let i = 1; i < boxes.length; i++) expect(boxes[i].left, `control ${i} after control ${i - 1}`).toBeGreaterThanOrEqual(boxes[i - 1].right - 1);
      // At the end of the row: after the logo
      expect(boxes[0].left, 'after the logo').toBeGreaterThan((await box(c.brand)).right);
      // One line: the same vertical centre
      const middles = boxes.map((b) => b.top + b.height / 2);
      expect(Math.max(...middles) - Math.min(...middles), 'one row').toBeLessThanOrEqual(2);
      // An icon and a visible word on the first three (the language button keeps its own icon)
      for (const control of row.slice(0, 3)) {
        const icon = control.locator('svg').first();
        await expect(icon).toBeVisible();
        const size = await box(icon);
        expect(Math.min(size.width, size.height), 'an icon').toBeGreaterThanOrEqual(16);
        expect((await visibleText(control)).length, 'a word').toBeGreaterThan(0);
      }
      expect(await visibleText(c.docs)).toBe('Documentation');
      expect(await visibleText(c.github)).toBe('GitHub');
      if (javaScriptEnabled) {
        await expect(c.search).toHaveAccessibleName('Search');
        expect(await visibleText(c.search), 'just "Search": no "docs", no ellipsis, no Ctrl K key').toBe('Search');
      }
    });
  }

  for (const path of [HOME, DOCS]) {
    test(`${path}: the four end controls have no underline, and are as tall as the header, which keeps its height`, async ({ page, javaScriptEnabled }) => {
      await open(page, path, javaScriptEnabled);
      const c = controls(page, javaScriptEnabled);
      const header = await box(c.header);
      // One row of 44px controls with a small padding above and below, and a 1px rule: the same on every page
      const expected = (await px(page, 'var(--luz-control-lg)')) + 2 * (await px(page, 'var(--luz-space-2xs)')) + 1;
      expect(header.height, 'the height of the header').toBeCloseTo(expected, 0);
      for (const control of [c.docs, c.github, c.search, c.lang]) {
        expect(await style(control, 'textDecorationLine'), 'no underline').toBe('none');
        const b = await box(control);
        expect(header.height - 1 - b.height, 'as tall as the header (less its rule)').toBeLessThanOrEqual(1);
        expect(b.top - header.top, 'from its top edge').toBeLessThanOrEqual(1);
      }
    });
  }

  test('the current control has a 2px bar at the bottom, in a darker colour than the others: Documentation on the docs', async ({ page, javaScriptEnabled }) => {
    await open(page, DOCS, javaScriptEnabled);
    const c = controls(page, javaScriptEnabled);
    await expect(c.docs).toHaveAttribute('aria-current', 'page');
    expect(await style(c.docs, 'textDecorationLine'), 'no underline, also when current').toBe('none');
    expect(await style(c.docs, 'borderBottomWidth')).toBe('2px');
    expect(await style(c.docs, 'borderBottomStyle')).toBe('solid');
    const bar = await rgba(page, await style(c.docs, 'borderBottomColor'));
    expect(bar[3], 'an opaque bar').toBe(1);
    for (const other of [c.github, c.search]) {
      const mark = await rgba(page, await style(other, 'borderBottomColor'));
      const none = mark[3] === 0 || (await style(other, 'borderBottomWidth')) === '0px';
      expect(none, 'no bar on the others').toBe(true);
      const text = await rgba(page, await style(other, 'color'));
      expect(luminance(bar), 'the current one is darker than the others').toBeLessThan(luminance(text));
    }
  });

  test('Search takes the bar while its dialog is open, and gives it back when it closes', async ({ page, javaScriptEnabled }) => {
    needsJs(javaScriptEnabled);
    await open(page, DOCS, javaScriptEnabled);
    const c = controls(page, javaScriptEnabled);
    const bar = async (control) => {
      const mark = await rgba(page, await style(control, 'borderBottomColor'));
      return (await style(control, 'borderBottomWidth')) === '2px' && mark[3] === 1;
    };
    expect(await bar(c.search)).toBe(false);
    await c.search.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('dialog.luz-search')).toBeVisible();
    expect(await bar(c.search), 'the bar while the dialog is open').toBe(true);
    expect(await style(c.search, 'textDecorationLine')).toBe('none');
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog.luz-search')).toBeHidden();
    expect(await bar(c.search), 'the bar goes with the dialog').toBe(false);
  });

  test('Language takes the bar while its list is open, and gives it back when it closes', async ({ page, javaScriptEnabled }) => {
    await open(page, HOME, javaScriptEnabled);
    const c = controls(page, javaScriptEnabled);
    const bar = async () => {
      const mark = await rgba(page, await style(c.lang, 'borderBottomColor'));
      return (await style(c.lang, 'borderBottomWidth')) === '2px' && mark[3] === 1;
    };
    expect(await bar()).toBe(false);
    await c.lang.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('luz-lang-switch nav[popover]')).toBeVisible();
    expect(await bar(), 'the bar while the list is open').toBe(true);
    expect(await style(c.lang, 'textDecorationLine')).toBe('none');
    await page.keyboard.press('Escape');
    await expect(page.locator('luz-lang-switch nav[popover]')).toBeHidden();
    expect(await bar(), 'the bar goes with the list').toBe(false);
  });

  test('hovering a control changes its colour and its background, a little', async ({ page, javaScriptEnabled }) => {
    await open(page, DOCS, javaScriptEnabled);
    const { github } = controls(page, javaScriptEnabled);
    const before = { color: await style(github, 'color'), background: await style(github, 'backgroundColor') };
    await page.mouse.move(0, 400);
    await github.hover();
    await expect.poll(() => style(github, 'color')).not.toBe(before.color);
    expect(await style(github, 'backgroundColor')).not.toBe(before.background);
    const rest = await rgba(page, before.color);
    const hover = await rgba(page, await style(github, 'color'));
    expect(luminance(hover), 'darker on a light page').toBeLessThan(luminance(rest));
    expect(await style(github, 'textDecorationLine')).toBe('none');
  });

});

test.describe('the colour mode is in the corner, not in the header', () => {
  for (const path of [HOME, DOCS]) {
    for (const width of [1280, 320]) {
      test(`${path} at ${width}px: with scripting on, the cycle button is fixed at the bottom right of the window and no legend shows`, async ({ page, javaScriptEnabled }) => {
        needsJs(javaScriptEnabled);
        await page.setViewportSize({ width, height: 700 });
        await open(page, path, javaScriptEnabled);
        const cycle = page.locator('footer .luz-mode-cycle');
        await expect(cycle).toBeVisible();
        await expect(page.locator('#site-header .luz-mode-cycle, #site-header luz-mode')).toHaveCount(0);
        // Some element from the button up is position: fixed
        expect(await cycle.evaluate((el) => { for (let n = el; n; n = n.parentElement) if (getComputedStyle(n).position === 'fixed') return true; return false; }), 'position: fixed').toBe(true);
        const gutter = await px(page, 'var(--luz-space-xl)');
        const place = async () => {
          const b = await box(cycle);
          return { right: Math.round(width - b.right), bottom: Math.round(700 - b.bottom), size: Math.round(b.width) };
        };
        const top = await place();
        expect(top.right, 'near the right edge').toBeLessThanOrEqual(gutter);
        expect(top.right).toBeGreaterThanOrEqual(0);
        expect(top.bottom, 'near the bottom edge').toBeLessThanOrEqual(gutter);
        expect(top.bottom).toBeGreaterThanOrEqual(0);
        // It does not move with the page, and it is above the content wherever the page is
        for (const y of [600, 1800]) {
          await page.evaluate((to) => window.scrollTo(0, to), y);
          expect(await place(), `after scrolling to ${y}`).toEqual(top);
          expect(await cycle.evaluate((el) => { const r = el.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!hit && el.contains(hit); }), 'nothing covers it').toBe(true);
        }
        // The legend is not drawn, and the radios are not shown beside the button
        expect(await visibleText(page.locator('footer luz-mode legend')), 'no legend text').toBe('');
        for (const radio of await page.locator('footer luz-mode input[name="luz-theme"]').all()) {
          expect((await box(radio.locator('xpath=..'))).width, 'a radio is not drawn').toBeLessThanOrEqual(1);
        }
      });
    }

    test(`${path}: without scripting the radios stay in the footer, not fixed`, async ({ page, javaScriptEnabled }) => {
      withoutJs(javaScriptEnabled);
      await page.setViewportSize({ width: 1280, height: 700 });
      await open(page, path, javaScriptEnabled);
      const mode = page.locator('footer luz-mode');
      await expect(page.locator('#site-header input[name="luz-theme"]')).toHaveCount(0);
      expect(await mode.evaluate((el) => { for (let n = el; n && n !== document.body; n = n.parentElement) if (getComputedStyle(n).position === 'fixed') return true; return false; }), 'not fixed').toBe(false);
      const labels = mode.locator('label.luz-mode-btn');
      await expect(labels).toHaveCount(3);
      for (const label of await labels.all()) await expect(label).toBeVisible();
      const footer = await box(page.locator('footer'));
      const inside = await box(mode);
      expect(inside.top).toBeGreaterThanOrEqual(footer.top - 1);
      expect(inside.bottom).toBeLessThanOrEqual(footer.bottom + 1);
    });
  }
});

/** A colour token as the page paints it, [r, g, b, a]. */
const token = (page, name) =>
  page.evaluate((n) => {
    const probe = document.createElement('div');
    probe.style.color = `var(${n})`;
    document.body.append(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    return resolved;
  }, name).then((css) => rgba(page, css));

test.describe('the language list', () => {
  /** Open the list from its button and return the boxes of the button and of the list. */
  async function openList(page, path, javaScript) {
    await page.setViewportSize({ width: 1280, height: 800 });
    await open(page, path, javaScript);
    const button = page.locator('#site-header luz-lang-switch button');
    await button.click();
    const menu = page.locator('luz-lang-switch nav[popover]');
    await expect(menu).toBeVisible();
    if (javaScript) await faded(page);
    return { button, menu };
  }

  for (const [path, rtl] of [[HOME, false], ['/ar/', true]]) {
    test(`${path}: hangs directly under its button with a small gap, its end edge on the button's end edge`, async ({ page, javaScriptEnabled }) => {
      const { button, menu } = await openList(page, path, javaScriptEnabled);
      // Where the browser has no anchor positioning the list stays at the window's inline end, as before
      test.skip(!(await page.evaluate(() => window.CSS.supports('position-anchor: --x'))), 'no anchor positioning in this browser');
      const [b, m] = [await box(button), await box(menu)];
      const gap = m.top - b.bottom;
      expect(gap, 'below the button, with a gap').toBeGreaterThan(1);
      expect(gap, 'a small gap').toBeLessThanOrEqual(await px(page, 'var(--luz-space-md)'));
      if (rtl) expect(Math.abs(m.left - b.left), 'its start-side edge (the end in RTL) on the button\'s').toBeLessThanOrEqual(1);
      else expect(Math.abs(m.right - b.right), 'its end edge on the button\'s end edge').toBeLessThanOrEqual(1);
      // Not stuck at the window corner: the button sits inside the page's gutter, which is wider than the corner's margin
      const corner = await px(page, 'var(--luz-space-md)');
      const fromEdge = rtl ? m.left : 1280 - m.right;
      expect(fromEdge, 'not at the window corner').toBeGreaterThan(corner + 1);
    });
  }

  test('the current row has a tick, a soft background and weight 600, no underline; every row keeps the tick\'s column', async ({ page, javaScriptEnabled }) => {
    const { menu } = await openList(page, HOME, javaScriptEnabled);
    const rows = menu.locator('a');
    await expect(rows).toHaveCount(3);
    const current = menu.locator('a[aria-current]');
    await expect(current).toHaveCount(1);
    const others = menu.locator('a:not([aria-current])');
    const tick = (locator, prop) => locator.first().evaluate((el, p) => getComputedStyle(el, '::before')[p], prop);
    expect(await tick(current, 'content')).not.toBe('none');
    expect(await tick(current, 'borderRightWidth')).toBe('2px');
    expect(await tick(current, 'borderBottomWidth')).toBe('2px');
    expect(await tick(current, 'borderLeftWidth'), 'a tick, not a box').toBe('0px');
    expect(await tick(current, 'borderTopWidth'), 'a tick, not a box').toBe('0px');
    expect(await rgba(page, await tick(current, 'borderRightColor')), 'the brand colour').toEqual(await token(page, '--luz-brand-primary'));
    expect(await tick(current, 'rotate')).toBe('45deg');
    expect(await style(current, 'fontWeight')).toBe('600');
    expect(await style(current, 'textDecorationLine'), 'no underline').toBe('none');
    expect((await rgba(page, await style(current, 'backgroundColor')))[3], 'a soft background').toBeGreaterThan(0);
    for (const row of await others.all()) {
      expect((await rgba(page, await style(row, 'backgroundColor')))[3], 'no background on the others').toBe(0);
      expect(await style(row, 'fontWeight')).not.toBe('600');
      expect(await style(row, 'textDecorationLine')).toBe('none');
      expect(await row.evaluate((el) => getComputedStyle(el, '::before').borderRightWidth), 'no tick on the others').toBe('0px');
      expect(await row.evaluate((el) => parseFloat(getComputedStyle(el, '::before').width)), 'the column is kept').toBeGreaterThan(0);
    }
    // The names line up: the first text of every row starts at the same x
    const starts = await rows.evaluateAll((els) =>
      els.map((a) => {
        const range = document.createRange();
        const text = [...a.childNodes].find((n) => n.nodeType === 3 && (n.textContent ?? '').trim());
        range.selectNodeContents(text ?? a);
        return Math.round(range.getBoundingClientRect().left * 2) / 2;
      }),
    );
    expect(new Set(starts).size, `names start at ${starts}`).toBe(1);
  });

  test('hovering a row has no underline and changes its background', async ({ page, javaScriptEnabled }) => {
    const { menu } = await openList(page, HOME, javaScriptEnabled);
    const row = menu.locator('a:not([aria-current])').first();
    const before = await style(row, 'backgroundColor');
    await row.hover();
    await expect.poll(() => style(row, 'backgroundColor')).not.toBe(before);
    expect(await style(row, 'textDecorationLine')).toBe('none');
  });

});

test.describe('the header on a phone', () => {
  for (const width of [320, 768]) {
    for (const path of [HOME, DOCS]) {
      test(`${path} at ${width}px: the row is the logo, Search and the menu button, and nothing scrolls sideways`, async ({ page, javaScriptEnabled }) => {
        await page.setViewportSize({ width, height: 700 });
        await open(page, path, javaScriptEnabled);
        const shown = await drawnControls(page);
        const names = shown.filter((s) => !/^v\d/.test(s.name));
        expect(names.map((s) => s.tag), 'the logo, a search control and the menu button').toEqual(['A', javaScriptEnabled ? 'BUTTON' : 'A', 'BUTTON']);
        const { menu } = controls(page, javaScriptEnabled);
        await expect(menu).toBeVisible();
        await expect(controls(page, javaScriptEnabled).docs).toBeHidden();
        await expect(controls(page, javaScriptEnabled).github).toBeHidden();
        await expect(page.locator('#site-header luz-lang-switch')).toBeHidden();
        for (const s of shown) {
          expect(s.left, `${s.name} inside the window`).toBeGreaterThanOrEqual(0);
          expect(s.right, `${s.name} inside the window`).toBeLessThanOrEqual(width);
        }
        // In order, without overlap
        for (let i = 1; i < shown.length; i++) expect(shown[i].left, `${shown[i].name} after ${shown[i - 1].name}`).toBeGreaterThanOrEqual(shown[i - 1].right - 1);
        // clientWidth, not innerWidth: WebKit's classic scrollbar takes 4 px of innerWidth when the page scrolls vertically
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 'no horizontal scroll').toBe(0);
        // The row is as tall at every width
        const expected = (await px(page, 'var(--luz-control-lg)')) + 2 * (await px(page, 'var(--luz-space-2xs)')) + 1;
        expect((await box(controls(page, javaScriptEnabled).header)).height).toBeCloseTo(expected, 0);
      });
    }
  }

  test('the header has no version at any width', async ({ page, javaScriptEnabled }) => {
    await open(page, DOCS, javaScriptEnabled);
    const { version: link } = controls(page, javaScriptEnabled);
    for (const width of [399, 400, 768, 1280]) {
      await page.setViewportSize({ width, height: 700 });
      await expect(link, `${width}px`).toHaveCount(0);
    }
  });

  for (const path of [HOME, COMPONENT]) {
    test(`${path}: the drawer is a native popover panel under the header, the full width, and the button turns into an X`, async ({ page, javaScriptEnabled }) => {
      await page.setViewportSize({ width: 375, height: 700 });
      await open(page, path, javaScriptEnabled);
      const c = controls(page, javaScriptEnabled);
      const drawer = page.locator('#page-nav');
      await expect(drawer).toBeHidden();
      await expect(c.menu).toHaveAttribute('popovertarget', 'page-nav');
      expect(await drawer.evaluate((el) => el.hasAttribute('popover')), 'a native popover').toBe(true);
      const closed = await c.menu.screenshot({ animations: 'disabled' });

      // The keyboard opens it: a click does not focus a button in WebKit
      await c.menu.focus();
      await page.keyboard.press('Enter');
      await expect(drawer).toBeVisible();
      expect(await drawer.evaluate((el) => el.matches(':popover-open'))).toBe(true);
      const [h, d] = [await box(c.header), await box(drawer)];
      const width = await page.evaluate(() => document.documentElement.clientWidth);
      expect(Math.abs(d.top - h.bottom), 'drops from under the header').toBeLessThanOrEqual(2);
      expect(d.left, 'from the left edge').toBeLessThanOrEqual(1);
      expect(Math.abs(d.width - width), 'the full width').toBeLessThanOrEqual(1);
      expect(d.bottom, 'inside the window').toBeLessThanOrEqual(700 + 1);
      await expect(c.menu, 'its name stays').toHaveAccessibleName('Menu');
      // The header stays above the panel: the button that closes it is still where it was and still receives clicks
      expect(await c.menu.evaluate((el) => { const r = el.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!hit && el.contains(hit); })).toBe(true);
      const open_ = await c.menu.screenshot({ animations: 'disabled' });
      expect(Buffer.compare(closed, open_), 'the icon is not the hamburger any more').not.toBe(0);

      await page.keyboard.press('Escape');
      await expect(drawer).toBeHidden();
      await expect(c.menu).toBeFocused();
      expect(Buffer.compare(closed, await c.menu.screenshot({ animations: 'disabled' })), 'the hamburger is back').toBe(0);
    });
  }

  test('the home drawer lists the sections, then Documentation and GitHub, then the languages, top to bottom', async ({ page, javaScriptEnabled }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await open(page, HOME, javaScriptEnabled);
    await controls(page, javaScriptEnabled).menu.click();
    const drawer = page.locator('#page-nav');
    await expect(drawer).toBeVisible();
    const links = await drawer.locator('a').evaluateAll((els) => els.map((a) => ({ href: a.getAttribute('href'), top: a.getBoundingClientRect().top, text: (a.textContent ?? '').trim() })));
    const hrefs = links.map((l) => l.href);
    const sections = hrefs.filter((h) => h?.startsWith('#'));
    expect(sections.length, 'the page\'s sections').toBeGreaterThanOrEqual(3);
    expect(hrefs).toEqual([...sections, '/docs/', GITHUB, '/', '/es/', '/ar/']);
    expect(links.find((l) => l.href === '/docs/')?.text).toBe('Documentation');
    const tops = links.map((l) => l.top);
    for (let i = 1; i < tops.length; i++) expect(tops[i], `${links[i].href} is not above ${links[i - 1].href}`).toBeGreaterThanOrEqual(tops[i - 1] - 1);
    // Documentation, GitHub and the languages are told apart: the languages are a labelled group of their own
    await expect(drawer.getByRole('link', { name: 'Home' })).toHaveCount(0);
    await expect(drawer.locator('a[hreflang]')).toHaveCount(3);
  });

  test('the docs drawer is the docs sidebar', async ({ page, javaScriptEnabled }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await open(page, COMPONENT, javaScriptEnabled);
    await controls(page, javaScriptEnabled).menu.click();
    const drawer = page.locator('#page-nav');
    await expect(drawer).toBeVisible();
    await expect(drawer.locator('.docs-nav a').first()).toBeVisible();
    await expect(drawer.locator('a[href="/"]')).toHaveCount(0);
    await expect(drawer.getByRole('link', { name: 'Home' })).toHaveCount(0);
  });

  for (const path of [HOME, DOCS]) {
    test(`${path}: without JavaScript the menu button still opens and closes the drawer`, async ({ page, javaScriptEnabled }) => {
      withoutJs(javaScriptEnabled);
      await page.setViewportSize({ width: 375, height: 700 });
      await open(page, path, javaScriptEnabled);
      const c = controls(page, javaScriptEnabled);
      const drawer = page.locator('#page-nav');
      await expect(drawer).toBeHidden();
      await c.menu.click();
      await expect(drawer).toBeVisible();
      const [h, d] = [await box(c.header), await box(drawer)];
      expect(Math.abs(d.top - h.bottom), 'under the header').toBeLessThanOrEqual(2);
      expect(d.width, 'the full width').toBeGreaterThanOrEqual(375 - 1);
      await c.menu.click();
      await expect(drawer).toBeHidden();
    });
  }
});

test.describe('accessibility', () => {
  for (const path of [HOME, DOCS]) {
    test(`${path}: the header has no axe violations, wide and with the drawer open`, async ({ page, javaScriptEnabled }) => {
      needsJs(javaScriptEnabled);
      await page.setViewportSize({ width: 1280, height: 700 });
      await open(page, path, javaScriptEnabled);
      let results = await new AxeBuilder({ page }).include('#site-header').analyze();
      expect(results.violations, 'wide').toEqual([]);

      await page.setViewportSize({ width: 375, height: 700 });
      await controls(page, javaScriptEnabled).menu.click();
      await expect(page.locator('#page-nav')).toBeVisible();
      await faded(page);
      results = await new AxeBuilder({ page }).include('#site-header').include('#page-nav').analyze();
      expect(results.violations, 'with the drawer open').toEqual([]);
    });
  }
});

test.describe('the logo mark', () => {
  /** The mark is wide (1.57:1): 35 x 22 px, sized by its height, in every width and direction. */
  const mark = (page) => page.locator('#site-header .site-header__brand .site-header__mark svg');

  for (const path of [HOME, '/ar/', DOCS]) {
    for (const width of [1280, 375, 320]) {
      test(`${path} at ${width}px: the mark is 35 x 22 px and nothing scrolls sideways`, async ({ page, javaScriptEnabled }) => {
        await page.setViewportSize({ width, height: 700 });
        await open(page, path, javaScriptEnabled);
        const m = await box(mark(page));
        expect(Math.abs(m.width - 35), `width ${m.width}`).toBeLessThanOrEqual(1);
        expect(Math.abs(m.height - 22), `height ${m.height}`).toBeLessThanOrEqual(1);
        expect(m.left >= 0 && m.right <= width, JSON.stringify(m)).toBe(true);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, 'no horizontal overflow').toBeLessThanOrEqual(0);
      });
    }
  }

  test('the mark is decorative: the link is named LUZ by its hidden text, with no visible text', async ({ page, javaScriptEnabled }) => {
    await page.setViewportSize({ width: 1280, height: 700 });
    await open(page, HOME, javaScriptEnabled);
    await expect(mark(page)).toHaveAttribute('aria-hidden', 'true');
    const brand = page.locator('#site-header .site-header__brand');
    await expect(brand).toHaveAccessibleName('LUZ');
    await expect(brand.locator('.u-sr-only')).toHaveText('LUZ');
    expect(await visibleText(brand)).toBe('');
  });

  for (const path of [HOME, '/ar/']) {
    test(`${path}: in forced colours the mark keeps the link's colour`, async ({ page, javaScriptEnabled }) => {
      await page.setViewportSize({ width: 1280, height: 700 });
      await open(page, path, javaScriptEnabled);
      await page.emulateMedia({ forcedColors: 'active' });
      const painted = await page.evaluate(() => {
        const link = document.querySelector('#site-header .site-header__brand');
        const shape = link?.querySelector('svg path');
        const probe = document.createElement('span');
        probe.style.color = 'LinkText';
        document.body.append(probe);
        const linkText = getComputedStyle(probe).color;
        probe.remove();
        return { fill: shape ? getComputedStyle(shape).fill : null, link: link ? getComputedStyle(link).color : null, linkText };
      });
      expect(painted.fill, 'the mark is painted').not.toBe('none');
      expect(painted.fill, 'with the link\'s colour').toBe(painted.link);
      expect(painted.link, 'which is the system link colour').toBe(painted.linkText);
    });
  }

  for (const [path, rtl] of [[HOME, false], ['/ar/', true]]) {
    test(`${path}: the mark is at the inline-start edge of the row, before every other control`, async ({ page, javaScriptEnabled }) => {
      await page.setViewportSize({ width: 1280, height: 700 });
      await open(page, path, javaScriptEnabled);
      const m = await box(mark(page));
      const others = (await drawnControls(page)).filter((c) => c.name !== 'LUZ' && !/^$/.test(c.name));
      expect(others.length).toBeGreaterThan(0);
      for (const c of others) {
        if (rtl) expect(m.right, `to the right of ${c.name}`).toBeGreaterThanOrEqual(c.right - 1);
        else expect(m.left, `to the left of ${c.name}`).toBeLessThanOrEqual(c.left + 1);
      }
      // And near the edge: inside the first half of the window, on the starting side
      if (rtl) expect(m.left).toBeGreaterThan(640);
      else expect(m.right).toBeLessThan(640);
    });
  }
});
