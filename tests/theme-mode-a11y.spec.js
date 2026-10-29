// @ts-check
/**
 * <luz-theme-mode>: accessibility (WCAG 2.2 AA) and the media features, in the
 * three modes, with the button and with the radios (the script blocked, or
 * JavaScript off).
 *
 *  - axe (wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa), on the fixtures, which
 *    wrap the element in <main>;
 *  - contrast, measured on what the browser draws, with the engine of
 *    tests/helpers/design-tokens.js: the icon of the button 3:1, the text of the
 *    options 4.5:1, in light, dark and high contrast;
 *  - the name of the button, "legend: label", and the 44 px target;
 *  - forced colours (the checked option uses Highlight), reduced motion, and
 *    320 px at 200 % text with nothing to scroll sideways;
 *  - 2.4.11 (focus not obscured) with the cookie band (<luz-cookie-consent>) at
 *    the same corner.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { MODES } from './helpers/design-tokens.js';
import { over, parseColor, ratio } from '../packages/tokens/lib/contrast.js';

const PAGE = '/tests/fixtures/theme-mode.html';
const BANNER = '/tests/fixtures/theme-mode-banner.html';
const BUTTON = 'luz-theme-mode .luz-theme-mode__button';
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const LABEL = { light: 'Light', dark: 'Dark', 'high-contrast': 'High contrast' };

/** The chunk does not arrive: the radios are what the page has. */
const withRadios = (page) => page.route('**/theme-mode.min.js', (route) => route.abort());

/** Choose a mode with the button (the script is on) or with the label (it is not). */
async function choose(page, mode, { button = true } = {}) {
  if (button) {
    const target = LABEL[mode];
    for (let i = 0; i < 4 && !(await page.locator(BUTTON).getAttribute('aria-label'))?.endsWith(target); i++) await page.locator(BUTTON).click();
    await expect(page.locator(BUTTON)).toHaveAccessibleName(`Color mode: ${target}`);
  } else {
    await page.locator('.luz-theme-mode__option', { hasText: LABEL[mode] }).click();
  }
}

/** The colour of an element and the colour it sits on, as drawn: [foreground, background], opaque. */
async function colours(page, selector, { of = 'color' } = {}) {
  const raw = await page.locator(selector).first().evaluate((el, prop) => {
    const chain = [];
    for (let n = el; n; n = n.parentElement) chain.push(getComputedStyle(n).backgroundColor);
    return { fg: getComputedStyle(el)[prop], chain };
  }, of);
  let back = parseColor('#fff');
  // The page background is the root's, or the body's
  for (const bg of raw.chain.reverse()) back = over(parseColor(bg), back);
  return { fg: over(parseColor(raw.fg), back), back };
}

