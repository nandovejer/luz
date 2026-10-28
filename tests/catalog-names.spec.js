// @ts-check
/**
 * F8 of .claude/plans/ai-and-catalog-only.md, "Los nombres de catalog" (decisions 65 to 69): what a reader's browser does
 * with the new names and with the old ones. The names themselves, the files, the exports and the manifests are in
 * tests/catalog-names.test.js; the page of each block in tests/catalog-patterns.test.js; here, the browser:
 *
 *   1  The old names do nothing (decision 69, no aliases): a page that links every stylesheet of catalog and writes
 *      `luz-landing-hero`, `luz-cms-header`, `luz-docs-shell`, `<luz-mode>`... gets no rule from any of them, on the
 *      block and on a part of it. tests/fixtures/catalog-names-old.html.
 *   2  The new names are styled, in the three modes: the same page with `luz-hero`, `luz-site-header`, `luz-masthead`,
 *      `<luz-color-mode>`... differs from an element with no class, on the block and on a part, in light, dark and
 *      high contrast. tests/fixtures/catalog-names-new.html.
 *   3  The two unions and the masthead change no look (decision 67): the bar of a landing page and of a blog
 *      (`--publication`), the masthead, the two footers and the blocks beside them are drawn with the numbers the base
 *      (`main` before F8) drew them with, at 1280, 768 and 375 px, in light and dark: tests/fixtures/catalog-names-geometry.json,
 *      read from the fixtures as they were (tests/helpers/catalog-geometry.js).
 *   4  The union is one component: the blog bar is the landing bar with `--publication`, and `--publication` is what
 *      keeps the heading font, the larger size, the underline on hover; the masthead is not a modifier of the bar.
 *
 * It is CSS only: it runs in `chromium` and `chromium-nojs`.
 */
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { MODES } from './helpers/design-tokens.js';
import { SPOTS, WIDTHS, MODES_READ, readGeometry } from './helpers/catalog-geometry.js';

const OLD = '/tests/fixtures/catalog-names-old.html';
const NEW = '/tests/fixtures/catalog-names-new.html';

/**
 * Every id of the two pages: the same ids, the old classes in one and the new in the other. `parts` are the ids of an
 * element inside the block that carries a part class (`__title`, `__brand`...).
 */
const BLOCKS = [
  'hero', 'section', 'stat', 'glow', 'main', 'site-header', 'site-header-publication', 'masthead', 'site-footer', 'site-footer-blog', 'app-bar', 'dashboard',
  'page-header', 'article-header', 'article', 'toc', 'docs-layout', 'doc-header', 'page-rail', 'pager', 'page-footer', 'example', 'do-dont', 'cookie-consent',
];
const PARTS = [
  'hero-title', 'section-title', 'stat-value', 'site-header-brand', 'publication-brand', 'masthead-brand', 'masthead-date', 'site-footer-brand', 'site-footer-title',
  'app-bar-product', 'dashboard-panel', 'page-header-title', 'article-header-title', 'toc-title', 'doc-header-lead', 'page-rail-inner', 'pager-next',
  'example-preview', 'do-dont-item', 'cookie-consent-title',
];
const ELEMENTS = ['announcement', 'color-mode', 'cookie-consent-element'];

/** What a rule of catalog would change on an element, read from the page: the computed style, and the two pseudo-elements. */
const fingerprint = () => {
  const PROPS = [
    'display', 'position', 'boxSizing', 'overflowX', 'overflowY', 'zIndex', 'containerType', 'containerName',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderTopStyle', 'borderBottomStyle', 'borderRadius',
    'backgroundColor', 'backgroundImage', 'color', 'boxShadow', 'opacity', 'listStyleType', 'textDecorationLine', 'textAlign',
    'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'textTransform',
    'columnGap', 'rowGap', 'flexDirection', 'flexWrap', 'justifyContent', 'alignItems', 'gridTemplateColumns',
    'minHeight', 'maxWidth', 'minWidth', 'width', 'inset', 'translate', 'animationName', 'order',
  ];
  const read = (el, pseudo) => {
    const cs = getComputedStyle(el, pseudo);
    const out = {};
    for (const p of PROPS) out[p] = cs[p];
    return out;
  };
  return (/** @type {Element} */ el) => {
    // A control: the same tag (or a custom element nobody styles) with no class, in the same parent, so it inherits what the element does
    const tag = el.localName.startsWith('luz-') ? 'luz-control-for-the-test' : el.localName;
    const control = document.createElement(tag);
    // a class nobody styles: core resets a list that has any class, and the element has one
    control.className = 'a-class-nobody-styles';
    el.parentElement.append(control);
    control.textContent = el.textContent;
    const result = { element: read(el, null), before: read(el, '::before'), after: read(el, '::after') };
    const bare = { element: read(control, null), before: read(control, '::before'), after: read(control, '::after') };
    control.remove();
    // `width` of a block follows its parent; the same parent gives the same number, so it is compared too
    const differences = [];
    for (const where of /** @type {const} */ (['element', 'before', 'after'])) {
      for (const p of PROPS) if (result[where][p] !== bare[where][p]) differences.push(`${where === 'element' ? '' : `::${where} `}${p}: ${result[where][p]} (a bare ${tag}: ${bare[where][p]})`);
    }
    return differences;
  };
};

