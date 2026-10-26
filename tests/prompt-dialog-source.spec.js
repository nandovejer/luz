// @ts-check
/**
 * The dialog of a prompt for AI shows the prompt as its own source, the way a Markdown file looks open in an
 * editor (.claude/plans/ai-and-catalog-only.md, "Rama suelta: la lectura del prompt"). What it must do:
 *
 *   - every character of the .txt is on screen, in order, in the code font, on a ground that is not the dialog's:
 *     one row (.site-prompt__line) per line, an h3 for each "#" / "##" line, the marks (#, -, backticks, ```) kept;
 *   - the line numbers are generated content with an empty alternative: not in the text, not in a selection,
 *     not in the accessibility tree; their gutter is on the left (also in Arabic) and a wrapped line goes on
 *     under its own text;
 *   - while Copy is locked the text cannot be selected (a drag, a triple click, a range copy nothing); once it is
 *     on, the text is selectable and the selection holds the text and no numbers;
 *   - an address of the site or of @luz-ds on the CDN is a link that opens in another tab, named by its text and
 *     then the hint in the page's language, and clicking it keeps the dialog and the progress; any other
 *     address stays text; the link to the raw text in the footer is the same kind of link;
 *   - Tab goes close, region, the links, the raw text link, Copy; a link reached by Tab keeps the region's
 *     scroll padding from the edge, so its ring is not cut;
 *   - every colour of the syntax and the line numbers pass 4.5:1 on their ground in the three modes and the
 *     six lights; at 320 px with the text spacing of WCAG 1.4.12 nothing scrolls sideways; in forced colours the
 *     marks and the underline of a link stay; axe passes in the three modes.
 *
 * The behaviour of the dialog (Copy, progress, lock, copy) is tests/prompt-dialog.spec.js. These tests look at
 * the classes the brief names (.site-prompt__text, .site-prompt__line, site-prompt__tok-*) and at roles.
 * Run with: pnpm exec playwright test tests/prompt-dialog-source.spec.js --project=chromium
 */
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { over, ratio } from '../packages/tokens/lib/contrast.js';
import { settled } from './helpers/settle.js';
import { LIGHTS } from './helpers/site-lights.js';

const TXT = '/prompts/start.txt';
const MIN_TEXT = 4.5;

const catalog = (code) => JSON.parse(readFileSync(new URL(`../apps/landing/i18n/${code}.json`, import.meta.url), 'utf-8'));

/** Where the start prompt opens in each language: the docs page, or the home when the docs have no such language. */
const LANGS = {
  en: { route: '/docs/get-started/ai/', opener: 'Open the prompt' },
  es: { route: '/es/docs/get-started/ai/', opener: 'Abrir el prompt' },
  ar: { route: '/ar/', home: true },
};

/** A prompt for the tests that need a known text; it fits the dialog, so Copy is on from the start. */
const SHORT = ['# A title', '', 'alpha beta', '- gamma', 'delta `code` "said"', ''].join('\n');
const SHORT_NORMALIZED = '# A title alpha beta - gamma delta `code` "said"';

/** Addresses: two of the site and of @luz-ds, and four that look like them and are not. */
const SITE = 'https://nandovejer.github.io/luz/llms.txt';
const CDN = 'https://cdn.jsdelivr.net/npm/@luz-ds/core@0.2.1/dist/luz.min.css';
const NOT_LINKED = [
  'https://example.com/luz/',
  'https://nandovejer.github.io.example.org/luz/',
  'https://cdn.jsdelivr.net/npm/other-package/x.js',
  'http://nandovejer.github.io/luz/',
];
const ADDRESSES = ['# Addresses', '', `Site: ${SITE}. CDN: ${CDN}, and no more.`, `Not linked: ${NOT_LINKED.join(' and ')} here.`, ''].join('\n');

/** A long prompt with one address in the middle, to read part of it and then follow the link. */
const LONG = ['# A long prompt', ...Array.from({ length: 300 }, (_, i) => (i === 150 ? `see ${SITE} now` : `filler line number ${i}`))].join('\n') + '\n';

/** The lines of a text as the dialog numbers them: a text that ends with a line end has no last, empty line. */
const linesOf = (text) => {
  const lines = text.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
};

