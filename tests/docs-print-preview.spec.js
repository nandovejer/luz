// @ts-check
/**
 * LUZ docs — the print preview of /docs/get-started/print/ (R5).
 *
 * The page offers a docs-only preview of how a page prints, in a core modal (a native <dialog>): a fixed sample
 * page in a sandboxed, inert, same-origin frame, drawn with the print rules of the page's own CSS. The rules
 * are copied from the CSSOM into the frame (the host page never switches to print media), so this spec never
 * calls page.emulateMedia({ media: 'print' }): it asserts that the host keeps its screen look while the frame
 * has the print one. Without JavaScript there is no button, only the sentence that says Ctrl+P in words.
 *
 * Selectors by role and name, never by aria-haspopup (the site's search button has it too). The sample loads the
 * Vite client in dev, and Chromium logs a blocked script for the sandbox: console noise is not asserted.
 * Run with: pnpm exec playwright test tests/docs-print-preview.spec.js --project=chromium --project=chromium-nojs
 */
/* global EventTarget, HTMLLinkElement -- these run in the sample's frame, inside page.addInitScript() */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { faded } from './helpers/settle.js';

const MODES = ['light', 'dark', 'high-contrast'];

const LANGS = [
  {
    name: 'English',
    route: '/docs/get-started/print/',
    opener: 'See the print preview',
    dialog: 'Print preview',
    closeX: 'Close the print preview',
    print: 'Print this page',
    close: 'Close',
    sheetStart: 'A sample page as it prints',
    frameTitle: 'A sample page, as it prints',
    ready: /The preview is ready\.$/,
  },
  {
    name: 'Spanish',
    route: '/es/docs/get-started/print/',
    opener: 'Ver la vista previa de impresión',
    dialog: 'Vista previa de impresión',
    closeX: 'Cerrar la vista previa de impresión',
    print: 'Imprimir esta página',
    close: 'Cerrar',
    sheetStart: 'Una página de ejemplo tal como se imprime',
    frameTitle: null,
    ready: /\S\.$/,
  },
];

/** Open the page and press the opener; the dialog is open and the sample is ready when this returns. */
async function open(page, lang, { mode, viewport, waitReady = true } = {}) {
  if (viewport) await page.setViewportSize(viewport);
  await page.goto(lang.route);
  if (mode) {
    await page.evaluate((m) => { document.documentElement.dataset.theme = m; }, mode);
    await faded(page);
  }
  const opener = page.getByRole('button', { name: lang.opener });
  await expect(opener).toBeVisible();
  await opener.click();
  const dialog = page.locator('dialog#print-preview');
  await expect(dialog).toHaveAttribute('open', '');
  if (waitReady) await expect(dialog.getByRole('status')).toHaveText(lang.ready);
  return { opener, dialog };
}

/** The document of the sample frame, evaluated in the frame. */
async function inFrame(page, fn, arg) {
  const handle = await page.locator('iframe.docs-print__frame').elementHandle();
  const frame = await handle?.contentFrame();
  if (!frame) throw new Error('the sample frame has no document');
  return frame.evaluate(fn, arg);
}

