// @ts-check
/**
 * A docs page of controls (`parts: controls`, /docs/components/form/): what a browser does with its rows of tabs and its
 * rail. The structure is tests/docs-controls.test.js, the rail's markup tests/docs-rail-controls.test.js.
 *
 *   1  without JavaScript every control shows its Code and its Design, stacked, under their visible h4 (nothing is
 *      folded away): the panels are visible, in order, and so is every control's link in the rail
 *   2  with JavaScript each control opens on Code, one panel at a time
 *   3  a tab chosen in one row moves every row to it, by click or by key, and is remembered (apps/docs/view.js); a stored
 *      choice opens every row on it; the page keeps the clicked control where it was on the screen
 *   4  the rail, from 80rem, shows the controls of the family in view only: the first family at the top of the page, the one
 *      the reader moves to after; a link with the focus keeps its family open; without JavaScript, all of them
 *
 * The no-JS project runs 1 and the no-JS half of 4.
 */
import { test, expect } from '@playwright/test';

const ROUTE = '/docs/components/form/';
const KEY = 'luz-docs-view';
const CONTROLS = ['text', 'email', 'checkbox', 'select'];

const row = (page, title) => page.getByRole('tablist', { name: `${title} documentation` });
const stored = (page) => page.evaluate((key) => localStorage.getItem(key), KEY);
const top = (page, id) => page.evaluate((i) => document.getElementById(i).getBoundingClientRect().top, id);
/** Scroll so the heading sits a quarter of the way down the window: inside the zone the scroll spy watches. */
const bring = (page, id) =>
  page.evaluate((i) => {
    const el = document.getElementById(i);
    window.scrollBy({ top: el.getBoundingClientRect().top - window.innerHeight * 0.25, behavior: 'instant' });
  }, id);
const railLink = (page, id) => page.locator(`.luz-page-rail__onpage a[href="#${id}"]`);

test.describe('without JavaScript', () => {
  test.beforeEach(({ javaScriptEnabled }) => {
    test.skip(javaScriptEnabled !== false, 'the no-JS project');
  });

  test('every control shows its Code then its Design, stacked, under visible titles', async ({ page }) => {
    await page.goto(ROUTE);
    for (const id of CONTROLS) {
      const code = page.locator(`#${id}-code-panel`);
      const design = page.locator(`#${id}-design-panel`);
      await expect(code, id).toBeVisible();
      await expect(design, id).toBeVisible();
      // The panel titles are on screen, not hidden for screen readers only
      for (const title of [`#${id}-code`, `#${id}-design`]) {
        const box = await page.locator(title).boundingBox();
        expect(box?.width ?? 0, title).toBeGreaterThan(1);
        expect(box?.height ?? 0, title).toBeGreaterThan(1);
      }
      const [a, b] = await Promise.all([code.boundingBox(), design.boundingBox()]);
      expect(a.y + a.height, `${id}: Design after Code`).toBeLessThanOrEqual(b.y + 1);
      await expect(page.locator(`#${id}-when`), id).toBeVisible();
      await expect(page.locator(`#${id}-markup`), id).toBeVisible();
    }
  });

  test('the rail shows every control, from 80rem: nothing is folded', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(ROUTE);
    for (const id of ['inputs', ...CONTROLS, 'choice', 'known-issues']) await expect(railLink(page, id), id).toBeVisible();
  });
});

