// @ts-check
/**
 * The docs sidebar as an accordion of areas, measured in a browser.
 * The owner's request (2026-10-22): "sections of links collapsed like an accordion, only the one
 * with the active child open". The markup is held by tests/docs-nav-fold.test.js (a native
 * <details name="nav"> per area with pages, the area link beside it, an empty summary named
 * by the link, `open` only for the area of the current page). This file holds what needs a browser:
 *
 *   1  only the area of the page is open on /docs/components/button/, /docs/html/forms/ and the
 *      docs home (none), in English and Spanish; the pages of a closed fold are not rendered, the
 *      area links always are, and aria-current is where it was
 *   2  the area link is navigable whether its fold is open or closed
 *   3  Tab walks area link, fold button, the pages when open, the next area link; the button is a
 *      button named by the area; Enter and Space toggle it; opening one closes the others (the
 *      native exclusive accordion); focus and page stay where they are
 *   4  the look: the button is a chevron over the end of the area's row, as tall as the row, with
 *      none of core's bare-details frame; it points to the inline end when closed and down when
 *      open (left in right-to-left); 44px on a touch screen; drawn in forced colors; still under
 *      reduced motion
 *   5  the drawer at 375 px works the same, and still closes with Escape and on a link
 *   6  axe: no serious or critical violation in light, dark and high contrast
 *
 * Everything is native, so the no-JS project runs everything but 6 (the mode is chosen by a script).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readingOrder } from '../scripts/docs-site/site.js';
import { site } from './helpers/docs-site.js';
import { idle } from './helpers/settle.js';
import { seedMode } from './helpers/site-lights.js';

const BUTTON = '/docs/components/button/';
const FORMS = '/docs/html/forms/';
const order = readingOrder(site).map((p) => p.route);
const areaOfRoute = (/** @type {string} */ route) => site.byRoute.get(route)?.meta.area;
const indexOf = (/** @type {{ slug: string }} */ area) => `/docs/${area.slug}/`;
/** The pages an area lists under its link: its pages but its index, in reading order. */
const listedOf = (/** @type {{ id: string, slug: string }} */ area) => order.filter((r) => areaOfRoute(r) === area.id && r !== indexOf(area));
const folded = site.areas.filter((a) => listedOf(a).length > 0);

const LANGUAGES = [
  { code: '', prefix: '' },
  { code: 'es', prefix: '/es' },
];
const strings = (/** @type {string} */ code) => (code ? JSON.parse(readFileSync(fileURLToPath(new URL(`../apps/docs/i18n/${code}/strings.json`, import.meta.url)), 'utf-8')) : null);
const labelOf = (/** @type {string} */ code, /** @type {{ id: string, label: string }} */ area) => (code ? strings(code)[`area.${area.id}`] : area.label);

/** @param {import('@playwright/test').Page} page */
const nav = (page) => page.locator('nav.luz-docs-nav');
/** The summary (the button) of an area's fold. */
const button = (/** @type {import('@playwright/test').Page} */ page, /** @type {string} */ id) => page.locator(`ul.docs-nav summary[aria-labelledby="a-${id}"]`);
const areaLink = (/** @type {import('@playwright/test').Page} */ page, /** @type {string} */ id) => page.locator(`ul.docs-nav a#a-${id}`);
/** The ids of the areas whose fold is open, in the sidebar's order. */
const openAreas = (/** @type {import('@playwright/test').Page} */ page) =>
  page.evaluate(() => [...document.querySelectorAll('ul.docs-nav details[open]')].map((d) => d.parentElement?.querySelector('a.docs-nav__area')?.id.replace('a-', '')));
/** What has the focus: the href of a link, or `summary:<id of the area>`. */
const focused = (/** @type {import('@playwright/test').Page} */ page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    if (el?.tagName === 'SUMMARY') return `summary:${el.getAttribute('aria-labelledby')}`;
    return el?.getAttribute('href') ?? el?.tagName ?? null;
  });
/**
 * The summary of an area as the browser's accessibility tree has it: role, name and expanded
 * (Playwright's own role engine does not know a summary, Chromium does).
 */
