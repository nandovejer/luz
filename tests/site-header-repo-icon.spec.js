// @ts-check
/**
 * The repository link of the shared site header (apps/site/_partials/header.html) draws LUZ's own git-branch
 * icon, not GitHub's mark: a third-party mark is not ours to serve (PRINCIPLES.md RL-13). The link keeps the
 * visible word «GitHub», which is its accessible name, and the icon is the one of the Icons page
 * (/docs/components/icons/), at the size of the other icons of the row, on a 24 grid with a 1.5 stroke in the
 * text colour. The row itself (order, height, current bar, drawer) is tests/site-header.spec.js.
 *
 *  - on the home page in its three languages, on a docs page and on the not-found page: the link is named
 *    «GitHub», holds one decorative inline svg, and it is not the octocat;
 *  - the svg draws what the Icons page draws for git-branch, and the same size as the Documentation icon;
 *  - every icon of the header is drawn with a 1.5 stroke, no fill, in the colour of its text;
 *  - in forced colors the stroke is the system colour of the link's text.
 *
 * Runs in `chromium` and `chromium-nojs` (this file is in the no-JS testMatch of playwright.config.js): the
 * header is HTML and CSS, so nothing here needs a script.
 */
import { test, expect } from '@playwright/test';

const GITHUB = 'https://github.com/nandovejer/luz';
const ICONS = '/docs/components/icons/';
const PAGES = ['/', '/es/', '/ar/', '/docs/', '/404.html'];
/** What the GitHub mark starts with, as Octicons and Simple Icons write it. */
const OCTOCAT = [/M12 ?\.297/, /M8 ?0a8\b/, /-2\.53 15\.59/];

const link = (page) => page.locator('#site-header a.site-header__github');

