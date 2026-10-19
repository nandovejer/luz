/**
 * The docs in English, Spanish and Arabic: the catalogs of the chrome
 * (design: docs-i18n-design.md section c; decisions: docs-i18n-decisions.md).
 *
 * The strings the generator writes around a page (the sidebar, the chips, the
 * rail, "Keep going", the foot, the notice…) are one flat catalog per language,
 * `apps/docs/i18n/<code>/strings.json`, read by `loadDocsLocales` and returned
 * by `scanSite` as `site.docsI18n`. `en/strings.json` is the reference; a
 * language has docs when its folder exists (D1). This file holds:
 *
 *   - the English catalog of the real site: it holds today's literals
 *   - the loader's failure modes, each with file:line: a missing key, an extra
 *     key, a different {placeholder}, a missing or unknown plural category, a
 *     key that is also in the home catalog, the keys derived from site.json
 *     (`area.<id>`, `group.<area>.<group>`, `essential.<last segment of the href>`),
 *     a key no render uses
 *   - the date of the page foot in Spanish and Arabic (Latin digits, Gregorian)
 *
 * The API it fixes is written at the top of tests/helpers/docs-i18n-fixture.js.
 * The fixture is a small repository with the real layout and partials and the
 * real English catalog, so these tests are red until apps/docs/i18n/en/strings.json
 * exists, and then until the loader does what the design says.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { lineOfKey } from "../scripts/docs-site/i18n.js";
import { buildSite, renderPage, scanSite } from "../scripts/docs-site/site.js";
import { PAGES, REPO, SITE_JSON, cleanupFixtures, docsI18nFixture, docsLanguage, messageOf, docsI18nModule, realEnglishStrings } from "./helpers/docs-i18n-fixture.js";

afterEach(cleanupFixtures);

const EN_FILE = "apps/docs/i18n/en/strings.json";
const ES_FILE = "apps/docs/i18n/es/strings.json";
const AR_FILE = "apps/docs/i18n/ar/strings.json";
const without = (strings, ...keys) => Object.fromEntries(Object.entries(strings).filter(([key]) => !keys.includes(key)));
const BUILD = { languages: true, unchecked: ["/", "/es/", "/ar/"] };

/* ---- The English catalog of the real site -------------------------------------- */

