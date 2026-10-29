// @ts-check
/**
 * The bare element and the component that is its reference (plan
 * luz-final-refactor, section 6): "without a class, as close to the component
 * as it can be; the class improves it, and never undoes what the element gives".
 *
 * The bare element has its look from packages/core/src/elements/*.css and the
 * component keeps its own declarations for what needs markup or a role, so the
 * two are written next to each other and this file is what keeps them from
 * drifting. For each of the pairs (button, field, textarea, select, table,
 * fieldset, details and .luz-accordion, dialog and .luz-modal, meter and
 * .luz-meter, progress and .luz-progress, pre and .luz-code-block) the
 * properties the bare element gives are compared with the component's, with no
 * attribute and no scope anywhere on the page. The component may add more (a
 * box, a bar, a badge); it may not differ from what the element already gives.
 */
import { test, expect } from '@playwright/test';

const FIXTURE = '/tests/fixtures/classless.html';

/** Computed values of `props` for the element with this id. */
const read = (page, id, props) =>
  page.locator(`#${id}`).evaluate((el, list) => {
    const cs = getComputedStyle(el);
    return Object.fromEntries(list.map((p) => [p, cs.getPropertyValue(p)]));
  }, props);

async function expectParity(page, bare, reference, props) {
  const [a, b] = [await read(page, bare, props), await read(page, reference, props)];
  expect(a, `#${bare} against #${reference}`).toEqual(b);
}

// A bare button wraps its label (1.4.10) and keeps a line of padding above and below it; .luz-btn is one line, no wrap
const BUTTON_ONLY = ['padding-top', 'padding-bottom', 'white-space'];
const BOX = ['display', 'min-height', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'border-top-width', 'border-bottom-width', 'border-top-style', 'border-bottom-style', 'border-bottom-color', 'border-top-color', 'border-radius'];
const TYPE = ['font-family', 'font-size', 'font-weight', 'color', 'background-color', 'cursor', 'text-decoration-line', 'white-space', 'opacity'];

