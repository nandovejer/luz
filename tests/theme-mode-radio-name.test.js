/**
 * The colour mode has one radio group: the `<luz-theme-mode>` fieldset names its radios `luz-theme-mode`
 * (packages/core/src/theme-mode.js). A stylesheet that reads the checked radio to work without JavaScript must
 * name that group. The old name, `luz-theme`, is the key the choice is stored under (localStorage), never the
 * name of a radio: a selector that still says `input[name="luz-theme"]` matches nothing.
 * The behaviour is checked in a browser in tests/theme-mode-nojs.spec.js.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = new URL("../", import.meta.url).pathname;

/** Every .css file under `dir`, except built output and dependencies. */
function stylesheets(dir) {
  const found = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) found.push(...stylesheets(path));
    else if (name.endsWith(".css")) found.push(path);
  }
  return found;
}

const files = [...stylesheets(join(ROOT, "packages")), ...stylesheets(join(ROOT, "apps"))];
const read = (path) => readFileSync(path, "utf-8");

describe("the radio group of the colour mode", () => {
  it("is read in the CSS of packages/ and apps/ under one name, luz-theme-mode", () => {
    expect(files.length).toBeGreaterThan(20);
    const names = new Set();
    for (const file of files) for (const [, name] of read(file).matchAll(/input\[name=["']?([^"'\]\s]+)["']?\]/g)) if (name.startsWith("luz-theme")) names.add(name);
    expect([...names]).toEqual(["luz-theme-mode"]);
  });

  it("is never named luz-theme in a selector", () => {
    const stale = files.flatMap((file) => read(file).split("\n").flatMap((line, i) => (/\[name=["']?luz-theme["']?[\]\s]/.test(line) ? [`${relative(ROOT, file)}:${i + 1}`] : [])));
    expect(stale).toEqual([]);
  });
});
