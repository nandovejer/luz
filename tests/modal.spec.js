// @ts-check
/**
 * LUZ — the modal (.luz-modal) on a small screen
 * (.claude/plans/ai-and-catalog-only.md, "Rama suelta: las modales de core a pantalla completa en móvil").
 *
 * At 640 px wide or less, or in a window 30rem tall or less (a phone held sideways, 400 % zoom), every
 * .luz-modal is the screen: the size of the viewport at 0,0, with no margin, radius, shadow or border. The
 * dialog is the one scroller; the header (title and a 44 px close at the end of the row) is pinned to its top;
 * the footer is pinned to the bottom when the window is taller than 30rem and scrolls with the content when it
 * is not; the dialog's scroll-padding is the height of the pinned bars, so a control focused with Tab is never
 * under them (WCAG 2.4.11). Above that size it floats, as it always did. The entrance eases with
 * --luz-easing-enter; under reduced motion it has no duration.
 *
 * tests/fixtures/modal.html has no script: the browser opens the dialogs (command / commandfor), so the same
 * file is the "without JavaScript" page. Sizes are read from the page as the browser resolves the tokens
 * (`lengthOf`), never typed. The dialogs of a prompt for AI and of the search are in tests/prompt-dialog.spec.js
 * and tests/search.spec.js; the tokens the CSS declares and reads are tests/modal.test.js.
 *
 * The safe-area insets (a notch, a home bar) cannot be emulated by Playwright: they are not tested here.
 * Run with: pnpm exec playwright test tests/modal.spec.js --project=chromium
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { MODES } from './helpers/design-tokens.js';
import { focusAndHitTest } from './helpers/obscured.js';
import { faded } from './helpers/settle.js';

const FIXTURE = '/tests/fixtures/modal.html';

/** Windows 30rem tall or more, and 640 px wide or less: a phone held upright */
const PHONES = [
  { width: 375, height: 667 },
  { width: 320, height: 568 },
];
/** A phone held sideways: under 30rem tall, so the footer scrolls with the content */
const SIDEWAYS = [
  { width: 667, height: 375 },
  { width: 844, height: 390 },
];
/** The last width and the last height that are still the screen */
const EDGES_FULL = [
  { width: 640, height: 800 },
  { width: 1024, height: 480 },
];
/** One pixel more, in each direction, and the usual desktop sizes: the modal floats */
const FLOATING = [
  { width: 1024, height: 600 },
  { width: 1280, height: 800 },
  { width: 641, height: 800 },
  { width: 1024, height: 481 },
];

const size = ({ width, height }) => `${width}x${height}`;

/** Open a dialog of the fixture with the button that has command="show-modal" for it. */
async function openDialog(page, id, viewport, { dir } = {}) {
  await page.setViewportSize(viewport);
  await page.goto(FIXTURE);
  if (dir) await page.evaluate((d) => { document.documentElement.dir = d; }, dir);
  await page.locator(`button[commandfor="${id}"][command="show-modal"]`).click();
  const dialog = page.locator(`dialog#${id}`);
  await expect(dialog).toBeVisible();
  return dialog;
}

/** A length of the design system in px, as this page resolves it: `lengthOf(page, 'var(--luz-control-lg)')`. */
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

const scrollDialog = (dialog, where) => dialog.evaluate((d, w) => { d.scrollTop = w === 'end' ? d.scrollHeight : w === 'middle' ? (d.scrollHeight - d.clientHeight) / 2 : 0; }, where);

/** The boxes the tests compare, read in one go from an open dialog. */
const boxes = (dialog) => dialog.evaluate((d) => {
  const r = (el) => { const b = el.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, width: b.width, height: b.height }; };
  const header = d.querySelector('.luz-modal__header');
  const footer = d.querySelector('.luz-modal__footer');
  const cs = getComputedStyle(d);
  return {
    viewport: { width: window.innerWidth, height: window.innerHeight },
    dialog: r(d),
    header: r(header),
    footer: r(footer),
    close: r(d.querySelector('.luz-modal__close')),
    title: r(d.querySelector('.luz-modal__title')),
    footerPosition: getComputedStyle(footer).position,
    headerPosition: getComputedStyle(header).position,
    scrollPaddingTop: parseFloat(cs.scrollPaddingTop) || 0,
    scrollPaddingBottom: parseFloat(cs.scrollPaddingBottom) || 0,
    scrollTop: d.scrollTop,
    scrollHeight: d.scrollHeight,
    clientHeight: d.clientHeight,
  };
});

