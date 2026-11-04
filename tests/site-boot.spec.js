// @ts-check
/**
 * core's theme-boot.js and catalog's theme-time-boot.js in the browser (F2 of .claude/plans/luz-home-docs-identity.md,
 * section 3.4; EX-009). The rules are checked one by one in tests/site-boot.test.js:
 * here the real pages.
 *
 *   - a stored choice is on <html> before any module of the page has run, so
 *     the first frame is the visitor's mode;
 *   - with no choice, Auto is the system's (owner, 2026-11-04): the clock decides
 *     nothing, so data-theme is the system's mode and data-moment its default
 *     moment (afternoon over light, night over dark or high contrast), on the home
 *     page and on the docs; the radio checked is that mode, not Auto;
 *   - an hour pinned (`luz-light`, as the slider of the home leaves it) is the
 *     moment of that hour, with Auto checked, over any system;
 *   - the served HTML says nothing of the light: it names no mode on <html> and
 *     checks no radio, so without JavaScript the page follows the system and
 *     core's radios override it, and the scripts are the only writers of
 *     data-moment.
 */
import { test, expect } from '@playwright/test';
import { LIGHTS, NO_CHOICE, TIMEZONE, atTime, colorOf, channels, lightToken, pinHour, seedMode, vejer } from './helpers/site-lights.js';
import { faded, idle } from './helpers/settle.js';

// A fixed zone, so "the local hour" is the same on every machine; and nothing
// stored unless a test seeds it (the project's state does not decide Auto)
test.use({ timezoneId: TIMEZONE, storageState: NO_CHOICE });

const PAGES = ['/', '/docs/'];
// Every module the pages load, except the boot scripts, which is classic
const MODULES = /\/apps\/(?:landing\/landing|docs\/reference|site\/header)\.js/;

/**
 * Record every write to data-theme and data-moment on <html> with the value it
 * replaced (attributeOldValue), so a value written and overwritten in the
 * same task is seen too, and what the parser had at DOMContentLoaded.
 */
const watch = (page) =>
  page.addInitScript(() => {
    const w = /** @type {any} */ (window);
    w.__log = [];
    w.__dcl = null;
    const html = () => document.documentElement;
    new MutationObserver((records) => {
      for (const r of records) if (r.target === document.documentElement) w.__log.push([r.attributeName, r.oldValue]);
    }).observe(document, { attributes: true, subtree: true, attributeOldValue: true, attributeFilter: ['data-theme', 'data-moment'] });
    // The two boot scripts of the <head> write one after the other, in one task, before the first frame: the first
    // value anyone can see is the one <html> has when <body> is inserted. The log starts from there, as the markup served it.
    new MutationObserver((records, observer) => {
      if (!records.some((r) => [...r.addedNodes].some((n) => n.nodeName === 'BODY'))) return;
      w.__log = [['data-theme', html().getAttribute('data-theme')], ['data-moment', html().getAttribute('data-moment')]];
      observer.disconnect();
    }).observe(document, { childList: true, subtree: true });
    document.addEventListener('DOMContentLoaded', () => {
      w.__dcl = [document.documentElement.getAttribute('data-theme'), document.documentElement.getAttribute('data-moment')];
    });
  });

/**
 * Every value an attribute of <html> took after the one the markup served
 * (the first old value), in order, ending with the value it has now. A
 * write of another value, even one corrected in the same task, is in it.
 */
const took = (page, name) =>
  page.evaluate((attribute) => {
    const olds = /** @type {any} */ (window).__log.filter(([a]) => a === attribute).map(([, old]) => old);
    return [...olds.slice(1), document.documentElement.getAttribute(attribute)];
  }, name);
const only = (values) => [...new Set(values)];

const state = (page) =>
  page.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
    light: document.documentElement.getAttribute('data-moment'),
  }));

