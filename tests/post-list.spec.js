// @ts-check
/**
 * `.luz-post-list` of @luz-ds/catalog (`components/post-list.css`; .claude/plans/component-gaps.md, section 3): the
 * layout of a list of posts. A `<ul>` of `<li><article class="luz-card">`; the post is core's card, the list only sets
 * the rows and columns around it.
 *
 *   base       as many equal columns as fit, none under `--luz-post-list-min` (16rem)
 *   --lead     the first post spans two columns with its picture beside its text, when the list is 40rem wide or
 *              more (the width of the list, not of the window); narrower, it is a card like the rest
 *   --compact  one column, a row for each post: the title, and the facts at its end when there is room
 *
 * tests/fixtures/post-list.html: tokens, core and `post-list.css`, no script; a frame of a set width around each list.
 * Everything is CSS, so it runs in `chromium` and in `chromium-nojs` (playwright.config.js: `'**\/post-list.spec.js'` in
 * the `testMatch` of `chromium-nojs`). Axe needs script and is skipped there.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

import { MODES } from './helpers/design-tokens.js';
import { settled } from './helpers/settle.js';

const FIXTURE = '/tests/fixtures/post-list.html';
const REM = 16;
/** Sub-pixel rounding of a box. */
const EPS = 1.5;

/** @param {import('@playwright/test').Page} page */
async function open(page, width = 1280, { dir = 'ltr' } = {}) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(FIXTURE);
  if (dir !== 'ltr') await page.evaluate((d) => { document.documentElement.dir = d; }, dir);
}

/** The boxes (left, right, top, bottom, width) of the elements a selector finds, in the document. */
const boxes = (page, selector) => page.locator(selector).evaluateAll((els) => els.map((el) => {
  const r = el.getBoundingClientRect();
  return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
}));

/** The box of the first element of a selector inside the n-th item of a list. */
const inItem = async (page, list, n, selector) => (await boxes(page, `#${list} > li:nth-child(${n}) ${selector}`))[0];

/** How many distinct columns the items of a list sit in. */
const columns = async (page, list) => new Set((await boxes(page, `#${list} > li`)).map((b) => Math.round(b.left))).size;

const columnGap = (page, list) => page.locator(`#${list}`).evaluate((el) => parseFloat(getComputedStyle(el).columnGap));
const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe('post list: a list, whatever its layout', () => {
  test('every list is a ul with role="list" and one li for each card, and no li is taken out of the list by its display', async ({ page }) => {
    await open(page);
    const lists = await page.locator('ul.luz-post-list').evaluateAll((els) => els.map((ul) => ({
      id: ul.id,
      role: ul.getAttribute('role'),
      display: getComputedStyle(ul).display,
      kids: [...ul.children].map((li) => ({ tag: li.tagName, display: getComputedStyle(li).display, cards: li.querySelectorAll(':scope > article.luz-card').length })),
    })));
    expect(lists.length, 'the fixture has eight lists').toBe(8);
    for (const list of lists) {
      expect(list.role, `#${list.id} keeps role="list", which Safari drops from a ul with no bullets`).toBe('list');
      expect(list.display, `#${list.id} is rendered, as a box that keeps its semantics`).not.toMatch(/^(contents|none)$/);
      expect(list.kids.length).toBeGreaterThan(0);
      for (const li of list.kids) {
        expect(li.tag).toBe('LI');
        expect(li.cards, `#${list.id}: one card in each li`).toBe(1);
        expect(li.display, `#${list.id}: an li is never display: contents`).not.toMatch(/^(contents|none)$/);
      }
    }
    await expect(page.locator('#base').getByRole('listitem')).toHaveCount(6);
  });

  test('there are no bullets and no indent: the list is laid out by the stylesheet', async ({ page }) => {
    await open(page);
    for (const id of ['base', 'lead-41', 'compact']) {
      const look = await page.locator(`#${id}`).evaluate((el) => {
        const cs = getComputedStyle(el);
        return { type: cs.listStyleType, padding: cs.paddingInlineStart, margin: cs.marginBlockStart };
      });
      expect(look.type, `#${id}`).toBe('none');
      expect(look.padding, `#${id}`).toBe('0px');
      expect(look.margin, `#${id}`).toBe('0px');
    }
  });

  test('each card is as tall as the tallest of its row', async ({ page }) => {
    await open(page);
    const cards = await boxes(page, '#base > li > .luz-card');
    const rows = new Map();
    for (const c of cards) rows.set(Math.round(c.top), [...(rows.get(Math.round(c.top)) ?? []), c.height]);
    expect(rows.size, 'six posts in rows of three').toBe(2);
    for (const heights of rows.values()) {
      expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(EPS);
    }
  });
});

