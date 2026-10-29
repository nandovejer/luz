/**
 * <home-light>: the light of the visitor's sky on the home page. It draws the
 * sun and the moon where the visitor is, from the time zone of the browser's
 * clock (Intl, never the network or GPS), over a globe (<home-globe>,
 * globe.js). A line under the globe opens a bar (closed at rest at every width; the
 * line toggles it): catalog's <luz-theme-time variant="bar">, the slider to scrub the day
 * and nothing else (a show attribute on <home-light>, "time place saved", would
 * add the hour, the place and the note; a screen reader hears the note anyway). Letting the slider go pins its hour: the page keeps that light,
 * on a reload too, until a mode or Auto is chosen with the button; a short
 * "Saved" notice says so. This element only follows the hour the bar holds.
 * Only the system's prefers-reduced-motion stops the motion (RL-8); the
 * element has no control to pause it and stores nothing.
 *
 *   <home-light bleed favicon></home-light>
 *
 * bleed     the visual runs to the edges of the page's frame (light.css)
 * favicon   the tab's icon follows the sky (a data: URL of an SVG)
 *
 * <luz-theme-mode> and <luz-theme-time> are the only writers of data-mode,
 * data-theme and data-moment: this element writes none. It builds the bar,
 * follows its hour (the bar's input and change events, and luz-theme-time:change)
 * and draws the sun and the moon at it; without catalog's chunks the bar is
 * empty and the visuals show now. On <html> it writes custom properties only:
 * --sun-alt, --sun-az (degrees), --sun-x (the sun, left to right) and
 * --day-left (the share of today's daylight to come).
 *
 * Its texts are the page's: data-luz-label-light-* on the element or an
 * ancestor (the home's <body>, from apps/landing/i18n). It imports nothing
 * statically: the globe is its own file, loaded once the element is built.
 * The rules are apps/landing/light/light.css.
 */

const DEG = Math.PI / 180;
// A place for each common time zone, latitude and longitude; another zone gets its offset's meridian at 30°
const PLACES = {
  "Europe/Madrid": [40.42, -3.7], "Atlantic/Canary": [28.1, -15.4], "Europe/Lisbon": [38.72, -9.14],
  "Europe/London": [51.5, -0.12], "Europe/Dublin": [53.35, -6.26], "Europe/Paris": [48.86, 2.35],
  "Europe/Brussels": [50.85, 4.35], "Europe/Amsterdam": [52.37, 4.9], "Europe/Berlin": [52.52, 13.4],
  "Europe/Zurich": [47.38, 8.54], "Europe/Vienna": [48.21, 16.37], "Europe/Rome": [41.9, 12.5],
  "Europe/Prague": [50.08, 14.44], "Europe/Warsaw": [52.23, 21.01], "Europe/Copenhagen": [55.68, 12.57],
  "Europe/Oslo": [59.91, 10.75], "Europe/Stockholm": [59.33, 18.07], "Europe/Helsinki": [60.17, 24.94],
  "Europe/Athens": [37.98, 23.73], "Europe/Istanbul": [41.01, 28.98], "Europe/Kyiv": [50.45, 30.52],
  "Europe/Moscow": [55.76, 37.62], "Africa/Casablanca": [33.57, -7.59], "Africa/Algiers": [36.75, 3.06],
  "Africa/Cairo": [30.04, 31.24], "Africa/Lagos": [6.52, 3.38], "Africa/Nairobi": [-1.29, 36.82],
  "Africa/Johannesburg": [-26.2, 28.05], "America/New_York": [40.71, -74.01], "America/Toronto": [43.65, -79.38],
  "America/Chicago": [41.88, -87.63], "America/Denver": [39.74, -104.99], "America/Phoenix": [33.45, -112.07],
  "America/Los_Angeles": [34.05, -118.24], "America/Vancouver": [49.28, -123.12],
  "America/Mexico_City": [19.43, -99.13], "America/Bogota": [4.71, -74.07], "America/Lima": [-12.05, -77.04],
  "America/Santiago": [-33.45, -70.67], "America/Caracas": [10.48, -66.9],
  "America/Argentina/Buenos_Aires": [-34.6, -58.38], "America/Sao_Paulo": [-23.55, -46.63],
  "America/Montevideo": [-34.9, -56.16], "America/Havana": [23.11, -82.37], "Asia/Jerusalem": [31.77, 35.21],
  "Asia/Riyadh": [24.71, 46.68], "Asia/Dubai": [25.2, 55.27], "Asia/Tehran": [35.69, 51.39],
  "Asia/Karachi": [24.86, 67.01], "Asia/Kolkata": [19.08, 72.88], "Asia/Dhaka": [23.81, 90.41],
  "Asia/Bangkok": [13.76, 100.5], "Asia/Jakarta": [-6.21, 106.85], "Asia/Singapore": [1.35, 103.82],
  "Asia/Manila": [14.6, 120.98], "Asia/Hong_Kong": [22.32, 114.17], "Asia/Shanghai": [31.23, 121.47],
  "Asia/Taipei": [25.03, 121.57], "Asia/Seoul": [37.57, 126.98], "Asia/Tokyo": [35.68, 139.69],
  "Australia/Perth": [-31.95, 115.86], "Australia/Melbourne": [-37.81, 144.96], "Australia/Sydney": [-33.87, 151.21],
  "Australia/Brisbane": [-27.47, 153.03], "Pacific/Auckland": [-36.85, 174.76], "Pacific/Honolulu": [21.31, -157.86],
};

