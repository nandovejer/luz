// @ts-check
/**
 * The links of catalog's page rail ("On this page") are text on the page, whatever the
 * order the stylesheets are linked or bundled in.
 *
 * Bug: a rail link also carries catalog's `.luz-sidebar__link` (and `.is-active` when the
 * scroll spy marks it). The two stylesheets tied in specificity, so with sidebar.css after
 * page-rail.css (the Vite Pages build) the sidebar won: the text was the sidebar's light
 * colour on the page (about 1.3:1, WCAG 1.4.3) and the current link took the sidebar's fill.
 * In dev the rail came last and looked right, so nothing caught it.
 *
 * Fixture: tests/fixtures/page-rail-links.html, the built dist of tokens, core and catalog,
 * with sidebar.css linked AFTER page-rail.css. Needs `pnpm catalog:build` first (dist is
 * git-ignored). It is CSS only.
 */
import { test, expect } from '@playwright/test';
import { resolveColor } from './helpers/design-tokens.js';
import { over, parseColor, ratio } from '../packages/tokens/lib/contrast.js';

const URL = '/tests/fixtures/page-rail-links.html';
const MIN = 4.5;

/** The computed colour of the link, its background and the page's, as opaque rgb. */
async function read(page, selector) {
  const css = await page.locator(selector).evaluate((el) => ({
    color: getComputedStyle(el).color,
    background: getComputedStyle(el).backgroundColor,
    page: getComputedStyle(document.body).backgroundColor,
  }));
  const pageColor = parseColor(css.page);
  const paper = over(pageColor, { r: 255, g: 255, b: 255, a: 1 });
  const background = over(parseColor(css.background), paper);
  const text = over(parseColor(css.color), background);
  return { css, ratio: ratio(text, background), background };
}

const rgb = ({ r, g, b }) => `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
const opaque = (mode, token) => over(parseColor(resolveColor(mode, token)), parseColor(resolveColor(mode, 'surface-page')));

// The sidebar's links transition their colours (--luz-duration-fast): read the settled value
const ratioOf = (page, selector) => expect.poll(async () => (await read(page, selector)).ratio, { message: `${selector} text on the page` });
const fillOf = (page, selector) => expect.poll(async () => rgb((await read(page, selector)).background), { message: `${selector} fill` });

for (const mode of ['light', 'high-contrast']) {
  test.describe(`rail links, sidebar.css after page-rail.css, ${mode}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(URL);
      await page.evaluate((m) => document.documentElement.setAttribute('data-theme', m), mode);
    });

    test('a link that is not current reads at 4.5:1 on the page', async ({ page }) => {
      await ratioOf(page, '#other').toBeGreaterThanOrEqual(MIN);
    });

    test('the current link has no fill and reads at 4.5:1', async ({ page }) => {
      await fillOf(page, '#current').toBe(rgb(opaque(mode, 'surface-page')));
      await ratioOf(page, '#current').toBeGreaterThanOrEqual(MIN);
    });

    test("a hovered link keeps 4.5:1 and takes the rail's fill, not the sidebar's", async ({ page }) => {
      await page.locator('#other').hover();
      await fillOf(page, '#other').toBe(rgb(opaque(mode, 'surface-muted')));
      await ratioOf(page, '#other').toBeGreaterThanOrEqual(MIN);
    });
  });
}
