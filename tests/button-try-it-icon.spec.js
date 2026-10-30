// @ts-check
/**
 * "Try it" on the Button page, the Icon group (apps/docs/pages/components/button.html and its Spanish page, and
 * `initTryIt()` in apps/docs/reference.js). The group sits with Variant, Size and Full width and offers four
 * radios: none, before the label, after the label, icon only. Choosing one rewrites the one live button (the
 * class list is not touched) and the code under it, which stays exactly that button's outerHTML, one part a
 * line. The icon is decorative; an icon-only button is named by real text in a `.u-sr-only` span, never by an
 * `aria-label` (RL-9: the name is translated with the page). The rest of Try it is tests/docs-try-it.spec.js
 * and its markup tests/docs-try-it.test.js.
 *
 *  - none is a button with its label and no svg; before and after put one svg on either side of the label;
 *    icon only is the svg and the label in `.u-sr-only`;
 *  - the button keeps its name, "Save changes", in all four; the svg is aria-hidden and not focusable, on the
 *    24 grid with the family's 1.5 stroke, and is drawn 16 px inside a `.luz-btn`;
 *  - the code on screen is the preview's markup, and parsed as HTML it makes the same button (it round-trips);
 *    the Copy button copies it;
 *  - choosing an icon keeps the variant, the size and the full width, and going back to none leaves the button
 *    exactly as it began;
 *  - the examples above the form show a button with an icon, one after the label (mirrored in right-to-left
 *    text) and one icon only, and the "with an icon" snippet says how;
 *  - without JavaScript the form is hidden and the examples with an icon are drawn.
 * Runs in `chromium`; the no-JS describe sets `javaScriptEnabled: false` itself.
 */
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { copiedText, recordCopies } from './helpers/clipboard.js';
import { routeOf } from './helpers/docs-site.js';
import { faded, idle } from './helpers/settle.js';

const BUTTON = routeOf('c-button');
const BUTTON_ES = `/es${BUTTON}`;
const THEMES = ['light', 'dark', 'high-contrast'];
const norm = (s) => s.replace(/\s+/g, ' ').trim();
/** The size the icon is drawn at inside a button, as button.css writes it. */
const ICON_PX = Number(/\.luz-btn svg\s*\{[^}]*width:\s*(\d+)px/.exec(readFileSync(new URL('../packages/core/src/components/button.css', import.meta.url), 'utf-8'))?.[1]);

const tryIt = (page) => page.locator('form.docs-try');
const preview = (page) => tryIt(page).locator('.docs-try__preview > button');
const codeOf = (page) => tryIt(page).locator('pre.luz-code-block code');

const WHERE = { none: 'None', start: 'Before the label', end: 'After the label', only: 'Icon only' };
const chooseIcon = async (page, where) => {
  const radio = tryIt(page).getByRole('radio', { name: WHERE[where], exact: true });
  await expect(radio).toBeVisible();
  await radio.check();
};

/** The parts of the preview button, in order, ignoring the white space between them. */
const partsOf = (page) =>
  preview(page).evaluate((button) =>
    [...button.childNodes]
      .filter((n) => !(n.nodeType === Node.TEXT_NODE && !n.textContent?.trim()))
      .map((n) => {
        if (n.nodeType === Node.TEXT_NODE) return `text:${n.textContent?.trim()}`;
        const el = /** @type {Element} */ (n);
        const cls = el.getAttribute('class');
        return `${el.localName}${cls ? `.${cls}` : ''}${el.localName === 'svg' ? '' : `:${el.textContent?.trim()}`}`;
      }),
  );

const open = async (page, route = BUTTON, group = 'Icon') => {
  await recordCopies(page);
  await page.goto(route);
  await idle(page);
  await expect(tryIt(page), 'form.docs-try is shown').toBeVisible();
  // Everything below needs the group: fail on its absence in five seconds, with this message
  await expect(tryIt(page).getByRole('group', { name: group, exact: true }), `the ${group} group`).toBeVisible();
  return norm((await preview(page).textContent()) ?? '');
};

