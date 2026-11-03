// @ts-check
/**
 * Core's .luz-meta (components/meta.css): a line of facts with a dot drawn by
 * CSS between them. The page is tests/fixtures/prose.html (a byline above
 * the post, and a meta line in each card of a list), served at /__meta__.
 * Checks that the dots are drawn between the facts and are not in the
 * accessibility tree, that no wrapped line starts with a dot, in both
 * directions, that a link's focus ring is not clipped, that a card's title
 * link still covers the card, and axe in the three modes. CSS only: runs in
 * `chromium` and `chromium-nojs`.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { settled } from './helpers/settle.js';

const FIXTURE = readFileSync(new URL('./fixtures/prose.html', import.meta.url), 'utf-8');

async function open(p, width, { lang = 'en', dir = 'ltr' } = {}) {
  const body = FIXTURE.replace('<html lang="en">', `<html lang="${lang}" dir="${dir}">`);
  await p.route('**/__meta__', (route) => route.fulfill({ contentType: 'text/html', body }));
  await p.setViewportSize({ width, height: 900 });
  await p.goto('/__meta__');
  await p.waitForLoadState('load');
}

/** Add a rule to the page. addStyleTag needs script, and this test also runs without it. */
const style = (p, css) => p.evaluate((text) => document.head.append(Object.assign(document.createElement('style'), { textContent: text })), css);

const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/**
 * For each fact of #meta: the line it is on, whether it starts that line,
 * and where its dot would be drawn relative to the clip of the line (the
 * dot is centred in the gap before the fact; negative = outside the clip).
 */
const facts = (p) => p.evaluate(() => {
  const meta = document.getElementById('meta');
  const rtl = getComputedStyle(meta).direction === 'rtl';
  const box = meta.getBoundingClientRect();
  const gap = parseFloat(getComputedStyle(meta).columnGap);
  const items = [...meta.children].map((el) => el.getBoundingClientRect());
  const tops = [...new Set(items.map((r) => Math.round(r.top)))];
  return items.map((r, i) => {
    const start = rtl ? box.right - r.right : r.left - box.left; // from the clip edge, inward
    return { i, line: tops.indexOf(Math.round(r.top)), startsLine: i === 0 || Math.round(items[i - 1].top) !== Math.round(r.top), dotCentre: start - gap / 2 };
  });
});

test.describe('meta line', () => {
  for (const theme of ['light', 'dark', 'high-contrast']) {
    test(`axe finds nothing serious in ${theme}`, async ({ page: p }, testInfo) => {
      test.skip(testInfo.project.name === 'chromium-nojs', 'axe needs JavaScript');
      await open(p, 1280);
      await p.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
      await settled(p); // axe must not sample a colour mid-transition (Firefox)
      const { violations } = await new AxeBuilder({ page: p }).include('#meta').include('#cards').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)).toEqual([]);
    });
  }

  test('a dot before every fact but the first, which screen readers do not get', async ({ page: p }) => {
    await open(p, 1280);
    const dots = await p.locator('#meta > *').evaluateAll((els) => els.map((el) => getComputedStyle(el, '::before').content));
    expect(dots[0]).toBe('none');
    for (const d of dots.slice(1)) expect(d).toContain('·');
    // The facts are in the accessibility tree, the dots are not
    const tree = await p.locator('#meta').ariaSnapshot();
    expect(tree).toContain('12 October 2026');
    expect(tree).not.toContain('·');
  });

  test('on one line, the facts are a gap apart, with the dot in the middle of it', async ({ page: p }) => {
    await open(p, 1280);
    const all = await facts(p);
    expect(new Set(all.map((f) => f.line)).size).toBe(1);
    const gap = await p.locator('#meta').evaluate((el) => parseFloat(getComputedStyle(el).columnGap));
    const [a, b] = await p.evaluate(() => ['m-author', 'm-date'].map((id) => document.getElementById(id).getBoundingClientRect()));
    expect(b.left - a.right).toBeCloseTo(gap, 0);
  });

  for (const [dir, lang] of [['ltr', 'en'], ['rtl', 'ar']]) {
    test(`wrapped (${dir}): no line starts with a dot, and nothing scrolls sideways`, async ({ page: p }) => {
      await open(p, 320, { lang, dir });
      await style(p, '#meta { max-inline-size: 12rem }');
      const all = await facts(p);
      expect(new Set(all.map((f) => f.line)).size).toBeGreaterThan(1);
      expect(await p.locator('#meta').evaluate((el) => getComputedStyle(el).overflowX)).toBe('clip');
      for (const f of all.filter((x) => x.startsLine && x.i > 0)) {
        // The dot of a fact that starts a line is outside the clip
        expect(f.dotCentre, `fact ${f.i}`).toBeLessThan(0);
      }
      for (const f of all.filter((x) => !x.startsLine)) expect(f.dotCentre, `fact ${f.i}`).toBeGreaterThan(0);
      expect(await sideways(p)).toBeLessThanOrEqual(0);
    });
  }

  test('with 200 % text at 320 px it wraps and nothing scrolls sideways', async ({ page: p }) => {
    await open(p, 320);
    await style(p, 'html { font-size: 200% }');
    expect(new Set((await facts(p)).map((f) => f.line)).size).toBeGreaterThan(1);
    expect(await sideways(p)).toBeLessThanOrEqual(0);
  });

  test('the text lines up with the text above it, and a link has room for its focus ring inside the clip', async ({ page: p }) => {
    await open(p, 1280);
    await p.keyboard.press('Tab');
    await expect(p.locator('#m-link')).toBeFocused();
    const geo = await p.evaluate(() => {
      const r = (id) => document.getElementById(id).getBoundingClientRect();
      const ring = getComputedStyle(document.getElementById('m-link'));
      return { meta: r('meta').left, first: r('m-author').left, link: r('m-link').left, heading: document.querySelector('h1').getBoundingClientRect().left, ring: parseFloat(ring.outlineOffset) + parseFloat(ring.outlineWidth) };
    });
    expect(geo.ring).toBeGreaterThan(0);
    expect(Math.abs(geo.first - geo.heading)).toBeLessThanOrEqual(1);
    expect(geo.link - geo.ring).toBeGreaterThanOrEqual(geo.meta - 0.5);
  });

  test('in a card, the title link still covers the meta line', async ({ page: p }) => {
    await open(p, 1280);
    const hit = await p.evaluate(() => {
      const meta = document.getElementById('card-meta');
      meta.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = meta.getBoundingClientRect();
      return document.elementFromPoint(r.left + r.width / 4, r.top + r.height / 2)?.id;
    });
    expect(hit).toBe('card-link');
  });
});