/* ---- The size ------------------------------------------------------------- */

test.describe('a small screen: the modal is the screen', () => {
  test.beforeEach(({ javaScriptEnabled }) => {
    test.skip(javaScriptEnabled === false, 'measured in the page');
  });

  for (const viewport of [...PHONES, ...SIDEWAYS, ...EDGES_FULL]) {
    test(`${size(viewport)}: the open dialog is at 0,0 and the size of the window, with no radius, shadow, margin or border`, async ({ page }) => {
      const dialog = await openDialog(page, 'short', viewport);
      const b = await boxes(dialog);
      expect(b.dialog.left).toBeCloseTo(0, 0);
      expect(b.dialog.top).toBeCloseTo(0, 0);
      expect(b.dialog.width).toBeCloseTo(viewport.width, 0);
      expect(b.dialog.height).toBeCloseTo(viewport.height, 0);
      for (const corner of ['top-left', 'top-right', 'bottom-left', 'bottom-right']) {
        await expect(dialog, `${corner} radius`).toHaveCSS(`border-${corner}-radius`, '0px');
      }
      await expect(dialog).toHaveCSS('box-shadow', 'none');
      for (const side of ['top', 'right', 'bottom', 'left']) {
        await expect(dialog, `${side} margin`).toHaveCSS(`margin-${side}`, '0px');
        await expect(dialog, `${side} border`).toHaveCSS(`border-${side}-width`, '0px');
      }
    });
  }

  for (const viewport of FLOATING) {
    test(`${size(viewport)}: the dialog floats, centred, inside its maximum width, with its radius and shadow`, async ({ page }) => {
      const dialog = await openDialog(page, 'short', viewport);
      const b = await boxes(dialog);
      const maxWidth = await dialog.evaluate((d) => parseFloat(getComputedStyle(d).maxWidth));
      expect(Number.isFinite(maxWidth), 'the dialog keeps a maximum inline size').toBe(true);
      expect(b.dialog.width).toBeLessThanOrEqual(maxWidth + 0.5);
      expect(b.dialog.width).toBeLessThan(viewport.width);
      expect(b.dialog.height).toBeLessThan(viewport.height);
      expect(b.dialog.left).toBeGreaterThan(0);
      expect(b.dialog.top).toBeGreaterThan(0);
      expect(Math.abs(b.dialog.left - (viewport.width - b.dialog.right))).toBeLessThanOrEqual(1);
      await expect(dialog).not.toHaveCSS('border-top-left-radius', '0px');
      await expect(dialog).not.toHaveCSS('box-shadow', 'none');
      await expect(dialog).toHaveCSS('border-top-width', '1px');
    });
  }
});

/* ---- The header and its close -------------------------------------------- */

