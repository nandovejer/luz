/**
 * The bar list, the column chart, the stacked bar and the heat map moved from @luz-ds/core to @luz-ds/catalog (owner,
 * 2026-11-03, section 15 of .claude/plans/component-gaps.md). Core is what every page needs and fits in luz.css; what a page
 * links on its own when it uses it is catalog. They were "loose" sheets of core, so the mechanism that served them is gone too.
 * What this file pins is the move as a whole; the sheet of each piece, its page and its look are in tests/bar-list.test.js,
 * tests/chart-sheets.test.js, tests/bar-list.spec.js, tests/column-chart.spec.js, tests/stacked-bar.spec.js and
 * tests/heat-map.spec.js:
 *
 *   - the sheets: four files in catalog (source, dist, pack list, manifest of classes, layer luz.catalog), none in core (source,
 *     dist, pack list, manifest of classes), and core's exports and luz.css name none;
 *   - the pages: four in the Catalog area, group Charts, orders 36 to 39, `fits-kinds: app`, ids `p-<name>`, in English and in
 *     Spanish, and none left in the Components area;
 *   - the loose sheet mechanism is gone: no `looseCoreSheets()`, no `loose` front matter key, no `{{loose}}` placeholder, no
 *     budget row and no row of the PRINCIPLES.md table for a loose sheet;
 *   - the generated examples of the four link their catalog sheet after luz.css and core has no other sheet;
 *   - the prompt for an app links the four as catalog files and lists their classes; the other four prompts do neither;
 *   - the rule in AGENTS.md, PRINCIPLES.md and catalog's README, and the changeset (a breaking minor of core and catalog).
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { exampleDocuments } from "../scripts/docs-site/ai.js";
import { CASCADE } from "../scripts/docs-site/kinds.js";
import { assemblePrompt } from "../scripts/docs-site/prompts.js";
import * as snippets from "../scripts/docs-site/snippets.js";
import { PAGES_CSP } from "../vite.config.js";
import { site } from "./helpers/debug-page.js";
import { releaseNotes } from "./helpers/release-notes.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf-8");
// The README of core without its "Breaking changes" section: the Version PR writes that one from the changesets, and it says where the four chart sheets went
const coreReadme = () => read("packages/core/README.md").replace(/^### Breaking changes\n[\s\S]*?(?=^#{1,3} |(?![\s\S]))/m, "");
const json = (path) => JSON.parse(read(path));
const lines = (path) => read(path).split("\n").map((l) => l.trim());

const CHARTS = ["bar-list", "column-chart", "stacked-bar", "heat-map"];
const BLOCKS = CHARTS.map((name) => `luz-${name}`);
const builtCatalog = CHARTS.every((name) => existsSync(join(root, `packages/catalog/dist/components/${name}.css`)));
const ownedBy = (c) => BLOCKS.includes(c.block ?? c.name);

/* ---- The sheets ------------------------------------------------------------------------------------------------------- */

