/**
 * The translated pages of the docs (design: docs-i18n-design.md section b;
 * decisions D3, D5, D6, D7, D8, D16): where a translation lives, what its
 * front matter may say, the parity with the English page that keeps its
 * structure, code and figures from drifting, and the notice a page shows until
 * a person has reviewed it.
 *
 *   apps/docs/i18n/<code>/pages/<same path as pages/>.html
 *
 * Front matter of a translation: title and description (required), keywords,
 * source (required: the first 12 hex of the sha-256 of the English body, white
 * space collapsed), reviewed (true or false, false when missing) and reviewer
 * (a GitHub handle, if and only if reviewed is true). Nothing else: area,
 * order, group, files, module, toc, lead, generate, search, nav and layout come
 * from the English page, so the structure cannot drift.
 *
 * `parityProblems(english, translation)` takes two { file, body, bodyLine } and
 * returns ["<translation file>:<line>: message"]. Each message contains the word
 * of the rule it enforces: skeleton, heading, link, code, figure or marker.
 *
 * A stale `source` (the English page changed after its translation) is not a
 * failure here (D6): the loader marks the translation `stale` and
 * `pnpm check:i18n` lists it and blocks a release.
 */
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { renderPage, routeOfPage, scanSite } from "../scripts/docs-site/site.js";
import { find, findAll, hasClass, parse, query, queryAll, textOf } from "./helpers/html-dom.js";
import { REPO, TRANSLATED, docsI18nFixture, docsLanguage, messageOf, docsI18nModule, englishBody, hashOf, languageOf, pageSource, translationSource } from "./helpers/docs-i18n-fixture.js";

const made = [];
const fixture = (options) => {
  const f = docsI18nFixture(options);
  made.push(f);
  return f;
};
afterEach(() => made.splice(0).forEach((f) => f.cleanup()));

const ES_PAGES = "apps/docs/i18n/es/pages";

/* ---- The source hash ------------------------------------------------------------------ */

describe("source: the hash of the English body a translation was made from (D5)", () => {
  it("is the first 12 hex of the sha-256 of the body with its white space collapsed", async () => {
    const { sourceHash } = await docsI18nModule();
    for (const body of ["<p>One.</p>", englishBody("get-started/index.html"), "<h2 id=\"a\">A</h2>\n\n  <p>Text\n  here.</p>"]) {
      expect(sourceHash(body)).toBe(hashOf(body));
      expect(sourceHash(body)).toMatch(/^[0-9a-f]{12}$/);
    }
  });

  it("does not change with the indentation or the line breaks of the English source, and changes with its words", async () => {
    const { sourceHash } = await docsI18nModule();
    expect(sourceHash("<p>One\n   two.</p>\n")).toBe(sourceHash("<p>One two.</p>"));
    expect(sourceHash("<p>One two.</p>")).not.toBe(sourceHash("<p>One two!</p>"));
  });
});

/* ---- Where a translation lives and what its front matter says ------------------------------ */

