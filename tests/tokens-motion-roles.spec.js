/**
 * LUZ — motion, typography roles and breakpoints live in @luz-ds/tokens.
 *
 * A page that loads packages/tokens/dist/luz-tokens.css and nothing else
 * (tests/fixtures/tokens-roles.html) has the six durations, the five
 * easings, the six breakpoints and the three roles; under
 * prefers-reduced-motion: reduce every duration is 0s; on lang="ar" the
 * heading and body faces are the sans. A theme in luz.themes beats the
 * default role. The values are those core's settings declared before the move.
 * The source-level half is tests/tokens-motion-roles.test.js.
 */
import { test, expect } from '@playwright/test';

const FIXTURE = '/tests/fixtures/tokens-roles.html';

const DURATIONS = { instant: '0.05s', fast: '0.1s', base: '0.2s', slow: '0.3s', slower: '0.5s', lazy: '0.8s' };
const EASINGS = {
  standard: 'cubic-bezier(0.3, 0, 0.1, 1)',
  enter: 'cubic-bezier(0.15, 0.6, 0.3, 1)',
  exit: 'cubic-bezier(0.5, 0, 0.85, 0.4)',
  spring: 'cubic-bezier(0.3, 1.35, 0.55, 1)',
  linear: 'linear',
};
const BREAKPOINTS = { sm: '640px', md: '768px', lg: '1024px', xl: '1280px', xxl: '1536px', xxxl: '1920px' };

/** The computed value of a custom property on an element, as the browser writes it. */
const prop = (page, selector, name) =>
  page.locator(selector).evaluate((el, n) => getComputedStyle(el).getPropertyValue(n).trim(), name);

/** What a stack resolves to: a probe element's font-family, so a var() chain is followed to the end. */
const stackOf = (page, selector, name) =>
  page.locator(selector).evaluate((el, n) => {
    const probe = document.createElement('span');
    probe.style.fontFamily = `var(${n})`;
    el.append(probe);
    const value = getComputedStyle(probe).fontFamily;
    probe.remove();
    return value;
  }, name);

test.describe('tokens alone carry motion, roles and breakpoints', () => {
  test('the six durations, the five easings and the six breakpoints have the values core settings used to give them', async ({ page }) => {
    await page.goto(FIXTURE);
    for (const [step, value] of Object.entries(DURATIONS)) expect(await prop(page, 'html', `--luz-duration-${step}`), `--luz-duration-${step}`).toBe(value);
    for (const [name, value] of Object.entries(EASINGS)) expect(await prop(page, 'html', `--luz-easing-${name}`), `--luz-easing-${name}`).toBe(value);
    for (const [name, value] of Object.entries(BREAKPOINTS)) expect(await prop(page, 'html', `--luz-mq-${name}`), `--luz-mq-${name}`).toBe(value);
  });

  test('the roles: the serif for headings and running text, and the body size a step above the base', async ({ page }) => {
    await page.goto(FIXTURE);
    const serif = await stackOf(page, '#probe', '--luz-font-serif');
    expect(serif).toContain('ET Book');
    expect(await stackOf(page, '#probe', '--luz-font-heading')).toBe(serif);
    expect(await stackOf(page, '#probe', '--luz-font-body')).toBe(serif);
    // 1.0625 × the 16px base: 17px
    const body = await page.locator('#probe').evaluate((el) => {
      const probe = document.createElement('span');
      probe.style.fontSize = 'var(--luz-text-body)';
      el.append(probe);
      const px = getComputedStyle(probe).fontSize;
      probe.remove();
      return px;
    });
    expect(body).toBe('17px');
  });

  test('prefers-reduced-motion: reduce makes every duration 0s and leaves the easings as they are', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(FIXTURE);
    for (const step of Object.keys(DURATIONS)) expect(await prop(page, 'html', `--luz-duration-${step}`), `--luz-duration-${step}`).toBe('0s');
    for (const [name, value] of Object.entries(EASINGS)) expect(await prop(page, 'html', `--luz-easing-${name}`), `--luz-easing-${name}`).toBe(value);
  });

  test('without the reduced-motion preference the durations are not zero', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(FIXTURE);
    expect(await prop(page, 'html', '--luz-duration-base')).toBe(DURATIONS.base);
  });

  test('lang="ar" takes the sans for headings and running text; other languages keep the serif', async ({ page }) => {
    await page.goto(FIXTURE);
    const sans = await stackOf(page, '#probe', '--luz-font-sans');
    const serif = await stackOf(page, '#probe', '--luz-font-serif');
    expect(sans).not.toBe(serif);
    for (const name of ['--luz-font-heading', '--luz-font-body']) {
      expect(await stackOf(page, '#ar-child', name), `${name} on lang="ar"`).toBe(sans);
      expect(await stackOf(page, '#fr-child', name), `${name} on lang="fr"`).toBe(serif);
      expect(await stackOf(page, '#probe', name), `${name} on lang="en"`).toBe(serif);
    }
  });

  test('a page whose <html> is lang="ar" takes the sans too', async ({ page }) => {
    await page.goto(FIXTURE);
    await page.evaluate(() => { document.documentElement.lang = 'ar'; });
    const sans = await stackOf(page, '#probe', '--luz-font-sans');
    for (const name of ['--luz-font-heading', '--luz-font-body']) expect(await stackOf(page, '#probe', name), name).toBe(sans);
  });

  test("a rule of the consumer's own, outside LUZ's layers, still beats the Arabic switch", async ({ page }) => {
    await page.goto(FIXTURE);
    expect(await stackOf(page, '#ar-child', '--luz-font-body'), 'the switch is in effect first').toBe(await stackOf(page, '#probe', '--luz-font-sans'));
    await page.addStyleTag({ content: ':lang(ar) { --luz-font-body: monospace; }' });
    expect(await stackOf(page, '#ar-child', '--luz-font-body')).toBe('monospace');
  });

  test("the Arabic switch has specificity 0: a later rule of any specificity in the same layer replaces it", async ({ page }) => {
    await page.goto(FIXTURE);
    expect(await stackOf(page, '#ar-child', '--luz-font-body'), 'the switch is in effect first').toBe(await stackOf(page, '#probe', '--luz-font-sans'));
    await page.addStyleTag({ content: '@layer luz.tokens { * { --luz-font-body: monospace; } }' });
    expect(await stackOf(page, '#ar-child', '--luz-font-body')).toBe('monospace');
  });

  test('a theme in luz.themes that sets --luz-font-body wins over the default', async ({ page }) => {
    await page.goto(FIXTURE);
    await page.addStyleTag({ content: '@layer luz.themes { :root { --luz-font-body: monospace; } }' });
    expect(await stackOf(page, '#probe', '--luz-font-body')).toBe('monospace');
    // the role it did not touch is the default
    expect(await stackOf(page, '#probe', '--luz-font-heading')).toBe(await stackOf(page, '#probe', '--luz-font-serif'));
  });

  test('with core loaded too, a theme in luz.themes still wins: core settings no longer sit after the themes', async ({ page }) => {
    await page.goto('/tests/fixtures/level-2-core.html');
    await page.addStyleTag({ content: '@layer luz.themes { :root { --luz-font-body: monospace; --luz-font-heading: monospace; } }' });
    expect(await stackOf(page, 'body', '--luz-font-body')).toBe('monospace');
    expect(await stackOf(page, 'body', '--luz-font-heading')).toBe('monospace');
  });
});
