/**
 * LUZ Core — color mode: <luz-theme-mode> (light DOM, no Shadow DOM). A lazy
 * chunk: luz.js loads this file (dist/theme-mode.min.js, one file with its own
 * budget, which imports nothing) when the page has a <luz-theme-mode>; a page
 * may also load it on its own ("@luz-ds/core/theme-mode"). It defines the
 * element when it is evaluated.
 *
 * Markup: a native radio group, which works with no script at all (the
 * tokens re-scope the page from the checked radio). Every text is the
 * author's; the script writes none of its own.
 *
 *   <luz-theme-mode>
 *     <fieldset class="luz-theme-mode__group">
 *       <legend class="luz-theme-mode__legend">Color mode</legend>
 *       <label class="luz-theme-mode__option"><input class="luz-theme-mode__input" type="radio" name="luz-theme-mode" value="auto" checked><svg class="luz-theme-mode__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">…</svg>Auto</label>
 *       <label class="luz-theme-mode__option"><input class="luz-theme-mode__input" type="radio" name="luz-theme-mode" value="light">…Light</label>
 *       <label class="luz-theme-mode__option"><input class="luz-theme-mode__input" type="radio" name="luz-theme-mode" value="dark">…Dark</label>
 *       <label class="luz-theme-mode__option"><input class="luz-theme-mode__input" type="radio" name="luz-theme-mode" value="high-contrast">…High contrast</label>
 *     </fieldset>
 *   </luz-theme-mode>
 *
 * With it the element adds one round button (fixed at the end corner of the
 * window; `inline` keeps it in the flow) that steps through the radios and
 * shows the icon of the checked one. Its name is "<legend>: <checked label>",
 * and a hidden status region says the same after a choice. The radios stay
 * underneath as the state.
 *
 * The mode goes to <html> as data-mode (light, dark or high-contrast). With no
 * brand, data-theme takes the same value, as the tokens read it; a page that
 * names a brand (<html data-theme="my-brand">, themes/_template.css) keeps it,
 * and its blocks answer to data-mode. Auto follows the system:
 * prefers-contrast: more, then prefers-color-scheme. If the boot script
 * (theme-boot.js) already wrote data-mode, the first Auto adopts it instead of
 * writing again. The choice is stored under "luz-theme" (Auto removes it)
 * unless the element has `no-remember`.
 *
 * Another script can own what Auto means: it sets `autoMode`, a function that
 * returns "light" or "dark" (or nothing, for the system), and calls
 * `refresh()`. High contrast asked by the system always wins over it.
 *
 * API: `choice` ("auto" | "light" | "dark" | "high-contrast"; set it to
 * choose), `mode` (the one in use), `refresh()`.
 *
 * @element luz-theme-mode - The color mode: Auto, light, dark or high contrast.
 * @attr {boolean} inline - Keep the round button in the flow, not fixed at the end corner.
 * @attr {boolean} no-remember - Do not store the choice.
 * @fires luz-theme-mode:change {CustomEvent} - Bubbles on every change, with detail { mode, auto, user }.
 */

const KEY = "luz-theme";
const MODES = ["light", "dark", "high-contrast"];
const CHOICES = ["auto", ...MODES];

/** Storage may throw (sandboxed iframes): no value reads, null removes, a string stores. */
function store(value) {
  try {
    if (value === undefined) return localStorage.getItem(KEY);
    if (value) localStorage.setItem(KEY, value);
    else localStorage.removeItem(KEY);
  } catch {
    // No persistence, the same page
  }
  return null;
}

const radios = (el) => [...el.querySelectorAll("input[type=radio]")];

/** The mode in use: the choice, or in Auto the system's (or what `autoMode` says). */
function modeOf(el) {
  if (el.c !== "auto") return el.c;
  return el.m[0].matches ? "high-contrast" : el.autoMode?.() || (el.m[1].matches ? "dark" : "light");
}

function render(el, user) {
  const { dataset } = document.documentElement;
  // The first Auto adopts what the boot script wrote, so a clock's mode is not drawn over by the system's
  const mode = (el.f && el.c === "auto" && dataset.mode) || modeOf(el);
  el.f = false;
  dataset.mode = mode;
  // No brand: the tokens read the mode from data-theme. A brand stays.
  if (!dataset.theme || MODES.includes(dataset.theme)) dataset.theme = mode;
  const input = el.querySelector(`input[value="${el.c}"]`);
  if (input) input.checked = true;
  const label = input?.closest("label");
  const icon = label?.querySelector(".luz-theme-mode__icon");
  el.b.replaceChildren(...(icon ? [icon.cloneNode(true)] : []));
  const name = [el.querySelector("legend")?.textContent.trim(), label?.textContent.trim()].filter(Boolean).join(": ");
  el.b.setAttribute("aria-label", name);
  if (user) {
    el.s.textContent = name;
    // Said once: left in the page it would be read again, next to the button, by a screen reader's browse mode
    clearTimeout(el.t);
    el.t = setTimeout(() => (el.s.textContent = ""), 3e3);
  }
  const auto = el.c === "auto";
  if (user || mode + auto !== el.k) {
    el.k = mode + auto;
    el.dispatchEvent(new CustomEvent("luz-theme-mode:change", { bubbles: true, detail: { mode, auto, user: !!user } }));
  }
}

function choose(el, value) {
  el.c = value;
  el.f = false;
  if (el.r) store(value === "auto" ? null : value);
  render(el, true);
  // Another <luz-theme-mode> on the page follows
  for (const other of document.querySelectorAll("luz-theme-mode")) {
    if (other.b && other.c !== value) {
      other.c = value;
      render(other);
    }
  }
}

if (!customElements.get("luz-theme-mode")) {
  customElements.define(
    "luz-theme-mode",
    class extends HTMLElement {
      connectedCallback() {
        // Moved in the page: the same button and listeners
        if (this.b) return render(this);
        this.r = !this.hasAttribute("no-remember");
        const saved = this.r && store();
        this.c = MODES.includes(saved) ? saved : "auto";
        this.f = true;
        this.k = "";
        this.m = [window.matchMedia("(prefers-contrast: more)"), window.matchMedia("(prefers-color-scheme: dark)")];
        for (const q of this.m) q.addEventListener("change", () => this.c === "auto" && render(this));
        // A radio checked by the keyboard or by a script (the button hides them, a page may still click one)
        this.addEventListener("change", (e) => e.target.checked && CHOICES.includes(e.target.value) && e.target.value !== this.c && choose(this, e.target.value));
        const button = document.createElement("button");
        button.type = "button";
        button.className = "luz-theme-mode__button";
        button.classList.toggle("luz-theme-mode__button--fixed", !this.hasAttribute("inline"));
        button.addEventListener("click", () => {
          const values = radios(this).filter((r) => !r.disabled).map((r) => r.value);
          if (values.length) choose(this, values[(values.indexOf(this.c) + 1) % values.length]);
        });
        this.s = document.createElement("span");
        this.s.className = "luz-theme-mode__status";
        this.s.setAttribute("role", "status");
        this.b = button;
        // A radio that has focus when the script arrives is about to be hidden: focus goes to the button, not to the page
        const had = this.contains(document.activeElement);
        this.prepend(button, this.s);
        render(this);
        if (had) button.focus();
      }

      get choice() {
        return this.c;
      }

      set choice(value) {
        if (CHOICES.includes(value)) choose(this, value);
      }

      get mode() {
        return modeOf(this);
      }

      /** Apply again: what `autoMode` returns may have changed. */
      refresh() {
        this.f = false;
        if (this.b) render(this);
      }
    },
  );
}
