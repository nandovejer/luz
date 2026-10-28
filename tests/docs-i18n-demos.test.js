/**
 * The demos of a translated docs page stay English, and say so (decisions,
 * "Clarifications after the first real Spanish translations": "Demos stay
 * English in translated pages (first delivery)").
 *
 * The export of the translation tools skipped the live LUZ markup of a page:
 * `[data-docs-specimen]`, `.luz-do-dont__stage` (from @luz-ds/docs) and
 * `.docs-snippet`. So in a page of a language the generator marks each of
 * those containers `lang="en"`, and `dir="ltr"` when the page is right to
 * left (<html dir="rtl">), unless the translation's own markup gives that
 * container a `lang`: then it keeps its own. An English page and a page that
 * is not translated yet (the fallback: its body already says lang="en") get no
 * new attribute. The attribute is written at render time: the parity of a
 * translation with its English page never counts it.
 */
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { renderPage, scanSite } from "../scripts/docs-site/site.js";
import { findAll, hasClass, parse, query } from "./helpers/html-dom.js";
import { PAGES, REPO, docsI18nFixture, docsLanguage, docsI18nModule, hashOf, pageSource } from "./helpers/docs-i18n-fixture.js";

const made = [];
const fixture = (options) => {
  const f = docsI18nFixture(options);
  made.push(f);
  return f;
};
afterEach(() => made.splice(0).forEach((f) => f.cleanup()));

/** The three kinds of container, by the class or the attribute that marks them. */
const KINDS = {
  specimen: (n) => n.attrs.has("data-docs-specimen"),
  "do and don't stage": (n) => hasClass(n, "luz-do-dont__stage"),
  snippet: (n) => hasClass(n, "docs-snippet"),
};
const containers = (root) => findAll(root, (n) => Object.values(KINDS).some((is) => is(n)));

/* ---- A page with all three kinds of demo ---------------------------------------------------- */

const widgetMeta = PAGES["components/widget.html"].meta;
/** The body of the widget page, in English (`t` = identity) or in a language; `own` gives the specimen its own lang. */
const widgetBody = (t = (text) => text, own = "") =>
  [
    `<h2 id="example">${t("Example")}</h2>`,
    `<div class="docs-example"${own} data-docs-specimen><button type="button" class="luz-btn">${t("Save")}</button></div>`,
    `<h2 id="known-issues">${t("Known issues")}</h2>`,
    "<p>None known.</p>",
    `<h2 id="code">${t("Code")}</h2>`,
    `<h3 id="markup">${t("Copy the markup")}</h3>`,
    `<div class="docs-snippet"><pre class="luz-code-block"><code>&lt;button class="luz-btn"&gt;Save&lt;/button&gt;</code></pre></div>`,
    `<h3 id="do-dont">${t("Do and don't")}</h3>`,
    `<div class="luz-do-dont__stage" inert aria-hidden="true"><button type="button" class="luz-btn">${t("Delete")}</button></div>`,
  ].join("\n");

const WORDS = { Example: "Ejemplo", Save: "Guardar", "Known issues": "Problemas conocidos", Code: "Código", "Copy the markup": "Copia el marcado", "Do and don't": "Qué hacer y qué no", Cancel: "Cancelar", Delete: "Borrar" };
const spanish = (text) => WORDS[text] ?? text;

const WIDGET = "components/widget.html";
const english = pageSource(widgetMeta, widgetBody());
const translation = ({ own = "", reviewed = true } = {}) =>
  pageSource({ title: "Widget", description: "Un widget hace una sola cosa.", source: hashOf(widgetBody()), reviewed: String(reviewed), ...(reviewed ? { reviewer: "nandovejer" } : {}) }, widgetBody(spanish, own));

/** A fixture with the widget page in English and translated in Spanish and Arabic (`own` goes on the specimen of both). */
const withWidget = ({ own = "", translated = true } = {}) =>
  fixture({
    pages: { [WIDGET]: english },
    translations: translated ? { es: { [WIDGET]: translation({ own }) }, ar: { [WIDGET]: translation({ own }) } } : {},
  });

/** The rendered widget page of a language, parsed. */
async function pageOf(f, code) {
  const mod = await docsI18nModule();
  const site = f.scan();
  const localized = mod.localize(site, docsLanguage(site, code));
  const page = localized.byRoute.get(`/${code}/docs/components/widget/`);
  return { root: parse(renderPage(page, localized, { dev: true }), `${code} widget`), page };
}

