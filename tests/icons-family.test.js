/**
 * The site's icons are one family: a 24 grid, a 1.5 px stroke in the text colour
 * (`currentColor`), round caps and joins, no fill, no colour typed in the markup.
 * The Icons page (apps/docs/pages/components/icons.html and its Spanish page) is
 * where they are shown and copied; the header, footer, prompt dialog, language
 * switch, search and colour mode draw the same shapes. What a browser paints and
 * what the copy buttons put on the clipboard are tests/icons-page.spec.js and
 * tests/site-header-repo-icon.spec.js; this file reads the sources.
 *
 *  - every icon of the page is on `0 0 24 24` with `stroke-width="1.5"`, `fill="none"`,
 *    `stroke="currentColor"` and round caps and joins, decorative, and has no colour of
 *    its own; the only other grid is the logo's (32), filled;
 *  - the page carries each icon once: no `data-copy` in the HTML (a script fills it from
 *    the icon beside the button), the sprite block is a short sample, and no number of
 *    icons is typed in the prose (the count is the page's own);
 *  - the icons of the header, the footer and the prompt dialog are the ones of the page
 *    (RL-13: the repository link draws LUZ's own git-branch, never GitHub's mark), with
 *    a 1.5 stroke wherever one is written, in the markup and in the CSS that styles them;
 *  - no octocat path in `apps/` or `packages/*\/src`;
 *  - the old page, components/icon-grid, is gone from the pages, the catalogs and every link.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { decodeEntities } from "../scripts/docs-site/html.js";
import { find, findAll, matcher, parse, query, queryAll } from "./helpers/html-dom.js";
import { repo } from "./helpers/page-facts.js";
import { site } from "./helpers/docs-site.js";

const read = (file) => readFileSync(join(repo, file), "utf-8");
const FRONT_MATTER = /^\s*<!--\s*luz:page\b[\s\S]*?-->/;

const ROUTE = "/docs/components/icons/";
const OLD_ROUTE = "/docs/components/icon-grid/";
const ES_FILE = "apps/docs/i18n/es/pages/components/icons.html";

const PAGES = {
  en: () => site.byRoute.get(ROUTE)?.body,
  es: () => (existsSync(join(repo, ES_FILE)) ? read(ES_FILE).replace(FRONT_MATTER, "") : undefined),
};

/** The icons of a page: the items of its grids, with the svg and the copy button of each. */
function itemsOf(body) {
  // The example only: the Do and don't pictures further down draw items too, with no copy button
  const root = query(parse(body, "icons"), "div.docs-example") ?? parse("", "icons");
  return queryAll(root, "li.luz-icon-item").map((li) => {
    const name = query(li, "span.luz-icon-name");
    return {
      li,
      id: (name?.attrs.get("id") ?? "").replace(/^c-icons-/, ""),
      name,
      svg: query(li, "svg"),
      button: query(li, "button"),
    };
  });
}
const isLogo = (item) => item.id === "logo";

/** The presentation attribute a shape gets from itself or the nearest ancestor up to the svg. */
function attrOf(node, svg, attr) {
  for (let n = node; n; n = n.parent) {
    if (n.attrs.has(attr)) return n.attrs.get(attr);
    if (n === svg) break;
  }
  return undefined;
}
const SHAPES = new Set(["path", "circle", "ellipse", "line", "polyline", "polygon", "rect"]);
const shapesIn = (svg) => findAll(svg, (n) => SHAPES.has(n.name));

/**
 * What a shape draws, whatever its stroke attributes: the tag and its geometry (and a fill that
 * is not "none"), so the icon of the Icons page can be compared with the same icon written in a
 * partial, in another order or with the stroke on a group. A sorted list.
 */