describe("a translation file: its place and its front matter", () => {
  const meta = (extra = {}) => ({ title: "Instalar", description: "Cómo instalar.", source: hashOf(englishBody("get-started/install.html")), ...extra });
  const install = (front) => ({ "get-started/install.html": pageSource(front, "<p>x</p>\n<pre class=\"luz-code-block\"><code>pnpm add @luz-ds/core</code></pre>") });
  const scanWith = (translations) => fixture({ translations: { es: translations } }).scan();
  /** The fixture is made at once (a missing prerequisite fails here); the scan it returns is what must throw. */
  const scanning = (translations) => {
    const f = fixture({ translations: { es: translations } });
    return () => f.scan();
  };

  it("loads each file as the translation of the English page at the same path, with its front matter", () => {
    const site = fixture().scan();
    const es = docsLanguage(site, "es");
    expect([...es.pages.keys()].sort()).toEqual(Object.keys(TRANSLATED.es).map((path) => routeOfPage(path)).sort());
    const install_ = es.pages.get("/docs/get-started/install/");
    expect(install_.file).toBe(`${ES_PAGES}/get-started/install.html`);
    expect(install_.route).toBe("/docs/get-started/install/");
    expect(install_.meta).toMatchObject({ reviewed: true, reviewer: "nandovejer" });
    expect(install_.meta.title).toBeTruthy();
    expect(install_.body).toContain("pnpm add @luz-ds/core");
    expect(install_.bodyLine).toBe(9);
    expect(es.pages.get("/docs/get-started/").meta.reviewed).toBe(false);
  });

  it("takes keywords as optional, and reviewed as false when missing", () => {
    const es = docsLanguage(scanWith(install(meta())), "es");
    const { meta: m } = es.pages.get("/docs/get-started/install/");
    expect(m.reviewed).toBe(false);
    expect(m.keywords ?? "").toBe("");
    expect(m.reviewer ?? "").toBe("");
    const withKeywords = docsLanguage(scanWith(install(meta({ keywords: "instalar, npm" }))), "es");
    expect(withKeywords.pages.get("/docs/get-started/install/").meta.keywords).toBe("instalar, npm");
  });

  it("refuses every key a translation inherits from the English page, with the file and the line of the key", () => {
    for (const key of ["area", "order", "group", "files", "module", "toc", "lead", "generate", "search", "nav", "layout"]) {
      const translations = install(meta({ [key]: "components" }));
      // title, description and source are lines 2 to 4, the forbidden key line 5
      expect(messageOf(scanning(translations), key)).toMatch(new RegExp(`${ES_PAGES}/get-started/install\\.html:5: .*\\b${key}\\b`));
    }
  });

  it("refuses a key that is not in the schema, a key set twice and a file without front matter", () => {
    expect(messageOf(scanning(install(meta({ colour: "red" }))), "scanSite refuses it")).toMatch(new RegExp(`${ES_PAGES}/get-started/install\\.html:5: .*colour`));
    expect(messageOf(scanning({ "get-started/install.html": `<!-- luz:page\ntitle: A\ndescription: B\nsource: ${hashOf("x")}\ntitle: C\n-->\n<p>x</p>\n` }), "scanSite refuses it")).toMatch(
      new RegExp(`${ES_PAGES}/get-started/install\\.html:5: .*title.*twice`),
    );
    expect(messageOf(scanning({ "get-started/install.html": "<p>No front matter.</p>\n" }), "scanSite refuses it")).toMatch(new RegExp(`${ES_PAGES}/get-started/install\\.html:1: .*luz:page`));
  });

  it("needs a title, a description and a source", () => {
    for (const key of ["title", "description", "source"]) {
      const front = meta();
      delete front[key];
      expect(messageOf(scanning(install(front)), key)).toMatch(new RegExp(`${ES_PAGES}/get-started/install\\.html.*\\b${key}\\b`));
    }
  });

  it("wants a source of 12 hex characters", () => {
    for (const bad of ["abc", "0123456789abcdeg", "0123456789ab0", "not a hash"]) {
      expect(messageOf(scanning(install(meta({ source: bad }))), bad)).toMatch(new RegExp(`${ES_PAGES}/get-started/install\\.html:\\d+: .*source`));
    }
  });

  it("wants reviewed to be true or false, and a reviewer if and only if it is true", () => {
    expect(messageOf(scanning(install(meta({ reviewed: "yes" }))), "scanSite refuses it")).toMatch(/install\.html:\d+: .*reviewed/);
    expect(messageOf(scanning(install(meta({ reviewed: "true" }))), "scanSite refuses it")).toMatch(/install\.html.*reviewer/);
    expect(messageOf(scanning(install(meta({ reviewed: "false", reviewer: "nandovejer" }))), "scanSite refuses it")).toMatch(/install\.html:\d+: .*reviewer/);
    expect(messageOf(scanning(install(meta({ reviewed: "true", reviewer: "" }))), "scanSite refuses it")).toMatch(/install\.html.*reviewer/);
    // A GitHub handle, never an e-mail address
    for (const bad of ["owner@example.com", "two words", "-lead", "name!"]) {
      expect(messageOf(scanning(install(meta({ reviewed: "true", reviewer: bad }))), bad)).toMatch(/install\.html:\d+: .*reviewer/);
    }
    const ok = docsLanguage(scanWith(install(meta({ reviewed: "true", reviewer: "nandovejer" }))), "es");
    expect(ok.pages.get("/docs/get-started/install/").meta).toMatchObject({ reviewed: true, reviewer: "nandovejer" });
  });

  it("marks a translation as stale when its source is not the hash of the English body, and loads it all the same", () => {
    const fresh = docsLanguage(scanWith(install(meta())), "es").pages.get("/docs/get-started/install/");
    expect(fresh.stale).toBe(false);
    const stale = docsLanguage(scanWith(install(meta({ source: "000000000000" }))), "es").pages.get("/docs/get-started/install/");
    expect(stale.stale).toBe(true);
    // The English page was edited after the translation
    const edited = fixture({
      pages: { "get-started/install.html": pageSource({ title: "Install LUZ", description: "One command installs it.", area: "get-started", order: "1" }, "<p>A new sentence.</p>") },
    });
    expect(docsLanguage(edited.scan(), "es").pages.get("/docs/get-started/install/").stale).toBe(true);
  });

  it("fails on an orphan: a translation with no English page at the same path", () => {
    expect(messageOf(scanning({ "get-started/nowhere.html": translationSource("es", "get-started/install.html") }), "scanSite refuses it")).toMatch(
      new RegExp(`${ES_PAGES}/get-started/nowhere\\.html.*orphan|orphan.*${ES_PAGES}/get-started/nowhere\\.html`),
    );
    expect(messageOf(scanning({ "nowhere/index.html": translationSource("es", "get-started/install.html") }), "scanSite refuses it")).toMatch(/orphan/);
  });

  it("skips files and folders that start with an underscore, as the English pages do", () => {
    const es = docsLanguage(scanWith({ "get-started/_draft.html": "not a page at all", "_notes/x.html": "nor this" }), "es");
    expect(es.pages.size).toBe(Object.keys(TRANSLATED.es).length);
  });

  it("holds a translation's file name to the rule of a route segment, and refuses links and other kinds of file", () => {
    expect(messageOf(scanning({ "get-started/Install_Me.html": translationSource("es", "get-started/install.html") }), "scanSite refuses it")).toMatch(/not a valid route segment/);
    const f = fixture();
    f.symlink(f.path("apps/docs/pages/get-started/install.html"), "apps/docs/i18n/es/pages/get-started/link.html");
    expect(messageOf(() => f.scan(), "scanSite refuses it")).toMatch(/symlinks are not allowed/);
    const other = fixture({ files: { "apps/docs/i18n/es/pages/notes.txt": "x" } });
    expect(messageOf(() => other.scan(), "scanSite refuses it")).toMatch(/a page is an \.html file/);
  });
});

