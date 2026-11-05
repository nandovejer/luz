// @ts-check
/**
 * The link under the day bar of the home (`.landing-day__link`: "Read the luz-theme-time docs", in English, Spanish and
 * Arabic) reads as a line of words at 320, 360 and 768 px, in light, dark and high contrast.
 *
 * Bug (Safari review, reproduced in Chromium): the link is `display: flex` with `overflow-wrap: anywhere`, so at 320 px its
 * flex items shrink to a single letter and the word "docs" breaks into "doc" and "s". A word is never split across two
 * lines (a hyphen of the element's name, `luz-theme-time`, is a place to break: its parts are the words), and nothing in the
 * link or the page overflows sideways.
 *
 * The link is in the markup, so the no-JS project checks it in light; the modes are chosen by a script.
 */
import { test, expect } from '@playwright/test';
import { seedMode } from './helpers/site-lights.js';

const ROUTES = ['/', '/es/', '/ar/'];
const WIDTHS = [320, 360, 768];
const MODES = ['light', 'dark', 'high-contrast'];

/**
 * In the page: every word of the link (a run of letters, the name's hyphens apart) with the lines it is drawn on, and what
 * overflows. A word on two lines has rects with different tops.
 * @param {Element} link
 */
function readLink(link) {
  const words = [];
  const walker = document.createTreeWalker(link, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = /** @type {Text} */ (walker.currentNode);
    for (const match of node.data.matchAll(/[^\s\-‐-―]+/g)) {
      const range = document.createRange();
      range.setStart(node, match.index);
      range.setEnd(node, match.index + match[0].length);
      const tops = [...new Set([...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top)))];
      words.push({ word: match[0], lines: tops.length });
    }
  }
  const box = link.getBoundingClientRect();
  const root = document.documentElement;
  return {
    words,
    split: words.filter((w) => w.lines > 1).map((w) => w.word),
    pageOverflow: root.scrollWidth - root.clientWidth,
    linkOverflow: link.scrollWidth - link.clientWidth,
    right: box.right,
    left: box.left,
    viewport: window.innerWidth,
  };
}

for (const route of ROUTES) {
  for (const width of WIDTHS) {
    for (const mode of MODES) {
      test(`${route} at ${width} px, ${mode}: no word of the link under the day bar is split, and nothing overflows`, async ({ page, javaScriptEnabled }) => {
        test.skip(javaScriptEnabled === false && mode !== 'light', 'the modes are chosen by a script');
        await page.setViewportSize({ width, height: 800 });
        if (javaScriptEnabled !== false) await seedMode(page, mode);
        await page.goto(route);
        const link = page.locator('.landing-day__link');
        await expect(link, 'the link under the day bar').toHaveCount(1);
        await link.scrollIntoViewIfNeeded();
        await expect(link).toBeVisible();
        const read = await link.evaluate(readLink);
        // The words are really there (the check is not vacuous)
        expect(read.words.length, 'words in the link').toBeGreaterThanOrEqual(3);
        expect(read.split, `words drawn on two lines in "${(await link.textContent())?.trim()}"`).toEqual([]);
        expect(read.linkOverflow, 'the link overflows sideways').toBeLessThanOrEqual(1);
        expect(read.pageOverflow, 'the page overflows sideways').toBeLessThanOrEqual(0);
        expect(read.left, 'the link starts inside the window').toBeGreaterThanOrEqual(-1);
        expect(read.right, 'the link ends inside the window').toBeLessThanOrEqual(read.viewport + 1);
      });
    }
  }
}
