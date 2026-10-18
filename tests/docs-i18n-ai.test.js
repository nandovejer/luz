/**
 * What the docs publish for machines, in every language (docs-i18n-design.md section e; RL-19: what an agent
 * reads is generated from what a person reads).
 *
 *   index.md           one for every localized route (`/es/docs/x/index.md`), equal to the converted text of
 *                      the page a reader gets there: the translation's when the page is translated, the English
 *                      text (links to the language's pages) when it is not
 *   llms.txt, llms-full.txt   English, byte for byte what they are without the feature
 *   search-index.json  one per language at `/<code>/docs/search-index.json`, in the format version 1 that
 *                      packages/site/src/search.js reads (`readIndex`), every link resolving to a page of that
 *                      language, the translated entries carrying their `lang`; the English one is unchanged
 *
 * The files are the ones the Vite plugin emits (generateBundle), from a throwaway copy of the real docs with a
 * Spanish and an Arabic tree (tests/helpers/docs-i18n-size-fixture.js): the real pages untranslated, so each is
 * the English page in that language's chrome, plus ONE probe page that exists only in the copy and is
 * translated in both. A translation the real site has is kept, so the test follows the real site as it grows.
 * The dev server answers the same two kinds of file.
 */
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { renderPageMarkdown } from "../scripts/docs-site/ai.js";
import { readHtml } from "../scripts/docs-site/html.js";
import { docsSite } from "../scripts/docs-site/plugin.js";
import { buildSite, scanSite } from "../scripts/docs-site/site.js";
import { PAGES_BASE, SITE_URL } from "../vite.config.js";
import { readIndex } from "../packages/site/src/search.js";
import { PROBE, makeSite, translatedRoutes } from "./helpers/docs-i18n-size-fixture.js";

const LANGUAGES = ["es", "ar"];

let without;
let withFeature;
let site;
let rendered;
let baseline;
let bundle;
let failure;

/** The files the plugin writes to the build, by file name: `docs/search-index.json`, `es/docs/x/index.md`, `llms.txt`… */
function bundleOf(copy) {
  const plugin = docsSite({ repoRoot: copy.repoRoot, relative: true, outRoot: join(copy.repoRoot, "out"), pagesBase: PAGES_BASE, siteUrl: SITE_URL });
  const files = new Map();
  plugin.generateBundle.call({ emitFile: ({ fileName, source }) => files.set(fileName, String(source)) });
  return files;
}

beforeAll(() => {
  // The same docs, without a language besides English, and with Spanish and Arabic
  without = makeSite({ languages: [], probe: true });
  withFeature = makeSite({ languages: LANGUAGES, probe: true });
  try {
    baseline = bundleOf(without);
    bundle = bundleOf(withFeature);
    site = scanSite(withFeature.docsDir, withFeature.repoRoot);
    ({ rendered } = buildSite(site, { languages: true }));
  } catch (error) {
    failure = error;
  }
}, 300_000);

afterAll(() => {
  without?.cleanup();
  withFeature?.cleanup();
});

/** The file of a route in the build: "/docs/x/" → "docs/x/index.md", and in a language "es/docs/x/index.md". */
const fileOf = (route, code = "") => `${code ? `${code}/` : ""}${route.slice(1)}index.md`;
const englishRoutes = () => site.pages.map((p) => p.route);
const ready = () => expect(failure?.message ?? "", "building the throwaway site and its files").toBe("");

/* ---- index.md ---------------------------------------------------------------- */

