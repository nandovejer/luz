// @ts-check
/**
 * The tabs of the three level panels of the home (.landing-panel in #inside, #inside-2 and #inside-3) turn by
 * themselves, one after another: Install, List, Code example, then Install again.
 *
 * - While the panel is at least half on screen and nothing holds it, `data-cycle="run"` is on the panel and a line
 *   fills under the open tab (the animation `landing-tab-cycle`, 3.2 s). When the line is full the next tab opens
 *   through core's tab code, and the panes fade in (`data-turned`).
 * - Hovering the panel or focusing inside it holds the loop (`data-cycle="hold"`, the line paused); it runs on 3 s
 *   after both have left.
 * - Off screen it holds.
 * - A choice ends it for good, in that panel only: a click on any tab (also the open one), an arrow key, a link to a
 *   panel. `data-cycle` is gone.
 * - Focus never moves by itself and nothing is announced (no live region in the panel).
 * - With `prefers-reduced-motion: reduce` `data-cycle` is never set and no tab turns.
 *
 * It asserts states (attributes, which tab is open), not pixels. The line is 3.2 s: the waits are real and short.
 * Runs in chromium only (it is not in the no-JS project's list): the loop is a script, and without JavaScript the
 * tabs are the page's plain anchors.
 */
import { test, expect } from '@playwright/test';

const PANELS = ['#inside', '#inside-2', '#inside-3'];
const TURN = 8000; // a turn takes 3.2 s; the wait is a ceiling, not a delay

/** @param {import('@playwright/test').Page} page @param {number} n */
const panel = (page, n) => page.locator(`${PANELS[n]} .landing-panel`);
/** @param {import('@playwright/test').Page} page @param {number} n */
const openTab = (page, n) => panel(page, n).locator('.luz-tab[aria-selected="true"]');

/** Puts a panel wholly in view: the loop only runs at 50 % on screen. */
async function show(page, n) {
  await panel(page, n).scrollIntoViewIfNeeded();
  await panel(page, n).evaluate((el) => el.scrollIntoView({ block: 'center' }));
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1600 });
  await page.goto('/');
  await page.waitForLoadState('load');
  // The tabs are built by the script
  await expect(panel(page, 0).locator('.luz-tab[role="tab"]')).toHaveCount(3);
});

test('a panel on screen runs: the line fills under the open tab, 3.2 s, and Install is open', async ({ page }) => {
  await show(page, 0);
  await expect(panel(page, 0)).toHaveAttribute('data-cycle', 'run');
  await expect(openTab(page, 0)).toContainText(/install|instal/i);
  const line = await openTab(page, 0).evaluate((tab) => {
    const style = getComputedStyle(tab, '::after');
    return { name: style.animationName, duration: style.animationDuration };
  });
  expect(line.name).toBe('landing-tab-cycle');
  expect(line.duration).toBe('3.2s');
});

test('the tabs turn Install, List, Code example, Install, and the panes fade in', async ({ page }) => {
  test.setTimeout(60_000);
  await show(page, 0);
  const tabs = panel(page, 0).locator('.luz-tab[role="tab"]');
  const names = (await tabs.allTextContents()).map((text) => text.trim());
  expect(names).toHaveLength(3);
  await expect(openTab(page, 0)).toHaveText(names[0]);
  for (const next of [1, 2, 0]) {
    await expect(openTab(page, 0)).toHaveText(names[next], { timeout: TURN });
    await expect(panel(page, 0)).toHaveAttribute('data-turned', /.*/);
  }
});

test('it never moves the focus and announces nothing: no live region in the panel, the focus stays where it was', async ({ page }) => {
  test.setTimeout(30_000);
  await show(page, 0);
  const before = await page.evaluate(() => document.activeElement?.tagName);
  const first = await openTab(page, 0).textContent();
  await expect(openTab(page, 0)).not.toHaveText(first ?? '', { timeout: TURN });
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe(before);
  expect(await panel(page, 0).locator('[aria-live], [role="status"], [role="alert"], [role="log"]').count()).toBe(0);
  expect(await panel(page, 0).locator('.luz-tabs, [role="tablist"]').evaluate((el) => el.getAttribute('aria-live'))).toBeNull();
});

test('off screen it holds: data-cycle is "hold" until the panel is half on screen', async ({ page }) => {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(panel(page, 0)).toHaveAttribute('data-cycle', 'hold');
  await show(page, 0);
  await expect(panel(page, 0)).toHaveAttribute('data-cycle', 'run');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(panel(page, 0)).toHaveAttribute('data-cycle', 'hold');
});

