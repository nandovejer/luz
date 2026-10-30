/**
 * The home page in several languages (scripts/docs-site/i18n.js and its use
 * in catalog.js): the registry and the catalogs, the {{t:…}} and {{html:…}}
 * strings with file:line on every mistake, the unused-key check, the
 * language switcher and the <link rel="alternate"> generated from the
 * registry, and the real catalogs of apps/landing/i18n.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { markDocsLinks, renderAlternates, renderSwitcher } from "../scripts/docs-site/i18n.js";
import { docsSite } from "../scripts/docs-site/plugin.js";
import { PAGES_BASE, SITE_URL } from "../vite.config.js";
import { buildSite, currentOf, landingDocuments, relativizeLinks, renderDocument, scanSite } from "../scripts/docs-site/site.js";
import { addDocsLanguage } from "./helpers/docs-i18n-size-fixture.js";
import { generatorStrings, giveHomeSources } from "./helpers/home-sources.js";
import { findAll, parse, query, textOf } from "./helpers/html-dom.js";
import { quoted } from "./helpers/quoted-attributes.js";

// The home is written without the quotes a value does not need: these tests read it with them restored
const renderQuoted = (...args) => quoted(renderDocument(...args));

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/* ---- Fixtures ----------------------------------------------------------- */

const temps = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const REGISTRY = [
  { code: "en", name: "English", dir: "ltr", route: "/" },
  { code: "es", name: "Español", dir: "ltr", route: "/es/" },
  { code: "ar", name: "العربية", dir: "rtl", route: "/ar/" },
];
const CATALOGS = {
  en: { "lang.label": "Language", "site.home": "Home", "hero.title": "Plain HTML", "hero.lead": "Add a <code>&lt;link&gt;</code> tag." },
  es: { "lang.label": "Idioma", "site.home": "Inicio", "hero.title": "HTML sin más", "hero.lead": "Añade una etiqueta <code>&lt;link&gt;</code>." },
  ar: { "lang.label": "اللغة", "site.home": "الرئيسية", "hero.title": "HTML فقط", "hero.lead": "أضف وسم <code>&lt;link&gt;</code>." },
};
const LANDING = `<!DOCTYPE html>
<html lang="{{lang}}" dir="{{dir}}">
<head>
  <title>{{t:hero.title}}</title>
  {{alternates}}
</head>
<body>
  <!-- luz:include header -->
  <main id="main-content">
    <h1>{{t:hero.title}}</h1>
    <p>{{html:hero.lead}}</p>
    <a href="/docs/">Docs</a>
  </main>
</body>
</html>
`;

