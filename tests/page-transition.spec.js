/* global addEventListener -- runs in the page, inside addInitScript() */
/**
 * The page transition of @luz-ds/catalog (`components/page-transition.css`; .claude/plans/component-gaps.md, section 6):
 * a stylesheet with no class, no tag and no script. Two pages of the docs that both link it fade into one another when
 * the visitor follows a link, in Chromium (Chrome 126+, Edge, Safari 18.2; Firefox navigates as before).
 *
 *   motion allowed   `pageswap` fires with a `viewTransition`, and the pictures of the root are timed by the motion tokens
 *   reduced motion   `pageswap` has none: nothing starts, the page changes as it always did
 *   the mode         `data-mode` is the same in `pageswap` (the page that leaves) and in `pagereveal` (the page that arrives)
 *   focus            lands where it would without the sheet: the skip link is the first stop, and it works
 *   the 404          does not link the sheet
 *
 * `pagereveal` is not asserted to carry a transition: the browser skips a transition now and then on localhost, with
 * no server delay to wait for. The rest is static (the page and the sheet are CSS), so the first group runs in
 * `chromium` and in `chromium-nojs` alike (playwright.config.js: `'**\/page-transition.spec.js'` in the `testMatch` of
 * `chromium-nojs`); what needs script (events, computed styles of the pictures, focus after a click, axe) is skipped there.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MODES } from './helpers/design-tokens.js';
import { faded } from './helpers/settle.js';
import { seedMode } from './helpers/site-lights.js';

const fromRepo = (/** @type {string} */ path) => fileURLToPath(new URL(`../${path}`, import.meta.url));
const read = (/** @type {string} */ path) => readFileSync(fromRepo(path), 'utf-8');

const FROM = '/docs/catalog/page-transition/';
const TO = '/docs/catalog/search/';
const SHEET = 'page-transition.css';
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const jsOff = () => test.info().project.use.javaScriptEnabled === false;

/* ---- The motion tokens the sheet reads, taken from the sheet and the tokens ---------------------- */

// (a sheet that does not exist yet reads as empty: the tests below then fail on the missing token, not on the import)
const sheet = (existsSync(fromRepo('packages/catalog/src/components/page-transition.css')) ? read('packages/catalog/src/components/page-transition.css') : '').replace(/\/\*[\s\S]*?\*\//g, '');
const durationToken = /animation-duration:\s*var\((--luz-duration-[a-z0-9-]+)\)/.exec(sheet)?.[1];
const easingToken = /animation-timing-function:\s*var\((--luz-easing-[a-z0-9-]+)\)/.exec(sheet)?.[1];
const tokensCss = read('packages/tokens/dist/luz-tokens.css');
const tokenValue = (/** @type {string | undefined} */ name) => {
  const match = name ? new RegExp(`${name}:\\s*([^;]+);`).exec(tokensCss) : null;
  return match ? match[1].replace(/\/\*.*?\*\//g, '').trim() : null;
};
/** "0.2s" or "200ms" in milliseconds. */
const ms = (/** @type {string} */ time) => (time.endsWith('ms') ? parseFloat(time) : parseFloat(time) * 1000);
const squeeze = (/** @type {string} */ text) => text.replace(/\s+/g, '');

/* ---- What the pages record ---------------------------------------------------------------------- */

/**
 * Runs in every document of the tab, before its own scripts: what `pageswap` (the page that leaves) and `pagereveal`
 * (the page that arrives) see, kept in sessionStorage across the navigation, and when the transition is over.
 */
function record() {
  const put = (/** @type {string} */ key, /** @type {unknown} */ value) => {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* nothing to record in */
    }
  };
  const mode = () => document.documentElement.getAttribute('data-mode');
  addEventListener('pageswap', (/** @type {any} */ event) => put('vt:swap', { path: location.pathname, transition: !!event.viewTransition, mode: mode() }));
  addEventListener('pagereveal', (/** @type {any} */ event) => {
    put('vt:reveal', { path: location.pathname, mode: mode() });
    sessionStorage.removeItem('vt:done');
    const done = () => sessionStorage.setItem('vt:done', location.pathname);
    if (event.viewTransition) event.viewTransition.finished.then(done, done);
    else done();
  });
}

const recorded = (/** @type {import('@playwright/test').Page} */ page, /** @type {string} */ key) =>
  page.evaluate((k) => JSON.parse(sessionStorage.getItem(k) ?? 'null'), key);

/** Open FROM, follow the link to TO as a visitor does, and wait until the page that arrived is settled. */
async function follow(/** @type {import('@playwright/test').Page} */ page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(FROM);
  await expect(page.locator('h1.docs-title'), 'the page of the page transition exists').toHaveText('Page transition');
  await page.locator(`nav.luz-docs-nav a[href="${TO}"]`).first().evaluate((a) => /** @type {HTMLElement} */ (a).click());
  await page.waitForURL(`**${TO}`);
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('vt:done')), { message: 'the transition, if there is one, is over' }).toBe(TO);
}

