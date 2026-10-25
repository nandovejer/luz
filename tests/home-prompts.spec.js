// @ts-check
/**
 * The fourth level of the home, "Your whole site from a prompt" (.claude/plans/ai-and-catalog-only.md, decision 23,
 * phase F4). `#inside-4` of /, /es/ and /ar/ is four cards in a list (landing, blog, app, docs), each with an opener
 * of its prompt and a link to its recipes, and under them "Start from scratch", the general prompt. The footer lists
 * the four kinds of site. What it checks:
 *
 *   - structure and names: eyebrow, title, the cards in order with an h3 each, every opener a link to
 *     /prompts/<id>.txt marked data-prompt-open, named by its words and the card's title (five openers told apart),
 *     a recipes link to the kind's page of the docs; no install tabs, no terminal, no weight;
 *   - without JavaScript (these tests switch it off themselves, so they run in the chromium project too): the
 *     openers stay links to the text files, there is no dialog;
 *   - with JavaScript: the openers are buttons, each opens a modal dialog titled by its data-prompt-title, Escape
 *     closes it and gives the focus back to the button; axe passes on the section;
 *   - reflow (WCAG 1.4.10): no horizontal overflow at 320 px, nor at 400 % text, in English and Arabic.
 *
 * The dialog itself (laid out text, Copy, progress) is tests/prompt-dialog.spec.js.
 * Run with: pnpm exec playwright test tests/home-prompts.spec.js --project=chromium
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PROMPT_KINDS } from '../scripts/docs-site/prompts.js';
import { faded } from './helpers/settle.js';

const fromRepo = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url));
const catalog = (lang) => JSON.parse(readFileSync(fromRepo(`apps/landing/i18n/${lang}.json`), 'utf-8'));
/** The text of a catalog value that is trusted inline HTML, as a reader gets it. */
const plain = (html) => html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

const ROUTES = [
  ['/', 'en'],
  ['/es/', 'es'],
  ['/ar/', 'ar'],
];
/** The four cards, in the order of the page; the fifth prompt, "start", is the general one under them. */
const KINDS = PROMPT_KINDS.map((kind) => kind.id).filter((id) => id !== 'start');
const PROMPT_IDS = PROMPT_KINDS.map((kind) => kind.id);
/** The path of the page of a kind in the docs of a language (Arabic has no docs yet: English, said by hreflang). */
const recipesPath = (lang, id) => `${lang === 'es' ? '/es' : ''}/docs/kinds/${id}/`;

/**
 * What the reader sees of each opener in a language: the name of its control, the title its dialog
 * must have (data-prompt-title) and the file it points at.
 */
function openers(words) {
  return [
    ...KINDS.map((id) => ({ id, name: `${words['inside.kind.open']} ${words[`inside.kind.${id}.title`]}`, title: words[`inside.kind.${id}.prompt`] })),
    { id: 'start', name: words['inside.start.open'], title: words['inside.start.prompt'] },
  ];
}

const section = (page) => page.locator('section#inside-4');

async function open(page, route) {
  await page.goto(route);
  await page.waitForLoadState('load');
}

test('the prompts the home points at are five: the four kinds and the general one', () => {
  expect(KINDS).toEqual(['landing', 'blog', 'app', 'docs']);
  expect(PROMPT_IDS).toEqual(['start', ...KINDS]);
});