/** The modules have run: <luz-theme-time> is defined, core has had its turn and the page is quiet. */
async function modulesRan(page) {
  await expect.poll(() => page.evaluate(() => !!customElements.get('luz-theme-time'))).toBe(true);
  await idle(page);
}

/** Resolve when the next change of the system's colour scheme has been delivered to every listener. */
const nextSchemeChange = (page) =>
  page.evaluate(() => {
    /** @type {any} */ (window).__scheme = new Promise((resolve) =>
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => setTimeout(resolve, 100), { once: true }),
    );
  });

test.describe('a stored choice is applied before the first frame', () => {
  for (const path of PAGES) {
    for (const [mode, light] of [['dark', 'night'], ['high-contrast', 'night'], ['light', 'afternoon']]) {
      test(`${path} with ${mode} stored: ${mode}, light ${light}, before any module runs`, async ({ page }) => {
        await watch(page);
        await seedMode(page, mode);
        // Only the boot scripts can have set it: the page's modules never load
        await page.route(MODULES, (route) => route.abort());
        await page.goto(path);
        const dcl = await page.evaluate(() => /** @type {any} */ (window).__dcl);
        expect(dcl, 'on <html> when the parser is done').toEqual([mode, light]);
        // Every value the attributes took, the overwritten ones too: never another mode, even for one task
        expect(only(await took(page, 'data-theme'))).toEqual([mode]);
        expect(only(await took(page, 'data-moment'))).toEqual([light]);
        expect(await state(page)).toEqual({ theme: mode, light });
      });

      test(`${path} with ${mode} stored at the other end of the day: once the modules have run it was never anything else`, async ({ page }) => {
        // The clock says the opposite (afternoon for dark, night for light): the choice wins, and nobody writes the clock's mode, even for a task
        await atTime(page, mode === 'light' ? '23:30' : '14:00');
        await watch(page);
        await seedMode(page, mode);
        await page.goto(path);
        await modulesRan(page);
        expect(only(await took(page, 'data-theme'))).toEqual([mode]);
        expect(only(await took(page, 'data-moment'))).toEqual([light]);
        await expect(page.locator(`input[name="luz-theme-mode"][value="${mode}"]`)).toBeChecked();
      });
    }
  }

  test('a value that is not a mode is no choice: the system decides, at any hour', async ({ page }) => {
    await atTime(page, '09:00');
    await seedMode(page, 'purple');
    await page.route(MODULES, (route) => route.abort());
    await page.goto('/');
    expect(await state(page)).toEqual({ theme: 'light', light: 'afternoon' });
  });

  test('the old key is not read', async ({ page }) => {
    await atTime(page, '09:00');
    await page.addInitScript(() => localStorage.setItem('luz-site-mode', 'dark'));
    await page.route(MODULES, (route) => route.abort());
    await page.goto('/');
    expect(await state(page)).toEqual({ theme: 'light', light: 'afternoon' });
  });
});

/** The hours of the day that were not the afternoon: a clock that decided would show them. */
const OTHER_HOURS = LIGHTS.filter(([light]) => light !== 'afternoon');

