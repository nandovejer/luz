/**
 * The two shapes of dist/data/<pkg>/classes.json that @luz-ds/check reads (packages/check/src/manifests.js).
 *
 * The first snapshot wrote every class in full (`kind`, `block`, `part`, `modifier`) and every property as { name, scope }. To keep the data
 * folder small the snapshot leaves out what the name says (the prefix tells the kind; a luz- or o- name splits into BLOCK__PART--MODIFIER) and
 * lists the properties as names (`properties` the root ones, `componentProperties` the rest). `null` is written only where the split
 * disagrees with the manifest. The change is lossless, and the reader still reads the old shape, so a snapshot written by an earlier
 * build gives the same facts as the new one. The sizes and the keys of the real data are in tests/check-data.test.js.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createFacts } from "../packages/check/src/manifests.js";
import { builtData, LIBRARIES, miniSnapshot, put, ROOT, workspace } from "./helpers/check-fixtures.js";

const readJson = (path) => JSON.parse(readFileSync(path, "utf-8"));

/** The facts of a snapshot folder, read from a directory with no node_modules above it. */
const worldOf = (data) => createFacts({ data }).forDirectory(workspace());

/** What the reader of the world compares: every fact a rule reads. */
const FACTS = ["packages", "classes", "blocks", "tags", "tagNames", "hooks", "versions", "byPrefix", "info", "properties", "publicNames"];
const expectSameFacts = (actual, expected) => {
  for (const fact of FACTS) expect(actual[fact], fact).toEqual(expected[fact]);
};

/** The old shape of a snapshot, written from a folder in the new one: every field in full, the properties as { name, scope } (test-side, from the manifest). */
function oldShapeFromManifests(into) {
  const ownFile = (entry) => `components/${(entry.block ?? entry.name).replace(/^luz-/, "")}.css`;
  for (const name of LIBRARIES) {
    const manifest = readJson(join(ROOT, "packages", name, "dist/classes.json"));
    const classes = manifest.classes.map((entry) => {
      const kept = { name: entry.name, kind: entry.kind };
      if (entry.defined !== true) kept.defined = entry.defined;
      for (const key of ["block", "modifier", "part", "hosts"]) if (entry[key] !== undefined) kept[key] = entry[key];
      if (name === "catalog" && entry.defined && !(entry.files.length === 1 && entry.files[0] === ownFile(entry))) kept.files = entry.files;
      return kept;
    });
    const old = { schema: 1, package: manifest.package, version: manifest.version, classes, properties: manifest.properties.map(({ name: property, scope }) => ({ name: property, scope })) };
    if (manifest.hooks !== undefined) old.hooks = manifest.hooks;
    put(into, `${name}/classes.json`, JSON.stringify(old));
  }
}