describe("the English catalog of the real docs is the reference", () => {
  const real = scanSite(join(REPO, "apps/docs"), REPO);

  it("scanSite returns it as site.docsI18n.reference, read from apps/docs/i18n/en/strings.json", () => {
    expect(real.docsI18n, "scanSite(...).docsI18n").toBeTruthy();
    expect(real.docsI18n.reference.code).toBe("en");
    expect(real.docsI18n.reference.file).toBe(EN_FILE);
    expect(Object.keys(real.docsI18n.reference.strings).length).toBeGreaterThan(40);
  });

  it("publishes the docs in English and Spanish alone: Arabic docs are planned, the Arabic home page, typography and glossary stay", () => {
    expect(real.docsI18n.languages.map((l) => l.code)).toEqual(["es"]);
    expect(real.docsI18n.byCode.has("ar")).toBe(false);
    expect(real.i18n.locales.map((l) => l.code)).toEqual(["en", "es", "ar"]);
    expect(real.docsI18n.byCode.get("es")).toMatchObject({ dir: "ltr", route: "/es/", docsRoute: "/es/docs/" });
    expect(Object.keys(JSON.parse(readFileSync(join(REPO, "apps/docs/i18n/glossary.json"), "utf-8"))).length).toBeGreaterThan(0);
    expect(existsSync(join(REPO, "apps/docs/locale-scripts/ar.json"))).toBe(true);
  });

  it("holds the literals the generator writes today, so the English pages do not change", () => {
    const strings = { ...real.i18n.default.strings, ...real.docsI18n?.reference.strings };
    const values = new Set(Object.values(strings));
    const literals = [
      // layout and breadcrumb
      "Skip to main content", "Documentation", "Docs", "Breadcrumb",
      // the chips of a component or pattern page
      "No JavaScript", "Light · Dark · High contrast", "Tested", "No known issues", "1 known issue",
      // the rail, the end of the page and the foot
      "On this page", "About this page", "Copy page as Markdown", "Edit this page", "Report a problem",
      "Keep going", "Previous", "Next", "Last updated", "Files:",
      // the title of the site, the script's messages of the rail
      "LUZ documentation", "Copied the page as Markdown.", "Could not copy the page.",
      // the A–Z index and what an entry is
      "Parts of the index", "This index has two pages:", "Letters", "Other",
      "Get started", "Component", "Token page", "Site pattern", "Landing pattern", "CMS pattern", "App pattern",
      "Documentation pattern", "HTML elements", "Accessibility",
    ];
    expect(real.docsI18n, "scanSite(...).docsI18n").toBeTruthy();
    expect(literals.filter((literal) => !values.has(literal)), "literals of the generator that no English string says").toEqual([]);
    expect(strings["format.date-locale"], "English dates are 18 October 2026").toBe("en-GB");
  });

  it("has the keys the design names for the chrome, the notice and the plural of the chips", () => {
    expect(real.docsI18n, "scanSite(...).docsI18n").toBeTruthy();
    const keys = Object.keys(real.docsI18n.reference.strings);
    const english = new Intl.PluralRules("en").resolvedOptions().pluralCategories;
    expect(english).toEqual(expect.arrayContaining(["one", "other"]));
    for (const key of [
      "chrome.skip", "chrome.nav", "title.site", "format.date-locale",
      "notice.untranslated", "notice.pending", "notice.pending-statement", "notice.english",
      ...english.map((category) => `chip.issues.${category}`),
    ]) {
      expect(keys, key).toContain(key);
    }
  });

  it("repeats no key of the home catalog: the strings the home already translated are reused", () => {
    expect(real.docsI18n, "scanSite(...).docsI18n").toBeTruthy();
    const home = new Set(Object.keys(real.i18n.default.strings));
    expect(Object.keys(real.docsI18n.reference.strings).filter((key) => home.has(key))).toEqual([]);
  });

  it("renders the English pages with those literals in their places", () => {
    expect(real.docsI18n, "scanSite(...).docsI18n").toBeTruthy();
    const html = renderPage(real.byRoute.get("/docs/components/button/"), real, { dev: true });
    expect(html).toContain('<a class="luz-skip-link" href="#main-content">Skip to main content</a>');
    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toContain(">On this page</summary>");
    expect(html).toContain(">Keep going</h2>");
    expect(html).toContain(">Copy page as Markdown</a>");
    expect(html).toMatch(/Last updated <time datetime="\d{4}-\d{2}-\d{2}">\d{1,2} [A-Z][a-z]+ \d{4}<\/time>/);
  });
});

/* ---- The loader and what it refuses ------------------------------------------------ */

