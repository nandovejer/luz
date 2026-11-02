/**
 * The social links (`.luz-social`, `packages/catalog/src/components/social.css`; .claude/plans/component-gaps.md,
 * section 5): what the source, the cascade, the docs page, its Spanish page and the Feed icon of the Icons page say.
 * What a browser paints is tests/social.spec.js.
 *
 *  - the stylesheet is one block, `.luz-social` with `--icons`, and the elements inside it only in `:where()` (RL-11);
 *    no colour of its own, no `@media`, no brand, no rule outside the block;
 *  - it comes in the cascade after the site footer and the glow, and the docs app imports it;
 *  - its page is a pattern page of the Catalog, in the group `content`, that fits any site, with the structure every
 *    page of a component or pattern has (the shape of all of them is in tests/docs-site.test.js), and its Spanish
 *    page was made from the English one it has now;
 *  - the Icons page (English and Spanish) has the Feed icon that the social links use, drawn like the others;
 *  - LUZ ships no brand logo (RL-13): the icons of the page are LUZ's own, on the 24 grid, in a stroke.
 *
 * Needs `pnpm build` first (the built file is read from dist). No weight of social.css is pinned here.
 */
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CASCADE, catalogPatterns } from "../scripts/docs-site/kinds.js";
import { sourceHash } from "../scripts/docs-site/docs-i18n.js";
import { docsLanguage } from "./helpers/docs-i18n-fixture.js";
import { site } from "./helpers/docs-site.js";
import { parse, query, queryAll } from "./helpers/html-dom.js";
import { repo } from "./helpers/page-facts.js";

const read = (path) => readFileSync(`${repo}/${path}`, "utf-8");
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

const SOURCE = "packages/catalog/src/components/social.css";
// A missing file is an assertion below, not a crash of the whole file
const css = existsSync(`${repo}/${SOURCE}`) ? stripComments(read(SOURCE)) : "";
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selector: selector.trim(), body }));

const ROUTE = "/docs/catalog/social/";
const ICONS = "/docs/components/icons/";
// A missing page is an assertion below, not a crash of the whole file
const page = site.byRoute.get(ROUTE) ?? { meta: {}, body: "", file: "apps/docs/pages/catalog/social.html" };

