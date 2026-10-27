// @ts-check
/**
 * Mode switcher, cycle variant (.luz-mode-switcher--cycle): one button
 * that steps through the radios with JavaScript, the radios without it.
 *
 * F6 of .claude/plans/ai-and-catalog-only.md (decisions 39 to 45): the button
 * is the round one of the home and the docs, 44 px (--luz-control-lg) on
 * --luz-surface with a --luz-divider hairline, and with scripting it is fixed
 * at the end corner of the window (bottom left in a right-to-left page) above
 * the content and below the sidebar, the dialogs and the toasts.
 * .luz-mode-switcher--inline keeps it in the flow. Without scripting the
 * radios stay in the flow. With no radio checked its name says Auto.
 * Its place next to the cookie band is tests/mode-consent.spec.js.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { MODES } from './helpers/design-tokens.js';
import { focusAndHitTest } from './helpers/obscured.js';
import { settled } from './helpers/settle.js';

const FIXTURE = '/tests/fixtures/mode-cycle.html';

test.describe('Mode switcher, cycle variant', () => {
  test('one named button replaces the three radios', async ({ page }) => {
    await page.goto(FIXTURE);
    const button = page.locator('.luz-mode-cycle');
    await expect(button).toHaveCount(1);
    await expect(button).toHaveAccessibleName('Change color mode. Current: Light');
    await expect(page.locator('.luz-mode-btn').first()).toBeHidden();
    await expect(button.locator('[data-icon="sun"]')).toHaveCount(1);
  });

  test('each press checks the next mode, wraps around and announces it', async ({ page }) => {
    await page.goto(FIXTURE);
    const button = page.locator('.luz-mode-cycle');
    const status = page.locator('.luz-mode-cycle__status');
    const steps = [
      ['dark', 'Dark', 'moon'],
      ['high-contrast', 'High contrast', 'contrast'],
      ['light', 'Light', 'sun'],
    ];
    for (const [value, label, icon] of steps) {
      await button.click();
      await expect(page.locator(`input[value="${value}"]`)).toBeChecked();
      await expect(button).toHaveAccessibleName(`Change color mode. Current: ${label}`);
      await expect(button.locator(`[data-icon="${icon}"]`)).toHaveCount(1);
      await expect(status).toHaveText(`Color mode: ${label}`);
    }
  });

  test('the checked radio re-scopes the page tokens', async ({ page }) => {
    await page.goto(FIXTURE);
    const bg = () => page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--luz-surface-page').trim());
    const light = await bg();
    await page.locator('.luz-mode-cycle').click();
    expect(await bg()).not.toBe(light);
  });

  test('works from the keyboard', async ({ page }) => {
    await page.goto(FIXTURE);
    await page.keyboard.press('Tab');
    await expect(page.locator('.luz-mode-cycle')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('input[value="dark"]')).toBeChecked();
    await page.keyboard.press('Space');
    await expect(page.locator('input[value="high-contrast"]')).toBeChecked();
  });

  test('follows a mode set by another script', async ({ page }) => {
    await page.goto(FIXTURE);
    await page.evaluate(() => {
      document.querySelector('input[value="dark"]').checked = true;
      document.documentElement.dataset.theme = 'dark';
    });
    await expect(page.locator('.luz-mode-cycle')).toHaveAccessibleName('Change color mode. Current: Dark');
  });

  test('init twice adds one button', async ({ page }) => {
    await page.goto(FIXTURE);
    await page.evaluate(async () => (await import('/packages/core/dist/theme.js')).initThemeCycle());
    await expect(page.locator('.luz-mode-cycle')).toHaveCount(1);
  });

  test('a button already in the markup is wired, and gets a status if it has none', async ({ page }) => {
    await page.goto(FIXTURE);
    await page.evaluate(async () => {
      const group = document.querySelector('.luz-mode-switcher--cycle').cloneNode(true);
      group.querySelector('.luz-mode-cycle__status').remove();
      group.querySelectorAll('input').forEach((input) => { input.name = 'other'; });
      group.id = 'shipped';
      document.querySelector('main').append(group);
      (await import('/packages/core/dist/theme.js')).initThemeCycle();
    });
    const group = page.locator('#shipped');
    await expect(group.locator('.luz-mode-cycle')).toHaveCount(1);
    await expect(group.locator('.luz-mode-cycle__status')).toHaveCount(1);
    await group.locator('.luz-mode-cycle').click();
    await expect(group.locator('input[value="dark"]')).toBeChecked();
    await expect(group.locator('.luz-mode-cycle__status')).toHaveText('Color mode: Dark');
  });

  test('has no axe violations', async ({ page }) => {
    await page.goto(FIXTURE);
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations).toEqual([]);
  });
});

test.describe('Mode switcher, cycle variant, without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the three radios stay usable', async ({ page }) => {
    await page.goto(FIXTURE);
    await expect(page.locator('.luz-mode-cycle')).toHaveCount(0);
    await expect(page.locator('.luz-mode-btn')).toHaveCount(3);
    await page.locator('label.luz-mode-btn', { hasText: 'Dark' }).click();
    await expect(page.locator('input[value="dark"]')).toBeChecked();
  });
});

/* ---- F6: the round button, fixed at the end corner ----------------------- */