test.describe('a small screen: the header and the close', () => {
  test.beforeEach(({ javaScriptEnabled }) => {
    test.skip(javaScriptEnabled === false, 'measured in the page');
  });

  for (const viewport of PHONES) {
    test(`${size(viewport)}: the close is at least 44 by 44, whole on screen, at the end of the header`, async ({ page }) => {
      const dialog = await openDialog(page, 'short', viewport);
      const target = await lengthOf(page, 'var(--luz-control-lg)');
      const gap = await lengthOf(page, 'var(--luz-space-md)');
      const b = await boxes(dialog);
      expect(b.close.width).toBeGreaterThanOrEqual(target - 0.5);
      expect(b.close.height).toBeGreaterThanOrEqual(target - 0.5);
      expect(b.close.left).toBeGreaterThanOrEqual(0);
      expect(b.close.right).toBeLessThanOrEqual(viewport.width);
      expect(b.close.top).toBeGreaterThanOrEqual(0);
      expect(b.close.bottom).toBeLessThanOrEqual(b.header.bottom + 0.5);
      // At the end: after the title, and no further from the edge than the side padding
      expect(b.close.left).toBeGreaterThanOrEqual(b.title.right - 1);
      expect(viewport.width - b.close.right).toBeLessThanOrEqual(gap);
    });
  }

  for (const viewport of [...PHONES, ...SIDEWAYS]) {
    test(`${size(viewport)}: the header stays at the top while the content scrolls, as tall as a 44 px close, its padding and its line`, async ({ page }) => {
      const dialog = await openDialog(page, 'tall', viewport);
      const expected = await lengthOf(page, 'calc(2 * var(--luz-space-xs) + var(--luz-control-lg) + 1px)');
      expect(await dialog.evaluate((d) => d.scrollHeight - d.clientHeight), 'the content is taller than the window').toBeGreaterThan(200);
      for (const where of ['top', 'middle', 'end']) {
        await scrollDialog(dialog, where);
        const b = await boxes(dialog);
        expect(b.headerPosition).toBe('sticky');
        expect(b.header.top, `header top at ${where}`).toBeCloseTo(0, 0);
        expect(b.header.height, `header height at ${where}`).toBeCloseTo(expected, 0);
        expect(b.close.top, `close top at ${where}`).toBeGreaterThanOrEqual(-0.5);
        expect(b.close.bottom, `close bottom at ${where}`).toBeLessThanOrEqual(b.header.bottom + 0.5);
      }
    });
  }
});

/* ---- The footer ----------------------------------------------------------- */

test.describe('a small screen: the footer', () => {
  test.beforeEach(({ javaScriptEnabled }) => {
    test.skip(javaScriptEnabled === false, 'measured in the page');
  });

  for (const viewport of PHONES) {
    test(`${size(viewport)}: taller than 30rem, the footer stays at the bottom while the content scrolls`, async ({ page }) => {
      const dialog = await openDialog(page, 'tall', viewport);
      for (const where of ['top', 'middle', 'end']) {
        await scrollDialog(dialog, where);
        const b = await boxes(dialog);
        expect(b.footerPosition).toBe('sticky');
        expect(b.footer.bottom, `footer bottom at ${where}`).toBeCloseTo(viewport.height, 0);
      }
      await expect(page.locator('#tall-last')).toBeInViewport({ ratio: 1 });
    });
  }

  for (const viewport of SIDEWAYS) {
    test(`${size(viewport)}: under 30rem tall, the footer scrolls with the content and the last action is reached by scrolling`, async ({ page }) => {
      const dialog = await openDialog(page, 'tall', viewport);
      await scrollDialog(dialog, 'top');
      const atTop = await boxes(dialog);
      expect(atTop.footerPosition).toBe('static');
      expect(atTop.footer.top, 'the footer is below the fold until the reader scrolls').toBeGreaterThanOrEqual(viewport.height);
      await scrollDialog(dialog, 'end');
      const atEnd = await boxes(dialog);
      expect(atEnd.footer.bottom).toBeCloseTo(viewport.height, 0);
      expect(atEnd.header.top, 'the header is still pinned').toBeCloseTo(0, 0);
      await expect(page.locator('#tall-last')).toBeInViewport({ ratio: 1 });
    });
  }
});

/* ---- One scroller, and the room the pinned bars take --------------------- */

