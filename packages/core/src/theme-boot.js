/**
 * LUZ Core — color mode before the first paint (theme-boot.js).
 *
 * luz-exception: EX-009 — a classic, render-blocking script for the <head>
 * (PRINCIPLES §3: no JS on the critical rendering path), optional.
 *
 * A classic script (not a module) for the <head>, before the stylesheet's
 * first paint, so a page that is dark for its visitor is never drawn light
 * first. It writes what <luz-theme-mode> would write, and nothing else:
 *
 *   <script src="/node_modules/@luz-ds/core/dist/theme-boot.min.js"></script>
 *
 *   1. data-mode on <html>: the mode stored under "luz-theme" (light, dark or
 *      high-contrast), else the system's (prefers-contrast: more, then
 *      prefers-color-scheme: dark), else light;
 *   2. data-theme on <html> with the same value, unless the page names a brand
 *      (a data-theme that is not light, dark or high-contrast).
 *
 * It reads, never writes, the storage. It blocks rendering on purpose (it is
 * a few hundred bytes of the visitor's own preference), which is why it is
 * optional: <luz-theme-mode> does the same after the first paint, and without
 * JavaScript the radios still switch the mode.
 */
(() => {
  const html = document.documentElement;
  const modes = ["light", "dark", "high-contrast"];
  const media = (query) => window.matchMedia && window.matchMedia(query).matches;
  let mode = null;
  try {
    mode = localStorage.getItem("luz-theme");
  } catch (_) {}
  if (!modes.includes(mode)) mode = media("(prefers-contrast: more)") ? "high-contrast" : media("(prefers-color-scheme: dark)") ? "dark" : "light";
  html.setAttribute("data-mode", mode);
  if (!html.hasAttribute("data-theme") || modes.includes(html.getAttribute("data-theme"))) html.setAttribute("data-theme", mode);
})();
