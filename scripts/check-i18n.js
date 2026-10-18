/**
 * LUZ — translations of the docs check (docs-i18n design, decisions D5, D6 and D16).
 *
 * A language has docs when `apps/docs/i18n/<code>/` exists; a page of it is a file under
 * `apps/docs/i18n/<code>/pages/`, with the same path as the English page in `apps/docs/pages/`.
 * Structure drift (ids, link targets, code, figures) is a failure of tests/docs-i18n-pages.test.js at
 * every commit. This script lists the rest, one line per finding, each naming the file by its path from
 * the repository root:
 *
 *   stale       `source` is not the hash of the English page now (the English text changed after the
 *               translation was made). The line gives the hash the page has and the one it should have.
 *   orphan      a translation with no English page of the same path (the build refuses it; this script
 *               reads the folders itself, so it can list it).
 *   unreviewed  `reviewed: false` (the default): published with its notice until a named reader reviews it.
 *   invalid     a front matter that cannot be read, a missing `source`, `reviewed: true` with no
 *               `reviewer`, or a `reviewer` on a page that is not `reviewed: true`.
 *
 * Usage: node scripts/check-i18n.js [--strict]
 *   default   exit 0 unless a translation is invalid
 *   --strict  exit 1 on a stale or an orphan too (scripts/qa-release.js runs it before a release)
 *
 * The hash is the one of the design: the first 12 hex of the SHA-256 of the English body, with every run
 * of white space collapsed to one space and the ends trimmed. The body is what follows the
 * `<!-- luz:page … -->` comment, as scripts/docs-site/site.js reads it. No dependency.
 */
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const docs = join(root, "apps/docs");
const strict = process.argv.slice(2).includes("--strict");

const rel = (path) => relative(root, path).split(sep).join("/");
const hashOf = (body) => createHash("sha256").update(body.replace(/\s+/g, " ").trim()).digest("hex").slice(0, 12);

/** The `.html` files under `dir` as paths relative to it with `/`; a name that starts with `_` is not a page. */
function pagesUnder(dir, prefix = "") {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (entry.name.startsWith("_")) continue;
    const abs = join(dir, entry.name);
    if (lstatSync(abs).isSymbolicLink()) continue;
    if (entry.isDirectory()) out.push(...pagesUnder(abs, `${prefix}${entry.name}/`));
    else if (entry.isFile() && entry.name.endsWith(".html")) out.push(`${prefix}${entry.name}`);
  }
  return out;
}

/** { meta, body } of a page source; throws a message when the front matter is not there. */
function read(source) {
  const match = /^<!-- luz:page\n([\s\S]*?)\n-->\n/.exec(source);
  if (!match) throw new Error("a page starts with a <!-- luz:page … --> front matter comment");
  const meta = {};
  for (const line of match[1].split("\n")) {
    if (!line.trim()) continue;
    const kv = /^([a-z]+):\s*(.*)$/.exec(line);
    if (!kv) throw new Error(`front matter lines are "key: value", not "${line.trim()}"`);
    meta[kv[1]] = kv[2].trim();
  }
  return { meta, body: source.slice(match[0].length) };
}

const english = new Map();
for (const file of pagesUnder(join(docs, "pages"))) {
  try {
    english.set(file, hashOf(read(readFileSync(join(docs, "pages", file), "utf-8")).body));
  } catch {
    // The English pages are the build's to check; an unreadable one is simply never matched
  }
}

const i18n = join(docs, "i18n");
const codes = existsSync(i18n)
  ? readdirSync(i18n, { withFileTypes: true }).filter((e) => e.isDirectory() && e.name !== "en" && !e.name.startsWith("_")).map((e) => e.name).sort()
  : [];

const findings = { stale: [], orphan: [], unreviewed: [], invalid: [] };
let translations = 0;

for (const code of codes) {
  const base = join(i18n, code, "pages");
  for (const file of pagesUnder(base)) {
    translations += 1;
    const path = rel(join(base, file));
    if (!english.has(file)) {
      findings.orphan.push(`${path}: orphan, there is no English page apps/docs/pages/${file}`);
      continue;
    }
    let page;
    try {
      page = read(readFileSync(join(base, file), "utf-8"));
    } catch (error) {
      findings.invalid.push(`${path}: invalid, ${error.message}`);
      continue;
    }
    const { meta } = page;
    if (!meta.source) findings.invalid.push(`${path}: invalid, front matter needs "source" (${english.get(file)} is the hash of the English page)`);
    else if (meta.source !== english.get(file)) {
      findings.stale.push(`${path}: stale, source ${meta.source} but the English page is now ${english.get(file)}; translate the change, then set source: ${english.get(file)}`);
    }
    if (meta.reviewed !== undefined && !["true", "false"].includes(meta.reviewed)) {
      findings.invalid.push(`${path}: invalid, reviewed is "true" or "false", not "${meta.reviewed}"`);
      continue;
    }
    const reviewed = meta.reviewed === "true";
    if (reviewed && !meta.reviewer) findings.invalid.push(`${path}: invalid, reviewed: true needs a reviewer (a GitHub handle)`);
    else if (!reviewed && meta.reviewer) findings.invalid.push(`${path}: invalid, a reviewer on a page that is not reviewed: true`);
    if (!reviewed) findings.unreviewed.push(`${path}: unreviewed, published with its notice until a named reader reviews it`);
  }
}

const lines = [...findings.invalid, ...findings.orphan, ...findings.stale, ...findings.unreviewed];
const failures = findings.invalid.length + (strict ? findings.orphan.length + findings.stale.length : 0);
const blocking = findings.invalid.length + findings.orphan.length + findings.stale.length;

if (lines.length) console.log(lines.map((line) => `  ${line}`).join("\n"));
if (failures) {
  console.error(`✗ ${failures} translation problem(s): ${findings.invalid.length} invalid, ${findings.orphan.length} orphan, ${findings.stale.length} stale`);
  process.exit(1);
}
if (blocking) {
  console.log(`! ${findings.orphan.length} orphan, ${findings.stale.length} stale: they block a release (pnpm check:i18n --strict)`);
} else {
  const waiting = findings.unreviewed.length;
  console.log(
    `✓ ${translations} translation(s) in ${codes.length} language(s), none stale or orphaned${waiting ? `; ${waiting} waiting for a reader` : ""}`,
  );
}