describe.each(CHARTS)("the sheet of the %s", (name) => {
  it("is a source of catalog and not of core", () => {
    expect(existsSync(join(root, `packages/catalog/src/components/${name}.css`)), "catalog's source").toBe(true);
    expect(existsSync(join(root, `packages/core/src/components/${name}.css`)), "core's source").toBe(false);
    expect(read("packages/core/src/components/index.css")).not.toContain(name);
  });

  it("is in the pack list of catalog, plain and minified, and not in core's", () => {
    expect(lines("packages/catalog/pack-files.txt")).toEqual(expect.arrayContaining([`dist/components/${name}.css`, `dist/components/${name}.min.css`]));
    expect(lines("packages/core/pack-files.txt").filter((f) => f.includes(name))).toEqual([]);
  });

  it.skipIf(!builtCatalog)("is built in catalog's dist, in the layer luz.catalog, as a sheet of its own, and core's dist has none", () => {
    for (const file of [`${name}.css`, `${name}.min.css`]) {
      expect(existsSync(join(root, "packages/catalog/dist/components", file)), `catalog's ${file}`).toBe(true);
      expect(existsSync(join(root, "packages/core/dist/components", file)), `core's ${file}`).toBe(false);
    }
    const css = read(`packages/catalog/dist/components/${name}.css`);
    expect(css.match(/^@layer luz\.catalog \{$/gm) ?? [], "one block in luz.catalog").toHaveLength(1);
    expect(css, "no @import: an independent sheet").not.toMatch(/@import/);
  });
});

describe("core has nothing of the four", () => {
  it("names none in its exports, and `./components/*` is still its one export of the sheets", () => {
    const manifest = json("packages/core/package.json");
    expect(manifest.exports["./components/*"]).toBe("./dist/components/*");
    expect(JSON.stringify(manifest.exports)).not.toMatch(/bar-list|column-chart|stacked-bar|heat-map/);
    expect(JSON.stringify(manifest.files ?? [])).not.toMatch(/bar-list|column-chart|stacked-bar|heat-map/);
  });

  it("holds no file of them in src/components or dist/components", () => {
    for (const dir of ["packages/core/src/components", ...(existsSync(join(root, "packages/core/dist/components")) ? ["packages/core/dist/components"] : [])]) {
      expect(readdirSync(join(root, dir)).filter((f) => CHARTS.some((name) => f.startsWith(`${name}.`))), dir).toEqual([]);
    }
  });

  it.skipIf(!builtCatalog)("has no class of the four in luz.css, its variants, or its manifest of classes", () => {
    for (const file of ["luz.css", "luz.min.css", "luz.conditional.css", "luz.conditional.min.css"]) {
      for (const block of BLOCKS) expect(read(`packages/core/dist/${file}`), `${file} has ${block}`).not.toContain(block);
    }
    expect(json("packages/core/dist/classes.json").classes.filter(ownedBy)).toEqual([]);
    expect(readFileSync(join(root, "packages/core/dist/custom-elements.json"), "utf-8")).not.toMatch(/components\/(?:bar-list|column-chart|stacked-bar|heat-map)\.css/);
  });

  it("does not know the four in its README", () => {
    expect(coreReadme()).not.toMatch(/components\/(?:bar-list|column-chart|stacked-bar|heat-map)\.css/);
  });
});

describe.skipIf(!builtCatalog)("catalog's manifest of classes", () => {
  const classes = () => json("packages/catalog/dist/classes.json").classes.filter(ownedBy);

  it("has the classes of the four, each under its own file of catalog, in the layer luz.catalog", () => {
    expect([...new Set(classes().map((c) => c.block ?? c.name))].sort()).toEqual([...BLOCKS].sort());
    for (const c of classes()) {
      expect(c.layer, c.name).toBe("luz.catalog");
      expect(c.files, c.name).toEqual([`components/${(c.block ?? c.name).replace(/^luz-/, "")}.css`]);
    }
  });

  it("defines the block of each piece", () => {
    for (const block of BLOCKS) expect(classes().find((c) => c.name === block), block).toMatchObject({ defined: true });
  });
});

describe("the order of the cascade", () => {
  it("puts the four after the dashboard, in this order, before the sheets of the documentation site", () => {
    const at = CHARTS.map((name) => CASCADE.indexOf(name));
    expect(at.every((i) => i > -1)).toBe(true);
    expect(at).toEqual([...at].sort((a, b) => a - b));
    expect(at[0]).toBe(CASCADE.indexOf("dashboard") + 1);
    expect(at.at(-1)).toBeLessThan(CASCADE.indexOf("docs-layout"));
  });
});

/* ---- The pages -------------------------------------------------------------------------------------------------------- */

describe("the pages of the four", () => {
  it.each(CHARTS.map((name, i) => [name, String(36 + i)]))("%s is a page of the Catalog area, in the group Charts, fits-kinds app, order %s, in English and in Spanish", (name, order) => {
    const page = site.byRoute.get(`/docs/catalog/${name}/`);
    expect(page, `/docs/catalog/${name}/`).toBeTruthy();
    expect(page.meta).toMatchObject({ area: "catalog", group: "charts", "fits-kinds": "app", order, files: `components/${name}.css` });
    expect(page.body).toContain(`<div class="docs-component" id="p-${name}">`);
    expect(existsSync(join(root, `apps/docs/i18n/es/pages/catalog/${name}.html`))).toBe(true);
  });

  it("is no page of Components any more, whichever the language", () => {
    for (const name of CHARTS) {
      expect(site.byRoute.has(`/docs/components/${name}/`), name).toBe(false);
      for (const file of [`apps/docs/pages/components/${name}.html`, `apps/docs/i18n/es/pages/components/${name}.html`]) expect(existsSync(join(root, file)), file).toBe(false);
    }
  });

  it("is linked from no page by the old route: every link of the docs to a chart goes to /docs/catalog/<name>/", () => {
    const old = new RegExp(`/docs/components/(?:${CHARTS.join("|")})/`);
    const offenders = [];
    const walk = (dir) => {
      for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
        const path = `${dir}/${entry.name}`;
        if (entry.isDirectory()) walk(path);
        else if (/\.(?:html|json|md|js|css)$/.test(entry.name) && old.test(read(path))) offenders.push(path);
      }
    };
    for (const dir of ["apps/docs/pages", "apps/docs/i18n", "apps/landing", "apps/site/prompts"]) walk(dir);
    expect(offenders).toEqual([]);
  });

  it("has the Components area with the 31 components, and the Catalog gallery with 41 pages", () => {
    expect(site.pages.filter((p) => p.meta.area === "components" && p.meta.group && p.meta.group !== "helpers")).toHaveLength(31);
    expect(site.pages.filter((p) => p.meta.area === "catalog")).toHaveLength(41);
  });
});

