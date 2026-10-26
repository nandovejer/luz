/**
 * Every published stylesheet puts its rules in a `luz.*` layer and repeats
 * the order statement first (scripts/luz-layers.js). A top-level layer name
 * or an unlayered rule would collide with the consumer's own layers, which
 * is what the container layer exists to prevent.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { LAYERS, LAYER_ORDER } from "../scripts/luz-layers.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = (path) => `${root}${path}`;
const listed = (dir) => (existsSync(dist(dir)) ? readdirSync(dist(dir)).filter((f) => f.endsWith(".css")).map((f) => `${dir}/${f}`) : []);

const KINDS = ["landing", "cms", "app", "docs"];
const KIND_SAMPLE = { landing: "hero", cms: "header", app: "dashboard", docs: "shell" };

const files = [
  "packages/tokens/dist/luz-tokens.css",
  "packages/tokens/dist/tokens.css",
  "packages/core/dist/luz.css",
  "packages/core/dist/base.css",
  "packages/core/dist/print.css",
  "packages/core/dist/classless.css",
  // catalog has no bundle (F5a): each component is a file of its own
  ...listed("packages/catalog/dist/components").filter((f) => !f.endsWith(".min.css")),
  ...listed("packages/core/dist/components").filter((f) => !f.endsWith(".min.css")),
  ...listed("packages/core/dist/themes").filter((f) => !f.endsWith(".min.css")),
].filter((f) => existsSync(dist(f)));

/** The top level of a stylesheet: [{ prelude, body | null }], comments removed. */
function topLevel(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const out = [];
  let i = 0;
  while (i < text.length) {
    const start = i;
    let depth = 0;
    for (; i < text.length; i++) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}" && --depth === 0) break;
      else if (text[i] === ";" && depth === 0) break;
    }
    const chunk = text.slice(start, i + 1).trim();
    i++;
    if (!chunk) continue;
    const open = chunk.indexOf("{");
    out.push(open === -1 ? { prelude: chunk.replace(/;$/, "").trim(), body: null } : { prelude: chunk.slice(0, open).trim(), body: chunk.slice(open + 1, -1) });
  }
  return out;
}

