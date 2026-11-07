/**
 * The texts that follow the legal audit of 2026-11-05: what the site and the repository claim must be what is true.
 *
 * - L-02  The home does not say LUZ is "built to" WCAG: it aims at it, and the statement lists what fails. The
 *         accessibility statement says LUZ has not been audited, names EN 301 549 3.2.1 and 4.1.1, and was last
 *         reviewed on 7 November 2026 (English and Spanish).
 * - L-05  CONTRIBUTING.md asks for the Developer Certificate of Origin and the AI tool used, and says a work made
 *         entirely by an AI may not be protected; the pull request template has the box.
 * - L-06  The home in Spanish and Arabic says, in its own language, that an AI wrote the translation and nobody has
 *         reviewed it; the English home is not shown the note (`:lang(en)`).
 * - L-07  The cookie consent page lists, among its known issues, that the answer is a record in the visitor's browser.
 * - L-05  (also) The copyright line of LICENSE, in the root and in each package, names LUZ contributors.
 * - L-08  The Code of Conduct names its Creative Commons licence; the footer names Fernando Muñoz.
 * - L-09  SECURITY.md states goals, not commitments.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildSite, landingDocuments, scanSite } from "../scripts/docs-site/site.js";
import { parse, query, queryAll, textOf } from "./helpers/html-dom.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(repo, file), "utf-8");
const flat = (s) => s.replace(/\s+/g, " ").trim();
const catalog = (code) => JSON.parse(read(`apps/landing/i18n/${code}.json`));
const CODES = ["en", "es", "ar"];

/** The text of the section of a docs page that starts at the h2 `id` and ends at the next h2. */
function sectionOf(html, id) {
  const start = html.indexOf(`<h2 id="${id}"`);
  expect(start, `h2 #${id}`).toBeGreaterThan(-1);
  const next = html.indexOf("<h2", start + 1);
  return flat(html.slice(start, next === -1 ? undefined : next).replace(/<[^>]+>/g, " "));
}

/* ---- L-02 · No claim of conformance ---------------------------------------- */

describe("L-02: the home aims at WCAG, it does not claim it", () => {
  it("says in English that it aims at WCAG 2.2 AA and that the statement lists what fails", () => {
    const access = flat(catalog("en")["why.usable.access"].replace(/<[^>]+>/g, " "));
    expect(access).not.toContain("Built to WCAG");
    expect(access).toMatch(/aims at WCAG 2\.2 AA/);
    expect(access).toMatch(/statement[^.]*lists[^.]*what fails/);
  });

  it("no longer says Built to / Pensado para WCAG, in any language", () => {
    expect(catalog("en")["why.usable.access"]).not.toMatch(/Built to WCAG/i);
    expect(catalog("es")["why.usable.access"]).not.toMatch(/Pensado para WCAG/i);
    expect(catalog("ar")["why.usable.access"]).not.toMatch(/مبني وفق\s*WCAG/);
    for (const code of CODES) expect(catalog(code)["why.usable.access"], code).toContain("WCAG 2.2 AA");
  });

  it("no longer says Accessible by default, not by add-on", () => {
    expect(catalog("en")["why.usable.sub"]).not.toBe("Accessible by default, not by add-on.");
    expect(catalog("es")["why.usable.sub"]).not.toMatch(/de serie/);
    expect(catalog("ar")["why.usable.sub"]).not.toBe("متاح افتراضيًا، لا بإضافات لاحقة.");
    expect(catalog("ar")["why.usable.sub"]).not.toMatch(/افتراضيًا/);
  });

  it("does not say a public service must meet WCAG 2.2 AA and stop there: 2.1 or 2.2, and the result is the reader's to test", () => {
    for (const code of CODES) {
      const line = catalog(code)["fit.good.public"];
      expect(line, code).toContain("2.1");
      expect(line, code).toContain("2.2");
      expect(line, code).not.toMatch(/WCAG 2\.2 AA\.?$/);
    }
    expect(catalog("en")["fit.good.public"]).toMatch(/yours to test/);
  });
});

describe("L-02: the accessibility statement says it has not been audited", () => {
  const en = read("apps/docs/pages/accessibility.html");
  const es = read("apps/docs/i18n/es/pages/accessibility.html");

  it("says in English that LUZ has not been audited, and names EN 301 549 versions 3.2.1 and 4.1.1", () => {
    const target = sectionOf(en, "h-a11y-target");
    expect(target).toMatch(/has not been audited/);
    expect(target).toContain("EN 301 549");
    expect(target).toContain("3.2.1");
    expect(target).toContain("4.1.1");
  });

  it("says the same in Spanish", () => {
    const target = sectionOf(es, "h-a11y-target");
    expect(target).toMatch(/no ha sido auditada/);
    expect(target).toContain("EN 301 549");
    expect(target).toContain("3.2.1");
    expect(target).toContain("4.1.1");
  });

  it("was last reviewed on 7 November 2026, in the description and in the lead, in English and in Spanish", () => {
    expect((en.match(/Last reviewed on 7 November 2026\./g) ?? []).length).toBe(2);
    expect(en).not.toContain("17 October 2026");
    expect((es.match(/Última revisión: 7 de noviembre de 2026\./g) ?? []).length).toBe(2);
    expect(es).not.toContain("17 de octubre de 2026");
  });
});

/* ---- L-05 · Origin of the work and AI ---------------------------------------- */

