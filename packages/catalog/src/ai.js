/**
 * LUZ Catalog — ai (EXPERIMENTAL): a chat that answers questions about the
 * site with the language model of the visitor's own browser (the Prompt API,
 * Chrome 148 and later on the desktop), in a custom element, <luz-ai> (light
 * DOM, no Shadow DOM). Nothing the visitor asks leaves the device. A lazy
 * chunk: catalog.js loads this file (dist/ai.min.js, one file with its own
 * budget, which loads nothing else) when the page is scanned and has a
 * <luz-ai>; a page may also load it on its own ("@luz-ds/catalog/ai").
 *
 * This file is the chat; everything about the model (is it there, does the
 * visitor agree, download, session) is ai-engine.js, and finding the pages
 * that answer is ai-retrieve.js. The build puts both inside this chunk.
 *
 * Markup (the children are what the page shows without JavaScript, or when
 * the browser has no model: a note and a link to the search or the docs):
 *
 *   <luz-ai data-luz-ai-index="/docs/search-index.json">
 *     <p>Ask the docs needs Chrome 148 or later on a computer. <a href="/docs/">Read the docs</a> or use the search.</p>
 *     <template data-luz-ai-consent><p>What is downloaded, who manages it, what it needs…</p></template>
 *     <template data-luz-ai-requirements><ul>…</ul></template>
 *     <template data-luz-ai-instructions>Call the site "LUZ". Keep answers under four sentences.</template>
 *     <ul data-luz-ai-suggestions><li><button type="button">How do I install LUZ?</button></li></ul>
 *   </luz-ai>
 *
 * Optional templates (a missing one uses the dictionary's text): consent (the
 * notice before the first use), requirements (what the device needs; also
 * shown when the device cannot run the model), instructions (added to the
 * fixed ones the model gets). The short texts (buttons, states) are in an
 * English and Spanish dictionary here; `data-luz-label-<key>` on the
 * element or an ancestor replaces one (EX-014).
 *
 * Without JavaScript the children stay as they are. With it, and a browser
 * that has the Prompt API, the chat is built after them; the children hide
 * once the chat is usable. The visitor sees, in turn: the notice that this is
 * experimental and may be wrong (once, then always as a line under the field),
 * the download of the model when it is needed (only after a click, with a
 * progress bar and a way to cancel), and the chat. Settings, in a <details>
 * in the header: clear the conversation, turn it off on this site, forget my
 * answers, and the status and requirements of the device. The conversation
 * is kept in memory only; the answers to the notice are in localStorage under
 * "luz-ai" (or data-luz-ai-key, which starts with "luz-").
 *
 * The model's answer is written as text, never as HTML. The sources under it
 * are pages of the site's own index, never an address the model wrote.
 * Streaming is not announced piece by piece: a status line says "Thinking…" and,
 * at the end, "Answer ready".
 *
 * @element luz-ai - A chat with the model of the visitor's browser, about this site. Experimental.
 * @attr {string} data-luz-ai-index - URL of the site's search index (version 1); the search element's, or the text of <main>, when missing.
 * @attr {string} data-luz-search-src - Read from the page's <luz-search>, as the index, when data-luz-ai-index is missing.
 * @attr {number} data-luz-ai-size - Approximate size of the model in megabytes, written by the site (the browser does not say it); with it the download shows "about 960 MB of 2.4 GB" beside the percentage.
 * @attr {string} data-luz-ai-key - Storage key of the visitor's answers; it starts with luz-.
 * @attr {string} data-luz-state - Written by the script: unsupported, unavailable, disabled, consent, downloadable, downloading or ready.
 * @attr {string} data-luz-ai-consent - On a <template>: the notice shown before the first use; the dictionary's by default.
 * @attr {string} data-luz-ai-requirements - On a <template>: what the device needs; the dictionary's by default.
 * @attr {string} data-luz-ai-instructions - On a <template>: text added to the instructions the model gets.
 * @attr {string} data-luz-ai-suggestions - On a <ul> of buttons: questions to try, each button sends its text.
 * @attr {string} data-luz-label-title - The text for "title", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-experimental - The text for "experimental", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-note - The text for "note", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-why - The text for "why", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-why_unavailable - The text for "why_unavailable", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-consent - The text for "consent", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-requirements - The text for "requirements", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-start - The text for "start", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-download - The text for "download", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-download_again - The text for "download_again", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-downloading - The text for "downloading", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-about - The text for "about", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-of - The text for "of", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-unpacking - The text for "unpacking", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-cancel - The text for "cancel", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-cancelled - The text for "cancelled", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-preparing - The text for "preparing", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-you - The text for "you", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-assistant - The text for "assistant", on the element or an ancestor; the language's own by default.
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
 * @attr {string} data-luz-label-overflow - The text for "overflow", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-langnote - The text for "langnote", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-settings - The text for "settings", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-clear - The text for "clear", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-off - The text for "off", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-on - The text for "on", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-off_note - The text for "off_note", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-forget - The text for "forget", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-status - The text for "status", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-context - The text for "context", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-s_ready - The text for "s_ready", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-s_downloadable - The text for "s_downloadable", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-s_downloading - The text for "s_downloading", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-s_consent - The text for "s_consent", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-s_disabled - The text for "s_disabled", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-s_unavailable - The text for "s_unavailable", on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-s_unsupported - The text for "s_unsupported", on the element or an ancestor; the language's own by default.
 */

