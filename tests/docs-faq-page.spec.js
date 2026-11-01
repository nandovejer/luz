// @ts-check
/**
 * The docs page "More questions" (/docs/get-started/faq/), the eight questions the home's FAQ sends away, and the way
 * to it from the home. Its structure is tests/docs-faq-page.test.js; this file is what a browser does.
 *
 * - The eight answers are in the served page, closed, and a click on a question opens its answer.
 * - A link to the id of an answer (#faq-worth) opens its details and shows the answer.
 * - The line under the home's FAQ, in every language, goes to this page.
 * - At 320 px nothing scrolls sideways. The page has no accessibility violation.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGE = '/docs/get-started/faq/';
const IDS = ['faq-classes', 'faq-unstyled', 'faq-why-classes', 'faq-same', 'faq-classless', 'faq-new-only', 'faq-worth', 'faq-migrate'];

test('the eight answers are in the page, closed, and a click on a question opens its answer', async ({ page }) => {
  await page.goto(PAGE);
  const items = page.locator('main details.luz-faq__item');
  await expect(items).toHaveCount(8);
  expect(await items.evaluateAll((all) => all.map((el) => el.hasAttribute('open')))).toEqual(Array(8).fill(false));
  expect(await page.locator('main .luz-faq__answer').evaluateAll((all) => all.map((el) => el.id))).toEqual(IDS);
  await expect(page.locator('#faq-classes')).toBeHidden();
  await items.first().locator('summary').click();
  await expect(page.locator('#faq-classes')).toBeVisible();
});

test('a link to the id of an answer opens its details and shows the answer', async ({ page }) => {
  await page.goto(`${PAGE}#faq-worth`);
  await expect(page.locator('#faq-worth')).toBeVisible();
  expect(await page.locator('#faq-worth').evaluate((el) => el.closest('details')?.hasAttribute('open'))).toBe(true);
});

test('the two groups are headed by an h2 each, in the page\'s outline under its h1', async ({ page }) => {
  await page.goto(PAGE);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('main h2.luz-faq__group-title')).toHaveCount(2);
});

for (const [route, docs] of [['/', '/docs/get-started/faq/'], ['/es/', '/es/docs/get-started/faq/'], ['/ar/', '/docs/get-started/faq/']]) {
  test(`${route}: the line under the FAQ of the home links to this page, and the page opens`, async ({ page }) => {
    await page.goto(route);
    const more = page.locator('#faq p.luz-faq__more a');
    await expect(more).toHaveCount(1);
    await expect(more).toHaveAttribute('href', docs);
    await more.click();
    await expect(page).toHaveURL(new RegExp(`${docs}$`));
    await expect(page.locator('main details.luz-faq__item')).toHaveCount(8);
  });
}

test('at 320 px the page does not scroll sideways, with the longest answer open', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(PAGE);
  for (const summary of await page.locator('main details.luz-faq__item > summary').all()) await summary.click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});

test('has no accessibility violation', async ({ page }) => {
  await page.goto(PAGE);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations).toEqual([]);
});