const axOf = async (/** @type {import('@playwright/test').Page} */ page, /** @type {string} */ id) => {
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('DOM.enable');
    await cdp.send('Accessibility.enable');
    const { root } = await cdp.send('DOM.getDocument');
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: `ul.docs-nav summary[aria-labelledby="a-${id}"]` });
    const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
    const node = nodes[0];
    return {
      ignored: !!node?.ignored,
      role: node?.role?.value,
      name: node?.name?.value,
      expanded: node?.properties?.find((/** @type {{ name: string }} */ p) => p.name === 'expanded')?.value?.value,
    };
  } finally {
    await cdp.detach();
  }
};
/** The turn of the chevron, in degrees: -45 to the end of a left-to-right line, 135 to the end of a right-to-left one, 45 down. */
const turn = (/** @type {import('@playwright/test').Locator} */ summary) =>
  summary.evaluate((el) => {
    const t = getComputedStyle(el, '::after').transform;
    if (t === 'none') return null;
    const [a, b] = t.slice(t.indexOf('(') + 1, -1).split(',').map(Number);
    return Math.round((Math.atan2(b, a) * 180) / Math.PI);
  });

test.describe('which fold is open', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const { code, prefix } of LANGUAGES) {
    const where = code || 'en';
    for (const [route, open] of /** @type {const} */ ([
      [BUTTON, 'components'],
      [FORMS, 'html'],
      ['/docs/tokens/color/', 'tokens'],
      ['/docs/', null],
    ])) {
      test(`${where} ${route}: ${open ? `only ${open} is open` : 'none is open'}, its pages are there and those of the closed folds are not`, async ({ page }) => {
        await page.goto(`${prefix}${route}`);
        expect(await openAreas(page)).toEqual(open ? [open] : []);
        // Every area link is visible, open or not
        for (const area of site.areas) {
          await expect(nav(page).locator(`a.docs-nav__area[href="${prefix}${indexOf(area)}"]`), area.id).toBeVisible();
        }
        for (const area of folded) {
          const pages = listedOf(area);
          const links = nav(page).locator(`details:has(> summary[aria-labelledby="a-${area.id}"]) a`);
          await expect(links, area.id).toHaveCount(pages.length);
          if (area.id === open) {
            await expect(links.first(), `${area.id}: the first page of the open fold`).toBeVisible();
            await expect(links.last(), `${area.id}: the last page of the open fold`).toBeVisible();
          } else {
            await expect(links.first(), `${area.id}: the first page of a closed fold`).toBeHidden();
            await expect(links.last(), `${area.id}: the last page of a closed fold`).toBeHidden();
          }
        }
      });
    }

    test(`${where}: aria-current is where it was: "page" on the page, "true" on its area link, whether the area is open or not`, async ({ page }) => {
      await page.goto(`${prefix}${BUTTON}`);
      await expect(nav(page).locator('a[aria-current="page"]:not(.page-nav__site a)')).toHaveAttribute('href', `${prefix}${BUTTON}`);
      await expect(nav(page).locator('a[aria-current="true"]:not(.page-nav__site a)')).toHaveAttribute('href', `${prefix}/docs/components/`);
      // Closing the fold does not move the marks, and the area link stays on screen
      await button(page, 'components').click();
      expect(await openAreas(page)).toEqual([]);
      await expect(nav(page).locator('a[aria-current="true"]:not(.page-nav__site a)')).toBeVisible();
      await expect(nav(page).locator('a[aria-current="page"]:not(.page-nav__site a)')).toBeHidden();
    });

    test(`${where}: the area link of a closed fold goes to the area, and that area opens`, async ({ page }) => {
      await page.goto(`${prefix}${BUTTON}`);
      const tokens = areaLink(page, 'tokens');
      await expect(tokens).toBeVisible();
      await expect(tokens).toHaveAttribute('href', `${prefix}/docs/tokens/`);
      await tokens.click();
      await expect(page).toHaveURL(new RegExp(`${prefix}/docs/tokens/$`));
      expect(await openAreas(page)).toEqual(['tokens']);
      await expect(nav(page).locator('a[aria-current="page"]:not(.page-nav__site a)')).toHaveAttribute('href', `${prefix}/docs/tokens/`);
      // ... and the area link of the open fold still goes there when it is the one clicked
      await page.goto(`${prefix}${BUTTON}`);
      const core = areaLink(page, 'components');
      await core.click();
      await expect(page).toHaveURL(new RegExp(`${prefix}/docs/components/$`));
      expect(await openAreas(page)).toEqual(['components']);
    });
  }
});

