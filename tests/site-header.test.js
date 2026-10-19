/**
 * The shared site header, as the generator writes it (apps/site/_partials/header.html and
 * site-links.html, rendered on the home page in its three languages, on a docs page and on the
 * not-found page): what the markup says before any browser lays it out. The look and the behaviour
 * are in tests/site-header.spec.js.
 *
 * - Brand: the logo is the link to the home, named "LUZ" for a screen reader with no visible text;
 *   beside it "v<version> beta" is a link to the changelog, not a tag.
 * - No Home link in the row. The end of the row, in this order: Documentation, GitHub, Search,
 *   Language (the docs have no language switch), then the menu button. Each has an icon.
 * - The colour mode is not in the header.
 * - The search dialog has no "Popular" block.
 * - The drawer: the home lists its sections, then Documentation and GitHub, then the languages; the
 *   docs have their sidebar.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildSite, landingDocuments, scanSite } from "../scripts/docs-site/site.js";
import { find, findAll, hasClass, isInside, parse, query, textOf } from "./helpers/html-dom.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(repo, file), "utf-8");
const { version } = JSON.parse(read("packages/core/package.json"));
const GITHUB = "https://github.com/nandovejer/luz";

const site = scanSite(join(repo, "apps/docs"), repo);
const landing = landingDocuments(site, "apps/landing/index.html", read("apps/landing/index.html"));
const homes = landing.map((d) => d.route);
const { rendered } = buildSite(site, { extra: landing });
const treeOf = (route) => parse(rendered.get(route), route);
const headerOf = (route) => query(treeOf(route), "header.site-header");
const links = (node) => findAll(node, (n) => n.name === "a");
const href = (a) => a.attrs.get("href");

const DOCS_PAGES = ["/docs/", "/docs/components/button/"];
/** Where the Documentation link of a page goes: Spanish docs from the Spanish home, English docs from the others (Arabic docs are planned; owner, 2026-10-19). */
const DOCS_OF = { "/": "/docs/", "/es/": "/es/docs/", "/ar/": "/docs/" };
const docsHref = (route) => DOCS_OF[route] ?? "/docs/";
const catalog = (code) => JSON.parse(read(`apps/landing/i18n/${code}.json`));

/** The text a sighted reader sees in a node: its text without the visually hidden parts. */
const visibleText = (node) => {
  const hidden = findAll(node, (n) => hasClass(n, "u-sr-only")).map((n) => textOf(n));
  let text = textOf(node);
  for (const part of hidden) text = text.replace(part, "");
  return text.replace(/\s+/g, " ").trim();
};

describe("the header's brand", () => {
  for (const route of [...homes, ...DOCS_PAGES]) {
    const home = homes.includes(route) ? route : "/";

    it(`${route}: the logo links to the home (${home}) and is named LUZ with no visible text`, () => {
      const brand = links(headerOf(route))[0];
      expect(href(brand)).toBe(home);
      expect(find(brand, (n) => n.name === "svg"), "the logo is drawn").toBeTruthy();
      expect(visibleText(brand), "no visible text").toBe("");
      const name = brand.attrs.get("aria-label") ?? textOf(brand);
      expect(name).toBe("LUZ");
    });

    it(`${route}: the version is a link to the changelog, v${version} beta, next to the logo and not a tag`, () => {
      const header = headerOf(route);
      const all = links(header);
      const changelog = all.find((a) => /\/CHANGELOG\.md$/.test(href(a) ?? ""));
      expect(changelog, "a link to CHANGELOG.md").toBeTruthy();
      expect(visibleText(changelog)).toBe(`v${version} beta`);
      expect(all.indexOf(changelog), "right after the logo").toBe(1);
      expect(findAll(header, (n) => hasClass(n, "luz-tag")), "no tag in the header").toEqual([]);
    });
  }

  it("the version links to the changelog the home page's footer links to", () => {
    for (const route of homes) {
      const tree = treeOf(route);
      const footerChangelog = links(query(tree, "footer")).find((a) => /\/CHANGELOG\.md$/.test(href(a) ?? ""));
      expect(footerChangelog, `${route}: the footer has a changelog link`).toBeTruthy();
      const own = links(headerOf(route)).find((a) => /\/CHANGELOG\.md$/.test(href(a) ?? ""));
      expect(href(own), route).toBe(href(footerChangelog));
    }
  });
});