describe("index.md of a localized route", () => {
  it.each(LANGUAGES)("%s: every page has one, next to its index.html", (code) => {
    ready();
    const missing = englishRoutes().map((route) => fileOf(route, code)).filter((file) => !bundle.has(file));
    expect(missing.slice(0, 5), `${missing.length} of ${englishRoutes().length} index.md files missing for ${code} (the plugin emits one per localized route), the first ones`).toEqual([]);
  });

  it("the English index.md files are the ones they were: the feature changes none", () => {
    ready();
    const changed = englishRoutes().filter((route) => bundle.get(fileOf(route)) !== baseline.get(fileOf(route)));
    expect(changed, "English index.md that differ with the feature").toEqual([]);
    // ... and the comparison is of a build that has the feature
    expect(bundle.has(fileOf(PROBE.route, "es")), "the feature emits es/…/index.md").toBe(true);
  });

  it.each(LANGUAGES)("%s: a page that is not translated is the English text, its links to the pages of that language", (code) => {
    ready();
    const translated = new Set(translatedRoutes(withFeature.docsDir, code));
    const localize = (md) => md.replaceAll(`${SITE_URL}docs/`, `${SITE_URL}${code}/docs/`).replaceAll(`(${SITE_URL})`, `(${SITE_URL}${code}/)`);
    const fallbacks = englishRoutes().filter((route) => !translated.has(route));
    expect(fallbacks.length, "pages that fall back to English").toBeGreaterThan(50);
    const different = [];
    for (const route of fallbacks) {
      const got = bundle.get(fileOf(route, code));
      if (got === undefined || got !== localize(bundle.get(fileOf(route)))) different.push(route);
    }
    expect(different.slice(0, 5), `${different.length} of ${fallbacks.length} fallback index.md that are not the English one with ${SITE_URL}${code}/docs/ links, the first ones`).toEqual([]);
  });

  it.each(LANGUAGES)("%s: a translated page is the converted text of its translation, title and description included", (code) => {
    ready();
    const english = site.byRoute.get(PROBE.route);
    expect(english, "the probe page is a page of the copy").toBeTruthy();
    const t = PROBE[code];
    // What a reader of the page gets: the translation's title, description and body, its links to the language's pages
    const view = {
      ...english,
      route: `/${code}${PROBE.route}`,
      meta: { ...english.meta, title: t.title, description: t.description },
      body: t.body.replaceAll('href="/docs/', `href="/${code}/docs/`),
    };
    const expected = renderPageMarkdown(site, view, { siteUrl: SITE_URL });
    expect(expected, "the oracle is the translated page").toContain(`# ${t.title}`);
    expect(bundle.get(fileOf(PROBE.route, code)), `${fileOf(PROBE.route, code)}`).toBe(expected);
  });

  it("a translated page's index.md does not contain the English title or the English words of its body", () => {
    ready();
    for (const code of LANGUAGES) {
      const md = bundle.get(fileOf(PROBE.route, code)) ?? "";
      expect(md, code).not.toContain(PROBE.english.title);
      expect(md, code).not.toContain("A plain sentence");
      // The code stays English, byte for byte (decision D7)
      expect(md, code).toContain("npm i @luz-ds/core");
    }
  });
});

/* ---- llms.txt and llms-full.txt ------------------------------------------------ */

describe("llms.txt and llms-full.txt", () => {
  it.each(["llms.txt", "llms-full.txt"])("%s is byte for byte what it is without the feature, and lists English URLs only", (name) => {
    ready();
    // The comparison is between a build without languages and one with them
    expect(bundle.has(fileOf(PROBE.route, "es")), "the build under test has the languages").toBe(true);
    expect(baseline.has(name), `${name} is written`).toBe(true);
    expect(bundle.get(name), `${name} with the languages`).toBe(baseline.get(name));
    for (const code of LANGUAGES) expect(bundle.get(name), `${name} names no /${code}/docs/ page`).not.toContain(`/${code}/docs/`);
  });
});

/* ---- the search index ---------------------------------------------------------- */

describe("the search index of each language", () => {
  const indexFile = (code) => `${code ? `${code}/` : ""}docs/search-index.json`;
  const baseOf = (code) => `${SITE_URL}${indexFile(code)}`;
  const results = (code, files = bundle) => readIndex(JSON.parse(files.get(indexFile(code))), baseOf(code));
  const root = (code) => `${SITE_URL}${code ? `${code}/` : ""}docs/`;
  const idsCache = new Map();
  const idsOf = (route) => {
    if (!idsCache.has(route)) idsCache.set(route, new Set(readHtml(rendered.get(route), route).ids.keys()));
    return idsCache.get(route);
  };

  it("the English index is unchanged by the feature", () => {
    ready();
    expect(bundle.has(indexFile("es")), "the feature emits es/docs/search-index.json").toBe(true);
    expect(bundle.get(indexFile("")), "docs/search-index.json with the languages").toBe(baseline.get(indexFile("")));
  });

  it.each(LANGUAGES)("%s: its search-index.json is an index of format version 1 that search.js reads, every entry of it", (code) => {
    ready();
    expect(bundle.has(indexFile(code)), `${indexFile(code)} is emitted`).toBe(true);
    const data = JSON.parse(bundle.get(indexFile(code)));
    expect(data.version).toBe(1);
    const entries = data.pages.length + data.sections.length + data.elements.length;
    const read = results(code);
    expect(read, "readIndex() accepts it").not.toBeNull();
    expect(read.length, "entries readIndex() keeps of the ones written").toBe(entries);
    expect(data.pages.length, "pages in the index").toBe(site.pages.filter((p) => p.meta.search !== "false").length);
  });

  it.each(LANGUAGES)("%s: every link resolves to a page of that language, and to an id that is on it", (code) => {
    ready();
    expect(bundle.has(indexFile(code)), `${indexFile(code)} is emitted`).toBe(true);
    const bad = [];
    for (const { href } of results(code)) {
      if (!href.startsWith(root(code))) {
        bad.push(`${href} is not under ${root(code)}`);
        continue;
      }
      const url = new URL(href);
      const route = url.pathname.slice(PAGES_BASE.length - 1);
      if (!rendered.has(route)) bad.push(`${href}: no page at ${route}`);
      else if (url.hash && !idsOf(route).has(decodeURIComponent(url.hash.slice(1)))) bad.push(`${href}: no id ${url.hash} on ${route}`);
    }
    expect(bad.slice(0, 10), `${bad.length} links of ${indexFile(code)} that do not resolve`).toEqual([]);
  });

  it.each(LANGUAGES)("%s: the page that is translated has its translated text and carries its lang; the others do not claim it", (code) => {
    ready();
    expect(bundle.has(indexFile(code)), `${indexFile(code)} is emitted`).toBe(true);
    const t = PROBE[code];
    const probe = `${root(code)}${PROBE.route.slice("/docs/".length)}`;
    const mine = results(code).filter((r) => r.href === probe || r.href.startsWith(`${probe}#`));
    expect(mine.length, "entries of the probe page (the page and its sections)").toBeGreaterThanOrEqual(2);
    for (const r of mine) expect(r.lang, `${r.text}: lang`).toBe(code);
    expect(mine.map((r) => r.text), "the title and the heading in the language of the page").toEqual(expect.arrayContaining([t.title, t.body.match(/<h2[^>]*>([^<]*)</)[1]]));
    expect(mine.some((r) => r.meta && r.meta.includes(t.title)), "a section names its page by the translated title").toBe(true);
    // An entry of an English page is not marked as Spanish or Arabic: the list it is in says lang="en"
    const others = results(code).filter((r) => !(r.href === probe || r.href.startsWith(`${probe}#`)));
    const translated = new Set(translatedRoutes(withFeature.docsDir, code).map((r) => `${root(code)}${r.slice("/docs/".length)}`));
    const wrong = others.filter((r) => ![false, "en"].includes(r.lang) && ![...translated].some((p) => r.href === p || r.href.startsWith(`${p}#`)));
    expect(wrong.slice(0, 5).map((r) => `${r.href} lang ${r.lang}`), "English entries carrying another lang").toEqual([]);
  });

  it.each(LANGUAGES)("%s: it lists the same places as the English index, in the same order (structure comes from the English page)", (code) => {
    ready();
    expect(bundle.has(indexFile(code)), `${indexFile(code)} is emitted`).toBe(true);
    const place = (code2) => results(code2).map((r) => `${r.g} ${r.href.slice(root(code2).length)}`);
    expect(place(code)).toEqual(place(""));
  });
});