test.describe('Try it: the Icon group, with JavaScript', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript: the no-JS tests are below');
  test.beforeEach(async ({ context, browserName }) => {
    if (browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  });

  test('is a group named Icon with four native radios, None checked, between Size and Full width', async ({ page }) => {
    await open(page);
    const groups = await tryIt(page).locator('fieldset > legend').allTextContents();
    expect(groups.map(norm), 'the groups, in order').toEqual(['Variant', 'Size', 'Icon', 'Full width']);
    const group = tryIt(page).getByRole('group', { name: 'Icon', exact: true });
    await expect(group).toBeVisible();
    const radios = group.getByRole('radio');
    await expect(radios).toHaveCount(4);
    expect(await radios.evaluateAll((list) => list.map((r) => /** @type {HTMLInputElement} */ (r).value))).toEqual(['none', 'start', 'end', 'only']);
    expect((await radios.evaluateAll((list) => list.map((r) => /** @type {HTMLInputElement} */ (r).name))).every((n) => n === 'icon')).toBe(true);
    for (const radio of await radios.all()) await expect(radio).toHaveAccessibleName(/\S/);
    await expect(tryIt(page).getByRole('radio', { name: 'None', exact: true })).toBeChecked();
    expect(await tryIt(page).locator('input').count(), 'all the controls: 5 + 3 + 4 radios and one checkbox').toBe(13);
  });

  test('none is the label alone; before and after put one svg on either side; icon only is the svg and the label hidden from the eye', async ({ page }) => {
    const label = await open(page);
    expect(label, 'the preview starts with a label').toBeTruthy();
    expect(await partsOf(page)).toEqual([`text:${label}`]);
    await chooseIcon(page, 'start');
    expect(await partsOf(page)).toEqual(['svg', `text:${label}`]);
    await chooseIcon(page, 'end');
    expect(await partsOf(page)).toEqual([`text:${label}`, 'svg']);
    await chooseIcon(page, 'only');
    expect(await partsOf(page)).toEqual(['svg', `span.u-sr-only:${label}`]);
    await chooseIcon(page, 'none');
    expect(await partsOf(page)).toEqual([`text:${label}`]);
  });

  for (const where of ['none', 'start', 'end', 'only']) {
    test(`${where}: the button is named by its label, whatever the icon`, async ({ page }) => {
      const label = await open(page);
      await chooseIcon(page, where);
      await expect(preview(page)).toHaveAccessibleName(label);
      await expect(preview(page), 'the name is real text, not an aria-label').not.toHaveAttribute('aria-label', /.*/);
      await expect(preview(page)).toHaveAttribute('type', 'button');
    });
  }

  test('the icon is decorative, on the 24 grid with the family\'s 1.5 stroke, and drawn at the size a button gives it', async ({ page }) => {
    await open(page);
    expect(ICON_PX, 'the icon size in button.css').toBeGreaterThan(0);
    for (const where of ['start', 'end', 'only']) {
      await chooseIcon(page, where);
      const svg = preview(page).locator('svg');
      await expect(svg, where).toHaveCount(1);
      await expect(svg).toHaveAttribute('aria-hidden', 'true');
      await expect(svg).toHaveAttribute('focusable', 'false');
      await expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
      await expect(svg).toHaveAttribute('stroke-width', '1.5');
      await expect(svg).toHaveAttribute('fill', 'none');
      await expect(svg).toHaveAttribute('stroke', 'currentColor');
      const box = await svg.boundingBox();
      expect(box?.width, `${where}: width`).toBeCloseTo(ICON_PX, 0);
      expect(box?.height, `${where}: height`).toBeCloseTo(ICON_PX, 0);
      // In the colour of the label
      const colours = await preview(page).evaluate((b) => ({ text: getComputedStyle(b).color, stroke: getComputedStyle(b.querySelector('svg path, svg circle')).stroke }));
      expect(colours.stroke, `${where}: stroke`).toBe(colours.text);
    }
  });

  test('icon only is square-ish and as tall as the labelled button, and its label is clipped, not hidden from screen readers', async ({ page }) => {
    await open(page);
    const plain = await preview(page).boundingBox();
    await chooseIcon(page, 'only');
    const alone = await preview(page).boundingBox();
    expect(alone?.height, 'same height').toBeCloseTo(plain?.height ?? 0, 0);
    expect(alone?.width, 'narrower than the labelled button').toBeLessThan(plain?.width ?? 0);
    const hidden = await preview(page).locator('.u-sr-only').evaluate((el) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { display: s.display, visibility: s.visibility, ariaHidden: el.getAttribute('aria-hidden'), w: r.width, h: r.height };
    });
    expect(hidden.display).not.toBe('none');
    expect(hidden.visibility).toBe('visible');
    expect(hidden.ariaHidden).toBeNull();
    expect(Math.min(hidden.w, hidden.h), 'one pixel at most: clipped to the eye').toBeLessThanOrEqual(1);
  });

  test('the code on screen is the preview markup, one part a line, and round-trips into the same button', async ({ page }) => {
    await open(page);
    for (const where of ['start', 'end', 'only', 'none']) {
      await chooseIcon(page, where);
      const outer = await preview(page).evaluate((b) => b.outerHTML);
      const code = (await codeOf(page).textContent()) ?? '';
      expect(norm(code), `${where}: the code is the preview's outerHTML`).toBe(norm(outer));
      // Pasted into a page, it makes the same button
      const again = await page.evaluate((text) => {
        const host = document.createElement('template');
        host.innerHTML = text;
        return { count: host.content.children.length, outer: host.content.firstElementChild?.outerHTML ?? '' };
      }, code);
      expect(again.count, `${where}: one element`).toBe(1);
      expect(norm(again.outer), `${where}: the same button`).toBe(norm(outer));
      if (where !== 'none') {
        const lines = code.trim().split('\n');
        expect(lines.length, `${where}: one part a line`).toBeGreaterThanOrEqual(4);
        expect(lines[0], 'opens the button').toMatch(/^<button\b/);
        expect(lines.at(-1), 'closes the button').toBe('</button>');
        expect(code, `${where}: the svg is in the code`).toContain('<svg');
        expect(code, `${where}: the icon is decorative in the code`).toContain('aria-hidden="true"');
        expect(code, `${where}: not focusable`).toContain('focusable="false"');
      } else {
        expect(code, 'none: no icon in the code').not.toContain('<svg');
        expect(code, 'none: no sr-only span').not.toContain('u-sr-only');
      }
    }
  });

  test('icon only writes the label in a .u-sr-only span and no aria-label in the code', async ({ page }) => {
    const label = await open(page);
    await chooseIcon(page, 'only');
    const code = (await codeOf(page).textContent()) ?? '';
    expect(code).toContain(`<span class="u-sr-only">${label}</span>`);
    expect(code).not.toContain('aria-label');
  });

  test('the Copy button copies the code on screen after an icon is chosen', async ({ page }) => {
    await open(page);
    const copy = tryIt(page).getByRole('button', { name: /copy/i });
    for (const where of ['start', 'only', 'end']) {
      await chooseIcon(page, where);
      const now = ((await codeOf(page).textContent()) ?? '').trim();
      expect(now, where).toContain('<svg');
      await copy.click();
      await expect.poll(() => copiedText(page)).toBe(now);
    }
  });

  test('an icon keeps the variant, the size and the full width, and going back to none leaves the button as it began', async ({ page }) => {
    await open(page);
    const first = await preview(page).evaluate((b) => b.outerHTML);
    await tryIt(page).getByRole('radio', { name: 'Danger', exact: true }).check();
    await tryIt(page).getByRole('radio', { name: 'Large', exact: true }).check();
    await tryIt(page).getByRole('checkbox', { name: 'Fill the width of its container', exact: true }).check();
    const classes = async () => preview(page).evaluate((b) => [...b.classList].sort());
    const withoutIcon = await classes();
    for (const where of ['start', 'end', 'only']) {
      await chooseIcon(page, where);
      expect(await classes(), `${where}: the class list is untouched`).toEqual(withoutIcon);
    }
    // And a new variant after the icon keeps the icon
    await tryIt(page).getByRole('radio', { name: 'Ghost', exact: true }).check();
    expect(await partsOf(page), 'the icon survives a new variant').toEqual(['svg', expect.stringMatching(/^span\.u-sr-only:/)]);
    // Back to the beginning
    await tryIt(page).getByRole('radio', { name: 'Primary', exact: true }).check();
    await tryIt(page).getByRole('radio', { name: 'Default', exact: true }).check();
    await tryIt(page).getByRole('checkbox', { name: 'Fill the width of its container', exact: true }).uncheck();
    await chooseIcon(page, 'none');
    expect(await preview(page).evaluate((b) => b.outerHTML), 'exactly the markup it started with').toBe(first);
  });

  test('arrow keys move through the four radios of the group and change the button as they go', async ({ page }) => {
    await open(page);
    await tryIt(page).getByRole('radio', { name: 'None', exact: true }).focus();
    await page.keyboard.press('ArrowDown');
    await expect(tryIt(page).getByRole('radio', { name: WHERE.start, exact: true })).toBeChecked();
    expect(await preview(page).locator('svg').count()).toBe(1);
    await page.keyboard.press('ArrowDown');
    await expect(tryIt(page).getByRole('radio', { name: WHERE.end, exact: true })).toBeChecked();
    await page.keyboard.press('ArrowDown');
    await expect(tryIt(page).getByRole('radio', { name: WHERE.only, exact: true })).toBeChecked();
    await expect(preview(page).locator('.u-sr-only')).toHaveCount(1);
  });

  for (const theme of THEMES) {
    test(`has no serious or critical axe violation in ${theme}, with an icon only button`, async ({ page }) => {
      await open(page);
      await chooseIcon(page, 'only');
      await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
      await faded(page);
      await page.waitForTimeout(400);
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .include('form.docs-try')
        .analyze();
      const blocking = violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''));
      expect(blocking.map((v) => `${v.impact} ${v.id}: ${v.nodes[0]?.target?.join(' ')}`)).toEqual([]);
    });
  }

  test('the Spanish page has the same group, in Spanish, and the same four values', async ({ page }) => {
    await open(page, BUTTON_ES, 'Icono');
    const legends = (await tryIt(page).locator('fieldset > legend').allTextContents()).map(norm);
    expect(legends.length, 'four groups').toBe(4);
    expect(legends[2], 'the third group is the icon').toBe('Icono');
    const radios = tryIt(page).getByRole('group', { name: 'Icono', exact: true }).getByRole('radio');
    await expect(radios).toHaveCount(4);
    expect(await radios.evaluateAll((list) => list.map((r) => /** @type {HTMLInputElement} */ (r).value))).toEqual(['none', 'start', 'end', 'only']);
    await radios.nth(3).check();
    expect(await preview(page).locator('.u-sr-only').count(), 'icon only works in Spanish').toBe(1);
    expect((await codeOf(page).textContent()) ?? '').toContain('u-sr-only');
  });
});