test.describe('with JavaScript', () => {
  test.beforeEach(({ javaScriptEnabled }) => {
    test.skip(javaScriptEnabled === false, 'the tabs are written by JavaScript');
  });

  test('each control opens on Code, with its Design panel hidden', async ({ page }) => {
    await page.goto(ROUTE);
    for (const id of CONTROLS) {
      await expect(page.locator(`#${id}-code-panel`), id).toBeVisible();
      await expect(page.locator(`#${id}-design-panel`), id).toBeHidden();
    }
    const title = { text: 'Text', email: 'Email', checkbox: 'Checkbox', select: 'Select' };
    for (const id of CONTROLS) {
      await expect(row(page, title[id]).getByRole('tab', { name: 'Code' }), id).toHaveAttribute('aria-selected', 'true');
      await expect(row(page, title[id]).getByRole('tab', { name: 'Design' }), id).toHaveAttribute('aria-selected', 'false');
    }
    expect(await stored(page)).toBeNull();
  });

  test('a click on Design in one row moves every row to Design, and Code moves them back; the choice is remembered', async ({ page }) => {
    await page.goto(ROUTE);
    await row(page, 'Email').getByRole('tab', { name: 'Design' }).click();
    for (const id of CONTROLS) {
      await expect(page.locator(`#${id}-design-panel`), id).toBeVisible();
      await expect(page.locator(`#${id}-code-panel`), id).toBeHidden();
    }
    await expect.poll(() => stored(page)).toBe('design');
    await row(page, 'Checkbox').getByRole('tab', { name: 'Code' }).click();
    for (const id of CONTROLS) {
      await expect(page.locator(`#${id}-code-panel`), id).toBeVisible();
      await expect(page.locator(`#${id}-design-panel`), id).toBeHidden();
    }
    await expect.poll(() => stored(page)).toBe('code');
  });

  test('a key press that selects a tab moves every row too', async ({ page }) => {
    await page.goto(ROUTE);
    const code = row(page, 'Text').getByRole('tab', { name: 'Code' });
    await code.focus();
    await page.keyboard.press('ArrowRight');
    await expect(row(page, 'Text').getByRole('tab', { name: 'Design' })).toHaveAttribute('aria-selected', 'true');
    for (const id of CONTROLS) await expect(page.locator(`#${id}-design-panel`), id).toBeVisible();
    await expect.poll(() => stored(page)).toBe('design');
  });

  test('the stored choice opens every row on it, silently', async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem(key, 'design'), KEY);
    await page.goto(ROUTE);
    for (const title of ['Text', 'Email', 'Checkbox', 'Select']) {
      await expect(row(page, title).getByRole('tab', { name: 'Design' }), title).toHaveAttribute('aria-selected', 'true');
    }
    for (const id of CONTROLS) await expect(page.locator(`#${id}-design-panel`), id).toBeVisible();
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
    expect(new URL(page.url()).hash).toBe('');
  });

  test('the control whose tab was clicked stays where it was on the screen, though the controls above change height', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(ROUTE);
    await page.locator('#checkbox').scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy({ top: 0 }));
    await row(page, 'Checkbox').getByRole('tab', { name: 'Code' }).scrollIntoViewIfNeeded();
    const before = await top(page, 'checkbox');
    await row(page, 'Checkbox').getByRole('tab', { name: 'Design' }).click();
    await expect(page.locator('#text-design-panel')).toBeVisible();
    await page.waitForTimeout(300);
    expect(Math.abs((await top(page, 'checkbox')) - before)).toBeLessThanOrEqual(2);
  });

  test('the rail, from 80rem, opens the first family at the top and folds the other', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(ROUTE);
    await expect(railLink(page, 'text')).toBeVisible();
    await expect(railLink(page, 'email')).toBeVisible();
    await expect(railLink(page, 'checkbox')).toBeHidden();
    await expect(railLink(page, 'select')).toBeHidden();
    // The families themselves and Known issues are always listed
    for (const id of ['inputs', 'choice', 'known-issues']) await expect(railLink(page, id), id).toBeVisible();
  });

  test('the rail opens the family of the control in view and folds the other', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(ROUTE);
    await bring(page, 'checkbox');
    // The spy marks the family or the control, whichever heading is nearest the top of its zone
    const marked = page.locator('.docs-rail-controls .luz-page-rail__list > li:has(a[href="#choice"]) [aria-current="true"], .docs-rail-controls a[href="#choice"][aria-current="true"]');
    await expect(marked).toHaveCount(1);
    await expect(railLink(page, 'checkbox')).toBeVisible();
    await expect(railLink(page, 'select')).toBeVisible();
    await expect(railLink(page, 'text')).toBeHidden();
    await expect(railLink(page, 'email')).toBeHidden();
    // and back
    await bring(page, 'text');
    await expect(railLink(page, 'text')).toBeVisible();
    await expect(railLink(page, 'checkbox')).toBeHidden();
  });

  test('a link of the rail with the focus keeps its family open', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(ROUTE);
    await expect(railLink(page, 'checkbox')).toBeHidden();
    await railLink(page, 'choice').focus();
    await expect(railLink(page, 'checkbox')).toBeVisible();
    await expect(railLink(page, 'select')).toBeVisible();
    // the family that was open stays while it is the one marked
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await expect(railLink(page, 'checkbox')).toBeHidden();
  });

  test('below 80rem the rail folds nothing', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 900 });
    await page.goto(ROUTE);
    const summary = page.locator('.luz-page-rail__title');
    if (!(await railLink(page, 'text').isVisible())) await summary.click();
    for (const id of ['text', 'email', 'checkbox', 'select']) await expect(railLink(page, id), id).toBeVisible();
  });
});
