// @ts-check
/**
 * dist/luz.conditional.css in a browser (plan luz-final-refactor, section 6,
 * point 4): the reset and the bare elements apply only inside [data-luz]. A page
 * with a design of its own can link the file and opt in one region at a time:
 * what is outside the zone is untouched, what is inside is the bare-element
 * model of luz.css, and a component works wherever its class is.
 *
 * tests/conditional-css.test.js reads the file as text; this is the page.
 * The fixture links luz.conditional.css and never luz.css.
 */
import { test, expect } from '@playwright/test';
import { MODES } from './helpers/design-tokens.js';

const FIXTURE = '/tests/fixtures/conditional.html';

async function open(page, mode = 'light') {
  // The duration tokens are 0 under reduced motion: a colour is read after the switch of mode, not during it
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(FIXTURE);
  await page.evaluate((m) => (document.documentElement.dataset.theme = m), mode);
}

const read = (page, selector, props) =>
  page.locator(selector).first().evaluate((el, list) => {
    const cs = getComputedStyle(el);
    return Object.fromEntries(list.map((p) => [p, cs.getPropertyValue(p)]));
  }, props);
const value = async (page, selector, prop) => (await read(page, selector, [prop]))[prop];

/** What `property: var(--token)` computes to next to the element. */
const tokenOf = (page, selector, property, token) =>
  page.locator(selector).first().evaluate(
    (el, [prop, name]) => {
      const probe = document.createElement('span');
      probe.style.setProperty(prop, `var(${name})`);
      probe.style.position = 'absolute';
      probe.style.visibility = 'hidden';
      el.parentElement.append(probe);
      const computed = getComputedStyle(probe).getPropertyValue(prop);
      probe.remove();
      return computed;
    },
    [property, token],
  );
const color = (page, selector, token) => tokenOf(page, selector, 'color', token);

/** The file is linked and works: a page without it would pass every "untouched" test below for the wrong reason. */
async function expectLuzApplies(page) {
  expect(await value(page, '#zone-button', 'padding-left'), 'luz.conditional.css styles the zone').toBe(await tokenOf(page, '#zone-button', 'padding-left', '--luz-space-lg'));
}

test.describe('luz.conditional.css: outside the zone, the page is untouched', () => {
  test('a legacy page keeps the browser\'s own button, field, select, table, heading, link and margins', async ({ page }) => {
    await open(page);
    await expectLuzApplies(page);
    // The browser's own button has a padding of 1px 6px, a 2px outset border and no fixed height
    const btn = await read(page, '#legacy-button', ['padding-left', 'min-height', 'border-top-style', 'background-color', 'font-family']);
    expect(btn['padding-left']).not.toBe(await tokenOf(page, '#legacy-button', 'padding-left', '--luz-space-lg'));
    expect(btn['min-height']).not.toBe(await tokenOf(page, '#legacy-button', 'min-height', '--luz-control-lg'));
    expect(btn['background-color']).not.toBe(await color(page, '#legacy-button', '--luz-brand-fill'));
    expect(btn['background-color']).not.toBe(await color(page, '#legacy-button', '--luz-surface-strong'));
    expect(btn['font-family']).not.toBe(await tokenOf(page, '#legacy-button', 'font-family', '--luz-font-sans'));
    // The legacy rule still applies
    expect(await value(page, '#legacy-button', 'color')).toBe('rgb(10, 20, 30)');

    expect((await read(page, '#legacy-input', ['border-bottom-width']))['border-bottom-width'], 'the browser\'s 2px inset border').toBe('2px');
    expect(await value(page, '#legacy-input', 'background-color')).not.toBe(await color(page, '#legacy-input', '--luz-input-bg'));
    expect(await value(page, '#legacy-select', 'appearance')).not.toBe('none');
    expect(await value(page, '#legacy-table', 'border-collapse')).toBe('separate');
    expect(await value(page, '#legacy-table th', 'background-color')).not.toBe(await color(page, '#legacy-table', '--luz-surface-strong'));
    expect(await value(page, '#legacy-label', 'display')).toBe('inline');
    expect(await value(page, '#legacy-details', 'border-bottom-width')).toBe('0px');
    expect(await value(page, '#legacy-details summary', 'font-weight')).not.toBe('600');
    expect(await value(page, '#legacy-link', 'text-decoration-line'), 'the browser\'s underline').toBe('underline');
    // A heading keeps the browser's bold, LUZ's is light
    expect(await value(page, '#legacy-h', 'font-weight')).toBe('700');
    expect(await value(page, '#legacy-h', 'font-family')).not.toBe(await tokenOf(page, '#legacy-h', 'font-family', '--luz-font-heading'));
  });

  test('the margins are the legacy rule\'s and the browser\'s: no reset, no rhythm', async ({ page }) => {
    await open(page);
    await expectLuzApplies(page);
    // .legacy p { margin: 0 0 24px } is the page's own; nothing from LUZ adds a step above the second paragraph
    expect(await value(page, '#legacy-p2', 'margin-top')).toBe('0px');
    expect(await value(page, '#legacy-p2', 'margin-bottom')).toBe('24px');
    // The reset is not applied: the browser's 8px margin of a body, and a content-box
    expect(await value(page, '#legacy-div', 'box-sizing')).toBe('content-box');
    expect(await value(page, 'body', 'margin-top'), 'the body keeps the browser\'s margin').toBe('8px');
  });

  test('the document is the page\'s: the font, colour and background of <body> are not LUZ\'s, and <html> has no smooth scroll', async ({ page }) => {
    await open(page);
    await expectLuzApplies(page);
    expect(await value(page, 'body', 'font-family')).not.toBe(await tokenOf(page, 'body', 'font-family', '--luz-font-body'));
    expect(await value(page, 'body', 'background-color')).toBe('rgba(0, 0, 0, 0)');
    expect(await value(page, 'html', 'background-color')).toBe('rgba(0, 0, 0, 0)');
    expect(await value(page, 'html', 'scroll-behavior')).toBe('auto');
  });
});

