// @ts-check
/**
 * The /debug/ page in a browser (plan luz-final-refactor, section E): everything in LUZ, one
 * element under another, to review by hand. tests/debug-page.test.js holds what is read from
 * the source (the order, the blocks, the files it links, the noindex, the ids); this holds what
 * needs a layout or a script:
 *
 *   1  the content shows with JavaScript off: the four groups, a block for every element and
 *      component, and each one's header
 *   2  nothing sticks out of the window at 320 px
 *   3  nothing it loads fails: no request answered with an error, no error in the console
 *   4  the index at the top: every anchor has its target, and following one lands on it
 *   5  the link of every block goes to a page that exists
 *   6  no id twice in the page a browser built
 *   7  the demos still work after their ids were joined: the tabs, the modal
 *   8  the controls (JavaScript): the mode selector sets data-theme and the colours follow,
 *      the dir toggle sets dir
 *
 * No axe: the page is a review tool, with every kind of demo, good and bad, one under another.
 * The no-JS project runs 1 to 7; 7's tabs and 8 need a script.
 */
import { test, expect } from '@playwright/test';
import { catalogPages, corePages, htmlElements } from './helpers/debug-page.js';

const DEBUG = '/debug/';

/** @param {import('@playwright/test').Page} page */
async function open(page) {
  const response = await page.goto(DEBUG);
  expect(response?.status(), `${DEBUG} is answered`).toBe(200);
  await page.waitForLoadState('load');
  // Not a page that was never generated: the server answers any route with something
  await expect(page.locator('[data-debug-block]').first(), `${DEBUG} has its blocks`).toBeAttached();
}

const sideways = (/** @type {import('@playwright/test').Page} */ page) =>
  page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth);

test.describe('the content, with or without JavaScript', () => {
  test('has the four groups in order, and a block with its header for every element and component of the sources', async ({ page }) => {
    await open(page);
    const groups = await page.locator('[data-debug-group]').evaluateAll((els) => els.map((el) => el.getAttribute('data-debug-group')));
    expect(groups).toEqual(['html', 'objects', 'core', 'catalog']);
    const count = (/** @type {string} */ group) => page.locator(`[data-debug-group="${group}"] [data-debug-block]`).count();
    expect(await count('html')).toBe(htmlElements().length);
    expect(await count('core')).toBeGreaterThanOrEqual(corePages().length);
    expect(await count('catalog')).toBeGreaterThanOrEqual(catalogPages().length);
    expect(await count('objects')).toBeGreaterThan(0);
    // The header of a block is on screen, with its three parts
    for (const [group, name] of [['html', 'blockquote'], ['core', 'button'], ['catalog', 'faq']]) {
      const block = page.locator(`[data-debug-group="${group}"] [data-debug-block][data-debug-name="${name}"]`);
      await expect(block.locator('.debug-block__name'), `${name}: name`).toBeVisible();
      await expect(block.locator('.debug-block__file'), `${name}: file`).toBeVisible();
      await expect(block.locator('a.debug-block__docs'), `${name}: link`).toBeVisible();
    }
  });

  test('shows the demos styled by the packages: a button is a LUZ button, a bare blockquote has style', async ({ page }) => {
    await open(page);
    const button = page.locator('[data-debug-block][data-debug-name="button"] .luz-btn').first();
    await expect(button).toBeVisible();
    expect(await button.evaluate((el) => getComputedStyle(el).minHeight), 'luz.css and the tokens are applied').not.toBe('0px');
    const quote = page.locator('[data-debug-group="html"] [data-debug-name="blockquote"] blockquote').first();
    await expect(quote).toBeVisible();
    expect(await quote.evaluate((el) => getComputedStyle(el).borderInlineStartWidth), 'the bare element is styled with no class').not.toBe('0px');
  });

  test('says noindex, nofollow to the robots', async ({ page }) => {
    await open(page);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  });
});

test.describe('width', () => {
  test('has no horizontal scroll at 320 px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await open(page);
    expect(await sideways(page)).toBeLessThanOrEqual(0);
  });
});

test.describe('what it loads', () => {
  test('answers every request with a success and logs no error', async ({ page }) => {
    const failed = [];
    const errors = [];
    page.on('response', (response) => {
      if (response.status() >= 400 && !response.url().endsWith('/favicon.ico')) failed.push(`${response.status()} ${response.url()}`);
    });
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => message.type() === 'error' && !/Failed to load resource/.test(message.text()) && errors.push(message.text()));
    await open(page);
    await page.waitForLoadState('networkidle');
    expect(failed).toEqual([]);
    expect(errors).toEqual([]);
  });
});

