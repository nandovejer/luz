// @ts-check
/**
 * The Chat page of the docs (apps/docs/pages/catalog/chat.html, an experimental
 * catalog piece) and its live example, whose provider is the page's own
 * (apps/docs/chat-demo.js: no model, no network, canned answers).
 *
 *  - the head of the page says it is experimental, in the page's own chip
 *  - the example starts with a step to take, a download, then it is ready; the
 *    suggestions ask, the answer is Markdown with its source, and a failure
 *    can be tried again
 *  - without JavaScript the example is the text and the link inside the element
 *
 * Runs in `chromium`; the no-JS describe sets `javaScriptEnabled: false` itself.
 */
import { test, expect } from '@playwright/test';

const ROUTE = '/docs/catalog/chat/';

const demo = (page) => page.locator('luz-chat[data-docs-demo]');

test.describe('the Chat page without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the example is the text and the link of the element, and nothing of the chat is built', async ({ page }) => {
    await page.goto(ROUTE);
    await expect(demo(page).getByRole('link', { name: 'Read the documentation' })).toBeVisible();
    await expect(demo(page).getByRole('textbox')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1, name: 'Chat' })).toBeVisible();
  });
});

test.describe('the Chat page', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript: the state without it is above');

  test('the head says Experimental, before the files of the page', async ({ page }) => {
    await page.goto(ROUTE);
    const chips = page.locator('ul.luz-doc-header__meta > li');
    await expect(chips.first()).toHaveText('Experimental');
  });

  test('the example asks the visitor to start, downloads, and is ready: then a suggestion gets a Markdown answer with its source', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(ROUTE);
    await expect(demo(page)).toHaveAttribute('data-luz-state', 'action');
    await expect(demo(page).getByRole('textbox')).toBeDisabled();
    await demo(page).getByRole('button', { name: 'Start the demo' }).click();
    await expect(demo(page)).toHaveAttribute('data-luz-state', 'busy');
    await expect(demo(page).getByRole('progressbar')).toBeVisible();
    await expect(demo(page)).toHaveAttribute('data-luz-state', 'ready', { timeout: 15000 });
    await expect(demo(page).getByRole('textbox')).toBeEnabled();

    await demo(page).getByRole('button', { name: 'How do I install it?' }).click();
    const reply = demo(page).locator('.luz-chat__bubble').last();
    await expect(demo(page).getByRole('status')).toHaveText('Answer ready', { timeout: 15000 });
    await expect(reply.locator('strong')).toContainText('no build step');
    await expect(reply.locator('ol > li')).toHaveCount(2);
    await expect(reply.locator('blockquote')).toBeVisible();
    // The answer's source is a link; the demo's answer names no other address
    await expect(demo(page).getByRole('list', { name: 'Sources' }).getByRole('link', { name: 'Install LUZ' })).toHaveAttribute('href', /\/docs\/get-started\/$/);
  });

  test('the example can fail on purpose, and the retry button is there', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(ROUTE);
    await demo(page).getByRole('button', { name: 'Start the demo' }).click();
    await expect(demo(page)).toHaveAttribute('data-luz-state', 'ready', { timeout: 15000 });
    await demo(page).getByRole('button', { name: 'Show me an error' }).click();
    await expect(demo(page).getByRole('status')).toHaveText('No answer. Try again.', { timeout: 15000 });
    await expect(demo(page).getByRole('button', { name: 'Try again' })).toBeVisible();
  });
});
