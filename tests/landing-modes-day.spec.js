// @ts-check
/**
 * The "Color modes" section of the home (#modes), in English, Spanish and Arabic.
 *
 * - The head: the eyebrow "Color modes" and the title "Three modes for everyone. The whole day, if you want it.", with
 *   "The whole day" marked. A small tag "Core · included" sits above the three boxes.
 * - The three boxes have no paper of their own (transparent, no shadow). Their text takes the page's ink, readable
 *   (4.5:1) in light, dark and high contrast. Each box's label is a badge in the box's own mode (that mode's paper and
 *   ink) with the mode's small icon before the name, and the name's capitals sit on the icon's middle.
 * - Under them a band `.landing-day`: transparent, a thin solid border; a badge "Time-of-day color mode · Catalog,
 *   optional" with no background, a border and the ink (4.5:1); a title, a lead, two points, the bar, and a link to
 *   /docs/catalog/theme-time/.
 * - The bar is `<luz-theme-time variant="bar">` with no moments of its own: it follows the footer's element. It is built
 *   by the script, so without JavaScript it is absent and the text stays. Moving its slider changes the page's moment
 *   (`html[data-moment]`), the footer's checked moment, and the bar of the globe follows.
 *
 * The page is pinned to 14:00 by the suite's config, so the afternoon is the starting moment.
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { seedMode } from './helpers/site-lights.js';

const catalog = (code) => JSON.parse(readFileSync(fileURLToPath(new URL(`../apps/landing/i18n/${code}.json`, import.meta.url)), 'utf-8'));
const plain = (html) => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

const ROUTES = [['/', 'en'], ['/es/', 'es'], ['/ar/', 'ar']];
const MODES = ['light', 'dark', 'high-contrast'];

/** In the page: the contrast of an element's text over what is behind it, and its colours as rgba. */
/** @param {Element} el */
function measureInPage(el) {
  const toRgba = (css) => {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.fillStyle = css;
    x.fillRect(0, 0, 1, 1);
    const d = x.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  };
  const lum = ([r, g, b]) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const over = (top, bottom) => {
    const a = top[3] + bottom[3] * (1 - top[3]);
    return [0, 1, 2].map((i) => (top[i] * top[3] + bottom[i] * bottom[3] * (1 - top[3])) / (a || 1)).concat(a);
  };
  const layers = [];
  for (let n = el; n; n = n.parentElement) {
    const bg = toRgba(getComputedStyle(n).backgroundColor);
    if (bg[3] > 0) layers.push(bg);
    if (bg[3] >= 0.999) break;
  }
  let back = [255, 255, 255, 1];
  for (const layer of layers.reverse()) back = over(layer, back);
  const ink = over(toRgba(getComputedStyle(el).color), back);
  const [hi, lo] = [lum(ink), lum(back)].sort((p, q) => q - p);
  return { ratio: (hi + 0.05) / (lo + 0.05), ink: toRgba(getComputedStyle(el).color), back };
}

/** The paper and the ink of a mode, as a throwaway element wearing that mode's tokens would paint them. */
/** @param {string} mode */
function probeInPage(mode) {
  const probe = document.createElement('div');
  probe.setAttribute('data-theme', mode);
  probe.style.cssText = 'background: var(--luz-surface-page); color: var(--luz-text-primary); position: absolute';
  document.body.append(probe);
  const style = getComputedStyle(probe);
  const out = { paper: style.backgroundColor, ink: style.color };
  probe.remove();
  return out;
}

const measure = (locator) => locator.evaluate(measureInPage);
const probe = (page, mode) => page.evaluate(probeInPage, mode);

