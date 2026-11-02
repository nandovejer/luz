// @ts-check
/**
 * <luz-chat> of @luz-ds/catalog (experimental): a conversation in the style of a
 * messaging app. It is only the look and the keyboard of a chat; a provider
 * answers (the first child with ask(), or `chat.provider = { ask }`).
 * tests/fixtures/chat.html, loading the real loader, catalog.min.js; the
 * provider in it is a fake with no model and no network, driven by
 * `window.fake` (what it was asked, a gate to release, a failure to switch off).
 *
 *  - without JavaScript the element is its children
 *  - the loader loads the chunk only for a page that has a <luz-chat>
 *  - the composer waits for the provider to be ready; what the provider asks
 *    of the visitor is told in the conversation
 *  - sending: the question, the typing indicator, the typed answer (at once
 *    with reduced motion), the status line for a screen reader
 *  - Enter sends and Shift+Enter breaks the line (`enter`), the count near
 *    `maxlength`, the suggestions, Stop, the retry after an error, copy
 *  - the settings in a native <details>
 *  - the answer is Markdown built as DOM nodes, never HTML; a link is a link
 *    only when it is one of that answer's sources
 *  - the names are for a screen reader, no avatars
 *  - labels from the page, the note from a template, Spanish by `lang`, RTL
 *  - axe in the three modes, the keyboard order
 *
 * Runs in `chromium`; the no-JS describe sets `javaScriptEnabled: false` itself.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

import { MODES } from './helpers/design-tokens.js';
import { copiedText, recordCopies } from './helpers/clipboard.js';
import { faded } from './helpers/settle.js';

const PAGE = '/tests/fixtures/chat.html';
const NONE = `${PAGE}?none`;
const CHUNK = /\/chat\.min\.js(\?.*)?$/;
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** The element with this id. */
const chat = (page, id = 'main-chat') => page.locator(`#${id}`);
const field = (page, id = 'main-chat', name = 'Your message') => chat(page, id).getByRole('textbox', { name });
const messages = (page, id = 'main-chat') => chat(page, id).locator('.luz-chat__msg');
const bubbles = (page, id = 'main-chat') => chat(page, id).locator('.luz-chat__bubble');
const status = (page, id = 'main-chat') => chat(page, id).getByRole('status');

/** Open the fixture and wait until the chunk has defined the element and the provider is ready. */
async function open(page, id = 'main-chat') {
  await page.goto(PAGE);
  await expect.poll(() => page.evaluate(() => !!customElements.get('luz-chat')), { message: 'the loader defines <luz-chat>' }).toBe(true);
  await expect(chat(page, id)).toHaveAttribute('data-luz-state', 'ready');
}

/** Write a question and press Enter. */
async function ask(page, text, id = 'main-chat', name = 'Your message') {
  await field(page, id, name).fill(text);
  await field(page, id, name).press('Enter');
}

/** Change the state of the provider of a chat from the page. */
const provide = (page, state, id = 'provider') => page.evaluate(([i, s]) => /** @type {any} */ (document.getElementById(i)).set(s), [id, state]);

test.describe('chat without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the element is its children: the fallback and its link are there, and nothing of the chat is built', async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.locator('#main-fallback')).toBeVisible();
    await expect(page.locator('#main-fallback').getByRole('link', { name: 'Read the documentation' })).toHaveAttribute('href', /chat\.html\?docs$/);
    await expect(page.locator('#labelled > p')).toBeVisible();
    for (const id of ['main-chat', 'labelled', 'spanish', 'by-property']) {
      await expect(chat(page, id).getByRole('textbox')).toHaveCount(0);
      await expect(chat(page, id).locator('.luz-chat__panel')).toHaveCount(0);
      await expect(chat(page, id).locator('form')).toHaveCount(0);
    }
    // The fake provider has no content of its own
    await expect(page.locator('fake-provider').first()).toBeEmpty();
  });
});

