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
});