const differences = (page, ids) =>
  page.evaluate(
    ({ ids: list, source }) => {
      const run = new Function(`return (${source})()`)();
      return Object.fromEntries(list.map((id) => [id, run(document.getElementById(id))]));
    },
    { ids, source: fingerprint.toString() },
  );

/* ---- 1. The old names do nothing -------------------------------------------------------------------- */

test.describe('the names of catalog before F8 do nothing, with every stylesheet of catalog linked', () => {
  test('a block, a part or an element with an old class or tag looks like a bare element of its tag (tests/fixtures/catalog-names-old.html)', async ({ page }) => {
    await page.goto(OLD);
    const found = await differences(page, [...BLOCKS, ...PARTS, ...ELEMENTS]);
    // An old name is styled by nothing: each id has no difference with the bare element beside it
    expect(Object.fromEntries(Object.entries(found).filter(([, list]) => list.length > 0))).toEqual({});
  });

  test('the page holds the old names it claims to: a class or a tag of before F8 on each id, and none of the new', async ({ page }) => {
    await page.goto(OLD);
    const names = await page.evaluate((ids) => ids.map((id) => {
      const el = document.getElementById(id);
      return { id, tag: el.localName, classes: [...el.classList] };
    }), [...BLOCKS, ...PARTS, ...ELEMENTS]);
    const old = /^luz-(?:landing|cms|app|docs)-|^luz-consent(?:__|$)/;
    for (const { id, tag, classes } of names) {
      if (ELEMENTS.includes(id)) expect(['luz-banner', 'luz-mode', 'luz-consent'], id).toContain(tag);
      else expect(classes.some((c) => old.test(c)), `${id}: ${classes.join(' ')}`).toBe(true);
    }
  });
});

/* ---- 2. The new names are styled, in the three modes ------------------------------------------------- */

test.describe('the names of catalog after F8 are styled, in light, dark and high contrast', () => {
  for (const mode of MODES) {
    test(`${mode}: every block, part and element differs from a bare element of its tag, and nothing has an old class`, async ({ page }) => {
      await page.goto(NEW);
      await page.evaluate((m) => { document.documentElement.dataset.theme = m; }, mode);
      const found = await differences(page, [...BLOCKS, ...PARTS, ...ELEMENTS]);
      // A part inherits and styles little (a stat's value is a type step); what must hold is that something is set by the new name
      // Two have no rule on their own root to see here: the contents' root sticks only inside the article layout (its title and list are
      // read, `toc-title`), and the tag <luz-cookie-consent> is a plain wrapper whose section, `.luz-cookie-consent`, is styled
      const NONE_OF_ITS_OWN = ['toc', 'cookie-consent-element'];
      expect(Object.fromEntries(Object.entries(found).filter(([id, list]) => list.length === 0 && !NONE_OF_ITS_OWN.includes(id))), 'blocks styled by nothing').toEqual({});
      const classes = await page.evaluate(() => [...document.querySelectorAll('#stage [class]')].flatMap((el) => [...el.classList]));
      expect(classes.filter((c) => /^luz-(?:landing|cms)-|^luz-app-(?!bar)/.test(c) || /^luz-docs-(?:shell|rail|pager|page-head|page-foot|example|dodont)/.test(c) || /^luz-consent(?:__|$)/.test(c))).toEqual([]);
    });
  }

  test('the colours of the three that were unions are the tokens of each mode: the bar, the masthead and the footer take the surface and the divider', async ({ page }) => {
    await page.goto(NEW);
    for (const mode of MODES) {
      await page.evaluate((m) => { document.documentElement.dataset.theme = m; }, mode);
      const read = await page.evaluate(() => {
        const token = (name) => {
          const probe = document.createElement('div');
          probe.style.cssText = `color:var(${name})`;
          document.body.append(probe);
          const value = getComputedStyle(probe).color;
          probe.remove();
          return value;
        };
        const css = (id, p) => getComputedStyle(document.getElementById(id))[p];
        return {
          surface: token('--luz-surface-page'),
          divider: token('--luz-divider'),
          text: token('--luz-text-primary'),
          headerBackground: css('site-header', 'backgroundColor'),
          headerBorder: css('site-header', 'borderBottomColor'),
          publicationBackground: css('site-header-publication', 'backgroundColor'),
          mastheadBackground: css('masthead', 'backgroundColor'),
          mastheadBrand: css('masthead-brand', 'color'),
          footerBorder: css('site-footer', 'borderTopColor'),
          blogFooterBorder: css('site-footer-blog', 'borderTopColor'),
        };
      });
      expect(read.headerBackground, `${mode} header`).toBe(read.surface);
      expect(read.publicationBackground, `${mode} publication bar`).toBe(read.surface);
      expect(read.mastheadBackground, `${mode} masthead`).toBe(read.surface);
      expect(read.headerBorder, `${mode} header divider`).toBe(read.divider);
      expect(read.footerBorder, `${mode} footer divider`).toBe(read.divider);
      expect(read.blogFooterBorder, `${mode} blog footer divider`).toBe(read.divider);
      expect(read.mastheadBrand, `${mode} masthead brand`).toBe(read.text);
    }
  });
});