/* ---- the dev server -------------------------------------------------------------- */

describe("the dev server answers the same files", () => {
  let dev;
  const errors = [];

  beforeAll(() => {
    const plugin = docsSite({ repoRoot: withFeature.repoRoot, relative: false, outRoot: join(withFeature.repoRoot, "out") });
    let handler;
    plugin.configResolved({ command: "serve", logger: { warn() {}, error: (message) => errors.push(message) } });
    plugin.configureServer({
      watcher: { on() {} },
      middlewares: { use: (fn) => (handler = fn) },
      ws: { send() {} },
      transformIndexHtml: async () => "",
    });
    dev = (url) =>
      new Promise((resolve) => {
        const res = {
          statusCode: 200,
          headers: {},
          setHeader(name, value) {
            this.headers[name.toLowerCase()] = value;
          },
          end(body) {
            resolve({ status: this.statusCode, headers: this.headers, body: String(body ?? "") });
          },
        };
        handler({ url, originalUrl: url }, res, () => resolve({ status: 0, fellThrough: true, headers: {}, body: "" }));
      });
  }, 300_000);

  it.each(LANGUAGES)("/%s/docs/search-index.json is the index of that language, as JSON", async (code) => {
    ready();
    const answer = await dev(`/${code}/docs/search-index.json`);
    expect(answer.fellThrough ?? false, `/${code}/docs/search-index.json is served by the plugin, not left to Vite`).toBe(false);
    expect(answer.headers["content-type"]).toMatch(/^application\/json/);
    const read = readIndex(JSON.parse(answer.body), `http://localhost/${code}/docs/search-index.json`);
    expect(read?.some((r) => r.text === PROBE[code].title && r.lang === code), "the probe page, translated, with its lang").toBe(true);
  });

  it.each(LANGUAGES)("/%s/docs/…/index.md is the page as Markdown, translated when the page is", async (code) => {
    ready();
    const answer = await dev(`/${code}${PROBE.route}index.md`);
    expect(answer.fellThrough ?? false, `/${code}${PROBE.route}index.md is served by the plugin`).toBe(false);
    expect(answer.headers["content-type"]).toMatch(/^text\/markdown/);
    expect(answer.body.split("\n")[0]).toBe(`# ${PROBE[code].title}`);
    const fallback = await dev(`/${code}/docs/get-started/index.md`);
    expect(fallback.body.split("\n")[0], "a page that is not translated is the English one").toBe(`# ${site.byRoute.get("/docs/get-started/").meta.title}`);
  });

  it("llms.txt in dev is the English one", async () => {
    ready();
    // The server under test knows the languages ...
    expect((await dev("/es/docs/search-index.json")).fellThrough ?? false, "the dev server serves /es/docs/search-index.json").toBe(false);
    // ... and still answers the English file
    const answer = await dev("/llms.txt");
    expect(answer.body).toContain("# LUZ");
    expect(answer.body).not.toContain("/es/docs/");
  });
});