test.describe('chat', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript: the state without it is above');
  // A chat answers at once by default; the tests of the typing say otherwise
  test.beforeEach(async ({ page }) => page.emulateMedia({ reducedMotion: 'reduce' }));

  test.describe('the loader and the markup', () => {
    test('the real loader, catalog.min.js, defines the element and loads its chunk once', async ({ page }) => {
      const chunks = [];
      page.on('request', (request) => CHUNK.test(request.url()) && chunks.push(request.url()));
      await open(page);
      expect(chunks).toHaveLength(1);
    });

    test('a page with no <luz-chat> does not load the chunk', async ({ page }) => {
      const chunks = [];
      page.on('request', (request) => CHUNK.test(request.url()) && chunks.push(request.url()));
      await page.goto(NONE);
      await expect(page.locator('luz-chat')).toHaveCount(0);
      await page.evaluate(() => new Promise((resolve) => (window.requestIdleCallback ?? setTimeout)(resolve)));
      expect(chunks).toEqual([]);
      expect(await page.evaluate(() => !!customElements.get('luz-chat'))).toBe(false);
    });

    test('with a provider that is ready the chat replaces the fallback: a titled region, the conversation, the field and Send', async ({ page }) => {
      await open(page);
      await expect(page.locator('#main-fallback')).toBeHidden();
      const panel = chat(page).getByRole('region', { name: 'Chat' });
      await expect(panel).toBeVisible();
      await expect(panel.getByRole('log', { name: 'Conversation' })).toBeVisible();
      await expect(field(page)).toBeEnabled();
      await expect(chat(page).getByRole('button', { name: 'Send' })).toBeVisible();
      // Nothing to stop yet
      await expect(chat(page).getByRole('button', { name: 'Stop' })).toBeHidden();
    });

    test('a provider given from JavaScript, chat.provider = { ask }, answers like a child', async ({ page }) => {
      await open(page, 'by-property');
      await expect(page.locator('#by-property > p')).toBeHidden();
      await ask(page, 'anything', 'by-property');
      await expect(bubbles(page, 'by-property').last()).toHaveText('From an object.');
    });

    test('a provider that is unavailable and says nothing leaves the page its own children: no chat is drawn', async ({ page }) => {
      await open(page);
      await expect(chat(page, 'unavailable')).toHaveAttribute('data-luz-state', 'unavailable');
      await expect(page.locator('#unavailable-fallback')).toBeVisible();
      await expect(chat(page, 'unavailable').getByRole('textbox')).toHaveCount(0);
      await expect(chat(page, 'unavailable').getByRole('region', { name: 'Chat' })).toHaveCount(0);
    });
  });

  test.describe('what the provider says of itself', () => {
    test('the composer is disabled until the provider is ready, and the messages of the system are drawn from its state', async ({ page }) => {
      await open(page);
      const log = chat(page).getByRole('log', { name: 'Conversation' });
      const send = chat(page).getByRole('button', { name: 'Send' });

      // Finding out: no field to write in, no words
      await provide(page, { status: 'pending' });
      await expect(chat(page)).toHaveAttribute('data-luz-state', 'pending');
      await expect(field(page)).toBeDisabled();
      await expect(send).toBeDisabled();

      // A step is needed: the message, the body and a button that runs the action from the visitor's click
      await page.evaluate(() => {
        const win = /** @type {any} */ (window);
        /** @type {any} */ (document.getElementById('provider')).set({ status: 'action', message: 'A step is needed.', body: 'Some words about the step.', action: { label: 'Take the step', run: () => (win.fake.step = (win.fake.step || 0) + 1) } });
      });
      await expect(chat(page)).toHaveAttribute('data-luz-state', 'action');
      await expect(field(page)).toBeDisabled();
      await expect(log.getByText('A step is needed.')).toBeVisible();
      await expect(log.getByText('Some words about the step.')).toBeVisible();
      await log.getByRole('button', { name: 'Take the step' }).click();
      expect(await page.evaluate(() => /** @type {any} */ (window).fake.step)).toBe(1);

      // Working on it: a progress bar at the value the provider gives
      await provide(page, { status: 'busy', message: 'Downloading… 50%', progress: 0.5 });
      await expect(chat(page)).toHaveAttribute('data-luz-state', 'busy');
      await expect(field(page)).toBeDisabled();
      await expect(log.getByText('Downloading… 50%')).toBeVisible();
      await expect(log.getByRole('progressbar')).toHaveAttribute('value', '0.5');

      // Turned off: told, and its action turns it on
      await provide(page, { status: 'off', message: 'It is off.', action: { label: 'Turn it on' } });
      await expect(chat(page)).toHaveAttribute('data-luz-state', 'off');
      await expect(field(page)).toBeDisabled();
      await expect(log.getByRole('button', { name: 'Turn it on' })).toBeVisible();

      // Unavailable with a message: it is told in the conversation, and the page's children are there too
      await provide(page, { status: 'unavailable', message: 'No model on this device.' });
      await expect(chat(page)).toHaveAttribute('data-luz-state', 'unavailable');
      await expect(log.getByText('No model on this device.')).toBeVisible();
      await expect(page.locator('#main-fallback')).toBeVisible();

      // Ready: the messages of the system go, the field is there
      await provide(page, { status: 'ready' });
      await expect(chat(page)).toHaveAttribute('data-luz-state', 'ready');
      await expect(field(page)).toBeEnabled();
      await expect(log.getByText('No model on this device.')).toHaveCount(0);
      await expect(page.locator('#main-fallback')).toBeHidden();
    });

    test('the settings are a native <details>, closed at first, with what the provider tells and its buttons', async ({ page }) => {
      await open(page);
      const details = chat(page).locator('details');
      await expect(details).toHaveCount(1);
      await expect(details).not.toHaveAttribute('open', '');
      await expect(chat(page).getByText("A fake, in this page's script.")).toBeHidden();
      await details.locator('summary').click();
      await expect(details).toHaveAttribute('open', '');
      await expect(chat(page).getByText("A fake, in this page's script.")).toBeVisible();
      await details.getByRole('button', { name: 'Fake setting' }).click();
      expect(await page.evaluate(() => /** @type {any} */ (window).fake.settingRun)).toBe(1);
    });

    test('Clear the conversation empties it and tells the provider to reset', async ({ page }) => {
      await open(page);
      await ask(page, 'one');
      await expect(messages(page)).toHaveCount(2);
      await chat(page).locator('summary').click();
      await chat(page).getByRole('button', { name: 'Clear the conversation' }).click();
      await expect(messages(page)).toHaveCount(0);
      expect(await page.evaluate(() => /** @type {any} */ (window).fake.resets)).toBe(1);
      // The next question starts a conversation from nothing
      await chat(page).locator('summary').click();
      await ask(page, 'two');
      await expect(bubbles(page).last()).toHaveText('Hello there, two.');
      expect(await page.evaluate(() => /** @type {any} */ (window).fake.asked.at(-1))).toEqual([{ role: 'user', content: 'two' }]);
    });

    test("the provider's note sits under the field, and a <template data-luz-chat-note> of the page takes its place", async ({ page }) => {
      await open(page);
      await expect(chat(page).getByText('Fake answers can be wrong.')).toBeVisible();
      await expect(chat(page, 'labelled').getByText("The page's own note.")).toBeVisible();
      await expect(chat(page, 'labelled').getByText('Fake answers can be wrong.')).toHaveCount(0);
    });
  });

  test.describe('sending a question', () => {
    test('the question is a bubble, the answer is typed in the next one, and the provider is given the whole conversation', async ({ page }) => {
      await open(page);
      await ask(page, 'ada');
      await expect(messages(page)).toHaveCount(2);
      await expect(bubbles(page).first()).toHaveText('ada');
      await expect(bubbles(page).last()).toHaveText('Hello there, ada.');
      // The field is empty and has the focus again, to write the next one
      await expect(field(page)).toHaveValue('');
      await expect(field(page)).toBeFocused();
      await ask(page, 'bob');
      await expect(bubbles(page).last()).toHaveText('Hello there, bob.');
      const asked = await page.evaluate(() => /** @type {any} */ (window).fake.asked);
      expect(asked[0]).toEqual([{ role: 'user', content: 'ada' }]);
      expect(asked[1]).toEqual([
        { role: 'user', content: 'ada' },
        { role: 'assistant', content: 'Hello there, ada.' },
        { role: 'user', content: 'bob' },
      ]);
    });

    test('while the provider thinks the bubble shows it is typing, the status says Thinking, and Stop is there; the answer ends with Answer ready', async ({ page }) => {
      await open(page);
      await ask(page, 'gate');
      await expect(status(page)).toHaveText('Thinking…');
      // The answer's bubble is on the page, with no words yet: the typing indicator (drawn, and hidden from a screen reader)
      await expect(messages(page)).toHaveCount(2);
      const reply = bubbles(page).last();
      await expect(reply).toBeVisible();
      await expect(reply).toHaveText('');
      const box = await reply.boundingBox();
      expect(box?.width).toBeGreaterThan(0);
      expect(box?.height).toBeGreaterThan(0);
      expect(await reply.locator('*').count(), 'the dots are drawn').toBeGreaterThan(0);
      expect(await reply.locator('[aria-hidden="true"]').count(), 'and hidden from a screen reader').toBeGreaterThan(0);
      // While it works, nothing else can be sent, and it can be stopped
      await expect(field(page)).toBeDisabled();
      await expect(chat(page).getByRole('button', { name: 'Stop' })).toBeVisible();
      await expect(chat(page).getByRole('button', { name: 'Send' })).toBeDisabled();
      await page.evaluate(() => /** @type {any} */ (window).fake.release());
      await expect(reply).toHaveText('Gate open.');
      await expect(status(page)).toHaveText('Answer ready');
      await expect(chat(page).getByRole('button', { name: 'Stop' })).toBeHidden();
      await expect(field(page)).toBeEnabled();
    });

    test('the conversation is not announced word by word: the log is not a live region of its own', async ({ page }) => {
      await open(page);
      const log = chat(page).getByRole('log', { name: 'Conversation' });
      await expect(log).toHaveAttribute('aria-live', 'off');
    });

    test('with reduced motion the answer is drawn whole at once', async ({ page }) => {
      await open(page);
      await page.evaluate(() => {
        const win = /** @type {any} */ (window);
        win.lengths = [];
        new MutationObserver(() => {
          const last = [...document.querySelectorAll('#main-chat .luz-chat__bubble')].at(-1);
          const n = last?.textContent?.length ?? 0;
          if (n) win.lengths.push(n);
        }).observe(document.getElementById('main-chat'), { subtree: true, childList: true, characterData: true });
      });
      await ask(page, 'typed');
      await expect(status(page)).toHaveText('Answer ready');
      const lengths = await page.evaluate(() => /** @type {any} */ (window).lengths);
      const full = ('word '.repeat(80).trim()).length;
      expect(lengths.length).toBeGreaterThan(0);
      expect(lengths[0], 'the first thing drawn is the whole answer').toBe(full);
    });

    test('without reduced motion the answer is typed: it grows, and ends whole', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await open(page);
      await page.evaluate(() => {
        const win = /** @type {any} */ (window);
        win.lengths = [];
        new MutationObserver(() => {
          const last = [...document.querySelectorAll('#main-chat .luz-chat__bubble')].at(-1);
          const n = last?.textContent?.length ?? 0;
          if (n) win.lengths.push(n);
        }).observe(document.getElementById('main-chat'), { subtree: true, childList: true, characterData: true });
      });
      await ask(page, 'typed');
      await expect(status(page)).toHaveText('Answer ready');
      const lengths = await page.evaluate(() => /** @type {any} */ (window).lengths);
      const full = ('word '.repeat(80).trim()).length;
      expect(lengths.at(-1)).toBe(full);
      expect(lengths.length, 'it was drawn in more than one step').toBeGreaterThan(2);
      expect(lengths[0], 'the first step is part of the answer').toBeLessThan(full);
      expect(lengths, 'and it only grows').toEqual([...lengths].sort((a, b) => a - b));
    });
  });

  test.describe('the field', () => {
    test('Enter sends and Shift+Enter breaks the line', async ({ page }) => {
      await open(page);
      await field(page).fill('first');
      await field(page).press('Shift+Enter');
      await field(page).pressSequentially('second');
      await expect(field(page)).toHaveValue('first\nsecond');
      await expect(messages(page)).toHaveCount(0);
      await field(page).press('Enter');
      await expect(messages(page)).toHaveCount(2);
      expect(await page.evaluate(() => /** @type {any} */ (window).fake.asked[0][0].content)).toBe('first\nsecond');
    });

    test('enter="newline" gives Enter back to the field: it breaks the line and only the button sends', async ({ page }) => {
      await open(page, 'newline');
      const box = field(page, 'newline');
      await box.fill('one');
      await box.press('Enter');
      await box.pressSequentially('two');
      await expect(box).toHaveValue('one\ntwo');
      await expect(messages(page, 'newline')).toHaveCount(0);
      await chat(page, 'newline').getByRole('button', { name: 'Send' }).click();
      await expect(messages(page, 'newline')).toHaveCount(2);
    });

    test('nothing is sent for an empty field: Send waits for words, and Enter on blanks does nothing', async ({ page }) => {
      await open(page);
      const send = chat(page).getByRole('button', { name: 'Send' });
      await expect(send).toBeDisabled();
      await field(page).fill('   ');
      await expect(send).toBeDisabled();
      await field(page).press('Enter');
      await expect(messages(page)).toHaveCount(0);
      await field(page).fill('words');
      await expect(send).toBeEnabled();
    });

    test('maxlength limits the field, and the count shows only near the limit', async ({ page }) => {
      await open(page);
      const box = field(page);
      await expect(box).toHaveAttribute('maxlength', '40');
      await expect(chat(page).getByText(/\d+\s*\/\s*40/)).toBeHidden();
      await box.fill('a'.repeat(10));
      await expect(chat(page).getByText(/\d+\s*\/\s*40/)).toBeHidden();
      await box.fill('a'.repeat(36));
      await expect(chat(page).getByText(/36\s*\/\s*40/)).toBeVisible();
      await box.fill('');
      await box.pressSequentially('a'.repeat(60));
      await expect(box).toHaveValue('a'.repeat(40));
      await expect(chat(page).getByText(/40\s*\/\s*40/)).toBeVisible();
      await box.fill('');
      await expect(chat(page).getByText(/\d+\s*\/\s*40/)).toBeHidden();
    });

    test('the suggestions are a labelled list of buttons, disabled until the provider is ready, and each sends its text', async ({ page }) => {
      await page.goto(PAGE);
      const list = chat(page).getByRole('list', { name: 'Try asking' });
      await expect(list.getByRole('button')).toHaveText(['Say hello', 'rich']);
      await expect(chat(page)).toHaveAttribute('data-luz-state', 'ready');
      await provide(page, { status: 'pending' });
      for (const button of await list.getByRole('button').all()) await expect(button).toBeDisabled();
      await provide(page, { status: 'ready' });
      await list.getByRole('button', { name: 'Say hello' }).click();
      await expect(bubbles(page).first()).toHaveText('Say hello');
      await expect(bubbles(page).last()).toHaveText('Hello there, Say hello.');
    });

    test('Stop aborts the answer: what arrived stays, the status says Stopped, and the chat can be used again', async ({ page }) => {
      await open(page);
      await ask(page, 'slow');
      await expect(bubbles(page).last()).toContainText('Start of a slow answer');
      await chat(page).getByRole('button', { name: 'Stop' }).click();
      await expect(status(page)).toHaveText('Stopped');
      await expect(bubbles(page).last()).toContainText('Start of a slow answer');
      await expect(chat(page).getByRole('button', { name: 'Stop' })).toBeHidden();
      await expect(field(page)).toBeEnabled();
      await ask(page, 'again');
      await expect(bubbles(page).last()).toHaveText('Hello there, again.');
    });

    test('Stop before the first word leaves the word Stopped in the bubble', async ({ page }) => {
      await open(page);
      await ask(page, 'gate');
      await chat(page).getByRole('button', { name: 'Stop' }).click();
      await expect(bubbles(page).last()).toHaveText('Stopped');
      await expect(status(page)).toHaveText('Stopped');
      await expect(field(page)).toBeEnabled();
    });

    test('an error is told in the bubble with its name, and a Try again button sends the same question once more', async ({ page }) => {
      await open(page);
      await page.evaluate(() => (/** @type {any} */ (window).fake.fail = true));
      await ask(page, 'error');
      await expect(status(page)).toHaveText('No answer. Try again.');
      await expect(bubbles(page).last()).toContainText('No answer. Try again.');
      await expect(bubbles(page).last()).toContainText('FakeError');
      const retry = chat(page).getByRole('button', { name: 'Try again' });
      await expect(retry).toBeVisible();
      // The question that got no answer is not part of the history the provider sees next
      await page.evaluate(() => (/** @type {any} */ (window).fake.fail = false));
      await retry.click();
      await expect(bubbles(page).last()).toHaveText('It works now.');
      await expect(messages(page)).toHaveCount(2);
      await expect(chat(page).getByRole('button', { name: 'Try again' })).toHaveCount(0);
      const asked = await page.evaluate(() => /** @type {any} */ (window).fake.asked);
      expect(asked.at(-1)).toEqual([{ role: 'user', content: 'error' }]);
    });

    test('an answer has a Copy answer button that copies its text', async ({ page, context }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await recordCopies(page);
      await open(page);
      await ask(page, 'copy me');
      const copy = chat(page).getByRole('button', { name: 'Copy answer' });
      await expect(copy).toHaveCount(1);
      await copy.click();
      await expect.poll(() => copiedText(page)).toBe('Hello there, copy me.');
      await expect(chat(page).getByRole('button', { name: 'Copied' })).toBeVisible();
    });
  });

  test.describe('what the answer is made of', () => {
    test('Markdown becomes elements: bold, slanted, code, both kinds of list, a quote and a block of code', async ({ page }) => {
      await open(page);
      await ask(page, 'rich');
      await expect(status(page)).toHaveText('Answer ready');
      const reply = bubbles(page).last();
      await expect(reply.locator('strong')).toHaveText('bold words');
      await expect(reply.locator('em')).toHaveText('slanted words');
      await expect(reply.locator('code').filter({ hasText: 'inline code' })).toHaveCount(1);
      await expect(reply.locator('ul > li')).toHaveText(['first item', 'second item']);
      await expect(reply.locator('ol > li')).toHaveText(['step one', 'step two']);
      await expect(reply.locator('blockquote')).toContainText('a quoted line');
      await expect(reply.locator('pre code')).toHaveText('let less = 1 < 2;');
      // None of the marks is left in the words
      const text = (await reply.textContent()) ?? '';
      for (const mark of ['**', '```', '- first', '1. step', '> a quoted']) expect(text, mark).not.toContain(mark);
    });

    test('what the model writes is never HTML: no element, no handler, no script, no javascript: link', async ({ page }) => {
      await open(page);
      await ask(page, 'html');
      await expect(status(page)).toHaveText('Answer ready');
      const reply = bubbles(page).last();
      // The words are on the page, as words
      await expect(reply).toContainText('not bold');
      await expect(reply).toContainText('raw anchor');
      for (const tag of ['img', 'script', 'b', 'iframe']) await expect(reply.locator(tag), `<${tag}>`).toHaveCount(0);
      await expect(reply.locator('a')).toHaveCount(0);
      expect(await reply.locator('[onerror], [onclick], [href^="javascript:"]').count()).toBe(0);
      expect(await page.evaluate(() => /** @type {any} */ (window).fake.pwned)).toBe(0);
    });

    test('a link is a link only when it is one of the sources of that answer: the others stay text', async ({ page }) => {
      await open(page);
      await ask(page, 'links');
      await expect(status(page)).toHaveText('Answer ready');
      const reply = bubbles(page).last();
      await expect(reply).toContainText('the stranger');
      await expect(reply.getByRole('link', { name: 'the stranger' })).toHaveCount(0);
      await expect(reply.locator('a[href*="example.test"]')).toHaveCount(0);
      await expect(reply.getByRole('link', { name: 'the allowed page' })).toHaveAttribute('href', /chat\.html\?allowed$/);
      // The sources themselves are a labelled list under the answer
      const sources = chat(page).getByRole('list', { name: 'Sources' });
      await expect(sources.getByRole('link', { name: 'The allowed page' })).toHaveAttribute('href', /chat\.html\?allowed$/);
    });

    test('the sources belong to the answer that gave them: the next answer has none of the previous answer\'s', async ({ page }) => {
      await open(page);
      await ask(page, 'links');
      await expect(status(page)).toHaveText('Answer ready');
      await ask(page, 'rich');
      await expect(bubbles(page).last().locator('strong')).toHaveText('bold words');
      // The sources list belongs to the answer that gave it
      await expect(chat(page).getByRole('list', { name: 'Sources' })).toHaveCount(1);
    });
  });

  test.describe('the people in it', () => {
    test("the names are for a screen reader: they are in the page and not in the eye, and there are no avatars", async ({ page }) => {
      await open(page);
      await ask(page, 'hi');
      await expect(messages(page)).toHaveCount(2);
      // The visitor is "You"; the assistant has the name its provider gives
      for (const name of ['You', 'Fake persona']) {
        const label = chat(page).locator('.luz-chat__msg').getByText(name, { exact: true });
        await expect(label).toHaveCount(1);
        const box = await label.boundingBox();
        expect(box?.width ?? 0, `${name} is clipped`).toBeLessThanOrEqual(1);
        expect(box?.height ?? 0, `${name} is clipped`).toBeLessThanOrEqual(1);
      }
      await expect(chat(page).locator('.luz-chat__msg').locator('img, luz-avatar, .luz-avatar, [class*="avatar"]')).toHaveCount(0);
    });

    test('assistant-name and user-name of the element are the names', async ({ page }) => {
      await open(page, 'labelled');
      await ask(page, 'hi', 'labelled', 'Your message');
      await expect(chat(page, 'labelled').locator('.luz-chat__msg').getByText('Ada', { exact: true })).toHaveCount(1);
      await expect(chat(page, 'labelled').locator('.luz-chat__msg').getByText('Visitor', { exact: true })).toHaveCount(1);
      await expect(chat(page, 'labelled').locator('.luz-chat__msg').getByText('Fake persona')).toHaveCount(0);
    });

    test("the visitor's bubble is at the end of the line and the assistant's at the start, and right-to-left turns it round", async ({ page }) => {
      await open(page);
      await ask(page, 'one');
      await expect(messages(page)).toHaveCount(2);
      const centre = async (locator) => {
        const box = await locator.boundingBox();
        return (box?.x ?? 0) + (box?.width ?? 0) / 2;
      };
      expect(await centre(bubbles(page).first()), 'ltr: the visitor on the right').toBeGreaterThan(await centre(bubbles(page).last()));
      await expect(chat(page, 'rtl').getByRole('textbox')).toBeEnabled();
      await ask(page, 'uno', 'rtl', 'Tu mensaje');
      await expect(messages(page, 'rtl')).toHaveCount(2);
      expect(await centre(bubbles(page, 'rtl').first()), 'rtl: the visitor on the left').toBeLessThan(await centre(bubbles(page, 'rtl').last()));
    });
  });

  test.describe('the words of the chat', () => {
    test('data-luz-label-<key> on an ancestor replaces a label, and the rest stay as they are', async ({ page }) => {
      await open(page, 'labelled');
      await expect(chat(page, 'labelled').getByRole('button', { name: 'Go' })).toBeVisible();
      await expect(chat(page, 'labelled').getByRole('button', { name: 'Send' })).toHaveCount(0);
      await expect(field(page, 'labelled')).toHaveAttribute('placeholder', 'Type here');
      await expect(chat(page, 'labelled').getByRole('log', { name: 'Conversation' })).toBeVisible();
    });

    test('lang="es" gives the chat its Spanish words, the answer and the status included', async ({ page }) => {
      await open(page, 'spanish');
      const box = field(page, 'spanish', 'Tu mensaje');
      await expect(box).toHaveAttribute('placeholder', 'Escribe un mensaje');
      await expect(chat(page, 'spanish').getByRole('log', { name: 'Conversación' })).toBeVisible();
      await expect(chat(page, 'spanish').getByRole('button', { name: 'Enviar' })).toBeVisible();
      await expect(chat(page, 'spanish').getByRole('region', { name: 'Chat' })).toBeVisible();
      await box.fill('hola');
      await box.press('Enter');
      await expect(chat(page, 'spanish').getByRole('status')).toHaveText('Respuesta lista');
      await expect(chat(page, 'spanish').getByRole('button', { name: 'Copiar respuesta' })).toBeVisible();
    });

    test('dir="rtl" holds at 320 px: nothing scrolls sideways, and the field and the buttons are in the page', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await open(page, 'rtl');
      await ask(page, 'uno', 'rtl', 'Tu mensaje');
      await expect(messages(page, 'rtl')).toHaveCount(2);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      const panel = await chat(page, 'rtl').locator('.luz-chat__panel').boundingBox();
      expect((panel?.x ?? -1) >= 0 && (panel?.x ?? 0) + (panel?.width ?? 0) <= 320).toBe(true);
    });
  });

  test.describe('the keyboard', () => {
    test('Tab goes through the settings, the conversation, the suggestions, the field and Send, in that order', async ({ page }) => {
      await open(page);
      await page.locator('#main > h1').evaluate((el) => {
        el.setAttribute('tabindex', '-1');
        el.focus();
      });
      const names = [];
      const here = () =>
        page.evaluate(() => {
          const el = document.activeElement;
          return el ? el.getAttribute('aria-label') || el.textContent?.trim() || el.id || el.localName : '';
        });
      for (let i = 0; i < 4; i++) {
        await page.keyboard.press('Tab');
        names.push(await here());
      }
      expect(names).toEqual(['Settings', 'Conversation', 'Say hello', 'rich']);
      await page.keyboard.press('Tab');
      await expect(field(page)).toBeFocused();
      await field(page).fill('hi');
      await page.keyboard.press('Tab');
      await expect(chat(page).getByRole('button', { name: 'Send' })).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(messages(page)).toHaveCount(2);
    });

    test('every control has a visible focus ring', async ({ page }) => {
      await open(page);
      await field(page).focus();
      const ring = await field(page).evaluate((el) => ({ style: getComputedStyle(el).outlineStyle, width: parseFloat(getComputedStyle(el).outlineWidth) }));
      expect(ring.style).not.toBe('none');
      expect(ring.width).toBeGreaterThanOrEqual(2);
      await chat(page).locator('summary').focus();
      const gear = await chat(page).locator('summary').evaluate((el) => ({ style: getComputedStyle(el).outlineStyle, width: parseFloat(getComputedStyle(el).outlineWidth) }));
      expect(gear.style).not.toBe('none');
      expect(gear.width).toBeGreaterThanOrEqual(2);
    });
  });

  test.describe('accessibility', () => {
    for (const mode of MODES) {
      test(`${mode}: a conversation with Markdown, sources, a message of the system and the settings open has no serious or critical violation`, async ({ page }) => {
        await open(page);
        await page.evaluate((m) => {
          document.documentElement.dataset.theme = m;
          document.documentElement.dataset.mode = m;
        }, mode);
        await ask(page, 'rich');
        await expect(status(page)).toHaveText('Answer ready');
        await ask(page, 'links');
        await expect(status(page)).toHaveText('Answer ready');
        await chat(page).locator('summary').click();
        await provide(page, { status: 'action', message: 'A step is needed.', body: 'Some words about the step.', action: { label: 'Take the step' } });
        await expect(chat(page).getByRole('button', { name: 'Take the step' })).toBeVisible();
        await faded(page);
        const { violations } = await new AxeBuilder({ page }).include('#main-chat').withTags(WCAG).analyze();
        const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
        expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
      });
    }

    test('the whole fixture page, with every chat, has no serious or critical violation', async ({ page }) => {
      await open(page);
      await expect(chat(page, 'spanish')).toHaveAttribute('data-luz-state', 'ready');
      await faded(page);
      const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
      const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    });
  });
});
