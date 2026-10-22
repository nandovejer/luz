// @ts-check
/**
 * The sky behind the home page and the docs (apps/site/sky.css).
 *
 * One stylesheet and one partial, shared by the two:
 *
 *  - The class `site-sky` goes on the host: the home's `<main>`, the docs' `<body>`.
 *    Its `::before` and `::after` are two fixed layers, 200vh tall, behind the
 *    content (z-index -1), decorative (no text, `pointer-events: none`).
 *  - The partial `sky-filter` (an SVG with `<filter id="site-sky-clouds">`, the
 *    filter the clouds used) is still in the page: at the end of the home's
 *    `<main>` and in the docs layout.
 *  - Dark lights (dawn, dusk, night): stars across the WHOLE page, not a strip at
 *    the top; the layers are fixed to the window and slide up with the scroll,
 *    slower than the page (one layer at 0.3 of its speed, the other at 0.15),
 *    where the browser has scroll timelines. They twinkle (an opacity animation,
 *    `landing-twinkle`) ONLY on the home: nothing in the docs is animated by a
 *    clock (WCAG 2.2.2, there is no pause control there). On the home the layers
 *    are fully opaque; in the docs a star may be at most 15% of the text colour
 *    (reference.css), so text keeps 4.5:1 over it.
 *  - Light lights (morning, afternoon, sunset): nothing. The clouds went with the
 *    home's redesign: by day the page itself is the light, and both layers are
 *    `display: none`. No stars in light.
 *  - Never in high contrast or forced colours; under prefers-reduced-motion the
 *    stars are drawn and nothing moves.
 *
 * The tests set the light with the clock (no stored choice), as
 * tests/helpers/site-lights.js does, and read the computed style of the layers.
 * It needs JavaScript (boot.js writes data-light), so it runs in `chromium`.
 */
/* global atob, Blob, createImageBitmap, innerHeight, OffscreenCanvas, ScrollTimeline -- these run in the page, inside page.evaluate() */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { faded } from './helpers/settle.js';
import { LIGHTS, NO_CHOICE, TIMEZONE, atTime, seedMode } from './helpers/site-lights.js';

test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'boot.js writes data-light: the sky needs JavaScript');
test.use({ timezoneId: TIMEZONE, storageState: NO_CHOICE });

/** [name, route, the host of the sky] */
const PAGES = [
  ['home', '/', 'main#main-content'],
  ['docs', '/docs/components/button/', 'body'],
];
const DARK = LIGHTS.filter(([, , mode]) => mode === 'dark');
const LIGHT = LIGHTS.filter(([, , mode]) => mode === 'light');
const HOURS = { dawn: '06:00', morning: '09:00', afternoon: '14:00', sunset: '19:00', dusk: '21:00', night: '23:30' };

/**
 * Open a page at the hour of a light, with nothing stored.
 * @param {import('@playwright/test').Page} page
 * @param {string} route
 * @param {string} light
 */
async function open(page, route, light) {
  await atTime(page, HOURS[/** @type {keyof typeof HOURS} */ (light)]);
  await page.goto(route);
  await expect(page.locator('html')).toHaveAttribute('data-light', light);
  await faded(page);
  await page.evaluate(() => window.scrollTo(0, 0));
}

/**
 * What the two layers of the sky compute to.
 * @param {import('@playwright/test').Page} page
 * @param {string} host selector of the host
 */
function layers(page, host) {
  return page.evaluate((selector) => {
    const el = document.querySelector(selector);
    if (!el) return null;
    return ['::before', '::after'].map((pseudo) => {
      const s = getComputedStyle(el, pseudo);
      const y = (v) => parseFloat(v.split(' ')[1]) || 0;
      return {
        content: s.content,
        display: s.display,
        position: s.position,
        zIndex: s.zIndex,
        top: s.top,
        height: parseFloat(s.height),
        width: parseFloat(s.width),
        events: s.pointerEvents,
        opacity: parseFloat(s.opacity),
        stars: /radial-gradient/.test(s.backgroundImage),
        shadow: s.boxShadow,
        filter: s.filter,
        animation: s.animationName,
        translateY: y(s.translate),
        translate: s.translate,
      };
    });
  }, host);
}

/** Whether a layer draws anything at all. */
const drawn = (/** @type {{ display: string, opacity: number, stars: boolean, shadow: string }} */ l) => l.display !== 'none' && l.opacity > 0 && (l.stars || l.shadow !== 'none');

