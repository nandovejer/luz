// @ts-check
/**
 * The frequently asked questions of @luz-ds/catalog (<luz-faq>, a CSS-only
 * tag: no script defines it, so the page links components/faq.css and nothing
 * else). A list of native `details`, one question each, whose answer is a
 * `div.luz-faq__answer` with an id: the answer is in the served HTML, opens
 * with the keyboard and without JavaScript, and a link to its id opens it.
 * On tests/fixtures/catalog-faq.html. Runs in `chromium` and `chromium-nojs`
 * (the second needs this file in its `testMatch`, like the other CSS-only
 * tags). The manifests are in tests/faq.test.js.
 *
 * The look is read as computed style (the box of the item, the size and
 * family of the question, the marker's two bars and what folds when open),
 * with the values of the tokens resolved in the page, never typed here.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { settled } from './helpers/settle.js';

const FIXTURE = '/tests/fixtures/catalog-faq.html';

async function open(page, width = 1280) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(FIXTURE);
}

/** A property of a probe element given `declaration`, as the browser computes it. */
const resolve = (page, declaration, property) => page.evaluate(([decl, prop]) => {
  const probe = Object.assign(document.createElement('div'), { style: decl });
  document.body.append(probe);
  const value = getComputedStyle(probe)[prop];
  probe.remove();
  return value;
}, [declaration, property]);

const resolved = {
  colour: (page, token) => resolve(page, `color: var(${token})`, 'color'),
  length: async (page, token) => parseFloat(await resolve(page, `height: var(${token})`, 'height')),
  family: (page, token) => resolve(page, `font-family: var(${token})`, 'fontFamily'),
};

/** The `n`th item (0-based) and its parts. */
const item = (page, n) => page.locator('.luz-faq__item').nth(n);
const summary = (page, n) => item(page, n).locator('summary.luz-faq__question');
const isOpen = (page, n) => item(page, n).evaluate((el) => /** @type {HTMLDetailsElement} */ (el).open);

const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** The `::after` marker of a summary: its content, display, size layers and what is painted. */
const marker = (page, n) => summary(page, n).evaluate((el) => {
  const s = getComputedStyle(el, '::after');
  const layers = s.backgroundSize.split(/,\s*/).map((l) => l.trim().split(/\s+/));
  return {
    content: s.content,
    display: s.display,
    image: s.backgroundImage,
    layers,
    forcedColorAdjust: s.forcedColorAdjust,
    color: s.color,
    transitionProperty: s.transitionProperty,
    transitionDuration: s.transitionDuration,
  };
});

