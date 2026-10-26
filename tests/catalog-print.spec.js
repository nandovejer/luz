// @ts-check
/**
 * F5a, catalog modular (plan ai-and-catalog-only, decisions 59 and 62): the print rules go
 * with each component, in `@layer luz.print` of its own file, so a page that links only
 * components/search.css prints without the search, and fetches no bundle.
 * The consent band's print rule is in tests/consent-band.spec.js.
 */
import { test, expect } from '@playwright/test';

const FIXTURE = '/tests/fixtures/search-element.html';

test.describe('catalog: print rules come with the component file', () => {
  test('a page that links only components/search.css fetches no catalog bundle and no print.css', async ({ page }) => {
    const sheets = [];
    page.on('request', (req) => {
      if (req.resourceType() === 'stylesheet') sheets.push(new URL(req.url()).pathname);
    });
    await page.goto(FIXTURE);
    await page.waitForLoadState('networkidle');
    expect(sheets.filter((path) => path.includes('/packages/catalog/'))).toEqual(['/packages/catalog/dist/components/search.css']);
  });

  test('<luz-search> takes its link, its button and its dialog off the paper', async ({ page }) => {
    await page.goto(FIXTURE);
    await expect.poll(() => page.evaluate(() => !!customElements.get('luz-search'))).toBe(true);
    await page.evaluate(() => window.addSearch());
    const search = page.locator('luz-search');
    await expect(search).toHaveCount(1);
    expect(await search.evaluate((el) => getComputedStyle(el).display), 'on screen').not.toBe('none');
    await page.emulateMedia({ media: 'print' });
    expect(await search.evaluate((el) => getComputedStyle(el).display), 'on paper').toBe('none');
  });
});