test.describe('the head and the three boxes', () => {
  test('English: eyebrow, title with "The whole day" marked, and the lead from the catalog', async ({ page }) => {
    const en = catalog('en');
    await page.goto('/');
    const head = page.locator('#modes .landing-modes__head');
    await expect(head.locator('.landing-inside__eyebrow')).toHaveText('Color modes');
    await expect(page.locator('#modes-title')).toHaveText('Three modes for everyone. The whole day, if you want it.');
    await expect(page.locator('#modes-title .landing-mark')).toHaveText('The whole day');
    await expect(head.locator('.landing-inside__lead')).toHaveText(plain(en['modes.lead']));
  });

  for (const [route, code] of ROUTES) {
    test(`${route}: the tag "${code === 'en' ? 'Core · included' : 'core'}" is above the three boxes`, async ({ page }) => {
      await page.goto(route);
      const tag = page.locator('#modes .landing-modes__figure > .landing-modes__tag');
      await expect(tag).toHaveText(plain(catalog(code)['modes.core']));
      if (code === 'en') await expect(tag).toHaveText('Core · included');
      const [tagBox, cutsBox] = await Promise.all([tag.boundingBox(), page.locator('#modes .landing-cuts').boundingBox()]);
      expect(/** @type {any} */ (tagBox).y + /** @type {any} */ (tagBox).height).toBeLessThanOrEqual(/** @type {any} */ (cutsBox).y + 0.5);
    });

    test(`${route}: the three boxes have no paper of their own: transparent, no shadow`, async ({ page }) => {
      await page.goto(route);
      const cuts = page.locator('#modes .landing-cut');
      await expect(cuts).toHaveCount(3);
      for (const cut of await cuts.all()) {
        const style = await cut.evaluate((el) => {
          const s = getComputedStyle(el);
          return { color: s.backgroundColor, image: s.backgroundImage, shadow: s.boxShadow };
        });
        expect(style.color, 'background colour').toBe('rgba(0, 0, 0, 0)');
        expect(style.image, 'background image').toBe('none');
        expect(style.shadow, 'shadow').toBe('none');
      }
    });
  }
});

for (const mode of MODES) {
  test.describe(`the text of the boxes in ${mode}`, () => {
      test(`takes the page's ink and reads at 4.5:1 (same colour in the three boxes, whatever their own mode)`, async ({ page }) => {
      await seedMode(page, mode);
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute('data-mode', mode);
      const inks = [];
      for (const cut of await page.locator('#modes .landing-cut').all()) {
        for (const part of ['.landing-ui__title', '.landing-ui__text']) {
          const found = await measure(cut.locator(part));
          expect(found.ratio, `${part} in the ${await cut.getAttribute('data-theme')} box, ${mode} page`).toBeGreaterThanOrEqual(4.5);
          if (part === '.landing-ui__title') inks.push(found.ink.join());
        }
      }
      expect(new Set(inks).size, 'the three titles wear one ink: the page\'s').toBe(1);
    });
  });
}

test.describe('the label of each box is a badge in the box\'s own mode', () => {
  test('wears that mode\'s paper and ink, reads at 4.5:1, with the mode\'s icon before the name', async ({ page }) => {
    await page.goto('/');
    for (const cut of await page.locator('#modes .landing-cut').all()) {
      const mode = /** @type {string} */ (await cut.getAttribute('data-theme'));
      const label = cut.locator('.landing-cut__label');
      const wanted = await probe(page, mode);
      const style = await label.evaluate((el) => ({ paper: getComputedStyle(el).backgroundColor, ink: getComputedStyle(el).color }));
      expect(style, `${mode} badge`).toEqual(wanted);
      expect((await measure(label)).ratio, `${mode} badge`).toBeGreaterThanOrEqual(4.5);
      const icon = label.locator('.landing-cut__badge-icon');
      await expect(icon, `${mode} icon`).toHaveCount(1);
      const [iconBox, textBox] = await Promise.all([icon.boundingBox(), label.locator('.landing-badge__text').boundingBox()]);
      expect(/** @type {any} */ (iconBox).x, 'the icon comes before the name').toBeLessThan(/** @type {any} */ (textBox).x);
    }
  });

  for (const [route, code] of ROUTES.filter(([, c]) => c !== 'ar')) {
    test(`${route}: the capitals of the name sit on the icon's middle (centres within 1px)`, async ({ page }) => {
      await page.goto(route);
      for (const label of await page.locator('#modes .landing-cut__label').all()) {
        const [iconBox, textBox] = await Promise.all([label.locator('.landing-cut__badge-icon').boundingBox(), label.locator('.landing-badge__text').boundingBox()]);
        const icon = /** @type {any} */ (iconBox);
        const text = /** @type {any} */ (textBox);
        expect(Math.abs(icon.y + icon.height / 2 - (text.y + text.height / 2)), `${code}: icon and caps centres`).toBeLessThanOrEqual(1);
        // The text is trimmed to its capitals: its box is not taller than the icon
        expect(text.height, 'the text box is trimmed').toBeLessThan(icon.height);
      }
    });
  }
});

