// @ts-check
/* global CSSLayerBlockRule, CSSImportRule */
/**
 * The patterns of a landing page, a blog, an app and a documentation site are pages of one area, /docs/catalog/
 * (F5b of .claude/plans/ai-and-catalog-only.md, decisions 55, 71 to 73), what a reader sees of it in a browser:
 *
 *   1  the sidebar and the gallery of Catalog have six groups, in this order: Navigation, Page structure, Content,
 *      Site-wide, Documentation and Reference, each with its pages (in English and in Spanish)
 *   2  a pattern page says where it fits best, "Fits best: <kinds> - <sentence>", under the lead and above the
 *      chips, each kind a link to /docs/kinds/<kind>/ and "any site" no link; the card of the gallery says it too;
 *      in Spanish, in the words of the language; a page of core has no such line
 *   3  the four areas of the packages that are gone (/docs/landing/, /docs/cms/, /docs/app/, /docs/documentation/),
 *      their pages and their templates answer 404, in English and in Spanish, and neither the search index
 *      nor the sidebar names them; the files of the packages are not served either
 *   4  a pattern page has the rules of its pattern in the layer luz.catalog, and asks for no file of a package that is gone
 *
 * The markup of the pages is read from the DOM (the generator is tested in tests/docs-site.test.js); the groups,
 * the kinds and the sentences are the owner's (plan decisions 71 and 73), written here and not read from the pages
 * they check. Everything is static markup: it runs in `chromium` and in `chromium-nojs` alike.
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const fromRepo = (/** @type {string} */ path) => fileURLToPath(new URL(`../${path}`, import.meta.url));
const read = (/** @type {string} */ path) => readFileSync(fromRepo(path), 'utf-8');

/** The groups of Catalog, in order, with their label in each language (the strings of the docs) and their pages. */
const GROUPS = [
  { id: 'navigation', en: 'Navigation', pages: ['app-header', 'cms-header', 'landing-header', 'lang-switch', 'submenu'] },
  { id: 'page-structure', en: 'Page structure', pages: ['cms-article-header', 'cms-footer', 'cms-page-header', 'landing-footer', 'landing-hero', 'landing-section'] },
  { id: 'content', en: 'Content', pages: ['app-dashboard', 'cms-toc', 'landing-stat'] },
  { id: 'site-wide', en: 'Site-wide', pages: ['banner', 'consent', 'mode', 'search'] },
  { id: 'documentation', en: 'Documentation', pages: ['docs-dodont', 'docs-example', 'docs-page-foot', 'docs-page-head', 'docs-pager', 'docs-rail', 'docs-shell'] },
  { id: 'reference', en: 'Reference', pages: ['classes'] },
];
const PATTERNS = GROUPS.filter((g) => g.id !== 'reference').flatMap((g) => g.pages);

/** The kind of site each pattern fits best (the names a reader says: a blog, not cms), or `any`. */
const KIND = (/** @type {string} */ slug) => (slug.startsWith('landing-') ? 'landing' : slug.startsWith('cms-') ? 'blog' : slug.startsWith('app-') ? 'app' : slug.startsWith('docs-') ? 'docs' : 'any');

const LANGUAGES = [
  { code: 'en', prefix: '' },
  { code: 'es', prefix: '/es' },
];
const strings = (/** @type {string} */ code) => JSON.parse(read(`apps/docs/i18n/${code}/strings.json`));
const groupLabel = (/** @type {string} */ code, /** @type {{ id: string, en: string }} */ group) => (code === 'en' ? group.en : strings(code)[`group.catalog.${group.id}`]);
/** What a language calls a kind of site on a "Fits best" line. */
const kindWord = (/** @type {string} */ code, /** @type {string} */ kind) => (kind === 'any' ? (code === 'en' ? 'any site' : strings(code)['fits.any']) : code === 'en' ? kind : strings(code)[`kind.${kind}`]);
const fitsLabel = (/** @type {string} */ code) => (code === 'en' ? 'Fits best:' : strings(code)['fits.label']);
/** The sentence of the author, from the front matter of the page in that language. */
const sentenceOf = (/** @type {string} */ code, /** @type {string} */ slug) => {
  const file = code === 'en' ? `apps/docs/pages/catalog/${slug}.html` : `apps/docs/i18n/${code}/pages/catalog/${slug}.html`;
  const match = read(file).match(/^fits:\s*(.+)$/m);
  if (!match) throw new Error(`${file} has no "fits:"`);
  return match[1].trim();
};
const norm = (/** @type {string | null} */ text) => (text ?? '').replace(/\s+/g, ' ').trim();

