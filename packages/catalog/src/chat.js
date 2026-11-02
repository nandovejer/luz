/**
 * LUZ Catalog — chat (EXPERIMENTAL): a conversation in the style of a
 * messaging app, in a custom element, <luz-chat> (light DOM, no Shadow DOM).
 * It is only the look and the keyboard of a chat: it does not know who
 * answers. A provider does (the language model of the browser, an API of
 * your own, anything that follows the contract below). A lazy chunk:
 * catalog.js loads this file (dist/chat.min.js, one file with its own budget,
 * which loads nothing else) when the page is scanned and has a <luz-chat>; a
 * page may also load it on its own ("@luz-ds/catalog/chat").
 *
 * The provider is the first child element that has an `ask()` method, or
 * whatever you give to `chat.provider` from JavaScript:
 *
 *   <luz-chat assistant-name="Ask the docs">
 *     <p>The chat needs JavaScript. <a href="/docs/">Read the documentation</a>.</p>
 *     <my-provider></my-provider>
 *     <ul data-luz-chat-suggestions><li><button type="button">How do I install it?</button></li></ul>
 *   </luz-chat>
 *
 * The children that are not the provider, a template or the questions are
 * what the page shows without JavaScript, or when there is no provider that
 * can answer. With it the chat is built after them: a header with a title
 * and the settings (a native <details>), the conversation, the questions to
 * try, the field and a line under it. The conversation is kept in memory
 * only.
 *
 * The contract of a provider (an object or an element):
 *   ask(messages, { signal })  required. `messages` is the whole conversation,
 *                [{ role: "user" | "assistant", content }]. Returns an async
 *                iterable of text (what is new, not the answer so far) and of
 *                { sources: [{ title, url }] } (the pages the answer comes
 *                from, once). It throws an error with a `name` and a `message`
 *                when it cannot answer; aborting `signal` stops it.
 *   reset()      optional: the conversation was cleared.
 *   state        optional, "ready" without it: { status, message?, body?,
 *                progress?, action? }. `status` is "pending" (finding out),
 *                "unavailable" (no `message`: the page's own children show
 *                instead; with one, it is told in the conversation), "action"
 *                (a step is needed: `action` is { label, run }, run from the
 *                visitor's click), "busy" (`progress` from 0 to 1, or none;
 *                `action` may be Cancel), "off" (turned off; `action` turns it
 *                on) or "ready". `message` is text and `body` text or a node
 *                (cloned each time it is shown).
 *   settings     optional: [{ label, run }], buttons of the settings.
 *   info         optional: [{ label?, text?, node?, meter?: { value, max } }],
 *                what the settings tell the visitor.
 *   note         optional: the line under the field ("it can be wrong").
 *   persona      optional: { name }, who the assistant is.
 *   "change"     if it is an EventTarget, an event when any of the above
 *                changed.
 *
 * What the model writes is shown as Markdown built from DOM nodes, never
 * HTML; a link is a link only when it goes to one of the `sources` of that
 * answer. The answer is typed (at once with reduced motion), and "typing"
 * dots show until its first words arrive. For a screen reader the log is
 * not announced word by word: a status line says "Thinking…" and, at the end,
 * "Answer ready".
 *
 * Texts: a short English and Spanish dictionary here, each replaced by
 * `data-luz-label-<key>` on the element or an ancestor (EX-014).
 *
 * @element luz-chat - A messaging-style chat that talks to a provider: the language model of the browser, an API, anything. Experimental.
 * @attr {"send"|"newline"} [enter=send] - What Enter does in the field: send (Shift+Enter breaks the line), or break the line (the button sends).
 * @attr {number} maxlength - The longest message; the count shows only near the limit.
 * @attr {"markdown"|"text"} [format=markdown] - How an answer is shown: as Markdown, or as plain text.
 * @attr {string} assistant-name - The name of the assistant; the provider's by default.
 * @attr {string} user-name - The name of the visitor; "You" by default.
 * @attr {string} data-luz-chat-suggestions - On a <ul> of buttons: questions to try, each button sends its text.
 * @attr {string} data-luz-chat-note - On a <template>: the line under the field, in place of the provider's; empty, none.
 * @attr {string} data-luz-state - Written by the script: the status of the provider.
 * @attr {string} data-luz-label-title - The text for "title", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-assistant - The text for "assistant", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-you - The text for "you", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-question - The text for "question", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-placeholder - The text for "placeholder", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-send - The text for "send", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-stop - The text for "stop", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-copy - The text for "copy", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-copied - The text for "copied", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-sources - The text for "sources", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-suggestions - The text for "suggestions", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-conversation - The text for "conversation", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-thinking - The text for "thinking", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-done - The text for "done", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-stopped - The text for "stopped", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-error - The text for "error", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-settings - The text for "settings", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-clear - The text for "clear", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-empty - The text for "empty", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-latest - The text for "latest", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-retry - The text for "retry", on the element or an ancestor; the language's own by default.
 */

