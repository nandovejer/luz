// @ts-check
/**
 * "Your HTML comes styled" (`#native` of the home): the section that shows what core does to the HTML you write.
 *
 * - The head: the title "Your HTML comes styled" with one marked word, and a lead that says what to do ("start a
 *   project with LUZ, or migrate it page by page") with a link to the guide.
 * - Three levels, in this order: no class (the count of tags that come styled, computed from the stylesheets of
 *   core's elements/, never typed), one class (the role and the whole component), and in your project
 *   (`luz.conditional.css` and `[data-luz]`).
 * - One line about the script: "N of M components are CSS only; the rest improve with a script and work without it."
 * - The demo, three scenes on a CSS loop: a `details`, a field and a button with no class, then a link and a button
 *   with one class each. In the first two, "without LUZ" is the same HTML in a page the browser alone draws, and
 *   that is read here as computed style against a plain page; in the last, without the class. The results are
 *   pictures of the code beside them: inert, and out of the tab order. With reduced motion the first scene rests on
 *   its last frame.
 *
 * The `?native=a|b` switch of the layout is not tested: it is a prototype. Runs in `chromium` and `chromium-nojs`.
 */
import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';

const root = (path) => new URL(`../${path}`, import.meta.url);
const CATALOG = (code) => JSON.parse(readFileSync(root(`apps/landing/i18n/${code}.json`), 'utf-8'));
const plain = (html) => html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const ROUTES = [['/', 'en'], ['/es/', 'es'], ['/ar/', 'ar']];

/** The tags that come styled with no class: the elements of the fixture whose style is a stylesheet of core's elements/. */
const STYLED_TAGS = JSON.parse(readFileSync(root('tests/fixtures/html-elements.json'), 'utf-8')).elements.filter((element) => /^elements\//.test(element.styledBy)).length;
/** The components of core: one stylesheet each. */
const COMPONENTS = readdirSync(root('packages/core/src/components')).filter((file) => file.endsWith('.css') && file !== 'index.css' && !file.startsWith('_')).length;

const scenes = (page) => page.locator('#native .landing-typed__panel .landing-typed__scene');

test.describe('native: the head', () => {
  for (const [route, code] of ROUTES) {
    test(`${route}: the title has one marked word and the lead says "start or migrate", with a link to the guide`, async ({ page }) => {
      const words = CATALOG(code);
      await page.goto(route);
      await expect(page.locator('#native h2#native-title')).toHaveText(plain(words['native.title']));
      await expect(page.locator('#native-title .landing-mark')).toHaveCount(1);
      await expect(page.locator('#native .landing-inside__lead')).toHaveText(plain(words['native.lead']));
      const guide = page.locator('#native .landing-inside__lead a');
      await expect(guide).toHaveCount(1);
      await expect(guide).toHaveAttribute('href', /\/docs\/get-started\/$/);
    });
  }

  test('the English title is "Your HTML comes styled"', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#native-title')).toHaveText('Your HTML comes styled');
    await expect(page.locator('#native-title .landing-mark')).toHaveText('styled');
  });
});

test.describe('native: the three levels and the line about the script', () => {
  for (const [route, code] of ROUTES) {
    test(`${route}: no class, one class, in your project; the third names luz.conditional.css and [data-luz]`, async ({ page }) => {
      const words = CATALOG(code);
      await page.goto(route);
      const points = page.locator('#native .landing-inside__points > li');
      await expect(points).toHaveCount(3);
      for (const [index, key] of ['p1', 'p2', 'p3'].entries()) {
        await expect(points.nth(index).locator('strong')).toHaveText(words[`native.${key}.name`]);
        await expect(points.nth(index).locator('svg')).toHaveAttribute('aria-hidden', 'true');
      }
      await expect(points.nth(2).locator('code').first()).toHaveText('luz.conditional.css');
      await expect(points.nth(2)).toContainText('[data-luz]');
    });
  }

  test('the first level counts the tags that come styled: the number is the fixture\'s, not typed', async ({ page }) => {
    await page.goto('/');
    expect(STYLED_TAGS, 'a count to speak of').toBeGreaterThan(40);
    await expect(page.locator('#native .landing-inside__points > li').nth(0)).toContainText(`${STYLED_TAGS} tags come styled as they are`);
  });

  for (const [route, code] of ROUTES) {
    test(`${route}: the line about the script says how many components are CSS only, of all of them`, async ({ page }) => {
      await page.goto(route);
      const line = page.locator('#native .landing-native__js');
      await expect(line).toHaveCount(1);
      const [cssOnly, components] = (await line.innerText()).match(/\d+/g).map(Number);
      expect(components, `all the components of core (${code})`).toBe(COMPONENTS);
      expect(cssOnly, 'some are CSS only').toBeGreaterThan(0);
      expect(cssOnly, 'and the rest have a script').toBeLessThan(components);
      await expect(line).not.toContainText('{n');
    });
  }

  test('a link to every HTML tag closes the head', async ({ page }) => {
    await page.goto('/');
    const cta = page.locator('#native a.landing-inside__cta');
    await expect(cta).toHaveText('See all HTML tags');
    await expect(cta).toHaveAttribute('href', '/docs/html/');
  });
});

