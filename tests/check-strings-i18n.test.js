/**
 * `pnpm check:strings` reads a page of the docs in the language of its folder
 * (docs-i18n-design.md sections h and j, phase 2d; decision D17).
 *
 * scripts/check-strings.js reads every .html file under apps/ and, until now, took each for English unless
 * the element says otherwise (a `lang` attribute on it or on an ancestor). A translation of a docs page is a
 * file under `apps/docs/i18n/<code>/` (pages/**.html): it is in language <code>, so
 *
 *   - Spanish: Title Case in a heading is a problem (the Spanish rule, "Índice Útil Rápido") and so is the vague
 *     wording of the Spanish list ("Leer más"), neither of which the English check sees;
 *   - Arabic: no letter case, so a heading is not checked for it (a Latin heading "Quick Start Guide" is not a
 *     Title Case problem in an Arabic page), and the Arabic list of vague wording applies ("هنا");
 *   - an element with its own `lang` (a `lang="en"` island in a translated page) is still read in its own language.
 *
 * The script reads everything relative to its own location and has no API, so it runs in a copy of the
 * files it reads (tests/helpers/docs-i18n-size-fixture.js), with the translation files written in it.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addDocsLanguage, makeScriptRepo, translationFile } from "./helpers/docs-i18n-size-fixture.js";

let repo;
const PAGE = (code) => `apps/docs/i18n/${code}/pages/index.html`;

beforeAll(() => {
  repo = makeScriptRepo();
  // A docs tree for each language, so the generator that check:strings runs finds the folder it opts in by
  for (const code of ["es", "ar"]) addDocsLanguage(repo.at("apps/docs"), code);
}, 120_000);

afterAll(() => repo?.cleanup());

/** Run check:strings with the translation `code` made of `body`; the file is removed after. */
function runWith(code, body) {
  repo.write(PAGE(code), translationFile({ body }));
  try {
    return repo.run("check-strings.js");
  } finally {
    repo.remove(PAGE(code));
  }
}
/** The problem lines that name the translation of `code`. */
const about = (result, code) => result.lines.filter((line) => line.includes(PAGE(code)));

describe("check:strings reads the translations of the docs in their language", () => {
  it("a translation with sentence-case headings and no vague wording passes, in Spanish and in Arabic", () => {
    const es = runWith("es", '<h2 id="a">Primeros pasos con LUZ</h2><p>Lee la <a href="/docs/get-started/">guía de instalación</a>.</p>');
    expect(about(es, "es"), es.output).toEqual([]);
    const ar = runWith("ar", '<h2 id="a">البدء</h2><p>اقرأ <a href="/docs/get-started/">دليل التثبيت</a>.</p>');
    expect(about(ar, "ar"), ar.output).toEqual([]);
  });

  it("es: a Title Case heading is a problem of the file, with the heading text", () => {
    // In English this heading has no word to check ("Índice Útil Rápido" starts with an accented capital), in Spanish it is Title Case
    const result = runWith("es", '<h2 id="a">Índice Útil Rápido</h2>');
    const lines = about(result, "es");
    expect(lines.some((line) => /Title Case/.test(line) && line.includes("Índice Útil Rápido")), `the file is read in Spanish\n${result.output}`).toBe(true);
    expect(result.status, result.output).toBe(1);
    expect(result.output).toContain("✗");
  });

  it("es: the vague wording of the Spanish list is a problem of the file (\"Leer más\", \"Aquí\")", () => {
    for (const text of ["Leer más", "Aquí"]) {
      const result = runWith("es", `<p><a href="/docs/get-started/">${text}</a></p>`);
      const lines = about(result, "es");
      expect(lines.some((line) => /vague/.test(line) && line.includes(text)), `"${text}" in a Spanish file\n${result.output}`).toBe(true);
      expect(result.status, result.output).toBe(1);
    }
  });

  it("es: an element with its own lang is read in that language: a lang=\"en\" island is checked as English", () => {
    const result = runWith("es", '<h2 id="a">Índice Útil Rápido</h2><h2 id="b" lang="en">Quick Start Guide</h2>');
    const lines = about(result, "es").filter((line) => /Title Case/.test(line));
    expect(lines.some((line) => line.includes("Índice Útil Rápido")), `Spanish heading\n${result.output}`).toBe(true);
    expect(lines.some((line) => line.includes("Quick Start Guide")), `English island\n${result.output}`).toBe(true);
  });

  it("ar: Arabic has no letter case, so a Latin heading in an Arabic page is not a Title Case problem", () => {
    const result = runWith("ar", '<h2 id="a">Quick Start Guide</h2>');
    expect(about(result, "ar").filter((line) => /Title Case/.test(line)), `the file is read in Arabic\n${result.output}`).toEqual([]);
  });

  it("ar: the Arabic list of vague wording applies (\"هنا\", \"المزيد\")", () => {
    for (const text of ["هنا", "المزيد"]) {
      const result = runWith("ar", `<p><a href="/docs/get-started/">${text}</a></p>`);
      const lines = about(result, "ar");
      expect(lines.some((line) => /vague/.test(line) && line.includes(text)), `"${text}" in an Arabic file\n${result.output}`).toBe(true);
      expect(result.status, result.output).toBe(1);
    }
  });

  it("an English page stays English: the same heading in apps/docs/pages/ is Title Case in English only", () => {
    const english = repo.read("apps/docs/pages/index.html");
    repo.write("apps/docs/pages/index.html", `${english}\n<h2 id="zz-test-title">Index Useful Quick</h2>\n`);
    try {
      const result = repo.run("check-strings.js");
      expect(result.lines.some((line) => line.includes("apps/docs/pages/index.html") && /Title Case/.test(line) && line.includes("Index Useful Quick")), result.output).toBe(true);
    } finally {
      repo.write("apps/docs/pages/index.html", english);
    }
  });
});
