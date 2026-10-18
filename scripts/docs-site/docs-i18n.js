/**
 * LUZ docs site — the documentation in more than one language. Development
 * tooling only.
 *
 * A language has docs when `apps/docs/i18n/<code>/` exists (opt in by folder,
 * D1); its code is a language of the home page's registry
 * (apps/landing/i18n/locales.json). The folder holds:
 *
 *   strings.json     the chrome the generator writes (strings.js, catalog keys)
 *   pages/**.html    the pages translated so far, at the same path as the
 *                    English ones in apps/docs/pages/; the others fall back to
 *                    English inside the language's chrome (D3)
 *
 * and `apps/docs/i18n/en/strings.json` is the reference every language must
 * match key for key (plus the keys derived from site.json: `area.<id>`,
 * `group.<area>.<group>`, `essential.<last segment of the href>`; and, for a
 * plural key, the categories of the language: `chip.issues.one`…).
 *
 *   loadDocsLocales(docsDir, registry, options)  read and check all of it; null
 *                                       when apps/docs/i18n has no language
 *   localize(site, language)            a view of the English site in a language
 *   parityProblems(english, translation) what a translation changed that only
 *                                       the words may change
 *   localizeLinks(html, language)       links to /docs/… stay in the language
 *   sourceHash(body)                    the `source` of a translation
 *
 * `site.pages` stays English and untouched; a view is derived from it.
 * Mistakes fail with file:line, in the style of the home page's catalogs.
 */