test.describe('the repository link of the header', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  });

  for (const path of PAGES) {
    test(`${path}: is named «GitHub», holds one decorative inline svg and it is not GitHub's mark`, async ({ page }) => {
      await page.goto(path);
      const a = link(page);
      await expect(a).toHaveCount(1);
      await expect(a).toHaveAttribute('href', GITHUB);
      await expect(a).toHaveAccessibleName('GitHub');
      expect((await a.innerText()).trim(), 'the visible word').toBe('GitHub');
      // One icon, inline: no image, no background picture, no external file
      await expect(a.locator('svg')).toHaveCount(1);
      await expect(a.locator('img, picture, use, image')).toHaveCount(0);
      expect(await a.evaluate((el) => getComputedStyle(el).backgroundImage), 'no background picture').toBe('none');
      const svg = a.locator('svg');
      await expect(svg).toHaveAttribute('aria-hidden', 'true');
      await expect(svg).toHaveAttribute('focusable', 'false');
      await expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
      const markup = await svg.evaluate((el) => el.outerHTML);
      for (const mark of OCTOCAT) expect(markup, `${mark}`).not.toMatch(mark);
      // The GitHub mark is one filled shape; git-branch is drawn with a line
      expect(await svg.evaluate((el) => el.querySelectorAll('circle').length), 'git-branch has circles; the octocat has none').toBeGreaterThan(0);
      expect(await svg.evaluate((el) => getComputedStyle(el.querySelector('path, circle')).fill), 'drawn with a stroke, not filled').toBe('none');
    });
  }

  test('draws the git-branch icon of the Icons page, shape for shape', async ({ page }) => {
    // The Icons page has both in one document: the header's link and the icon of the set
    await page.goto(ICONS);
    const both = await page.evaluate(() => {
      /** What a shape draws, whatever its stroke attributes: tag, geometry and any fill that is not none. A sorted list. */
      const drawing = (/** @type {Element} */ svg) =>
        [...svg.querySelectorAll('path, circle, ellipse, line, polyline, polygon, rect')]
          .map((shape) => {
            const attrs = [...shape.attributes]
              .filter((a) => !/^stroke/.test(a.name) && !(a.name === 'fill' && a.value === 'none'))
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((a) => `${a.name}=${a.value}`);
            return `${shape.localName} ${attrs.join(' ')}`;
          })
          .sort();
      const header = document.querySelector('#site-header a.site-header__github svg');
      const set = document.querySelector('#c-icons-git-branch')?.closest('.luz-icon-item')?.querySelector('.luz-icon-display svg');
      return { header: header ? drawing(header) : null, set: set ? drawing(set) : null };
    });
    expect(both.set, 'the Icons page has Git branch').toBeTruthy();
    expect(both.header, 'the header has its link').toBeTruthy();
    expect(both.header).toEqual(both.set);
  });

  for (const path of ['/', '/docs/']) {
    test(`${path}: its icon is the size of the other icons of the row, and the word beside it`, async ({ page }) => {
      await page.goto(path);
      const own = await link(page).locator('svg').boundingBox();
      const docs = await page.locator('#site-header .site-header__nav a svg').first().boundingBox();
      expect(own && docs, 'both icons are drawn').toBeTruthy();
      expect(own.width, 'width').toBeCloseTo(docs.width, 0);
      expect(own.height, 'height').toBeCloseTo(docs.height, 0);
      expect(Math.min(own.width, own.height), 'an icon, not a dot').toBeGreaterThanOrEqual(16);
      // The icon comes first, the word after it, on one line
      const word = await link(page).locator('.site-header__github-label').boundingBox();
      expect(word.x, 'the word after the icon').toBeGreaterThanOrEqual(own.x + own.width - 1);
      expect(Math.abs(word.y + word.height / 2 - (own.y + own.height / 2)), 'one line').toBeLessThanOrEqual(4);
    });
  }

  /** The shapes of every icon of the header on the 24 grid, with what the browser paints for each. */
  const painted = (page) =>
    page.locator('#site-header svg').evaluateAll((svgs) =>
      svgs
        // The logo is a filled mark on its own grid, and the menu button's icon is drawn by the stylesheet's own lines
        .filter((svg) => svg.getAttribute('viewBox') === '0 0 24 24' && svg.querySelector('path, circle'))
        .map((svg) => ({
          where: (svg.getAttribute('class') ?? svg.closest('a, button')?.className ?? 'svg').toString(),
          own: getComputedStyle(svg).color,
          shapes: [...svg.querySelectorAll('path, circle, ellipse, line, polyline, polygon, rect')].map((s) => {
            const c = getComputedStyle(s);
            return { width: parseFloat(c.strokeWidth), fill: c.fill, stroke: c.stroke, cap: c.strokeLinecap, join: c.strokeLinejoin };
          }),
        })),
    );

  for (const path of ['/', '/es/', '/docs/']) {
    test(`${path}: every icon of the header is drawn with a 1.5 stroke, no fill, in the colour of its text`, async ({ page }) => {
      await page.goto(path);
      const icons = await painted(page);
      expect(icons.length, 'icons in the header').toBeGreaterThan(0);
      for (const icon of icons) {
        for (const shape of icon.shapes) {
          expect(shape.width, `${icon.where} stroke width`).toBe(1.5);
          expect(shape.fill, `${icon.where} fill`).toBe('none');
          expect(shape.stroke, `${icon.where} stroke`).toBe(icon.own);
        }
      }
    });

    test(`${path}: every icon of the header has round caps and joins, as the icons of the Icons page`, async ({ page }) => {
      await page.goto(path);
      const icons = await painted(page);
      expect(icons.length, 'icons in the header').toBeGreaterThan(0);
      for (const icon of icons) {
        for (const shape of icon.shapes) {
          expect(shape.cap, `${icon.where} caps`).toBe('round');
          expect(shape.join, `${icon.where} joins`).toBe('round');
        }
      }
    });
  }

  for (const path of ['/', '/docs/']) {
    test(`${path}: in forced colors the stroke is the system colour of the link's text`, async ({ page }) => {
      await page.emulateMedia({ forcedColors: 'active' });
      await page.goto(path);
      const stroke = await link(page).evaluate((a) => {
        const text = getComputedStyle(a).color;
        return { text, shapes: [...a.querySelectorAll('svg path, svg circle')].map((s) => getComputedStyle(s).stroke) };
      });
      expect(stroke.shapes.length).toBeGreaterThan(0);
      for (const s of stroke.shapes) expect(s, 'the system colour, not a colour of the page').toBe(stroke.text);
      // And it is drawn: a box with some ink
      const ink = await link(page).locator('svg').evaluate((svg) => svg.getBBox().width + svg.getBBox().height);
      expect(ink).toBeGreaterThan(0);
    });
  }
});