test.describe('a bare element has the look of its component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FIXTURE);
  });

  test('a bare button is the secondary button', async ({ page }) => {
    await expectParity(page, 'button', 'ref-button', [...BOX, ...TYPE, 'gap', 'justify-content', 'align-items'].filter((p) => !BUTTON_ONLY.includes(p)));
  });

  test('type="submit" is the primary button, and a reset input is a button too', async ({ page }) => {
    await expectParity(page, 'submit', 'ref-submit', [...BOX, ...TYPE].filter((p) => !BUTTON_ONLY.includes(p)));
    const bg = await read(page, 'submit', ['background-color']);
    const secondary = await read(page, 'button', ['background-color']);
    expect(bg['background-color']).not.toBe(secondary['background-color']);
    await expectParity(page, 'input-button', 'ref-button', [...BOX.filter((p) => p !== 'display'), ...TYPE.filter((p) => p !== 'cursor' && p !== 'font-family')].filter((p) => !BUTTON_ONLY.includes(p)));
  });

  test('a disabled button keeps the dashed outline of the component', async ({ page }) => {
    await expectParity(page, 'button-disabled', 'ref-button-disabled', [...BOX, 'color', 'background-color', 'cursor', 'pointer-events'].filter((p) => !BUTTON_ONLY.includes(p)));
  });

  test('a bare button shows the focus ring and the hover colour', async ({ page }) => {
    // A sentinel right before the button, and one Tab: the keyboard lands on the button and the ring is the
    // :focus-visible one (Shift+Tab from the first focusable element stays put in Firefox)
    const ringAfterTab = async (id) => {
      await page.locator(`#${id}`).evaluate((el) => {
        const sentinel = document.createElement('span');
        sentinel.tabIndex = 0;
        sentinel.dataset.sentinel = el.id;
        el.before(sentinel);
        sentinel.focus();
      });
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => document.activeElement?.id), `Tab lands on #${id}`).toBe(id);
      return read(page, id, ['outline-style', 'outline-width', 'outline-offset']);
    };
    const ring = await ringAfterTab('button');
    const ref = await ringAfterTab('ref-button');
    expect(ring['outline-style']).toBe('solid');
    expect(ring).toEqual(ref);
    await page.locator('#button').hover();
    await page.waitForTimeout(250);
    const hover = await read(page, 'button', ['background-color', 'color']);
    await page.locator('#ref-button').hover();
    await page.waitForTimeout(250);
    expect(hover).toEqual(await read(page, 'ref-button', ['background-color', 'color']));
  });

  test('a text field, a date field and a textarea are the input', async ({ page }) => {
    const props = [...BOX.filter((p) => p !== 'min-height'), ...TYPE, 'height', 'width', 'color-scheme'];
    await expectParity(page, 'input', 'ref-input', props);
    await expectParity(page, 'input-email', 'ref-input', props);
    await expectParity(page, 'input-date', 'ref-input-date', props);
    await expectParity(page, 'input-readonly', 'ref-input-readonly', props);
    await expectParity(page, 'input-disabled', 'ref-input-disabled', props);
    await expectParity(page, 'textarea', 'ref-textarea', [...props, 'min-height', 'resize']);
  });

  test('the date picker follows the colour mode', async ({ page }) => {
    for (const mode of ['light', 'high-contrast', 'dark']) {
      await page.evaluate((m) => (document.documentElement.dataset.theme = m), mode);
      await expectParity(page, 'input-date', 'ref-input-date', ['color-scheme']);
    }
  });

  test('a select has the closed box of .luz-select', async ({ page }) => {
    // The open list of the component needs appearance: base-select; only the closed box is compared
    const props = ['min-block-size', 'padding-top', 'padding-bottom', 'padding-left', 'border-top-width', 'border-bottom-width', 'border-bottom-style', 'border-bottom-color', 'border-radius', 'color', 'font-family', 'font-size', 'cursor', 'color-scheme', 'inline-size'];
    await expectParity(page, 'select', 'ref-select', props);
    const multiple = ['border-top-width', 'border-bottom-width', 'border-top-color', 'background-image', 'padding-inline-end'];
    await expectParity(page, 'select-multiple', 'ref-select-multiple', multiple);
  });

  test('a table has the look of .luz-table, and no scroll box of its own', async ({ page }) => {
    await expectParity(page, 'table', 'ref-table', ['width', 'border-collapse', 'font-family', 'font-size']);
    for (const part of ['caption', 'thead th', 'tbody td']) {
      const pick = (id) => page.locator(`#${id} ${part}`).first().evaluate((el) => {
        const cs = getComputedStyle(el);
        return ['padding-top', 'padding-left', 'font-size', 'font-weight', 'color', 'background-color', 'border-bottom-width', 'text-align', 'white-space'].map((p) => cs.getPropertyValue(p));
      });
      expect(await pick('table'), part).toEqual(await pick('ref-table'));
    }
    const box = await read(page, 'table', ['display', 'overflow-x']);
    expect(box.display).toBe('table');
    expect(box['overflow-x']).toBe('visible');
  });

  test('a bare fieldset and its legend are .luz-fieldset', async ({ page }) => {
    await expectParity(page, 'fieldset', 'ref-fieldset', ['border-top-width', 'border-top-style', 'border-top-color', 'border-top-left-radius', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'background-color', 'font-family', 'min-inline-size']);
    const legend = (id) => page.locator(`#${id} legend`).evaluate((el) => {
      const cs = getComputedStyle(el);
      return ['font-size', 'font-weight', 'color', 'padding-left', 'padding-right', 'letter-spacing', 'text-transform'].map((p) => cs.getPropertyValue(p));
    });
    expect(await legend('fieldset')).toEqual(await legend('ref-fieldset'));
  });

  test('a disabled field of the bare element and of the component are told the same way', async ({ page }) => {
    // The old component dimmed with opacity 0.45; the text colour and the dashed line are the state now, in both
    await expectParity(page, 'input-disabled', 'ref-input-disabled', ['color', 'border-bottom-style', 'cursor', 'opacity']);
    expect((await read(page, 'ref-input-disabled', ['opacity'])).opacity).toBe('1');
  });

  test('a bare details has the summary and the divider that .luz-accordion keeps; the accordion adds the box', async ({ page }) => {
    const summary = ['cursor', 'font-weight', 'color', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-left', 'margin-right', 'border-top-left-radius', 'user-select'];
    const [bare, ref] = [await read(page, 'details', ['border-bottom-width', 'border-bottom-style', 'border-bottom-color']), await read(page, 'ref-details', ['border-bottom-width', 'border-bottom-style', 'border-bottom-color'])];
    // The class never undoes what the element gives: the divider is the accordion's edge too
    expect(ref).toEqual(bare);
    const sum = (id) => page.locator(`#${id} summary`).evaluate((el, list) => list.map((p) => getComputedStyle(el).getPropertyValue(p)), summary);
    expect(await sum('details')).toEqual(await sum('ref-details'));
    // What the class adds: the other three edges, the room and the surface
    const bareBox = await read(page, 'details', ['border-top-width', 'border-left-width', 'padding-left', 'background-color']);
    const refBox = await read(page, 'ref-details', ['border-top-width', 'border-left-width', 'padding-left', 'background-color']);
    expect(bareBox['border-top-width']).toBe('0px');
    expect(refBox['border-top-width']).toBe('1px');
    expect(bareBox['border-left-width']).toBe('0px');
    expect(refBox['border-left-width']).toBe('1px');
    expect(bareBox['padding-left']).toBe('0px');
    expect(Number.parseFloat(refBox['padding-left'])).toBeGreaterThan(0);
    expect(bareBox['background-color']).toBe('rgba(0, 0, 0, 0)');
    expect(refBox['background-color']).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('a bare dialog has the surface of .luz-modal', async ({ page }) => {
    await expectParity(page, 'dialog', 'ref-dialog', ['background-color', 'color', 'border-top-width', 'border-top-style', 'border-top-color', 'border-top-left-radius', 'box-shadow', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'max-inline-size', 'max-block-size', 'overflow-y']);
  });

  test('a bare meter and a bare progress have the size of .luz-meter and .luz-progress', async ({ page }) => {
    await expectParity(page, 'meter', 'ref-meter', ['display', 'inline-size', 'min-inline-size', 'block-size']);
    await expectParity(page, 'progress', 'ref-progress', ['display', 'inline-size', 'block-size', 'accent-color']);
    // The track, the edge and the fill of the bar are the component's: the bare one is the browser's
    expect((await read(page, 'meter', ['border-top-width']))['border-top-width']).not.toBe((await read(page, 'ref-meter', ['border-top-width']))['border-top-width']);
    // (The edge is not told apart: the browser's own progress has a 1px border in Gecko, like the component's)
    expect((await read(page, 'progress', ['appearance'])).appearance).toBe('auto');
    expect((await read(page, 'ref-progress', ['appearance'])).appearance).toBe('none');
  });

  test('a bare pre is .luz-code-block without the badge', async ({ page }) => {
    await expectParity(page, 'pre', 'ref-pre', ['font-family', 'font-size', 'line-height', 'white-space', 'tab-size', 'overflow-x', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'background-color', 'color', 'border-top-width', 'border-top-style', 'border-top-color', 'border-top-left-radius']);
  });

  test('the class never undoes the element: every control the component styles keeps the width and the font of the bare one', async ({ page }) => {
    await expectParity(page, 'input', 'ref-input', ['width', 'font-family', 'font-size', 'height']);
    await expectParity(page, 'select', 'ref-select', ['inline-size', 'font-family', 'font-size', 'min-block-size']);
    await expectParity(page, 'table', 'ref-table', ['width', 'font-family']);
  });
});
