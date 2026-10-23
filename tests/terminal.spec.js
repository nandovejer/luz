// @ts-check
/**
 * Terminal (components/terminal.css) and the pill variant of tabs
 * (.luz-tabs--pill, components/tabs.css).
 *
 * A terminal is a framed block: its tabs are the title bar, each pane holds a
 * Copy button, shown at the end of the title bar, and a code block with no
 * frame of its own. initTabs() makes it ARIA tabs; without JavaScript every
 * pane shows, stacked, and the Copy button (which would do nothing) is gone.
 * The pill tabs may hold an icon, show the open tab as a chip and drop the
 * icon on a phone. Fixture: tests/fixtures/terminal.html.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readPoints, paintOf } from './helpers/pixels.js';
import { settled } from './helpers/settle.js';
import { MODES } from './helpers/design-tokens.js';
import { ratio } from '../packages/tokens/lib/contrast.js';

const FIXTURE = '/tests/fixtures/terminal.html';
const AA = 4.5; // WCAG 1.4.3 for text; the high-contrast theme promises more, but this is the floor

const setMode = async (page, mode) => {
  await page.evaluate((m) => { document.documentElement.dataset.theme = m; }, mode);
  await settled(page);
};

const rgb = ([r, g, b]) => ({ r, g, b, a: 1 });

/** The painted colour of an element's text, as [r, g, b]. */
const textOf = (locator) =>
  locator.evaluate((el) => getComputedStyle(el).color.match(/[\d.]+/g).slice(0, 3).map(Number));

/** The pixel painted `dx`, `dy` inside an element (at rest: the pointer is moved away first). */
async function pixelIn(page, locator, dx, dy) {
  await page.mouse.move(0, 0);
  const png = await locator.screenshot();
  const [pixel] = await readPoints(page, png, [[dx, dy]]);
  return pixel;
}

const box = (locator) => locator.evaluate((el) => el.getBoundingClientRect().toJSON());

