/**
 * Everything LUZ ships is MIT, and the project asks, without making it a condition of the licence, that the
 * original credit stays. The same request in three places:
 *
 *   README.md          the "License" section says the MIT notice must stay with a copy and that a link
 *                      back to the project is appreciated, not required
 *   CONTRIBUTING.md    the "Licence" section tells a fork to keep the LICENSE and say where it came from
 *   the home's footer  `footer.legal` in en, es and ar adds the sentence that credit to the original
 *                      project is appreciated (the line of the licence itself, "as long as the notice goes
 *                      with it", stays)
 *
 * LICENSE is not touched (RL-13: MIT only, no text added to the licence).
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(repo, path), "utf-8");
/** The text under a `## <title>` heading, up to the next `## ` or a rule. */
const section = (markdown, title) => {
  const start = markdown.indexOf(`\n## ${title}\n`);
  expect(start, `a "## ${title}" section`).toBeGreaterThanOrEqual(0);
  const rest = markdown.slice(start + 1);
  const end = rest.slice(3).search(/\n(?:## |---)/);
  return end < 0 ? rest : rest.slice(0, end + 3);
};

describe("the licence stays plain MIT", () => {
  it("LICENSE is the MIT licence with nothing added", () => {
    const text = read("LICENSE");
    expect(text).toMatch(/^MIT License/);
    expect(text).not.toMatch(/credit|attribution|appreciat/i);
  });
});

describe("the request for credit", () => {
  it("README.md, in License: keep the notice, and a link back is appreciated, not required", () => {
    const license = section(read("README.md"), "License");
    expect(license).toMatch(/keep the (?:MIT )?(?:license|licence|copyright) notice|notice (?:must|has to) stay/i);
    expect(license).toMatch(/appreciated/i);
    expect(license).toMatch(/not required/i);
    expect(license).toContain("https://github.com/nandovejer/luz");
  });

  it("CONTRIBUTING.md, in Licence: a fork keeps the LICENSE and says where it came from", () => {
    const licence = section(read("CONTRIBUTING.md"), "Licence");
    expect(licence).toMatch(/fork/i);
    expect(licence).toMatch(/keep the LICENSE/);
    expect(licence).toMatch(/where it came from/i);
  });

  const catalog = (code) => JSON.parse(read(`apps/landing/i18n/${code}.json`));

  it("the footer of the home asks for credit in English, Spanish and Arabic, and keeps the MIT line", () => {
    const en = catalog("en")["footer.legal"];
    const es = catalog("es")["footer.legal"];
    const ar = catalog("ar")["footer.legal"];
    expect(en).toMatch(/credit to the original project is appreciated/i);
    expect(es).toMatch(/se agradece (?:el )?cr[eé]dito al proyecto original/i);
    expect(ar).toContain("المشروع الأصلي");
    expect(en).toContain("as long as the notice goes with it");
    expect(es).toContain("siempre que conserves el aviso");
    expect(ar).toContain("ما دام الإشعار يرافقه");
    for (const text of [en, es, ar]) expect(text).toContain("https://github.com/nandovejer/luz/blob/main/LICENSE");
  });

  it("the footer does not make the credit a condition: no \"must\" or \"required\" next to it", () => {
    const en = catalog("en")["footer.legal"];
    const sentence = en.match(/[^.]*credit[^.]*\./i)?.[0] ?? "";
    expect(sentence).toMatch(/appreciated/i);
    expect(sentence).not.toMatch(/\bmust\b|\brequired\b|\bobliged\b/i);
  });
});
