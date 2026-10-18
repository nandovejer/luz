/**
 * A throwaway docs repository with docs in English, Spanish and Arabic, for
 * the tests of the docs languages (docs-i18n-catalog, -routes, -pages and
 * -chrome). It writes a small site under the OS temp folder and removes it
 * after the test (cleanupFixtures() in an afterEach).
 *
 * What is real and what is made up:
 *   - real, copied: the layout and the partials the docs render with
 *     (apps/docs/_layouts, apps/docs/_partials, apps/site/_partials), the
 *     home page's registry and catalogs (apps/landing/i18n), the English
 *     catalog of the docs (apps/docs/i18n/en/strings.json) and
 *     packages/core/package.json (for {{version}}). The fixture renders what
 *     the real site renders, and follows it when the layout changes.
 *   - made up: site.json (four areas), fifteen tiny pages, the Spanish and
 *     Arabic catalogs and the translations. The catalogs are "pseudo
 *     translations" of the English one: in Spanish every word starts with
 *     "ñ", in Arabic every Latin letter is an Arabic letter, so a string that was
 *     translated never contains the English one (the chrome test relies on
 *     it) and the plural categories carry their name ("[few]").
 *
 * The API of the feature that the tests fix (the design names the first
 * four; the rest is the simplest name where the design is silent). Every
 * test file of the docs languages uses exactly these.
 *
 * scripts/docs-site/docs-i18n.js
 *   loadDocsLocales(docsDir, registry)  registry = site.i18n (i18n.js); null when
 *                                       apps/docs/i18n has no language folder
 *   localize(site, language)            a derived site (see below), memoized
 *   parityProblems(english, translation)  ["file:line: message"]; english and
 *                                       translation are { file, body, bodyLine }
 *   localizeLinks(html, language)
 *   sourceHash(englishBody)             12 hex (D5)
 * scripts/docs-site/site.js
 *   scanSite(...).docsI18n              null, or the result of loadDocsLocales:
 *     { dir, reference, languages, byCode }
 *     reference  { code: "en", file, source, strings }   (docs-only strings of en)
 *     language   { code, name, dir, route ("/es/"), docsRoute ("/es/docs/"),
 *                  file (its strings.json), source, docsStrings, strings
 *                  (home catalog + docs catalog merged), pages: Map english route ->
 *                  translation { file, abs, route (the English route), meta
 *                  { title, description, keywords, source, reviewed (boolean),
 *                  reviewer }, body, bodyLine, stale (source is not the hash of
 *                  the English body: allowed, D6) } }
 *     language.dir is "ltr" or "rtl", the registry's.
 *   localize(site, language)            { ...site, locale, docsRoute, pages, byRoute, areas, t(key, vars) }
 *     pages[i]  { ...englishPage, route ("/es/docs/x/"), canonicalRoute ("/docs/x/"), english,
 *                 file (the translation's, else the English page's), fallback (boolean),
 *                 reviewed (boolean, false for a fallback), lang ("es", "en" for a fallback), meta, body }
 *     same order as site.pages
 *   renderPage(view, localizedSite, { dev, root, siteUrl })  a localized page
 *   renderPage(englishPage, site, { siteUrl })                an English page: now with its alternates
 *   buildSite(site, { languages: true })   renders every localized page too:
 *                                       rendered has "/es/docs/x/" and "/ar/docs/x/"
 *   a missing / extra key, a placeholder mismatch, a key of both catalogs, an
 *   orphan translation and a forbidden front matter key throw from scanSite
 *   with "file:line"; a key used by no render is a problem of buildSite.
 * Catalog keys the tests name (design section c): chrome.skip, chrome.nav,
 * title.site, format.date-locale, chip.issues.<category>, notice.untranslated,
 * notice.pending, notice.pending-statement, notice.english, area.<id>,
 * group.<area>.<group>, essential.<last segment of the href>.
 * Placeholders in the layout: {{lang}} {{dir}} {{alternates}} {{notice}}
 * {{contentattrs}} (RAW, `lang="en" dir="ltr"` on div.docs-body of a fallback).
 */
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeEntities, tags } from "../../scripts/docs-site/html.js";
import { scanSite } from "../../scripts/docs-site/site.js";

export const REPO = fileURLToPath(new URL("../../", import.meta.url));

/** The module of the feature, or an error that says it is not there yet. */
export async function docsI18nModule() {
  try {
    return await import("../../scripts/docs-site/docs-i18n.js");
  } catch (error) {
    throw new Error(
      `scripts/docs-site/docs-i18n.js does not exist yet: the design names it (loadDocsLocales, localize, parityProblems, localizeLinks). ${error.message}`,
    );
  }
}

