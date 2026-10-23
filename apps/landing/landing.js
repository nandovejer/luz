/**
 * LUZ landing — page glue.
 * Everything here is an enhancement: the color mode switcher is a native
 * radio group that works without JavaScript (:root:has() in the tokens),
 * and the scene of "Works without JavaScript" and the three modes of
 * "Modes" are CSS only.
 *
 * luz.js is deliberately not loaded: its auto-init applies the stored or
 * default custom theme to <html>. The mode and the light of the hour belong
 * to the footer's <luz-mode> (defined by apps/site/header.js).
 */

import { initCopyButtons } from "/packages/core/dist/clipboard.js";
import { highlightBlock } from "/packages/core/dist/highlight.js";
import { initTabs } from "/packages/core/dist/tabs.js";
// Defines <luz-search> at once, not on idle as site.js would: the header's
// search button wires itself when it connects
import "/packages/site/dist/search.js";
import { initSiteHeader } from "/apps/site/header.js";
// <home-light>, the visitor's sky under the hero: defines the element, which
// loads its one visual
import "/apps/landing/light/light.js";

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
 * would: <luz-mode> applies it, remembers it and moves its cycle button, and
 * tells the page with luz-mode:change, which presses the box of the mode in
 * use. While the page takes the mode, its colours change at the pace of a
 * click (data-mode-preview, landing.css) and the box's icon moves
 * (is-loading). Without <luz-mode> (no site module) the buttons stay hidden.
 */
function initModes() {
  const modes = document.querySelector("luz-mode");
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
      modes.querySelector(`input[name="luz-theme"][value="${button.dataset.applyMode}"]`)?.click();
      settle = setTimeout(() => delete root.dataset.modePreview, 500);
    });
    button.addEventListener("animationend", () => button.classList.remove("is-loading"));
  }
  document.addEventListener("luz-mode:change", (event) => press(event.detail?.mode));
  press(modes.querySelector('input[name="luz-theme"]:checked')?.value ?? null);
  // What needs this script and <luz-mode>: shown only now
  for (const el of document.querySelectorAll("[data-needs-js]")) el.hidden = false;
}

/* ---- Boot -------------------------------------------------------------- */

// Color mode, menu drawer and header height (shared with the docs)
initSiteHeader();
initCopy();
initModes();
// The panels of "What's inside": install, code and result
for (const panel of document.querySelectorAll(".landing-panel, .luz-terminal")) initTabs(panel);
// highlightBlock() only: initHighlight() also injects a copy button into each
// block, and core ships no position for it.
// Not the typed scene: its lines are spans the scroll reveals, coloured in the markup
document.querySelectorAll("pre.luz-code-block:not([data-typed])").forEach(highlightBlock);
