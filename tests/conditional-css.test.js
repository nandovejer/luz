/**
 * dist/luz.conditional.css (plan luz-final-refactor, section 6, point 4): luz.css
 * with the reset and the bare-element rules inside a zone, [data-luz], so a page
 * that already has a design opts in one region at a time. The objects, the
 * components and the utilities are not scoped: they are optional by class
 * already. The tokens stay on :root.
 *
 * Two parts, neither needs a browser:
 *   - the file the build writes, read as text (it is built by `pnpm build`,
 *     like every test of dist/);
 *   - scripts/css-scope.js, the dependency-free transform that writes it,
 *     called directly with the shapes of CSS the sources use.
 * tests/conditional-css.spec.js is the page that proves it in a browser.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { LAYER_ORDER } from "../scripts/luz-layers.js";


const root = fileURLToPath(new URL("../", import.meta.url));
const core = `${root}packages/core/`;
const read = (path) => (existsSync(path) ? readFileSync(path, "utf-8") : "");

// The module is imported on demand so a base without it fails each test with a sentence, not with an import error
const scoper = await import("../scripts/css-scope.js").catch(() => null);
const scope = (css) => {
  expect(scoper?.scopeCss, "scripts/css-scope.js exports scopeCss()").toBeTypeOf("function");
  return scoper.scopeCss(css);
};

/** Whitespace and the space around punctuation do not matter to a stylesheet. */
const norm = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").replace(/\s*([{};,])\s*/g, "$1").replace(/:\s+/g, ":").trim();
const keepComments = (css) => css.replace(/\s+/g, " ").replace(/\s*([{};,])\s*/g, "$1").replace(/:\s+/g, ":").trim();

/** Index of the character that closes the bracket opened at `open` (strings and comments skipped). */
function closing(css, open) {
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    const c = css[i];
    if (c === '"' || c === "'") for (i++; css[i] !== c; i++) if (css[i] === "\\") i++;
    if (c === "/" && css[i + 1] === "*") i = css.indexOf("*/", i + 2) + 1;
    if (css[i] === "{") depth++;
    if (css[i] === "}" && --depth === 0) return i;
  }
  throw new Error("unbalanced braces");
}

/** The body of each top-level `@layer name { … }` block, by layer name. */
function layers(css) {
  const out = {};
  for (const m of css.matchAll(/@layer\s+([\w.-]+)\s*\{/g)) {
    const open = m.index + m[0].length - 1;
    // A nested @layer is inside another block: only the top-level ones count
    if (depthAt(css, m.index) === 0) out[m[1]] = css.slice(open + 1, closing(css, open));
  }
  return out;
}

function depthAt(css, index) {
  let depth = 0;
  for (let i = 0; i < index; i++) {
    const c = css[i];
    if (c === '"' || c === "'") for (i++; css[i] !== c; i++) if (css[i] === "\\") i++;
    if (c === "/" && css[i + 1] === "*") i = css.indexOf("*/", i + 2) + 1;
    if (css[i] === "{") depth++;
    if (css[i] === "}") depth--;
  }
  return depth;
}

/** Selector preludes of every style rule at any depth (at-rules excluded), strings and comments blanked. */
function selectors(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '""');
  const out = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{") {
      const prelude = text.slice(start, i).trim();
      if (prelude && !prelude.startsWith("@")) out.push(prelude);
      start = i + 1;
    } else if (text[i] === "}" || text[i] === ";") start = i + 1;
  }
  return out;
}

/** Split at the commas outside (), []. */
function splitTop(text) {
  const parts = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "(" || text[i] === "[") depth++;
    else if (text[i] === ")" || text[i] === "]") depth--;
    else if (text[i] === "," && depth === 0) {
      parts.push(text.slice(from, i).trim());
      from = i + 1;
    }
  }
  parts.push(text.slice(from).trim());
  return parts.filter(Boolean);
}

/** The items a selector is made of: a whole selector, or each argument of its leading :where(). */
function items(selector) {
  const list = [];
  for (const one of splitTop(selector)) {
    if (!one.startsWith(":where(")) {
      list.push(one);
      continue;
    }
    let depth = 0;
    let end = 6;
    for (let i = 6; i < one.length; i++) {
      if (one[i] === "(") depth++;
      if (one[i] === ")" && --depth === 0) {
        end = i;
        break;
      }
    }
    list.push(...splitTop(one.slice(7, end)));
  }
  return list;
}

const conditional = read(`${core}dist/luz.conditional.css`);
const minified = read(`${core}dist/luz.conditional.min.css`);
const full = read(`${core}dist/luz.css`);
const conditionalLayers = layers(conditional);
const fullLayers = layers(full);
const ZONED = ["luz.generic", "luz.elements"];

