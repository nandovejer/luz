/**
 * LUZ Design System — Pattern docs guidance, catalog
 * Every block class that @luz-ds/catalog ships belongs to a pattern, and every pattern has its page in the
 * documentation, in the one area of patterns (/docs/catalog/<slug>/), with the same structure as a component page:
 * example, known issues, then the Code and Design tabs (PRINCIPLES.md red line 18 and strong rule SR-5).
 * Since F5b of .claude/plans/ai-and-catalog-only.md the 19 patterns of a landing page, a blog, an app and a
 * documentation site are files of catalog (`components/<kind>-<name>.css`, classes `.luz-<kind>-<name>`) beside the
 * six components with data of the site, and the areas of @luz-ds/landing, cms, app and docs (/docs/landing/,
 * /docs/cms/, /docs/app/, /docs/documentation/) are gone. The class list is read from catalog's source, so a new
 * class without a pattern fails.
 * Run with: pnpm test:ui
 */

import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gotoId, routeOf } from './helpers/docs-site.js';
import { blocksOfCss } from './helpers/css-blocks.js';

const fromRepo = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url));

// One entry: catalog, whose docs area is /docs/catalog/. Each block (a `<luz-*>` tag, or a class of a pattern, read
// from the leftmost compound of each selector) maps to the id of its pattern page (p-<pattern>)
const PACKAGES = {
  catalog: {
    label: 'Catalog',
    patternOf: {
      // The six components with data of the site: each a `<luz-*>` tag that is the block (`.luz-<tag>__<part>`, D5)
      search: 'search',
      consent: 'consent',
      mode: 'mode',
      'lang-switch': 'lang-switch',
      submenu: 'submenu',
      banner: 'banner',
      // A landing page. The glow and the main are the page's own and have no page: they are on the section's
      'landing-header': 'landing-header',
      'landing-hero': 'landing-hero',
      'landing-footer': 'landing-footer',
      'landing-main': 'landing-section',
      'landing-section': 'landing-section',
      'landing-glow': 'landing-section',
      'landing-stat': 'landing-stat',
      // A blog or a newspaper. The contents of an article have a page of their own, `toc` (its CSS is in cms-article.css)
      'cms-article-header': 'article-header',
      'cms-article': 'toc',
      'cms-toc': 'toc',
      'cms-header': 'cms-header',
      'cms-footer': 'cms-footer',
      'cms-page-header': 'cms-page-header',
      // An application: the bar and the dashboard; the sidebar is core's
      'app-header': 'app-header',
      'app-dashboard': 'app-dashboard',
      // A documentation site. The shell is also `.luz-docs-nav` and `.luz-docs-main`
      'docs-shell': 'docs-shell',
      'docs-nav': 'docs-shell',
      'docs-main': 'docs-shell',
      'docs-page-head': 'docs-page-head',
      'docs-rail': 'docs-rail',
      'docs-example': 'docs-example',
      'docs-dodont': 'docs-dodont',
      'docs-pager': 'docs-pager',
      'docs-page-foot': 'docs-page-foot',
    },
  },
};

/** Block names of catalog's classes: elements (__) and modifiers (--) are covered by their block, read from the leftmost compound of each selector. */
function blocksOf(name) {
  const dir = fromRepo(`packages/${name}/src/components`);
  const css = readdirSync(dir)
    .filter((file) => file.endsWith('.css'))
    .map((file) => readFileSync(`${dir}/${file}`, 'utf-8'))
    .join('\n');
  return [...blocksOfCss(css)].filter((block) => block.startsWith('luz-')).map((block) => block.slice('luz-'.length));
}

// Code tab, then Design tab; Known issues is above them (ia.md §6)
const sections = ['known-issues', 'how', 'keyboard', 'when', 'when-not', 'content'];

for (const [name, { label, patternOf }] of Object.entries(PACKAGES)) {
  const patterns = new Set(Object.values(patternOf));
  const area = name;

  test.describe(`${label} docs`, () => {
    test(`every ${name} class belongs to a pattern`, () => {
      const blocks = blocksOf(name);
      expect(blocks.length, `packages/${name} has no <luz-*> block`).toBeGreaterThan(0);
      for (const block of blocks) expect(patternOf[block], `luz-${block} has no pattern in tests/site-docs.spec.js`).toBeTruthy();
    });

    test('catalog ships exactly its 30 blocks: the six components of the site and the patterns of the four kinds of site', () => {
      expect(blocksOf('catalog').sort()).toEqual(Object.keys(patternOf).sort());
    });

    test('the Catalog gallery lists the 25 pattern pages and the class reference, in /docs/catalog/, and no page of an area that is gone', async ({ page }) => {
      await page.goto('/docs/catalog/');
      const cards = await page.locator('.docs-gallery a').evaluateAll((links) => links.map((link) => new URL(link.href).pathname));
      expect(cards.filter((href) => href.startsWith('/docs/catalog/')).sort()).toEqual(
        [...patterns].map((pattern) => routeOf(`p-${pattern}`)).concat('/docs/catalog/classes/').sort(),
      );
      expect(cards.filter((href) => /^\/docs\/(landing|cms|app|documentation)\//.test(href))).toEqual([]);
    });

    test(`every ${name} pattern has its page: example, known issues, Code and Design`, async ({ page }) => {
      for (const pattern of patterns) {
        const route = await gotoId(page, `p-${pattern}`);
        expect(route, pattern).toMatch(new RegExp(`^/docs/${area}/[a-z-]+/$`));
        // A pattern is a page: its name is the h1, like a core component
        await expect(page.locator('h1.docs-title'), pattern).toHaveCount(1);
        await expect(page.getByRole('tablist', { name: /documentation$/ }).getByRole('tab'), pattern).toHaveText(['Code', 'Design']);
        for (const section of sections) {
          const heading = page.locator(`#${section}`);
          await expect(heading, `${pattern} ${section}`).toHaveCount(1);
          expect(await heading.evaluate((h) => h.tagName), `${pattern} ${section}`).toBe(section === 'known-issues' ? 'H2' : 'H3');
          // A heading with nothing under it is not documentation
          const text = await heading.evaluate((h) => h.nextElementSibling?.textContent.trim() ?? '');
          expect(text.length, `${pattern} ${section} is empty`).toBeGreaterThan(10);
        }
      }
    });

    test(`the ${label} area lists every pattern, in the sidebar and in its gallery`, async ({ page }) => {
      await page.goto(`/docs/${area}/`);
      const nav = await page.locator('.docs-nav a').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
      const cards = await page.locator('.docs-gallery a').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
      for (const pattern of patterns) {
        expect(nav, pattern).toContain(routeOf(`p-${pattern}`));
        expect(cards, pattern).toContain(routeOf(`p-${pattern}`));
      }
    });
  });
}
