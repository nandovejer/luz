/**
 * LUZ — the shared dist builder of the packages that build on core:
 * `site` and the packages for one kind of site (`landing`, later `cms`).
 * Each has a thin script (scripts/build-<name>.js) that calls
 * buildPackage() with what it ships; tokens and core keep their own.
 *
 * What it does, in order:
 *   1. empties packages/<name>/dist, so removed sources never linger;
 *   2. inlines the local @import graph of src/index.css (the one source of
 *      the file order), rebasing relative url()s to src/, which dist/
 *      mirrors for assets, so the same URL works from npm and from a CDN;
 *   3. wraps the result in its public layer, luz.<layer> (scripts/luz-layers.js);
 *   4. copies the asset folders and fails on a url() that points nowhere;
 *   5. writes dist/<name>.css and dist/<name>.min.css;
 *   6. writes dist/components/<file>.css and .min.css for each
 *      src/components/<file>.css whose name does not start with `_`, in the
 *      same layer and with the same rebased url()s, so a page can load one
 *      component (as core's dist/components/); a src/components/_print.css
 *      becomes dist/print.css (+ min);
 *      with `bundle: false` (catalog: a catalog, not a bundle; plan
 *      ai-and-catalog-only, decisions 59 and 62) steps 2, 3 and 5 are
 *      skipped and there is no src/index.css: the component files are the
 *      package's only CSS, and the top-level `@media print` blocks of each
 *      one go after its screen rules, in luz.print, so a page that links a
 *      component also gets what it does on paper;
 *   7. copies each JS module as it is and bundles each one with esbuild
 *      into <module>.min.js (its own relative imports inlined, nothing else);
 *   8. copies each lazy chunk as it is and bundles it alone into
 *      <chunk>.min.js. An entry's dynamic import("./<chunk>.js") stays an
 *      import, of "./<chunk>.min.js" in the entry's .min.js, so the chunk is
 *      never inlined and never split (no esbuild `splitting`): each file is
 *      what one <script> or one integrity hash covers (SEC-CHUNK-2);
 *   9. writes dist/classes.json, the class manifest read back from the CSS
 *      just written (scripts/ai-manifests.js).
 *
 * Usage: import { buildPackage } from "./build-package.js";
 *        await buildPackage({ name: "landing" });
 */

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, readFileSync, writeFileSync } from "fs";
import { dirname, relative, resolve } from "path";
import { fileURLToPath } from "url";
import * as esbuild from "esbuild";
import { writeManifests } from "./ai-manifests.js";
import { inLayer, inLuzLayer } from "./luz-layers.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * A stylesheet split into its screen rules and its top-level
 * `@media print { … }` blocks, each with the comment right before it (null
 * when it has none), read with comments and strings skipped, so a brace in
 * either never counts. Throws, `file`, on a block that does not close.
 */
export function splitPrint(css, file) {
  let screen = "";
  const print = [];
  let from = 0;
  let depth = 0;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      i = end === -1 ? css.length : end + 1;
    } else if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < css.length && css[j] !== c) j += css[j] === "\\" ? 2 : 1;
      i = j;
    } else if (c === "{") depth++;
    else if (c === "}") depth--;
    else if (depth === 0 && c === "@" && /^@media\s+print\s*\{/.test(css.slice(i, i + 40))) {
      const open = css.indexOf("{", i);
      let level = 1;
      let j = open + 1;
      for (; j < css.length && level > 0; j++) {
        if (css[j] === "/" && css[j + 1] === "*") {
          const end = css.indexOf("*/", j + 2);
          j = end === -1 ? css.length : end + 1;
        } else if (css[j] === "{") level++;
        else if (css[j] === "}") level--;
      }
      if (level !== 0) throw new Error(`${file}: @media print does not close`);
      // The comment right before the block says what it does: it goes with it
      const before = css.slice(from, i);
      const lead = /\/\*(?:(?!\*\/)[\s\S])*\*\/\s*$/.exec(before);
      const start = lead ? lead.index : before.length;
      screen += before.slice(0, start);
      print.push(`${before.slice(start)}${css.slice(i, j)}`);
      from = j;
      i = j - 1;
    }
  }
  screen += css.slice(from);
  return { screen: screen.replace(/\n{3,}/g, "\n\n").trimEnd(), print: print.length ? print.join("\n\n") : null };
}