test.describe('luz.conditional.css: inside the zone, the bare elements are LUZ\'s', () => {
  for (const mode of MODES) {
    test(`the root of the zone has the page's font, colour and background (the rules of body), in ${mode}`, async ({ page }) => {
      await open(page, mode);
      const zone = await read(page, '#zone', ['font-family', 'font-size', 'color', 'background-color', 'line-height']);
      expect(zone['font-family']).toBe(await tokenOf(page, '#zone', 'font-family', '--luz-font-body'));
      expect(zone['font-size']).toBe(await tokenOf(page, '#zone', 'font-size', '--luz-text-body'));
      expect(zone.color).toBe(await color(page, '#zone', '--luz-text-primary'));
      expect(zone['background-color']).toBe(await color(page, '#zone', '--luz-surface-page'));
    });

    test(`button, field, select, textarea, label, fieldset, table and details are styled with no class, in ${mode}`, async ({ page }) => {
      await open(page, mode);
      // Primary and secondary by semantics
      expect(await value(page, '#zone-button', 'background-color')).toBe(await color(page, '#zone-button', '--luz-brand-fill'));
      expect(await value(page, '#zone-button', 'padding-left')).toBe(await tokenOf(page, '#zone-button', 'padding-left', '--luz-space-lg'));
      expect(await value(page, '#zone-button-secondary', 'background-color')).toBe(await color(page, '#zone-button-secondary', '--luz-surface-strong'));
      // The field: a line under it, the input surface, the full width
      const input = await read(page, '#zone-input', ['border-bottom-width', 'border-bottom-color', 'background-color', 'display', 'color']);
      expect(input['border-bottom-width']).toBe('1px');
      expect(input['border-bottom-color']).toBe(await color(page, '#zone-input', '--luz-input-border'));
      expect(input['background-color']).toBe(await color(page, '#zone-input', '--luz-input-bg'));
      expect(input.display).toBe('block');
      expect(await value(page, '#zone-textarea', 'border-bottom-width')).toBe('1px');
      expect(await value(page, '#zone-select', 'appearance')).toBe('none');
      expect(await value(page, '#zone-label', 'display')).toBe('block');
      expect(await value(page, '#zone-check', 'display')).toBe('flex');
      expect(await value(page, '#zone-checkbox', 'accent-color')).toBe(await color(page, '#zone-checkbox', '--luz-brand-fill'));
      expect(await value(page, '#zone-fieldset', 'border-top-color')).toBe(await color(page, '#zone-fieldset', '--luz-divider'));
      expect(await value(page, '#zone-table', 'border-collapse')).toBe('collapse');
      expect(await value(page, '#zone-table th', 'background-color')).toBe(await color(page, '#zone-table', '--luz-surface-strong'));
      expect(await value(page, '#zone-details', 'border-bottom-color')).toBe(await color(page, '#zone-details', '--luz-divider'));
      expect(await value(page, '#zone-details summary', 'font-weight')).toBe('600');
      expect(await value(page, '#zone-h', 'font-weight')).toBe('300');
    });
  }

  test('the reset and the space between blocks apply inside the zone', async ({ page }) => {
    await open(page);
    expect(await value(page, '#zone-div', 'box-sizing')).toBe('border-box');
    expect(await value(page, '#zone-p1', 'margin-top')).toBe(await tokenOf(page, '#zone-p1', 'margin-top', '--luz-space-sm'));
    expect(await value(page, '#zone-p2', 'margin-top')).toBe(await tokenOf(page, '#zone-p2', 'margin-top', '--luz-space-md'));
    expect(await value(page, '#zone-div', 'margin-top'), 'a div has no rule').toBe('0px');
    // The zone is not the whole page: the legacy block above keeps its own margins
    expect(await value(page, '#legacy-p2', 'margin-bottom')).toBe('24px');
  });

  test('a component inside the zone beats the element: a class decides', async ({ page }) => {
    await open(page);
    expect(await value(page, '#zone-component', 'background-color')).toBe(await color(page, '#zone-component', '--luz-surface-strong'));
  });

  test('the colour mode on <html> or on the zone reaches a select', async ({ page }) => {
    await open(page, 'dark');
    expect(await value(page, '#zone-select', 'color-scheme'), 'the mode on <html>, outside the zone').toBe('dark');
    await open(page, 'light');
    expect(await value(page, '#zone-select', 'color-scheme')).toBe('light');
    await page.evaluate(() => document.getElementById('zone').setAttribute('data-theme', 'dark'));
    expect(await value(page, '#zone-select', 'color-scheme'), 'the mode on the zone itself').toBe('dark');
  });

  test('a dark region inside the zone reaches its select, as [data-theme] on any ancestor does for .luz-select', async ({ page }) => {
    await open(page, 'light');
    expect(await value(page, '#zone-select-dark', 'color-scheme')).toBe('dark');
  });

  test('moving the attribute moves the zone', async ({ page }) => {
    await open(page);
    await page.evaluate(() => {
      document.getElementById('zone').removeAttribute('data-luz');
      document.getElementById('legacy').setAttribute('data-luz', '');
    });
    expect(await value(page, '#legacy-button', 'padding-left')).toBe(await tokenOf(page, '#legacy-button', 'padding-left', '--luz-space-lg'));
    expect(await value(page, '#zone-button', 'padding-left')).not.toBe(await tokenOf(page, '#zone-button', 'padding-left', '--luz-space-lg'));
  });
});