test.describe('with the button', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript');

  test('the name is "legend: label" and the button is a button, 44 px', async ({ page }) => {
    await page.goto(PAGE);
    const button = page.getByRole('button', { name: 'Color mode: Auto' });
    await expect(button).toHaveCount(1);
    await button.click();
    await expect(page.getByRole('button', { name: 'Color mode: Light' })).toHaveCount(1);
    const box = await page.getByRole('button', { name: 'Color mode: Light' }).boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });

  test('the image inside is hidden from the accessibility tree: the name is the label alone', async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.locator(`${BUTTON} svg`)).toHaveAttribute('aria-hidden', 'true');
    expect(await page.locator(BUTTON).evaluate((el) => el.textContent?.trim())).toBe('');
  });

  test('has no axe violations in light, dark and high contrast', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(PAGE);
    await expect(page.locator(BUTTON)).toBeVisible();
    for (const mode of MODES) {
      await choose(page, mode);
      const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      expect(violations, mode).toEqual([]);
    }
  });

  test('has no axe violations on a custom theme, inline, in a right-to-left page', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/tests/fixtures/theme-mode-brand.html');
    await expect(page.locator(BUTTON)).toBeVisible();
    for (const mode of MODES) {
      await choose(page, mode);
      const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      expect(violations, `brand, ${mode}`).toEqual([]);
    }
    await page.goto(`${PAGE}?inline&dir=rtl`);
    await expect(page.locator(BUTTON)).toBeVisible();
    expect((await new AxeBuilder({ page }).withTags(TAGS).analyze()).violations).toEqual([]);
  });

  for (const mode of MODES) {
    test(`the icon of the button is 3:1 on the button in ${mode}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(PAGE);
      await expect(page.locator(BUTTON)).toBeVisible();
      await choose(page, mode);
      const { fg, back } = await colours(page, BUTTON);
      expect(ratio(fg, back), `${mode}: icon on button`).toBeGreaterThanOrEqual(3);
    });
  }

  test('keeps a border and no motion in forced colours and reduced motion', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await page.goto(PAGE);
    const look = await page.locator(BUTTON).evaluate((el) => {
      const s = getComputedStyle(el);
      return { style: s.borderTopStyle, width: parseFloat(s.borderTopWidth), transition: s.transitionDuration };
    });
    expect(look.style).not.toBe('none');
    expect(look.width).toBeGreaterThanOrEqual(1);
    expect(look.transition.split(',').every((d) => parseFloat(d) === 0), `transition-duration ${look.transition}`).toBe(true);
  });

  test('reduced motion: nothing about the button or the page moves', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(PAGE);
    const durations = await page.locator(BUTTON).evaluate((el) => [getComputedStyle(el).transitionDuration, getComputedStyle(el).animationDuration]);
    for (const list of durations) expect(list.split(',').every((d) => parseFloat(d) === 0), list).toBe(true);
  });

  test('at 320 px and 200 % text there is nothing to scroll sideways, and the button is inside the window', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(PAGE);
    await expect(page.locator(BUTTON)).toBeVisible();
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    const fit = await page.evaluate(() => {
      const r = document.querySelector('.luz-theme-mode__button').getBoundingClientRect();
      return { scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth, inside: r.left >= 0 && r.right <= window.innerWidth && r.top >= 0 && r.bottom <= window.innerHeight };
    });
    expect(fit.scroll).toBeLessThanOrEqual(fit.client);
    expect(fit.inside).toBe(true);
  });
});

test.describe('with the radios, the script blocked', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript (the no-JS page is below)');

  test('have no axe violations in light, dark and high contrast', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await withRadios(page);
    await page.goto(PAGE);
    await expect(page.locator('.luz-theme-mode__option')).toHaveCount(4);
    for (const mode of MODES) {
      await choose(page, mode, { button: false });
      const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      expect(violations, mode).toEqual([]);
    }
  });

  for (const mode of MODES) {
    test(`the text of the options is 4.5:1 in ${mode}, the checked one and the others`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await withRadios(page);
      await page.goto(PAGE);
      await choose(page, mode, { button: false });
      const options = page.locator('.luz-theme-mode__option');
      for (let i = 0; i < 4; i++) {
        expect(await options.nth(i).evaluate((el) => getComputedStyle(el).borderTopStyle), `option ${i} is drawn as an option`).toBe('solid');
        const { fg, back } = await colours(page, `.luz-theme-mode__option >> nth=${i}`);
        expect(ratio(fg, back), `${mode}: option ${i}`).toBeGreaterThanOrEqual(4.5);
      }
      expect(await options.count()).toBe(4);
      const legend = await colours(page, '.luz-theme-mode__legend');
      expect(ratio(legend.fg, legend.back), `${mode}: legend`).toBeGreaterThanOrEqual(4.5);
    });
  }

  test('forced colours: the checked option is drawn with Highlight', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await withRadios(page);
    await page.goto(PAGE);
    await page.locator('.luz-theme-mode__option', { hasText: 'Dark' }).click();
    const look = await page.evaluate(() => {
      const probe = (value, prop) => {
        const el = document.createElement('i');
        el.style[prop] = value;
        document.body.append(el);
        const out = getComputedStyle(el)[prop];
        el.remove();
        return out;
      };
      const options = [...document.querySelectorAll('.luz-theme-mode__option')];
      const on = options.find((o) => o.querySelector('input:checked'));
      const off = options.find((o) => !o.querySelector('input:checked'));
      return {
        highlight: probe('Highlight', 'backgroundColor'),
        highlightText: probe('HighlightText', 'color'),
        onBg: getComputedStyle(on).backgroundColor,
        onColor: getComputedStyle(on).color,
        onBorder: getComputedStyle(on).borderTopColor,
        offBg: getComputedStyle(off).backgroundColor,
      };
    });
    expect(look.onBg).toBe(look.highlight);
    expect(look.onColor).toBe(look.highlightText);
    expect(look.onBorder).toBe(look.highlight);
    expect(look.offBg).not.toBe(look.highlight);
  });

  test('at 320 px and 200 % text the radios leave nothing to scroll sideways', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await withRadios(page);
    await page.goto(PAGE);
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    const { scroll, client } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(scroll).toBeLessThanOrEqual(client);
  });

  test('the focus ring of an option is 2 px, 2 px away', async ({ page }) => {
    await withRadios(page);
    await page.goto(PAGE);
    await page.locator('#before').focus();
    await page.keyboard.press('Tab');
    const ring = await page.locator('.luz-theme-mode__option').first().evaluate((el) => {
      const s = getComputedStyle(el);
      return { style: s.outlineStyle, width: parseFloat(s.outlineWidth), offset: parseFloat(s.outlineOffset) };
    });
    expect(ring.style).not.toBe('none');
    expect([ring.width, ring.offset]).toEqual([2, 2]);
  });
});

test.describe('with no script at all', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'axe needs a script; luz.min.js is blocked instead, which leaves the markup and CSS of a page with JavaScript off');

  test('the radios have no axe violations in light, dark and high contrast', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.route('**/luz.min.js', (route) => route.abort());
    await page.goto(PAGE);
    expect(await page.evaluate(() => document.querySelectorAll('.luz-theme-mode__button').length)).toBe(0);
    for (const mode of MODES) {
      await choose(page, mode, { button: false });
      const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      expect(violations, mode).toEqual([]);
    }
  });
});

test.describe('the cookie band at the same corner (WCAG 2.4.11)', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript');

  /** Tab through the page: the stops that nothing but something else is drawn over. */
  async function covered(page) {
    const found = [];
    let stops = 0;
    await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
    for (let i = 0; i < 160; i++) {
      await page.keyboard.press('Tab');
      const seen = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        if (el.closest('luz-cookie-consent')) return { band: true };
        const r = el.getBoundingClientRect();
        let free = 0;
        for (const fx of [0.1, 0.5, 0.9]) {
          for (const fy of [0.1, 0.5, 0.9]) {
            const hit = document.elementFromPoint(r.left + r.width * fx, r.top + r.height * fy);
            if (hit && (hit === el || el.contains(hit))) free++;
          }
        }
        return { band: false, id: el.id || el.className || el.localName, free };
      });
      if (!seen) break;
      if (seen.band) continue;
      stops++;
      if (seen.free === 0) found.push(seen.id);
    }
    return { found, stops };
  }

  for (const [width, dir] of /** @type {const} */ ([[1280, 'ltr'], [1280, 'rtl'], [320, 'ltr']])) {
    test(`no Tab stop is covered by the band or the button at ${width} px, ${dir}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize({ width, height: 800 });
      await page.goto(`${BANNER}${dir === 'rtl' ? '?dir=rtl' : ''}`);
      await expect(page.locator(BUTTON)).toBeVisible();
      await expect(page.locator('#consent')).toBeVisible();
      const { found, stops } = await covered(page);
      expect(stops, 'the page has Tab stops').toBeGreaterThanOrEqual(10);
      expect(found).toEqual([]);
    });
  }

  test('the button rides above the band and never overlaps it', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(BANNER);
    await expect(page.locator(BUTTON)).toBeVisible();
    await expect(page.locator('#consent')).toBeVisible();
    const gap = await page.evaluate(() => {
      const band = document.getElementById('consent').getBoundingClientRect();
      const button = document.querySelector('.luz-theme-mode__button').getBoundingClientRect();
      return band.top - button.bottom;
    });
    expect(gap).toBeGreaterThanOrEqual(0);
    await page.click('#accept');
    await page.click('#close');
    await expect(page.locator('#consent')).toBeHidden();
    const bottom = await page.locator(BUTTON).evaluate((el) => window.innerHeight - el.getBoundingClientRect().bottom);
    expect(bottom, 'back in the corner').toBeLessThan(gap + 200);
    expect(bottom).toBeGreaterThan(0);
  });
});
