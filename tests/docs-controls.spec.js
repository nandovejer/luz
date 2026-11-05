// @ts-check
/**
 * The pages of controls of Form fields (`parts: controls`: /docs/components/form-inputs/, form-choice/, form-values/ and
 * form-field-parts/): what a browser does with their rows of tabs and their rail. The structure is
 * tests/docs-controls.test.js, the rail's markup tests/docs-rail-controls.test.js.
 *
 *   1  without JavaScript every control shows its Code then its Design, stacked, under visible titles (nothing is folded away)
 *   2  with JavaScript each control opens on Code, one panel at a time
 *   3  a tab chosen in one row moves every row of the page to it, by click or by key, and is remembered (apps/docs/view.js); a
 *      stored choice opens every row on it; the page keeps the clicked control where it was on the screen
 *   4  the rail ("On this page") lists the controls and Known issues, all visible at 1440 px: it folds nothing, with or without JS
 *
 * The no-JS project runs 1 and the no-JS half of 4.
 */
import { test, expect } from '@playwright/test';

const INPUTS = '/docs/components/form-inputs/';
const CHOICE = '/docs/components/form-choice/';
const KEY = 'luz-docs-view';
/** The controls of each page that these tests use, and their titles. */
const INPUT_CONTROLS = { text: 'Text', email: 'Email', textarea: 'Textarea' };
const CHOICE_CONTROLS = { checkbox: 'Checkbox', select: 'Select' };

const row = (page, title) => page.getByRole('tablist', { name: `${title} documentation` });
const stored = (page) => page.evaluate((key) => localStorage.getItem(key), KEY);
const top = (page, id) => page.evaluate((i) => document.getElementById(i).getBoundingClientRect().top, id);
const railLink = (page, id) => page.locator(`.luz-page-rail__onpage a[href="#${id}"]`);

test.describe('without JavaScript', () => {
  test.beforeEach(({ javaScriptEnabled }) => {
    test.skip(javaScriptEnabled !== false, 'the no-JS project');
  });

  for (const [route, controls] of [[INPUTS, INPUT_CONTROLS], [CHOICE, CHOICE_CONTROLS]]) {
    test(`${route}: every control shows its Code then its Design, stacked, under visible titles`, async ({ page }) => {
      await page.goto(route);
      for (const id of Object.keys(controls)) {
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
  }

  test('the rail shows every control and Known issues, from 80rem', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(INPUTS);
    for (const id of [...Object.keys(INPUT_CONTROLS), 'known-issues']) await expect(railLink(page, id), id).toBeVisible();
  });
});

test.describe('with JavaScript', () => {
  test.beforeEach(({ javaScriptEnabled }) => {
    test.skip(javaScriptEnabled === false, 'the tabs are written by JavaScript');
  });

  test('each control opens on Code, with its Design panel hidden', async ({ page }) => {
    await page.goto(INPUTS);
    for (const [id, title] of Object.entries(INPUT_CONTROLS)) {
      await expect(page.locator(`#${id}-code-panel`), id).toBeVisible();
      await expect(page.locator(`#${id}-design-panel`), id).toBeHidden();
      await expect(row(page, title).getByRole('tab', { name: 'Code' }), id).toHaveAttribute('aria-selected', 'true');
      await expect(row(page, title).getByRole('tab', { name: 'Design' }), id).toHaveAttribute('aria-selected', 'false');
    }
    expect(await stored(page)).toBeNull();
  });

  test('a click on Design in one row moves every row to Design, and Code moves them back; the choice is remembered', async ({ page }) => {
    await page.goto(INPUTS);
    await row(page, 'Email').getByRole('tab', { name: 'Design' }).click();
    for (const id of Object.keys(INPUT_CONTROLS)) {
      await expect(page.locator(`#${id}-design-panel`), id).toBeVisible();
      await expect(page.locator(`#${id}-code-panel`), id).toBeHidden();
    }
    await expect.poll(() => stored(page)).toBe('design');
    await row(page, 'Textarea').getByRole('tab', { name: 'Code' }).click();
    for (const id of Object.keys(INPUT_CONTROLS)) {
      await expect(page.locator(`#${id}-code-panel`), id).toBeVisible();
      await expect(page.locator(`#${id}-design-panel`), id).toBeHidden();
    }
    await expect.poll(() => stored(page)).toBe('code');
  });

  test('a key press that selects a tab moves every row too', async ({ page }) => {
    await page.goto(INPUTS);
    await row(page, 'Text').getByRole('tab', { name: 'Code' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(row(page, 'Text').getByRole('tab', { name: 'Design' })).toHaveAttribute('aria-selected', 'true');
    for (const id of Object.keys(INPUT_CONTROLS)) await expect(page.locator(`#${id}-design-panel`), id).toBeVisible();
    await expect.poll(() => stored(page)).toBe('design');
  });

  test('the stored choice opens every row on it, silently', async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem(key, 'design'), KEY);
    await page.goto(CHOICE);
    for (const title of Object.values(CHOICE_CONTROLS)) {
      await expect(row(page, title).getByRole('tab', { name: 'Design' }), title).toHaveAttribute('aria-selected', 'true');
    }
    for (const id of Object.keys(CHOICE_CONTROLS)) await expect(page.locator(`#${id}-design-panel`), id).toBeVisible();
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
    expect(new URL(page.url()).hash).toBe('');
  });

  test('the control whose tab was clicked stays where it was on the screen, though the controls above change height', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(INPUTS);
    await row(page, 'Textarea').getByRole('tab', { name: 'Code' }).scrollIntoViewIfNeeded();
    const before = await top(page, 'textarea');
    await row(page, 'Textarea').getByRole('tab', { name: 'Design' }).click();
    await expect(page.locator('#text-design-panel')).toBeVisible();
    await page.waitForTimeout(300);
    expect(Math.abs((await top(page, 'textarea')) - before)).toBeLessThanOrEqual(2);
  });

  test('the rail lists every control and Known issues at 1440 px, and folds nothing', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(INPUTS);
    for (const id of [...Object.keys(INPUT_CONTROLS), 'known-issues']) await expect(railLink(page, id), id).toBeVisible();
    // ... whichever control the reader is at
    await page.evaluate(() => document.getElementById('textarea').scrollIntoView({ behavior: 'instant', block: 'center' }));
    for (const id of [...Object.keys(INPUT_CONTROLS), 'known-issues']) await expect(railLink(page, id), id).toBeVisible();
  });
});
