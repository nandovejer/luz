/**
 * LUZ Catalog — the time of day: <luz-theme-time> (light DOM, no Shadow DOM)
 * wraps core's <luz-theme-mode> and gives its Auto the hour. A lazy chunk:
 * catalog.js loads this file (dist/theme-time.min.js, one file with its own
 * budget, which loads nothing else) on idle when the page has a
 * <luz-theme-time>; a page may also load it on its own
 * ("@luz-ds/catalog/theme-time"). The slider of the day is another chunk,
 * theme-time-bar.js, which only a variant="bar" loads.
 *
 * Markup: core's element, and the moments of the day, one input each. The
 * name is the input's value, its label is the visible name (in the page's
 * language), data-from is where it starts (HH:MM, 24 hours, the visitor's
 * clock) and data-theme is the mode it is painted over, light or dark. The
 * moment that starts first after midnight also runs back to the last start
 * of the day. data-default marks the moment a chosen mode (light, or dark and
 * high contrast) shows. Without JavaScript the moments do nothing and are not
 * shown.
 *
 *   <luz-theme-time>
 *     <luz-theme-mode>…</luz-theme-mode>
 *     <fieldset class="luz-theme-time__moments">
 *       <legend class="luz-theme-time__legend">Time of day</legend>
 *       <label class="luz-theme-time__moment"><input class="luz-theme-time__input" type="radio" name="luz-theme-moment" value="dawn" data-from="05:00" data-theme="dark">Dawn</label>
 *       <label class="luz-theme-time__moment"><input class="luz-theme-time__input" type="radio" name="luz-theme-moment" value="afternoon" data-from="12:00" data-theme="light" data-default>Afternoon</label>
 *       …
 *     </fieldset>
 *   </luz-theme-time>
 *
 * In Auto the mode is the base of the moment now (the system's contrast
 * request, prefers-contrast: more, still wins), written as data-mode and
 * data-theme by <luz-theme-mode> and the moment's name as data-moment on <html>,
 * checked again at every minute. LUZ gives the mechanism; the colours of each
 * moment are the site's (a rule on :root[data-moment="dawn"]). A chosen mode
 * shows its data-default moment. With latitude and longitude the two turns of
 * the day, from dark to light and back, follow that place's real sunrise and
 * sunset (computed here, from the date: no location prompt, no network), and
 * the moments between them stretch to fit. If the sun does not rise or set
 * there that day, or the place's day does not fall in the visitor's, the
 * declared hours stand.
 *
 * Only one <luz-theme-time> owns the page: the first one that has moments.
 *
 * API: `hour` (the hour in use, 0 to 24, a fraction for minutes), `moments` (the declared ones),
 * `moment`
 * (its name), `pinned` (the hour pinned, or null), `place`, `preview(hour)`
 * (the page follows that hour, in Auto; preview(null) goes back), `pin(hour)`
 * (Auto, at that hour for good instead of now, stored under "luz-light" in
 * minutes of the day) and `unpin()`. Choosing a mode, or Auto, in
 * <luz-theme-mode> unpins. Each returns false when it does nothing.
 *
 * @element luz-theme-time - Core's color mode, with Auto following the hour of the day.
 * @attr {"bar"} variant - Add the slider of the 24 hours.
 * @attr {string} show - With variant="bar", the parts of the bar to show: time, place, saved, moments.
 * @attr {string} latitude - Degrees north of the place, for its real sunrise and sunset.
 * @attr {string} longitude - Degrees east of that place.
 * @attr {string} place - The name of the place, shown with show="place".
 * @attr {boolean} no-remember - Do not store a pinned hour.
 * @fires luz-theme-time:change {CustomEvent} - Bubbles when the moment or the pinned hour changes, with detail { moment, pinned }.
 */

const PIN = "luz-light";
const DEG = Math.PI / 180;
// One state to the page; each element is only a view of it
const S = { els: [], owner: null, list: [], n: null, p: null, k: "", sun: null };

function store(value) {
  try {
    if (value === undefined) return localStorage.getItem(PIN);
    if (value) localStorage.setItem(PIN, value);
    else localStorage.removeItem(PIN);
  } catch {
    // No persistence, the same page
  }
  return null;
}

