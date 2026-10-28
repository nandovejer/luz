// @ts-check
/**
 * The CSS-only tags of @luz-ds/catalog in a browser: <luz-lang-switch>,
 * <luz-submenu>, <luz-announcement> (.claude/plans/specs/f3-package-model.md
 * section 2.2, step 8). No LUZ script ever defines them: after catalog.min.js
 * has run and both chunks have loaded, `customElements.get()` still answers
 * undefined and the tags are `:not(:defined)`. On
 * tests/fixtures/css-only-tags.html, which also holds a <luz-search> and a
 * <luz-cookie-consent> so that both chunks load. The sources: tests/css-only-tags.test.js.
 */
import { test, expect } from '@playwright/test';

const FIXTURE = '/tests/fixtures/css-only-tags.html';
const TAGS = ['luz-lang-switch', 'luz-submenu', 'luz-announcement'];

test.describe('the CSS-only tags are never defined', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript');

  test('after both chunks load, the two elements are defined and the three tags are not', async ({ page }) => {
    await page.goto(FIXTURE);
    // Both chunks (search on idle, then consent): wait for them, so the answer below is after the loader ran
    await expect.poll(() => page.evaluate(() => !!customElements.get('luz-search') && !!customElements.get('luz-cookie-consent')), { timeout: 10_000 }).toBe(true);
    const state = await page.evaluate((tags) => Object.fromEntries(tags.map((tag) => [tag, {
      definition: customElements.get(tag),
      defined: document.querySelector(tag).matches(':defined'),
    }])), TAGS);
    expect(state).toEqual({
      'luz-lang-switch': { definition: undefined, defined: false },
      'luz-submenu': { definition: undefined, defined: false },
      'luz-announcement': { definition: undefined, defined: false },
    });
  });

  test('importing the two chunks by hand does not define them either', async ({ page }) => {
    await page.goto(FIXTURE);
    await page.evaluate(async () => {
      await import('/packages/catalog/dist/search.min.js');
      await import('/packages/catalog/dist/cookie-consent.min.js');
    });
    expect(await page.evaluate((tags) => tags.map((tag) => !!customElements.get(tag)), TAGS)).toEqual([false, false, false]);
  });
});

test.describe('what the tags give, with or without JavaScript', () => {
  test('<luz-announcement> is a block, <luz-submenu> is display: contents', async ({ page }) => {
    await page.goto(FIXTURE);
    const display = await page.evaluate(() => ({
      banner: getComputedStyle(document.querySelector('luz-announcement')).display,
      submenu: getComputedStyle(document.querySelector('luz-submenu')).display,
    }));
    expect(display).toEqual({ banner: 'block', submenu: 'contents' });
  });

  // Where the browser has anchor positioning, the list hangs under its button (its top is the button's bottom plus --luz-space-xs) and
  // --luz-lang-switch-top is not read; elsewhere the list sits at --luz-lang-switch-top from the top of the window
  const anchored = (page) => page.evaluate(() => globalThis.CSS.supports('position-anchor', '--luz-lang-switch'));
  const length = (page, value) =>
    page.evaluate((v) => {
      const probe = Object.assign(document.createElement('div'), { style: `position:absolute;visibility:hidden;block-size:${v}` });
      document.body.append(probe);
      const h = probe.getBoundingClientRect().height;
      probe.remove();
      return h;
    }, value);

  test('the list opens under the button where anchor positioning exists, and under a one-row bar (--luz-bar-h) where it does not', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(FIXTURE);
    const button = page.getByRole('button', { name: 'Language: English' });
    await button.click();
    const top = await page.locator('#lang-menu').evaluate((el) => el.getBoundingClientRect().top);
    if (await anchored(page)) {
      const bottom = await button.evaluate((el) => el.getBoundingClientRect().bottom);
      const gap = await length(page, 'var(--luz-space-xs)');
      expect(gap).toBeGreaterThan(0);
      expect(Math.abs(top - (bottom + gap))).toBeLessThanOrEqual(1);
    } else {
      const bar = await length(page, 'var(--luz-bar-h)');
      expect(bar).toBeGreaterThan(0);
      expect(Math.abs(top - bar)).toBeLessThanOrEqual(1);
    }
  });

  test('--luz-lang-switch-top set on the tag moves the list where there is no anchor positioning; the old property does nothing', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(FIXTURE);
    test.skip(await anchored(page), 'with anchor positioning the list hangs under the button and --luz-lang-switch-top is not read');
    await page.evaluate(() => {
      const host = document.getElementById('lang');
      host.style.setProperty('--luz-lang-switch-top', '90px');
      host.style.setProperty('--luz-site-lang-switcher-top', '400px');
    });
    await page.getByRole('button', { name: 'Language: English' }).click();
    expect(await page.locator('#lang-menu').evaluate((el) => el.getBoundingClientRect().top)).toBe(90);
  });

  test('the old property --luz-site-lang-switcher-top does nothing', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(FIXTURE);
    await page.evaluate(() => document.getElementById('lang').style.setProperty('--luz-site-lang-switcher-top', '400px'));
    await page.getByRole('button', { name: 'Language: English' }).click();
    expect(await page.locator('#lang-menu').evaluate((el) => el.getBoundingClientRect().top)).toBeLessThan(300);
  });
});
