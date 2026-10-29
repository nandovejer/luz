// @ts-check
/**
 * <luz-theme-time variant="bar"> (catalog): the slider of the 24 hours.
 *
 * By default the bar is the slider and nothing else: no hour, no place, no
 * "Saved" and no moment options on screen, while the slider keeps its name
 * (data-luz-label-scrub) and its aria-valuetext ("Afternoon light, 12:25").
 * The attribute `show` (words: time place saved moments) turns each part on.
 * The slider steps 5 minutes; dragging previews, letting go pins and stores
 * (luz-light); the note is a role=status written once per pin.
 *
 * The page is tests/fixtures/theme-time-bar.html (moments and sky declared by
 * the page) and tests/fixtures/theme-time-bar-neutral.html (no sky). The
 * clock is the page's own (a June day in Madrid). The two chunks, the clock's
 * moments and the no-JS state are in tests/theme-time.spec.js.
 */
import { test, expect } from '@playwright/test';
import { faded } from './helpers/settle.js';
import { NO_CHOICE, TIMEZONE, seedMode } from './helpers/site-lights.js';
import { BAR, MOMENTS, NEUTRAL, isVisuallyHidden, open, paint, rootState, skyOf, trackVisibility } from './helpers/theme-time.js';

test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript');
test.use({ timezoneId: TIMEZONE, storageState: NO_CHOICE });

const ALL = `${BAR}?show=time%20place%20saved%20moments&place=Madrid`;

const host = (page) => page.locator('luz-theme-time[variant="bar"]');
const slider = (page) => page.getByRole('slider', { name: 'Hour of the day' });
const part = (page, name) => page.locator(`luz-theme-time > .luz-theme-time__bar .luz-theme-time__${name}`);
const stored = (page) => page.evaluate(() => localStorage.getItem('luz-light'));

test.describe('by default the bar is the slider alone', () => {
  test('the slider is there with its name; the hour, the place, the note and the moments are not shown', async ({ page }) => {
    await open(page, BAR, { time: '12:25', bar: true });
    await expect(slider(page)).toBeVisible();
    await expect(part(page, 'hour')).toBeHidden();
    await expect(part(page, 'where')).toBeHidden();
    await expect(page.locator('.luz-theme-time__moments')).toBeHidden();
    await expect(page.locator('.luz-theme-time__moment')).toHaveCount(6);
    for (const option of await page.locator('.luz-theme-time__moment').all()) await expect(option).toBeHidden();
    expect(await isVisuallyHidden(part(page, 'saved')), 'the note takes no room').toBe(true);
  });

  test('the bar draws one thing: the day with the slider over it', async ({ page }) => {
    await open(page, BAR, { time: '12:25', bar: true });
    const shown = await part(page, 'day').evaluate((day) => {
      const bar = day.closest('.luz-theme-time__bar');
      return [...bar.children].filter((child) => child.checkVisibility() && child.getBoundingClientRect().width > 1).map((child) => child.className);
    });
    expect(shown).toEqual(['luz-theme-time__day']);
  });

  test('the slider keeps its accessible name and says the moment and the hour', async ({ page }) => {
    await open(page, BAR, { time: '12:25', bar: true });
    await expect(slider(page)).toHaveAttribute('aria-valuetext', 'Afternoon light, 12:25');
    await expect(slider(page)).toHaveValue('745');
  });

  for (const [hhmm, text] of [
    ['09:05', 'Morning light, 09:05'],
    ['19:10', 'Sunset, 19:10'],
    ['23:55', 'Night, 23:55'],
    ['00:00', 'Night, 00:00'],
  ]) {
    test(`${hhmm} reads "${text}"`, async ({ page }) => {
      await open(page, BAR, { time: hhmm, bar: true });
      await expect(slider(page)).toHaveAttribute('aria-valuetext', text);
    });
  }

  test('the note is a status region, in the page for a screen reader even when it is not shown', async ({ page }) => {
    await open(page, BAR, { time: '12:25', bar: true });
    await expect(part(page, 'saved')).toHaveAttribute('role', 'status');
    await slider(page).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toHaveCount(1);
    expect(await isVisuallyHidden(part(page, 'saved')), 'still takes no room while it says it').toBe(true);
  });
});

