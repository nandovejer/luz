// @ts-check
/**
 * The FAQ of the home (`#faq`, after the modes and before the footer): `<luz-faq>` of @luz-ds/catalog with the 17
 * questions of the plan in four groups, in three languages. The component itself (the item, the marker, the keyboard,
 * the print rules) is in tests/site-faq.spec.js and its type in tests/site-faq-look.spec.js; here:
 *
 * - the content: 17 `details` in 4 groups, each group a real heading over its questions, a row of four links to them,
 *   and an id on every answer, so a link to it opens its question (native, no script);
 * - the layout: one column, then two from 1024 px with the head pinned at the inline start while the questions go by
 *   (also in right-to-left); no sideways scroll at 320 px;
 * - the language: `lang` of the element is the catalog's (`faq.lang`): in Arabic the questions and answers are English,
 *   so they say so and read left to right inside the right-to-left page;
 * - the modes and forced colours: the marker's shape, not its colour, tells open from closed.
 *
 * Runs in `chromium` and `chromium-nojs`.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { faded } from './helpers/settle.js';

const CATALOG = (code) => JSON.parse(readFileSync(new URL(`../apps/landing/i18n/${code}.json`, import.meta.url), 'utf-8'));
const plain = (html) => html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const ROUTES = [['/', 'en', 'ltr'], ['/es/', 'es', 'ltr'], ['/ar/', 'ar', 'rtl']];
const GROUPS = ['about', 'html', 'use', 'existing'];

const items = (page) => page.locator('#faq details.luz-faq__item');
const isOpen = (locator) => locator.evaluate((el) => /** @type {HTMLDetailsElement} */ (el).open);

test.describe('the FAQ of the home: the content', () => {
  for (const [route, code] of ROUTES) {
    test(`${route}: 17 questions in four groups, each group a heading over its questions`, async ({ page }) => {
      const words = CATALOG(code);
      await page.goto(route);
      await expect(page.locator('#faq luz-faq')).toHaveCount(1);
      await expect(items(page)).toHaveCount(17);
      const groups = page.locator('#faq section.luz-faq__group');
      await expect(groups).toHaveCount(4);
      for (const [index, group] of GROUPS.entries()) {
        const title = groups.nth(index).locator('h3.luz-faq__group-title');
        await expect(title, group).toHaveText(plain(words[`faq.group.${group}`]));
        const id = await title.getAttribute('id');
        expect(id, `${group}: the title has an id`).toBeTruthy();
        await expect(groups.nth(index), `${group}: the section is named by its title`).toHaveAttribute('aria-labelledby', /** @type {string} */ (id));
        expect(await groups.nth(index).locator('details.luz-faq__item').count(), `${group}: it has questions`).toBeGreaterThanOrEqual(3);
      }
      // Every question is a summary with words, closed at first
      for (const summary of await page.locator('#faq summary.luz-faq__question').all()) expect(((await summary.textContent()) ?? '').trim().length).toBeGreaterThan(8);
      for (const item of await items(page).all()) expect(await isOpen(item)).toBe(false);
    });

    test(`${route}: the FAQ is headed like the other sections, and its row of links names the four groups`, async ({ page }) => {
      const words = CATALOG(code);
      await page.goto(route);
      await expect(page.locator('#faq h2#faq-title')).toHaveText(plain(words['faq.title']));
      await expect(page.locator('#faq')).toHaveAttribute('aria-labelledby', 'faq-title');
      const links = page.locator('#faq nav.luz-faq__nav a');
      await expect(links).toHaveCount(4);
      await expect(page.locator('#faq nav.luz-faq__nav')).toHaveAttribute('aria-label', words['faq.nav']);
      const titles = await page.locator('#faq h3.luz-faq__group-title').evaluateAll((all) => all.map((el) => [el.id, el.textContent?.trim()]));
      const targets = await links.evaluateAll((all) => all.map((a) => [decodeURIComponent(new URL(/** @type {HTMLAnchorElement} */ (a).href).hash.slice(1)), a.textContent?.trim()]));
      expect(targets, 'each link goes to a group title that exists, in order, and says its name').toEqual(titles);
    });
  }

  test('every answer has an id of its own, and the page has no id twice', async ({ page }) => {
    await page.goto('/');
    const ids = await page.locator('#faq .luz-faq__answer').evaluateAll((all) => all.map((el) => el.id));
    expect(ids).toHaveLength(17);
    for (const id of ids) expect(id, 'an id').toBeTruthy();
    expect(new Set(ids).size).toBe(17);
    const all = await page.evaluate(() => [...document.querySelectorAll('[id]')].map((el) => el.id));
    expect(all.length - new Set(all).size, 'ids repeated in the page').toBe(0);
    // The id is on the answer, not on the details: the question stays above it when the link lands
    expect(await page.locator('#faq details[id]').count()).toBe(0);
  });

  test('a link to the id of an answer opens its question: all seventeen, with or without a script', async ({ page }) => {
    await page.goto('/');
    const ids = await page.locator('#faq .luz-faq__answer').evaluateAll((all) => all.map((el) => el.id));
    for (const id of ids) {
      await page.goto(`/#${id}`);
      await expect.poll(() => isOpen(page.locator(`#${id}`).locator('xpath=ancestor::details[1]')), { message: `#${id} opens its question` }).toBe(true);
      await expect(page.locator(`#${id}`)).toBeVisible();
    }
  });

  test('the Arabic and Spanish pages open an answer from its id too', async ({ page }) => {
    for (const route of ['/es/', '/ar/']) {
      await page.goto(`${route}#faq-js`);
      await expect.poll(() => isOpen(page.locator('#faq-js').locator('xpath=ancestor::details[1]')), { message: route }).toBe(true);
    }
  });

  test('a click opens a question and a second closes it, natively', async ({ page }) => {
    await page.goto('/');
    const first = items(page).first();
    await first.locator('summary').click();
    expect(await isOpen(first)).toBe(true);
    await expect(first.locator('.luz-faq__answer')).toBeVisible();
    await first.locator('summary').click();
    expect(await isOpen(first)).toBe(false);
  });
});