function drawing(svg) {
  return shapesIn(svg)
    .map((n) => {
      const attrs = [...n.attrs].filter(([k, v]) => !/^(stroke|stroke-.*)$/.test(k) && !(k === "fill" && v === "none"));
      const own = attrs.sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`);
      // A fill the shape takes from its group counts too (the half disc of Auto and Contrast)
      const fill = attrOf(n, svg, "fill");
      if (fill && fill !== "none" && !n.attrs.has("fill")) own.push(`fill=${fill}`);
      return `${n.name} ${own.join(" ")}`;
    })
    .sort();
}

describe("the Icons page replaces the Icon grid page", () => {
  it("is a page of the docs, in components", () => {
    expect(site.byRoute.has(ROUTE), `${ROUTE} is a docs page`).toBe(true);
    expect(site.byRoute.get(ROUTE)?.meta.area).toBe("components");
  });

  it("has a Spanish page, at the same path under the Spanish pages", () => {
    expect(existsSync(join(repo, ES_FILE)), ES_FILE).toBe(true);
  });

  it("leaves no page, translation, link or catalog key named components/icon-grid", () => {
    expect(site.byRoute.has(OLD_ROUTE), `${OLD_ROUTE} is no page any more`).toBe(false);
    expect(existsSync(join(repo, "apps/docs/pages/components/icon-grid.html"))).toBe(false);
    expect(existsSync(join(repo, "apps/docs/i18n/es/pages/components/icon-grid.html"))).toBe(false);
    // Nothing links to it: pages, translations, partials, catalogs, the site data
    const hits = [];
    const walk = (dir) => {
      for (const entry of readdirSync(dir)) {
        if (entry === "node_modules") continue;
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(html|json|js|md|txt)$/.test(entry) && /components\/icon-grid\b/.test(readFileSync(path, "utf-8").replace(/icon-grid(?:\.min)?\.css/g, ""))) hits.push(relative(repo, path));
      }
    };
    for (const dir of ["apps", "scripts/docs-site"]) walk(join(repo, dir));
    expect(hits, "files that still name components/icon-grid (the stylesheet components/icon-grid.css is fine)").toEqual([]);
  });
});

for (const [language, body] of Object.entries(PAGES)) {
  describe(`the icons of the ${language} Icons page`, () => {
    const items = () => itemsOf(body() ?? "");
    const icons = () => items().filter((i) => !isLogo(i));

    it("shows the icons, and the logo apart from them", () => {
      expect(body(), "the page").toBeTruthy();
      expect(icons().length, "icons").toBeGreaterThan(0);
      expect(items().filter(isLogo), "the logo is one more item").toHaveLength(1);
      expect(items().at(-1).id, "the logo comes last").toBe("logo");
      expect(icons().map((i) => i.id), "Git branch is among them").toContain("git-branch");
    });

    it("draws every icon on a 24 grid with a 1.5 stroke, no fill, round caps, in currentColor, and decorative", () => {
      expect(icons().length, "icons").toBeGreaterThan(0);
      for (const { id, svg } of icons()) {
        const a = (name) => svg.attrs.get(name);
        expect(a("viewbox"), `${id} viewBox`).toBe("0 0 24 24");
        expect(a("width"), `${id} width`).toBe("24");
        expect(a("height"), `${id} height`).toBe("24");
        expect(a("stroke-width"), `${id} stroke-width`).toBe("1.5");
        expect(a("fill"), `${id} fill`).toBe("none");
        expect(a("stroke"), `${id} stroke`).toBe("currentColor");
        expect(a("stroke-linecap"), `${id} stroke-linecap`).toBe("round");
        expect(a("stroke-linejoin"), `${id} stroke-linejoin`).toBe("round");
        expect(a("aria-hidden"), `${id} aria-hidden`).toBe("true");
        expect(a("focusable"), `${id} focusable`).toBe("false");
        expect(shapesIn(svg).length, `${id} has a shape`).toBeGreaterThan(0);
      }
    });

    it("lets no shape change the stroke width, the stroke or the fill the svg sets, apart from the filled half discs", () => {
      expect(icons().length, "icons").toBeGreaterThan(0);
      for (const { id, svg } of icons()) {
        for (const shape of shapesIn(svg)) {
          expect(shape.attrs.get("stroke-width") ?? "1.5", `${id}: ${shape.name} stroke-width`).toBe("1.5");
          expect(["currentColor", undefined], `${id}: ${shape.name} stroke`).toContain(shape.attrs.get("stroke"));
          expect(["currentColor", "none", undefined], `${id}: ${shape.name} fill`).toContain(shape.attrs.get("fill"));
        }
      }
    });

    it("types no colour in any icon or in the logo: no hex, rgb, hsl, named colour or var()", () => {
      expect(items().length, "items").toBeGreaterThan(0);
      for (const { id, svg } of items()) {
        const markup = svg.html.slice(svg.open.index, svg.close.end);
        expect(markup, `${id}`).not.toMatch(/#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(|\bvar\(/i);
        for (const node of [svg, ...findAll(svg, () => true)]) {
          for (const attr of ["fill", "stroke", "color", "stop-color"]) {
            const v = node.attrs.get(attr);
            if (v !== undefined) expect(["none", "currentColor"], `${id}: ${node.name} ${attr}="${v}"`).toContain(v);
          }
          expect(node.attrs.get("style") ?? "", `${id}: ${node.name} style`).toBe("");
        }
      }
    });

    it("keeps the logo on its own grid, filled, in the text colour, and decorative", () => {
      const logo = items().find(isLogo);
      expect(logo, "the logo").toBeTruthy();
      expect(logo.svg.attrs.get("viewbox")).not.toBe("0 0 24 24");
      expect(logo.svg.attrs.get("aria-hidden")).toBe("true");
      expect(logo.svg.attrs.get("focusable")).toBe("false");
      expect(shapesIn(logo.svg).every((s) => s.attrs.get("fill") === "currentColor"), "filled with currentColor").toBe(true);
    });

    it("marks the two icons that point to the end of the line with data-luz-flip, and no other", () => {
      expect(icons().length, "icons").toBeGreaterThan(0);
      expect(icons().filter((i) => i.svg.attrs.has("data-luz-flip")).map((i) => i.id)).toEqual(["chevron-end", "arrow-end"]);
    });

    it("names each icon, with one id that is unique on the page, and a copy button named by it", () => {
      expect(icons().length, "icons").toBeGreaterThan(0);
      const ids = items().map((i) => i.id);
      expect(new Set(ids).size, "icon ids").toBe(ids.length);
      for (const { id, name, button } of items()) {
        expect(name?.attrs.get("id"), id).toBe(`c-icons-${id}`);
        expect(button, `${id}: a copy button`).toBeTruthy();
        expect(button.attrs.get("class")).toContain("luz-copy-btn");
        expect(button.attrs.get("type")).toBe("button");
        const labelled = (button.attrs.get("aria-labelledby") ?? "").split(/\s+/);
        expect(labelled, `${id}: named by itself and by the name of the icon`).toEqual([button.attrs.get("id"), name.attrs.get("id")]);
      }
    });

    it("carries each icon once: the copy buttons have no data-copy in the HTML, a script fills it from the icon beside them", () => {
      expect(items().length, "items").toBeGreaterThan(0);
      for (const { id, button } of items()) expect(button.attrs.has("data-copy"), `${id}: data-copy`).toBe(false);
      const markup = body() ?? "";
      expect(markup, "no escaped svg in a data-copy anywhere").not.toMatch(/data-copy="&lt;svg/);
    });

    it("has no duplicate id on the page", () => {
      const root = parse(body() ?? "", "icons");
      const seen = new Map();
      for (const node of findAll(root, (n) => n.attrs.has("id"))) seen.set(node.attrs.get("id"), (seen.get(node.attrs.get("id")) ?? 0) + 1);
      expect(seen.size, "ids").toBeGreaterThan(0);
      expect([...seen].filter(([, n]) => n > 1).map(([id]) => id)).toEqual([]);
    });

    it("has a sprite block that is a short sample with an ellipsis, a Copy button for the whole sprite, and the symbols of the set only on the clipboard", () => {
      const root = parse(body() ?? "", "icons");
      const button = find(root, (n) => n.name === "button" && n.attrs.has("data-icon-sprite"));
      expect(button, "button[data-icon-sprite]").toBeTruthy();
      expect(button.attrs.has("data-copy"), "the full sprite is built by the script, not typed").toBe(false);
      const code = find(root, (n) => n.name === "code" && n.attrs.get("id") === "code-icon-sprite");
      expect(code, "code#code-icon-sprite").toBeTruthy();
      const text = decodeEntities(code.html.slice(code.open.end, code.close.index));
      const shown = (text.match(/<symbol\b/g) ?? []).length;
      expect(shown, "a sample: some symbols").toBeGreaterThan(0);
      expect(shown, "a sample: fewer than the set").toBeLessThan(icons().length);
      expect(text, "says it goes on").toMatch(/<!--[^>]*…[^>]*-->|<!--[^>]*\.\.\.[^>]*-->/);
      // What is shown is true: the symbols are icons of the grid, with their drawing
      for (const m of text.matchAll(/<symbol id="luz-icon-([a-z-]+)" viewBox="0 0 24 24">(.*?)<\/symbol>/g)) {
        const icon = icons().find((i) => i.id === m[1]);
        expect(icon, `symbol ${m[1]} is an icon of the grid`).toBeTruthy();
        const inner = icon.svg.html.slice(icon.svg.open.end, icon.svg.close.index);
        expect(parse(`<svg>${m[2]}</svg>`, "symbol").children.length, `symbol ${m[1]} has shapes`).toBeGreaterThan(0);
        expect(inner.replace(/\s+/g, ""), `symbol ${m[1]} draws the icon`).toBe(m[2].replace(/\s+/g, ""));
      }
    });

    it("types no number of icons, symbols or colours in its prose: the count is the page's own", () => {
      const prose = (body() ?? "").replace(/<(pre|svg|script|style)\b[\s\S]*?<\/\1>/g, " ").replace(/<[^>]*>/g, " ");
      expect(prose.length, "prose").toBeGreaterThan(0);
      expect(prose).not.toMatch(/\b\d+\s+(?:icons?|iconos?|symbols?|s[ií]mbolos?)\b/i);
      expect(prose).not.toMatch(/\b(?:icons?|iconos?)\s*:\s*\d+\b/i);
    });
  });
}

describe("the Spanish Icons page has the icons of the English one", () => {
  it("lists the same icons, in the same order, with the same drawing", () => {
    const en = itemsOf(PAGES.en() ?? "");
    const es = itemsOf(PAGES.es() ?? "");
    expect(en.length, "English items").toBeGreaterThan(0);
    expect(es.map((i) => i.id)).toEqual(en.map((i) => i.id));
    for (const [i, item] of es.entries()) {
      expect(item.svg.html.slice(item.svg.open.index, item.svg.close.end), item.id).toBe(en[i].svg.html.slice(en[i].svg.open.index, en[i].svg.close.end));
    }
  });
});

describe("the icons of the header, the footer and the prompt dialog are the family's", () => {
  const PARTIALS = ["header", "footer", "prompt-dialog"].map((name) => ({ name, root: parse(read(`apps/site/_partials/${name}.html`), name) }));
  /** The svgs of the partials on the 24 grid, and the logo (32) apart. */
  const svgs = () => PARTIALS.flatMap(({ name, root }) => queryAll(root, "svg").map((svg) => ({ name, svg })));
  const onGrid = () => svgs().filter(({ svg }) => svg.attrs.get("viewbox") === "0 0 24 24");

  it("are on a 24 grid, and the logo is the only svg that is not", () => {
    expect(onGrid().length, "icons in the partials").toBeGreaterThan(0);
    const others = svgs().filter(({ svg }) => svg.attrs.get("viewbox") !== "0 0 24 24");
    expect(others.map(({ name, svg }) => `${name}: ${svg.attrs.get("viewbox")}`), "only the logo has another grid").toEqual(["header: 0 0 32 32"]);
  });

  it("write a 1.5 stroke wherever they write one, in the colour of the text, and no colour of their own", () => {
    expect(onGrid().length, "icons in the partials").toBeGreaterThan(0);
    for (const { name, svg } of onGrid()) {
      for (const node of [svg, ...findAll(svg, () => true)]) {
        const where = `${name}: <${node.name}> of ${shapesIn(svg)[0]?.attrs.get("d")?.slice(0, 24) ?? node.attrs.get("class")}`;
        if (node.attrs.has("stroke-width")) expect(node.attrs.get("stroke-width"), `${where} stroke-width`).toBe("1.5");
        if (node.attrs.has("stroke")) expect(node.attrs.get("stroke"), `${where} stroke`).toBe("currentColor");
        if (node.attrs.has("fill")) expect(["none", "currentColor"], `${where} fill`).toContain(node.attrs.get("fill"));
        expect(node.attrs.get("style") ?? "", `${where} style`).toBe("");
      }
      expect(svg.attrs.get("aria-hidden"), `${name}: decorative`).toBe("true");
    }
  });

  it("draw the icons of the Icons page: search, the book of Documentation, git-branch, and the four colour modes", () => {
    const set = new Map(itemsOf(PAGES.en() ?? "").map((i) => [i.id, drawing(i.svg)]));
    expect(set.size, "the page has icons").toBeGreaterThan(0);
    const header = PARTIALS.find((p) => p.name === "header").root;
    const footer = PARTIALS.find((p) => p.name === "footer").root;
    const triggers = queryAll(header, "svg").filter((svg) => svg.attrs.get("class") === "luz-search__trigger-icon");
    expect(triggers.length, "the search triggers").toBeGreaterThan(0);
    for (const svg of triggers) expect(drawing(svg), "a search trigger draws search").toEqual(set.get("search"));
    const github = queryAll(query(header, "a.site-header__github"), "svg");
    expect(github.map(drawing), "the repository link draws git-branch").toEqual([set.get("git-branch")]);
    const docs = queryAll(query(header, "nav.site-header__nav"), "svg");
    expect(docs.map(drawing), "Documentation draws the book").toEqual([set.get("book")]);
    const modes = queryAll(footer, "input.luz-theme-mode__input").map((input) => [input.attrs.get("value"), drawing(find(input.parent, (n) => n.name === "svg"))]);
    expect(Object.fromEntries(modes)).toEqual({ auto: set.get("auto"), light: set.get("sun"), dark: set.get("moon"), "high-contrast": set.get("contrast") });
  });

  it("have the globe of the language switch (docs-site/i18n.js) drawn as the Icons page draws it", () => {
    const set = new Map(itemsOf(PAGES.en() ?? "").map((i) => [i.id, drawing(i.svg)]));
    expect(set.size, "the page has icons").toBeGreaterThan(0);
    const globe = /const GLOBE =\s*'(<svg[^']*<\/svg>)'/.exec(read("scripts/docs-site/i18n.js"))?.[1];
    expect(globe, "GLOBE in scripts/docs-site/i18n.js").toBeTruthy();
    expect(drawing(parse(globe, "globe").children[0])).toEqual(set.get("globe"));
  });
});

describe("the CSS that styles the icons of the site keeps the family's stroke", () => {
  // The search, the language switch and the colour mode draw their icons from CSS: fill none, currentcolor, 1.5
  const FILES = ["packages/catalog/src/components/search.css", "packages/catalog/src/components/lang-switch.css", "packages/core/src/components/theme-mode.css", "apps/site/header.css"];
  it("writes stroke-width: 1.5 and no other width", () => {
    for (const file of FILES) {
      const css = read(file).replace(/\/\*[\s\S]*?\*\//g, "");
      for (const m of css.matchAll(/stroke-width:\s*([^;}]+)/g)) expect(m[1].trim(), `${file}: stroke-width`).toBe("1.5");
    }
    const search = read(FILES[0]);
    expect((search.match(/stroke-width:\s*1\.5/g) ?? []).length, "search.css sets the width in each of its icons").toBeGreaterThanOrEqual(3);
    expect(read(FILES[1])).toMatch(/stroke-width:\s*1\.5/);
    expect(read(FILES[2])).toMatch(/stroke-width:\s*1\.5/);
  });
});

describe("the CSS that draws the icons of the site rounds their caps and joins, as the Icons page does", () => {
  it("search.css (the trigger, the field and the close button) and lang-switch.css (the globe) set stroke-linecap and stroke-linejoin: round", () => {
    for (const [file, minimum] of [["packages/catalog/src/components/search.css", 3], ["packages/catalog/src/components/lang-switch.css", 1]]) {
      const css = read(file).replace(/\/\*[\s\S]*?\*\//g, "");
      expect((css.match(/stroke-linecap:\s*round/g) ?? []).length, `${file}: stroke-linecap: round`).toBeGreaterThanOrEqual(minimum);
      expect((css.match(/stroke-linejoin:\s*round/g) ?? []).length, `${file}: stroke-linejoin: round`).toBeGreaterThanOrEqual(minimum);
    }
  });
});

describe("the other pages of the docs draw their icons in the family too", () => {
  const dirs = ["apps/docs/pages", "apps/docs/i18n/es/pages"];
  const pages = () => {
    const out = [];
    const walk = (dir) => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) walk(path);
        else if (entry.endsWith(".html")) out.push(path);
      }
    };
    for (const dir of dirs) walk(join(repo, dir));
    return out;
  };

  it("writes a 1.5 stroke on every svg of a 24 grid, and the grid is 24", () => {
    const bad = [];
    for (const file of pages()) {
      const source = readFileSync(file, "utf-8").replace(/<pre\b[\s\S]*?<\/pre>/g, " ");
      for (const m of source.matchAll(/<svg\b([^>]*)>/g)) {
        if (/stroke-width="(?!1\.5")[^"]*"/.test(m[1])) bad.push(`${relative(repo, file)}: ${m[0].slice(0, 90)}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe("no third-party mark in what is published or served", () => {
  // The paths of the GitHub mark (octocat); RL-13: everything served is MIT and our own
  const OCTOCAT = [/M12 \.297/, /M8 0a8\b/, /-2\.53 15\.59/];
  const sources = () => {
    const out = [];
    const walk = (dir) => {
      for (const entry of readdirSync(dir)) {
        if (entry === "node_modules" || entry === "dist") continue;
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(html|css|js|json|svg|md|txt)$/.test(entry)) out.push(path);
      }
    };
    walk(join(repo, "apps"));
    for (const pkg of readdirSync(join(repo, "packages"))) if (existsSync(join(repo, "packages", pkg, "src"))) walk(join(repo, "packages", pkg, "src"));
    walk(join(repo, "scripts/docs-site"));
    return out;
  };

  it("has no octocat path in apps/, packages/*/src or the docs generator", () => {
    const hits = [];
    for (const file of sources()) {
      const text = readFileSync(file, "utf-8");
      for (const re of OCTOCAT) if (re.test(text)) hits.push(`${relative(repo, file)}: ${re}`);
    }
    expect(hits).toEqual([]);
  });

  it("gives the repository link of every header a git-branch icon and the word GitHub, and the repository's address", () => {
    const header = parse(read("apps/site/_partials/header.html"), "header");
    const link = query(header, "a.site-header__github");
    expect(link, "a.site-header__github").toBeTruthy();
    expect(link.attrs.get("href")).toBe("https://github.com/nandovejer/luz");
    const svgs = queryAll(link, "svg");
    expect(svgs, "one icon").toHaveLength(1);
    expect(svgs[0].attrs.get("viewbox")).toBe("0 0 24 24");
    expect(svgs[0].attrs.get("aria-hidden")).toBe("true");
    expect(query(link, "span.site-header__github-label")?.html.slice(query(link, "span.site-header__github-label").open.end, query(link, "span.site-header__github-label").close.index)).toBe("GitHub");
    // The same size as the other icons of the row: one class, one rule
    expect(svgs[0].attrs.get("class")).toBe(queryAll(query(header, "nav.site-header__nav"), "svg")[0].attrs.get("class"));
    expect(find(link, matcher("circle")), "git-branch has circles").toBeTruthy();
  });
});
