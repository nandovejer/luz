/**
 * The EN 301 549 mapping (apps/docs/pages/accessibility-map.html at /docs/accessibility-map/), L-02 option B of the
 * legal audit: LUZ publishes a real mapping of WCAG 2.2 level A and AA to EN 301 549, and makes no claim with it.
 *
 * - The page exists in the hub, is linked from the accessibility statement and builds with the whole site, with
 *   its languages (the Spanish chrome shows the English page: nothing is translated yet).
 * - One table row for each of the 55 criteria of WCAG 2.2 level A and AA (the list is written here as data), each
 *   once, with its level; 4.1.1 Parsing has no row, a note says why.
 * - The clause of EN 301 549 V3.2.1 is "9." + the number of the criterion; the six criteria new in WCAG 2.2 say
 *   they are new in V4.1.1 instead.
 * - Status and coverage come from a closed list, an Automated row cites a test file, and every test file the page
 *   cites exists.
 * - The page claims nothing: no "meets", "complies", "certified"; it says nobody has audited LUZ and no screen
 *   reader has been used; clause 9 applies, clauses 10 and 11 do not.
 * - The page's index.md (made by the function that writes the entries of llms-full.txt) has its h2 outline and a
 *   pointer, not the table; llms-full.txt stays under its ceiling.
 * - The map is last reviewed on 7 November 2026, and PRINCIPLES.md no longer promises "met" clauses.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderLlmsFull, renderPageMarkdown } from "../scripts/docs-site/ai.js";
import { buildSite, scanSite } from "../scripts/docs-site/site.js";
import { SITE_URL } from "../vite.config.js";
import { linksOf, repo, sectionsOf, tablesOf, textOf } from "./helpers/page-facts.js";

const ROUTE = "/docs/accessibility-map/";
const STATEMENT = "/docs/accessibility/";
const read = (file) => readFileSync(join(repo, file), "utf-8");
const flat = (s) => s.replace(/\s+/g, " ").trim();

const site = scanSite(join(repo, "apps/docs"), repo);
const page = () => (expect(site.byRoute.get(ROUTE), "apps/docs/pages/accessibility-map.html exists").toBeTruthy(), site.byRoute.get(ROUTE));
let built;
const buildOnce = () => (built ??= buildSite(site, { languages: true, unchecked: ["/", "/es/", "/ar/"] }));

/**
 * WCAG 2.2 level A and AA: the 50 criteria of WCAG 2.1, less 4.1.1 Parsing (removed in 2.2), plus the six new
 * ones. [number, level, true when new in WCAG 2.2].
 */
const CRITERIA = [
  ["1.1.1", "A"],
  ["1.2.1", "A"], ["1.2.2", "A"], ["1.2.3", "A"], ["1.2.4", "AA"], ["1.2.5", "AA"],
  ["1.3.1", "A"], ["1.3.2", "A"], ["1.3.3", "A"], ["1.3.4", "AA"], ["1.3.5", "AA"],
  ["1.4.1", "A"], ["1.4.2", "A"], ["1.4.3", "AA"], ["1.4.4", "AA"], ["1.4.5", "AA"],
  ["1.4.10", "AA"], ["1.4.11", "AA"], ["1.4.12", "AA"], ["1.4.13", "AA"],
  ["2.1.1", "A"], ["2.1.2", "A"], ["2.1.4", "A"],
  ["2.2.1", "A"], ["2.2.2", "A"],
  ["2.3.1", "A"],
  ["2.4.1", "A"], ["2.4.2", "A"], ["2.4.3", "A"], ["2.4.4", "A"], ["2.4.5", "AA"], ["2.4.6", "AA"], ["2.4.7", "AA"],
  ["2.4.11", "AA", true],
  ["2.5.1", "A"], ["2.5.2", "A"], ["2.5.3", "A"], ["2.5.4", "A"],
  ["2.5.7", "AA", true], ["2.5.8", "AA", true],
  ["3.1.1", "A"], ["3.1.2", "AA"],
  ["3.2.1", "A"], ["3.2.2", "A"], ["3.2.3", "AA"], ["3.2.4", "AA"], ["3.2.6", "A", true],
  ["3.3.1", "A"], ["3.3.2", "A"], ["3.3.3", "AA"], ["3.3.4", "AA"], ["3.3.7", "A", true], ["3.3.8", "AA", true],
  ["4.1.2", "A"], ["4.1.3", "AA"],
];
const STATUSES = ["Automated", "By hand", "Not tested", "Not applicable"];
const TEST_FILE = /^tests\/\S+\.js$/;