/** The "#" / "##" lines outside fenced code blocks. */
function headingLines(text) {
  let fenced = false;
  const out = [];
  for (const line of linesOf(text)) {
    if (/^```/.test(line)) fenced = !fenced;
    else if (!fenced && /^#{1,2} /.test(line)) out.push(line);
  }
  return out;
}

const dialogOf = (page) => page.getByRole('dialog');
const regionOf = (dialog) => dialog.locator('.site-prompt__text');
const rowsOf = (dialog) => regionOf(dialog).locator('.site-prompt__line');
/** The prompt is laid out in rows: the tests that measure them start here, so a missing row is the failure. */
const needRows = (dialog) => expect(rowsOf(dialog).first(), 'the prompt is laid out in .site-prompt__line rows').toBeVisible();
const copyOf = (dialog) => dialog.locator('[data-prompt-copy]');
const scrollToEnd = (region) => region.evaluate((el) => { el.scrollTop = el.scrollHeight; });

/**
 * Open the start prompt in a language from the keyboard and wait until its headings are laid out.
 * @param {import('@playwright/test').Page} page
 * @param {'en' | 'es' | 'ar'} lang
 */
async function openStart(page, lang) {
  const words = catalog(lang);
  const { route, opener, home } = LANGS[lang];
  // The globe of the home is not what these tests look at
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(route);
  const button = home
    ? page.locator('section#inside-4').getByRole('button', { name: words['inside.start.open'], exact: true })
    : page.locator('section:has(> #start-site)').getByRole('button', { name: opener, exact: true });
  await expect(button).toBeVisible();
  await button.focus();
  await page.keyboard.press('Enter');
  const dialog = dialogOf(page);
  await expect(dialog).toBeVisible();
  await expect(regionOf(dialog).getByRole('heading', { level: 3 }).first()).toBeVisible();
  return dialog;
}

/** Serve `body` as the start prompt. */
const serve = (page, body) =>
  page.route(`**${TXT}`, (route) => route.fulfill({ status: 200, contentType: 'text/plain; charset=utf-8', body }));

/** What the footer link and the address links of a language must be named. */
const hint = (lang) => catalog(lang)['prompt.new-tab'];
const fileText = (lang) => catalog(lang)['prompt.file'];

test.beforeEach(async ({ javaScriptEnabled }) => {
  test.skip(javaScriptEnabled === false, 'the dialog is written by JavaScript');
});

/* ---- The text, in the code font, on its own ground -------------------------------------------------------- */

test.describe('the prompt as its source', () => {
  test('the text of the region is the file, byte for byte, then the end sentence', async ({ page, request }) => {
    const text = await (await request.get(TXT)).text();
    const dialog = await openStart(page, 'en');
    const shown = await regionOf(dialog).evaluate((el) => el.textContent);
    expect(shown).toBe(`${text}End of the prompt.`);
  });

  test('there is one row per line of the file and an h3 for each # or ## line, with no role on the rows', async ({ page, request }) => {
    const text = await (await request.get(TXT)).text();
    const dialog = await openStart(page, 'en');
    const region = regionOf(dialog);
    await expect(region.locator('.site-prompt__line')).toHaveCount(linesOf(text).length);
    const headings = headingLines(text);
    await expect(region.getByRole('heading', { level: 3 })).toHaveCount(headings.length);
    // Each h3 is its line of the file, mark included
    const shown = await region.getByRole('heading', { level: 3 }).evaluateAll((all) => all.map((h) => (h.textContent ?? '').replace(/\n$/, '')));
    expect(shown).toEqual(headings);
    // Nothing inside the text gets a role of its own: a screen reader meets headings and plain text
    await expect(region.locator('.site-prompt__line[role], .site-prompt__line [role], h3[role]')).toHaveCount(0);
  });

  test('the marks of the syntax are on screen: #, a list dash, backticks and the fence', async ({ page, request }) => {
    const text = await (await request.get(TXT)).text();
    const lines = linesOf(text);
    const dash = lines.find((l) => /^- /.test(l));
    const ticks = lines.find((l) => /`[^`]+`/.test(l) && !/^```/.test(l));
    const fence = lines.find((l) => /^```\w+/.test(l));
    expect(dash && ticks && fence, 'the start prompt has a list, inline code and a fenced block').toBeTruthy();
    const dialog = await openStart(page, 'en');
    const seen = await regionOf(dialog).evaluate((el) => /** @type {HTMLElement} */ (el).innerText);
    for (const line of [headingLines(text)[0], dash, ticks, fence]) expect(seen, line).toContain(/** @type {string} */ (line).trimEnd());
  });

  test('the text is in the code font, and its ground is not the dialog\'s', async ({ page }) => {
    const dialog = await openStart(page, 'en');
    const m = await dialog.evaluate((d) => {
      const region = /** @type {HTMLElement} */ (d.querySelector('.site-prompt__text'));
      const probe = document.createElement('span');
      probe.style.fontFamily = 'var(--luz-font-mono)';
      d.append(probe);
      const mono = getComputedStyle(probe).fontFamily;
      probe.remove();
      const family = (el) => (el ? getComputedStyle(el).fontFamily : null);
      return {
        mono,
        region: family(region),
        line: family(region.querySelector('.site-prompt__line')),
        heading: family(region.querySelector('h3')),
        link: family(region.querySelector('a')),
        regionBg: getComputedStyle(region).backgroundColor,
        dialogBg: getComputedStyle(d).backgroundColor,
      };
    });
    expect(m.mono).toMatch(/mono|Menlo|Consolas/i);
    for (const part of ['region', 'line', 'heading', 'link']) expect(m[part], part).toBe(m.mono);
    expect(m.regionBg, 'the region has a ground of its own').not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
    expect(m.regionBg, 'the ground of the region differs from the dialog\'s').not.toBe(m.dialogBg);
  });

  test('es: the prompt keeps the code font and the lines whatever the page language', async ({ page, request }) => {
    const text = await (await request.get(TXT)).text();
    const dialog = await openStart(page, 'es');
    const region = regionOf(dialog);
    await expect(region.locator('.site-prompt__line')).toHaveCount(linesOf(text).length);
    expect(await region.evaluate((el) => el.textContent)).toBe(`${text}Fin del prompt.`);
  });
});