import { renderMarkdown } from "./chat-markdown.js";

// luz-exception: EX-014 — the chat's own short strings (English and Spanish), so the chunk loads without core's i18n
const DICT = {
  en: {
    title: "Chat",
    assistant: "Assistant",
    you: "You",
    question: "Your message",
    placeholder: "Write a message",
    send: "Send",
    stop: "Stop",
    copy: "Copy answer",
    copied: "Copied",
    sources: "Sources",
    suggestions: "Try asking",
    conversation: "Conversation",
    thinking: "Thinking…",
    done: "Answer ready",
    stopped: "Stopped",
    error: "No answer. Try again.",
    settings: "Settings",
    clear: "Clear the conversation",
    empty: "Write a message to start.",
    latest: "New messages",
    retry: "Try again",
  },
  es: {
    title: "Chat",
    assistant: "Asistente",
    you: "Tú",
    question: "Tu mensaje",
    placeholder: "Escribe un mensaje",
    send: "Enviar",
    stop: "Detener",
    copy: "Copiar respuesta",
    copied: "Copiado",
    sources: "Fuentes",
    suggestions: "Prueba a preguntar",
    conversation: "Conversación",
    thinking: "Pensando…",
    done: "Respuesta lista",
    stopped: "Detenido",
    error: "Sin respuesta. Inténtalo de nuevo.",
    settings: "Ajustes",
    clear: "Borrar la conversación",
    empty: "Escribe un mensaje para empezar.",
    latest: "Mensajes nuevos",
    retry: "Reintentar",
  },
};

// eslint-disable-next-line no-restricted-syntax -- RL-12: the SVG namespace name, an identifier that is never fetched
const SVG = "http://www.w3.org/2000/svg";
let serial = 0;

/** An element with classes, attributes and children (text or nodes). */
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [name, value] of Object.entries(props || {})) {
    if (value === false || value === null || value === undefined) continue;
    if (name === "class") el.className = value;
    else el.setAttribute(name, value === true ? "" : value);
  }
  el.append(...kids.filter((k) => k !== null && k !== undefined && k !== false));
  return el;
}

/** The icon of the settings: three sliders, drawn here (the script writes no markup). */
function icon() {
  const svg = document.createElementNS(SVG, "svg");
  for (const [name, value] of [["viewBox", "0 0 24 24"], ["width", "20"], ["height", "20"], ["fill", "none"], ["stroke", "currentColor"], ["stroke-width", "1.5"], ["stroke-linecap", "round"], ["aria-hidden", "true"], ["focusable", "false"]]) svg.setAttribute(name, value);
  const path = document.createElementNS(SVG, "path");
  path.setAttribute("d", "M4 7h9M17 7h3M4 12h3M11 12h9M4 17h11M19 17h1M15 5v4M9 10v4M17 15v4");
  svg.append(path);
  return svg;
}

