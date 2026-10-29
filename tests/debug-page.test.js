/**
 * The /debug/ page (plan luz-final-refactor, section E): one generated document with every
 * bare HTML tag, the layout objects, the core components and the catalog patterns, one under
 * another, to look at by hand whether anything broke. Owner's decisions, 2026-10-27.
 *
 * Source only, no browser: the page as buildSite() renders it (tests/helpers/debug-page.js
 * says where each expectation comes from, and the markup hooks the page has). The browser half
 * is tests/debug-page.spec.js; the join of ids is tests/debug-ids.test.js.
 *
 *   1  the route: /debug/ at the root of the site, English only, an entry of the Pages build,
 *      answered by the dev server
 *   2  the order: the four groups, html tags, layout objects, core components, catalog
 *   3  generated: a block for every element of the fixture and for every component and pattern
 *      page with an Example, with its name, its file and its docs page above the demo
 *   4  no id twice, and no reference broken by the join
 *   5  isolated: only the published CSS and JS of tokens, core and catalog; its own header
 *   6  not indexed: noindex, and absent from the search, llms.txt, llms-full.txt, A-Z, the sidebar
 *   7  linked from the accessibility statement and from Make it yours, in English and Spanish
 */
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { docsSite } from "../scripts/docs-site/plugin.js";
import { renderLlmsFull, renderLlmsTxt } from "../scripts/docs-site/ai.js";
import { buildSearchIndex } from "../scripts/docs-site/site.js";
import { PAGES_BASE, SITE_URL } from "../vite.config.js";
import {
  DEBUG_ROUTE,
  GROUPS,
  LAYOUT_ROUTE,
  blockNamed,
  blocksOf,
  buildReal,
  catalogPages,
  componentStylesheets,
  corePages,
  debugTree,
  descendants,
  elementCards,
  findAll,
  groupNamed,
  groupsOf,
  hasClass,
  htmlElements,
  idsIn,
  layoutObjects,
  luzNamesIn,
  parse,
  query,
  renderedDebug,
  repo,
  site,
  stylesheetOf,
  textOf,
  unresolvedIn,
  referencesIn,
} from "./helpers/debug-page.js";