test.describe('show: each word turns a part on', () => {
  test('time: the hour in large type, and only that', async ({ page }) => {
    await open(page, `${BAR}?show=time`, { time: '12:25', bar: true });
    await expect(part(page, 'hour')).toBeVisible();
    await expect(part(page, 'hour')).toHaveText('12:25');
    await expect(part(page, 'where')).toBeHidden();
    await expect(page.locator('.luz-theme-time__moments')).toBeHidden();
    expect(await isVisuallyHidden(part(page, 'saved'))).toBe(true);
  });

  test('place: the place and the moment, and only that', async ({ page }) => {
    await open(page, `${BAR}?show=place&place=Madrid`, { time: '12:25', bar: true });
    await expect(part(page, 'where')).toBeVisible();
    await expect(part(page, 'where')).toHaveText('Madrid · Afternoon light');
    await expect(part(page, 'hour')).toBeHidden();
    await expect(page.locator('.luz-theme-time__moments')).toBeHidden();
  });

  test('saved: the note shows when an hour is pinned, then goes', async ({ page }) => {
    await open(page, `${BAR}?show=saved`, { time: '12:25', bar: true });
    await slider(page).focus();
    await page.keyboard.press('ArrowRight');
    await expect(part(page, 'saved')).toBeVisible();
    await expect(part(page, 'saved')).toContainText('Saved');
    expect(await isVisuallyHidden(part(page, 'saved'))).toBe(false);
    await expect(part(page, 'saved'), 'the note is a passing one').toHaveText('', { timeout: 6000 });
    await expect(part(page, 'hour')).toBeHidden();
  });

  test('moments: the declared moments as options under the slider; choosing one pins its hour', async ({ page }) => {
    await open(page, `${BAR}?show=moments`, { time: '12:25', bar: true });
    await expect(page.locator('.luz-theme-time__moments')).toBeVisible();
    const labels = await page.locator('.luz-theme-time__moment').allTextContents();
    expect(labels.map((l) => l.trim())).toEqual(MOMENTS.map(([, , , label]) => label));
    await page.locator('.luz-theme-time__moment', { hasText: 'Sunset' }).click();
    expect(await host(page).evaluate((el) => el.pinned)).toBe(17.5);
    expect(await stored(page)).toBe('1050');
    expect(await rootState(page)).toMatchObject({ moment: 'sunset', mode: 'light' });
    await expect(slider(page)).toHaveValue('1050');
    await expect(part(page, 'hour')).toBeHidden();
  });

  test('all four words: every part is there', async ({ page }) => {
    await open(page, ALL, { time: '12:25', bar: true });
    await expect(part(page, 'hour')).toBeVisible();
    await expect(part(page, 'where')).toBeVisible();
    await expect(page.locator('.luz-theme-time__moments')).toBeVisible();
    await slider(page).focus();
    await page.keyboard.press('ArrowRight');
    await expect(part(page, 'saved')).toBeVisible();
  });
});