/** Every criterion row of the page's tables, by the number at the start of its first cell. */
function rows() {
  const out = [];
  for (const table of tablesOf(page().body)) {
    for (const { cells } of table.rows) {
      const m = /^(\d\.\d+\.\d+)\s+(.+)$/.exec(cells[0]?.text ?? "");
      if (!m) continue;
      out.push({
        number: m[1],
        name: m[2],
        clauseText: cells[1]?.text,
        clauseCodes: cells[1]?.codes ?? [],
        level: cells[2]?.text,
        status: cells[3]?.text,
        coverage: cells[4]?.text,
        checked: cells[5] ?? { codes: [] },
        cells: cells.length,
      });
    }
  }
  return out;
}

/** The coverage values the page defines: the words in <em> of the paragraph that explains the Coverage column. */
function coverageValues() {
  const paragraph = /<p>\s*The Coverage column[\s\S]*?<\/p>/.exec(page().body)?.[0];
  expect(paragraph, "a paragraph that starts with 'The Coverage column'").toBeTruthy();
  const values = [...paragraph.matchAll(/<em>([^<]+)<\/em>/g)].map((m) => m[1].trim());
  expect(values.length, "the values defined in <em>").toBeGreaterThanOrEqual(3);
  return values;
}

describe("the page", () => {
  it("is /docs/accessibility-map/, in the hub, with a title and a description", () => {
    expect(page().meta.area).toBe("hub");
    expect(page().meta.title).toMatch(/EN 301 549/);
    expect(page().meta.description.length).toBeGreaterThan(40);
  });

  it("is linked from the accessibility statement", () => {
    const statement = site.byRoute.get(STATEMENT);
    expect(statement).toBeTruthy();
    expect(linksOf(statement.body).map((l) => l.href)).toContain(ROUTE);
  });

  it("builds with the whole site and its languages: every link, fragment and id resolves", () => {
    const { problems, rendered } = buildOnce();
    expect(rendered.has(ROUTE), `${ROUTE} is rendered`).toBe(true);
    expect(rendered.has(`/es${ROUTE}`), `/es${ROUTE} is rendered, the English page in the Spanish chrome`).toBe(true);
    expect(problems).toEqual([]);
  }, 60000);
});

describe("the table of criteria", () => {
  it("has one row for each of the 55 criteria of WCAG 2.2 level A and AA, each exactly once", () => {
    expect(CRITERIA).toHaveLength(55);
    const numbers = rows().map((r) => r.number);
    expect(new Set(numbers).size, "a criterion appears twice").toBe(numbers.length);
    expect([...numbers].sort()).toEqual(CRITERIA.map(([n]) => n).sort());
  });

  it("gives each row its level, and the name of the criterion beside its number", () => {
    const byNumber = new Map(rows().map((r) => [r.number, r]));
    for (const [number, level] of CRITERIA) {
      expect(byNumber.get(number)?.level, number).toBe(level);
      expect(byNumber.get(number)?.name.length, number).toBeGreaterThan(3);
    }
  });

  it("has no row for 4.1.1 Parsing and says it was removed in WCAG 2.2 and is Void in V4.1.1", () => {
    expect(rows().some((r) => r.number === "4.1.1")).toBe(false);
    const text = textOf(page().body);
    expect(text).toMatch(/4\.1\.1 Parsing\.? WCAG 2\.2 removed it/);
    expect(text).toMatch(/version 4\.1\.1 marks that clause Void/);
  });

  it("writes the clause of V3.2.1 as 9. and the number of the criterion", () => {
    for (const [number] of CRITERIA.filter((c) => !c[2])) {
      const row = rows().find((r) => r.number === number);
      expect(row, number).toBeTruthy();
      expect(row.clauseCodes, number).toEqual([`9.${number}`]);
      expect(row.clauseText, number).toBe(`9.${number}`);
    }
  });

  it("says each criterion new in WCAG 2.2 is new in V4.1.1, with no clause of V3.2.1", () => {
    const fresh = CRITERIA.filter((c) => c[2]);
    expect(fresh.map(([n]) => n).sort()).toEqual(["2.4.11", "2.5.7", "2.5.8", "3.2.6", "3.3.7", "3.3.8"]);
    for (const [number] of fresh) {
      const row = rows().find((r) => r.number === number);
      expect(row, number).toBeTruthy();
      expect(row.clauseText, number).toMatch(/^New in V4\.1\.1/);
      expect(row.clauseText, number).not.toMatch(/3\.2\.1/);
      // the clause it has in V4.1.1 may follow, in the same cell
      for (const code of row.clauseCodes) expect(code, number).toBe(`9.${number}`);
    }
  });

  it("has a cell for each of the seven columns in every row", () => {
    for (const r of rows()) expect(r.cells, r.number).toBe(7);
  });

  it("gives every row one of the four statuses", () => {
    for (const r of rows()) expect(STATUSES, r.number).toContain(r.status);
  });

  it("gives every row one of the coverage values the page defines", () => {
    const values = coverageValues();
    expect(values).toContain("None");
    for (const r of rows()) expect(values, r.number).toContain(r.coverage);
  });

  it("cites at least one test file in <code> in every Automated row", () => {
    const automated = rows().filter((r) => r.status === "Automated");
    expect(automated.length).toBeGreaterThan(20);
    for (const r of automated) {
      expect(r.checked.codes.some((c) => TEST_FILE.test(c)), `${r.number} cites a test file`).toBe(true);
    }
  });

  it("cites only test files that exist in the repository", () => {
    const cited = new Set(rows().flatMap((r) => r.checked.codes).filter((c) => TEST_FILE.test(c)));
    expect(cited.size).toBeGreaterThan(20);
    for (const file of cited) expect(existsSync(join(repo, file)), file).toBe(true);
  });
});

