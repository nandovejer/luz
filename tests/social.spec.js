// @ts-check
/**
 * `.luz-social` of @luz-ds/catalog (`components/social.css`; .claude/plans/component-gaps.md, section 5): the links to
 * the profiles and feeds of a site. `ul.luz-social > li > a > svg[aria-hidden] + span`: an icon (any decorative inline
 * svg of the 24 grid) and the name of the place, in a row that wraps.
 *
 *   base       links at least `--luz-control-sm` tall, `--luz-text-secondary`, `--luz-text-primary` and underlined on hover
 *   --icons    the span is `u-sr-only` (it is still the name of the link) and the link is a `--luz-control-md` square
 *              (WCAG 2.5.8 asks 24px), with `--luz-surface-hover` behind it on hover
 *
 * tests/fixtures/social.html: tokens, core and `social.css`, no script. Everything is CSS, so it runs in `chromium` and in
 * `chromium-nojs` (playwright.config.js: `'**\/social.spec.js'` in the `testMatch` of `chromium-nojs`). Axe needs script
 * and is skipped there.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

import { MODES } from './helpers/design-tokens.js';
import { faded, idle, settled } from './helpers/settle.js';

const FIXTURE = '/tests/fixtures/social.html';
const ICONS_PAGE = '/docs/components/icons/';
const EM = 1.25;
/** Sub-pixel rounding of a box. */
const EPS = 1;

/**
 * @param {import('@playwright/test').Page} page
 * @param {{ width?: number, mode?: string, dir?: string, route?: string }} [options]
 */
async function open(page, { width = 1280, mode = 'light', dir = 'ltr', route = FIXTURE } = {}) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(route);
  await page.evaluate(([m, d]) => { document.documentElement.dataset.theme = m; document.documentElement.dir = d; }, [mode, dir]);
}

/**
 * What a token is in the page now, in its computed form: a colour as `rgb(…)`, a length in px. A probe element takes
 * the token as the value of the property, so the test types no value.
 * @param {import('@playwright/test').Page} page
 * @param {string} property a CSS property: color, background-color, width, border-radius
 * @param {string} token
 */
const token = (page, property, token) => page.evaluate(([p, t]) => {
  const probe = document.createElement('div');
  probe.style.setProperty(p, `var(${t})`);
  document.body.append(probe);
  const value = getComputedStyle(probe).getPropertyValue(p);
  probe.remove();
  return value;
}, [property, token]);

const style = (locator, ...props) => locator.evaluate((el, names) => {
  const cs = getComputedStyle(el);
  return Object.fromEntries(names.map((n) => [n, cs.getPropertyValue(n)]));
}, props);
const box = (locator) => locator.evaluate((el) => { const r = el.getBoundingClientRect(); return { width: r.width, height: r.height, left: r.left, right: r.right, top: r.top }; });
const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe('social links: the markup', () => {
  test('a ul.luz-social of li, each with one a that holds a decorative svg and then a span', async ({ page }) => {
    await open(page);
    const lists = await page.locator('ul.luz-social').evaluateAll((uls) => uls.map((ul) => ({
      id: ul.id,
      items: [...ul.children].map((li) => ({
        tag: li.tagName,
        display: getComputedStyle(li).display,
        links: li.querySelectorAll(':scope > a[href]').length,
        parts: [...(li.querySelector(':scope > a')?.children ?? [])].map((c) => c.localName),
        hidden: li.querySelector(':scope > a > svg')?.getAttribute('aria-hidden'),
      })),
    })));
    expect(lists.map((l) => l.id)).toEqual(['names', 'icons', 'many']);
    for (const list of lists) {
      expect(list.items.length, `#${list.id}`).toBeGreaterThan(0);
      for (const item of list.items) {
        expect(item.tag).toBe('LI');
        expect(item.display, `#${list.id}: an li is never display: contents or none`).not.toMatch(/^(contents|none)$/);
        expect(item.links, `#${list.id}: one link in each li`).toBe(1);
        expect(item.parts, `#${list.id}: the icon, then the name`).toEqual(['svg', 'span']);
        expect(item.hidden, `#${list.id}: the icon is decorative`).toBe('true');
      }
    }
  });

  test('there are no bullets and no indent: the list is laid out by the stylesheet', async ({ page }) => {
    await open(page);
    for (const id of ['names', 'icons']) {
      const look = await style(page.locator(`#${id}`), 'list-style-type', 'padding-inline-start', 'margin-block-start', 'display', 'flex-wrap');
      expect(look['list-style-type'], `#${id}`).toBe('none');
      expect(look['padding-inline-start'], `#${id}`).toBe('0px');
      expect(look['margin-block-start'], `#${id}`).toBe('0px');
      expect(look.display, `#${id}: a row`).toBe('flex');
      expect(look['flex-wrap'], `#${id}: that wraps`).toBe('wrap');
    }
  });

  test('every link is inline-flex and at least --luz-control-sm tall', async ({ page }) => {
    await open(page);
    const min = parseFloat(await token(page, 'width', '--luz-control-sm'));
    expect(min).toBeGreaterThan(0);
    for (const link of await page.locator('ul.luz-social a').all()) {
      expect((await style(link, 'display')).display).toBe('inline-flex');
      expect((await box(link)).height).toBeGreaterThanOrEqual(min - EPS);
    }
  });

  test('the icon is sized in em: 1.25em of the link, whatever the font size', async ({ page }) => {
    await open(page);
    for (const link of [page.locator('#names a').first(), page.locator('#icons a').first()]) {
      const font = parseFloat((await style(link, 'font-size'))['font-size']);
      const svg = await box(link.locator('svg'));
      expect(svg.width).toBeCloseTo(EM * font, 0);
      expect(svg.height).toBeCloseTo(EM * font, 0);
    }
    // Larger text, larger icon
    const before = (await box(page.locator('#names svg').first())).width;
    await page.locator('#names').evaluate((el) => { el.style.fontSize = '2em'; });
    expect((await box(page.locator('#names svg').first())).width).toBeGreaterThan(before * 1.5);
  });
});

