/**
 * DESIGN.md is the design rules of the published system (tokens, core, catalog): the third level of rule, DR-n,
 * next to RL and SR. It never names a value, only `--luz-*` tokens, so it cannot go stale on a number; the one
 * thing a test can hold it to is that every token it names exists, in the tokens package or in core (as the
 * theme template is held to the semantic tokens).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DESIGN = join(root, "DESIGN.md");

/** Every `.css` under `dir`, as absolute paths. */
function cssUnder(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return cssUnder(path);
    return entry.isFile() && entry.name.endsWith(".css") ? [path] : [];
  });
}

/** The custom properties that the tokens package (generated and semantic) and core's settings define. */
function definedTokens() {
  const files = [join(root, "packages/tokens/dist/luz-tokens.css"), ...cssUnder(join(root, "packages/tokens/src")), ...cssUnder(join(root, "packages/core/src/settings"))];
  const defined = new Set();
  for (const file of files) {
    if (!existsSync(file)) continue;
    for (const [, name] of readFileSync(file, "utf-8").matchAll(/(--luz-[a-z0-9-]+)\s*:/g)) defined.add(name);
  }
  return defined;
}

describe("DESIGN.md", () => {
  it("is a file at the root of the repository", () => {
    expect(existsSync(DESIGN)).toBe(true);
  });

  it("names the rules as DR-n, each with its six fields", () => {
    const text = readFileSync(DESIGN, "utf-8");
    const rules = [...text.matchAll(/^### (DR-\d+)\b/gm)].map((m) => m[1]);

    expect(rules.length).toBeGreaterThanOrEqual(12);
    expect(rules.length).toBeLessThanOrEqual(20);
    expect(new Set(rules).size).toBe(rules.length);
    for (const id of rules) {
      const body = text.split(new RegExp(`^### ${id}\\b`, "m"))[1].split(/^#{2,3} /m)[0];
      for (const field of ["Rule", "Why", "Tokens", "Look at", "Exceptions"]) {
        expect(body, `${id} has "${field}"`).toMatch(new RegExp(`^\\*\\*${field}:\\*\\*`, "m"));
      }
    }
  });

  it("names only tokens that exist, in the tokens package or in core", () => {
    const named = new Set([...readFileSync(DESIGN, "utf-8").matchAll(/`(--luz-[a-z0-9-]+)`/g)].map((m) => m[1]));
    const defined = definedTokens();

    expect(named.size).toBeGreaterThan(20);
    expect([...named].filter((name) => !defined.has(name)).sort()).toEqual([]);
  });

  // The data palette of a chart (component-gaps plan 4.5, step 1) deviates from three rules; each says so, with the day it was decided
  const DEVIATIONS = [
    ["DR-2", "--luz-chart-grid"],
    ["DR-10", "--luz-chart-1"],
    ["DR-11", "--luz-chart-track"],
  ];
  const exceptionsOf = (text, id) => {
    const body = text.split(new RegExp(`^### ${id}\\b`, "m"))[1].split(/^#{2,3} /m)[0];
    return body.split(/^\*\*Exceptions:\*\*/m)[1];
  };

  it.each(DEVIATIONS)("%s writes the deviation of the chart palette in its Exceptions, with its date", (id, token) => {
    const exceptions = exceptionsOf(readFileSync(DESIGN, "utf-8"), id);
    expect(exceptions, `${id} has Exceptions`).toBeTruthy();
    const at = exceptions.indexOf(`\`${token}\``);
    expect(at, `${id} names ${token}`).toBeGreaterThanOrEqual(0);
    expect(exceptions.slice(at), `${id} dates it`).toMatch(/\(decided 20\d\d-\d\d-\d\d\)/);
    expect(exceptions.trim(), `${id} is not "none" any more`).not.toMatch(/^none\.?$/i);
  });

  it("holds the deviations as design rules, never as a luz-exception or a row of EXCEPTIONS.md", () => {
    const text = readFileSync(DESIGN, "utf-8");
    for (const [id] of DEVIATIONS) expect(exceptionsOf(text, id), id).not.toMatch(/luz-exception|EX-\d+/);
    const register = existsSync(join(root, "EXCEPTIONS.md")) ? readFileSync(join(root, "EXCEPTIONS.md"), "utf-8") : "";
    expect(register).not.toMatch(/--luz-chart/);
    for (const dir of ["packages/tokens/src", "packages/core/src/themes", "apps/site"]) {
      for (const file of cssUnder(join(root, dir))) expect(readFileSync(file, "utf-8"), file).not.toMatch(/luz-exception:[^\n]*chart/i);
    }
  });
});
