/**
 * The numbers in the copy of the home page (F5 of
 * .claude/plans/luz-home-docs-identity.md, section 3.6 and Q23).
 *
 * A catalog value may say `{n:components}`, `{n:objects}`, `{n:primitives}`,
 * `{n:semantic}`, `{n:elements}`, `{n:cssonly}` or `{n:withjs}`; scripts/docs-site/i18n.js writes the count at build, from the
 * packages, so a number in the copy is never typed and never drifts. An unknown
 * name fails the build with file:line.
 *
 * The contract this file holds the implementation to (all exported by
 * scripts/docs-site/i18n.js):
 *   NUMBER_NAMES                      the seven names, in this order
 *   siteNumbers(repoRoot)             { components, objects, primitives, semantic, elements, cssonly, withjs }
 *   expandNumbers(text, numbers, where)
 *       the text with every `{n:name}` replaced by String(numbers[name]); `{n}`, `{shown}`
 *       and every other placeholder stay as written (they are the scripts' own); an unknown or
 *       empty name throws `${where}: …"{n:name}"…` naming the name and the known ones
 * and the build (scanSite / buildSite) resolves them in the catalogs of the home page.
 */
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import * as i18n from "../scripts/docs-site/i18n.js";
import { buildSite, landingDocuments, scanSite } from "../scripts/docs-site/site.js";
import { makeSite } from "./helpers/docs-i18n-size-fixture.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(repo, path), "utf-8");

/* ---- The data sources the spec names ------------------------------------- */

