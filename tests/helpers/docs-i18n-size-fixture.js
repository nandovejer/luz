/**
 * A throwaway copy of the docs site with docs in Spanish and Arabic, for the
 * tests that measure what the docs publish in every language (size, index.md,
 * the search index, check:i18n and check:strings).
 *
 * The copy is a small repository in a temporary folder:
 *
 *   apps/docs/          a copy of the real one (not assets/ or node_modules/)
 *   apps/site/          _partials/ and boot.js, copied
 *   apps/landing/       i18n/ (the home's registry and catalogs) and index.html, copied
 *   packages/, tests/, scripts/   symbolic links to the real ones (read, never written)
 *   budgets.json        copied (the home's weights are measured against it; run `pnpm build` first)
 *
 * so scanSite(docsDir, repoRoot) and the Vite plugin work on it as they do on
 * the real one, and the numbers they give are the real pages in real chrome.
 *
 * A language is opt-in by folder (decision D1): `apps/docs/i18n/<code>/`. When
 * the real site already has the folder, the copy keeps it, translations
 * included, so the same test measures the real site once it is translated.
 * When it does not, the copy gets a stand-in: a `strings.json` made from the
 * English reference catalog (`apps/docs/i18n/en/strings.json`) and no page, so
 * every page of the language is the English one in that language's chrome (the
 * fallback, decision D3). The Arabic stand-in writes every letter of the
 * chrome strings as one Arabic letter (2 bytes in UTF-8), which is what a real
 * Arabic string weighs per character, or a little more: a ceiling the stand-in
 * passes, the real catalog passes.
 *
 * What this file assumes about the catalog (docs-i18n-design.md, section c):
 *   - flat `strings.json`, keys `[a-z0-9.-]`, the same `{placeholders}`
 *   - the reference key set is the keys of `en/strings.json` plus the keys
 *     derived from site.json: `area.<id>`, `group.<area>.<group>`,
 *     `essential.<last segment of the href>` for an essential with a label
 *     (the stand-in adds them when `en/strings.json` does not already have them)
 *   - plural keys end in a plural category (`chip.issues.one`); a language has
 *     the categories of `new Intl.PluralRules(code).resolvedOptions()`
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** The real repository (the worktree this file is in). */
export const REAL_REPO = fileURLToPath(new URL("../../", import.meta.url));

/** The `source` of a translation (decision D5): the first 12 hex of the SHA-256 of the English body, whitespace collapsed. */
export const sourceHash = (body) => createHash("sha256").update(body.replace(/\s+/g, " ").trim()).digest("hex").slice(0, 12);

/* ---- The stand-in catalog -------------------------------------------------- */

const PLURAL = /^(.+)\.(zero|one|two|few|many|other)$/;
const ARABIC_LETTERS = [..."ابتثجحخدذرزسشصضطظعغفقكلمنهوي"];