/* ---- Without script: the sheet is CSS ----------------------------------------------------------- */

test.describe('the sheet works without script: it is a stylesheet that two pages link', () => {
  test('the docs page links the sheet and serves it, with the at-rule and the media query that holds it', async ({ request }) => {
    const html = await (await request.get(FROM)).text();
    const tags = [...html.matchAll(/<link\b[^>]*>/g)].map((m) => m[0]).filter((tag) => tag.includes(SHEET));
    expect(tags, 'one <link> of the sheet').toHaveLength(1);
    const href = /href="([^"]+)"/.exec(tags[0])?.[1] ?? '';
    const css = await (await request.get(href)).text();
    expect(squeeze(css)).toContain('@media(prefers-reduced-motion:no-preference)');
    // (the dev server wraps a stylesheet in a module: the at-rule is still in the text, with its one declaration)
    expect(squeeze(css)).toContain('@view-transition');
    expect(squeeze(css)).toContain('navigation:auto');
  });

  test('the page the visitor leaves and the page they arrive at both link it', async ({ request }) => {
    for (const path of [FROM, TO, '/docs/', '/docs/catalog/announcement/', '/']) {
      const html = await (await request.get(path)).text();
      expect(html, `${path} links the sheet`).toContain(SHEET);
    }
  });

  test('the 404 does not link it, nor does it run a script that could', async ({ request }) => {
    const response = await request.get('/404.html');
    const html = await response.text();
    expect(html, 'the 404 page').toContain('<html');
    expect(html).not.toContain(SHEET);
  });
});

/* ---- Motion allowed ------------------------------------------------------------------------------ */

