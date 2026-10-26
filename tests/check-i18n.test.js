/**
 * `pnpm check:i18n` (scripts/check-i18n.js; docs-i18n-design.md phase 2d, decisions D5 and D6): the state of
 * the translations of the docs that a test does not and cannot hold.
 *
 * Structure drift (ids, levels, link targets, code, figures) is a failure of tests/docs-i18n-pages.test.js, at
 * every commit. What this script holds is the rest:
 *
 *   stale        a translation whose `source` (the first 12 hex of the SHA-256 of the English body, whitespace
 *                collapsed) is not the hash of the English page now: the English text changed after it was
 *                translated. Prose drift blocks a release, not a commit.
 *   orphan       a translation with no English page of the same path. The build refuses it, so the script reads
 *                the folders itself and lists it instead of stopping at it.
 *   unreviewed   a translation with `reviewed: false` (the default): published with its notice until a named
 *                reader reviews it (D16). Listed, never a failure.
 *   reviewer     `reviewed: true` with no `reviewer`, or a `reviewer` on a page not `reviewed: true`: an invalid
 *                translation, an error in every mode.
 *
 * The contract of the command (what the tests below hold; the wording of a line is the script's, but it names
 * the file by its path from the repository root with `/`, and says the finding's word above):
 *
 *   node scripts/check-i18n.js             lists every finding, one line each; exit 0 unless a translation is invalid
 *   node scripts/check-i18n.js --strict    the same list; exit 1 on a stale or an orphan too (qa-release.js runs it)
 *   a clean tree                           exit 0, a line that starts with ✓ and no finding
 *   a stale line                           names the `source` the page has and the hash it should have
 *
 * The script reads its root from its own location, so it runs in a copy of the repository
 * (tests/helpers/docs-i18n-size-fixture.js) with the translations the case needs. The English page is the
 * probe of that helper: a body of one line, so its hash is the same under any whitespace rule.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PROBE, addDocsLanguage, englishProbeFile, makeScriptRepo, sourceHash, translationFile } from "./helpers/docs-i18n-size-fixture.js";

const repo = fileURLToPath(new URL("../", import.meta.url));
const SCRIPT = "check-i18n.js";
const probePath = (code) => `apps/docs/i18n/${code}/pages/${PROBE.file}`;
const HASH = sourceHash(PROBE.english.body);
const NOT_THE_HASH = HASH === "000000000000" ? "ffffffffffff" : "000000000000";

let copy;

beforeAll(() => {
  copy = makeScriptRepo();
}, 120_000);

afterAll(() => copy?.cleanup());

beforeEach(() => {
  // Every case starts from the same tree: the English probe, a catalog for each language, no translation
  copy.write(`apps/docs/pages/${PROBE.file}`, englishProbeFile());
  for (const code of ["es", "ar"]) {
    copy.remove(`apps/docs/i18n/${code}`);
    addDocsLanguage(copy.at("apps/docs"), code);
  }
});

/** The script's lines that name `file`. */
const about = (result, file) => result.lines.filter((line) => line.includes(file));
/** Run the script, or say in plain words that it is not there yet. */
function run(args = []) {
  expect(copy.exists(`scripts/${SCRIPT}`), "scripts/check-i18n.js exists (pnpm check:i18n)").toBe(true);
  return copy.run(SCRIPT, args);
}

describe("the command", () => {
  const manifest = JSON.parse(readFileSync(`${repo}package.json`, "utf-8"));

  it("is the script `check:i18n` of package.json", () => {
    expect(manifest.scripts["check:i18n"]).toBe("node scripts/check-i18n.js");
  });

  it("is run with --strict by the release check: qa-release.js has a step `pnpm check:i18n --strict`", () => {
    const source = readFileSync(`${repo}scripts/qa-release.js`, "utf-8");
    expect(source).toMatch(/"check:i18n",\s*"--strict"/);
  });
});

describe("a clean tree", () => {
  it("with no translation at all: exit 0 and a line that starts with ✓, in both modes", () => {
    for (const args of [[], ["--strict"]]) {
      const result = run(args);
      expect(result.status, `${args.join(" ")}\n${result.output}`).toBe(0);
      expect(result.lines.some((line) => line.startsWith("✓")), result.output).toBe(true);
    }
  });

  it("with a translation that is current and reviewed by a named reader: exit 0, ✓, and no finding about it", () => {
    for (const code of ["es", "ar"]) copy.write(probePath(code), translationFile({ source: HASH, reviewed: true, reviewer: "nandovejer" }));
    for (const args of [[], ["--strict"]]) {
      const result = run(args);
      expect(result.status, `${args.join(" ")}\n${result.output}`).toBe(0);
      expect(result.lines.some((line) => line.startsWith("✓")), result.output).toBe(true);
      expect(about(result, PROBE.file), result.output).toEqual([]);
    }
  });
});