/* ---- 3. The unions and the masthead change no look ---------------------------------------------------- */

test.describe('the unions and the masthead draw what the base drew (numbers read from main before F8)', () => {
  const base = JSON.parse(readFileSync(new URL('./fixtures/catalog-names-geometry.json', import.meta.url), 'utf-8'));

  for (const spot of SPOTS) {
    for (const width of WIDTHS) {
      test(`${spot.fixture} at ${width} px, in light and dark: the same computed boxes, colours, gaps, type and edges`, async ({ page }) => {
        for (const mode of MODES_READ) {
          const wanted = base[`${spot.fixture} ${width} ${mode}`];
          expect(wanted, `a reading of the base for ${spot.fixture} ${width} ${mode}`).toBeTruthy();
          const now = await readGeometry(page, spot, width, mode);
          expect(now, `${spot.fixture} at ${width} px in ${mode}`).toEqual(wanted);
        }
      });
    }
  }
});

/* ---- 4. One component, a modifier, and a masthead of its own ------------------------------------------ */

test.describe('the bar of a blog is the bar of a landing page with --publication; the masthead is a component of its own', () => {
  test('--publication keeps what the blog bar had: the heading font, the larger step, the underline on hover; the landing bar has none of it', async ({ page }) => {
    await page.goto(NEW);
    const read = await page.evaluate(() => {
      const brand = (id) => { const cs = getComputedStyle(document.getElementById(id)); return { family: cs.fontFamily, size: cs.fontSize }; };
      const token = (name, prop) => {
        const probe = document.createElement('div');
        probe.style.setProperty(prop, `var(${name})`);
        document.body.append(probe);
        const value = getComputedStyle(probe)[prop];
        probe.remove();
        return value;
      };
      return { landing: brand('site-header-brand'), blog: brand('publication-brand'), heading: token('--luz-font-heading', 'font-family'), sans: token('--luz-font-sans', 'font-family'), xl: token('--luz-text-xl', 'font-size'), base: token('--luz-text-base', 'font-size') };
    });
    expect(read.landing).toEqual({ family: read.sans, size: read.base });
    expect(read.blog).toEqual({ family: read.heading, size: read.xl });
    await page.locator('#publication-brand').hover();
    expect(await page.locator('#publication-brand').evaluate((el) => getComputedStyle(el).textDecorationLine)).toBe('underline');
    await page.locator('#site-header-brand').hover();
    expect(await page.locator('#site-header-brand').evaluate((el) => getComputedStyle(el).textDecorationLine)).toBe('none');
  });

  test('--publication on its own is nothing: without .luz-site-header the modifier styles no bar', async ({ page }) => {
    await page.goto(NEW);
    await page.evaluate(() => { document.getElementById('site-header-publication').className = 'luz-site-header--publication'; });
    expect(await page.locator('#site-header-publication').evaluate((el) => getComputedStyle(el).borderBottomWidth)).toBe('0px');
  });

  test('the masthead needs nothing of the bar: alone it has its room and the page surface and no divider, and the bar\'s class on it would add the divider', async ({ page }) => {
    await page.goto(NEW);
    const read = () => page.locator('#masthead').evaluate((el) => {
      const cs = getComputedStyle(el);
      const probe = document.createElement('div');
      probe.style.setProperty('padding-block-start', 'var(--luz-space-md)');
      document.body.append(probe);
      const md = getComputedStyle(probe).paddingBlockStart;
      probe.remove();
      return { padding: cs.paddingBlockStart, md, border: cs.borderBlockEndWidth };
    });
    const alone = await read();
    expect(alone.padding).toBe(alone.md);
    expect(alone.border).toBe('0px');
    await page.evaluate(() => { document.getElementById('masthead').classList.add('luz-site-header'); });
    expect((await read()).border, 'the bar\'s divider, which the masthead does not have').toBe('1px');
  });

  test('the footer of a landing page and of a blog are one class: .luz-site-footer, the same rules on both', async ({ page }) => {
    await page.goto(NEW);
    const rules = (id) => page.locator(`#${id}`).evaluate((el) => { const cs = getComputedStyle(el); return [cs.paddingTop, cs.paddingBottom, cs.borderTopWidth, cs.borderTopStyle, cs.borderTopColor, cs.backgroundColor, cs.display]; });
    expect(await rules('site-footer-blog')).toEqual(await rules('site-footer'));
  });
});