/** An http(s) address, or nothing: an image address is the author's, but never a javascript: or data: one. */
function webAddress(raw) {
  try {
    const url = new URL(raw, document.baseURI);
    return /^https?:$/.test(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

/** The address of a page, without its fragment. */
const pageOf = (raw) => {
  const url = webAddress(raw);
  return url && url.split("#")[0];
};

/**
 * Types an answer: `push(text)` gives it all that has arrived so far, and `show(shown, finished)` is
 * called with the part to draw, a few characters a frame (more the further behind it falls, so a long
 * answer never lags). With reduced motion, or in a hidden tab, it shows what has arrived at once.
 * `finish()` waits for the typing to catch up; `flush()` shows everything now (the answer was stopped).
 */
function typewriter(show) {
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let target = "";
  let shown = 0;
  let timer = 0;
  let waiting;
  const tick = () => {
    timer = 0;
    const behind = target.length - shown;
    shown += still || document.hidden ? behind : Math.min(behind, Math.max(2, Math.ceil(behind / 8)));
    show(target.slice(0, shown), false);
    if (shown < target.length) timer = setTimeout(tick, 16);
    else waiting?.();
  };
  return {
    push(text) {
      target = text;
      if (!timer) timer = setTimeout(tick, 0);
    },
    finish: () =>
      new Promise((resolve) => {
        if (timer) waiting = resolve;
        else resolve();
      }).then(() => show(target, true)),
    flush() {
      clearTimeout(timer);
      timer = 0;
      shown = target.length;
      show(target, true);
      waiting?.();
    },
  };
}

class LuzChat extends HTMLElement {
  #started = false;
  #tx = null;
  #provider = null;
  #listener = null;
  #messages = [];
  #controller = null;
  #nodes = {};
  #last = "";
  #busy = false;
  #lastRole = "";
  // Whether the reader is at the end of the conversation, as of their last scroll: while it is, what arrives is followed; if not, a button says so
  #stick = true;
  #lastDay = "";

  connectedCallback() {
    if (this.#started) return;
    this.#started = true;
    const page = (this.closest("[lang]")?.lang || "en").toLowerCase().split("-")[0];
    const words = DICT[page] || DICT.en;
    this.#tx = (name) => {
      const attr = `data-luz-label-${name}`;
      return this.closest(`[${attr}]`)?.getAttribute(attr) ?? words[name] ?? DICT.en[name] ?? "";
    };
    this.#build();
    this.#find();
  }

  disconnectedCallback() {
    this.#controller?.abort();
    this.#provider?.removeEventListener?.("change", this.#listener);
    this.#started = false;
  }

  /** The provider: an object (or element) with ask(); set it from JavaScript when it is not a child. */
  get provider() {
    return this.#provider;
  }

  set provider(provider) {
    this.#provider?.removeEventListener?.("change", this.#listener);
    this.#provider = provider && typeof provider.ask === "function" ? provider : null;
    this.#listener = () => this.#sync();
    this.#provider?.addEventListener?.("change", this.#listener);
    this.#sync();
  }

  /** The provider in the markup: the first child that has ask(), once the elements of the page that may be one are defined. */
  async #find() {
    if (this.#provider) return;
    const tags = [...this.children].filter((c) => c.localName.includes("-") && !customElements.get(c.localName));
    // An element that is never defined (its chunk did not load) must not hold the chat back
    if (tags.length) await Promise.race([Promise.all(tags.map((c) => customElements.whenDefined(c.localName))), new Promise((r) => setTimeout(r, 5000))]);
    if (!this.#provider) this.provider = [...this.children].find((c) => typeof c.ask === "function");
  }

  #build() {
    const t = this.#tx;
    const n = this.#nodes;
    // What the page shows without a provider that answers: its children, but for the provider, the templates and the list of questions
    n.fallback = [...this.children].filter((c) => c.localName !== "template" && typeof c.ask !== "function" && !c.localName.includes("-") && !c.matches("[data-luz-chat-suggestions]"));
    n.suggestions = this.querySelector("ul[data-luz-chat-suggestions]");
    n.suggestions?.remove();
    const id = `luz-chat-${++serial}`;
    n.status = h("p", { class: "luz-chat__status u-sr-only", role: "status" });
    n.log = h("div", { class: "luz-chat__log", role: "log", "aria-live": "off", "aria-label": t("conversation"), tabindex: "0" });
    n.empty = h("p", { class: "luz-chat__empty", hidden: true }, t("empty"));
    n.jump = h("button", { class: "luz-btn luz-btn--secondary luz-chat__jump", type: "button", hidden: true }, t("latest"));
    n.stage = h("div", { class: "luz-chat__stage" }, n.log, n.jump);
    n.settingsBody = h("div", { class: "luz-chat__settings-body" });
    n.settings = h("details", { class: "luz-chat__settings" }, h("summary", { class: "luz-chat__gear", "aria-label": t("settings"), title: t("settings") }, icon()), n.settingsBody);
    const max = Number(this.getAttribute("maxlength"));
    n.field = h("textarea", { class: "luz-input luz-chat__field", id: `${id}-q`, rows: "2", placeholder: t("placeholder"), autocomplete: "off", spellcheck: "true", disabled: true, maxlength: max > 0 ? String(max) : null });
    n.count = h("p", { class: "luz-chat__count", hidden: true });
    n.send = h("button", { class: "luz-btn luz-btn--primary", type: "submit", disabled: true }, t("send"));
    n.stop = h("button", { class: "luz-btn luz-btn--secondary", type: "button", hidden: true }, t("stop"));
    n.form = h("form", { class: "luz-chat__form" }, h("label", { class: "u-sr-only", for: n.field.id }, t("question")), n.field, n.count, h("div", { class: "o-actions" }, n.send, n.stop));
    n.note = h("p", { class: "luz-chat__note" });
    n.panel = h(
      "section",
      { class: "luz-chat__panel", "aria-labelledby": `${id}-title`, hidden: true },
      h("header", { class: "luz-chat__head" }, h("h2", { class: "luz-chat__title", id: `${id}-title` }, t("title")), n.settings),
      n.stage,
      n.form,
      n.note,
      n.status,
    );
    if (n.suggestions) {
      n.suggestions.classList.add("luz-chat__suggestions");
      n.suggestions.setAttribute("aria-label", t("suggestions"));
      for (const button of n.suggestions.querySelectorAll("button")) {
        button.classList.add("luz-btn", "luz-btn--ghost");
        button.disabled = true;
        button.addEventListener("click", () => this.#send(button.textContent.trim()));
      }
      n.panel.insertBefore(n.suggestions, n.form);
    }
    n.form.addEventListener("submit", (e) => {
      // eslint-disable-next-line no-restricted-syntax -- the message has nowhere to be sent by the form: the provider answers (PRINCIPLES §3)
      e.preventDefault();
      const text = n.field.value.trim();
      if (text) this.#send(text);
    });
    n.stop.addEventListener("click", () => this.#controller?.abort());
    // Enter sends and Shift+Enter breaks the line, as in every messaging app; enter="newline" gives Enter back to the field. Not while an IME is composing
    n.field.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing && this.getAttribute("enter") !== "newline") {
        // eslint-disable-next-line no-restricted-syntax -- a message field sends on Enter in every chat; Shift+Enter, the button and enter="newline" keep the native line break (PRINCIPLES §3)
        e.preventDefault();
        n.form.requestSubmit();
      }
    });
    n.field.addEventListener("input", () => this.#field());
    // The reader who scrolled up to read is not taken down by what arrives; a button takes them to the latest
    n.log.addEventListener("scroll", () => {
      this.#stick = this.#atEnd();
      if (this.#stick) n.jump.hidden = true;
    });
    n.jump.addEventListener("click", () => {
      n.log.scrollTop = n.log.scrollHeight;
      n.jump.hidden = true;
    });
    this.append(n.panel);
  }

  /** Whether the conversation is scrolled to its end (or nearly). */
  #atEnd() {
    const log = this.#nodes.log;
    return log.scrollHeight - log.scrollTop - log.clientHeight < 48;
  }

  /** Keeps the end in view if the reader is at it; otherwise says there is more below. */
  #follow() {
    const n = this.#nodes;
    if (this.#stick) n.log.scrollTop = n.log.scrollHeight;
    else n.jump.hidden = false;
  }

  /** The send button and the count follow what is in the field: no send for nothing, a count only near the limit. */
  #field() {
    const n = this.#nodes;
    n.send.disabled = !(this.#stateOf.status === "ready") || this.#busy || !n.field.value.trim();
    const max = n.field.maxLength;
    const near = max > 0 && n.field.value.length >= max * 0.8;
    n.count.hidden = !near;
    if (near) n.count.textContent = `${n.field.value.length}/${max}`;
  }

  /** The state of the provider, as the conversation shows it. */
  get #stateOf() {
    return this.#provider ? this.#provider.state || { status: "ready" } : { status: "unavailable" };
  }

  /** Redraws everything the provider says: the state in the conversation, the field, the settings and the line under it. */
  #sync() {
    if (!this.#started) return;
    const n = this.#nodes;
    const state = this.#stateOf;
    this.dataset.luzState = state.status;
    // No provider that can answer, and nothing to say about it: the page's own children are all there is
    const quiet = state.status === "unavailable" && !state.message;
    for (const el of n.fallback) el.hidden = state.status !== "unavailable";
    n.panel.hidden = quiet;
    const ready = state.status === "ready";
    n.field.disabled = !ready || this.#busy;
    this.#field();
    for (const button of n.suggestions?.querySelectorAll("button") ?? []) button.disabled = !ready || this.#busy;

    // The line under the field: the page's template, or the provider's
    const tpl = this.querySelector("template[data-luz-chat-note]");
    n.note.textContent = tpl ? tpl.content.textContent.trim() : this.#provider?.note ?? "";
    n.note.hidden = !n.note.textContent;

    this.#drawSystem(state);
    n.empty.hidden = !ready || Boolean(n.log.querySelector(".luz-chat__msg"));
    this.#drawSettings();
    // Told once when the status changes, not at every tick of a download
    if (state.status !== this.#last) {
      this.#last = state.status;
      if (state.message) n.status.textContent = state.message;
    }
  }

  /** What the provider asks of the visitor, as a message of the system at the end of the conversation. */
  #drawSystem(state) {
    const n = this.#nodes;
    const focused = n.system?.contains(document.activeElement);
    n.system?.remove();
    n.system = null;
    if (state.status === "pending") {
      // Finding out: two quiet bars where the message will be, not a word
      n.system = h("div", { class: "luz-chat__system luz-chat__skeleton", "aria-hidden": "true" }, h("span"), h("span"));
      n.log.append(n.system);
      return;
    }
    if (state.status === "ready" || (!state.message && !state.body && !state.action)) return;
    const box = h("div", { class: "luz-chat__system", "data-luz-status": state.status });
    if (state.message) box.append(h("p", { class: "luz-chat__system-text" }, state.message));
    if (state.body) box.append(typeof state.body === "string" ? h("p", { class: "luz-chat__system-text" }, state.body) : state.body.cloneNode(true));
    if (state.status === "busy") box.append(h("progress", { class: "luz-progress", max: "1", value: Number.isFinite(state.progress) ? String(state.progress) : null, "aria-label": state.message || this.#tx("thinking") }));
    let button;
    if (state.action) {
      button = h("button", { class: "luz-btn luz-btn--primary", type: "button" }, state.action.label);
      // The click is the gesture some actions need (the browser asks for one to download a model): run() is called at once, in it
      button.addEventListener("click", () => state.action.run());
      box.append(h("div", { class: "o-actions" }, button));
    }
    n.log.append(box);
    n.system = box;
    n.log.scrollTop = n.log.scrollHeight;
    if (focused) (button ?? n.field).focus({ preventScroll: true });
  }

  #drawSettings() {
    const t = this.#tx;
    const n = this.#nodes;
    const clear = h("button", { class: "luz-btn luz-btn--secondary", type: "button" }, t("clear"));
    clear.addEventListener("click", () => this.#clear());
    const buttons = [clear];
    for (const item of this.#provider?.settings ?? []) {
      const button = h("button", { class: "luz-btn luz-btn--secondary", type: "button" }, item.label);
      button.addEventListener("click", () => item.run());
      buttons.push(button);
    }
    const rows = [];
    for (const item of this.#provider?.info ?? []) {
      if (item.meter) {
        rows.push(h("p", { class: "luz-chat__context" }, h("span", null, `${item.label} `), h("meter", { class: "luz-meter", min: "0", max: String(item.meter.max), value: String(item.meter.value), "aria-label": item.label })));
      } else if (item.node) rows.push(h("div", { class: "luz-chat__info" }, item.node.cloneNode(true)));
      else rows.push(h("p", null, item.label ? h("strong", null, `${item.label}: `) : null, item.text));
    }
    n.settingsBody.replaceChildren(h("h3", { class: "luz-chat__settings-title" }, t("settings")), ...rows, h("div", { class: "o-actions" }, ...buttons));
  }

  /** Who is who: the page's attributes first, then the provider's, then the dictionary's. */
  #who(role) {
    const t = this.#tx;
    const persona = this.#provider?.persona;
    if (role === "user") return { name: this.getAttribute("user-name") || t("you") };
    return { name: this.getAttribute("assistant-name") || persona?.name || t("assistant") };
  }

  /** A message in the conversation: name (for a screen reader), bubble and time; it follows the one before it when the same one wrote both on the same day. */
  #message(role) {
    const n = this.#nodes;
    const { name } = this.#who(role);
    const now = new Date();
    const lang = document.documentElement.lang || undefined;
    const day = now.toDateString();
    if (day !== this.#lastDay) {
      // A new day starts with its date, "today" for today
      const today = new Intl.RelativeTimeFormat(lang, { numeric: "auto" }).format(0, "day");
      n.system ? n.system.before(h("p", { class: "luz-chat__day" }, today)) : n.log.append(h("p", { class: "luz-chat__day" }, today));
      this.#lastDay = day;
      this.#lastRole = "";
    }
    const follow = this.#lastRole === role;
    this.#lastRole = role;
    const bubble = h("div", { class: "luz-chat__bubble" });
    const time = h("time", { class: "luz-chat__time", datetime: now.toISOString() }, new Intl.DateTimeFormat(lang, { hour: "numeric", minute: "2-digit" }).format(now));
    const body = h("div", { class: "luz-chat__body" }, h("p", { class: "luz-chat__name" }, name), bubble, time);
    const el = h("div", { class: "luz-chat__msg", "data-role": role, "data-follow": follow || null }, body);
    if (n.system) n.system.before(el);
    else n.log.append(el);
    n.empty.hidden = true;
    return { el, bubble, body, time };
  }

  async #send(text) {
    const t = this.#tx;
    const n = this.#nodes;
    if (this.#busy || !this.#provider) return;
    this.#busy = true;
    const controller = (this.#controller = new window.AbortController());
    n.field.value = "";
    n.stop.hidden = false;
    this.#sync();
    const mine = this.#message("user");
    mine.bubble.textContent = text;
    this.#messages.push({ role: "user", content: text });
    const reply = this.#message("assistant");
    // What the visitor just sent is always in view
    this.#stick = true;
    n.log.scrollTop = n.log.scrollHeight;
    n.jump.hidden = true;
    // Until the first words arrive (the provider is working on it), the bubble shows that it is typing
    reply.bubble.replaceChildren(h("span", { class: "luz-chat__dots", "aria-hidden": "true" }, h("span"), h("span"), h("span")));
    reply.time.hidden = true;
    n.status.textContent = t("thinking");
    let answer = "";
    let sources = [];
    const plain = this.getAttribute("format") === "text";
    // A link the model writes is a link only when it goes to one of the sources of this answer; any other address is shown as its text
    const link = (url) => {
      const to = pageOf(url);
      return sources.find((s) => pageOf(s.url) === to) && webAddress(url);
    };
    const typing = typewriter((shown, finished) => {
      reply.bubble.toggleAttribute("data-luz-typing", !finished);
      if (!shown.trim()) return;
      if (plain) reply.bubble.textContent = shown;
      else reply.bubble.replaceChildren(renderMarkdown(shown, link));
      this.#follow();
    });
    try {
      for await (const piece of this.#provider.ask(this.#messages.map((m) => ({ ...m })), { signal: controller.signal })) {
        if (typeof piece === "string") {
          answer += piece;
          typing.push(answer);
        } else if (Array.isArray(piece?.sources)) {
          sources = piece.sources.filter((s) => s && typeof s.title === "string" && webAddress(s.url)).map((s) => ({ title: s.title, url: webAddress(s.url) }));
        }
      }
      await typing.finish();
      this.#after(reply, answer, sources);
      this.#follow();
      this.#messages.push({ role: "assistant", content: answer });
      n.status.textContent = t("done");
    } catch (error) {
      typing.flush();
      if (controller.signal.aborted) {
        if (!answer) reply.bubble.textContent = t("stopped");
        else {
          this.#after(reply, answer, sources);
          this.#messages.push({ role: "assistant", content: answer });
        }
        n.status.textContent = t("stopped");
      } else {
        // The question that got no answer is not part of the history the provider sees next time
        this.#messages.pop();
        reply.bubble.textContent = t("error");
        reply.bubble.append(h("small", { class: "luz-chat__detail" }, ` (${[error?.name, error?.message].filter(Boolean).join(": ") || "?"})`));
        // What was written is not lost: one click sends it again
        const again = h("button", { class: "luz-btn luz-btn--secondary luz-chat__retry", type: "button" }, t("retry"));
        again.addEventListener("click", () => {
          mine.el.remove();
          reply.el.remove();
          this.#lastRole = "";
          this.#send(text);
        });
        reply.body.insertBefore(again, reply.time);
        n.status.textContent = t("error");
      }
    } finally {
      reply.time.hidden = false;
      this.#follow();
      this.#busy = false;
      n.stop.hidden = true;
      this.#sync();
      n.field.focus({ preventScroll: true });
    }
  }

  /** The sources and the copy button under an answer. */
  #after(reply, answer, sources) {
    const t = this.#tx;
    if (sources.length) {
      const list = h("ul", { class: "luz-chat__sources", "aria-label": t("sources") });
      for (const { title, url } of sources) list.append(h("li", null, h("a", { href: url }, title)));
      reply.body.insertBefore(list, reply.time);
    }
    const copy = h("button", { class: "luz-btn luz-btn--ghost luz-chat__copy", type: "button" }, t("copy"));
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(answer);
        this.#nodes.status.textContent = t("copied");
        copy.textContent = t("copied");
        setTimeout(() => (copy.textContent = t("copy")), 2000);
      } catch {
        // Clipboard blocked: nothing to say, the text is selectable
      }
    });
    reply.body.insertBefore(copy, reply.time);
  }

  #clear() {
    this.#controller?.abort();
    this.#messages = [];
    for (const el of this.#nodes.log.querySelectorAll(".luz-chat__msg")) el.remove();
    this.#provider?.reset?.();
    this.#sync();
    this.#nodes.field.focus();
  }
}

if (!customElements.get("luz-chat")) customElements.define("luz-chat", LuzChat);