test.describe('catalog faq', () => {
  test.describe('the item', () => {
    test('has none of the box of a loose details: no radius, no background, no padding', async ({ page }) => {
      await open(page);
      const box = await item(page, 0).evaluate((el) => {
        const s = getComputedStyle(el);
        const transparent = s.backgroundColor === 'rgba(0, 0, 0, 0)' || s.backgroundColor === 'transparent';
        return {
          radius: [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius],
          transparent,
          image: s.backgroundImage,
          padding: [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft],
        };
      });
      expect(box.radius).toEqual(['0px', '0px', '0px', '0px']);
      expect(box.transparent, 'no background colour').toBe(true);
      expect(box.image).toBe('none');
      expect(box.padding).toEqual(['0px', '0px', '0px', '0px']);
    });

    test('has a 1px divider under each item, and one over the first of its list only', async ({ page }) => {
      await open(page);
      const divider = await resolved.colour(page, '--luz-divider');
      const lines = await page.locator('.luz-faq__item').evaluateAll((els) => els.map((el) => {
        const s = getComputedStyle(el);
        return {
          first: !el.previousElementSibling?.classList.contains('luz-faq__item'),
          under: [s.borderBottomWidth, s.borderBottomStyle, s.borderBottomColor],
          over: s.borderTopWidth,
          overStyle: s.borderTopStyle,
          overColor: s.borderTopColor,
          side: [s.borderLeftWidth, s.borderRightWidth],
        };
      }));
      expect(lines.length).toBe(5);
      expect(lines.filter((l) => l.first).length, 'two lists, two firsts').toBe(2);
      for (const l of lines) {
        expect(l.under, 'under every item').toEqual(['1px', 'solid', divider]);
        expect(l.side, 'no line at the sides').toEqual(['0px', '0px']);
        if (l.first) expect([l.over, l.overStyle, l.overColor], 'over the first').toEqual(['1px', 'solid', divider]);
        else expect(l.over, 'not over the others').toBe('0px');
      }
    });
  });

  test.describe('the question', () => {
    test('is the whole summary, at least a large control high, with no native marker', async ({ page }) => {
      await open(page);
      const min = await resolved.length(page, '--luz-control-lg');
      expect(min).toBeGreaterThan(0);
      const q = await summary(page, 0).evaluate((el) => {
        const r = el.getBoundingClientRect();
        const host = el.parentElement.getBoundingClientRect();
        const s = getComputedStyle(el);
        return {
          height: r.height,
          widthShare: r.width / host.width,
          listStyle: s.listStyleType,
          display: s.display,
        };
      });
      expect(q.height).toBeGreaterThanOrEqual(min);
      expect(q.widthShare, 'the summary fills the item').toBeGreaterThan(0.99);
      expect(q.listStyle).toBe('none');
      expect(q.display, 'not a list item: the native triangle is a list marker').not.toBe('list-item');
    });

    test('a click at the far end of the row toggles it', async ({ page }) => {
      await open(page);
      const { width, height } = await summary(page, 1).evaluate((el) => el.getBoundingClientRect());
      await summary(page, 1).click({ position: { x: width - 6, y: height / 2 } });
      expect(await isOpen(page, 1)).toBe(true);
      await summary(page, 1).click({ position: { x: width - 6, y: height / 2 } });
      expect(await isOpen(page, 1)).toBe(false);
    });

    test('is set in the body face, bold, at the size of its answer, and its text can be selected', async ({ page }) => {
      await open(page);
      const body = await resolved.family(page, '--luz-font-body');
      const lg = await resolved.length(page, '--luz-text-lg');
      await summary(page, 0).click();
      const q = await summary(page, 0).evaluate((el) => {
        const s = getComputedStyle(el);
        return { family: s.fontFamily, weight: s.fontWeight, size: parseFloat(s.fontSize), select: s.userSelect, answer: parseFloat(getComputedStyle(el.parentElement.querySelector('.luz-faq__answer')).fontSize) };
      });
      expect(q.family).toBe(body);
      expect(q.weight).toBe('600');
      expect(q.size, 'the size of --luz-text-lg').toBe(lg);
      expect(q.size, 'the size of its answer').toBe(q.answer);
      expect(q.select).toBe('text');
    });

    test('hover takes the colour of the open question, with no underline and no surface', async ({ page }) => {
      await open(page);
      const read = () => summary(page, 0).evaluate((el) => ({ color: getComputedStyle(el).color, line: getComputedStyle(el).textDecorationLine, background: getComputedStyle(el).backgroundColor }));
      const brand = await resolved.colour(page, '--luz-brand-primary');
      const text = await resolved.colour(page, '--luz-text-primary');
      const before = await read();
      expect(before.line).toBe('none');
      expect(before.color).toBe(text);
      await summary(page, 0).hover();
      await expect.poll(async () => (await read()).color).toBe(brand);
      const after = await read();
      expect(after.line, 'no underline').toBe('none');
      expect(after.background === 'rgba(0, 0, 0, 0)' || after.background === 'transparent', `no surface behind it: ${after.background}`).toBe(true);
    });
  });

  test.describe('the marker', () => {
    test('is a plus of two bars when closed', async ({ page }) => {
      await open(page);
      const m = await marker(page, 0);
      expect(m.content).toBe('""');
      expect(m.display).not.toBe('none');
      expect(m.image.match(/linear-gradient/g)?.length, 'two bars').toBe(2);
      expect(m.layers.length).toBe(2);
      // the second layer is the upright bar: it has a height
      expect(parseFloat(m.layers[1][1])).toBeGreaterThan(0);
    });

    test('is a minus when open: the upright bar folds to no height, the other stays', async ({ page }) => {
      await open(page);
      const closed = await marker(page, 0);
      await summary(page, 0).click();
      await page.mouse.move(0, 0);
      await expect.poll(async () => parseFloat((await marker(page, 0)).layers[1][1])).toBe(0);
      const opened = await marker(page, 0);
      expect(opened.layers[0], 'the flat bar keeps its size').toEqual(closed.layers[0]);
      expect(opened.layers.length).toBe(2);
    });

    test('the open question takes the brand colour, the closed one the text colour', async ({ page }) => {
      await open(page);
      const brand = await resolved.colour(page, '--luz-brand-primary');
      const text = await resolved.colour(page, '--luz-text-primary');
      expect(brand).not.toBe(text);
      const colourOf = () => summary(page, 0).evaluate((el) => getComputedStyle(el).color);
      expect(await colourOf()).toBe(text);
      await summary(page, 0).click();
      await page.mouse.move(0, 0);
      await expect.poll(colourOf).toBe(brand);
      await summary(page, 0).click();
      await page.mouse.move(0, 0);
      await expect.poll(colourOf).toBe(text);
    });
  });

  test.describe('the keyboard', () => {
    test('Tab reaches each question, Enter and Space toggle it, and the focus ring is drawn', async ({ page }) => {
      await open(page);
      // the last link of the row of groups, then the keyboard goes on to the questions
      await page.locator('.luz-faq__nav a').last().focus();
      const focused = () => page.evaluate(() => {
        const el = document.activeElement;
        return el?.matches('summary.luz-faq__question') ? [...document.querySelectorAll('summary.luz-faq__question')].indexOf(el) : -1;
      });
      for (let n = 0; n < 5; n++) {
        await page.keyboard.press('Tab');
        expect(await focused(), `Tab ${n + 1} reaches question ${n + 1}`).toBe(n);
        if (n === 0) {
          const ring = await summary(page, 0).evaluate((el) => {
            const s = getComputedStyle(el);
            return { style: s.outlineStyle, width: parseFloat(s.outlineWidth), color: s.outlineColor };
          });
          expect(ring.style).not.toBe('none');
          expect(ring.width).toBeGreaterThan(0);
          expect(ring.color).not.toBe('rgba(0, 0, 0, 0)');
        }
      }
      await page.locator('.luz-faq__nav a').last().focus();
      await page.keyboard.press('Tab');
      expect(await isOpen(page, 0)).toBe(false);
      await page.keyboard.press('Enter');
      expect(await isOpen(page, 0), 'Enter opens').toBe(true);
      await page.keyboard.press('Enter');
      expect(await isOpen(page, 0), 'Enter closes').toBe(false);
      await page.keyboard.press('Space');
      expect(await isOpen(page, 0), 'Space opens').toBe(true);
      await page.keyboard.press('Space');
      expect(await isOpen(page, 0), 'Space closes').toBe(false);
    });
  });

  test.describe('the answers and the links to them', () => {
    test('every answer is in the served HTML, closed, and a click on its question opens it', async ({ page }) => {
      await open(page);
      const answers = await page.locator('.luz-faq__item').evaluateAll((els) => els.map((el) => ({
        text: el.querySelector('.luz-faq__answer')?.textContent.trim().length > 0,
        id: !!el.querySelector('.luz-faq__answer')?.id,
        open: /** @type {HTMLDetailsElement} */ (el).open,
      })));
      expect(answers.length).toBe(5);
      expect(answers.every((a) => a.text && a.id)).toBe(true);
      expect(answers.some((a) => a.open)).toBe(false);
      await expect(page.locator('#answer-delivery')).toBeHidden();
      await summary(page, 0).click();
      expect(await isOpen(page, 0)).toBe(true);
      await expect(page.locator('#answer-delivery')).toBeVisible();
    });

    test('opening the page on the id of an answer opens its closed details', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(`${FIXTURE}#answer-book`);
      await expect.poll(() => isOpen(page, 3)).toBe(true);
      await expect(page.locator('#answer-book')).toBeVisible();
      expect(await isOpen(page, 0), 'the others stay closed').toBe(false);
    });

    test('a link to the id of an answer opens its closed details and shows the answer', async ({ page }) => {
      await open(page);
      await summary(page, 0).click();
      expect(await isOpen(page, 1)).toBe(false);
      await page.locator('a[href="#answer-returns"]').click();
      await expect.poll(() => isOpen(page, 1)).toBe(true);
      await expect(page.locator('#answer-returns')).toBeVisible();
      const inView = await page.locator('#answer-returns').evaluate((el) => {
        const r = el.getBoundingClientRect();
        return r.top >= 0 && r.bottom <= window.innerHeight;
      });
      expect(inView, 'the answer is in the window').toBe(true);
    });
  });

  test.describe('the links to the groups', () => {
    test('each one points at a group title that exists, and the section is named by it', async ({ page }) => {
      await open(page);
      const links = await page.locator('.luz-faq__nav a').evaluateAll((as) => as.map((a) => {
        const id = decodeURIComponent(new URL(a.href).hash.slice(1));
        const target = document.getElementById(id);
        return {
          id,
          isTitle: !!target?.classList.contains('luz-faq__group-title'),
          heading: target?.matches('h2, h3, h4, h5, h6'),
          named: target?.closest('.luz-faq__group')?.getAttribute('aria-labelledby') === id,
        };
      }));
      expect(links.length).toBe(2);
      for (const l of links) expect(l, l.id).toEqual({ id: l.id, isTitle: true, heading: true, named: true });
    });

    test('a click brings the group title into the window', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 300 });
      await page.goto(FIXTURE);
      await page.locator('.luz-faq__nav a[href="#group-visits"]').click();
      await expect.poll(() => page.evaluate(() => new URL(location.href).hash)).toBe('#group-visits');
      await expect(page.locator('#group-visits')).toBeInViewport();
    });
  });

  test.describe('colour modes and the system settings', () => {
    for (const theme of ['light', 'dark', 'high-contrast']) {
      test(`axe finds nothing serious in ${theme}, with a question open`, async ({ page }, testInfo) => {
        test.skip(testInfo.project.name === 'chromium-nojs', 'axe needs JavaScript');
        await open(page);
        await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
        await summary(page, 0).click();
        await page.mouse.move(0, 0);
        await settled(page);
        const { violations } = await new AxeBuilder({ page }).include('luz-faq').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
        expect(violations.map((v) => `${v.impact}: ${v.id}`)).toEqual([]);
      });
    }

    test('forced colours: the marker keeps its own bars in the system text colour', async ({ page }) => {
      await open(page);
      await page.emulateMedia({ forcedColors: 'active' });
      const text = await resolve(page, 'color: CanvasText', 'color');
      const m = await marker(page, 0);
      expect(m.forcedColorAdjust).toBe('none');
      expect(m.color).toBe(text);
      expect(m.image).toContain('linear-gradient');
    });

    test('reduced motion: the marker does not transition, and with motion welcome it does', async ({ page }) => {
      await open(page);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      const welcome = await marker(page, 0);
      expect(welcome.transitionProperty, 'with motion, the bars fold').toContain('background-size');
      expect(Math.max(...welcome.transitionDuration.split(/,\s*/).map(parseFloat))).toBeGreaterThan(0);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const reduced = await marker(page, 0);
      const durations = reduced.transitionDuration.split(/,\s*/).map(parseFloat);
      expect(reduced.transitionProperty === 'none' || durations.every((d) => d === 0), `reduced: ${reduced.transitionProperty} ${reduced.transitionDuration}`).toBe(true);
    });
  });

  test.describe('the sizes', () => {
    test('at 320 px wide the page does not scroll sideways, with a long word and a pre in an open answer', async ({ page }) => {
      await open(page, 320);
      await summary(page, 4).click();
      await expect(page.locator('#answer-long')).toBeVisible();
      expect(await sideways(page)).toBeLessThanOrEqual(0);
      const pre = await page.locator('#answer-long pre').evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { right: r.right, overflowX: getComputedStyle(el).overflowX, scrolls: el.scrollWidth > el.clientWidth };
      });
      expect(pre.right).toBeLessThanOrEqual(320);
      expect(pre.overflowX).toMatch(/auto|scroll/);
      expect(pre.scrolls, 'the code scrolls inside its own box').toBe(true);
    });
  });

  test.describe('print', () => {
    test('shows the closed answers and hides the marker', async ({ page }) => {
      await open(page);
      const screenMarker = await marker(page, 0);
      expect(screenMarker.content, 'a marker on screen').toBe('""');
      expect(screenMarker.display).not.toBe('none');
      await expect(page.locator('#answer-delivery')).toBeHidden();
      await page.emulateMedia({ media: 'print' });
      expect(await isOpen(page, 0), 'still closed in the DOM').toBe(false);
      const heights = await page.locator('.luz-faq__answer').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
      expect(heights.length).toBe(5);
      for (const h of heights) expect(h, 'every answer takes room on paper').toBeGreaterThan(0);
      expect((await marker(page, 0)).display).toBe('none');
    });
  });
});

test.describe('catalog faq without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the answers are in the page and a click on a question opens it, natively', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(FIXTURE);
    expect(await page.locator('.luz-faq__answer').count()).toBe(5);
    await expect(page.locator('#answer-delivery')).toBeHidden();
    await summary(page, 0).click();
    expect(await isOpen(page, 0)).toBe(true);
    await expect(page.locator('#answer-delivery')).toBeVisible();
    await summary(page, 0).click();
    expect(await isOpen(page, 0)).toBe(false);
  });

  test('the look is the same: the open question is brand-coloured and the marker folds', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(FIXTURE);
    await summary(page, 1).click();
    const brand = await resolved.colour(page, '--luz-brand-primary');
    await expect.poll(() => summary(page, 1).evaluate((el) => getComputedStyle(el).color)).toBe(brand);
    await expect.poll(async () => parseFloat((await marker(page, 1)).layers[1][1])).toBe(0);
  });
});