/** Every Latin letter of the text outside tags, {placeholders} and entities, as one Arabic letter. */
const pseudoArabic = (text) =>
  text.replace(/(<[^>]*>|\{[^}]*\}|&[a-z#0-9]+;)|([A-Za-z])/g, (whole, keep, letter) => (keep ? whole : ARABIC_LETTERS[letter.charCodeAt(0) % ARABIC_LETTERS.length]));

/**
 * The strings.json of a language of the stand-in tree, from the English
 * reference and site.json (see the assumptions above).
 */
export function standInCatalog(code, enStrings, siteJson) {
  const text = code === "ar" ? pseudoArabic : (value) => value;
  const out = {};
  const plurals = new Map();
  for (const [key, value] of Object.entries(enStrings)) {
    const m = PLURAL.exec(key);
    if (m) plurals.set(m[1], { ...plurals.get(m[1]), [m[2]]: value });
    else out[key] = text(value);
  }
  const categories = new Intl.PluralRules(code).resolvedOptions().pluralCategories;
  for (const [prefix, forms] of plurals) {
    for (const category of categories) out[`${prefix}.${category}`] = text(forms[category] ?? forms.other ?? Object.values(forms)[0]);
  }
  for (const area of siteJson.areas) {
    out[`area.${area.id}`] ??= text(area.label);
    for (const group of area.groups ?? []) out[`group.${area.id}.${group.id}`] ??= text(group.label);
    for (const essential of area.essentials ?? []) {
      if (essential.label) out[`essential.${essential.href.split("/").filter(Boolean).at(-1)}`] ??= text(essential.label);
    }
  }
  return out;
}

/** Write `apps/docs/i18n/<code>/strings.json` (a stand-in) in a docs folder, unless the language is already there. */
export function addDocsLanguage(docsDir, code) {
  const folder = join(docsDir, "i18n", code);
  if (existsSync(folder)) return false;
  const reference = join(docsDir, "i18n", "en", "strings.json");
  const en = existsSync(reference) ? JSON.parse(readFileSync(reference, "utf-8")) : {};
  const siteJson = JSON.parse(readFileSync(join(docsDir, "site.json"), "utf-8"));
  // The reference language also needs its derived keys, as the other languages do
  if (!existsSync(reference)) {
    mkdirSync(dirname(reference), { recursive: true });
    writeFileSync(reference, `${JSON.stringify(standInCatalog("en", en, siteJson), null, 2)}\n`);
  }
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, "strings.json"), `${JSON.stringify(standInCatalog(code, JSON.parse(readFileSync(reference, "utf-8")), siteJson), null, 2)}\n`);
  return true;
}

/* ---- The probe: one small page, in English and in each language --------------- */

/**
 * A page of the copy that exists only here, with a translation in each
 * language. Its body is one line without a doubled space, so the `source` of
 * the translation is the same under any reasonable whitespace rule.
 */
export const PROBE = {
  route: "/docs/get-started/i18n-probe/",
  file: "get-started/i18n-probe.html",
  english: {
    title: "Probe page",
    description: "A page that exists only in the tests of the languages.",
    keywords: "",
    body: '<h2 id="probe-heading">Probe heading</h2><p>A plain sentence for the probe.</p><p>Go back to the <a href="/docs/get-started/">install guide</a>.</p><pre class="luz-code-block"><code>npm i @luz-ds/core</code></pre>',
  },
  es: {
    title: "Página de prueba",
    description: "Una página que solo existe en las pruebas de los idiomas.",
    keywords: "sonda",
    body: '<h2 id="probe-heading">Encabezado de la sonda</h2><p>Una frase sencilla para la sonda.</p><p>Vuelve a la <a href="/docs/get-started/">guía de instalación</a>.</p><pre class="luz-code-block"><code>npm i @luz-ds/core</code></pre>',
  },
  ar: {
    title: "صفحة تجريبية",
    description: "صفحة لا توجد إلا في اختبارات اللغات.",
    keywords: "مسبار",
    body: '<h2 id="probe-heading">عنوان المسبار</h2><p>جملة بسيطة للمسبار.</p><p>ارجع إلى <a href="/docs/get-started/">دليل التثبيت</a>.</p><pre class="luz-code-block"><code>npm i @luz-ds/core</code></pre>',
  },
};

const englishProbe = () =>
  `<!-- luz:page\ntitle: ${PROBE.english.title}\ndescription: ${PROBE.english.description}\narea: get-started\norder: 9999\ntoc: false\n-->\n${PROBE.english.body}\n`;

const translatedProbe = (code) => {
  const t = PROBE[code];
  return `<!-- luz:page\ntitle: ${t.title}\ndescription: ${t.description}\nkeywords: ${t.keywords}\nsource: ${sourceHash(PROBE.english.body)}\nreviewed: false\n-->\n${t.body}\n`;
};

/* ---- The copy ---------------------------------------------------------------- */

/**
 * @param {object} [options]
 * @param {string[]} [options.languages]  the docs languages of the copy besides English: a real folder is kept, a missing one gets a stand-in; any other language folder of the real site is removed ([] is the site without the feature)
 * @param {boolean} [options.probe]       add the probe page, and its translation in each of `languages`
 * @returns {{ repoRoot: string, docsDir: string, standIns: string[], cleanup: () => void }}
 */
