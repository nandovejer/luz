// @ts-check
/**
 * The media card (`.luz-card--media`, with `.luz-card__media` and `.luz-card__actions`): an image
 * on top that runs to the border, a body, and actions at the foot that line up across a row of
 * cards whatever the length of their texts (SR-9; .claude/plans/component-gaps.md, section 2).
 *
 * Fixture: tests/fixtures/card-media.html, the built dist of tokens and core, no script. Needs
 * `pnpm core:build` first (dist is git-ignored). Runs in `chromium` and `chromium-nojs`: a card is
 * HTML and CSS, so the layout is the same with JavaScript off (axe and the accessibility tree need
 * the DevTools protocol or a script of their own, and are skipped there where they cannot run).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const FIXTURE = '/tests/fixtures/card-media.html';
const ROW = ['long', 'short', 'middle'];
const TOLERANCE = 1;

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(FIXTURE);
});

/** Box of an element (page coordinates), by selector. */
const box = (page, selector) =>
  page.locator(selector).first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left + window.scrollX, right: r.right + window.scrollX, top: r.top + window.scrollY, bottom: r.bottom + window.scrollY, width: r.width, height: r.height };
  });

/** The pixels of a length written with the tokens (the radius of the card less its 1 px border), resolved by the browser. */
const pixels = (page, property, value) =>
  page.evaluate(([name, css]) => {
    const probe = document.createElement('div');
    probe.style.setProperty(name, css);
    document.body.append(probe);
    const out = parseFloat(getComputedStyle(probe).getPropertyValue(name));
    probe.remove();
    return out;
  }, [property, value]);

const radiusMd = (page) => pixels(page, 'border-top-left-radius', 'var(--luz-radius-md)');
const radiusInner = (page) => pixels(page, 'border-top-left-radius', 'calc(var(--luz-radius-md) - 1px)');

test.describe('media card: a grid of cards with texts of different length', () => {
  test('the cards of a row are as tall as each other, and their actions end at the same line', async ({ page }) => {
    const cards = await Promise.all(ROW.map((id) => box(page, `#${id}`)));
    const actions = await Promise.all(ROW.map((id) => box(page, `#${id} .luz-card__actions`)));
    for (const c of cards) {
      expect(c.top).toBeCloseTo(cards[0].top, 0);
      expect(Math.abs(c.height - cards[0].height)).toBeLessThanOrEqual(TOLERANCE);
    }
    for (const a of actions) {
      expect(Math.abs(a.bottom - actions[0].bottom)).toBeLessThanOrEqual(TOLERANCE);
      expect(Math.abs(a.top - actions[0].top)).toBeLessThanOrEqual(TOLERANCE);
    }
  });

  test('the actions of the card with the least text are pushed to the foot, not left under its body', async ({ page }) => {
    const body = await box(page, '#short .luz-card__body');
    const actions = await box(page, '#short .luz-card__actions');
    const longBody = await box(page, '#long .luz-card__body');
    expect(longBody.height).toBeGreaterThan(body.height + 40);
    expect(actions.top - body.bottom).toBeGreaterThan(40);
  });

  test('the two actions of a card sit side by side when they fit', async ({ page }) => {
    for (const id of ROW) {
      const [first, second] = await Promise.all([box(page, `#${id} .luz-card__actions a:nth-child(1)`), box(page, `#${id} .luz-card__actions a:nth-child(2)`)]);
      expect(Math.abs(first.top - second.top), id).toBeLessThanOrEqual(TOLERANCE);
      expect(first.left, id).toBeLessThan(second.left);
    }
  });
});