/* ---- The mechanism that served loose sheets of core is gone ------------------------------------------------------------ */

describe("core has no loose sheet any more", () => {
  it("snippets.js exports no looseCoreSheets()", () => {
    expect(snippets.looseCoreSheets).toBeUndefined();
  });

  it("no script of the generator names it, nor the `loose` key, nor {{loose}}", () => {
    const offenders = [];
    const walk = (dir) => {
      for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
        const path = `${dir}/${entry.name}`;
        if (entry.isDirectory()) walk(path);
        else if (entry.name.endsWith(".js") && /looseCoreSheets|\{\{loose\}\}|meta\.loose|\bloose:/.test(read(path))) offenders.push(path);
      }
    };
    walk("scripts");
    expect(offenders).toEqual([]);
    for (const file of ["apps/docs/_layouts/page.html", "apps/landing/index.html", "dev/DOCS-SITE.md"]) expect(read(file), file).not.toContain("{{loose}}");
  });

  it("every core component is imported by components/index.css, the one that builds luz.css: nothing is left outside it", () => {
    const index = read("packages/core/src/components/index.css");
    const files = readdirSync(join(root, "packages/core/src/components")).filter((f) => /^[a-z]/.test(f) && f.endsWith(".css") && f !== "index.css");
    expect(files.filter((f) => !index.includes(`./${f}`))).toEqual([]);
  });

  it("budgets.json has no row for a loose sheet nor for the four, and the PRINCIPLES.md table has none either", () => {
    for (const row of json("budgets.json").budgets) {
      expect(row.name, row.name).not.toMatch(/loose sheet/);
      expect(`${row.name} ${row.file ?? ""} ${row.glob ?? ""}`, row.name).not.toMatch(/bar-list|column-chart|stacked-bar|heat-map/);
    }
    const principles = read("PRINCIPLES.md");
    expect(principles).not.toMatch(/a loose sheet/);
    expect(principles.split("\n").filter((l) => l.startsWith("|") && /bar-list|column-chart|stacked-bar|heat-map/.test(l))).toEqual([]);
  });

  it("the guides do not tell of a sheet of core that luz.css does not hold", () => {
    for (const file of ["AGENTS.md", "PRINCIPLES.md", "dev/DOCS-SITE.md", "dev/QUICK-REFERENCE.md", "dev/CORE-JS.md", "dev/STRUCTURE.md"]) {
      if (existsSync(join(root, file))) expect(read(file), file).not.toMatch(/loose sheet|looseCoreSheets|`loose`/i);
    }
  });
});

/* ---- The generated examples ------------------------------------------------------------------------------------------- */

describe("the generated examples of the four", () => {
  const VERSIONS = { tokens: "1.2.3", core: "1.2.3", catalog: "1.2.3", check: "1.2.3" };
  const examples = () => exampleDocuments(site, { csp: PAGES_CSP, versions: VERSIONS });
  const hrefsOf = (doc) => [...doc.html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);

  it.each(CHARTS)("%s: an example in the catalog area, none in components, that links its catalog sheet after luz.min.css and no other sheet of core", (name) => {
    const all = examples();
    expect(all.some((e) => e.route === `/examples/components/${name}.html`)).toBe(false);
    const doc = all.find((e) => e.route === `/examples/catalog/${name}.html`);
    expect(doc, `/examples/catalog/${name}.html`).toBeTruthy();
    const hrefs = hrefsOf(doc);
    expect(hrefs.filter((h) => h.includes("/core/")), "core's one stylesheet").toHaveLength(1);
    expect(hrefs.indexOf(`../dist/catalog/components/${name}.min.css`), "its sheet, after luz.min.css").toBeGreaterThan(hrefs.findIndex((h) => h.includes("/core/")));
    expect(hrefs.filter((h) => /components\/(?:bar-list|column-chart|stacked-bar|heat-map)\./.test(h) && !h.includes(`/${name}.`)), "none of the other three").toEqual([]);
    expect(doc.html, "catalog's script comes with its sheet").toContain("../dist/catalog/");
  });

  it("the dashboard links the bar list and the stacked bar it holds, as catalog sheets, and the other two charts stay out", () => {
    const hrefs = hrefsOf(examples().find((e) => e.route === "/examples/catalog/dashboard.html"));
    expect(hrefs).toEqual(expect.arrayContaining(["../dist/catalog/components/bar-list.min.css", "../dist/catalog/components/stacked-bar.min.css"]));
    expect(hrefs.filter((h) => /column-chart|heat-map/.test(h))).toEqual([]);
  });
});

