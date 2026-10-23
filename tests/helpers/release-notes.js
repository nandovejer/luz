/**
 * What a change said it does, whether the release has happened or not.
 *
 * Before the Version Packages PR a change is a file in `.changeset/`. `changeset version` moves it into the
 * `CHANGELOG.md` of each package it bumped, as `- <hash>: <text>` under "### Minor Changes" (or Major,
 * Patch), and the file is gone. A test that wants "a minor changeset says X" reads `releaseNotes(root)`,
 * which returns both in the shape the tests already use, so it holds before the PR, on it, and after it
 * is merged. The entries of one change in several CHANGELOGs share a hash and a text: they are one note.
 * (The hash is the commit that added the changeset, so two changesets added together share a hash and
 * stay two notes: they differ in their text.)
 *
 *   { file, bumps: [{ name, level }], body, text, released }
 *
 * `file` is the name of the changeset (`a.md`) or `CHANGELOG:<hash>`; `text` has the front matter of a
 * changeset in both cases.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const FRONT = /^---\n([\s\S]*?)\n---/;
const BUMP = /^["']?(@luz-ds\/[\w-]+)["']?\s*:\s*(major|minor|patch)\s*$/gm;
const LEVELS = { Major: "major", Minor: "minor", Patch: "patch" };

/** The changesets still in `.changeset/`. */
function pending(root) {
  const dir = join(root, ".changeset");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith(".md") && file !== "README.md")
    .sort()
    .map((file) => {
      const text = readFileSync(join(dir, file), "utf-8");
      const head = text.match(FRONT)?.[1] ?? "";
      const bumps = [...head.matchAll(BUMP)].map((m) => ({ name: m[1], level: m[2] }));
      return { file, bumps, body: text.replace(/^---[\s\S]*?\n---/, "").trim(), text, released: false };
    });
}

/** The entries of one CHANGELOG: [{ hash, level, body }]. A line that only lists updated dependencies has no hash and is skipped. */
function entriesOf(changelog) {
  const entries = [];
  let level = null;
  let current = null;
  const close = () => {
    if (current) entries.push({ ...current, body: current.lines.join("\n").trim() });
    current = null;
  };
  for (const line of changelog.split("\n")) {
    const heading = line.match(/^### (Major|Minor|Patch) Changes\s*$/);
    if (heading || /^#{1,3} /.test(line)) {
      close();
      level = heading ? LEVELS[heading[1]] : null;
      continue;
    }
    if (/^- /.test(line)) {
      close();
      const entry = line.match(/^- ([0-9a-f]{7,40}): (.*)$/);
      if (entry && level) current = { hash: entry[1], level, lines: [entry[2]] };
      continue;
    }
    if (current && (line === "" || line.startsWith("  "))) current.lines.push(line.startsWith("  ") ? line.slice(2) : line);
    else if (current) close();
  }
  close();
  return entries;
}

/** The changes already released, from `packages/<name>/CHANGELOG.md`, one note for each hash. */
function released(root) {
  const packages = join(root, "packages");
  if (!existsSync(packages)) return [];
  const notes = new Map();
  for (const dir of readdirSync(packages).sort()) {
    const path = join(packages, dir, "CHANGELOG.md");
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf-8");
    const name = text.match(/^# (@luz-ds\/[\w-]+)\s*$/m)?.[1];
    if (!name) continue;
    for (const { hash, level, body } of entriesOf(text)) {
      const key = `${hash}\0${body}`;
      if (!notes.has(key)) notes.set(key, { file: `CHANGELOG:${hash}`, bumps: [], body, released: true });
      const note = notes.get(key);
      if (!note.bumps.some((b) => b.name === name)) note.bumps.push({ name, level });
    }
  }
  return [...notes.values()].map((note) => ({
    ...note,
    text: `---\n${note.bumps.map((b) => `"${b.name}": ${b.level}`).join("\n")}\n---\n\n${note.body}\n`,
  }));
}

/** Pending changesets first, then the released ones. */
export function releaseNotes(root) {
  return [...pending(root), ...released(root)];
}