test.describe('media card: the image', () => {
  test('is as wide as the inside of the card, 16 / 9 by default, and cropped, not stretched', async ({ page }) => {
    for (const id of ROW) {
      const { inner, image, fit } = await page.locator(`#${id}`).evaluate((card) => {
        const img = card.querySelector('.luz-card__media');
        const r = img.getBoundingClientRect();
        const c = card.getBoundingClientRect();
        return { inner: { width: card.clientWidth, left: c.left + card.clientLeft }, image: { width: r.width, height: r.height, left: r.left }, fit: getComputedStyle(img).objectFit };
      });
      expect(Math.abs(image.width - inner.width), `${id} width`).toBeLessThanOrEqual(TOLERANCE);
      expect(Math.abs(image.left - inner.left), `${id} edge`).toBeLessThanOrEqual(TOLERANCE);
      expect(Math.abs(image.height - (image.width * 9) / 16), `${id} height`).toBeLessThanOrEqual(TOLERANCE);
      expect(fit, `${id} object-fit`).toBe('cover');
    }
  });

  test('--luz-card-ratio on a parent changes the shape of the cards in it', async ({ page }) => {
    const img = await box(page, '#inherits .luz-card__media');
    expect(Math.abs(img.height - (img.width * 3) / 4)).toBeLessThanOrEqual(TOLERANCE);
  });

  test('--luz-card-ratio on the card changes its own shape, and wins over the parent', async ({ page }) => {
    const img = await box(page, '#own .luz-card__media');
    expect(Math.abs(img.height - img.width)).toBeLessThanOrEqual(TOLERANCE);
  });

  test('has its top corners at the card\'s radius less the 1 px border, and square bottom corners', async ({ page }) => {
    const inner = await radiusInner(page);
    expect(inner).toBeGreaterThan(0);
    const radii = await page.locator('#long .luz-card__media').evaluate((img) => {
      const s = getComputedStyle(img);
      return { tl: parseFloat(s.borderTopLeftRadius), tr: parseFloat(s.borderTopRightRadius), bl: parseFloat(s.borderBottomLeftRadius), br: parseFloat(s.borderBottomRightRadius) };
    });
    expect(radii.tl).toBeCloseTo(inner, 1);
    expect(radii.tr).toBeCloseTo(inner, 1);
    expect(radii.bl).toBe(0);
    expect(radii.br).toBe(0);
  });

  test('is not clipped by the card: its overflow is visible, so the focus ring stays whole', async ({ page }) => {
    const radius = await radiusMd(page);
    const card = await page.locator('#long').evaluate((el) => {
      const s = getComputedStyle(el);
      return { x: s.overflowX, y: s.overflowY, radius: parseFloat(s.borderTopLeftRadius) };
    });
    expect(card.x).toBe('visible');
    expect(card.y).toBe('visible');
    expect(card.radius).toBeCloseTo(radius, 1);
  });
});

test.describe('media card: the stretched link', () => {
  /** What is hit at the centre of each part of a card, as a description. */
  const hits = (page, id) =>
    page.locator(`#${id}`).evaluate((card) => {
      card.scrollIntoView({ block: 'center', behavior: 'instant' });
      const at = (el) => {
        const r = el.getBoundingClientRect();
        return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      };
      const describe = (el) => ({ tag: el.tagName, href: el.closest('a')?.getAttribute('href') ?? null, button: el.closest('button') !== null });
      const out = { image: describe(at(card.querySelector('.luz-card__media'))), body: describe(at(card.querySelector('.luz-card__body p'))) };
      card.querySelectorAll('.luz-card__actions a, .luz-card__actions button').forEach((el, i) => {
        const hit = at(el);
        out[`action${i + 1}`] = { itself: hit === el || el.contains(hit) };
      });
      return out;
    });

  test('with a link in the title, a click on the image or on the body follows it', async ({ page }) => {
    for (const [id, href] of [['linked', '#linked-page'], ['linked-actions', '#linked-actions-page']]) {
      const hit = await hits(page, id);
      expect(hit.image.href, `${id} image`).toBe(href);
      expect(hit.body.href, `${id} body`).toBe(href);
    }
  });

  test('with a link in the title, each action is hit itself, above the link', async ({ page }) => {
    const hit = await hits(page, 'linked-actions');
    expect(hit.action1).toEqual({ itself: true });
    expect(hit.action2).toEqual({ itself: true });
  });

  test('without a link in the title there is no overlay: the image and the body are not links', async ({ page }) => {
    for (const id of ROW) {
      const hit = await hits(page, id);
      expect(hit.image.href, `${id} image`).toBeNull();
      expect(hit.body.href, `${id} body`).toBeNull();
      expect(hit.action1, id).toEqual({ itself: true });
      expect(hit.action2, id).toEqual({ itself: true });
      const overlays = await page.locator(`#${id}`).evaluate((card) =>
        [...card.querySelectorAll('*')].filter((el) => {
          const s = getComputedStyle(el, '::after');
          return s.content !== 'none' && s.content !== 'normal' && s.position === 'absolute';
        }).length,
      );
      expect(overlays, `${id} ::after overlays`).toBe(0);
    }
  });
});