test.describe('the slider', () => {
  test('steps five minutes', async ({ page }) => {
    await open(page, BAR, { time: '12:00', bar: true });
    await expect(slider(page)).toHaveAttribute('step', '5');
    await slider(page).focus();
    await page.keyboard.press('ArrowRight');
    await expect(slider(page)).toHaveValue('725');
    await page.keyboard.press('ArrowRight');
    await expect(slider(page)).toHaveValue('730');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(slider(page)).toHaveValue('715');
    expect(await stored(page), 'each press pins and stores').toBe('715');
  });

  test('End is 23:55, Home is 00:00', async ({ page }) => {
    await open(page, BAR, { time: '12:00', bar: true });
    await slider(page).focus();
    await page.keyboard.press('End');
    await expect(slider(page)).toHaveValue('1435');
    await expect(slider(page)).toHaveAttribute('aria-valuetext', 'Night, 23:55');
    expect(await stored(page)).toBe('1435');
    await page.keyboard.press('Home');
    await expect(slider(page)).toHaveValue('0');
    await expect(slider(page)).toHaveAttribute('aria-valuetext', 'Night, 00:00');
    expect(await stored(page)).toBe('0');
  });

  test('PageUp and PageDown move a tenth of the day', async ({ page }) => {
    await open(page, BAR, { time: '12:00', bar: true });
    await slider(page).focus();
    await page.keyboard.press('PageUp');
    const up = Number(await slider(page).inputValue());
    expect(up % 5, 'a multiple of 5 minutes').toBe(0);
    expect(up - 720, 'a tenth of the day, about 144 minutes').toBeGreaterThanOrEqual(140);
    expect(up - 720).toBeLessThanOrEqual(150);
    await page.keyboard.press('PageDown');
    await page.keyboard.press('PageDown');
    const down = Number(await slider(page).inputValue());
    expect(720 - down).toBeGreaterThanOrEqual(135);
    expect(720 - down).toBeLessThanOrEqual(155);
  });

  test('an hour that is pinned is stored in minutes, a multiple of 5', async ({ page }) => {
    await open(page, BAR, { time: '12:00', bar: true });
    await slider(page).focus();
    for (const key of ['ArrowRight', 'PageUp', 'ArrowLeft', 'PageDown']) {
      await page.keyboard.press(key);
      const minutes = Number(await stored(page));
      expect(minutes % 5, key).toBe(0);
      expect(minutes, key).toBeLessThanOrEqual(1435);
    }
  });

  test('dragging previews, letting go pins and stores', async ({ page }) => {
    await open(page, BAR, { time: '14:00', bar: true });
    const box = await slider(page).boundingBox();
    const x = (share) => box.x + 9 + (box.width - 18) * share;
    const y = box.y + box.height / 2;
    await page.mouse.move(x(0.5), y);
    await page.mouse.down();
    await page.mouse.move(x(0.78), y, { steps: 8 });
    await expect(page.locator('html')).toHaveAttribute('data-moment', 'sunset');
    expect(await stored(page), 'a preview is not stored').toBeNull();
    expect(await host(page).evaluate((el) => el.pinned), 'a preview is not pinned').toBeNull();
    await page.mouse.move(x(0.4), y, { steps: 8 });
    await expect(page.locator('html')).toHaveAttribute('data-moment', 'morning');
    expect(await stored(page)).toBeNull();
    await page.mouse.up();
    const minutes = Number(await stored(page));
    expect(minutes % 5).toBe(0);
    expect(minutes, 'about 09:36').toBeGreaterThanOrEqual(540);
    expect(minutes).toBeLessThanOrEqual(620);
    expect(await host(page).evaluate((el) => Math.round(el.pinned * 60))).toBe(minutes);
    expect(await rootState(page)).toMatchObject({ moment: 'morning', mode: 'light' });
  });

  test('a stored hour loads rounded to 5 and the slider is there', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('luz-light', '727'));
    await open(page, BAR, { time: '22:00', bar: true });
    await expect(slider(page)).toHaveValue('725');
    await expect(slider(page)).toHaveAttribute('aria-valuetext', 'Afternoon light, 12:05');
  });
});

test.describe('letting go of a pinned hour', () => {
  test('choosing a mode with the button of core lets go', async ({ page }) => {
    await open(page, BAR, { time: '12:00', bar: true });
    await slider(page).focus();
    await page.keyboard.press('ArrowRight');
    expect(await stored(page)).toBe('725');
    await page.locator('.luz-theme-mode__button').click();
    expect(await stored(page)).toBeNull();
    expect(await host(page).evaluate((el) => el.pinned)).toBeNull();
  });

  test('Escape on the slider lets go of a pinned hour, and stops there', async ({ page }) => {
    await open(page, BAR, { time: '12:00', bar: true });
    await page.evaluate(() => {
      window.__escapes = 0;
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') window.__escapes++;
      });
    });
    await slider(page).focus();
    await page.keyboard.press('ArrowRight');
    expect(await stored(page)).toBe('725');
    await page.keyboard.press('Escape');
    expect(await stored(page), 'unpinned').toBeNull();
    await expect(slider(page), 'back on the clock').toHaveValue('720');
    expect(await page.evaluate(() => window.__escapes), 'the press stayed on the slider').toBe(0);
  });

  test('Escape with nothing pinned is not the slider\'s: it goes on to whoever listens (a dialog, a disclosure)', async ({ page }) => {
    await open(page, BAR, { time: '12:00', bar: true });
    await page.evaluate(() => {
      window.__escapes = 0;
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') window.__escapes++;
      });
    });
    await slider(page).focus();
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => window.__escapes)).toBe(1);
  });
});