/* ---- Parity ------------------------------------------------------------------------------------- */

describe("parity: a translation keeps the structure, the code and the figures of the English page", () => {
  let parityProblems;
  const ready = async () => {
    ({ parityProblems } = await docsI18nModule());
  };

  const EN = `<h2 id="intro">Introduction</h2>
<p>Read <a href="/docs/get-started/">Get started</a>, then jump to <a href="#details">the details</a> or <a href="https://github.com/nandovejer/luz">GitHub</a>. The ratio is 4.5:1 and the size is 16 px; there are 3 steps.</p>
<ul class="docs-list">
  <li>The class <code>.luz-btn</code> styles a button.</li>
  <li>Press <kbd>Tab</kbd> to move; the output reads <samp>Saved</samp> for <var>n</var> items.</li>
</ul>
<h3 id="details" class="docs-sub">Details</h3>
<pre class="luz-code-block"><code>&lt;button class="luz-btn"&gt;Save&lt;/button&gt;
&lt;!-- one comment --&gt;</code></pre>
<table class="luz-table">
  <thead><tr><th scope="col">Token</th><th scope="col">Ratio</th></tr></thead>
  <tbody><tr><td data-label="Token"><code>--luz-text</code></td><td data-label="Ratio">7.2:1</td></tr></tbody>
</table>
<div class="docs-example" data-docs-specimen><label for="name">Name</label><input id="name" type="text" placeholder="Your name" aria-label="Full name"><button type="button" class="luz-btn" title="Save it">Save</button></div>
<img src="/apps/docs/assets/diagram.png" alt="A diagram of the layers">
<h2 id="more">More</h2>
<p lang="en">An English term.</p>
<p>Version {{version}}.</p>
<!-- luz:ai files -->
<!-- luz:generated -->`;

  const ES = `<h2 id="intro">Introducción</h2>
<p>Lee <a href="/docs/get-started/">Primeros pasos</a>, luego salta a <a href="#details">los detalles</a> o a <a href="https://github.com/nandovejer/luz">GitHub</a>. La proporción es 4.5:1 y el tamaño es 16 px; hay 3 pasos.</p>
<ul class="docs-list">
  <li>La clase <code>.luz-btn</code> da estilo a un botón.</li>
  <li>Pulsa <kbd>Tab</kbd> para moverte; la salida dice <samp>Saved</samp> para <var>n</var> elementos.</li>
</ul>
<h3 id="details" class="docs-sub">Detalles</h3>
<pre class="luz-code-block"><code>&lt;button class="luz-btn"&gt;Save&lt;/button&gt;
&lt;!-- one comment --&gt;</code></pre>
<table class="luz-table">
  <thead><tr><th scope="col">Símbolo</th><th scope="col">Proporción</th></tr></thead>
  <tbody><tr><td data-label="Símbolo"><code>--luz-text</code></td><td data-label="Proporción">7.2:1</td></tr></tbody>
</table>
<div class="docs-example" data-docs-specimen><label for="name">Nombre</label><input id="name" type="text" placeholder="Tu nombre" aria-label="Nombre completo"><button type="button" class="luz-btn" title="Guárdalo">Guardar</button></div>
<img src="/apps/docs/assets/diagram.png" alt="Un diagrama de las capas">
<h2 id="more">Más</h2>
<p lang="es">Un término inglés.</p>
<p>Versión {{version}}.</p>
<!-- luz:ai files -->
<!-- luz:generated -->`;

  const english = { file: "apps/docs/pages/get-started/parity.html", body: EN, bodyLine: 7 };
  const translation = (body) => ({ file: `${ES_PAGES}/get-started/parity.html`, body, bodyLine: 8 });
  const swap = (from, to) => {
    expect(ES.includes(from), `the translation has ${JSON.stringify(from)}`).toBe(true);
    return ES.replace(from, to);
  };

  it("finds nothing in a translation that changes only the words", async () => {
    await ready();
    expect(parityProblems(english, translation(ES))).toEqual([]);
  });

  it("allows what a translator must change: attribute text, the lang of a term, the text of a demo, the white space between tags", async () => {
    await ready();
    // alt, title, aria-label, placeholder, data-label and lang are compared by presence only
    expect(ES).toContain('alt="Un diagrama de las capas"');
    expect(ES).toContain('<p lang="es">');
    expect(parityProblems(english, translation(ES))).toEqual([]);
    // (the new lines of a <pre> are code: only the white space between tags changes)
    expect(parityProblems(english, translation(ES.replace(/>\n\s*</g, "> <")))).toEqual([]);
    expect(parityProblems(english, translation(ES.replace(/\n(?=<)/g, "\n    ")))).toEqual([]);
  });

  it("reads the digits of Arabic-Indic numerals as the digits they are, so a figure written in them is the same figure", async () => {
    await ready();
    const arabicDigits = swap("4.5:1", "٤.٥:١").replace("16 px", "١٦ px").replace("hay 3 pasos", "hay ٣ pasos").replace("7.2:1", "٧.٢:١");
    expect(arabicDigits).not.toBe(ES);
    expect(parityProblems(english, translation(arabicDigits))).toEqual([]);
  });

  it("points at the translation's file and a line inside it", async () => {
    await ready();
    const problems = parityProblems(english, translation(swap('id="more"', 'id="mas"')));
    expect(problems.length).toBeGreaterThan(0);
    const lines = ES.split("\n").length;
    for (const problem of problems) {
      const m = /^apps\/docs\/i18n\/es\/pages\/get-started\/parity\.html:(\d+): /.exec(problem);
      expect(m, problem).toBeTruthy();
      expect(Number(m[1])).toBeGreaterThanOrEqual(8);
      expect(Number(m[1])).toBeLessThan(8 + lines);
    }
  });

  /** One pair per kind of drift: the translation, and the word of the rule that must say so. */
  const DRIFT = {
    skeleton: [
      ["drops a list item", () => swap(/ {2}<li>La clase[^\n]*\n/.exec(ES)[0], "")],
      ["wraps an element in a new one", () => swap('<h2 id="more">Más</h2>', '<div><h2 id="more">Más</h2></div>')],
      ["changes a class", () => swap('class="docs-list"', 'class="docs-lista"')],
      ["drops the demo marker", () => swap(' data-docs-specimen', "")],
      ["adds a data attribute", () => swap('<td data-label="Símbolo">', '<td data-label="Símbolo" data-x="1">')],
      ["drops an alt (compared by presence)", () => swap(' alt="Un diagrama de las capas"', "")],
      ["changes the target of a label", () => swap('for="name"', 'for="nombre"')],
      ["changes the name of an element", () => swap("<th scope=\"col\">Proporción</th>", "<td scope=\"col\">Proporción</td>")],
    ],
    heading: [
      ["changes an id", () => swap('id="more"', 'id="mas"')],
      ["changes a level", () => swap('<h3 id="details" class="docs-sub">Detalles</h3>', '<h2 id="details" class="docs-sub">Detalles</h2>')],
      ["swaps two headings", () => swap('id="intro"', 'id="TMP"').replace('id="more"', 'id="intro"').replace('id="TMP"', 'id="more"')],
      ["drops a heading", () => swap('<h2 id="more">Más</h2>\n', "")],
      ["adds a heading", () => swap('<h2 id="more">Más</h2>', '<h2 id="extra">Extra</h2>\n<h2 id="more">Más</h2>')],
    ],
    link: [
      ["points a link at another page", () => swap('href="/docs/get-started/"', 'href="/docs/get-started/install/"')],
      ["changes a fragment", () => swap('href="#details"', 'href="#detalles"')],
      ["swaps two links", () => swap('href="/docs/get-started/"', 'href="#TMP"').replace('href="#details"', 'href="/docs/get-started/"').replace('href="#TMP"', 'href="#details"')],
      ["removes a link", () => swap('<a href="#details">los detalles</a>', "los detalles")],
      ["adds a link", () => swap("<p>Versión {{version}}.</p>", '<p>Versión {{version}}. <a href="/docs/">Docs</a></p>')],
      ["changes an external link", () => swap('href="https://github.com/nandovejer/luz"', 'href="https://github.com/nandovejer/luz-ds"')],
    ],
    code: [
      ["translates a comment inside <pre>", () => swap("&lt;!-- one comment --&gt;", "&lt;!-- un comentario --&gt;")],
      ["adds a trailing space inside <pre>", () => swap("--&gt;</code></pre>", "--&gt; </code></pre>")],
      ["changes a class name in <code>", () => swap("<code>.luz-btn</code>", "<code>.luz-boton</code>")],
      ["translates a key in <kbd>", () => swap("<kbd>Tab</kbd>", "<kbd>Tabulador</kbd>")],
      ["translates the text of <samp>", () => swap("<samp>Saved</samp>", "<samp>Guardado</samp>")],
      ["changes a <var>", () => swap("<var>n</var>", "<var>k</var>")],
      ["unwraps a <code>", () => swap("<code>--luz-text</code>", "--luz-text")],
    ],
    // The figures rule (decisions, "Clarifications after the first real Spanish translations"): every figure of
    // the English page must be in the translation, in any order, extras allowed, separators equivalent. The old
    // cases "writes a decimal comma", "swaps two numbers" and "adds a number" encoded the earlier "ordered and
    // exact" rule: they moved to FIGURES_ALLOWED below, where they must now pass.
    figure: [
      ["changes a size", () => swap("16 px", "18 px")],
      ["spells a number out", () => swap("hay 3 pasos", "hay tres pasos")],
      ["drops a figure and writes nothing in its place", () => swap("; hay 3 pasos", "")],
      ["changes a number in a table", () => swap("7.2:1", "7.3:1")],
      ["changes the first part of a ratio", () => swap("4.5:1", "4.6:1")],
      ["changes the second part of a ratio", () => swap("4.5:1", "4.5:2")],
      ["glues the digits of a decimal", () => swap("4.5:1", "45:1")],
    ],
    marker: [
      ["drops the generated marker", () => swap("<!-- luz:generated -->", "")],
      ["changes an AI marker", () => swap("<!-- luz:ai files -->", "<!-- luz:ai rules -->")],
      ["adds an include", () => swap("<!-- luz:generated -->", "<!-- luz:include footer-links -->\n<!-- luz:generated -->")],
      ["swaps the order of two markers", () => swap("<!-- luz:ai files -->\n<!-- luz:generated -->", "<!-- luz:generated -->\n<!-- luz:ai files -->")],
      ["renames a placeholder", () => swap("{{version}}", "{{versions}}")],
      ["drops a placeholder", () => swap("Versión {{version}}.", "Versión.")],
    ],
  };

  for (const [rule, cases] of Object.entries(DRIFT)) {
    describe(`the ${rule} rule`, () => {
      for (const [what, drift] of cases) {
        it(`says so when a translation ${what}`, async () => {
          await ready();
          const body = drift();
          expect(body).not.toBe(ES);
          const problems = parityProblems(english, translation(body));
          expect(problems.length, "the problems found").toBeGreaterThan(0);
          expect(problems.filter((p) => p.includes(rule)), `a problem that names the ${rule} rule, in ${JSON.stringify(problems)}`).not.toEqual([]);
          for (const problem of problems) expect(problem).toMatch(/^apps\/docs\/i18n\/es\/pages\/get-started\/parity\.html:\d+: /);
        });
      }
    });
  }

  /* ---- The figures rule: every figure of the English page, in any order, with extras and equivalent separators ---- */

  /** The problems of a translation whose only difference is the text of one paragraph. */
  const figures = (englishText, translatedText) => parityProblems({ file: "apps/docs/pages/x.html", body: `<p>${englishText}</p>`, bodyLine: 1 }, { file: `${ES_PAGES}/x.html`, body: `<p>${translatedText}</p>`, bodyLine: 1 });

  describe("the figures rule", () => {
    /** [what, English text, translated text]: a translation that must pass. */
    const FIGURES_ALLOWED = [
      ["a decimal comma for a decimal point", "The ratio is 4.5:1.", "La proporción es 4,5:1."],
      ["a decimal comma in a plain decimal", "A scale of 1.25.", "Una escala de 1,25."],
      ["a thousands dot for a thousands comma", "Up to 1,000 items.", "Hasta 1.000 elementos."],
      ["a space as the thousands separator", "Up to 1,000,000 items.", "Hasta 1 000 000 elementos."],
      ["a no-break space (U+00A0) as the thousands separator", "Up to 1,000,000 items.", "Hasta 1\u00a0000\u00a0000 elementos."],
      ["a narrow no-break space (U+202F) as the thousands separator", "Up to 1,000,000 items.", "Hasta 1\u202f000\u202f000 elementos."],
      ["the same thousands comma", "Up to 1,000 items.", "Hasta 1,000 elementos."],
      ["the figures in another order (the old case \"swaps two numbers\")", "Use 16 px and 3 steps.", "Usa 3 pasos y 16 px."],
      ["a reordered sentence", "The WCAG 2.2 criterion 2.4.11 asks for it.", "El criterio 2.4.11 de WCAG 2.2 lo pide."],
      ["extra digits where English wrote words", "Four to ten items.", "De 4 a 10 elementos."],
      ["an extra number (the old case \"adds a number\")", "There are 3 steps.", "Hay 3 pasos (2 opcionales)."],
      ["Arabic-Indic digits with the Arabic decimal and thousands separators", "A ratio of 4.5:1 and 1,000 items.", "نسبة ٤٫٥:١ و ١٬٠٠٠ عنصر."],
    ];
    for (const [what, englishText, translatedText] of FIGURES_ALLOWED) {
      it(`accepts ${what}`, async () => {
        await ready();
        expect(figures(englishText, translatedText)).toEqual([]);
      });
    }

    /** [what, English text, translated text]: a figure dropped or changed, which must still be said. */
    const FIGURES_REFUSED = [
      ["a dropped figure", "The ratio is 4.5:1 and the size 16 px.", "La proporción es 4,5:1 y el tamaño."],
      ["a changed ratio", "The ratio is 4.5:1.", "La proporción es 4.6:1."],
      ["a changed second part of a ratio", "The ratio is 4.5:1.", "La proporción es 4.5:2."],
      ["a changed thousands figure", "Up to 1,000 items.", "Hasta 1.500 elementos."],
      ["a decimal that lost its separator", "The ratio is 4.5:1.", "La proporción es 45:1."],
      ["a criterion that lost a level", "The criterion 2.4.11 asks for it.", "El criterio 2.4 lo pide."],
      ["a figure written as words with no digits kept", "Use 3 steps.", "Usa tres pasos."],
    ];
    for (const [what, englishText, translatedText] of FIGURES_REFUSED) {
      it(`says so for ${what}`, async () => {
        await ready();
        const problems = figures(englishText, translatedText);
        expect(problems.filter((p) => p.includes("figure")), JSON.stringify(problems)).not.toEqual([]);
        for (const problem of problems) expect(problem).toMatch(/^apps\/docs\/i18n\/es\/pages\/x\.html:\d+: /);
      });
    }

    it("does not count a number inside <code> as a figure: it is compared byte for byte by the code rule", async () => {
      await ready();
      const english = { file: "apps/docs/pages/x.html", body: "<p>Use <code>--luz-space-4</code> for the gap.</p>", bodyLine: 1 };
      const same = { file: `${ES_PAGES}/x.html`, body: "<p>Usa <code>--luz-space-4</code> para el hueco.</p>", bodyLine: 1 };
      expect(parityProblems(english, same)).toEqual([]);
      // A changed digit inside the code is a code problem, not a figure one
      const changed = parityProblems(english, { ...same, body: "<p>Usa <code>--luz-space-5</code> para el hueco.</p>" });
      expect(changed.some((p) => p.includes("code"))).toBe(true);
      expect(changed.filter((p) => p.includes("figure"))).toEqual([]);
    });

    it("does not take a figure written inside <code> for the figure of the English text", async () => {
      await ready();
      const problems = figures("The ratio is 4.5:1.", "La proporción es <code>4.5:1</code>.");
      expect(problems.filter((p) => p.includes("figure")), JSON.stringify(problems)).not.toEqual([]);
    });
  });

  /* ---- Attributes a translator may rewrite: compared by presence only ---- */

  describe("attributes compared by presence only", () => {
    const TRANSLATABLE = ["data-error", "data-file", "data-pass", "data-fail", "data-item", "data-set", "data-unreadable", "data-warning", "data-ignored", "data-prompt-title"];
    /** The problems when the translation changes the value of `name` on an element. */
    const attribute = (name, englishValue, translatedValue, { drop = false, tag = "div", extra = "" } = {}) =>
      parityProblems(
        { file: "apps/docs/pages/x.html", body: `<${tag} ${name}="${englishValue}"${extra}>Text</${tag}>`, bodyLine: 1 },
        { file: `${ES_PAGES}/x.html`, body: `<${tag}${drop ? "" : ` ${name}="${translatedValue}"`}${extra}>Texto</${tag}>`, bodyLine: 1 },
      );

    for (const name of TRANSLATABLE) {
      it(`lets a translation say ${name} in its own words`, async () => {
        await ready();
        expect(attribute(name, "No colour found", "No se encontró el color")).toEqual([]);
      });
      it(`still wants ${name} to be there when the English element has it`, async () => {
        await ready();
        const problems = attribute(name, "No colour found", "", { drop: true });
        expect(problems.some((p) => p.includes("skeleton")), JSON.stringify(problems)).toBe(true);
      });
    }

    it("says so when a translation adds a translatable attribute the English element does not have", async () => {
      await ready();
      const problems = parityProblems({ file: "apps/docs/pages/x.html", body: "<div>Text</div>", bodyLine: 1 }, { file: `${ES_PAGES}/x.html`, body: '<div data-error="Algo">Texto</div>', bodyLine: 1 });
      expect(problems.some((p) => p.includes("skeleton")), JSON.stringify(problems)).toBe(true);
    });

    for (const [name, englishValue, translatedValue] of [
      ["data-contrast-result", "a", "b"],
      ["data-items", "3", "4"],
      ["data-errors", "No colour found", "No se encontró el color"],
      ["data-file-name", "button.css", "boton.css"],
      ["data-state", "open", "abierto"],
      ["id", "one", "uno"],
      ["class", "luz-btn", "luz-boton"],
    ]) {
      it(`still says so when a translation changes ${name}`, async () => {
        await ready();
        const problems = attribute(name, englishValue, translatedValue);
        expect(problems.some((p) => p.includes("skeleton")), JSON.stringify(problems)).toBe(true);
      });
    }

    it("still says so when a translation changes an href", async () => {
      await ready();
      const problems = parityProblems(
        { file: "apps/docs/pages/x.html", body: '<p><a href="/docs/get-started/">Start</a></p>', bodyLine: 1 },
        { file: `${ES_PAGES}/x.html`, body: '<p><a href="/docs/get-started/install/">Empieza</a></p>', bodyLine: 1 },
      );
      expect(problems.some((p) => p.includes("link"))).toBe(true);
    });
  });

  it("passes every translation of the fixture site, and finds a real drift in one that was edited", async () => {
    await ready();
    const f = fixture();
    const site = f.scan();
    expect(site.docsI18n, "scanSite(...).docsI18n").toBeTruthy();
    for (const language of site.docsI18n.languages) {
      for (const [route, tr] of language.pages) expect(parityProblems(site.byRoute.get(route), tr), `${language.code} ${route}`).toEqual([]);
    }
    const drifted = fixture({
      translations: { es: { "get-started/index.html": translationSource("es", "get-started/index.html").replace('id="two"', 'id="dos"') } },
    }).scan();
    const problems = parityProblems(drifted.byRoute.get("/docs/get-started/"), docsLanguage(drifted, "es").pages.get("/docs/get-started/"));
    expect(problems.some((p) => p.includes("heading"))).toBe(true);
    expect(problems[0]).toMatch(/^apps\/docs\/i18n\/es\/pages\/get-started\/index\.html:\d+: /);
  });
});