test.describe('the index', () => {
  test('links the four groups and every block, and each anchor has its target', async ({ page }) => {
    await open(page);
    const hrefs = await page.locator('[data-debug-index] a[href^="#"]').evaluateAll((els) => els.map((el) => el.getAttribute('href')));
    const targets = await page.locator('[data-debug-group], [data-debug-block]').evaluateAll((els) => els.map((el) => `#${el.id}`));
    expect(targets.length).toBeGreaterThan(4);
    for (const target of targets) expect(hrefs, target).toContain(target);
    for (const href of hrefs) expect(await page.locator(`[id="${href.slice(1)}"]`).count(), `${href} has a target`).toBe(1);
  });

  test('takes the reader to a block with its anchor', async ({ page }) => {
    await open(page);
    const id = await page.locator('[data-debug-group="catalog"]').getAttribute('id');
    const href = `#${id}`;
    const link = page.locator(`[data-debug-index] a[href="${href}"]`).first();
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    // The window may scroll smoothly: wait for it to arrive
    await expect
      .poll(() => page.locator(`[id="${id}"]`).evaluate((el) => Math.abs(el.getBoundingClientRect().top)), { message: 'the group is at the top of the window' })
      .toBeLessThan(200);
  });
});

test.describe('the links to the docs', () => {
  test('every block links a page that exists, root-absolute', async ({ page }) => {
    test.setTimeout(180_000);
    await open(page);
    const hrefs = await page.locator('a.debug-block__docs').evaluateAll((els) => els.map((el) => el.getAttribute('href') ?? ''));
    expect(hrefs.length).toBeGreaterThan(htmlElements().length);
    const routes = [...new Set(hrefs.map((href) => href.split('#')[0]))];
    for (const route of routes) expect(route, 'root-absolute with a trailing slash').toMatch(/^\/docs\/[a-z0-9/-]+\/$/);
    const bad = [];
    for (let i = 0; i < routes.length; i += 8) {
      await Promise.all(
        routes.slice(i, i + 8).map(async (route) => {
          const response = await page.request.get(route);
          if (response.status() !== 200) bad.push(`${response.status()} ${route}`);
        }),
      );
    }
    expect(bad).toEqual([]);
  });
});

test.describe('ids', () => {
  test('has no id twice in the page', async ({ page }) => {
    await open(page);
    const repeated = await page.evaluate(() => {
      const seen = new Map();
      for (const el of document.querySelectorAll('[id]')) seen.set(el.id, (seen.get(el.id) ?? 0) + 1);
      return [...seen].filter(([, n]) => n > 1).map(([id]) => id);
    });
    expect(repeated).toEqual([]);
  });

  test('keeps the modal working: its button opens its own dialog, and Escape closes it', async ({ page }) => {
    await open(page);
    const block = page.locator('[data-debug-block][data-debug-name="modal"]');
    await block.scrollIntoViewIfNeeded();
    const opener = block.locator('button[commandfor]').first();
    await opener.click();
    const dialog = block.locator('dialog.luz-modal');
    await expect(dialog).toBeVisible();
    await expect(dialog, 'it labels itself with its own title').toHaveAccessibleName(/delete this draft/i);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
});

test.describe('the demos with a script', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript');

  test('keeps the tabs working: a tab shows its own panel, found by the id the join gave it', async ({ page }) => {
    await open(page);
    const block = page.locator('[data-debug-block][data-debug-name="tabs"]');
    const tabs = block.locator('.luz-tabs').first().locator('.luz-tab');
    await tabs.nth(1).scrollIntoViewIfNeeded();
    await tabs.nth(1).click();
    const second = await tabs.nth(1).getAttribute('href');
    const first = await tabs.nth(0).getAttribute('href');
    expect(second).toMatch(/^#/);
    await expect(page.locator(`[id="${second?.slice(1)}"]`)).toBeVisible();
    await expect(page.locator(`[id="${first?.slice(1)}"]`)).toBeHidden();
  });

  test('loads catalog.js: the timeline element of its block is defined by its lazy chunk', async ({ page }) => {
    await open(page);
    expect(await page.locator('[data-debug-block][data-debug-name="timeline"] luz-timeline').count(), 'the timeline demo is on the page').toBeGreaterThan(0);
    await page.waitForFunction(() => customElements.get('luz-timeline') !== undefined, undefined, { timeout: 15_000 });
  });
});

test.describe('the controls', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'the controls are a script');

  test('the mode selector sets data-theme on <html> and the colours follow', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    const select = page.locator('select[data-debug-mode]');
    const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const seen = new Map();
    for (const mode of ['light', 'dark', 'high-contrast']) {
      await select.selectOption(mode);
      await expect(page.locator('html')).toHaveAttribute('data-theme', mode);
      seen.set(mode, await background());
    }
    expect(seen.get('dark'), 'dark is not light').not.toBe(seen.get('light'));
    expect(seen.get('high-contrast'), 'high contrast is not light').not.toBe(seen.get('light'));
  });

  test('the dir toggle sets dir="rtl" on <html> and gives it back', async ({ page }) => {
    await open(page);
    const toggle = page.locator('input[data-debug-rtl]');
    await toggle.check();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    expect(await page.evaluate(() => getComputedStyle(document.body).direction)).toBe('rtl');
    await toggle.uncheck();
    await expect(page.locator('html')).not.toHaveAttribute('dir', 'rtl');
    expect(await page.evaluate(() => getComputedStyle(document.body).direction)).toBe('ltr');
  });
});