describe("a translated page marks its demos as English", () => {
  for (const code of ["es", "ar"]) {
    for (const [kind, is] of Object.entries(KINDS)) {
      it(`${code}: every ${kind} carries lang="en"`, async () => {
        const { root } = await pageOf(withWidget(), code);
        const found = findAll(root, is);
        expect(found.length, `a ${kind} in the rendered page`).toBeGreaterThan(0);
        for (const node of found) expect(node.attrs.get("lang"), `<${node.name} class="${node.attrs.get("class") ?? ""}">`).toBe("en");
      });
    }
  }

  it("ar: a demo of a right-to-left page is also dir=\"ltr\"", async () => {
    const { root } = await pageOf(withWidget(), "ar");
    expect(query(root, "html").attrs.get("dir")).toBe("rtl");
    const found = containers(root);
    expect(found.length).toBeGreaterThan(0);
    for (const node of found) expect(node.attrs.get("dir"), `<${node.name} class="${node.attrs.get("class") ?? ""}">`).toBe("ltr");
  });

  it("es: the page is left to right, so a demo gets no dir=\"rtl\" (and the page keeps its own lang)", async () => {
    const { root } = await pageOf(withWidget(), "es");
    expect(query(root, "html").attrs.get("dir")).toBe("ltr");
    for (const node of containers(root)) expect(node.attrs.get("dir")).not.toBe("rtl");
    expect(query(root, "div.docs-body").attrs.has("lang"), "the body of a translated page is not marked").toBe(false);
  });

  it("marks the demos and nothing else: inside the body, exactly the containers carry lang=\"en\"", async () => {
    const { root } = await pageOf(withWidget(), "es");
    const body = query(root, "div.docs-body");
    const marked = findAll(body, (n) => n.attrs.get("lang") === "en");
    const demos = containers(body);
    expect(demos.length).toBeGreaterThan(0);
    expect(marked).toEqual(demos);
  });

  it("keeps the lang a translation gives a demo itself, for that demo only", async () => {
    for (const code of ["es", "ar"]) {
      const { root } = await pageOf(withWidget({ own: ' lang="es"' }), code);
      const specimen = findAll(root, KINDS.specimen);
      expect(specimen).toHaveLength(1);
      expect(specimen[0].attrs.get("lang"), `${code}: the specimen's own lang`).toBe("es");
      // The other demos of the page are still English
      for (const node of findAll(root, (n) => KINDS["do and don't stage"](n) || KINDS.snippet(n))) expect(node.attrs.get("lang"), `${code}: <${node.name}>`).toBe("en");
    }
  });
});

describe("an English page and a page that is not translated yet get no new attribute", () => {
  it("the English page: no lang and no dir on a demo", async () => {
    const site = withWidget().scan();
    const root = parse(renderPage(site.byRoute.get("/docs/components/widget/"), site, { dev: true }), "en widget");
    const found = containers(root);
    expect(found.length, "demos in the English page").toBeGreaterThan(0);
    for (const node of found) {
      expect(node.attrs.has("lang"), `<${node.name}> lang`).toBe(false);
      expect(node.attrs.has("dir"), `<${node.name}> dir`).toBe(false);
    }
  });

  for (const code of ["es", "ar"]) {
    it(`${code}: a fallback page marks nothing on its demos: its body already says lang="en"`, async () => {
      const { root, page } = await pageOf(withWidget({ translated: false }), code);
      expect(page.fallback).toBe(true);
      const found = containers(root);
      expect(found.length, "demos in the fallback page").toBeGreaterThan(0);
      for (const node of found) {
        expect(node.attrs.has("lang"), `<${node.name}> lang`).toBe(false);
        expect(node.attrs.has("dir"), `<${node.name}> dir`).toBe(false);
      }
      expect(query(root, "div.docs-body").attrs.get("lang")).toBe("en");
    });
  }
});

describe("parity does not count the attribute of a demo", () => {
  it("the translation as written has no lang or dir on its demos, and passes the parity", async () => {
    const { parityProblems } = await docsI18nModule();
    const site = withWidget().scan();
    for (const code of ["es", "ar"]) {
      const tr = docsLanguage(site, code).pages.get("/docs/components/widget/");
      expect(parityProblems(site.byRoute.get("/docs/components/widget/"), tr), code).toEqual([]);
    }
  });

  it("a translation that gives a demo its own lang (or a dir) is not a skeleton problem", async () => {
    // Inferred from "parity must not count the generated attribute": the translator's own lang on a demo container
    // is the one allowed way to override the generated one, so it cannot be drift.
    const { parityProblems } = await docsI18nModule();
    const site = withWidget({ own: ' lang="es"' }).scan();
    const tr = docsLanguage(site, "es").pages.get("/docs/components/widget/");
    expect(tr.body).toContain('lang="es" data-docs-specimen');
    expect(parityProblems(site.byRoute.get("/docs/components/widget/"), tr)).toEqual([]);
  });
});

describe("the demos of the real translated pages", () => {
  const real = scanSite(join(REPO, "apps/docs"), REPO);

  it("carry lang=\"en\" in every page the Spanish translation has, whatever the kind of demo", async () => {
    expect(real.docsI18n, "scanSite(...).docsI18n").toBeTruthy();
    const mod = await docsI18nModule();
    const es = docsLanguage(real, "es");
    const localized = mod.localize(real, es);
    let seen = 0;
    const wrong = [];
    for (const route of ["/es/docs/components/button/", "/es/docs/components/card/", "/es/docs/components/form/"]) {
      const page = localized.byRoute.get(route);
      expect(page.fallback, `${route} is translated`).toBe(false);
      const root = parse(renderPage(page, localized, { dev: true }), route);
      for (const node of containers(root)) {
        seen++;
        if (node.attrs.get("lang") !== "en") wrong.push(`${route} <${node.name} class="${node.attrs.get("class") ?? ""}"${node.attrs.has("data-docs-specimen") ? " data-docs-specimen" : ""}>`);
      }
    }
    expect(seen, "demos found in the real pages").toBeGreaterThan(10);
    expect(wrong).toEqual([]);
  });
});