test.describe('the note: said once for each pin', () => {
  test('seven presses within 2.5 seconds write the status once', async ({ page }) => {
    await open(page, BAR, { time: '12:00', bar: true });
    const status = part(page, 'saved');
    await expect(status).toHaveText('');
    await status.evaluate((el) => {
      window.__writes = 0;
      new MutationObserver((records) => (window.__writes += records.filter((r) => r.type === 'childList').length)).observe(el, { childList: true });
    });
    await slider(page).focus();
    for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowRight', { delay: 20 });
    await expect(status).toContainText('Saved');
    expect(await page.evaluate(() => window.__writes), 'writes to the live region').toBe(1);
  });

  test('a new pin after the note has gone writes it again', async ({ page }) => {
    await open(page, BAR, { time: '12:00', bar: true });
    const status = part(page, 'saved');
    await slider(page).focus();
    await page.keyboard.press('ArrowRight');
    await expect(status).toContainText('Saved');
    await expect(status).toHaveText('', { timeout: 6000 });
    await page.keyboard.press('ArrowRight');
    await expect(status).toContainText('Saved');
  });
});

test.describe('the track: the sky the page paints', () => {
  test('one stop for each moment the page gives a sky, in order, at the middle of its share of the day', async ({ page }) => {
    await open(page, BAR, { time: '14:00', bar: true });
    const sky = await skyOf(page);
    expect(sky, '--luz-theme-time-sky is set').not.toBeNull();
    expect(sky.text.startsWith('linear-gradient(')).toBe(true);
    expect(sky.way).toBe('90deg');
    const names = MOMENTS.map(([name]) => name);
    const colours = await page.evaluate(
      (list) => Object.fromEntries(list.map((n) => [n, getComputedStyle(document.documentElement).getPropertyValue(`--luz-theme-time-sky-${n}`).trim()])),
      names,
    );
    const nameOf = (colour) => names.find((n) => colours[n].toLowerCase() === colour.toLowerCase()) ?? colour;
    const stops = sky.stops.map((s) => [nameOf(s.colour), s.at]);
    // The moment that starts last runs past midnight: it holds both ends of the track, the others sit at the middle of their own stretch
    expect(stops.map(([n]) => n)).toEqual(['night', ...names.filter((n) => n !== 'night'), 'night']);
    expect(stops[0][1]).toBe(0);
    expect(stops.at(-1)[1]).toBe(100);
    const starts = MOMENTS.map(([, from]) => from);
    names
      .filter((n) => n !== 'night')
      .forEach((name, i) => {
        const middle = (starts[i] + starts[i + 1]) / 2 / 24 * 100;
        expect(stops[i + 1][1], `${name} at the middle of its share`).toBeCloseTo(middle, 0);
        expect(Math.abs(stops[i + 1][1] - middle), name).toBeLessThan(0.2);
      });
    const ats = stops.map(([, at]) => at);
    expect([...ats].sort((a, b) => a - b)).toEqual(ats);
  });

  test('the day is painted with that gradient', async ({ page }) => {
    await open(page, BAR, { time: '14:00', bar: true });
    const image = await part(page, 'day').evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(image.startsWith('linear-gradient(')).toBe(true);
    for (const [name] of MOMENTS) {
      const { r, g, b } = await paint(part(page, 'day'), `var(--luz-theme-time-sky-${name})`);
      expect(image, name).toContain(`rgb(${r}, ${g}, ${b})`);
    }
  });

  test('a page that gives no sky gets the neutral ramp, and no sky property', async ({ page }) => {
    await open(page, NEUTRAL, { time: '14:00', bar: true });
    expect(await skyOf(page)).toBeNull();
    const image = await part(page, 'day').evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(image.startsWith('linear-gradient(')).toBe(true);
    expect((image.match(/rgb/g) ?? []).length, 'a ramp of several colours').toBeGreaterThan(2);
  });

  test('in high contrast the track is one solid colour: the page\'s text', async ({ page }) => {
    await seedMode(page, 'high-contrast');
    await open(page, BAR, { time: '14:00', bar: true });
    await faded(page);
    expect(await rootState(page)).toMatchObject({ mode: 'high-contrast' });
    const sky = await skyOf(page);
    const ink = await paint(part(page, 'day'), 'var(--luz-text-primary)');
    const paints = await Promise.all(sky.stops.map((s) => paint(part(page, 'day'), s.colour)));
    for (const p of paints) expect(p).toEqual(ink);
  });

  test('right to left the day runs from the right', async ({ page }) => {
    await open(page, `${BAR}?dir=rtl`, { time: '14:00', bar: true });
    expect((await skyOf(page)).way).toBe('270deg');
    const box = await slider(page).boundingBox();
    await page.mouse.click(box.x + box.width - 14, box.y + box.height / 2);
    const early = Number(await slider(page).inputValue());
    expect(early, 'a press at the right end is the start of the day').toBeLessThan(200);
  });

  test('left to right the day runs from the left', async ({ page }) => {
    await open(page, BAR, { time: '14:00', bar: true });
    expect((await skyOf(page)).way).toBe('90deg');
    const box = await slider(page).boundingBox();
    await page.mouse.click(box.x + 14, box.y + box.height / 2);
    expect(Number(await slider(page).inputValue())).toBeLessThan(200);
  });
});