/** Scroll to y and wait for the frames that paint it. */
async function scrollToY(page, y) {
  await page.evaluate((top) => window.scrollTo(0, top), y);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  return page.evaluate(() => window.scrollY);
}

const switchOff = '.site-sky::before, .site-sky::after { display: none !important; }';

for (const [name, route, host] of PAGES) {
  test.describe(`the sky on the ${name} (${route})`, () => {
    test(`${host} carries site-sky, and the page includes the filter of the partial`, async ({ page }) => {
      await open(page, route, 'night');
      await expect(page.locator('.site-sky')).toHaveCount(1);
      await expect(page.locator(`${host}.site-sky`)).toHaveCount(1);
      const filter = page.locator('svg filter#site-sky-clouds');
      await expect(filter, 'the filter of the partial sky-filter').toHaveCount(1);
      const svg = page.locator('svg:has(> filter#site-sky-clouds)');
      expect(await svg.getAttribute('aria-hidden'), 'the filter is not content').toBe('true');
      if (name === 'home') {
        const last = await page.evaluate(() => !!document.querySelector('main#main-content > svg:last-child:has(filter#site-sky-clouds)'));
        expect(last, 'the partial is the last child of <main>').toBe(true);
      }
    });

    for (const [light] of DARK) {
      test.describe(`${light}: stars`, () => {
        test('two decorative layers, fixed to the window, two screens tall, behind the content', async ({ page }) => {
          await open(page, route, light);
          await expect.poll(async () => (await layers(page, host))?.every((l) => l.opacity > 0)).toBe(true);
          const ls = /** @type {NonNullable<Awaited<ReturnType<typeof layers>>>} */ (await layers(page, host));
          const vh = await page.evaluate(() => innerHeight);
          for (const l of ls) {
            expect(l.content).toBe('""');
            expect(l.position).toBe('fixed');
            expect(l.zIndex).toBe('-1');
            expect(l.events, 'pointer-events').toBe('none');
            expect(l.stars, 'stars are drawn (radial gradients)').toBe(true);
            expect(l.shadow, 'no clouds in the dark').toBe('none');
            expect(l.filter, 'no cloud filter in the dark').toBe('none');
            expect(l.height, 'the layer is 200vh tall').toBeCloseTo(vh * 2, 0);
          }
        });

        test('the stars are across the whole page: the top of the page and its foot both show them', async ({ page }) => {
          await open(page, route, light);
          await expect.poll(async () => (await layers(page, host))?.every((l) => l.opacity > 0)).toBe(true);
          const vh = await page.evaluate(() => innerHeight);
          const range = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
          expect(range, 'the page scrolls').toBeGreaterThan(vh);
          const bottom = await scrollToY(page, range);
          expect(bottom).toBeGreaterThan(vh);
          // Fixed, and slid up by less than one screen: the window is covered from top to bottom
          for (const l of /** @type {NonNullable<Awaited<ReturnType<typeof layers>>>} */ (await layers(page, host))) {
            expect(l.position).toBe('fixed');
            expect(l.translateY, 'never slid by more than a screen').toBeGreaterThanOrEqual(-vh - 1);
            expect(l.translateY).toBeLessThanOrEqual(0);
            expect(l.height + l.translateY, 'the layer still reaches the foot of the window').toBeGreaterThanOrEqual(vh - 1);
          }
          // And they are painted there: the window at the foot of the page differs without the sky
          const withSky = await page.screenshot({ animations: 'disabled' });
          await page.addStyleTag({ content: switchOff });
          const without = await page.screenshot({ animations: 'disabled' });
          expect(withSky.equals(without), 'at the foot of the page the stars change the pixels').toBe(false);
        });

        test('the stars drift with the scroll, slower than the page: one layer at 0.3 of its speed, the other at 0.15', async ({ page }) => {
          await open(page, route, light);
          expect((await layers(page, host))?.map((l) => l.translateY), 'still at the top of the page').toEqual([0, 0]);
          const scrolled = await scrollToY(page, 300);
          expect(scrolled).toBeGreaterThan(250);
          await expect
            .poll(async () => {
              const rates = /** @type {NonNullable<Awaited<ReturnType<typeof layers>>>} */ (await layers(page, host)).map((l) => -l.translateY / scrolled);
              return rates.sort((a, b) => b - a).map((r) => Math.round(r * 20) / 20);
            })
            .toEqual([0.3, 0.15]);
        });

        test('they are not animated by a clock in the docs, and they twinkle on the home', async ({ page }) => {
          await open(page, route, light);
          const ls = /** @type {NonNullable<Awaited<ReturnType<typeof layers>>>} */ (await layers(page, host));
          const names = ls.map((l) => l.animation.split(',').map((n) => n.trim()));
          const info = await page.evaluate((selector) => {
            const el = document.querySelector(selector);
            return document
              .getAnimations()
              .filter((a) => /** @type {KeyframeEffect} */ (a.effect)?.target === el && /** @type {KeyframeEffect} */ (a.effect).pseudoElement)
              .map((a) => ({ pseudo: /** @type {KeyframeEffect} */ (a.effect).pseudoElement, name: /** @type {any} */ (a).animationName, scroll: typeof ScrollTimeline !== 'undefined' && a.timeline instanceof ScrollTimeline }));
          }, host);
          if (name === 'home') {
            for (const n of names) expect(n, 'both layers twinkle').toContain('landing-twinkle');
            expect(info.filter((a) => a.name === 'landing-twinkle').map((a) => a.pseudo).sort()).toEqual(['::after', '::before']);
          } else {
            for (const n of names) expect(n.includes('landing-twinkle'), 'nothing twinkles in the docs').toBe(false);
            expect(info.length, 'the scroll drives the drift').toBeGreaterThan(0);
            expect(info.filter((a) => !a.scroll).map((a) => a.name), 'every animation of the sky is driven by the scroll, none by a clock').toEqual([]);
          }
        });
      });
    }

    test.describe('the opacity of the stars', () => {
      test(name === 'home' ? 'on the home the layers are fully opaque (their twinkle goes down from 1)' : 'in the docs the layers are capped at 0.15, so text keeps its contrast', async ({ page }) => {
        // Reduced motion stops the twinkle, so the computed opacity is the layer's own
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await open(page, route, 'night');
        const want = name === 'home' ? 1 : 0.15;
        await expect.poll(async () => (await layers(page, host))?.map((l) => l.opacity)).toEqual([want, want]);
      });
    });

    for (const [light] of LIGHT) {
      test.describe(`${light}: nothing`, () => {
        test('by day the sky draws nothing: both layers are display none, with no stars and no clouds', async ({ page }) => {
          await open(page, route, light);
          await expect.poll(async () => (await layers(page, host))?.every((l) => l.display === 'none')).toBe(true);
          for (const l of /** @type {NonNullable<Awaited<ReturnType<typeof layers>>>} */ (await layers(page, host))) {
            expect(drawn(l), 'nothing is drawn').toBe(false);
            expect(l.shadow, 'no clouds').toBe('none');
            expect(l.filter, 'no cloud filter').toBe('none');
            expect(l.animation, 'no animation').toBe('none');
          }
        });
      });
    }

    test('switching the mode swaps the sky: nothing by day, stars at night', async ({ page }) => {
      await open(page, route, 'afternoon');
      await expect.poll(async () => (await layers(page, host))?.map((l) => l.display)).toEqual(['none', 'none']);
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-light', 'night');
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await expect.poll(async () => (await layers(page, host))?.map((l) => [l.stars, l.shadow])).toEqual([[true, 'none'], [true, 'none']]);
    });

    test.describe('where the sky is not', () => {
      test('high contrast: nothing is drawn, in the dark light or the light ones', async ({ page }) => {
        await seedMode(page, 'high-contrast');
        await atTime(page, HOURS.night);
        await page.goto(route);
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'high-contrast');
        await faded(page);
        await page.waitForTimeout(500);
        for (const l of /** @type {NonNullable<Awaited<ReturnType<typeof layers>>>} */ (await layers(page, host))) {
          expect(drawn(l), `nothing is drawn in high contrast (${JSON.stringify({ d: l.display, o: l.opacity, s: l.stars, b: l.shadow.slice(0, 20) })})`).toBe(false);
        }
      });

      for (const light of ['night', 'afternoon']) {
        test(`forced colours (${light}): the layers are display none`, async ({ page }) => {
          await page.emulateMedia({ forcedColors: 'active' });
          await open(page, route, light);
          for (const l of /** @type {NonNullable<Awaited<ReturnType<typeof layers>>>} */ (await layers(page, host))) {
            expect(l.display).toBe('none');
          }
        });
      }
    });

    for (const light of ['night']) {
      test(`reduced motion (${light}): the sky is drawn and nothing moves`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await open(page, route, light);
        await expect.poll(async () => (await layers(page, host))?.every(drawn)).toBe(true);
        const range = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
        await scrollToY(page, range);
        await page.waitForTimeout(300);
        for (const l of /** @type {NonNullable<Awaited<ReturnType<typeof layers>>>} */ (await layers(page, host))) {
          expect(l.animation, 'no animation').toBe('none');
          expect(l.translate, 'no drift with the scroll').toBe('none');
        }
      });
    }

    for (const light of ['night', 'afternoon']) {
      test(`${light}: the sky never gets in the way (no sideways scroll at 320px)`, async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 700 });
        await open(page, route, light);
        // By day nothing is drawn: there is nothing that could widen the page
        await expect.poll(async () => (await layers(page, host))?.every(drawn)).toBe(light === 'night');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      });
    }

    for (const light of ['night', 'afternoon']) {
      test(`axe: no serious or critical violation in the ${light} light${light === 'night' ? ', under its stars' : ', with no sky'}`, async ({ page }) => {
        await open(page, route, light);
        await expect.poll(async () => (await layers(page, host))?.every(drawn)).toBe(light === 'night');
        await faded(page);
        const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
        const blocking = violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''));
        expect(blocking.map((v) => `${v.id}: ${v.nodes[0]?.target?.join(' ')}`)).toEqual([]);
      });
    }
  });
}