/** A link to the page, quoted or not (the home is written without quotes); another site's /debug/ path is not it. */
const LINK_TO_DEBUG = /href=["']?\/debug\//;
// The first test builds the whole site, in every language
vi.setConfig({ testTimeout: 120_000 });

const attr = (name, value) => (n) => (value === undefined ? n.attrs.has(name) : n.attrs.get(name) === value);
const all = (node, test) => findAll(node, test);
const named = (name) => (n) => n.name === name;

/* ---- 1. The route -------------------------------------------------------- */

describe("the route of the page", () => {
  it("is a document of the site at /debug/, English, and no other language has a copy", () => {
    const html = renderedDebug();
    expect(html).toMatch(/^<!DOCTYPE html>/i);
    const root = debugTree();
    expect(all(root, named("html"))[0].attrs.get("lang")).toBe("en");
    const copies = [...buildReal().rendered.keys()].filter((route) => /\/debug\/$/.test(route));
    expect(copies, "the routes that end in /debug/").toEqual([DEBUG_ROUTE]);
  });

  it("is an entry of the Pages build (docs/debug/index.html), like every page of the site", () => {
    const options = { repoRoot: repo, relative: true, outRoot: join(tmpdir(), "luz-debug-page-out"), pagesBase: PAGES_BASE, siteUrl: SITE_URL };
    const { build } = docsSite(options).config();
    expect(Object.keys(build.rollupOptions.input)).toContain("debug/index");
  });

  it("is answered by the dev server: /debug redirects to /debug/, and /debug/ is routed to a source", async () => {
    const middlewares = [];
    docsSite({ repoRoot: repo, relative: false, outRoot: join(tmpdir(), "luz-debug-page-out") }).configureServer({
      watcher: { on() {} },
      ws: { send() {} },
      middlewares: { use: (fn) => middlewares.push(fn) },
      transformIndexHtml: async (_file, html) => html,
    });
    const serve = (url) =>
      new Promise((done) => {
        const headers = {};
        const req = { url, originalUrl: url };
        const res = { statusCode: 200, setHeader: (k, v) => (headers[k.toLowerCase()] = v), end: (body) => done({ headers, body, statusCode: res.statusCode, req }) };
        middlewares[0](req, res, () => done({ next: true, req }));
      });
    const bare = await serve("/debug");
    expect(bare.statusCode, "/debug without its slash").toBe(301);
    expect(bare.headers.location).toBe(DEBUG_ROUTE);
    const got = await serve(DEBUG_ROUTE);
    // Either the plugin wrote the document itself, or it pointed the request at the file Vite serves
    const answered = got.next === undefined && got.statusCode === 200 && String(got.body).length > 0;
    const rewritten = got.next === true && got.req.url !== DEBUG_ROUTE && existsSync(join(repo, got.req.url.split("?")[0]));
    expect(answered || rewritten, `the dev server turns ${DEBUG_ROUTE} into a document (got ${JSON.stringify({ next: got.next, status: got.statusCode, url: got.req.url })})`).toBe(true);
  }, 120_000);
});

/* ---- 2. The order -------------------------------------------------------- */

describe("the order of the content", () => {
  it("has four groups, in this order: the HTML tags, the layout objects, the core components, the catalog", () => {
    const groups = groupsOf(debugTree());
    expect(groups.map((g) => g.attrs.get("data-debug-group"))).toEqual(GROUPS);
    for (const g of groups) expect(g.attrs.get("id"), `the ${g.attrs.get("data-debug-group")} group has an id`).toBeTruthy();
  });

  it("puts every block inside its group, and every group has blocks", () => {
    const root = debugTree();
    const inGroups = groupsOf(root).flatMap((g) => blocksOf(g));
    expect(blocksOf(root)).toHaveLength(inGroups.length);
    for (const name of GROUPS) expect(blocksOf(groupNamed(root, name)).length, name).toBeGreaterThan(0);
  });
});

/* ---- 3. Generated: nothing typed ----------------------------------------- */

/** The header of every block: its name, its file and its docs page, all before the demo. */
function expectHeaderAbove(block, label) {
  const name = query(block, ".debug-block__name");
  const file = query(block, ".debug-block__file");
  const docs = findAll(block, (n) => n.name === "a" && hasClass(n, "debug-block__docs"))[0];
  expect(name, `${label}: its name`).toBeTruthy();
  expect(file, `${label}: its file`).toBeTruthy();
  expect(docs, `${label}: its docs link`).toBeTruthy();
  expect(textOf(name), `${label}: the name is not empty`).not.toBe("");
  expect(textOf(file), `${label}: the file is not empty`).not.toBe("");
  const href = docs.attrs.get("href");
  expect(href, `${label}: the docs link is root-absolute`).toMatch(/^\/docs\/[a-z0-9/-]*\/(#[^\s]*)?$/);
  const last = Math.max(name.open.index, file.open.index, docs.open.index);
  // The first element of the demo (a class or a tag of LUZ of its own) comes after the header
  const own = (n) => n.name.startsWith("luz-") || (n.attrs.get("class") ?? "").split(/\s+/).some((c) => /^(luz-|o-|u-)/.test(c));
  const demo = [...descendants(block)].find(own);
  if (demo) expect(demo.open.index, `${label}: the demo comes after its header`).toBeGreaterThan(last);
  return { name, file, docs, href };
}

describe("the bare HTML tags", () => {
  const root = () => debugTree();
  const group = () => groupNamed(root(), "html");

  it("has a block for every tag of tests/fixtures/html-elements.json, and no other", () => {
    const names = blocksOf(group()).map((b) => b.attrs.get("data-debug-name"));
    expect([...names].sort()).toEqual(htmlElements().map((e) => e.name).sort());
  });

  it("shows each tag as its card does on /docs/html/: the markup of its demo, or its snippet", () => {
    const cards = elementCards();
    for (const element of htmlElements()) {
      const block = blockNamed(group(), element.name);
      const entry = cards.get(element.name);
      expect(entry, `${element.name} has a card on the docs`).toBeTruthy();
      const stage = findAll(entry.card, (n) => hasClass(n, "elements-stage"))[0];
      if (stage) {
        const tags = new Set([...descendants(stage)].map((n) => n.name));
        if (tags.has(element.name)) expect(findAll(block, named(element.name)).length, `<${element.name}> is in its block`).toBeGreaterThan(0);
        for (const tag of tags) expect(findAll(block, named(tag)).length, `<${tag}> of the demo of <${element.name}>`).toBeGreaterThan(0);
      } else {
        expect(findAll(block, named("pre")).length, `<${element.name}> has no live demo: its snippet is shown`).toBeGreaterThan(0);
      }
    }
  });

  it("puts above each its name, its file (elements/<category>.css) and a link to its card on the docs", () => {
    const cards = elementCards();
    for (const element of htmlElements()) {
      const block = blockNamed(group(), element.name);
      const { name, file, href } = expectHeaderAbove(block, `<${element.name}>`);
      expect(textOf(name).toLowerCase(), `<${element.name}>: the name`).toContain(element.name);
      if (element.styledBy) expect(textOf(file), `<${element.name}>: the file`).toContain(element.styledBy);
      expect(href.split("#")[0], `<${element.name}>: its docs page`).toBe(cards.get(element.name).route);
    }
  });
});

describe("the layout objects", () => {
  it("shows each object its page labels in the examples (.o-stack, .o-row...), with a link to the layout page", () => {
    const group = groupNamed(debugTree(), "objects");
    const objects = layoutObjects();
    expect(objects.length, "the layout page names objects").toBeGreaterThan(0);
    for (const object of objects) {
      expect(findAll(group, (n) => n.attrs.get("class")?.split(/\s+/).includes(object.slice(1))).length, `${object} is on the page`).toBeGreaterThan(0);
    }
    const links = findAll(group, (n) => n.name === "a" && hasClass(n, "debug-block__docs")).map((a) => a.attrs.get("href").split("#")[0]);
    expect(links).toContain(LAYOUT_ROUTE);
    for (const block of blocksOf(group)) expectHeaderAbove(block, `objects ${block.attrs.get("data-debug-name")}`);
  });
});

/** The checks of a group of components or patterns, each page of the docs with an Example. */
function componentGroup(name, pages) {
  describe(`the ${name === "core" ? "core components" : "catalog components and patterns"}`, () => {
    const group = () => groupNamed(debugTree(), name);

    it("has a block for every page of the docs that has an Example, named like the page", () => {
      const names = blocksOf(group()).map((b) => b.attrs.get("data-debug-name"));
      expect(new Set(names).size, "a block is not repeated").toBe(names.length);
      const missing = pages().map((p) => p.slug).filter((slug) => !names.includes(slug));
      expect(missing, `pages of the docs without a block in ${name}`).toEqual([]);
      expect(pages().length).toBeGreaterThan(0);
    });

    it("shows in each block the classes and the elements of the Example of its page", () => {
      for (const p of pages()) {
        const block = blockNamed(group(), p.slug);
        const have = luzNamesIn(block);
        const missing = [...luzNamesIn(p.specimen)].filter((n) => !have.has(n));
        expect(missing, `${p.route}: what its Example shows and its block does not`).toEqual([]);
      }
    });

    it("puts above each its name, its file and a link to its page on the docs", () => {
      for (const p of pages()) {
        const { name, file, href } = expectHeaderAbove(blockNamed(group(), p.slug), p.route);
        expect(textOf(name).toLowerCase(), `${p.route}: the name`).toContain(p.title.toLowerCase());
        const css = stylesheetOf(p.files);
        if (css) expect(textOf(file), `${p.route}: the file`).toContain(css);
        expect(href, `${p.route}: its page`).toBe(p.route);
      }
    });
  });
}
componentGroup("core", corePages);
componentGroup("catalog", catalogPages);

/* ---- 4. No id twice ------------------------------------------------------ */

describe("the ids of the joined demos", () => {
  it("has no id twice on the page", () => {
    const seen = new Map();
    for (const id of idsIn(debugTree())) seen.set(id, (seen.get(id) ?? 0) + 1);
    expect([...seen].filter(([, n]) => n > 1).map(([id]) => id)).toEqual([]);
  });

  it("keeps every reference of a demo pointing at an id of the same demo: the join breaks none", () => {
    const sources = new Map([
      ...corePages().map((p) => [`core:${p.slug}`, p.specimen]),
      ...catalogPages().map((p) => [`catalog:${p.slug}`, p.specimen]),
      ...[...elementCards()].map(([tag, { card }]) => [`html:${tag}`, card]),
    ]);
    let checked = 0;
    for (const group of groupsOf(debugTree())) {
      for (const block of blocksOf(group)) {
        const source = sources.get(`${group.attrs.get("data-debug-group")}:${block.attrs.get("data-debug-name")}`);
        if (!source) continue;
        checked += 1;
        expect(unresolvedIn(block), `${group.attrs.get("data-debug-group")} ${block.attrs.get("data-debug-name")}: references left pointing outside the block (its source leaves ${unresolvedIn(source)})`).toBeLessThanOrEqual(unresolvedIn(source));
      }
    }
    expect(checked, "the blocks compared with their source").toBeGreaterThan(0);
    // ... and the demos do have references to keep: the page would pass this for the wrong reason without them
    expect(referencesIn(debugTree()).length).toBeGreaterThan(0);
  });
});

/* ---- 5. Isolated: its own header and the published files only ------------- */

describe("isolated from the site", () => {
  const sheets = () => all(debugTree(), (n) => n.name === "link" && /\bstylesheet\b/.test(n.attrs.get("rel") ?? "")).map((n) => n.attrs.get("href"));
  const scripts = () => all(debugTree(), (n) => n.name === "script" && n.attrs.has("src")).map((n) => n.attrs.get("src"));

  it("links only the published CSS of tokens, core and catalog: the tokens, luz.css and every catalog component", () => {
    const list = sheets();
    for (const href of list) expect(href, "a stylesheet outside the packages' dist").toMatch(/^\/packages\/(tokens|core|catalog)\/dist\//);
    expect(list).toContain("/packages/tokens/dist/luz-tokens.css");
    expect(list).toContain("/packages/core/dist/luz.css");
    const catalog = componentStylesheets("catalog");
    expect(catalog.length).toBeGreaterThan(0);
    for (const file of catalog) {
      const href = `/packages/catalog/dist/components/${file}`;
      expect(list, `${file} of catalog`).toContain(href);
      expect(list.indexOf(href), `${file} comes after luz.css`).toBeGreaterThan(list.indexOf("/packages/core/dist/luz.css"));
    }
  });

  it("loads core's luz.js and catalog's catalog.js, and no script of the docs or of the site", () => {
    const list = scripts();
    expect(list.some((src) => /^\/packages\/core\/dist\/luz(\.min)?\.js$/.test(src)), "luz.js").toBe(true);
    expect(list.some((src) => /^\/packages\/catalog\/dist\/catalog(\.min)?\.js$/.test(src)), "catalog.js").toBe(true);
    for (const src of list) expect(src, "a script of the docs app or of the site").not.toMatch(/\/apps\/(docs|site|landing)\//);
    const preloads = all(debugTree(), (n) => n.name === "link" && /\b(modulepreload|preload)\b/.test(n.attrs.get("rel") ?? "")).map((n) => n.attrs.get("href"));
    for (const href of preloads) expect(href).not.toMatch(/\/apps\/(docs|site|landing)\//);
  });

  it("has no header and no footer of the site: only its own header, with the controls", () => {
    const body = all(debugTree(), named("body"))[0];
    const headers = body.children.filter(named("header"));
    expect(headers).toHaveLength(1);
    expect(headers[0].attrs.has("data-debug-controls")).toBe(true);
    expect(body.children.filter(named("footer"))).toHaveLength(0);
  });

  it("has the mode selector (light, dark, high-contrast), the dir toggle and an index with anchors", () => {
    const controls = all(debugTree(), attr("data-debug-controls"))[0];
    const mode = all(controls, attr("data-debug-mode"))[0];
    expect(mode, "select[data-debug-mode]").toBeTruthy();
    expect(mode.name).toBe("select");
    const values = all(mode, named("option")).map((o) => o.attrs.get("value"));
    for (const m of ["light", "dark", "high-contrast"]) expect(values).toContain(m);
    const rtl = all(controls, attr("data-debug-rtl"))[0];
    expect(rtl, "input[data-debug-rtl]").toBeTruthy();
    expect([rtl.name, rtl.attrs.get("type")]).toEqual(["input", "checkbox"]);

    const index = all(controls, attr("data-debug-index"))[0] ?? all(debugTree(), attr("data-debug-index"))[0];
    expect(index, "nav[data-debug-index]").toBeTruthy();
    const targets = all(index, (n) => n.name === "a").map((a) => a.attrs.get("href"));
    for (const g of groupsOf(debugTree())) expect(targets, `the index links the ${g.attrs.get("data-debug-group")} group`).toContain(`#${g.attrs.get("id")}`);
    for (const b of blocksOf(debugTree())) {
      expect(b.attrs.get("id"), `${b.attrs.get("data-debug-name")} has an id`).toBeTruthy();
      expect(targets, `the index links ${b.attrs.get("data-debug-name")}`).toContain(`#${b.attrs.get("id")}`);
    }
    const ids = new Set(idsIn(debugTree()));
    for (const t of targets) expect(ids.has(t.slice(1)), `${t} is an id of the page`).toBe(true);
  });
});

/* ---- 6. Not indexed ------------------------------------------------------- */

describe("a page that is not indexed", () => {
  it("says noindex, nofollow to the robots", () => {
    const robots = all(debugTree(), (n) => n.name === "meta" && n.attrs.get("name") === "robots");
    expect(robots).toHaveLength(1);
    expect(robots[0].attrs.get("content").split(/\s*,\s*/).sort()).toEqual(["nofollow", "noindex"]);
  });

  it("is not in the search index of the docs", () => {
    renderedDebug();
    const index = buildSearchIndex(site);
    const urls = [...index.pages, ...index.sections, ...index.elements].map((e) => e[1]);
    expect(urls.filter((u) => u.includes("debug"))).toEqual([]);
  });

  it("is not in llms.txt, nor in llms-full.txt", () => {
    renderedDebug();
    expect(renderLlmsTxt(site, { siteUrl: "" })).not.toMatch(/\/debug\//);
    expect(renderLlmsTxt(site, { siteUrl: SITE_URL })).not.toMatch(/\/debug\//);
    const full = renderLlmsFull(site, { siteUrl: "" });
    expect(full.split("\n").filter((l) => /^URL: .*\/debug\//.test(l))).toEqual([]);
  });

  it("is not in the A-Z index, nor in the sidebar, the rail or the breadcrumb of any docs page", () => {
    renderedDebug();
    const { rendered } = buildReal();
    for (const route of ["/docs/a-z/", "/docs/a-z/m-z/", "/docs/", "/docs/components/button/", "/docs/html/", "/docs/catalog/", "/es/docs/components/button/"]) {
      expect(rendered.get(route), route).toBeTruthy();
      expect(rendered.get(route), route).not.toMatch(LINK_TO_DEBUG);
    }
  });

  it("is not written as Markdown by the build: no index.md under /debug/", () => {
    renderedDebug();
    const emitted = [];
    docsSite({ repoRoot: repo, relative: true, outRoot: join(tmpdir(), "luz-debug-page-out"), pagesBase: PAGES_BASE, siteUrl: SITE_URL }).generateBundle.call({ emitFile: (f) => emitted.push(f.fileName) });
    expect(emitted.filter((f) => f.startsWith("debug/"))).toEqual([]);
  });
});

/* ---- 7. Linked from the docs ---------------------------------------------- */

describe("links to it from the docs", () => {
  const LINKED = ["/docs/accessibility/", "/docs/get-started/make-it-yours/", "/es/docs/accessibility/", "/es/docs/get-started/make-it-yours/"];

  it("has one line with a link in the accessibility statement and one in Make it yours, in English and in Spanish", () => {
    renderedDebug();
    const { rendered } = buildReal();
    for (const route of LINKED) {
      const html = rendered.get(route);
      expect(html, route).toBeTruthy();
      const links = findAll(parse(html, route), (n) => n.name === "a" && n.attrs.get("href") === DEBUG_ROUTE);
      expect(links, `${route}: links to ${DEBUG_ROUTE}`).toHaveLength(1);
      expect(textOf(links[0]), `${route}: the link has text`).not.toBe("");
    }
  });

  it("has no other page of the docs that links to it", () => {
    renderedDebug();
    const { rendered } = buildReal();
    const linking = [...rendered].filter(([route, html]) => route !== DEBUG_ROUTE && LINK_TO_DEBUG.test(html)).map(([route]) => route);
    expect(linking.sort()).toEqual([...LINKED].sort());
  });

  it("builds with every link of the site resolving, the new ones included", () => {
    renderedDebug();
    expect(buildReal().problems).toEqual([]);
  });
});
