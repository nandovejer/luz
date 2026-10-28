// @ts-check
/**
 * The look of the frequently asked questions of @luz-ds/catalog (<luz-faq>): the type steps of its parts, the
 * group titles, the hover, and the reflow. The structure, the keyboard and the markers are in tests/site-faq.spec.js.
 *
 * - The question: the body face (--luz-font-body) at weight 600, at --luz-text-lg, the size of the answer; its text
 *   can be selected. The answer: --luz-text-lg in the body face, and on the home the same size as the section leads.
 * - The group title: a label over its questions: centred, in capitals, in the sans face at --luz-text-sm (a step under
 *   the answer), weight 500, letter-spacing .08em, in --luz-text-secondary (4.5:1 on the page in the three modes).
 *   Capitals and spacing mean nothing in Arabic, which keeps neither.
 * - The hover: no underline, and the colour of the open question (--luz-brand-primary, 4.5:1 in the three modes);
 *   the keyboard focus ring is the page's; in forced colours the text stays visible.
 * - Reflow: `luz-faq` breaks a long word anywhere, so at 320 px, at 200 % and 400 % text, it adds nothing to the
 *   width of the home (in three languages) nor of its page of the docs.
 *
 * Values are resolved in the page from the tokens, and the ratios computed with tests/helpers/design-tokens.js; none
 * is typed. Runs in `chromium`.
 */
import { test, expect } from '@playwright/test';
import { MODES, contrast, formatRatio } from './helpers/design-tokens.js';

const FIXTURE = '/tests/fixtures/catalog-faq.html';
const HOME = [['/', 'en'], ['/es/', 'es'], ['/ar/', 'ar']];

/** A property of a probe element given `declaration`, as the browser computes it. */
const resolve = (page, declaration, property) => page.evaluate(([decl, prop]) => {
  const probe = Object.assign(document.createElement('div'), { style: decl });
  document.body.append(probe);
  const value = getComputedStyle(probe)[prop];
  probe.remove();
  return value;
}, [declaration, property]);
const px = async (page, token) => parseFloat(await resolve(page, `height: var(${token})`, 'height'));
const colour = (page, token) => resolve(page, `color: var(${token})`, 'color');
const family = (page, token) => resolve(page, `font-family: var(${token})`, 'fontFamily');

const summary = (page, n) => page.locator('.luz-faq__item').nth(n).locator('summary.luz-faq__question');
const styleOf = (locator, properties) => locator.evaluate((el, names) => Object.fromEntries(names.map((name) => [name, getComputedStyle(el)[name]])), properties);

async function open(page, width = 1280) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(FIXTURE);
}

test.describe('the answer', () => {
  test('is the body face at --luz-text-lg', async ({ page }) => {
    await open(page);
    await summary(page, 0).click();
    const answer = await styleOf(page.locator('#answer-delivery'), ['fontFamily', 'fontSize']);
    expect(answer.fontFamily).toBe(await family(page, '--luz-font-body'));
    expect(parseFloat(answer.fontSize)).toBe(await px(page, '--luz-text-lg'));
  });

  for (const [route] of HOME) {
    test(`${route}: on the home it is the size of the leads of the sections`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(route);
      const lead = await page.locator('.landing-inside__lead').first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      const answer = await page.locator('#faq .luz-faq__answer').first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      const faqLead = await page.locator('#faq .luz-faq__lead').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      expect(answer, 'an answer is as large as a lead').toBe(lead);
      expect(faqLead, 'and so is the FAQ\'s own lead').toBe(lead);
    });
  }
});

test.describe('the question', () => {
  test('is set in the body face, weight 600, at --luz-text-lg: the size of the answer', async ({ page }) => {
    await open(page);
    const q = await styleOf(summary(page, 0), ['fontFamily', 'fontWeight', 'fontSize', 'userSelect']);
    expect(q.fontFamily).toBe(await family(page, '--luz-font-body'));
    expect(q.fontWeight).toBe('600');
    expect(parseFloat(q.fontSize)).toBe(await px(page, '--luz-text-lg'));
    expect(q.userSelect, 'it can be copied to cite it').toBe('text');
  });
});