describe("social.css: one block, its modifier and the elements inside it", () => {
  it("exists, in src and built, plain and minified, and is in the tarball list", () => {
    expect(existsSync(`${repo}/${SOURCE}`)).toBe(true);
    for (const file of ["social.css", "social.min.css"]) {
      expect(existsSync(`${repo}/packages/catalog/dist/components/${file}`), `dist/components/${file} (pnpm build)`).toBe(true);
      expect(read("packages/catalog/pack-files.txt").split("\n").map((l) => l.trim())).toContain(`dist/components/${file}`);
    }
  });

  it("names exactly two classes: .luz-social and .luz-social--icons", () => {
    expect([...new Set(css.match(/\.luz-[a-z0-9_-]+/g))].sort()).toEqual([".luz-social", ".luz-social--icons"]);
  });

  it("has a rule for the block itself and for its modifier", () => {
    const selectors = rules.map((r) => r.selector);
    expect(selectors).toContain(".luz-social");
    expect(selectors).toContain(".luz-social--icons");
  });

  it("puts every element it styles inside :where(): each selector is the block or its modifier, then only :where() groups", () => {
    expect(rules.length).toBeGreaterThan(2);
    for (const { selector } of rules) {
      for (const part of selector.split(",").map((s) => s.trim())) {
        expect(part.replace(/:where\([^()]*\)/g, "").trim(), part).toMatch(/^\.luz-social(?:--icons)?$/);
        expect(part, "no bare element selector outside :where()").not.toMatch(/(?:^|[\s>+~])(?:a|svg|span|li|ul)(?![\w-])(?![^()]*\))/);
      }
    }
  });

  it("styles the link and the icon: the link, its hover, and the svg", () => {
    const text = rules.map((r) => r.selector).join("\n");
    expect(text).toMatch(/:where\(a\)/);
    expect(text).toMatch(/:where\(a:hover\)/);
    expect(text).toMatch(/:where\(svg\)/);
    expect(text).toMatch(/\.luz-social--icons :where\(a\)/);
    expect(text).toMatch(/\.luz-social--icons :where\(a:hover\)/);
  });

  it("reads tokens only: no hex or named colour, no px typed in a size, and the colours and sizes the pattern is told by", () => {
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).not.toMatch(/\b(?:red|blue|green|black|white|gray|grey)\b/i);
    expect(css).not.toMatch(/\d+px/);
    for (const token of ["--luz-text-secondary", "--luz-text-primary", "--luz-surface-hover", "--luz-control-sm", "--luz-control-md"]) expect(css, token).toContain(token);
    // the icon follows the text: its size is in em
    expect(css).toMatch(/inline-size:\s*1\.25em/);
    expect(css).toMatch(/block-size:\s*1\.25em/);
  });

  it("declares no token, no @media, no @layer of its own and no print rule: it is the same on paper", () => {
    expect(css, SOURCE).not.toBe("");
    expect(css).not.toMatch(/(?:^|[\s;{])--luz-[\w-]+\s*:/);
    expect(css).not.toMatch(/@media|@layer|@container|@supports/);
  });

  it("is in luz.catalog once and only there, in the built file", () => {
    const file = "packages/catalog/dist/components/social.css";
    const built = existsSync(`${repo}/${file}`) ? read(file) : "";
    expect(built, `${file} (pnpm build)`).not.toBe("");
    expect(built.match(/^@layer luz\.catalog \{$/gm) ?? []).toHaveLength(1);
    expect(built).not.toMatch(/@layer luz\.print/);
  });
});