describe("the loader reads the catalogs of the languages that have a folder", () => {
  it("returns the reference, the languages and, for each, its catalog merged with the home's", () => {
    const f = docsI18nFixture();
    const { docsI18n } = f.scan();
    expect(docsI18n, "scanSite(...).docsI18n").toBeTruthy();
    expect(docsI18n.reference.code).toBe("en");
    expect(docsI18n.languages.map((l) => l.code)).toEqual(["es", "ar"]);
    const es = docsI18n.byCode.get("es");
    expect(es).toMatchObject({ code: "es", dir: "ltr", route: "/es/", docsRoute: "/es/docs/", file: ES_FILE });
    expect(docsI18n.byCode.get("ar")).toMatchObject({ code: "ar", dir: "rtl", route: "/ar/", docsRoute: "/ar/docs/", file: AR_FILE });
    // The home page's strings and the docs' own, one object
    const site = f.scan();
    expect(es.strings["site.docs"]).toBe(site.i18n.byCode.get("es").strings["site.docs"]);
    const firstDocsKey = Object.keys(es.docsStrings)[0];
    expect(es.strings[firstDocsKey]).toBe(es.docsStrings[firstDocsKey]);
  });

  it("refuses a missing key, with the file of the language and the line of the key in en/strings.json", () => {
    const en = realEnglishStrings();
    const key = Object.keys(en)[0];
    const f = docsI18nFixture({ catalogs: { es: (strings) => without(strings, key) } });
    const line = lineOfKey(f.read(EN_FILE), key);
    expect(messageOf(() => f.scan(), "scanSite refuses it")).toContain(`${ES_FILE}: missing "${key}" (${EN_FILE}:${line})`);
  });

  it("refuses an extra key, at its line in the file of the language", () => {
    const f = docsI18nFixture({ catalogs: { ar: (strings) => ({ ...strings, "zz.extra": "زائد" }) } });
    const line = lineOfKey(f.read(AR_FILE), "zz.extra");
    expect(messageOf(() => f.scan(), "scanSite refuses it")).toContain(`${AR_FILE}:${line}: "zz.extra" is not in `);
  });

  it("refuses a key that is not lowercase words joined by . or -, and an empty value, as the home does", () => {
    const bad = docsI18nFixture({ catalogs: { es: (strings) => ({ ...strings, "Bad Key": "x" }) } });
    expect(messageOf(() => bad.scan(), "scanSite refuses it")).toMatch(/apps\/docs\/i18n\/es\/strings\.json:\d+: "Bad Key" is not a valid key/);
    const key = Object.keys(realEnglishStrings())[0];
    const empty = docsI18nFixture({ catalogs: { es: (strings) => ({ ...strings, [key]: "" }) } });
    expect(messageOf(() => empty.scan(), "scanSite refuses it")).toMatch(new RegExp(`apps/docs/i18n/es/strings\\.json:\\d+: "${key.replace(/\./g, "\\.")}" is not a non-empty string`));
  });

  it("refuses a value that has not the {placeholders} of the English one", () => {
    const en = realEnglishStrings();
    const key = Object.keys(en).find((k) => /\{[a-z]+\}/.test(en[k]));
    expect(key, "the English catalog has a string with a {placeholder}").toBeTruthy();
    const f = docsI18nFixture({ catalogs: { es: (strings) => ({ ...strings, [key]: strings[key].replace(/\{[a-z]+\}/g, "{zz}") }) } });
    expect(messageOf(() => f.scan(), "scanSite refuses it")).toMatch(new RegExp(`apps/docs/i18n/es/strings\\.json:\\d+: "${key.replace(/\./g, "\\.")}".*placeholder`, "i"));
    const dropped = docsI18nFixture({ catalogs: { ar: (strings) => ({ ...strings, [key]: strings[key].replace(/\{[a-z]+\}/g, "") }) } });
    expect(messageOf(() => dropped.scan(), "scanSite refuses it")).toMatch(new RegExp(`apps/docs/i18n/ar/strings\\.json:\\d+: "${key.replace(/\./g, "\\.")}".*placeholder`, "i"));
  });

  it("asks of each language the plural categories its rules have: Spanish one, many, other; Arabic six", () => {
    expect(new Intl.PluralRules("es").resolvedOptions().pluralCategories.sort()).toEqual(["many", "one", "other"]);
    expect(new Intl.PluralRules("ar").resolvedOptions().pluralCategories.sort()).toEqual(["few", "many", "one", "other", "two", "zero"]);
    const es = docsI18nFixture({ catalogs: { es: (strings) => without(strings, "chip.issues.many") } });
    expect(messageOf(() => es.scan(), "scanSite refuses it")).toContain(`${ES_FILE}: missing "chip.issues.many"`);
    const ar = docsI18nFixture({ catalogs: { ar: (strings) => without(strings, "chip.issues.zero") } });
    expect(messageOf(() => ar.scan(), "scanSite refuses it")).toContain(`${AR_FILE}: missing "chip.issues.zero"`);
  });

  it("refuses a plural category the language has not (Spanish has no few) and a suffix that is no category", () => {
    const few = docsI18nFixture({ catalogs: { es: (strings) => ({ ...strings, "chip.issues.few": "pocos" }) } });
    expect(messageOf(() => few.scan(), "scanSite refuses it")).toMatch(/apps\/docs\/i18n\/es\/strings\.json:\d+: .*chip\.issues\.few/);
    const several = docsI18nFixture({ catalogs: { ar: (strings) => ({ ...strings, "chip.issues.several": "عدة" }) } });
    expect(messageOf(() => several.scan(), "scanSite refuses it")).toMatch(/apps\/docs\/i18n\/ar\/strings\.json:\d+: .*chip\.issues\.several/);
  });

  it("refuses a key that is also in the home catalog of the language, naming both files", () => {
    const es = docsI18nFixture({ catalogs: { es: (strings) => ({ ...strings, "site.docs": "Documentación" }) } });
    expect(messageOf(() => es.scan(), "scanSite refuses it")).toMatch(/"site\.docs"/);
    expect(messageOf(() => es.scan(), "scanSite refuses it")).toMatch(/apps\/landing\/i18n\/es\.json/);
    expect(messageOf(() => es.scan(), "scanSite refuses it")).toMatch(/apps\/docs\/i18n\/es\/strings\.json:\d+/);
    const en = docsI18nFixture({ catalogs: { en: (strings) => ({ ...strings, "site.docs": "Documentation" }) } });
    expect(messageOf(() => en.scan(), "scanSite refuses it")).toMatch(/"site\.docs"[\s\S]*apps\/landing\/i18n\/en\.json|apps\/landing\/i18n\/en\.json[\s\S]*"site\.docs"/);
  });

  it("refuses a language folder without strings.json", () => {
    const f = docsI18nFixture({
      languages: ["es"],
      files: { "apps/docs/i18n/ar/pages/index.html": "<!-- luz:page\ntitle: x\ndescription: y\nsource: 000000000000\n-->\n<p>x</p>\n" },
    });
    expect(messageOf(() => f.scan(), "scanSite refuses it")).toContain(`${AR_FILE}: missing`);
  });
});

