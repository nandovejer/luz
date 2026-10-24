/**
 * A stylesheet that reads a token nothing defines gets an invalid declaration: the browser drops it without a
 * word (the menu of `<luz-lang-switch>` read `--luz-radius-lg`, a radius the scale does not have, and had square
 * corners). Every `var(--luz-x)` with no fallback in the CSS of the packages names a custom property that the
 * tokens package, core's settings or a stylesheet defines, or that a script sets on purpose (the list below).
 * Found by the first design audit (DESIGN.md, DR-1).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Set by a script on `:root`, not by a stylesheet: the file that sets it. */
const SET_BY_SCRIPT = { "--luz-consent-h": "packages/catalog/src/consent.js" };

const cssUnder = (dir) =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const path = join(dir, e.name);
        return e.isDirectory() ? cssUnder(path) : e.name.endsWith(".css") ? [path] : [];
      })
    : [];

const sources = readdirSync(join(root, "packages")).flatMap((name) => cssUnder(join(root, "packages", name, "src")));
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

describe("the tokens the packages' CSS reads", () => {
  const defined = new Set();
  const used = new Map();
  for (const file of [join(root, "packages/tokens/dist/luz-tokens.css"), ...sources]) {
    if (!existsSync(file)) continue;
    const css = strip(readFileSync(file, "utf-8"));
    for (const [, name] of css.matchAll(/(--luz-[a-z0-9-]+)\s*:/g)) defined.add(name);
    for (const [, name, close] of css.matchAll(/var\(\s*(--luz-[a-z0-9-]+)\s*([,)])/g)) {
      if (close === ")") used.set(name, [...(used.get(name) ?? []), file.slice(root.length + 1)]);
    }
  }

  it("exist: defined by the tokens, core's settings or a stylesheet, or set by a script on purpose", () => {
    const missing = [...used].filter(([name]) => !defined.has(name) && !SET_BY_SCRIPT[name]).map(([name, files]) => `${name} (${[...new Set(files)].join(", ")})`);

    expect(missing).toEqual([]);
  });

  it("are set by the script the list names, so the list does not go stale", () => {
    for (const [name, file] of Object.entries(SET_BY_SCRIPT)) {
      expect(readFileSync(join(root, file), "utf-8"), `${file} sets ${name}`).toContain(name);
    }
  });
});

/** The sizes that are relative on purpose (DESIGN.md, DR-4, Exceptions), by file: the caption is sized from the text it captions. */
const RELATIVE_ON_PURPOSE = { "packages/core/src/components/figure.css": /font-size:\s*0\.875em;/ };

describe("the text sizes of the components (DESIGN.md, DR-4)", () => {
  it("are steps of the text scale: no component derives a size of its own, but the ones the rule excepts", () => {
    const derived = [];
    for (const dir of ["packages/core/src/components", "packages/catalog/src/components"]) {
      for (const file of cssUnder(join(root, dir))) {
        strip(readFileSync(file, "utf-8"))
          .split("\n")
          .forEach((line, i) => {
            if (/^\s*font-size:/.test(line) && !/var\(--luz-text-[a-z0-9]+\)/.test(line) && !RELATIVE_ON_PURPOSE[file.slice(root.length + 1)]?.test(line)) derived.push(`${file.slice(root.length + 1)}:${i + 1}: ${line.trim()}`);
          });
      }
    }

    expect(derived).toEqual([]);
  });
});
