/**
 * The six lights of the site and the way a test puts a page in one
 * (F2 of .claude/plans/luz-home-docs-identity.md, sections 3.3 and 3.4).
 *
 * With no stored choice the site is in Auto, and Auto is the visitor's system
 * (prefers-color-scheme, and prefers-contrast: more for high contrast), with or
 * without JavaScript: core's theme-boot.js and catalog's theme-time-boot.js write
 * data-mode before the first paint, and the clock decides nothing. The hour counts
 * only when it is pinned or previewed (the slider of the home, a moment chosen in
 * a bar, `pin(hour)` on <luz-theme-time>, a stored `luz-light`): a test names a
 * light by an hour inside its phase and pins it (`pinHour`). With nothing pinned,
 * data-moment is the default moment of the mode in use: afternoon over light,
 * night over dark or high contrast.
 */
import { existsSync, readFileSync } from "node:fs";
import { parseColor } from "../../packages/tokens/lib/contrast.js";
import { resolveColor } from "./design-tokens.js";

/** core's key; the site has no key of its own. */
export const KEY = "luz-theme";
export const TIMEZONE = "Europe/Madrid";

/** [light, an hour inside it, the colour mode it belongs to]: dawn, dusk and night are dark. */
export const LIGHTS = [
  ["dawn", "06:00", "dark"],
  ["morning", "09:00", "light"],
  ["afternoon", "14:00", "light"],
  ["sunset", "19:00", "light"],
  ["dusk", "21:00", "dark"],
  ["night", "23:30", "dark"],
];

/**
 * Put the page's clock at `hh:mm` on a June day in Madrid (UTC+2), before it loads.
 * The clock no longer decides the light: it is for what a test needs the time itself for (a date shown, a sunrise
 * computed from a place). To put the page in a light, pin the hour: `pinHour`.
 * @param {import('@playwright/test').Page} page
 * @param {string} hhmm
 */
export async function atTime(page, hhmm) {
  await page.clock.install({ time: new Date(`2026-06-15T${hhmm}:00+02:00`) });
}

/**
 * Store a choice under core's key once per tab, so a reload keeps what the
 * page then stores. Call before the first goto.
 * @param {import('@playwright/test').Page} page
 * @param {string} value
 */
export async function seedMode(page, value) {
  await page.addInitScript(
    ([key, mode]) => {
      if (!sessionStorage.getItem("luz-seeded")) {
        localStorage.setItem(key, mode);
        sessionStorage.setItem("luz-seeded", "1");
      }
    },
    [KEY, value],
  );
}

/**
 * Pin an hour before the first paint, as the home's slider or `pin(hour)` on <luz-theme-time> leaves it: `luz-light`, the
 * minutes of the day, in localStorage. The page then shows the moment at that hour and its base (dawn, dusk and night dark;
 * morning, afternoon and sunset light), in Auto, whatever the system and the clock say. Set once per tab, so a reload keeps
 * what the page then stores. Call before the first goto.
 * @param {import('@playwright/test').Page} page
 * @param {string} hhmm
 */
export async function pinHour(page, hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  await page.addInitScript(
    (minutes) => {
      if (!sessionStorage.getItem("luz-pinned-seeded")) {
        localStorage.setItem("luz-light", String(minutes));
        sessionStorage.setItem("luz-pinned-seeded", "1");
      }
    },
    h * 60 + m,
  );
}

/** What a computed colour must be for Vejer's token in a mode: [r, g, b, a] as the browser serialises it. */
export function vejer(mode, token) {
  const { r, g, b, a } = parseColor(resolveColor(mode, token));
  return [r, g, b, a].map((v, i) => (i === 3 ? Math.round(v * 1000) / 1000 : Math.round(v)));
}

/** The `rgb()` / `rgba()` text of a computed colour as [r, g, b, a]. */
export function channels(text) {
  const parts = text.match(/\(([^)]+)\)/)?.[1].split(/[\s,/]+/).filter(Boolean).map(Number) ?? [];
  return [parts[0], parts[1], parts[2], parts[3] ?? 1];
}

/** The computed colour of a token on an element, through a probe child (so var() chains and @property are resolved). */
export function colorOf(locator, token) {
  return locator.evaluate((el, name) => {
    const probe = document.createElement("span");
    probe.style.cssText = `color: var(${name}); position: absolute; visibility: hidden`;
    el.append(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  }, token);
}

/**
 * `test.use({ storageState: NO_CHOICE })`: nothing stored. It is what every context starts with now (the project pins no
 * hour any more); a spec that needs a pinned hour pins it itself (`pinHour`, or `pin(hour)` on <luz-theme-time>).
 */
export const NO_CHOICE = { cookies: [], origins: [] };

/**
 * The colour a token has in the block of a light in apps/site/theme-light.css,
 * as [r, g, b, a] like `vejer()`. The literal of the file, so a page that
 * leaves the stylesheet out is told apart from one that links it.
 */
export function lightToken(light, token) {
  const file = new URL("../../apps/site/theme-light.css", import.meta.url);
  if (!existsSync(file)) throw new Error("apps/site/theme-light.css does not exist");
  const css = readFileSync(file, "utf-8").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!selector.includes(`[data-moment="${light}"]`)) continue;
    const value = body.match(new RegExp(`${token}\\s*:\\s*([^;]+);`))?.[1].trim();
    if (!value) throw new Error(`${token} is not in the block of ${light}`);
    const { r, g, b, a } = parseColor(value);
    return [r, g, b, a].map((v, i) => (i === 3 ? Math.round(v * 1000) / 1000 : Math.round(v)));
  }
  throw new Error(`no block for ${light} in apps/site/theme-light.css`);
}
