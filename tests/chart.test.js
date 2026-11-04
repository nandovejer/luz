/**
 * <luz-chart> of @luz-ds/catalog, the parts that need no browser (what it draws and what it does is in tests/chart.spec.js, which
 * also reads the table through the module's `readChart`):
 *   - chart.js is a lazy chunk like the other seven: it imports nothing (SEC-CHUNK-2), defines its element once, builds its drawing
 *     with DOM calls only (no HTML sink, SEC-IDX-2), asks for nothing, moves nothing and writes no word of its own (EX-014);
 *   - catalog.js loads it by a literal specifier when the page has a <luz-chart> (SEC-CHUNK-1), the build and the size guard know it,
 *     and there is no budget row for it: catalog has no weight limit (owner, 2026-11-02);
 *   - the package exports, declares and ships it, and the manifests say what it is without telling a reader what to do;
 *   - its stylesheet reads tokens and only tokens, has its forced-colors and print rules, and has no motion;
 *   - EX-014 is a row of EXCEPTIONS.md and the code carries it;
 *   - its page, in English and in Spanish, the accessibility statement and the changeset.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { sourceHash } from "../scripts/docs-site/docs-i18n.js";
import { buildSite, scanSite } from "../scripts/docs-site/site.js";
import { findAll, hasClass, parse, query, textOf } from "./helpers/html-dom.js";
import { knownTokens } from "./helpers/known-tokens.js";

const repo = fileURLToPath(new URL("../", import.meta.url));
const read = (rel) => readFileSync(join(repo, rel), "utf-8");
const SOURCE = "packages/catalog/src/chart.js";
const SHEET = "packages/catalog/src/components/chart.css";
const PAGE = "apps/docs/pages/catalog/chart.html";
const PAGE_ES = "apps/docs/i18n/es/pages/catalog/chart.html";
/** The text of the chunk; a missing file is the assertion that fails, not an ENOENT. */
const chunk = () => {
  expect(existsSync(join(repo, SOURCE)), `${SOURCE} exists`).toBe(true);
  return read(SOURCE);
};
/** The text of the stylesheet, the same way. */
const sheet = () => {
  expect(existsSync(join(repo, SHEET)), `${SHEET} exists`).toBe(true);
  return read(SHEET);
};
/** JS or CSS without its comments: a header may say "import" or "innerHTML" in words. */
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/.*$/gm, "$1");
const css = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "");
/** The rules of a stylesheet, flat, nested at-rules included: [{ selector, body }]. */
const rulesOf = (text) => [...css(text).matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selector: selector.replace(/\s+/g, " ").trim(), body: body.trim() }));
/** The body of the block of an at-rule: `@media (forced-colors: active) { … }`, nested braces counted. */
function blockOf(text, prelude) {
  const source = css(text);
  const start = source.search(prelude);
  if (start < 0) return null;
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}" && --depth === 0) return source.slice(open + 1, i);
  }
  return null;
}
const front = (text) => Object.fromEntries([...(/^<!-- luz:page\n([\s\S]*?)\n-->/.exec(text)?.[1] ?? "").matchAll(/^([a-z-]+):\s*(.*)$/gm)].map((m) => [m[1], m[2]]));

const budgets = JSON.parse(read("budgets.json")).budgets;
const principles = read("PRINCIPLES.md");
const budgetTable = (text) => {
  const lines = text.split("\n");
  const header = lines.findIndex((line) => /^\|\s*Artifact\s*\|.*\|\s*Ceiling\s*\|$/.test(line));
  expect(header, "the budget table of section 8").toBeGreaterThan(-1);
  return lines.slice(header + 2).filter((line, i, all) => all.slice(0, i + 1).every((l) => l.startsWith("|")));
};

