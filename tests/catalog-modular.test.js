/**
 * F5a, catalog modular (plan ai-and-catalog-only, decisions 59 to 64): catalog has no
 * bundle. A site links the `components/<name>.css` of each component it uses, after
 * core; the page of each component starts "Copy the markup" with the line that loads
 * its file; and nothing the site or a README says names the bundle that is gone.
 *
 * The package model (exports, sideEffects, the print rules in `luz.print`) is in
 * package-model.test.js and package-components.test.js; the manifests in
 * class-manifest.test.js and element-manifest.test.js; the budget row in
 * size-guard.test.js; the load rule of luz-check in check-rules-load.test.js; the
 * snippets in docs-snippets.test.js. This file holds what none of them does.
 * Needs `pnpm build` (dist/).
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { decodeEntities } from "../scripts/docs-site/html.js";
import { renderPage, scanSite } from "../scripts/docs-site/site.js";

const repo = resolve(fileURLToPath(new URL("../", import.meta.url)));
const read = (path) => readFileSync(join(repo, path), "utf-8");
const walk = (dir) => (existsSync(join(repo, dir)) ? readdirSync(join(repo, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`])) : []);

const components = readdirSync(join(repo, "packages/catalog/dist/components"))
  .filter((f) => f.endsWith(".min.css"))
  .map((f) => f.replace(/\.min\.css$/, ""))
  .sort();
const version = JSON.parse(read("packages/catalog/package.json")).version;
const sri = (file) => `sha384-${createHash("sha384").update(readFileSync(join(repo, "packages/catalog/dist", file))).digest("base64")}`;

describe("the page of each catalog component starts its markup with the line that loads its file", () => {
  const site = scanSite(join(repo, "apps/docs"), repo);
  const pages = components.map((name) => site.byRoute.get(`/docs/catalog/${name}/`)).filter(Boolean);

  it("finds a page for the components that have a docs page", () => {
    expect(pages.length).toBeGreaterThanOrEqual(6);
  });

  for (const name of components) {
    it(`${name}: the section "Copy the markup" has the npm import and the CDN link of components/${name}, with the version and the hash of the build`, () => {
      const page = site.byRoute.get(`/docs/catalog/${name}/`);
      if (!page) return;
      const html = renderPage(page, site);
      const start = html.search(/<h3[^>]*\bid="markup"/);
      expect(start, "a #markup section").toBeGreaterThan(-1);
      const rest = html.slice(start);
      const end = rest.slice(1).search(/<h3\b/);
      const section = decodeEntities((end < 0 ? rest : rest.slice(0, end + 1)).replace(/<[^>]+>/g, ""));
      expect(section).toContain(`import "@luz-ds/catalog/components/${name}.css";`);
      const link = new RegExp(`<link rel="stylesheet" href="https://cdn\\.jsdelivr\\.net/npm/@luz-ds/catalog@${version.replace(/\./g, "\\.")}/dist/components/${name}\\.min\\.css" integrity="([^"]+)" crossorigin="anonymous">`).exec(section);
      expect(link, `the <link> of components/${name}.min.css from the CDN, at the version of catalog`).not.toBeNull();
      expect(link[1]).toBe(sri(`components/${name}.min.css`));
      // the line comes before the markup the page teaches
      expect(section.indexOf(`components/${name}`)).toBeLessThan(section.search(/<luz-|class="luz-/));
    });
  }
});

describe("nothing names the bundle that is gone", () => {
  // The old names: catalog.css, catalog.min.css, catalog's print.css and the `./css` exports
  const GONE = /catalog(?:\.min)?\.css|@luz-ds\/catalog\/css(?:\/min)?\b|@luz-ds\/catalog\/print\.css|catalog\/dist\/print(?:\.min)?\.css|catalog\/css\b/;

  const sources = [
    ...walk("apps/docs/pages"),
    ...walk("apps/docs/i18n"),
    ...walk("apps/site"),
    "apps/landing/index.html",
    ...walk("apps/landing/i18n"),
    "README.md",
    ...readdirSync(join(repo, "packages")).map((p) => `packages/${p}/README.md`),
  ].filter((f) => /\.(?:html|md|json|js)$/.test(f) && existsSync(join(repo, f)));

  it("reads the pages, the home, the prompts and the READMEs", () => {
    expect(sources.length).toBeGreaterThan(100);
  });

  it("is not in a docs page, the home page, a prompt or a README", () => {
    const hits = sources.flatMap((file) =>
      read(file)
        .split("\n")
        .flatMap((line, i) => (GONE.test(line) ? [`${file}:${i + 1}: ${line.trim().slice(0, 100)}`] : [])),
    );
    expect(hits).toEqual([]);
  });

  it("is not in the packaged files: pack-files.txt, the exports, the smoke test and the dist sentinel", () => {
    expect(read("packages/catalog/pack-files.txt")).not.toMatch(GONE);
    expect(read("scripts/smoke-consumer.js")).not.toMatch(/catalog\.(?:min\.)?css/);
    expect(read("scripts/check-dist.js")).not.toMatch(/catalog\.(?:min\.)?css/);
  });
});

describe("the consumer check links two single components of catalog", () => {
  it("scripts/smoke-consumer.js probes a consumer with more than one catalog component file", () => {
    const smoke = read("scripts/smoke-consumer.js");
    const files = new Set([...smoke.matchAll(/\$\{base\.(?:site|catalog)\}\/dist\/components\/([a-z-]+)(?:\.min)?\.css/g)].map((m) => m[1]));
    expect(files.size, "catalog/components/<name>.css in the probe").toBeGreaterThanOrEqual(2);
  });

  it("the dist sentinel of scripts/check-dist.js is a file of components/", () => {
    expect(read("scripts/check-dist.js")).toMatch(/catalog[^\n]*components\/[a-z-]+\.css/);
  });
});
