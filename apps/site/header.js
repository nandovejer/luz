/**
 * LUZ site header — one behavior for every page of the site (home, docs).
 * Everything here enhances what works without JavaScript: the color mode is
 * a native radio group (:root:has() in the tokens) and the menu
 * drawer is a native popover.
 *
 * - Color mode: <luz-theme-time> around core's <luz-theme-mode> in the footer
 *   owns it (core stores the choice under its "luz-theme" key and, in Auto,
 *   the clock decides the moment: core's theme-boot.js and catalog's
 *   theme-time-boot.js set the same mode before the first paint); this module
 *   defines both elements, which turn the radios into core's round button.
 *   With scripting on, that button is fixed at the bottom right of the window
 *   (core draws it); without it the radios stay in the footer.
 * - Menu drawer: catalog's initSidebar() on #page-nav, so a link closes the
 *   drawer and the current section is marked.
 * - Publishes the sticky header's height as --site-header-h on <html>, so
 *   anchored targets, the docs sidebar and the drawer sit below the header.
 *
 * Lives in apps/site, which the home page and the docs both import.
 * Not part of any published package.
 */

import { initSidebar } from "/packages/catalog/dist/sidebar.js";
// Define <luz-theme-mode> and <luz-theme-time>: the footer's switcher on every page, which owns the mode
import "/packages/core/dist/theme-mode.js";
import "/packages/catalog/dist/theme-time.js";

function publishHeight(header) {
  const publish = () =>
    document.documentElement.style.setProperty("--site-header-h", `${header.offsetHeight}px`);
  publish();
  if (typeof ResizeObserver === "function") new ResizeObserver(publish).observe(header);
}

/**
 * Wire the drawer and the header's height: what the header does besides the
 * colour-mode button. A page that names that button itself calls this alone.
 */
export function initSiteChrome() {
  const nav = document.getElementById("page-nav");
  if (nav) initSidebar(nav);
  const header = document.querySelector(".site-header");
  if (header) publishHeight(header);
}

/** Wire the header of a page of the site: the drawer and the header's height (the mode button is the footer's element). */
export function initSiteHeader() {
  initSiteChrome();
}
