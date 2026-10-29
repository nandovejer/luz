// @ts-check
/**
 * <home-light> on the home page (F3 of .claude/plans/luz-home-docs-identity.md,
 * section 3.7; D8, D11). The element sits in section#light after the hero:
 *
 *   <home-light bleed favicon>
 *
 * It draws the sun and the moon where the visitor is (the zone of Intl, no
 * network), over the puzzle globe: one piece per country, the land loaded
 * from globe-data.js once the globe is on screen and the browser is idle
 * (<home-globe land> says it is drawn). There is one look and no way to
 * choose another: no look buttons, no ?look=, nothing remembered. It does not own the colour mode:
 * <luz-color-mode> (the footer's) is the only writer of data-theme and data-light,
 * and <home-light> asks it to preview an hour (the slider) or to return to now
 * (Live). What it writes on <html> are custom properties: --sun-alt, --sun-az,
 * --sun-x and --day-left. Its texts are data-luz-label-* of <body>, from the
 * catalog (apps/landing/i18n). The files and their budgets are in
 * tests/home-light.test.js.
 *
 * What the controller renders, as this file reads it (the class names of the
 * mockup, kept by light.css): `.home-light__line` the button under the visual
 * (the phrase of the look, it opens the bar), `.home-light__bar` the bar,
 * the slider (a range input named "Scrub the day"), `.home-light__q` the
 * phrase (closing the bar brings the light back to now), and <home-globe> for the drawing.
 *
 * The bar opens from the line on a narrow window or a touch screen; from 1024px
 * with a pointer that hovers it is always open (resting at 70% until the pointer
 * or the focus comes), so the tests of opening and closing run at NARROW.
 *
 * Without JavaScript the element is empty and light.css reserves its height.
 * That block turns JavaScript off for itself, so it runs in the chromium
 * project; every other test needs JavaScript and skips itself where it is off.
 */
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { faded } from './helpers/settle.js';
import { LIGHTS, NO_CHOICE, TIMEZONE, atTime } from './helpers/site-lights.js';

const jsOff = () => test.info().project.use.javaScriptEnabled === false;

const catalog = (lang) => JSON.parse(readFileSync(new URL(`../apps/landing/i18n/${lang}.json`, import.meta.url), 'utf-8'));
const EN = catalog('en');
/** The text of an English string in a language: the key is found by its English value. */
const text = (lang, english) => {
  const key = Object.keys(EN).find((k) => EN[k] === english);
  if (!key) throw new Error(`no key of en.json has the value "${english}"`);
  return catalog(lang)[key];
};
const ROUTES = [
  ['/', 'en'],
  ['/es/', 'es'],
  ['/ar/', 'ar'],
];
/** Below 1024px the bar is a disclosure: closed on load, opened and closed by its line. From 1024px with a hover it is always open. */
const NARROW = { width: 800, height: 900 };
/** The origin of the server under test, whatever its port (the project's baseURL). */
const origin = () => new URL(test.info().project.use.baseURL).origin;

test.use({ timezoneId: TIMEZONE, storageState: NO_CHOICE });

/**
 * Open the home and wait until the visual is there.
 * @param {import('@playwright/test').Page} page
 * @param {string} [path]
 * @param {{ time?: string }} [options] time: the clock (hh:mm, Madrid)
 */
async function open(page, path = '/', { time } = {}) {
  if (time) await atTime(page, time);
  await page.goto(path);
  await expect(page.locator('home-light .home-light__line')).toBeVisible();
  await expect(page.locator('home-light').locator('home-globe').filter({ visible: true })).toHaveCount(1);
}

/**
 * A test of state (the light, the mode, what is stored) is not about the
 * motion of the globe, so it asks for the system's reduced motion, which
 * stops the globe's frame loop (RL-8). A frame of the globe costs the main
 * thread tens of milliseconds in software rendering; on a loaded runner the
 * loop leaves every round trip into the page seconds long, and a test of
 * thirty of them runs past its 30 s.
 * @param {import('@playwright/test').Page} page
 */
const still = (page) => page.emulateMedia({ reducedMotion: 'reduce' });

/** How long a test waits for the globe to have asked for 10 frames: a count it reaches in a second or two on an idle machine, and in seconds more on a loaded one. Half of the test's 30 s. */
const FRAMES_WITHIN = 15_000;

/** The state of the page the light reads and writes. */
const html = (page) =>
  page.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
    light: document.documentElement.getAttribute('data-light'),
    sunX: document.documentElement.style.getPropertyValue('--sun-x').trim(),
    sunAlt: document.documentElement.style.getPropertyValue('--sun-alt').trim(),
  }));
const openBar = async (page) => {
  const bar = page.locator('home-light .home-light__bar');
  if (!(await bar.isVisible())) await page.locator('home-light .home-light__line').click();
  await expect(bar).toBeVisible();
};
const slider = (page) => page.locator('home-light input[type="range"]');
/** Scrub the day to `hh:mm`. */
const scrub = async (page, hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  await openBar(page);
  await slider(page).fill(String(h * 60 + m));
};
/** Choose a mode in the footer's <luz-color-mode>, as a click on its radio does. */
const chooseMode = (page, value) => page.locator(`luz-color-mode input[value="${value}"]`).evaluate((input) => /** @type {HTMLInputElement} */ (input).click());
/** The hours <luz-color-mode>.preview() was given, in order. */
const spyPreview = (page) =>
  page.evaluate(() => {
    const mode = /** @type {any} */ (document.querySelector('luz-color-mode'));
    const calls = [];
    const original = mode.preview;
    mode.preview = function (x) {
      calls.push(x);
      return original.call(this, x);
    };
    /** @type {any} */ (window).__previews = calls;
  });
const previews = (page) => page.evaluate(() => /** @type {any} */ (window).__previews);

/** The files the page asks for under apps/landing/light/ (their names without .js). */
function trackChunks(page) {
  const seen = [];
  page.on('request', (request) => {
    const match = new URL(request.url()).pathname.match(/^\/apps\/landing\/light\/([\w-]+)\.js$/);
    if (match) seen.push(match[1]);
  });
  return seen;
}

/* ---- Without JavaScript ------------------------------------------------- */

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  for (const [route] of ROUTES) {
    test(`${route}: the hero is complete, and the light section is an empty element with a heading`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('.luz-hero h1')).toBeVisible();
      await expect(page.locator('.luz-hero .luz-hero__lead')).toBeVisible();
      await expect(page.locator('.luz-hero a.luz-btn')).toHaveCount(3);
      const light = page.locator('section#light');
      await expect(light).toHaveCount(1);
      await expect(light.locator('h2')).toHaveText(/\S/);
      await expect(light.locator('home-light')).toHaveCount(1);
      expect(await light.locator('home-light').evaluate((el) => ({ children: el.childElementCount, text: (el.textContent ?? '').trim() }))).toEqual({ children: 0, text: '' });
    });

    test(`${route}: light.css reserves the height of the visual, so it does not jump in`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(route);
      await expect(page.locator('home-light')).toHaveCount(1);
      const box = await page.locator('home-light').boundingBox();
      expect(box?.height ?? 0).toBeGreaterThan(200);
      await page.setViewportSize({ width: 320, height: 800 });
      expect((await page.locator('home-light').boundingBox())?.height ?? 0).toBeGreaterThan(150);
    });
  }

  test('no script, no stylesheet other than the page\'s: light.css loads, and no light.js request is made', async ({ page }) => {
    const requests = [];
    page.on('request', (r) => requests.push(new URL(r.url()).pathname));
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(requests).toContain('/apps/landing/light/light.css');
    expect(requests.filter((p) => p.endsWith('.js'))).toEqual([]);
  });
});

/* ---- With JavaScript ---------------------------------------------------- */

