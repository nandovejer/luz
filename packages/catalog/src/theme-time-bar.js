/**
 * LUZ Catalog — the slider of the day: the bar of <luz-theme-time variant="bar">.
 * A lazy chunk: catalog.js loads this file (dist/theme-time-bar.min.js, one
 * file with its own budget, which loads nothing else) on idle when the page
 * has a <luz-theme-time variant="bar">, after theme-time.js; a page may also
 * load it on its own ("@luz-ds/catalog/theme-time-bar") and call
 * initThemeTimeBar() for an element it added after the page was scanned. It
 * defines no element: it builds the bar inside each variant="bar" element and
 * speaks to it only through its API.
 *
 * By default the bar is the slider of the 24 hours and nothing else: its name
 * and its "moment, hour" (aria-valuetext) are for a screen reader. The
 * `show` attribute, words separated by spaces, adds parts (theme-time.css
 * shows them; this file builds them all): time (the hour in large type),
 * place (the place and the moment), saved (the note, from the top) and
 * moments (the declared moments, as options under it). Dragging the slider
 * previews that hour on the page; letting go pins it (and stores it, unless
 * the element says no-remember) and writes the note, which a screen reader
 * hears even when it is not shown. A pinned hour is let go by choosing a mode
 * or Auto in <luz-theme-mode>, or by Escape on the slider. Without
 * JavaScript there is no bar.
 *
 * Its two texts are the page's, as data-luz-label-* on the element or an
 * ancestor, with no English fallback: data-luz-label-scrub (the slider's name)
 * and data-luz-label-saved (the note). A missing one writes nothing.
 *
 * luz-exception: EX-013 — those two texts are the page's, read from the
 * markup, as search's are (EX-005): this chunk imports nothing.
 */

const el = (tag, className, parent) => {
  const node = document.createElement(tag);
  node.className = className;
  parent?.append(node);
  return node;
};

const text = (host, key) => host.closest(`[data-luz-label-${key}]`)?.getAttribute(`data-luz-label-${key}`) ?? "";

/** A moment of the page by name: the one the page owner declared, whichever element holds the bar. */
const momentOf = (host, name) => host.moments.find((m) => m.name === name);

/** The visible name of a moment, from its label. */
const labelOf = (host, name) => momentOf(host, name)?.input.closest("label")?.textContent.trim() ?? "";

/**
 * The track's sky: one stop for each moment whose --luz-theme-time-sky-<name> the site sets, in the middle
 * of the moment (the last one runs past midnight, so it closes both ends). Nothing when none is set.
 */
function sky(host, bar) {
  const style = getComputedStyle(host);
  const list = host.moments.filter((m) => style.getPropertyValue(`--luz-theme-time-sky-${m.name}`).trim());
  const stops = [];
  list.forEach((m, i) => {
    const colour = `var(--luz-theme-time-sky-${m.name})`;
    const end = i + 1 < list.length ? list[i + 1].from : list[0].from + 24;
    const middle = (m.from + end) / 2;
    if (middle >= 24) stops.push(`${colour} 0%`);
    else stops.push(`${colour} ${((middle / 24) * 100).toFixed(1)}%`);
    if (i === list.length - 1) stops.push(`${colour} 100%`);
  });
  if (stops.length) {
    // The wrapping moment's first stop belongs first
    stops.sort((a, b) => parseFloat(a.split(" ").pop()) - parseFloat(b.split(" ").pop()));
    bar.style.setProperty("--luz-theme-time-sky", `linear-gradient(var(--luz-theme-time-way), ${stops.join(", ")})`);
  }
}

function clock(host) {
  const options = { hour: "2-digit", minute: "2-digit", hourCycle: "h23" };
  try {
    return new Intl.DateTimeFormat(host.closest("[lang]")?.getAttribute("lang") || "en", options);
  } catch {
    return new Intl.DateTimeFormat("en", options);
  }
}

function build(host) {
  if (host.querySelector(":scope > .luz-theme-time__bar")) return;
  const format = clock(host);
  const bar = el("div", "luz-theme-time__bar");
  const saved = el("p", "luz-theme-time__saved", bar);
  saved.setAttribute("role", "status");
  const where = el("p", "luz-theme-time__where", bar);
  const hour = el("p", "luz-theme-time__hour", bar);
  const day = el("div", "luz-theme-time__day", bar);
  const label = el("label", "luz-theme-time__label", day);
  const slider = el("input", "luz-theme-time__slider", day);
  slider.type = "range";
  slider.min = 0;
  slider.max = 1439;
  // Five minutes a step: End lands on 23:55, and a pinned hour is one of them
  slider.step = 5;
  slider.id = label.htmlFor = `luz-theme-time-${Math.random().toString(36).slice(2, 8)}`;
  label.textContent = text(host, "scrub");
  let timer;
  let note;

  const sync = () => {
    const now = host.hour;
    const name = host.moment;
    const time = format.format(new Date(2000, 0, 1, Math.floor(now), Math.floor(now * 60) % 60));
    const moment = labelOf(host, name);
    slider.value = Math.min(1435, Math.round(now * 12) * 5);
    slider.setAttribute("aria-valuetext", [moment, time].filter(Boolean).join(", "));
    hour.textContent = time;
    where.textContent = [host.place, moment].filter(Boolean).join(" · ");
    bar.dataset.base = momentOf(host, name)?.theme ?? "";
  };
  // The hour moves with the clock until it is previewed or pinned
  const tick = () => {
    clearTimeout(timer);
    if (!host.isConnected) return;
    timer = setTimeout(tick, 6e4 - (Date.now() % 6e4));
    sync();
  };
  slider.addEventListener("input", () => {
    host.preview(slider.value / 60);
    sync();
  });
  // Escape lets go of a pinned hour: the one way from the slider itself when no option is shown
  slider.addEventListener("keydown", (e) => {
    // eslint-disable-next-line no-restricted-syntax -- RL-3: a range has no native Escape; it only lets go of the pin
    if (e.key === "Escape" && host.pinned !== null) {
      e.stopPropagation();
      host.unpin();
      sync();
    }
  });
  slider.addEventListener("change", () => {
    if (!host.pin(slider.value / 60)) return;
    // A key that steps the slider fires change at every press: the note is written once per burst, so a screen reader hears it once
    if (!("on" in saved.dataset)) {
      saved.replaceChildren(text(host, "saved"), Object.assign(el("span", "luz-theme-time__check"), { textContent: "✓" }));
      saved.lastChild.setAttribute("aria-hidden", "true");
    }
    saved.dataset.on = "";
    clearTimeout(note);
    note = setTimeout(() => {
      delete saved.dataset.on;
      saved.replaceChildren();
    }, 2500);
    sync();
  });
  host.addEventListener("luz-theme-time:change", sync);
  host.prepend(bar);
  sky(host, bar);
  tick();
}

/** Build the bar of every variant="bar" element under `root` that has none. */
export function initThemeTimeBar(root = document) {
  customElements.whenDefined("luz-theme-time").then(() => {
    for (const host of root.querySelectorAll('luz-theme-time[variant="bar"]')) build(host);
  });
}

if (typeof document !== "undefined") initThemeTimeBar();