for (const [route, lang] of ROUTES) {
  const words = catalog(lang);

  test.describe(`${route} without JavaScript`, () => {
    test.use({ javaScriptEnabled: false });

    test('level 4 is the eyebrow, the title and four cards in order, each with an h3', async ({ page }) => {
      await open(page, route);

      await expect(section(page).locator('.landing-inside__eyebrow')).toHaveText(plain(words['inside.l4.eyebrow']));
      await expect(section(page).locator('h2.landing-inside__title')).toHaveText(plain(words['inside.l4.title']));
      const cards = section(page).locator('ul.landing-inside__kinds');
      await expect(cards).toHaveAccessibleName(words['inside.l4.panel']);
      await expect(cards.locator('> li')).toHaveCount(4);
      for (const [index, id] of KINDS.entries()) {
        const card = cards.locator('> li').nth(index);
        await expect(card, id).toHaveClass(new RegExp(`landing-kind--${id}\\b`));
        await expect(card.getByRole('heading', { level: 3 }), id).toHaveText(words[`inside.kind.${id}.title`]);
        await expect(card, id).toContainText(words[`inside.kind.${id}.text`]);
      }
    });

    test('the five openers are links to the text of their prompt, named apart, and there is no dialog', async ({ page }) => {
      await open(page, route);

      for (const { id, name, title } of openers(words)) {
        const link = section(page).getByRole('link', { name, exact: true });
        await expect(link, name).toHaveCount(1);
        await expect(link, name).toHaveAttribute('href', `/prompts/${id}.txt`);
        await expect(link, name).toHaveAttribute('data-prompt-open', '');
        await expect(link, name).toHaveAttribute('data-prompt-title', title);
      }
      await expect(section(page).locator('[data-prompt-open]')).toHaveCount(5);
      await expect(section(page).getByRole('button')).toHaveCount(0);
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.locator('dialog[open]')).toHaveCount(0);
      // The skeleton of the dialog is on the page once, for the script to use
      await expect(page.locator('template#site-prompt-dialog')).toHaveCount(1);
      // What the link opens is the text itself
      for (const id of PROMPT_IDS) {
        const response = await page.request.get(`/prompts/${id}.txt`);
        expect(response.status(), id).toBe(200);
        expect(response.headers()['content-type'], id).toMatch(/^text\/plain/);
      }
    });

    test('each card has a link to its recipes, named by the card, in the docs of the language', async ({ page }) => {
      await open(page, route);

      for (const id of KINDS) {
        const name = `${words['inside.kind.recipes']} ${words[`inside.kind.${id}.title`]}`;
        const link = section(page).getByRole('link', { name, exact: true });
        await expect(link, name).toHaveCount(1);
        await expect(link, name).toHaveAttribute('href', recipesPath(lang, id));
        if (lang === 'ar') await expect(link, name).toHaveAttribute('hreflang', 'en');
      }
    });

    test('the level installs nothing: no install tabs, no terminal, no npm command, no weight', async ({ page }) => {
      await open(page, route);

      await expect(section(page).locator('.luz-terminal, .luz-tabs, .luz-copy-btn, [data-copy-from], pre')).toHaveCount(0);
      const text = await section(page).innerText();
      expect(text).not.toContain('npm install');
      expect(text).not.toContain('@luz-ds/');
      expect(text).not.toMatch(/\bKB\b/i);
      await expect(section(page).locator('.landing-inside__points > li')).toHaveCount(3);
      for (const [index, key] of ['p1', 'p2', 'p3'].entries()) {
        await expect(section(page).locator('.landing-inside__points > li').nth(index).locator('strong')).toHaveText(words[`inside.l4.${key}.name`]);
      }
    });

    test('the footer lists the four kinds of site, and the packages are tokens, core and catalog', async ({ page }) => {
      await open(page, route);

      const footer = page.locator('footer.luz-landing-footer');
      await expect(footer.getByRole('heading', { level: 3, name: words['footer.kinds'] })).toHaveCount(1);
      const kinds = footer.getByRole('list', { name: words['footer.kinds'] }).getByRole('link');
      await expect(kinds).toHaveText(KINDS.map((id) => words[`inside.kind.${id}.title`]));
      expect(await kinds.evaluateAll((all) => all.map((a) => a.getAttribute('href')))).toEqual(KINDS.map((id) => recipesPath(lang, id)));
      const packages = footer.getByRole('list', { name: words['footer.packages'] }).getByRole('link');
      await expect(packages).toHaveText(['tokens', 'core', 'catalog'].map((name) => words[`footer.pkg.${name}`]));
    });
  });

  test.describe(`${route} with JavaScript`, () => {
    test('the five openers are buttons with the names of the links, and none of them is a link any more', async ({ page }) => {
      await open(page, route);

      for (const { name } of openers(words)) {
        await expect(section(page).getByRole('button', { name, exact: true }), name).toHaveCount(1);
        await expect(section(page).getByRole('link', { name, exact: true }), name).toHaveCount(0);
      }
      await expect(section(page).getByRole('button')).toHaveCount(5);
      // The recipes stay links
      await expect(section(page).getByRole('link', { name: new RegExp(`^${words['inside.kind.recipes']} `) })).toHaveCount(4);
      await expect(page.locator('template#site-prompt-dialog')).toHaveCount(1);
    });

    test('each opener opens the dialog titled with its prompt, Escape closes it and gives the focus back', async ({ page }) => {
      await open(page, route);

      for (const { name, title } of openers(words)) {
        const button = section(page).getByRole('button', { name, exact: true });
        await expect(button, name).toBeVisible();
        await button.focus();
        await page.keyboard.press('Enter');
        const dialog = page.getByRole('dialog', { name: title, exact: true });
        await expect(dialog, name).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(dialog, name).toBeHidden();
        await expect(button, name).toBeFocused();
      }
    });

    test('axe finds nothing in the fourth level', async ({ page }) => {
      await open(page, route);
      await expect(section(page).getByRole('button')).toHaveCount(5);
      await faded(page);

      const results = await new AxeBuilder({ page }).include('#inside-4').analyze();
      expect(results.violations, results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join(' | ')).toEqual([]);
    });
  });
}

/* ---- Reflow (WCAG 1.4.10) ------------------------------------------------- */

for (const [route, lang] of ROUTES.filter(([, lang]) => lang !== 'es')) {
  for (const zoom of [100, 400]) {
    test(`${route}: at 320 px${zoom === 400 ? ' and 400 % text' : ''} nothing of the fourth level leaves the viewport sideways`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await open(page, route);
      if (zoom === 400) await page.evaluate(() => { document.documentElement.style.fontSize = '400%'; });
      await section(page).scrollIntoViewIfNeeded();
      await faded(page);

      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), 'the page scrolls sideways').toBeLessThanOrEqual(0);
      const outside = await section(page).locator('a, button, h3, p, li').evaluateAll((all) =>
        all
          .map((el) => ({ el, box: el.getBoundingClientRect() }))
          .filter(({ box }) => box.width > 0 && (box.right > window.innerWidth + 0.5 || box.left < -0.5))
          .map(({ el, box }) => `${el.localName}.${el.className} spans ${Math.round(box.left)}-${Math.round(box.right)}`),
      );
      expect(outside, `${lang}: ${outside.join(' | ')}`).toEqual([]);
    });
  }
}
