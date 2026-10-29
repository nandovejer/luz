/**
 * LUZ /debug/ — the controls of the page, nothing else.
 *
 * The mode selector writes data-theme on <html> and the direction toggle writes
 * dir, so every block can be looked at in light, dark and high contrast, left to
 * right and right to left. The page keeps nothing: a reload starts again.
 * Without this script the page is in light and left to right, and the controls
 * do nothing; the content does not need them.
 */

const root = document.documentElement;
const MODES = ["light", "dark", "high-contrast"];

const mode = document.querySelector("select[data-debug-mode]");
if (mode) {
  // core's theme script may have chosen a mode already: show it
  if (MODES.includes(root.dataset.theme)) mode.value = root.dataset.theme;
  else root.dataset.theme = mode.value;
  mode.addEventListener("change", () => {
    root.dataset.theme = mode.value;
  });
}

const rtl = document.querySelector("input[data-debug-rtl]");
if (rtl) {
  root.dir = rtl.checked ? "rtl" : "ltr";
  rtl.addEventListener("change", () => {
    root.dir = rtl.checked ? "rtl" : "ltr";
  });
}
