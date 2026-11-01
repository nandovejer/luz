// @ts-check
/**
 * The "beta v<version>" badge (.site-badge, apps/site/header.css) beside the word LUZ is one line and sits whole
 * inside the link to the home, in the header and in the home's footer. Its padding is a length, never a share of
 * the box around it: a share is resolved after the box was sized to its content, so it took the room of the text
 * (the badge broke into two lines, "beta" over the version) and pushed the badge past its link's edge, which in the
 * header squeezed the prism of the mark to 9.5 px. Without JavaScript it is the same markup, so this runs in both
 * projects.
 */
import { test, expect } from '@playwright/test';

const HEADER = 'header.site-header .site-header__brand';
const FOOTER = 'footer .landing-brand__home';

/** The badge, its link and the tops of its two words, by selector of the link. */
async function measure(page, link) {
  return page.locator(link).evaluate((a) => {
    const badge = a.querySelector('.site-badge');
    if (!badge) return null;
    const b = badge.getBoundingClientRect();
    const l = a.getBoundingClientRect();
    return {
      badge: { left: b.left, right: b.right, width: b.width, height: b.height },
      link: { left: l.left, right: l.right },
      tops: [...badge.children].map((s) => Math.round(s.getBoundingClientRect().top)),
      overflow: badge.scrollWidth - badge.clientWidth,
    };
  });
}

function expectWhole(found, where) {
  expect(found, `${where}: a badge`).not.toBeNull();
  expect(new Set(found.tops).size, `${where}: "beta" and the version are on one line (${found.tops})`).toBe(1);
  expect(found.badge.height, `${where}: one line is a short pill, ${found.badge.height}px`).toBeLessThanOrEqual(22);
  expect(found.overflow, `${where}: nothing of the text is clipped`).toBeLessThanOrEqual(0);
  expect(found.badge.left, `${where}: inside its link, at the start`).toBeGreaterThanOrEqual(found.link.left - 0.5);
  expect(found.badge.right, `${where}: inside its link, at the end`).toBeLessThanOrEqual(found.link.right + 0.5);
}

for (const path of ['/', '/es/', '/ar/', '/docs/']) {
  for (const width of [1280, 375]) {
    test(`${path} at ${width}px: the header's badge is one line and inside its link`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(path);
      expectWhole(await measure(page, HEADER), `header ${path}`);
    });
  }
}

for (const path of ['/', '/es/', '/ar/']) {
  for (const width of [1280, 375, 320]) {
    test(`${path} at ${width}px: the footer's badge is one line and inside its link`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(path);
      expectWhole(await measure(page, FOOTER), `footer ${path}`);
    });
  }
}