/* ---- Every translation of the real site ------------------------------------------------------------ */

describe("every translation of the real docs", () => {
  const real = scanSite(join(REPO, "apps/docs"), REPO);

  it("is read by the loader from apps/docs/i18n", () => {
    expect(real.docsI18n, "scanSite(...).docsI18n").toBeTruthy();
  });

  it("keeps the parity, the front matter and the reviewer rule of each translation file", async () => {
    expect(real.docsI18n, "scanSite(...).docsI18n").toBeTruthy();
    const { parityProblems } = await docsI18nModule();
    const problems = [];
    for (const language of real.docsI18n.languages) {
      for (const [route, tr] of language.pages) {
        const english = real.byRoute.get(route);
        problems.push(...parityProblems(english, tr));
        if (!/^[0-9a-f]{12}$/.test(tr.meta.source)) problems.push(`${tr.file}: source is not 12 hex characters`);
        if (tr.meta.reviewed !== (tr.meta.reviewer !== undefined && tr.meta.reviewer !== "")) problems.push(`${tr.file}: reviewed and reviewer disagree`);
      }
    }
    expect(problems).toEqual([]);
  });
});

/* ---- The notice ------------------------------------------------------------------------------------------ */

describe("the notice of a translation that no person has reviewed (D16)", () => {
  let mod;

  const pageOf = async (f, code, route) => {
    mod = await docsI18nModule();
    const site = f.scan();
    const localized = mod.localize(site, docsLanguage(site, code));
    const html = renderPage(localized.byRoute.get(`/${code}${route}`), localized, { dev: true });
    return { root: parse(html, `${code} ${route}`), strings: docsLanguage(site, code).docsStrings };
  };
  /** The part of a catalog value that is text of its own: without markup and {placeholders}, the longest. */
  const said = (value) => value.replace(/<[^>]*>/g, "").split(/\{[^}]*\}/).sort((a, b) => b.length - a.length)[0].trim();

  for (const code of ["es", "ar"]) {
    describe(code, () => {
      it("says the translation is pending review, in the language of the page, with a link to the English page", async () => {
        const f = fixture();
        const { root, strings } = await pageOf(f, code, "/docs/get-started/");
        const notices = queryAll(root, "div.docs-notice");
        expect(notices).toHaveLength(1);
        const [notice] = notices;
        expect(hasClass(notice, "luz-alert") && hasClass(notice, "luz-alert--info")).toBe(true);
        expect(notice.attrs.has("role")).toBe(false);
        expect(languageOf(notice)).toBe(code);
        expect(textOf(notice)).toContain(said(strings["notice.pending"]));
        expect(textOf(notice)).not.toContain(said(strings["notice.untranslated"]));
        const english = find(notice, (n) => n.name === "a");
        expect([english?.attrs.get("href"), english?.attrs.get("hreflang")]).toEqual(["/docs/get-started/", "en"]);
        // The content is the translation: not marked as English
        expect(query(root, "div.docs-body").attrs.has("lang")).toBe(false);
      });

      it("says, on the accessibility statement, that the English text prevails", async () => {
        const f = fixture();
        const statement = await pageOf(f, code, "/docs/accessibility/");
        const plain = await pageOf(f, code, "/docs/get-started/");
        const text = textOf(query(statement.root, "div.docs-notice"));
        expect(text).toContain(said(statement.strings["notice.pending-statement"]));
        expect(textOf(query(plain.root, "div.docs-notice"))).not.toContain(said(statement.strings["notice.pending-statement"]));
      });

      it("shows no notice once the page has a reviewer, and the page is otherwise the same", async () => {
        const before = fixture();
        const after = fixture({
          translations: {
            [code]: {
              "get-started/index.html": translationSource(code, "get-started/index.html", { reviewed: true, reviewer: "nandovejer" }),
              "accessibility.html": translationSource(code, "accessibility.html", { reviewed: true, reviewer: "nandovejer" }),
            },
          },
        });
        for (const route of ["/docs/get-started/", "/docs/accessibility/"]) {
          expect(queryAll((await pageOf(before, code, route)).root, "div.docs-notice"), `${route} before`).toHaveLength(1);
          const reviewed = (await pageOf(after, code, route)).root;
          expect(queryAll(reviewed, "div.docs-notice"), `${route} after`).toEqual([]);
          expect(findAll(reviewed, (n) => hasClass(n, "luz-alert") && hasClass(n, "docs-notice"))).toEqual([]);
          expect(query(reviewed, "h1.docs-title")).toBeTruthy();
        }
      });
    });
  }

  it("keeps the notice of a page that is not translated yet different from the pending one, in both languages", async () => {
    const f = fixture();
    for (const code of ["es", "ar"]) {
      const fallback = await pageOf(f, code, "/docs/get-started/other/");
      const pending = await pageOf(f, code, "/docs/get-started/");
      expect(textOf(query(fallback.root, "div.docs-notice"))).toContain(said(fallback.strings["notice.untranslated"]));
      expect(textOf(query(pending.root, "div.docs-notice"))).toContain(said(pending.strings["notice.pending"]));
      expect(said(fallback.strings["notice.untranslated"])).not.toBe(said(pending.strings["notice.pending"]));
    }
  });

  it("shows the notice of a translated page only on that page, not on the English one", async () => {
    await docsI18nModule();
    const f = fixture();
    const site = f.scan();
    const html = renderPage(site.byRoute.get("/docs/get-started/"), site, { dev: true });
    expect(queryAll(parse(html, "en"), "div.docs-notice")).toEqual([]);
  });
});