test.describe('terminal', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(FIXTURE);
    await expect(page.locator('#term .luz-terminal__tabs')).toHaveAttribute('role', 'tablist');
  });

  test('is a framed block: a border, rounded corners and a tint of its own', async ({ page }) => {
    const frame = await page.locator('#term').evaluate((el) => {
      const s = getComputedStyle(el);
      return { width: s.borderTopWidth, style: s.borderTopStyle, radius: s.borderTopLeftRadius, bg: s.backgroundColor };
    });
    expect(frame.width).toBe('1px');
    expect(frame.style).toBe('solid');
    expect(parseFloat(frame.radius)).toBeGreaterThan(0);
    expect(frame.bg).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('its tabs are the title bar: a tablist of two tabs, the first open, only its pane shown', async ({ page }) => {
    const tabs = page.locator('#term').getByRole('tab');
    await expect(page.locator('#term').getByRole('tablist')).toHaveAccessibleName('Install');
    await expect(tabs).toHaveText(['npm', 'CDN']);
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'false');
    await expect(page.locator('#term-npm-pane')).toBeVisible();
    await expect(page.locator('#term-cdn-pane')).toBeHidden();
    // The title bar is above the code, and a hairline separates them
    const [bar, code] = await Promise.all([box(page.locator('#term .luz-terminal__tabs')), box(page.locator('#term-npm-pane pre.luz-terminal__code'))]);
    expect(bar.bottom).toBeLessThanOrEqual(code.top);
    expect(await page.locator('#term .luz-terminal__tabs').evaluate((el) => getComputedStyle(el).borderBottomWidth)).toBe('1px');
  });

  test('a click opens the other pane and hides the first', async ({ page }) => {
    const tabs = page.locator('#term').getByRole('tab');
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#term-cdn-pane')).toBeVisible();
    await expect(page.locator('#term-npm-pane')).toBeHidden();
  });

  test('the arrow keys, Home and End move between the tabs and open their pane', async ({ page }) => {
    const tabs = page.locator('#term').getByRole('tab');
    await tabs.nth(0).focus();
    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(1)).toBeFocused();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#term-cdn-pane')).toBeVisible();
    await page.keyboard.press('ArrowRight'); // wraps
    await expect(tabs.nth(0)).toBeFocused();
    await page.keyboard.press('End');
    await expect(tabs.nth(1)).toBeFocused();
    await page.keyboard.press('Home');
    await expect(tabs.nth(0)).toBeFocused();
    await expect(page.locator('#term-npm-pane')).toBeVisible();
    // Roving tabindex: only the open tab is in the Tab order
    await expect(tabs.nth(0)).toHaveAttribute('tabindex', '0');
    await expect(tabs.nth(1)).toHaveAttribute('tabindex', '-1');
  });

  test('the code block has no frame, no fill and no language label of its own', async ({ page }) => {
    const pre = page.locator('#term-npm-pane pre.luz-terminal__code');
    const facts = await pre.evaluate((el) => {
      const s = getComputedStyle(el);
      const before = getComputedStyle(el, '::before');
      return { border: s.borderTopWidth, bg: s.backgroundColor, before: before.display === 'none' || before.content === 'none' || before.content === 'normal' };
    });
    expect(facts.border).toBe('0px');
    expect(facts.bg).toBe('rgba(0, 0, 0, 0)');
    expect(facts.before, 'the ::before language label of .luz-code-block does not apply to .luz-terminal__code').toBe(true);
  });

  test('a bash block shows a "$ " prompt before the command; another language does not', async ({ page }) => {
    const prompt = (selector) => page.locator(selector).evaluate((el) => getComputedStyle(el, '::before').content);
    expect(await prompt('#term-npm')).toBe('"$ "');
    await page.locator('#term').getByRole('tab', { name: 'CDN' }).click();
    expect(['none', 'normal']).toContain(await prompt('#term-cdn'));
    // The prompt is generated content: the text to copy and to read stays the bare command
    await expect(page.locator('#term-npm')).toHaveText('npm install @luz-ds/core');
  });

  test('the Copy button sits at the end of the title bar, level with the tabs', async ({ page }) => {
    for (const [tab, pane] of [['npm', 'term-npm-pane'], ['CDN', 'term-cdn-pane']]) {
      await page.locator('#term').getByRole('tab', { name: tab }).click();
      const button = page.locator(`#${pane} > .luz-copy-btn`);
      await expect(button).toBeVisible();
      const [b, bar, frame, last] = await Promise.all([
        box(button),
        box(page.locator('#term .luz-terminal__tabs')),
        box(page.locator('#term')),
        box(page.locator('#term').getByRole('tab').last()),
      ]);
      expect(b.top, `${tab}: not above the bar`).toBeGreaterThanOrEqual(bar.top);
      expect(b.bottom, `${tab}: not below the bar`).toBeLessThanOrEqual(bar.bottom);
      expect(frame.right - b.right, `${tab}: inside the frame`).toBeGreaterThanOrEqual(0);
      expect(frame.right - b.right, `${tab}: at the end`).toBeLessThan(32);
      expect(b.left, `${tab}: clear of the last tab`).toBeGreaterThanOrEqual(last.right);
    }
  });

  test('in a right-to-left page the Copy button moves to the left end', async ({ page }) => {
    await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
    const [b, frame] = await Promise.all([box(page.locator('#term-npm-pane > .luz-copy-btn')), box(page.locator('#term'))]);
    expect(b.left - frame.left).toBeGreaterThanOrEqual(0);
    expect(b.left - frame.left).toBeLessThan(32);
  });

  test('with luz.js loaded each pane has one Copy button, not a second one added inside the code block', async ({ page }) => {
    for (const [tab, pane] of [['npm', 'term-npm-pane'], ['CDN', 'term-cdn-pane']]) {
      await page.locator('#term').getByRole('tab', { name: tab }).click();
      await expect(page.locator(`#${pane} .luz-copy-btn:visible`), tab).toHaveCount(1);
      await expect(page.locator(`#${pane} pre.luz-terminal__code .luz-copy-btn`), tab).toHaveCount(0);
    }
  });

  test('with luz.js loaded the code of a pane is left as the markup wrote it: no button, no new name, no highlighting', async ({ page }) => {
    for (const [tab, pane, name] of [['npm', 'term-npm-pane', 'npm'], ['CDN', 'term-cdn-pane', 'CDN']]) {
      await page.locator('#term').getByRole('tab', { name: tab }).click();
      const pre = page.locator(`#${pane} pre`);
      // It is the terminal's own code element, not a .luz-code-block that initHighlight() enhances
      await expect(pre, tab).toHaveClass('luz-terminal__code');
      await expect(pre.locator('button'), `${tab}: a button inside the code`).toHaveCount(0);
      await expect(page.locator(`#${pane} .luz-code-block__copy`), tab).toHaveCount(0);
      await expect(pre, `${tab}: aria-label is the markup's`).toHaveAttribute('aria-label', name);
      await expect(pre, tab).toHaveAttribute('role', 'region');
      await expect(pre, tab).toHaveAttribute('tabindex', '0');
      await expect(pre.locator('code > *'), `${tab}: the command is not split in highlight tokens`).toHaveCount(0);
    }
  });

  test('the code is monospace, never wraps, scrolls sideways and keeps the rhythm of a code block', async ({ page }) => {
    const facts = await page.locator('#term-npm-pane pre.luz-terminal__code').evaluate((el) => {
      const s = getComputedStyle(el);
      const probe = document.createElement('span');
      probe.style.fontFamily = 'var(--luz-font-mono)';
      document.body.append(probe);
      const mono = getComputedStyle(probe).fontFamily;
      probe.remove();
      const code = getComputedStyle(el.querySelector('code'));
      return {
        font: s.fontFamily, mono, whiteSpace: s.whiteSpace, overflowX: s.overflowX,
        lineHeight: parseFloat(s.lineHeight) / parseFloat(s.fontSize),
        padding: [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft].map(parseFloat),
        codeFont: code.fontFamily, codeColor: code.color, preColor: s.color,
        codeSize: code.fontSize, preSize: s.fontSize,
      };
    });
    expect(facts.mono, 'the --luz-font-mono token resolves to a stack').toMatch(/monospace/i);
    expect(facts.font).toBe(facts.mono);
    expect(facts.whiteSpace).toBe('pre');
    expect(facts.overflowX).toBe('auto');
    expect(facts.lineHeight).toBeCloseTo(1.6, 1);
    for (const side of facts.padding) expect(side, 'padding').toBeGreaterThan(0);
    expect(facts.codeFont, 'the code inherits the font').toBe(facts.font);
    expect(facts.codeColor, 'the code inherits the colour').toBe(facts.preColor);
    expect(facts.codeSize, 'the code inherits the size').toBe(facts.preSize);
  });

  test('the "$ " prompt is only on a bash block', async ({ page }) => {
    await page.locator('#term').getByRole('tab', { name: 'CDN' }).click();
    const content = await page.locator('#term-cdn-pane pre.luz-terminal__code').evaluate((el) => ({
      pre: getComputedStyle(el, '::before').content,
      code: getComputedStyle(el.querySelector('code'), '::before').content,
    }));
    expect(['none', 'normal']).toContain(content.pre);
    expect(['none', 'normal']).toContain(content.code);
  });

  test('the code takes the keyboard focus from the Copy button and shows a ring', async ({ page }) => {
    const pre = page.locator('#term-npm-pane pre.luz-terminal__code');
    await page.locator('#term').getByRole('tab', { name: 'npm' }).focus();
    for (let i = 0; i < 6 && !(await pre.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press('Tab');
    await expect(pre).toBeFocused();
    const ring = await pre.evaluate((el) => { const s = getComputedStyle(el); return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) }; });
    expect(ring.style).not.toBe('none');
    expect(ring.width).toBeGreaterThan(0);
  });

  test('the Copy button copies the command of its pane and says so', async ({ page, context, browserName }) => {
    test.skip(browserName === 'firefox', 'clipboard permissions are not available in Playwright Firefox');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const button = page.locator('#term-npm-pane > .luz-copy-btn');
    await button.click();
    await expect(button).toHaveClass(/is-copied/);
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('npm install @luz-ds/core');
  });

  test('the Copy button takes the keyboard focus and its ring is not covered', async ({ page }) => {
    const button = page.locator('#term-npm-pane > .luz-copy-btn');
    await button.focus();
    await expect(button).toBeFocused();
    const outline = await button.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).not.toBe('none');
    const covered = await button.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return top === el || el.contains(top) ? null : top?.className;
    });
    expect(covered, 'what is drawn over the button').toBeNull();
  });

  for (const mode of MODES) {
    test(`${mode}: the open tab and the Copy button are readable on the title bar`, async ({ page }) => {
      await setMode(page, mode);
      const tab = page.locator('#term').getByRole('tab', { selected: true });
      const tabBg = await pixelIn(page, tab, 3, 14);
      expect(ratio(rgb(await textOf(tab)), rgb(tabBg)), 'open tab').toBeGreaterThanOrEqual(AA);

      const button = page.locator('#term-npm-pane > .luz-copy-btn');
      const buttonBg = await pixelIn(page, button, 4, 12);
      expect(ratio(rgb(await textOf(button)), rgb(buttonBg)), 'copy button').toBeGreaterThanOrEqual(AA);
    });

    test(`${mode}: the command is readable on the body of the terminal`, async ({ page }) => {
      await setMode(page, mode);
      const code = page.locator('#term-npm');
      // Left padding of the pre, outside the text
      const pre = page.locator('#term-npm-pane pre.luz-terminal__code');
      const bg = await pixelIn(page, pre, 3, 20);
      expect(ratio(rgb(await textOf(code)), rgb(bg)), 'command').toBeGreaterThanOrEqual(AA);
      // The prompt is not the only thing: the muted prompt reads too
      const promptColor = await code.evaluate((el) => getComputedStyle(el, '::before').color.match(/[\d.]+/g).slice(0, 3).map(Number));
      expect(ratio(rgb(promptColor), rgb(bg)), 'prompt').toBeGreaterThanOrEqual(AA);
    });

    test(`${mode}: axe finds no serious violation`, async ({ page }) => {
      await setMode(page, mode);
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? '')), 'axe').toEqual([]);
    });
  }

  test('the second pane has no serious axe violation either', async ({ page }) => {
    await page.locator('#term').getByRole('tab', { name: 'CDN' }).click();
    const { violations } = await new AxeBuilder({ page }).include('#term').analyze();
    expect(violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))).toEqual([]);
  });

  test('forced colors: the frame is drawn, the open tab is marked and the Copy button stays in the bar', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await settled(page);
    const frame = await page.locator('#term').evaluate((el) => {
      const s = getComputedStyle(el);
      return { width: parseFloat(s.borderTopWidth), color: s.borderTopColor };
    });
    expect(frame.width).toBeGreaterThan(0);
    expect(frame.color).not.toBe('rgba(0, 0, 0, 0)');
    const tabs = page.locator('#term').getByRole('tab');
    const [open, shut] = await Promise.all([
      tabs.nth(0).evaluate((el) => getComputedStyle(el).borderBottomColor),
      tabs.nth(1).evaluate((el) => getComputedStyle(el).borderBottomColor),
    ]);
    expect(open, 'the open tab is not marked by colour of ink alone').not.toBe(shut);
    const [b, bar] = await Promise.all([box(page.locator('#term-npm-pane > .luz-copy-btn')), box(page.locator('#term .luz-terminal__tabs'))]);
    expect(b.top).toBeGreaterThanOrEqual(bar.top);
    expect(b.bottom).toBeLessThanOrEqual(bar.bottom);
    expect(await page.locator('#term-npm-pane > .luz-copy-btn').evaluate((el) => getComputedStyle(el).borderTopWidth)).not.toBe('0px');
  });

  test('at 320px nothing scrolls sideways: a long command scrolls inside its own block', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.locator('#term-npm').evaluate((el) => {
      el.textContent = 'npm install @luz-ds/core @luz-ds/site @luz-ds/landing @luz-ds/cms @luz-ds/app @luz-ds/docs';
    });
    const facts = await page.evaluate(() => {
      const pre = document.querySelector('#term-npm-pane pre.luz-terminal__code');
      const frame = document.querySelector('#term').getBoundingClientRect();
      return {
        page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        frameRight: frame.right,
        frameLeft: frame.left,
        preRight: pre.getBoundingClientRect().right,
        preOverflows: pre.scrollWidth > pre.clientWidth,
        overflowX: getComputedStyle(pre).overflowX,
      };
    });
    expect(facts.page, 'the page scrolls sideways').toBeLessThanOrEqual(0);
    expect(facts.frameLeft).toBeGreaterThanOrEqual(0);
    expect(facts.frameRight).toBeLessThanOrEqual(320);
    expect(facts.preRight, 'the code block is as wide as the frame, not as its longest line').toBeLessThanOrEqual(facts.frameRight);
    expect(facts.preOverflows, 'the long line scrolls inside the block').toBe(true);
    expect(facts.overflowX).toBe('auto');
    // The Copy button still sits in the bar and clear of the tabs
    const [b, bar, last] = await Promise.all([
      box(page.locator('#term-npm-pane > .luz-copy-btn')),
      box(page.locator('#term .luz-terminal__tabs')),
      box(page.locator('#term').getByRole('tab').last()),
    ]);
    expect(b.right).toBeLessThanOrEqual(320);
    expect(b.top).toBeGreaterThanOrEqual(bar.top);
    expect(b.bottom).toBeLessThanOrEqual(bar.bottom);
    expect(b.left).toBeGreaterThanOrEqual(last.right);
  });
});