test.describe('social links: colour', () => {
  for (const mode of MODES) {
    test(`${mode}: --luz-text-secondary, then --luz-text-primary and an underline on hover`, async ({ page }) => {
      await open(page, { mode });
      const link = page.locator('#names a').first();
      const secondary = await token(page, 'color', '--luz-text-secondary');
      const primary = await token(page, 'color', '--luz-text-primary');
      expect(secondary).not.toBe(primary);
      let look = await style(link, 'color', 'text-decoration-line');
      expect(look.color, 'rest').toBe(secondary);
      expect(look['text-decoration-line'], 'no underline at rest').toBe('none');
      await link.hover();
      await expect.poll(async () => (await style(link, 'color')).color, 'hover colour').toBe(primary);
      look = await style(link, 'text-decoration-line');
      expect(look['text-decoration-line'], 'underlined on hover').toContain('underline');
    });

    test(`${mode}: with --icons the hover paints --luz-surface-hover behind the square`, async ({ page }) => {
      await open(page, { mode });
      const link = page.locator('#icons a').first();
      const hover = await token(page, 'background-color', '--luz-surface-hover');
      expect((await style(link, 'background-color'))['background-color'], 'transparent at rest').not.toBe(hover);
      await link.hover();
      await expect.poll(async () => (await style(link, 'background-color'))['background-color'], 'hover background').toBe(hover);
    });
  }
});

test.describe('social links: --icons', () => {
  test('each link is exactly --luz-control-md square', async ({ page }) => {
    await open(page);
    const side = parseFloat(await token(page, 'width', '--luz-control-md'));
    expect(side).toBeGreaterThanOrEqual(24);
    for (const link of await page.locator('#icons a').all()) {
      const b = await box(link);
      expect(b.width).toBeCloseTo(side, 0);
      expect(b.height).toBeCloseTo(side, 0);
    }
  });

  test('the name is not shown but is the name of the link', async ({ page }) => {
    await open(page);
    for (const [id, name] of [['i-code', 'Code'], ['i-person', 'Mastodon'], ['i-mail', 'Email'], ['i-feed', 'RSS feed']]) {
      const link = page.locator(`#${id}`);
      await expect(link.locator('span')).toHaveClass(/\bu-sr-only\b/);
      const span = await box(link.locator('span'));
      expect(span.width, `${name}: the span is clipped to a point`).toBeLessThanOrEqual(1 + EPS);
      expect(span.height).toBeLessThanOrEqual(1 + EPS);
      await expect(link).toHaveAccessibleName(name);
    }
    // And with the names shown, the same
    await expect(page.locator('#n-feed')).toHaveAccessibleName('RSS feed');
  });

  test('the icon is centred in its square', async ({ page }) => {
    await open(page);
    const link = await box(page.locator('#icons a').first());
    const svg = await box(page.locator('#icons a').first().locator('svg'));
    expect((svg.left + svg.right) / 2).toBeCloseTo((link.left + link.right) / 2, 0);
  });
});

test.describe('social links: keyboard', () => {
  test('Tab visits the links in the order of the source, one stop for each', async ({ page }) => {
    await open(page);
    const source = await page.locator('ul.luz-social a[href]').evaluateAll((els) => els.map((a, i) => { a.setAttribute('data-n', String(i)); return i; }));
    const visited = [];
    for (let i = 0; i < source.length; i++) {
      await page.keyboard.press('Tab');
      visited.push(await page.evaluate(() => Number(document.activeElement?.getAttribute('data-n') ?? -1)));
    }
    expect(visited).toEqual(source);
  });

  for (const selector of ['#names a', '#icons a']) {
    test(`${selector}: the focus ring is core's, 2px, and follows the radius of the link`, async ({ page }) => {
      await open(page);
      await page.keyboard.press('Tab');
      await page.locator(`${selector} >> nth=0`).focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      const link = page.locator(`${selector} >> nth=0`);
      await expect(link).toBeFocused();
      const ring = await style(link, 'outline-style', 'outline-width', 'outline-color', 'outline-offset', 'border-radius');
      expect(ring['outline-style']).toBe('solid');
      expect(ring['outline-width'], 'the ring of core').toBe('2px');
      expect(ring['outline-offset']).toBe('2px');
      expect(ring['outline-color']).toBe(await token(page, 'color', '--luz-focus-ring'));
      const radius = await token(page, 'border-radius', '--luz-radius-md');
      expect(parseFloat(radius)).toBeGreaterThan(0);
      expect(ring['border-radius'], 'the ring follows the radius of the link').toBe(radius);
    });
  }
});