/** A CSS value as the browser resolves it: set `property` to `value` on a probe and read it back. */
const resolved = (page, property, value) => page.evaluate(([p, v]) => {
  const probe = document.createElement('div');
  probe.style.setProperty(p, v);
  document.body.append(probe);
  const out = getComputedStyle(probe).getPropertyValue(p);
  probe.remove();
  return out;
}, [property, value]);

/** Choose a mode the way another script does: the radio and data-theme. */
const setMode = (page, value) => page.evaluate((mode) => {
  document.querySelector(`input[value="${mode}"]`).checked = true;
  document.documentElement.dataset.theme = mode;
}, value);

/** The window room a fixed button needs: its size and a margin on each side. */
const room = (page) => resolved(page, 'inline-size', 'calc(var(--luz-control-lg) + var(--luz-space-md) * 2)').then(parseFloat);

/** A page long enough to scroll, with a link at the end corner half way down. */
const longPage = (page) => page.evaluate(() => {
  const main = document.querySelector('main');
  main.insertAdjacentHTML('beforeend', '<div style="block-size: 300vh"></div>');
  document.body.insertAdjacentHTML('beforeend', '<a id="corner" href="#corner" style="position: absolute; inset-inline-end: 0; inset-block-start: 150vh">A link at the end corner</a>');
});

const box = (locator) => locator.evaluate((el) => {
  const r = el.getBoundingClientRect();
  return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
});

