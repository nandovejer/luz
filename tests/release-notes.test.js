/**
 * What a change said it does, before and after the release.
 *
 * `changeset version` (the Version Packages PR) moves every pending `.changeset/*.md` into the
 * CHANGELOG.md of the packages it names. A test that wants "a minor changeset says X" reads
 * `releaseNotes(root)`: the pending ones and the released ones, in one shape, so it holds on a branch with
 * pending changesets, on the Version PR that consumed them, and on `main` after that PR is merged.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { releaseNotes } from "./helpers/release-notes.js";

let root;
const put = (path, text) => {
  mkdirSync(join(root, path, ".."), { recursive: true });
  writeFileSync(join(root, path), text);
};

const CORE = `# @luz-ds/core

## 0.2.0

### Minor Changes

- 65efde3: Every package now exports \`./classes.json\`.

  No runtime or style change.

- 84f5646: First release of LUZ.

  Breaking: install \`@luz-ds/*\`.

### Patch Changes

- 7a1b2c3: Fix the chevron in right-to-left.
- Updated dependencies [65efde3]
  - @luz-ds/tokens@0.2.0

## 0.1.0

### Major Changes

- 0d0d0d0: An old major.
`;

const TOKENS = `# @luz-ds/tokens

## 0.2.0

### Minor Changes

- 65efde3: Every package now exports \`./classes.json\`.

  No runtime or style change.
`;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "luz-notes-"));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("releaseNotes: a pending changeset", () => {
  it("is read from .changeset/*.md with its bumps and its body, and README.md is not one", () => {
    put(".changeset/README.md", "# Changesets\n");
    put(".changeset/a.md", '---\n"@luz-ds/core": minor\n"@luz-ds/check": patch\n---\n\nSomething new.\n');

    const notes = releaseNotes(root);

    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ file: "a.md", body: "Something new.", released: false });
    expect(notes[0].bumps).toEqual([
      { name: "@luz-ds/core", level: "minor" },
      { name: "@luz-ds/check", level: "patch" },
    ]);
    expect(notes[0].text).toBe('---\n"@luz-ds/core": minor\n"@luz-ds/check": patch\n---\n\nSomething new.\n');
  });

  it("is an empty list when there is no .changeset folder and no CHANGELOG", () => {
    expect(releaseNotes(root)).toEqual([]);
  });
});

describe("releaseNotes: a released change", () => {
  beforeEach(() => {
    put("packages/core/CHANGELOG.md", CORE);
    put("packages/tokens/CHANGELOG.md", TOKENS);
  });

  it("is one note for each hash, with the packages it bumped in its bumps", () => {
    const note = releaseNotes(root).find((n) => n.file === "CHANGELOG:65efde3");

    expect(note).toBeTruthy();
    expect(note.released).toBe(true);
    expect(note.bumps).toEqual([
      { name: "@luz-ds/core", level: "minor" },
      { name: "@luz-ds/tokens", level: "minor" },
    ]);
  });

  it("has the body as it was written: first line after the hash, the indentation of the bullet removed", () => {
    const note = releaseNotes(root).find((n) => n.file === "CHANGELOG:84f5646");

    expect(note.body).toBe("First release of LUZ.\n\nBreaking: install `@luz-ds/*`.");
    expect(note.body).toMatch(/^Breaking:/m);
  });

  it("has a text with the front matter of a changeset, so a test that reads the head finds the bumps", () => {
    const note = releaseNotes(root).find((n) => n.file === "CHANGELOG:65efde3");

    expect(note.text).toBe(
      '---\n"@luz-ds/core": minor\n"@luz-ds/tokens": minor\n---\n\nEvery package now exports `./classes.json`.\n\nNo runtime or style change.\n',
    );
  });

  it("takes the level from the heading, and every release of the file, not only the latest", () => {
    const notes = releaseNotes(root);

    expect(notes.find((n) => n.file === "CHANGELOG:7a1b2c3").bumps).toEqual([{ name: "@luz-ds/core", level: "patch" }]);
    expect(notes.find((n) => n.file === "CHANGELOG:0d0d0d0").bumps).toEqual([{ name: "@luz-ds/core", level: "major" }]);
  });

  it("skips the line that only lists updated dependencies", () => {
    const files = releaseNotes(root).map((n) => n.file);

    expect(files.sort()).toEqual(["CHANGELOG:0d0d0d0", "CHANGELOG:65efde3", "CHANGELOG:7a1b2c3", "CHANGELOG:84f5646"]);
  });

  it("keeps two changesets that were added in the same commit apart: they share a hash and differ in their text", () => {
    put(
      "packages/docs/CHANGELOG.md",
      "# @luz-ds/docs\n\n## 0.2.0\n\n### Minor Changes\n\n- f123842: Exports `./classes.json`.\n- f123842: New package.\n\n  Breaking: nothing.\n",
    );

    const notes = releaseNotes(root).filter((n) => n.file === "CHANGELOG:f123842");

    expect(notes.map((n) => n.body).sort()).toEqual(["Exports `./classes.json`.", "New package.\n\nBreaking: nothing."]);
  });

  it("lists the pending ones too, so a branch with a new changeset and a past release sees both", () => {
    put(".changeset/new.md", '---\n"@luz-ds/core": patch\n---\n\nNew.\n');

    const notes = releaseNotes(root);

    expect(notes.filter((n) => !n.released).map((n) => n.file)).toEqual(["new.md"]);
    expect(notes.filter((n) => n.released)).toHaveLength(4);
  });
});