describe("a catalog pattern page: its `fits-kinds` and `fits` (F5b, decision 71)", () => {
  /** The English probe as a pattern page of catalog: front matter keys with a dash, and a sentence of its own. */
  const patternPage = () =>
    `<!-- luz:page\ntitle: ${PROBE.english.title}\ndescription: ${PROBE.english.description}\narea: catalog\ngroup: navigation\norder: 9999\nfits-kinds: landing, app\nfits: the top of a page\ntoc: false\n-->\n${PROBE.english.body}\n`;
  const translation = (extra) => translationFile({ source: HASH, reviewed: true, reviewer: "nandovejer" }).replace("source:", `${extra}source:`);

  it("reads the English front matter with a key that has a dash, and a translation that has its own `fits`: exit 0 with --strict", () => {
    copy.write(`apps/docs/pages/${PROBE.file}`, patternPage());
    copy.write(probePath("es"), translation("fits: la parte superior de una página\n"));
    const result = run(["--strict"]);
    expect(result.status, result.output).toBe(0);
    expect(about(result, PROBE.file), result.output).toEqual([]);
  });

  it("is not confused by a dash in the front matter of a translation: `fits-kinds` there is not a line it cannot read", () => {
    copy.write(`apps/docs/pages/${PROBE.file}`, patternPage());
    copy.write(probePath("es"), translation("fits: la parte superior de una página\nfits-kinds: app\n"));
    const result = run();
    expect(result.output).not.toMatch(/front matter lines are "key: value"/);
  });
});

describe("a stale source", () => {
  it("is listed with the hash the page has and the hash it should have; exit 0 without --strict", () => {
    copy.write(probePath("es"), translationFile({ source: NOT_THE_HASH, reviewed: true, reviewer: "nandovejer" }));
    const result = run();
    const lines = about(result, probePath("es"));
    expect(lines.length, result.output).toBeGreaterThan(0);
    expect(lines.some((line) => /stale/i.test(line) && line.includes(NOT_THE_HASH) && line.includes(HASH)), lines.join("\n")).toBe(true);
    expect(result.status, result.output).toBe(0);
    expect(result.lines.some((line) => line.startsWith("✓")), "a tree with a stale page is not clean").toBe(false);
  });

  it("fails with --strict, and names only the stale language: the current one is not listed", () => {
    copy.write(probePath("es"), translationFile({ source: NOT_THE_HASH, reviewed: true, reviewer: "nandovejer" }));
    copy.write(probePath("ar"), translationFile({ source: HASH, reviewed: true, reviewer: "nandovejer" }));
    const result = run(["--strict"]);
    expect(result.status, result.output).toBe(1);
    expect(about(result, probePath("es")).some((line) => /stale/i.test(line)), result.output).toBe(true);
    expect(about(result, probePath("ar")), result.output).toEqual([]);
  });

  it("is what an edit of the English page leaves behind: the translation was current, then the English text changed", () => {
    copy.write(probePath("es"), translationFile({ source: HASH, reviewed: true, reviewer: "nandovejer" }));
    expect(run(["--strict"]).status, "current before the edit").toBe(0);
    const edited = `${PROBE.english.body.replace("A plain sentence", "A plainer sentence")}`;
    copy.write(`apps/docs/pages/${PROBE.file}`, englishProbeFile(edited));
    const result = run(["--strict"]);
    expect(result.status, result.output).toBe(1);
    const line = about(result, probePath("es")).find((l) => /stale/i.test(l));
    expect(line, result.output).toBeTruthy();
    expect(line).toContain(sourceHash(edited));
  });

  it("collapses white space (D5): the same words with other spaces and line breaks are not stale", () => {
    const reflowed = PROBE.english.body.replace("A plain sentence", "A  plain\n  sentence");
    copy.write(`apps/docs/pages/${PROBE.file}`, englishProbeFile(reflowed));
    copy.write(probePath("es"), translationFile({ source: HASH, reviewed: true, reviewer: "nandovejer" }));
    const result = run(["--strict"]);
    expect(about(result, probePath("es")), result.output).toEqual([]);
    expect(result.status, result.output).toBe(0);
  });
});