test.describe('terminal without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(FIXTURE);
  });

  test('every pane shows, stacked, under the row of links', async ({ page }) => {
    await expect(page.locator('#term-npm-pane')).toBeVisible();
    await expect(page.locator('#term-cdn-pane')).toBeVisible();
    const [bar, first, second] = await Promise.all([box(page.locator('#term .luz-terminal__tabs')), box(page.locator('#term-npm-pane')), box(page.locator('#term-cdn-pane'))]);
    expect(first.top).toBeGreaterThanOrEqual(bar.bottom);
    expect(second.top).toBeGreaterThanOrEqual(first.bottom);
    await expect(page.locator('#term .luz-terminal__tabs a')).toHaveCount(2);
    await expect(page.locator('#term .luz-terminal__tabs')).not.toHaveAttribute('role', 'tablist');
  });

  test('the Copy button, which would do nothing, is not shown; the command is still there to select', async ({ page }) => {
    await expect(page.locator('#term-npm-pane > .luz-copy-btn')).toBeHidden();
    await expect(page.locator('#term-cdn-pane > .luz-copy-btn')).toBeHidden();
    await expect(page.locator('#term-npm')).toBeVisible();
    await expect(page.locator('#term-npm')).toHaveText('npm install @luz-ds/core');
  });

  test('the prompt still shows', async ({ page }) => {
    expect(await page.locator('#term-npm').evaluate((el) => getComputedStyle(el, '::before').content)).toBe('"$ "');
  });

  test('at 320px the stacked terminal does not scroll the page sideways', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('the pill tabs are plain links with their panels stacked and no chip', async ({ page }) => {
    await expect(page.locator('#pill-install')).toBeVisible();
    await expect(page.locator('#pill-list')).toBeVisible();
    await expect(page.locator('#pill-code')).toBeVisible();
    const chip = await page.locator('#pill .luz-tab').first().evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(chip).toBe('rgba(0, 0, 0, 0)');
  });
});