describe("L-05: contributions say where they come from and which AI helped", () => {
  const contributing = flat(read("CONTRIBUTING.md"));

  it("asks for the Developer Certificate of Origin and `git commit -s`", () => {
    expect(contributing).toContain("Developer Certificate of Origin");
    expect(contributing).toContain("git commit -s");
  });

  it("asks which AI tool was used and that no licensed code is reproduced", () => {
    expect(contributing).toMatch(/say[^.]*which (AI )?tool/i);
    expect(contributing).toMatch(/does not reproduce licensed code|reproduces? no licensed code/i);
  });

  it("says a work generated entirely by an AI may not be protected by copyright", () => {
    expect(contributing).toMatch(/generated entirely by an AI may not be protected by copyright/);
  });

  it("has a box in the pull request template about the AI tool", () => {
    const boxes = read(".github/pull_request_template.md").split("\n").filter((l) => /^- \[ \] /.test(l));
    expect(boxes.some((b) => /\bAI\b/.test(b) && /tool/.test(b))).toBe(true);
  });
});

/* ---- L-06 · A translation says an AI wrote it ---------------------------------- */

describe("L-06: the home in Spanish and Arabic says an AI wrote the translation", () => {
  const site = scanSite(join(repo, "apps/docs"), repo);
  const { rendered } = buildSite(site, { extra: landingDocuments(site, "apps/landing/index.html", read("apps/landing/index.html")) });
  const noteOf = (route) => queryAll(query(parse(rendered.get(route), route), "footer.luz-site-footer"), "p.landing-translation");

  it("renders the note in Spanish, in Spanish, and marked lang=es", () => {
    const [note, ...more] = noteOf("/es/");
    expect(more).toEqual([]);
    expect(flat(textOf(note))).toBe("Esta traducción la ha escrito una IA y todavía no la ha revisado ninguna persona. Prevalece la versión en inglés.");
    expect(note.attrs.get("lang")).toBe("es");
  });

  it("renders the note in Arabic, from the Arabic catalog, and marked lang=ar", () => {
    const [note, ...more] = noteOf("/ar/");
    expect(more).toEqual([]);
    expect(flat(textOf(note))).toBe(flat(catalog("ar")["footer.translation"] ?? "missing"));
    expect(flat(textOf(note))).toMatch(/\p{Script=Arabic}/u);
    expect(note.attrs.get("lang")).toBe("ar");
  });

  it("does not show the note to the English home: it is absent or in English, which `:lang(en)` hides", () => {
    for (const note of noteOf("/")) expect(note.attrs.get("lang")).toBe("en");
    const css = read("apps/landing/landing.css");
    expect(css).toMatch(/\.landing-translation:lang\(en\)\s*\{[^}]*display:\s*none/);
  });
});

/* ---- L-07 · The consent is a record in the browser ----------------------------- */

describe("L-07: the cookie consent page says the answer is a record in the visitor's browser", () => {
  it("lists it among the known issues, with GDPR art. 7(1), in English", () => {
    const known = sectionOf(read("apps/docs/pages/catalog/cookie-consent.html"), "known-issues");
    expect(known).toMatch(/record in the visitor.s browser/);
    expect(known).toContain("GDPR art. 7(1)");
  });

  it("lists it among the known issues, with art. 7(1) del RGPD, in Spanish", () => {
    const known = sectionOf(read("apps/docs/i18n/es/pages/catalog/cookie-consent.html"), "known-issues");
    expect(known).toMatch(/registro en el navegador del visitante/);
    expect(known).toMatch(/art\. 7\(1\) del RGPD/);
  });
});

/* ---- L-08 · Licence of the Code of Conduct, name of the owner -------------------- */

describe("L-08: the Code of Conduct names its licence and the footer the owner's name", () => {
  it("names the Creative Commons Attribution 4.0 licence for the adapted Contributor Covenant", () => {
    const text = flat(read("CODE_OF_CONDUCT.md"));
    expect(text).toContain("Creative Commons Attribution 4.0");
    expect(text).toContain("https://creativecommons.org/licenses/by/4.0/");
  });

  for (const code of CODES) {
    it(`names Fernando Muñoz in the licence line of the footer (${code})`, () => {
      const legal = catalog(code)["footer.legal"];
      expect(legal).toContain(">Fernando Muñoz</a>");
      expect(legal).not.toContain("Nando Muñoz");
    });
  }
});

/* ---- L-05 · The licence line names the contributors (owner decision, 2026-11-07) ------------ */

describe("L-05: the copyright line of LICENSE names the contributors", () => {
  const LINE = "Copyright (c) 2024–2026 Fernando Muñoz and LUZ contributors";
  const PACKAGES = ["tokens", "core", "catalog", "check"];

  it("LICENSE at the root has the line, once, and is still the MIT text", () => {
    const text = read("LICENSE");
    expect(text.split("\n")[0]).toBe("MIT License");
    expect(text.split("\n").filter((l) => l.startsWith("Copyright (c)"))).toEqual([LINE]);
    expect(text).toContain("Permission is hereby granted, free of charge");
  });

  for (const name of PACKAGES) {
    it(`the LICENSE a package ships is the root one (${name})`, () => {
      expect(read(`packages/${name}/LICENSE`)).toBe(read("LICENSE"));
    });
  }
});

/* ---- L-09 · Goals, not commitments ---------------------------------------------- */

describe("L-09: SECURITY.md states goals, not a service level", () => {
  const text = flat(read("SECURITY.md"));

  it("no longer promises Within 48 hours or Within 2 weeks", () => {
    expect(text).not.toContain("Within 48 hours");
    expect(text).not.toContain("Within 2 weeks");
    expect(text).toMatch(/we aim to[^.-]*48 hours/);
    expect(text).toMatch(/we aim to[^.-]*2 weeks/);
  });

  it("says these are the goals of one maintainer, not a service level, and that LUZ is provided as is", () => {
    expect(text).toMatch(/goals of one maintainer/);
    expect(text).toMatch(/not a (commitment or a )?service level/);
    expect(text).toContain('"as is"');
  });
});
