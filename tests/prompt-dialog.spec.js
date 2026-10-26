// @ts-check
/**
 * The dialog of a prompt for AI (.claude/plans/ai-and-catalog-only.md, decisions 17 to 22 and the change of
 * 2026-10-25, phase F2). On /docs/get-started/ai/ (section #start-site) and /es/docs/get-started/ai/:
 *
 *   - without JavaScript the opener is a link to /prompts/start.txt, there is no dialog and the file answers
 *     200 as text/plain (these tests switch JavaScript off themselves, so they run in the chromium project too);
 *   - with JavaScript the opener is a button with the same name; Enter opens a modal dialog named by the
 *     opener's data-prompt-title; the prompt is fetched (same origin) when the dialog opens, shown as its own
 *     source (an h3 per "#"/"##" line of the .txt; tests/prompt-dialog-source.spec.js) in a focusable, named
 *     region that ends with "End of the prompt.";
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
    close: 'Close',
    copiedLabel: 'Copied',
  },
  es: {
    path: '/es/docs/get-started/ai/',
    opener: 'Abrir el prompt',
    title: 'El prompt para empezar un sitio',
    region: 'El prompt',
    copy: 'Copiar el prompt',
    read0: 'Leído 0 %',
    end: 'Fin del prompt.',
    close: 'Cerrar',
    copiedLabel: 'Copiado',
    copied: 'Prompt copiado.',
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
    // The footer has one; the prompt itself names its own address and links it too
    await expect(dialog.locator(`.site-prompt__foot a[href$="${TXT}"]`)).toHaveCount(1);
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

  for (const [width, height] of [[375, 667], [320, 568]]) {
    test(`${width}x${height}: the dialog is the screen, Copy stays in view, and the prompt is the one thing that scrolls`, async ({ page }) => {
      const p = PAGES.en;
      await page.setViewportSize({ width, height });
      await page.goto(p.path);
      const dialog = await openByKeyboard(page, p);
      const box = await dialog.boundingBox();
      expect(box?.x, 'left edge').toBeCloseTo(0, 0);
      expect(box?.y, 'top edge').toBeCloseTo(0, 0);
      expect(box?.width, 'width').toBeCloseTo(width, 0);
      expect(box?.height, 'height').toBeCloseTo(height, 0);
      await expect(dialog).toHaveCSS('border-top-left-radius', '0px');
      await expect(dialog).toHaveCSS('box-shadow', 'none');
      await expect(dialog).toHaveCSS('margin-top', '0px');

      // Copy is whole on screen before the prompt is read, and after it was read to the end
      const region = regionOf(dialog, p);
      const copy = copyOf(dialog, p);
      await expect(copy).toBeInViewport({ ratio: 1 });
      await scrollToEnd(region);
      await expect(copy).toBeInViewport({ ratio: 1 });
      const copyBox = await copy.boundingBox();
      expect(copyBox?.height, 'Copy is a large target').toBeGreaterThanOrEqual(44 - 0.5);

      // One scroller: the prompt (or, in a window too short for both, the dialog), never a scroll inside a scroll
      const scrollers = await page.evaluate(() => {
        const d = /** @type {HTMLElement} */ (document.querySelector('dialog[open]'));
        return [d, ...d.querySelectorAll('*')]
          .filter((el) => ['auto', 'scroll'].includes(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 1)
          .map((el) => `${el.localName}.${String(el.className).split(' ')[0]}`);
      });
      expect(scrollers, 'elements that scroll vertically').toHaveLength(1);

      // The prompt is reachable: the focusable region is whole on screen, between the head and the foot, with its 8rem
      await region.focus();
      await expect(region).toBeFocused();
      await expect(region).toBeInViewport({ ratio: 1 });
      const regionBox = await region.boundingBox();
      const rem = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
      expect(regionBox?.height).toBeGreaterThanOrEqual(8 * rem - 0.5);
      expect(regionBox?.y).toBeGreaterThanOrEqual(0);
      expect((regionBox?.y ?? 0) + (regionBox?.height ?? 0)).toBeLessThanOrEqual((copyBox?.y ?? 0) + 0.5);
    });
  }

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

  /* ---- The look of the dialog (batch of 2026-10-25) ---- */

  for (const code of ['en', 'es']) {
    test(`${code}: the close control is an icon button named "${PAGES[code].close}" with no visible text, an aria-hidden svg and a 24 px box; it closes and gives the focus back`, async ({ page }) => {
      const p = PAGES[code];
      await page.goto(p.path);
      const dialog = await openByKeyboard(page, p);
      const close = dialog.getByRole('button', { name: p.close, exact: true });
      await expect(close).toHaveCount(1);
      await expect(close).toHaveClass(/(^|\s)luz-modal__close(\s|$)/);
      expect((await close.innerText()).trim(), 'visible text of the close button').toBe('');
      expect(await close.evaluate((el) => (el.textContent ?? '').trim()), 'text content of the close button').toBe('');
      const svg = close.locator('svg');
      await expect(svg).toHaveCount(1);
      await expect(svg).toHaveAttribute('aria-hidden', 'true');
      const box = await close.boundingBox();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(24);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(24);
      await close.focus();
      await page.keyboard.press('Enter');
      await expect(dialog).toBeHidden();
      await expect(opener(page, p)).toBeFocused();
    });
  }

  test('the progress bar sits right above the scrolling region, as wide as it, 8 px high, and the read text is outside the footer', async ({ page }) => {
    const p = PAGES.en;
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(p.path);
    const dialog = await openByKeyboard(page, p);
    const m = await dialog.evaluate((d) => {
      const bar = d.querySelector('progress.luz-progress');
      const region = d.querySelector('.site-prompt__text[role="region"]');
      const foot = d.querySelector('.site-prompt__foot');
      const help = d.querySelector('#site-prompt-help');
      const read = [...d.querySelectorAll('*')].find((el) => el.children.length === 0 && /^Read \d+%$/.test(el.textContent?.trim() ?? ''));
      if (!bar || !region || !foot || !help || !read) return null;
      const b = bar.getBoundingClientRect();
      const r = region.getBoundingClientRect();
      const h = help.getBoundingClientRect();
      const t = read.getBoundingClientRect();
      const reader = region.parentElement;
      return {
        wrapped: !!reader?.classList.contains('site-prompt__reader') && reader.children[0] === bar && reader.children[1] === region && reader.children.length === 2,
        precedes: !!(bar.compareDocumentPosition(region) & Node.DOCUMENT_POSITION_FOLLOWING),
        gap: r.top - b.bottom,
        dx: Math.abs(b.left - r.left),
        dw: Math.abs(b.width - r.width),
        height: b.height,
        readInFoot: foot.contains(read),
        readBeforeBar: !!(read.compareDocumentPosition(bar) & Node.DOCUMENT_POSITION_FOLLOWING),
        readOnHelpLine: t.top < h.bottom && t.bottom > h.top,
      };
    });
    expect(m, 'the progress, region, footer, help line and read text exist').not.toBeNull();
    expect(m.wrapped, 'the bar then the region are the two children of .site-prompt__reader').toBe(true);
    expect(m.precedes, 'the progress precedes the region in the DOM').toBe(true);
    expect(Math.abs(m.gap), 'gap between the bar and the region').toBeLessThanOrEqual(0.5);
    expect(m.dx, 'left offset').toBeLessThanOrEqual(0.5);
    expect(m.dw, 'width difference').toBeLessThanOrEqual(0.5);
    expect(m.height, 'core height of a progress bar').toBeCloseTo(8, 0);
    expect(m.readInFoot, 'the read text is in the footer').toBe(false);
    expect(m.readBeforeBar, 'the read text comes before the bar').toBe(true);
    expect(m.readOnHelpLine, 'the read text is on the line of the help text').toBe(true);
  });

  test('a few pixels before the end Copy stays locked and the read text is below 100; at the end it unlocks and shows 100%', async ({ page }) => {
    const p = PAGES.en;
    await page.goto(p.path);
    const dialog = await openByKeyboard(page, p);
    const region = regionOf(dialog, p);
    const readNow = () => dialog.getByText(/^Read \d+%$/).first().innerText().then((t) => Number(/(\d+)/.exec(t)?.[1]));
    for (const px of [10, 2]) {
      await region.evaluate((el, gap) => { el.scrollTop = el.scrollHeight - el.clientHeight - gap; }, px);
      await expect.poll(readNow, { message: `read text ${px} px before the end` }).toBeGreaterThan(0);
      expect(await readNow(), `read text ${px} px before the end`).toBeLessThan(100);
      await expect(copyOf(dialog, p), `Copy ${px} px before the end`).toHaveAttribute('aria-disabled', 'true');
    }
    await scrollToEnd(region);
    await expect(copyOf(dialog, p)).toHaveAttribute('aria-disabled', 'false');
    await expect(dialog.getByText(p.read100, { exact: true })).toBeVisible();
  });

  test('in the footer the link to the text comes before Copy, and Copy is at the end edge with the link to its left', async ({ page }) => {
    const p = PAGES.en;
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(p.path);
    const dialog = await openByKeyboard(page, p);
    const m = await dialog.evaluate((d) => {
      const foot = d.querySelector('.site-prompt__foot');
      const link = foot?.querySelector('a[href$="/prompts/start.txt"]');
      const copy = foot?.querySelector('[data-prompt-copy]');
      if (!foot || !link || !copy) return null;
      const f = foot.getBoundingClientRect();
      const l = link.getBoundingClientRect();
      const c = copy.getBoundingClientRect();
      const pad = parseFloat(getComputedStyle(foot).paddingRight);
      return {
        linkFirst: !!(link.compareDocumentPosition(copy) & Node.DOCUMENT_POSITION_FOLLOWING),
        copyRightGap: f.right - pad - c.right,
        linkLeftOfCopy: l.right <= c.left + 0.5,
      };
    });
    expect(m, 'the footer holds the link and Copy').not.toBeNull();
    expect(m.linkFirst, 'the link precedes Copy in the DOM').toBe(true);
    expect(Math.abs(m.copyRightGap), 'distance of Copy from the footer end edge').toBeLessThanOrEqual(1);
    expect(m.linkLeftOfCopy, 'the link is to the left of Copy').toBe(true);
    // Tab reaches the link first
    await dialog.getByRole('link', { name: 'Open raw text (opens in a new tab)', exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(copyOf(dialog, p)).toBeFocused();
  });

  for (const code of ['en', 'es']) {
    test(`${code}: after Copy the button says "${PAGES[code].copiedLabel}" with a check, turns green, keeps its width and outlines the reader, then goes back after about a second`, async ({ page }) => {
      const p = PAGES[code];
      await page.goto(p.path);
      const dialog = await openByKeyboard(page, p);
      const region = regionOf(dialog, p);
      await scrollToEnd(region);
      // Not by name: the accessible name of the button changes while it says it copied
      const copy = dialog.locator('[data-prompt-copy]');
      await expect(copy).toHaveAttribute('aria-disabled', 'false');
      const label = (await copy.innerText()).trim();
      const before = await copy.evaluate((el) => ({ color: getComputedStyle(el).color, width: el.getBoundingClientRect().width }));
      const success = await dialog.evaluate((d) => {
        const probe = document.createElement('span');
        probe.style.color = 'var(--luz-color-success)';
        d.append(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return color;
      });
      expect(success, 'resolved --luz-color-success').toMatch(/^rgb/);
      expect(before.color, 'the button is not green before').not.toBe(success);
      await copy.focus();
      await page.keyboard.press('Enter');
      await expect(copy).toHaveText(p.copiedLabel);
      await expect(copy).toHaveClass(/(^|\s)is-copied(\s|$)/);
      const check = copy.locator('svg');
      await expect(check).toHaveCount(1);
      await expect(check).toBeVisible();
      await expect(check).toHaveAttribute('aria-hidden', 'true');
      await expect(statusOf(dialog)).toHaveText(p.copied);
      // The colour may be eased in: wait for it to settle on the success colour
      await expect.poll(() => copy.evaluate((el) => getComputedStyle(el).color), { message: 'colour of the copied button' }).toBe(success);
      expect(before.color).not.toBe(success);
      const after = await copy.evaluate((el) => el.getBoundingClientRect().width);
      expect(Math.abs(after - before.width), 'width change of the button').toBeLessThanOrEqual(1);
      const reader = dialog.locator('.site-prompt__reader');
      await expect(reader).toHaveClass(/(^|\s)is-copied(\s|$)/);
      const outline = await reader.evaluate((el) => {
        const s = getComputedStyle(el);
        return { style: s.outlineStyle, width: s.outlineWidth, color: s.outlineColor, offset: s.outlineOffset };
      });
      expect(outline).toEqual({ style: 'solid', width: '2px', color: success, offset: '2px' });
      // About 1.2 s later everything is back
      await page.waitForTimeout(1500);
      expect((await copy.innerText()).trim()).toBe(label);
      await expect(copy).not.toHaveClass(/(^|\s)is-copied(\s|$)/);
      await expect(reader).not.toHaveClass(/(^|\s)is-copied(\s|$)/);
      const outlineAfter = await reader.evaluate((el) => {
        const s = getComputedStyle(el);
        return { style: s.outlineStyle, width: s.outlineWidth };
      });
      expect(outlineAfter.style === 'none' || outlineAfter.width === '0px', `reader outline after: ${JSON.stringify(outlineAfter)}`).toBe(true);
    });
  }


  test('while Copy says it copied, a reader whose region has the focus ring keeps the focus ring, not the green one', async ({ page }) => {
    const p = PAGES.en;
    await page.goto(p.path);
    const dialog = await openByKeyboard(page, p);
    const region = regionOf(dialog, p);
    await scrollToEnd(region);
    const copy = dialog.locator('[data-prompt-copy]');
    await expect(copy).toHaveAttribute('aria-disabled', 'false');
    const colorOf = (token) => dialog.evaluate((d, t) => {
      const probe = document.createElement('span');
      probe.style.color = `var(${t})`;
      d.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    }, token);
    const ring = await colorOf('--luz-focus-ring');
    const success = await colorOf('--luz-color-success');
    expect(ring, 'the focus ring is not the success colour').not.toBe(success);
    await copy.focus();
    await page.keyboard.press('Enter');
    await expect(copy).toHaveClass(/(^|\s)is-copied(\s|$)/);
    // The last input was the keyboard, so focusing the region shows its focus ring
    await region.focus();
    await expect(region).toBeFocused();
    expect(await region.evaluate((el) => el.matches(':focus-visible'))).toBe(true);
    // The ring is on the wrapper of the bar and the region
    const outline = await dialog.locator('.site-prompt__reader').evaluate((el) => {
      const s = getComputedStyle(el);
      return { style: s.outlineStyle, width: s.outlineWidth, color: s.outlineColor, offset: s.outlineOffset };
    });
    expect(outline).toEqual({ style: 'solid', width: '2px', color: ring, offset: '2px' });
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
