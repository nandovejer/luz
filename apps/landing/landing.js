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
import { activateTab, initTabs } from "/packages/core/dist/tabs.js";
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
 * The buttons of "Modes" choose their mode in the footer's <luz-theme-mode>, as a
 * click on its button would: it applies it, remembers it and moves its button, and
 * tells the page with luz-theme-mode:change, which presses the box of the mode
 * in use (the system's too; none while an hour is chosen). While the page
 * takes the mode, its colours change at the pace of a click (data-mode-preview,
 * landing.css) and the box's icon moves (is-loading). Without <luz-theme-mode> (no site module) the buttons
 * stay hidden.
 */
function initModes() {
  const modes = document.querySelector("luz-theme-mode");
  const buttons = [...document.querySelectorAll("[data-apply-mode]")];
  if (!modes || !buttons.length) return;
  const root = document.documentElement;
  let settle = 0;
  // The box of the mode in use is pressed, the system's included; none while Auto is checked (an hour or a moment is chosen)
  const press = () => {
    const theme = modes.querySelector('input[value="auto"]')?.checked ? null : modes.mode;
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
      // Not a click on the radio: the one of the mode in use is already checked, and a click on it changes nothing
      modes.choice = button.dataset.applyMode;
      settle = setTimeout(() => delete root.dataset.modePreview, 500);
    });
    button.addEventListener("animationend", () => button.classList.remove("is-loading"));
  }
  // <luz-theme-time> checks the radio of the mode in use after core's event: its own event comes last
  document.addEventListener("luz-theme-mode:change", press);
  document.addEventListener("luz-theme-time:change", press);
  press();
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

/* ---- The time of day under the three modes ---------------------------- */

/**
 * The bar of the band under the three boxes (<luz-theme-time variant="bar">)
 * has no moments of its own: it uses those of the footer's element, which
 * owns the page. It only needs the city of the visitor's time zone, as
 * the globe's bar has.
 */
function initDayBand() {
  const bar = document.querySelector(".landing-day__bar");
  if (!bar) return;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  const city = tz.includes("/") && !tz.startsWith("Etc/") ? tz.split("/").pop().replace(/_/g, " ") : "";
  if (city) bar.setAttribute("place", city);
}

/* ---- The panels' tabs turn by themselves ------------------------------- */

/**
 * The tabs of a level's panel (install, list, code) take turns
 * in a loop while the panel is on screen: a line fills under the open tab
 * (landing.css, [data-cycle]) and, when it is full, the next tab opens. The
 * pointer over the panel or the focus in it holds the line; three seconds
 * after both leave, it runs on. A tab chosen by a person (a click, a key, a
 * link to a panel) ends the loop for good. Nothing turns when the system
 * asks for less motion, the focus never moves, nothing is announced.
 *
 * A written deviation, as the header's prism: an endless loop with no
 * control of its own (PRINCIPLES.md §2, WCAG 2.2.2), the owner's choice of
 * 2026-10-31.
 */
const RESUME_AFTER = 3000;

function initTabCycle(panel) {
  const still = window.matchMedia("(prefers-reduced-motion: reduce)");
  const tabs = [...panel.querySelectorAll('.luz-tab[role="tab"]')];
  if (still.matches || tabs.length < 2) return;
  let visible = false;
  let held = false;
  let stopped = false;
  // The tab the loop opened last: the observer below hears of it later
  let turned = null;
  let timer = 0;

  const show = () => {
    if (stopped) delete panel.dataset.cycle;
    else panel.dataset.cycle = visible && !held ? "run" : "hold";
  };
  const stop = () => {
    stopped = true;
    delete panel.dataset.turned;
    clearTimeout(timer);
    show();
  };
  const hold = () => {
    clearTimeout(timer);
    held = true;
    show();
  };
  // Runs on only when neither the pointer nor the focus is in the panel
  const release = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      held = panel.matches(":hover") || panel.contains(document.activeElement);
      show();
    }, RESUME_AFTER);
  };

  // The line under the open tab is full: the next tab opens
  panel.addEventListener("animationend", (e) => {
    if (stopped || e.animationName !== "landing-tab-cycle") return;
    const open = tabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true");
    turned = tabs[(open + 1) % tabs.length];
    panel.dataset.turned = "";
    activateTab(turned);
  });

  // Any other change of tab is a person's choice
  const watch = new MutationObserver(() => {
    const open = tabs.find((tab) => tab.getAttribute("aria-selected") === "true");
    if (open === turned) turned = null;
    else stop();
  });
  for (const tab of tabs) watch.observe(tab, { attributes: true, attributeFilter: ["aria-selected"] });
  // A click on the open tab changes nothing, and is a choice too
  for (const tab of tabs) tab.addEventListener("click", stop);

  panel.addEventListener("pointerenter", hold);
  panel.addEventListener("pointerleave", release);
  panel.addEventListener("focusin", hold);
  panel.addEventListener("focusout", (e) => panel.contains(e.relatedTarget) || release());
  still.addEventListener("change", () => still.matches && stop());

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    show();
  }, { threshold: 0.5 }).observe(panel);
}

/* ---- Boot -------------------------------------------------------------- */

initNativePrototype();
initDayBand();

// Color mode, menu drawer and header height (shared with the docs)
initSiteHeader();
initCopy();
initModes();
initPromptDialogs();
// The panels of "What's inside": install, code and result
for (const panel of document.querySelectorAll(".landing-panel")) {
  initTabs(panel);
  initTabCycle(panel);
}
// highlightBlock() only: initHighlight() also injects a copy button into each
// block, and core ships no position for it.
// Not the typed scene: its lines are spans the scroll reveals, coloured in the markup
document.querySelectorAll("pre.luz-code-block:not([data-typed])").forEach(highlightBlock);