test.describe('the FAQ of the home: the layout', () => {
  const geometry = (page) => page.evaluate(() => {
    const box = (selector) => document.querySelector(selector)?.getBoundingClientRect().toJSON();
    const head = document.querySelector('#faq .landing-faq__head');
    return {
      head: box('#faq .landing-faq__head'),
      firstGroup: box('#faq .luz-faq__group'),
      lastGroup: box('#faq .luz-faq__group:last-of-type'),
      position: head ? getComputedStyle(head).position : null,
      columns: getComputedStyle(/** @type {Element} */ (document.querySelector('#faq luz-faq'))).gridTemplateColumns,
      display: getComputedStyle(/** @type {Element} */ (document.querySelector('#faq luz-faq'))).display,
    };
  });

  for (const [route, , dir] of ROUTES) {
    for (const width of [1024, 1280, 1920]) {
      test(`${route} at ${width} px: two columns, the head at the inline start and the questions beside it`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route);
        const g = await geometry(page);
        expect(g.display).toBe('grid');
        expect(g.columns.split(' ').length, 'two columns').toBe(2);
        if (dir === 'ltr') expect(g.head.right, 'the head is beside the questions, before them').toBeLessThanOrEqual(g.firstGroup.left + 1);
        else expect(g.head.left, 'the head is beside the questions, to the right of them').toBeGreaterThanOrEqual(g.firstGroup.right - 1);
        expect(Math.abs(g.head.top - g.firstGroup.top), 'both start at the same height').toBeLessThanOrEqual(2);
        expect(g.firstGroup.width, 'the questions have the wider column').toBeGreaterThan(g.head.width);
      });
    }

    for (const width of [320, 768, 1023]) {
      test(`${route} at ${width} px: one column, the head above the questions`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route);
        const g = await geometry(page);
        expect(g.display).not.toBe('grid');
        expect(g.head.bottom, 'the head is over the first group').toBeLessThanOrEqual(g.firstGroup.top + 1);
        expect(g.position).not.toBe('sticky');
      });
    }
  }

  test('from 1024 px the head is pinned under the header while the questions go by', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    // Open every question so the list is long, then scroll to its last group
    await page.evaluate(() => {
      for (const details of document.querySelectorAll('#faq details')) /** @type {HTMLDetailsElement} */ (details).open = true;
    });
    const g = await geometry(page);
    expect(g.position).toBe('sticky');
    const headHeight = g.head.height;
    await page.evaluate(() => window.scrollTo({ top: document.querySelector('#faq .luz-faq__group:last-of-type').getBoundingClientRect().top + window.scrollY - 200, behavior: 'instant' }));
    const after = await geometry(page);
    expect(after.head.top, 'the head is still in the window').toBeGreaterThanOrEqual(0);
    expect(after.head.bottom, 'the head is still in the window').toBeLessThanOrEqual(800 + 1);
    expect(after.head.height).toBeCloseTo(headHeight, 0);
    // It did not scroll away with the list: it is under the sticky header, near the top
    const header = await page.locator('#site-header').evaluate((el) => el.getBoundingClientRect().bottom);
    expect(after.head.top, 'under the header').toBeGreaterThanOrEqual(header - 1);
    expect(after.head.top, 'near the top').toBeLessThan(300);
  });

  for (const [route] of ROUTES) {
    test(`${route} at 320 px, every question open: nothing scrolls sideways`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await page.goto(route);
      await page.evaluate(() => {
        for (const details of document.querySelectorAll('#faq details')) /** @type {HTMLDetailsElement} */ (details).open = true;
      });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    });
  }
});