import { KEY, answerLanguage, getState, setPrefs, forget, createSession, contextInfo, measure, ask, end } from "./ai-engine.js";
import { loadIndex, retrieve } from "./ai-retrieve.js";
import { renderMarkdown } from "./ai-markdown.js";

// The address is built so the dictionary reads as text, not as a "key:" for the manifest
const INTERNALS = "chrome" + "://on-device-internals";

// luz-exception: EX-014 — the chat's own short strings (English and Spanish), so the chunk loads without core's i18n
const DICT = {
  en: {
    title: "Ask this site",
    experimental: "Experimental",
    note: "Experimental. It can be wrong. Your questions stay on this device.",
    why: "This browser has no model of its own, so this chat is not available. It needs Chrome 148 or later on a computer.",
    why_unavailable: "This device cannot run the model, so this chat is not available.",
    consent: "This chat uses the language model that Chrome keeps on your device. Your questions are not sent anywhere. It is experimental and can give wrong or incomplete answers, so check what matters on the page itself.",
    requirements: "The model is managed by Chrome, not by this site. It needs a computer with Windows 10 or 11, macOS 13 or later, Linux or a Chromebook Plus; about 22 GB free on the disk where Chrome keeps your profile; a graphics card with more than 4 GB of memory, or 16 GB of RAM and 4 processor cores; and an unmetered connection. This page cannot delete the model. To see or remove it, open " + INTERNALS + " in Chrome.",
    start: "Start",
    download: "Download the model and start",
    download_again: "Download the model again",
    downloading: "Downloading the model…",
    unpacking: "Unpacking the model…",
    about: "about",
    of: "of",
    cancel: "Cancel",
    cancelled: "The download was cancelled.",
    preparing: "Preparing the model…",
    question: "Your question",
    you: "You",
    assistant: "Assistant",
    placeholder: "Ask about this site",
    send: "Send",
    stop: "Stop",
    copy: "Copy answer",
    copied: "Copied",
    sources: "From these pages",
    suggestions: "Try asking",
    conversation: "Conversation",
    thinking: "Thinking…",
    done: "Answer ready",
    stopped: "Stopped",
    error: "The model could not answer. Try again.",
    overflow: "The conversation got long, so the oldest messages were forgotten.",
    langnote: "The model does not speak this page’s language, so it answers in English.",
    settings: "Settings",
    clear: "Clear the conversation",
    off: "Turn off on this site",
    on: "Turn on",
    off_note: "This chat is turned off on this site.",
    forget: "Forget my answers",
    status: "Status",
    context: "Context used",
    s_ready: "The model is on this device.",
    s_downloadable: "The model is not on this device yet.",
    s_downloading: "Chrome is downloading the model.",
    s_consent: "Waiting for you to start.",
    s_disabled: "Turned off.",
    s_unavailable: "Not available on this device.",
    s_unsupported: "Not available in this browser.",
  },
  es: {
    title: "Pregunta sobre este sitio",
    experimental: "Experimental",
    note: "Experimental. Puede equivocarse. Tus preguntas se quedan en este dispositivo.",
    why: "Este navegador no tiene un modelo propio, así que este chat no está disponible. Necesita Chrome 148 o posterior en un ordenador.",
    why_unavailable: "Este dispositivo no puede ejecutar el modelo, así que este chat no está disponible.",
    consent: "Este chat usa el modelo de lenguaje que Chrome guarda en tu dispositivo. Tus preguntas no se envían a ningún sitio. Es experimental y puede dar respuestas erróneas o incompletas, así que comprueba en la propia página lo que importe.",
    requirements: "El modelo lo gestiona Chrome, no este sitio. Necesita un ordenador con Windows 10 u 11, macOS 13 o posterior, Linux o un Chromebook Plus; unos 22 GB libres en el disco donde Chrome guarda tu perfil; una tarjeta gráfica con más de 4 GB de memoria, o 16 GB de RAM y 4 núcleos; y una conexión sin datos medidos. Esta página no puede borrar el modelo. Para verlo o quitarlo, abre " + INTERNALS + " en Chrome.",
    start: "Empezar",
    download: "Descargar el modelo y empezar",
    download_again: "Descargar el modelo otra vez",
    downloading: "Descargando el modelo…",
    unpacking: "Desempaquetando el modelo…",
    about: "unos",
    of: "de",
    cancel: "Cancelar",
    cancelled: "Se canceló la descarga.",
    preparing: "Preparando el modelo…",
    question: "Tu pregunta",
    you: "Tú",
    assistant: "Asistente",
    placeholder: "Pregunta sobre este sitio",
    send: "Enviar",
    stop: "Detener",
    copy: "Copiar respuesta",
    copied: "Copiado",
    sources: "De estas páginas",
    suggestions: "Prueba a preguntar",
    conversation: "Conversación",
    thinking: "Pensando…",
    done: "Respuesta lista",
    stopped: "Detenido",
    error: "El modelo no pudo responder. Inténtalo de nuevo.",
    overflow: "La conversación se hizo larga y se olvidaron los mensajes más antiguos.",
    langnote: "El modelo no habla el idioma de esta página, así que responde en inglés.",
    settings: "Ajustes",
    clear: "Borrar la conversación",
    off: "Desactivar en este sitio",
    on: "Activar",
    off_note: "Este chat está desactivado en este sitio.",
    forget: "Olvidar mis respuestas",
    status: "Estado",
    context: "Contexto usado",
    s_ready: "El modelo está en este dispositivo.",
    s_downloadable: "El modelo todavía no está en este dispositivo.",
    s_downloading: "Chrome está descargando el modelo.",
    s_consent: "Esperando a que empieces.",
    s_disabled: "Desactivado.",
    s_unavailable: "No disponible en este dispositivo.",
    s_unsupported: "No disponible en este navegador.",
  },
};