/** A repository with a one-page docs site and a translated landing. */
function fixture({ registry = REGISTRY, catalogs = CATALOGS, landing = LANDING, header } = {}) {
  const repoRoot = mkdtempSync(join(tmpdir(), "luz-i18n-"));
  temps.push(repoRoot);
  const files = {
    "apps/docs/site.json": JSON.stringify({ areas: [{ id: "components", label: "Components", slug: "components" }] }),
    "apps/docs/_layouts/page.html": '<!DOCTYPE html>\n<html lang="{{lang}}">\n<head><title>{{title}}</title></head>\n<body>\n<!-- luz:include header -->\n<main id="main-content">\n{{content}}\n</main>\n</body>\n</html>\n',
    "apps/site/_partials/header.html":
      header ?? '<header>\n  <nav aria-label="Site">\n    <a href="{{home}}">{{t:site.home}}</a>\n    <a href="/docs/">Docs</a>\n  </nav>\n  {{langswitch}}\n</header>\n',
    "apps/docs/pages/index.html": "<!-- luz:page\ntitle: Docs\ndescription: The docs.\narea: hub\n-->\n<p>Hello.</p>\n",
    "apps/landing/index.html": landing,
    "apps/landing/i18n/locales.json": registry === null ? null : JSON.stringify(registry, null, 2),
    // The generator reads its own words from the catalog (the weights, the lists...): after the test's own, so their lines stay
    ...Object.fromEntries(Object.entries(catalogs).map(([code, strings]) => [`apps/landing/i18n/${code}.json`, strings && JSON.stringify({ ...strings, ...generatorStrings(code) }, null, 2)])),
  };
  for (const [path, text] of Object.entries(files)) {
    if (text === null || text === undefined) continue;
    // The fixture's small docs site is in mini-docs/: apps/docs/pages holds the real pages the home's lists read
    const at = path.replace(/^apps\/docs\//, "mini-docs/");
    mkdirSync(dirname(join(repoRoot, at)), { recursive: true });
    writeFileSync(join(repoRoot, at), text);
  }
  giveHomeSources(repoRoot);
  return repoRoot;
}

const docsDirOf = (repoRoot) => join(repoRoot, "mini-docs");
const scan = (repoRoot) => scanSite(docsDirOf(repoRoot), repoRoot);
const build = (repoRoot) => {
  const site = scan(repoRoot);
  const html = readFileSync(join(repoRoot, "apps/landing/index.html"), "utf-8");
  const built = buildSite(site, { extra: landingDocuments(site, "apps/landing/index.html", html) });
  return { ...built, rendered: new Map([...built.rendered].map(([route, page]) => [route, quoted(page)])) };
};

/* ---- The registry and the catalogs --------------------------------------- */

describe("languages of the home page: registry and catalogs", () => {
  it("renders the template once per language, default first at /", () => {
    const { rendered, problems } = build(fixture());
    expect(problems).toEqual([]);
    expect(rendered.get("/")).toContain('<html lang="en" dir="ltr">');
    expect(rendered.get("/es/")).toContain('<html lang="es" dir="ltr">');
    expect(rendered.get("/ar/")).toContain('<html lang="ar" dir="rtl">');
    expect(rendered.get("/es/")).toContain("<title>HTML sin más</title>");
    expect(rendered.get("/ar/")).toContain("<h1>HTML فقط</h1>");
  });

  it("works without a registry: one home page, the {{t:…}} of a source left as written", () => {
    const repoRoot = fixture({ registry: null, header: "<header></header>\n", landing: "<!DOCTYPE html>\n<html lang=\"{{lang}}\">\n<head><title>x</title></head>\n<body><main id=\"main-content\"></main></body>\n</html>\n" });
    const site = scan(repoRoot);
    expect(site.i18n).toBeNull();
    expect(landingDocuments(site, "apps/landing/index.html", "")).toEqual([{ route: "/", file: "apps/landing/index.html", html: "" }]);
    expect(build(repoRoot).problems).toEqual([]);
  });

  it("refuses a registry that is not a list of { code, name, dir, route }, the default at /", () => {
    const bad = [
      [[], /a list of/],
      [[{ ...REGISTRY[0], route: "/en/" }], /route is "\/"/],
      [[REGISTRY[0], { ...REGISTRY[1], route: "/espanol/" }], /route is "\/es\/"/],
      [[REGISTRY[0], { ...REGISTRY[2], dir: "auto" }], /dir is "ltr" or "rtl"/],
      [[REGISTRY[0], { ...REGISTRY[1], code: "ES" }], /not a lowercase language tag/],
      [[REGISTRY[0], { ...REGISTRY[1], code: "../x", route: "/../x/" }], /not a lowercase language tag/],
      [[REGISTRY[0], REGISTRY[0]], /listed twice/],
      [[REGISTRY[0], { ...REGISTRY[1], flag: "🇪🇸" }], /exactly code, name, dir and route/],
      [[REGISTRY[0], { ...REGISTRY[1], name: " " }], /name is the language's name/],
    ];
    for (const [registry, message] of bad) expect(() => scan(fixture({ registry })), JSON.stringify(registry)).toThrow(message);
  });

  it("refuses a catalog that misses a key of the default one, or has one it does not, with file:line", () => {
    const missing = Object.fromEntries(Object.entries(CATALOGS.es).filter(([key]) => key !== "hero.lead"));
    expect(() => scan(fixture({ catalogs: { ...CATALOGS, es: missing } }))).toThrow(
      'apps/landing/i18n/es.json: missing "hero.lead" (apps/landing/i18n/en.json:5)',
    );
    expect(() => scan(fixture({ catalogs: { ...CATALOGS, ar: { ...CATALOGS.ar, "hero.extra": "زائد" } } }))).toThrow(
      'apps/landing/i18n/ar.json:6: "hero.extra" is not in apps/landing/i18n/en.json',
    );
    expect(() => scan(fixture({ catalogs: { ...CATALOGS, es: undefined } }))).toThrow(/es\.json: missing/);
    expect(() => scan(fixture({ catalogs: { ...CATALOGS, en: { ...CATALOGS.en, "Hero Title": "x" } } }))).toThrow(/en\.json:6: "Hero Title" is not a valid key/);
    expect(() => scan(fixture({ catalogs: { ...CATALOGS, en: { ...CATALOGS.en, "hero.title": "" } } }))).toThrow(/en\.json:4: "hero.title" is not a non-empty string/);
  });

  it("fails on a key a template uses and no catalog has, with the template's file:line", () => {
    const landing = LANDING.replace("<h1>{{t:hero.title}}</h1>", "<h1>{{t:hero.titel}}</h1>");
    expect(() => build(fixture({ landing }))).toThrow('apps/landing/index.html:10: "hero.titel" is not in apps/landing/i18n/en.json');
    const header = '<header>\n  <a href="/">{{t:site.homme}}</a>\n</header>\n';
    expect(() => build(fixture({ header }))).toThrow('apps/site/_partials/header.html:2: "site.homme" is not in apps/landing/i18n/en.json');
  });

  it("reports a key no template uses, at its line in the default catalog", () => {
    const catalogs = Object.fromEntries(Object.entries(CATALOGS).map(([code, strings]) => [code, { ...strings, "old.key": "x" }]));
    expect(build(fixture({ catalogs })).problems).toEqual(['apps/landing/i18n/en.json:6: "old.key" is used by no template']);
  });

  // Seven builds of the fixture: more than the default 5 s on a loaded runner
  it("escapes {{t:…}} and lets {{html:…}} carry only inline markup", () => {
    const xss = '<img src=x onerror="alert(1)">';
    const catalogs = { ...CATALOGS, es: { ...CATALOGS.es, "hero.title": xss } };
    expect(build(fixture({ catalogs })).rendered.get("/es/")).toContain("<h1>&lt;img src=x onerror=&quot;alert(1)&quot;&gt;</h1>");
    for (const bad of ['<script>alert(1)</script>', '<a href="javascript:alert(1)">x</a>', '<span onclick="x()">x</span>', '<img src="x">', '<a href="//evil.example/">x</a>']) {
      const html = { ...CATALOGS, ar: { ...CATALOGS.ar, "hero.lead": bad } };
      expect(() => build(fixture({ catalogs: html })), bad).toThrow(/catalog's HTML/);
    }
    const ok = { ...CATALOGS, es: { ...CATALOGS.es, "hero.lead": 'Ve a <a href="/docs/">la guía</a> con <span data-count="n">3</span> <strong>pasos</strong>.' } };
    expect(build(fixture({ catalogs: ok })).rendered.get("/es/")).toContain('<p>Ve a <a href="/docs/" hreflang="en">la guía</a> con <span data-count="n">3</span> <strong>pasos</strong>.</p>');
  }, 30000);
});

/* ---- What the generator writes ------------------------------------------- */

describe("languages of the home page: generated markup", () => {
  // A fresh fixture per test: afterEach removes it
  let site;
  let i18n;
  beforeEach(() => {
    site = scan(fixture());
    i18n = site.i18n;
  });

  it("lists every language as an alternate, x-default as the default one, and the page as canonical (dev: root-absolute)", () => {
    expect(renderAlternates(i18n, i18n.byCode.get("es")).split(/\n\s*/)).toEqual([
      '<link rel="canonical" href="/es/">',
      '<link rel="alternate" hreflang="en" href="/">',
      '<link rel="alternate" hreflang="es" href="/es/">',
      '<link rel="alternate" hreflang="ar" href="/ar/">',
      '<link rel="alternate" hreflang="x-default" href="/">',
    ]);
  });

  it("writes them absolute from the site's URL in the pages build, and refuses a URL that is not https or has no final slash", () => {
    const url = "https://nandovejer.github.io/luz/";
    expect(renderAlternates(i18n, i18n.byCode.get("ar"), url).split(/\n\s*/)).toEqual([
      '<link rel="canonical" href="https://nandovejer.github.io/luz/ar/">',
      '<link rel="alternate" hreflang="en" href="https://nandovejer.github.io/luz/">',
      '<link rel="alternate" hreflang="es" href="https://nandovejer.github.io/luz/es/">',
      '<link rel="alternate" hreflang="ar" href="https://nandovejer.github.io/luz/ar/">',
      '<link rel="alternate" hreflang="x-default" href="https://nandovejer.github.io/luz/">',
    ]);
    const html = renderQuoted(LANDING, "apps/landing/index.html", "/es/", site, { locale: i18n.byCode.get("es"), siteUrl: "https://example.org/" });
    expect(html).toContain('<link rel="canonical" href="https://example.org/es/">');
    for (const bad of ["http://example.org/", "https://example.org", "javascript:alert(1)//", 'https://example.org/"><script>/']) {
      expect(() => renderAlternates(i18n, i18n.default, bad), bad).toThrow(/https URL/);
    }
  });

  it("builds the switcher from the registry: links named in their own language, the current one marked, no flags, no script", () => {
    const html = renderSwitcher(i18n, i18n.byCode.get("es"), "Idioma");
    const links = [...html.matchAll(/<a class="luz-lang-switch__link" href="([^"]*)" hreflang="([^"]*)" lang="([^"]*)"( aria-current="page")?>([^<]*)<\/a>/g)].map((m) => [m[1], m[2], m[3], Boolean(m[4]), m[5]]);
    expect(links).toEqual([
      ["/", "en", "en", false, "English"],
      ["/es/", "es", "es", true, "Español"],
      ["/ar/", "ar", "ar", false, "العربية"],
    ]);
    // The tag is the block (<luz-lang-switch>, CSS-only): no wrapper div, no class on it
    expect(html.startsWith("<luz-lang-switch>")).toBe(true);
    expect(html.trimEnd().endsWith("</luz-lang-switch>")).toBe(true);
    expect(html).not.toContain("luz-site-lang-switcher");
    // A native popover: the button names it, says what it is and shows the current language
    expect(html).toContain('<button class="luz-lang-switch__button" type="button" popovertarget="luz-lang-menu">');
    expect(html).toContain('<span class="u-sr-only">Idioma: </span><span class="luz-lang-switch__name">Español</span></button>');
    expect(html).toContain('<nav class="luz-lang-switch__menu" id="luz-lang-menu" popover aria-labelledby="luz-lang-title">');
    expect(html).not.toMatch(/<script|onclick|🇪|flag/i);
  });

  it("marks the home page of each language as current, and Home links to it", () => {
    const homes = ["/", "/es/", "/ar/"];
    expect(Object.fromEntries(currentOf("/es/", homes))).toEqual({ "/es/": "page" });
    expect(Object.fromEntries(currentOf("/docs/", homes))).toEqual({ "/docs/": "page" });
    const html = renderQuoted(LANDING, "apps/landing/index.html", "/ar/", site, { locale: i18n.byCode.get("ar") });
    expect(html).toContain('<a href="/ar/" aria-current="page">الرئيسية</a>');
  });

  it("says hreflang=\"en\" on links to the English documentation, only on the other languages", () => {
    const es = renderQuoted(LANDING, "apps/landing/index.html", "/es/", site, { locale: i18n.byCode.get("es") });
    const en = renderQuoted(LANDING, "apps/landing/index.html", "/", site, { locale: i18n.default });
    expect(es).toContain('<a href="/docs/" hreflang="en">Docs</a>');
    expect(en).toContain('<a href="/docs/">Docs</a>');
    expect(markDocsLinks('<a href="/docs/" hreflang="fr">x</a>', "/docs/", "en")).toBe('<a href="/docs/" hreflang="fr">x</a>');
  });

  // Decision D1: a language has docs when apps/docs/i18n/<code>/ exists. Then its home links to /<code>/docs/,
  // the docs in its language, and says nothing about English (a link to the English docs says hreflang="en")
  describe("once a language has docs", () => {
    /** The links of the page body into the docs (/docs/… or /<code>/docs/…): not the <head>'s alternates, not the language switcher's. */
    const docsAnchors = (html) => {
      const tree = parse(html, "home");
      const body = query(tree, "body");
      const inSwitcher = (n) => {
        for (let up = n.parent; up; up = up.parent) if (up.name === "luz-lang-switch") return true;
        return false;
      };
      return findAll(body, (n) => n.name === "a" && n.attrs.has("href") && /^\/(?:[a-z]{2,3}\/)?docs\//.test(n.attrs.get("href")) && !inSwitcher(n));
    };
    const hreflangsOf = (html) => docsAnchors(html).map((a) => a.attrs.get("hreflang") ?? null);

    const docsOf = (codes, options) => {
      const repoRoot = fixture(options);
      for (const code of codes) addDocsLanguage(docsDirOf(repoRoot), code);
      const withDocs = scan(repoRoot);
      const render = (route, code) => renderQuoted(options?.landing ?? LANDING, "apps/landing/index.html", route, withDocs, { locale: withDocs.i18n.byCode.get(code) });
      return { render };
    };

    it("rewrites the links to /docs/ to /es/docs/, without hreflang, and keeps hreflang=\"en\" on the language that has none", () => {
      const { render } = docsOf(["es"]);
      const es = render("/es/", "es");
      expect(es, "links of the Spanish home").toContain('<a href="/es/docs/">Docs</a>');
      expect(es, "no link left to the English docs").not.toMatch(/href="\/docs\//);
      expect(docsAnchors(es).length, "docs links of the Spanish home").toBeGreaterThan(0);
      expect(hreflangsOf(es).filter((h) => h === "en"), "docs links of the Spanish home that say hreflang=en").toEqual([]);
      // Arabic has no docs folder in this copy: its links are the English ones, said so
      const ar = render("/ar/", "ar");
      expect(ar).toContain('<a href="/docs/" hreflang="en">Docs</a>');
      expect(ar).not.toContain("/ar/docs/");
      expect(docsAnchors(ar).length, "docs links of the Arabic home").toBeGreaterThan(0);
      expect(hreflangsOf(ar).filter((h) => h !== "en"), "docs links of the Arabic home that lack hreflang=en").toEqual([]);
      // English is the default: its links are what they were
      expect(render("/", "en")).toContain('<a href="/docs/">Docs</a>');
    });

    it("does it for each language that has docs, and for a link a catalog string carries", () => {
      const lead = 'Ve a <a href="/docs/">la guía</a> con <span data-count="n">3</span> <strong>pasos</strong>.';
      const { render } = docsOf(["es", "ar"], { catalogs: { ...CATALOGS, es: { ...CATALOGS.es, "hero.lead": lead } } });
      expect(render("/es/", "es")).toContain('<p>Ve a <a href="/es/docs/">la guía</a> con <span data-count="n">3</span> <strong>pasos</strong>.</p>');
      const ar = render("/ar/", "ar");
      expect(ar).toContain('<a href="/ar/docs/">Docs</a>');
      expect(ar).not.toMatch(/href="\/docs\//);
    });

    it("leaves alone a link outside /docs/: a path that only starts with the same letters, and another site's /docs/", () => {
      const landing = LANDING.replace("</main>", '  <a href="/docsx/">Other</a><a href="https://example.org/docs/">Out</a>\n  </main>');
      const { render } = docsOf(["es"], { landing });
      const es = render("/es/", "es");
      expect(es, "the docs link of the same page is rewritten").toContain('<a href="/es/docs/">Docs</a>');
      expect(es).toContain('<a href="/docsx/">Other</a>');
      expect(es).toContain('<a href="https://example.org/docs/">Out</a>');
    });
  });

  it("ships the home without the author's comments, and without the quotes a value does not need", () => {
    const landing = LANDING.replace("<main", '<!-- a note for the author, not for the visitor -->\n  <main').replace('<a href="/docs/">Docs</a>', '<a class="luz-btn" href="#top" title="A title">Docs</a>');
    const root = fixture({ landing });
    const site = scan(root);
    const html = readFileSync(join(root, "apps/landing/index.html"), "utf-8");
    const { rendered } = buildSite(site, { extra: landingDocuments(site, "apps/landing/index.html", html) });
    for (const route of ["/", "/es/", "/ar/"]) {
      const page = rendered.get(route);
      expect(page, route).not.toContain("a note for the author");
      expect(page, route).not.toContain("<!--");
      expect(page, route).toContain("<a class=luz-btn href=#top title=\"A title\">Docs</a>");
      expect(page, `${route}: a value with a space keeps its quotes`).toContain('title="A title"');
    }
  });

  it("makes the languages' links relative in the pages build", () => {
    const routes = new Set(["/", "/es/", "/ar/", "/docs/"]);
    expect(relativizeLinks('<link rel="alternate" hreflang="en" href="/"><a href="/ar/">x</a><a href="/docs/">d</a>', "/es/", routes)).toBe(
      '<link rel="alternate" hreflang="en" href="../"><a href="../ar/">x</a><a href="../docs/">d</a>',
    );
  });
});

/* ---- The real catalogs ---------------------------------------------------- */

describe("the LUZ home page in every language", () => {
  const site = scanSite(join(repo, "apps/docs"), repo);
  const template = readFileSync(join(repo, "apps/landing/index.html"), "utf-8");
  const docs = landingDocuments(site, "apps/landing/index.html", template);
  const render = (doc) => renderQuoted(doc.html, doc.file, doc.route, site, { locale: doc.locale });

  it("publishes at the GitHub Pages URL of the repository, whose path is PAGES_BASE", () => {
    expect(SITE_URL).toBe("https://nandovejer.github.io/luz/");
    expect(new URL(SITE_URL).pathname).toBe(PAGES_BASE);
    const options = { repoRoot: repo, relative: true, outRoot: join(repo, "docs"), pagesBase: PAGES_BASE };
    expect(() => docsSite({ ...options, siteUrl: SITE_URL })).not.toThrow();
    expect(() => docsSite({ ...options, siteUrl: "https://nandovejer.github.io/other/" })).toThrow(/whose path is pagesBase/);
    expect(() => docsSite({ ...options, siteUrl: "http://nandovejer.github.io/luz/" })).toThrow(/https URL/);
  });

  it("ships English (default), Spanish and Arabic, each named in itself", () => {
    expect(site.i18n.locales.map((l) => [l.code, l.name, l.dir, l.route])).toEqual([
      ["en", "English", "ltr", "/"],
      ["es", "Español", "ltr", "/es/"],
      ["ar", "العربية", "rtl", "/ar/"],
    ]);
  });

  it("gives each language its own title, description, lang and dir, alternates for all, and no template syntax left", () => {
    const titles = new Set();
    for (const doc of docs) {
      const html = render(doc);
      const { code, dir } = doc.locale;
      expect(html, code).toContain(`<html lang="${code}" dir="${dir}"`);
      const title = html.match(/<title>([^<]+)<\/title>/)[1];
      expect(titles.has(title), code).toBe(false);
      titles.add(title);
      expect(html, code).toMatch(/<meta name="description" content="[^"]{60,}">/);
      for (const l of [...site.i18n.locales.map((x) => x.code), "x-default"]) expect(html, `${code} ${l}`).toContain(`hreflang="${l}" href=`);
      expect(html, code).not.toMatch(/\{\{|\}\}/);
      // The strings core's scripts write come from the page, so Arabic needs no dictionary of its own
      for (const key of ["change-mode", "mode-changed", "mode-auto", "copied", "copied-status", "copy-failed"]) expect(html, `${code} ${key}`).toMatch(new RegExp(`data-luz-label-${key}="[^"]+"`));
      // The search results are English pages
      expect(html.match(/<ul data-luz-search-list="[a-z]+" lang="en">/g), code).toHaveLength(3);
    }
  });

  it("marks every link to the English documentation with hreflang on /es/ and /ar/, and sends the language that has docs to its own", () => {
    for (const doc of docs.filter((d) => d.route !== "/")) {
      const html = render(doc);
      const { code } = doc.locale;
      // Decision D1: a language has docs when apps/docs/i18n/<code>/ exists
      const hasDocs = existsSync(join(repo, "apps/docs/i18n", code));
      const prefix = hasDocs ? `/${code}/docs/` : "/docs/";
      const docsLinks = [...html.matchAll(new RegExp(`<a\\b[^>]*href="${prefix}[^"]*"[^>]*>`, "g"))].map((m) => m[0]);
      expect(docsLinks.length, `${doc.route}: links to ${prefix}`).toBeGreaterThan(20);
      for (const a of docsLinks) {
        if (hasDocs) expect(a, doc.route).not.toContain('hreflang="en"');
        else expect(a, doc.route).toContain('hreflang="en"');
      }
      // ... and none left to the other docs
      if (hasDocs) expect(html.match(/<a\b[^>]*href="\/docs\/[^"]*"[^>]*>/g) ?? [], `${doc.route}: links to the English docs`).toEqual([]);
    }
  });
});

/* ---- The new home (F5): every string in three languages ------------------------ */

describe("the new home page: catalogs and rendered pages (F5)", () => {
  const catalog = (code) => JSON.parse(readFileSync(join(repo, `apps/landing/i18n/${code}.json`), "utf-8"));
  const catalogs = { en: catalog("en"), es: catalog("es"), ar: catalog("ar") };
  const site = scanSite(join(repo, "apps/docs"), repo);
  const template = readFileSync(join(repo, "apps/landing/index.html"), "utf-8");
  const docs = landingDocuments(site, "apps/landing/index.html", template);
  const { rendered: written, problems } = buildSite(site, { extra: docs });
  // What the build wrote (its size is what the ceiling weighs) and the same page with the quotes of its values restored
  const rendered = new Map([...written].map(([route, page]) => [route, quoted(page)]));
  const SECTIONS = ["hero", "light", "inside", "inside-2", "inside-3", "inside-4", "why", "native", "modes", "faq"];
  const placeholders = (value) => [...value.matchAll(/\{[a-z]+(?::[a-z]+)?\}/g)].map((m) => m[0]).sort();
  /** Values that are the same word in the three languages: a brand, a command, a symbol. */
  /**
   * The FAQ's questions and answers stay English in Arabic (the owner reads them, nobody has translated them),
   * and the page says so: `faq.lang` is "en". Its title, lead and group names are Arabic like the rest.
   */
  const AR_ENGLISH = (key) => key === "faq.lang" || /^faq\.[a-z-]+\.(?:q|a|p\d|ol\d)$/.test(key);
  const SAME = /^(?:[^\p{L}]*|GitHub|LUZ|ET Book|Core|Site|Tokens|Auto|Tokens \+ Core(?: \+ Site)?|Base(?: \+ Core)?|npm|CDN|KB|beta|Landing page|Light|Usable|Zero-dependency)$/u;

  it("the three catalogs have the same keys, and every key is used by a template: no orphan, no missing key", () => {
    expect(Object.keys(catalogs.es).sort()).toEqual(Object.keys(catalogs.en).sort());
    expect(Object.keys(catalogs.ar).sort()).toEqual(Object.keys(catalogs.en).sort());
    expect(problems).toEqual([]);
  });

  it("each key keeps its placeholders in every language", () => {
    for (const [key, value] of Object.entries(catalogs.en)) {
      expect(placeholders(catalogs.es[key]), `es ${key}`).toEqual(placeholders(value));
      expect(placeholders(catalogs.ar[key]), `ar ${key}`).toEqual(placeholders(value));
    }
  });

  it("es and ar are translated: no value is the English one but a brand, a command or a symbol", () => {
    for (const code of ["es", "ar"]) {
      const same = Object.keys(catalogs.en).filter((key) => catalogs[code][key] === catalogs.en[key] && !SAME.test(catalogs.en[key].replace(/<[^>]*>/g, "")) && !(code === "ar" && AR_ENGLISH(key)));
      expect(same, `${code} values identical to English`).toEqual([]);
    }
  });

  it("ar is written in Arabic: every value that is not a brand or a symbol has an Arabic letter", () => {
    const bare = Object.keys(catalogs.en).filter((key) => !SAME.test(catalogs.en[key].replace(/<[^>]*>/g, "")) && !/[؀-ۿ]/.test(catalogs.ar[key]) && !AR_ENGLISH(key));
    expect(bare).toEqual([]);
  });

  it("the FAQ is in the language of the page, except in Arabic, where its questions and answers are English and the catalog says it", () => {
    const faq = (code) => Object.keys(catalogs[code]).filter((key) => AR_ENGLISH(key) && key !== "faq.lang");
    expect(faq("en").length, "17 questions with their answers (some in several parts)").toBeGreaterThanOrEqual(34);
    expect(catalogs.en["faq.lang"]).toBe("en");
    expect(catalogs.es["faq.lang"]).toBe("es");
    expect(catalogs.ar["faq.lang"], "the FAQ of /ar/ declares what it is written in").toBe("en");
    for (const key of faq("en")) {
      expect(catalogs.ar[key], `ar ${key} is the English text, not a half translation`).toBe(catalogs.en[key]);
      expect(catalogs.es[key], `es ${key} is translated`).not.toBe(catalogs.en[key]);
    }
    // The title, the lead, the nav's label and the group names are the page's language, also in Arabic
    for (const key of ["faq.eyebrow", "faq.title", "faq.lead", "faq.nav", "faq.group.about", "faq.group.html", "faq.group.use", "faq.group.existing"]) {
      expect(catalogs.ar[key], `ar ${key}`).toMatch(/[؀-ۿ]/);
    }
  });

  it("the hero's brand is LUZ in every language, and the three words of the name stay English (lang=\"en\") in Why", () => {
    for (const doc of docs) {
      const html = rendered.get(doc.route);
      // The word is drawn with CSS: its letters are hidden from the tree and a visually hidden LUZ is what is read
      const h1 = query(parse(html, doc.route), "h1");
      const brand = query(h1, "span.landing-hero__brand.landing-imago");
      expect(brand, `${doc.route} the brand is in the h1`).not.toBeNull();
      expect(brand.attrs.get("lang"), doc.route).toBe("en");
      const word = query(brand, "span.landing-imago__word");
      expect(word.attrs.get("dir"), doc.route).toBe("ltr");
      expect(word.attrs.get("aria-hidden"), doc.route).toBe("true");
      expect(findAll(word, (node) => node.name === "span" && node.attrs.has("class")).map((node) => textOf(node)), doc.route).toEqual(["L", "U", "Z"]);
      expect(textOf(query(brand, "span.u-sr-only")), doc.route).toBe("LUZ");
      for (const [id, word] of [["why-light", "Light"], ["why-usable", "Usable"], ["why-zero", "Zero-dependency"]]) {
        expect(html, `${doc.route} ${id}`).toMatch(new RegExp(`<h3\\b[^>]*\\sid="${id}"[^>]*\\slang="en"[^>]*>${word}</h3>`));
      }
    }
  });

  it("each language renders the ten sections in order (the fit lists are inside why), one h1 and no template syntax left", () => {
    for (const doc of docs) {
      const html = rendered.get(doc.route);
      const at = SECTIONS.map((id) => html.search(new RegExp(`<section\\b[^>]*\\sid="${id}"`)));
      expect(at.every((place) => place > -1), `${doc.route} has ${SECTIONS.join(", ")}: ${at.join()}`).toBe(true);
      expect([...at].sort((a, b) => a - b), `${doc.route} in order`).toEqual(at);
      expect(html.match(/<h1\b/g), doc.route).toHaveLength(1);
      expect(html, doc.route).not.toMatch(/\{\{|\}\}|\{n:/);
    }
  });

  it("the old sections are gone from every language", () => {
    for (const doc of docs) {
      const html = rendered.get(doc.route);
      for (const id of ["what", "see", "adopt", "fit"]) expect(html, `${doc.route} #${id}`).not.toMatch(new RegExp(`\\sid="${id}"`));
      expect(html, doc.route).not.toMatch(/landing-h2|landing-points|landing-point__title|landing-lead/);
    }
  });

  it("the footer is the brand and two columns, the mode switcher and the licence, and the header has the languages, in every language", () => {
    for (const doc of docs) {
      const html = rendered.get(doc.route);
      const footer = html.slice(html.indexOf("<footer"), html.indexOf("</footer>"));
      expect(footer, doc.route).toContain("luz-site-footer__brand");
      // Two columns (the docs, the project), and inside the first two labels: the packages and the kinds of site
      expect(footer.match(/class="luz-site-footer__col-title"/g), doc.route).toHaveLength(2);
      expect(footer.match(/class="landing-foot-label"/g), doc.route).toHaveLength(2);
      expect(footer, doc.route).toMatch(/<luz-theme-time\b[^>]*>\s*<luz-theme-mode\b/);
      // The languages are the header's switch (not a list in the footer), with a link to each
      const header = html.slice(html.indexOf("<header"), html.indexOf("</header>"));
      for (const lang of ["en", "es", "ar"]) expect(header, `${doc.route} → ${lang}`).toMatch(new RegExp(`<a class="luz-lang-switch__link"[^>]*hreflang="${lang}"`));
    }
  });

  it("the hero's lead keeps the TDD statement in every language: the lead is one sentence about what works and how it changes", () => {
    // The sentence says what to do with LUZ (start a project, or migrate it page by page) and keeps the promise of the tests
    expect(catalogs.en["hero.lead"]).toMatch(/start a project with LUZ, or migrate it page by page/);
    expect(catalogs.en["hero.lead"]).toMatch(/every change starts with a failing test/);
    for (const code of ["en", "es", "ar"]) expect(catalogs[code]["hero.lead"].replace(/<[^>]*>/g, "").length, code).toBeGreaterThan(120);
  });

  describe("Spanish", () => {
    /** A value as a reader meets it: tags gone, and what is marked as English (lang="en") left out. */
    const spanish = (value) => value.replace(/<span\b[^>]*\blang="en"[^>]*>[\s\S]*?<\/span>/g, "").replace(/<[^>]*>/g, "");

    it("the hero's lead says framework once at most", () => {
      const mentions = catalogs.es["hero.lead"].replace(/<[^>]*>/g, "").match(/framework/gi) ?? [];
      expect(mentions.length).toBeLessThanOrEqual(1);
    });

    it("a design system is \"sistema de diseño\" everywhere: no \"design system\" outside a lang=\"en\" span", () => {
      const offenders = Object.entries(catalogs.es).filter(([, value]) => /design system/i.test(spanish(value))).map(([key]) => key);
      expect(offenders).toEqual([]);
    });
  });

  it("each rendered page stays under the 80 KiB the page ceiling allows", () => {
    for (const doc of docs) expect(Buffer.byteLength(written.get(doc.route)), doc.route).toBeLessThanOrEqual(80 * 1024);
  });

  it("keeps /ar/, the heaviest home, no heavier than the icons family left it: 81,800 bytes on disk, 629 of them added by the Pages build", () => {
    // /ar/ was 81,853 bytes on main (the ceiling is 81,920 and never raised, RL-17) and is 81,734 with the icons of the Icons page.
    // The generator writes 629 bytes fewer than the file Vite leaves in docs/ (its script and link tags), so 81,800 on disk is 81,171 here.
    const FIXED_BY_THE_PAGES_BUILD = 629;
    const ON_DISK = 81_800;
    expect(Buffer.byteLength(written.get("/ar/"))).toBeLessThanOrEqual(ON_DISK - FIXED_BY_THE_PAGES_BUILD);
    // The other two are lighter than /ar/ and stay so
    for (const route of ["/", "/es/"]) expect(Buffer.byteLength(written.get(route)), route).toBeLessThan(Buffer.byteLength(written.get("/ar/")));
    // Where the Pages build has run, the file itself
    const built = join(repo, "docs/ar/index.html");
    if (existsSync(built)) expect(readFileSync(built).length, "docs/ar/index.html").toBeLessThanOrEqual(ON_DISK);
  });
});