export function makeSite({ languages = ["es", "ar"], probe = false } = {}) {
  const repoRoot = mkdtempSync(join(tmpdir(), "luz-docs-i18n-"));
  const docsDir = join(repoRoot, "apps/docs");
  const realDocs = join(REAL_REPO, "apps/docs");
  cpSync(realDocs, docsDir, {
    recursive: true,
    filter: (src) => src !== join(realDocs, "node_modules") && src !== join(realDocs, "assets"),
  });
  mkdirSync(join(repoRoot, "apps/site"), { recursive: true });
  cpSync(join(REAL_REPO, "apps/site/_partials"), join(repoRoot, "apps/site/_partials"), { recursive: true });
  cpSync(join(REAL_REPO, "apps/site/boot.js"), join(repoRoot, "apps/site/boot.js"));
  mkdirSync(join(repoRoot, "apps/landing"), { recursive: true });
  cpSync(join(REAL_REPO, "apps/landing/i18n"), join(repoRoot, "apps/landing/i18n"), { recursive: true });
  cpSync(join(REAL_REPO, "apps/landing/index.html"), join(repoRoot, "apps/landing/index.html"));
  // The home's weights, checks and lists are written from the repository (budgets.json against packages/*/dist,
  // the tests, scripts/check-contrast.js): the build of the home reads them in the copy as it does in the real one
  cpSync(join(REAL_REPO, "budgets.json"), join(repoRoot, "budgets.json"));
  for (const name of ["packages", "tests", "scripts"]) symlinkSync(join(REAL_REPO, name), join(repoRoot, name));

  // The languages of the copy: the real folders of `languages` stay, the other ones go
  const i18n = join(docsDir, "i18n");
  if (existsSync(i18n)) {
    for (const entry of readdirSync(i18n, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name !== "en" && !languages.includes(entry.name)) rmSync(join(i18n, entry.name), { recursive: true, force: true });
    }
  }
  const standIns = languages.filter((code) => addDocsLanguage(docsDir, code));

  if (probe) {
    writeFileSync(join(docsDir, "pages", PROBE.file), englishProbe());
    for (const code of languages) {
      const target = join(i18n, code, "pages", PROBE.file);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, translatedProbe(code));
    }
  }
  return { repoRoot, docsDir, standIns, cleanup: () => rmSync(repoRoot, { recursive: true, force: true }) };
}

/** The route of a page file inside `pages/` ("get-started/index.html" → "/docs/get-started/"). */
export const routeOfFile = (path) => {
  const parts = path.replace(/\.html$/, "").split("/");
  if (parts.at(-1) === "index") parts.pop();
  return `/docs/${parts.map((p) => `${p}/`).join("")}`;
};

/** The (English) routes a language of a docs folder translates: the files under `i18n/<code>/pages/`. */
export function translatedRoutes(docsDir, code) {
  const base = join(docsDir, "i18n", code, "pages");
  if (!existsSync(base)) return [];
  const out = [];
  const walk = (dir, prefix) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith("_") || lstatSync(join(dir, entry.name)).isSymbolicLink()) continue;
      if (entry.isDirectory()) walk(join(dir, entry.name), `${prefix}${entry.name}/`);
      else if (entry.name.endsWith(".html")) out.push(routeOfFile(`${prefix}${entry.name}`));
    }
  };
  walk(base, "");
  return out.sort();
}

/**
 * What the home page's build reads in the repository besides its sources, for a copy that holds only those:
 * the built files of each package (the weights of the home are measured on `packages/*\/dist`; run `pnpm build`
 * first) and the tests (their number and what they cover are counted), linked, never written. budgets.json is
 * copied by the caller with the sources.
 */
export function linkBuiltSources(dir) {
  for (const name of readdirSync(join(REAL_REPO, "packages"))) {
    const dist = join(REAL_REPO, "packages", name, "dist");
    if (existsSync(dist)) symlinkSync(dist, join(dir, "packages", name, "dist"));
  }
  symlinkSync(join(REAL_REPO, "tests"), join(dir, "tests"));
}

/* ---- A copy of the repository for a script that reads its own location ------------- */