test.describe('the button of a fold', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const { code, prefix } of LANGUAGES) {
    const where = code || 'en';

    test(`${where}: is a button named by its area, one per area with pages, and none for an area with no pages`, async ({ page }) => {
      await page.goto(`${prefix}${BUTTON}`);
      await expect(page.locator('ul.docs-nav summary')).toHaveCount(folded.length);
      for (const area of folded) {
        const label = labelOf(code, area);
        const summary = button(page, area.id);
        await expect(summary).toHaveCount(1);
        const ax = await axOf(page, area.id);
        expect(ax.ignored, `${area.id}: it is in the accessibility tree`).toBe(false);
        // Chromium's own name for a summary is a disclosure triangle, which platform APIs expose as a button with an expanded state (HTML-AAM)
        expect(['button', 'DisclosureTriangleGrouped', 'DisclosureTriangle'], `${area.id}: it is a button (${ax.role})`).toContain(ax.role);
        expect(ax.name, `${area.id}: named by the area link`).toBe(label);
      }
      // The areas without pages have a link and nothing else
      for (const area of site.areas.filter((a) => !folded.includes(a))) {
        const li = nav(page).locator(`ul.docs-nav > li:has(> a.docs-nav__area[href="${prefix}${indexOf(area)}"])`);
        await expect(li.locator('details, summary')).toHaveCount(0);
      }
    });

    test(`${where}: says whether it is open: expanded for the open area, collapsed for the others`, async ({ page }) => {
      await page.goto(`${prefix}${BUTTON}`);
      for (const area of folded) expect((await axOf(page, area.id)).expanded, `${area.id} on Button`).toBe(area.id === 'components');
      await button(page, 'tokens').click();
      for (const area of folded) expect((await axOf(page, area.id)).expanded, `${area.id} after opening Tokens`).toBe(area.id === 'tokens');
    });

    test(`${where}: Tab goes area link, button, the pages of the open area, next area link; the closed areas' pages are skipped`, async ({ page }) => {
      await page.setViewportSize({ width: 1024, height: 800 });
      await page.goto(`${prefix}${BUTTON}`);
      const first = site.areas[0];
      await nav(page).locator(`a.docs-nav__area[href="${prefix}${indexOf(first)}"]`).focus();
      /** @type {string[]} */
      const expected = [];
      for (const area of site.areas) {
        expected.push(`${prefix}${indexOf(area)}`);
        if (folded.includes(area)) expected.push(`summary:a-${area.id}`);
        if (area.id === 'components') for (const route of listedOf(area)) expected.push(`${prefix}${route}`);
      }
      expect(await focused(page)).toBe(expected[0]);
      /** @type {string[]} */
      const walked = [expected[0]];
      for (let i = 1; i < expected.length; i++) {
        await page.keyboard.press('Tab');
        walked.push(/** @type {string} */ (await focused(page)));
      }
      expect(walked).toEqual(expected);
    });

    test(`${where}: Enter opens another area and closes the open one, Space closes it again, and nothing else moves`, async ({ page }) => {
      await page.goto(`${prefix}${BUTTON}`);
      const tokens = button(page, 'tokens');
      await tokens.focus();
      const before = await page.evaluate(() => window.scrollY);
      await page.keyboard.press('Enter');
      expect(await openAreas(page), 'Tokens opens, Core closes (one name)').toEqual(['tokens']);
      await expect(tokens).toBeFocused();
      await expect(nav(page).locator(`a[href="${prefix}/docs/tokens/color/"]`)).toBeVisible();
      await expect(nav(page).locator(`a[href="${prefix}${BUTTON}"]`)).toBeHidden();
      expect(new URL(page.url()).pathname, 'the page did not change').toBe(`${prefix}${BUTTON}`);
      expect(await page.evaluate(() => window.scrollY), 'the page did not scroll').toBe(before);
      // The marks are the page's, not the open fold's
      await expect(nav(page).locator('a[aria-current="true"]:not(.page-nav__site a)')).toHaveAttribute('href', `${prefix}/docs/components/`);
      // Tab from the button goes into the pages that just opened
      await page.keyboard.press('Tab');
      expect(await focused(page)).toBe(`${prefix}${listedOf(/** @type {any} */ (site.areas.find((a) => a.id === 'tokens')))[0]}`);
      await tokens.focus();
      await page.keyboard.press('Space');
      expect(await openAreas(page), 'Space closes the open one').toEqual([]);
      await expect(tokens).toBeFocused();
      await page.keyboard.press('Space');
      expect(await openAreas(page)).toEqual(['tokens']);
      await page.keyboard.press('Enter');
      expect(await openAreas(page)).toEqual([]);
    });

    test(`${where}: a click on another area's button opens it and closes the current one; a click on the open one closes it`, async ({ page }) => {
      await page.goto(`${prefix}${FORMS}`);
      expect(await openAreas(page)).toEqual(['html']);
      await button(page, 'landing').click();
      expect(await openAreas(page)).toEqual(['landing']);
      await expect(nav(page).locator(`a[href="${prefix}/docs/landing/hero/"]`).first()).toBeVisible();
      await expect(nav(page).locator(`a[href="${prefix}${FORMS}"]`)).toBeHidden();
      await button(page, 'components').click();
      expect(await openAreas(page)).toEqual(['components']);
      await button(page, 'components').click();
      expect(await openAreas(page)).toEqual([]);
      // A page keeps its own area link visible and marked while every fold is shut
      await expect(nav(page).locator('a[aria-current="true"]:not(.page-nav__site a)')).toHaveAttribute('href', `${prefix}${indexOf(/** @type {any} */ (site.areas.find((a) => a.id === 'html')))}`);
    });
  }
});