/** The source hash of a translation (D5): first 12 hex of the sha-256 of the English body, white space collapsed. */
export const hashOf = (body) => createHash("sha256").update(body.replace(/\s+/g, " ").trim()).digest("hex").slice(0, 12);

/** The message of the error `fn` throws; fails with `label` when it throws nothing (the feature does not refuse it yet). */
export function messageOf(fn, label) {
  try {
    fn();
  } catch (error) {
    return String(error.message);
  }
  throw new Error(`${label}: nothing was thrown`);
}

/** The language `code` of a scanned site, or an error that says the feature is not there yet. */
export function docsLanguage(site, code) {
  if (!site.docsI18n) throw new Error("scanSite(...).docsI18n is missing: the loader of apps/docs/i18n is not there yet (design section a)");
  const language = site.docsI18n.byCode.get(code);
  if (!language) throw new Error(`scanSite(...).docsI18n has no language "${code}"`);
  return language;
}

/** The English catalog of the real docs, or an error that says it is not there yet. */
export function realEnglishStrings() {
  const file = join(REPO, "apps/docs/i18n/en/strings.json");
  if (!existsSync(file)) throw new Error("apps/docs/i18n/en/strings.json does not exist yet: it is the reference catalog of the docs (design section c)");
  return JSON.parse(readFileSync(file, "utf-8"));
}

/* ---- Pseudo translation ------------------------------------------------------- */