/* ---- The prompts ------------------------------------------------------------------------------------------------------ */

describe("the prompts for AI", () => {
  const prompt = (id) => assemblePrompt(id, { root });
  const catalogLinks = (text) => [...text.matchAll(/@luz-ds\/catalog@[^/"]+\/dist\/components\/([a-z0-9-]+)\.min\.css/g)].map((m) => m[1]);

  it("the prompt for an app links the four sheets from catalog, lists their classes under catalog and their docs pages under /docs/catalog/", () => {
    const text = prompt("app");
    expect(catalogLinks(text)).toEqual(expect.arrayContaining(CHARTS));
    const fromCatalog = text.split("From `@luz-ds/catalog`:")[1];
    for (const block of BLOCKS) expect(fromCatalog, block).toMatch(new RegExp(`^- \`${block}\``, "m"));
    for (const name of CHARTS) expect(text).toContain(`docs/catalog/${name}/: markup of the ${name.replace(/-/g, " ")}.`);
    expect(text).not.toMatch(/docs\/components\/(?:bar-list|column-chart|stacked-bar|heat-map)\//);
    expect(text, "no clause of a loose sheet").not.toContain("after `luz.css`)");
  });

  it.each(["start", "landing", "blog", "docs"])("the prompt %s links none of the four, lists none of their classes and names none of their pages", (id) => {
    const text = prompt(id);
    expect(catalogLinks(text).filter((n) => CHARTS.includes(n))).toEqual([]);
    for (const block of BLOCKS) expect(text, block).not.toContain(`\`${block}`);
    for (const name of CHARTS) expect(text, name).not.toContain(`docs/catalog/${name}/`);
  });
});

/* ---- The rule and the changeset --------------------------------------------------------------------------------------- */

describe("the rule between core and catalog", () => {
  it("AGENTS.md puts the charts in catalog, as a stylesheet each over a native list, table or meter", () => {
    const layering = read("AGENTS.md").split("## Package layering")[1].split("\n---\n")[0];
    expect(layering).toMatch(/core is what every page needs and fits in `luz\.css`/);
    for (const piece of ["the chart", "the bar list", "the column chart", "the stacked bar", "the heat map"]) expect(layering, piece).toContain(piece);
    expect(layering).toMatch(/over a native list, table or `meter` that stays in the page/);
  });

  it("PRINCIPLES.md and catalog's README say the same, in their words", () => {
    expect(read("PRINCIPLES.md")).toMatch(/\*\*Core or catalog\.\*\*[^\n]*the pieces that draw data \(the chart, the bar list, the column chart, the stacked bar, the heat map\)/);
    expect(read("packages/catalog/README.md")).toMatch(/bar list, column chart, stacked bar, ring and heat map/);
    expect(coreReadme()).not.toMatch(/bar list|column chart|stacked bar|heat map/i);
  });
});

describe("the changeset of the move", () => {
  // .changeset/charts-to-catalog.md, or its note in the CHANGELOGs once the Version PR has consumed it (where Prettier pads the tables)
  const text = () => {
    const note = releaseNotes(root).find((n) => n.file === "charts-to-catalog.md" || /the four chart sheets move from core to catalog/.test(n.text));
    expect(note, "a changeset for the move of the four chart sheets").toBeTruthy();
    return note.text.replace(/[ \t]{2,}/g, " ");
  };

  it("is a minor of core and catalog and a patch of check, and the text says Breaking", () => {
    const front = text().split("---")[1];
    expect(front).toMatch(/"@luz-ds\/core":\s*minor/);
    expect(front).toMatch(/"@luz-ds\/catalog":\s*minor/);
    expect(front).toMatch(/"@luz-ds\/check":\s*patch/);
    expect(front).not.toMatch(/"@luz-ds\/tokens"/);
    expect(text()).toMatch(/\*\*Breaking:\*\*/);
  });

  it("names the four classes and the four sheets, where they were and where they are, so a project can change its link", () => {
    for (const block of BLOCKS) expect(text(), block).toContain(block);
    for (const name of CHARTS) expect(text(), name).toContain(`${name}.css`);
    expect(text()).toContain("@luz-ds/core/components/*");
    expect(text()).toContain("@luz-ds/catalog/components/bar-list.css");
    expect(text()).toMatch(/luz\.catalog/);
  });
});