/* ---- The sky, from the clock alone ---- */

/** The sun at instant t: its declination, the equation of time (minutes) and its unit vector in the Earth's frame. */
function solar(t) {
  const d = new Date(t);
  const doy = (t - Date.UTC(d.getUTCFullYear(), 0, 0)) / 864e5;
  const decl = -23.44 * Math.cos((2 * Math.PI * (doy + 10)) / 365.25) * DEG;
  const B = (2 * Math.PI * (doy - 81)) / 365;
  const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  const h = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600 + eot / 60;
  const lon = (12 - h) * 15 * DEG;
  return { decl, eot, vec: [Math.cos(decl) * Math.sin(lon), Math.sin(decl), Math.cos(decl) * Math.cos(lon)] };
}

/** Sunrise and sunset (ms) of the civil day { year, month, day } at a place, and the hours of light. */
function sunTimes(lat, lon, c) {
  const guess = Date.UTC(c.year, c.month - 1, c.day, 12) - (lon / 15) * 36e5;
  const { decl, eot } = solar(guess);
  const noon = guess - eot * 6e4, phi = lat * DEG;
  const cosw = (Math.sin(-0.833 * DEG) - Math.sin(phi) * Math.sin(decl)) / (Math.cos(phi) * Math.cos(decl));
  if (cosw > 1) return { hours: 0 };
  if (cosw < -1) return { hours: 24 };
  const w = Math.acos(cosw) / DEG / 15;
  return { rise: noon - w * 36e5, set: noon + w * 36e5, hours: 2 * w };
}

/** The moon's age (0 new, 0.5 full) and the share of it that is lit. */
function moonPhase(t) {
  const age = ((((t - Date.UTC(2000, 0, 6, 18, 14)) / (29.530588853 * 864e5)) % 1) + 1) % 1;
  return { age, lit: (1 - Math.cos(2 * Math.PI * age)) / 2 };
}

/** The wall clock of a zone at instant t. */
function partsIn(tz, t) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
  const o = {};
  for (const p of f.formatToParts(new Date(t))) if (p.type !== "literal") o[p.type] = +p.value;
  o.hour %= 24;
  return o;
}

function zone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz.includes("/") && !tz.startsWith("Etc/")) return tz;
  } catch {
    // No usable zone: the fallback
  }
  return "Europe/Madrid";
}

function placeFor(tz, t) {
  if (PLACES[tz]) return { lat: PLACES[tz][0], lon: PLACES[tz][1] };
  const p = partsIn(tz, t);
  const offset = (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(t / 1000) * 1000) / 36e5;
  return { lat: 30, lon: offset * 15 };
}

/** The lit part of a moon of radius r at (cx, cy), as path data. */
function moonPath(age, cx, cy, r) {
  const c = Math.cos(2 * Math.PI * age), right = age < 0.5, rx = Math.max(0.01, r * Math.abs(c));
  return `M${cx} ${cy - r}A${r} ${r} 0 0 ${right ? 1 : 0} ${cx} ${cy + r}A${rx} ${r} 0 0 ${right === c > 0 ? 0 : 1} ${cx} ${cy - r}Z`;
}

