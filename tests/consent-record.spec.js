// @ts-check
/**
 * The record of the cookie consent, written by two scripts: the banner of
 * @luz-ds/catalog (cookie-consent.js) and the "always" answer of <luz-embed>
 * (embed.js), on the one key. tests/fixtures/consent-record.html loads both
 * chunks, with a banner that offers analytics and marketing (and, with
 * ?offer=youtube, the embeds' category too) and two embeds of the category
 * youtube; ?days=… and ?policy=… are set on the banner before the modules run.
 *
 *   - each writer merges into what the other stored: the categories it does not
 *     offer keep their state, `asked` is the union, an unticked category the
 *     banner offers is withdrawn, and an expired record is not merged;
 *   - the stored record is {version, expires, asked, granted, given, policy?};
 *     the event's detail is {asked, granted, withdrawn, expires, given, policy?},
 *     `withdrawn` is never stored; `policy` is kept only when it matches
 *     /^[\w.-]{1,32}$/; the days are clamped to 1..395, 180 when not a number;
 *   - the embeds drop from their page memory what an event withdraws.
 *
 * JavaScript only (the banner and the embed do nothing without it), so it runs
 * in `chromium`.
 */
import { test, expect } from '@playwright/test';

const PAGE = '/tests/fixtures/consent-record.html';
const KEY = 'luz-consent';
const DAY = 864e5;

/** Open the fixture and wait until both elements are defined and wired. */
async function open(page, query = '') {
  await page.goto(`${PAGE}${query}`);
  await expect.poll(() => page.evaluate(() => !!customElements.get('luz-cookie-consent') && !!customElements.get('luz-embed'))).toBe(true);
  await expect(page.locator('#first')).toHaveAttribute('data-luz-state', 'ready');
  await expect(page.locator('#consent')).toBeVisible();
}

/** Record the luz:consent events from the first script on. */
const listen = (page) => page.addInitScript(() => {
  window.__events = [];
  document.addEventListener('luz:consent', (e) => window.__events.push(e.detail));
});

/** Store a record before the first script, once per tab. */
const store = (page, value) => page.addInitScript(([key, v]) => {
  if (!sessionStorage.getItem('seeded')) {
    localStorage.setItem(key, JSON.stringify(v));
    sessionStorage.setItem('seeded', '1');
  }
}, [KEY, value]);

const stored = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), KEY);
const events = (page) => page.evaluate(() => window.__events);
const sorted = (list) => [...list].sort();
const later = () => Date.now() + 100 * DAY;

/** Press "Always play these videos" on an embed. */
async function always(page, id = 'first') {
  await page.locator(`#${id} > button.luz-embed__play`).click();
  await page.locator(`#${id} [data-luz-embed-ask]`).getByRole('button', { name: 'Always play these videos' }).click();
  await expect(page.locator(`#${id} > iframe`)).toHaveCount(1);
}

/** Open the banner's choices, tick the given boxes and press Save. */
async function save(page, ticked) {
  await page.locator('#choices summary').click();
  for (const name of ticked) await page.check(`#c-${name}`);
  await page.click('#save');
  await expect(page.locator('#done')).toBeVisible();
}

