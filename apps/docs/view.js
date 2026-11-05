/**
 * LUZ documentation site — the Code / Design tab a reader chose last.
 *
 * Component and pattern pages have two tabs, Code (the default) and Design:
 * core's tabs.js upgrades them (`.luz-tabs` with `data-docs-view` on each
 * tab). A page of controls (`parts: controls`, the Form fields page) has one
 * row per control: they all follow the one choice. This docs-only glue
 * remembers the reader's choice across pages:
 *
 * - Which tab opens: the URL fragment's (tabs.js), else the stored one, else
 *   Code (a11y.md TAB-11). Call initDocsView() before initTabs(): it only
 *   marks the stored tab aria-selected="true", which initTabs() honours.
 * - Restoring is silent: no focus move, no URL or history change (TAB-13).
 * - A choice in one row moves the other rows to it, silently too, and the
 *   page keeps the clicked tab where it was on the screen.
 * - Only an explicit choice is stored, a click or a key press on a tab; a tab
 *   opened by a fragment, a link or find in page is not (TAB-14).
 * - One key, "luz-docs-view", and only "code" or "design" is read back:
 *   every page of an account's GitHub Pages shares one origin, so the value
 *   is untrusted (security.md SEC-MISC-1). Storage that is blocked or throws
 *   leaves the default (PRINCIPLES.md §8).
 */

export const VIEW_KEY = "luz-docs-view";
export const VIEWS = ["code", "design"];

/** The stored view, or null when there is none, it is not allowed, or storage throws. */
export function readView(storage) {
  try {
    // Reading window.localStorage itself throws where storage is blocked
    const value = (storage ?? globalThis.localStorage).getItem(VIEW_KEY);
    return VIEWS.includes(value) ? value : null;
  } catch {
    return null;
  }
}

/** Store a view; anything but "code" or "design" is ignored. Never throws. */
export function saveView(value, storage) {
  if (!VIEWS.includes(value)) return;
  try {
    (storage ?? globalThis.localStorage).setItem(VIEW_KEY, value);
  } catch {
    // Blocked storage: the choice lasts for this page only
  }
}

/** Keys with which core's tabs.js changes the selected tab. */
const SELECTING_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", " ", "Enter"]);

/** Mark the stored tab selected (before initTabs) and store the reader's choices (after it). */
export function initDocsView() {
  const tabs = [...document.querySelectorAll(".luz-tab[data-docs-view]")];
  if (!tabs.length) return;

  // Every row of tabs (one on most pages, one per control on a page of controls) opens on the stored tab
  const stored = readView();
  if (stored) {
    for (const row of new Set(tabs.map((t) => t.closest(".luz-tabs")))) {
      row?.querySelector(`.luz-tab[data-docs-view="${stored}"]`)?.setAttribute("aria-selected", "true");
    }
  }

  let syncing = false;
  // Registered before tabs.js binds its own listeners, so it reads the
  // selection once they have run: wait for the end of the event
  const remember = (e) => {
    const tab = e.target.closest?.(".luz-tab[data-docs-view]");
    if (!tab || syncing) return;
    if (e.type === "keydown" && !SELECTING_KEYS.has(e.key)) return;
    setTimeout(() => {
      // The one the reader acted on: the row's selected tab, not the first selected of the page
      const selected = tab.closest(".luz-tabs")?.querySelector('.luz-tab[aria-selected="true"]');
      if (!selected) return;
      saveView(selected.dataset.docsView);
      follow(selected);
    });
  };

  // The other rows move to the chosen view through tabs.js's own click (no focus move, no history); the rows above the
  // clicked tab change height, so the page is scrolled back by what the clicked control's block moved
  const follow = (selected) => {
    const others = tabs.filter((t) => t.dataset.docsView === selected.dataset.docsView && t.getAttribute("aria-selected") === "false" && t.closest(".luz-tabs") !== selected.closest(".luz-tabs"));
    if (!others.length) return;
    // The tab row sticks under the header, so it does not tell where the page moved: its container does
    const anchor = selected.closest(".luz-tabs").parentElement;
    const top = anchor.getBoundingClientRect().top;
    // Where the browser anchors its scroll it would also move the page: the one correction is ours
    const root = document.documentElement;
    root.style.overflowAnchor = "none";
    syncing = true;
    for (const t of others) t.click();
    syncing = false;
    const moved = anchor.getBoundingClientRect().top - top;
    if (moved) window.scrollBy({ top: moved, behavior: "instant" });
    requestAnimationFrame(() => root.style.removeProperty("overflow-anchor"));
  };
  document.addEventListener("click", remember);
  document.addEventListener("keydown", remember);
}