/* ---- Line numbers ----------------------------------------------------------------------------------------- */

test.describe('line numbers', () => {
  test('they are generated content with an empty alternative: counted, drawn, and not text', async ({ page }) => {
    const dialog = await openStart(page, 'en');
    await needRows(dialog);
    const m = await regionOf(dialog).evaluate((region) => {
      const lines = [...region.querySelectorAll('.site-prompt__line')];
      const content = (el) => getComputedStyle(el, '::before').content;
      return { first: content(lines[0]), last: content(lines[lines.length - 1]), count: lines.length };
    });
    for (const content of [m.first, m.last]) {
      expect(content, 'the number is counter-based').toMatch(/^counter\(/);
      expect(content, 'the number has an empty alternative text').toMatch(/\/ ""$/);
    }
  });

  for (const lang of ['en', 'ar']) {
    test(`${lang}: the gutter is on the left, and a wrapped line goes on under its text, not under the number`, async ({ page, request }) => {
      await page.setViewportSize({ width: 800, height: 900 });
      const text = await (await request.get(TXT)).text();
      const dialog = await openStart(page, /** @type {'en' | 'ar'} */ (lang));
    await needRows(dialog);
      const m = await regionOf(dialog).evaluate((region, digits) => {
        const lines = [...region.querySelectorAll('.site-prompt__line')];
        // The longest line wraps in a dialog this wide
        const line = lines.reduce((a, b) => ((b.textContent ?? '').length > (a.textContent ?? '').length ? b : a));
        // The boxes of the text itself (not of the cell, which has padding), by visual row
        const rects = [];
        const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const range = document.createRange();
          range.selectNodeContents(node);
          rects.push(...[...range.getClientRects()].filter((r) => r.width > 0));
        }
        rects.sort((a, b) => a.top - b.top);
        const rows = [];
        for (const r of rects) {
          const row = rows[rows.length - 1];
          if (row && r.top < row.top + 6) row.left = Math.min(row.left, r.left);
          else rows.push({ top: r.top, left: r.left });
        }
        const style = getComputedStyle(line);
        const canvas = document.createElement('canvas').getContext('2d');
        canvas.font = `${style.fontSize} ${style.fontFamily}`;
        return {
          box: line.getBoundingClientRect().left,
          rowLefts: rows.map((row) => row.left),
          digits: canvas.measureText('0'.repeat(digits)).width,
          dir: getComputedStyle(region.querySelector('.site-prompt__line')).direction,
        };
      }, String(linesOf(text).length).length);
      expect(m.dir, 'the source reads left to right').toBe('ltr');
      expect(m.rowLefts.length, 'the longest line wraps').toBeGreaterThanOrEqual(2);
      for (const left of m.rowLefts) {
        expect(left - m.box, 'rows start after a gutter wide enough for the numbers').toBeGreaterThanOrEqual(m.digits);
        expect(Math.abs(left - m.rowLefts[0]), 'a wrapped row starts at the column of the first').toBeLessThanOrEqual(1);
      }
    });
  }
});