const NAMES = { en: "English", es: "Spanish", ja: "Japanese", de: "German", fr: "French" };
/** The instructions every session gets; the site adds its own after them. */
const base = (lang) =>
  `You are the assistant of this website. Answer the question using only the pages of the site that come with it. Answer at once, with no greeting and no preamble, in at most five short sentences (a short list when it lists steps): never copy the pages and never repeat the question. If the pages do not say, say that you do not know and suggest using the search. Never invent pages, links, commands or numbers. Answer in ${NAMES[lang]}.`;

// eslint-disable-next-line no-restricted-syntax -- RL-12: the SVG namespace name, an identifier that is never fetched
const SVG = "http://www.w3.org/2000/svg";

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

class LuzAi extends HTMLElement {
  #started = false;
  #tx = null;
  #key = KEY;
  #lang = "en";
  #fallbackLang = false;
  #state = { status: "unsupported" };
  #session = null;
  #entries;
  #controller = null;
  // Aborting this destroys the session (the signal given to create() owns its life), so only the download's Cancel and a clear touch it
  #life = null;
  #nodes = {};

  connectedCallback() {
    if (this.#started) return;
    this.#started = true;
    const key = this.dataset.luzAiKey;
    if (/^luz-[\w-]+$/.test(key)) this.#key = key;
    const { lang, fallback } = answerLanguage();
    this.#lang = lang;
    this.#fallbackLang = fallback;
    const page = (this.closest("[lang]")?.lang || "en").toLowerCase().split("-")[0];
    const words = DICT[page] || DICT.en;
    this.#tx = (name, vars) => {
      const attr = `data-luz-label-${name}`;
      const text = this.closest(`[${attr}]`)?.getAttribute(attr) ?? words[name] ?? DICT.en[name] ?? "";
      return vars ? text.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m) : text;
    };
    this.#build();
    this.#refresh();
  }

  disconnectedCallback() {
    this.#controller?.abort();
    this.#endSession();
    this.#started = false;
  }

  /** The authored template's content (cloned), or a paragraph with the dictionary's text. */
  #template(tpl, fallback) {
    return tpl ? tpl.content.cloneNode(true) : h("p", null, fallback);
  }

  #build() {
    const t = this.#tx;
    const n = this.#nodes;
    // What the page shows without a model: its children, but for the templates and the list of questions
    n.fallback = [...this.children].filter((c) => c.localName !== "template" && !c.matches("[data-luz-ai-suggestions]"));
    n.suggestions = this.querySelector("ul[data-luz-ai-suggestions]");
    n.suggestions?.remove();
    n.status = h("p", { class: "luz-ai__status u-sr-only", role: "status" });
    n.body = h("div", { class: "luz-ai__body" });
    n.stateText = h("p", { class: "luz-ai__state" });
    n.context = h("meter", { class: "luz-meter luz-ai__meter", min: "0", max: "1", value: "0", "aria-label": t("context") });
    n.contextRow = h("p", { class: "luz-ai__context", hidden: true }, h("span", null, `${t("context")} `), n.context);
    const clear = h("button", { class: "luz-btn luz-btn--secondary", type: "button" }, t("clear"));
    const toggle = h("button", { class: "luz-btn luz-btn--secondary", type: "button" }, t("off"));
    const forgetButton = h("button", { class: "luz-btn luz-btn--secondary", type: "button" }, t("forget"));
    clear.addEventListener("click", () => this.#clear());
    // One button, two jobs: turn off, or (when it is off) turn on
    toggle.addEventListener("click", () => {
      const off = this.#state.status !== "disabled";
      setPrefs({ enabled: !off }, this.#key);
      if (off) this.#drop();
      this.#refresh();
    });
    forgetButton.addEventListener("click", () => {
      forget(this.#key);
      this.#drop();
      this.#refresh();
    });
    n.clear = clear;
    n.forgetButton = forgetButton;
    n.toggle = toggle;
    const settings = h(
      "details",
      { class: "luz-ai__settings" },
      h("summary", { class: "luz-ai__gear", "aria-label": t("settings"), title: t("settings") }, icon()),
      h(
        "div",
        { class: "luz-ai__settings-body" },
        h("h3", { class: "luz-ai__settings-title" }, t("settings")),
        h("p", null, h("strong", null, `${t("status")}: `), n.stateText),
        n.contextRow,
        h("div", { class: "o-actions" }, clear, toggle, forgetButton),
        h("div", { class: "luz-ai__requirements" }, this.#template(this.querySelector("template[data-luz-ai-requirements]"), t("requirements"))),
      ),
    );
    n.settings = settings;
    n.note = h("p", { class: "luz-ai__note" }, t("note"));
    n.panel = h(
      "section",
      { class: "luz-ai__panel", "aria-labelledby": "luz-ai-title-" + (this.id || Math.random().toString(36).slice(2, 8)) },
      h("header", { class: "luz-ai__head" }, h("h2", { class: "luz-ai__title" }, t("title")), h("span", { class: "luz-tag luz-tag--yellow" }, t("experimental")), settings),
      n.body,
      n.note,
      n.status,
    );
    // The heading names the region
    n.panel.querySelector(".luz-ai__title").id = n.panel.getAttribute("aria-labelledby");
    n.panel.hidden = true;
    this.append(n.panel);
  }

  async #refresh() {
    const state = await getState({ lang: this.#lang, storageKey: this.#key });
    this.#state = state;
    this.dataset.luzState = state.status;
    this.#render();
  }

  /** The panel for the current state. */
  #render() {
    const t = this.#tx;
    const n = this.#nodes;
    const { status } = this.#state;
    const usable = !["unsupported", "unavailable"].includes(status);
    // The authored children are the way in when there is no model; the chat takes their place when there is
    for (const el of n.fallback) el.hidden = usable;
    // A browser with no model sees the page's own note and nothing else: the chat would only repeat it
    n.panel.hidden = status === "unsupported";
    n.note.hidden = false;
    n.stateText.textContent = t(`s_${status}`);
    n.forgetButton.hidden = status === "unsupported" || status === "unavailable";
    n.clear.hidden = status !== "ready";
    n.toggle.hidden = status === "unsupported" || status === "unavailable";
    n.toggle.textContent = status === "disabled" ? t("on") : t("off");
    if (status === "unsupported" || status === "unavailable") return this.#viewWhy(status);
    if (status === "disabled") return this.#viewDisabled();
    if (status === "consent") return this.#viewConsent();
    if (status === "downloadable" || status === "downloading") return this.#viewDownload();
    this.#viewChat();
  }

  #viewWhy(status) {
    const t = this.#tx;
    const body = this.#nodes.body;
    body.replaceChildren(h("p", { class: "luz-ai__why" }, t(status === "unsupported" ? "why" : "why_unavailable")));
    if (status === "unavailable") body.append(this.#template(this.querySelector("template[data-luz-ai-requirements]"), t("requirements")));
    this.#nodes.note.hidden = true;
  }

  #viewDisabled() {
    const t = this.#tx;
    const on = h("button", { class: "luz-btn luz-btn--primary", type: "button" }, t("on"));
    on.addEventListener("click", () => {
      setPrefs({ enabled: true }, this.#key);
      this.#refresh();
    });
    this.#nodes.body.replaceChildren(h("p", null, t("off_note")), h("div", { class: "o-actions" }, on));
    this.#nodes.note.hidden = true;
  }

  /** The notice of the first use. Its button is the click Chrome needs to start the download. */
  #viewConsent() {
    const t = this.#tx;
    const status = this.#state.support;
    const go = h("button", { class: "luz-btn luz-btn--primary", type: "button" }, t(status === "available" ? "start" : "download"));
    go.addEventListener("click", () => {
      setPrefs({ consent: true }, this.#key);
      this.#state = { ...this.#state, prefs: { ...this.#state.prefs, consent: true } };
      this.#open(status !== "available");
    });
    const card = h("div", { class: "luz-ai__card" }, this.#template(this.querySelector("template[data-luz-ai-consent]"), t("consent")), h("div", { class: "luz-ai__requirements" }, this.#template(this.querySelector("template[data-luz-ai-requirements]"), t("requirements"))), h("div", { class: "o-actions" }, go));
    this.#nodes.body.replaceChildren(card);
    go.focus({ preventScroll: true });
  }

  #viewDownload() {
    const t = this.#tx;
    const go = h("button", { class: "luz-btn luz-btn--primary", type: "button" }, t("download_again"));
    go.addEventListener("click", () => this.#open(true));
    this.#nodes.body.replaceChildren(h("p", null, t(this.#state.status === "downloading" ? "s_downloading" : "s_downloadable")), h("div", { class: "o-actions" }, go));
  }

  /** Opens a session now (downloading first when `download`), then shows the chat. */
  async #open(download) {
    const t = this.#tx;
    const n = this.#nodes;
    if (download) {
      const life = this.#newLife();
      const bar = h("progress", { class: "luz-progress", max: "1", value: "0", "aria-label": t("downloading"), "aria-valuetext": "0%" });
      const label = h("p", null, `${t("downloading")} 0%`);
      // The browser says only how much of the model is in (0 to 1), never its size: the weight shown is the site's own estimate, if it wrote one
      const total = Number(this.dataset.luzAiSize);
      const size = total > 0 ? h("p", { class: "luz-ai__size" }) : null;
      const weight = (mb) => (mb >= 1000 ? `${(mb / 1000).toLocaleString(this.#lang, { maximumFractionDigits: 1 })} GB` : `${Math.round(mb)} MB`);
      const show = (loaded) => {
        const pct = Math.floor(loaded * 100);
        bar.value = loaded;
        bar.setAttribute("aria-valuetext", `${pct}%`);
        label.textContent = `${t("downloading")} ${pct}%`;
        if (size) size.textContent = `${t("about")} ${weight(total * loaded)} ${t("of")} ${weight(total)}`;
      };
      if (size) size.textContent = `${t("about")} ${weight(0)} ${t("of")} ${weight(total)}`;
      const cancel = h("button", { class: "luz-btn luz-btn--secondary", type: "button" }, t("cancel"));
      cancel.addEventListener("click", () => life.abort());
      n.body.replaceChildren(label, ...(size ? [size] : []), bar, h("div", { class: "o-actions" }, cancel));
      cancel.focus({ preventScroll: true });
      try {
        this.#session = await this.#create(life.signal, (loaded) => {
          if (loaded >= 1) {
            // Everything is in; Chrome now unpacks it and says nothing more
            bar.removeAttribute("value");
            bar.removeAttribute("aria-valuetext");
            label.textContent = t("unpacking");
            if (size) size.textContent = `${weight(total)}`;
          } else show(loaded);
        });
      } catch (error) {
        this.#life = null;
        n.status.textContent = life.signal.aborted ? t("cancelled") : `${t("error")} (${this.#why(error)})`;
        return this.#refresh();
      }
    }
    this.#refresh();
  }

  /** A new owner for the next session's life; the old one, if any, is let go. */
  #newLife() {
    this.#life?.abort();
    return (this.#life = new window.AbortController());
  }

  #endSession() {
    this.#life?.abort();
    this.#life = null;
    end(this.#session);
    this.#session = null;
  }

  /** What went wrong, for the person to read and to report: the name of the error and its message. */
  #why(error) {
    return [error?.name, error?.message].filter(Boolean).join(": ") || "?";
  }

  #create(signal, onProgress) {
    const instructions = [base(this.#lang), this.querySelector("template[data-luz-ai-instructions]")?.content.textContent.trim()].filter(Boolean).join("\n");
    return createSession({ lang: this.#lang, instructions, signal, onProgress, onOverflow: () => (this.#nodes.status.textContent = this.#tx("overflow")) });
  }

  #viewChat() {
    const t = this.#tx;
    const n = this.#nodes;
    if (n.log?.isConnected) return;
    n.log = h("div", { class: "luz-ai__log", role: "log", "aria-live": "off", "aria-label": t("conversation"), tabindex: "0" });
    const field = h("textarea", { class: "luz-input luz-ai__field", id: "luz-ai-q-" + Math.random().toString(36).slice(2, 8), rows: "2", placeholder: t("placeholder"), autocomplete: "off", spellcheck: "true" });
    const label = h("label", { class: "u-sr-only", for: field.id }, t("question"));
    const send = h("button", { class: "luz-btn luz-btn--primary", type: "submit" }, t("send"));
    const stop = h("button", { class: "luz-btn luz-btn--secondary", type: "button", hidden: true }, t("stop"));
    const form = h("form", { class: "luz-ai__form" }, label, field, h("div", { class: "o-actions" }, send, stop));
    n.field = field;
    n.send = send;
    n.stop = stop;
    form.addEventListener("submit", (e) => {
      // eslint-disable-next-line no-restricted-syntax -- the question has nowhere to be sent: the model answers on this device (PRINCIPLES §3, §8)
      e.preventDefault();
      const q = field.value.trim();
      if (q) this.#ask(q);
    });
    stop.addEventListener("click", () => this.#controller?.abort());
    const parts = [];
    if (this.#fallbackLang) parts.push(h("p", { class: "luz-ai__langnote" }, t("langnote")));
    if (n.suggestions) {
      n.suggestions.classList.add("luz-ai__suggestions");
      n.suggestions.setAttribute("aria-label", t("suggestions"));
      for (const button of n.suggestions.querySelectorAll("button")) {
        button.classList.add("luz-btn", "luz-btn--ghost");
        button.addEventListener("click", () => this.#ask(button.textContent.trim()));
      }
      parts.push(n.suggestions);
    }
    n.body.replaceChildren(...parts, n.log, form);
    field.focus({ preventScroll: true });
  }

  /** The room, in characters, that the model has left for a page of context. */
  #room() {
    const info = contextInfo(this.#session);
    // At most about a thousand tokens of pages: what the model reads before it starts to answer is what makes it slow
    return info ? Math.min(4000, Math.max(400, (info.window - info.used - 500) * 2.5)) : 3000;
  }

  async #ask(question) {
    const t = this.#tx;
    const n = this.#nodes;
    if (this.#controller && !n.stop.hidden) return;
    const controller = (this.#controller = new window.AbortController());
    n.field.value = "";
    n.send.disabled = true;
    n.stop.hidden = false;
    const answer = h("div", { class: "luz-ai__answer" });
    const turn = h("div", { class: "luz-ai__turn" }, h("p", { class: "luz-ai__q" }, h("span", { class: "u-sr-only" }, `${t("you")}: `), question), h("span", { class: "u-sr-only" }, `${t("assistant")}: `), answer);
    n.log.append(turn);
    n.log.scrollTop = n.log.scrollHeight;
    n.status.textContent = t("thinking");
    let text = "";
    // A link the model writes is a link only when it goes to a page of the site's own index; any other address is shown as its text
    const link = (url) => this.#page(url);
    try {
      this.#session ??= await this.#create(this.#newLife().signal);
      this.#entries ??= (await loadIndex(this.dataset.luzAiIndex || document.querySelector("luz-search")?.dataset.luzSearchSrc || "", controller.signal)) || [];
      // The pages are cut to what fits: the prompt is measured by the model itself, and shrunk until it leaves room for the answer;
      // if the model still says it is too large (a browser that cannot measure), the room is halved and the question asked again
      const reserve = 256;
      let room = this.#room();
      let found;
      for (let attempt = 0; ; attempt++) {
        found = this.#entries.length ? await retrieve(this.#entries, question, { room, signal: controller.signal }) : { context: "", sources: [] };
        const context = found.context || (document.querySelector("main")?.innerText || "").slice(0, room);
        const prompt = `Pages of the site:\n\n${context}\n\nMy question: ${question}`;
        const info = contextInfo(this.#session);
        const need = await measure(this.#session, prompt);
        const left = info ? info.window - info.used - reserve : 0;
        if (info && need !== null && need > left && room > 400 && attempt < 5) {
          room = Math.max(400, Math.floor(room * Math.min(0.8, left / need)));
          continue;
        }
        try {
          for await (const piece of ask(this.#session, prompt, controller.signal)) {
            text += piece;
            answer.replaceChildren(renderMarkdown(text, link));
            n.log.scrollTop = n.log.scrollHeight;
          }
          break;
        } catch (error) {
          if (error?.name !== "QuotaExceededError" || text || attempt >= 5 || room <= 400) throw error;
          const { requested, contextWindow } = error;
          room = Math.max(400, Math.floor(room * (requested > 0 && contextWindow > 0 ? Math.min(0.8, (0.6 * contextWindow) / requested) : 0.5)));
        }
      }
      turn.append(...this.#after(text, found.sources));
      n.status.textContent = t("done");
    } catch (error) {
      if (controller.signal.aborted) {
        if (!text) answer.textContent = t("stopped");
        else turn.append(...this.#after(text, []));
        n.status.textContent = t("stopped");
      } else {
        // A session that failed is not trusted again: the next question opens a fresh one
        this.#endSession();
        answer.textContent = t("error");
        answer.append(h("small", { class: "luz-ai__detail" }, ` (${this.#why(error)})`));
        n.status.textContent = t("error");
      }
    } finally {
      n.send.disabled = false;
      n.stop.hidden = true;
      this.#meter();
      n.field?.focus({ preventScroll: true });
    }
  }

  /** The address of a page of the index that `url` names, or nothing. */
  #page(url) {
    try {
      const to = new URL(url, document.baseURI);
      return this.#entries?.some((e) => e.page === to.origin + to.pathname) ? to.href : undefined;
    } catch {
      return undefined;
    }
  }

  /** The sources and the copy button under an answer. */
  #after(text, sources) {
    const t = this.#tx;
    const out = [];
    if (sources.length) {
      const list = h("ul", { class: "luz-ai__sources", "aria-label": t("sources") });
      for (const { title, url } of sources) list.append(h("li", null, h("a", { href: url }, title)));
      out.push(list);
    }
    const copy = h("button", { class: "luz-btn luz-btn--ghost luz-ai__copy", type: "button" }, t("copy"));
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(text);
        this.#nodes.status.textContent = t("copied");
        copy.textContent = t("copied");
        setTimeout(() => (copy.textContent = t("copy")), 2000);
      } catch {
        // Clipboard blocked: nothing to say, the text is selectable
      }
    });
    out.push(copy);
    return out;
  }

  /** The context meter in the settings. */
  #meter() {
    const info = contextInfo(this.#session);
    const { context, contextRow } = this.#nodes;
    contextRow.hidden = !info;
    if (info) {
      context.max = info.window;
      context.value = info.used;
      context.setAttribute("aria-valuetext", this.#tx("context") + " " + Math.round((info.used / info.window) * 100) + "%");
    }
  }

  #clear() {
    this.#controller?.abort();
    this.#endSession();
    this.#nodes.log?.replaceChildren();
    this.#nodes.contextRow.hidden = true;
    this.#nodes.field?.focus();
  }

  /** Stops everything and frees the model (turning off, forgetting). */
  #drop() {
    this.#clear();
    this.#nodes.log = null;
  }
}

if (!customElements.get("luz-ai")) customElements.define("luz-ai", LuzAi);