describe.skipIf(files.length === 0)("published stylesheets and the luz layers", () => {
  it("covers every package's CSS", () => {
    expect(files.some((f) => f.includes("tokens/dist"))).toBe(true);
    expect(files.some((f) => f.endsWith("luz.css"))).toBe(true);
    expect(files.some((f) => f.startsWith("packages/catalog/dist/components/") && f.endsWith("search.css")), "packages/catalog/dist/components/search.css").toBe(true);
    expect(files.some((f) => f.endsWith("catalog.css")), "catalog has no bundle").toBe(false);
    // The patterns of a landing page, a blog, an app and a documentation site are files of catalog since F5b
    for (const kind of KINDS) {
      expect(files.some((f) => f.startsWith("packages/catalog/dist/components/") && f.endsWith(`/${kind}-${KIND_SAMPLE[kind]}.css`)), `packages/catalog/dist/components/${kind}-${KIND_SAMPLE[kind]}.css`).toBe(true);
      expect(files.some((f) => f.endsWith(`/${kind}.css`)), `${kind} has no bundle: its package is gone`).toBe(false);
    }
  });

  for (const file of files) {
    it(`${file}: only luz.* layers, the order statement first, nothing unlayered but @font-face`, () => {
      const items = topLevel(readFileSync(dist(file), "utf-8"));
      const statement = items.find((it) => it.body === null && it.prelude.startsWith("@layer"));
      expect(statement, "an @layer order statement").toBeTruthy();
      expect(`${statement.prelude};\n`).toBe(LAYER_ORDER);
      expect(items.indexOf(statement), "the statement comes before any rule").toBe(items.findIndex((it) => !it.prelude.startsWith("@import") && !it.prelude.startsWith("@charset") && !it.prelude.startsWith("@font-face")));

      const stray = [];
      for (const { prelude, body } of items) {
        if (prelude.startsWith("@font-face") || prelude.startsWith("@charset") || prelude === statement.prelude) continue;
        const layer = prelude.match(/^@layer\s+([\w.-]+)$/)?.[1];
        if (body === null || !layer || !layer.startsWith("luz.") || !LAYERS.includes(layer.slice(4))) stray.push(prelude.slice(0, 80));
      }
      expect(stray).toEqual([]);
    });
  }

  it("a catalog component that prints puts those rules in `luz.print`, after its `luz.catalog` block, and one that does not has `luz.catalog` only", () => {
    // Print rules are the top-level `@media print` blocks of the source; docs-shell and landing-glow are patterns that print
    const printing = readdirSync(dist("packages/catalog/src/components"))
      .filter((f) => f.endsWith(".css") && !f.startsWith("_"))
      .filter((f) => /^@media\s+print\b/m.test(readFileSync(dist(`packages/catalog/src/components/${f}`), "utf-8")))
      .map((f) => f.replace(/\.css$/, ""))
      .sort();
    expect(printing).toEqual(["consent", "docs-shell", "landing-glow", "search"]);
    const all = readdirSync(dist("packages/catalog/dist/components")).filter((f) => f.endsWith(".css") && !f.endsWith(".min.css")).map((f) => f.replace(/\.css$/, ""));
    for (const name of all) {
      const items = topLevel(readFileSync(dist(`packages/catalog/dist/components/${name}.css`), "utf-8"));
      const layers = items.filter((it) => it.body !== null).map((it) => it.prelude);
      expect(layers, name).toEqual(printing.includes(name) ? ["@layer luz.catalog", "@layer luz.print"] : ["@layer luz.catalog"]);
    }
  });

  it("the full bundle has the layers in the documented order", () => {
    const css = readFileSync(dist("packages/core/dist/luz.css"), "utf-8");
    const order = [...css.matchAll(/^@layer (luz\.[\w-]+) \{/gm)].map((m) => m[1]);
    expect(order).toEqual(["luz.settings", "luz.generic", "luz.elements", "luz.objects", "luz.components", "luz.utilities", "luz.print"]);
  });
});

/* F5b of .claude/plans/ai-and-catalog-only.md: the patterns of a kind of site are components of catalog, so
   luz.landing, luz.cms, luz.app and luz.docs are gone: one layer, `luz.catalog`, then `luz.print`. A pattern that
   refines a catalog or a core piece wins by the order of the links, as any catalog component does. */
describe("the layers of the kinds of site are gone", () => {
  const STATEMENT = "@layer luz.tokens, luz.themes, luz.settings, luz.generic, luz.elements, luz.objects, luz.components, luz.utilities, luz.catalog, luz.print;";

  it("the order is tokens, themes, settings, generic, elements, objects, components, utilities, catalog, print", () => {
    expect(LAYERS).toEqual(["tokens", "themes", "settings", "generic", "elements", "objects", "components", "utilities", "catalog", "print"]);
    expect(LAYER_ORDER).toBe(`${STATEMENT}\n`);
  });

  it("is repeated, in the same order, by core's index.css and by the brand fixture", () => {
    expect(readFileSync(dist("packages/core/src/index.css"), "utf-8").includes(STATEMENT), "packages/core/src/index.css").toBe(true);
    expect(readFileSync(dist("tests/fixtures/theme-brand.css"), "utf-8").includes(STATEMENT), "tests/fixtures/theme-brand.css").toBe(true);
  });

  it("is explained in scripts/luz-layers.js: luz.catalog holds the patterns of the four kinds, and the four old layers are gone", () => {
    const text = readFileSync(dist("scripts/luz-layers.js"), "utf-8");
    expect(/luz\.catalog\s+the components of @luz-ds\/catalog/.test(text), "luz.catalog says what it holds").toBe(true);
    expect(/luz\.(?:landing|cms|app|docs)\s+\.luz-/.test(text), "no line that still defines luz.landing, luz.cms, luz.app or luz.docs").toBe(false);
  });

  it("no layer of a kind of site is named in a stylesheet of dist (an @layer statement or block)", () => {
    const named = [];
    for (const dir of ["packages/tokens/dist", "packages/core/dist", "packages/core/dist/components", "packages/core/dist/themes", "packages/catalog/dist/components"]) {
      if (!existsSync(dist(dir))) continue;
      for (const f of readdirSync(dist(dir)).filter((f) => f.endsWith(".css"))) {
        if (/@layer[^{;]*\bluz\.(?:landing|cms|app|docs)\b/.test(readFileSync(dist(`${dir}/${f}`), "utf-8"))) named.push(`${dir}/${f}`);
      }
    }
    expect(named).toEqual([]);
  });

  it("is named in the guides that list the layers, without the four old names: VERSIONING.md, core's README, AGENTS.md and the layers page", () => {
    for (const file of ["VERSIONING.md", "packages/core/README.md", "AGENTS.md", "apps/docs/pages/get-started/layers.html", "apps/docs/i18n/es/pages/get-started/layers.html"]) {
      const text = readFileSync(dist(file), "utf-8");
      expect(text.includes("luz.catalog"), `${file} lists luz.catalog`).toBe(true);
      // The layers page may say they are gone (the migration); a list or a statement of the layers must not hold them
      expect(/luz\.(?:landing|cms|app|docs)\s*[,;]|[,;]\s*luz\.(?:landing|cms|app|docs)\b|luz\.(?:landing|cms|app|docs)\s+\.luz-/.test(text), `${file} still lists luz.landing, luz.cms, luz.app or luz.docs as a layer`).toBe(false);
    }
  });
});