test.describe('luz.conditional.css: a component works outside the zone', () => {
  for (const mode of MODES) {
    test(`.luz-btn, .luz-input, .luz-select, .luz-fieldset and .luz-table keep their look, in ${mode}`, async ({ page }) => {
      await open(page, mode);
      const btn = await read(page, '#c-btn', ['background-color', 'padding-left', 'border-top-left-radius']);
      expect(btn['background-color']).toBe(await color(page, '#c-btn', '--luz-brand-fill'));
      expect(btn['padding-left']).toBe(await tokenOf(page, '#c-btn', 'padding-left', '--luz-space-lg'));
      expect(btn['border-top-left-radius']).toBe(await tokenOf(page, '#c-btn', 'border-top-left-radius', '--luz-radius-md'));

      const input = await read(page, '#c-input', ['border-bottom-width', 'border-bottom-color', 'background-color', 'display', 'height']);
      expect(input['border-bottom-width']).toBe('1px');
      expect(input['border-bottom-color']).toBe(await color(page, '#c-input', '--luz-input-border'));
      expect(input['background-color']).toBe(await color(page, '#c-input', '--luz-input-bg'));
      expect(input.display).toBe('block');
      expect(input.height).toBe(await tokenOf(page, '#c-input', 'height', '--luz-control-lg'));

      // The shared rule of a select: the item of the class is outside the zone, so it still applies
      // (where the browser has base-select, the component's second layer sets its appearance: not read here)
      const select = await read(page, '#c-select', ['min-block-size', 'border-bottom-width', 'border-bottom-color', 'background-color']);
      expect(select['min-block-size']).toBe(await tokenOf(page, '#c-select', 'min-block-size', '--luz-control-lg'));
      expect(select['border-bottom-width']).toBe('1px');
      expect(select['border-bottom-color']).toBe(await color(page, '#c-select', '--luz-input-border'));
      expect(select['background-color']).toBe(await color(page, '#c-select', '--luz-input-bg'));

      expect(await value(page, '#c-fieldset', 'border-top-color')).toBe(await color(page, '#c-fieldset', '--luz-divider'));
      expect(await value(page, '#c-fieldset', 'border-top-left-radius')).toBe(await tokenOf(page, '#c-fieldset', 'border-top-left-radius', '--luz-radius-md'));
      expect(await value(page, '#c-table', 'border-collapse')).toBe('collapse');
      expect(await value(page, '#c-table th', 'background-color')).toBe(await color(page, '#c-table', '--luz-surface-strong'));
    });
  }

  test('an object works outside the zone: .o-stack spaces its children', async ({ page }) => {
    await open(page);
    expect(await value(page, '#c-stack', 'display')).toBe('flex');
    expect(await value(page, '#c-stack', 'flex-direction')).toBe('column');
    expect(Number.parseFloat(await value(page, '#c-stack', 'row-gap'))).toBeGreaterThan(0);
  });

  test('the tokens are on :root: they resolve inside and outside the zone', async ({ page }) => {
    await open(page);
    for (const id of ['#legacy-div', '#zone-div']) {
      expect(await value(page, id, '--luz-space-md'), id).not.toBe('');
      expect(await value(page, id, '--luz-text-control'), `${id}: the setting of core's own, on :root`).not.toBe('');
    }
  });
});
