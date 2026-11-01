// @ts-check
/**
 * The docs' sidebar (.luz-docs-nav, which is a .luz-sidebar) takes its place and its width from the docs'
 * own sheet, whatever the order of catalog's sheets in the page. Catalog's sidebar.css gives every
 * .luz-sidebar `width` and `min-width: var(--luz-sidebar-width)`, in the layer `luz.catalog`; the docs layout
 * gives .luz-docs-nav `grid-area: nav` and `inline-size: auto`, in the same layer and with the same
 * specificity, so the one that comes later wins. In the built site Vite writes the layout's sheet before
 * sidebar.css, so the fixed width won: on a window wider than the 1280px frame (where --site-edge is more than
 * 0) the sidebar's padding left no room for its links, and every title was drawn one letter a line. The dev
 * server links sidebar.css first, so this test puts it last, the order of the built site, and measures.
 * Without JavaScript the sheets are the same, so this runs in both projects.
 */
import { test, expect } from '@playwright/test';

const PAGE = '/docs/get-started/migrate/';

for (const [width, height] of [[1792, 968], [1440, 900], [1280, 800], [1100, 800], [900, 800]]) {
  test(`${width}px, sidebar.css after the docs layout: the sidebar keeps its column and its links keep their room`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto(PAGE);
    // The built site's order: catalog's sidebar sheet after every other, wherever the dev server put it
    await page.evaluate(async () => {
      const link = [...document.querySelectorAll('link[rel="stylesheet"]')].find((l) => /sidebar(\.min)?\.css/.test(l.getAttribute('href') ?? ''));
      if (!link) throw new Error('no sidebar sheet linked');
      await new Promise((resolve) => {
        link.addEventListener('load', resolve, { once: true });
        document.head.append(link);
      });
    });
    const found = await page.evaluate(() => {
      const nav = document.querySelector('.docs-page > .luz-docs-nav');
      // The link to this very page: visible in the list, and the one the reader is on
      const link = [...(nav?.querySelectorAll('a') ?? [])].find((a) => a.getAttribute('aria-current') === 'page' || /Migrate a project to LUZ/.test(a.textContent ?? ''));
      if (!nav || !link) return null;
      const n = getComputedStyle(nav);
      const column = nav.getBoundingClientRect();
      const l = link.getBoundingClientRect();
      return { area: n.gridColumnStart, navWidth: column.width, linkWidth: l.width, linkHeight: l.height, paddingStart: parseFloat(n.paddingLeft) };
    });
    expect(found, 'the sidebar and a link in it').not.toBeNull();
    expect(found.area, 'placed in the layout\'s nav area').toBe('nav');
    // A link with room is one or two lines; one with none is drawn a letter a line, a hundred pixels tall
    expect(found.linkWidth, `the link is ${found.linkWidth}px wide`).toBeGreaterThanOrEqual(150);
    expect(found.linkHeight, `the link is ${found.linkHeight}px tall`).toBeLessThanOrEqual(80);
    // The column is the layout's: the sidebar fills it, it is not the fixed 256px its own sheet sets
    expect(found.navWidth, `the sidebar is ${found.navWidth}px wide`).toBeGreaterThan(found.paddingStart + 150);
  });
}