describe("the keys the catalogs need are also derived from site.json", () => {
  it("asks every language for area.<id> of each area, and for no other", () => {
    const withBlog = { areas: [...SITE_JSON.areas, { id: "blog", label: "Blog", slug: "blog" }] };
    const es = docsI18nFixture({ siteJson: withBlog, catalogs: { es: (strings) => without(strings, "area.blog") } });
    expect(messageOf(() => es.scan(), "scanSite refuses it")).toContain(`${ES_FILE}: missing "area.blog"`);
    const gone = docsI18nFixture({ catalogs: { ar: (strings) => without(strings, "area.tokens") } });
    expect(messageOf(() => gone.scan(), "scanSite refuses it")).toContain(`${AR_FILE}: missing "area.tokens"`);
    const extra = docsI18nFixture({ catalogs: { es: (strings) => ({ ...strings, "area.nowhere": "Ninguna" }) } });
    expect(messageOf(() => extra.scan(), "scanSite refuses it")).toMatch(/apps\/docs\/i18n\/es\/strings\.json:\d+: "area\.nowhere"/);
  });

  it("asks for group.<area>.<group> of each group of an area", () => {
    const withGroup = { areas: SITE_JSON.areas.map((a) => (a.id === "components" ? { ...a, groups: [...a.groups, { id: "media", label: "Media" }] } : a)) };
    const f = docsI18nFixture({ siteJson: withGroup, catalogs: { es: (strings) => without(strings, "group.components.media") } });
    expect(messageOf(() => f.scan(), "scanSite refuses it")).toContain(`${ES_FILE}: missing "group.components.media"`);
  });

  it("asks for essential.<last segment of the href> of each essential that has a label", () => {
    const withLabel = { areas: SITE_JSON.areas.map((a) => (a.id === "tokens" ? { ...a, essentials: [{ href: "/docs/tokens/modes/", label: "Modes" }] } : a)) };
    const f = docsI18nFixture({ siteJson: withLabel, catalogs: { ar: (strings) => without(strings, "essential.modes") } });
    expect(messageOf(() => f.scan(), "scanSite refuses it")).toContain(`${AR_FILE}: missing "essential.modes"`);
    // An essential without a label takes the title of its page: no key
    const unlabelled = docsI18nFixture({ catalogs: { es: (strings) => ({ ...strings, "essential.components": "Componentes" }) } });
    expect(messageOf(() => unlabelled.scan(), "scanSite refuses it")).toMatch(/apps\/docs\/i18n\/es\/strings\.json:\d+: "essential\.components"/);
  });
});

describe("every key is used", () => {
  it("reports a key of en/strings.json that no render used, at its line, once every language is built", () => {
    const f = docsI18nFixture({
      catalogs: {
        en: (strings) => ({ ...strings, "zz.unused": "Nothing says this" }),
        es: (strings) => ({ ...strings, "zz.unused": "Nada dice esto" }),
        ar: (strings) => ({ ...strings, "zz.unused": "لا شيء يقول هذا" }),
      },
    });
    const { problems } = buildSite(f.scan(), BUILD);
    const line = lineOfKey(f.read(EN_FILE), "zz.unused");
    expect(problems).toContain(`${EN_FILE}:${line}: "zz.unused" is used by no template`);
    expect(problems.filter((p) => p.includes('"chrome.skip"')), "a key the layout uses").toEqual([]);
  });

  it("builds the real site, in every language it has, with no problem", () => {
    const real = scanSite(join(REPO, "apps/docs"), REPO);
    expect(real.docsI18n, "scanSite(...).docsI18n").toBeTruthy();
    const { problems, rendered } = buildSite(real, { languages: true });
    expect(problems).toEqual([]);
    for (const language of real.docsI18n.languages) {
      for (const page of real.pages) expect(rendered.has(`${language.docsRoute}${page.route.slice("/docs/".length)}`), `${language.code} ${page.route}`).toBe(true);
    }
  }, 120_000);
});