test.describe('the FAQ of the home: the language', () => {
  for (const [route, code, dir] of ROUTES) {
    test(`${route}: <luz-faq> says what its questions are written in (${code === 'ar' ? 'English' : code})`, async ({ page }) => {
      const words = CATALOG(code);
      await page.goto(route);
      await expect(page.locator('#faq luz-faq')).toHaveAttribute('lang', words['faq.lang']);
      // The head (the title, the lead, the links, the group titles) is in the language of the page
      await expect(page.locator('#faq .landing-faq__head')).toHaveAttribute('lang', code);
      for (const title of await page.locator('#faq h3.luz-faq__group-title').all()) await expect(title).toHaveAttribute('lang', code);
      await expect(page.locator('html')).toHaveAttribute('dir', dir);
    });
  }

  test('in Arabic the questions and answers are English, and read left to right in the right-to-left page', async ({ page }) => {
    await page.goto('/ar/');
    await expect(page.locator('#faq luz-faq')).toHaveAttribute('lang', 'en');
    for (const item of await items(page).all()) {
      await expect(item).toHaveCSS('direction', 'ltr');
      expect(((await item.locator('summary').textContent()) ?? '').trim(), 'an English question').toMatch(/^[\x20-\x7E]+$/);
    }
    // The head is Arabic and keeps the page's direction
    await expect(page.locator('#faq .landing-faq__head')).toHaveCSS('direction', 'rtl');
    expect(((await page.locator('#faq .luz-faq__lead').textContent()) ?? '')).toMatch(/[؀-ۿ]/);
  });

  test('in English and Spanish the items read in the direction of the page', async ({ page }) => {
    for (const route of ['/', '/es/']) {
      await page.goto(route);
      await expect(items(page).first()).toHaveCSS('direction', 'ltr');
    }
  });
});

test.describe('the FAQ of the home: modes and forced colours', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'the mode is set by a script');

  /** The size layers of the marker of a question: [flat bar, upright bar], each [width, height]. */
  const layers = (page, n) => items(page).nth(n).locator('summary').evaluate((el) => getComputedStyle(el, '::after').backgroundSize.split(/,\s*/).map((l) => l.trim().split(/\s+/)));

  for (const mode of ['light', 'dark', 'high-contrast']) {
    test(`in ${mode} the marker tells open from closed by its shape, and axe finds nothing serious`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto('/');
      await page.evaluate((theme) => { document.documentElement.dataset.theme = theme; }, mode);
      await page.locator('#faq').scrollIntoViewIfNeeded();
      const closed = await layers(page, 0);
      await items(page).nth(0).locator('summary').click();
      await page.mouse.move(0, 0);
      await faded(page);
      await expect.poll(async () => (await layers(page, 0))[1][1]).toBe('0px');
      const opened = await layers(page, 0);
      expect(parseFloat(closed[1][1]), 'closed: the upright bar has a height').toBeGreaterThan(0);
      expect(opened[0], 'open: the flat bar stays').toEqual(closed[0]);
      test.skip(testInfo.project.name === 'chromium-nojs', 'axe needs JavaScript');
      const { violations } = await new AxeBuilder({ page }).include('#faq').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(violations.map((v) => `${v.impact}: ${v.id}`)).toEqual([]);
    });
  }

  test('in forced colours the marker is drawn in the system text colour, and the questions stay readable', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    await page.emulateMedia({ forcedColors: 'active' });
    const state = await items(page).nth(0).locator('summary').evaluate((el) => {
      const probe = document.createElement('span');
      probe.style.color = 'CanvasText';
      document.body.append(probe);
      const text = getComputedStyle(probe).color;
      probe.remove();
      const marker = getComputedStyle(el, '::after');
      return { text, color: marker.color, adjust: marker.forcedColorAdjust, image: marker.backgroundImage, question: getComputedStyle(el).color, background: getComputedStyle(el).backgroundColor };
    });
    expect(state.adjust).toBe('none');
    expect(state.color).toBe(state.text);
    expect(state.image).toContain('linear-gradient');
    expect(state.question, 'the question is not painted in the colour of its background').not.toBe(state.background);
  });
});