test.describe('the band of the time of day', () => {
  test('is transparent with a thin solid border, never dashed or dotted', async ({ page }) => {
    await page.goto('/');
    const style = await page.locator('#modes .landing-day').evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        background: s.backgroundColor,
        image: s.backgroundImage,
        sides: ['Top', 'Right', 'Bottom', 'Left'].map((side) => ({ style: s[`border${side}Style`], width: parseFloat(s[`border${side}Width`]) })),
      };
    });
    expect(style.background).toBe('rgba(0, 0, 0, 0)');
    expect(style.image).toBe('none');
    for (const side of style.sides) {
      expect(side.style).toBe('solid');
      expect(side.width).toBeGreaterThan(0);
      expect(side.width).toBeLessThanOrEqual(2);
    }
  });

  for (const [route, code] of ROUTES) {
    test(`${route}: its badge says what it is, with no background, a border and the ink at 4.5:1`, async ({ page }) => {
      await page.goto(route);
      const tag = page.locator('#modes .landing-day__tag');
      await expect(tag).toHaveText(plain(catalog(code)['modes.day.tag']));
      if (code === 'en') await expect(tag).toHaveText('Time-of-day color mode · Catalog, optional');
      const style = await tag.evaluate((el) => {
        const s = getComputedStyle(el);
        return { background: s.backgroundColor, image: s.backgroundImage, border: parseFloat(s.borderTopWidth), borderStyle: s.borderTopStyle };
      });
      expect(style.background).toBe('rgba(0, 0, 0, 0)');
      expect(style.image).toBe('none');
      expect(style.border).toBeGreaterThan(0);
      expect(style.borderStyle).toBe('solid');
      expect((await measure(tag)).ratio).toBeGreaterThanOrEqual(4.5);
    });

    test(`${route}: has a title, a lead, two points and a link to the docs of the element`, async ({ page }) => {
      await page.goto(route);
      const band = page.locator('#modes .landing-day');
      await expect(band.locator('.landing-day__title')).toHaveText(plain(catalog(code)['modes.day.title']));
      await expect(band.locator('.landing-day__lead')).toHaveText(plain(catalog(code)['modes.day.text']));
      await expect(band.locator('.landing-day__points > li')).toHaveCount(2);
      const link = band.locator('a.landing-day__link');
      // Spanish has docs of its own; the others link to the English ones
      await expect(link).toHaveAttribute('href', code === 'es' ? '/es/docs/catalog/theme-time/' : '/docs/catalog/theme-time/');
    });
  }

  test('the bar has no moments of its own, and sits after the points', async ({ page }) => {
    await page.goto('/');
    const bar = page.locator('#modes .landing-day luz-theme-time.landing-day__bar');
    await expect(bar).toHaveAttribute('variant', 'bar');
    await expect(bar.locator('input[type="radio"], .luz-theme-time__moment, .luz-theme-time__moments')).toHaveCount(0);
    await expect(bar.getByRole('slider')).toBeVisible();
  });

  test('moving the slider changes the page\'s moment, the footer\'s checked moment, and the globe\'s bar follows', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    const slider = page.locator('#modes .landing-day__bar .luz-theme-time__slider');
    await slider.scrollIntoViewIfNeeded();
    // At rest the page follows the system: the default moment of light, and no moment is checked (none was chosen)
    await expect(page.locator('html')).toHaveAttribute('data-moment', 'afternoon');
    await expect(page.locator('footer input[name="luz-theme-moment"]:checked')).toHaveCount(0);
    // 21:30 is dusk
    await slider.fill('1290');
    await expect(page.locator('html')).toHaveAttribute('data-moment', 'dusk');
    await expect(page.locator('footer input[name="luz-theme-moment"]:checked')).toHaveValue('dusk');
    await expect(page.locator('home-light .luz-theme-time__slider')).toHaveValue('1290');
    // and back to 09:00, the morning
    await slider.fill('540');
    await expect(page.locator('html')).toHaveAttribute('data-moment', 'morning');
    await expect(page.locator('footer input[name="luz-theme-moment"]:checked')).toHaveValue('morning');
    await expect(page.locator('home-light .luz-theme-time__slider')).toHaveValue('540');
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the bar is not built and the text of the band stays', async ({ page }) => {
    await page.goto('/');
    const band = page.locator('#modes .landing-day');
    await expect(band.locator('luz-theme-time')).toHaveCount(1);
    await expect(band.locator('luz-theme-time').locator('input, .luz-theme-time__bar, [role="slider"]')).toHaveCount(0);
    await expect(band.locator('.landing-day__tag')).toBeVisible();
    await expect(band.locator('.landing-day__title')).toBeVisible();
    await expect(band.locator('.landing-day__lead')).toBeVisible();
    await expect(band.locator('.landing-day__points > li')).toHaveCount(2);
    await expect(band.locator('a.landing-day__link')).toBeVisible();
  });
});
