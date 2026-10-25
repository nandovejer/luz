// @ts-check
/**
 * The dialog of a prompt for AI (.claude/plans/ai-and-catalog-only.md, decisions 17 to 22 and the change of
 * 2026-10-25, phase F2). On /docs/get-started/ai/ (section #start-site) and /es/docs/get-started/ai/:
 *
 *   - without JavaScript the opener is a link to /prompts/start.txt, there is no dialog and the file answers
 *     200 as text/plain (these tests switch JavaScript off themselves, so they run in the chromium project too);
 *   - with JavaScript the opener is a button with the same name; Enter opens a modal dialog named by the
 *     opener's data-prompt-title; the prompt is fetched (same origin) when the dialog opens, laid out with an
 *     h3 per "#"/"##" heading of the .txt in a focusable, named region that ends with "End of the prompt.";
 *   - Copy is locked (aria-disabled, in the tab order, described by the help line) until the end of the prompt
 *     was read: pressed early it says so and moves the focus to the region; reaching the end unlocks it
 *     without moving the focus; then it copies exactly the .txt text. Escape closes and gives the focus back.
 *
 * The tests look at roles, names and text, not at the markup of the dialog.
 * Run with: pnpm exec playwright test tests/prompt-dialog.spec.js --project=chromium
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { copiedText, recordCopies } from './helpers/clipboard.js';
import { settled } from './helpers/settle.js';

const TXT = '/prompts/start.txt';

const PAGES = {
  en: {
    path: '/docs/get-started/ai/',
    opener: 'Open the prompt',
    title: 'The prompt to start a site',
    region: 'The prompt',
    copy: 'Copy the prompt',
    read0: 'Read 0%',
    read100: 'Read 100%',
    locked: 'Read to the end of the prompt first.',
    unlocked: "You've read it all. Copy is on.",
    copied: 'Copied the prompt.',
    failed: 'Could not load the prompt: open it as text.',
    end: 'End of the prompt.',
  },
  es: {
    path: '/es/docs/get-started/ai/',
    opener: 'Abrir el prompt',
    title: 'El prompt para empezar un sitio',
    region: 'El prompt',
    copy: 'Copiar el prompt',
    read0: 'Leído 0 %',
    end: 'Fin del prompt.',
  },
};

/** The number of headings of a Markdown text: "#" and "##" lines outside fenced code blocks. */
function headingsOf(text) {
  let fenced = false;
  let count = 0;
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    if (/^```/.test(line)) fenced = !fenced;
    else if (!fenced && /^#{1,2} /.test(line)) count += 1;
  }
  return count;
}

// The h2 has the id `start-site`; the section it names holds the opener
const section = (page) => page.locator('section:has(> #start-site)');
const opener = (page, p) => section(page).getByRole('button', { name: p.opener, exact: true });
const dialogOf = (page, p) => page.getByRole('dialog', { name: p.title });
const regionOf = (dialog, p) => dialog.getByRole('region', { name: p.region });
const copyOf = (dialog, p) => dialog.getByRole('button', { name: p.copy });
const statusOf = (dialog) => dialog.getByRole('status');
const scrollToEnd = (region) => region.evaluate((el) => { el.scrollTop = el.scrollHeight; });
const focusedNow = (page) => page.evaluate(() => `${document.activeElement?.localName}|${document.activeElement?.textContent?.trim().slice(0, 40)}`);

/** Open the dialog from the keyboard and wait for the text to be laid out. */
async function openByKeyboard(page, p) {
  await expect(opener(page, p)).toBeVisible();
  await opener(page, p).focus();
  await page.keyboard.press('Enter');
  const dialog = dialogOf(page, p);
  await expect(dialog).toBeVisible();
  await expect(regionOf(dialog, p).getByRole('heading', { level: 3 }).first()).toBeVisible();
  return dialog;
}

/* ---- Without JavaScript ------------------------------------------------ */

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  for (const [code, p] of Object.entries(PAGES)) {
    test(`${code}: the opener is a link to the text of the start prompt, and there is no dialog`, async ({ page }) => {
      await page.goto(p.path);
      const link = section(page).getByRole('link', { name: p.opener, exact: true });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', new RegExp(`${TXT.replace('.', '\\.')}$`));
      await expect(section(page).getByRole('button', { name: p.opener })).toHaveCount(0);
      await expect(page.getByRole('dialog', { includeHidden: true, name: p.title })).toHaveCount(0);
    });
  }

  test('the text answers 200 as text/plain', async ({ request }) => {
    const response = await request.get(TXT);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/^text\/plain/);
    expect((await response.text()).length).toBeGreaterThan(1000);
  });

  test('the page does not carry the text of the prompt (it is fetched, not embedded)', async ({ request }) => {
    const text = await (await request.get(TXT)).text();
    const html = await (await request.get('/docs/get-started/ai/')).text();
    const long = text.split('\n').filter((line) => line.trim().length > 80);
    expect(long.length).toBeGreaterThan(5);
    const embedded = long.filter((line) => html.includes(line.trim()));
    expect(embedded, 'lines of the prompt found in the HTML of the page').toEqual([]);
  });
});

/* ---- With JavaScript --------------------------------------------------- */

test.describe('with JavaScript', () => {
  test.beforeEach(async ({ page, context, javaScriptEnabled }, testInfo) => {
    test.skip(javaScriptEnabled === false, 'the dialog is written by JavaScript');
    test.skip(testInfo.project.name !== 'chromium', 'clipboard permissions: Chromium only');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await recordCopies(page);
  });

  test('the opener is a button with the same name, and no link of that name is left', async ({ page }) => {
    const p = PAGES.en;
    await page.goto(p.path);
    await expect(opener(page, p)).toBeVisible();
    await expect(section(page).getByRole('link', { name: p.opener })).toHaveCount(0);
  });

  test('Enter on the opener opens a modal dialog named by its title, with a link to the text', async ({ page }) => {
    const p = PAGES.en;
    await page.goto(p.path);
    await expect(opener(page, p)).toBeVisible();
    await opener(page, p).focus();
    await page.keyboard.press('Enter');
    const dialog = dialogOf(page, p);
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((d) => /** @type {HTMLDialogElement} */ (d).matches(':modal'))).toBe(true);
    await expect(dialog.locator(`a[href$="${TXT}"]`)).toHaveCount(1);
  });

  test('the prompt has an h3 per heading of the text, in a named focusable region that ends with the end sentence', async ({ page, request }) => {
    const p = PAGES.en;
    const text = await (await request.get(TXT)).text();
    await page.goto(p.path);
    const dialog = await openByKeyboard(page, p);
    const region = regionOf(dialog, p);
    await expect(region.getByRole('heading', { level: 3 })).toHaveCount(headingsOf(text));
    await region.focus();
    await expect(region).toBeFocused();
    await expect(region.getByText(p.end, { exact: true })).toHaveCount(1);
    const last = await region.evaluate((el) => el.lastElementChild?.textContent?.trim());
    expect(last).toBe(p.end);
  });

  test('Copy starts locked, is in the tab order and is described by the help line', async ({ page }) => {
    const p = PAGES.en;
    await page.goto(p.path);
    const dialog = await openByKeyboard(page, p);
    const copy = copyOf(dialog, p);
    await expect(copy).toHaveAttribute('aria-disabled', 'true');
    await expect(copy).not.toHaveAttribute('disabled', /.*/);
    const described = await copy.evaluate((el) => {
      const ids = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      return ids.map((id) => ({ id, text: document.getElementById(id)?.textContent?.trim() ?? null, inside: !!el.closest('dialog')?.contains(document.getElementById(id)) }));
    });
    expect(described.length).toBeGreaterThan(0);
    for (const d of described) {
      expect(d.text, `aria-describedby ${d.id}`).toBeTruthy();
      expect(d.inside, `aria-describedby ${d.id} is in the dialog`).toBe(true);
    }
    await copy.focus();
    await expect(copy).toBeFocused();
    await expect(dialog.getByText(p.read0, { exact: true })).toBeVisible();
  });

  test('pressing Copy while it is locked says to read first and moves the focus to the region', async ({ page }) => {
    const p = PAGES.en;
    await page.goto(p.path);
    const dialog = await openByKeyboard(page, p);
    await copyOf(dialog, p).focus();
    await page.keyboard.press('Enter');
    await expect(statusOf(dialog)).toHaveText(p.locked);
    await expect(regionOf(dialog, p)).toBeFocused();
  });

  test('scrolling to the end unlocks Copy, says so and shows 100%, and the focus stays where it was', async ({ page }) => {
    const p = PAGES.en;
    await page.goto(p.path);
    const dialog = await openByKeyboard(page, p);
    const region = regionOf(dialog, p);
    await expect(copyOf(dialog, p)).toHaveAttribute('aria-disabled', 'true');
    const before = await focusedNow(page);
    await scrollToEnd(region);
    await expect(copyOf(dialog, p)).toHaveAttribute('aria-disabled', 'false');
    await expect(statusOf(dialog)).toHaveText(p.unlocked);
    await expect(dialog.getByText(p.read100, { exact: true })).toBeVisible();
    expect(await focusedNow(page)).toBe(before);
    // The help line only explains the lock: once Copy is on it is not described by it
    await expect(copyOf(dialog, p)).not.toHaveAttribute('aria-describedby', /.+/);
  });

  test('Copy then puts exactly the text of the file on the clipboard and says so', async ({ page, request }) => {
    const p = PAGES.en;
    const text = await (await request.get(TXT)).text();
    await page.goto(p.path);
    const dialog = await openByKeyboard(page, p);
    await scrollToEnd(regionOf(dialog, p));
    const copy = copyOf(dialog, p);
    await expect(copy).toHaveAttribute('aria-disabled', 'false');
    await copy.focus();
    await page.keyboard.press('Enter');
    await expect(statusOf(dialog)).toHaveText(p.copied);
    expect(await copiedText(page)).toBe(text);
  });

  test('Escape closes the dialog and the focus is back on the opener; reopening keeps Copy on', async ({ page }) => {
    const p = PAGES.en;
    await page.goto(p.path);
    const dialog = await openByKeyboard(page, p);
    await scrollToEnd(regionOf(dialog, p));
    await expect(copyOf(dialog, p)).toHaveAttribute('aria-disabled', 'false');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(opener(page, p)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(dialogOf(page, p)).toBeVisible();
    await expect(regionOf(dialogOf(page, p), p).getByRole('heading', { level: 3 }).first()).toBeVisible();
    await expect(copyOf(dialogOf(page, p), p)).toHaveAttribute('aria-disabled', 'false');
    await expect(copyOf(dialogOf(page, p), p)).not.toHaveAttribute('aria-describedby', /.+/);
  });

  test('a prompt that fits without scrolling is unlocked from the start', async ({ page }) => {
    const p = PAGES.en;
    await page.route(`**${TXT}`, (route) => route.fulfill({ status: 200, contentType: 'text/plain; charset=utf-8', body: '# A short prompt\n\nOne line, nothing to scroll.\n' }));
    await page.goto(p.path);
    const dialog = await openByKeyboard(page, p);
    await expect(regionOf(dialog, p).getByRole('heading', { level: 3 })).toHaveCount(1);
    await expect(copyOf(dialog, p)).toHaveAttribute('aria-disabled', 'false');
    await expect(copyOf(dialog, p)).not.toHaveAttribute('aria-describedby', /.+/);
    await expect(dialog.getByText(p.read100, { exact: true })).toBeVisible();
  });

  test('a failed fetch says so, keeps Copy locked (pressing it says so again) and leaves the link to the text', async ({ page }) => {
    const p = PAGES.en;
    await page.route(`**${TXT}`, (route) => route.fulfill({ status: 500, contentType: 'text/plain', body: 'error' }));
    await page.goto(p.path);
    await expect(opener(page, p)).toBeVisible();
    await opener(page, p).focus();
    await page.keyboard.press('Enter');
    const dialog = dialogOf(page, p);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(p.failed)).toBeVisible();
    await expect(copyOf(dialog, p)).toHaveAttribute('aria-disabled', 'true');
    // Nothing to read: pressing Copy repeats why, it does not ask for a reading that cannot happen
    await copyOf(dialog, p).focus();
    await page.keyboard.press('Enter');
    await expect(statusOf(dialog)).toHaveText(p.failed);
    await expect(copyOf(dialog, p)).toHaveAttribute('aria-disabled', 'true');
    await expect(dialog.locator(`a[href$="${TXT}"]`)).toHaveCount(1);
  });

  test('no request goes to another origin, from the page load to the copy', async ({ page, baseURL }) => {
    const p = PAGES.en;
    const origin = new URL(baseURL ?? 'http://localhost:5173').origin;
    const foreign = [];
    page.on('request', (request) => {
      const url = request.url();
      if (/^(data|blob|about):/.test(url)) return;
      if (new URL(url).origin !== origin) foreign.push(url);
    });
    await page.goto(p.path);
    const dialog = await openByKeyboard(page, p);
    await scrollToEnd(regionOf(dialog, p));
    await expect(copyOf(dialog, p)).toHaveAttribute('aria-disabled', 'false');
    await copyOf(dialog, p).focus();
    await page.keyboard.press('Enter');
    await expect(statusOf(dialog)).toHaveText(p.copied);
    expect(foreign).toEqual([]);
  });

  test('at 320 px wide the dialog does not scroll sideways and stays inside the window', async ({ page }) => {
    const p = PAGES.en;
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(p.path);
    const dialog = await openByKeyboard(page, p);
    const sizes = await page.evaluate(() => {
      const d = document.querySelector('dialog[open]');
      const inside = [...(d?.querySelectorAll('*') ?? [])].filter((el) => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'visible' && el.clientWidth > 0);
      const box = d?.getBoundingClientRect();
      return {
        page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        dialog: d ? d.scrollWidth - d.clientWidth : -1,
        scrollers: inside.map((el) => `${el.localName}.${String(el.className).split(' ')[0]}`),
        left: box?.left ?? 0,
        right: box?.right ?? 0,
        width: document.documentElement.clientWidth,
      };
    });
    expect(sizes.page, 'the page scrolls sideways by').toBeLessThanOrEqual(0);
    expect(sizes.dialog, 'the dialog scrolls sideways by').toBeLessThanOrEqual(0);
    expect(sizes.scrollers, 'elements of the dialog that scroll sideways').toEqual([]);
    expect(sizes.left).toBeGreaterThanOrEqual(-0.5);
    expect(sizes.right).toBeLessThanOrEqual(sizes.width + 0.5);
    await expect(dialog).toBeVisible();
  });

  test('at 320 x 256 px (400 % zoom) the dialog scrolls, Copy is reachable and the region keeps 8rem', async ({ page }) => {
    const p = PAGES.en;
    await page.setViewportSize({ width: 320, height: 256 });
    await page.goto(p.path);
    const dialog = await openByKeyboard(page, p);
    const copy = copyOf(dialog, p);
    await copy.focus();
    await expect(copy).toBeFocused();
    const m = await page.evaluate(() => {
      const d = /** @type {HTMLElement} */ (document.querySelector('dialog[open]'));
      const c = /** @type {HTMLElement} */ (document.activeElement);
      const r = d.getBoundingClientRect();
      const b = c.getBoundingClientRect();
      const region = /** @type {HTMLElement} */ (d.querySelector('[role="region"]'));
      return {
        overflowY: getComputedStyle(d).overflowY,
        copyInDialog: b.top >= r.top - 0.5 && b.bottom <= r.bottom + 0.5 && b.left >= r.left - 0.5 && b.right <= r.right + 0.5,
        copyInWindow: b.top >= -0.5 && b.bottom <= window.innerHeight + 0.5,
        region: region.getBoundingClientRect().height,
        rem: parseFloat(getComputedStyle(document.documentElement).fontSize),
      };
    });
    expect(['auto', 'scroll'], 'the dialog scrolls').toContain(m.overflowY);
    expect(m.copyInDialog, 'the focused Copy is inside the dialog box').toBe(true);
    expect(m.copyInWindow, 'the focused Copy is visible in the window').toBe(true);
    expect(m.region).toBeGreaterThanOrEqual(8 * m.rem - 0.5);
  });

  test('axe finds no serious or critical violation with the dialog open', async ({ page }) => {
    const p = PAGES.en;
    await page.goto(p.path);
    const dialog = await openByKeyboard(page, p);
    await expect(dialog).toBeVisible();
    await settled(page);
    await page.waitForTimeout(400);
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const blocking = violations
      .filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))
      .map((v) => `${v.impact} ${v.id}: ${v.nodes.length} node(s) ${v.nodes[0]?.target?.join(' ')}`);
    expect(blocking, 'serious/critical axe violations').toEqual([]);
  });

  test('under reduced motion nothing in the dialog animates for any time', async ({ page }) => {
    const p = PAGES.en;
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(p.path);
    const dialog = await openByKeyboard(page, p);
    await expect(dialog).toBeVisible();
    const durations = await dialog.evaluate((d) =>
      /** @type {HTMLElement} */ (d).getAnimations({ subtree: true }).map((a) => Number(a.effect?.getComputedTiming().duration ?? 0)),
    );
    // The motion tokens are 0s under reduced motion (tokens-motion-roles.spec.js)
    expect(durations.filter((ms) => ms > 0)).toEqual([]);
  });

  test('es: the chrome is Spanish; the prompt is English and left to right, the end sentence is Spanish', async ({ page }) => {
    const p = PAGES.es;
    await page.goto(p.path);
    await expect(section(page).getByRole('link', { name: p.opener })).toHaveCount(0);
    const dialog = await openByKeyboard(page, p);
    await expect(copyOf(dialog, p)).toHaveAttribute('aria-disabled', 'true');
    await expect(dialog.getByText(p.read0, { exact: true })).toBeVisible();
    const region = regionOf(dialog, p);
    const langOf = (locator) => locator.evaluate((el) => ({ lang: el.closest('[lang]')?.getAttribute('lang'), dir: getComputedStyle(el).direction }));
    // The fetched text sits in an English, left-to-right element
    expect(await langOf(region.getByRole('heading', { level: 3 }).first())).toEqual({ lang: 'en', dir: 'ltr' });
    // The chrome the page writes is in the page's language: the region's own name and the end sentence
    expect((await langOf(region.getByText(p.end, { exact: true }))).lang).toBe('es');
    expect(await region.evaluate((el) => el.closest('[lang]')?.getAttribute('lang'))).toBe('es');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(opener(page, p)).toBeFocused();
  });
});
