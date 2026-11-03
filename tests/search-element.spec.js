// @ts-check
/**
 * <luz-search> (packages/catalog/src/search.js): a light-DOM custom element
 * that holds the trigger, the fallback link and the search dialog, and wires
 * them, and the buttons of the page, when it connects (D5 of
 * .claude/plans/specs/f3-package-model.md: no `site-` in the names). The
 * behaviour of the dialog itself is in tests/search.spec.js, on the docs
 * site; how the chunk is loaded is in tests/site-loader.spec.js and
 * tests/search-upgrade.spec.js; this file is the element, with the module
 * imported by hand.
 */
import { test, expect } from '@playwright/test';

const FIXTURE = '/tests/fixtures/search-element.html';

test.describe('<luz-search>', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FIXTURE);
    await expect.poll(() => page.evaluate(() => !!customElements.get('luz-search'))).toBe(true);
  });

  test('is defined once, as a plain HTMLElement, with no Shadow DOM', async ({ page }) => {
    const info = await page.evaluate(async () => {
      const before = customElements.get('luz-search');
      // Importing the module again does not define it twice (and does not throw)
      await import('/packages/catalog/dist/search.js?again');
      window.addSearch();
      const el = document.querySelector('luz-search');
      return { same: before === customElements.get('luz-search'), shadow: !!el.shadowRoot, isHtml: el instanceof HTMLElement };
    });
    expect(info).toEqual({ same: true, shadow: false, isHtml: true });
  });

  test('the old name <luz-site-search> is not defined', async ({ page }) => {
    expect(await page.evaluate(() => customElements.get('luz-site-search'))).toBeUndefined();
  });

  test('with no element on the page the button outside stays hidden', async ({ page }) => {
    await expect(page.locator('#external')).toBeHidden();
  });

  test('an element added later wires itself: the trigger inside shows, the fallback goes, it opens', async ({ page }) => {
    await page.evaluate(() => window.addSearch());
    await expect(page.locator('luz-search #trigger')).toBeVisible();
    await expect(page.locator('luz-search #fallback')).toBeHidden();
    await page.locator('#trigger').click();
    await expect(page.getByRole('dialog', { name: 'Search' })).toBeVisible();
    await page.getByRole('textbox', { name: 'Query' }).fill('butt');
    await expect(page.locator('[data-luz-search-list="pages"] a')).toHaveText(['Button']);
  });

  test('a button outside the element shows when it wires, and opens the dialog (S2)', async ({ page }) => {
    await expect(page.locator('#external')).toBeHidden();
    await page.evaluate(() => window.addSearch());
    await expect(page.locator('#external')).toBeVisible();
    await page.locator('#external').click();
    await expect(page.getByRole('dialog', { name: 'Search' })).toBeVisible();
  });

  test('Ctrl+K opens it, and a second connection of the same dialog adds no second handler', async ({ page }) => {
    await page.evaluate(() => {
      window.addSearch();
      // Moving the element disconnects and connects it again
      const el = document.querySelector('luz-search');
      document.body.append(el);
    });
    await page.keyboard.press('Control+k');
    await expect(page.getByRole('dialog', { name: 'Search' })).toBeVisible();
    // One request for the index, not two
    const count = await page.evaluate(() => performance.getEntriesByType('resource').filter((r) => r.name.includes('search-index.json')).length);
    expect(count).toBe(1);
  });

  test('an element with no dialog inside does nothing and throws nothing', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.evaluate(() => document.body.append(document.createElement('luz-search')));
    expect(errors).toEqual([]);
    await expect(page.locator('#external')).toBeHidden();
  });
});

// SEC-CHUNK-5 (R7): a page that loads a CDN copy of the chunk and a bundled
// copy (two URLs, so two module instances) gets one element, one handler
test.describe('<luz-search> loaded from two copies of the module (R7)', () => {
  test('one keydown handler on the dialog and one on the document, and one request for the index', async ({ page }) => {
    await page.addInitScript(() => {
      window.__keydown = { dialog: 0, document: 0 };
      const add = window.EventTarget.prototype.addEventListener;
      window.EventTarget.prototype.addEventListener = function (type, ...rest) {
        if (type === 'keydown') {
          if (this instanceof HTMLDialogElement) window.__keydown.dialog++;
          if (this === document) window.__keydown.document++;
        }
        return add.call(this, type, ...rest);
      };
    });
    await page.goto(FIXTURE);
    await expect.poll(() => page.evaluate(() => !!customElements.get('luz-search'))).toBe(true);
    await page.evaluate(async () => {
      await import('/packages/catalog/dist/search.min.js');
      window.addSearch();
    });
    await expect(page.locator('#trigger')).toBeVisible();
    await page.keyboard.press('Control+k');
    await expect(page.getByRole('dialog', { name: 'Search' })).toBeVisible();
    await expect.poll(() => page.evaluate(() => performance.getEntriesByType('resource').filter((r) => r.name.includes('search-index.json')).length)).toBe(1);
    expect(await page.evaluate(() => window.__keydown)).toEqual({ dialog: 1, document: 1 });
  });
});