/* ---- .luz-meta--facts: labelled facts in a hero (tests/fixtures/meta-facts.html) ------------------------------- */

const FACTS = '/tests/fixtures/meta-facts.html';

async function openFacts(p, width, { lang = 'en', dir = 'ltr' } = {}) {
  await p.setViewportSize({ width, height: 900 });
  await p.goto(FACTS);
  await p.waitForLoadState('load');
  if (dir === 'rtl') await p.evaluate((l) => { document.documentElement.dir = 'rtl'; document.documentElement.lang = l; }, lang);
}

/** What a token resolves to as a colour, read in the page. */
const colorOf = (p, token) =>
  p.evaluate((name) => {
    const probe = document.createElement('div');
    probe.style.cssText = `color:var(${name})`;
    document.body.append(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    return resolved;
  }, token);

const computed = (p, selector, property) => p.locator(selector).evaluate((el, name) => getComputedStyle(el)[name], property);
const rect = (p, selector) => p.locator(selector).evaluate((el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; });

test.describe('meta line, facts variant', () => {
  for (const theme of ['light', 'dark', 'high-contrast']) {
    test(`axe finds nothing serious in ${theme}`, async ({ page: p }, testInfo) => {
      test.skip(testInfo.project.name === 'chromium-nojs', 'axe needs JavaScript');
      await openFacts(p, 1280);
      await p.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
      await settled(p);
      const { violations } = await new AxeBuilder({ page: p }).include('#facts').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)).toEqual([]);
    });
  }

  test('the label is secondary text at regular weight, the value primary text at semibold', async ({ page: p }) => {
    await openFacts(p, 1280);
    const secondary = await colorOf(p, '--luz-text-secondary');
    const primary = await colorOf(p, '--luz-text-primary');
    expect(secondary).not.toBe(primary);
    for (const id of ['t-location', 't-date', 't-price']) {
      expect(await computed(p, `#${id}`, 'color'), `${id} colour`).toBe(secondary);
      expect(await computed(p, `#${id}`, 'fontWeight'), `${id} weight`).toBe('400');
    }
    for (const id of ['d-location', 'd-date', 'd-price']) {
      expect(await computed(p, `#${id}`, 'color'), `${id} colour`).toBe(primary);
      expect(await computed(p, `#${id}`, 'fontWeight'), `${id} weight`).toBe('600');
    }
  });

  test('no dot is drawn between the facts, where the ordinary line has them', async ({ page: p }) => {
    await openFacts(p, 1280);
    const dots = await p.locator('#facts > *').evaluateAll((els) => els.map((el) => getComputedStyle(el, '::before').content));
    expect(dots).toHaveLength(3);
    for (const content of dots) expect(content).toBe('none');
    // The control: the ordinary meta line draws its dots from the second fact
    const plain = await p.locator('#plain > *').evaluateAll((els) => els.map((el) => getComputedStyle(el, '::before').content));
    expect(plain.slice(1).every((c) => c.includes('·'))).toBe(true);
    expect(await p.locator('#facts').ariaSnapshot()).not.toContain('·');
  });

  test('each pair is the label above its value, both starting at the same edge', async ({ page: p }) => {
    await openFacts(p, 1280);
    for (const id of ['location', 'date', 'price']) {
      const [t, d] = [await rect(p, `#t-${id}`), await rect(p, `#d-${id}`)];
      expect(d.top, `${id}: the value is under the label`).toBeGreaterThanOrEqual(t.bottom - 1);
      expect(Math.abs(d.left - t.left), `${id}: same start edge (no indent on the value)`).toBeLessThanOrEqual(1);
    }
  });

  test('the pairs are side by side on one line, level at the top, with a gap between them', async ({ page: p }) => {
    await openFacts(p, 1280);
    const boxes = [];
    for (const id of ['location', 'date', 'price']) boxes.push(await rect(p, `#f-${id}`));
    expect(new Set(boxes.map((b) => Math.round(b.top))).size, 'one line').toBe(1);
    const gap = await computed(p, '#facts', 'columnGap');
    expect(parseFloat(gap)).toBeGreaterThan(0);
    expect(boxes[1].left - boxes[0].right).toBeCloseTo(parseFloat(gap), 0);
  });

  test('a date inside a value reads as the value: the bare <time> does not make it smaller or paler', async ({ page: p }) => {
    await openFacts(p, 1280);
    // The control: outside the variant a bare <time> is not the text around it (that is why the variant has to undo it)
    const loose = { size: await computed(p, '#loose-time', 'fontSize'), color: await computed(p, '#loose-time', 'color') };
    const inValue = { size: await computed(p, '#f-time', 'fontSize'), color: await computed(p, '#f-time', 'color') };
    expect(inValue.size).toBe(await computed(p, '#d-date', 'fontSize'));
    expect(inValue.color).toBe(await computed(p, '#d-date', 'color'));
    expect(inValue.color).toBe(await colorOf(p, '--luz-text-primary'));
    expect(await computed(p, '#f-time', 'fontWeight')).toBe('600');
    expect(loose.size === inValue.size && loose.color === inValue.color, 'the bare time differs from the one in a value').toBe(false);
  });

  for (const [dir, lang] of [['ltr', 'en'], ['rtl', 'ar']]) {
    test(`wrapped (${dir}): a pair that does not fit moves to the next line whole, and nothing is cut or scrolls sideways`, async ({ page: p }) => {
      await openFacts(p, 320, { lang, dir });
      await style(p, '#facts { max-inline-size: 12rem }');
      const dl = await rect(p, '#facts');
      const boxes = [];
      for (const id of ['location', 'date', 'price']) boxes.push(await rect(p, `#f-${id}`));
      expect(new Set(boxes.map((b) => Math.round(b.top))).size, 'more than one line').toBeGreaterThan(1);
      for (const [i, b] of boxes.entries()) {
        expect(b.left, `pair ${i} inside at the left`).toBeGreaterThanOrEqual(dl.left - 1);
        expect(b.right, `pair ${i} inside at the right`).toBeLessThanOrEqual(dl.right + 1);
      }
      // The label and its value stay together: the value is under its label in the same pair
      for (const id of ['location', 'date', 'price']) {
        const [f, t, d] = [await rect(p, `#f-${id}`), await rect(p, `#t-${id}`), await rect(p, `#d-${id}`)];
        expect(t.top).toBeGreaterThanOrEqual(f.top - 1);
        expect(d.bottom).toBeLessThanOrEqual(f.bottom + 1);
      }
      expect(await sideways(p)).toBeLessThanOrEqual(0);
    });
  }

  test('in right-to-left the first pair is at the right, and a label and its value start at the right edge', async ({ page: p }) => {
    await openFacts(p, 1280, { lang: 'ar', dir: 'rtl' });
    const [first, last] = [await rect(p, '#f-location'), await rect(p, '#f-price')];
    expect(first.right).toBeGreaterThan(last.right);
    for (const id of ['location', 'date', 'price']) {
      const [t, d] = [await rect(p, `#t-${id}`), await rect(p, `#d-${id}`)];
      expect(Math.abs(d.right - t.right), `${id}: same start edge`).toBeLessThanOrEqual(1);
    }
  });

  test('with 200 % text at 320 px it wraps and nothing scrolls sideways', async ({ page: p }) => {
    await openFacts(p, 320);
    await style(p, 'html { font-size: 200% }');
    const boxes = [];
    for (const id of ['location', 'date', 'price']) boxes.push(await rect(p, `#f-${id}`));
    expect(new Set(boxes.map((b) => Math.round(b.top))).size).toBeGreaterThan(1);
    expect(await sideways(p)).toBeLessThanOrEqual(0);
  });
});