test.describe('Mode switcher, the round button', () => {
  test('is a circle of --luz-control-lg, at least 24 px, with no corner outside the circle', async ({ page }) => {
    await page.goto(FIXTURE);
    const button = page.locator('.luz-mode-cycle');
    const side = parseFloat(await resolved(page, 'inline-size', 'var(--luz-control-lg)'));
    const b = await box(button);
    expect(b.width).toBeCloseTo(side, 1);
    expect(b.height).toBeCloseTo(side, 1);
    expect(side).toBeGreaterThanOrEqual(24);
    const radius = await button.evaluate((el) => getComputedStyle(el).borderTopLeftRadius);
    const full = radius.endsWith('%') ? parseFloat(radius) >= 50 : parseFloat(radius) >= b.width / 2;
    expect(full, `border-radius ${radius}`).toBe(true);
    // Hit testing follows the rounded shape: the centre is the button, the corner of its box is not
    const hits = await button.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const at = (x, y) => document.elementFromPoint(x, y);
      return { centre: el.contains(at(r.left + r.width / 2, r.top + r.height / 2)), corner: el.contains(at(r.left + 1, r.top + 1)) };
    });
    expect(hits).toEqual({ centre: true, corner: false });
  });

  test('takes the surface, the hairline, the shadow and the icon colour of the tokens, in the three modes', async ({ page }) => {
    await page.goto(FIXTURE);
    const button = page.locator('.luz-mode-cycle');
    for (const mode of MODES) {
      await setMode(page, mode);
      await settled(page);
      const look = await button.evaluate((el) => {
        const s = getComputedStyle(el);
        return { bg: s.backgroundColor, border: s.borderTopColor, width: s.borderTopWidth, style: s.borderTopStyle, shadow: s.boxShadow, color: s.color };
      });
      expect(look.bg, `${mode} background`).toBe(await resolved(page, 'background-color', 'var(--luz-surface)'));
      expect(look.border, `${mode} border colour`).toBe(await resolved(page, 'border-top-color', 'var(--luz-divider)'));
      expect([look.width, look.style], `${mode} border`).toEqual(['1px', 'solid']);
      expect(look.shadow, `${mode} shadow`).toBe(await resolved(page, 'box-shadow', 'var(--luz-shadow-sm)'));
      expect(look.color, `${mode} icon`).toBe(await resolved(page, 'color', 'var(--luz-text-secondary)'));
    }
  });

  test('steps to --luz-surface-hover on hover', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(FIXTURE);
    const button = page.locator('.luz-mode-cycle');
    await button.hover();
    await expect.poll(() => button.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(await resolved(page, 'background-color', 'var(--luz-surface-hover)'));
  });

  test('the colours go through --luz-switcher-cycle-bg, -border and -text of the group', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(FIXTURE);
    const group = page.locator('.luz-mode-switcher--cycle');
    const button = page.locator('.luz-mode-cycle');
    await group.evaluate((el) => {
      el.style.setProperty('--luz-switcher-cycle-bg', 'rgb(1, 2, 3)');
      el.style.setProperty('--luz-switcher-cycle-border', 'rgb(4, 5, 6)');
      el.style.setProperty('--luz-switcher-cycle-text', 'rgb(7, 8, 9)');
    });
    const look = await button.evaluate((el) => {
      const s = getComputedStyle(el);
      return { bg: s.backgroundColor, border: s.borderTopColor, color: s.color };
    });
    expect(look).toEqual({ bg: 'rgb(1, 2, 3)', border: 'rgb(4, 5, 6)', color: 'rgb(7, 8, 9)' });
  });

  test('disabled, as a specimen: a dashed border and no hover', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(FIXTURE);
    await page.locator('.luz-mode-switcher--cycle').evaluate((el) => { el.disabled = true; });
    const button = page.locator('.luz-mode-cycle');
    const before = await button.evaluate((el) => getComputedStyle(el).backgroundColor);
    await button.hover({ force: true });
    const after = await button.evaluate((el) => { const s = getComputedStyle(el); return { bg: s.backgroundColor, style: s.borderTopStyle }; });
    expect(after.style).toBe('dashed');
    expect(after.bg).toBe(before);
  });

  test('keeps a border in forced colors and has no motion when it is reduced', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await page.goto(FIXTURE);
    const look = await page.locator('.luz-mode-cycle').evaluate((el) => {
      const s = getComputedStyle(el);
      return { style: s.borderTopStyle, width: parseFloat(s.borderTopWidth), colour: s.borderTopColor, transition: s.transitionDuration };
    });
    expect(look.style).not.toBe('none');
    expect(look.width).toBeGreaterThanOrEqual(1);
    expect(look.colour, 'a system colour, not transparent').not.toMatch(/^rgba\(0, 0, 0, 0\)$/);
    expect(look.transition.split(',').every((d) => parseFloat(d) === 0), `transition-duration ${look.transition}`).toBe(true);
  });

  test('has no axe violations in the three modes', async ({ page }) => {
    await page.goto(FIXTURE);
    for (const mode of MODES) {
      await setMode(page, mode);
      await settled(page);
      const { violations } = await new AxeBuilder({ page }).analyze();
      expect(violations, mode).toEqual([]);
    }
  });

  test('at 320 px the page does not scroll sideways and the button is inside the window', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(FIXTURE);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    const b = await box(page.locator('.luz-mode-cycle'));
    expect(b.left).toBeGreaterThanOrEqual(0);
    expect(b.right).toBeLessThanOrEqual(320);
    expect(b.bottom).toBeLessThanOrEqual(640);
  });
});