/** An element with attributes and, optionally, text. */
function h(tag, attrs = {}, text = "") {
  const n = document.createElement(tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (text) n.textContent = text;
  return n;
}

let uid = 0;

class LuzLight extends HTMLElement {
  constructor() {
    super();
    this._sim = 0; // the offset of the simulated instant, in ms; 0 is now
  }

  connectedCallback() {
    if (!this._stage) this._build();
    this._tick();
    this._abort = new window.AbortController();
    const signal = this._abort.signal;
    // The page's hour is the bar's: while the slider moves, when it is let go, and when a mode or Auto lets it go
    for (const type of ["input", "change", "luz-theme-time:change"]) this._bar.addEventListener(type, () => this._tick(), { signal });
    document.addEventListener("pointerdown", (e) => this._bar && !this._bar.contains(e.target) && !this._line.contains(e.target) && this.close(), { signal });
    document.addEventListener(
      "keydown",
      (e) => {
        // eslint-disable-next-line no-restricted-syntax -- RL-3: the bar is a disclosure in the flow, not a dialog or a popover (a popover drifted from its line on scroll), so Escape is closed here
        if (e.key === "Escape" && !this._bar.hidden) {
          const inside = this.contains(document.activeElement);
          this.close();
          if (inside) this._line.focus();
        }
      },
      { signal },
    );
    document.addEventListener("visibilitychange", () => !document.hidden && this._tick(), { signal });
  }

  disconnectedCallback() {
    this._abort.abort();
    clearTimeout(this._timer);
    clearTimeout(this._favTimer);
  }

  /** A text of the page: data-luz-label-light-<key> here or on an ancestor. */
  _text(key) {
    const name = `data-luz-label-light-${key}`;
    return this.closest(`[${name}]`)?.getAttribute(name) ?? "";
  }

  open() {
    this._show();
    // The bar opens inside the window: a small screen scrolls just enough to show it all
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this._bar.scrollIntoView({ block: "nearest", behavior: still ? "auto" : "smooth" });
  }

  _show() {
    this._bar.hidden = false;
    this._line.setAttribute("aria-expanded", "true");
  }

  /** Close the bar; a pinned hour stays. */
  close() {
    if (this._bar.hidden) return;
    this._bar.hidden = true;
    this._line.setAttribute("aria-expanded", "false");
  }

  _build() {
    this._tz = zone();
    // The line's phrase: one of the page's facts about the speed of light (fact-1, fact-2…), at random on each load
    let facts = 0;
    while (this._text(`fact-${facts + 1}`)) facts++;
    this._fact = 1 + Math.floor(Math.random() * facts);
    this._place = placeFor(this._tz, Date.now());
    const { lat, lon } = this._place, la = lat * DEG, lo = lon * DEG;
    this._placeVec = [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)];
    this._east = [Math.cos(lo), 0, -Math.sin(lo)];
    this._north = [-Math.sin(la) * Math.sin(lo), Math.cos(la), -Math.sin(la) * Math.cos(lo)];
    const id = `home-light-${++uid}`;
    this._stage = h("div", { class: "home-light__stage" });
    this._stage.append(h("div", { class: "home-light__glow", "aria-hidden": "true" }));
    const foot = h("div", { class: "home-light__foot" });
    // catalog's bar: the place, the moment, the hour and the slider (theme-time-bar.js builds them), 
    const bar = (this._bar = h("luz-theme-time", { class: "home-light__bar", variant: "bar", id: `${id}-bar`, hidden: "", "data-luz-label-scrub": this._text("scrub"), "data-luz-label-saved": this._text("saved") }));
    // The bar is the slider alone. <home-light show="time place saved"> would bring back the hour, the place (the city of the time zone) and the note
    const show = this.getAttribute("show");
    if (show) {
      bar.setAttribute("show", show);
      const city = this._tz.includes("/") && !this._tz.startsWith("Etc/") ? this._tz.split("/").pop().replace(/_/g, " ") : "";
      if (city && /\bplace\b/.test(show)) bar.setAttribute("place", city);
    }
    this._line = h("button", { type: "button", class: "home-light__line", "aria-expanded": "false", "aria-controls": bar.id });
    // The phrase alone; the light and the hour are in the bar
    this._q = h("span", { class: "home-light__q" });
    this._say = h("span", { class: "home-light__sr" });
    this._line.append(this._q, this._say);
    this._line.addEventListener("click", () => (this._bar.hidden ? this.open() : this.close()));
    // The bar after the line, so Tab from the line lands in it; light.css draws it above
    foot.append(this._line, bar);
    this.append(this._stage, foot);

    if (this.hasAttribute("favicon")) {
      this._favicon = document.querySelector('link[rel~="icon"][type="image/svg+xml"]') || document.querySelector('link[rel~="icon"]');
      if (!this._favicon) document.head.append((this._favicon = h("link", { rel: "icon", type: "image/svg+xml" })));
    }

    // The globe: its own file, loaded once
    import("./globe.js").then(() => {
      const { lat, lon } = this._place;
      const globe = h("home-globe", { spin: "", here: "", glint: "", rim: "", lat, lon, "aria-label": this._text("globe-alt") });
      globe.addEventListener("home-globe:sun", (e) => this._setSunX(50 + 32 * e.detail.x));
      this._globe = globe;
      this._stage.append(globe);
      this._tick();
    });
  }

  /** The hour the bar holds (a preview, a pinned hour, or now), as the offset of the simulated instant from now. */
  _at() {
    const hour = this._bar.hour;
    if (typeof hour !== "number") return (this._sim = 0);
    const p = partsIn(this._tz, Date.now());
    this._sim = (hour - (p.hour + p.minute / 60 + p.second / 3600)) * 36e5;
    this._line.dataset.preview = String(this._bar.pinned !== null && this._bar.pinned !== undefined);
  }

  _setSunX(x) {
    if (!this.isConnected) return;
    const value = x.toFixed(1) + "%";
    this.style.setProperty("--_sun-x", value);
    document.documentElement.style.setProperty("--sun-x", value);
  }

  /** The sun's altitude and azimuth (degrees) at the place, at instant t. */
  _sun(t) {
    const v = solar(t).vec, p = this._placeVec, e = this._east, n = this._north;
    const alt = Math.asin(p[0] * v[0] + p[1] * v[1] + p[2] * v[2]) / DEG;
    const az = (Math.atan2(v[0] * e[0] + v[2] * e[2], v[0] * n[0] + v[1] * n[1] + v[2] * n[2]) / DEG + 360) % 360;
    return { alt, az, vec: v };
  }

  /** Bring everything to the (simulated) instant, then again at the next minute. */
  _tick() {
    clearTimeout(this._timer);
    // Detached: no timer, no write to the page
    if (!this.isConnected) return;
    this._at();
    const now = Date.now(), t = now + this._sim, p = partsIn(this._tz, t);
    this._timer = setTimeout(() => this._tick(), 6e4 - (now % 6e4));
    const root = document.documentElement, rs = root.style;
    const say = this._text(`fact-${this._fact}`);
    this._q.textContent = say;
    this._q.hidden = !say;

    this._say.textContent = `. ${this._text("open")}`;

    const { alt, az, vec } = this._sun(t);
    rs.setProperty("--sun-alt", alt.toFixed(2));
    rs.setProperty("--sun-az", az.toFixed(2));
    if (!this._globe) this._setSunX(50 + 32 * Math.sin(az * DEG));
    const st = sunTimes(this._place.lat, this._place.lon, p);
    const left = st.hours > 0 && st.hours < 24 ? Math.min(1, Math.max(0, (st.set - t) / (st.set - st.rise))) : st.hours ? 1 : 0;
    rs.setProperty("--day-left", (left * 100).toFixed(1) + "%");

    const { age } = moonPhase(t);
    if (this._globe) this._globe.sun = vec;
    if (this._favicon) this._updateFavicon(-Math.max(-8, Math.min(15, alt)) * 0.6, alt < -6, age);
  }

  /** The tab's icon: the sun over the horizon by day, the moon by night, in the page's colours. */
  _updateFavicon(sunY, moonUp, age) {
    clearTimeout(this._favTimer);
    this._favTimer = setTimeout(() => {
      const css = getComputedStyle(document.body), ink = css.color, bg = css.backgroundColor;
      const moon = moonUp ? `<path d="${moonPath(age, 16, 11, 6)}" fill="${ink}"/>` : "";
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="${bg}"/><clipPath id="c"><rect width="32" height="19"/></clipPath><circle clip-path="url(#c)" cx="16" cy="${(19 + sunY * 1.6).toFixed(1)}" r="6.5" fill="${ink}"/>${moon}<path d="M6 19h20" stroke="${ink}" stroke-width="2" stroke-linecap="round"/></svg>`;
      this._favicon.href = "data:image/svg+xml," + encodeURIComponent(svg);
    }, 1500);
  }
}

if (!customElements.get("home-light")) customElements.define("home-light", LuzLight);
