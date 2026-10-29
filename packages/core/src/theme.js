/**
 * LUZ Design System — Theme system
 * Base color modes (light/dark/high-contrast) via data-theme on <html>,
 * custom themes (data-theme="<name>") with per-theme data-mode variants.
 *
 * Importing this module has no side effects; call initThemeSystem() to
 * wire up persistence and the initial theme.
 *
 * The color mode itself is <luz-theme-mode> (theme-mode.js, a lazy chunk):
 * a native radio group that works without any script (components/
 * theme-mode.css) and writes data-mode (and, with no brand, data-theme) on
 * <html>. This module is for the pages that name a brand: applyTheme() and
 * applyMode() switch a custom theme and its mode.
 */
import { enableJs } from "./utils.js";
import { t } from "./i18n.js";


// Color modes: luminosity variants (light/dark/high-contrast)
export const MODES = ["light", "dark", "high-contrast"];
// Custom themes: your own visual identities. LUZ ships none: the page lists
// the names of the ones it has, <html data-luz-themes="brand other">, so the
// stored choice is accepted and the mode switcher remembers it.
const THEME_NAME = /^[a-z][a-z0-9-]{0,31}$/;

export function getCustomThemes() {
  const list = document.documentElement.dataset.luzThemes || "";
  return list.split(/\s+/).filter((name) => THEME_NAME.test(name) && !MODES.includes(name));
}

const allThemes = () => [...MODES, ...getCustomThemes()];
// "luz-theme" holds the color MODE (light, dark or high-contrast; Auto is its
// absence), as <luz-theme-mode> and the boot script read it. The name of a
// custom theme has a key of its own, so the two never collide.
const STORAGE_KEY = "luz-theme";
const STORAGE_KEY_BRAND = "luz-brand";
const STORAGE_KEY_LAST_MODE = "luz-last-mode";

// localStorage throws in sandboxed iframes and storage-blocked contexts;
// theming must keep working there, just without persistence.
const store = (op, key, value) => {
  try {
    return localStorage[op + "Item"](key, value);
  } catch (_) {
    return null;
  }
};

// The custom theme the visitor applied, else the stored base mode
export function getStoredTheme() {
  const brand = store("get", STORAGE_KEY_BRAND);
  if (brand && getCustomThemes().includes(brand)) return brand;
  return getStoredMode();
}

export function getStoredMode() {
  const saved = store("get", STORAGE_KEY);
  return saved && MODES.includes(saved) ? saved : null;
}

export function getInitialTheme() {
  const saved = getStoredTheme();
  if (saved) return saved;
  // The theme the page sets in its markup, else light
  const set = document.documentElement.dataset.theme;
  return allThemes().includes(set) ? set : "light";
}

function syncButtons(theme) {
  const currentMode = document.documentElement.dataset.mode;

  // Custom theme apply buttons
  document.querySelectorAll(".luz-theme-apply-btn").forEach((btn) => {
    const active = btn.dataset.theme === theme;
    btn.classList.toggle("is-active", active);
    btn.textContent = t(active ? "themeApplied" : "applyTheme", btn);
    btn.setAttribute("aria-pressed", String(active));
  });

  // Mode buttons scoped to a custom theme (nearest [data-theme] ancestor)
  document.querySelectorAll(".luz-theme-mode-btn").forEach((btn) => {
    const cardTheme = btn.closest("[data-theme]")?.dataset.theme;
    const isCardActive = theme === cardTheme;
    const modeActive = isCardActive && currentMode === btn.dataset.mode;
    btn.classList.toggle("is-active", modeActive);
    btn.setAttribute("aria-pressed", String(modeActive));
  });
}

export function applyTheme(theme, { persist = true } = {}) {
  const isCustom = getCustomThemes().includes(theme);
  document.documentElement.dataset.theme = theme;

  if (isCustom) {
    if (persist) store("set", STORAGE_KEY_BRAND, theme);
    // The stored mode, else the one already on the page (the boot script's), else light
    document.documentElement.dataset.mode =
      getStoredMode() || document.documentElement.dataset.mode || "light";
  } else {
    // A base color mode: data-mode says it too, as <luz-theme-mode> writes it
    document.documentElement.dataset.mode = theme;
    if (persist) {
      store("remove", STORAGE_KEY_BRAND);
      store("set", STORAGE_KEY, theme);
    }
  }

  syncButtons(theme);
}

// Apply a color mode within an already-active custom theme
export function applyMode(mode, parentTheme, { persist = true } = {}) {
  // Ensure the parent theme is applied first
  const current = document.documentElement.dataset.theme;
  if (current !== parentTheme) {
    if (persist && MODES.includes(current)) store("set", STORAGE_KEY_LAST_MODE, current);
    document.documentElement.dataset.theme = parentTheme;
    if (persist) store("set", STORAGE_KEY_BRAND, parentTheme);
  }
  document.documentElement.dataset.mode = mode;
  if (persist) store("set", STORAGE_KEY, mode);
  syncButtons(parentTheme);
}

/**
 * Wire up the buttons of custom themes (.luz-theme-apply-btn and
 * .luz-theme-mode-btn). The color mode is <luz-theme-mode>'s, not this
 * function's: it starts no mode and listens to no radio.
 * `defer = true` leaves data-luz-js to a later call of an init*().
 */
export function initThemeSystem(defer = false) {
  defer || enableJs();
  // The custom theme the visitor applied last time: the mode is <luz-theme-mode>'s and the boot script's
  const brand = store("get", STORAGE_KEY_BRAND);
  if (getCustomThemes().includes(brand)) applyTheme(brand, { persist: false });

  document.body.addEventListener("click", (e) => {
    // --- Mode buttons scoped to a custom theme ---
    const cardModeBtn = e.target.closest(".luz-theme-mode-btn");
    if (MODES.includes(cardModeBtn?.dataset.mode)) {
      const parentTheme = cardModeBtn.closest("[data-theme]")?.dataset.theme;
      if (getCustomThemes().includes(parentTheme)) {
        applyMode(cardModeBtn.dataset.mode, parentTheme);
      }
      return;
    }

    // --- Custom theme apply button ---
    const themeApplyBtn = e.target.closest(".luz-theme-apply-btn");
    if (themeApplyBtn?.dataset.theme) {
      const current = document.documentElement.dataset.theme;
      // Toggle: clicking again removes the custom theme → restore last mode
      if (current === themeApplyBtn.dataset.theme) {
        const lastMode = store("get", STORAGE_KEY_LAST_MODE);
        const fallback = MODES.includes(lastMode) ? lastMode : "light";
        applyTheme(fallback);
      } else {
        // Store current base mode before switching to a custom theme
        if (MODES.includes(current)) {
          store("set", STORAGE_KEY_LAST_MODE, current);
        }
        applyTheme(themeApplyBtn.dataset.theme);
      }
    }
  });
}