describe("dist/luz.conditional.css: what the build writes", () => {
  it("is built, with its minified file, and shipped under the export ./conditional.css", () => {
    expect(conditional.length, "dist/luz.conditional.css").toBeGreaterThan(1000);
    expect(minified.length, "dist/luz.conditional.min.css").toBeGreaterThan(1000);
    const pkg = JSON.parse(read(`${core}package.json`));
    expect(pkg.exports["./conditional.css"]).toBe("./dist/luz.conditional.css");
    expect(pkg.exports, "no alias of the old file: the model changed in beta").not.toHaveProperty("./classless.css");
    const packed = read(`${core}pack-files.txt`).split("\n");
    expect(packed).toContain("dist/luz.conditional.css");
    expect(packed).toContain("dist/luz.conditional.min.css");
    expect(packed).not.toContain("dist/classless.css");
  });

  it("has no [data-luz-classless] and no classless file is left in dist", () => {
    expect(conditional).not.toContain("data-luz-classless");
    expect(full).not.toContain("data-luz-classless");
    expect(existsSync(`${core}dist/classless.css`)).toBe(false);
    expect(existsSync(`${core}src/classless`)).toBe(false);
  });

  it("states the layer order first, as luz.css does, and has the same layers", () => {
    expect(conditional.replace(/\/\*[\s\S]*?\*\//g, "").trim().startsWith(LAYER_ORDER.trim())).toBe(true);
    expect(Object.keys(conditionalLayers)).toEqual(Object.keys(fullLayers));
    expect(Object.keys(conditionalLayers).length).toBeGreaterThan(5);
  });

  it("puts every selector of the reset and of the elements inside [data-luz], or starts it with a class", () => {
    for (const layer of ZONED) {
      const all = selectors(conditionalLayers[layer] ?? "");
      expect(all.length, `rules in ${layer}`).toBeGreaterThan(layer === "luz.generic" ? 3 : 20);
      for (const selector of all) {
        for (const item of items(selector)) {
          // A class item is a component that shares the rule of its element, and works outside the zone (:where(select, .luz-select))
          expect(item.startsWith(".") || item.includes("[data-luz]"), `${layer}: "${item}" in "${selector.slice(0, 100)}"`).toBe(true);
        }
      }
    }
  });

  it("keeps the specificity at zero: a rule written with :where() is still a :where()", () => {
    const before = selectors(fullLayers["luz.elements"]).filter((s) => s.startsWith(":where("));
    const after = selectors(conditionalLayers["luz.elements"] ?? "").filter((s) => s.startsWith(":where("));
    // The rules for html alone are the ones dropped
    const dropped = before.filter((s) => s === ":where(html)");
    expect(before.length).toBeGreaterThan(50);
    expect(dropped.length).toBeGreaterThan(0);
    expect(after.length).toBe(before.length - dropped.length);
  });

  it("has no rule for html: the scroll behaviour and the text size are the document's, not a region's", () => {
    for (const layer of ZONED) {
      for (const selector of selectors(conditionalLayers[layer] ?? "")) {
        expect(selector.replace(/\[[^\]]*\]/g, ""), selector).not.toMatch(/(^|[\s(,>+~])html(?![\w-])/);
      }
    }
    expect(selectors(fullLayers["luz.elements"]).some((s) => /(^|[\s(,>+~])html(?![\w-])/.test(s.replace(/\[[^\]]*\]/g, ""))), "luz.css has them").toBe(true);
    const code = conditional.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(code).not.toMatch(/(^|[\s;{])scroll-behavior\s*:/);
    expect(code).not.toContain("text-size-adjust");
  });

  it("moves the rules of body (font, colour, background) to the root of the zone", () => {
    for (const layer of ZONED) {
      for (const selector of selectors(conditionalLayers[layer] ?? "")) expect(selector, "body is gone").not.toMatch(/(^|[\s(,>+~])body(?![\w-])/);
    }
    const root = norm(conditionalLayers["luz.elements"] ?? "").match(/:where\(\[data-luz\]\)\{([^}]*)\}/);
    expect(root, "a rule for the zone itself").not.toBeNull();
    expect(root?.[1]).toContain("font-family:var(--luz-font-body)");
    expect(root?.[1]).toContain("background:var(--luz-surface-page)");
    expect(root?.[1]).toContain("color:var(--luz-text-primary)");
  });

  it("turns the reset's * into the zone and everything in it", () => {
    const generic = norm(conditionalLayers["luz.generic"] ?? "");
    expect(generic).toMatch(/:where\(\[data-luz\],\[data-luz\] \*\)(?:,:where\(\[data-luz\],\[data-luz\] \*\)::(?:before|after))*\{box-sizing:border-box;margin:0;padding:0;?\}/);
    for (const selector of selectors(conditionalLayers["luz.generic"] ?? "")) expect(selector, "no bare *").not.toMatch(/(^|,)\s*\*/);
  });

  it("leaves the tokens on :root, and the settings layer as luz.css has it", () => {
    expect(norm(conditionalLayers["luz.settings"] ?? "")).toBe(norm(fullLayers["luz.settings"]));
    expect(conditionalLayers["luz.settings"] ?? "").toMatch(/:root\s*\{/);
    expect(conditionalLayers["luz.settings"] ?? "").not.toContain("[data-luz]");
  });

  it("does not touch the objects, the components, the utilities or the print rules", () => {
    for (const layer of Object.keys(fullLayers).filter((name) => !ZONED.includes(name))) {
      expect(norm(conditionalLayers[layer] ?? ""), layer).toBe(norm(fullLayers[layer]));
    }
    for (const layer of ["luz.objects", "luz.components", "luz.utilities"]) expect(fullLayers[layer]?.length, layer).toBeGreaterThan(100);
  });

  it("has the same classes as luz.css", () => {
    const classes = (css) => [...new Set(css.replace(/\/\*[\s\S]*?\*\//g, "").match(/\.(?:luz|o|u)-[a-z0-9_-]+/g) ?? [])].sort();
    expect(classes(conditional).length).toBeGreaterThan(100);
    expect(classes(conditional)).toEqual(classes(full));
  });

  it("keeps a component's item unscoped in the rule it shares with its element: .luz-input, .luz-select, .luz-fieldset, .luz-table", () => {
    const list = selectors(conditionalLayers["luz.elements"] ?? "");
    for (const [element, cls] of [["input", ".luz-input"], ["select", ".luz-select"], ["fieldset", ".luz-fieldset"], ["table", ".luz-table"]]) {
      const shared = list.filter((s) => items(s).includes(cls) && items(s).some((i) => i.startsWith("[data-luz]") && i.includes(element)));
      expect(shared.length, `a rule with "[data-luz] … ${element}" and "${cls}"`).toBeGreaterThan(0);
    }
    expect(conditionalLayers["luz.elements"] ?? "", "a class is never put behind the zone").not.toMatch(/\[data-luz\]\s+\.luz-/);
  });

  it("states the colour-mode context of a select in front of the zone and on it, so [data-theme] works on <html> and on the zone", () => {
    const shared = selectors(conditionalLayers["luz.elements"] ?? "").filter((s) => s.includes("data-theme") && s.includes("select"));
    expect(shared.length).toBeGreaterThan(0);
    for (const selector of shared) {
      const alternatives = items(selector).filter((i) => i.includes("data-theme"));
      expect(alternatives.some((i) => /^:is\(\[data-theme[^)]*\)[^[]*\[data-luz\]/.test(i)), `the theme outside the zone in ${selector.slice(0, 80)}`).toBe(true);
      expect(alternatives.some((i) => i.startsWith("[data-luz]:is(")), `the theme on the zone in ${selector.slice(0, 80)}`).toBe(true);
    }
  });

  it("is minified with the same zone", () => {
    expect(minified).toContain("[data-luz]");
    expect(minified).not.toContain("data-luz-classless");
    expect(minified.length).toBeLessThan(conditional.length);
    expect(minified).not.toMatch(/(^|[},])html[{,]|(^|[},])body[{,]/);
  });

  it("is what css-scope.js makes of the sources: each file of the reset and of the elements, scoped, is in it", () => {
    const sources = [`${core}src/generic/_reset.css`, ...readdirSync(`${core}src/elements`).filter((f) => f.endsWith(".css") && f !== "index.css").map((f) => `${core}src/elements/${f}`)];
    expect(sources.length).toBeGreaterThan(8);
    const built = norm(conditional);
    for (const file of sources) expect(built, file).toContain(norm(scope(read(file))));
  });
});

describe("scripts/css-scope.js: scopeCss() on the shapes the sources use", () => {
  const same = (input, expected) => expect(norm(scope(input))).toBe(norm(expected));

  it("exports the zone", () => {
    expect(scoper?.ZONE).toBe("[data-luz]");
  });

  it("puts every item of a :where() list inside the zone and keeps the :where()", () => {
    same(":where(h1, h2) { color: red; }", ":where([data-luz] h1, [data-luz] h2) { color: red; }");
    same(":where(p) { text-wrap: pretty; }", ":where([data-luz] p) { text-wrap: pretty; }");
  });

  it("keeps a pseudo-element after the :where()", () => {
    same(":where(dialog)::backdrop { background: red; }", ":where([data-luz] dialog)::backdrop { background: red; }");
  });

  it("turns * and its pseudo-elements into the zone and everything in it", () => {
    same("*, *::before, *::after { margin: 0; }", ":where([data-luz], [data-luz] *), :where([data-luz], [data-luz] *)::before, :where([data-luz], [data-luz] *)::after { margin: 0; }");
  });

  it("moves body to the root of the zone and drops html", () => {
    same(":where(body) { color: red; }", ":where([data-luz]) { color: red; }");
    same(":where(html, body) { color: red; }", ":where([data-luz]) { color: red; }");
    expect(norm(scope(":where(html) { scroll-behavior: smooth; }"))).toBe("");
    expect(norm(scope(":where(html) { a: b; } :where(p) { c: d; }"))).toBe(norm(":where([data-luz] p) { c: d; }"));
  });

  it("leaves an item that starts with a class where it is: a component shares the rule of its element", () => {
    same(':where(select:not([class*="luz-"]), .luz-select) { appearance: none; }', ':where([data-luz] select:not([class*="luz-"]), .luz-select) { appearance: none; }');
    same(":where(.luz-input:focus, .luz-input:hover) { a: b; }", ":where(.luz-input:focus, .luz-input:hover) { a: b; }");
  });

  it("keeps a comma inside an attribute value, a :is() or a :not() together", () => {
    same(':where(input[value="a,b"], textarea) { a: b; }', ':where([data-luz] input[value="a,b"], [data-luz] textarea) { a: b; }');
    same(':where(:is(button, input:is([type="button"], [type="reset"])):not([class*="luz-"]):hover) { a: b; }', ':where([data-luz] :is(button, input:is([type="button"], [type="reset"])):not([class*="luz-"]):hover) { a: b; }');
  });

  it("states a colour-mode context outside the zone and on it", () => {
    const out = norm(scope(':where(:is([data-theme="dark"], [data-mode="dark"]) select:not([class*="luz-"])) { color-scheme: dark; }'));
    expect(out).toContain(':is([data-theme="dark"],[data-mode="dark"]) [data-luz] select:not([class*="luz-"])');
    expect(out).toContain('[data-luz]:is([data-theme="dark"],[data-mode="dark"]) select:not([class*="luz-"])');
    expect(out.startsWith(":where(")).toBe(true);
  });

  it("scopes a rule that is not in a :where() with the zone and a space", () => {
    same("::-webkit-scrollbar { width: 4px; }", "[data-luz] ::-webkit-scrollbar { width: 4px; }");
  });

  it("scopes the rules inside @media, @supports, @layer and @container, and keeps the at-rule", () => {
    same("@media (forced-colors: active) { :where(th) { border: 1px solid; } }", "@media (forced-colors: active) { :where([data-luz] th) { border: 1px solid; } }");
    same("@supports (appearance: base-select) { :where(select) { a: b; } }", "@supports (appearance: base-select) { :where([data-luz] select) { a: b; } }");
    same("@layer luz.elements { :where(p) { a: b; } }", "@layer luz.elements { :where([data-luz] p) { a: b; } }");
    same("@container (min-width: 20rem) { :where(td) { a: b; } }", "@container (min-width: 20rem) { :where([data-luz] td) { a: b; } }");
    same("@media (min-width: 40em) { @supports (display: grid) { :where(table) { a: b; } } }", "@media (min-width: 40em) { @supports (display: grid) { :where([data-luz] table) { a: b; } } }");
  });

  it("copies @keyframes and @font-face as they are", () => {
    const keyframes = "@keyframes fade { from { opacity: 0; } to { opacity: 1; } }";
    const font = '@font-face { font-family: "Face"; src: url("a.woff2") format("woff2"); }';
    same(keyframes, keyframes);
    same(font, font);
    same(`${keyframes} :where(p) { a: b; }`, `${keyframes} :where([data-luz] p) { a: b; }`);
  });

  it("keeps every declaration, byte for byte, including a brace and a semicolon inside a string", () => {
    const body = 'content: "}"; background: var(--luz-x, calc(1px + 2px)); background-image: url("data:image/svg+xml;utf8,<svg/>");';
    expect(scope(`:where(p)::before { ${body} }`)).toContain(body);
  });

  it("keeps the comments", () => {
    expect(keepComments(scope("/* the paragraph */ :where(p) { a: b; }"))).toContain("/* the paragraph */");
  });

  it("returns an empty sheet for an empty sheet, and does not throw on the real sources", () => {
    expect(scope("")).toBe("");
    const dir = `${core}src/elements`;
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".css"))) expect(() => scope(read(`${dir}/${file}`)), file).not.toThrow();
    expect(() => scope(read(`${core}src/generic/_reset.css`))).not.toThrow();
  });
});
