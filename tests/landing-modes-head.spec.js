// @ts-check
/**
 * The head of the "modes" section of the home (`.landing-modes__head`, a one-column grid with an eyebrow, a title and
 * a lead) at 320 px and 400 % text (WCAG 1.4.10 Reflow). Its track is the width of the section, never the width of
 * its widest word: WebKit counted the min-content of the Arabic title at 204 px against a 188 px column even with
 * `overflow-wrap: anywhere`, and an `auto` track followed it out of the window (4 px of horizontal scroll in /ar/,
 * Safari review of 2026-10-24). Chromium wraps that title, so the second test gives the title a word that cannot
 * break, which is what WebKit measured.
 * Runs in `chromium` and `chromium-nojs` (the section is plain markup with or without JavaScript).
 */
import { test, expect } from '@playwright/test';

/** Measures every `.landing-modes__head` of the page (the FAQ's head wears the same class). */
function measureHeads() {
  const heads = [...document.querySelectorAll('.landing-modes__head')];
  return heads.map((head) => {
    const box = head.getBoundingClientRect();
    const style = getComputedStyle(head);
    const inner = box.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
      - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth);
    return {
      id: head.parentElement?.id || head.id || head.className,
      tracks: style.gridTemplateColumns.split(' ').filter(Boolean).map(parseFloat),
      inner,
      children: [...head.children].map((child) => {
        const r = child.getBoundingClientRect();
        return { tag: child.tagName.toLowerCase(), left: r.left, right: r.right };
      }),
      left: box.left,
      right: box.right,
    };
  });
}

/** @param {import('@playwright/test').Page} page */
async function atFourHundred(page, route) {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(route);
  await page.waitForLoadState('load');
  await page.evaluate(() => { document.documentElement.style.fontSize = '400%'; });
}

/** @param {ReturnType<typeof measureHeads>} heads */
function expectContained(heads) {
  expect(heads.length).toBeGreaterThan(0);
  for (const head of heads) {
    expect(head.tracks.length, `${head.id}: one track, got ${head.tracks}`).toBe(1);
    expect(head.tracks[0], `${head.id}: track ${head.tracks[0]} px in a head of ${head.inner} px`).toBeLessThanOrEqual(head.inner + 0.5);
    for (const child of head.children) {
      expect(child.left, `${head.id} ${child.tag} starts at ${child.left}, head at ${head.left}`).toBeGreaterThanOrEqual(head.left - 0.5);
      expect(child.right, `${head.id} ${child.tag} ends at ${child.right}, head at ${head.right}`).toBeLessThanOrEqual(head.right + 0.5);
    }
  }
}

for (const route of ['/', '/es/', '/ar/']) {
  test(`400 % text at 320 px: the head of the modes section is one track inside its box (${route})`, async ({ page }) => {
    await atFourHundred(page, route);
    expectContained(await page.evaluate(measureHeads));
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(scroll, 'the page scrolls sideways').toBeLessThanOrEqual(0);
  });

  test(`400 % text at 320 px: a title word that cannot break does not widen the head of the modes section (${route})`, async ({ page }) => {
    await atFourHundred(page, route);
    // What WebKit measured for the Arabic title: a min-content wider than the column.
    await page.evaluate(() => {
      const title = /** @type {HTMLElement} */ (document.querySelector('#modes-title'));
      title.textContent = 'W'.repeat(40);
      title.style.overflowWrap = 'normal';
      title.style.wordBreak = 'normal';
    });
    expectContained(await page.evaluate(measureHeads));
  });
}