test.describe('post list: the grid', () => {
  test('as many columns as fit, none narrower than 16rem by default', async ({ page }) => {
    await open(page);
    const gap = await columnGap(page, 'base');
    const frame = (await boxes(page, '#frame-base'))[0].width;
    expect(frame).toBe(56 * REM);
    const expected = Math.floor((frame + gap) / (16 * REM + gap));
    expect(expected).toBeGreaterThan(1);
    expect(await columns(page, 'base')).toBe(expected);
    for (const b of await boxes(page, '#base > li')) expect(b.width).toBeGreaterThanOrEqual(16 * REM - EPS);
  });

  test('the columns follow --luz-post-list-min, set on an ancestor', async ({ page }) => {
    await open(page);
    const gap = await columnGap(page, 'min');
    const frame = (await boxes(page, '#frame-min'))[0].width;
    const expected = Math.floor((frame + gap) / (20 * REM + gap));
    expect(expected, 'a larger minimum gives fewer columns than the default').toBeLessThan(await columns(page, 'base'));
    expect(await columns(page, 'min')).toBe(expected);
    for (const b of await boxes(page, '#min > li')) expect(b.width).toBeGreaterThanOrEqual(20 * REM - EPS);
  });

  test('the columns follow --luz-post-list-min, set on the list itself', async ({ page }) => {
    await open(page);
    const gap = await columnGap(page, 'min-own');
    const frame = (await boxes(page, '#frame-min-own'))[0].width;
    const expected = Math.floor((frame + gap) / (24 * REM + gap));
    expect(await columns(page, 'min-own')).toBe(expected);
    for (const b of await boxes(page, '#min-own > li')) expect(b.width).toBeGreaterThanOrEqual(24 * REM - EPS);
  });

  test('in a window narrower than the minimum there is one column and no sideways scroll', async ({ page }) => {
    await open(page, 320);
    expect(await columns(page, 'min-own')).toBe(1);
    expect(await sideways(page)).toBeLessThanOrEqual(0);
  });
});

test.describe('post list: --lead', () => {
  for (const [width, spans] of [[39, false], [40, true], [41, true]]) {
    const id = `lead-${width}`;
    test(`a list ${width}rem wide: the first post ${spans ? 'spans two columns, the picture beside the text' : 'is a card like the rest, the picture above the text'}`, async ({ page }) => {
      await open(page);
      const list = (await boxes(page, `#${id}`))[0];
      expect(list.width).toBeCloseTo(width * REM, 0);
      const first = await inItem(page, id, 1, '');
      const second = await inItem(page, id, 2, '');
      const picture = await inItem(page, id, 1, '.luz-image');
      const title = await inItem(page, id, 1, '.luz-card__title');
      if (spans) {
        expect(first.width, 'the lead takes the whole row').toBeGreaterThanOrEqual(list.width - EPS);
        expect(second.width, 'the next post is one column').toBeLessThan(first.width * 0.6);
        expect(picture.right, 'the picture ends where the text begins').toBeLessThanOrEqual(title.left + EPS);
        expect(Math.min(picture.bottom, title.bottom) - Math.max(picture.top, title.top), 'beside, not above').toBeGreaterThan(0);
      } else {
        expect(first.width, 'the same width as the next post').toBeCloseTo(second.width, 0);
        expect(first.width).toBeLessThan(list.width);
        expect(picture.bottom, 'the picture ends where the text begins').toBeLessThanOrEqual(title.top + EPS);
      }
    });
  }

  test('the title of the lead is larger than the title of the others', async ({ page }) => {
    await open(page);
    const size = (selector) => page.locator(selector).first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(await size('#lead-41 > li:nth-child(1) .luz-card__title')).toBeGreaterThan(await size('#lead-41 > li:nth-child(2) .luz-card__title'));
    expect(await size('#lead-39 > li:nth-child(1) .luz-card__title'), 'under 40rem, the same size').toBe(await size('#lead-39 > li:nth-child(2) .luz-card__title'));
  });

  test('the lead follows the width of the list, not the window', async ({ page }) => {
    await open(page, 1600);
    const narrow = await inItem(page, 'lead-39', 1, '');
    expect(narrow.width, 'a wide window does not widen a narrow list').toBeLessThan(40 * REM);
    expect(narrow.width, 'its lead is a card like the rest').toBeCloseTo((await inItem(page, 'lead-39', 2, '')).width, 0);
    await open(page, 700);
    const wide = await inItem(page, 'lead-41', 1, '');
    expect(wide.width, 'a narrow window does not shrink a list that still fits').toBeGreaterThanOrEqual(40 * REM);
    expect(wide.width, 'its lead spans two columns').toBeGreaterThan((await inItem(page, 'lead-41', 2, '')).width * 1.5);
  });
});