/* ---- 1. The groups ------------------------------------------------------------------------------ */

test.describe('Catalog has six groups, in the sidebar and in the gallery', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const { code, prefix } of LANGUAGES) {
    test(`${code}: the sidebar fold of Catalog lists the groups under their labels, in order, each with its pages`, async ({ page }) => {
      await page.goto(`${prefix}/docs/catalog/search/`);
      const fold = page.locator('nav.luz-docs-nav ul.docs-nav > li', { has: page.locator('> a#a-catalog') });
      await expect(fold.locator('details[open]')).toHaveCount(1);
      const labels = fold.locator('li.docs-nav__group > .luz-sidebar__section-label');
      await expect(labels).toHaveText(GROUPS.map((group) => groupLabel(code, group)));
      for (const group of GROUPS) {
        const list = fold.locator(`ul[aria-labelledby="nav-${group.id}"]`);
        await expect(list, group.id).toBeVisible();
        const hrefs = await list.locator('a').evaluateAll((links) => links.map((a) => a.getAttribute('href')));
        expect([...hrefs].sort(), `the pages of ${group.id}`).toEqual(group.pages.map((slug) => `${prefix}/docs/catalog/${slug}/`).sort());
      }
      // Each page is in one group only
      const all = await fold.locator('ul.docs-nav__pages a').evaluateAll((links) => links.map((a) => a.getAttribute('href')));
      expect(new Set(all).size, 'no page twice').toBe(all.length);
      expect(all.length).toBe(PATTERNS.length + 1);
    });

    test(`${code}: the gallery of Catalog is six sections, one under the other, each under its label, with its pages`, async ({ page }) => {
      await page.goto(`${prefix}/docs/catalog/`);
      const sections = page.locator('main section.docs-gallery');
      await expect(sections.locator('h2')).toHaveText(GROUPS.map((group) => groupLabel(code, group)));
      let bottom = 0;
      for (const group of GROUPS) {
        const section = page.locator(`main section.docs-gallery[aria-labelledby="group-${group.id}"]`);
        await expect(section.locator(`h2#group-${group.id}`)).toHaveText(groupLabel(code, group));
        const hrefs = await section.locator('a').evaluateAll((links) => links.map((a) => a.getAttribute('href')));
        expect([...new Set(hrefs)].sort(), `the pages of ${group.id}`).toEqual(group.pages.map((slug) => `${prefix}/docs/catalog/${slug}/`).sort());
        const box = await section.boundingBox();
        expect(box, group.id).not.toBeNull();
        expect(box?.y ?? 0, `${group.id} is under the group before it`).toBeGreaterThanOrEqual(bottom - 1);
        bottom = (box?.y ?? 0) + (box?.height ?? 0);
      }
      // The patterns are cards; the reference is a row
      await expect(page.locator('main section.docs-gallery li.luz-card')).toHaveCount(PATTERNS.length);
      // There is no group of a kind of site or of "patterns"
      await expect(page.locator('#group-patterns, #group-landing, #group-cms, #group-app')).toHaveCount(0);
    });
  }
});

/* ---- 2. Fits best ------------------------------------------------------------------------------- */