import { createHash } from "node:crypto";
import { lstatSync, readdirSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { decodeEntities, tags } from "./html.js";
import { assertInlineHtml, checkCatalog, lineOfKey } from "./i18n.js";
import { PLURAL_CATEGORIES, PLACEHOLDER, makeT } from "./strings.js";
import { depthOf, readInside, routeOfPage } from "./site.js";

const DOCS = "/docs/";

/* ---- The source hash --------------------------------------------------------- */

/** The `source` of a translation (D5): the first 12 hex of the SHA-256 of the English body, white space collapsed and trimmed. */
export function sourceHash(body) {
  return createHash("sha256").update(body.replace(/\s+/g, " ").trim()).digest("hex").slice(0, 12);
}

/* ---- Front matter of a translation ------------------------------------------------ */

const TRANSLATED_KEYS = ["title", "description", "keywords", "source", "reviewed", "reviewer"];
/** What a translation never says: it comes from the English page, so the structure cannot drift. */
const INHERITED_KEYS = ["area", "order", "group", "files", "module", "toc", "lead", "generate", "search", "nav", "layout"];
const HANDLE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;

/** Read a translation file: { meta, body, bodyLine }. Throws "file:line: …". */
export function parseTranslation(source, file) {
  const match = /^<!-- luz:page\n([\s\S]*?)\n-->\n/.exec(source);
  if (!match) throw new Error(`${file}:1: a translation starts with a <!-- luz:page … --> front matter comment`);
  const raw = {};
  const lines = {};
  match[1].split("\n").forEach((line, i) => {
    const where = `${file}:${i + 2}`;
    if (!line.trim()) return;
    const kv = /^([a-z]+):\s*(.*)$/.exec(line);
    if (!kv) throw new Error(`${where}: front matter lines are "key: value"`);
    const [, key, value] = kv;
    if (INHERITED_KEYS.includes(key)) throw new Error(`${where}: "${key}" comes from the English page: a translation does not set it`);
    if (!TRANSLATED_KEYS.includes(key)) throw new Error(`${where}: unknown front matter key "${key}" in a translation (${TRANSLATED_KEYS.join(", ")})`);
    if (key in raw) throw new Error(`${where}: "${key}" is set twice`);
    raw[key] = value.trim();
    lines[key] = i + 2;
  });
  for (const key of ["title", "description", "source"]) {
    if (!raw[key]) throw new Error(`${file}: front matter needs "${key}"`);
  }
  if (!/^[0-9a-f]{12}$/.test(raw.source)) {
    throw new Error(`${file}:${lines.source}: source "${raw.source}" is not 12 hex characters (the first 12 of the SHA-256 of the English body)`);
  }
  if (raw.reviewed !== undefined && raw.reviewed !== "true" && raw.reviewed !== "false") {
    throw new Error(`${file}:${lines.reviewed}: reviewed is "true" or "false"`);
  }
  const reviewed = raw.reviewed === "true";
  if (reviewed && !raw.reviewer) throw new Error(`${file}:${lines.reviewed}: reviewed is true and the page names no reviewer (reviewer: a GitHub handle)`);
  if (!reviewed && raw.reviewer) throw new Error(`${file}:${lines.reviewer}: reviewer "${raw.reviewer}" only goes with reviewed: true`);
  if (reviewed && !HANDLE.test(raw.reviewer)) throw new Error(`${file}:${lines.reviewer}: reviewer "${raw.reviewer}" is not a GitHub handle`);

  const meta = {
    title: raw.title,
    description: raw.description,
    keywords: raw.keywords ?? "",
    source: raw.source,
    reviewed,
    reviewer: reviewed ? raw.reviewer : undefined,
  };
  const rest = source.slice(match[0].length);
  const leading = /^(?:[ \t]*\n)*/.exec(rest)[0];
  const bodyLine = source.slice(0, match[0].length + leading.length).split("\n").length;
  return { meta, body: rest.slice(leading.length).replace(/\n$/, ""), bodyLine };
}

/* ---- The catalogs ----------------------------------------------------------------------- */

const PLURAL_KEY = new RegExp(`^(.+)\\.(${PLURAL_CATEGORIES.join("|")})$`);
const placeholdersOf = (value) => [...new Set([...value.matchAll(PLACEHOLDER)].map((m) => m[1]))].sort().join(", ");
const slugOf = (href) => href.split("/").filter(Boolean).at(-1);

/** The keys site.json derives, with where they come from: area.<id>, group.<area>.<group>, essential.<slug>. */
function derivedKeys(areas) {
  const keys = new Map();
  for (const area of areas) {
    keys.set(`area.${area.id}`, area.label);
    for (const group of area.groups ?? []) keys.set(`group.${area.id}.${group.id}`, group.label);
    for (const essential of area.essentials ?? []) {
      if (essential.label) keys.set(`essential.${slugOf(essential.href)}`, essential.label);
    }
  }
  return keys;
}

/** The categories a language's plural rules use. */
const categoriesOf = (code) => new Intl.PluralRules(code).resolvedOptions().pluralCategories;

/**
 * The keys a catalog of language `code` must have, as Map key → { from (where
 * the reference says so), same (the reference key whose {placeholders} it
 * repeats) }: the reference's keys, the plural categories of the language for
 * each plural family, and the keys derived from site.json.
 */
function requiredKeys(reference, code, derived, siteJson) {
  const required = new Map();
  const families = new Map();
  for (const key of Object.keys(reference.strings)) {
    const m = PLURAL_KEY.exec(key);
    if (m) {
      families.set(m[1], [...(families.get(m[1]) ?? []), key]);
      continue;
    }
    required.set(key, { from: `${reference.file}:${lineOfKey(reference.source, key)}`, same: key });
  }
  for (const [prefix, members] of families) {
    const other = members.find((k) => k.endsWith(".other")) ?? members[0];
    for (const category of categoriesOf(code)) {
      const key = `${prefix}.${category}`;
      const own = Object.hasOwn(reference.strings, key) ? key : other;
      required.set(key, { from: `${reference.file}:${lineOfKey(reference.source, own)}`, same: own, plural: prefix });
    }
  }
  for (const key of derived.keys()) required.set(key, { from: siteJson, same: null });
  return required;
}

/**
 * Read one strings.json and check it against the reference. `reference` is null
 * for the reference itself, which must only be well formed, free of the home
 * page's keys and have the plural categories of its own language.
 */
function readStrings({ abs, file, docsDir, home, reference, code, derived, siteJson }) {
  const source = readInside(abs, [docsDir]);
  const strings = checkCatalog(source, file);
  for (const [key, value] of Object.entries(strings)) {
    const at = `${file}:${lineOfKey(source, key)}`;
    if (value.includes("<")) {
      try {
        assertInlineHtml(value, `${file} "${key}"`);
      } catch (error) {
        throw new Error(`${at}: "${key}": ${String(error.message).replace(/^[^:]*:\d+: /, "")}`);
      }
    }
    if (Object.hasOwn(home.strings, key)) {
      throw new Error(`${at}: "${key}" is also in ${home.file}: a string the home page already has is reused, not repeated`);
    }
  }
  const self = { file, source, strings };
  const model = reference ?? self;
  // The reference needs no derived key (site.json says them in English), but may carry them
  const required = requiredKeys(model, code, reference ? derived : new Map(), siteJson);
  const allowed = new Set([...required.keys(), ...derived.keys()]);
  const categories = new Set(categoriesOf(code));
  for (const key of Object.keys(strings)) {
    if (allowed.has(key)) continue;
    const at = `${file}:${lineOfKey(source, key)}`;
    const family = PLURAL_KEY.exec(key);
    const prefix = family?.[1] ?? key.slice(0, key.lastIndexOf("."));
    if ([...required.values()].some((r) => r.plural === prefix)) {
      throw new Error(`${at}: "${key}" is not a plural category of ${code} (${[...categories].join(", ")})`);
    }
    throw new Error(`${at}: "${key}" is not in ${model.file}${reference ? ` or derived from ${siteJson}` : ""}`);
  }
  if (reference) {
    for (const [key, { from }] of required) {
      if (!Object.hasOwn(strings, key)) throw new Error(`${file}: missing "${key}" (${from})`);
    }
    for (const [key, { same, from }] of required) {
      if (!same) continue;
      const expected = placeholdersOf(reference.strings[same]);
      if (placeholdersOf(strings[key]) !== expected) {
        throw new Error(`${file}:${lineOfKey(source, key)}: "${key}" has not the {placeholders} of ${from}${expected ? ` ({${expected.split(", ").join("}, {")}})` : " (none)"}`);
      }
    }
  } else {
    for (const [key, { from }] of required) {
      if (!Object.hasOwn(strings, key)) throw new Error(`${file}: missing "${key}" (a plural family has the categories of ${code}: ${from})`);
    }
  }
  return self;
}

/**
 * Read apps/docs/i18n. `registry` is site.i18n (the home page's languages).
 * options: { repoRoot, areas (site.json), byRoute (the English pages) }.
 * Returns { dir, reference, languages, byCode } or null when the folder has no
 * language (not even the English reference). A language folder whose code is
 * not in the registry, one without strings.json, a translation without an
 * English page, a symlink or a file that is no page fail with "file:line".
 */
export function loadDocsLocales(docsDir, registry, { repoRoot = resolve(docsDir, "../.."), areas = [], byRoute = new Map() } = {}) {
  const dir = join(docsDir, "i18n");
  const rel = (p) => relative(repoRoot, p).split(sep).join("/");
  const stat = lstatSync(dir, { throwIfNoEntry: false });
  if (!stat) return null;
  if (stat.isSymbolicLink()) throw new Error(`${rel(dir)}: symlinks are not allowed in the docs sources`);
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1));
  const folders = [];
  for (const entry of entries) {
    if (entry.isSymbolicLink()) throw new Error(`${rel(join(dir, entry.name))}: symlinks are not allowed in the docs sources`);
    if (entry.isDirectory() && !entry.name.startsWith("_")) folders.push(entry.name);
  }
  if (!folders.length) return null;
  const registryFile = rel(join(repoRoot, "apps/landing/i18n/locales.json"));
  if (!registry) throw new Error(`${rel(join(dir, folders[0]))}: the docs languages are those of ${registryFile}, which this site does not have`);
  for (const code of folders) {
    if (!registry.byCode.has(code)) {
      throw new Error(`${rel(join(dir, code))}: "${code}" is not a language of ${registryFile} (${registry.locales.map((l) => l.code).join(", ")})`);
    }
  }

  const siteJson = rel(join(docsDir, "site.json"));
  const derived = derivedKeys(areas);
  const defaultCode = registry.default.code;
  const referenceAbs = join(dir, defaultCode, "strings.json");
  const referenceFile = rel(referenceAbs);
  if (!lstatSync(referenceAbs, { throwIfNoEntry: false })) {
    throw new Error(`${referenceFile}: missing (the reference catalog of the docs: the English strings every language must match)`);
  }
  const base = { docsDir, derived, siteJson, rel };
  const reference = {
    code: defaultCode,
    ...readStrings({ ...base, abs: referenceAbs, file: referenceFile, home: registry.default, reference: null, code: defaultCode }),
  };

  const languages = [];
  const byCode = new Map();
  for (const home of registry.locales) {
    if (home.code === defaultCode || !folders.includes(home.code)) continue;
    const abs = join(dir, home.code, "strings.json");
    const file = rel(abs);
    if (!lstatSync(abs, { throwIfNoEntry: false })) throw new Error(`${file}: missing (a docs language has a strings.json, like en)`);
    const own = readStrings({ ...base, abs, file, home, reference, code: home.code });
    const language = {
      code: home.code,
      name: home.name,
      dir: home.dir,
      route: home.route,
      docsRoute: `/${home.code}${DOCS}`,
      file,
      source: own.source,
      docsStrings: own.strings,
      strings: { ...home.strings, ...own.strings },
      numbers: home.numbers,
      alsoIn: home.file,
      home,
      pages: new Map(),
    };
    readTranslations({ language, docsDir, dir, byRoute, rel });
    languages.push(language);
    byCode.set(language.code, language);
  }
  return { dir, reference, languages, byCode };
}