describe("the header's row", () => {
  it("has no Home link: the logo is the only link to the home page, apart from the language switch", () => {
    for (const route of [...homes, ...DOCS_PAGES, "/404.html"]) {
      const header = headerOf(route);
      const lang = query(header, "luz-lang-switch");
      const toHome = links(header).filter((a) => /^\/(?:es\/|ar\/)?$/.test(href(a) ?? "") && !(lang && isInside(a, lang)));
      expect(toHome.map(href), `${route}: only the logo`).toHaveLength(1);
      expect(toHome[0], route).toBe(links(header)[0]);
      expect(visibleText(header).split(/\s+/), route).not.toContain("Home");
    }
  });

  it("ends with Documentation, GitHub, Search, Language, then the menu button, in that order", () => {
    for (const route of [...homes, ...DOCS_PAGES]) {
      const header = headerOf(route);
      const at = (node) => node.open.index;
      const docs = links(header).find((a) => href(a) === docsHref(route));
      const github = links(header).find((a) => href(a) === GITHUB);
      const search = query(header, "luz-search");
      const lang = query(header, "luz-lang-switch");
      const menu = find(header, (n) => n.name === "button" && n.attrs.get("popovertarget") === "page-nav");
      for (const [name, node] of Object.entries({ docs, github, search, menu })) expect(node, `${route}: ${name}`).toBeTruthy();
      expect(lang, `${route}: the language switch (the home pages and the docs pages have one, the not-found page none)`).toBeTruthy();
      const order = [docs, github, search, lang, menu].filter(Boolean);
      expect(order.map(at), route).toEqual([...order.map(at)].sort((a, b) => a - b));
    }
  });

  it("gives Documentation, GitHub and Search an icon and a word", () => {
    for (const route of [...homes, ...DOCS_PAGES]) {
      const header = headerOf(route);
      const docs = links(header).find((a) => href(a) === docsHref(route));
      const github = links(header).find((a) => href(a) === GITHUB);
      const trigger = find(header, (n) => n.name === "button" && n.attrs.has("data-luz-search-open"));
      for (const [name, node] of Object.entries({ docs, github, trigger })) {
        expect(find(node, (n) => n.name === "svg"), `${route}: ${name} has an icon`).toBeTruthy();
        expect(textOf(node), `${route}: ${name} has a word`).not.toBe("");
      }
      expect(visibleText(github), route).toBe("GitHub");
    }
  });

  it("writes the words in the page's language: Documentation / Documentación / التوثيق, and Search / Buscar / بحث", () => {
    const expected = {
      "/": { docs: "Documentation", search: "Search" },
      "/es/": { docs: "Documentación", search: "Buscar" },
      "/ar/": { docs: "التوثيق", search: "بحث" },
      "/docs/": { docs: "Documentation", search: "Search" },
    };
    for (const [route, words] of Object.entries(expected)) {
      const header = headerOf(route);
      const docs = links(header).find((a) => href(a) === docsHref(route));
      expect(visibleText(docs), `${route}: the docs link`).toBe(words.docs);
      // A link into docs the page's language does not have is marked as English
      if (route === "/ar/") expect(docs.attrs.get("hreflang"), `${route}: the English docs`).toBe("en");
      const label = query(header, "span.luz-search__trigger-label");
      expect(textOf(label), `${route}: the search button`).toBe(words.search);
    }
  });

  it("keeps the catalogs to those words: no site.home, no search.popular, a short search label", () => {
    expect(catalog("en")["site.docs"]).toBe("Documentation");
    expect(catalog("es")["site.docs"]).toBe("Documentación");
    expect(catalog("ar")["site.docs"]).toBe("التوثيق");
    expect(catalog("en")["header.search"]).toBe("Search");
    expect(catalog("es")["header.search"]).toBe("Buscar");
    expect(catalog("ar")["header.search"]).toBe("بحث");
    for (const code of ["en", "es", "ar"]) {
      expect(Object.keys(catalog(code)), code).not.toContain("site.home");
      expect(Object.keys(catalog(code)), code).not.toContain("search.popular");
    }
  });

  it("holds no colour mode: the switcher is in the footer, not in the header", () => {
    for (const route of [...homes, ...DOCS_PAGES, "/404.html"]) {
      const header = headerOf(route);
      expect(query(header, "luz-mode"), `${route}: luz-mode`).toBeNull();
      expect(findAll(header, (n) => n.name === "input" && n.attrs.get("name") === "luz-theme"), `${route}: radios`).toEqual([]);
      expect(findAll(header, (n) => hasClass(n, "luz-mode-cycle")), `${route}: cycle button`).toEqual([]);
    }
    for (const route of [...homes, ...DOCS_PAGES]) {
      const footer = query(treeOf(route), "footer");
      expect(query(footer, "luz-mode"), `${route}: the footer holds <luz-mode>`).toBeTruthy();
      expect(findAll(footer, (n) => n.name === "input" && n.attrs.get("name") === "luz-theme"), `${route}: radios for no-JS`).toHaveLength(3);
    }
  });
});