test.describe('the look of the button', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('is a chevron over the end of the area\'s row, as tall as the row, and the text of the link ends before it', async ({ page }) => {
    await page.goto(BUTTON);
    for (const area of folded) {
      const geometry = await page.evaluate((id) => {
        const link = /** @type {HTMLElement} */ (document.getElementById(`a-${id}`));
        const summary = /** @type {HTMLElement} */ (document.querySelector(`summary[aria-labelledby="a-${id}"]`));
        const l = link.getBoundingClientRect();
        const s = summary.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(link);
        const t = range.getBoundingClientRect();
        return { l: { top: l.top, bottom: l.bottom, right: l.right, height: l.height }, s: { top: s.top, bottom: s.bottom, right: s.right, left: s.left, width: s.width, height: s.height }, textRight: t.right };
      }, area.id);
      expect(geometry.s.top, `${area.id}: it starts at the top of the row`).toBeCloseTo(geometry.l.top, 0);
      expect(geometry.s.height, `${area.id}: it is as tall as the row`).toBeCloseTo(geometry.l.height, 0);
      expect(geometry.s.right, `${area.id}: it is at the end of the row`).toBeCloseTo(geometry.l.right, 0);
      expect(geometry.s.width, `${area.id}: it is a target, not a hairline`).toBeGreaterThanOrEqual(24);
      expect(geometry.textRight, `${area.id}: the label does not run under it`).toBeLessThanOrEqual(geometry.s.left + 1);
    }
  });

  test('shows none of core\'s frame for a bare details: no border, no background, no negative margin', async ({ page }) => {
    await page.goto(BUTTON);
    for (const area of folded) {
      const style = await page.evaluate((id) => {
        const summary = /** @type {HTMLElement} */ (document.querySelector(`summary[aria-labelledby="a-${id}"]`));
        const details = /** @type {HTMLElement} */ (summary.parentElement);
        const d = getComputedStyle(details);
        const s = getComputedStyle(summary);
        return {
          border: [d.borderTopWidth, d.borderRightWidth, d.borderBottomWidth, d.borderLeftWidth],
          bg: d.backgroundColor,
          backgroundImage: d.backgroundImage,
          margin: [d.marginTop, d.marginRight, d.marginBottom, d.marginLeft],
          padding: [d.paddingTop, d.paddingRight, d.paddingBottom, d.paddingLeft],
          summaryMargin: [s.marginTop, s.marginRight, s.marginBottom, s.marginLeft],
          summaryBorder: [s.borderTopWidth, s.borderBottomWidth],
          summaryBg: s.backgroundColor,
        };
      }, area.id);
      expect(style.border, `${area.id} border`).toEqual(['0px', '0px', '0px', '0px']);
      expect(style.bg, `${area.id} background`).toBe('rgba(0, 0, 0, 0)');
      expect(style.backgroundImage, `${area.id} background image`).toBe('none');
      expect(style.margin, `${area.id} margin`).toEqual(['0px', '0px', '0px', '0px']);
      expect(style.padding, `${area.id} padding`).toEqual(['0px', '0px', '0px', '0px']);
      expect(style.summaryMargin, `${area.id} summary margin`).toEqual(['0px', '0px', '0px', '0px']);
      expect(style.summaryBorder, `${area.id} summary border`).toEqual(['0px', '0px']);
      expect(style.summaryBg, `${area.id} summary background`).toBe('rgba(0, 0, 0, 0)');
    }
  });

  test('draws no disclosure triangle of its own: the chevron is the only marker', async ({ page }) => {
    await page.goto(BUTTON);
    for (const area of folded) {
      const marker = await button(page, area.id).evaluate((el) => ({ display: getComputedStyle(el).display, list: getComputedStyle(el).listStyleType, marker: getComputedStyle(el, '::marker').content }));
      expect(marker.display, area.id).not.toBe('list-item');
      expect(marker.list === 'none' || marker.display !== 'list-item', area.id).toBe(true);
    }
  });

  test('points to the end of the line when closed and down when open', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(BUTTON);
    expect(await turn(button(page, 'components')), 'Core is open').toBe(45);
    expect(await turn(button(page, 'tokens')), 'Tokens is closed').toBe(-45);
    await button(page, 'tokens').click();
    await expect.poll(() => turn(button(page, 'tokens')), 'Tokens opened').toBe(45);
    await expect.poll(() => turn(button(page, 'components')), 'Core closed').toBe(-45);
  });

  test('points to the left, the end of a right-to-left line, when closed, and down when open; the button is at the left end of the row', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(BUTTON);
    await page.evaluate(() => {
      document.documentElement.dir = 'rtl';
    });
    expect(await turn(button(page, 'tokens')), 'closed').toBe(135);
    expect(await turn(button(page, 'components')), 'open').toBe(45);
    for (const id of ['tokens', 'components']) {
      const geometry = await page.evaluate((area) => {
        const link = /** @type {HTMLElement} */ (document.getElementById(`a-${area}`)).getBoundingClientRect();
        const summary = /** @type {HTMLElement} */ (document.querySelector(`summary[aria-labelledby="a-${area}"]`)).getBoundingClientRect();
        return { linkLeft: link.left, summaryLeft: summary.left, summaryRight: summary.right, linkRight: link.right };
      }, id);
      expect(geometry.summaryLeft, `${id}: it is at the start of the row, the left of a right-to-left page, where the row ends`).toBeCloseTo(geometry.linkLeft, 0);
      expect(geometry.summaryRight, id).toBeLessThan(geometry.linkRight - 8);
    }
  });

  test('is drawn in forced colors: a visible chevron in the text colour, not a background', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(BUTTON);
    for (const id of ['components', 'tokens']) {
      const chevron = await button(page, id).evaluate((el) => {
        const s = getComputedStyle(el);
        const c = getComputedStyle(el, '::after');
        const box = c.display === 'none' ? null : { width: c.width, height: c.height };
        return { color: s.color, content: c.content, box, borderColor: c.borderBlockEndColor, borderWidth: c.borderBlockEndWidth, borderStyle: c.borderBlockEndStyle };
      });
      expect(chevron.content, `${id}: the chevron exists`).not.toBe('none');
      expect(chevron.box?.width, `${id}: it has a size`).not.toBe('0px');
      expect(chevron.borderStyle, `${id}: it is drawn with a border (kept in forced colors)`).toBe('solid');
      expect(parseFloat(chevron.borderWidth), `${id}: the line is thick enough to see`).toBeGreaterThanOrEqual(1);
      expect(chevron.borderColor, `${id}: in the colour of the text, not transparent`).toBe(chevron.color);
      expect(chevron.borderColor, id).not.toBe('rgba(0, 0, 0, 0)');
    }
  });

  test('is the colour of the sidebar\'s text', async ({ page }) => {
    await page.goto(BUTTON);
    const colors = await page.evaluate(() => ({
      chevron: getComputedStyle(document.querySelector('summary[aria-labelledby="a-tokens"]'), '::after').borderBlockEndColor,
      link: getComputedStyle(document.getElementById('a-tokens')).color,
    }));
    expect(colors.chevron).toBe(colors.link);
  });

  test('has no transition under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(BUTTON);
    const durations = await button(page, 'tokens').evaluate((el) => getComputedStyle(el, '::after').transitionDuration);
    expect(durations.split(',').every((d) => parseFloat(d) === 0), durations).toBe(true);
  });

  test('has a focus ring when the keyboard is on it', async ({ page }) => {
    await page.goto(BUTTON);
    await areaLink(page, 'tokens').focus();
    await page.keyboard.press('Tab');
    await expect(button(page, 'tokens')).toBeFocused();
    const ring = await button(page, 'tokens').evaluate((el) => {
      const s = getComputedStyle(el);
      return { style: s.outlineStyle, width: parseFloat(s.outlineWidth), color: s.outlineColor };
    });
    expect(ring.style).not.toBe('none');
    expect(ring.width).toBeGreaterThanOrEqual(2);
    expect(ring.color).not.toBe('rgba(0, 0, 0, 0)');
  });
});