test.describe('the track\'s edge and the slider over it', () => {
  test('the day has the soft ring; the slider is transparent over it with a 44 px target', async ({ page }) => {
    await open(page, BAR, { time: '14:00', bar: true });
    const day = await part(page, 'day').evaluate((el) => {
      const style = getComputedStyle(el);
      return { shadow: style.boxShadow, height: el.getBoundingClientRect().height, radius: style.borderTopLeftRadius };
    });
    expect(day.shadow, 'a ring').not.toBe('none');
    expect(day.height, 'the track is a few pixels tall').toBeLessThan(12);
    const over = await slider(page).evaluate((el) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return { background: style.backgroundColor, image: style.backgroundImage, height: rect.height };
    });
    expect(over.background).toBe('rgba(0, 0, 0, 0)');
    expect(over.image).toBe('none');
    expect(over.height, 'a target of 44 px').toBeGreaterThanOrEqual(44);
    const dayBox = await part(page, 'day').boundingBox();
    const sliderBox = await slider(page).boundingBox();
    expect(sliderBox.y).toBeLessThan(dayBox.y);
    expect(sliderBox.y + sliderBox.height).toBeGreaterThan(dayBox.y + dayBox.height);
  });

  for (const mode of ['light', 'dark', 'high-contrast']) {
    test(`${mode}: the worst stretch of the track stands apart from the page by 3:1 (pixels beside the edge)`, async ({ page }) => {
      await seedMode(page, mode);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await open(page, BAR, { time: '14:00', bar: true });
      expect(await rootState(page)).toMatchObject({ mode });
      await faded(page);
      const { worst, columns } = await trackVisibility(page, part(page, 'day'), slider(page));
      expect(columns).toBeGreaterThan(40);
      expect(worst, `the least visible column of the track in ${mode}`).toBeGreaterThanOrEqual(3);
    });
  }
});

test.describe('forced colours and reduced motion', () => {
  test('forced colours: the day is CanvasText with a 1px outline of it and no shadow', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await open(page, BAR, { time: '14:00', bar: true });
    const style = await part(page, 'day').evaluate((el) => {
      const s = getComputedStyle(el);
      return { outlineStyle: s.outlineStyle, outlineWidth: s.outlineWidth, outlineColor: s.outlineColor, shadow: s.boxShadow, background: s.backgroundColor, image: s.backgroundImage };
    });
    const ink = await paint(part(page, 'day'), 'CanvasText');
    const rgb = ({ r, g, b }) => `rgb(${r}, ${g}, ${b})`;
    expect(style.outlineStyle).toBe('solid');
    expect(style.outlineWidth).toBe('1px');
    expect(style.outlineColor).toBe(rgb(ink));
    expect(style.shadow).toBe('none');
    expect(style.background).toBe(rgb(ink));
    expect(style.image).toBe('none');
  });

  test('reduced motion: the note and the options do not fade', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, `${BAR}?show=saved%20moments`, { time: '14:00', bar: true });
    const seconds = (locator) => locator.evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration));
    expect(await seconds(part(page, 'saved'))).toBeLessThanOrEqual(0.02);
    expect(await seconds(page.locator('.luz-theme-time__moment').first())).toBeLessThanOrEqual(0.02);
  });

  test('motion welcome: the note fades in and out', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await open(page, `${BAR}?show=saved`, { time: '14:00', bar: true });
    expect(await part(page, 'saved').evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration))).toBeGreaterThan(0.1);
  });
});