test.describe('with JavaScript', () => {
  test.beforeEach(() => {
    test.skip(jsOff(), 'needs JavaScript');
  });

  /* -- No errors, no third party ----------------------------------------- */

  for (const [route] of ROUTES) {
    for (const query of ['', '?look=city']) {
      test(`${route}${query}: no page error, no failed request, nothing from another origin`, async ({ page }) => {
        const problems = [];
        const foreign = [];
        page.on('pageerror', (e) => problems.push(e.message));
        page.on('response', (r) => {
          if (r.status() >= 400) problems.push(`${r.status()} ${r.url()}`);
        });
        const own = origin();
        page.on('request', (r) => {
          if (new URL(r.url()).origin !== own && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) foreign.push(r.url());
        });
        await open(page, route + query);
        await page.waitForLoadState('networkidle');
        await openBar(page);
        await scrub(page, '03:00');
        await scrub(page, '15:00');
        expect(problems).toEqual([]);
        expect(foreign).toEqual([]);
      });
    }
  }

  /* -- The page reads the light ------------------------------------------ */

  test('writes --sun-x, --sun-alt on <html>; the sun moves from the east side to the west side over the day', async ({ page }) => {
    await open(page, '/', { time: '14:00' });
    await scrub(page, '07:30');
    await expect.poll(async () => (await html(page)).sunX).toMatch(/^\d+(\.\d+)?%$/);
    const morning = await html(page);
    await scrub(page, '19:30');
    await expect.poll(async () => (await html(page)).sunX).not.toBe(morning.sunX);
    const evening = await html(page);
    expect(parseFloat(morning.sunX), 'the morning sun is on the right of the centre (east)').toBeGreaterThan(50);
    expect(parseFloat(evening.sunX), 'the evening sun is on the left of the centre (west)').toBeLessThan(50);
    expect(parseFloat(morning.sunAlt)).not.toBe(parseFloat(evening.sunAlt));
    expect(await page.evaluate(() => document.documentElement.style.getPropertyValue('--day-left'))).toMatch(/%$/);
  });

  test('--sun-x follows the globe\'s own sun', async ({ page }) => {
    await open(page, '/', { time: '14:00' });
    await expect.poll(async () => (await html(page)).sunX).toMatch(/^\d+(\.\d+)?%$/);
  });

  /* -- The slider and Live call <luz-color-mode>.preview() --------------------- */

  test('in Auto the slider scrubs the page: data-light and data-theme follow the hour, and closing the bar keeps the hour it was let go at', async ({ page }) => {
    await still(page);
    await open(page, '/', { time: '14:00' });
    await expect.poll(async () => (await html(page)).light).toBe('afternoon');
    expect((await html(page)).theme).toBe('light');
    await spyPreview(page);

    await scrub(page, '23:30');
    await expect.poll(async () => (await html(page)).light).toBe('night');
    expect((await html(page)).theme).toBe('dark');
    await scrub(page, '06:00');
    await expect.poll(async () => (await html(page)).light).toBe('dawn');
    expect((await html(page)).theme).toBe('dark');
    await scrub(page, '09:30');
    await expect.poll(async () => (await html(page)).light).toBe('morning');
    expect((await html(page)).theme).toBe('light');

    // <luz-color-mode> was asked, with an hour from 0 to 24
    const hours = await previews(page);
    expect(hours.length).toBeGreaterThan(0);
    expect(hours.every((h) => typeof h === 'number' && h >= 0 && h <= 24)).toBe(true);
    expect(Math.abs(hours.at(-1) - 9.5)).toBeLessThan(0.02);

    // No Back to now button: letting the slider go pinned its hour (2026-10-18), and closing the bar keeps it
    await expect(page.locator('home-light .home-light__live')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    expect(await html(page)).toMatchObject({ light: 'morning', theme: 'light' });
  });

  test('after a mode chosen in the footer, moving the slider gives the hour back the lead: its light and its mode (the last touched wins)', async ({ page }) => {
    await still(page);
    await open(page, '/', { time: '14:00' });
    await chooseMode(page, 'dark');
    await expect.poll(async () => (await html(page)).theme).toBe('dark');
    await expect.poll(async () => (await html(page)).light).toBe('night');

    await scrub(page, '09:30');
    await expect.poll(async () => (await html(page)).light).toBe('morning');
    expect((await html(page)).theme, 'the hour leads again').toBe('light');
    await scrub(page, '19:00');
    await expect.poll(async () => (await html(page)).light).toBe('sunset');
    expect((await html(page)).theme).toBe('light');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    expect(await html(page)).toMatchObject({ light: 'sunset', theme: 'light' });
  });

  test('the slider is a keyboard control named from the catalog, and its value text says the hour', async ({ page }) => {
    await page.setViewportSize(NARROW);
    await open(page, '/', { time: '14:00' });
    await openBar(page);
    const range = page.getByRole('slider', { name: text('en', 'Scrub the day') });
    await expect(range).toHaveCount(1);
    await range.focus();
    await page.keyboard.press('End');
    await expect.poll(async () => (await html(page)).light).toBe('night');
    await expect(range).toHaveAttribute('aria-valuetext', /23:59$/);
    await page.keyboard.press('Home');
    await expect(range).toHaveAttribute('aria-valuetext', /00:00$/);
    await page.keyboard.press('Escape');
    await expect(page.locator('home-light .home-light__bar')).toBeHidden();
  });

  test('the button under the visual opens and closes the bar, and says so by aria-expanded', async ({ page }) => {
    await page.setViewportSize(NARROW);
    await open(page);
    const line = page.locator('home-light .home-light__line');
    await expect(line).toHaveAttribute('aria-expanded', 'false');
    await expect(line).toHaveAccessibleName(new RegExp(text('en', 'Show the light bar').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    await line.click();
    await expect(line).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('home-light .home-light__bar')).toBeVisible();
    await line.click();
    await expect(line).toHaveAttribute('aria-expanded', 'false');
  });

  test('from 1024px with a pointer that hovers the bar is always open: after load, Escape and a click on the line, resting at 70% and whole under the pointer', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await open(page);
    const line = page.locator('home-light .home-light__line');
    const bar = page.locator('home-light .home-light__bar');
    const opacity = () => bar.evaluate((el) => parseFloat(getComputedStyle(el).opacity));
    await expect(bar).toBeVisible();
    await expect(line).toHaveAttribute('aria-expanded', 'true');
    // Nothing closes it here: not Escape, not the line, not a click elsewhere
    await page.keyboard.press('Escape');
    await line.click();
    await page.mouse.click(5, 400);
    await expect(bar).toBeVisible();
    await expect(line).toHaveAttribute('aria-expanded', 'true');
    // At rest it is at 70% (the least that keeps its text readable over the sky and the globe), and the pointer or the focus brings it up whole
    await page.mouse.move(5, 5);
    await expect.poll(opacity).toBe(0.7);
    const box = /** @type {{ x: number, y: number, width: number, height: number }} */ (await bar.boundingBox());
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect.poll(opacity).toBe(1);
    await page.mouse.move(5, 5);
    await expect.poll(opacity).toBe(0.7);
    await slider(page).focus();
    await expect.poll(opacity).toBe(1);
  });

  test('narrowing the window below 1024px closes the bar, and widening it opens it again', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await open(page);
    const bar = page.locator('home-light .home-light__bar');
    await expect(bar).toBeVisible();
    await page.setViewportSize(NARROW);
    await expect(bar).toBeHidden();
    await expect(page.locator('home-light .home-light__line')).toHaveAttribute('aria-expanded', 'false');
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(bar).toBeVisible();
  });

  /* -- <luz-color-mode> is the only writer ------------------------------------- */

  test('without <luz-color-mode> the visuals follow the slider and nothing writes data-theme or data-light', async ({ page }) => {
    // The module that defines <luz-color-mode> is replaced by an empty one: the page has the element, nobody upgrades it
    for (const file of ['color-mode.js', 'color-mode.min.js']) {
      await page.route(`**/packages/catalog/dist/${file}`, (route) => route.fulfill({ contentType: 'text/javascript', body: 'export {};' }));
    }
    await open(page, '/', { time: '14:00' });
    expect(await page.evaluate(() => !!customElements.get('luz-color-mode'))).toBe(false);
    const before = await html(page);
    // From here on every write of the two attributes is recorded; the boot script ran before
    await page.evaluate(() => {
      const writes = [];
      /** @type {any} */ (window).__writes = writes;
      new MutationObserver((records) => {
        for (const r of records) writes.push({ name: r.attributeName, from: r.oldValue, to: document.documentElement.getAttribute(r.attributeName ?? '') });
      }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-light'], attributeOldValue: true });
    });
    await scrub(page, '03:00');
    await expect.poll(async () => (await html(page)).sunAlt).not.toBe(before.sunAlt);
    const night = await html(page);
    await scrub(page, '13:00');
    await expect.poll(async () => (await html(page)).sunAlt).not.toBe(night.sunAlt);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(2500); // two ticks of the controller
    expect(await page.evaluate(() => /** @type {any} */ (window).__writes)).toEqual([]);
    expect(await html(page)).toMatchObject({ theme: before.theme, light: before.light });
  });

  /* -- One look: the puzzle globe ------------------------------------------ */

  test('the bar has no look buttons: there is one look and nothing to choose', async ({ page }) => {
    await open(page);
    await openBar(page);
    await expect(page.locator('[data-look]')).toHaveCount(0);
    await expect(page.locator('home-light .home-light__group')).toHaveCount(0);
    await expect(page.locator('home-city, home-map')).toHaveCount(0);
  });

  test('the city and the map are gone: only light.js, globe.js and globe-data.js are ever requested from apps/landing/light/', async ({ page }) => {
    const chunks = trackChunks(page);
    await open(page);
    await expect(page.locator('home-globe[land]')).toHaveCount(1, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    expect(chunks).not.toContain('city');
    expect(chunks).not.toContain('map');
    expect(chunks).not.toContain('puzzle');
    expect([...new Set(chunks)].sort()).toEqual(['globe', 'globe-data', 'light']);
  });

  test('globe-data.js is requested once, and after it the globe carries the attribute land and its pieces have a shape', async ({ page }) => {
    const chunks = trackChunks(page);
    await open(page);
    await expect(page.locator('home-globe[land]')).toHaveCount(1, { timeout: 15000 });
    const pieces = page.locator('home-globe path.home-globe__piece');
    expect(await pieces.count(), 'a path.home-globe__piece for the countries').toBeGreaterThan(0);
    const shapes = await pieces.evaluateAll((paths) => paths.map((path) => path.getAttribute('d') ?? ''));
    expect(shapes.some((d) => d.trim().length > 0), 'at least one piece has a non-empty d').toBe(true);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    expect(chunks.filter((c) => c === 'globe-data'), 'globe-data.js requested once').toHaveLength(1);
    expect(chunks.filter((c) => c === 'globe')).toHaveLength(1);
  });

  test('until the data has arrived the globe is drawn without land, and has no land attribute; when it comes the land appears', async ({ page }) => {
    let release = () => {};
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    await page.route('**/apps/landing/light/globe-data.js', async (route) => {
      await gate;
      await route.continue();
    });
    const asked = page.waitForRequest('**/apps/landing/light/globe-data.js', { timeout: 15000 });
    await open(page);
    await asked; // the data is asked for once the globe is on screen and the browser is idle
    const globe = page.locator('home-globe');
    await expect(globe).toBeVisible();
    await expect(globe).not.toHaveAttribute('land', /.*/);
    await expect(globe.locator('.home-globe__sea')).toHaveCount(1);
    const drawn = () => globe.locator('path.home-globe__piece').evaluateAll((paths) => paths.map((path) => path.getAttribute('d') ?? '').filter((d) => d.trim()));
    expect(await drawn(), 'no piece of land yet').toEqual([]);
    release();
    await expect(globe).toHaveAttribute('land', /.*/, { timeout: 15000 });
    expect((await drawn()).length, 'land is drawn').toBeGreaterThan(0);
  });

  test('the land is loaded even when the browser asks to save data (Save-Data, by the owner\'s decision)', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true, effectiveType: '2g', addEventListener() {}, removeEventListener() {} } });
    });
    await page.route('**/*', (route) => route.continue({ headers: { ...route.request().headers(), 'save-data': 'on' } }));
    const chunks = trackChunks(page);
    await open(page);
    await expect(page.locator('home-globe[land]')).toHaveCount(1, { timeout: 15000 });
    expect(chunks).toContain('globe-data');
  });

  test('?look=city is ignored: the globe is shown, whatever the parameter says', async ({ page }) => {
    const chunks = trackChunks(page);
    await open(page, '/?look=city');
    await expect(page.locator('home-globe')).toBeVisible();
    await expect(page.locator('home-city, home-map')).toHaveCount(0);
    await expect(page.locator('home-light')).not.toHaveAttribute('look', /.*/);
    expect(chunks).not.toContain('city');
  });

  test('nothing is remembered: a load and a scrub write no luz-home-light key', async ({ page }) => {
    await open(page);
    await page.waitForLoadState('networkidle');
    await scrub(page, '10:00');
    expect(await page.evaluate(() => localStorage.getItem('luz-home-light'))).toBeNull();
    expect(await page.evaluate(() => localStorage.getItem('luz-theme'))).toBeNull();
  });

  /* -- Reduced motion ------------------------------------------------------ */

  /** Count the animation frames the light's own files ask for during `ms` (for "none": a window shows an absence). */
  async function framesAsked(page, ms) {
    await framesFrom(page);
    await page.waitForTimeout(ms);
    return framesSoFar(page);
  }
  /** Start counting the frames the light's own files ask for. */
  const framesFrom = (page) =>
    page.evaluate(() => {
      /** @type {any} */ (window).__frames = 0;
    });
  /** The frames counted since `framesFrom`. */
  const framesSoFar = (page) => page.evaluate(() => /** @type {any} */ (window).__frames ?? 0);
  const countFrames = (page) =>
    page.addInitScript(() => {
      const ask = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (callback) => {
        if (/\/apps\/landing\/light\//.test(new Error().stack ?? '')) /** @type {any} */ (window).__frames = ((/** @type {any} */ (window).__frames) ?? 0) + 1;
        return ask(callback);
      };
    });

  test('reduced motion: the globe asks for no continuous animation frame', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await countFrames(page);
    await open(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    expect(await framesAsked(page, 1500)).toBe(0);
  });

  test('control: with motion welcome the globe does ask for frames (the probe sees them)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await countFrames(page);
    await open(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await framesFrom(page);
    // A count, not a rate: a frame of the globe costs the main thread tens of milliseconds in software rendering, so how many fit in 1.5 s depends on the runner's load
    await expect.poll(() => framesSoFar(page), { message: 'the globe asks for animation frames', timeout: FRAMES_WITHIN }).toBeGreaterThan(10);
  });

  test('reduced motion: the land still comes', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    await expect(page.locator('home-globe[land]')).toHaveCount(1, { timeout: 15000 });
  });

  /* -- Texts from the catalog ----------------------------------------------- */

  for (const [route, lang] of ROUTES) {
    test(`${route}: the phrase under the visual and the names in the bar are the catalog's (${lang})`, async ({ page }) => {
      await page.addInitScript(() => { Math.random = () => 0; });
      await open(page, route);
      await expect(page.locator('home-light .home-light__q')).toHaveText(catalog(lang)['light.fact.1']);
      await openBar(page);
      await scrub(page, '10:00');
      await expect(page.getByRole('slider', { name: text(lang, 'Scrub the day') })).toHaveCount(1);
      await expect(page.locator('home-light .home-light__line')).toHaveAccessibleName(new RegExp(text(lang, 'Show the light bar').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    });
  }

  /* -- The favicon ------------------------------------------------------------ */

  test('favicon: the page\'s icon becomes a data: SVG of the sun and the moon', async ({ page }) => {
    await open(page);
    await expect
      .poll(() => page.evaluate(() => [...document.querySelectorAll('link[rel~="icon"]')].some((link) => /** @type {HTMLLinkElement} */ (link).href.startsWith('data:image/svg+xml'))), { timeout: 8000 })
      .toBe(true);
  });

  /* -- Layout ----------------------------------------------------------------- */

  for (const [route, lang] of [['/', 'en'], ['/ar/', 'ar']]) {
    test(`320 px: no horizontal scroll (${lang}), the bar closed and open`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await open(page, route);
      const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(await overflow()).toBeLessThanOrEqual(1);
      await openBar(page);
      expect(await overflow()).toBeLessThanOrEqual(1);
      const bar = await page.locator('home-light .home-light__bar').boundingBox();
      expect((bar?.x ?? 0) + (bar?.width ?? 0)).toBeLessThanOrEqual(321);
      expect(bar?.x ?? 0).toBeGreaterThanOrEqual(-1);
    });
  }

  for (const [width, height] of [[1280, 800], [375, 800]]) {
    test(`no layout shift at ${width} px: the hero and the light section are where JavaScript off puts them`, async ({ page, browser }) => {
      await page.setViewportSize({ width, height });
      await open(page, '/', { time: '14:00' });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(800);
      const boxes = (/** @type {import('@playwright/test').Page} */ p) =>
        p.evaluate(() => {
          const box = (/** @type {string} */ selector) => {
            const r = document.querySelector(selector)?.getBoundingClientRect();
            return r ? { top: Math.round(r.top + window.scrollY), height: Math.round(r.height), width: Math.round(r.width) } : null;
          };
          return { hero: box('.luz-hero'), light: box('section#light'), element: box('home-light') };
        });
      const withScript = await boxes(page);

      const bare = await browser.newContext({ javaScriptEnabled: false, viewport: { width, height }, timezoneId: TIMEZONE });
      const off = await bare.newPage();
      await off.goto('/');
      const withoutScript = await boxes(off);
      await bare.close();

      expect(withScript.light, 'section#light exists').not.toBeNull();
      expect(withoutScript.light, 'section#light exists without JavaScript').not.toBeNull();
      for (const part of ['hero', 'light', 'element']) {
        expect(Math.abs(withScript[part].top - withoutScript[part].top), `${part} top`).toBeLessThanOrEqual(1);
        expect(Math.abs(withScript[part].height - withoutScript[part].height), `${part} height`).toBeLessThanOrEqual(1);
        expect(Math.abs(withScript[part].width - withoutScript[part].width), `${part} width`).toBeLessThanOrEqual(1);
      }
    });
  }

  /* -- axe under the six lights ------------------------------------------------ */

  const BLOCKING = ['serious', 'critical'];
  const violations = async (page) => {
    const { violations: found } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    return found.filter((v) => BLOCKING.includes(v.impact ?? '')).map((v) => `${v.impact} ${v.id}: ${v.nodes.length} node(s) - ${v.nodes[0]?.target?.join(' ')}`);
  };

  for (const [light, time, mode] of LIGHTS) {
    test(`axe: / in the ${light} light (${time}, ${mode}), the land drawn`, async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Chromium only');
      await open(page, '/', { time });
      await expect.poll(() => page.evaluate(() => document.documentElement.dataset.light)).toBe(light);
      expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(mode);
      await expect(page.locator('home-globe[land]')).toHaveCount(1, { timeout: 15000 });
      await page.waitForLoadState('networkidle');
      await faded(page);
      expect(await violations(page), 'serious/critical axe violations').toEqual([]);
    });

    test(`axe: / with the bar open in the ${light} light (${time})`, async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Chromium only');
      await open(page, '/', { time });
      await expect.poll(() => page.evaluate(() => document.documentElement.dataset.light)).toBe(light);
      await page.waitForLoadState('networkidle');
      await openBar(page);
      await faded(page);
      expect(await violations(page), 'serious/critical axe violations').toEqual([]);
    });
  }

  for (const [route] of ROUTES.slice(1)) {
    test(`axe: ${route} with the bar open`, async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Chromium only');
      await open(page, route, { time: '14:00' });
      await openBar(page);
      await faded(page);
      expect(await violations(page), 'serious/critical axe violations').toEqual([]);
    });
  }
});