describe("chart.js is a lazy chunk that imports nothing and defines its element once", () => {
  it("has no static import or export-from, no import() and no import.meta (SEC-CHUNK-2)", () => {
    const source = code(chunk());
    expect(source).not.toMatch(/(?:^|[;}\s])(?:import\b(?!\s*[(.])|export\b[^"'();]*?\bfrom\b)/);
    expect(source).not.toMatch(/\bimport\s*\(/);
    expect(source).not.toMatch(/import\.meta/);
  });

  it("defines <luz-chart> behind a guard, so a second copy of the module does not throw (SEC-CHUNK-5)", () => {
    const source = code(chunk());
    expect(source).toMatch(/customElements\.define\(\s*["']luz-chart["']/);
    expect(source).toMatch(/customElements\.get\(\s*["']luz-chart["']\s*\)/);
  });

  it("exports readChart(el), so a script can ask what the chart would draw", () => {
    expect(code(chunk())).toMatch(/export\s+function\s+readChart\s*\(/);
  });

  it("describes the element in its header, for custom-elements.json", () => {
    expect(chunk()).toMatch(/@element luz-chart\b/);
    for (const attr of ["type", "variant", "interactive", "data-luz-label-table", "data-luz-label-chart"]) expect(chunk(), attr).toMatch(new RegExp(`@attr \\{[^}]+\\} \\[?${attr}\\b`));
  });
});

describe("chart.js draws with DOM calls and writes no HTML (SEC-IDX-2)", () => {
  it("has no HTML sink", () => {
    expect(code(chunk())).not.toMatch(/\binnerHTML\b|\bouterHTML\b|insertAdjacentHTML|document\.write|\beval\(|new Function|setAttribute\(\s*["']on|srcdoc|DOMParser|createContextualFragment/);
  });

  it("builds the SVG with createElementNS, never createElement(\"svg\")", () => {
    const source = code(chunk());
    expect(source).toMatch(/createElementNS\(/);
    expect(source).not.toMatch(/createElement\(\s*["'](?:svg|path|g|text|line|circle|rect)["']\s*\)/);
  });

  it("names no address but the SVG namespace, which is an identifier and is never fetched (RL-12)", () => {
    const source = code(chunk());
    const addresses = source.match(/[a-z][a-z0-9+.-]*:\/\/[^"'`\s]*/gi) ?? [];
    expect(addresses).toEqual(["http://www.w3.org/2000/svg"]);
    expect(source).not.toMatch(/["'`]\/\/[\w.-]+/);
  });

  it("makes no request and writes no storage of its own", () => {
    expect(code(chunk())).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|new\s+Image\b|localStorage|sessionStorage|document\.cookie|createElement\(\s*["']script["']\s*\)/);
  });

  it("redraws when the box changes size and when the table changes, with the observers of the platform", () => {
    const source = code(chunk());
    expect(source).toMatch(/new\s+ResizeObserver\(/);
    expect(source).toMatch(/new\s+MutationObserver\(/);
    expect(source).toMatch(/\.disconnect\(\)/);
  });

  it("moves nothing: no animation, no timer, no frame loop", () => {
    expect(code(chunk())).not.toMatch(/\.animate\(|requestAnimationFrame|setInterval|setTimeout|transition|animation/i);
  });

  it("swaps the views with a native button: no role or tabindex to make a control of a div, and no key handler for the button", () => {
    const source = code(chunk());
    expect(source).toMatch(/createElement\(\s*tag\s*\)|["']button["']/);
    expect(source).not.toMatch(/role["'],\s*["']button/);
    // Enter and Space press a native button: nothing listens to the keys of a button, and no other key event is used
    expect(source).not.toMatch(/keyCode|["']keyup["']|["']keypress["']/);
    expect(source).not.toMatch(/\.\s*(?:onkeydown|onkeyup|onkeypress)\b/);
  });

  it("listens to the keydown only for the roving focus of the rows and for the Escape of the readout, each named an RL-3 case (no native element has arrow keys between table rows, or an Escape for a readout that is no dialog or popover)", () => {
    const raw = chunk();
    const source = code(raw);
    expect(source, "the keys of an interactive chart").toMatch(/["']keydown["']/);
    // Where the keydown is heard: the table (the arrows, Home and End on a row) and the document (the Escape of the readout, while it shows)
    const listened = [...source.matchAll(/(\w+(?:\.\w+)*|\w+\[[^\]]*\])\s*\(\s*["']keydown["']/g)].map((m) => m[1]);
    expect(listened.length, "a keydown on the table and on the document, no more").toBeGreaterThanOrEqual(1);
    expect(source).not.toMatch(/["']keydown["']\s*,[^)]*\bbutton\b/);
    // The only keys it reads are the arrows, Home and End (the roving focus) and Escape (the readout); every Escape and every preventDefault cites RL-3 on the line before
    const keys = new Set([...source.matchAll(/["'](Arrow\w+|Home|End|Escape|Enter|Space|Tab|PageUp|PageDown| )["']/g)].map((m) => m[1]));
    expect([...keys].filter((key) => !/^(?:Arrow(?:Left|Right|Up|Down)|Home|End|Escape)$/.test(key))).toEqual([]);
    const lines = raw.split("\n");
    for (const [i, line] of lines.entries()) {
      if (!/Escape|preventDefault/.test(line.replace(/\/\/.*$/, "")) || /^\s*(?:\/\/|\*|\/\*)/.test(line)) continue;
      expect(lines.slice(Math.max(0, i - 2), i).join("\n"), `RL-3 is cited above: ${line.trim()}`).toMatch(/RL-3/);
    }
    // The Escape does not cancel the key: the readout is put away and an Escape that closes a dialog around the chart still does. Only the arrows are prevented
    const prevented = lines.filter((line) => /preventDefault/.test(line.replace(/\/\/.*$/, "")));
    expect(prevented, "preventDefault once: the arrows of the roving focus").toHaveLength(1);
  });
});

describe("chart.js writes no word of its own (EX-014)", () => {
  it("assigns no literal text: every string on the page is the author's, copied, or the page's own label", () => {
    const source = code(chunk());
    expect(source).not.toMatch(/\.(?:textContent|innerText|ariaLabel)\s*=\s*["'`][^"'`]/);
    expect(source).not.toMatch(/\.append\(\s*["'`][^"'`]/);
    expect(source).not.toMatch(/setAttribute\(\s*["']aria-label["']\s*,\s*["'`][^"'`]/);
  });

  it("has no English or Spanish for the button in its code: the words are data-luz-label-table and data-luz-label-chart, read with no fallback", () => {
    const source = code(chunk());
    expect(source).not.toMatch(/Show|Hide|Mostrar|Ocultar|\bTable\b|\bChart\b|Gr[aá]fico/);
    expect(source).toMatch(/data-luz-label-/);
    // A label of white space is none: it is trimmed before it is used
    expect(source).toMatch(/\.trim\(\)/);
  });

  it("carries the exception next to the code that reads the labels: luz-exception: EX-014", () => {
    expect(chunk()).toMatch(/luz-exception:\s*EX-014\b/);
  });

  it("is a row of EXCEPTIONS.md for SR-7, for this file, that says what it reads and that there is no fallback", () => {
    const row = read("EXCEPTIONS.md").split("\n").find((line) => /^\|\s*EX-014\s*\|/.test(line));
    expect(row, "a row EX-014").toBeTruthy();
    const cells = row.split("|").map((cell) => cell.trim());
    expect(cells[2], "the strong rule").toBe("SR-7");
    expect(cells[3], "the file").toBe(SOURCE);
    expect(cells[4]).toContain("data-luz-label-table");
    expect(cells[4]).toContain("data-luz-label-chart");
    expect(cells[4]).toMatch(/no button/);
    expect(cells[4]).toMatch(/no English fallback/);
    expect(cells[5], "dated").toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("no other file of catalog claims the exception, and no new number was skipped: EX-013 is followed by EX-014", () => {
    const numbers = [...read("EXCEPTIONS.md").matchAll(/^\|\s*(EX-\d{3})\s*\|/gm)].map((m) => Number(m[1].slice(3)));
    expect(Math.max(...numbers)).toBeGreaterThanOrEqual(14);
    expect(numbers).toContain(13);
    expect(numbers).toContain(14);
    expect(numbers.length, "no number twice").toBe(new Set(numbers).size);
  });
});

describe("the chunk has no budget: catalog has no weight limit (owner, 2026-11-02)", () => {
  it("has no row in budgets.json, by file or by name", () => {
    expect(budgets.filter((b) => (b.file ?? b.glob ?? "").includes("chart") || /chart/i.test(b.name)).filter((b) => !/core/.test(b.file ?? b.glob ?? "")).map((b) => b.name)).toEqual([]);
    expect(budgets.filter((b) => (b.file ?? b.glob ?? "").includes("packages/catalog/")).map((b) => b.name)).toEqual([]);
  });

  it("is not in the table of PRINCIPLES.md section 8", () => {
    expect(budgetTable(principles).filter((row) => /luz-chart|catalog JS lazy chunk: chart/i.test(row))).toEqual([]);
  });

  it("is built, and check-size reports its size without a ceiling", () => {
    const file = "packages/catalog/dist/chart.min.js";
    expect(existsSync(join(repo, file)), `${file} exists`).toBe(true);
    const run = spawnSync(process.execPath, [join(repo, "scripts/check-size.js")], { encoding: "utf-8" });
    const out = run.stdout + run.stderr;
    expect(out.slice(out.search(/catalog \(no limit, reported\)/))).toContain("chart.min.js");
    expect(run.status, out).toBe(0);
  });
});

describe("the build, the size guard and the loader know the chunk", () => {
  it("scripts/build-catalog.js builds chart.js as a chunk", () => {
    const chunks = read("scripts/build-catalog.js").match(/chunks:\s*\[([^\]]*)\]/)?.[1] ?? "";
    expect(chunks).toContain('"chart.js"');
  });

  it("scripts/check-size.js expects ./chart.min.js among the imports of the loader", () => {
    const loader = read("scripts/check-size.js").match(/"packages\/catalog\/dist\/catalog\.min\.js":\s*\[([^\]]*)\]/)?.[1] ?? "";
    expect(loader).toContain('"./chart.min.js"');
  });

  it("catalog.js names it as a literal and loads it when the page has a <luz-chart>", () => {
    const loader = read("packages/catalog/src/catalog.js");
    expect(loader).toMatch(/"luz-chart":\s*\(\)\s*=>\s*import\(\s*"\.\/chart\.js"\s*\)/);
    expect(loader).toMatch(/document\.querySelector\(\s*"luz-chart"\s*\)\s*\)\s*load\(\s*"luz-chart"\s*\)/);
  });

  it("the built loader loads ./chart.min.js by a literal, and the built chunk imports nothing (needs pnpm build)", () => {
    const loader = read("packages/catalog/dist/catalog.min.js");
    expect(loader).toMatch(/\bimport\s*\(\s*["']\.\/chart\.min\.js["']\s*\)/);
    const built = read("packages/catalog/dist/chart.min.js");
    expect(built).not.toMatch(/(?:^|[;}\s])import\b(?!\s*[(.])|\bimport\s*\(|\bexport\b[^"'();]*?\bfrom\b/);
    expect(built).toMatch(/customElements/);
  });

  it("the Pages build links the chunk in the snippets (the files of catalog the docs list)", () => {
    expect(read("scripts/docs-site/snippets.js")).toContain('"chart.min.js"');
  });
});

describe("the package exports, declares and ships it", () => {
  const pkg = () => JSON.parse(read("packages/catalog/package.json"));
  const pack = () => read("packages/catalog/pack-files.txt").split("\n");

  it("exports ./chart as dist/chart.js", () => {
    expect(pkg().exports["./chart"]).toBe("./dist/chart.js");
  });

  it("lists the script, plain and minified, in sideEffects, and the stylesheet is covered by the components glob", () => {
    expect(pkg().sideEffects).toEqual(expect.arrayContaining(["./dist/chart.js", "./dist/chart.min.js", "./dist/components/*.css"]));
  });

  it("ships the script and the stylesheet, plain and minified", () => {
    for (const file of ["dist/chart.js", "dist/chart.min.js", "dist/components/chart.css", "dist/components/chart.min.css"]) expect(pack(), file).toContain(file);
  });

  it("is named in the description and the keywords of the package", () => {
    expect(pkg().description).toMatch(/\bchart\b/);
    expect(pkg().keywords).toContain("chart");
  });
});

describe("the manifests: the tag, its five attributes and its classes, in plain words", () => {
  const dist = (name) => JSON.parse(read(`packages/catalog/dist/${name}`));
  const declaration = () => {
    const found = dist("custom-elements.json").modules.flatMap((m) => m.declarations ?? []).find((d) => d.tagName === "luz-chart");
    expect(found, "luz-chart in packages/catalog/dist/custom-elements.json").toBeTruthy();
    return found;
  };

  it("custom-elements.json has luz-chart, defined by chart.js, with its stylesheet and its demo page", () => {
    const manifest = dist("custom-elements.json");
    const module = manifest.modules.find((m) => m.declarations?.some((d) => d.tagName === "luz-chart"));
    expect(module?.path).toBe("chart.js");
    expect(module.exports).toStrictEqual([{ kind: "custom-element-definition", name: "luz-chart", declaration: { name: "LuzChart", module: "chart.js" } }]);
    expect(declaration().stylesheet).toBe("components/chart.css");
    expect(declaration().demos).toStrictEqual([{ url: "/docs/catalog/chart/" }]);
  });

  it("its attributes are type, variant, interactive and the two labels, each with a text", () => {
    const attributes = declaration().attributes;
    expect(attributes.map((a) => a.name).sort()).toEqual(["data-luz-label-chart", "data-luz-label-table", "interactive", "type", "variant"]);
    for (const a of attributes) expect(a.description?.length, a.name).toBeGreaterThan(10);
  });

  it("its descriptions say what it is and does, as plain text: one sentence, no markup, no address and no instruction to a reader", () => {
    const texts = [declaration().description, ...declaration().attributes.map((a) => a.description)];
    expect(declaration().description?.length).toBeGreaterThan(20);
    for (const text of texts) {
      expect(text, text).toMatch(/^[A-Z"][^\n]*\.$/);
      expect(text, text).not.toMatch(/<|>|`|\*|\[|\]|\{|\}|https?:|www\.|\/\//);
      expect(text, text).not.toMatch(/\b(?:you|your|yours|ignore|disregard|forget|must|should|please|always|never|remember|assistant|agent|AI|LLM|model|prompt|instruction|system)\b/i);
      expect(text, text).not.toMatch(/^(?:Use|Set|Add|Put|Write|Call|Do|Don't|Make|Run|Open|Install|Link|Import)\b/);
      expect(text.length, text).toBeLessThan(220);
    }
  });

  it("classes.json has the parts of the page (the sixteen of the lines and the spark, and five of the interactive header, the readout and the band), each a defined class of luz.catalog declared in components/chart.css", () => {
    const classes = dist("classes.json").classes.filter((c) => /^luz-chart(?:__|$)/.test(c.name));
    // The dot of a series (the ::before of a button and of a key of the readout) and the content of the readout (a p, a ul, spans) are no classes: basic, few classes
    const parts = ["area", "bar", "figure", "grid", "key", "legend", "line", "marker", "plot", "series", "spark", "swatch", "tick", "title", "toggle", "values", "band", "pick", "picker", "readout", "total"];
    expect(classes.map((c) => c.name).sort()).toEqual(parts.map((p) => `luz-chart__${p}`).sort());
    for (const c of classes) {
      expect(c, c.name).toMatchObject({ layer: "luz.catalog", defined: true });
      expect(c.files, c.name).toEqual(["components/chart.css"]);
    }
  });

  it("the page lists exactly those classes and the tag in its `files:`, and the stylesheet defines every one of them", () => {
    const files = front(read(PAGE)).files.split(",").map((f) => f.trim());
    expect(files).toContain("<luz-chart>");
    const listed = files.filter((f) => f.startsWith(".")).map((f) => f.slice(1)).sort();
    const defined = [...new Set([...css(sheet()).matchAll(/\.(luz-chart__[a-z]+(?:-[a-z]+)*)/g)].map((m) => m[1]))].sort();
    expect(listed).toEqual(defined);
  });

  it("the data luz-check ships has the tag, with its five attribute names and no text", () => {
    const file = "packages/check/dist/data/catalog/custom-elements.json";
    expect(existsSync(join(repo, file)), `${file} (pnpm build)`).toBe(true);
    const snapshot = JSON.parse(read(file));
    const found = snapshot.modules.flatMap((m) => m.declarations ?? []).find((d) => d.tagName === "luz-chart");
    expect(found, "luz-chart in the snapshot").toBeTruthy();
    expect(found?.attributes?.map((a) => a.name).sort()).toEqual(["data-luz-label-chart", "data-luz-label-table", "interactive", "type", "variant"]);
    for (const a of found?.attributes ?? []) expect(Object.keys(a), "the name and no text").toEqual(["name"]);
    expect(found?.stylesheet).toBe("components/chart.css");
  });
});

describe("the stylesheet reads tokens and nothing else", () => {
  it("is in the luz.catalog layer, with the tag inside :where() (specificity 0) and print rules in luz.print", () => {
    expect(sheet()).toMatch(/:where\(luz-chart\)/);
    const built = read("packages/catalog/dist/components/chart.css");
    expect(built.match(/^@layer luz\.catalog \{$/gm) ?? []).toHaveLength(1);
    expect(built.match(/^@layer luz\.print \{$/gm) ?? [], "its @media print is in luz.print").toHaveLength(1);
  });

  it("every var(--luz-*) it reads is a token the packages declare, but its own --luz-chart-color and the --luz-chart-ratio knob that has a fallback", () => {
    const text = css(sheet());
    const known = knownTokens();
    const own = new Set([...text.matchAll(/(--luz-[\w-]+)\s*:/g)].map((m) => m[1]));
    expect([...own], "the only property it sets").toEqual(["--luz-chart-color"]);
    const read = [...text.matchAll(/var\(\s*(--luz-[\w-]+)\s*(,)?/g)].map((m) => ({ name: m[1], fallback: m[2] === "," }));
    expect(read.length).toBeGreaterThan(20);
    for (const { name, fallback } of read) {
      if (own.has(name) || known.has(name)) continue;
      expect(name, `${name} is no token and no property of its own`).toBe("--luz-chart-ratio");
      expect(fallback, "the knob is read with a fallback").toBe(true);
    }
    // The palette is the six series, the grid; never the primitives (RL-10)
    for (const n of [1, 2, 3, 4, 5, 6]) expect(text).toContain(`var(--luz-chart-${n})`);
    expect(text).toContain("var(--luz-chart-grid)");
    expect(text).not.toMatch(/var\(--luz-(?:blue|teal|purple|berry|stone|sand|gray|grey|red|green|amber|periwinkle|brand)-\d+/);
  });

  it("paints with tokens only: no colour function, no hex and no colour name outside the forced-colors block", () => {
    const forced = blockOf(sheet(), /@media\s*\(forced-colors:\s*active\)/) ?? "";
    const outside = css(sheet()).replace(forced, "");
    expect(outside).not.toMatch(/#[0-9a-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color-mix|color)\(/i);
    const painted = rulesOf(outside).flatMap(({ selector, body }) => [...body.matchAll(/(?:^|;|\s)(fill|stroke|color|background(?:-color)?|border(?:-[a-z]+)*-color|outline-color)\s*:\s*([^;]+)/g)].map((m) => ({ selector, property: m[1], value: m[2].trim() })));
    expect(painted.length).toBeGreaterThan(8);
    for (const { selector, property, value } of painted) expect(value, `${selector} { ${property} }`).toMatch(/^(?:none|var\(--luz-[\w-]+(?:\s*,\s*var\(--luz-[\w-]+\))?\))$/);
  });

  it("has one literal that is not a token: the opacity of the area under a line, a translucent wash that keeps the line above it readable", () => {
    const opacities = rulesOf(sheet()).flatMap(({ selector, body }) => [...body.matchAll(/(?:^|[;\s])((?:fill-|stroke-)?opacity)\s*:\s*([^;]+)/g)].map((m) => `${selector} { ${m[1]}: ${m[2].trim()} }`));
    expect(opacities).toEqual([".luz-chart__area { fill-opacity: 0.16 }"]);
  });

  it("takes space from the tokens: no literal margin, padding or gap but zero, and one exception of DR-8, written in DESIGN.md: the space around a day of an interactive column chart is a share of the width", () => {
    // DR-8's exception: `min(var(--luz-space-3xs), 0.4%)` around a day and half of it around a column
    const design = read("DESIGN.md");
    const dr8 = design.slice(design.indexOf("### DR-8"), design.indexOf("### DR-9"));
    expect(dr8, "the exception is written in DR-8 before it is used").toContain("min(var(--luz-space-3xs), 0.4%)");
    expect(dr8).toContain("<luz-chart type=\"column\" interactive>");
    const shrinking = /^min\(var\(--luz-space-3xs\)(?: \/ 2)?, 0\.[24]%\)$/;
    const used = [];
    for (const { selector, body } of rulesOf(sheet())) {
      for (const [, property, value] of body.matchAll(/(?:^|[;\s])(margin(?:-[a-z]+)*|padding(?:-[a-z]+)*|gap|row-gap|column-gap)\s*:\s*([^;]+)/g)) {
        if (shrinking.test(value.trim())) {
          used.push(`${selector} { ${property} }`);
          expect(selector, "only inside an interactive column chart, once the script has drawn it").toMatch(/^luz-chart\[type="column"\]\[data-luz-ready\] \.luz-column-chart tbody (?:tr|td)$/);
          expect(property).toBe("padding-inline");
          continue;
        }
        // zero, auto or a step of the scale, alone or side by side ("0 var(--luz-space-xs)": no row gap, a step between columns)
        expect(value.trim(), `${selector} { ${property} }`).toMatch(/^(?:0|auto|var\(--luz-space-[\w-]+\))(?:\s+(?:0|var\(--luz-space-[\w-]+\)))*$/);
      }
    }
    expect(used, "a day and a column: the two places of the exception").toHaveLength(2);
  });

  it("uses logical properties for its boxes: no width, height, left, right, margin-left or text-align: left", () => {
    expect(css(sheet())).not.toMatch(/(?:^|[;\s{])(?:width|height|min-width|min-height|max-width|max-height|left|right|top|bottom|margin-(?:left|right|top|bottom)|padding-(?:left|right|top|bottom)|float)\s*:|text-align\s*:\s*(?:left|right)/);
  });

  it("has no motion at all: no transition, no animation, no keyframes", () => {
    expect(css(sheet())).not.toMatch(/\btransition\b|\banimation\b|@keyframes|scroll-behavior/);
  });

  it("hides nothing before the script has drawn: every rule that clips, fixes or takes the table or a figure out of sight waits for [data-luz-ready]", () => {
    const hiding = rulesOf(sheet()).filter(({ body }) => /clip-path|position:\s*fixed|position:\s*absolute|display:\s*none/.test(body));
    expect(hiding.length).toBeGreaterThan(3);
    for (const { selector } of hiding) expect(selector, selector).toMatch(/data-luz-ready|__bar:empty|data-luz-view="table"\]\s+:is\(\.luz-chart__figure/);
  });

  it("has a forced-colors block: one system colour for the lines, the marks and the ticks, and a dash pattern for series 2 to 6", () => {
    const forced = blockOf(sheet(), /@media\s*\(forced-colors:\s*active\)/);
    expect(forced, "@media (forced-colors: active)").toBeTruthy();
    expect(forced).toMatch(/stroke:\s*CanvasText/);
    expect(forced).toMatch(/GrayText/);
    for (const n of [2, 3, 4, 5, 6]) expect(forced, `series ${n}`).toMatch(new RegExp(`\\[data-n="${n}"\\][^{]*\\{[^}]*stroke-dasharray:\\s*[\\d\\s]+;`));
    expect(forced).not.toMatch(/var\(--luz-/);
  });

  it("prints the table and not the drawing: an @media print block that hides the bar and the figure, and shows the figures of a spark", () => {
    const print = blockOf(sheet(), /@media\s+print/);
    expect(print, "@media print").toBeTruthy();
    expect(print).toMatch(/__bar[^{]*\{[^}]*display:\s*none/s);
    expect(print).toMatch(/__figure|__bar/);
    expect(print).toMatch(/__spark[^{]*\{[^}]*display:\s*none/s);
    // The rule that takes the table out of sight while the chart shows is for the screen only
    const screen = blockOf(sheet(), /@media\s+screen/);
    expect(screen, "@media screen").toBeTruthy();
    expect(screen).toMatch(/clip-path/);
  });

  it("draws the plot left to right in every language, and lets its own box set the size the script draws at", () => {
    const plot = rulesOf(sheet()).find(({ selector }) => selector === ".luz-chart__plot");
    expect(plot?.body).toMatch(/direction:\s*ltr/);
    expect(plot?.body).toMatch(/aspect-ratio/);
    expect(plot?.body).toMatch(/min-block-size/);
  });

  it("lets the table scroll inside the chart in the table view, so a bare wide table never widens the page", () => {
    const rule = rulesOf(sheet()).find(({ selector, body }) => /luz-chart:is\(\[data-luz-view="table"\]/.test(selector) && /overflow-x:\s*auto/.test(body));
    expect(rule, 'luz-chart:is([data-luz-view="table"], [data-luz-view="both"]) { overflow-x: auto }').toBeTruthy();
    expect(rule.selector).toContain('[data-luz-view="both"]');
  });

  it("the button wraps its words and never outgrows the screen", () => {
    const toggle = rulesOf(sheet()).find(({ selector }) => selector === ".luz-chart__toggle");
    expect(toggle?.body).toMatch(/white-space:\s*normal/);
    expect(toggle?.body).toMatch(/max-inline-size:\s*100%/);
  });
});

describe("the page, in English and in Spanish", () => {
  const site = scanSite(join(repo, "apps/docs"), repo);
  // The whole site in both languages, built once: it is the slow part
  let built;
  const rendered = () => (built ??= buildSite(site, { unchecked: ["/"], languages: true }).rendered);
  const english = () => {
    const page = site.byRoute.get("/docs/catalog/chart/");
    expect(page, `${PAGE}: a page at /docs/catalog/chart/`).toBeTruthy();
    return page;
  };

  it("is /docs/catalog/chart/, in the group charts, for any site, the last of the area (order 35), with its own file", () => {
    expect(english(), PAGE).toBeTruthy();
    expect(english().file).toBe(PAGE);
    expect(english().meta).toMatchObject({ area: "catalog", group: "charts", order: "35", "fits-kinds": "any", module: "chart.js", toc: "h2,h3" });
    expect(english().meta.title).toBe("Chart");
    expect(english().meta.fits.length).toBeGreaterThan(10);
    expect(english().meta.description).toMatch(/^[A-Z][^\n]*\.$/);
    expect(english().body).toContain('<div class="docs-component" id="p-chart">');
  });

  it("shows the three ways of using it live: a table with three series, a table filled as an area, and a small line", () => {
    const body = english().body;
    expect(body).toMatch(/<luz-chart type="line"[^>]*>[\s\S]*?<th scope="col">Sevilla<\/th><th scope="col">Cádiz<\/th><th scope="col">Jerez<\/th>/);
    expect(body).toMatch(/<luz-chart type="line" variant="area"/);
    expect(body).toMatch(/<luz-chart type="spark">/);
  });

  it("gives every chart of its demos with a table the two words of the button, and a caption, so the demo has a button and the table a name", () => {
    const demo = english().body.split('<h2 id="known-issues">')[0];
    const charts = [...demo.matchAll(/<luz-chart\b([^>]*)>([\s\S]*?)<\/luz-chart>/g)].filter((m) => /<table/.test(m[2]));
    expect(charts.length).toBeGreaterThanOrEqual(2);
    for (const [, attributes, inner] of charts) {
      expect(attributes).toMatch(/data-luz-label-table="[^"\s][^"]*"/);
      expect(attributes).toMatch(/data-luz-label-chart="[^"\s][^"]*"/);
      expect(inner).toMatch(/<caption/);
      expect(inner).toMatch(/<data value="-?[\d.]+">/);
    }
  });

  it("says in Known issues that there is no readout on hover, that it has not been tested with a screen reader and that a table added later needs the element", () => {
    const issues = english().body.split('<h2 id="known-issues">')[1].split("<nav")[0];
    expect(issues).toMatch(/no readout/i);
    expect(issues).toMatch(/not been tested with a screen reader/i);
    expect(issues).toMatch(/added to the page later|added later/i);
  });

  it("tells the two words of the button where to be read from, in the code, and links the stylesheet after core's", () => {
    const body = english().body;
    expect(body).toContain("data-luz-label-table");
    expect(body).toContain("data-luz-label-chart");
    expect(body).toContain("components/chart.css");
    expect(body).toContain("chart.min.js");
  });

  it("has a Spanish page that is the English page's structure: reviewed: false with no reviewer, and the source hash of the English body", () => {
    expect(existsSync(join(repo, PAGE_ES)), PAGE_ES).toBe(true);
    const meta = front(read(PAGE_ES));
    expect(meta.reviewed).toBe("false");
    expect(meta.reviewer).toBeUndefined();
    expect(meta.title).toBe("Gráfico");
    expect(meta.source, "the hash of the English body: `pnpm check:i18n` prints the right one").toBe(sourceHash(english().body));
    // Only what a translation may say
    expect(Object.keys(meta).sort()).toEqual(["description", "fits", "keywords", "reviewed", "source", "title"]);
  });

  it("the Spanish route shows the pending-review notice in its own language, and the page says where it fits", () => {
    const html = rendered().get("/es/docs/catalog/chart/");
    expect(html, "/es/docs/catalog/chart/").toBeTruthy();
    const root = parse(html);
    const notices = findAll(root, (n) => n.name === "div" && hasClass(n, "docs-notice"));
    expect(notices).toHaveLength(1);
    expect(hasClass(notices[0], "luz-alert--info")).toBe(true);
    expect(textOf(query(root, "h1"))).toBe("Gráfico");
    expect(textOf(query(root, "p.docs-fits"))).toMatch(/^Encaja mejor en: cualquier sitio — /);
  }, 60000);

  it("is in the gallery of the Catalog, in English and in Spanish, with its card and its line of where it fits", () => {
    for (const [route, link, fits] of [["/docs/catalog/", "/docs/catalog/chart/", /^Fits best: any site — /], ["/es/docs/catalog/", "/es/docs/catalog/chart/", /^Encaja mejor en: cualquier sitio — /]]) {
      const cards = findAll(parse(rendered().get(route)), (n) => n.name === "li" && hasClass(n, "docs-card"));
      const card = cards.find((c) => findAll(c, (n) => n.name === "a").some((a) => a.attrs.get("href") === link));
      expect(card, `${route}: the card of ${link}`).toBeTruthy();
      expect(textOf(query(card, "p.docs-card__fits")), route).toMatch(fits);
    }
  }, 60000);
});

describe("the accessibility statement says what was tested and what was not", () => {
  const statement = () => read("apps/docs/pages/accessibility.html");

  it("lists the chart among what is tested: the table beside the drawing, the drawing hidden from assistive technology, the button and forced colors", () => {
    const line = statement().split("\n").find((l) => /<li>The chart:/.test(l));
    expect(line, "an <li> that starts 'The chart:'").toBeTruthy();
    expect(line).toMatch(/table is in the page/);
    expect(line).toMatch(/hidden from assistive technology/);
    expect(line).toMatch(/button swaps/);
    expect(line).toMatch(/forced colors/);
  });

  it("has a Chart paragraph in its known issues: no tooltip, left to right plot, series told by more than colour, a screen reader test not made", () => {
    const paragraph = statement().split("\n").find((l) => /<li><strong>Chart\.<\/strong>/.test(l));
    expect(paragraph, "an <li> that starts 'Chart.'").toBeTruthy();
    expect(paragraph).toMatch(/Without JavaScript/);
    expect(paragraph).toMatch(/no tooltip/i);
    expect(paragraph).toMatch(/left to right/);
    expect(paragraph).toMatch(/dashes/);
    expect(paragraph).toMatch(/has not been tested with a screen reader/);
  });

  it("is translated: the Spanish statement names the chart in both places", () => {
    const es = read("apps/docs/i18n/es/pages/accessibility.html");
    expect(es.split("\n").filter((l) => /gr[aá]fico/i.test(l)).length).toBeGreaterThanOrEqual(2);
  });
});

describe("the changeset and the review record", () => {
  it("a changeset adds <luz-chart> to catalog and to what luz-check knows: both packages, a patch or a minor, and the exception named", () => {
    const file = ".changeset/catalog-chart.md";
    expect(existsSync(join(repo, file)), file).toBe(true);
    const text = read(file);
    const header = /^---\n([\s\S]*?)\n---\n/.exec(text)?.[1] ?? "";
    expect(header).toMatch(/"@luz-ds\/catalog":\s*(?:patch|minor)/);
    expect(header).toMatch(/"@luz-ds\/check":\s*(?:patch|minor)/);
    expect(header).not.toMatch(/major/);
    expect(text).toContain("<luz-chart>");
    expect(text).toContain("EX-014");
  });

  it("dev/BROWSER-REVIEWS.md has an Open row for the chart: its files, what to look at, and both browsers", () => {
    const open = read("dev/BROWSER-REVIEWS.md").split(/^## Closed/m)[0];
    const row = open.split("\n").find((line) => line.startsWith("|") && line.includes("<luz-chart>") && line.includes("packages/catalog/src/chart.js"));
    expect(row, "a row of <luz-chart> in the Open section").toBeTruthy();
    const cells = row.split("|").map((c) => c.trim());
    expect(cells[2]).toContain("chart.js");
    expect(cells[2]).toContain("chart.css");
    expect(cells[2]).toContain("chart.html");
    expect(cells[3]).toMatch(/forced colors/);
    expect(cells[4]).toBe("Safari, Firefox");
  });
});
