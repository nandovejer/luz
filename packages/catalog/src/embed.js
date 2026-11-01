/**
 * LUZ Catalog — embed: a light facade for a player of another origin, in a
 * custom element, <luz-embed> (light DOM, no Shadow DOM). A lazy chunk:
 * catalog.js loads this file (dist/embed.min.js, one file with its own
 * budget, which loads nothing else) when the page is scanned and has a
 * <luz-embed>, so no other page pays for it; a page may also load it on its
 * own ("@luz-ds/catalog/embed").
 *
 * The script builds no address and names no provider: `src` is the full
 * address of the player, written by the author, and the poster is the
 * author's own image. The page asks nothing of the other origin until the
 * visitor acts (pointer over the button, focus on it, or a click), and, when
 * `consent` names a category, until the visitor has granted it. Every text
 * is authored in the HTML: the script writes none.
 *
 *   <luz-embed src="https://player.example/embed/ID?autoplay=1" consent="external">
 *     <a class="luz-embed__link" href="https://example.com/watch/ID">
 *       <img class="luz-embed__poster" src="/media/poster.jpg" alt="" width="1280" height="720" loading="lazy">
 *       <span class="u-sr-only">Play video: </span>
 *       <span class="luz-embed__title">Title of the video</span>
 *     </a>
 *     <div class="luz-embed__ask" data-luz-embed-ask hidden>
 *       <p>This video plays from an outside service, which learns your IP address and may set cookies.</p>
 *       <div class="o-actions">
 *         <button class="luz-btn luz-btn--primary" type="button" value="once">Play this video</button>
 *         <button class="luz-btn luz-btn--secondary" type="button" value="always">Always play videos from this service</button>
 *         <button class="luz-btn luz-btn--ghost" type="button" value="cancel">Not now</button>
 *       </div>
 *     </div>
 *   </luz-embed>
 *
 * Without JavaScript, or when `src` is not an https address or one of the
 * page's own origin, or when `consent` is not granted and there is no ask
 * block, it stays the link, which opens the video where it lives. With it,
 * the link becomes a button (same children, same name), and data-luz-state
 * says where it is: "ready" (poster and button), "ask" (the question, focus
 * on its first button) and "playing" (the iframe, focus inside it). Escape
 * does nothing: "cancel" is the way back. "always" merges the category into the
 * record in localStorage, under "luz-consent" or data-luz-consent-key (it must
 * start with "luz-"), as the cookie banner does (each keeps the other's
 * categories), for the days of a [data-luz-consent-days] on the page (180 by
 * default, 395 at most), and dispatches `luz:consent` on document with
 * { asked, granted, withdrawn, expires, given, policy? }, which unlocks every
 * other embed with that category.
 *
 * @element luz-embed - A poster that loads a player on request.
 * @attr {string} src - The full address of the player, https or of the page's origin; anything else leaves the link.
 * @attr {string} consent - The cookie consent category the player needs; without it granted, the click asks first.
 * @attr {string} data-luz-consent-key - Storage key of the choice; it starts with luz-.
 * @attr {number} data-luz-consent-days - On the cookie banner of the page: days "always" lasts, 180 by default and 395 at most.
 * @attr {string} data-luz-consent-policy - On the cookie banner of the page: version of the policy shown, stored with "always".
 * @attr {boolean} data-luz-embed-ask - On the block with the question: buttons once, always, cancel.
 * @fires luz:consent {CustomEvent} - On document when "always" is chosen; detail is { asked, granted, withdrawn, expires, given, policy? }.
 */

const KEY = /^luz-[\w-]+$/;
const NAME = /^[a-z][a-z\d-]{0,31}$/;
const wired = new WeakSet();
const near = new Set();
const given = new Set();

/**
 * The address of the player, or null: https, or http/https of the page's own
 * origin. Never a javascript: or data: address, or an http one elsewhere.
 * @param {Element} el a <luz-embed>
 */
export function playerURL(el) {
  try {
    const src = el.getAttribute("src");
    const url = src && new URL(src, document.baseURI);
    if (url && (url.protocol === "https:" || (url.protocol === "http:" && url.origin === location.origin))) return url.href;
  } catch {
    // Missing or not an address: the link stays
  }
  return null;
}

