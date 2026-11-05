/**
 * LUZ — axe-core on every app, in every base theme.
 * PRINCIPLES.md §8: serious and critical violations fail the build;
 * moderate and minor ones are attached to the report without failing it.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { faded } from './helpers/settle.js';
import { isControls, notFoundRoute, routeOf, routes, routesWith } from './helpers/docs-site.js';

// Every page in Chromium; a sample of layouts in Firefox and WebKit (a11y.md TEST-1)
// The home page in each of its languages (apps/landing/i18n)
const HOMES = ['/', '/es/', '/ar/'];
const APPS = [...HOMES, ...routes(), notFoundRoute];
const SAMPLE = ['/', '/docs/', '/docs/components/', routeOf('c-button'), '/docs/a-z/', routeOf('h-a11y-target')];
const THEMES = ['light', 'dark', 'high-contrast'];
const BLOCKING = ['serious', 'critical'];

// axe skips hidden content: component pages are scanned again with the
// Design tab open (a11y.md TEST-2)
// (a page of controls has one Design tab for each control: its #design is the first row's tab, and every row follows it)
const DESIGN = routesWith('docs-view-tabs').map((route) => `${route}#design`);

/** Open the Design tab: a page's #design panel, or on a page of controls every control's (one click moves all the rows). */
async function openDesign(page, route) {
  if (isControls(route)) {
    await page.getByRole('tab', { name: 'Design' }).first().click();
    const panels = page.locator('[id$="-design-panel"]');
    expect(await panels.count(), route).toBeGreaterThanOrEqual(2);
    for (const panel of await panels.all()) await expect(panel).toBeVisible();
  } else await expect(page.locator('#design-panel')).toBeVisible();
}

for (const app of [...APPS, ...DESIGN]) {
  for (const theme of THEMES) {
    test(`axe: ${app} in ${theme}`, async ({ page, browserName }, testInfo) => {
      test.skip(browserName !== 'chromium' && !SAMPLE.includes(app), 'sampled outside Chromium');
      // The home plays its scenes on a 42 s loop and each one fades out: axe would
      // measure a colour at a random point of the fade. Reduced motion keeps the
      // first scene at its last frame, the same on every machine.
      if (HOMES.includes(app)) await page.emulateMedia({ reducedMotion: 'reduce' });
      // A page of controls has no #design: the page, with every Design tab open
      const route = app.replace(/#design$/, '');
      await page.goto(isControls(route) ? route : app);
      if (app.endsWith('#design')) await openDesign(page, route);
      await page.evaluate((t) => {
        document.documentElement.dataset.theme = t;
      }, theme);
      // Let the theme transition (the page fades between modes for 1.4 s) and any lazy content settle before measuring
      await faded(page);
      await page.waitForTimeout(400);

      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      const summary = (list) =>
        list.map((v) => `${v.impact} ${v.id}: ${v.nodes.length} node(s) — ${v.nodes[0]?.target?.join(' ')}`);
      const blocking = violations.filter((v) => BLOCKING.includes(v.impact));
      const advisory = violations.filter((v) => !BLOCKING.includes(v.impact));

      if (advisory.length) {
        await testInfo.attach('axe-advisory.txt', {
          body: summary(advisory).join('\n'),
          contentType: 'text/plain',
        });
      }
      expect(summary(blocking), 'serious/critical axe violations').toEqual([]);
    });
  }
}
