// @ts-check
/**
 * <luz-embed> of @luz-ds/catalog: a poster and a play button in place of a
 * player of another origin, which loads once the visitor asks (and, when the
 * element names a category, once the consent is granted).
 * tests/fixtures/embed.html, loading the real loader, catalog.min.js; every
 * player in it is tests/fixtures/embed-player.html, a page of the same
 * origin, so no test reaches a third party. `?none` leaves the page with no
 * <luz-embed>.
 *
 * Runs in `chromium` and `chromium-nojs`: without JavaScript the poster is a
 * link that opens the video where it lives, and the question stays hidden.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

import { contrast, MODES, resolveColor } from './helpers/design-tokens.js';
import { channels, vejer } from './helpers/site-lights.js';
import { faded } from './helpers/settle.js';
import { over, parseColor, ratio } from '../packages/tokens/lib/contrast.js';

const PAGE = '/tests/fixtures/embed.html';
const NONE = `${PAGE}?none`;
const PLAYER = /\/tests\/fixtures\/embed-player\.html/;
const CHUNK = /\/embed\.min\.js(\?.*)?$/;
const KEY = 'luz-consent';
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const jsOff = () => test.info().project.use.javaScriptEnabled === false;

/** Open the fixture and wait until the element is defined and the first one is wired. */
async function open(page, url = PAGE) {
  await page.goto(url);
  await expect.poll(() => page.evaluate(() => !!customElements.get('luz-embed')), { message: 'the loader defines <luz-embed>' }).toBe(true);
  await expect(page.locator('#plain')).toHaveAttribute('data-luz-state', 'ready');
}

/** The URLs of the player the page has asked for, from now on. */
function playerRequests(page) {
  /** @type {string[]} */
  const seen = [];
  page.on('request', (request) => PLAYER.test(request.url()) && seen.push(request.url()));
  return seen;
}

/** Store a granted category before the first script, once per tab. */
const grant = (page, category = 'external') =>
  page.addInitScript(([key, name]) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem(key, JSON.stringify({ version: 1, asked: [name], granted: [name], expires: Date.now() + 864e5 }));
      sessionStorage.setItem('seeded', '1');
    }
  }, [KEY, category]);

const preconnects = (page) => page.evaluate(() => [...document.querySelectorAll('link[rel="preconnect"]')].map((l) => /** @type {HTMLLinkElement} */ (l).href));
const stored = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
const play = (page, id) => page.locator(`#${id} > button.luz-embed__play`);
const state = (page, id) => page.locator(`#${id}`).getAttribute('data-luz-state');

test.describe('embed without JavaScript', () => {
  test('the poster is a link that opens the video where it lives, and the question stays hidden', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-nojs', 'the state without JavaScript');
    await page.goto(PAGE);
    for (const [id, name] of [
      ['plain', 'Play video: Plain video'],
      ['asked', 'Play video: Video that asks'],
      ['no-ask', 'Play video: Video with no question'],
    ]) {
      const link = page.locator(`#${id} a.luz-embed__link`);
      await expect(link).toBeVisible();
      await expect(link).toHaveAccessibleName(name);
      await expect(link).toHaveAttribute('href', PLAYER);
    }
    for (const ask of await page.locator('.luz-embed__ask').all()) await expect(ask).toBeHidden();
    await expect(page.locator('luz-embed iframe')).toHaveCount(0);
    await expect(page.locator('luz-embed > button')).toHaveCount(0);
    // The link takes the whole frame, and the title is on the poster
    const frame = await page.locator('#plain').boundingBox();
    const link = await page.locator('#plain a.luz-embed__link').boundingBox();
    expect((frame?.width ?? 0) / (frame?.height ?? 1), 'the frame of the stylesheet, 16 / 9').toBeCloseTo(16 / 9, 1);
    expect(link?.width).toBeCloseTo(frame?.width ?? 0, 0);
    expect(link?.height).toBeCloseTo(frame?.height ?? 0, 0);
    await expect(page.locator('#plain .luz-embed__title')).toBeVisible();
  });
});

test.describe('the page scripts blocked: the link is still there', () => {
  test.skip(() => jsOff(), 'the project without JavaScript has the test above');

  test('with the module blocked the poster stays a link with its name, and axe finds nothing serious', async ({ page }) => {
    await page.route(/\/(packages|apps)\/.*\.js(\?.*)?$/, (route) => route.abort());
    await page.goto(PAGE);
    await expect(page.locator('#plain a.luz-embed__link')).toBeVisible();
    await expect(page.locator('#plain a.luz-embed__link')).toHaveAccessibleName('Play video: Plain video');
    await expect(page.locator('luz-embed > button')).toHaveCount(0);
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);
  });
});