test.describe('with no choice, Auto is the system\'s and the clock decides nothing', () => {
  for (const path of PAGES) {
    for (const [light, time] of OTHER_HOURS) {
      test(`${path} at ${time} (${light} by the clock), a light system: light, afternoon, before any module`, async ({ page }) => {
        await atTime(page, time);
        await watch(page);
        await page.route(MODULES, (route) => route.abort());
        await page.goto(path);
        // Before any module: the boot scripts alone
        expect(await page.evaluate(() => /** @type {any} */ (window).__dcl)).toEqual(['light', 'afternoon']);
        expect(await state(page)).toEqual({ theme: 'light', light: 'afternoon' });
      });
    }

    for (const time of ['06:00', '14:00', '21:00', '23:30']) {
      test(`${path} at ${time}, a dark system: dark, night (the stars show), before any module`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: 'dark' });
        await atTime(page, time);
        await watch(page);
        await page.route(MODULES, (route) => route.abort());
        await page.goto(path);
        expect(await page.evaluate(() => /** @type {any} */ (window).__dcl)).toEqual(['dark', 'night']);
        expect(await state(page)).toEqual({ theme: 'dark', light: 'night' });
      });
    }

    test(`${path} at 09:00, a light system, once the modules have run: still light, afternoon, never another value on the way, and Light is the radio checked`, async ({ page }) => {
      await atTime(page, '09:00');
      await watch(page);
      await page.goto(path);
      await modulesRan(page);
      await expect(page.locator('input[name="luz-theme-mode"]:checked'), 'the mode in use is the radio checked, not Auto').toHaveValue('light');
      expect(await state(page)).toEqual({ theme: 'light', light: 'afternoon' });
      // Core's theme module and <luz-theme-time> both run: neither writes another mode, not even for a task
      expect(only(await took(page, 'data-theme'))).toEqual(['light']);
      expect(only(await took(page, 'data-moment'))).toEqual(['afternoon']);
      expect(await page.evaluate(() => localStorage.getItem('luz-theme'))).toBeNull();
    });

    test(`${path} at 14:00, a dark system, once the modules have run: still dark, night, never another value on the way, and Dark is the radio checked`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await atTime(page, '14:00');
      await watch(page);
      await page.goto(path);
      await modulesRan(page);
      await expect(page.locator('input[name="luz-theme-mode"]:checked')).toHaveValue('dark');
      expect(await state(page)).toEqual({ theme: 'dark', light: 'night' });
      expect(only(await took(page, 'data-theme'))).toEqual(['dark']);
      expect(only(await took(page, 'data-moment'))).toEqual(['night']);
      expect(await page.evaluate(() => localStorage.getItem('luz-theme'))).toBeNull();
    });
  }

  test('prefers-contrast: more is the high contrast mode, with the night, at any hour', async ({ page }) => {
    await page.emulateMedia({ contrast: 'more' });
    await atTime(page, '09:00');
    await watch(page);
    await page.route(MODULES, (route) => route.abort());
    await page.goto('/');
    expect(await page.evaluate(() => /** @type {any} */ (window).__dcl)).toEqual(['high-contrast', 'night']);
    expect(await state(page)).toEqual({ theme: 'high-contrast', light: 'night' });
  });

  for (const path of PAGES) {
    test(`${path}: prefers-contrast: more at 09:00 is high contrast, night at <body> insertion and after <luz-theme-time> upgraded, with no flip`, async ({ page }) => {
      await page.emulateMedia({ contrast: 'more' });
      await atTime(page, '09:00');
      await watch(page);
      await page.goto(path);
      await modulesRan(page);
      expect(await page.evaluate(() => /** @type {any} */ (window).__dcl)).toEqual(['high-contrast', 'night']);
      expect(await state(page)).toEqual({ theme: 'high-contrast', light: 'night' });
      expect(only(await took(page, 'data-theme'))).toEqual(['high-contrast']);
      expect(only(await took(page, 'data-moment'))).toEqual(['night']);
      await expect(page.locator('input[name="luz-theme-mode"]:checked'), 'High contrast is the radio checked').toHaveValue('high-contrast');
    });
  }

  test('a stored high-contrast still pins the night under prefers-contrast: more at 09:00', async ({ page }) => {
    await page.emulateMedia({ contrast: 'more' });
    await atTime(page, '09:00');
    await seedMode(page, 'high-contrast');
    await page.route(MODULES, (route) => route.abort());
    await page.goto('/');
    expect(await state(page)).toEqual({ theme: 'high-contrast', light: 'night' });
  });
});