/** The sunrise and sunset of today at a place, in the visitor's clock hours; null when the sun does not do both. */
function sunHours(lat, lon) {
  const now = new Date();
  const day = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12) - (lon / 15) * 36e5;
  const doy = (day - Date.UTC(now.getFullYear(), 0, 0)) / 864e5;
  const decl = -23.44 * Math.cos((2 * Math.PI * (doy + 10)) / 365.25) * DEG;
  const b = (2 * Math.PI * (doy - 81)) / 365;
  const eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
  const cosw = (Math.sin(-0.833 * DEG) - Math.sin(lat * DEG) * Math.sin(decl)) / (Math.cos(lat * DEG) * Math.cos(decl));
  if (!(Math.abs(cosw) < 1)) return null;
  const w = (Math.acos(cosw) / DEG / 15) * 36e5;
  const noon = day - eot * 6e4;
  const local = (t) => {
    const d = new Date(t);
    return d.getHours() + d.getMinutes() / 60;
  };
  const [rise, set] = [local(noon - w), local(noon + w)];
  return rise < set ? [rise, set] : null;
}

const hourNow = () => {
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60;
};

/** The moment at a declared hour: the last one that has started, else the last of the day. */
const at = (hour) => S.list.findLast((m) => m.from <= hour) ?? S.list.at(-1);

/** The hour in use, 0 to 24. */
const hourOf = () => S.p ?? S.n ?? hourNow();

/** An hour moved between the real day and the declared one (`back`: declared to real): the day's turns stretch onto the sun's. */
function warp(hour, back) {
  if (!S.sun || !S.turns) return hour;
  const [a, b] = back ? [S.turns, S.sun] : [S.sun, S.turns];
  return hour < a[0] ? (hour / a[0]) * b[0] : hour < a[1] ? b[0] + ((hour - a[0]) / (a[1] - a[0])) * (b[1] - b[0]) : b[1] + ((hour - a[1]) / (24 - a[1])) * (24 - b[1]);
}

/** The moment now, at the hour in use. */
const momentNow = () => at(warp(hourOf()));

/** The moment a chosen mode shows. */
const defaultOf = (mode) => {
  const base = mode === "light" ? "light" : "dark";
  return S.list.find((m) => m.theme === base && "default" in m.input.dataset) ?? S.list.find((m) => m.theme === base);
};

/** Where a moment's input says it starts, in hours (HH:MM). */
const fromOf = (input) => {
  const [h, m = 0] = input.dataset.from.split(":");
  return +h + +m / 60;
};

function read(owner) {
  S.list = [...owner.querySelectorAll("input[data-from]")]
    .map((input) => ({ name: input.value, from: fromOf(input), theme: input.dataset.theme === "dark" ? "dark" : "light", input }))
    .filter((m) => m.from >= 0 && m.from < 24)
    .sort((a, b) => a.from - b.from);
  // The turns of the day: where the base goes from dark to light and back
  const flips = S.list.filter((m, i) => m.theme !== S.list.at(i - 1).theme);
  const [rise, set] = [flips.find((m) => m.theme === "light"), flips.find((m) => m.theme === "dark")];
  S.turns = rise && set && rise.from < set.from ? [rise.from, set.from] : null;
  const lat = parseFloat(owner.getAttribute("latitude"));
  const lon = parseFloat(owner.getAttribute("longitude"));
  S.sun = S.turns && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? sunHours(lat, lon) : null;
}

const coreOf = () => S.owner?.querySelector("luz-theme-mode");

/** The moment the page shows: the hour's in Auto, else the default of the mode chosen. */
function shown() {
  return inAuto() ? momentNow() : defaultOf(coreOf().mode);
}

/** Bring <html> and the elements to the moment: the base for the mode in Auto, data-moment, the event. */
function update(refresh) {
  if (refresh) coreOf()?.refresh?.();
  const name = shown()?.name;
  const html = document.documentElement;
  if (name) html.dataset.moment = name;
  else delete html.dataset.moment;
  for (const el of S.els) for (const input of el.querySelectorAll("input[data-from]")) input.checked = input.value === name;
  const detail = { moment: name ?? null, pinned: S.n };
  const key = JSON.stringify(detail);
  if (key !== S.k) {
    S.k = key;
    for (const el of S.els) el.dispatchEvent(new CustomEvent("luz-theme-time:change", { bubbles: true, detail }));
  }
}