// A <luz-search> whose dialog lacks the field, the status or the results is
// not wired: the fallback link stays, the trigger stays hidden, Ctrl+K does
// nothing, and nothing throws (it used to throw reading null.addEventListener)
const PARTS = { 'the field': 'input', 'the status': '[role=status]', 'the results': '[data-luz-search-results]' };

/** Add a copy of the fixture's markup, tagged `data-case`, without what `drop` selects. */
const addSearch = (page, tag, drop) =>
  page.evaluate(
    ([tag, drop]) => {
      const copy = document.getElementById('markup').content.cloneNode(true);
      if (drop) copy.querySelector('dialog').querySelector(drop).remove();
      copy.querySelector('luz-search').dataset.case = tag;
      document.getElementById('slot').append(copy);
    },
    [tag, drop],
  );

/** Collect what the page reports as an error, and whether a keydown reaches the window default-prevented. */
async function watch(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));
  await page.evaluate(() => {
    window.__prevented = [];
    window.addEventListener('keydown', (e) => e.key === 'k' && window.__prevented.push(e.defaultPrevented));
  });
  return errors;
}

const dialogs = (page) => page.locator('dialog[open]');

test.describe('<luz-search> with an incomplete dialog', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FIXTURE);
    await expect.poll(() => page.evaluate(() => !!customElements.get('luz-search'))).toBe(true);
  });

  for (const [name, drop] of Object.entries(PARTS)) {
    test(`a dialog without ${name} throws nothing, keeps the fallback, keeps the trigger hidden and leaves Ctrl+K alone`, async ({ page }) => {
      const errors = await watch(page);
      await addSearch(page, 'bad', drop);
      await page.waitForTimeout(100);
      expect(errors).toEqual([]);
      await expect(page.locator('[data-case=bad] #fallback')).toBeVisible();
      await expect(page.locator('[data-case=bad] #trigger')).toBeHidden();
      await expect(page.locator('#external')).toBeHidden();
      await page.keyboard.press('Control+k');
      await expect(dialogs(page)).toHaveCount(0);
      expect(await page.evaluate(() => window.__prevented)).toEqual([false]);
      expect(errors).toEqual([]);
    });
  }

  test('a complete search and an incomplete one on the same page: the first works, the second is left as it is', async ({ page }) => {
    const errors = await watch(page);
    await addSearch(page, 'good');
    await addSearch(page, 'bad', '[data-luz-search-results]');
    await expect(page.locator('[data-case=good] #trigger')).toBeVisible();
    await expect(page.locator('[data-case=good] #fallback')).toBeHidden();
    await expect(page.locator('[data-case=bad] #fallback')).toBeVisible();
    await expect(page.locator('[data-case=bad] #trigger')).toBeHidden();
    // The button outside belongs to the one that is wired
    await expect(page.locator('#external')).toBeVisible();
    await page.keyboard.press('Control+k');
    const good = page.locator('[data-case=good] dialog');
    await expect(good).toBeVisible();
    await expect(page.locator('[data-case=bad] dialog')).toBeHidden();
    await good.getByRole('textbox', { name: 'Query' }).fill('butt');
    await expect(good.locator('[data-luz-search-list="pages"] a')).toHaveText(['Button']);
    await page.keyboard.press('Escape');
    await expect(good).toBeHidden();
    expect(errors).toEqual([]);
  });

  test('a button outside any <luz-search> stays hidden when the only dialog is incomplete, and its click throws nothing', async ({ page }) => {
    const errors = await watch(page);
    await addSearch(page, 'bad', 'input');
    await page.waitForTimeout(100);
    await expect(page.locator('#external')).toBeHidden();
    await page.evaluate(() => document.getElementById('external').click());
    await page.waitForTimeout(100);
    await expect(dialogs(page)).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('an incomplete dialog is not marked as wired: once completed, connecting the element again wires it', async ({ page }) => {
    const errors = await watch(page);
    await addSearch(page, 'late', 'input');
    await expect(page.locator('[data-case=late] #trigger')).toBeHidden();
    await page.evaluate(() => {
      const host = document.querySelector('[data-case=late]');
      const input = document.createElement('input');
      input.type = 'text';
      input.setAttribute('aria-label', 'Query');
      host.querySelector('dialog').prepend(input);
      // Moving the element disconnects and connects it again
      document.body.append(host);
    });
    await expect(page.locator('[data-case=late] #trigger')).toBeVisible();
    await expect(page.locator('[data-case=late] #fallback')).toBeHidden();
    await page.keyboard.press('Control+k');
    await expect(page.locator('[data-case=late] dialog')).toBeVisible();
    expect(errors).toEqual([]);
  });
});