test.describe('an hour pinned (luz-light, as the slider of the home leaves it) is the moment of that hour, in Auto', () => {
  for (const path of PAGES) {
    for (const [light, time, mode] of LIGHTS) {
      test(`${path} pinned at ${time}: ${light}, ${mode}, before any module`, async ({ page }) => {
        await pinHour(page, time);
        await watch(page);
        await page.route(MODULES, (route) => route.abort());
        await page.goto(path);
        expect(await page.evaluate(() => /** @type {any} */ (window).__dcl)).toEqual([mode, light]);
        expect(await state(page)).toEqual({ theme: mode, light });
      });
    }

    test(`${path} pinned at 09:00 over a dark system: morning over light, Auto checked, and never another value on the way`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await pinHour(page, '09:00');
      await watch(page);
      await page.goto(path);
      await modulesRan(page);
      expect(await state(page)).toEqual({ theme: 'light', light: 'morning' });
      await expect(page.locator('input[name="luz-theme-mode"]:checked'), 'an hour is chosen: Auto is the radio checked').toHaveValue('auto');
      expect(only(await took(page, 'data-theme'))).toEqual(['light']);
      expect(only(await took(page, 'data-moment'))).toEqual(['morning']);
      expect(await page.evaluate(() => localStorage.getItem('luz-theme'))).toBeNull();
    });
  }

  test('a pinned hour over more contrast: high contrast with the moment of the hour', async ({ page }) => {
    await page.emulateMedia({ contrast: 'more' });
    await pinHour(page, '09:00');
    await watch(page);
    await page.route(MODULES, (route) => route.abort());
    await page.goto('/');
    expect(await page.evaluate(() => /** @type {any} */ (window).__dcl)).toEqual(['high-contrast', 'morning']);
  });

  test('a chosen mode wins over a pinned hour', async ({ page }) => {
    await pinHour(page, '09:00');
    await seedMode(page, 'dark');
    await page.route(MODULES, (route) => route.abort());
    await page.goto('/');
    expect(await state(page)).toEqual({ theme: 'dark', light: 'night' });
  });
});

test.describe('the system changing while the page is open is followed', () => {
  for (const path of PAGES) {
    test(`${path}: light to dark to light, the moment and the radio checked with it, and nothing stored`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'light' });
      await atTime(page, '14:00');
      await watch(page);
      await page.goto(path);
      await modulesRan(page);
      expect(await state(page)).toEqual({ theme: 'light', light: 'afternoon' });

      await nextSchemeChange(page);
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.evaluate(() => /** @type {any} */ (window).__scheme);
      await expect.poll(() => state(page)).toEqual({ theme: 'dark', light: 'night' });
      await expect(page.locator('input[name="luz-theme-mode"]:checked')).toHaveValue('dark');

      await nextSchemeChange(page);
      await page.emulateMedia({ colorScheme: 'light' });
      await page.evaluate(() => /** @type {any} */ (window).__scheme);
      await expect.poll(() => state(page)).toEqual({ theme: 'light', light: 'afternoon' });
      await expect(page.locator('input[name="luz-theme-mode"]:checked')).toHaveValue('light');
      expect(await page.evaluate(() => localStorage.getItem('luz-theme'))).toBeNull();
    });

    test(`${path}: a pinned hour is not moved by a change of the system`, async ({ page }) => {
      await pinHour(page, '21:00');
      await page.goto(path);
      await modulesRan(page);
      expect(await state(page)).toEqual({ theme: 'dark', light: 'dusk' });
      await nextSchemeChange(page);
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.evaluate(() => /** @type {any} */ (window).__scheme);
      expect(await state(page)).toEqual({ theme: 'dark', light: 'dusk' });
      await nextSchemeChange(page);
      await page.emulateMedia({ colorScheme: 'light' });
      await page.evaluate(() => /** @type {any} */ (window).__scheme);
      expect(await state(page)).toEqual({ theme: 'dark', light: 'dusk' });
      await expect(page.locator('input[name="luz-theme-mode"]:checked')).toHaveValue('auto');
    });
  }
});