/* ---- Locked, unlocked ------------------------------------------------------------------------------------- */

test.describe('selection', () => {
  test('while Copy is locked nothing in the text can be selected', async ({ page }) => {
    const dialog = await openStart(page, 'en');
    const region = regionOf(dialog);
    await expect(copyOf(dialog)).toHaveAttribute('aria-disabled', 'true');
    expect(await region.evaluate((el) => getComputedStyle(el).userSelect)).toBe('none');
    const selected = () => page.evaluate(() => window.getSelection()?.toString() ?? '');
    // A triple click on a line of text
    const box = await region.locator('.site-prompt__line').nth(2).boundingBox();
    await page.mouse.click((box?.x ?? 0) + 200, (box?.y ?? 0) + 5, { clickCount: 3 });
    expect(await selected(), 'after a triple click').toBe('');
    // A drag over several lines
    await page.mouse.move((box?.x ?? 0) + 50, (box?.y ?? 0) + 5);
    await page.mouse.down();
    await page.mouse.move((box?.x ?? 0) + 300, (box?.y ?? 0) + 120);
    await page.mouse.up();
    expect(await selected(), 'after a drag').toBe('');
    // A range over the whole region
    await region.evaluate((el) => window.getSelection()?.selectAllChildren(el));
    expect(await selected(), 'after selecting the region').toBe('');
    // Select all with the keyboard: whatever the page selects, the prompt is not in it
    await region.focus();
    await page.keyboard.press('Control+A');
    expect(await selected(), 'after Ctrl+A').not.toContain('You are helping a person');
  });

  test('once Copy is on, the text is selectable and a selection holds the text and no line numbers', async ({ page }) => {
    await serve(page, SHORT);
    const dialog = await openStart(page, 'en');
    await needRows(dialog);
    const region = regionOf(dialog);
    await expect(copyOf(dialog)).toHaveAttribute('aria-disabled', 'false');
    expect(await region.evaluate((el) => getComputedStyle(el).userSelect)).not.toBe('none');
    const selected = await region.evaluate((el) => {
      const source = el.querySelector('.site-prompt__line')?.parentElement;
      window.getSelection()?.selectAllChildren(/** @type {Node} */ (source));
      return window.getSelection()?.toString() ?? '';
    });
    expect(selected.replace(/\s+/g, ' ').trim()).toBe(SHORT_NORMALIZED);
  });

  test('a prompt read to the end unlocks the selection too', async ({ page, request }) => {
    const text = await (await request.get(TXT)).text();
    const dialog = await openStart(page, 'en');
    await needRows(dialog);
    const region = regionOf(dialog);
    await scrollToEnd(region);
    await expect(copyOf(dialog)).toHaveAttribute('aria-disabled', 'false');
    expect(await region.evaluate((el) => getComputedStyle(el).userSelect)).not.toBe('none');
    const selected = await region.evaluate((el) => {
      const source = el.querySelector('.site-prompt__line')?.parentElement;
      window.getSelection()?.selectAllChildren(/** @type {Node} */ (source));
      return window.getSelection()?.toString() ?? '';
    });
    expect(selected.replace(/\s+/g, ' ').trim()).toBe(text.replace(/\s+/g, ' ').trim());
  });
});

/* ---- Addresses -------------------------------------------------------------------------------------------- */