/** The pages of apps/docs/i18n/<code>/pages, onto `language.pages` (English route → translation). */
function readTranslations({ language, docsDir, dir, byRoute, rel }) {
  const pagesDir = join(dir, language.code, "pages");
  if (!lstatSync(pagesDir, { throwIfNoEntry: false })) return;
  const roots = [docsDir];
  const walk = (folder, prefix) => {
    for (const entry of readdirSync(folder, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const abs = join(folder, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`${rel(abs)}: symlinks are not allowed in the docs sources`);
      if (entry.name.startsWith("_")) continue;
      if (entry.isDirectory()) {
        routeOfPage(`${prefix}${entry.name}/x.html`, rel(abs));
        walk(abs, `${prefix}${entry.name}/`);
      } else if (entry.isFile()) {
        const file = rel(abs);
        const path = `${prefix}${entry.name}`;
        const route = routeOfPage(path, file);
        const { meta, body, bodyLine } = parseTranslation(readInside(abs, roots), file);
        const english = byRoute.get(route);
        if (!english) throw new Error(`${file}: orphan translation: there is no English page at apps/docs/pages/${path}`);
        language.pages.set(route, { file, abs, route, path, meta, body, bodyLine, stale: meta.source !== sourceHash(english.body) });
      } else {
        throw new Error(`${rel(abs)}: only .html files and folders belong in pages/`);
      }
    }
  };
  walk(pagesDir, "");
}

/* ---- Links stay in the language ------------------------------------------------------------ */

const FILE_LINK = /\.[a-z0-9]+$/i;

/**
 * A translation says /docs/… like the English page; in a language's tree the
 * links go to that language's pages: `<a href="/docs/…">` becomes
 * `/<code>/docs/…`, `<a href="/">` the language's home, and the dialog's
 * `data-luz-search-src` its index. A link to a file (index.md), a link that
 * names a language (hreflang) and every `<link>` stay as written.
 */
export function localizeLinks(html, language) {
  const prefix = language.docsRoute;
  return html
    .replace(/<a\b[^>]*>/g, (tag) => {
      if (/\shreflang=/.test(tag)) return tag;
      return tag.replace(/(\shref=")([^"]*)(")/, (whole, before, href, after) => {
        const path = href.split(/[#?]/)[0];
        if (href === "/" || href.startsWith("/#")) return `${before}${language.route}${href.slice(1)}${after}`;
        if (href.startsWith(DOCS) && !FILE_LINK.test(path)) return `${before}${prefix}${href.slice(DOCS.length)}${after}`;
        return whole;
      });
    })
    .replaceAll('data-luz-search-src="/docs/search-index.json"', `data-luz-search-src="${prefix}search-index.json"`);
}

/* ---- A view of the site in a language -------------------------------------------------------- */

const views = new WeakMap();

/**
 * The English `site` seen in `language` (an entry of site.docsI18n.languages):
 * the same pages, in the same order, at /<code>/docs/…, with the translation's
 * title, description, keywords and body where there is one and the English
 * page where there is not (`fallback`, D3). `areas` carry the language's names.
 * Memoized. A page of the view is { ...englishPage, route, canonicalRoute,
 * english, file, abs, meta, body (its links in the language), rawBody (as
 * written), fallback, reviewed, lang }.
 */
export function localize(site, language) {
  let byCode = views.get(site);
  if (!byCode) views.set(site, (byCode = new Map()));
  if (byCode.has(language.code)) return byCode.get(language.code);

  const usage = site.usage;
  const t = makeT({ strings: language.strings, lang: language.code, usage, file: language.file });
  const prefix = language.docsRoute;
  const localRoute = (route) => prefix + route.slice(DOCS.length);
  const pages = site.pages.map((english) => {
    const tr = language.pages.get(english.route);
    const route = localRoute(english.route);
    const body = tr ? tr.body : english.body;
    return {
      ...english,
      route,
      depth: depthOf(route),
      canonicalRoute: english.route,
      english,
      file: tr ? tr.file : english.file,
      abs: tr ? tr.abs : english.abs,
      meta: tr ? { ...english.meta, title: tr.meta.title, description: tr.meta.description, keywords: tr.meta.keywords } : english.meta,
      body: localizeLinks(body, language),
      rawBody: body,
      bodyLine: tr ? tr.bodyLine : english.bodyLine,
      parsed: undefined,
      fallback: !tr,
      reviewed: tr ? tr.meta.reviewed : false,
      reviewer: tr?.meta.reviewer,
      stale: tr ? tr.stale : false,
      lang: tr ? language.code : "en",
    };
  });
  const byRoute = new Map(pages.map((p) => [p.route, p]));
  const areas = site.areas.map((area) => ({
    ...area,
    label: t(`area.${area.id}`),
    groups: area.groups?.map((group) => ({ ...group, label: t(`group.${area.id}.${group.id}`) })),
    // A labelled essential is said in the language when its page is translated, else as written (English)
    essentials: area.essentials?.map((essential) => {
      const translated = language.pages.has(essential.href);
      return {
        href: localRoute(essential.href),
        ...(essential.label ? { label: translated ? t(`essential.${slugOf(essential.href)}`) : essential.label, english: !translated } : {}),
      };
    }),
  }));

  const view = {
    ...site,
    base: site,
    locale: language,
    lang: language.code,
    docsRoute: prefix,
    pages,
    byRoute,
    byFile: new Map(pages.filter((p) => !p.fallback).map((p) => [p.abs, p])),
    areas,
    readingOrder: undefined,
    t,
  };
  byCode.set(language.code, view);
  return view;
}

/* ---- Parity ------------------------------------------------------------------------------------ */

/** Attributes whose text a translator changes: compared by presence only. */
const BY_PRESENCE = (name) => ["alt", "title", "aria-label", "placeholder", "data-label", "lang"].includes(name) || name.startsWith("data-luz-label-");
/** Elements whose text is code, byte for byte (D7). */
const CODE_ELEMENTS = new Set(["pre", "code", "kbd", "samp", "var"]);
const MARKER = /<!--\s*luz:[^]*?-->|\{\{[^{}]*\}\}/g;
const ARABIC_DIGITS = { "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9", "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9", "٫": ".", "٬": "," };
const FIGURE = /\d[\d.,]*(?::\d+)?/g;

/** What parity compares in a body, with where each thing is (line of the body, 1-based). */
function factsOf(body, file) {
  const skeleton = [];
  const headings = [];
  const links = [];
  const code = [];
  const figures = [];
  const open = [];
  let hidden = 0;
  let inCode = null;
  let last = 0;
  const lineOf = (index) => body.slice(0, index).split("\n").length;
  const text = (to) => {
    if (inCode || hidden) return;
    const raw = body.slice(last, to).replace(/<!--[^]*?-->/g, "");
    const normal = decodeEntities(raw).replace(/[٠-٩۰-۹٫٬]/g, (c) => ARABIC_DIGITS[c]);
    for (const m of normal.matchAll(FIGURE)) {
      figures.push({ sign: m[0].replace(/[.,]+$/, ""), line: lineOf(last) });
    }
  };
  for (const tag of tags(body, file)) {
    text(tag.index);
    last = tag.end;
    if (tag.type === "start") {
      const attrs = [...tag.attrs]
        .filter(([name]) => name !== "href")
        .map(([name, value]) => (BY_PRESENCE(name) ? name : `${name}=${value}`))
        .sort();
      skeleton.push({ sign: `<${tag.name}${attrs.length ? ` ${attrs.join(" ")}` : ""}>`, line: tag.line });
      if (/^h[1-6]$/.test(tag.name)) headings.push({ sign: `h${tag.name[1]}#${tag.attrs.get("id") ?? ""}`, line: tag.line });
      if (tag.name === "a" && tag.attrs.has("href")) links.push({ sign: tag.attrs.get("href"), line: tag.line });
      if (tag.name === "script" || tag.name === "style") {
        hidden++;
      }
      if (!tag.selfClosing && ![ "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"].includes(tag.name)) {
        open.push({ name: tag.name, start: tag.end });
        if (!inCode && CODE_ELEMENTS.has(tag.name)) inCode = { depth: open.length, start: tag.end, line: tag.line };
      }
    } else {
      skeleton.push({ sign: `</${tag.name}>`, line: tag.line });
      const at = open.findLastIndex((o) => o.name === tag.name);
      if (at > -1) open.length = at;
      if (tag.name === "script" || tag.name === "style") hidden--;
      if (inCode && open.length < inCode.depth) {
        code.push({ sign: body.slice(inCode.start, tag.index), line: inCode.line });
        inCode = null;
      }
    }
  }
  text(body.length);
  const markers = [...body.matchAll(MARKER)].map((m) => ({ sign: m[0].replace(/\s+/g, " "), line: lineOf(m.index) }));
  return { skeleton, headings, links, code, figures, markers };
}

const show = (sign) => (sign.length > 60 ? `${JSON.stringify(sign.slice(0, 57))}…` : JSON.stringify(sign));

/**
 * What a translation changed that only the words may change, against the
 * English page it was made from. `english` and `translation` are { file, body,
 * bodyLine }. Returns ["<translation file>:<line>: <rule>: message"], the rule
 * being skeleton (elements, nesting, attributes), heading (ids, levels, order),
 * link (the `href`s), code (the text of pre, code, kbd, samp and var), figure
 * (the numbers outside code) or marker (<!-- luz:… --> and {{…}}).
 */
export function parityProblems(english, translation) {
  const problems = [];
  let en;
  let tr;
  try {
    en = factsOf(english.body, english.file);
    tr = factsOf(translation.body, translation.file);
  } catch (error) {
    return [`${translation.file}:${translation.bodyLine}: skeleton: ${String(error.message).replace(/^[^:]*:\d+: /, "")}`];
  }
  const at = (line) => `${translation.file}:${translation.bodyLine + (line ?? 1) - 1}`;
  const compare = (rule, a, b, noun) => {
    const i = a.findIndex((x, k) => b[k]?.sign !== x.sign);
    if (i === -1 && a.length === b.length) return;
    const found = b[i === -1 ? a.length : i];
    const wanted = a[i === -1 ? a.length : i];
    if (!found) {
      problems.push(`${at(b.at(-1)?.line)}: ${rule}: the English page has ${a.length} ${noun}, the translation ${b.length}; ${noun} #${b.length + 1} is missing (${show(wanted.sign)})`);
    } else if (!wanted) {
      problems.push(`${at(found.line)}: ${rule}: the translation has ${noun} #${i + 1} (${show(found.sign)}) that the English page does not have`);
    } else {
      problems.push(`${at(found.line)}: ${rule}: ${noun} #${i + 1} is ${show(found.sign)}, the English page has ${show(wanted.sign)}`);
    }
  };
  compare("skeleton", en.skeleton, tr.skeleton, "tag");
  compare("heading", en.headings, tr.headings, "heading");
  compare("link", en.links, tr.links, "link");
  compare("code", en.code, tr.code, "code text");
  compare("figure", en.figures, tr.figures, "number");
  compare("marker", en.markers, tr.markers, "marker");
  return problems;
}
