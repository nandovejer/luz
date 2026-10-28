/**
 * LUZ — the modal on a small screen: what the stylesheets declare and read, from their sources
 * (the pixels are tests/modal.spec.js, tests/search.spec.js and tests/prompt-dialog.spec.js).
 *
 *   - core's modal, the catalog's search dialog and the site's prompt dialog go full screen under the same query:
 *     the mobile break of the tokens (--luz-mq-sm, 640 px) or a window 30rem tall;
 *   - the sizes of the pinned header and footer (--luz-modal-head-size, --luz-modal-foot-size) are declared once, on
 *     .luz-modal, are at least a 44 px close or action and its line, and are what the dialog's scroll-padding reads,
 *     start then end, so a focused control is never under a bar (WCAG 2.4.11);
 *   - every --luz-modal-* property a stylesheet reads is one core's modal.css declares;
 *   - the tokens the docs page lists as the ones modal.css reads are tests/docs-design.test.js's.
 *
 * Run after `pnpm tokens:build` (the built tokens are read).
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { evalLength } from "./helpers/design-tokens.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(root, path), "utf-8");
const modal = read("packages/core/src/components/modal.css");
const search = read("packages/catalog/src/components/search.css");
const prompt = read("apps/site/prompt-dialog.css");
const tokensCss = read("packages/tokens/dist/luz-tokens.css");

/** Every stylesheet under a folder, without node_modules and dist */
function cssIn(dir) {
  const out = [];
  for (const name of readdirSync(resolve(root, dir))) {
    if (name === "node_modules" || name === "dist") continue;
    const rel = join(dir, name);
    const full = resolve(root, rel);
    if (statSync(full).isDirectory()) out.push(...cssIn(rel));
    else if (name.endsWith(".css")) out.push(rel);
  }
  return out;
}

/** The first value each --luz-* token has in the built tokens (the default, before any @supports form) */
function tokenScope() {
  const scope = {};
  for (const [, name, value] of tokensCss.matchAll(/(--luz-[\w-]+)\s*:\s*([^;]+);/g)) if (!(name in scope)) scope[name] = value.trim();
  return scope;
}

/** The value of a property declared in the small-screen block of modal.css */
function declared(name) {
  const all = [...modal.matchAll(new RegExp(`${name}\\s*:\\s*([^;]+);`, "g"))];
  return all.map((m) => m[1].trim());
}

const SMALL = /@media\s*\(\s*max-width:\s*(\d+)px\s*\)\s*,\s*\(\s*max-height:\s*([\d.]+rem)\s*\)\s*\{/g;

describe("the small-screen query", () => {
  const scope = tokenScope();

  for (const [name, css] of [["core's modal.css", modal], ["catalog's search.css", search], ["the site's prompt-dialog.css", prompt]]) {
    it(`${name} goes full screen at the mobile break of the tokens, or in a window 30rem tall`, () => {
      const queries = [...css.matchAll(SMALL)].map((m) => [Number(m[1]), m[2]]);
      expect(queries.length, "a (max-width) , (max-height) query").toBeGreaterThan(0);
      for (const [width, height] of queries) {
        expect(width, "the width").toBe(evalLength(scope["--luz-mq-sm"]));
        expect(height, "the height").toBe("30rem");
      }
    });
  }
});

describe("--luz-modal-head-size and --luz-modal-foot-size", () => {
  const scope = tokenScope();
  // env() is zero without a notch or a home bar
  const sizeOf = (name) => {
    const [value] = declared(name);
    expect(value, `${name} is declared`).toBeDefined();
    return evalLength(value.replace(/env\([^)]*\)/g, "0px"), scope);
  };
  const close = evalLength(scope["--luz-control-lg"]);

  for (const name of ["--luz-modal-head-size", "--luz-modal-foot-size"]) {
    it(`${name} is declared once, in modal.css`, () => {
      expect(declared(name)).toHaveLength(1);
    });

    it(`${name} holds a 44 px control and the line of its bar`, () => {
      expect(sizeOf(name)).toBeGreaterThanOrEqual(close + 1);
    });
  }

  it("the dialog's scroll-padding-block reads the head size, then the foot size, each with one --luz-space-md more (Firefox and WebKit stop a keyboard focus scroll short of the bar)", () => {
    const value = /scroll-padding-block\s*:\s*([^;]+);/.exec(modal)?.[1].replace(/\s+/g, " ").trim();
    expect(value).toBe("calc(var(--luz-modal-head-size) + var(--luz-space-md)) calc(var(--luz-modal-foot-size) + var(--luz-space-md))");
  });
});

describe("the properties a stylesheet reads", () => {
  const sheets = [...cssIn("packages"), ...cssIn("apps")].filter((f) => !f.includes("/dist/"));

  it("every --luz-modal-* a stylesheet reads with var() is declared in core's modal.css", () => {
    const declaredHere = new Set([...modal.matchAll(/(--luz-modal-[\w-]+)\s*:/g)].map((m) => m[1]));
    expect(declaredHere.size, "modal.css declares its own properties").toBeGreaterThan(0);
    const missing = [];
    for (const file of sheets) {
      for (const [, name] of read(file).matchAll(/var\(\s*(--luz-modal-[\w-]+)/g)) {
        if (!declaredHere.has(name)) missing.push(`${file}: ${name}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("modal.css reads every property it declares", () => {
    for (const [, name] of modal.matchAll(/(--luz-modal-[\w-]+)\s*:/g)) {
      expect(modal, name).toMatch(new RegExp(`var\\(\\s*${name}\\b`));
    }
  });
});