test.describe('the minute moves nothing: the page does not follow the clock while it is open', () => {
  test('a light system at 20:29 is still light and afternoon at 20:30, and at 23:00', async ({ page }) => {
    await atTime(page, '20:29');
    await page.goto('/docs/');
    await modulesRan(page);
    expect(await state(page)).toEqual({ theme: 'light', light: 'afternoon' });
    await page.clock.runFor(61_000);
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(await state(page)).toEqual({ theme: 'light', light: 'afternoon' });
    await page.clock.runFor(3 * 3600 * 1000);
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(await state(page)).toEqual({ theme: 'light', light: 'afternoon' });
  });

  test('a pinned hour stays, as the clock passes it', async ({ page }) => {
    await atTime(page, '20:29');
    await pinHour(page, '17:35');
    await page.goto('/docs/');
    await modulesRan(page);
    expect(await state(page)).toEqual({ theme: 'light', light: 'sunset' });
    await page.clock.runFor(61_000);
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(await state(page)).toEqual({ theme: 'light', light: 'sunset' });
  });

  test('a chosen mode is left alone by the minute: a data-theme set by hand survives it', async ({ page }) => {
    // The suites that set data-theme by hand to measure a mode (a11y, docs-dodont, red-lines...) run for
    // longer than a minute now and then: nothing may put a chosen mode back
    await atTime(page, '14:00');
    await seedMode(page, 'light');
    await page.goto('/docs/');
    await modulesRan(page);
    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'dark';
    });
    await page.clock.runFor(61_000);
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(await state(page)).toEqual({ theme: 'dark', light: 'afternoon' });
  });
});

test.describe('the four lights are in the page, when an hour is pinned', () => {
  // theme-light.css is linked by the home page and by the docs: the computed tokens of <html> are the literal of the block
  const OVERRIDING = LIGHTS.filter(([light]) => ['morning', 'sunset', 'dawn', 'dusk'].includes(light));
  for (const path of PAGES) {
    for (const [light, time] of OVERRIDING) {
      test(`${path} pinned at ${time}: <html>'s surface is the block of ${light}, and nothing fades at load`, async ({ page }) => {
        await pinHour(page, time);
        await page.goto(path);
        await modulesRan(page);
        expect(await page.evaluate(() => document.documentElement.dataset.moment)).toBe(light);
        expect(channels(await colorOf(page.locator('html'), '--luz-surface-page')), `--luz-surface-page in ${light}`).toEqual(lightToken(light, '--luz-surface-page'));
        expect(channels(await colorOf(page.locator('html'), '--luz-text-primary')), `--luz-text-primary in ${light}`).toEqual(lightToken(light, '--luz-text-primary'));
        // The boot script sets the light before the first frame: there is no fade to wait for
        expect(await page.evaluate(() => document.documentElement.getAnimations().map((a) => /** @type {any} */ (a).transitionProperty))).toEqual([]);
      });
    }
  }

  for (const [light, time, mode] of LIGHTS.filter(([light]) => ['afternoon', 'night'].includes(light))) {
    test(`/docs/ pinned at ${time}: ${light} is Vejer ${mode}, no block applies`, async ({ page }) => {
      await pinHour(page, time);
      await page.goto('/docs/');
      await modulesRan(page);
      expect(channels(await colorOf(page.locator('html'), '--luz-surface-page'))).toEqual(vejer(mode, '--luz-surface-page'));
    });
  }

  test('with nothing pinned no block applies, at 21:00 by the clock: a light system is Vejer light, a dark one Vejer dark', async ({ browser }) => {
    for (const [scheme, mode] of [['light', 'light'], ['dark', 'dark']]) {
      const context = await browser.newContext({ colorScheme: /** @type {'light'|'dark'} */ (scheme), timezoneId: TIMEZONE, storageState: NO_CHOICE });
      const page = await context.newPage();
      await atTime(page, '21:00');
      await page.goto('/docs/');
      await modulesRan(page);
      expect(channels(await colorOf(page.locator('html'), '--luz-surface-page')), `a ${scheme} system`).toEqual(vejer(mode, '--luz-surface-page'));
      await context.close();
    }
  });
});