/** Auto, so that the hour decides; the change this makes in core is not a person's choice. */
function auto() {
  const core = coreOf();
  if (!core || core.choice === "auto") return;
  S.q = true;
  core.choice = "auto";
  S.q = false;
}

const valid = (hour) => typeof hour === "number" && hour >= 0 && hour <= 24;

function preview(hour) {
  if (!S.owner || (hour !== null && !valid(hour))) return false;
  S.p = hour;
  if (hour !== null) auto();
  update(true);
  return true;
}

/** A pinned hour, to the slider's step: a multiple of 5 minutes, at most 23:55. */
const snap = (hour) => Math.min(1435, Math.round(hour * 12) * 5) / 60;

function pin(hour) {
  if (!S.owner || (hour !== null && !valid(hour))) return false;
  S.n = hour === null ? null : snap(hour);
  S.p = null;
  auto();
  if (!S.owner.hasAttribute("no-remember")) store(S.n === null ? null : "" + Math.round(S.n * 60));
  update(true);
  return true;
}

/** The clock only moves the page in Auto: a chosen mode is left as it is. */
const inAuto = () => (coreOf()?.choice ?? "auto") === "auto";

/** Once a minute, at the minute: one timeout, never an interval. */
function tick() {
  const d = new Date();
  S.i = setTimeout(() => {
    if (S.p === null && S.n === null && inAuto()) update(true);
    tick();
  }, 6e4 - d.getSeconds() * 1e3 - d.getMilliseconds());
}

if (typeof customElements !== "undefined" && !customElements.get("luz-theme-time")) {
  customElements.define(
    "luz-theme-time",
    class extends HTMLElement {
      connectedCallback() {
        S.els.push(this);
        this.x = new window.AbortController();
        const options = { signal: this.x.signal };
        // A person's choice of a mode, or of Auto, lets go of a pinned hour
        this.addEventListener(
          "luz-theme-mode:change",
          (e) => {
            if (e.detail.user && !S.q && (S.n !== null || S.p !== null)) {
              S.n = S.p = null;
              store(null);
            }
            update();
          },
          options,
        );
        // The moments as options (show="moments" on a bar): choosing one pins its first hour
        if (this.getAttribute("variant") === "bar" && /\bmoments\b/.test(this.getAttribute("show") ?? "")) {
          this.addEventListener("change", (e) => e.target.matches?.("input[data-from]") && pin(warp(fromOf(e.target), true)), options);
        }
        if (S.owner || !this.querySelector("input[data-from]")) return;
        S.owner = this;
        read(this);
        const saved = store();
        const minutes = /^\d+$/.test(saved) && saved < 1440 ? snap(saved / 60) : null;
        const core = this.querySelector("luz-theme-mode");
        // A pinned hour stands only in Auto, as the boot script applied it
        S.n = minutes !== null && (core?.choice ?? "auto") === "auto" ? minutes : null;
        // Auto asks the hour what it is: the base of the moment now
        if (core) core.autoMode = () => momentNow()?.theme;
        update(true);
        tick();
        document.addEventListener("visibilitychange", () => inAuto() && update(true), options);
      }

      disconnectedCallback() {
        this.x.abort();
        S.els = S.els.filter((el) => el !== this);
        if (S.owner === this) {
          clearTimeout(S.i);
          S.owner = null;
        }
      }

      get hour() {
        return hourOf();
      }

      get moment() {
        return shown()?.name ?? null;
      }

      get pinned() {
        return S.n;
      }

      /** The moments of the page, as the owner declares them: [{ name, from, theme, input }], by hour. */
      get moments() {
        return S.list;
      }

      get place() {
        return this.getAttribute("place") ?? "";
      }

      preview(hour) {
        return preview(hour ?? null);
      }

      pin(hour) {
        return pin(hour ?? null);
      }

      unpin() {
        return pin(null);
      }
    },
  );
}
