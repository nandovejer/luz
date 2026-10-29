/**
 * Shared by tests/site-loader.spec.js, tests/search-upgrade.spec.js and
 * tests/search-slot.spec.js: the pages that load catalog.min.js (the presence
 * loader of .claude/plans/specs/f3-package-model.md, section 2.3), and the
 * tools to hold its two triggers (idle, the network) and to count layout
 * shifts.
 */

/** A page with a <luz-search> and a <luz-cookie-consent>, loading catalog.min.js. */
export const PAGE = '/tests/fixtures/site-loader.html';
/** The same loader, and neither element. */
export const EMPTY = '/tests/fixtures/site-loader-empty.html';
/** The same loader and a <luz-theme-time> around core's <luz-theme-mode>, and neither of the others. */
export const MODE_PAGE = '/tests/fixtures/site-loader-mode.html';

export const SEARCH_CHUNK = /\/search\.min\.js(\?.*)?$/;
export const CONSENT_CHUNK = /\/cookie-consent\.min\.js(\?.*)?$/;
export const MODE_CHUNK = /\/theme-time\.min\.js(\?.*)?$/;
/** The slider of the day: only a <luz-theme-time variant="bar"> loads it. */
export const BAR_CHUNK = /\/theme-time-bar\.min\.js(\?.*)?$/;

/**
 * Hold idle: requestIdleCallback only queues. Call before page.goto().
 * Release it with releaseIdle(). (Safari has no requestIdleCallback, so the
 * loader feature-detects it; the test replaces the one that Chromium has.)
 */
export const holdIdle = (page) =>
  page.addInitScript(() => {
    window.__idle = [];
    window.requestIdleCallback = (callback) => window.__idle.push(callback);
  });

export const releaseIdle = (page) =>
  page.evaluate(() => {
    for (const callback of window.__idle.splice(0)) callback({ didTimeout: false, timeRemaining: () => 50 });
  });

/**
 * Hold the requests that match `url` until the returned function is called.
 * @returns {Promise<() => void>} the release
 */
export async function hold(page, url) {
  let release;
  const gate = new Promise((resolve) => (release = resolve));
  await page.route(url, async (route) => {
    await gate;
    await route.continue();
  });
  return release;
}

/** The chunks the page requests, in order: "search", "cookie-consent", "theme-time", "theme-time-bar". Filled as the page runs. */
export function chunkRequests(page) {
  const seen = [];
  page.on('request', (request) => {
    if (SEARCH_CHUNK.test(request.url())) seen.push('search');
    if (CONSENT_CHUNK.test(request.url())) seen.push('cookie-consent');
    if (MODE_CHUNK.test(request.url())) seen.push('theme-time');
    if (BAR_CHUNK.test(request.url())) seen.push('theme-time-bar');
  });
  return seen;
}

/** Whether the element has been defined (a chunk ran). */
export const isDefined = (page, tag = 'luz-search') => page.evaluate((name) => !!customElements.get(name), tag);

/** Layout shifts (Chromium): call before page.goto(), read with layoutShift(). */
export const watchLayoutShift = (page) =>
  page.addInitScript(() => {
    window.__shift = 0;
    new window.PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__shift += entry.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });

/** The sum of the layout shifts since the page began. */
export const layoutShift = (page) => page.evaluate(() => window.__shift);

/** The box of <luz-search>: { width, height }. */
export const slotBox = (page) =>
  page.locator('luz-search').evaluate((el) => {
    const { width, height } = el.getBoundingClientRect();
    return { width, height };
  });

/** Resolve a CSS length (`var(--luz-control-lg)`) to pixels, in the page. */
export const px = (page, expression) =>
  page.evaluate((value) => {
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;visibility:hidden;inline-size:${value}`;
    document.body.append(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();
    return width;
  }, expression);