test.describe('addresses', () => {
  test('the addresses of the site and of @luz-ds are links in a new tab, any other stays text', async ({ page }) => {
    await serve(page, ADDRESSES);
    const dialog = await openStart(page, 'en');
    const region = regionOf(dialog);
    const links = await region.locator('a').evaluateAll((all) =>
      all.map((a) => ({ href: a.getAttribute('href'), text: a.textContent, target: a.getAttribute('target'), rel: a.getAttribute('rel') })),
    );
    expect(links.map((l) => l.href)).toEqual([SITE, CDN]);
    for (const link of links) {
      expect(link.text, 'the text of a link is its address, without the punctuation after it').toBe(link.href);
      expect(link.target).toBe('_blank');
      expect((link.rel ?? '').split(/\s+/).sort()).toEqual(['noopener', 'noreferrer']);
    }
    const shown = await region.evaluate((el) => el.textContent);
    for (const address of NOT_LINKED) expect(shown, address).toContain(address);
  });

  for (const lang of ['en', 'es', 'ar']) {
    test(`${lang}: a link is named by its text and then the hint, and has the language of the page unless it is English`, async ({ page }) => {
      await serve(page, ADDRESSES);
      const dialog = await openStart(page, /** @type {'en' | 'es' | 'ar'} */ (lang));
      const links = regionOf(dialog).locator('a');
      await expect(links).toHaveCount(2);
      const m = await links.evaluateAll((all) =>
        all.map((a) => ({ text: a.textContent ?? '', label: a.getAttribute('aria-label') ?? '', lang: a.getAttribute('lang'), page: document.documentElement.lang })),
      );
      for (const link of m) {
        expect(link.label.startsWith(link.text), 'the name starts with the visible text (WCAG 2.5.3)').toBe(true);
        expect(link.label.endsWith(hint(lang)), 'the name ends with the hint of the page language').toBe(true);
        if (lang === 'en') expect(link.lang, 'no lang on English').toBeNull();
        else expect(link.lang, 'the hint is in the language of the page').toBe(link.page);
      }
      // The role and the name a screen reader gets
      await expect(dialog.getByRole('link', { name: `${SITE} ${hint(lang)}`, exact: true })).toHaveCount(1);
    });

    test(`${lang}: the link to the raw text opens in a new tab and is named by its text and then the hint`, async ({ page }) => {
      const dialog = await openStart(page, /** @type {'en' | 'es' | 'ar'} */ (lang));
      const file = dialog.getByRole('link', { name: `${fileText(lang)} ${hint(lang)}`, exact: true });
      await expect(file).toHaveCount(1);
      await expect(file).toHaveAttribute('href', new RegExp(`${TXT.replace('.', '\\.')}$`));
      await expect(file).toHaveAttribute('target', '_blank');
      expect(((await file.getAttribute('rel')) ?? '').split(/\s+/).sort()).toEqual(['noopener', 'noreferrer']);
      expect((await file.textContent())?.trim()).toBe(fileText(lang));
    });
  }

  test('following an address opens another tab, keeps the dialog open, the progress and the lock', async ({ page, context }) => {
    await context.route('https://nandovejer.github.io/**', (route) => route.fulfill({ contentType: 'text/html', body: '<title>site</title>' }));
    await serve(page, LONG);
    const dialog = await openStart(page, 'en');
    const region = regionOf(dialog);
    const link = region.getByRole('link');
    await expect(link).toHaveCount(1);
    await link.evaluate((a) => a.scrollIntoView({ block: 'center' }));
    const progress = dialog.locator('progress');
    const value = () => progress.evaluate((p) => /** @type {HTMLProgressElement} */ (p).value);
    // The scroll event moves the progress a frame later
    await expect.poll(value, { message: 'part of the prompt is read' }).toBeGreaterThan(0);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const before = await value();
    expect(before).toBeLessThan(100);
    const scrollBefore = await region.evaluate((el) => el.scrollTop);
    const popup = context.waitForEvent('page');
    await link.click();
    const opened = await popup;
    expect(opened.url()).toBe(SITE);
    await opened.close();
    await expect(dialog).toBeVisible();
    expect(await progress.evaluate((p) => /** @type {HTMLProgressElement} */ (p).value), 'the progress').toBe(before);
    expect(await region.evaluate((el) => el.scrollTop), 'the scroll').toBe(scrollBefore);
    await expect(copyOf(dialog)).toHaveAttribute('aria-disabled', 'true');
  });
});

/* ---- Keyboard --------------------------------------------------------------------------------------------- */