for (const lang of LANGS) {
  test.describe(`print preview, ${lang.name}`, () => {
    test.beforeEach(({ javaScriptEnabled }) => {
      test.skip(javaScriptEnabled === false, 'the preview needs JavaScript; the no-JS page is tested below');
    });

    test('the opener is visible and opens a dialog named for the preview, with the focus inside it', async ({ page }) => {
      await page.goto(lang.route);
      const opener = page.getByRole('button', { name: lang.opener });
      await expect(opener).toBeVisible();
      await opener.click();
      const dialog = page.locator('dialog#print-preview');
      await expect(dialog).toHaveAttribute('open', '');
      await expect(page.getByRole('dialog', { name: lang.dialog })).toBeVisible();
      expect(await page.evaluate(() => !!document.activeElement?.closest('dialog#print-preview'))).toBe(true);
    });

    test('the preview is ready and has the print look when the sample\'s stylesheets send no load or error event', async ({ page }) => {
      // WebKit sends neither event for a <link> in a frame whose scripts are sandboxed, though the sheet loads. The
      // init script runs in the sample's frame too (not in the page): there it makes a <link> ignore the two listeners.
      await page.addInitScript(() => {
        if (window === window.top) return;
        const add = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function (type, ...rest) {
          if ((type === 'load' || type === 'error') && this instanceof HTMLLinkElement) return;
          return add.call(this, type, ...rest);
        };
      });
      const { dialog } = await open(page, lang);
      await expect(dialog.getByRole('status')).toHaveText(lang.ready);
      const print = await inFrame(page, () => ({
        background: getComputedStyle(document.body).backgroundColor,
        nav: [...document.querySelectorAll('nav')].map((n) => getComputedStyle(n).display),
      }));
      expect(print.background).toBe('rgb(255, 255, 255)');
      expect(print.nav.length).toBeGreaterThan(0);
      for (const d of print.nav) expect(d).toBe('none');
    });

    test('the frame is a labelled, sandboxed, inert picture of a page', async ({ page }) => {
      const { dialog } = await open(page, lang);
      const frame = dialog.locator('iframe.docs-print__frame');
      if (lang.frameTitle) await expect(frame).toHaveAttribute('title', lang.frameTitle);
      else expect(await frame.getAttribute('title')).toBeTruthy();
      // allow-scripts is never in it: nothing of the sample runs
      await expect(frame).toHaveAttribute('sandbox', 'allow-same-origin');
      await expect(frame).toHaveAttribute('inert', '');
    });

    for (const mode of MODES) {
      test(`the frame has the print look, white and black, in ${mode}, and the page keeps its screen look`, async ({ page }) => {
        const { dialog } = await open(page, lang, { mode });
        void dialog;
        const print = await inFrame(page, () => {
          const display = (sel) => getComputedStyle(document.querySelector(sel)).display;
          const external = document.querySelector('a[href="https://example.com/report"]');
          const button = document.querySelector('a.luz-btn[href^="http"]');
          return {
            background: getComputedStyle(document.body).backgroundColor,
            color: getComputedStyle(document.body).color,
            nav: [...document.querySelectorAll('nav')].map((n) => getComputedStyle(n).display),
            externalAfter: getComputedStyle(external, '::after').content,
            externalHref: external.getAttribute('href'),
            buttonAfter: getComputedStyle(button, '::after').content,
            buttonHref: button.getAttribute('href'),
            panels: [...document.querySelectorAll('.luz-tabpanel')].map((p) => getComputedStyle(p).display),
            display: display('main'),
          };
        });
        expect(print.background).toBe('rgb(255, 255, 255)');
        expect(print.color).toBe('rgb(0, 0, 0)');
        expect(print.nav.length).toBeGreaterThan(0);
        for (const d of print.nav) expect(d).toBe('none');
        // A link to another site prints its address after the text; a button-like link does not
        expect(print.externalAfter).toContain(print.externalHref);
        expect(print.buttonAfter).not.toContain(print.buttonHref);
        // Every panel of the tabs prints, not only the open one
        expect(print.panels.length).toBe(3);
        for (const d of print.panels) expect(d).not.toBe('none');

        // The host never went to print: its own navigation shows and its colours are the mode's
        const host = await page.evaluate(() => {
          const nav = [...document.querySelectorAll('body nav, body .luz-navbar, body .luz-sidebar')].filter((n) => !n.closest('dialog'));
          return {
            anyNavDisplayed: nav.some((n) => getComputedStyle(n).display !== 'none'),
            background: getComputedStyle(document.body).backgroundColor,
          };
        });
        expect(host.anyNavDisplayed).toBe(true);
        // High contrast is white too: only dark tells the page from the paper
        if (mode === 'dark') expect(host.background).not.toBe('rgb(255, 255, 255)');
      });
    }

    test('Escape closes the dialog and the focus goes back to the opener', async ({ page }) => {
      const { opener, dialog } = await open(page, lang);
      await page.keyboard.press('Escape');
      await expect(dialog).not.toHaveAttribute('open', '');
      await expect(opener).toBeFocused();
    });

    test('the print button closes the dialog and then prints the page, once', async ({ page }) => {
      await page.addInitScript(() => {
        /** @type {any} */ (window).__prints = [];
        window.print = () => {
          /** @type {any} */ (window).__prints.push(!!document.querySelector('dialog#print-preview')?.hasAttribute('open'));
        };
      });
      const { dialog } = await open(page, lang);
      await dialog.getByRole('button', { name: lang.print }).click();
      await expect(dialog).not.toHaveAttribute('open', '');
      // One call, and the dialog was already closed when it came
      expect(await page.evaluate(() => /** @type {any} */ (window).__prints)).toEqual([false]);
    });

    test('the close button closes the dialog and the focus goes back to the opener', async ({ page }) => {
      const { opener, dialog } = await open(page, lang);
      await dialog.getByRole('button', { name: lang.close, exact: true }).click();
      await expect(dialog).not.toHaveAttribute('open', '');
      await expect(opener).toBeFocused();
    });

    test('the sheet is a labelled region you can focus, with a visible ring, between the close and the buttons', async ({ page }) => {
      const { dialog } = await open(page, lang);
      const sheet = dialog.locator('.docs-print__sheet');
      await expect(sheet).toHaveAttribute('role', 'region');
      await expect(sheet).toHaveAttribute('tabindex', '0');
      const label = (await sheet.getAttribute('aria-label')) ?? '';
      expect(label.startsWith(lang.sheetStart)).toBe(true);
      expect(label).not.toContain('Scrollable region');

      // Tab order: the close, the sheet, Print this page, Close
      await dialog.getByRole('button', { name: lang.closeX, exact: true }).focus();
      await page.keyboard.press('Tab');
      await expect(sheet).toBeFocused();
      const ring = await sheet.evaluate((el) => {
        const s = getComputedStyle(el);
        return { width: parseFloat(s.outlineWidth), style: s.outlineStyle };
      });
      expect(ring.width).toBeGreaterThanOrEqual(2);
      expect(ring.style).toBe('solid');
      await page.keyboard.press('Tab');
      await expect(dialog.getByRole('button', { name: lang.print })).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(dialog.getByRole('button', { name: lang.close, exact: true })).toBeFocused();
    });

    for (const mode of MODES) {
      test(`the open dialog passes axe in ${mode}`, async ({ page }) => {
        await open(page, lang, { mode });
        await faded(page);
        const { violations } = await new AxeBuilder({ page })
          .include('dialog#print-preview')
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();
        expect(violations.map((v) => `${v.impact} ${v.id}`)).toEqual([]);
      });
    }

    test('at 320px the page does not scroll sideways and both footer buttons are in the window', async ({ page }) => {
      const viewport = { width: 320, height: 568 };
      const { dialog } = await open(page, lang, { viewport });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      for (const name of [lang.print, lang.close]) {
        const box = await dialog.getByRole('button', { name, exact: true }).boundingBox();
        expect(box, name).not.toBeNull();
        expect(box.x, name).toBeGreaterThanOrEqual(0);
        expect(box.y, name).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width, name).toBeLessThanOrEqual(viewport.width);
        expect(box.y + box.height, name).toBeLessThanOrEqual(viewport.height);
      }
    });
  });
}

test.describe('print preview, without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  for (const lang of LANGS) {
    test(`${lang.name}: there is no button, and the page says Ctrl+P in words`, async ({ page }) => {
      await page.goto(lang.route);
      await expect(page.getByRole('button', { name: lang.opener })).toHaveCount(0);
      await expect(page.locator('[data-docs-print-open]')).toHaveCount(0);
      await expect(page.locator('dialog#print-preview')).toHaveCount(0);
      const text = await page.locator('main').innerText();
      expect(text).toMatch(/Ctrl\W{0,3}P/);
    });
  }
});