test.describe('embed', () => {
  test.skip(() => jsOff(), 'needs JavaScript: the state without it is above');

  test.describe('the loader and the markup', () => {
    test('the real loader, catalog.min.js, defines the element and loads its chunk', async ({ page }) => {
      const chunks = [];
      page.on('request', (request) => CHUNK.test(request.url()) && chunks.push(request.url()));
      await open(page);
      expect(chunks).toHaveLength(1);
      expect(await page.evaluate(() => !!customElements.get('luz-embed'))).toBe(true);
    });

    test('a page with no <luz-embed> does not load the chunk', async ({ page }) => {
      const chunks = [];
      page.on('request', (request) => CHUNK.test(request.url()) && chunks.push(request.url()));
      await page.goto(NONE);
      await expect(page.locator('luz-embed')).toHaveCount(0);
      // The loader has run once it has defined what the page has; give it its idle turn
      await page.evaluate(() => new Promise((resolve) => (window.requestIdleCallback ?? setTimeout)(resolve)));
      expect(chunks).toEqual([]);
      expect(await page.evaluate(() => !!customElements.get('luz-embed'))).toBe(false);
    });

    test('the link becomes a button with the same children and the same name; nothing of the player is requested', async ({ page }) => {
      const requests = playerRequests(page);
      await open(page);
      const button = play(page, 'plain');
      await expect(button).toBeVisible();
      await expect(button).toHaveAccessibleName('Play video: Plain video');
      await expect(page.locator('#plain a.luz-embed__link')).toHaveCount(0);
      await expect(button.locator('img.luz-embed__poster')).toHaveCount(1);
      await expect(button.locator('.luz-embed__title')).toHaveText('Plain video');
      expect(await state(page, 'plain')).toBe('ready');
      await expect(page.locator('luz-embed iframe')).toHaveCount(0);
      expect(await preconnects(page)).toEqual([]);
      expect(requests).toEqual([]);
    });

    test('an address that is not https or of this origin, and a missing one, leave the link', async ({ page }) => {
      await open(page);
      for (const id of ['script-url', 'http-url', 'no-src']) {
        await expect(page.locator(`#${id} a.luz-embed__link`), id).toHaveCount(1);
        await expect(page.locator(`#${id} button`), id).toHaveCount(0);
        expect(await state(page, id), id).toBeNull();
      }
      // Pressing the link goes where the author put it, not to the address that was refused
      const requests = playerRequests(page);
      await page.locator('#script-url a.luz-embed__link').hover();
      expect(await preconnects(page)).toEqual([]);
      expect(requests).toEqual([]);
    });

    test('a category that is not granted, with no question to ask, leaves the link; granted, it is a button', async ({ page }) => {
      await open(page);
      await expect(page.locator('#no-ask a.luz-embed__link')).toHaveCount(1);
      await expect(page.locator('#no-ask button')).toHaveCount(0);
      const granted = await page.context().newPage();
      await grant(granted);
      await open(granted);
      await expect(play(granted, 'no-ask')).toBeVisible();
      await expect(play(granted, 'no-ask')).toHaveAccessibleName('Play video: Video with no question');
      await granted.close();
    });

    test('the frame keeps 16 / 9 by default and the ratio of --luz-embed-ratio', async ({ page }) => {
      await open(page);
      const plain = await page.locator('#plain').boundingBox();
      const square = await page.locator('#square').boundingBox();
      expect((plain?.width ?? 0) / (plain?.height ?? 1)).toBeCloseTo(16 / 9, 1);
      expect((square?.width ?? 0) / (square?.height ?? 1)).toBeCloseTo(4 / 3, 1);
      // The button takes the whole frame
      const button = await play(page, 'plain').boundingBox();
      expect(button?.width).toBeCloseTo(plain?.width ?? 0, 0);
      expect(button?.height).toBeCloseTo(plain?.height ?? 0, 0);
    });

    test('320 px: no sideways scroll, in the poster and in the question', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 700 });
      await open(page);
      await play(page, 'asked').click();
      await expect(page.locator('#asked')).toHaveAttribute('data-luz-state', 'ask');
      const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(wide, 'pixels beyond the window').toBeLessThanOrEqual(0);
      // The frame grows to hold the question: nothing of it is cut
      const { scroll, client } = await page.locator('#asked').evaluate((el) => ({ scroll: el.scrollHeight, client: el.clientHeight }));
      expect(scroll).toBeLessThanOrEqual(client);
    });
  });

  test.describe('before the click', () => {
    test('the pointer over the button opens one connection to the origin of the player, once per origin', async ({ page }) => {
      await open(page);
      await play(page, 'plain').hover();
      await expect.poll(() => preconnects(page)).toHaveLength(1);
      expect((await preconnects(page))[0]).toMatch(/^https?:\/\/[^/]+\/?$/);
      // A second player of the same origin, and the first again: still one
      await play(page, 'twin').hover();
      await play(page, 'plain').hover();
      await page.waitForTimeout(100);
      expect(await preconnects(page)).toHaveLength(1);
    });

    test('focus on the button does it too, and asks nothing of the player itself', async ({ page }) => {
      const requests = playerRequests(page);
      await open(page);
      await play(page, 'twin').focus();
      await expect.poll(() => preconnects(page)).toHaveLength(1);
      expect(requests).toEqual([]);
    });

    test('without the consent there is no preconnect, whatever the pointer does', async ({ page }) => {
      await open(page);
      await play(page, 'asked').hover();
      await play(page, 'asked').focus();
      await page.waitForTimeout(100);
      expect(await preconnects(page)).toEqual([]);
    });

    test('with the consent granted before the page, the same embed warms up and plays at once', async ({ page }) => {
      await grant(page);
      await open(page);
      await play(page, 'asked').hover();
      await expect.poll(() => preconnects(page)).toHaveLength(1);
      await play(page, 'asked').click();
      await expect(page.locator('#asked iframe')).toHaveCount(1);
      expect(await state(page, 'asked')).toBe('playing');
      await expect(page.locator('#asked [data-luz-embed-ask]')).toBeHidden();
    });

    test('a consent that has expired, or that is not valid, is no consent', async ({ page }) => {
      await page.addInitScript((key) => {
        localStorage.setItem(key, JSON.stringify({ version: 1, asked: ['external'], granted: ['external'], expires: Date.now() - 1000 }));
      }, KEY);
      await open(page);
      await play(page, 'asked').click();
      expect(await state(page, 'asked')).toBe('ask');
      await expect(page.locator('#asked iframe')).toHaveCount(0);
    });
  });

  test.describe('the click', () => {
    test('writes the iframe with the address, the title, the referrer policy and the permissions, and puts focus in it', async ({ page }) => {
      const requests = playerRequests(page);
      await open(page);
      await play(page, 'plain').click();
      const frame = page.locator('#plain > iframe');
      await expect(frame).toHaveCount(1);
      expect(await state(page, 'plain')).toBe('playing');
      expect(await frame.getAttribute('src')).toMatch(/\/tests\/fixtures\/embed-player\.html\?autoplay=1$/);
      expect(await frame.getAttribute('title')).toBe('Plain video');
      expect(await frame.getAttribute('referrerpolicy')).toBe('strict-origin-when-cross-origin');
      expect(await frame.getAttribute('allow')).toContain('autoplay');
      expect(await frame.getAttribute('allow')).toContain('picture-in-picture');
      expect(await frame.evaluate((el) => /** @type {HTMLIFrameElement} */ (el).allowFullscreen)).toBe(true);
      // The player is loaded, and focus is in the frame
      await expect(page.frameLocator('#plain > iframe').getByRole('heading', { name: 'The player' })).toBeVisible();
      expect(await page.evaluate(() => document.activeElement?.closest('luz-embed')?.id + ':' + document.activeElement?.localName)).toBe('plain:iframe');
      expect(requests.length).toBeGreaterThan(0);
      // The poster and its button are gone; the frame takes the place
      await expect(page.locator('#plain > button.luz-embed__play')).toBeHidden();
      const host = await page.locator('#plain').boundingBox();
      const box = await frame.boundingBox();
      expect(box?.width).toBeCloseTo(host?.width ?? 0, 0);
      expect(box?.height).toBeCloseTo(host?.height ?? 0, 0);
    });

    test('the keyboard does the same: Enter on the button plays', async ({ page }) => {
      await open(page);
      await play(page, 'twin').focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('#twin > iframe')).toHaveCount(1);
      expect(await state(page, 'twin')).toBe('playing');
    });

    test('one video playing does not touch another', async ({ page }) => {
      await open(page);
      await play(page, 'plain').click();
      await expect(page.locator('#plain > iframe')).toHaveCount(1);
      expect(await state(page, 'twin')).toBe('ready');
      await expect(page.locator('#twin > iframe')).toHaveCount(0);
    });
  });

  test.describe('without the consent', () => {
    test('the click asks first: no frame, no request to the player, focus on the first button of the question', async ({ page }) => {
      const requests = playerRequests(page);
      await open(page);
      await play(page, 'asked').click();
      expect(await state(page, 'asked')).toBe('ask');
      const question = page.locator('#asked [data-luz-embed-ask]');
      await expect(question).toBeVisible();
      await expect(page.locator('#asked iframe')).toHaveCount(0);
      await expect(page.locator('#asked > button.luz-embed__play')).toBeHidden();
      await expect(question.getByRole('button', { name: 'Play this video' })).toBeFocused();
      expect(await preconnects(page)).toEqual([]);
      expect(requests).toEqual([]);
      // The three answers are buttons, in the order of the markup
      await expect(question.getByRole('button')).toHaveText(['Play this video', 'Always play outside videos', 'Not now']);
    });

    test('Tab goes through the three buttons of the question, and Escape does nothing', async ({ page }) => {
      await open(page);
      await play(page, 'asked').click();
      const question = page.locator('#asked [data-luz-embed-ask]');
      await page.keyboard.press('Tab');
      await expect(question.getByRole('button', { name: 'Always play outside videos' })).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(question.getByRole('button', { name: 'Not now' })).toBeFocused();
      await page.keyboard.press('Escape');
      expect(await state(page, 'asked')).toBe('ask');
      await expect(question).toBeVisible();
      await expect(question.getByRole('button', { name: 'Not now' })).toBeFocused();
    });

    test('"Not now" goes back to the poster, with focus on its button and nothing loaded', async ({ page }) => {
      const requests = playerRequests(page);
      await open(page);
      await play(page, 'asked').click();
      await page.locator('#asked').getByRole('button', { name: 'Not now' }).click();
      expect(await state(page, 'asked')).toBe('ready');
      await expect(page.locator('#asked [data-luz-embed-ask]')).toBeHidden();
      await expect(play(page, 'asked')).toBeVisible();
      await expect(play(page, 'asked')).toBeFocused();
      await expect(page.locator('#asked iframe')).toHaveCount(0);
      expect(await stored(page)).toBeNull();
      expect(requests).toEqual([]);
      // And it asks again
      await play(page, 'asked').click();
      expect(await state(page, 'asked')).toBe('ask');
    });

    test('"Play this video" plays this one, keeps nothing and leaves the others asking', async ({ page }) => {
      await open(page);
      await play(page, 'asked').click();
      await page.locator('#asked').getByRole('button', { name: 'Play this video' }).click();
      await expect(page.locator('#asked > iframe')).toHaveCount(1);
      expect(await state(page, 'asked')).toBe('playing');
      expect(await page.evaluate(() => document.activeElement?.localName)).toBe('iframe');
      expect(await stored(page)).toBeNull();
      await play(page, 'sibling').click();
      expect(await state(page, 'sibling')).toBe('ask');
    });

    test('"Always" keeps {version, asked, granted, expires}, says luz:consent, plays, and unlocks the other videos of the category', async ({ page }) => {
      await page.addInitScript(() => {
        window.__events = [];
        document.addEventListener('luz:consent', (e) => window.__events.push(e.detail));
      });
      await open(page);
      const before = Date.now();
      await play(page, 'asked').click();
      await page.locator('#asked').getByRole('button', { name: 'Always play outside videos' }).click();
      await expect(page.locator('#asked > iframe')).toHaveCount(1);
      expect(await state(page, 'asked')).toBe('playing');

      const saved = await stored(page);
      expect(Object.keys(saved).sort()).toEqual(['asked', 'expires', 'granted', 'version']);
      expect(saved.version).toBe(1);
      expect(saved.asked).toEqual(['external']);
      expect(saved.granted).toEqual(['external']);
      expect(saved.expires).toBeGreaterThan(before);

      const events = await page.evaluate(() => window.__events);
      expect(events).toHaveLength(1);
      expect(events[0].granted).toEqual(['external']);
      expect(events[0].asked).toEqual(['external']);
      expect(events[0].expires).toBe(saved.expires);

      // The sibling needs no question now: it warms up and plays
      await play(page, 'sibling').hover();
      await expect.poll(() => preconnects(page)).toHaveLength(1);
      await play(page, 'sibling').click();
      await expect(page.locator('#sibling > iframe')).toHaveCount(1);
      await expect(page.locator('#sibling [data-luz-embed-ask]')).toBeHidden();

      // On the next visit the video with no question, which was a link, is a button: the category is granted
      await page.reload();
      await expect.poll(() => page.evaluate(() => !!customElements.get('luz-embed'))).toBe(true);
      await expect(play(page, 'no-ask')).toBeVisible();
    });

    test('"Always" keeps the key the element names, which starts with luz-, and no other', async ({ page }) => {
      await open(page);
      await page.evaluate(() => {
        document.querySelector('#asked').dataset.luzConsentKey = 'luz-consent-test';
      });
      await play(page, 'asked').click();
      await page.locator('#asked').getByRole('button', { name: 'Always play outside videos' }).click();
      expect(await page.evaluate(() => localStorage.getItem('luz-consent-test') !== null)).toBe(true);
      expect(await stored(page)).toBeNull();
    });

    test('a key that does not start with luz- is not used', async ({ page }) => {
      await open(page);
      await page.evaluate(() => {
        document.querySelector('#asked').dataset.luzConsentKey = 'session';
      });
      await play(page, 'asked').click();
      await page.locator('#asked').getByRole('button', { name: 'Always play outside videos' }).click();
      expect(await page.evaluate(() => localStorage.getItem('session'))).toBeNull();
      expect(await stored(page)).not.toBeNull();
    });
  });

  test.describe('the look', () => {
    test('a visible ring outside the frame on the keyboard focus, and the host does not clip it', async ({ page }) => {
      await open(page);
      await page.keyboard.press('Tab');
      await expect(play(page, 'plain')).toBeFocused();
      const ring = await page.locator('#plain').evaluate((el) => {
        const style = getComputedStyle(el);
        return { width: parseFloat(style.outlineWidth), style: style.outlineStyle, offset: parseFloat(style.outlineOffset) };
      });
      expect(ring.style).toBe('solid');
      expect(ring.width).toBeGreaterThanOrEqual(2);
      expect(ring.offset).toBeGreaterThanOrEqual(0);
    });

    for (const mode of MODES) {
      test(`${mode}: the play mark, the title and the question read as the tokens say`, async ({ page }) => {
        await open(page);
        await page.evaluate((m) => {
          document.documentElement.dataset.theme = m;
          document.documentElement.dataset.mode = m;
        }, mode);
        await faded(page);

        // The disc is the brand fill and the triangle the text on it, 3:1 at least
        expect(contrast(mode, 'text-on-fill', 'brand-fill')).toBeGreaterThanOrEqual(3);
        const mark = await play(page, 'plain').evaluate((el) => ({
          disc: getComputedStyle(el, '::before').backgroundColor,
          triangle: getComputedStyle(el, '::after').backgroundColor,
        }));
        expect(channels(mark.disc).slice(0, 3)).toEqual(vejer(mode, 'brand-fill').slice(0, 3));
        expect(channels(mark.triangle).slice(0, 3)).toEqual(vejer(mode, 'text-on-fill').slice(0, 3));

        // The title is the text on fill, and holds 4.5:1 on the scrim even over a white poster
        const title = await play(page, 'plain').locator('.luz-embed__title').evaluate((el) => getComputedStyle(el).color);
        expect(channels(title).slice(0, 3)).toEqual(vejer(mode, 'text-on-fill').slice(0, 3));
        const solid = over(parseColor(resolveColor(mode, 'scrim')), parseColor('#ffffff'));
        expect(ratio(over(parseColor(resolveColor(mode, 'text-on-fill')), solid), solid)).toBeGreaterThanOrEqual(4.5);

        // The question: the text on the muted surface, 4.5:1
        expect(contrast(mode, 'text-primary', 'surface-muted')).toBeGreaterThanOrEqual(4.5);
        await play(page, 'asked').click();
        const asked = await page.locator('#asked').evaluate((el) => ({
          background: getComputedStyle(el).backgroundColor,
          color: getComputedStyle(el.querySelector('[data-luz-embed-ask] p')).color,
        }));
        expect(channels(asked.background).slice(0, 3)).toEqual(vejer(mode, 'surface-muted').slice(0, 3));
        expect(channels(asked.color).slice(0, 3)).toEqual(vejer(mode, 'text-primary').slice(0, 3));
      });
    }

    for (const mode of MODES) {
      for (const where of ['ready', 'ask', 'playing']) {
        test(`${mode}, ${where}: no serious or critical violation`, async ({ page }) => {
          await open(page);
          await page.evaluate((m) => {
            document.documentElement.dataset.theme = m;
            document.documentElement.dataset.mode = m;
          }, mode);
          if (where === 'ask') await play(page, 'asked').click();
          if (where === 'playing') {
            await play(page, 'plain').click();
            await expect(page.frameLocator('#plain > iframe').getByRole('heading', { name: 'The player' })).toBeVisible();
          }
          await faded(page);
          const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
          const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
          expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
        });
      }
    }
  });
});