describe("the cascade and the docs app", () => {
  it("is in CASCADE after the site footer and the glow, once", () => {
    expect(CASCADE.filter((name) => name === "social")).toHaveLength(1);
    expect(CASCADE.indexOf("social")).toBeGreaterThan(CASCADE.indexOf("site-footer"));
    expect(CASCADE.indexOf("social")).toBeGreaterThan(CASCADE.indexOf("glow"));
  });

  it("is imported by apps/docs/catalog-patterns.css, after the glow", () => {
    const names = [...read("apps/docs/catalog-patterns.css").matchAll(/@import url\("[^"]*\/components\/([a-z-]+)\.css"\)/g)].map((m) => m[1]);
    expect(names.filter((n) => n === "social")).toHaveLength(1);
    expect(names.indexOf("social")).toBeGreaterThan(names.indexOf("glow"));
  });

  it("is listed, with its class, in the manifests of catalog", () => {
    const classes = JSON.parse(read("packages/catalog/dist/classes.json")).classes;
    const social = classes.filter((c) => c.name === "luz-social" || c.name === "luz-social--icons");
    expect(social.map((c) => c.name).sort()).toEqual(["luz-social", "luz-social--icons"]);
    for (const c of social) expect(c).toMatchObject({ layer: "luz.catalog", files: ["components/social.css"] });
  });
});

describe("the page /docs/catalog/social/", () => {
  it("is a pattern page of the group content that fits any site, from components/social.css", () => {
    expect(site.byRoute.has(ROUTE), "apps/docs/pages/catalog/social.html").toBe(true);
    expect(page.file).toBe("apps/docs/pages/catalog/social.html");
    expect(page.meta.area).toBe("catalog");
    expect(page.meta.group).toBe("content");
    expect(page.meta["fits-kinds"]).toBe("any");
    expect(page.meta.fits?.length).toBeGreaterThan(10);
    expect(page.meta.files?.trim()).toBe("components/social.css");
    expect(page.meta.toc).toBe("h2,h3");
    expect(page.body).toContain('<div class="docs-component" id="p-social">');
  });

  it("is found by the generator as a catalog pattern that fits any site", () => {
    expect(catalogPatterns(repo).find((p) => p.slug === "social")).toMatchObject({ kinds: ["any"], files: ["components/social.css"] });
  });

  it("has the example with both lists, the known issues, and the Code and Design tabs with their sections", () => {
    const body = page.body;
    const root = parse(body, page.file);
    expect(queryAll(root, "ul.luz-social").length, "the lists of the example").toBeGreaterThanOrEqual(2);
    expect(queryAll(root, "ul.luz-social--icons").length, "the list with icons only").toBeGreaterThanOrEqual(1);
    for (const id of ["example", "known-issues", "code", "design", "markup", "variants", "how", "no-js", "keyboard", "when", "when-not", "do-dont", "content", "contrast", "tokens"]) {
      expect(body, `#${id}`).toContain(`id="${id}"`);
    }
    expect(body).toContain('<nav class="luz-tabs docs-view-tabs" aria-label="Social links documentation">');
  });

  it("documents the modifier and the decorative icon in the markup", () => {
    expect(page.body).toContain("luz-social--icons");
    expect(page.body).toContain("u-sr-only");
    expect(page.body).toMatch(/aria-hidden="true"/);
  });

  it("lists the tokens the CSS reads in Tokens it uses", () => {
    const section = page.body.split('<h3 id="tokens">')[1] ?? "";
    for (const token of ["--luz-text-secondary", "--luz-text-primary", "--luz-surface-hover", "--luz-control-sm", "--luz-control-md"]) expect(section, token).toContain(token);
  });
});

describe("the Spanish page", () => {
  const es = docsLanguage(site, "es").pages.get(ROUTE) ?? { meta: {}, body: "", stale: true, missing: true };

  it("exists, is pending review, and was made from the English page as it is: its source is the hash of the English body", () => {
    expect(es, "apps/docs/i18n/es/pages/catalog/social.html").toBeTruthy();
    expect(es.missing, "apps/docs/i18n/es/pages/catalog/social.html").toBeUndefined();
    expect(es.meta.reviewed).toBe(false);
    expect(es.meta.source).toBe(sourceHash(page.body));
    expect(es.stale).toBe(false);
  });

  it("says what fits in Spanish, keeps the markup of the example and has the same ids", () => {
    expect(es.meta.fits?.length).toBeGreaterThan(10);
    expect(es.meta.fits).not.toBe(page.meta.fits);
    const ids = (body) => [...body.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(ids(es.body)).toEqual(ids(page.body));
    expect(queryAll(parse(es.body, es.file), "ul.luz-social").length).toBe(queryAll(parse(page.body, page.file), "ul.luz-social").length);
  });
});

describe("the Icons page has the Feed icon", () => {
  const ES_FILE = "apps/docs/i18n/es/pages/components/icons.html";
  const itemsOf = (body) => queryAll(query(parse(body, "icons"), "div.docs-example"), "li.luz-icon-item").map((li) => ({
    id: (query(li, "span.luz-icon-name")?.attrs.get("id") ?? "").replace(/^c-icons-/, ""),
    svg: query(li, "svg"),
    button: query(li, "button"),
  }));
  const english = () => itemsOf(site.byRoute.get(ICONS).body);
  const spanish = () => itemsOf(read(ES_FILE).replace(/^\s*<!--\s*luz:page\b[\s\S]*?-->/, ""));
  const nameOf = (body, id) => new RegExp(`id="c-icons-${id}">([^<]+)<`).exec(body)?.[1];

  it("lists a Feed icon in English, named Feed, once", () => {
    expect(english().filter((i) => i.id === "feed")).toHaveLength(1);
    expect(nameOf(site.byRoute.get(ICONS).body, "feed")).toBe("Feed");
  });

  it("lists it in Spanish too, with the same id and the same drawing, and a name of its own", () => {
    const en = english().find((i) => i.id === "feed");
    const es = spanish().find((i) => i.id === "feed");
    expect(en, "a Feed icon in the English page").toBeTruthy();
    expect(es, "a Feed icon in the Spanish page").toBeTruthy();
    expect(es.svg.html.slice(es.svg.open.end, es.svg.close.index)).toBe(en.svg.html.slice(en.svg.open.end, en.svg.close.index));
    expect(nameOf(read(ES_FILE), "feed")?.length).toBeGreaterThan(2);
    expect(es.button, "its copy button").toBeTruthy();
  });

  it("draws it on the 24 grid like the others: a stroke of 1.5, no fill, decorative", () => {
    for (const item of [english(), spanish()].map((list) => list.find((i) => i.id === "feed"))) {
      expect(item, "a Feed icon").toBeTruthy();
      const { svg } = item;
      expect(svg.attrs.get("viewbox")).toBe("0 0 24 24");
      expect(svg.attrs.get("stroke-width")).toBe("1.5");
      expect(svg.attrs.get("fill")).toBe("none");
      expect(svg.attrs.get("stroke")).toBe("currentColor");
      expect(svg.attrs.get("aria-hidden")).toBe("true");
    }
  });

  it("is the drawing the social links use for the feed", () => {
    const inner = (svg) => svg.html.slice(svg.open.end, svg.close.index);
    const feed = english().find((i) => i.id === "feed");
    expect(feed, "a Feed icon").toBeTruthy();
    const icon = inner(feed.svg);
    const used = queryAll(parse(page.body, page.file), "ul.luz-social").flatMap((ul) => queryAll(ul, "svg")).map(inner);
    expect(used.filter((d) => d === icon).length, "the Feed icon, in each list of the example").toBeGreaterThanOrEqual(2);
  });

  it("was made from the English page as it is: the Spanish page's source is the hash of the English body", () => {
    const es = docsLanguage(site, "es").pages.get(ICONS);
    expect(es.meta.source).toBe(sourceHash(site.byRoute.get(ICONS).body));
    expect(es.stale).toBe(false);
  });
});

describe("no brand logo (RL-13)", () => {
  // The paths of the marks of GitHub and of other brands are never LUZ's own; the octocat test of icons-family.test.js stays
  const BRANDS = [/M12 \.297/, /M8 0a8\b/, /-2\.53 15\.59/, /M23\.998 12c0-6\.628/, /M18\.244 2\.25h3\.308/];

  it("the page and its Spanish page draw only icons of the 24 grid, in a stroke, decorative, and no image or external drawing", () => {
    const es = docsLanguage(site, "es").pages.get(ROUTE);
    expect(page, "the English page").toBeTruthy();
    expect(es, "the Spanish page").toBeTruthy();
    for (const body of [page.body, es.body]) {
      const svgs = queryAll(parse(body, "social"), "svg");
      expect(svgs.length).toBeGreaterThan(0);
      for (const svg of svgs) {
        expect(svg.attrs.get("viewbox")).toBe("0 0 24 24");
        expect(svg.attrs.get("aria-hidden")).toBe("true");
        expect(svg.attrs.get("focusable")).toBe("false");
        const inner = svg.html.slice(svg.open.end, svg.close.index);
        expect(inner, "no fill typed in the markup").not.toMatch(/\bfill=/);
        expect(inner).not.toMatch(/<(?:image|use|foreignObject|style|script)\b/i);
      }
    }
  });

  it("neither the stylesheet nor the pages have the path of a brand's mark", () => {
    for (const text of [css, page?.body ?? "", docsLanguage(site, "es").pages.get(ROUTE)?.body ?? "", read("apps/docs/i18n/es/pages/components/icons.html"), site.byRoute.get(ICONS).body]) {
      for (const re of BRANDS) expect(text).not.toMatch(re);
    }
  });

  it("the page says LUZ ships none: the name says which place", () => {
    expect(page.body).toMatch(/no\s+brand\s+logos/i);
  });
});