test.describe('the title of a group', () => {
  test('is a centred label in capitals: the sans face at --luz-text-sm, 500, .08em apart, in the secondary text colour', async ({ page }) => {
    await open(page);
    const t = await styleOf(page.locator('.luz-faq__group-title').first(), ['textAlign', 'textTransform', 'fontFamily', 'fontSize', 'fontWeight', 'letterSpacing', 'color']);
    expect(t.textAlign).toBe('center');
    expect(t.textTransform).toBe('uppercase');
    expect(t.fontFamily).toBe(await family(page, '--luz-font-sans'));
    const size = parseFloat(t.fontSize);
    expect(size).toBe(await px(page, '--luz-text-sm'));
    expect(t.fontWeight).toBe('500');
    expect(parseFloat(t.letterSpacing)).toBeCloseTo(0.08 * size, 1);
    expect(t.color).toBe(await colour(page, '--luz-text-secondary'));
  });

  test('is strictly smaller than the answer under it', async ({ page }) => {
    await open(page);
    await summary(page, 0).click();
    const title = parseFloat((await styleOf(page.locator('.luz-faq__group-title').first(), ['fontSize'])).fontSize);
    const answer = parseFloat((await styleOf(page.locator('#answer-delivery'), ['fontSize'])).fontSize);
    expect(title).toBeLessThan(answer);
  });

  for (const mode of MODES) {
    test(`its colour reads at 4.5:1 on the page in ${mode}`, () => {
      const ratio = contrast(mode, 'text-secondary', 'surface-page');
      expect(ratio, `--luz-text-secondary on --luz-surface-page: ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(4.5);
    });
  }

  test('in Arabic it has no capitals and no letter-spacing', async ({ page }) => {
    await open(page);
    const t = await page.locator('.luz-faq__group-title').first().evaluate((el) => {
      el.setAttribute('lang', 'ar');
      const s = getComputedStyle(el);
      return { transform: s.textTransform, spacing: s.letterSpacing };
    });
    expect(t.transform).toBe('none');
    expect(t.spacing === 'normal' || parseFloat(t.spacing) === 0, `letter-spacing ${t.spacing}`).toBe(true);
  });

  test('the home\'s group titles are the same label in English, and plain in Arabic', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    expect((await styleOf(page.locator('#faq .luz-faq__group-title').first(), ['textTransform'])).textTransform).toBe('uppercase');
    await page.goto('/ar/');
    const ar = await styleOf(page.locator('#faq .luz-faq__group-title').first(), ['textTransform', 'letterSpacing']);
    expect(ar.textTransform).toBe('none');
    expect(ar.letterSpacing === 'normal' || parseFloat(ar.letterSpacing) === 0, `letter-spacing ${ar.letterSpacing}`).toBe(true);
  });
});

test.describe('the hover', () => {
  test('takes the colour of the open question, with no underline', async ({ page }) => {
    await open(page);
    const brand = await colour(page, '--luz-brand-primary');
    await summary(page, 1).click();
    await page.mouse.move(0, 0);
    const opened = (await styleOf(summary(page, 1), ['color'])).color;
    expect(opened, 'the open question is in the brand colour').toBe(brand);
    await summary(page, 0).hover();
    await expect.poll(async () => (await styleOf(summary(page, 0), ['color'])).color).toBe(opened);
    expect((await styleOf(summary(page, 0), ['textDecorationLine'])).textDecorationLine).toBe('none');
  });

  for (const mode of MODES) {
    test(`the hovered question reads at 4.5:1 on the page in ${mode}`, () => {
      const ratio = contrast(mode, 'brand-primary', 'surface-page');
      expect(ratio, `--luz-brand-primary on --luz-surface-page: ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(4.5);
    });
  }

  test('the keyboard focus ring is drawn on a question, hovered or not', async ({ page }) => {
    await open(page);
    await page.locator('.luz-faq__nav a').last().focus();
    await page.keyboard.press('Tab');
    await summary(page, 0).hover();
    const ring = await styleOf(summary(page, 0), ['outlineStyle', 'outlineWidth', 'outlineColor']);
    expect(ring.outlineStyle).not.toBe('none');
    expect(parseFloat(ring.outlineWidth), 'at least 2px').toBeGreaterThanOrEqual(2);
    expect(ring.outlineColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('in forced colours the text of a question stays visible, hovered or not', async ({ page }) => {
    await open(page);
    await page.emulateMedia({ forcedColors: 'active' });
    const canvas = await resolve(page, 'color: Canvas', 'color');
    const seen = async () => styleOf(summary(page, 0), ['color', 'backgroundColor']);
    for (const state of ['rest', 'hover']) {
      if (state === 'hover') await summary(page, 0).hover();
      const s = await seen();
      expect(s.color, `${state}: the text is not the colour of the canvas`).not.toBe(canvas);
      expect(s.color, `${state}: nor of its own background`).not.toBe(s.backgroundColor);
    }
  });
});

test.describe('reflow', () => {
  test('luz-faq breaks a long word anywhere', async ({ page }) => {
    await open(page);
    expect((await styleOf(page.locator('luz-faq'), ['overflowWrap'])).overflowWrap).toBe('anywhere');
  });

  for (const [route] of HOME) {
    for (const [zoom, label] of [['200%', '200 %'], ['400%', '400 %']]) {
      test(`${route} at 320 px and ${label} text: the FAQ, every answer open, stays inside the window`, async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 800 });
        await page.goto(route);
        await page.waitForLoadState('load');
        await page.evaluate((size) => {
          document.documentElement.style.fontSize = size;
          for (const details of document.querySelectorAll('#faq details')) /** @type {HTMLDetailsElement} */ (details).open = true;
        }, zoom);
        const { stickers, excess } = await page.evaluate(() => {
          const width = document.documentElement.clientWidth;
          const faq = /** @type {HTMLElement} */ (document.querySelector('#faq'));
          return {
            // What sits inside a box that scrolls or clips on its own (a code block) does not widen the document
            stickers: [...faq.querySelectorAll('*')]
              .filter((el) => el.getBoundingClientRect().right > width + 0.5 && el.getBoundingClientRect().width > 0)
              .filter((el) => { for (let p = el.parentElement; p && p !== faq; p = p.parentElement) if (getComputedStyle(p).overflowX !== 'visible') return false; return true; })
              .slice(0, 5)
              .map((el) => `${el.localName}.${String(el.className).split(' ')[0]}: ${(el.textContent ?? '').trim().slice(0, 30)}`),
            excess: document.documentElement.scrollWidth - width,
          };
        });
        expect(stickers, 'what leaves the window').toEqual([]);
        expect(excess, 'the document does not scroll sideways').toBeLessThanOrEqual(0);
      });
    }
  }

  for (const [zoom, label] of [['200%', '200 %'], ['400%', '400 %']]) {
    test(`/docs/catalog/faq/ at 320 px and ${label} text: the FAQ adds nothing to the width of the page`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await page.goto('/docs/catalog/faq/');
      await page.waitForLoadState('load');
      const width = () => page.evaluate(() => document.documentElement.scrollWidth);
      await page.evaluate((size) => {
        document.documentElement.style.fontSize = size;
        for (const details of document.querySelectorAll('luz-faq details')) /** @type {HTMLDetailsElement} */ (details).open = true;
      }, zoom);
      const withFaq = await width();
      // What the page's own headings and tables allow: the same page without the FAQs
      await page.evaluate(() => { for (const faq of document.querySelectorAll('luz-faq')) faq.remove(); });
      const without = await width();
      expect(withFaq, `with the FAQ ${withFaq} px, without it ${without} px`).toBeLessThanOrEqual(without);
    });
  }
});