/** What the focused element is, in the words of the dialog's tab order. */
const stopOf = (page) =>
  page.evaluate(() => {
    const el = /** @type {HTMLElement} */ (document.activeElement);
    if (el.matches('.luz-modal__close')) return 'close';
    if (el.matches('.site-prompt__text')) return 'region';
    if (el.matches('a') && el.closest('.site-prompt__text')) return 'link';
    if (el.matches('.site-prompt__foot a')) return 'file';
    if (el.matches('[data-prompt-copy]')) return 'copy';
    return `other:${el.localName}.${el.className}`;
  });

test.describe('keyboard', () => {
  test('Tab goes close, the region, its links, the link to the raw text, Copy', async ({ page, request }) => {
    const dialog = await openStart(page, 'en');
    const expected = await regionOf(dialog).locator('a').count();
    expect(expected, 'the start prompt has addresses').toBeGreaterThan(0);
    await dialog.locator('.luz-modal__close').focus();
    const order = ['close'];
    const hrefs = [];
    for (let i = 0; i < expected + 4; i += 1) {
      await page.keyboard.press('Tab');
      const stop = await stopOf(page);
      order.push(stop);
      if (stop === 'link') hrefs.push(await page.evaluate(() => /** @type {HTMLAnchorElement} */ (document.activeElement).href));
      if (stop === 'copy') break;
    }
    expect(order).toEqual(['close', 'region', ...Array(expected).fill('link'), 'file', 'copy']);
    // The links in the order of the text
    const text = await (await request.get(TXT)).text();
    let from = 0;
    for (const href of hrefs) {
      const at = text.indexOf(href, from);
      expect(at, `${href} comes in the text after the link before it`).toBeGreaterThanOrEqual(0);
      from = at + href.length;
    }
  });

  test('a link reached by Tab, forwards or backwards, keeps the scroll padding of the region from its edge, so its ring is whole', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 600 });
    const dialog = await openStart(page, 'en');
    const region = regionOf(dialog);
    const measure = () =>
      region.evaluate((el) => {
        const a = /** @type {HTMLElement} */ (document.activeElement);
        const box = el.getBoundingClientRect();
        const link = a.getBoundingClientRect();
        const style = getComputedStyle(a);
        const ring = parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset);
        const s = getComputedStyle(el);
        return {
          top: link.top - box.top,
          bottom: box.bottom - link.bottom,
          padStart: parseFloat(s.scrollPaddingBlockStart),
          padEnd: parseFloat(s.scrollPaddingBlockEnd),
          ring,
          focusVisible: a.matches(':focus-visible'),
        };
      });
    const check = async (where) => {
      const m = await measure();
      expect(m.focusVisible, `${where}: the ring shows`).toBe(true);
      expect(m.padStart, `${where}: scroll padding at the start covers the ring`).toBeGreaterThanOrEqual(m.ring);
      expect(m.padEnd, `${where}: scroll padding at the end covers the ring`).toBeGreaterThanOrEqual(m.ring);
      expect(m.top, `${where}: space above the link`).toBeGreaterThanOrEqual(m.padStart - 1);
      expect(m.bottom, `${where}: space below the link`).toBeGreaterThanOrEqual(m.padEnd - 1);
    };
    const count = await region.locator('a').count();
    expect(count, 'the start prompt has addresses to reach').toBeGreaterThan(1);
    await region.focus();
    for (let i = 0; i < count; i += 1) {
      await page.keyboard.press('Tab');
      expect(await stopOf(page)).toBe('link');
      await check(`forwards, link ${i + 1}`);
    }
    // Backwards from the raw text link, up the prompt
    await dialog.locator('.site-prompt__foot a').focus();
    for (let i = 0; i < count; i += 1) {
      await page.keyboard.press('Shift+Tab');
      expect(await stopOf(page)).toBe('link');
      await check(`backwards, link ${count - i}`);
    }
  });
});

/* ---- Colour ----------------------------------------------------------------------------------------------- */

/**
 * The colours of every kind of token of the prompt, with the layers of the ground under each, as the browser
 * draws them now (any CSS colour syntax goes through a canvas to sRGB).
 */
