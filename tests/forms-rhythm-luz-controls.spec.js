// @ts-check
/**
 * The space between bare controls (elements/forms.css, "The space between
 * controls") is for the bare elements. A control that carries a `luz-*` class
 * is a component and keeps its own spacing: in a row with a gap, a
 * `.luz-check-item` or a `.luz-btn` after another control must not start lower
 * than the first one because of the margin the bare rhythm would add.
 *
 * The same holds in luz.conditional.css inside [data-luz]. The fixtures have no
 * script, so the spec also runs with JavaScript off (playwright.config.js).
 */
import { test, expect } from '@playwright/test';

const FIXTURES = {
  'luz.css': '/tests/fixtures/forms-rhythm.html',
  'luz.conditional.css in [data-luz]': '/tests/fixtures/forms-rhythm-conditional.html',
};

/** What `margin-block-start: var(--token)` computes to next to the element. */
const tokenPx = (page, selector, token) =>
  page.locator(selector).evaluate((el, name) => {
    const probe = document.createElement('span');
    probe.style.setProperty('margin-block-start', `var(${name})`);
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    el.parentElement.append(probe);
    const computed = getComputedStyle(probe).getPropertyValue('margin-block-start');
    probe.remove();
    return computed;
  }, token);

const marginTop = (page, selector) => page.locator(selector).evaluate((el) => getComputedStyle(el).marginBlockStart);
const top = (page, selector) => page.locator(selector).evaluate((el) => el.getBoundingClientRect().top);

for (const [name, url] of Object.entries(FIXTURES)) {
  test.describe(name, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(url);
    });

    const COMPONENTS = [
      ['a bare label then .luz-check-item', '#a1', '#b1'],
      ['a bare fieldset then .luz-btn', '#a2', '#b2'],
      ['a bare text field then .luz-btn.luz-btn--primary', '#a3', '#b3'],
      ['.luz-check-item then .luz-check-item', '#a4', '#b4'],
      ['a bare label then .luz-check-item in an .o-row', '#a5', '#b5'],
    ];

    for (const [label, first, second] of COMPONENTS) {
      test(`${label}: the component has no margin of the bare rhythm and the row is aligned`, async ({ page }) => {
        expect(await marginTop(page, second), 'the margin-block-start of the component').toBe('0px');
        const gap = Math.abs((await top(page, second)) - (await top(page, first)));
        expect(gap, 'the difference between the tops of the items of the row').toBeLessThanOrEqual(0.5);
      });
    }

    test('a bare text field then a bare button keeps one step (--luz-space-md) below', async ({ page }) => {
      expect(await marginTop(page, '#d1')).toBe(await tokenPx(page, '#d1', '--luz-space-md'));
      expect(await marginTop(page, '#d1')).not.toBe('0px');
    });

    test('a bare text field then a bare label keeps one step (--luz-space-md) below', async ({ page }) => {
      expect(await marginTop(page, '#d2')).toBe(await tokenPx(page, '#d2', '--luz-space-md'));
    });

    test('two bare checkbox labels: the second starts --luz-space-xs below the first', async ({ page }) => {
      const xs = await tokenPx(page, '#d3', '--luz-space-xs');
      expect(await marginTop(page, '#d3')).toBe(xs);
      expect((await top(page, '#d3')) - (await top(page, '#c3'))).toBeCloseTo(Number.parseFloat(xs), 1);
    });

    test('a class without "luz-" (site-field, site-button) is the consumer\'s: the rhythm stays', async ({ page }) => {
      expect(await marginTop(page, '#d4')).toBe(await tokenPx(page, '#d4', '--luz-space-md'));
      expect(await marginTop(page, '#d5')).toBe(await tokenPx(page, '#d5', '--luz-space-md'));
    });
  });
}
