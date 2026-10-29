/**
 * The CSS of the apps (the home, the docs, the site) reads LUZ's tokens like any consumer. A `var(--luz-x)` with no
 * fallback that names a token nothing defines drops its declaration without a word: `landing.css` read
 * `--luz-radius-lg`, a radius the scale does not have, so the panels of the home had square corners (DESIGN.md, DR-1:
 * no radius larger than the scale's). tests/css-tokens-defined.test.js holds the packages to the same rule.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const cssUnder = (dir) =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        if (e.name === "node_modules") return [];
        const path = join(dir, e.name);
        return e.isDirectory() ? cssUnder(path) : e.name.endsWith(".css") ? [path] : [];
      })
    : [];

/** Defined by a stylesheet (the tokens, core's settings, the app's own) or set by a script on purpose. */
const SET_BY_SCRIPT = new Set(["--luz-consent-h"]);

describe("the tokens the CSS of the apps reads", () => {
  const defined = new Set();
  const used = new Map();
  const files = [join(root, "packages/tokens/dist/luz-tokens.css"), ...cssUnder(join(root, "packages/core/src")), ...cssUnder(join(root, "packages/catalog/src")), ...cssUnder(join(root, "apps"))];
  for (const file of files) {
    if (!existsSync(file)) continue;
    const css = strip(readFileSync(file, "utf-8"));
    for (const [, name] of css.matchAll(/(--luz-[a-z0-9-]+)\s*:/g)) defined.add(name);
    if (!file.startsWith(join(root, "apps"))) continue;
    for (const [, name, close] of css.matchAll(/var\(\s*(--luz-[a-z0-9-]+)\s*([,)])/g)) {
      if (close === ")") used.set(name, [...(used.get(name) ?? []), file.slice(root.length + 1)]);
    }
  }

  it("exist: defined by the tokens, core's settings or a stylesheet, or set by a script on purpose", () => {
    const missing = [...used].filter(([name]) => !defined.has(name) && !SET_BY_SCRIPT.has(name)).map(([name, list]) => `${name} (${[...new Set(list)].join(", ")})`);
    expect(missing).toEqual([]);
  });
});