/* ---- The plural of the chips ----------------------------------------------------------------- */

describe("the known issues of a page are counted with the plural categories of the language", () => {
  const COUNTS = [1, 2, 3, 11, 100];
  const issues = (n) => `<ul>${Array.from({ length: n }, (_, i) => `<li>Problem ${i + 1}.</li>`).join("")}</ul>`;
  const widgetWith = (n) => ({
    meta: PAGES["components/widget.html"].meta,
    body: PAGES["components/widget.html"].body((text) => text, issues(n)),
  });
  const pages = Object.fromEntries(
    COUNTS.map((n) => [
      `components/count-${n}.html`,
      `<!-- luz:page\n${Object.entries({ ...widgetWith(n).meta, title: `Count ${n}`, description: `Has ${n} issues.` }).map(([k, v]) => `${k}: ${v}`).join("\n")}\n-->\n${widgetWith(n).body}\n`,
    ]),
  );

  const chipOf = async (code, n) => {
    const mod = await docsI18nModule();
    const f = docsI18nFixture({ pages });
    const site = f.scan();
    const localized = mod.localize(site, docsLanguage(site, code));
    const html = renderPage(localized.byRoute.get(`/${code}/docs/components/count-${n}/`), localized, { dev: true });
    return /<a href="#known-issues">([^<]*)<\/a>/.exec(html)?.[1];
  };

  it("picks one, many and other in Spanish", async () => {
    const expected = { 1: "one", 2: "other", 3: "other", 11: "other", 100: "other" };
    for (const n of COUNTS) {
      const chip = await chipOf("es", n);
      expect(chip, `es ${n}`).toContain(`[${expected[n]}]`);
      expect(chip, `es ${n}`).toContain(String(n));
    }
  });

  it("picks one, two, few, many and other in Arabic", async () => {
    const expected = { 1: "one", 2: "two", 3: "few", 11: "many", 100: "other" };
    for (const n of COUNTS) {
      const chip = await chipOf("ar", n);
      expect(chip, `ar ${n}`).toContain(`[${expected[n]}]`);
      expect(chip, `ar ${n}`).toContain(String(n));
    }
  });
});

/* ---- The date ------------------------------------------------------------------------ */

describe("the date of the page foot follows the catalog's format.date-locale", () => {
  const dateOf = (html) => {
    const m = /<time datetime="(\d{4}-\d{2}-\d{2})">([^<]*)<\/time>/.exec(html);
    expect(m, "the page foot has its <time>").toBeTruthy();
    return { iso: m[1], text: m[2] };
  };
  const longDate = (locale, iso) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
  const footOf = async (f, code, route = "/docs/get-started/") => {
    const mod = await docsI18nModule();
    const site = f.scan();
    const localized = mod.localize(site, docsLanguage(site, code));
    return dateOf(renderPage(localized.byRoute.get(`/${code}${route}`), localized, { dev: true }));
  };

  it("writes the Spanish date as '18 de octubre de 2026', Latin digits", async () => {
    const { iso, text } = await footOf(docsI18nFixture(), "es");
    expect(text).toBe(longDate("es", iso));
    expect(text).toMatch(/^[0-9]{1,2} de \p{L}+ de [0-9]{4}$/u);
  });

  it("writes the Arabic date with Latin digits and the Gregorian calendar", async () => {
    const { iso, text } = await footOf(docsI18nFixture(), "ar");
    expect(text).toBe(longDate("ar-u-ca-gregory-nu-latn", iso));
    expect(text).toMatch(/^[0-9]{1,2} [\p{L}\p{M}]+ [0-9]{4}$/u);
    expect(text).not.toMatch(/[٠-٩]/u);
  });

  it("reads the format from the catalog, not from the language code", async () => {
    const f = docsI18nFixture({ catalogs: { ar: (strings) => ({ ...strings, "format.date-locale": "ar-SA" }) } });
    const { iso, text } = await footOf(f, "ar");
    expect(text).toBe(longDate("ar-SA", iso));
    expect(text).toMatch(/[٠-٩]/u);
  });
});
