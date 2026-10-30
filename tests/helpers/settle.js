/**
 * Wait until the page has stopped animating: every running CSS transition and
 * finite animation has finished (an endless loop is never waited for). Used after a theme flip and before axe, which would
 * otherwise sample a colour mid-transition (Gecko, Safari review 2026-10-16:
 * `#6fb1ec` on `#5e5441` at t=0 of the banner's transition) and report a
 * contrast failure that the settled page does not have.
 * @param {import('@playwright/test').Page} page
 */
export async function settled(page) {
  await page.evaluate(async () => {
    for (let round = 0; round < 10; round++) {
      // only rendered targets: Firefox keeps animations of closed <details> and hidden dialogs 'running' for good;
      // and only finite ones: an endless loop (the header's prism, the rain) never finishes, so it never settles
      const running = document.getAnimations().filter((a) => (a.playState === 'running' || a.playState === 'pending') && a.effect?.target?.checkVisibility?.() !== false && a.effect?.getComputedTiming?.().iterations !== Infinity);
      if (!running.length) break;
      await Promise.allSettled(running.map((a) => a.finished));
    }
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

/**
 * Wait until the colour fade of the page has ended: the CSS transitions on
 * <html> (apps/site/theme-light.css fades the colour tokens for 1.4 s when
 * motion is welcome). Unlike `settled`, it does not wait for an infinite
 * animation elsewhere on the page (a spinner), so it is safe on any page.
 * @param {import('@playwright/test').Page} page
 */
export async function faded(page) {
  await page.evaluate(async () => {
    for (let round = 0; round < 10; round++) {
      const running = document.documentElement.getAnimations().filter((a) => a.playState === 'running' || a.playState === 'pending');
      if (!running.length) break;
      await Promise.allSettled(running.map((a) => a.finished));
    }
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

/**
 * Wait for the network to go quiet, for at most 5 seconds. `networkidle` is
 * not a promise: under load (three workers on the hosted runner, with a dev
 * server that is busy too) it can stay unreported for a minute although every
 * request is done, and WebKit's driver sometimes never reports it on the Button
 * page of the docs (Safari review 2026-10-17, probed with Playwright's WebKit:
 * the page loads, no request is left, `networkidle` still times out in about
 * one load in two). So the wait is bounded in every engine and the fonts are
 * awaited as a condition that does settle; the expectations that follow do the
 * rest of the waiting.
 * @param {import('@playwright/test').Page} page
 */
export async function idle(page) {
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
}