test.describe('motion allowed: a view transition starts when a visitor follows a link', () => {
  test.use({ reducedMotion: 'no-preference' });

  for (const mode of MODES) {
    test(`${mode}: \`pageswap\` carries a viewTransition, and data-mode is ${mode} in \`pageswap\` and in \`pagereveal\` (no flash of another mode)`, async ({ page }) => {
      test.skip(jsOff(), 'the events need script to be read');
      await seedMode(page, mode);
      await page.addInitScript(record);
      await follow(page);
      const swap = await recorded(page, 'vt:swap');
      const reveal = await recorded(page, 'vt:reveal');
      expect(swap, 'pageswap fired on the page that left').not.toBeNull();
      expect(swap.path).toBe(FROM);
      expect(swap.transition, 'a view transition was ready when the page left').toBe(true);
      expect(reveal.path, 'pagereveal fired on the page that arrived').toBe(TO);
      expect(swap.mode, 'the page that leaves is in the stored mode').toBe(mode);
      expect(reveal.mode, 'the page that arrives is in the same mode when it is first revealed').toBe(swap.mode);
    });
  }

  test('the pictures of the root are timed by the motion tokens the sheet names: the base duration and the standard easing, on the group, the old and the new picture', async ({ page }) => {
    test.skip(jsOff(), 'the timing is read from the computed style of the pictures');
    expect(durationToken, 'the sheet names a duration token').toBeTruthy();
    expect(easingToken, 'the sheet names an easing token').toBeTruthy();
    const duration = tokenValue(durationToken);
    const easing = tokenValue(easingToken);
    expect(duration, `${durationToken} in the tokens`).toBeTruthy();
    expect(easing, `${easingToken} in the tokens`).toBeTruthy();
    await page.goto(FROM);
    await expect(page.locator('h1.docs-title'), 'the page of the page transition exists').toHaveText('Page transition');
    const pictures = await page.evaluate(async () => {
      // A transition of the same document has the same pictures; the update callback does nothing, so the pictures stay
      const transition = document.startViewTransition(() => {});
      await transition.ready;
      const read = (/** @type {string} */ pseudo) => {
        const style = getComputedStyle(document.documentElement, pseudo);
        return { duration: style.animationDuration, easing: style.animationTimingFunction };
      };
      const out = { group: read('::view-transition-group(root)'), old: read('::view-transition-old(root)'), new: read('::view-transition-new(root)') };
      transition.skipTransition();
      return out;
    });
    for (const [name, style] of Object.entries(pictures)) {
      expect(ms(style.duration), `${name}: ${durationToken} (${duration})`).toBeCloseTo(ms(/** @type {string} */ (duration)), 3);
      expect(squeeze(style.easing), `${name}: ${easingToken} (${easing})`).toBe(squeeze(/** @type {string} */ (easing)));
    }
  });

  test('the token for the time is the one the docs say: 200 ms is what the base duration resolves to in the page', async ({ page }) => {
    test.skip(jsOff(), 'reads a custom property from the computed style');
    expect(durationToken, 'the sheet names a duration token').toBeTruthy();
    await page.goto(FROM);
    await expect(page.locator('h1.docs-title'), 'the page of the page transition exists').toHaveText('Page transition');
    const [inPage, inTokens] = [await page.evaluate((name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim(), /** @type {string} */ (durationToken)), tokenValue(durationToken)];
    expect(ms(inPage)).toBe(ms(/** @type {string} */ inTokens));
  });
});

/* ---- Reduced motion ------------------------------------------------------------------------------ */

test.describe('reduced motion: nothing starts, the page changes as it always did', () => {
  test.use({ reducedMotion: 'reduce' });

  for (const mode of ['light', 'dark']) {
    test(`${mode}: \`pageswap\` has no viewTransition, the page arrives, and the mode is the same on both sides`, async ({ page }) => {
      test.skip(jsOff(), 'the events need script to be read');
      await seedMode(page, mode);
      await page.addInitScript(record);
      await follow(page);
      const swap = await recorded(page, 'vt:swap');
      const reveal = await recorded(page, 'vt:reveal');
      expect(swap.path).toBe(FROM);
      expect(swap.transition, 'no view transition under reduced motion').toBe(false);
      expect(reveal.path).toBe(TO);
      expect(reveal.mode).toBe(swap.mode);
      expect(swap.mode).toBe(mode);
      await expect(page.locator('h1')).toBeVisible();
    });
  }

  test('the media query is what stops it: with motion allowed on the same navigation there is one', async ({ page }) => {
    test.skip(jsOff(), 'the events need script to be read');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.addInitScript(record);
    await follow(page);
    expect((await recorded(page, 'vt:swap')).transition).toBe(true);
  });
});

/* ---- Focus and the skip link --------------------------------------------------------------------- */

test.describe('focus and the skip link after a page change are what they are without the sheet', () => {
  test.use({ reducedMotion: 'no-preference' });

  /** Follow the link, then Tab once and press Enter on what has the focus. With `without`, the sheet is not loaded at all. */
  async function afterNavigation(/** @type {import('@playwright/test').Page} */ page, /** @type {boolean} */ without) {
    if (without) await page.route(`**/${SHEET}`, (route) => route.abort());
    await page.addInitScript(record);
    await follow(page);
    const start = await page.evaluate(() => document.activeElement?.tagName);
    await page.keyboard.press('Tab');
    const first = await page.evaluate(() => ({ cls: document.activeElement?.className, text: document.activeElement?.textContent?.trim() }));
    await page.keyboard.press('Enter');
    const after = await page.evaluate(() => ({ hash: location.hash, id: document.activeElement?.id }));
    return { start, first, after };
  }

  test('the focus starts on the document, the first Tab stop is the skip link, and Enter on it moves the focus to the main content', async ({ page, browser }) => {
    test.skip(jsOff(), 'drives the page with the keyboard after a click');
    const withSheet = await afterNavigation(page, false);
    expect(withSheet.start, 'nothing took the focus when the page changed').toBe('BODY');
    expect(withSheet.first.cls).toContain('luz-skip-link');
    expect(withSheet.after).toEqual({ hash: '#main-content', id: 'main-content' });

    // The same, in a context that never loads the sheet: the result is the same
    const context = await browser.newContext({ reducedMotion: 'no-preference', storageState: test.info().project.use.storageState });
    try {
      const other = await context.newPage();
      const withoutSheet = await afterNavigation(other, true);
      expect(withSheet).toEqual(withoutSheet);
    } finally {
      await context.close();
    }
  });
});

/* ---- axe ---------------------------------------------------------------------------------------- */

test.describe('axe on the new docs page', () => {
  for (const mode of MODES) {
    test(`axe finds nothing serious in ${mode}`, async ({ page }) => {
      test.skip(jsOff(), 'axe needs JavaScript');
      await page.goto(FROM);
      await expect(page.locator('h1.docs-title'), 'the page of the page transition exists').toHaveText('Page transition');
      await page.evaluate((m) => {
        document.documentElement.dataset.theme = m;
      }, mode);
      await faded(page);
      const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
      expect(violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? '')).map((v) => `${v.impact} ${v.id}: ${v.nodes[0]?.target?.join(' ')}`)).toEqual([]);
    });
  }
});
