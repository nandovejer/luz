/**
 * LUZ Catalog — ai-engine (EXPERIMENTAL): everything <luz-ai> needs to know
 * about the browser's own language model, with no interface. It detects
 * whether the Prompt API (`LanguageModel`) is there, says in what state the
 * model is, keeps the visitor's answer to the notice, downloads the model
 * when asked and opens a session. A surface (the chat of <luz-ai>, or any
 * other) draws it; this file writes no text and touches no element.
 * Importing it does nothing until you call one of its functions
 * ("@luz-ds/catalog/ai-engine").
 *
 * Experimental: the Prompt API is in Chrome 148 and later on the desktop and
 * still changes (its context properties were renamed in 2026); these
 * exports may change in a minor release.
 *
 * The states of `getState()`, in the order they are tried:
 *   "unsupported"   the browser has no `LanguageModel` (Firefox, Safari)
 *   "unavailable"   it has, but this device or this policy cannot run a model
 *   "disabled"      the visitor turned it off on this site
 *   "consent"       the visitor has not accepted the notice yet
 *   "downloadable"  the model is not on the device: it needs a click to start
 *   "downloading"   Chrome is already downloading it (a click is still needed to attach)
 *   "ready"         the model is on the device
 *
 * Stored in localStorage under "luz-ai" (or a key that starts with "luz-"),
 * as JSON {"version":1,"enabled":true,"consent":false}: the visitor's own
 * answers, no conversation, no personal data (PRINCIPLES.md §8).
 *
 * The page cannot know the size of the model, the free space on the disk or
 * why a device is unavailable, and cannot delete the model: Chrome does
 * (chrome://on-device-internals). The engine says none of it.
 */

export const KEY = "luz-ai";
/** The languages the model answers in (Chrome's Prompt API, 2026). */
export const LANGUAGES = ["en", "es", "ja", "de", "fr"];

const KEY_RULE = /^luz-[\w-]+$/;
const SUPPORT = new Set(["unavailable", "downloadable", "downloading", "available"]);
const key = (k) => (KEY_RULE.test(k) ? k : KEY);

/**
 * The language the model will answer in: the page's own when the model
 * speaks it, else English (`fallback` is then true, so a surface can say so).
 * @param {string} [lang] a BCP 47 tag; the <html lang> by default
 * @returns {{ lang: string, fallback: boolean }}
 */
export function answerLanguage(lang = typeof document === "undefined" ? "" : document.documentElement.lang) {
  const base = String(lang || "en").toLowerCase().split("-")[0];
  return LANGUAGES.includes(base) ? { lang: base, fallback: false } : { lang: "en", fallback: true };
}

/** The options of `availability()` and `create()`: text in and out, in one language. */
export function modelOptions(lang) {
  const language = [{ type: "text", languages: [lang] }];
  return { expectedInputs: language, expectedOutputs: language };
}

/**
 * Whether this browser can run the model: "unsupported" (no API), or what
 * `LanguageModel.availability()` says. By feature, never by browser (RL-16).
 * @param {{ lang?: string }} [options]
 * @returns {Promise<"unsupported"|"unavailable"|"downloadable"|"downloading"|"available">}
 */
export async function checkSupport({ lang = answerLanguage().lang } = {}) {
  const api = globalThis.LanguageModel;
  if (typeof api?.availability !== "function") return "unsupported";
  try {
    const status = await api.availability(modelOptions(lang));
    return SUPPORT.has(status) ? status : "unavailable";
  } catch {
    return "unavailable";
  }
}

/**
 * The visitor's stored answers; the defaults when nothing valid is stored or
 * storage is blocked.
 * @returns {{ enabled: boolean, consent: boolean }}
 */
export function getPrefs(storageKey) {
  try {
    const value = JSON.parse(localStorage.getItem(key(storageKey)));
    if (value?.version === 1 && typeof value.enabled === "boolean" && typeof value.consent === "boolean") return { enabled: value.enabled, consent: value.consent };
  } catch {
    // Missing, not JSON or storage blocked: the defaults
  }
  return { enabled: true, consent: false };
}

