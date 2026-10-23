/**
 * LUZ — the install pages follow the versions `changeset version` writes.
 *
 * A page of the docs types the CDN URL of each package (`https://cdn.jsdelivr.net/npm/@luz-ds/core@0.2.0/dist/luz.min.css`)
 * and the tests of the docs compare it with `packages/<name>/package.json`. `changeset version` moves the
 * versions and nothing else, so `pnpm release:version` runs this script after it: the URLs of the pages of
 * `apps/docs/pages/` and of their translations take the version of their package, and a translation whose
 * `source` was the hash of the English page keeps being in step with it (a stale one is left stale: its
 * `source` still says which text it was made from).
 *
 * Only the URL of a CDN file is rewritten. A version in a sentence ("since 0.1.0") is history, and a
 * CHANGELOG is never read here.
 *
 *   syncVersions(root)   write the versions; returns the files it changed, as paths from `root` with `/`
 *   releaseDrift(root)   "file:line: …" for each CDN URL that does not say the version of its package
 *
 * Usage: node scripts/release-sync.js
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { sourceHash } from "./docs-site/docs-i18n.js";
import { PUBLISHED } from "./luz-packages.js";

const CDN_URL = /(https:\/\/cdn\.jsdelivr\.net\/npm\/@luz-ds\/)([a-z]+)@([0-9A-Za-z.+-]+)(\/dist\/)/g;
const FRONT_MATTER = /^<!-- luz:page\n([\s\S]*?)\n-->\n/;

const rel = (root, path) => relative(root, path).split(sep).join("/");

/** { name: version } of the published packages that have a package.json under `root`; 0.0.0 is the placeholder of a package never released, so there is nothing to say yet. */
function versionsOf(root) {
  const versions = {};
  for (const name of PUBLISHED) {
    const path = join(root, "packages", name, "package.json");
    if (!existsSync(path)) continue;
    const { version } = JSON.parse(readFileSync(path, "utf-8"));
    if (version !== "0.0.0") versions[name] = version;
  }
  return versions;
}

/** The `.html` files under `dir`, in path order. */
function htmlUnder(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => (a.name < b.name ? -1 : 1))
    .flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return htmlUnder(path);
      return entry.isFile() && entry.name.endsWith(".html") ? [path] : [];
    });
}

/** English pages, then the translations: [{ abs, path, lang }] with `path` from the pages folder. */
function pagesOf(root) {
  const docs = join(root, "apps/docs");
  const pages = htmlUnder(join(docs, "pages")).map((abs) => ({ abs, path: rel(join(docs, "pages"), abs), lang: "en" }));
  const i18n = join(docs, "i18n");
  const langs = existsSync(i18n) ? readdirSync(i18n, { withFileTypes: true }).filter((e) => e.isDirectory() && e.name !== "en").map((e) => e.name).sort() : [];
  for (const lang of langs) {
    const base = join(i18n, lang, "pages");
    for (const abs of htmlUnder(base)) pages.push({ abs, path: rel(base, abs), lang });
  }
  return pages;
}

const rewrite = (text, versions) => text.replace(CDN_URL, (url, head, name, _version, tail) => (versions[name] ? `${head}${name}@${versions[name]}${tail}` : url));
const bodyOf = (text) => text.replace(FRONT_MATTER, "");

export function syncVersions(root) {
  const versions = versionsOf(root);
  const changed = [];
  const moved = new Map(); // English path → [old hash, new hash]

  for (const page of pagesOf(root)) {
    const before = readFileSync(page.abs, "utf-8");
    let after = rewrite(before, versions);
    if (page.lang === "en") {
      if (after !== before) moved.set(page.path, [sourceHash(bodyOf(before)), sourceHash(bodyOf(after))]);
    } else if (moved.has(page.path)) {
      const [oldHash, newHash] = moved.get(page.path);
      after = after.replace(FRONT_MATTER, (front) => front.replace(`\nsource: ${oldHash}\n`, `\nsource: ${newHash}\n`));
    }
    if (after !== before) {
      writeFileSync(page.abs, after);
      changed.push(rel(root, page.abs));
    }
  }
  return changed.sort();
}

export function releaseDrift(root) {
  const versions = versionsOf(root);
  const drift = [];
  for (const page of pagesOf(root)) {
    readFileSync(page.abs, "utf-8")
      .split("\n")
      .forEach((line, i) => {
        for (const [, , name, version] of line.matchAll(CDN_URL)) {
          if (versions[name] && versions[name] !== version) drift.push(`${rel(root, page.abs)}:${i + 1}: @luz-ds/${name} is at ${versions[name]}, the URL says ${version}`);
        }
      });
  }
  return drift.sort((a, b) => (a.split(":")[0] === b.split(":")[0] ? Number(a.split(":")[1]) - Number(b.split(":")[1]) : a < b ? -1 : 1));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const changed = syncVersions(root);
  console.log(changed.length ? `release-sync: ${changed.length} page(s) take the new versions\n${changed.map((f) => `  ${f}`).join("\n")}` : "release-sync: the pages already say the versions of the packages");
}