describe("what the page says about itself", () => {
  const text = () => textOf(page().body);

  it("claims nothing: LUZ is never said to meet, comply, conform or be certified", () => {
    expect(text()).not.toMatch(/\b(meets|complies|complied|conforms|compliant|certified)\b/i);
  });

  it("says nobody has audited LUZ and that no screen reader has been used", () => {
    expect(text()).toMatch(/Nobody has audited LUZ/);
    expect(text()).toMatch(/no screen reader has been used/);
  });

  it("says clause 9, Web, applies and that clauses 10 and 11 do not", () => {
    const clauses = sectionsOf(page().body).get("clauses");
    expect(clauses, "an h2 with the id clauses").toBeTruthy();
    const t = textOf(clauses.html);
    expect(t).toMatch(/Clause 9, Web, applies/);
    expect(t).toMatch(/Clause 10, Non-web documents, does not apply/);
    expect(t).toMatch(/Clause 11, Software, does not apply/);
  });

  it("is last reviewed on 7 November 2026, in the description and in the lead", () => {
    const html = read("apps/docs/pages/accessibility-map.html");
    expect((html.match(/Last reviewed on 7 November 2026\./g) ?? []).length).toBe(2);
  });
});

describe("llms-full.txt and index.md", () => {
  it("gives the page's index.md its h2 headings and a pointer to the URL, not the rows of its tables", () => {
    const p = page();
    const md = renderPageMarkdown(site, p, { siteUrl: SITE_URL });
    const h2 = [...p.body.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => textOf(m[1]));
    expect(h2.length).toBeGreaterThan(2);
    for (const title of h2) expect(md, title).toContain(`- ${title}`);
    expect(md).toContain("open its URL for the table");
    // no row of the table: no criterion name, no clause number, no test file
    expect(md).not.toContain("Contrast (minimum)");
    expect(md).not.toContain("9.1.4.3");
    expect(md).not.toMatch(/tests\/\S+\.js/);
    expect(Buffer.byteLength(md, "utf-8")).toBeLessThan(2000);
  });

  it("keeps llms-full.txt under its ceiling in budgets.json, and carries no row of the table", () => {
    const row = JSON.parse(read("budgets.json")).budgets.find((b) => b.name === "llms.txt and llms-full.txt (each, uncompressed)");
    expect(row.max).toBe(458752);
    const full = renderLlmsFull(site, { siteUrl: SITE_URL });
    expect(Buffer.byteLength(full, "utf-8")).toBeLessThan(row.max);
    expect(full).not.toContain("9.1.4.3");
  });
});

describe("PRINCIPLES.md", () => {
  const bullet = (start) => read("PRINCIPLES.md").split("\n").find((l) => l.startsWith(start));

  it("names the mapping at /docs/accessibility-map/ in the target, not 'mapped to EN 301 549' by clause", () => {
    const line = bullet("- **Target: WCAG 2.2 level AA**");
    expect(line, "the Target bullet").toBeTruthy();
    expect(line).toContain("/docs/accessibility-map/");
    expect(line).not.toContain("mapped to **EN 301 549**");
    expect(line).not.toContain("clauses 9 web, 10 non-web documents, 11 software where they apply");
  });

  it("says the accessibility statement publishes what is checked, what is not tested, the known issues and the mapping", () => {
    const line = bullet("- **Accessibility statement.**");
    expect(line, "the Accessibility statement bullet").toBeTruthy();
    expect(line).not.toMatch(/clauses are met/);
    const t = flat(line);
    expect(t).toMatch(/what is checked/);
    expect(t).toMatch(/what has not been tested/);
    expect(t).toMatch(/known issues/);
    expect(t).toMatch(/mapping/);
  });
});