test.describe('a small screen: scrolling', () => {
  test.beforeEach(({ javaScriptEnabled }) => {
    test.skip(javaScriptEnabled === false, 'measured in the page');
  });

  for (const viewport of [...PHONES, ...SIDEWAYS]) {
    test(`${size(viewport)}: the dialog is the one scroller, and its scroll padding is the height of the bars it pins`, async ({ page }) => {
      const dialog = await openDialog(page, 'tall', viewport);
      const scrollers = await dialog.evaluate((d) => {
        const own = [...d.querySelectorAll('*')].filter((el) => getComputedStyle(el).overflowY !== 'visible' && el.scrollHeight > el.clientHeight + 1);
        return {
          dialogOverflow: getComputedStyle(d).overflowY,
          dialogScrolls: d.scrollHeight > d.clientHeight + 1,
          inside: own.map((el) => `${el.localName}.${String(el.className).split(' ')[0]}`),
        };
      });
      expect(['auto', 'scroll']).toContain(scrollers.dialogOverflow);
      expect(scrollers.dialogScrolls, 'the dialog scrolls').toBe(true);
      expect(scrollers.inside, 'elements inside the dialog that scroll on their own').toEqual([]);
      const b = await boxes(dialog);
      expect(b.scrollPaddingTop, 'scroll padding at the start is at least the header').toBeGreaterThanOrEqual(b.header.height - 0.5);
      if (b.footerPosition === 'sticky') {
        expect(b.scrollPaddingBottom, 'scroll padding at the end is at least the pinned footer').toBeGreaterThanOrEqual(b.footer.height - 0.5);
      }
    });
  }

  for (const viewport of PHONES) {
    test(`${size(viewport)}: Tab and Shift+Tab through the form never leave a focused control under the header or the footer`, async ({ page }) => {
      const dialog = await openDialog(page, 'tall', viewport);
      const before = await boxes(dialog);
      expect(before.headerPosition, 'the header is pinned').toBe('sticky');
      expect(before.footerPosition, 'the footer is pinned').toBe('sticky');
      const sample = () => page.evaluate(() => {
        const d = document.querySelector('dialog[open]');
        const el = document.activeElement;
        if (!d || !el || !d.contains(el)) return { outside: true };
        const r = el.getBoundingClientRect();
        return {
          name: el.id || el.textContent.trim(),
          inBar: !!el.closest('.luz-modal__header, .luz-modal__footer'),
          top: r.top,
          bottom: r.bottom,
          headerBottom: d.querySelector('.luz-modal__header').getBoundingClientRect().bottom,
          footerTop: d.querySelector('.luz-modal__footer').getBoundingClientRect().top,
          height: window.innerHeight,
        };
      });
      const visited = new Set();
      for (const direction of ['Tab', 'Shift+Tab']) {
        for (let i = 0; i < 18; i++) {
          await page.keyboard.press(direction);
          const s = await sample();
          expect(s.outside, `${direction} ${i}: the focus left the dialog`).toBeUndefined();
          visited.add(s.name);
          expect(s.top, `${s.name}: top edge on screen`).toBeGreaterThanOrEqual(-0.5);
          expect(s.bottom, `${s.name}: bottom edge on screen`).toBeLessThanOrEqual(s.height + 0.5);
          if (s.inBar) continue;
          expect(s.headerBottom - s.top, `${s.name} (${direction}): overlap with the header`).toBeLessThanOrEqual(1);
          expect(s.bottom - s.footerTop, `${s.name} (${direction}): overlap with the footer`).toBeLessThanOrEqual(1);
        }
      }
      expect([...visited], 'the walk reached both ends of the form').toEqual(expect.arrayContaining(['f1', 'f14']));
    });
  }

  test('320x256 (400 % zoom): no sideways scroll, the close is on screen and the last action is reached by scrolling', async ({ page }) => {
    const dialog = await openDialog(page, 'tall', { width: 320, height: 256 });
    const overflow = await page.evaluate(() => ({
      page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      dialog: document.querySelector('dialog[open]').scrollWidth - document.querySelector('dialog[open]').clientWidth,
    }));
    expect(overflow.page, 'the page scrolls sideways by').toBeLessThanOrEqual(0);
    expect(overflow.dialog, 'the dialog scrolls sideways by').toBeLessThanOrEqual(0);
    await expect(page.locator('#tall-close')).toBeInViewport({ ratio: 1 });
    const last = await focusAndHitTest(page.locator('#tall-last'));
    expect(last.inViewport, 'the last action is whole on screen once focused').toBe(true);
    expect(last.covered, 'what is drawn over the last action').toEqual([]);
    await expect(page.locator('#tall-close'), 'the close is still on screen at the end').toBeInViewport({ ratio: 1 });
    const b = await boxes(dialog);
    expect(b.dialog.width).toBeCloseTo(320, 0);
    expect(b.dialog.height).toBeCloseTo(256, 0);
  });
});

/* ---- Direction, motion, colours ------------------------------------------ */