/**
 * Merges `patch` ({ enabled?, consent? }) into the stored answers and returns
 * them. With storage blocked it still returns them, so the page works for
 * the visit.
 */
export function setPrefs(patch, storageKey) {
  const next = { ...getPrefs(storageKey) };
  if (typeof patch?.enabled === "boolean") next.enabled = patch.enabled;
  if (typeof patch?.consent === "boolean") next.consent = patch.consent;
  try {
    localStorage.setItem(key(storageKey), JSON.stringify({ version: 1, ...next }));
  } catch {
    // Blocked: not remembered
  }
  return next;
}

/** Removes the stored answers: the next visit starts from the notice. */
export function forget(storageKey) {
  try {
    localStorage.removeItem(key(storageKey));
  } catch {
    // Blocked: nothing was stored
  }
}

/**
 * Where the model stands, with the visitor's answers on top of what the
 * browser says: see the list in this file's header.
 * @param {{ lang?: string, storageKey?: string }} [options]
 */
export async function getState({ lang, storageKey } = {}) {
  const support = await checkSupport({ lang });
  const prefs = getPrefs(storageKey);
  let status = support;
  if (support === "available") status = "ready";
  if (status === "unsupported" || status === "unavailable") return { status, support, prefs };
  if (!prefs.enabled) status = "disabled";
  else if (!prefs.consent) status = "consent";
  return { status, support, prefs };
}

/**
 * Opens a session, downloading the model first when it is not on the device.
 * Call it from a click: Chrome needs a user gesture to start the download.
 * `onProgress` gets a number from 0 to 1 (the size is not known); at 1 Chrome
 * is still unpacking the model, so a surface shows it as waiting.
 * @param {object} options
 * @param {string} [options.lang] answer language; use answerLanguage()
 * @param {string} [options.instructions] the system prompt
 * @param {AbortSignal} [options.signal] cancels the download or the session
 * @param {(loaded: number) => void} [options.onProgress]
 * @param {() => void} [options.onOverflow] the conversation passed the model's context and the oldest turns were dropped
 */
export async function createSession({ lang = answerLanguage().lang, instructions = "", signal, onProgress, onOverflow } = {}) {
  const api = globalThis.LanguageModel;
  if (typeof api?.create !== "function") throw new DOMException("No language model", "NotSupportedError");
  const config = {
    ...modelOptions(lang),
    signal,
    monitor(monitor) {
      monitor.addEventListener("downloadprogress", (e) => onProgress?.(Math.min(1, Math.max(0, Number(e.loaded) || 0))));
    },
  };
  if (instructions) config.initialPrompts = [{ role: "system", content: instructions }];
  const session = await api.create(config);
  if (onOverflow) session.addEventListener?.("contextoverflow", onOverflow);
  return session;
}

/**
 * How much of the session's context is used: { used, window } in tokens, or
 * null when this browser does not say.
 */
export function contextInfo(session) {
  const used = session?.contextUsage;
  const window = session?.contextWindow;
  return Number.isFinite(used) && Number.isFinite(window) ? { used, window } : null;
}

/**
 * Tokens `text` would take in the session, or null when the browser cannot
 * tell. Used to cut what is sent to the model to what fits.
 */
export async function measure(session, text) {
  try {
    const n = await session.measureContextUsage(text);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/**
 * Asks the model and yields the answer piece by piece. Aborting `signal`
 * stops it, with an AbortError.
 * @param {object} session from createSession()
 * @param {string} text the question, with whatever context goes with it
 * @param {AbortSignal} [signal]
 * @returns {AsyncGenerator<string>}
 */
export async function* ask(session, text, signal) {
  const stream = session.promptStreaming(text, { signal });
  for await (const piece of stream) yield String(piece);
}

/** Frees the model's memory for the session. */
export function end(session) {
  try {
    session?.destroy?.();
  } catch {
    // Already gone
  }
}
