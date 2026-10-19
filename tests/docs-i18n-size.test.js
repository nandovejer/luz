/**
 * The docs in three languages stay under the ceiling of a docs page (RL-17: 80 KiB, never raised;
 * docs-i18n-design.md section g).
 *
 * Every page, in every language, rendered with buildSite(site, { languages: true }) and measured the way
 * tests/az-split.test.js and tests/i18n-docs.test.js measure the A-Z pages: with its links relative, as the
 * Pages build writes it, plus the 256 bytes of asset tags Vite adds, at most the `docs/**` row of
 * budgets.json. The five largest pages are printed, so a page that drifts towards the ceiling shows before it
 * crosses it.
 *
 * The site is the REAL apps/docs, copied to a temporary folder by tests/helpers/docs-i18n-size-fixture.js
 * with a Spanish and an Arabic tree next to it. A language the real site already has (its folder
 * `apps/docs/i18n/<code>/`, decision D1) is kept as it is, translations included. A language it does not have
 * gets a stand-in: the chrome catalog of the language and no page, so every page is the English one in that
 * language's chrome (the fallback, D3), which is the worst case of a page that is not translated yet. Once
 * the pages are translated, the same test measures the translations.
 *
 * The new chrome (the switcher, the canonical and the alternates, about 1.5 kB on an English page) is part of
 * the measure: the English pages are measured with it, so a test that passes without it is not a test of it.
 */
import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildSite, relativizeLinks, scanSite } from "../scripts/docs-site/site.js";
import { makeSite } from "./helpers/docs-i18n-size-fixture.js";

const root = fileURLToPath(new URL("../", import.meta.url));
/** The room the Pages build needs for the asset tags Vite adds (az-split.test.js reserves the same). */
const ASSET_TAGS = 256;
const LANGUAGES = ["es", "ar"];
const LARGEST = 5;

const { budgets } = JSON.parse(readFileSync(`${root}budgets.json`, "utf-8"));
const ceiling = budgets.find((b) => b.glob === "docs/**/*.html")?.max;

let copy;
let site;
let rendered;
let failure;

beforeAll(() => {
  copy = makeSite({ languages: LANGUAGES });
  try {
    site = scanSite(copy.docsDir, copy.repoRoot);
    ({ rendered } = buildSite(site, { languages: true }));
  } catch (error) {
    failure = error;
  }
}, 300_000);

afterAll(() => copy?.cleanup());

/** The English routes, the not-found page last: the pages every language has to answer for. */
const englishRoutes = () => site.pages.map((p) => p.route);
/** The route of an English page in a language. */
const inLanguage = (code, route) => (code === "en" ? route : `/${code}${route}`);
/** The size of a page as the Pages build writes it, without the asset tags. */
const sizeOf = (route) => Buffer.byteLength(relativizeLinks(rendered.get(route), route, new Set(rendered.keys())));

/** [{ route, bytes }] of the pages of a language, largest first. */
function measure(code) {
  const routes = englishRoutes().map((r) => inLanguage(code, r));
  if (code === "en" && site.notFound) routes.push(site.notFound.route);
  return routes
    .filter((route) => rendered.has(route))
    .map((route) => ({ route, bytes: sizeOf(route) }))
    .sort((a, b) => b.bytes - a.bytes);
}

describe("the docs build in three languages", () => {
  it("reads the ceiling from budgets.json: 80 KiB", () => {
    expect(ceiling).toBe(80 * 1024);
  });

  it("builds without an error", () => {
    expect(failure?.message ?? "", "scanSite and buildSite(site, { languages: true }) on the copy").toBe("");
  });

  it.each(LANGUAGES)("renders %s: a page for every English page, under its own /<code>/docs/", (code) => {
    expect(failure?.message ?? "").toBe("");
    const missing = englishRoutes().filter((route) => !rendered.has(inLanguage(code, route)));
    expect(
      missing.map((route) => inLanguage(code, route)),
      `buildSite(site, { languages: true }) renders ${englishRoutes().length} pages in ${code}`,
    ).toEqual([]);
  });

  it("gives every English docs page the new chrome: the language switcher and a canonical link", () => {
    expect(failure?.message ?? "").toBe("");
    const without = (marker) => englishRoutes().filter((route) => !rendered.get(route).includes(marker));
    expect(without("<luz-lang-switch>"), "English pages without the switcher").toEqual([]);
    expect(without('<link rel="canonical"'), "English pages without a canonical link").toEqual([]);
  });
});

describe("every page of every language is under the ceiling, with the room for the asset tags", () => {
  it.each(["en", ...LANGUAGES])("%s: all pages, the English ones with the new chrome", (code) => {
    expect(failure?.message ?? "", "the three languages build").toBe("");
    const pages = measure(code);
    const expected = englishRoutes().length + (code === "en" && site.notFound ? 1 : 0);
    expect(pages.length, `pages rendered in ${code}`).toBe(expected);
    if (code === "en") {
      // The measure is of the English pages WITH the switcher and the alternates: without them it is the old number
      const bare = pages.filter(({ route }) => route !== site.notFound?.route && !rendered.get(route).includes("<luz-lang-switch>"));
      expect(bare.map((p) => p.route), "English pages measured without the new chrome").toEqual([]);
    }
    const limit = ceiling - ASSET_TAGS;
    const over = pages.filter((p) => p.bytes > limit).map((p) => `${p.route} ${p.bytes} B (${p.bytes - limit} over)`);
    expect(over, `pages over ${limit} B (${ceiling} B less ${ASSET_TAGS} B for the asset tags)`).toEqual([]);
  });

  it("prints the five largest pages of each language and of all of them", () => {
    expect(failure?.message ?? "", "the three languages build").toBe("");
    const limit = ceiling - ASSET_TAGS;
    const all = ["en", ...LANGUAGES].flatMap((code) => measure(code).map((p) => ({ ...p, code })));
    const lines = (list) => list.slice(0, LARGEST).map((p) => `  ${String(p.bytes).padStart(6)} B  ${p.route}  (${limit - p.bytes} B to spare)`);
    const report = [
      `Largest ${LARGEST} docs pages, all languages (limit ${limit} B; stand-in languages: ${copy.standIns.join(", ") || "none, all real"}):`,
      ...lines([...all].sort((a, b) => b.bytes - a.bytes)),
      ...["en", ...LANGUAGES].flatMap((code) => [`  ${code}:`, ...lines(measure(code)).map((l) => `  ${l}`)]),
    ].join("\n");
    console.info(report);
    expect(all.length, `pages measured in the three languages\n${report}`).toBe(englishRoutes().length * 3 + (site.notFound ? 1 : 0));
  });
});
