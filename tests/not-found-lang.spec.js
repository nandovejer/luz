// @ts-check
/**
 * The language of the docs 404 page (apps/docs/404.html, apps/docs/not-found.js): English is the default and the
 * only thing shown without JavaScript. The script reads the browser's languages (navigator.languages, else
 * navigator.language), in order, with the primary subtag lowercased; the first that is "en" or names a language of the
 * docs (a `[data-not-found-lang]` section) decides. "en", or none, changes nothing; a docs language shows its section
 * and hides every `[data-not-found-default]`. "SYSTEM FAILURE." stays English in the section. Runs in `chromium`;
 * the no-JS describe sets `javaScriptEnabled: false` itself.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ENGLISH = 'p[data-not-found-default]';
const SPANISH = 'section.docs-not-found__lang[lang="es"][data-not-found-lang="es"]';
const SPANISH_LEAD = 'Lo que buscas no está aquí.';

/**
 * Open the 404 with the browser's languages set before the page's own script runs.
 * @param {import('@playwright/test').Page} page
 * @param {{ languages?: string[] | undefined, language?: string }} lang
 */
async function open(page, lang) {
  await page.addInitScript((l) => {
    if ('languages' in l) Object.defineProperty(Object.getPrototypeOf(navigator), 'languages', { configurable: true, get: () => l.languages });
    if (l.language) Object.defineProperty(Object.getPrototypeOf(navigator), 'language', { configurable: true, get: () => l.language });
  }, lang);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/404.html');
  await expect(page.locator('h1')).toHaveCount(1);
}

/** @param {import('@playwright/test').Page} page */
async function expectEnglish(page) {
  await expect(page.locator(ENGLISH)).toBeVisible();
  await expect(page.locator(ENGLISH)).not.toHaveAttribute('hidden', /.*/);
  await expect(page.locator(SPANISH)).toBeHidden();
  await expect(page.locator(SPANISH)).toHaveAttribute('hidden', /.*/);
  await expect(page.getByText(SPANISH_LEAD)).toBeHidden();
  // The English lead is the first, and the only one in the reading order that is shown
  await expect(page.locator('.docs-body .docs-lead').first()).toHaveAttribute('data-not-found-default', '');
  await expect(page.locator('main p.docs-lead:visible')).toHaveCount(1);
}

/** @param {import('@playwright/test').Page} page */
async function expectSpanish(page) {
  // The Spanish lead takes the English one's place in the reading order, in its own language
  const first = page.locator('.docs-body .docs-lead').first();
  await expect(first).toBeVisible();
  await expect(first).toHaveAttribute('lang', 'es');
  await expect(first).toHaveAttribute('dir', 'ltr');
  await expect(first).toContainText(SPANISH_LEAD);
  await expect(first.locator('span[lang="en"]')).toHaveText('SYSTEM FAILURE.');
  await expect(page.locator(ENGLISH)).toBeHidden();
  await expect(page.locator(ENGLISH)).toHaveAttribute('hidden', /.*/);
  // The section is shown and holds only the button now
  await expect(page.locator(SPANISH)).toBeVisible();
  await expect(page.locator(SPANISH)).not.toHaveAttribute('hidden', /.*/);
  await expect(page.locator(`${SPANISH} .docs-lead`)).toHaveCount(0);
  await expect(page.locator(SPANISH).getByRole('link')).toHaveCount(1);
  await expect(page.locator(SPANISH).getByRole('link', { name: 'Ir al inicio de la documentación' })).toHaveAttribute('href', '/es/docs/');
  // Reading order: the Spanish lead, the three English buttons, then the Spanish button
  const order = await page.evaluate(() => {
    const body = /** @type {Element} */ (document.querySelector('.docs-body'));
    return [...body.querySelectorAll('.docs-lead[lang="es"], .docs-not-found__links, [data-not-found-lang]')].map((el) =>
      el.matches('.docs-lead') ? 'lead-es' : el.matches('.docs-not-found__links') ? 'buttons-en' : 'section-es');
  });
  expect(order).toEqual(['lead-es', 'buttons-en', 'section-es']);
  const links = page.locator('main .docs-not-found__links');
  await expect(links.getByRole('link')).toHaveText(['A–Z index', 'Components', 'Docs home']);
}

test.describe('the not-found page picks its language from the browser', () => {
  test('en-US: the English lead is shown and the Spanish block stays hidden', async ({ page }) => {
    await open(page, { languages: ['en-US', 'en'] });
    await expectEnglish(page);
  });

  test('es-ES: the Spanish block is shown, with its lead and button, and the English lead is hidden', async ({ page }) => {
    await open(page, { languages: ['es-ES', 'es'] });
    await expectSpanish(page);
  });

  test('fr-FR, a language with no docs: English', async ({ page }) => {
    await open(page, { languages: ['fr-FR', 'fr'] });
    await expectEnglish(page);
  });

  test('["fr", "es"]: the first language that matches wins, so Spanish', async ({ page }) => {
    await open(page, { languages: ['fr', 'es'] });
    await expectSpanish(page);
  });

  test('["en", "es"]: English comes first, so English', async ({ page }) => {
    await open(page, { languages: ['en', 'es'] });
    await expectEnglish(page);
  });

  test('uses the primary subtag, lowercased: ES-mx is Spanish, EN-gb before es is English', async ({ page }) => {
    await open(page, { languages: ['ES-mx'] });
    await expectSpanish(page);
    const other = await page.context().newPage();
    await other.addInitScript(() => Object.defineProperty(Object.getPrototypeOf(navigator), 'languages', { configurable: true, get: () => ['EN-gb', 'es'] }));
    await other.goto('/404.html');
    await expectEnglish(other);
  });

  test('falls back to navigator.language when navigator.languages is empty', async ({ page }) => {
    await open(page, { languages: [], language: 'es-AR' });
    await expectSpanish(page);
  });

  test.describe('with the browser\'s own locale', () => {
    test.use({ locale: 'es-ES' });
    test('es-ES from the context is Spanish', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/404.html');
      await expectSpanish(page);
    });
  });

  test('the Spanish state has no serious or critical axe violation', async ({ page }) => {
    await open(page, { languages: ['es'] });
    await expectSpanish(page);
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    const blocking = violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''));
    expect(blocking.map((v) => `${v.impact} ${v.id}: ${v.nodes[0]?.target?.join(' ')}`)).toEqual([]);
  });

  test('the page has one h1 and one visible lead in each state', async ({ page }) => {
    await open(page, { languages: ['es'] });
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('main p.docs-lead:visible')).toHaveCount(1);
  });
});

test.describe('without JavaScript the not-found page is English', () => {
  test.use({ javaScriptEnabled: false, locale: 'es-ES' });

  test('the English lead is shown and the Spanish block stays hidden, whatever the locale', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/404.html');
    await expectEnglish(page);
    await expect(page.locator(ENGLISH).getByRole('link')).toHaveAttribute('href', 'https://youtu.be/D4eJx-0g3Do');
  });
});