test.describe('tabs: the pill variant', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(FIXTURE);
    await expect(page.locator('#pill .luz-tabs')).toHaveAttribute('role', 'tablist');
  });

  test('works as tabs: Install first, then List and Code example; the arrow keys change the tab', async ({ page }) => {
    const tabs = page.locator('#pill').getByRole('tab');
    await expect(tabs).toHaveText(['Install', 'List', 'Code example']);
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#pill-install')).toBeVisible();
    await expect(page.locator('#pill-list')).toBeHidden();
    await tabs.nth(0).focus();
    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(1)).toBeFocused();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#pill-list')).toBeVisible();
    await expect(page.locator('#pill-install')).toBeHidden();
  });

  test('the open tab is a chip on the surface colour; the others have none', async ({ page }) => {
    const tabs = page.locator('#pill').getByRole('tab');
    const chip = (i) => tabs.nth(i).evaluate((el) => getComputedStyle(el).backgroundColor);
    const surface = await paintOf(page, 'var(--luz-surface)', page.locator('#pill'));
    const toRgb = (css) => css.match(/[\d.]+/g).slice(0, 3).map(Number);
    expect(toRgb(await chip(0))).toEqual(surface);
    expect(await chip(1)).toBe('rgba(0, 0, 0, 0)');
    expect(await chip(2)).toBe('rgba(0, 0, 0, 0)');
    await tabs.nth(2).click();
    expect(toRgb(await chip(2))).toEqual(surface);
    expect(await chip(0)).toBe('rgba(0, 0, 0, 0)');
    // The chip is rounded
    expect(parseFloat(await tabs.nth(2).evaluate((el) => getComputedStyle(el).borderTopLeftRadius))).toBeGreaterThan(0);
  });

  test('the row has no rule under it', async ({ page }) => {
    const rule = await page.locator('#pill .luz-tabs').evaluate((el) => getComputedStyle(el).borderBottomWidth);
    expect(rule).toBe('0px');
  });

  test('a tab holds its icon and its text on one line, the icon 1.15em square', async ({ page }) => {
    const tab = page.locator('#pill .luz-tab').first();
    const facts = await tab.evaluate((el) => {
      const svg = el.querySelector('svg').getBoundingClientRect();
      const label = el.querySelector('span').getBoundingClientRect();
      const em = parseFloat(getComputedStyle(el).fontSize);
      return { display: getComputedStyle(el).display, w: svg.width / em, h: svg.height / em, sameLine: Math.abs((svg.top + svg.height / 2) - (label.top + label.height / 2)) < 4, iconBeforeText: svg.right <= label.left };
    });
    expect(facts.display).toMatch(/flex/); // inline-flex, blockified to flex as an item of the row
    expect(facts.w).toBeCloseTo(1.15, 1);
    expect(facts.h).toBeCloseTo(1.15, 1);
    expect(facts.sameLine).toBe(true);
    expect(facts.iconBeforeText).toBe(true);
  });

  test('the icon shows on a wide screen and goes on a phone, the text stays', async ({ page }) => {
    const svgs = page.locator('#pill .luz-tab svg');
    await expect(svgs).toHaveCount(3);
    for (const svg of await svgs.all()) await expect(svg).toBeVisible();

    await page.setViewportSize({ width: 375, height: 700 });
    for (const svg of await svgs.all()) await expect(svg).toBeHidden();
    await expect(page.locator('#pill').getByRole('tab')).toHaveText(['Install', 'List', 'Code example']);
    for (const tab of await page.locator('#pill').getByRole('tab').all()) await expect(tab).toBeVisible();
    // The three tabs fit on a phone
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    const row = await page.locator('#pill .luz-tabs').evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(row, 'the row scrolls').toBeLessThanOrEqual(0);

    await page.setViewportSize({ width: 1280, height: 800 });
    for (const svg of await svgs.all()) await expect(svg).toBeVisible();
  });

  for (const mode of MODES) {
    test(`${mode}: the open tab reads on its chip, the others on the page`, async ({ page }) => {
      await setMode(page, mode);
      const tabs = page.locator('#pill').getByRole('tab');
      const chip = await pixelIn(page, tabs.nth(0), 3, 14);
      expect(ratio(rgb(await textOf(tabs.nth(0))), rgb(chip)), 'open tab on its chip').toBeGreaterThanOrEqual(AA);
      const rest = await pixelIn(page, tabs.nth(1), 3, 14);
      expect(ratio(rgb(await textOf(tabs.nth(1))), rgb(rest)), 'other tab').toBeGreaterThanOrEqual(AA);
    });
  }

  test('forced colors: the open tab is still told apart from the others', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await settled(page);
    const tabs = page.locator('#pill').getByRole('tab');
    const read = (i) => tabs.nth(i).evaluate((el) => {
      const s = getComputedStyle(el);
      return [s.borderBottomColor, s.borderBottomWidth, s.fontWeight, s.backgroundColor, s.color].join('|');
    });
    expect(await read(0)).not.toBe(await read(1));
  });
});