describe("the search dialog", () => {
  it("has no Popular block: nothing shown while idle, no word Popular", () => {
    for (const route of [...homes, ...DOCS_PAGES]) {
      const dialog = query(headerOf(route), "dialog.luz-search");
      expect(dialog, route).toBeTruthy();
      expect(findAll(dialog, (n) => n.attrs.has("data-luz-search-show")), `${route}: [data-luz-search-show]`).toEqual([]);
      expect(textOf(dialog).toLowerCase(), route).not.toMatch(/popular|populares|شائع/);
      expect(dialog.attrs.has("data-luz-label-popular"), route).toBe(false);
    }
  });
});

describe("the drawer the menu button opens", () => {
  const drawerOf = (route) => query(treeOf(route), "nav.luz-sidebar.page-nav");

  it("on the home page lists its sections, then Documentation and GitHub, then the languages", () => {
    for (const route of homes) {
      const drawer = drawerOf(route);
      expect(drawer.attrs.has("popover"), route).toBe(true);
      const hrefs = links(drawer).map(href);
      const sections = hrefs.filter((h) => h.startsWith("#"));
      expect(sections.length, `${route}: the sections`).toBeGreaterThan(0);
      expect(hrefs, route).toEqual([...sections, docsHref(route), GITHUB, ...homes]);
      const docs = links(drawer).find((a) => href(a) === docsHref(route));
      expect(visibleText(docs), route).toBe(visibleText(links(headerOf(route)).find((a) => href(a) === docsHref(route))));
    }
  });

  it("on the home page labels the languages group, and marks the current language", () => {
    for (const route of homes) {
      const drawer = drawerOf(route);
      const current = links(drawer).filter((a) => a.attrs.get("aria-current") === "page" && homes.includes(href(a)));
      expect(current.map(href), route).toEqual([route]);
    }
  });

  it("on the docs is the docs sidebar, with no link to the home page", () => {
    for (const route of DOCS_PAGES) {
      const drawer = drawerOf(route);
      expect(query(drawer, "ul.docs-nav"), `${route}: the sidebar`).toBeTruthy();
      expect(links(drawer).map(href), route).not.toContain("/");
    }
  });

  it("on the not-found page keeps the site links, Documentation and GitHub, and no Home", () => {
    expect(links(drawerOf("/404.html")).map(href)).toEqual(["/docs/", GITHUB]);
  });
});

describe("the language list's stylesheet (packages/site/src/components/lang-switch.css)", () => {
  const css = read("packages/site/src/components/lang-switch.css").replace(/\/\*[\s\S]*?\*\//g, "");
  /** The declarations of every rule whose selector list contains `selector` exactly, joined. */
  const rule = (selector) =>
    [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter(([, sel]) => sel.split(",").map((s) => s.trim()).includes(selector))
      .map(([, , body]) => body)
      .join(";");

  it("hangs the list under its button, on the button's end edge, where anchor positioning exists", () => {
    const supports = css.slice(css.indexOf("@supports (position-anchor"));
    expect(css).toContain("@supports (position-anchor:");
    expect(supports).toMatch(/anchor-name:\s*--luz-lang-switch/);
    expect(supports).toMatch(/position-anchor:\s*--luz-lang-switch/);
    expect(supports).toMatch(/inset-inline-end:\s*anchor\(end\)/);
    expect(supports).toMatch(/inset-block-start:\s*calc\(anchor\(bottom\)\s*\+/);
  });

  it("underlines no row, the current one or one under the pointer", () => {
    for (const selector of [".luz-lang-switch__link", ".luz-lang-switch__link:hover", ".luz-lang-switch__link[aria-current]"]) {
      expect(rule(selector), selector).not.toMatch(/text-decoration(?:-[a-z]+)?:\s*(?:underline|[^;]*\s2px)/);
    }
    expect(rule(".luz-lang-switch__link:hover")).toMatch(/text-decoration:\s*none/);
  });

  it("marks the current row with a tick drawn with a border in the brand colour, Highlight in forced colors, a fill and weight 600", () => {
    expect(rule(".luz-lang-switch__link[aria-current]")).toMatch(/font-weight:\s*600/);
    expect(rule(".luz-lang-switch__link[aria-current]")).toMatch(/background:/);
    const tick = rule(".luz-lang-switch__link[aria-current]::before");
    expect(tick).toMatch(/border:\s*solid var\(--luz-brand-primary\)/);
    expect(tick).toMatch(/border-width:/);
    expect(css).toMatch(/@media \(forced-colors: active\)\s*\{\s*\.luz-lang-switch__link\[aria-current\]::before\s*\{[^}]*Highlight/);
  });

  it("gives every row the tick's column, so the names line up", () => {
    const column = rule(".luz-lang-switch__link::before");
    expect(column).toMatch(/content:\s*""/);
    expect(column).toMatch(/inline-size:/);
    expect(column).toMatch(/flex:\s*none/);
  });
});