test.describe('the docs keep their text readable over the stars (measured on the pixels)', () => {
  for (const [light] of DARK) {
    test(`${light}: secondary text has 4.5:1 over the brightest star of the page, at the top and at the foot`, async ({ page }) => {
      await open(page, '/docs/components/button/', light);
      await expect.poll(async () => (await layers(page, 'body'))?.every((l) => l.opacity > 0)).toBe(true);
      // Everything of the page is hidden and the window photographed: what is left is the page's surface and its sky,
      // the worst background any text can be read on
      const colour = await page.evaluate(() => {
        const probe = document.createElement('span');
        probe.style.cssText = 'color: var(--luz-text-secondary); position: absolute; visibility: hidden';
        document.body.append(probe);
        const c = getComputedStyle(probe).color;
        probe.remove();
        return c;
      });
      await page.addStyleTag({ content: 'body > * { visibility: hidden !important; }' });
      const range = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      /** @type {number[]} */
      const ratios = [];
      for (const y of [0, range]) {
        await scrollToY(page, y);
        const png = await page.screenshot({ animations: 'disabled' });
        ratios.push(
          await page.evaluate(
            async ({ b64, fg }) => {
              const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
              const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
              const ctx = /** @type {OffscreenCanvasRenderingContext2D} */ (new OffscreenCanvas(bitmap.width, bitmap.height).getContext('2d'));
              ctx.drawImage(bitmap, 0, 0);
              const probe = /** @type {OffscreenCanvasRenderingContext2D} */ (new OffscreenCanvas(1, 1).getContext('2d', { willReadFrequently: true }));
              probe.fillStyle = fg;
              probe.fillRect(0, 0, 1, 1);
              const [fr, fgc, fb] = probe.getImageData(0, 0, 1, 1).data;
              const lum = ([r, g, b]) => {
                const c = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
                return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
              };
              const l1 = lum([fr, fgc, fb]);
              const { data } = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
              let min = Infinity;
              for (let i = 0; i < data.length; i += 4) {
                const l2 = lum([data[i], data[i + 1], data[i + 2]]);
                min = Math.min(min, (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05));
              }
              return min;
            },
            { b64: png.toString('base64'), fg: colour },
          ),
        );
      }
      expect(Math.min(...ratios), `worst contrast of --luz-text-secondary over the page's pixels: ${ratios.map((r) => r.toFixed(2))}`).toBeGreaterThanOrEqual(4.5);
    });
  }
});

test.describe('the home glow is not in high contrast', () => {
  test('.o-page::before is not drawn', async ({ page }) => {
    await seedMode(page, 'high-contrast');
    await atTime(page, HOURS.afternoon);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'high-contrast');
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('.o-page'), '::before').display)).toBe('none');
  });
});