test.describe('post list: --compact', () => {
  test('one column, one row for each post, with no picture', async ({ page }) => {
    await open(page);
    const items = await boxes(page, '#compact > li');
    expect(new Set(items.map((b) => Math.round(b.left))).size, 'one column').toBe(1);
    expect(items.length).toBe(4);
    for (let i = 1; i < items.length; i++) expect(items[i].top, 'in the order of the source').toBeGreaterThanOrEqual(items[i - 1].bottom - EPS);
    await expect(page.locator('#compact img:visible')).toHaveCount(0);
    await expect(page.locator('#compact .luz-image:visible')).toHaveCount(0);
  });

  test('with room, the title and the facts share a row, the facts at the end', async ({ page }) => {
    await open(page);
    for (let n = 1; n <= 4; n++) {
      const title = await inItem(page, 'compact', n, '.luz-card__title');
      const facts = await inItem(page, 'compact', n, '.luz-meta');
      expect(Math.min(title.bottom, facts.bottom) - Math.max(title.top, facts.top), `post ${n}: on one row`).toBeGreaterThan(0);
      expect(facts.left, `post ${n}: the facts after the title`).toBeGreaterThanOrEqual(title.right - EPS);
    }
  });

  test('without room, the facts go below the title', async ({ page }) => {
    await open(page);
    for (let n = 1; n <= 3; n++) {
      const title = await inItem(page, 'compact-narrow', n, '.luz-card__title');
      const facts = await inItem(page, 'compact-narrow', n, '.luz-meta');
      expect(facts.top, `post ${n}: below the title`).toBeGreaterThanOrEqual(title.bottom - EPS);
    }
  });
});

test.describe('post list: small windows', () => {
  test('at 320px no variant scrolls sideways, and no list leaves the window', async ({ page }) => {
    await open(page, 320);
    expect(await sideways(page)).toBeLessThanOrEqual(0);
    for (const id of ['base', 'min', 'lead-41', 'compact', 'compact-narrow']) {
      const list = (await boxes(page, `#${id}`))[0];
      expect(list.left, `#${id}`).toBeGreaterThanOrEqual(-EPS);
      expect(list.right, `#${id}`).toBeLessThanOrEqual(320 + EPS);
    }
  });

  test('at 320px the lead is a card like the rest, one column', async ({ page }) => {
    await open(page, 320);
    expect(await columns(page, 'lead-41')).toBe(1);
    const picture = await inItem(page, 'lead-41', 1, '.luz-image');
    const title = await inItem(page, 'lead-41', 1, '.luz-card__title');
    expect(picture.bottom).toBeLessThanOrEqual(title.top + EPS);
  });
});

test.describe('post list: right to left', () => {
  test('the grid starts at the right', async ({ page }) => {
    await open(page, 1280, { dir: 'rtl' });
    const [one, two] = await boxes(page, '#base > li');
    expect(one.top).toBeCloseTo(two.top, 0);
    expect(one.left, 'the first post is to the right of the second').toBeGreaterThan(two.left);
  });

  test('the lead has its picture on the right and the text on its left', async ({ page }) => {
    await open(page, 1280, { dir: 'rtl' });
    const picture = await inItem(page, 'lead-41', 1, '.luz-image');
    const title = await inItem(page, 'lead-41', 1, '.luz-card__title');
    expect(title.right, 'the text ends where the picture begins').toBeLessThanOrEqual(picture.left + EPS);
  });

  test('the compact facts are at the left end of the row', async ({ page }) => {
    await open(page, 1280, { dir: 'rtl' });
    const title = await inItem(page, 'compact', 1, '.luz-card__title');
    const facts = await inItem(page, 'compact', 1, '.luz-meta');
    expect(facts.right).toBeLessThanOrEqual(title.left + EPS);
  });
});

test.describe('post list: keyboard and assistive technology', () => {
  test('each card is one tab stop, on the link of its title', async ({ page }) => {
    await open(page);
    const stops = await page.locator('ul.luz-post-list > li').evaluateAll((items) => items.map((li) => li.querySelectorAll('a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])').length));
    expect(stops.length).toBeGreaterThan(0);
    expect(stops.every((n) => n === 1), `focusable elements in each li: ${stops.join(',')}`).toBe(true);
  });

  test('Tab visits the cards in the order of the source, picture before text or not', async ({ page }) => {
    await open(page);
    const source = await page.locator('ul.luz-post-list a[href]').evaluateAll((els) => els.map((a) => a.id));
    expect(source.length).toBe(6 + 6 + 6 + 4 * 3 + 4 + 3);
    const visited = [];
    for (let i = 0; i < source.length; i++) {
      await page.keyboard.press('Tab');
      visited.push(await page.evaluate(() => document.activeElement?.id ?? ''));
    }
    expect(visited).toEqual(source);
  });

  test('the focus ring of a card is visible on its title link', async ({ page }) => {
    await open(page);
    await page.locator('#lead-41 a').first().focus();
    const outline = await page.locator('#lead-41 a').first().evaluate((el) => {
      const cs = getComputedStyle(el);
      return { style: cs.outlineStyle, width: parseFloat(cs.outlineWidth), shadow: cs.boxShadow };
    });
    expect(outline.style !== 'none' && outline.width > 0 || outline.shadow !== 'none', 'the focused link is marked').toBe(true);
  });
});

test.describe('post list: axe', () => {
  for (const mode of MODES) {
    test(`axe finds nothing serious in ${mode}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name === 'chromium-nojs', 'axe needs JavaScript');
      await open(page);
      await page.evaluate((m) => { document.documentElement.dataset.theme = m; }, mode);
      await settled(page);
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)).toEqual([]);
    });
  }
});