/**
 * A copy of what the scripts of the repository read (`apps/` and the packages' sources, as git tracks
 * them, so another session's untracked file is not in it), in a temporary folder, with the real
 * `node_modules` linked. A script copied there reads that copy, not the repository (check-strings.js and
 * check-i18n.js read their root from their own location). The copy has no Spanish or Arabic docs tree:
 * the test writes the one it needs. `en` (the reference catalog) is the real one, if it exists.
 */
export function makeScriptRepo() {
  const dir = mkdtempSync(join(tmpdir(), "luz-script-repo-"));
  const at = (path) => join(dir, path);
  const tracked = (path) => {
    const run = spawnSync("git", ["ls-files", "-z", "--", path], { cwd: REAL_REPO, encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 });
    return run.status === 0 && run.stdout ? run.stdout.split("\0").filter(Boolean) : [];
  };
  const sources = [
    ...tracked("apps"),
    ...tracked("scripts"),
    ...tracked("packages/check/src"),
    ...tracked("packages/core/src/i18n"),
    ...tracked("packages/core/src/components"),
    // scripts/check-contrast.js, which the home's checks run, reads these
    ...tracked("packages/catalog/src/components"),
    ...tracked("packages/tokens/lib"),
    ...tracked("packages/core/src/themes"),
    "packages/core/src/i18n.js",
    "packages/core/src/objects/_objects.css",
    "packages/tokens/tokens.json",
    "packages/tokens/src/semantic.css",
    "package.json",
    "vite.config.js",
    "budgets.json",
    ...readdirSync(join(REAL_REPO, "packages")).map((name) => `packages/${name}/package.json`),
  ];
  for (const rel of new Set(sources)) {
    try {
      mkdirSync(dirname(at(rel)), { recursive: true });
      cpSync(join(REAL_REPO, rel), at(rel));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  symlinkSync(join(REAL_REPO, "node_modules"), at("node_modules"));
  linkBuiltSources(dir);
  // No docs language but the reference: the test writes the languages it needs
  const i18n = at("apps/docs/i18n");
  if (existsSync(i18n)) {
    for (const entry of readdirSync(i18n, { withFileTypes: true })) if (entry.isDirectory() && entry.name !== "en") rmSync(join(i18n, entry.name), { recursive: true, force: true });
  }
  return {
    dir,
    at,
    read: (path) => readFileSync(at(path), "utf-8"),
    write(path, text) {
      mkdirSync(dirname(at(path)), { recursive: true });
      writeFileSync(at(path), text);
    },
    remove: (path) => rmSync(at(path), { recursive: true, force: true }),
    exists: (path) => existsSync(at(path)),
    /** Run `scripts/<name>.js` of the copy; { status, output, lines } (stdout then stderr). */
    run(script, args = []) {
      const result = spawnSync(process.execPath, [at(`scripts/${script}`), ...args], { cwd: dir, encoding: "utf-8", timeout: 120_000 });
      const output = `${result.stdout}${result.stderr}`;
      return { status: result.status, output, lines: output.split("\n") };
    },
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

/** The front matter and the body of a translation file (decision D5). */
export function translationFile({ title = "Título", description = "Descripción.", keywords, source, reviewed, reviewer, body = "<p>Hola.</p>" } = {}) {
  const lines = [`title: ${title}`, `description: ${description}`];
  if (keywords !== undefined) lines.push(`keywords: ${keywords}`);
  lines.push(`source: ${source ?? sourceHash("x")}`);
  if (reviewed !== undefined) lines.push(`reviewed: ${reviewed}`);
  if (reviewer !== undefined) lines.push(`reviewer: ${reviewer}`);
  return `<!-- luz:page\n${lines.join("\n")}\n-->\n${body}\n`;
}

/** The English page the probe is: a file of `apps/docs/pages/` (see PROBE). */
export const englishProbeFile = (body = PROBE.english.body) =>
  `<!-- luz:page\ntitle: ${PROBE.english.title}\ndescription: ${PROBE.english.description}\narea: get-started\norder: 9999\ntoc: false\n-->\n${body}\n`;