test.describe('social links: layer', () => {
  test('every rule of social.css is in the layer luz.catalog', async ({ page }) => {
    await open(page);
    const found = await page.evaluate(() => {
      const sheet = [...document.styleSheets].find((s) => s.href?.endsWith('/components/social.css'));
      if (!sheet) return null;
      const rules = [...sheet.cssRules];
      return {
        unlayered: rules.filter((r) => r.constructor.name === 'CSSStyleRule').map((r) => /** @type {CSSStyleRule} */ (r).selectorText),
        layers: rules.filter((r) => r.constructor.name === 'CSSLayerBlockRule').map((r) => /** @type {CSSLayerBlockRule} */ (r).name),
        selectors: rules.filter((r) => r.constructor.name === 'CSSLayerBlockRule').flatMap((r) => [...(/** @type {CSSLayerBlockRule} */ (r)).cssRules].map((c) => /** @type {CSSStyleRule} */ (c).selectorText)),
      };
    });
    expect(found, 'social.css is linked').not.toBeNull();
    expect(found?.unlayered, 'no rule outside a layer').toEqual([]);
    expect(found?.layers).toEqual(['luz.catalog']);
    expect(found?.selectors.length, 'the block has its rules').toBeGreaterThan(0);
    for (const selector of found?.selectors ?? []) expect(selector, 'only the block and its parts').toMatch(/\.luz-social/);
  });

  test('a rule of the page outside any layer wins over the pattern', async ({ page }) => {
    await open(page);
    await page.evaluate(() => {
      const style = document.createElement('style');
      style.textContent = '#names a { color: rgb(1, 2, 3); }';
      document.head.append(style);
    });
    expect((await style(page.locator('#names a').first(), 'color')).color).toBe('rgb(1, 2, 3)');
  });
});

test.describe('social links: reflow', () => {
  for (const mode of MODES) {
    test(`${mode}: no sideways scroll at 320, 768 and 1280 px, left to right and right to left, and no link leaves the window`, async ({ page }) => {
      for (const dir of ['ltr', 'rtl']) {
        for (const width of [320, 768, 1280]) {
          await open(page, { width, mode, dir });
          expect(await sideways(page), `${dir} ${width}px`).toBeLessThanOrEqual(0);
          for (const b of await page.locator('ul.luz-social a').evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right }; }))) {
            expect(b.left, `${dir} ${width}px`).toBeGreaterThanOrEqual(-EPS);
            expect(b.right, `${dir} ${width}px`).toBeLessThanOrEqual(width + EPS);
          }
        }
      }
    });
  }

  test('a long list wraps onto more rows in a narrow window, never past the edge', async ({ page }) => {
    await open(page, { width: 320 });
    const rows = (await page.locator('#many li').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)))).filter((t, i, all) => all.indexOf(t) === i);
    expect(rows.length).toBeGreaterThan(1);
    await open(page, { width: 1280 });
    const wide = (await page.locator('#many li').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)))).filter((t, i, all) => all.indexOf(t) === i);
    expect(wide.length).toBeLessThan(rows.length);
  });

  test('right to left: the first link is at the right', async ({ page }) => {
    await open(page, { dir: 'rtl' });
    const first = await box(page.locator('#names li').nth(0));
    const second = await box(page.locator('#names li').nth(1));
    expect(first.left).toBeGreaterThan(second.left);
    const icon = await box(page.locator('#names a').first().locator('svg'));
    const name = await box(page.locator('#names a').first().locator('span'));
    expect(icon.left, 'the icon is before the name, at its right').toBeGreaterThan(name.left);
  });
});

test.describe('social links: axe', () => {
  for (const mode of MODES) {
    test(`axe finds nothing serious on the fixture in ${mode}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name === 'chromium-nojs', 'axe needs JavaScript');
      await open(page, { mode });
      await settled(page);
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)).toEqual([]);
    });

    test(`axe finds nothing serious on the Icons page in ${mode}, with the new Feed icon`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name === 'chromium-nojs', 'axe needs JavaScript');
      await open(page, { mode, route: ICONS_PAGE });
      await idle(page);
      await expect(page.locator('#c-icons-feed'), 'the Icons page has a Feed icon').toHaveText('Feed');
      await faded(page);
      await page.waitForTimeout(400);
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)).toEqual([]);
    });
  }
});
