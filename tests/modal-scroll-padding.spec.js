// @ts-check
/**
 * LUZ: the room a focused control keeps from the pinned bars of a full-screen modal.
 *
 * Under `@media (max-width: 640px), (max-height: 30rem)` every `.luz-modal` is the screen, with a header
 * pinned to its top and a footer pinned to its bottom (or scrolling with the content in a short window).
 * The dialog's `scroll-padding-block` is the height of those bars and one more step of space (`--luz-space-md`):
 * Firefox ignores the padding when the control is already inside the scrollport, and WebKit's scroll for a
 * keyboard focus stops 10 to 18 px short of it, so a padding of exactly the bar's height leaves the control
 * under the bar there. The slack makes both work. Chromium passes with or without it, so this spec pins the
 * number, not the browser's behaviour (the walk with Tab is in tests/modal.spec.js).
 *
 * The same padding reaches every dialog that shares the CSS: core's modal (tests/fixtures/modal.html), the
 * search dialog and the prompt dialog (a `.luz-modal` with its own class). In a larger window none has a scroll
 * padding of this kind. In a window under 30rem tall the footer scrolls with the content, so only the start is
 * pinned there and the end keeps its one small step (`--luz-space-xs`). Heights are read from the page, and the step is resolved through a probe element:
 * nothing is typed.
 *
 * Run with: pnpm exec playwright test tests/modal-scroll-padding.spec.js --project=chromium
 */
import { test, expect } from '@playwright/test';
import { routeOf } from './helpers/docs-site.js';

const FIXTURE = '/tests/fixtures/modal.html';
const SEARCH_PAGE = routeOf('c-button');
const PROMPT_PAGE = '/docs/get-started/ai/';

/** Windows that are the screen: two phones held upright, and a window 800x400 (the `max-height: 30rem` branch). */
const SMALL = [
  { width: 375, height: 667 },
  { width: 320, height: 568 },
  { width: 800, height: 400 },
];
/** Windows where the modal floats. */
const LARGE = [
  { width: 1280, height: 800 },
  { width: 1024, height: 600 },
];

const size = ({ width, height }) => `${width}x${height}`;