test.describe('the examples with an icon, with JavaScript', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript: the no-JS tests are below');

  test.beforeEach(async ({ context, browserName }) => {
    if (browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  });

  const demo = (page) => page.locator('.docs-example').first();

  test('shows a button with an icon, a link with the icon after the label, and an icon only button, each named', async ({ page }) => {
    await page.goto(BUTTON);
    await idle(page);
    const withIcon = demo(page).locator('.luz-btn:has(svg)');
    expect(await withIcon.count(), 'buttons with an icon in the example').toBeGreaterThanOrEqual(3);
    const names = await withIcon.evaluateAll((list) => list.map((el) => ({ tag: el.localName, text: el.textContent?.trim() ?? '', ariaLabel: el.getAttribute('aria-label') })));
    for (const n of names) {
      expect(n.text, `${n.tag}: has text, visible or .u-sr-only`).toBeTruthy();
      expect(n.ariaLabel, 'named by text, not an aria-label').toBeNull();
    }
    expect(names.some((n) => n.tag === 'a'), 'one is a link').toBe(true);
    // The icon-only one: its text is in a .u-sr-only span and it has no other
    const iconOnly = demo(page).locator('.luz-btn:has(svg):has(.u-sr-only)');
    expect(await iconOnly.count(), 'an icon only button').toBeGreaterThanOrEqual(1);
    for (const el of await iconOnly.all()) {
      await expect(el).toHaveAccessibleName(/\S/);
      expect(await el.evaluate((b) => [...b.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim()).length), 'no visible text beside the icon').toBe(0);
    }
  });

  test('draws each icon at the size a button gives it, and mirrors the one after the label in right-to-left text', async ({ page }) => {
    await page.goto(BUTTON);
    await idle(page);
    const sizes = await demo(page).locator('.luz-btn svg').evaluateAll((list) => list.map((s) => [s.getBoundingClientRect().width, s.getBoundingClientRect().height]));
    expect(sizes.length).toBeGreaterThan(0);
    for (const [w, h] of sizes) {
      expect(w).toBeCloseTo(ICON_PX, 0);
      expect(h).toBeCloseTo(ICON_PX, 0);
    }
    const flipped = demo(page).locator('.luz-btn svg[data-luz-flip]');
    expect(await flipped.count(), 'an icon that points to the end of the line').toBeGreaterThanOrEqual(1);
    const transform = () => flipped.first().evaluate((s) => getComputedStyle(s).transform);
    expect(await transform(), 'left to right: not mirrored').toBe('none');
    await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
    expect(await transform(), 'right to left: mirrored').toBe('matrix(-1, 0, 0, 1, 0, 0)');
  });

  test('the "with an icon" snippet shows the three ways, and every svg in it is decorative with the family\'s stroke', async ({ page }) => {
    await recordCopies(page);
    await page.goto(BUTTON);
    await idle(page);
    await expect(page.locator('#code-button-icon'), 'the "with an icon" snippet').toHaveCount(1);
    const code = await page.locator('#code-button-icon').evaluate((c) => c.textContent ?? '');
    const parsed = await page.evaluate((text) => {
      const host = document.createElement('template');
      host.innerHTML = text;
      return [...host.content.querySelectorAll('.luz-btn')].map((b) => ({
        tag: b.localName,
        svgs: [...b.querySelectorAll('svg')].map((s) => ({ hidden: s.getAttribute('aria-hidden'), focusable: s.getAttribute('focusable'), viewBox: s.getAttribute('viewBox'), width: s.getAttribute('stroke-width'), flip: s.hasAttribute('data-luz-flip') })),
        srOnly: b.querySelector('.u-sr-only')?.textContent?.trim() ?? null,
        ariaLabel: b.getAttribute('aria-label'),
        visibleText: [...b.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent?.trim()).join(''),
      }));
    }, code);
    expect(parsed.length, 'three examples').toBeGreaterThanOrEqual(3);
    for (const b of parsed) {
      expect(b.svgs.length, 'an icon').toBeGreaterThan(0);
      for (const s of b.svgs) expect(s).toMatchObject({ hidden: 'true', focusable: 'false', viewBox: '0 0 24 24', width: '1.5' });
      expect(b.ariaLabel, 'no aria-label').toBeNull();
    }
    expect(parsed.filter((b) => b.srOnly && !b.visibleText).length, 'an icon only button named by a .u-sr-only span').toBeGreaterThanOrEqual(1);
    expect(parsed.filter((b) => b.visibleText).length, 'a button with a visible label').toBeGreaterThanOrEqual(1);
    expect(parsed.some((b) => b.tag === 'a' && b.svgs.some((s) => s.flip)), 'the link that points to the end carries data-luz-flip').toBe(true);
    // Its Copy button copies the snippet
    const copy = page.locator('.luz-copy-btn[data-copy-from="code-button-icon"]');
    await copy.click();
    await expect.poll(() => copiedText(page)).toBe(code.trim());
  });

  test('the table of variants and options has a row for the icon inside the button', async ({ page }) => {
    await page.goto(BUTTON);
    await idle(page);
    const rows = await page.locator('#variants ~ .luz-table-wrap table tbody tr').first().evaluate((tr) => {
      const table = tr.closest('table');
      return [...table.querySelectorAll('tbody tr')].map((r) => r.textContent?.replace(/\s+/g, ' ').trim() ?? '');
    });
    expect(rows.filter((r) => /<svg>/.test(r)).length, 'a row for <svg> inside the button').toBe(1);
  });
});

test.describe('the Button page, without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('Try it is hidden with its Icon group, and the examples with an icon are drawn and named', async ({ page }) => {
    await page.goto(BUTTON);
    await expect(tryIt(page)).toBeHidden();
    await expect(tryIt(page).getByRole('radio', { name: 'Icon only', exact: true })).toBeHidden();
    const withIcon = page.locator('.docs-example').first().locator('.luz-btn:has(svg)');
    expect(await withIcon.count(), 'buttons with an icon').toBeGreaterThanOrEqual(3);
    for (const el of await withIcon.all()) {
      await expect(el).toBeVisible();
      await expect(el).toHaveAccessibleName(/\S/);
      const box = await el.locator('svg').boundingBox();
      expect(box?.width).toBeCloseTo(ICON_PX, 0);
    }
  });
});