test.describe('the banner and the embed write one record', () => {
  test('banner after embed: Accept keeps the embed\'s category, which the banner does not offer, and the asked categories are the union', async ({ page }) => {
    await listen(page);
    await open(page);
    await always(page);
    await page.click('#accept');
    await expect(page.locator('#done')).toBeVisible();

    const record = await stored(page);
    expect(sorted(record.granted)).toEqual(['analytics', 'marketing', 'youtube']);
    expect(sorted(record.asked)).toEqual(['analytics', 'marketing', 'youtube']);
    const [, banner] = await events(page);
    expect(sorted(banner.granted)).toEqual(['analytics', 'marketing', 'youtube']);
    expect(sorted(banner.asked)).toEqual(['analytics', 'marketing', 'youtube']);
    expect(banner.withdrawn).toEqual([]);
  });

  test('banner after embed: Save with only one box ticked keeps the embed\'s category and drops the other', async ({ page }) => {
    await open(page);
    await always(page);
    await save(page, ['analytics']);
    const record = await stored(page);
    expect(sorted(record.granted)).toEqual(['analytics', 'youtube']);
    expect(sorted(record.asked)).toEqual(['analytics', 'marketing', 'youtube']);
  });

  test('banner after embed: a category the banner offers and leaves unticked is withdrawn, and the event says so', async ({ page }) => {
    await listen(page);
    await open(page, '?offer=youtube');
    await always(page);
    await save(page, ['analytics']);

    const record = await stored(page);
    expect(record.granted).toEqual(['analytics']);
    expect(sorted(record.asked)).toEqual(['analytics', 'marketing', 'youtube']);
    const [, banner] = await events(page);
    expect(banner.granted).toEqual(['analytics']);
    expect(banner.withdrawn).toEqual(['youtube']);
  });

  test('banner after embed: Reject withdraws what the banner offers and keeps the rest', async ({ page }) => {
    await open(page);
    await always(page);
    await page.click('#reject');
    await expect(page.locator('#done')).toBeVisible();
    expect((await stored(page)).granted).toEqual(['youtube']);
  });

  test('embed after banner: "always" keeps the banner\'s granted categories, and asked is the union', async ({ page }) => {
    await listen(page);
    await open(page);
    await page.click('#accept');
    await expect(page.locator('#done')).toBeVisible();
    await always(page);

    const record = await stored(page);
    expect(sorted(record.granted)).toEqual(['analytics', 'marketing', 'youtube']);
    expect(sorted(record.asked)).toEqual(['analytics', 'marketing', 'youtube']);
    const [, embed] = await events(page);
    expect(sorted(embed.granted)).toEqual(['analytics', 'marketing', 'youtube']);
    expect(sorted(embed.asked)).toEqual(['analytics', 'marketing', 'youtube']);
    expect(embed.withdrawn).toEqual([]);
  });

  test('embed after banner: it keeps a banner choice that granted only some', async ({ page }) => {
    await open(page);
    await save(page, ['marketing']);
    await always(page);
    const record = await stored(page);
    expect(sorted(record.granted)).toEqual(['marketing', 'youtube']);
    expect(sorted(record.asked)).toEqual(['analytics', 'marketing', 'youtube']);
  });

  test('an expired record is not merged: its categories do not come back, from the banner or from the embed', async ({ page }) => {
    const expired = { version: 1, expires: Date.now() - 1000, asked: ['analytics', 'youtube'], granted: ['analytics', 'youtube'] };
    await store(page, expired);
    await listen(page);
    await open(page);
    await save(page, ['marketing']);
    const record = await stored(page);
    expect(record.granted).toEqual(['marketing']);
    expect(sorted(record.asked)).toEqual(['analytics', 'marketing']);
    expect((await events(page))[0].withdrawn).toEqual([]);

    await page.evaluate(([key, v]) => localStorage.setItem(key, JSON.stringify(v)), [KEY, expired]);
    await always(page);
    const again = await stored(page);
    expect(again.granted).toEqual(['youtube']);
    expect(again.asked).toEqual(['youtube']);
  });
});