test('the pointer in the panel holds it, the line paused; 3 s after it leaves, it runs on', async ({ page }) => {
  test.setTimeout(30_000);
  await show(page, 0);
  await expect(panel(page, 0)).toHaveAttribute('data-cycle', 'run');
  const box = /** @type {{x:number,y:number,width:number,height:number}} */ (await panel(page, 0).boundingBox());
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect(panel(page, 0)).toHaveAttribute('data-cycle', 'hold');
  expect(await openTab(page, 0).evaluate((tab) => getComputedStyle(tab, '::after').animationPlayState)).toBe('paused');
  // Held: the open tab does not change while the pointer stays
  const held = await openTab(page, 0).textContent();
  await page.waitForTimeout(4000);
  await expect(openTab(page, 0)).toHaveText(held ?? '');
  await expect(panel(page, 0)).toHaveAttribute('data-cycle', 'hold');
  // It leaves: still held a moment, then it runs on after 3 s
  await page.mouse.move(2, 2);
  await page.waitForTimeout(1200);
  await expect(panel(page, 0)).toHaveAttribute('data-cycle', 'hold');
  await expect(panel(page, 0)).toHaveAttribute('data-cycle', 'run', { timeout: 4000 });
});

test('the focus inside the panel holds it, without turning a tab; 3 s after it leaves, it runs on', async ({ page }) => {
  test.setTimeout(30_000);
  await show(page, 0);
  await expect(panel(page, 0)).toHaveAttribute('data-cycle', 'run');
  const open = await openTab(page, 0).textContent();
  await openTab(page, 0).focus();
  await expect(panel(page, 0)).toHaveAttribute('data-cycle', 'hold');
  await expect(openTab(page, 0)).toHaveText(open ?? '');
  await page.evaluate(() => /** @type {HTMLElement} */ (document.activeElement)?.blur());
  await page.mouse.move(2, 2);
  await page.waitForTimeout(1200);
  await expect(panel(page, 0)).toHaveAttribute('data-cycle', 'hold');
  await expect(panel(page, 0)).toHaveAttribute('data-cycle', 'run', { timeout: 4000 });
});

test.describe('a choice ends it for good, in that panel only', () => {
  /** @param {import('@playwright/test').Page} page */
  async function stays(page, n = 0) {
    await page.mouse.move(2, 2);
    // Neither the hold nor the 3 s resume brings it back
    await page.waitForTimeout(3600);
    await expect(panel(page, n)).not.toHaveAttribute('data-cycle', /.*/);
  }

  test('a click on another tab', async ({ page }) => {
    await show(page, 0);
    await expect(panel(page, 0)).toHaveAttribute('data-cycle', 'run');
    await panel(page, 0).locator('.luz-tab[role="tab"]').nth(2).click();
    await expect(panel(page, 0)).not.toHaveAttribute('data-cycle', /.*/);
    await expect(openTab(page, 0)).toContainText(/code|código|الكود|مثال/i);
    await stays(page);
    await expect(openTab(page, 0)).toContainText(/code|código|الكود|مثال/i);
  });

  test('a click on the open tab, which changes nothing', async ({ page }) => {
    await show(page, 0);
    await expect(panel(page, 0)).toHaveAttribute('data-cycle', 'run');
    const open = await openTab(page, 0).textContent();
    await openTab(page, 0).click();
    await expect(panel(page, 0)).not.toHaveAttribute('data-cycle', /.*/);
    await stays(page);
    await expect(openTab(page, 0)).toHaveText(open ?? '');
  });

  test('an arrow key on a tab', async ({ page }) => {
    await show(page, 0);
    await expect(panel(page, 0)).toHaveAttribute('data-cycle', 'run');
    await openTab(page, 0).focus();
    await page.keyboard.press('ArrowRight');
    await expect(panel(page, 0)).not.toHaveAttribute('data-cycle', /.*/);
    await stays(page);
  });

  test('a link to a panel', async ({ page }) => {
    await show(page, 0);
    await expect(panel(page, 0)).toHaveAttribute('data-cycle', 'run');
    // Any link on the page whose target is one of the panel's panes
    await page.evaluate(() => {
      const link = document.createElement('a');
      link.id = 'to-pane';
      link.href = '#in1-code';
      link.textContent = 'to the code';
      link.style.cssText = 'position:fixed;inset-block-start:0;inset-inline-start:0;z-index:99999;background:white;color:black;padding:8px';
      document.body.append(link);
    });
    await page.locator('#to-pane').click();
    await expect(panel(page, 0)).not.toHaveAttribute('data-cycle', /.*/);
    await stays(page);
  });

  test('another panel keeps turning', async ({ page }) => {
    await show(page, 0);
    await panel(page, 0).locator('.luz-tab[role="tab"]').nth(1).click();
    await expect(panel(page, 0)).not.toHaveAttribute('data-cycle', /.*/);
    await show(page, 1);
    await expect(panel(page, 1)).toHaveAttribute('data-cycle', 'run');
  });
});

test.describe('with prefers-reduced-motion: reduce', () => {
  test.use({ reducedMotion: 'reduce' });

  test('data-cycle is never set and no tab turns by itself', async ({ page }) => {
    for (const n of [0, 1, 2]) {
      await show(page, n);
      await page.waitForTimeout(600);
      await expect(panel(page, n)).not.toHaveAttribute('data-cycle', /.*/);
      await expect(panel(page, n)).not.toHaveAttribute('data-turned', /.*/);
    }
    const open = await openTab(page, 2).textContent();
    await page.waitForTimeout(4000);
    await expect(openTab(page, 2)).toHaveText(open ?? '');
  });
});