/* ---- Review fixes (F3, review of 2026-10-16) ------------------------------ */

test.describe('review fixes', () => {
  test.beforeEach(() => {
    test.skip(jsOff(), 'needs JavaScript');
  });

  const line = (page) => page.locator('home-light .home-light__line');
  const output = (page) => page.locator('home-light output');

  /** The text of the line a reader sees: text nodes with a box, not the screen-reader-only ones (1 px, clipped). */
  const visibleText = (locator) =>
    locator.evaluate((el) => {
      const out = [];
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const parent = node.parentElement;
        if (!parent) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        const box = range.getBoundingClientRect();
        const style = getComputedStyle(parent);
        if (box.width > 2 && box.height > 2 && style.visibility !== 'hidden' && style.clipPath === 'none') out.push(node.textContent);
      }
      return out.join('');
    });

  /* -- 1. Tab order -------------------------------------------------------- */

  test('after opening the bar from the line, the next Tab lands inside the bar, and the bar is still drawn above the line', async ({ page }) => {
    await open(page);
    await line(page).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('home-light .home-light__bar')).toBeVisible();
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('home-light .home-light__bar')), 'focus is inside the bar').toBe(true);
    // Both boxes in one frame: the page scrolls smoothly to the focused control, so two reads apart would race it
    const [bar, under] = await page.evaluate(() => [document.querySelector('home-light .home-light__bar'), document.querySelector('home-light .home-light__line')].map((el) => el?.getBoundingClientRect().y ?? NaN));
    expect(bar, 'the bar is above the line').toBeLessThan(under);
  });

  /* -- 2. aria-valuetext --------------------------------------------------- */

  for (const [route, lang] of ROUTES) {
    test(`${route}: the slider's aria-valuetext is the phase name and the hour, joined by the catalog's separator (${lang})`, async ({ page }) => {
      const cat = catalog(lang);
      expect(typeof cat['light.sep'], 'light.sep is a key of the catalog').toBe('string');
      await open(page, route, { time: '14:00' });
      await scrub(page, '09:30');
      await expect.poll(async () => (await html(page)).light).toBe('morning');
      // The hour is not shown in the bar any more (the owner's cut, 2026-10-17): the slider still says it
      const prefix = `${cat['light.morning']}${cat['light.sep']}`;
      await expect.poll(async () => (await slider(page).getAttribute('aria-valuetext')) ?? '').toMatch(/[0-9\u0660-\u0669]{2}\D[0-9\u0660-\u0669]{2}$/);
      const expected = (await slider(page).getAttribute('aria-valuetext')) ?? '';
      expect(expected.startsWith(prefix), `"${expected}" starts with "${prefix}"`).toBe(true);
      if (lang === 'en') expect(expected).toBe('Morning light, 09:30');
      if (lang === 'ar') {
        const valuetext = (await slider(page).getAttribute('aria-valuetext')) ?? '';
        expect(valuetext).toContain('\u060C');
        expect(valuetext).not.toContain(', ');
      }
    });
  }

  /* -- 3. No <output>; the one live region is the passing "Saved" notice ------------ */

  test('the bar has no <output>, and its one live region is the Saved notice, a status', async ({ page }) => {
    await open(page, '/', { time: '14:00' });
    await openBar(page);
    await expect(output(page)).toHaveCount(0);
    await slider(page).fill('600');
    const live = await page.locator('home-light').evaluate((el) => [...el.querySelectorAll('[role="status"], [role="alert"], [role="log"], [aria-live]:not([aria-live="off"])')].map((n) => `${n.getAttribute('role')} ${n.className}`));
    expect(live).toEqual(['status home-light__saved']);
  });

  /* -- 4. Forced colours ------------------------------------------------------- */

  test('forced colors: the slider track has a background colour of its own', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await open(page, '/', { time: '14:00' });
    await openBar(page);
    await faded(page);
    const clear = (colour) => /^(transparent|rgba\(.*,\s*0\))$/.test(colour);
    const track = await slider(page).evaluate((input) => getComputedStyle(input, '::-webkit-slider-runnable-track').backgroundColor);
    expect(clear(track), `the track is drawn in a colour of the system, not "${track}"`).toBe(false);
  });

  /* -- 5. The globe is an image, not a control ---------------------------------- */

  test('the globe is not focusable, and its name does not talk about arrow keys', async ({ page }) => {
    await open(page);
    const globe = page.locator('home-globe');
    expect(await globe.evaluate((el) => ({ attribute: el.hasAttribute('tabindex'), index: /** @type {HTMLElement} */ (el).tabIndex }))).toEqual({ attribute: false, index: -1 });
    await globe.evaluate((el) => /** @type {HTMLElement} */ (el).focus());
    expect(await page.evaluate(() => document.activeElement?.tagName.toLowerCase())).not.toBe('home-globe');
    const name = (await globe.getAttribute('aria-label')) ?? '';
    expect(name.length).toBeGreaterThan(0);
    expect(name).not.toMatch(/arrow/i);
  });

  test('dragging the globe with the pointer still turns it', async ({ page }) => {
    await open(page);
    const globe = page.locator('home-globe');
    await expect(globe).toHaveAttribute('land', /.*/, { timeout: 15000 });
    const dots = () => globe.evaluate((el) => [...el.querySelectorAll('path.home-globe__piece')].map((p) => p.getAttribute('d')).join('|'));
    const before = await dots();
    expect(before.replace(/\|/g, ''), 'the pieces are drawn before the drag').not.toBe('');
    const box = await globe.boundingBox();
    const x = (box?.x ?? 0) + (box?.width ?? 0) / 2;
    const y = (box?.y ?? 0) + (box?.height ?? 0) / 3;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 60, y, { steps: 6 });
    await page.mouse.move(x + 120, y + 10, { steps: 6 });
    await page.mouse.up();
    await expect.poll(dots).not.toBe(before);
  });

  /* -- 6. The line shows the phrase only: no light's name, no hour (the owner's cut, 2026-10-17) -- */

  for (const [route, lang] of ROUTES) {
    test(`${route}: the line's visible text is one of the nine facts, with no light's name and no hour (${lang})`, async ({ page }) => {
      const cat = catalog(lang);
      const facts = Array.from({ length: 9 }, (_, i) => cat[`light.fact.${i + 1}`]);
      const phases = ['dawn', 'morning', 'afternoon', 'sunset', 'dusk', 'night'].map((phase) => cat[`light.${phase}`]);
      await open(page, route, { time: '14:00' });
      const shown = await visibleText(line(page));
      const fact = facts.find((f) => shown.includes(f));
      expect(fact, 'one of the facts of the page\'s language').toBeDefined();
      const rest = shown.replace(fact ?? '', '');
      expect(phases.filter((name) => rest.includes(name)), 'no light name on the line').toEqual([]);
      expect(rest, 'no hour on the line').not.toMatch(/[0-9\u0660-\u0669]{1,2}\D[0-9\u0660-\u0669]{2}/);
    });

    test(`${route}: each load picks one of the nine facts at random, in ${lang}: the first, the last and one between`, async ({ page }) => {
      const cat = catalog(lang);
      for (const [random, n] of [[0, 1], [0.5, 5], [0.999, 9]]) {
        await page.addInitScript((r) => { Math.random = () => r; }, random);
        await open(page, route, { time: '14:00' });
        expect(await visibleText(line(page)), `Math.random() = ${random}`).toContain(cat[`light.fact.${n}`]);
      }
    });
  }

  /* -- 6b. The globe rises behind the hero: its top edge is above the buttons, which stay on top (the owner's sketch, 2026-10-17; the edge rose higher with the home's redesign) -- */

  for (const width of [375, 1024, 1440]) {
    test(`${width} px: the globe's top edge is behind the hero's text, above its buttons, which stay on top and can be clicked`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await open(page, '/');
      // WebKit's classic scrollbar (4 px) is taken out of the width a media query sees, so 1024 would be under the layout of 1024: widen the window by it and load again (0 in Chromium and Firefox)
      const bar = await page.evaluate(() => window.innerWidth - document.documentElement.clientWidth);
      if (bar > 0) {
        await page.setViewportSize({ width: width + bar, height: 900 });
        await open(page, '/');
      }
      await expect(page.locator('home-globe[land]')).toHaveCount(1);
      const m = await page.evaluate(() => {
        const buttons = [...document.querySelectorAll('#hero .luz-btn')];
        const low = buttons.map((b) => b.getBoundingClientRect()).reduce((a, r) => (r.bottom > a.bottom ? r : a));
        const rim = document.querySelector('home-globe .home-globe__rim').getBoundingClientRect();
        const hero = document.querySelector('#hero').getBoundingClientRect();
        const onTop = buttons.every((b) => {
          const r = b.getBoundingClientRect();
          return b.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
        });
        return { rimTop: rim.top, heroTop: hero.top, top: low.top, onTop };
      });
      // The edge is inside the hero (behind its sentence or its description) and higher than the buttons
      expect(m.rimTop, "the globe's top edge is above the lowest button's top").toBeLessThan(m.top);
      expect(m.rimTop, "the globe's top edge is not above the hero").toBeGreaterThan(m.heroTop);
      expect(m.onTop, 'each button is the element at its centre').toBe(true);
    });
  }

  test('the line has no mark under the phrase: the phrase alone opens the bar', async ({ page }) => {
    await page.setViewportSize(NARROW);
    await open(page, '/');
    await expect(line(page).locator('svg, .home-light__mark')).toHaveCount(0);
    await expect(line(page)).toHaveAttribute('aria-expanded', 'false');
  });

  /* -- 6c. The slider's thumb is a sun by day and a moon by night -------------- */

  test("the slider's thumb is a sun while the scrubbed hour is day, a moon while it is night", async ({ page }) => {
    await open(page, '/', { time: '14:00' });
    await openBar(page);
    await scrub(page, '12:00');
    await expect(page.locator('home-light')).toHaveAttribute('data-sky', 'day');
    await scrub(page, '23:30');
    await expect(page.locator('home-light')).toHaveAttribute('data-sky', 'night');
    // Chromium's getComputedStyle does not reach the thumb: read the rules that draw it
    const rules = await page.evaluate(() => {
      const all = [...document.styleSheets].flatMap((sheet) => {
        try {
          return [...sheet.cssRules];
        } catch {
          return [];
        }
      });
      const thumb = all.filter((r) => r.selectorText?.includes('::-webkit-slider-thumb') && r.selectorText.includes('home-light'));
      const night = thumb.find((r) => r.selectorText.includes('[data-sky="night"]'));
      const day = thumb.find((r) => !r.selectorText.includes('[data-sky'));
      return { day: day?.style.background || day?.style.backgroundColor || '', night: night?.style.background || night?.style.backgroundColor || '' };
    });
    expect(rules.night, 'a rule draws the thumb at night').not.toBe('');
    expect(rules.night, 'the night thumb is not the day thumb').not.toBe(rules.day);
  });

  /* -- 6d. The phrase sits 10 px lower than the light's box ---------------------- */

  test('the line sits 10 px below the bottom of the light', async ({ page }) => {
    await open(page, '/');
    const d = await page.evaluate(() => document.querySelector('home-light .home-light__line').getBoundingClientRect().bottom - document.querySelector('home-light').getBoundingClientRect().bottom);
    expect(Math.abs(d - 10), `the line's bottom is ${d}px below the light's`).toBeLessThanOrEqual(1);
  });

  /* -- 7. No Back to now: closing the bar keeps the hour the slider was let go at (2026-10-18) -- */

  test('the bar has no Back to now button, and clicking the line to close it keeps the hour the slider pinned', async ({ page }) => {
    await page.setViewportSize(NARROW);
    await open(page, '/', { time: '14:00' });
    await openBar(page);
    await expect(page.locator('home-light .home-light__live')).toHaveCount(0);
    await scrub(page, '23:30');
    await expect.poll(async () => (await html(page)).light).toBe('night');
    await line(page).click();
    await expect(line(page)).toHaveAttribute('aria-expanded', 'false');
    await page.waitForTimeout(300);
    expect((await html(page)).light).toBe('night');
  });

  /* -- 7b. The line spans the whole width; the bar is plain glass --------------------- */

  /** The alpha of a computed colour: `rgba(r, g, b, a)`, `rgb(...)` (1) or `oklab(l a b / a)`. */
  const alphaOf = (css) => {
    const slash = css.match(/\/\s*([\d.]+%?)\s*\)$/);
    if (slash) return slash[1].endsWith('%') ? parseFloat(slash[1]) / 100 : parseFloat(slash[1]);
    const rgba = css.match(/^rgba\(([^)]+)\)$/);
    return rgba ? parseFloat(rgba[1].split(',')[3]) : 1;
  };

  test('the line spans the width of the light, on glass of its own', async ({ page }) => {
    await open(page, '/');
    await openBar(page);
    const m = await page.evaluate(() => {
      const light = document.querySelector('home-light').getBoundingClientRect();
      const lineEl = document.querySelector('home-light .home-light__line');
      const ls = getComputedStyle(lineEl);
      return { light: light.width, line: lineEl.getBoundingClientRect().width, lineBlur: ls.backdropFilter, lineBg: ls.backgroundColor };
    });
    expect(m.line, 'the line is as wide as the light').toBeGreaterThanOrEqual(m.light - 1);
    expect(m.lineBlur, 'the line blurs what is behind it').toMatch(/blur\(/);
    expect(alphaOf(m.lineBg), 'the line is translucent glass').toBeGreaterThan(0);
    expect(alphaOf(m.lineBg)).toBeLessThan(1);
  });

  test("the bar has no visible border (a 1px transparent one) and no glass: no background and no blur, its text sits straight on the sky", async ({ page }) => {
    await open(page, '/');
    await openBar(page);
    const m = await page.evaluate(() => {
      const s = getComputedStyle(document.querySelector('home-light .home-light__bar'));
      return { width: s.borderTopWidth, style: s.borderTopStyle, color: s.borderTopColor, bg: s.backgroundColor, blur: s.backdropFilter };
    });
    // A border that is there but cannot be seen: forced colours draws it as the bar's edge
    expect(m.width).toBe('1px');
    expect(m.style).not.toBe('none');
    expect(alphaOf(m.color), 'the border colour is transparent').toBe(0);
    expect(alphaOf(m.bg), 'the bar has no background of its own').toBe(0);
    expect(m.blur, 'the bar blurs nothing').toBe('none');
  });

  test("while the line is expanded the globe's mask fades later, and it comes back when the line is closed", async ({ page }) => {
    await page.setViewportSize(NARROW);
    await open(page, '/');
    // Where, in percent of the globe's height, the mask has fallen to half: read from the computed gradient
    const half = () =>
      page.evaluate(() => {
        const g = getComputedStyle(document.querySelector('home-light .home-light__stage > home-globe'));
        const stops = [...(g.maskImage || g.webkitMaskImage).matchAll(/rgba?\(([^)]*)\)\s*([\d.]+)%/g)].map((m) => {
          const c = m[1].split(',').map(Number);
          return { alpha: c[3] ?? 1, at: parseFloat(m[2]) };
        });
        for (let i = 1; i < stops.length; i++) {
          if (stops[i].alpha <= 0.5 && stops[i - 1].alpha > 0.5) {
            const [p, q] = [stops[i - 1], stops[i]];
            return p.at + ((p.alpha - 0.5) / (p.alpha - q.alpha)) * (q.at - p.at);
          }
        }
        return null;
      });
    const closed = await half();
    expect(closed, 'the globe fades out').not.toBeNull();
    await openBar(page);
    await expect.poll(half).toBeGreaterThan(/** @type {number} */ (closed) + 10);
    await line(page).click();
    await expect(line(page)).toHaveAttribute('aria-expanded', 'false');
    await expect.poll(half).toBeCloseTo(/** @type {number} */ (closed), 1);
  });

  test("the globe's sea is opaque: the stars behind the page do not show through the sphere", async ({ page }) => {
    await open(page, '/');
    const fill = await page.evaluate(() => getComputedStyle(document.querySelector('home-globe .home-globe__sea')).fill);
    expect(fill).not.toBe('none');
    expect(alphaOf(fill), `the sea's fill (${fill}) has no transparency`).toBe(1);
  });

  /* -- 7c. The sky: stars in the dark lights, nothing in the light ones: by day the page itself is the light (apps/site/sky.css) -- */

  for (const [light, time, mode] of LIGHTS) {
    const dark = ['dawn', 'dusk', 'night'].includes(light);
    test(`${light} (${time}): ${dark ? 'stars on the two layers of the sky' : 'no stars and no clouds: the layers are not drawn'}`, async ({ page }) => {
      await open(page, '/', { time });
      await expect.poll(async () => (await html(page)).light).toBe(light);
      expect(mode).toBe(dark ? 'dark' : 'light');
      // Two layers behind the page's content (main's ::before and ::after)
      await expect
        .poll(() => page.evaluate(() => {
          const main = document.querySelector('main.luz-main');
          return ['::before', '::after'].map((pseudo) => {
            const s = getComputedStyle(main, pseudo);
            return {
              layer: s.display !== 'none' && s.content !== 'none' && s.position === 'fixed' && s.zIndex === '-1' && parseFloat(s.opacity) > 0,
              stars: s.display !== 'none' && /radial-gradient/.test(s.backgroundImage),
              clouds: s.boxShadow !== 'none',
              events: s.pointerEvents,
              twinkle: s.animationName.split(',').some((n) => n.trim() === 'landing-twinkle'),
            };
          });
        }))
        .toEqual([0, 1].map(() => ({ layer: dark, stars: dark, clouds: false, events: 'none', twinkle: dark })));
      // The page's surface comes from <html>: the body (.o-page) paints nothing, so the sky shows behind the content
      const bg = await page.evaluate(() => {
        const b = getComputedStyle(document.body);
        return { body: b.backgroundColor, image: b.backgroundImage, html: getComputedStyle(document.documentElement).backgroundColor };
      });
      expect(alphaOf(bg.body), 'the body has no background of its own').toBe(0);
      expect(bg.image).toBe('none');
      expect(alphaOf(bg.html), 'the surface is on <html>').toBe(1);
    });
  }

  test('the sky drifts with the scroll: slower than the page, the far layer slower still', async ({ page }) => {
    await open(page, '/', { time: '23:30' });
    test.skip(!(await page.evaluate(() => window.CSS.supports('animation-timeline: scroll()'))), 'needs scroll-driven animations (Firefox has none yet: the layers cannot drift without the timeline)');
    // The block offset of each layer's translate (none is 0)
    const ys = () => page.evaluate(() => ['::before', '::after'].map((p) => parseFloat(getComputedStyle(document.querySelector('main.luz-main'), p).translate.split(' ')[1]) || 0));
    expect(await ys(), 'still at the top of the page').toEqual([0, 0]);
    // 'instant': html has scroll-behavior: smooth, and WebKit animates a plain scrollTo
    await page.evaluate(() => window.scrollTo({ top: 300, behavior: 'instant' }));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(300);
    const scrolled = await page.evaluate(() => window.scrollY);
    // The near layer (::before) rises by 0.3 of the scroll, the far one (::after) by 0.15
    await expect.poll(async () => (await ys())[0] / scrolled).toBeCloseTo(-0.3, 1);
    await expect.poll(async () => (await ys())[1] / scrolled).toBeCloseTo(-0.15, 1);
    const [near, far] = await ys();
    expect(near, 'the near layer rises faster than the far one').toBeLessThan(far);
    expect(Math.abs(near), 'but slower than the page').toBeLessThan(scrolled);
  });

  test('the glow of the page rises with the scroll: faint at the top, full at the foot', async ({ page }) => {
    await open(page, '/', { time: '14:00' });
    test.skip(!(await page.evaluate(() => window.CSS.supports('animation-timeline: scroll()'))), 'needs scroll-driven animations (Firefox has none yet: the layers cannot drift without the timeline)');
    const glow = () =>
      page.evaluate(() => {
        const s = getComputedStyle(document.querySelector('.o-page'), '::before');
        return { layer: s.content !== 'none' && s.position === 'fixed' && s.pointerEvents === 'none' && s.zIndex === '-1', image: s.backgroundImage, opacity: parseFloat(s.opacity), y: parseFloat((s.translate.split(' ')[1] ?? '0')) || 0 };
      });
    const top = await glow();
    expect(top.layer, 'the glow is a layer behind the page').toBe(true);
    expect(top.image).toMatch(/gradient/);
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await expect.poll(async () => (await glow()).opacity).toBeGreaterThan(top.opacity + 0.3);
    expect((await glow()).y, 'it has come up from below').toBeLessThan(top.y);
  });

  test('under reduced motion the glow does not move: a still, faint glow', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, '/', { time: '14:00' });
    const read = () => page.evaluate(() => { const s = getComputedStyle(document.querySelector('.o-page'), '::before'); return { glow: s.content !== 'none' && /gradient/.test(s.backgroundImage), opacity: parseFloat(s.opacity), animation: s.animationName }; });
    const top = await read();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(300);
    expect(await read()).toEqual(top);
    expect(top.glow, 'the glow is drawn').toBe(true);
    expect(top.animation).toBe('none');
    expect(top.opacity).toBeGreaterThan(0);
  });

  test('under reduced motion the stars do not drift with the scroll', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, '/', { time: '23:30' });
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForTimeout(300);
    const t = await page.evaluate(() => ['::before', '::after'].map((p) => getComputedStyle(document.querySelector('main.luz-main'), p).translate));
    expect(t).toEqual(['none', 'none']);
  });

  test('under reduced motion the stars are still: no twinkle', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, '/', { time: '23:30' });
    const names = await page.evaluate(() => ['::before', '::after'].map((p) => getComputedStyle(document.querySelector('main.luz-main'), p).animationName));
    expect(names).toEqual(['none', 'none']);
  });

  test('the line fades out at its top and bottom edges, and its text sits where it is opaque', async ({ page }) => {
    await open(page, '/');
    const m = await page.evaluate(() => {
      const lineEl = document.querySelector('home-light .home-light__line');
      const q = document.querySelector('home-light .home-light__q').getBoundingClientRect();
      const r = lineEl.getBoundingClientRect();
      const mask = getComputedStyle(lineEl).maskImage || getComputedStyle(lineEl).webkitMaskImage;
      return { mask, top: (q.top - r.top) / r.height, bottom: (r.bottom - q.bottom) / r.height };
    });
    expect(m.mask).toMatch(/linear-gradient/);
    // The fades take at most the outer quarter on each side; the text is inside the middle
    expect(m.top).toBeGreaterThanOrEqual(0.2);
    expect(m.bottom).toBeGreaterThanOrEqual(0.2);
  });

  /* -- 8. The line is readable over what is behind it ------------------------------- */

  /**
   * The worst contrast of the line's text over the pixels actually drawn behind it:
   * the text is made transparent, the area of the text is photographed, and every
   * pixel is measured against the text colour, the worst one counts. Decoded in a
   * second page, with a canvas.
   */
  async function behindTheLine(page) {
    const target = line(page);
    await target.scrollIntoViewIfNeeded();
    const prepared = await target.evaluate(async (el) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.fillStyle = getComputedStyle(el).color;
      context.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
      const style = document.createElement('style');
      style.id = 'probe-hide-text';
      style.textContent = 'home-light .home-light__line, home-light .home-light__line * { color: transparent !important; text-shadow: none !important; transition: none !important; }';
      document.head.append(style);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        // The screen-reader-only spans are clipped to 1 px, but their text rects are not: they run past the window and widen the clip
        if (node.parentElement?.closest('.home-light__sr')) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const box of range.getClientRects()) {
          if (box.width < 2 || box.height < 2) continue;
          left = Math.min(left, box.left);
          top = Math.min(top, box.top);
          right = Math.max(right, box.right);
          bottom = Math.max(bottom, box.bottom);
        }
      }
      return { text: [r, g, b, a / 255], clip: { x: Math.floor(left), y: Math.floor(top), width: Math.ceil(right - left) + 1, height: Math.ceil(bottom - top) + 1 } };
    });
    let png;
    try {
      png = await page.screenshot({ clip: prepared.clip, animations: 'disabled' });
    } finally {
      await page.evaluate(() => document.getElementById('probe-hide-text')?.remove());
    }
    const reader = await page.context().newPage();
    try {
      await reader.goto('about:blank');
      return await reader.evaluate(
        async ({ data, text }) => {
          const image = new Image();
          image.src = `data:image/png;base64,${data}`;
          await image.decode();
          const canvas = document.createElement('canvas');
          canvas.width = image.width;
          canvas.height = image.height;
          const context = canvas.getContext('2d', { willReadFrequently: true });
          context.drawImage(image, 0, 0);
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
          const lum = (r, g, b) => {
            const c = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
            return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
          };
          const ratios = [];
          for (let i = 0; i < pixels.length; i += 4) {
            const [pr, pg, pb] = [pixels[i], pixels[i + 1], pixels[i + 2]];
            const mix = (fg, bg) => fg * text[3] + bg * (1 - text[3]);
            const a = lum(mix(text[0], pr), mix(text[1], pg), mix(text[2], pb)), b = lum(pr, pg, pb);
            ratios.push((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05));
          }
          ratios.sort((x, y) => x - y);
          return { worst: ratios[0], pixels: ratios.length };
        },
        { data: png.toString('base64'), text: prepared.text },
      );
    } finally {
      await reader.close();
    }
  }

  for (const width of [375, 1280]) {
    for (const [light, time, mode] of LIGHTS) {
      test(`${width} px, ${light} light: the line's text has 4.5:1 over what is behind it, the land drawn`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await open(page, '/', { time });
        await expect(page.locator('home-globe[land]')).toHaveCount(1, { timeout: 15000 });
        await expect.poll(() => page.evaluate(() => document.documentElement.dataset.light)).toBe(light);
        expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(mode);
        await page.waitForLoadState('networkidle');
        await faded(page);
        await page.waitForTimeout(1500); // the colour of the line and the glow of the visual settle
        const { worst, pixels } = await behindTheLine(page);
        expect(pixels).toBeGreaterThan(50);
        expect(worst, `the worst contrast of the line's text over its background: ${worst.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});

/* ---- Light on the main thread: no breathing halo, an idle spin at 15 a second ---- */

/**
 * The landing was near 70% busy on the main thread in software rendering with
 * nothing happening: the brand's halo breathed forever (an animated text-shadow
 * repaints on the main thread) and the globe drew every animation frame for a
 * spin of 1.6 degrees a second. The halo is still, and the idle spin draws at
 * most 15 times a second. Motion is allowed in these tests: that is where the
 * cost was.
 */
test.describe('the page at rest costs little', () => {
  test.beforeEach(() => {
    test.skip(jsOff(), 'needs JavaScript');
  });

  test('with motion allowed, no CSS animation runs on the brand, and its halo is still there', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page);
    await expect(page.locator('home-globe[land]')).toHaveCount(1, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    expect(await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches), 'control: motion is allowed').toBe(false);
    // An entrance may still be playing: only what never ends would cost anything, so give a finite one the time to end
    await expect
      .poll(
        () =>
          page.evaluate(() =>
            document
              .getAnimations()
              .filter((a) => (a.playState === 'running' || a.playState === 'pending') && /** @type {Element | null | undefined} */ (a.effect?.target)?.closest?.('.landing-hero__brand'))
              .map((a) => /** @type {any} */ (a).animationName ?? /** @type {any} */ (a).transitionProperty ?? 'unnamed'),
          ),
        { message: 'animations running on .landing-hero__brand', timeout: FRAMES_WITHIN },
      )
      .toEqual([]);
    // The word LUZ is drawn by CSS: its halo is a still drop-shadow filter of the word (a text-shadow would be cut by its mask)
    const halo = await page.locator('.landing-hero__brand').evaluate((el) => getComputedStyle(el).filter);
    expect(halo, 'the still halo is the base drop-shadow filter').toContain('drop-shadow');
  });

  /** What the globe shows: the outlines of its pieces of land. */
  const shape = (page) => page.locator('home-globe').evaluate((el) => [...el.querySelectorAll('path.home-globe__piece')].map((p) => p.getAttribute('d')).join('|'));
  /**
   * Hook `_draw` and `_frame` of <home-globe> when the class is defined, before
   * any script runs: window.__draws counts the draws and window.__frames the
   * animation frames the globe was given. A software renderer paints a draw so
   * slowly that it caps the frames itself (~18 a second whatever the globe
   * asks for), so a count of draws alone cannot tell a globe that draws on
   * every frame from one that draws on every fourth: the share of the frames
   * it draws in can.
   * @param {import('@playwright/test').Page} page
   */
  const countDraws = (page) =>
    page.addInitScript(() => {
      const w = /** @type {any} */ (window);
      w.__draws = 0;
      w.__frames = 0;
      const define = customElements.define.bind(customElements);
      customElements.define = (name, constructor, options) => {
        if (name === 'home-globe') {
          for (const [method, counter] of [['_draw', '__draws'], ['_frame', '__frames']]) {
            const original = constructor.prototype[method];
            if (!original) continue;
            constructor.prototype[method] = function () {
              w[counter]++;
              return original.apply(this, arguments);
            };
          }
        }
        return define(name, constructor, options);
      };
    });
  const counts = (page) => page.evaluate(() => ({ draws: /** @type {any} */ (window).__draws, frames: /** @type {any} */ (window).__frames }));

  test('the idle spin of the globe draws on a fraction of its frames, about 15 times a second at most, and it does turn', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await countDraws(page);
    await open(page);
    await expect(page.locator('home-globe[land]')).toHaveCount(1, { timeout: 15000 });
    await page.locator('home-light').scrollIntoViewIfNeeded();
    await page.waitForLoadState('networkidle');
    // It spins once it has been seen: wait for frames to come, then let the land and the first draws pass
    await expect.poll(async () => (await counts(page)).frames, { message: 'the globe is given animation frames', timeout: FRAMES_WITHIN }).toBeGreaterThan(10);
    await page.waitForTimeout(1000);
    const before = await shape(page);
    const from = await counts(page);
    const SECONDS = 3;
    await page.waitForTimeout(SECONDS * 1000);
    const to = await counts(page);
    const after = await shape(page);
    const draws = to.draws - from.draws;
    const frames = to.frames - from.frames;
    const rate = draws / SECONDS;
    // A step of the spin waits for 66 ms of frames: at 60 a second one frame in four draws, and where the frames come slower still no more than one in two. The old loop drew on every frame.
    expect(frames, 'the globe was given frames').toBeGreaterThan(5);
    expect(draws / frames, `draws per frame: ${draws} in ${frames}`).toBeLessThanOrEqual(0.6);
    // And the draws a second: the upper bound is firm, the lower loose (a loaded runner may draw fewer)
    expect(rate, `draws a second: ${rate.toFixed(1)}`).toBeLessThanOrEqual(20);
    expect(rate, `draws a second: ${rate.toFixed(1)}`).toBeGreaterThan(2);
    expect(after, 'the globe turns: its pieces are drawn elsewhere').not.toBe(before);
  });
});

/* ---- The bar at rest keeps its text readable ------------------------------------- */

/**
 * From 1024px with a pointer that hovers, the bar rests faint over the sky and
 * the globe. Its hour is large text (3:1) and its place is small (4.5:1), and
 * the ink is blended into what is behind it by the bar's opacity. Measured on
 * the pixels actually drawn: the text is made transparent, the rectangle of the
 * text is photographed, and each pixel is measured against the ink as the
 * opacity lets it through. The 5th percentile counts, not the worst pixel: a
 * few stars or a bright coast do not decide it. The globe is held still
 * (reduced motion) so the picture is the same on every run.
 */
test.describe('the bar at rest: its hour and its place have their contrast over the sky and the globe', () => {
  test.beforeEach(() => {
    test.skip(jsOff(), 'needs JavaScript');
  });
  test.use({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });

  /**
   * The ratios, per pixel behind the text of `selector`, sorted ascending, with the bar's opacity blended into the ink.
   * @param {import('@playwright/test').Page} page
   * @param {string} selector
   */
  async function behindTheText(page, selector) {
    const target = page.locator(selector).first();
    await target.scrollIntoViewIfNeeded();
    const prepared = await target.evaluate(async (el) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.fillStyle = getComputedStyle(el).color;
      context.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
      const opacity = parseFloat(getComputedStyle(el.closest('.home-light__bar')).opacity);
      const style = document.createElement('style');
      style.id = 'probe-hide-text';
      style.textContent = 'home-light .home-light__bar, home-light .home-light__bar * { transition: none !important; } home-light .home-light__time, home-light .home-light__where { color: transparent !important; text-shadow: none !important; }';
      document.head.append(style);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const range = document.createRange();
      range.selectNodeContents(el);
      const box = range.getBoundingClientRect();
      return { ink: [r, g, b], alpha: (a / 255) * opacity, clip: { x: Math.max(0, Math.floor(box.left)), y: Math.max(0, Math.floor(box.top)), width: Math.ceil(box.width) + 1, height: Math.ceil(box.height) + 1 } };
    });
    let png;
    try {
      png = await page.screenshot({ clip: prepared.clip, animations: 'disabled' });
    } finally {
      await page.evaluate(() => document.getElementById('probe-hide-text')?.remove());
    }
    const reader = await page.context().newPage();
    try {
      await reader.goto('about:blank');
      return await reader.evaluate(
        async ({ data, ink, alpha }) => {
          const image = new Image();
          image.src = `data:image/png;base64,${data}`;
          await image.decode();
          const canvas = document.createElement('canvas');
          canvas.width = image.width;
          canvas.height = image.height;
          const context = canvas.getContext('2d', { willReadFrequently: true });
          context.drawImage(image, 0, 0);
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
          const lum = (r, g, b) => {
            const c = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
            return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
          };
          const ratios = [];
          for (let i = 0; i < pixels.length; i += 4) {
            const back = [pixels[i], pixels[i + 1], pixels[i + 2]];
            const [r, g, b] = back.map((v, k) => ink[k] * alpha + v * (1 - alpha));
            const a = lum(r, g, b);
            const bg = lum(back[0], back[1], back[2]);
            ratios.push((Math.max(a, bg) + 0.05) / (Math.min(a, bg) + 0.05));
          }
          return ratios.sort((x, y) => x - y);
        },
        { data: png.toString('base64'), ink: prepared.ink, alpha: prepared.alpha },
      );
    } finally {
      await reader.close();
    }
  }

  for (const [light, time] of LIGHTS) {
    test(`${light} light: at rest the hour has 3:1 and the place 4.5:1 over what is behind them (5th percentile)`, async ({ page }) => {
      await open(page, '/', { time });
      await expect(page.locator('home-globe[land]')).toHaveCount(1, { timeout: 15000 });
      await expect.poll(() => page.evaluate(() => document.documentElement.dataset.light)).toBe(light);
      await page.waitForLoadState('networkidle');
      await faded(page);
      const bar = page.locator('home-light .home-light__bar');
      await expect(bar).toBeVisible();
      await page.mouse.move(5, 5);
      // At rest: the opacity has come down from 1 and its transition has ended
      await expect.poll(() => bar.evaluate((el) => parseFloat(getComputedStyle(el).opacity))).toBeLessThan(1);
      await expect.poll(() => bar.evaluate((el) => el.getAnimations().filter((a) => a.playState === 'running').length)).toBe(0);
      await page.waitForTimeout(500); // the glow of the visual settles
      const p5 = (ratios) => ratios[Math.floor(ratios.length * 0.05)];
      const hour = await behindTheText(page, 'home-light .home-light__time');
      const place = await behindTheText(page, 'home-light .home-light__where');
      expect(hour.length, 'pixels behind the hour').toBeGreaterThan(50);
      expect(place.length, 'pixels behind the place').toBeGreaterThan(50);
      expect(p5(hour), `the hour (large text) over its background, 5th percentile: ${p5(hour).toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
      expect(p5(place), `the place over its background, 5th percentile: ${p5(place).toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    });
  }
});

/* ---- No Pause motion: only prefers-reduced-motion stops the light ---------------- */

/**
 * The owner's decision of 2026-10-18: the bar has no "Pause motion" button.
 * Only the system's prefers-reduced-motion stops the globe and the stars of the
 * landing (RL-8; the cases under reducedMotion: 'reduce' are above). WCAG 2.2.2
 * is then not met for them; the accessibility statement says so
 * (tests/accessibility-known-home-light.test.js). Nothing is remembered either:
 * `[still]` is no attribute of <home-light> any more, and `luz-home-light` is
 * no key of the page.
 */
test.describe('no Pause motion button', () => {
  test.beforeEach(() => {
    test.skip(jsOff(), 'needs JavaScript');
  });
  const PAUSE_NAME = /pause|detener|إيقاف/i;
  const countFrames = (page) =>
    page.addInitScript(() => {
      const ask = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (callback) => {
        if (/\/apps\/landing\/light\//.test(new Error().stack ?? '')) /** @type {any} */ (window).__frames = ((/** @type {any} */ (window).__frames) ?? 0) + 1;
        return ask(callback);
      };
    });
  /** Start counting, then wait until the globe has asked for more than 10 frames: a count, not a rate (a frame costs tens of milliseconds of main thread in software rendering, so how many fit in a window depends on the runner's load). */
  const asksForFrames = async (page, message) => {
    await page.evaluate(() => {
      /** @type {any} */ (window).__frames = 0;
    });
    await expect.poll(() => page.evaluate(() => /** @type {any} */ (window).__frames ?? 0), { message, timeout: FRAMES_WITHIN }).toBeGreaterThan(10);
  };

  for (const [route] of ROUTES) {
    test(`${route}: the open bar has no button named Pause (or its Spanish or Arabic name), and <body> hands the script no light-pause label`, async ({ page }) => {
      await open(page, route);
      await openBar(page);
      const names = await page.locator('home-light button').evaluateAll((buttons) => buttons.map((b) => (b.getAttribute('aria-label') || b.textContent || '').trim()));
      expect(
        names.filter((name) => PAUSE_NAME.test(name)),
        `the buttons of the light are: ${names.join(' | ')}`,
      ).toEqual([]);
      await expect(page.locator('home-light .home-light__still, home-light button[aria-pressed]:not([data-look])')).toHaveCount(0);
      expect(await page.evaluate(() => document.body.hasAttribute('data-luz-label-light-pause')), '<body> has data-luz-label-light-pause').toBe(false);
    });
  }

  test('a [still] attribute on <home-light> is ignored: the globe keeps asking for animation frames', async ({ page }) => {
    await atTime(page, '13:00');
    await countFrames(page);
    await open(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await asksForFrames(page, 'control: the globe spins before the attribute');
    await page.locator('home-light').evaluate((el) => el.setAttribute('still', ''));
    await page.waitForTimeout(600);
    await asksForFrames(page, 'the globe still spins with [still] set');
  });

  test('a [still] attribute on <home-light> is ignored: the stars of the page keep twinkling and drifting at night', async ({ page }) => {
    await open(page, '/', { time: '23:30' });
    const names = () => page.evaluate(() => ['::before', '::after'].map((p) => getComputedStyle(document.querySelector('main.luz-main'), p).animationName));
    expect((await names()).every((n) => n !== 'none'), 'control: the stars move before the attribute').toBe(true);
    await page.locator('home-light').evaluate((el) => el.setAttribute('still', ''));
    await page.waitForTimeout(300);
    expect((await names()).every((n) => n !== 'none'), 'the stars still move with [still] set').toBe(true);
  });

  test('a [still] attribute on <home-light> writes nothing to localStorage, and nothing is read from it on a reload', async ({ page }) => {
    await open(page);
    await page.locator('home-light').evaluate((el) => el.setAttribute('still', ''));
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => /home-light/.test(k))), 'no luz-home-light key').toEqual([]);
    await page.evaluate(() => localStorage.setItem('luz-home-light', 'still'));
    await page.reload();
    await expect(page.locator('home-light .home-light__line')).toBeVisible();
    await expect(page.locator('home-light[still]'), 'a stored "still" is not read').toHaveCount(0);
  });

  test('using the bar (open, scrub, close) leaves no luz-home-light key', async ({ page }) => {
    await page.setViewportSize(NARROW);
    await open(page);
    await page.waitForLoadState('networkidle');
    await scrub(page, '10:00');
    await page.keyboard.press('Escape');
    await expect(page.locator('home-light .home-light__bar')).toBeHidden();
    expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => /home-light/.test(k)))).toEqual([]);
  });
});
