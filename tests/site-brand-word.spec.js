// @ts-check
/**
 * The brand of the site: the prism, the drawn word LUZ beside it and a "BETA v<version>" badge, all inside ONE link to
 * the home page of the language. In the header of the home (three languages), of a docs page and of the not-found
 * page, and in the footer of the home.
 *
 * - The word is drawn (`.site-word`, hidden from a screen reader) and sized from the prism: its capitals are as tall as
 *   the prism's triangle (within 1 px). It wears the header's brand colour in the header and the prism's ink in the
 *   footer. The link's accessible name is "LUZ beta v<version>".
 * - The badge reads BETA and the version of core (`v0.3.0`), the version left to right, inside the same link. The
 *   version is not a link to the changelog.
 * - At 320 px the brand fits beside the search and the menu: nothing overlaps, and nothing scrolls sideways, also
 *   without JavaScript.
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (path) => readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), 'utf-8');
const VERSION = JSON.parse(read('packages/core/package.json')).version;
const catalog = (code) => JSON.parse(read(`apps/landing/i18n/${code}.json`));

/** [route, the language of its catalog, the home it links to] */
const PAGES = [
  ['/', 'en', '/'],
  ['/es/', 'es', '/es/'],
  ['/ar/', 'ar', '/ar/'],
  ['/docs/', 'en', '/'],
  ['/docs/components/button/', 'en', '/'],
  ['/404.html', 'en', '/'],
];

/**
 * In the page: the rendered height of the prism (from the top of its apex to the base of its slabs, in the box of the
 * svg) and the rendered height of the capitals of the word.
 * @param {Element} link
 */
function measureBrand(link) {
  const svg = /** @type {SVGSVGElement} */ (link.querySelector('svg'));
  const word = /** @type {HTMLElement} */ (link.querySelector('.site-word'));
  const view = svg.viewBox.baseVal;
  const box = svg.getBoundingClientRect();
  const scale = box.height / view.height;
  const content = svg.getBBox();
  const prism = content.height * scale;
  const wordBox = word.getBoundingClientRect();
  const probe = document.createElement('span');
  probe.style.color = 'var(--luz-brand-primary)';
  link.append(probe);
  const brand = getComputedStyle(probe).color;
  probe.remove();
  return {
    prism,
    capitals: wordBox.height,
    wordColor: getComputedStyle(word).color,
    prismColor: getComputedStyle(svg).color,
    brandColor: brand,
    svgBox: { left: box.left, right: box.right },
    wordBox: { left: wordBox.left, right: wordBox.right },
    ariaHidden: word.getAttribute('aria-hidden'),
  };
}

