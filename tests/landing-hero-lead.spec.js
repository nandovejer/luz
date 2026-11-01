// @ts-check
/**
 * Two things of the home's first screen and the page's rhythm, in English, Spanish and Arabic.
 *
 * The lead of the hero spells the name out: "... start a project with LUZ, the Light, Usable and Zero-dependency
 * design system, or migrate it page by page ...". The four words LUZ, Light, Usable and Zero-dependency are <strong>
 * (weight 600, the strong ink); "Zero-dependency" never breaks at its hyphen; there are no parentheses. Spanish and
 * Arabic keep the three words in English (lang="en").
 *
 * The sections of the home stand four times the package's gap apart (4 x --luz-space-3xl, 256 px at the default size).
 *
 * Runs with and without JavaScript: it is the page's CSS.
 */
import { test, expect } from '@playwright/test';

const ROUTES = [['/', 'en'], ['/es/', 'es'], ['/ar/', 'ar']];
const WORDS = ['LUZ', 'Light', 'Usable', 'Zero-dependency'];

for (const [route, code] of ROUTES) {
  test.describe(`the lead of ${route}`, () => {
    test('has four strong words, in the strong ink at weight 600, and no parentheses', async ({ page }) => {
      await page.goto(route);
      const strong = page.locator('.luz-hero__lead strong');
      await expect(strong).toHaveText(WORDS);
      const found = await strong.evaluateAll((all) => {
        const probe = document.createElement('span');
        probe.style.color = 'var(--luz-text-primary)';
        document.body.append(probe);
        const ink = getComputedStyle(probe).color;
        probe.remove();
        return all.map((el) => ({ weight: Number(getComputedStyle(el).fontWeight), color: getComputedStyle(el).color, ink }));
      });
      for (const word of found) {
        expect(word.weight).toBe(600);
        expect(word.color).toBe(word.ink);
      }
      const text = await page.locator('.luz-hero__lead').innerText();
      expect(text).not.toMatch(/[()]/);
    });

    test('keeps Zero-dependency whole: it is never split at its hyphen, at 320, 375 and 700 px', async ({ page }) => {
      for (const width of [320, 375, 700, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route);
        const word = page.locator('.luz-hero__lead strong', { hasText: 'Zero-dependency' });
        const lines = await word.evaluate((el) => new Set([...el.getClientRects()].map((r) => Math.round(r.top))).size);
        expect(lines, `${width}px: one line`).toBe(1);
      }
    });

    if (code !== 'en') {
      test('keeps LUZ\'s three words in English: lang="en" around Light, Usable and Zero-dependency', async ({ page }) => {
        await page.goto(route);
        const english = page.locator('.luz-hero__lead [lang="en"]');
        await expect(english).toHaveCount(1);
        await expect(english.locator('strong')).toHaveText(['Light', 'Usable', 'Zero-dependency']);
      });
    }
  });
}

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the lead keeps its four strong words', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.luz-hero__lead strong')).toHaveText(WORDS);
  });
});

test.describe('the gap between the sections', () => {
  for (const width of [375, 1280]) {
    test(`${width}px: the sections of the home are 4 x --luz-space-3xl apart`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      const found = await page.locator('.landing-wrap').first().evaluate((wrap) => {
        const probe = document.createElement('div');
        probe.style.cssText = 'position:absolute;inline-size:var(--luz-space-3xl)';
        wrap.append(probe);
        const unit = probe.getBoundingClientRect().width;
        probe.remove();
        return { gap: parseFloat(getComputedStyle(wrap).rowGap), unit };
      });
      expect(found.unit).toBeGreaterThan(0);
      expect(found.gap).toBeCloseTo(found.unit * 4, 1);
    });
  }

  test('at the default text size and 1280 px it is 256 px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    const gap = await page.locator('.landing-wrap').first().evaluate((wrap) => parseFloat(getComputedStyle(wrap).rowGap));
    expect(gap).toBe(256);
  });

  test('two neighbouring sections stand that far apart on the page', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    const gaps = await page.locator('.landing-wrap').first().evaluate((wrap) => {
      const sections = [...wrap.children].filter((el) => getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0);
      const out = [];
      for (let i = 1; i < sections.length; i++) out.push(Math.round(sections[i].getBoundingClientRect().top - sections[i - 1].getBoundingClientRect().bottom));
      return out;
    });
    expect(gaps.length).toBeGreaterThan(5);
    expect(gaps.filter((gap) => gap === 256).length, `gaps ${gaps}`).toBeGreaterThanOrEqual(gaps.length - 2);
  });
});
