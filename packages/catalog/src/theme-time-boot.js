/**
 * LUZ Catalog — the moment of the day before the first paint (theme-time-boot.js).
 *
 * luz-exception: EX-012 — a classic, render-blocking script for the <head>
 * (PRINCIPLES §3: no JS on the critical rendering path), optional; see EX-009.
 *
 * A classic script (not a module) for the <head>, right after core's
 * theme-boot.js, so a page that is dark at this hour is never drawn light
 * first. It writes what <luz-theme-time> would write, from the same moments;
 * the <head> is parsed before the body, so they travel on the script's own
 * tag, as `name@HH:MM=light|dark` separated by spaces, the first one that
 * starts after midnight also running back from the last. A `*` after the base
 * marks the moment a chosen mode shows (data-default in the markup):
 *
 *   <script src="…/theme-boot.min.js"></script>
 *   <script src="…/theme-time-boot.min.js"
 *           data-moments="dawn@05:00=dark morning@07:30=light afternoon@12:00=light* sunset@17:30=light dusk@20:30=dark night@22:30=dark*"></script>
 *
 *   1. a mode stored under "luz-theme" shows its default moment;
 *   2. else, with an hour pinned under "luz-light" (minutes of the day,
 *      rounded to 5), the moment is the one at that hour. data-mode, and
 *      data-theme when the page names no brand, take that moment's base,
 *      unless the system asks for more contrast (prefers-contrast: more),
 *      which still wins;
 *   3. else Auto is the system's: the mode is the one core's theme-boot.js
 *      wrote (or the system's, if it did not run), and the moment is the
 *      default one of its base. The hour of the day moves nothing.
 *
 * It reads, never writes, the storage, and knows no sunrise: with latitude
 * and longitude on <luz-theme-time> the element corrects the moment after the
 * first paint. It blocks rendering on purpose, which is why it is optional.
 */
(() => {
  const html = document.documentElement;
  const tag = document.currentScript;
  const moments = ((tag && tag.getAttribute("data-moments")) || "")
    .split(/\s+/)
    .map((token) => /^([\w-]+)@(\d{1,2}):(\d{2})=(light|dark)(\*?)$/.exec(token))
    .filter(Boolean)
    .map(([, name, h, m, theme, star]) => ({ name, from: +h + +m / 60, theme, star: !!star }))
    .sort((a, b) => a.from - b.from);
  if (!moments.length) return;
  const media = (query) => window.matchMedia && window.matchMedia(query).matches;
  const modes = ["light", "dark", "high-contrast"];
  let mode = null;
  let pinned = null;
  try {
    mode = localStorage.getItem("luz-theme");
    pinned = localStorage.getItem("luz-light");
  } catch (_) {}
  const timed = !modes.includes(mode) && /^\d{1,4}$/.test(pinned || "") && +pinned < 1440;
  let moment;
  if (timed) {
    const hour = Math.min(1435, Math.round(pinned / 5) * 5) / 60;
    moment = moments.filter((m) => m.from <= hour).pop() || moments[moments.length - 1];
    mode = media("(prefers-contrast: more)") ? "high-contrast" : moment.theme;
    html.setAttribute("data-mode", mode);
    if (!html.hasAttribute("data-theme") || modes.includes(html.getAttribute("data-theme"))) html.setAttribute("data-theme", mode);
  } else {
    if (!modes.includes(mode)) mode = html.getAttribute("data-mode") || (media("(prefers-contrast: more)") ? "high-contrast" : media("(prefers-color-scheme: dark)") ? "dark" : "light");
    const base = mode === "light" ? "light" : "dark";
    moment = moments.find((m) => m.theme === base && m.star) || moments.find((m) => m.theme === base);
  }
  if (moment) html.setAttribute("data-moment", moment.name);
})();