const ARABIC_LETTERS = [..."ابتثجحخدذرزسشصضطظعغفقكلمنهوي"];
const KEEP = /(<[^>]*>|\{[^{}]*\}|&[a-z]+;|&#\d+;)/;
/** A string with every word of its text (not its tags, {placeholders} and entities) replaced. */
export function pseudo(code, value) {
  const word = code === "ar" ? (w) => w.replace(/[A-Za-z]/g, (c) => ARABIC_LETTERS[c.charCodeAt(0) % ARABIC_LETTERS.length]) : (w) => `ñ${w}`;
  return value
    .split(KEEP)
    .map((part, i) => (i % 2 ? part : part.replace(/[A-Za-z][A-Za-z'’-]*/g, word)))
    .join("");
}

const PLURAL = /^(.+)\.(zero|one|two|few|many|other)$/;
/** The date format of each language, as the design fixes it (the ar one has a Gregorian calendar and Latin digits). */
export const DATE_LOCALE = { es: "es", ar: "ar-u-ca-gregory-nu-latn", fr: "fr" };

/**
 * The strings.json of a language: the English catalog, pseudo translated, with
 * the plural categories of the language and the keys derived from site.json.
 */
export function pseudoCatalog(code, enStrings, siteJson) {
  const out = {};
  const forms = new Map();
  for (const [key, value] of Object.entries(enStrings)) {
    const m = PLURAL.exec(key);
    if (m) forms.set(m[1], { ...forms.get(m[1]), [m[2]]: value });
    else out[key] = pseudo(code, value);
  }
  for (const [prefix, byCategory] of forms) {
    for (const category of new Intl.PluralRules(code).resolvedOptions().pluralCategories) {
      out[`${prefix}.${category}`] = `${pseudo(code, byCategory[category] ?? byCategory.other)} [${category}]`;
    }
  }
  out["format.date-locale"] = DATE_LOCALE[code];
  for (const area of siteJson.areas) {
    out[`area.${area.id}`] = pseudo(code, area.label);
    for (const group of area.groups ?? []) out[`group.${area.id}.${group.id}`] = pseudo(code, group.label);
    for (const essential of area.essentials ?? []) {
      if (essential.label) out[`essential.${essential.href.split("/").filter(Boolean).at(-1)}`] = pseudo(code, essential.label);
    }
  }
  return out;
}

/* ---- The pages ------------------------------------------------------------------ */

export const SITE_JSON = {
  areas: [
    { id: "get-started", label: "Get started", slug: "get-started", essentials: [{ href: "/docs/components/" }, { href: "/docs/tokens/color/", label: "Color tokens" }] },
    { id: "tokens", label: "Tokens", slug: "tokens", package: "@luz-ds/tokens", groups: [{ id: "families", label: "Token families" }] },
    {
      id: "components",
      label: "Components",
      slug: "components",
      package: "@luz-ds/core",
      groups: [
        { id: "actions", label: "Actions and input" },
        { id: "helpers", label: "Helpers", sidebar: true, list: true },
      ],
      essentials: [{ href: "/docs/get-started/" }],
    },
    { id: "accessibility", label: "Accessibility", slug: "accessibility" },
  ],
};

/** A page source: the front matter comment, then the body. */
export const pageSource = (meta, body) =>
  `<!-- luz:page\n${Object.entries(meta).map(([key, value]) => `${key}: ${value}`).join("\n")}\n-->\n${body}\n`;

/**
 * The English pages: path (inside pages/) -> { meta, body(t) }. `body` takes
 * the function that turns an English text into the language's, so a
 * translation has the same markup by construction.
 */
export const PAGES = {
  "index.html": {
    meta: { title: "LUZ documentation", description: "Start from here.", area: "hub", toc: "false" },
    body: (t) => `<p>${t("Welcome to the docs.")} <a href="/docs/get-started/">${t("Get started")}</a>.</p>`,
  },
  "a-z/index.html": {
    meta: { title: "A–Z index: A–L", description: "Every page, from A to L.", area: "hub", toc: "false", search: "false", generate: "a-z" },
    body: () => "",
  },
  "a-z/m-z.html": {
    meta: { title: "A–Z index: M–Z", description: "Every page, from M to Z.", area: "hub", toc: "false", search: "false", generate: "a-z" },
    body: () => "",
  },
  "accessibility.html": {
    meta: { title: "Accessibility statement", description: "What is checked and what is not.", area: "accessibility", toc: "false" },
    body: (t) => `<h2 id="target">${t("Target")}</h2>\n<p>${t("LUZ aims for level AA.")}</p>`,
  },
  "get-started/index.html": {
    meta: { title: "Get started", description: "Start here and install LUZ.", area: "get-started", generate: "gallery" },
    body: (t) =>
      [
        `<p>${t("Start here. See")} <a href="/docs/get-started/install/">${t("Install")}</a>, ${t("the")} <a href="/docs/components/widget/">${t("widget")}</a> ${t("and")} <a href="#three">${t("section three")}</a>.</p>`,
        `<h2 id="one">${t("One")}</h2>`,
        `<p>${t("First section.")}</p>`,
        `<h2 id="two">${t("Two")}</h2>`,
        '<pre class="luz-code-block"><code>npm install @luz-ds/core</code></pre>',
        `<h2 id="three">${t("Three")}</h2>`,
        `<p>${t("The ratio is")} 4.5:1.</p>`,
        "<!-- luz:generated -->",
      ].join("\n"),
  },
  "get-started/install.html": {
    meta: { title: "Install LUZ", description: "One command installs it.", area: "get-started", order: "1" },
    body: (t) => `<p>${t("Run the command.")}</p>\n<pre class="luz-code-block"><code>pnpm add @luz-ds/core</code></pre>`,
  },
  "get-started/other.html": {
    meta: { title: "Other ways", description: "Other ways to start.", area: "get-started", order: "2" },
    body: (t) => `<p>${t("Not translated anywhere.")}</p>`,
  },
  "tokens/index.html": {
    meta: { title: "Tokens", description: "The design tokens.", area: "tokens", generate: "gallery" },
    body: (t) => `<p>${t("The tokens.")}</p>\n<!-- luz:generated -->`,
  },
  "tokens/color.html": {
    meta: { title: "Color tokens", description: "The colors.", area: "tokens", group: "families" },
    body: (t) => `<p>${t("Colors.")}</p>`,
  },
  "tokens/modes.html": {
    meta: { title: "Color modes", description: "Light, dark and high contrast.", area: "tokens", group: "families" },
    body: (t) => `<p>${t("Modes.")}</p>`,
  },
  "components/index.html": {
    meta: { title: "Components", description: "The components.", area: "components", generate: "gallery" },
    body: (t) => `<p>${t("Every component.")}</p>\n<!-- luz:generated -->`,
  },
  "components/widget.html": {
    meta: {
      title: "Widget",
      description: "A widget does one thing.",
      area: "components",
      group: "actions",
      toc: "h2,h3",
      files: "components/widget.css; components/widget-extra.css",
      module: "widget.js",
    },
    body: (t, issues = '<ul><li>First problem.</li><li>Second problem.</li></ul>') =>
      [
        `<h2 id="example">${t("Example")}</h2>`,
        `<div class="docs-example" data-docs-specimen><button type="button" class="luz-btn">${t("Save")}</button></div>`,
        `<h2 id="known-issues">${t("Known issues")}</h2>`,
        issues,
        `<h2 id="code">${t("Code")}</h2>`,
        `<h3 id="markup">${t("Copy the markup")}</h3>`,
        `<p>${t("Copy it.")}</p>`,
      ].join("\n"),
  },
  "components/button.html": {
    meta: { title: "Button", description: "A button.", area: "components", group: "actions", toc: "h2,h3" },
    body: (t) => `<h2 id="example">${t("Example")}</h2>\n<h2 id="known-issues">${t("Known issues")}</h2>\n<p>${t("None known.")}</p>`,
  },
  "components/form.html": {
    meta: { title: "Form fields", description: "Form fields.", area: "components", group: "actions", toc: "h2,h3" },
    body: (t) => `<h2 id="example">${t("Example")}</h2>\n<h2 id="known-issues">${t("Known issues")}</h2>\n<p>${t("None known.")}</p>`,
  },
  "components/helper.html": {
    meta: { title: "Visually hidden", description: "A helper.", area: "components", group: "helpers" },
    body: (t) => `<p>${t("A helper.")}</p>`,
  },
};

/** Which pages each language translates, and how (the others are the fallback). */
export const TRANSLATED = {
  es: {
    "index.html": { reviewed: false },
    "accessibility.html": { reviewed: false },
    "get-started/index.html": { reviewed: false },
    "get-started/install.html": { reviewed: true, reviewer: "nandovejer" },
    "components/index.html": { reviewed: false },
  },
  ar: {
    "index.html": { reviewed: false },
    "accessibility.html": { reviewed: false },
    "get-started/index.html": { reviewed: false },
    "tokens/index.html": { reviewed: false },
    "components/index.html": { reviewed: false },
  },
};

const english = (text) => text;
/** The English source of a page of PAGES. */
export const englishSource = (path, overrides = {}) => {
  const page = PAGES[path];
  return pageSource({ ...page.meta, ...overrides.meta }, overrides.body ?? page.body(english));
};
/** The body of an English page, as scanSite reads it (no front matter, no final newline). */
export const englishBody = (path) => PAGES[path].body(english);

/** The source of a translation of a page of PAGES, in `code`, with the front matter of a translation. */
export function translationSource(code, path, { reviewed = false, reviewer, meta = {}, body, source } = {}) {
  const page = PAGES[path];
  const t = (text) => pseudo(code, text);
  const front = {
    title: pseudo(code, page.meta.title),
    description: pseudo(code, page.meta.description),
    keywords: pseudo(code, "other name"),
    source: source ?? hashOf(page.body(english)),
    reviewed: String(reviewed),
    ...(reviewer ? { reviewer } : {}),
    ...meta,
  };
  return pageSource(front, body ?? page.body(t));
}

/* ---- The repository -------------------------------------------------------------- */

const temps = [];
/** Remove every fixture made since the last call: afterEach(cleanupFixtures). */
export function cleanupFixtures() {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
}

const write = (root, path, text) => {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
};

/**
 * Make the repository. Options:
 *   languages    the docs languages that get a folder (default ["es", "ar"]); "en" is always there
 *   siteJson     the site.json (default SITE_JSON)
 *   catalogs     { es: (strings) => strings } changes a language's catalog before it is written
 *                (a function that returns a new object); { en: … } changes the English one
 *   pages        { "path.html": source | null } replaces, adds or removes an English page
 *   translations { es: { "path.html": source | null } } replaces, adds or removes a translation
 *                (default: TRANSLATED); null removes it
 *   files        { "repo/relative/path": text | null } any other file
 *   registry     the home page's registry (default: the real one)
 *   english      the English catalog (default: the real one, which the feature adds)
 *   i18n         false: no apps/docs/i18n folder at all (a site that does not opt in)
 *                (catalogs: { en: false } writes the other languages and no English folder)
 * Returns { root, docsDir, scan(), path(rel), read(rel), symlink(target, rel), cleanup() }.
 */
export function docsI18nFixture({ languages = ["es", "ar"], siteJson = SITE_JSON, catalogs = {}, pages = {}, translations = {}, files = {}, registry, english: englishStrings, i18n = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), "luz-docs-i18n-"));
  temps.push(root);
  const docsDir = join(root, "apps/docs");
  for (const dir of ["apps/docs/_layouts", "apps/docs/_partials", "apps/site/_partials", "apps/landing/i18n"]) {
    cpSync(join(REPO, dir), join(root, dir), { recursive: true });
  }
  mkdirSync(join(root, "packages/core"), { recursive: true });
  cpSync(join(REPO, "packages/core/package.json"), join(root, "packages/core/package.json"));
  if (registry) write(root, "apps/landing/i18n/locales.json", JSON.stringify(registry, null, 2));
  write(root, "apps/docs/site.json", JSON.stringify(siteJson));

  const allPages = { ...Object.fromEntries(Object.keys(PAGES).map((path) => [path, englishSource(path)])), ...pages };
  for (const [path, source] of Object.entries(allPages)) if (source !== null) write(root, `apps/docs/pages/${path}`, source);

  const en = i18n ? (englishStrings ?? realEnglishStrings()) : {};
  const json = (strings) => JSON.stringify(strings, null, 2);
  if (i18n && catalogs.en !== false) write(root, "apps/docs/i18n/en/strings.json", json(catalogs.en ? catalogs.en(en) : en));
  for (const code of i18n ? languages : []) {
    const strings = pseudoCatalog(code, en, siteJson);
    write(root, `apps/docs/i18n/${code}/strings.json`, json(catalogs[code] ? catalogs[code](strings) : strings));
    const own = { ...Object.fromEntries(Object.entries(TRANSLATED[code] ?? {}).map(([path, opts]) => [path, translationSource(code, path, opts)])), ...translations[code] };
    for (const [path, source] of Object.entries(own)) if (source !== null) write(root, `apps/docs/i18n/${code}/pages/${path}`, source);
  }
  for (const [path, text] of Object.entries(files)) if (text !== null) write(root, path, text);

  return {
    root,
    docsDir,
    scan: () => scanSite(docsDir, root),
    path: (rel) => join(root, rel),
    read: (rel) => readFileSync(join(root, rel), "utf-8"),
    cleanup: () => {
      rmSync(root, { recursive: true, force: true });
      const at = temps.indexOf(root);
      if (at > -1) temps.splice(at, 1);
    },
    symlink: (target, rel) => {
      mkdirSync(dirname(join(root, rel)), { recursive: true });
      symlinkSync(target, join(root, rel));
    },
  };
}

/* ---- Reading a rendered page ------------------------------------------------------- */

/**
 * The language of a node of a parsed page (tests/helpers/html-dom.js): the
 * `lang` of itself or of the nearest ancestor that has one, else the html's.
 */
export function languageOf(node) {
  for (let n = node; n; n = n.parent) if (n.attrs?.has("lang")) return n.attrs.get("lang");
  return null;
}

/** Every <link rel=… hreflang=… href=…> of the head, as { rel, hreflang, href }. */
export function headLinks(html) {
  const head = html.slice(0, html.indexOf("</head>"));
  return [...tags(head, "<head>")]
    .filter((t) => t.type === "start" && t.name === "link" && ["canonical", "alternate"].includes(t.attrs.get("rel")))
    .map((t) => ({ rel: t.attrs.get("rel"), hreflang: t.attrs.get("hreflang") ?? null, href: t.attrs.get("href") }));
}

/** The text of the `<title>`. */
export const titleOf = (html) => /<title>([\s\S]*?)<\/title>/.exec(html)?.[1].replace(/&amp;/g, "&").replace(/&#39;/g, "'") ?? "";

/**
 * What a reader meets in the chrome of a rendered page: the text nodes and the
 * values of aria-label, title, alt, placeholder and data-luz-label-*, of the
 * <body> without anything inside [lang="en"], pre, code, kbd, script, style or
 * svg. [{ kind: "text" | "<attribute>", value, line }].
 */
export function chromeOf(html) {
  const out = [];
  const bodyAt = html.indexOf("<body");
  const skip = new Set(["pre", "code", "kbd", "script", "style", "svg"]);
  const voids = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
  const hidden = [];
  let skipping = 0;
  let last = 0;
  const lineOf = (index) => html.slice(0, index).split("\n").length;
  const text = (end) => {
    if (skipping) return;
    const value = decodeEntities(html.slice(last, end).replace(/<!--[\s\S]*?-->/g, "")).replace(/\s+/g, " ").trim();
    if (value) out.push({ kind: "text", value, line: lineOf(last) });
  };
  for (const tag of tags(html.slice(0, html.indexOf("</body>")), "<page>")) {
    if (tag.index < bodyAt) continue;
    if (tag.name !== "body") text(tag.index);
    last = tag.end;
    if (tag.name === "body") continue;
    if (tag.type === "start") {
      if (!skipping) {
        for (const [name, value] of tag.attrs) {
          if (["aria-label", "title", "alt", "placeholder"].includes(name) || name.startsWith("data-luz-label-")) out.push({ kind: name, value, line: tag.line });
        }
      }
      if (!voids.has(tag.name) && !tag.selfClosing) {
        const inert = skip.has(tag.name) || tag.attrs.get("lang") === "en";
        hidden.push(inert);
        if (inert) skipping++;
      }
    } else if (hidden.length && hidden.pop()) {
      skipping--;
    }
  }
  return out;
}
