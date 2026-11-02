/**
 * LUZ Catalog — ai-retrieve (EXPERIMENTAL): finds, in the site's own search
 * index, the pages that answer a question, and reads them. The model on the
 * device has a small context, so the chat never sends the site: it sends the
 * two or three pages that score best, cut to what fits.
 *
 * Two requests, both to the page's own origin and never followed to another
 * one: the search index (the same file <luz-search> reads, format version 1:
 * `pages`, `sections` and `elements`, each a list of [text, url, meta?])
 * and the Markdown of each page chosen (`<page url>index.md`, which the
 * docs build writes next to every page). The sources a surface shows are the
 * pages of the index, never an address the model wrote.
 */

const LISTS = ["pages", "sections", "elements"];
const MAX_ITEMS = 1e4;
const MAX_TEXT = 300;
const MAX_CHARS = 1e6;
/** Words that say nothing about what is asked (English and Spanish). */
const STOP = new Set("the and for how what which where does can you with this that are was from into about como que cual donde para por una uno unos unas del los las con esto esta este son hay puedo puede".split(" "));

const fold = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const words = (s) => [...new Set(fold(s).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2 && !STOP.has(w)))].slice(0, 8);

/** An http(s) URL of the page's own origin, or null. */
function sameOrigin(raw, base) {
  try {
    const url = new URL(raw, base);
    return /^https?:$/.test(url.protocol) && url.origin === location.origin ? url : null;
  } catch {
    return null;
  }
}

/**
 * The entries of an index, checked one by one: [{ list, text, meta, page }],
 * `page` being the URL of the page without its fragment. Null when `data` is
 * not an index. At most 10,000 entries and 300 characters a string.
 * @param {unknown} data parsed JSON
 * @param {string} base the URL of the index
 */
export function readEntries(data, base) {
  if (data?.version !== 1 || !Array.isArray(data.pages)) return null;
  const out = [];
  LISTS.forEach((list, g) => {
    for (const item of Array.isArray(data[list]) ? data[list] : []) {
      if (out.length >= MAX_ITEMS) return;
      const [text, raw, meta] = Array.isArray(item) ? item : [];
      const url = typeof text === "string" && typeof raw === "string" && sameOrigin(raw, base);
      if (!url) continue;
      url.hash = "";
      url.search = "";
      out.push({ g, text: text.slice(0, MAX_TEXT), meta: typeof meta === "string" ? meta.slice(0, MAX_TEXT) : "", page: url.href });
    }
  });
  return out;
}

/**
 * The best `count` pages for `question`: [{ url, title, score }], highest
 * first. A word weighs more the fewer entries have it (so "luz", which is
 * everywhere, counts for almost nothing); in a page's title it counts most,
 * then in its other names, then in a heading of it. A page needs at least
 * one word to be chosen.
 * @param {ReturnType<typeof readEntries>} entries
 * @param {string} question
 * @param {number} [count]
 */
export function rank(entries, question, count = 3) {
  const terms = words(question);
  if (!entries?.length || !terms.length) return [];
  const rows = entries.map((e) => ({ ...e, t: fold(e.text), m: fold(e.meta) }));
  const weight = terms.map((w) => {
    const df = rows.reduce((n, e) => n + (e.t.includes(w) || e.m.includes(w) ? 1 : 0), 0);
    return df ? Math.log(1 + rows.length / df) : 0;
  });
  const titles = new Map();
  // Per page, each word counts once, at the best place it is found: a long page with the word in forty headings does not beat a page named after it
  const best = new Map();
  for (const e of rows) {
    if (e.g === 0) titles.set(e.page, e.text);
    const row = best.get(e.page) ?? terms.map(() => 0);
    terms.forEach((w, i) => {
      const gain = e.t.includes(w) ? weight[i] * (e.g === 0 ? 5 : 2) : e.m.includes(w) ? weight[i] * (e.g === 0 ? 3 : 1) : 0;
      if (gain > row[i]) row[i] = gain;
    });
    best.set(e.page, row);
  }
  return [...best]
    .map(([url, row]) => ({ url, title: titles.get(url) || new URL(url).pathname, score: row.reduce((a, b) => a + b, 0) }))
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
}

/** Fetches JSON or text from the page's origin; null on any failure. */
async function get(url, signal, max) {
  try {
    const response = await fetch(url, { redirect: "error", signal, credentials: "omit" });
    if (!response.ok) return null;
    const text = await response.text();
    return text.length > max ? null : text;
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    return null;
  }
}

/**
 * Loads and checks the index at `src`. Null when it is missing, over
 * 1,000,000 characters, not JSON or not an index (version 1).
 * @param {string} src
 * @param {AbortSignal} [signal]
 */
export async function loadIndex(src, signal) {
  const url = sameOrigin(src, document.baseURI);
  const text = url && (await get(url.href, signal, MAX_CHARS));
  if (!text) return null;
  try {
    return readEntries(JSON.parse(text), url.href);
  } catch {
    return null;
  }
}

/**
 * The context for a question: the Markdown of the best pages, cut to the
 * room the model has. `room` is a number of characters (a token is about
 * four of them in English); each page gets an equal share.
 * @param {ReturnType<typeof readEntries>} entries
 * @param {string} question
 * @param {{ room?: number, signal?: AbortSignal, count?: number }} [options]
 * @returns {Promise<{ context: string, sources: { title: string, url: string }[] }>}
 */
export async function retrieve(entries, question, { room = 6000, signal, count = 3 } = {}) {
  const best = rank(entries, question, count);
  const share = Math.floor(room / Math.max(1, best.length));
  const parts = [];
  const sources = [];
  for (const { url, title } of best) {
    const md = await get(new URL("index.md", url).href, signal, MAX_CHARS);
    if (!md) continue;
    parts.push(`## ${title}\n${md.trim().slice(0, share)}`);
    sources.push({ title, url });
  }
  return { context: parts.join("\n\n"), sources };
}