test.describe('a small screen: right to left, motion and forced colours', () => {
  test.beforeEach(({ javaScriptEnabled }) => {
    test.skip(javaScriptEnabled === false, 'measured in the page');
  });

  test('dir="rtl": the close is at the left, the end of the row, and nothing scrolls sideways', async ({ page }) => {
    const dialog = await openDialog(page, 'short', PHONES[0], { dir: 'rtl' });
    const gap = await lengthOf(page, 'var(--luz-space-md)');
    const b = await boxes(dialog);
    expect(b.close.left).toBeGreaterThanOrEqual(0);
    expect(b.close.left, 'no further from the left edge than the side padding').toBeLessThanOrEqual(gap);
    expect(b.close.right, 'the title is at the right of the close').toBeLessThanOrEqual(b.title.left + 1);
    const overflow = await page.evaluate(() => ({
      page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      dialog: document.querySelector('dialog[open]').scrollWidth - document.querySelector('dialog[open]').clientWidth,
    }));
    expect(overflow.page).toBeLessThanOrEqual(0);
    expect(overflow.dialog).toBeLessThanOrEqual(0);
  });

  test('the entrance takes --luz-duration-base and eases with --luz-easing-enter', async ({ page }) => {
    const dialog = await openDialog(page, 'short', PHONES[0]);
    const expected = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.transition = 'opacity var(--luz-duration-base) var(--luz-easing-enter)';
      document.body.append(probe);
      const cs = getComputedStyle(probe);
      const out = { duration: cs.transitionDuration, easing: cs.transitionTimingFunction };
      probe.remove();
      return out;
    });
    expect(expected.duration, 'the probe resolved the duration token').not.toBe('0s');
    await expect(dialog).toHaveCSS('animation-duration', expected.duration);
    await expect(dialog).toHaveCSS('animation-timing-function', expected.easing);
  });

  for (const viewport of [PHONES[0], SIDEWAYS[0]]) {
    test(`${size(viewport)}, reduced motion: the dialog opens with no animation time`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const dialog = await openDialog(page, 'short', viewport);
      await expect(dialog).toHaveCSS('animation-duration', '0s');
    });
  }

  test('forced colors: the lines under the header and over the footer stay on screen', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    const dialog = await openDialog(page, 'tall', PHONES[0]);
    const lines = await dialog.evaluate((d) => {
      const head = getComputedStyle(d.querySelector('.luz-modal__header'));
      const foot = getComputedStyle(d.querySelector('.luz-modal__footer'));
      return { head: `${head.borderBottomStyle} ${head.borderBottomWidth}`, foot: `${foot.borderTopStyle} ${foot.borderTopWidth}` };
    });
    expect(lines.head).toBe('solid 1px');
    expect(lines.foot).toBe('solid 1px');
  });

  test('forced colors: on a large screen the floating dialog keeps its border', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    const dialog = await openDialog(page, 'short', FLOATING[0]);
    await expect(dialog).toHaveCSS('border-top-style', 'solid');
    await expect(dialog).toHaveCSS('border-top-width', '1px');
  });

  for (const mode of MODES) {
    test(`axe finds no serious or critical violation with the full-screen dialog open, in ${mode}`, async ({ page }) => {
      const dialog = await openDialog(page, 'tall', PHONES[0]);
      await page.evaluate((m) => { document.documentElement.dataset.theme = m; }, mode);
      await faded(page);
      await expect(dialog).toBeVisible();
      const { violations } = await new AxeBuilder({ page })
        .include('dialog#tall')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      const blocking = violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`);
      expect(blocking, mode).toEqual([]);
    });
  }
});

/* ---- Without JavaScript --------------------------------------------------- */

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('375x667: a command / commandfor button opens the dialog, full screen, and Escape closes it', async ({ page }) => {
    const viewport = PHONES[0];
    await page.setViewportSize(viewport);
    await page.goto(FIXTURE);
    const dialog = page.locator('dialog#tall');
    await expect(dialog).toBeHidden();
    await page.locator('button[commandfor="tall"][command="show-modal"]').click();
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box?.x).toBeCloseTo(0, 0);
    expect(box?.y).toBeCloseTo(0, 0);
    expect(box?.width).toBeCloseTo(viewport.width, 0);
    expect(box?.height).toBeCloseTo(viewport.height, 0);
    await expect(dialog).toHaveCSS('border-top-left-radius', '0px');
    await expect(dialog).toHaveCSS('box-shadow', 'none');
    await expect(page.locator('#tall-close')).toBeInViewport({ ratio: 1 });
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
});