const key = (el) => (KEY.test(el.dataset.luzConsentKey) ? el.dataset.luzConsentKey : "luz-consent");

const read = (el) => {
  try {
    const { version, expires, asked, granted } = JSON.parse(localStorage.getItem(key(el)));
    if (version === 1 && expires > Date.now() && asked.every((n) => NAME.test(n)) && granted.every((n) => asked.includes(n))) return { asked, granted };
  } catch {
    // Nothing stored, not JSON, or storage blocked
  }
  return { asked: [], granted: [] };
};

// What other embeds and the banner grant in this page, when storage is blocked
document.addEventListener("luz:consent", (e) => {
  e.detail?.withdrawn?.forEach((n) => given.delete(n));
  e.detail?.granted?.forEach((n) => given.add(n));
});

const wire = (host) => {
  const link = host.querySelector(".luz-embed__link");
  const ask = host.querySelector("[data-luz-embed-ask]");
  const need = host.getAttribute("consent");
  const url = playerURL(host);
  const allowed = () => need === null || (NAME.test(need) && (given.has(need) || read(host).granted.includes(need)));
  if (!url || !link || wired.has(host) || (!allowed() && !ask)) return;
  wired.add(host);

  const play = document.createElement("button");
  play.type = "button";
  play.className = "luz-embed__play";
  play.append(...link.childNodes);
  link.replaceWith(play);
  let state = "ready";
  host.setAttribute("data-luz-state", state);

  const warm = () => {
    const { origin } = new URL(url);
    if (state !== "ready" || !allowed() || near.has(origin)) return;
    near.add(origin);
    const hint = document.createElement("link");
    hint.rel = "preconnect";
    hint.href = origin;
    document.head.append(hint);
  };
  host.addEventListener("pointerover", warm);
  host.addEventListener("focusin", warm);

  const show = (next) => {
    state = next;
    host.setAttribute("data-luz-state", state);
    play.hidden = state !== "ready";
    if (ask) ask.hidden = state !== "ask";
  };

  const start = () => {
    const frame = document.createElement("iframe");
    frame.src = url;
    frame.title = (host.querySelector(".luz-embed__title") ?? play).textContent.trim();
    frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    frame.allowFullscreen = true;
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    host.append(frame);
    show("playing");
    frame.focus();
  };

  play.addEventListener("click", () => {
    if (allowed()) return start();
    show("ask");
    ask.querySelector("button")?.focus();
  });

  ask?.addEventListener("click", (e) => {
    const how = e.target.closest?.("button")?.value;
    if (how === "cancel") {
      show("ready");
      play.focus();
    } else if (how === "once") start();
    else if (how === "always" && NAME.test(need)) {
      const stored = read(host);
      const days = Math.min(+document.querySelector("[data-luz-consent-days]")?.dataset.luzConsentDays || 180, 395);
      const policy = document.querySelector("[data-luz-consent-policy]")?.dataset.luzConsentPolicy;
      const record = { asked: [...new Set([...stored.asked, need])], granted: [...new Set([...stored.granted, need])], expires: Date.now() + days * 864e5, given: new Date().toISOString() };
      if (/^[\w.-]{1,32}$/.test(policy ?? "")) record.policy = policy;
      const detail = { ...record, withdrawn: [] };
      try {
        localStorage.setItem(key(host), JSON.stringify({ version: 1, ...record }));
      } catch {
        // Storage blocked: the choice holds for this page only
      }
      document.dispatchEvent(new CustomEvent("luz:consent", { detail }));
      start();
    }
  });
};

// <luz-embed> wraps the poster. Defined once, whatever the number of copies
// of this file (SEC-CHUNK-5), and only where there is a DOM, so importing
// this module in Node is harmless.
if (typeof customElements < "u" && !customElements.get("luz-embed")) {
  customElements.define("luz-embed", class extends HTMLElement {
    connectedCallback() {
      wire(this);
    }
  });
}