describe("the reader of the snapshot: the old shape and the new one", () => {
  it("gives the same facts for the real data written in full (old) and as dist/data writes it (new)", async () => {
    const built = await builtData();
    expect(built.error).toBeNull();
    const old = workspace();
    oldShapeFromManifests(old);
    for (const name of LIBRARIES) {
      const elements = join(built.data, name, "custom-elements.json");
      if (statSync(join(built.data, name)).isDirectory() && readdirSync(join(built.data, name)).includes("custom-elements.json")) put(old, `${name}/custom-elements.json`, readFileSync(elements, "utf-8"));
    }
    // The old folder really is the old shape
    const core = readJson(join(old, "core/classes.json"));
    expect(core.classes.find((c) => c.name === "luz-btn--primary")).toMatchObject({ kind: "component", block: "luz-btn", modifier: "primary" });
    expect(core.properties[0]).toHaveProperty("scope");
    // and the new folder really is the new one
    expect(readJson(join(built.data, "core/classes.json")).classes.find((c) => c.name === "luz-btn--primary")).toStrictEqual({ name: "luz-btn--primary" });

    const fromOld = worldOf(old);
    const fromNew = worldOf(built.data);
    expect(fromNew.classes.size, "the real data has classes").toBeGreaterThan(300);
    expect(fromNew.publicNames.length, "and root properties").toBeGreaterThan(20);
    expect([...fromNew.properties.values()], "and a component-scope property").toContain("component");
    expectSameFacts(fromNew, fromOld);
  });

  it("gives the same facts for a small snapshot written in full and the same one reduced by the rule (kind, BEM split and property scope left out)", () => {
    const full = miniSnapshot();
    const reduced = workspace();
    const prefixKind = (name) => [["is-", "state"], ["luz-", "component"], ["o-", "object"], ["u-", "utility"]].find(([prefix]) => name.startsWith(prefix))?.[1];
    const split = (name) => (name.startsWith("luz-") || name.startsWith("o-") ? /^(.+?)(?:__(.+?))?(?:--(.+))?$/.exec(name).slice(1) : []);
    for (const name of LIBRARIES) {
      const data = readJson(join(full, name, "classes.json"));
      // the full folder is the old shape
      expect(data.properties.every((p) => typeof p === "object" && typeof p.scope === "string"), `${name}: old properties`).toBe(true);
      const classes = data.classes.map((entry) => {
        const [block, part, modifier] = split(entry.name);
        const kept = { name: entry.name };
        // the mini world's luz-catalog-* names are kind "pattern": the prefix does not tell it, so it is written
        if (entry.kind !== prefixKind(entry.name)) kept.kind = entry.kind;
        if (entry.defined !== undefined) kept.defined = entry.defined;
        for (const [key, value] of [["block", block], ["modifier", modifier], ["part", part]]) if (entry[key] !== value) kept[key] = entry[key] ?? null;
        for (const key of ["hosts", "files"]) if (entry[key] !== undefined) kept[key] = entry[key];
        return kept;
      });
      const next = { schema: data.schema, package: data.package, version: data.version, classes, properties: data.properties.filter((p) => p.scope === "root").map((p) => p.name), componentProperties: data.properties.filter((p) => p.scope !== "root").map((p) => p.name) };
      if (data.hooks) next.hooks = data.hooks;
      put(reduced, `${name}/classes.json`, JSON.stringify(next));
      const elements = join(full, name, "custom-elements.json");
      if (readdirSync(join(full, name)).includes("custom-elements.json")) put(reduced, `${name}/custom-elements.json`, readFileSync(elements, "utf-8"));
    }
    const fromFull = worldOf(full);
    const fromReduced = worldOf(reduced);
    expect(fromFull.classes.size).toBeGreaterThan(20);
    expect(fromFull.info.get("luz-catalog-hero"), "a name whose kind the prefix does not tell").toMatchObject({ kind: "pattern" });
    expectSameFacts(fromReduced, fromFull);
  });

  it("derives what is left out of a name and honours what is written: an explicit value, and null for none", () => {
    const dir = workspace();
    put(dir, "core/classes.json", JSON.stringify({
      schema: 1,
      package: "@luz-ds/core",
      version: "1.0.0",
      classes: [
        { name: "is-on" },
        { name: "u-hidden" },
        { name: "o-stack--gap" },
        { name: "luz-card" },
        { name: "luz-card__title" },
        { name: "luz-card--wide" },
        { name: "luz-card__title--big" },
        { name: "luz-odd", block: null },
        { name: "luz-twin--a", block: "luz-card", modifier: null },
        { name: "luz-shifted", block: "luz-card", part: "shifted" },
        { name: "luz-catalog-x", kind: "pattern", defined: false },
      ],
      properties: ["--luz-a"],
      componentProperties: ["--luz-b"],
    }));
    const { info, blocks, properties, publicNames } = worldOf(dir);
    const of = (name) => {
      const { block, kind, modifier, part } = info.get(name);
      return { block, kind, modifier, part };
    };
    expect(of("is-on")).toEqual({ block: undefined, kind: "state", modifier: undefined, part: undefined });
    expect(of("u-hidden")).toEqual({ block: undefined, kind: "utility", modifier: undefined, part: undefined });
    expect(of("o-stack--gap")).toEqual({ block: "o-stack", kind: "object", modifier: "gap", part: undefined });
    expect(of("luz-card")).toEqual({ block: "luz-card", kind: "component", modifier: undefined, part: undefined });
    expect(of("luz-card__title")).toEqual({ block: "luz-card", kind: "component", modifier: undefined, part: "title" });
    expect(of("luz-card--wide")).toEqual({ block: "luz-card", kind: "component", modifier: "wide", part: undefined });
    expect(of("luz-card__title--big")).toEqual({ block: "luz-card", kind: "component", modifier: "big", part: "title" });
    expect(of("luz-odd"), "null: the name splits into a block but the manifest has none").toEqual({ block: undefined, kind: "component", modifier: undefined, part: undefined });
    expect(blocks.has("luz-odd")).toBe(false);
    expect(of("luz-twin--a")).toEqual({ block: "luz-card", kind: "component", modifier: undefined, part: undefined });
    expect(of("luz-shifted"), "a written value wins over the split").toEqual({ block: "luz-card", kind: "component", modifier: undefined, part: "shifted" });
    expect(of("luz-catalog-x").kind, "a written kind wins over the prefix").toBe("pattern");
    expect(info.get("luz-catalog-x").defined).toBe(false);
    expect(properties.get("--luz-a")).toBe("root");
    expect(properties.get("--luz-b")).toBe("component");
    expect(publicNames).toEqual(["--luz-a"]);
  });

  it("still reads a property written as { name, scope } in a snapshot of the new class shape, and drops one that is neither a name nor a scope", () => {
    const dir = workspace();
    put(dir, "core/classes.json", JSON.stringify({
      schema: 1,
      package: "@luz-ds/core",
      version: "1.0.0",
      classes: [{ name: "luz-card" }],
      properties: [{ name: "--luz-a", scope: "root" }, { name: "--luz-c", scope: "component" }, { name: "--luz-bad", scope: "page" }],
    }));
    const { properties } = worldOf(dir);
    expect([...properties]).toEqual([["--luz-a", "root"], ["--luz-c", "component"]]);
  });
});