const colours = (page) =>
  page.evaluate(() => {
    const region = /** @type {HTMLElement} */ (document.querySelector('.site-prompt__text'));
    const ctx = /** @type {CanvasRenderingContext2D} */ (document.createElement('canvas').getContext('2d', { willReadFrequently: true }));
    const rgba = (css) => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000';
      ctx.fillStyle = css;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      return { r, g, b, a: a / 255 };
    };
    const ground = (el) => {
      const layers = [];
      for (let node = el; node; node = node.parentElement) {
        const c = rgba(getComputedStyle(node).backgroundColor);
        if (c.a === 0) continue;
        layers.push(c);
        if (c.a === 1) break;
      }
      return layers;
    };
    const items = [{ name: 'text', fg: rgba(getComputedStyle(region).color), ground: ground(region) }];
    const seen = new Set();
    for (const el of region.querySelectorAll('[class*="site-prompt__tok-"]')) {
      if (!el.textContent?.trim() || seen.has(el.className)) continue;
      seen.add(el.className);
      items.push({ name: el.className, fg: rgba(getComputedStyle(el).color), ground: ground(el) });
    }
    const line = /** @type {Element} */ (region.querySelector('.site-prompt__line'));
    items.push({ name: 'line number', fg: rgba(getComputedStyle(line, '::before').color), ground: ground(line) });
    return items;
  });

/** The lowest ratio of the prompt's colours now, with the name of the one that is lowest. */
async function lowest(page) {
  let worst = { name: '', value: Infinity };
  const items = await colours(page);
  for (const item of items) {
    let back = { r: 255, g: 255, b: 255, a: 1 };
    for (const layer of [...item.ground].reverse()) back = layer.a === 1 ? layer : over(layer, back);
    const fg = item.fg.a === 1 ? item.fg : over(item.fg, back);
    const value = ratio(fg, back);
    if (value < worst.value) worst = { name: item.name, value };
  }
  return { ...worst, kinds: items.length };
}

/** True when every colour passes, else the lowest one and its ratio: the failure says which. */
async function passes(page) {
  const worst = await lowest(page);
  return worst.value >= MIN_TEXT ? true : `${worst.name} is ${worst.value.toFixed(2)}:1 (needs ${MIN_TEXT}:1)`;
}

const setLook = (page, mode, light) =>
  page.evaluate(([m, l]) => {
    document.documentElement.setAttribute('data-theme', m);
    if (l) document.documentElement.setAttribute('data-light', l);
    else document.documentElement.removeAttribute('data-light');
  }, [mode, light]);

test.describe('colour', () => {
  test('there are at least four kinds of token to measure', async ({ page }) => {
    const dialog = await openStart(page, 'en');
    await needRows(dialog);
    await expect(dialog).toBeVisible();
    const classes = await regionOf(dialog).evaluate((el) => [...new Set([...el.querySelectorAll('[class*="site-prompt__tok-"]')].map((e) => e.className))]);
    expect(classes.length, classes.join(' ')).toBeGreaterThanOrEqual(4);
    expect(classes.some((c) => /tok-link/.test(c)), 'links').toBe(true);
    expect(classes.some((c) => /tok-heading/.test(c)), 'headings').toBe(true);
  });

  for (const [mode, light] of [['light', 'afternoon'], ['dark', 'night'], ['high-contrast', null]]) {
    test(`${mode}: every colour of the syntax and the line numbers pass ${MIN_TEXT}:1 on their ground`, async ({ page }) => {
      const dialog = await openStart(page, 'en');
      await needRows(dialog);
      await setLook(page, mode, light);
      // The colours ease in: poll until they have settled
      await expect.poll(() => passes(page), { timeout: 8000 }).toBe(true);
    });
  }

  test('the six lights of the site keep the same contrast', async ({ page }) => {
    const dialog = await openStart(page, 'en');
    await needRows(dialog);
    for (const [light, , mode] of LIGHTS) {
      await setLook(page, mode, light);
      await expect.poll(() => passes(page), { timeout: 8000, message: `${light} over ${mode}` }).toBe(true);
    }
  });
});

/* ---- Small windows, forced colours, axe ------------------------------------------------------------------- */

/** The text spacing of WCAG 1.4.12 the reader may apply, as a user stylesheet would. */
const spacing = (page) =>
  page.addStyleTag({ content: '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }' });