test.describe('media card: keyboard and names', () => {
  test('Tab visits the actions in source order, and nothing else', async ({ page }) => {
    await page.locator('#long .luz-card__actions a').first().focus();
    const seen = [await page.evaluate(() => document.activeElement?.getAttribute('href'))];
    for (let i = 0; i < 9; i++) {
      await page.keyboard.press('Tab');
      seen.push(await page.evaluate(() => document.activeElement?.getAttribute('href') ?? document.activeElement?.tagName));
    }
    expect(seen).toEqual([
      '#long-demo', '#long-code', '#short-demo', '#short-code', '#middle-demo', '#middle-code',
      '#linked-page', '#linked-actions-page', '#canyons-map', 'BUTTON',
    ]);
  });

  test('every link and button has its own accessible name, which starts with its visible text', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'needs the DevTools protocol (the accessible name comes from the Chromium accessibility tree)');
    const client = await page.context().newCDPSession(page);
    await client.send('DOM.enable');
    const { root } = await client.send('DOM.getDocument', { depth: 0 });
    const targets = await page.evaluate(() =>
      [...document.querySelectorAll('main a, main button')].map((el, i) => {
        el.setAttribute('data-test-index', String(i));
        return { i, visible: [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim() };
      }),
    );
    const names = [];
    for (const { i, visible } of targets) {
      const { nodeId } = await client.send('DOM.querySelector', { nodeId: root.nodeId, selector: `[data-test-index="${i}"]` });
      const { nodes } = await client.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
      const name = nodes[0].name.value;
      expect(name.startsWith(visible), `"${name}" starts with "${visible}"`).toBe(true);
      names.push(name);
    }
    expect(names).toEqual([
      'Open the demo of Tide table', 'View the code of Tide table',
      'Open the demo of Dune', 'View the code of Dune',
      'Open the demo of Oasis', 'View the code of Oasis',
      'Dunes', 'Canyons', 'Map of Canyons', 'Save Canyons',
    ]);
    expect(new Set(names).size).toBe(names.length);
  });

  test('a focused action shows a ring, and the title link of a linked card rings the card', async ({ page }) => {
    await page.locator('#long .luz-card__actions a').first().focus();
    await page.keyboard.press('Tab');
    const ring = await page.evaluate(() => {
      const s = getComputedStyle(document.activeElement);
      return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
    });
    expect(ring.style).toBe('solid');
    expect(ring.width).toBeGreaterThan(0);
    await page.locator('#linked .luz-card__title a').focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => getComputedStyle(document.activeElement, '::after').outlineStyle)).toBe('solid');
  });
});

test.describe('media card: modes', () => {
  const MODES = [
    { label: 'light', theme: 'light' },
    { label: 'dark', theme: 'dark' },
    { label: 'high contrast', theme: 'high-contrast' },
  ];
  for (const { label, theme } of MODES) {
    test(`has no axe violation in ${label}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name === 'chromium-nojs', 'axe needs JavaScript');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(violations.map((v) => `${v.id} (${v.impact})`)).toEqual([]);
    });
  }

  test('in forced-colors mode the card keeps its edge, the image its size and the focused action its ring', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(FIXTURE);
    const card = await page.locator('#long').evaluate((el) => {
      const s = getComputedStyle(el);
      return { style: s.borderTopStyle, width: parseFloat(s.borderTopWidth) };
    });
    expect(card.style).toBe('solid');
    expect(card.width).toBeGreaterThanOrEqual(1);
    const img = await box(page, '#long .luz-card__media');
    expect(Math.abs(img.height - (img.width * 9) / 16)).toBeLessThanOrEqual(TOLERANCE);
    await page.locator('#long .luz-card__actions a').first().focus();
    await page.keyboard.press('Tab');
    const ring = await page.evaluate(() => {
      const s = getComputedStyle(document.activeElement);
      return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
    });
    expect(ring.style).not.toBe('none');
    expect(ring.width).toBeGreaterThan(0);
  });

  test('in a right-to-left page the cards run from the right, the actions too, and the layout is as tight', async ({ page }) => {
    await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
    const cards = await Promise.all(ROW.map((id) => box(page, `#${id}`)));
    expect(cards[0].left).toBeGreaterThan(cards[1].left);
    expect(cards[1].left).toBeGreaterThan(cards[2].left);
    for (const c of cards) expect(Math.abs(c.height - cards[0].height)).toBeLessThanOrEqual(TOLERANCE);
    const actions = await Promise.all(ROW.map((id) => box(page, `#${id} .luz-card__actions`)));
    for (const a of actions) expect(Math.abs(a.bottom - actions[0].bottom)).toBeLessThanOrEqual(TOLERANCE);
    const [first, second] = await Promise.all([box(page, '#long .luz-card__actions a:nth-child(1)'), box(page, '#long .luz-card__actions a:nth-child(2)')]);
    expect(first.left).toBeGreaterThan(second.left);
    const inner = await radiusInner(page);
    const radii = await page.locator('#long .luz-card__media').evaluate((img) => {
      const s = getComputedStyle(img);
      return { tl: parseFloat(s.borderTopLeftRadius), tr: parseFloat(s.borderTopRightRadius), bl: parseFloat(s.borderBottomLeftRadius), br: parseFloat(s.borderBottomRightRadius) };
    });
    expect(radii.tl).toBeCloseTo(inner, 1);
    expect(radii.tr).toBeCloseTo(inner, 1);
    expect(radii.bl).toBe(0);
    expect(radii.br).toBe(0);
    const image = await page.locator('#long').evaluate((card) => ({ inner: card.clientWidth, image: card.querySelector('.luz-card__media').getBoundingClientRect().width }));
    expect(Math.abs(image.image - image.inner)).toBeLessThanOrEqual(TOLERANCE);
  });
});