test.describe('every pattern page says where it fits best', () => {
  for (const { code, prefix } of LANGUAGES) {
    for (const slug of PATTERNS) {
      test(`${code}: ${slug} has its line under the lead, and its card on the gallery has it too`, async ({ page }) => {
        const kind = KIND(slug);
        const sentence = sentenceOf(code, slug);
        await page.goto(`${prefix}/docs/catalog/${slug}/`);
        const head = page.locator('main > header.luz-docs-page-head');
        const line = head.locator('p.docs-fits');
        await expect(line).toHaveCount(1);
        await expect(line).toBeVisible();
        expect(norm(await line.textContent())).toBe(`${fitsLabel(code)} ${kindWord(code, kind)} — ${sentence}`);
        // A kind is a link to its page; "any site" is not a link
        const links = line.locator('a');
        if (kind === 'any') await expect(links).toHaveCount(0);
        else {
          await expect(links).toHaveCount(1);
          await expect(links).toHaveAttribute('href', `${prefix}/docs/kinds/${kind}/`);
          await expect(links).toHaveText(kindWord(code, kind));
        }
        // Between the lead and the chips, in the head (not in the body, not under the demo)
        const order = await head.evaluate((el) => [...el.children].map((c) => c.className));
        expect(order.indexOf('docs-fits'), 'the line is after the lead').toBeGreaterThan(order.indexOf('luz-docs-page-head__lead'));
        expect(order.indexOf('docs-fits'), 'and before the chips').toBeLessThan(order.indexOf('luz-docs-page-head__meta'));

        // The card of the gallery says the same
        await page.goto(`${prefix}/docs/catalog/`);
        const card = page.locator('main section.docs-gallery li', { has: page.locator(`a[href="${prefix}/docs/catalog/${slug}/"]`) }).first();
        const fits = card.locator('.docs-card__fits');
        await expect(fits).toHaveCount(1);
        expect(norm(await fits.textContent())).toBe(`${fitsLabel(code)} ${kindWord(code, kind)} — ${sentence}`);
      });
    }
  }

  test('a page that is not a pattern of catalog has no such line: a component of core, and the gallery of Core', async ({ page }) => {
    await page.goto('/docs/components/button/');
    await expect(page.locator('.docs-fits')).toHaveCount(0);
    await page.goto('/docs/components/');
    await expect(page.locator('.docs-card__fits')).toHaveCount(0);
  });

  test('the lines of the pages are the lines of the kinds: landing is a link on the page of the Hero and any site is not one on the Banner', async ({ page }) => {
    await page.goto('/docs/catalog/landing-hero/');
    await expect(page.locator('p.docs-fits')).toHaveText('Fits best: landing — the top of a landing page, under the header');
    await expect(page.locator('p.docs-fits a')).toHaveAttribute('href', '/docs/kinds/landing/');
    await page.goto('/docs/catalog/banner/');
    await expect(page.locator('p.docs-fits')).toHaveText('Fits best: any site — a short notice for every visitor, such as a sale or planned maintenance');
    await page.goto('/docs/catalog/cms-header/');
    await expect(page.locator('p.docs-fits a')).toHaveText('blog');
    await expect(page.locator('p.docs-fits a')).toHaveAttribute('href', '/docs/kinds/blog/');
  });
});

/* ---- 3. The areas that are gone ----------------------------------------------------------------- */