/** Computed here from the packages, the way the old page test did, never typed. */
function countsFromPackages() {
  const tokens = JSON.parse(read("packages/tokens/tokens.json"));
  const primitives = Object.values(tokens.color).reduce((total, steps) => total + Object.keys(steps).length, 0);

  const semanticCss = read("packages/tokens/src/semantic.css");
  const lightBlock = semanticCss.slice(semanticCss.indexOf('[data-theme="light"] {'), semanticCss.indexOf('[data-theme="dark"],'));
  const semantic = [...lightBlock.matchAll(/^\s*(--luz-[\w-]+):/gm)].length;

  const components = readdirSync(join(repo, "packages/core/src/components")).filter(
    (file) => file.endsWith(".css") && file !== "index.css" && !file.startsWith("_"),
  ).length;

  const objectsCss = read("packages/core/src/objects/_objects.css");
  const objects = new Set([...objectsCss.matchAll(/^\s*\.(o-[a-z]+)\b/gm)].map((m) => m[1])).size;

  // A component page names its stylesheet in `files:` and, if it has a script, that script in `module:`
  const pages = join(repo, "apps/docs/pages/components");
  const scripted = new Set();
  for (const file of readdirSync(pages).filter((name) => name.endsWith(".html"))) {
    const head = readFileSync(join(pages, file), "utf-8").split("-->")[0];
    if (!/^module:/m.test(head)) continue;
    for (const m of head.matchAll(/components\/([a-z0-9-]+)\.css/g)) scripted.add(m[1]);
  }

  // The tags that come styled with no class: the elements of the fixture whose style is a stylesheet of core's elements/
  const elements = JSON.parse(read("tests/fixtures/html-elements.json")).elements.filter((element) => /^elements\//.test(element.styledBy)).length;

  return { components, objects, primitives, semantic, elements, cssonly: components - scripted.size, withjs: scripted.size };
}

const NAMES = ["components", "objects", "primitives", "semantic", "elements", "cssonly", "withjs"];
const fn = (name) => {
  expect(typeof i18n[name], `scripts/docs-site/i18n.js exports ${name}`).toBe("function");
  return i18n[name];
};

/* ---- The function --------------------------------------------------------- */

describe("{n:name} in a catalog value: expandNumbers", () => {
  it("exports the seven names, and the functions", () => {
    expect(i18n.NUMBER_NAMES).toEqual(NAMES);
    fn("expandNumbers");
    fn("siteNumbers");
    fn("countBareElements");
  });

  it("writes each count where the placeholder is, as plain digits, as many times as it appears", () => {
    const expand = fn("expandNumbers");
    const numbers = { components: 32, objects: 10, primitives: 53, semantic: 55, elements: 68, cssonly: 25, withjs: 7 };
    expect(expand("{n:components} components and {n:objects} layout objects", numbers, "en.json:1")).toBe("32 components and 10 layout objects");
    expect(expand("{n:semantic} semantic tokens, {n:primitives} primitives, {n:semantic} again", numbers, "en.json:1")).toBe("55 semantic tokens, 53 primitives, 55 again");
    expect(expand("{n:components}", { ...numbers, components: 0 }, "en.json:1")).toBe("0");
  });

  it("leaves a value with no placeholder alone, and the placeholders the scripts fill", () => {
    const expand = fn("expandNumbers");
    const numbers = { components: 32, objects: 10, primitives: 53, semantic: 55, elements: 68, cssonly: 25, withjs: 7 };
    for (const text of ["Nothing to count", "{n} results", "{shown} of {n} results. Type more to narrow.", "No results for “{query}”.", "{mode}", "<span data-count=\"x\">3</span>"]) {
      expect(expand(text, numbers, "en.json:1"), text).toBe(text);
    }
    expect(expand("{n} of {n:components}", numbers, "en.json:1")).toBe("{n} of 32");
  });

  it("fails on an unknown name, with the file:line it is given and the names that are known", () => {
    const expand = fn("expandNumbers");
    const numbers = { components: 32, objects: 10, primitives: 53, semantic: 55, elements: 68, cssonly: 25, withjs: 7 };
    for (const bad of ["{n:families}", "{n:Components}", "{n:}", "{n:x}"]) {
      let message = "";
      try {
        expand(`Before ${bad} after`, numbers, "apps/landing/i18n/en.json:42");
      } catch (error) {
        message = error.message;
      }
      expect(message, bad).toContain("apps/landing/i18n/en.json:42");
      expect(message, bad).toMatch(/components/);
      expect(message, bad).toMatch(/semantic/);
    }
  });
});

describe("countBareElements: the tags that come styled with no class", () => {
  const dir = () => {
    const root = mkdtempSync(join(tmpdir(), "luz-elements-"));
    temps.push(root);
    return root;
  };

  it("counts the real elements/ of core as the tags of the fixture whose style is a stylesheet of elements/ (68 today)", () => {
    expect(fn("countBareElements")(join(repo, "packages/core/src/elements"))).toBe(countsFromPackages().elements);
  });

  it("counts each type selector once, across the files, and only the type selectors", () => {
    const root = dir();
    writeFileSync(join(root, "text.css"), `/* h6 { } */
:where(a, a:hover, button[type="submit"], input:not([type="checkbox"]):focus-visible, h1, h2) { color: red; }
@media (min-width: 40rem) { :where(code, kbd) { color: red; } }
.luz-btn, #id, [hidden], * { color: red; }
:where(p:lang(en), li:nth-child(2n + 1), div:dir(rtl)) { color: red; }
`);
    writeFileSync(join(root, "forms.css"), ":where(a, input, select, textarea) { color: red; }\n");
    writeFileSync(join(root, "_private.css"), ":where(blockquote) { color: red; }\n");
    writeFileSync(join(root, "index.css"), '@import "text.css"; :where(figure) { color: red; }\n');
    // a, button, input, h1, h2, code, kbd, p, li, div, select, textarea; not the classes, the id, the attribute, the comment, a private file or the index
    expect(fn("countBareElements")(root)).toBe(12);
  });
});

describe("siteNumbers: the counts come from the packages", () => {
  it("equals the components, layout objects, colour primitives and semantic tokens the packages contain", () => {
    expect(fn("siteNumbers")(repo)).toEqual(countsFromPackages());
  });

  it("are all whole numbers above zero", () => {
    for (const [name, value] of Object.entries(fn("siteNumbers")(repo))) {
      expect(Number.isInteger(value) && value > 0, name).toBe(true);
    }
  });
});

/* ---- The build ------------------------------------------------------------- */

const temps = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/**
 * The real home and its docs in a throwaway repository (the generator writes the home's weights,
 * lists and checks from the repository for every language), whose English `hero.lead` says `value`.
 */
function fixture(value) {
  const site = makeSite({ languages: [] });
  temps.push(site.repoRoot);
  const path = join(site.repoRoot, "apps/landing/i18n/en.json");
  writeFileSync(path, JSON.stringify({ ...JSON.parse(readFileSync(path, "utf-8")), "hero.lead": value }, null, 2));
  return site.repoRoot;
}

const buildFixture = (root) => {
  const site = scanSite(join(root, "apps/docs"), root);
  const html = readFileSync(join(root, "apps/landing/index.html"), "utf-8");
  return buildSite(site, { extra: landingDocuments(site, "apps/landing/index.html", html) });
};

describe("an unknown {n:name} fails the build with file:line", () => {
  it("names the name and a line of the catalog (or of the template that uses the key)", () => {
    let message = "";
    try {
      buildFixture(fixture("We count {n:bogus} things."));
    } catch (error) {
      message = error.message;
    }
    expect(message).toMatch(/(apps\/landing\/i18n\/en\.json|apps\/landing\/index\.html):\d+/);
    expect(message).toContain("bogus");
  });

  it("does not touch the scripts' own placeholders", () => {
    const { rendered, problems } = buildFixture(fixture("{n} results"));
    expect(problems).toEqual([]);
    expect(rendered.get("/")).toContain("{n} results");
  });
});

describe("the numbers in the pages of the LUZ home, in every language", () => {
  const site = scanSite(join(repo, "apps/docs"), repo);
  const template = read("apps/landing/index.html");
  const docs = landingDocuments(site, "apps/landing/index.html", template);
  const { rendered, problems } = buildSite(site, { extra: docs });
  const counts = countsFromPackages();
  const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const expand = (value) => value.replace(/\{n:(\w+)\}/g, (_, name) => String(counts[name]));
  const catalogs = Object.fromEntries(["en", "es", "ar"].map((code) => [code, JSON.parse(read(`apps/landing/i18n/${code}.json`))]));
  const withNumbers = (code) => Object.entries(catalogs[code]).filter(([, value]) => /\{n:/.test(value));

  it("builds with no problem: every key used, none missing", () => {
    expect(problems).toEqual([]);
  });

  it("the English copy uses only the names that exist, and the four that describe the whole system", () => {
    const used = new Set(withNumbers("en").flatMap(([, value]) => [...value.matchAll(/\{n:(\w+)\}/g)].map((m) => m[1])));
    for (const name of used) expect(NAMES, name).toContain(name);
    for (const name of ["components", "objects", "primitives", "semantic"]) expect([...used], name).toContain(name);
  });

  it("es and ar write the same counts under the same keys", () => {
    const names = (code) => Object.fromEntries(withNumbers(code).map(([key, value]) => [key, [...value.matchAll(/\{n:(\w+)\}/g)].map((m) => m[1]).sort()]));
    expect(names("es")).toEqual(names("en"));
    expect(names("ar")).toEqual(names("en"));
  });

  it("each page has the count written by the build where the catalog has its placeholder, and no placeholder left", () => {
    for (const doc of docs) {
      const html = rendered.get(doc.route);
      const code = doc.locale.code;
      expect(html, code).not.toMatch(/\{n:/);
      for (const [key, value] of withNumbers(code)) {
        const expected = expand(value);
        expect(html.includes(expected) || html.includes(esc(expected)), `${code} ${key}: "${expected}"`).toBe(true);
      }
    }
  });

  it("no number is typed: the old data-count spans are gone, and no catalog value that has no placeholder holds a count", () => {
    for (const [code, strings] of Object.entries(catalogs)) {
      for (const [key, value] of Object.entries(strings)) {
        expect(value, `${code} ${key}`).not.toContain("data-count");
        if (/\{n:/.test(value)) continue;
        // Not about LUZ: the sample data of the specimens ("7 of 10 GB") and the facts about light
        if (/^(?:typed|light\.fact)\./.test(key)) continue;
        for (const [name, count] of Object.entries(counts)) {
          // Eastern Arabic digits are also a typed number
          const arabic = String(count).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
          expect(value, `${code} ${key} holds the number of ${name}`).not.toMatch(new RegExp(`(?<![\\d.,])(?:${count}|${arabic})(?![\\d.,])`));
        }
      }
    }
  });
});