test.describe('reflow, forced colours and axe', () => {
  test('at 320 px with the text spacing of WCAG 1.4.12 nothing scrolls sideways', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    const dialog = await openStart(page, 'en');
    await spacing(page);
    const m = await page.evaluate(() => {
      const d = /** @type {HTMLElement} */ (document.querySelector('dialog[open]'));
      const region = /** @type {HTMLElement} */ (d.querySelector('.site-prompt__text'));
      const r = region.getBoundingClientRect();
      const lines = [...region.querySelectorAll('.site-prompt__line')];
      return {
        page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        dialog: d.scrollWidth - d.clientWidth,
        region: region.scrollWidth - region.clientWidth,
        beyond: lines.filter((l) => l.getBoundingClientRect().right > r.right + 1).length,
      };
    });
    expect(m.page, 'the page scrolls sideways by').toBeLessThanOrEqual(0);
    expect(m.dialog, 'the dialog scrolls sideways by').toBeLessThanOrEqual(0);
    expect(m.region, 'the region scrolls sideways by').toBeLessThanOrEqual(1);
    expect(m.beyond, 'rows wider than the region').toBe(0);
    await expect(regionOf(dialog).locator('.site-prompt__line').first()).toBeVisible();
  });

  test('at 320 x 256 px (400 %) with the text spacing, the dialog scrolls and Copy is reachable', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 256 });
    const dialog = await openStart(page, 'en');
    await spacing(page);
    await copyOf(dialog).focus();
    await expect(copyOf(dialog)).toBeFocused();
    const m = await page.evaluate(() => {
      const d = /** @type {HTMLElement} */ (document.querySelector('dialog[open]'));
      const b = /** @type {HTMLElement} */ (document.activeElement).getBoundingClientRect();
      const r = d.getBoundingClientRect();
      return {
        inDialog: b.top >= r.top - 0.5 && b.bottom <= r.bottom + 0.5 && b.left >= r.left - 0.5 && b.right <= r.right + 0.5,
        inWindow: b.top >= -0.5 && b.bottom <= window.innerHeight + 0.5,
        sideways: d.scrollWidth - d.clientWidth,
      };
    });
    expect(m.inDialog, 'Copy is inside the dialog').toBe(true);
    expect(m.inWindow, 'Copy is in the window').toBe(true);
    expect(m.sideways, 'the dialog scrolls sideways by').toBeLessThanOrEqual(0);
  });

  test('in forced colours the # marks, the size of a heading and the underline of a link stay', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    const dialog = await openStart(page, 'en');
    await needRows(dialog);
    const m = await regionOf(dialog).evaluate((region) => {
      const h = /** @type {HTMLElement} */ (region.querySelector('h3'));
      const plain = /** @type {HTMLElement} */ (region.querySelector('.site-prompt__line:not(h3)'));
      const a = /** @type {HTMLElement} */ (region.querySelector('a'));
      const hs = getComputedStyle(h);
      const ps = getComputedStyle(plain);
      return {
        mark: h.innerText.startsWith('#'),
        step: parseFloat(hs.fontSize) > parseFloat(ps.fontSize) || Number(hs.fontWeight) > Number(ps.fontWeight),
        underline: a ? getComputedStyle(a).textDecorationLine : null,
      };
    });
    expect(m.mark, 'the heading starts with its # mark').toBe(true);
    expect(m.step, 'a heading is a step bigger or bolder than the text').toBe(true);
    expect(m.underline, 'a link is underlined').toContain('underline');
  });

  for (const [mode, light] of [['light', 'afternoon'], ['dark', 'night'], ['high-contrast', null]]) {
    test(`axe finds no serious or critical violation in the dialog in ${mode}`, async ({ page }) => {
      const dialog = await openStart(page, 'en');
      await expect(dialog).toBeVisible();
      await setLook(page, mode, light);
      await settled(page);
      await page.waitForTimeout(400);
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      const blocking = violations
        .filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))
        .map((v) => `${v.impact} ${v.id}: ${v.nodes.length} node(s) ${v.nodes[0]?.target?.join(' ')}`);
      expect(blocking, 'serious/critical axe violations').toEqual([]);
      // The prompt is laid out as its source: this is not a pass on an empty dialog
      await expect(regionOf(dialog).locator('.site-prompt__line').first()).toBeVisible();
    });
  }
});