/** A length of the design system in px, as this page resolves it: `lengthOf(page, 'var(--luz-space-md)')`. */
function lengthOf(page, expression) {
  return page.evaluate((expr) => {
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;visibility:hidden;inline-size:${expr}`;
    document.body.append(probe);
    const px = probe.getBoundingClientRect().width;
    probe.remove();
    return px;
  }, expression);
}

/**
 * What the dialog's scroll padding is, and the real height of the bars it pins.
 * @param {import('@playwright/test').Locator} dialog
 * @param {{ head: string, foot: string | null }} bars selectors of the header and of the footer inside the dialog
 */
const measure = (dialog, bars) =>
  dialog.evaluate((d, selectors) => {
    const cs = getComputedStyle(d);
    const height = (selector) => {
      const el = selector ? d.querySelector(selector) : null;
      return el ? el.getBoundingClientRect().height : null;
    };
    const px = (value) => (value === 'auto' ? 0 : parseFloat(value) || 0);
    return {
      startComputed: cs.scrollPaddingBlockStart,
      endComputed: cs.scrollPaddingBlockEnd,
      start: px(cs.scrollPaddingBlockStart),
      end: px(cs.scrollPaddingBlockEnd),
      head: height(selectors.head),
      foot: height(selectors.foot),
      footPosition: selectors.foot ? getComputedStyle(d.querySelector(selectors.foot)).position : null,
    };
  }, bars);

/* ---- core's modal --------------------------------------------------------- */

async function openCore(page, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(FIXTURE);
  await page.locator('button[commandfor="tall"][command="show-modal"]').click();
  const dialog = page.locator('dialog#tall');
  await expect(dialog).toBeVisible();
  return dialog;
}

const CORE_BARS = { head: '.luz-modal__header', foot: '.luz-modal__footer' };

test.describe('core modal: the scroll padding is the bar plus one step', () => {
  test.beforeEach(({ javaScriptEnabled }) => {
    test.skip(javaScriptEnabled === false, 'measured in the page');
  });

  for (const viewport of SMALL) {
    test(`${size(viewport)}: at the start it is at least the header and --luz-space-md, at the end (footer pinned) at least the footer and --luz-space-md`, async ({ page }) => {
      const dialog = await openCore(page, viewport);
      const gap = await lengthOf(page, 'var(--luz-space-md)');
      expect(gap, 'the step is a real length').toBeGreaterThan(0);
      const m = await measure(dialog, CORE_BARS);
      expect(m.start, `scroll-padding-block-start ${m.startComputed} against a header of ${m.head}px and a step of ${gap}px`).toBeGreaterThanOrEqual(m.head + gap - 0.5);
      if (m.footPosition === 'sticky') {
        expect(m.end, `scroll-padding-block-end ${m.endComputed} against a footer of ${m.foot}px and a step of ${gap}px`).toBeGreaterThanOrEqual(m.foot + gap - 0.5);
      } else {
        // Under 30rem tall the footer scrolls with the content: nothing pins it, and the end keeps its one small step as before
        const small = await lengthOf(page, 'var(--luz-space-xs)');
        expect(m.end, 'scroll-padding-block-end of a short window, with the footer in the flow').toBeCloseTo(small, 0);
      }
    });
  }

  for (const viewport of LARGE) {
    test(`${size(viewport)}: the modal floats and has no scroll padding of this kind`, async ({ page }) => {
      const dialog = await openCore(page, viewport);
      const m = await measure(dialog, CORE_BARS);
      expect(['auto', '0px'], `scroll-padding-block-start is ${m.startComputed}`).toContain(m.startComputed);
      expect(['auto', '0px'], `scroll-padding-block-end is ${m.endComputed}`).toContain(m.endComputed);
    });
  }
});

/* ---- the search dialog ---------------------------------------------------- */

async function openSearch(page, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(SEARCH_PAGE);
  await page.waitForLoadState('networkidle');
  await page.getByRole('banner').getByRole('button', { name: 'Search', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Search the documentation' });
  await expect(dialog).toBeVisible();
  return dialog;
}

const SEARCH_BARS = { head: '.luz-search__head', foot: null };

test.describe('search dialog: the scroll padding is the head plus one step', () => {
  test.beforeEach(({ javaScriptEnabled }) => {
    test.skip(javaScriptEnabled === false, 'measured in the page');
  });

  for (const viewport of SMALL) {
    test(`${size(viewport)}: at the start it is at least the head and --luz-space-md`, async ({ page }) => {
      const dialog = await openSearch(page, viewport);
      const gap = await lengthOf(page, 'var(--luz-space-md)');
      const m = await measure(dialog, SEARCH_BARS);
      expect(m.head, 'the head is pinned and has a height').toBeGreaterThan(0);
      expect(m.start, `scroll-padding-block-start ${m.startComputed} against a head of ${m.head}px and a step of ${gap}px`).toBeGreaterThanOrEqual(m.head + gap - 0.5);
    });
  }

  for (const viewport of LARGE) {
    test(`${size(viewport)}: the dialog floats and has no scroll padding at the start`, async ({ page }) => {
      const dialog = await openSearch(page, viewport);
      const m = await measure(dialog, SEARCH_BARS);
      expect(['auto', '0px'], `scroll-padding-block-start is ${m.startComputed}`).toContain(m.startComputed);
    });
  }
});

/* ---- the prompt dialog ---------------------------------------------------- */

async function openPrompt(page, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(PROMPT_PAGE);
  const opener = page.locator('section:has(> #start-site)').getByRole('button', { name: 'Open the prompt', exact: true });
  await expect(opener).toBeVisible();
  await opener.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'The prompt to start a site' });
  await expect(dialog).toBeVisible();
  return dialog;
}

const PROMPT_BARS = { head: '.luz-modal__header', foot: '.site-prompt__foot' };

test.describe('prompt dialog: the scroll padding is the bar plus one step', () => {
  test.beforeEach(({ javaScriptEnabled }) => {
    test.skip(javaScriptEnabled === false, 'measured in the page');
  });

  for (const viewport of SMALL) {
    test(`${size(viewport)}: at the start it is at least the header and --luz-space-md, at the end (foot pinned) at least the foot and --luz-space-md`, async ({ page }) => {
      const dialog = await openPrompt(page, viewport);
      const gap = await lengthOf(page, 'var(--luz-space-md)');
      const m = await measure(dialog, PROMPT_BARS);
      expect(m.start, `scroll-padding-block-start ${m.startComputed} against a header of ${m.head}px and a step of ${gap}px`).toBeGreaterThanOrEqual(m.head + gap - 0.5);
      // Under 30rem tall the foot scrolls with the content and nothing pins it: only a pinned foot needs the room
      if (m.footPosition === 'sticky') {
        expect(m.end, `scroll-padding-block-end ${m.endComputed} against a foot of ${m.foot}px and a step of ${gap}px`).toBeGreaterThanOrEqual(m.foot + gap - 0.5);
      }
    });
  }

  for (const viewport of LARGE) {
    test(`${size(viewport)}: the dialog floats and has no scroll padding of this kind`, async ({ page }) => {
      const dialog = await openPrompt(page, viewport);
      const m = await measure(dialog, PROMPT_BARS);
      expect(['auto', '0px'], `scroll-padding-block-start is ${m.startComputed}`).toContain(m.startComputed);
      expect(['auto', '0px'], `scroll-padding-block-end is ${m.endComputed}`).toContain(m.endComputed);
    });
  }
});