describe("an orphan", () => {
  const ORPHAN = "apps/docs/i18n/ar/pages/get-started/no-such-page.html";

  it("is listed, not a crash: a translation of a page the English docs do not have; exit 0 without --strict", () => {
    copy.write(ORPHAN, translationFile({ source: HASH, reviewed: true, reviewer: "nandovejer" }));
    const result = run();
    expect(about(result, ORPHAN).some((line) => /orphan/i.test(line)), result.output).toBe(true);
    expect(result.status, result.output).toBe(0);
    expect(result.output, "a listing, not a stack trace").not.toMatch(/\n\s+at .*\(.*\)/);
  });

  it("fails with --strict", () => {
    copy.write(ORPHAN, translationFile({ source: HASH, reviewed: true, reviewer: "nandovejer" }));
    const result = run(["--strict"]);
    expect(result.status, result.output).toBe(1);
    expect(about(result, ORPHAN).some((line) => /orphan/i.test(line)), result.output).toBe(true);
  });

  it("a file whose name starts with _ is not a translation, as it is not a page", () => {
    copy.write("apps/docs/i18n/es/pages/_notes.html", "<p>Notes, not a page.</p>\n");
    const result = run(["--strict"]);
    expect(about(result, "_notes.html"), result.output).toEqual([]);
    expect(result.status, result.output).toBe(0);
  });
});

describe("a translation that is not reviewed", () => {
  it("is listed as unreviewed in both modes, and is never a failure", () => {
    copy.write(probePath("ar"), translationFile({ source: HASH, reviewed: false }));
    for (const args of [[], ["--strict"]]) {
      const result = run(args);
      expect(about(result, probePath("ar")).some((line) => /unreviewed/i.test(line)), `${args.join(" ")}\n${result.output}`).toBe(true);
      expect(result.status, `${args.join(" ")}\n${result.output}`).toBe(0);
    }
  });

  it("is unreviewed when `reviewed` is not written at all (the default is false)", () => {
    copy.write(probePath("es"), translationFile({ source: HASH }));
    const result = run(["--strict"]);
    expect(about(result, probePath("es")).some((line) => /unreviewed/i.test(line)), result.output).toBe(true);
    expect(result.status, result.output).toBe(0);
  });

  it("a reviewed page is not in the list of the unreviewed", () => {
    copy.write(probePath("es"), translationFile({ source: HASH, reviewed: true, reviewer: "nandovejer" }));
    copy.write(probePath("ar"), translationFile({ source: HASH, reviewed: false }));
    const result = run();
    expect(about(result, probePath("es")), result.output).toEqual([]);
    expect(about(result, probePath("ar")).length, result.output).toBeGreaterThan(0);
  });
});

describe("a reviewed page without a reviewer", () => {
  it("is an error in every mode: the file, and the word reviewer", () => {
    copy.write(probePath("es"), translationFile({ source: HASH, reviewed: true }));
    for (const args of [[], ["--strict"]]) {
      const result = run(args);
      expect(result.status, `${args.join(" ")}\n${result.output}`).toBe(1);
      expect(about(result, probePath("es")).some((line) => /reviewer/i.test(line)), `${args.join(" ")}\n${result.output}`).toBe(true);
    }
  });

  it("a reviewer on a page that is not reviewed: true is the same error", () => {
    copy.write(probePath("ar"), translationFile({ source: HASH, reviewed: false, reviewer: "nandovejer" }));
    const result = run();
    expect(result.status, result.output).toBe(1);
    expect(about(result, probePath("ar")).some((line) => /reviewer/i.test(line)), result.output).toBe(true);
  });

  it("the error is one line per page: the other, valid pages are still listed", () => {
    copy.write(probePath("es"), translationFile({ source: HASH, reviewed: true }));
    copy.write(probePath("ar"), translationFile({ source: NOT_THE_HASH, reviewed: false }));
    const result = run();
    expect(about(result, probePath("es")).filter((line) => /reviewer/i.test(line)).length, result.output).toBe(1);
    expect(about(result, probePath("ar")).some((line) => /stale/i.test(line)), result.output).toBe(true);
  });
});