test.describe('Mode switcher, fixed at the end corner', () => {
  test('with scripting the group is fixed at --luz-space-md from the bottom and the end, before and after scrolling', async ({ page }) => {
    await page.goto(FIXTURE);
    await longPage(page);
    const margin = parseFloat(await resolved(page, 'inline-size', 'var(--luz-space-md)'));
    const button = page.locator('.luz-mode-cycle');
    await expect(page.locator('.luz-mode-switcher--cycle')).toHaveCSS('position', 'fixed');
    for (const y of [0, 600]) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      const b = await box(button);
      const view = await page.evaluate(() => ({ w: document.documentElement.clientWidth, h: window.innerHeight }));
      expect(view.h - b.bottom, `bottom gap at ${y}`).toBeCloseTo(margin, 0);
      expect(view.w - b.right, `end gap at ${y}`).toBeCloseTo(margin, 0);
    }
  });

  test('in a right-to-left page it is at the bottom left', async ({ page }) => {
    await page.goto(FIXTURE);
    await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
    const margin = parseFloat(await resolved(page, 'inline-size', 'var(--luz-space-md)'));
    const b = await box(page.locator('.luz-mode-cycle'));
    const view = await page.evaluate(() => ({ h: window.innerHeight }));
    expect(b.left).toBeCloseTo(margin, 0);
    expect(view.h - b.bottom).toBeCloseTo(margin, 0);
  });

  test('is above the content (--luz-z-raised) and below the sidebar, the dialogs and the toasts', async ({ page }) => {
    await page.goto(FIXTURE);
    const z = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const token = (name) => parseInt(root.getPropertyValue(name), 10);
      return { own: getComputedStyle(document.querySelector('.luz-mode-switcher--cycle')).zIndex, raised: token('--luz-z-raised'), sidebar: token('--luz-z-sidebar'), modal: token('--luz-z-modal'), toast: token('--luz-z-toast') };
    });
    expect(Number(z.own)).toBe(z.raised);
    expect(z.raised).toBeLessThan(z.sidebar);
    expect(z.sidebar).toBeLessThan(z.modal);
    expect(z.modal).toBeLessThan(z.toast);
  });

  test('a layer at the level of the sidebar, and an open modal, are drawn over it', async ({ page }) => {
    await page.goto(FIXTURE);
    const button = page.locator('.luz-mode-cycle');
    const centre = async () => {
      const b = await box(button);
      return page.evaluate(([x, y]) => {
        const hit = document.elementFromPoint(x, y);
        return hit?.closest('.luz-mode-cycle') ? 'button' : (hit?.id || hit?.localName);
      }, [b.left + b.width / 2, b.top + b.height / 2]);
    };
    expect(await centre()).toBe('button');
    await page.evaluate(() => {
      document.body.insertAdjacentHTML('beforeend', '<div id="layer" style="position: fixed; inset: 0; z-index: var(--luz-z-sidebar)"></div>');
    });
    expect(await centre()).toBe('layer');
    await page.evaluate(() => {
      document.getElementById('layer').remove();
      document.body.insertAdjacentHTML('beforeend', '<dialog class="luz-modal" id="dialog" aria-label="A dialog"><button type="button" id="dialog-close">Close</button></dialog>');
      document.getElementById('dialog').showModal();
    });
    expect(await centre(), 'the modal and its backdrop').not.toBe('button');
  });

  test('the window keeps scroll-padding-block-end for it: its size and a margin each side', async ({ page }) => {
    await page.goto(FIXTURE);
    const padding = await page.evaluate(() => getComputedStyle(document.documentElement).scrollPaddingBlockEnd);
    expect(parseFloat(padding), `scroll-padding-block-end ${padding}`).toBeGreaterThanOrEqual(await room(page));
  });

  test('a link at the end corner that Tab reaches is not covered by it', async ({ page }) => {
    // Reduced motion: the window scrolls to the focused link at once, not smoothly
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(FIXTURE);
    await longPage(page);
    for (const dir of ['ltr', 'rtl']) {
      await page.evaluate((d) => { document.activeElement?.blur(); document.documentElement.dir = d; window.scrollTo(0, 0); }, dir);
      const seen = await focusAndHitTest(page.locator('#corner'));
      expect(seen.focused, dir).toBe(true);
      expect(seen.covered, `${dir}: what is drawn over the link`).toEqual([]);
    }
  });

  test('with .luz-mode-switcher--inline it stays where the markup puts it, round, with no shadow and no fixed place', async ({ page }) => {
    await page.goto(FIXTURE);
    const group = page.locator('.luz-mode-switcher--cycle');
    await group.evaluate((el) => el.classList.add('luz-mode-switcher--inline'));
    const position = await group.evaluate((el) => getComputedStyle(el).position);
    expect(['static', 'relative']).toContain(position);
    const inside = await page.evaluate(() => {
      const g = document.querySelector('.luz-mode-switcher--cycle').getBoundingClientRect();
      const m = document.querySelector('main').getBoundingClientRect();
      return g.top >= m.top && g.bottom <= m.bottom + 1;
    });
    expect(inside, 'the group is inside <main>').toBe(true);
    const button = page.locator('.luz-mode-cycle');
    const side = parseFloat(await resolved(page, 'inline-size', 'var(--luz-control-lg)'));
    const b = await box(button);
    expect([b.width, b.height]).toEqual([side, side]);
    await expect(button).toHaveCSS('box-shadow', 'none');
    await expect(button).toHaveCSS('border-top-width', '1px');
  });

  test('the legend stays the name of the group but is not seen while the button shows', async ({ page }) => {
    await page.goto(FIXTURE);
    const legend = page.locator('.luz-mode-switcher__label');
    const b = await box(legend);
    expect(b.width).toBeLessThanOrEqual(1);
    expect(b.height).toBeLessThanOrEqual(1);
    await expect(page.locator('.luz-mode-switcher--cycle')).toHaveAccessibleName('Color mode');
  });
});