/**
 * Build packages/<name>/dist from packages/<name>/src.
 * @param {object} options
 * @param {string} options.name     the package folder, and the base name of its CSS (dist/<name>.css)
 * @param {string} [options.layer]  the public layer, without `luz.` (default: the name)
 * @param {string} [options.label]  the name in the log lines (default: the name, capitalised)
 * @param {string[]} [options.js]   JS modules in src/, copied and bundled (default: none)
 * @param {string[]} [options.chunks] JS modules in src/ that an entry loads lazily, each
 *   copied and bundled alone; the entries' dynamic imports of them stay imports (default: none)
 * @param {string[]} [options.assets] folders of src/ copied to dist/ as they are (default: none)
 * @param {boolean} [options.bundle] false: no dist/<name>.css, only the component files, each with
 *   its print rules in luz.print (default: true)
 */
export async function buildPackage({ name, layer = name, label = name[0].toUpperCase() + name.slice(1), js = [], chunks = [], assets = [], bundle = true }) {
  const pkgRoot = resolve(repoRoot, "packages", name);
  const srcRoot = resolve(pkgRoot, "src");
  const distRoot = resolve(pkgRoot, "dist");

  rmSync(distRoot, { recursive: true, force: true });
  mkdirSync(distRoot, { recursive: true });

  const assetUrls = new Set();
  function inlineCssImports(filePath, seen = new Set()) {
    if (seen.has(filePath)) return "";
    seen.add(filePath);
    const dir = dirname(filePath);
    return readFileSync(filePath, "utf-8")
      .replace(/(?<!@import\s*)url\(\s*(["']?)(?![a-z]+:|\/|#)([^"')]+)\1\s*\)/g, (_, quote, relPath) => {
        const rebased = relative(srcRoot, resolve(dir, relPath)).split("\\").join("/");
        assetUrls.add(rebased);
        return `url(${quote}${rebased}${quote})`;
      })
      .replace(
        /@import\s+url\(\s*["']?(\.[^"')]+)["']?\s*\)\s*;/g,
        (_, relPath) => inlineCssImports(resolve(dir, relPath), seen),
      );
  }

  const css = bundle ? inLuzLayer(layer, inlineCssImports(resolve(srcRoot, "index.css"))) : null;

  // One stylesheet per component, and the print rules on their own: each
  // file is the text the bundle inlines for it, in the same layer. Without a
  // bundle, a component's own print rules follow it, in luz.print
  const componentsSrc = resolve(srcRoot, "components");
  const sheets = new Map();
  if (existsSync(componentsSrc)) {
    for (const file of readdirSync(componentsSrc).sort()) {
      if (!file.endsWith(".css")) continue;
      if (!bundle && file.startsWith("_")) {
        console.error(`✗ ${name}: src/components/${file} has no file of its own in dist/ without a bundle; put its rules in the component they belong to`);
        process.exit(1);
      }
      const out = file === "_print.css" ? "print.css" : file.startsWith("_") ? null : `components/${file}`;
      if (!out) continue;
      const text = inlineCssImports(resolve(componentsSrc, file));
      if (bundle) sheets.set(out, inLuzLayer(layer, text));
      else {
        const { screen, print } = splitPrint(text, `packages/${name}/src/components/${file}`);
        sheets.set(out, print ? `${inLuzLayer(layer, screen)}${inLayer("print", print)}` : inLuzLayer(layer, screen));
      }
    }
  }
  if (!bundle && sheets.size === 0) {
    console.error(`✗ ${name}: no src/components/*.css to build`);
    process.exit(1);
  }

  // Assets are committed in src/, so the build only copies them
  for (const folder of assets) {
    cpSync(resolve(srcRoot, folder), resolve(distRoot, folder), { recursive: true });
    console.log(`✓ ${label} ${folder} copied → ${resolve(distRoot, folder)}`);
  }
  const missing = [...assetUrls].filter((url) => !existsSync(resolve(distRoot, url)));
  if (missing.length) {
    console.error(`✗ ${name}.css points at files that do not exist:\n  ${missing.join("\n  ")}`);
    process.exit(1);
  }

  if (bundle) {
    writeFileSync(resolve(distRoot, `${name}.css`), css, "utf-8");
    console.log(`✓ ${label} CSS built → ${resolve(distRoot, `${name}.css`)}`);
  }
  // Unminified modules are copied as they are: they import each other by relative path
  const modules = [...js, ...chunks];
  for (const file of modules) cpSync(resolve(srcRoot, file), resolve(distRoot, file));
  if (modules.length) console.log(`✓ ${label} JS synced → ${modules.join(", ")}`);

  if (bundle) {
    const { code: minCss } = await esbuild.transform(css, { loader: "css", minify: true });
    writeFileSync(resolve(distRoot, `${name}.min.css`), minCss, "utf-8");
    console.log(`✓ ${label} CSS minified → ${resolve(distRoot, `${name}.min.css`)}`);
  }

  if (sheets.size) mkdirSync(resolve(distRoot, "components"), { recursive: true });
  for (const [out, text] of sheets) {
    writeFileSync(resolve(distRoot, out), text, "utf-8");
    const { code } = await esbuild.transform(text, { loader: "css", minify: true });
    writeFileSync(resolve(distRoot, out.replace(/\.css$/, ".min.css")), code, "utf-8");
  }
  if (sheets.size) console.log(`✓ ${label} ${sheets.size} stylesheets ${bundle ? "on their own" : "(no bundle)"} → ${[...sheets.keys()].join(", ")} (+ min)`);

  // A dynamic import of a chunk stays an import, of the chunk's .min.js
  const lazyChunks = {
    name: "luz-lazy-chunks",
    setup(build) {
      build.onResolve({ filter: /^\.\/[\w-]+\.js$/ }, ({ path, kind }) =>
        kind === "dynamic-import" && chunks.includes(path.slice(2)) ? { path: path.replace(/\.js$/, ".min.js"), external: true } : undefined,
      );
    },
  };

  // Each <module>.min.js is one file with its relative imports inside, so
  // its budget measures everything a <script> of it loads; a chunk is its
  // own file, with its own budget
  for (const file of modules) {
    await esbuild.build({
      entryPoints: [resolve(srcRoot, file)],
      outfile: resolve(distRoot, file.replace(/\.js$/, ".min.js")),
      bundle: true,
      // Bundle our own relative files only: a bare import (another package,
      // a third-party module) stays an import, which check-size then rejects,
      // instead of being inlined silently into a published file (RL-1;
      // security.md, phase 4 review, answer 5a)
      packages: "external",
      // The sideEffects field of package.json lists dist/ only (src/ is not
      // published), so esbuild would read a src/ module as pure and drop an
      // import made for its side effect (a module imported only to define
      // its element)
      ignoreAnnotations: true,
      plugins: [lazyChunks],
      format: "esm",
      minify: true,
      target: "es2022",
      legalComments: "none",
      logLevel: "warning",
    });
  }
  if (modules.length) console.log(`✓ ${label} JS bundled and minified → ${modules.map((f) => f.replace(/\.js$/, ".min.js")).join(", ")}`);
  const manifest = writeManifests(name);
  console.log(`✓ ${label} classes.json → ${manifest.classes.length} classes, ${manifest.properties.length} properties`);
}