test.describe('native: the demo', () => {
  test('three scenes, each a block of code and its result, the result a picture', async ({ page }) => {
    await page.goto('/');
    await expect(scenes(page)).toHaveCount(3);
    for (const [index, name] of ['details', 'form', 'class'].entries()) {
      const scene = scenes(page).nth(index);
      await expect(scene).toHaveClass(new RegExp(`\\blanding-typed__scene--${name}\\b`));
      const code = scene.locator('pre.luz-code-block');
      await expect(code, `${name}: the code is a named region you can focus`).toHaveAttribute('tabindex', '0');
      await expect(code).toHaveAttribute('role', 'region');
      await expect(code).toHaveAttribute('dir', 'ltr');
      expect(((await code.getAttribute('aria-label')) ?? '').length, `${name}: named`).toBeGreaterThan(10);
      const result = scene.locator('.landing-typed__result');
      await expect(result, `${name}: the result is inert`).toHaveAttribute('inert', '');
      await expect(result.locator('.landing-typed__state--raw')).toHaveCount(1);
      await expect(result.locator('.landing-typed__state--luz')).toHaveCount(1);
      await expect(result.locator('.landing-typed__mode')).toHaveCount(3);
      for (const mode of ['light', 'dark', 'high-contrast']) await expect(result.locator(`.landing-typed__mode[data-theme="${mode}"]`)).toHaveCount(1);
    }
  });

  test('the captions say which is which: without LUZ and with it; in the last scene, without the class and with it', async ({ page }) => {
    await page.goto('/');
    const words = CATALOG('en');
    const caption = (index, state) => scenes(page).nth(index).locator(`.landing-typed__state--${state} .landing-typed__caption`);
    for (const index of [0, 1]) {
      await expect(caption(index, 'raw')).toHaveText(words['typed.before']);
      await expect(caption(index, 'luz')).toHaveText(words['typed.after']);
    }
    await expect(caption(2, 'raw')).toHaveText(words['typed.class.before']);
    await expect(caption(2, 'luz')).toHaveText(words['typed.class.after']);
  });

  test('what the results hold cannot take focus: they are pictures', async ({ page }) => {
    await page.goto('/');
    const took = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('#native .landing-typed__result :is(button, input, summary, a[href])')) {
        /** @type {HTMLElement} */ (el).focus();
        out.push(document.activeElement === el);
      }
      return out;
    });
    expect(took.length, 'there are controls in the pictures').toBeGreaterThan(5);
    expect(took.every((focused) => focused === false)).toBe(true);
  });

  test('the markup shown is the markup drawn: the first two scenes have no class in their code, the last has them', async ({ page }) => {
    await page.goto('/');
    for (const index of [0, 1]) await expect(scenes(page).nth(index).locator('pre.luz-code-block')).not.toContainText('class=');
    await expect(scenes(page).nth(2).locator('pre.luz-code-block')).toContainText('class="luz-btn luz-btn--primary"');
    await expect(scenes(page).nth(2).locator('pre.luz-code-block')).toContainText('class="luz-btn luz-btn--danger"');
  });
});

/**
 * The properties that tell a control of the browser's own style sheet from a styled one, per tag. Read from the same
 * HTML in an iframe with no style: that is "a page without LUZ".
 */
const UA_PROPERTIES = {
  details: ['display', 'backgroundColor', 'borderTopWidth', 'borderTopLeftRadius', 'paddingTop', 'marginTop', 'fontFamily', 'fontSize', 'color'],
  summary: ['display', 'cursor', 'listStyleType', 'backgroundColor', 'borderTopWidth', 'paddingTop', 'paddingLeft', 'fontFamily', 'fontSize', 'fontWeight', 'color'],
  p: ['marginTop', 'marginBottom', 'fontFamily', 'fontSize', 'lineHeight', 'color'],
  label: ['display', 'fontFamily', 'fontSize', 'color', 'cursor'],
  input: ['backgroundColor', 'borderTopWidth', 'borderTopStyle', 'borderTopLeftRadius', 'paddingTop', 'paddingLeft', 'boxShadow', 'fontFamily', 'fontSize', 'color'],
  button: ['backgroundColor', 'borderTopWidth', 'borderTopStyle', 'borderTopLeftRadius', 'paddingTop', 'paddingLeft', 'boxShadow', 'fontFamily', 'fontSize', 'color', 'cursor'],
};