test.describe('the cross-fade follows the visitor\'s motion setting', () => {
  test('with motion welcome, a switch of mode fades, and ends on the colours of the mode', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await seedMode(page, 'light');
    await page.goto('/docs/');
    await modulesRan(page);
    // Listen before the click: a transition that has started is an event, whereas "in flight right after the click" is a race with the runner
    await page.evaluate(() => {
      const w = /** @type {any} */ (window);
      w.__fades = [];
      document.documentElement.addEventListener('transitionrun', (event) => {
        if (event.target === document.documentElement && event.propertyName.startsWith('--luz-')) w.__fades.push(event.propertyName);
      });
    });
    await page.locator('footer .luz-theme-mode__button').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect.poll(() => page.evaluate(() => /** @type {any} */ (window).__fades.length), 'the colour tokens of <html> are transitioning').toBeGreaterThan(0);
    await faded(page);
    expect(channels(await colorOf(page.locator('html'), '--luz-surface-page'))).toEqual(vejer('dark', '--luz-surface-page'));
  });

  test('with reduced motion, a switch of mode takes effect at once', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await seedMode(page, 'light');
    await page.goto('/docs/');
    await modulesRan(page);
    await page.locator('footer .luz-theme-mode__button').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    // No settling: the very next read is the colour of the mode
    expect(await page.evaluate(() => document.documentElement.getAnimations().filter((a) => String(/** @type {any} */ (a).transitionProperty).startsWith('--luz-')).length)).toBe(0);
    expect(channels(await colorOf(page.locator('html'), '--luz-surface-page'))).toEqual(vejer('dark', '--luz-surface-page'));
  });
});

test.describe('the served HTML says nothing of the light', () => {
  for (const path of ['/', '/es/', '/ar/', '/docs/', '/docs/components/button/']) {
    test(`${path}: no data-moment, no mode on <html>, no radio checked, and the boot scripts is in <head>`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.ok()).toBe(true);
      const html = await response.text();
      expect(html).not.toMatch(/\sdata-moment(?:=|\s|>)/);
      // The page is Vejer light only when the system is light: the markup names no mode, and no radio is checked
      expect(html.match(/<html\b[^>]*>/)?.[0], 'the <html> tag').not.toMatch(/\sdata-(?:theme|mode)=/);
      const radios = [...html.matchAll(/<input\b[^>]*name="luz-theme-mode"[^>]*>/g)].map((m) => m[0]);
      expect(radios.map((r) => r.match(/value="([^"]+)"/)?.[1]), 'Auto first, then the three modes').toEqual(['auto', 'light', 'dark', 'high-contrast']);
      expect(radios.filter((r) => /\schecked\b/.test(r)), 'no radio checked').toEqual([]);
      const head = html.slice(html.indexOf('<head'), html.indexOf('</head>'));
      // Core's script, then the catalog's with the moments on its tag
      expect(head).toMatch(/<script src="[^"]*theme-boot(?:\.min)?\.js[^"]*"><\/script>/);
      expect(head).toMatch(/<script src="[^"]*theme-time-boot(?:\.min)?\.js[^"]*" data-moments="[^"]+"><\/script>/);
      expect(head.indexOf('theme-boot'), 'core\'s first').toBeLessThan(head.indexOf('theme-time-boot'));
      // Classic and render-blocking, by design (EX-009, EX-012): neither deferred, async nor a module
      expect(head).not.toMatch(/<script[^>]*(?:defer|async|type="module")[^>]*boot(?:\.min)?\.js/);
    });
  }

  test('the boot scripts are served, as classic scripts with no import', async ({ request }) => {
    for (const file of ['/packages/core/dist/theme-boot.min.js', '/packages/catalog/dist/theme-time-boot.min.js']) {
      const response = await request.get(file);
      expect(response.ok(), file).toBe(true);
      expect(await response.text(), file).not.toMatch(/^\s*(?:import|export)\b/m);
    }
  });
});