test.describe('on a touch screen', () => {
  test.use({ viewport: { width: 1440, height: 900 }, hasTouch: true });

  test('the button is at least 44 by 44 px, as tall as the row', async ({ page }) => {
    await page.goto(BUTTON);
    test.skip(!(await page.evaluate(() => window.matchMedia('(pointer: coarse)').matches)), 'this browser context does not report a coarse pointer');
    for (const area of folded) {
      const box = await button(page, area.id).evaluate((el) => {
        const r = el.getBoundingClientRect();
        const l = /** @type {HTMLElement} */ (document.getElementById(el.getAttribute('aria-labelledby') ?? '')).getBoundingClientRect();
        return { w: r.width, h: r.height, rowHeight: l.height };
      });
      expect(box.h, `${area.id} height`).toBeGreaterThanOrEqual(43.5);
      expect(box.w, `${area.id} width`).toBeGreaterThanOrEqual(43.5);
      expect(box.h, `${area.id}: it is not taller than its row`).toBeLessThanOrEqual(box.rowHeight + 1);
    }
  });
});

test.describe('nothing sticks out of the window at 320 px', () => {
  test.use({ viewport: { width: 320, height: 800 } });

  for (const { code, prefix } of LANGUAGES) {
    test(`${code || 'en'}: the open drawer keeps every button inside it, and the page does not scroll sideways`, async ({ page }) => {
      await page.goto(`${prefix}${FORMS}`);
      await page.locator('.site-header__menu').click();
      await expect(page.locator('#page-nav')).toBeVisible();
      const out = await page.evaluate(() => {
        const width = document.documentElement.clientWidth;
        return {
          outside: [...document.querySelectorAll('ul.docs-nav summary')]
            .map((s) => ({ id: s.getAttribute('aria-labelledby'), r: s.getBoundingClientRect() }))
            .filter(({ r }) => r.width > 0 && (r.right > width + 0.5 || r.left < -0.5))
            .map(({ id }) => id),
          page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });
      expect(out.outside).toEqual([]);
      expect(out.page).toBeLessThanOrEqual(0);
    });
  }
});

test.describe('the drawer at 375 px', () => {
  test.use({ viewport: { width: 375, height: 700 } });

  for (const { code, prefix } of LANGUAGES) {
    const where = code || 'en';

    test(`${where}: shows the folds, opens another with the keyboard while it stays open, Escape closes it and gives the focus back`, async ({ page }) => {
      await page.goto(`${prefix}${FORMS}`);
      const toggle = page.locator('.site-header__menu');
      const drawer = page.locator('#page-nav');
      await expect(drawer).toBeHidden();
      await toggle.focus();
      await page.keyboard.press('Enter');
      await expect(drawer).toBeVisible();
      expect(await openAreas(page)).toEqual(['html']);
      const landing = button(page, 'landing');
      await landing.scrollIntoViewIfNeeded();
      await expect(landing).toBeVisible();
      await expect(drawer.locator(`a[href="${prefix}${FORMS}"]`)).toBeVisible();
      await landing.focus();
      await page.keyboard.press('Enter');
      expect(await openAreas(page)).toEqual(['landing']);
      await expect(drawer, 'the drawer stays open while a fold opens').toBeVisible();
      await expect(drawer.locator(`a[href="${prefix}${FORMS}"]`)).toBeHidden();
      await page.keyboard.press('Escape');
      await expect(drawer).toBeHidden();
      await expect(toggle).toBeFocused();
    });

    test(`${where}: a click on a page link inside a fold closes the drawer and goes there`, async ({ page }) => {
      await page.goto(`${prefix}${BUTTON}`);
      await page.locator('.site-header__menu').click();
      const drawer = page.locator('#page-nav');
      await expect(drawer).toBeVisible();
      const tokens = button(page, 'tokens');
      await tokens.scrollIntoViewIfNeeded();
      await tokens.click();
      expect(await openAreas(page)).toEqual(['tokens']);
      await expect(drawer).toBeVisible();
      const link = drawer.locator(`a[href="${prefix}/docs/tokens/color/"]`);
      await link.scrollIntoViewIfNeeded();
      await link.click();
      await expect(page).toHaveURL(new RegExp(`${prefix}/docs/tokens/color/$`));
      await expect(drawer).toBeHidden();
    });

    test(`${where}: the button is the same chevron, as tall as its row`, async ({ page }) => {
      await page.goto(`${prefix}${BUTTON}`);
      await page.locator('.site-header__menu').click();
      await expect(page.locator('#page-nav')).toBeVisible();
      const summary = button(page, 'tokens');
      await summary.scrollIntoViewIfNeeded();
      const geometry = await summary.evaluate((el) => {
        const l = /** @type {HTMLElement} */ (document.getElementById('a-tokens')).getBoundingClientRect();
        const s = el.getBoundingClientRect();
        return { top: [s.top, l.top], height: [s.height, l.height], right: [s.right, l.right] };
      });
      expect(geometry.top[0]).toBeCloseTo(geometry.top[1], 0);
      expect(geometry.height[0]).toBeCloseTo(geometry.height[1], 0);
      expect(geometry.right[0]).toBeCloseTo(geometry.right[1], 0);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      expect(await turn(summary)).toBe(-45);
    });
  }
});

test.describe('axe: the sidebar with its folds', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'the mode is chosen by a script');
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const mode of ['light', 'dark', 'high-contrast']) {
    for (const route of [BUTTON, `/es${FORMS}`]) {
      test(`${route} in ${mode}: no serious or critical violation, with the fold open and with another opened`, async ({ page }) => {
        await seedMode(page, mode);
        await page.goto(route);
        await idle(page);
        expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(mode);
        const scan = async () => {
          const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
          return violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? '')).map((v) => `${v.id}: ${v.nodes[0]?.target?.join(' ')}`);
        };
        expect(await scan(), 'as the page loads').toEqual([]);
        await button(page, 'tokens').click();
        expect(await openAreas(page)).toEqual(['tokens']);
        expect(await scan(), 'with Tokens opened').toEqual([]);
        await button(page, 'tokens').click();
        expect(await openAreas(page)).toEqual([]);
        expect(await scan(), 'with every fold shut').toEqual([]);
      });
    }
  }
});