test.describe('the record and the event', () => {
  test('banner: the stored record has version, expires, asked, granted and given, and not withdrawn', async ({ page }) => {
    await store(page, { version: 1, expires: later(), asked: ['analytics'], granted: ['analytics'] });
    await listen(page);
    await open(page);
    await page.click('#reject');
    await expect(page.locator('#done')).toBeVisible();

    const record = await stored(page);
    expect(Object.keys(record).sort()).toEqual(['asked', 'expires', 'given', 'granted', 'version']);
    expect(record.version).toBe(1);
    expect(typeof record.given).toBe('string');
    expect(new Date(record.given).toISOString()).toBe(record.given);
    expect(Math.abs(new Date(record.given).getTime() - Date.now())).toBeLessThan(60e3);
  });

  test('banner: the event says asked, granted, withdrawn, expires and given; what was granted before and is not now is withdrawn', async ({ page }) => {
    await store(page, { version: 1, expires: later(), asked: ['analytics'], granted: ['analytics'] });
    await listen(page);
    await open(page);
    await page.click('#reject');
    await expect(page.locator('#done')).toBeVisible();

    const record = await stored(page);
    const [detail, ...rest] = await events(page);
    expect(rest).toEqual([]);
    expect(Object.keys(detail).sort()).toEqual(['asked', 'expires', 'given', 'granted', 'withdrawn']);
    expect(sorted(detail.asked)).toEqual(['analytics', 'marketing']);
    expect(detail.granted).toEqual([]);
    expect(detail.withdrawn).toEqual(['analytics']);
    expect(detail.expires).toBe(record.expires);
    expect(detail.given).toBe(record.given);
  });

  test('embed: the stored record has no withdrawn, and the event always sends an empty one', async ({ page }) => {
    await listen(page);
    await open(page);
    await always(page);

    const record = await stored(page);
    expect(Object.keys(record).sort()).toEqual(['asked', 'expires', 'given', 'granted', 'version']);
    expect(record.asked).toEqual(['youtube']);
    expect(record.granted).toEqual(['youtube']);
    expect(new Date(record.given).toISOString()).toBe(record.given);
    const [detail, ...rest] = await events(page);
    expect(rest).toEqual([]);
    expect(Object.keys(detail).sort()).toEqual(['asked', 'expires', 'given', 'granted', 'withdrawn']);
    expect(detail.asked).toEqual(['youtube']);
    expect(detail.granted).toEqual(['youtube']);
    expect(detail.withdrawn).toEqual([]);
    expect(detail.expires).toBe(record.expires);
    expect(detail.given).toBe(record.given);
  });

  for (const [who, answer] of [['banner', (page) => page.click('#reject')], ['embed', (page) => always(page)]]) {
    test(`${who}: data-luz-consent-policy is stored, and sent, when it is 1 to 32 letters, digits, dots, underscores or hyphens`, async ({ page }) => {
      await listen(page);
      await open(page, '?policy=v2.1_a-b');
      await answer(page);
      expect((await stored(page)).policy).toBe('v2.1_a-b');
      expect((await events(page))[0].policy).toBe('v2.1_a-b');
    });

    for (const [name, value] of [['has a space', 'v 2'], ['has a character outside the set', 'v2%21'], ['is 33 characters', 'a'.repeat(33)], ['is empty', '']]) {
      test(`${who}: a policy that ${name} is left out of the record and of the event`, async ({ page }) => {
        await listen(page);
        await open(page, `?policy=${encodeURIComponent(value)}`);
        await answer(page);
        expect(Object.keys(await stored(page))).not.toContain('policy');
        expect(Object.keys((await events(page))[0])).not.toContain('policy');
      });
    }

    for (const [value, days] of [['30', 30], ['9999', 395], ['abc', 180], ['', 180]]) {
      test(`${who}: data-luz-consent-days="${value}" lasts ${days} days`, async ({ page }) => {
        await listen(page);
        await open(page, `?days=${value}`);
        await answer(page);
        const record = await stored(page);
        expect(Math.round((record.expires - Date.now()) / DAY)).toBe(days);
        expect((await events(page))[0].expires).toBe(record.expires);
      });
    }
  }
});

test.describe('the embeds\' memory of the page', () => {
  test('a luz:consent event that withdraws the category makes the next embed ask again, with storage blocked', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } });
    });
    await open(page);
    await always(page);
    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent('luz:consent', { detail: { asked: ['youtube'], granted: [], withdrawn: ['youtube'], expires: Date.now() + 864e5, given: new Date().toISOString() } }));
    });
    await page.locator('#second > button.luz-embed__play').click();
    await expect(page.locator('#second')).toHaveAttribute('data-luz-state', 'ask');
    await expect(page.locator('#second > iframe')).toHaveCount(0);
  });

  test('without the withdrawal, what one embed was given the next one has, with storage blocked', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } });
    });
    await open(page);
    await always(page);
    await page.locator('#second > button.luz-embed__play').click();
    await expect(page.locator('#second > iframe')).toHaveCount(1);
  });
});
