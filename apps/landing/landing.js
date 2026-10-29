/**
 * LUZ landing — page glue.
 * Everything here is an enhancement: the color mode switcher is a native
 * radio group that works without JavaScript (:root:has() in the tokens),
 * and the scene of "Works without JavaScript" and the three modes of
 * "Modes" are CSS only.
 *
 * luz.js is deliberately not loaded: its auto-init applies the stored or
 * default custom theme to <html>. The mode and the light of the hour belong
 * to the footer's <luz-theme-time> and <luz-theme-mode> (defined by
 * apps/site/header.js).
 */

import { initCopyButtons } from "/packages/core/dist/clipboard.js";
import { highlightBlock } from "/packages/core/dist/highlight.js";
import { initTabs } from "/packages/core/dist/tabs.js";
// Defines <luz-search> at once, not on idle as catalog.js would: the header's
// search button wires itself when it connects
import "/packages/catalog/dist/search.js";
// The slider of the day (<luz-theme-time variant="bar">) is built by <home-light> after the
// page is scanned, so its chunk is imported here
import { initThemeTimeBar } from "/packages/catalog/dist/theme-time-bar.js";
import { initSiteHeader } from "/apps/site/header.js";
// The prompts of the fourth level: each link to a prompt's text becomes the
// button that opens it in a dialog
import { initPromptDialogs } from "/apps/site/prompt-dialog.js";
// <home-light>, the visitor's sky under the hero: defines the element, which
// loads its one visual
import "/apps/landing/light/light.js";

// <home-light> has built its bar by now: give it its slider
initThemeTimeBar();

/* ---- Copy buttons ----------------------------------------------------- */

function initCopy() {
  // The copied text is read from the code on screen, so it cannot drift
  document.querySelectorAll("[data-copy-from]").forEach((button) => {
    const source = document.getElementById(button.dataset.copyFrom);
    if (source) button.dataset.copy = source.textContent.trim();
    button.hidden = false;
  });
  // initCopyButtons() announces each copy in a polite live region
  initCopyButtons();
}

/* ---- Modes: each box uses its mode on a click ------------------------- */

/**
 * The buttons of "Modes" check the footer's radio of their mode, as a click
 * would: <luz-theme-mode> applies it, remembers it and moves its button, and
 * tells the page with luz-theme-mode:change, which presses the box of the mode
 * in use (none in Auto). While the page takes the mode, its colours change at
 * the pace of a click (data-mode-preview, landing.css) and the box's icon
 * moves (is-loading). Without <luz-theme-mode> (no site module) the buttons
 * stay hidden.
 */
function initModes() {
  const modes = document.querySelector("luz-theme-mode");
  const buttons = [...document.querySelectorAll("[data-apply-mode]")];
  if (!modes || !buttons.length) return;
  const root = document.documentElement;
  let settle = 0;
  const press = (theme) => {
    for (const button of buttons) button.setAttribute("aria-pressed", String(button.dataset.applyMode === theme));
  };
  for (const button of buttons) {
    button.addEventListener("click", () => {
      clearTimeout(settle);
      root.dataset.modePreview = "";
      button.classList.remove("is-loading");
      // A reflow, so the icon moves again on a second click
      void button.offsetWidth;
      button.classList.add("is-loading");
      modes.querySelector(`input[name="luz-theme-mode"][value="${button.dataset.applyMode}"]`)?.click();
      settle = setTimeout(() => delete root.dataset.modePreview, 500);
    });
    button.addEventListener("animationend", () => button.classList.remove("is-loading"));
  }
  document.addEventListener("luz-theme-mode:change", (event) => press(event.detail?.auto ? null : event.detail?.mode));
  press(modes.choice && modes.choice !== "auto" ? modes.choice : null);
  // What needs this script and <luz-theme-mode>: shown only now
  for (const el of document.querySelectorAll("[data-needs-js]")) el.hidden = false;
}

/* ---- PROTOTYPE: the layout of the demo of "Semantic HTML, styled" ------- */

/**
 * PROTOTYPE, to be removed when the owner chooses: ?native=a (the default) or
 * ?native=b sets data-native on <html>, and landing.css lays out the
 * before-and-after of the demo accordingly.
 */
function initNativePrototype() {
  const layout = location.search.match(/[?&]native=([ab])(?:&|$)/)?.[1];
  if (layout) document.documentElement.dataset.native = layout;
}

/* ---- Boot -------------------------------------------------------------- */

initNativePrototype();

// Color mode, menu drawer and header height (shared with the docs)
initSiteHeader();
initCopy();
initModes();
initPromptDialogs();
// The panels of "What's inside": install, code and result
for (const panel of document.querySelectorAll(".landing-panel")) initTabs(panel);
// highlightBlock() only: initHighlight() also injects a copy button into each
// block, and core ships no position for it.
// Not the typed scene: its lines are spans the scroll reveals, coloured in the markup
document.querySelectorAll("pre.luz-code-block:not([data-typed])").forEach(highlightBlock);
