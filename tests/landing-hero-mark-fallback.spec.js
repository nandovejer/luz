// @ts-check
/**
 * The hero mark in an engine without `text-box` (Firefox before 154, which includes its ESR 153). There the word
 * keeps the line box of ET Book and drops below its place; an `@supports not (text-box: ...)` block in
 * apps/landing/landing.css gives the trimmed box back with margins. Chromium has `text-box`, so the other engine is
 * simulated: a style sets `text-box: none` on the word and applies the very rules of that block, read out of the
 * stylesheet (no number is typed here). With them the hero must be where it is with `text-box`:
 *
 * - the brand is as high, and the first button of the hero is at the same height;
 * - the first screen does not grow;
 * - the fallback lives in that block alone: nothing outside it carries a margin of its own for the word.
 *
 * Runs in `chromium` and `chromium-nojs`: the word is CSS and markup.
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const CSS = readFileSync(new URL('../apps/landing/landing.css', import.meta.url), 'utf-8');
const OPENING = /@supports\s+not\s*\(\s*text-box\s*:\s*trim-both\s+cap\s+alphabetic\s*\)\s*\{/g;

/** The text between the braces of the block that opens at `from` (just after its `{`). */
function body(css, from) {
  let depth = 1;
  let i = from;
  for (; i < css.length && depth > 0; i += 1) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') depth -= 1;
  }
  return css.slice(from, i - 1);
}

/** Every `@supports not (text-box ...)` block: its inner rules, and the stylesheet without them. */
function fallbackBlocks(css) {
  const inner = [];
  let rest = '';
  let last = 0;
  for (const m of css.matchAll(OPENING)) {
    const start = m.index + m[0].length;
    const text = body(css, start);
    inner.push(text);
    rest += css.slice(last, m.index);
    last = start + text.length + 1;
  }
  rest += css.slice(last);
  return { inner, rest };
}

const { inner, rest } = fallbackBlocks(CSS);

test.describe('the hero mark without text-box: the stylesheet', () => {
  test('landing.css has one @supports not (text-box: trim-both cap alphabetic) block, for the word', () => {
    expect(inner, 'the block of the engines without text-box').toHaveLength(1);
    expect(inner[0]).toMatch(/\.landing-imago__word\s*\{[^}]*margin-block\s*:/);
  });

  test('the margins that give the box back are in that block alone', () => {
    // Outside it, the word's margin is the one that takes back the room of its padding, and nothing else
    const rules = [...rest.matchAll(/(?:^|[}\s])\.landing-imago__word\s*\{([^}]*)\}/g)].map((m) => m[1]);
    const margins = rules.flatMap((r) => [...r.matchAll(/margin-block\s*:\s*([^;]+);/g)].map((m) => m[1].trim()));
    const paddings = rules.flatMap((r) => [...r.matchAll(/padding-block\s*:\s*([^;]+);/g)].map((m) => m[1].trim()));
    expect(margins, 'one margin-block outside the block').toHaveLength(1);
    expect(paddings).toHaveLength(1);
    expect(margins[0]).toBe(`-${paddings[0]}`);
  });
});

/** Style that makes Chromium behave as an engine without `text-box`: no trim, and the rules of the block. */
const WITHOUT_TEXT_BOX = `
  .landing-imago, .landing-imago__word { text-box: none !important; }
  ${inner.join('\n')}`;

/** A style in the page; through evaluate, so it also works with JavaScript off. */
const addStyle = (page, css) =>
  page.evaluate((text) => {
    const style = document.createElement('style');
    style.textContent = text;
    document.head.append(style);
  }, css);

/** The numbers of the first screen, read in the page. */
const read = (page) =>
  page.evaluate(async () => {
    await document.fonts.ready;
    const top = (el) => el.getBoundingClientRect().top + window.scrollY;
    const first = document.querySelector('.landing-first');
    const button = document.querySelector('.landing-first .luz-hero .o-actions a, .landing-first .luz-hero .luz-btn');
    return {
      brand: document.querySelector('.landing-imago').getBoundingClientRect().height,
      button: button ? top(button) : NaN,
      first: first.getBoundingClientRect().height,
      supported: CSS.supports('text-box', 'trim-both cap alphabetic'),
    };
  });

for (const [width, height] of [[1280, 800], [768, 1024], [360, 740]]) {
  test.describe(`the hero mark without text-box at ${width} px`, () => {
    test('the brand, the first button and the first screen are where they are with text-box', async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/');
      const withBox = await read(page);
      test.skip(!withBox.supported, 'the engine under test has no text-box: nothing to simulate');
      await addStyle(page, WITHOUT_TEXT_BOX);
      const without = await read(page);
      expect(Number.isFinite(withBox.button), 'the hero has a button').toBe(true);
      expect(Math.abs(without.brand - withBox.brand), `brand ${without.brand} against ${withBox.brand}`).toBeLessThanOrEqual(2);
      expect(Math.abs(without.button - withBox.button), `first button at ${without.button} against ${withBox.button}`).toBeLessThanOrEqual(2);
      expect(Math.abs(without.first - withBox.first), `first screen ${without.first} against ${withBox.first}`).toBeLessThanOrEqual(2);
    });
  });
}

test('the simulation is faithful: without the block, an engine with no text-box does grow the first screen', async ({ page }) => {
  // The guard of the test above: if "text-box: none" changed nothing, the comparison would hold for any CSS
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const withBox = await read(page);
  test.skip(!withBox.supported, 'the engine under test has no text-box');
  await addStyle(page, '.landing-imago, .landing-imago__word { text-box: none !important; }');
  const bare = await read(page);
  expect(bare.first - withBox.first, 'the line box of the font comes back').toBeGreaterThan(10);
});
