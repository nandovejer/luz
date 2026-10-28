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
 *   - an element with its own `lang` (a `lang="en"` island in a translated page) is still read in its own language;
 *   - the content of a demo or an example of a TRANSLATION (`[data-docs-specimen]`, `.luz-do-dont__stage`, `.docs-snippet`, `.elements-stage`) is not prose: a card title "Carlos Díaz" in a demo is
 *     a person's name, not a Title Case heading, and a demo's "Leer más" is a sample, not the page's own link text
 *     (decisions, "Clarifications after the first real Spanish translations"). English pages are read as before.
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

/* ---- The demos of a translation are not prose ------------------------------------------------ */

/** The containers of a demo or an example, as the markup that opens each. */
const DEMOS = {
  "a specimen": '<div class="docs-example" data-docs-specimen>',
  "a do and don't stage": '<div class="luz-do-dont__stage" inert aria-hidden="true">',
  "a snippet": '<div class="docs-snippet">',
  "an elements stage": '<div class="elements-stage">',
};
const titleCaseIn = (result, code) => about(result, code).filter((line) => /Title Case/.test(line));
const vagueIn = (result, code) => about(result, code).filter((line) => /vague/.test(line));

describe("check:strings does not read the demos of a translation as prose", () => {
  for (const [what, open] of Object.entries(DEMOS)) {
    it(`es: a card title "Carlos Díaz" inside ${what} is not a Title Case problem`, () => {
      const result = runWith("es", `${open}<h3 class="luz-card__title">Carlos Díaz</h3></div>`);
      expect(titleCaseIn(result, "es"), result.output).toEqual([]);
      expect(about(result, "es"), result.output).toEqual([]);
    });
  }

  it("es: a heading nested deeper inside a demo is not read either", () => {
    const result = runWith("es", '<div class="docs-example" data-docs-specimen><div class="luz-card"><div><h3>Carlos Díaz</h3></div></div></div>');
    expect(titleCaseIn(result, "es"), result.output).toEqual([]);
  });

  it("es: the same text as a heading OUTSIDE a demo is still a Title Case problem, in Spanish", () => {
    const result = runWith("es", '<h2 id="a">Carlos Díaz</h2>');
    expect(titleCaseIn(result, "es").some((line) => line.includes("Carlos Díaz")), result.output).toBe(true);
    expect(result.status, result.output).toBe(1);
  });

  it("es: the demo ends where its container ends: a Title Case heading right after it is reported, the one inside is not", () => {
    const result = runWith("es", '<div class="docs-example" data-docs-specimen><h3>Carlos Díaz</h3></div><h2 id="a">Índice Útil Rápido</h2>');
    const lines = titleCaseIn(result, "es");
    expect(lines.some((line) => line.includes("Índice Útil Rápido")), result.output).toBe(true);
    expect(lines.some((line) => line.includes("Carlos Díaz")), result.output).toBe(false);
  });

  it("es: the vague wording of a sample link inside a demo (\"Leer más\") is not reported, and is outside it", () => {
    const inside = runWith("es", '<div class="docs-example" data-docs-specimen><a href="#">Leer más</a><button type="button" aria-label="Aquí">Aceptar</button></div>');
    expect(vagueIn(inside, "es"), inside.output).toEqual([]);
    const outside = runWith("es", '<a href="/docs/get-started/">Leer más</a>');
    expect(vagueIn(outside, "es").some((line) => line.includes("Leer más")), outside.output).toBe(true);
  });

  it("ar: the vague wording of a sample link inside a demo is not reported, and is outside it", () => {
    const inside = runWith("ar", '<div class="docs-example" data-docs-specimen><a href="#">هنا</a></div>');
    expect(vagueIn(inside, "ar"), inside.output).toEqual([]);
    const outside = runWith("ar", '<a href="/docs/get-started/">هنا</a>');
    expect(vagueIn(outside, "ar").some((line) => line.includes("هنا")), outside.output).toBe(true);
  });

  it("an English page stays as it was: a Title Case heading and a vague link inside a demo are still reported", () => {
    const english = repo.read("apps/docs/pages/index.html");
    repo.write("apps/docs/pages/index.html", `${english}\n<div class="docs-example" data-docs-specimen><h3 id="zz-demo-title">Index Useful Quick</h3><a href="/docs/">Read more</a></div>\n`);
    try {
      const result = repo.run("check-strings.js");
      const lines = result.lines.filter((line) => line.includes("apps/docs/pages/index.html"));
      expect(lines.some((line) => /Title Case/.test(line) && line.includes("Index Useful Quick")), result.output).toBe(true);
      expect(lines.some((line) => /vague/.test(line) && line.includes("Read more")), result.output).toBe(true);
    } finally {
      repo.write("apps/docs/pages/index.html", english);
    }
  });
});