test.describe('native: "without LUZ" is the browser\'s own', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'the plain page is built by a script');

  for (const index of [0, 1]) {
    test(`scene ${index + 1}: every element of the "before" side computes as the same element in a page with no style`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto('/');
      const result = await page.evaluate(async ({ i, tags }) => {
        const pane = document.querySelectorAll('#native .landing-typed__scene')[i].querySelector('.landing-typed__state--raw .landing-typed__pane--before');
        if (!pane) return { missing: true };
        // The same HTML in a document with no style sheet at all: what the browser draws alone
        const frame = document.createElement('iframe');
        frame.style.cssText = 'position:absolute;inline-size:600px;block-size:400px;visibility:hidden';
        frame.srcdoc = `<!doctype html><html><body>${pane.innerHTML}</body></html>`;
        document.body.append(frame);
        await new Promise((resolve) => frame.addEventListener('load', resolve, { once: true }));
        const plainDocument = /** @type {Document} */ (frame.contentDocument);
        const differences = [];
        let compared = 0;
        for (const tag of Object.keys(tags)) {
          const ours = [...pane.querySelectorAll(tag)];
          const theirs = [...plainDocument.body.querySelectorAll(tag)];
          if (ours.length !== theirs.length) differences.push(`${tag}: ${ours.length} here, ${theirs.length} in the plain page`);
          ours.forEach((el, n) => {
            const a = getComputedStyle(el);
            const b = /** @type {Window} */ (frame.contentWindow).getComputedStyle(theirs[n]);
            for (const property of tags[tag]) {
              compared += 1;
              if (a[property] !== b[property]) differences.push(`${tag} ${property}: ${a[property]} here, ${b[property]} in a page with no style`);
            }
          });
        }
        frame.remove();
        return { missing: false, differences, compared };
      }, { i: index, tags: UA_PROPERTIES });
      expect(result.missing, 'the "before" side is a page of its own: .landing-typed__pane--before').toBe(false);
      expect(result.compared, 'something was compared').toBeGreaterThan(15);
      expect(result.differences).toEqual([]);
    });

    test(`scene ${index + 1}: the "after" side is not the browser's: its controls differ from the plain page`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto('/');
      const same = await page.evaluate(async (i) => {
        const scene = document.querySelectorAll('#native .landing-typed__scene')[i];
        const before = scene.querySelector('.landing-typed__state--raw .landing-typed__pane--before');
        const after = scene.querySelector('.landing-typed__state--luz .landing-typed__pane');
        if (!before || !after) return null;
        let differing = 0;
        for (const tag of ['summary', 'button', 'input', 'details']) {
          const a = after.querySelector(tag);
          const b = before.querySelector(tag);
          if (!a || !b) continue;
          const x = getComputedStyle(a);
          const y = getComputedStyle(b);
          if (['backgroundColor', 'borderTopLeftRadius', 'borderTopWidth', 'paddingTop', 'fontFamily', 'fontSize'].some((property) => x[property] !== y[property])) differing += 1;
        }
        return differing;
      }, index);
      expect(same, 'the "after" side exists').not.toBeNull();
      expect(same, 'at least one of its controls looks different').toBeGreaterThan(0);
    });
  }
});

test.describe('native: motion', () => {
  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('the first scene rests on its last frame: all its code, LUZ\'s result and its three modes; the others are not shown', async ({ page }) => {
      await page.goto('/');
      await expect(scenes(page).nth(0)).toBeVisible();
      await expect(scenes(page).nth(1)).toBeHidden();
      await expect(scenes(page).nth(2)).toBeHidden();
      for (const line of await scenes(page).nth(0).locator('.landing-typed__line').all()) {
        await expect(line).toBeVisible();
        await expect(line).toHaveCSS('clip-path', 'none');
      }
      await expect(scenes(page).nth(0).locator('.landing-typed__state--luz')).toBeVisible();
      await expect(scenes(page).nth(0).locator('.landing-typed__state--luz')).toHaveCSS('opacity', '1');
      await expect(scenes(page).nth(0).locator('.landing-typed__modes')).toBeVisible();
      await expect(scenes(page).nth(0).locator('.landing-typed__modes')).toHaveCSS('opacity', '1');
    });
  });

  test.describe('with motion', () => {
    test.use({ reducedMotion: 'no-preference' });

    test('the scenes play on a loop of CSS animations, no script', async ({ page }) => {
      await page.goto('/');
      const names = await scenes(page).evaluateAll((all) => all.map((el) => getComputedStyle(el).animationName));
      expect(names.length).toBe(3);
      for (const name of names) expect(name, 'each scene is animated').not.toBe('none');
      expect(new Set(names).size, 'each its own').toBe(3);
    });
  });
});