for (const [route, code, home] of PAGES) {
  test.describe(`${route}`, () => {
    const beta = catalog(code)['footer.beta'];
    const name = `LUZ ${beta} v${VERSION}`;

    test('the header\'s brand is one link: the prism, the word and the badge, named "LUZ beta v<version>"', async ({ page }) => {
      await page.goto(route);
      const link = page.locator('header.site-header').getByRole('link', { name, exact: true });
      await expect(link).toHaveCount(1);
      await expect(link).toHaveAttribute('href', home);
      await expect(link.locator('svg')).toHaveCount(1);
      await expect(link.locator('.site-word')).toHaveCount(1);
      await expect(link.locator('.site-word')).toHaveAttribute('aria-hidden', 'true');
      await expect(link.locator('.site-badge')).toHaveCount(1);
      // The version of the badge reads left to right, is plain text and is not a link of its own
      const version = link.locator('.site-badge__version');
      await expect(version).toHaveText(`v${VERSION}`);
      await expect(version).toHaveAttribute('dir', 'ltr');
      await expect(page.locator('header.site-header a[href$="CHANGELOG.md"]')).toHaveCount(0);
    });

    test('the badge reads BETA and the version (uppercase where the script has capitals)', async ({ page }) => {
      await page.goto(route);
      const text = await page.locator('header.site-header .site-badge').innerText();
      const word = code === 'ar' ? beta : beta.toUpperCase();
      expect(text.replace(/\s+/g, ' ').trim()).toBe(`${word} v${VERSION}`);
    });

    test('the capitals of the word are as tall as the prism (within 1 px), the word beside the prism, in the brand colour', async ({ page }) => {
      await page.goto(route);
      const found = await page.locator('header.site-header .site-header__brand').evaluate(measureBrand);
      expect(Math.abs(found.capitals - found.prism), `capitals ${found.capitals}px, prism ${found.prism}px`).toBeLessThanOrEqual(1);
      const apart = found.wordBox.left >= found.svgBox.right - 0.5 || found.wordBox.right <= found.svgBox.left + 0.5;
      expect(apart, 'the word does not overlap the prism').toBe(true);
      expect(found.wordColor, 'the header brand colour').toBe(found.brandColor);
    });

    for (const [width, badge] of [[320, false], [375, true]]) {
    test(`at ${width} px the brand fits beside the search and the menu${badge ? ' with its badge' : ' (the badge leaves the header: it does not fit)'}: nothing overlaps, nothing scrolls sideways`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(route);
      await expect(page.locator('header.site-header .site-word')).toBeVisible();
      if (badge) await expect(page.locator('header.site-header .site-badge')).toBeVisible();
      else await expect(page.locator('header.site-header .site-badge')).toBeHidden();
      const rects = await page.locator('header.site-header .site-header__inner').evaluate((inner) => {
        const out = [];
        for (const child of inner.children) {
          const r = child.getBoundingClientRect();
          if (r.width > 1 && r.height > 1 && getComputedStyle(child).visibility !== 'hidden') out.push({ cls: child.className || child.tagName, left: r.left, right: r.right });
        }
        return out;
      });
      expect(rects.length).toBeGreaterThanOrEqual(3);
      for (const r of rects) {
        expect(r.left, `${r.cls} starts inside the window`).toBeGreaterThanOrEqual(-0.5);
        expect(r.right, `${r.cls} ends inside the window`).toBeLessThanOrEqual(width + 0.5);
      }
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const overlap = Math.min(rects[i].right, rects[j].right) - Math.max(rects[i].left, rects[j].left);
          expect(overlap, `${rects[i].cls} and ${rects[j].cls} overlap`).toBeLessThanOrEqual(0.5);
        }
      }
      const scroll = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(scroll, 'the page scrolls sideways').toBeLessThanOrEqual(0);
    });
    }

    test.describe('without JavaScript', () => {
      test.use({ javaScriptEnabled: false });

      test('the brand and its badge are there and fit at 375 px; at 320 px the badge leaves and the page does not scroll', async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 800 });
        await page.goto(route);
        await expect(page.locator('header.site-header .site-badge')).toBeHidden();
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
        await page.setViewportSize({ width: 375, height: 800 });
        await expect(page.locator('header.site-header').getByRole('link', { name, exact: true })).toHaveCount(1);
        await expect(page.locator('header.site-header .site-badge')).toBeVisible();
        const scroll = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(scroll).toBeLessThanOrEqual(0);
      });
    });
  });
}

for (const [route, code, home] of PAGES.slice(0, 3)) {
  test.describe(`the footer of ${route}`, () => {
    const beta = catalog(code)['footer.beta'];
    const name = `LUZ ${beta} v${VERSION}`;

    test('has the same brand: one link to the home with the prism, the word and the badge, and the version is not a link to the changelog', async ({ page }) => {
      await page.goto(route);
      const link = page.locator('footer').getByRole('link', { name, exact: true });
      await expect(link).toHaveCount(1);
      await expect(link).toHaveAttribute('href', home);
      await expect(link.locator('.site-word')).toHaveAttribute('aria-hidden', 'true');
      await expect(link.locator('.site-badge__version')).toHaveText(`v${VERSION}`);
      await expect(page.locator('footer .landing-brand a[href$="CHANGELOG.md"]')).toHaveCount(0);
    });

    test('draws the word with capitals as tall as the prism (within 1 px), in the prism\'s ink', async ({ page }) => {
      await page.goto(route);
      const found = await page.locator('footer .landing-brand__home').evaluate(measureBrand);
      expect(Math.abs(found.capitals - found.prism), `capitals ${found.capitals}px, prism ${found.prism}px`).toBeLessThanOrEqual(1);
      expect(found.wordColor, 'the prism\'s ink').toBe(found.prismColor);
    });

    test('fits at 320 px: nothing scrolls sideways', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await page.goto(route);
      const box = await page.locator('footer .landing-brand__home').boundingBox();
      expect(/** @type {any} */ (box).x + /** @type {any} */ (box).width).toBeLessThanOrEqual(320.5);
      const scroll = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(scroll).toBeLessThanOrEqual(0);
    });
  });
}