test.describe('Mode switcher, cycle variant, named Auto when no mode is chosen', () => {
  test('with no radio checked the name says Current: Auto, and a chosen mode names itself again', async ({ page }) => {
    await page.goto(FIXTURE);
    const button = page.locator('.luz-mode-cycle');
    await page.locator('.luz-mode-switcher--cycle').evaluate((group) => {
      group.querySelectorAll('input').forEach((input) => { input.checked = false; });
      group.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(button).toHaveAccessibleName('Change color mode. Current: Auto');
    await button.click();
    await expect(button).toHaveAccessibleName('Change color mode. Current: Light');
    await button.click();
    await expect(button).toHaveAccessibleName('Change color mode. Current: Dark');
  });

  test('the word comes from data-luz-label-mode-auto on the page', async ({ page }) => {
    await page.goto(FIXTURE);
    await page.evaluate(() => document.body.setAttribute('data-luz-label-mode-auto', 'Automatisch'));
    await page.locator('.luz-mode-switcher--cycle').evaluate((group) => {
      group.querySelectorAll('input').forEach((input) => { input.checked = false; });
      group.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(page.locator('.luz-mode-cycle')).toHaveAccessibleName('Change color mode. Current: Automatisch');
  });
});

test.describe('Mode switcher, cycle variant, the radios without JavaScript are in the flow', () => {
  test.use({ javaScriptEnabled: false });

  test('the group is not fixed, the three radios and the legend are seen where the markup puts them', async ({ page }) => {
    await page.goto(FIXTURE);
    const group = page.locator('.luz-mode-switcher--cycle');
    expect(['static', 'relative']).toContain(await group.evaluate((el) => getComputedStyle(el).position));
    const inside = await page.evaluate(() => {
      const m = document.querySelector('main').getBoundingClientRect();
      return [...document.querySelectorAll('.luz-mode-switcher--cycle .luz-mode-btn, .luz-mode-switcher__label')].map((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 1 && r.height > 1 && r.top >= m.top && r.bottom <= m.bottom + 1;
      });
    });
    expect(inside).toEqual([true, true, true, true]);
    await expect(page.locator('.luz-mode-btn').first()).toBeVisible();
  });
});