test.describe('the four areas of the packages that are gone are not served', () => {
  const GONE = [
    '/docs/landing/', '/docs/landing/templates/', '/docs/landing/hero/', '/docs/landing/header/', '/docs/landing/footer/', '/docs/landing/section/', '/docs/landing/stat/',
    '/docs/cms/', '/docs/cms/templates/', '/docs/cms/header/', '/docs/cms/footer/', '/docs/cms/page-header/', '/docs/cms/article-header/', '/docs/cms/toc/',
    '/docs/app/', '/docs/app/templates/', '/docs/app/header/', '/docs/app/dashboard/',
    '/docs/documentation/', '/docs/documentation/templates/', '/docs/documentation/shell/', '/docs/documentation/rail/', '/docs/documentation/pager/', '/docs/documentation/dodont/',
  ];

  for (const { code, prefix } of LANGUAGES) {
    test(`${code}: no old route answers 200`, async ({ request }) => {
      const served = [];
      for (const route of GONE) {
        const response = await request.get(`${prefix}${route}`, { maxRedirects: 0 });
        if (response.status() !== 404) served.push(`${prefix}${route}: ${response.status()}`);
      }
      expect(served).toEqual([]);
    });
  }

  test('the search index lists the 25 pages and the class reference of Catalog, and no page of a gone area', async ({ request }) => {
    const index = await (await request.get('/docs/search-index.json')).json();
    const paths = /** @type {string[]} */ (index.pages.map((/** @type {string[]} */ row) => row[1]));
    for (const slug of [...PATTERNS, 'classes']) expect(paths, slug).toContain(`catalog/${slug}/`);
    expect(paths.filter((path) => /^(landing|cms|app|documentation)\//.test(path))).toEqual([]);
    const sections = JSON.stringify(index.sections ?? []);
    expect(sections).not.toMatch(/"(?:\.\/)?(?:landing|cms|app|documentation)\//);
  });

  test('the sidebar of any docs page names no area of a package that is gone, and no link of it goes there', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/docs/catalog/landing-hero/');
    const hrefs = await page.locator('nav.luz-docs-nav a').evaluateAll((links) => links.map((a) => a.getAttribute('href') ?? ''));
    expect(hrefs.filter((href) => /^\/docs\/(landing|cms|app|documentation)\//.test(href))).toEqual([]);
    await expect(page.locator('a.docs-nav__area')).toHaveText(['Get started', 'Kinds of site', 'Tokens', 'Core', 'Catalog', 'HTML elements', 'Accessibility']);
  });

  test('the files of the four packages are not served', async ({ request }) => {
    for (const file of ['landing/dist/landing.css', 'cms/dist/cms.css', 'app/dist/app.css', 'docs/dist/docs.css']) {
      expect((await request.get(`/packages/${file}`)).status(), file).toBe(404);
    }
  });
});

/* ---- 4. The stylesheets of a pattern page ------------------------------------------------------- */

test.describe('a pattern page shows its pattern live with the rules of catalog', () => {
  /** The layers (outermost first, joined) that hold a style rule naming `.${block}`, in every stylesheet of the page. */
  const layersOf = (/** @type {import('@playwright/test').Page} */ page, /** @type {string} */ block) =>
    page.evaluate((name) => {
      const found = new Set();
      const walk = (/** @type {CSSRuleList} */ rules, /** @type {string[]} */ layers) => {
        for (const rule of rules) {
          if (rule instanceof CSSLayerBlockRule) walk(rule.cssRules, [...layers, rule.name]);
          else if (rule instanceof CSSImportRule) { if (rule.styleSheet) walk(rule.styleSheet.cssRules, layers); }
          else if (rule instanceof CSSStyleRule) { if (rule.selectorText.includes(`.${name}`)) found.add(layers.join(' > ')); }
          else if ('cssRules' in rule) walk(/** @type {CSSGroupingRule} */ (rule).cssRules, layers);
        }
      };
      for (const sheet of document.styleSheets) {
        try { walk(sheet.cssRules, []); } catch { /* a stylesheet of another origin */ }
      }
      return [...found];
    }, block);

  for (const [slug, block] of [['landing-hero', 'luz-landing-hero'], ['landing-footer', 'luz-landing-footer'], ['cms-header', 'luz-cms-header'], ['cms-toc', 'luz-cms-toc'], ['app-dashboard', 'luz-app-dashboard'], ['docs-rail', 'luz-docs-rail'], ['docs-shell', 'luz-docs-shell']]) {
    test(`${slug}: the page has the rules of .${block} in the layer luz.catalog, and asks for no file of a package that is gone`, async ({ page }) => {
      const requests = [];
      page.on('request', (req) => requests.push(new URL(req.url()).pathname));
      await page.goto(`/docs/catalog/${slug}/`);
      await page.waitForLoadState('networkidle');
      const layers = await layersOf(page, block);
      expect(layers.length, `a rule of .${block}`).toBeGreaterThan(0);
      expect(layers.some((layer) => layer.split(' > ').includes('luz.catalog')), `${JSON.stringify(layers)}: a rule in luz.catalog`).toBe(true);
      expect(layers.filter((layer) => /luz\.(landing|cms|app|docs)\b/.test(layer)), 'a rule in the layer of a package that is gone').toEqual([]);
      expect(requests.filter((path) => /^\/packages\/(landing|cms|app|docs)\//.test(path))).toEqual([]);
    });
  }
});
