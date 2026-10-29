/**
 * The section "Refactor, page by page" of the common body of the five prompts
 * (apps/site/prompts/body.md): how a model moves an existing site to LUZ.
 *
 * LUZ enters an old site as an island, so the old CSS goes in a layer BEFORE
 * LUZ (never after it), LUZ is the conditional build inside `data-luz`, the
 * tokens come first, and the old framework is retired only at the end, with the
 * person's OK. What these tests pin, in each of the five assembled prompts:
 *
 *   - the order of the phases: tokens, the old CSS in a layer, the conditional
 *     build, page by page, retire the layer;
 *   - the old CSS is imported into the layer `legacy` which is declared before
 *     `luz`, and the `!important` of the old CSS are listed;
 *   - nothing is deleted without the person's OK for that step;
 *   - the section names no version, class or element, and links nothing outside
 *     the site and the CDN of @luz-ds.
 *
 * The ceiling of each prompt and its links are in prompts.test.js; the gate is
 * check-prompts.test.js.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../", import.meta.url));
const MODULE = join(root, "scripts/docs-site/prompts.js");
if (!existsSync(MODULE)) throw new Error("scripts/docs-site/prompts.js does not exist");
const { assemblePrompt } = await import(/* @vite-ignore */ MODULE);

const IDS = ["start", "landing", "blog", "app", "docs"];
const HEADING = "## Refactor, page by page";

/** The text between the heading of the section and the next `## `. */
function sectionOf(id) {
  const text = assemblePrompt(id, { root });
  const from = text.indexOf(`\n${HEADING}\n`);
  expect(from, `${id} has the section "${HEADING}"`).toBeGreaterThanOrEqual(0);
  const start = from + HEADING.length + 2;
  const next = text.indexOf("\n## ", start);
  return text.slice(start, next === -1 ? undefined : next);
}

/** Position of the first match of a pattern, or -1. */
const at = (text, pattern) => text.search(pattern);

describe.each(IDS)("the refactor section of the %s prompt", (id) => {
  const section = () => sectionOf(id);

  it("starts with the tokens, with the values of the current brand, before the old CSS or LUZ are linked", () => {
    const s = section();
    const tokens = at(s, /tokens/i);
    expect(tokens, "names the tokens").toBeGreaterThanOrEqual(0);
    expect(s).toMatch(/brand/i);
    expect(tokens).toBeLessThan(at(s, /layer\(legacy\)/));
    expect(tokens).toBeLessThan(at(s, /luz\.conditional\.css/));
  });

  it("puts the old CSS in a layer before LUZ: layer(legacy) and `@layer legacy, luz;`, never `@layer luz, legacy`", () => {
    const s = section();
    expect(s).toContain("layer(legacy)");
    expect(s).toContain("@layer legacy, luz;");
    expect(s).not.toMatch(/@layer\s+luz\s*,\s*legacy/);
  });

  it("tells the model to list every `!important` of the old CSS, because in an earlier layer they still win", () => {
    const s = section();
    expect(s).toContain("!important");
    expect(s).toMatch(/list[^.\n]*!important|!important[^.\n]*list/i);
    expect(s).toMatch(/still win/i);
  });

  it("links `luz.conditional.css` instead of `luz.css` and uses LUZ only inside `data-luz`", () => {
    const s = section();
    expect(s).toContain("luz.conditional.css");
    expect(s).toContain("data-luz");
    // the conditional build comes first; luz.css is named later, for the end
    expect(at(s, /luz\.conditional\.css/)).toBeLessThan(at(s, /luz\.css/));
  });

  it("goes page by page in the person's order, removing the old framework's classes more than adding LUZ ones, one commit per page, showing what changed and what is left", () => {
    const s = section();
    expect(s).toMatch(/page by page|one page/i);
    expect(s).toMatch(/person's order/i);
    expect(s).toMatch(/remov\w+[^.\n]*classes/i);
    expect(s).toMatch(/one commit per page/i);
    expect(s).toMatch(/what changed/i);
    expect(s).toMatch(/what is left/i);
  });

  it("searches the scripts and the templates for a class before deleting it", () => {
    const s = section();
    expect(s).toMatch(/search[^.\n]*scripts/i);
    expect(s).toMatch(/templates/i);
    expect(s).toMatch(/before (you )?(delet|remov)/i);
  });

  it("retires the `legacy` layer, swaps `luz.conditional.css` for `luz.css` and drops `data-luz` only at the end, and only after asking", () => {
    const s = section();
    const pages = at(s, /one commit per page/i);
    expect(pages, "says one commit per page").toBeGreaterThanOrEqual(0);
    const end = s.slice(pages);
    expect(end).toMatch(/legacy/);
    expect(end).toContain("luz.css");
    expect(end).toContain("data-luz");
    expect(end).toMatch(/\bask/i);
    expect(end).toMatch(/\bend\b|\blast\b|\bfinally\b/i);
  });

  it("keeps the rule: never delete the old framework or its files without the person's OK for that step", () => {
    expect(section()).toMatch(/never delete the old framework or its files without the person's OK for that step/i);
  });

  it("is in the order tokens, old CSS in a layer, conditional build, page by page, retire", () => {
    const s = section();
    const order = [at(s, /tokens/i), at(s, /layer\(legacy\)/), at(s, /luz\.conditional\.css/), at(s, /one commit per page/i), s.lastIndexOf("data-luz")];
    for (const p of order) expect(p).toBeGreaterThanOrEqual(0);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("names no version, class, element or link: the only typed names are luz.conditional.css, luz.css and data-luz", () => {
    const s = section();
    expect(s, "no placeholder left").not.toMatch(/\{\{|\{n:/);
    expect(s, "no version").not.toMatch(/\d+\.\d+\.\d+|@luz-ds\/[a-z-]+@/);
    expect(s, "no URL").not.toMatch(/https?:\/\/|www\./);
    expect(s, "no custom element").not.toMatch(/<luz-/);
    // a class: `luz-…`, `o-…`, `.luz-…`, `--luz-…` (the files `luz.css` and the attribute `data-luz` have no hyphen after "luz")
    expect(s, "no LUZ class or token").not.toMatch(/(?<![\w-])(?:\.|--)?(?:luz|o)-[a-z]/);
    expect(s, "data-luz-… attributes are not named").not.toMatch(/data-luz-/);
  });
});
