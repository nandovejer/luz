/**
 * The default colour mode follows the system, with no JavaScript (plan
 * component-gaps, section 18; owner, 2026-11-03). What the build writes and
 * what the sources say, read as text; the page is tests/color-mode-system.spec.js.
 *
 *   - tokens: the build writes the dark and high-contrast blocks of
 *     semantic.css again under @media (prefers-color-scheme: dark) and
 *     @media (prefers-contrast: more), in that order (the contrast one wins),
 *     for a page with no data-mode, no data-theme and no checked light, dark or
 *     high-contrast radio. They are generated, so they cannot drift from the
 *     two blocks they copy.
 *   - the consumer's contrast checker (packages/tokens/lib/theme.js) skips
 *     LUZ's own system blocks (only in the file named `tokens`), and splits a
 *     selector list at its top-level commas only.
 *   - core: the colour-scheme of the pickers and of a select is one hook,
 *     --luz-scheme, not four dark rules.
 *   - the weights stay under the ceilings of budgets.json (never raised), and
 *     the changeset and the docs say that the default look changes.
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { analyze } from "../packages/tokens/lib/check.js";
import { run } from "../packages/tokens/lib/cli.js";
import { parseRules, valuesFor } from "../packages/tokens/lib/theme.js";
import { builtData } from "./helpers/check-fixtures.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => (existsSync(`${root}${path}`) ? readFileSync(`${root}${path}`, "utf-8") : "");
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const squash = (text) => text.replace(/\s+/g, "");

/** The two media blocks of a stylesheet: [{ query, selector, declarations: { name: value } }], in order. */
function mediaBlocks(css) {
  const out = [];
  for (const m of strip(css).matchAll(/@media\s*(\([^{}]*\))\s*\{\s*([^{}]+?)\s*\{([^{}]*)\}\s*\}/g)) {
    const query = m[1].replace(/\s+/g, "");
    if (!/^\(prefers-(?:color-scheme:dark|contrast:more)\)$/.test(query)) continue;
    out.push({ query, selector: m[2].replace(/\s+/g, " ").trim(), declarations: Object.fromEntries([...m[3].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((d) => [d[1], d[2].trim()])) });
  }
  return out;
}

/** The declarations of the explicit dark and high-contrast blocks of semantic.css. */
function explicit(name) {
  const rule = parseRules(read("packages/tokens/src/semantic.css")).find((r) => r.selectors.includes(`[data-theme="${name}"]`));
  return Object.fromEntries((rule?.declarations ?? []).map((d) => [d.name, d.value]));
}

const TOKENS = ["packages/tokens/dist/tokens.css", "packages/tokens/dist/luz-tokens.css"];
const DARK_QUERY = "(prefers-color-scheme:dark)";
const CONTRAST_QUERY = "(prefers-contrast:more)";

describe("the tokens the build writes: the system's mode", () => {
  for (const file of TOKENS) {
    describe(file, () => {
      const css = read(file);
      const blocks = mediaBlocks(css);

      it("has exactly one @media (prefers-color-scheme: dark) block and one @media (prefers-contrast: more) block, dark first", () => {
        expect(css.length, `${file} is built (pnpm tokens:build)`).toBeGreaterThan(1000);
        const code = strip(css);
        expect(code.match(/@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)/g)?.length, "the dark query").toBe(1);
        expect(code.match(/@media\s*\(\s*prefers-contrast\s*:\s*more\s*\)/g)?.length, "the contrast query").toBe(1);
        expect(blocks.map((b) => b.query)).toEqual([DARK_QUERY, CONTRAST_QUERY]);
      });

      it("holds, in the dark block, the very declarations of the dark block of semantic.css", () => {
        const dark = explicit("dark");
        expect(Object.keys(dark).length, "the dark block of semantic.css").toBeGreaterThan(50);
        expect(blocks[0]?.declarations).toEqual(dark);
      });

      it("holds, in the contrast block, the very declarations of the high-contrast block of semantic.css", () => {
        const contrast = explicit("high-contrast");
        expect(Object.keys(contrast).length, "the high-contrast block of semantic.css").toBeGreaterThan(50);
        expect(blocks[1]?.declarations).toEqual(contrast);
      });

      it("applies to a page with no data-mode, no data-theme and no light, dark or high-contrast radio checked, and to nothing else", () => {
        expect(blocks, "the two blocks").toHaveLength(2);
        for (const block of blocks) {
          const selector = squash(block.selector);
          expect(selector, "one :root, not a list").toMatch(/^:is\(:root:not\(/);
          expect(selector).toContain("[data-mode]");
          expect(selector).toContain("[data-theme]");
          // The checked radios of the three explicit choices, by name and value: Auto, a radio with no value and no radio are not among them
          expect(selector).toContain('input[name="luz-theme-mode"]');
          expect(selector).toContain(":checked");
          for (const value of ["light", "dark", "high-contrast"]) expect(selector, `the ${value} radio`).toContain(`[value="${value}"]`);
          expect(selector).not.toContain('[value="auto"]');
          expect(block.selector, "no comma at the top level").not.toMatch(/^[^(]*,/);
        }
        expect(squash(blocks[0]?.selector ?? "")).toBe(squash(blocks[1]?.selector ?? ""));
      });
    });
  }

  it("is in the minified file, once each, in the same order", () => {
    const min = read("packages/tokens/dist/luz-tokens.min.css");
    const darkAt = min.search(/@media\s*\(prefers-color-scheme:\s*dark\)/);
    const contrastAt = min.search(/@media\s*\(prefers-contrast:\s*more\)/);
    expect(darkAt, "the dark query").toBeGreaterThan(0);
    expect(contrastAt, "the contrast query").toBeGreaterThan(darkAt);
    expect(min.match(/@media\s*\(prefers-color-scheme:\s*dark\)/g)).toHaveLength(1);
    expect(min.match(/@media\s*\(prefers-contrast:\s*more\)/g)).toHaveLength(1);
  });

  it("is written by the build from semantic.css: the blocks of the source are the ones the media blocks copy, and the source has no @media of its own", () => {
    const source = strip(read("packages/tokens/src/semantic.css"));
    expect(source).not.toMatch(/@media\s*\(\s*prefers-(?:color-scheme|contrast)/);
    expect(read("scripts/build-tokens.js")).toMatch(/prefers-color-scheme: dark/);
  });
});

describe("the consumer's contrast checker and LUZ's system blocks", () => {
  const tokensPath = `${root}packages/tokens/dist/tokens.css`;
  const tokensCss = () => read("packages/tokens/dist/tokens.css");
  const check = (files, args = []) => run(["check-contrast", ...Object.keys(files), ...args], { tokensPath, read: (path) => (path in files ? files[path] : readFileSync(path, "utf-8")) });
  const json = (files) => JSON.parse(check(files, ["--json"]).stdout);

  it("reads LUZ's own tokens, system blocks included, with nothing ignored and ok", () => {
    expect(mediaBlocks(tokensCss()), "the system blocks are in dist/tokens.css").toHaveLength(2);
    const report = json({ "empty.css": "" });
    expect(report.ignored).toEqual([]);
    expect(report.unreadable).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.modes).toEqual(["light", "dark", "high-contrast"]);
    expect(analyze([{ file: "tokens", rules: parseRules(tokensCss()) }]).ignored, "the engine over the file named tokens").toEqual([]);
  });

  it("measures the same pairs with the system blocks as without them: they add nothing, the explicit blocks are read", () => {
    const full = parseRules(tokensCss());
    expect(full.some((r) => r.conditions.some((c) => /prefers-contrast/.test(c))), "the contrast block is among the rules").toBe(true);
    const without = full.filter((r) => !r.conditions.some((c) => /prefers-(?:contrast|color-scheme)/.test(c)));
    expect(without.length).toBeLessThan(full.length);
    const a = analyze([{ file: "tokens", rules: full }]);
    const b = analyze([{ file: "tokens", rules: without }]);
    expect(a.checked).toBe(b.checked);
    expect(a.failures).toEqual(b.failures);
    for (const mode of ["light", "dark", "high-contrast"]) {
      const target = { name: mode, theme: mode, mode: null, scheme: mode === "high-contrast" ? null : mode };
      expect(valuesFor(target, [{ file: "tokens", rules: full }]).values, mode).toEqual(valuesFor(target, [{ file: "tokens", rules: without }]).values);
    }
  });

  it("gives the bundled snapshot of luz-check the same verdict as dist/tokens.css, ignored included", async () => {
    expect(mediaBlocks(tokensCss()), "the system blocks are in dist/tokens.css").toHaveLength(2);
    const snapshot = await builtData();
    expect(snapshot.error).toBeNull();
    const reduced = parseRules(readFileSync(`${snapshot.data}/tokens/tokens.css`, "utf-8"));
    const own = analyze([{ file: "tokens", rules: reduced }]);
    expect(own).toEqual(analyze([{ file: "tokens", rules: parseRules(tokensCss()) }]));
    expect(own.ignored).toEqual([]);
    expect(own.ok).toBe(true);
  });

  it("skips the system blocks only in the file named `tokens`: a consumer file that copies them is read, and says what it cannot place", () => {
    const blocks = [...strip(tokensCss()).matchAll(/@media\s*\(prefers-(?:color-scheme: dark|contrast: more)\)\s*\{[\s\S]*?\n\}\n/g)].map((m) => m[0]);
    expect(blocks, "the two blocks of dist/tokens.css").toHaveLength(2);
    const copy = blocks.join("\n").replace(/(--luz-text-secondary):[^;]+;/g, "$1: #999999;");
    const own = analyze([{ file: "tokens", rules: parseRules(tokensCss()) }, { file: "theme.css", rules: parseRules(copy) }]);
    // The consumer's copy is ignored where it cannot be read (and says so), never silently dropped as LUZ's own
    expect(own.ignored.length, "the copy is not skipped").toBeGreaterThanOrEqual(2);
    expect(own.ignored.every((i) => i.file === "theme.css")).toBe(true);
    expect(own.ignored.some((i) => /prefers-contrast/.test(i.reason))).toBe(true);
    // The same text in the file named tokens is LUZ's: nothing is ignored
    const asTokens = analyze([{ file: "tokens", rules: parseRules(tokensCss()) }, { file: "tokens", rules: parseRules(copy) }]);
    expect(asTokens.ignored).toEqual([]);
  });

  it("skips a system block written by hand in the file named `tokens`, and none in another file", () => {
    const system = ':is(:root:not([data-mode], [data-theme], :has(input[name="luz-theme-mode"]:checked:is([value="light"], [value="dark"], [value="high-contrast"]))))';
    const css = `:root { --luz-text-primary: #111111; }\n[data-theme="dark"] { --luz-text-primary: #eeeeee; }\n@media (prefers-contrast: more) { ${system} { --luz-text-primary: #123456; } }\n@media (prefers-color-scheme: dark) { ${system} { --luz-text-primary: #654321; } }\n`;
    const target = { name: "dark", theme: "dark", mode: null, scheme: "dark" };
    const own = valuesFor(target, [{ file: "tokens", rules: parseRules(css) }]);
    expect(own.values["--luz-text-primary"]).toBe("#eeeeee");
    expect(own.ignored, "LUZ's blocks are not an ignored rule").toEqual([]);
    const other = valuesFor(target, [{ file: "my.css", rules: parseRules(css) }]);
    expect(other.ignored.length, "a consumer's file is told what is not read").toBeGreaterThan(0);
  });

  it("splits a selector list at its top-level commas: the ones inside :is(), :not() and [] belong to one selector", () => {
    const one = parseRules(':is(:root:not([data-mode], [data-theme], :has(input[value="a,b"]))) { --luz-x: #fff; }');
    expect(one[0].selectors).toEqual([':is(:root:not([data-mode], [data-theme], :has(input[value="a,b"])))']);
    const two = parseRules('[data-theme="dark"],\n:is(:root:not([data-mode], [data-theme])) { --luz-x: #fff; }');
    expect(two[0].selectors).toEqual(['[data-theme="dark"]', ":is(:root:not([data-mode], [data-theme]))"]);
    const inMedia = parseRules("@media (prefers-contrast: more) { :root:not([data-mode], [data-theme]), .a { --luz-x: #fff; } }");
    expect(inMedia[0].selectors).toEqual([":root:not([data-mode], [data-theme])", ".a"]);
  });
});

describe("core: the colour scheme of the pickers and of a select is one hook, --luz-scheme", () => {
  const forms = read("packages/core/src/elements/forms.css");
  const sources = ["packages/core/src/elements/forms.css", "packages/core/src/components/select.css", "packages/core/src/components/form.css"];
  const darkScheme = /(?<![\w-])color-scheme\s*:\s*dark/;

  it("has no `color-scheme: dark` left in the sources: the four duplicated dark rules are gone", () => {
    for (const file of sources) expect(strip(read(file)), file).not.toMatch(darkScheme);
    for (const file of ["packages/core/dist/luz.css", "packages/core/dist/luz.conditional.css"]) expect(strip(read(file)), file).not.toMatch(darkScheme);
  });

  it("sets --luz-scheme: dark in the dark modes and in the system's dark when the page names no mode, never in high contrast", () => {
    const code = strip(forms);
    expect(code).toMatch(/--luz-scheme\s*:\s*dark/);
    const dark = code.match(/:where\(([^{}]*)\)\s*\{\s*--luz-scheme\s*:\s*dark/);
    expect(dark, "a rule for the dark modes").not.toBeNull();
    for (const part of ['[data-theme="dark"]', '[data-mode="dark"]', 'input[name="luz-theme-mode"][value="dark"]:checked']) expect(dark?.[1], part).toContain(part);
    const system = code.match(/@media\s*([^{}]*)\{\s*:where\(([^{}]*)\)\s*\{\s*--luz-scheme\s*:\s*dark/);
    expect(system, "a rule for the system's dark").not.toBeNull();
    expect(squash(system?.[1] ?? "")).toBe("(prefers-color-scheme:dark)and(not(prefers-contrast:more))");
    for (const part of [":root:not(", "[data-mode]", "[data-theme]"]) expect(system?.[2], part).toContain(part);
    for (const value of ["light", "dark", "high-contrast"]) expect(system?.[2], `the ${value} radio`).toContain(`[value="${value}"]:checked`);
  });

  it("reads --luz-scheme, light by default, in the select, the .luz-select, the date and time fields and .luz-input", () => {
    const code = strip(forms);
    const readers = [...code.matchAll(/([^{}]+)\{([^{}]*color-scheme\s*:\s*var\(--luz-scheme,\s*light\)[^{}]*)\}/g)].map((m) => squash(m[1]));
    expect(readers.length).toBeGreaterThanOrEqual(2);
    const text = readers.join("|");
    for (const part of ["select", ".luz-select", 'input:is([type="date"]', ".luz-input"]) expect(text, part).toContain(part);
  });
});

describe("weights: the ceilings of budgets.json are never raised", () => {
  const budgets = JSON.parse(read("budgets.json")).budgets;
  const gzip = (file) => gzipSync(readFileSync(`${root}${file}`), { level: 9 }).length;

  it("keeps core CSS and core conditional CSS at 11,776 B gzipped, and the tokens at 5,120 B", () => {
    const row = (file) => budgets.find((b) => b.file === file);
    expect(row("packages/core/dist/luz.min.css").max).toBe(11776);
    expect(row("packages/core/dist/luz.conditional.min.css").max).toBe(11776);
    expect(row("packages/tokens/dist/luz-tokens.min.css").max).toBe(5120);
    expect(gzip("packages/core/dist/luz.min.css")).toBeLessThanOrEqual(11776);
    expect(gzip("packages/core/dist/luz.conditional.min.css")).toBeLessThanOrEqual(11776);
    expect(gzip("packages/tokens/dist/luz-tokens.min.css")).toBeLessThanOrEqual(5120);
  });
});

describe("the words: the changeset and the docs say that the default follows the system", () => {
  const changeset = read(".changeset/color-mode-follows-system.md");

  it("has a changeset: minor for tokens, core and catalog, patch for check, and it says the default look changes for dark and high-contrast systems", () => {
    expect(changeset.length, ".changeset/color-mode-follows-system.md").toBeGreaterThan(200);
    const front = changeset.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
    expect(front).toMatch(/"@luz-ds\/tokens":\s*minor/);
    expect(front).toMatch(/"@luz-ds\/core":\s*minor/);
    expect(front).toMatch(/"@luz-ds\/catalog":\s*minor/);
    expect(front).toMatch(/"@luz-ds\/check":\s*patch/);
    const text = changeset.replace(/^---[\s\S]*?---/, "");
    expect(text).toMatch(/follows the system/i);
    expect(text).toMatch(/prefers-contrast/);
    expect(text, "who sees a difference").toMatch(/system is dark or high contrast/i);
    expect(text, "how to keep a page light").toMatch(/data-theme="light"/);
    expect(text, "the explicit choice still wins").toMatch(/explicit choice still wins|wins over the system/i);
  });

  it("is in the README of the tokens and of the repository: with no data-theme and no data-mode the page follows the system, with no script", () => {
    expect(read("packages/tokens/README.md")).toMatch(/follows the system, with no script/);
    expect(read("README.md")).toMatch(/follows the system with no script/);
  });

  it("says in semantic.css and in the theme template what the default is and what a theme must repeat", () => {
    const semantic = read("packages/tokens/src/semantic.css");
    expect(semantic).toMatch(/follows the system/);
    expect(semantic).toMatch(/prefers-color-scheme: dark/);
    expect(semantic).toMatch(/prefers-contrast: more/);
    const template = read("packages/core/src/themes/_template.css");
    expect(template).toMatch(/follow the system/);
    expect(template).toMatch(/prefers-color-scheme: dark/);
  });

  it("has the docs say Auto follows the system with no script, in English and in Spanish, and not that the default is light", () => {
    for (const prefix of ["apps/docs/pages", "apps/docs/i18n/es/pages"]) {
      for (const page of ["tokens/modes.html", "tokens/themes.html", "components/theme-mode.html", "get-started/javascript.html", "get-started/structure.html", "catalog/theme-time.html"]) {
        const text = read(`${prefix}/${page}`);
        expect(text.length, `${prefix}/${page}`).toBeGreaterThan(500);
        expect(text, `${prefix}/${page}`).not.toMatch(/Auto is light|Auto es claro|Light is the default, whatever|A page is light until it says otherwise/);
      }
    }
    expect(read("apps/docs/pages/tokens/modes.html")).toMatch(/follows the device|follows the system/);
    expect(read("apps/docs/pages/components/theme-mode.html")).toMatch(/Auto follows the system/);
  });

  it("has a row in the browser reviews: Open, for Safari and Firefox, with the files", () => {
    const text = read("dev/BROWSER-REVIEWS.md");
    const open = text.slice(text.indexOf("## Open"), text.indexOf("## Closed"));
    const row = open.split("\n").find((line) => line.includes("follows the system") && line.includes("prefers-color-scheme: dark"));
    expect(row, "a row about the system's default color mode").toBeDefined();
    expect(row).toContain("scripts/build-tokens.js");
    expect(row).toContain("packages/core/src/elements/forms.css");
    expect(row).toMatch(/\| Safari, Firefox \|$/);
  });
});
