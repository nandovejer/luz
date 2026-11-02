/**
 * The page transition of @luz-ds/catalog (`components/page-transition.css`; .claude/plans/component-gaps.md, section 6,
 * decided 2026-11-02: one fixed transition, no setting, no boot script, no control, no exception).
 *
 * A stylesheet and nothing else: no class, no tag, no attribute, no script. A site that links it on its pages gets a
 * cross-fade (cross-document view transitions) when a visitor follows a link from one of them to another. The browser
 * half (pageswap, the pseudo-elements' timing, the mode that does not flash, reduced motion) is
 * tests/page-transition.spec.js; this file holds what needs no browser:
 *
 *   - the sheet is CSS only, in `luz.catalog`, and everything but the layer is inside
 *     `@media (prefers-reduced-motion: no-preference)`, the `@view-transition` rule too;
 *   - its times and its easing are the motion tokens, never a literal;
 *   - its docs page (any site, the group site-wide, its own order), its translation and its Known issues;
 *   - the pages that link it (the docs, the home) and the one that does not (the 404);
 *   - stylelint's `luz/no-bare-element` knows the name inside `::view-transition-old(root)` is not a type.
 *
 * Needs `pnpm build` (dist/).
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import stylelint from "stylelint";
import { describe, expect, it } from "vitest";
import { parseTranslation, sourceHash } from "../scripts/docs-site/docs-i18n.js";
import { CASCADE } from "../scripts/docs-site/kinds.js";
import { scanSite } from "../scripts/docs-site/site.js";
import { SHEETS_ONLY } from "./helpers/catalog-names.js";
import { readPage, repo, sectionsOf, textOf } from "./helpers/page-facts.js";

const read = (path) => readFileSync(join(repo, path), "utf-8");
const exists = (path) => existsSync(join(repo, path));
const NAME = "page-transition";
const SHEET = `packages/catalog/dist/components/${NAME}.css`;
const SHEET_URL = `/${SHEET}`;
const MEDIA = "@media(prefers-reduced-motion:no-preference)";

/** Comments out, every run of white space gone, the last `;` of a block too: what the sheet says, whether it is the source, the build or the minified build. */
const squeeze = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, "").replace(/;}/g, "}");

/** The top level of a stylesheet: [{ prelude, body | null }], comments removed, braces matched. */
function topLevel(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const out = [];
  let i = 0;
  while (i < text.length) {
    const start = i;
    let depth = 0;
    for (; i < text.length; i++) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}" && --depth === 0) break;
      else if (text[i] === ";" && depth === 0) break;
    }
    const chunk = text.slice(start, i + 1).trim();
    i++;
    if (!chunk) continue;
    const open = chunk.indexOf("{");
    out.push(open === -1 ? { prelude: chunk.replace(/;$/, "").trim(), body: null } : { prelude: chunk.slice(0, open).trim(), body: chunk.slice(open + 1, -1) });
  }
  return out;
}

const tokens = JSON.parse(read("packages/tokens/tokens.json"));

/* ---- The sheet ------------------------------------------------------------- */

describe("page-transition.css is a stylesheet and nothing else", () => {
  it("has a source, a built file and a minified file, and ships in the tarball list of catalog", () => {
    for (const file of [`packages/catalog/src/components/${NAME}.css`, SHEET, `packages/catalog/dist/components/${NAME}.min.css`]) expect(exists(file), `${file} (pnpm build)`).toBe(true);
    const packed = read("packages/catalog/pack-files.txt").split("\n").map((l) => l.trim());
    expect(packed).toContain(`dist/components/${NAME}.css`);
    expect(packed).toContain(`dist/components/${NAME}.min.css`);
  });

  it("is the helper's one sheet with no class, no tag and no script", () => {
    expect(SHEETS_ONLY).toEqual([NAME]);
    const classes = JSON.parse(read("packages/catalog/dist/classes.json")).classes;
    expect(classes.filter((c) => (c.files ?? []).some((f) => f.includes(NAME)) || c.name.includes(NAME)), "no class names the sheet").toEqual([]);
    const elements = JSON.parse(read("packages/catalog/dist/custom-elements.json"));
    expect(JSON.stringify(elements), "no element names the sheet").not.toContain(NAME);
    const modules = readdirSync(join(repo, "packages/catalog/src")).filter((f) => f.endsWith(".js"));
    expect(modules.filter((f) => f.includes(NAME)), "no script of the sheet").toEqual([]);
    expect(exists(`packages/catalog/dist/${NAME}.js`) || exists(`packages/catalog/dist/${NAME}.min.js`), "no chunk of the sheet").toBe(false);
    expect(read("packages/catalog/src/catalog.js"), "the loader does not know it").not.toContain(NAME);
    expect(read("packages/catalog/package.json")).not.toMatch(new RegExp(`${NAME}\\.(?:min\\.)?js`));
  });

  for (const [label, file] of [["source", `packages/catalog/src/components/${NAME}.css`], ["built file", SHEET], ["minified file", `packages/catalog/dist/components/${NAME}.min.css`]]) {
    it(`${label}: the @view-transition rule is \`navigation: auto\` and sits inside prefers-reduced-motion: no-preference`, () => {
      const css = squeeze(read(file));
      expect(css, "navigation: auto").toContain("@view-transition{navigation:auto}");
      expect(css.split("@view-transition").length - 1, "one rule").toBe(1);
      // The at-rule is a child of the media block: it is not before it and not after it
      const media = css.indexOf(MEDIA);
      expect(media, `${MEDIA} {…}`).toBeGreaterThan(-1);
      expect(css.indexOf("@view-transition"), "the rule is after the media query opens").toBeGreaterThan(media);
      let depth = 0;
      let close = -1;
      for (let i = css.indexOf("{", media); i < css.length; i++) {
        if (css[i] === "{") depth++;
        else if (css[i] === "}" && --depth === 0) {
          close = i;
          break;
        }
      }
      expect(close, "the media block closes").toBeGreaterThan(-1);
      expect(css.indexOf("@view-transition"), "the rule is before the media query closes").toBeLessThan(close);
    });

    it(`${label}: the group, the old and the new picture of the root are timed inside the same media query`, () => {
      const css = squeeze(read(file));
      const media = css.slice(css.indexOf(MEDIA));
      for (const part of ["group", "old", "new"]) expect(media, `::view-transition-${part}(root)`).toContain(`::view-transition-${part}(root)`);
      // …and the selectors of the sheet name no pseudo-element outside the query
      expect(css.slice(0, css.indexOf(MEDIA)).includes("::view-transition"), "nothing is timed before the media query").toBe(false);
    });
  }

  it("the built file is the order statement and one `luz.catalog` block that holds the media query and nothing else: no unlayered rule, no luz.print", () => {
    const items = topLevel(read(SHEET));
    const blocks = items.filter((it) => it.body !== null);
    expect(items.filter((it) => it.body === null).map((it) => it.prelude.split(/\s/)[0]), "only the @layer order statement is without a block").toEqual(["@layer"]);
    expect(blocks.map((it) => it.prelude)).toEqual(["@layer luz.catalog"]);
    const inner = topLevel(blocks[0].body);
    expect(inner.map((it) => squeeze(it.prelude)), "the media query is the only child").toEqual([MEDIA]);
    // Under the media query: the at-rule, and one rule for the three pseudo-elements
    const rules = topLevel(inner[0].body);
    expect(rules.map((it) => squeeze(it.prelude)).filter((p) => p.startsWith("@")), "the at-rule").toEqual(["@view-transition"]);
  });

  it("its times and its easing are motion tokens: var(--luz-duration-*) and var(--luz-easing-*), never a literal", () => {
    const inner = topLevel(topLevel(topLevel(read(SHEET)).find((it) => it.prelude === "@layer luz.catalog").body)[0].body);
    const timing = inner.find((it) => it.prelude.includes("::view-transition-old(root)"));
    expect(timing, "the rule that times the pictures").toBeTruthy();
    const declarations = Object.fromEntries(timing.body.split(";").map((d) => d.trim()).filter(Boolean).map((d) => d.split(/:(.+)/).slice(0, 2).map((s) => s.trim())));
    expect(Object.keys(declarations).sort()).toEqual(["animation-duration", "animation-timing-function"]);
    const duration = /^var\(--luz-duration-([a-z0-9-]+)\)$/.exec(declarations["animation-duration"]);
    const easing = /^var\(--luz-easing-([a-z0-9-]+)\)$/.exec(declarations["animation-timing-function"]);
    expect(duration, `animation-duration: ${declarations["animation-duration"]}`).not.toBeNull();
    expect(easing, `animation-timing-function: ${declarations["animation-timing-function"]}`).not.toBeNull();
    expect(Object.keys(tokens.duration), "a token that exists").toContain(duration[1]);
    expect(Object.keys(tokens.easing), "a token that exists").toContain(easing[1]);
    for (const file of [`packages/catalog/src/components/${NAME}.css`, SHEET, `packages/catalog/dist/components/${NAME}.min.css`]) {
      const css = read(file).replace(/\/\*[\s\S]*?\*\//g, "");
      expect(css, `${file}: no time written by hand`).not.toMatch(/\d(?:\.\d+)?m?s\b/);
      expect(css, `${file}: no curve written by hand`).not.toMatch(/cubic-bezier|steps\(|\blinear\b|\bease(?:-in|-out|-in-out)?\b/);
    }
  });

  it("moves, scales and names nothing: no animation, no keyframes, no view-transition-name, no transform", () => {
    const css = read(`packages/catalog/src/components/${NAME}.css`).replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).not.toMatch(/@keyframes|view-transition-name|view-transition-class|\banimation-name\b|transform|translate|scale|::view-transition-image-pair/);
  });

  it("the layer test knows it: nothing of it is unlayered, and it prints nothing", () => {
    const src = read(`packages/catalog/src/components/${NAME}.css`);
    expect(src, "no print rule: the page is not changed on paper").not.toMatch(/@media\s+print/);
    expect(src, "forced colours are not touched").not.toMatch(/forced-colors/);
  });
});

/* ---- Its page --------------------------------------------------------------- */

describe("the page /docs/catalog/page-transition/", () => {
  const site = scanSite(join(repo, "apps/docs"), repo);
  const page = site.byRoute.get("/docs/catalog/page-transition/");
  const catalog = site.pages.filter((p) => p.meta.area === "catalog");

  it("exists in the Catalog area, in the group site-wide, for any site, with its own file", () => {
    expect(page, "apps/docs/pages/catalog/page-transition.html").toBeTruthy();
    expect(page.file).toBe("apps/docs/pages/catalog/page-transition.html");
    expect(page.meta).toMatchObject({ area: "catalog", group: "site-wide", "fits-kinds": "any", files: "components/page-transition.css", toc: "h2,h3" });
    expect(page.meta.fits.length).toBeGreaterThan(10);
  });

  it("has the order 34, the last of the area, and no other page of the area has it", () => {
    expect(Number(page.meta.order)).toBe(34);
    expect(catalog.filter((p) => p.meta.order === page.meta.order).map((p) => p.route)).toEqual([page.route]);
    expect(Math.max(...catalog.map((p) => Number(p.meta.order)))).toBe(34);
  });

  it("is the docs-component p-page-transition, as the specs find a page by its id", () => {
    expect(page.body).toContain('<div class="docs-component" id="p-page-transition">');
  });

  it("has the mandatory structure: example, known issues, then the Code and Design tabs", () => {
    for (const id of ["example", "known-issues", "code", "markup", "variants", "how", "no-js", "keyboard", "design", "when", "when-not", "do-dont", "content", "contrast", "tokens"]) {
      expect(page.body, id).toMatch(new RegExp(`<h[23][^>]*\\bid="${id}"`));
    }
  });

  it("says in Known issues what a reader cannot count on: Firefox does not play it, the browsers that do, and when it plays", () => {
    const html = page.body.slice(page.body.indexOf('id="known-issues"'));
    const text = textOf(html.slice(0, html.search(/<nav\b/)));
    expect(text).toMatch(/Firefox/);
    expect(text).toMatch(/Chrome/);
    expect(text).toMatch(/Edge/);
    expect(text).toMatch(/Safari/);
    expect(text, "both pages must link the stylesheet").toMatch(/both|same site/i);
    expect(text, "a first visit, a reload and a typed address do not play it").toMatch(/first visit|reload|types an address/i);
  });

  it("teaches no luz element or class in Copy the markup: the markup is an ordinary link", () => {
    const section = page.body.slice(page.body.indexOf('id="markup"'), page.body.indexOf('id="variants"'));
    expect(section).not.toMatch(/<luz-|class="luz-(?!code-block|copy-btn)/);
  });

  it("promises no setting, no control and no script: it says there are none, and links no module", () => {
    expect(page.meta.module, "no module").toBeFalsy();
    expect(page.body).not.toMatch(/data-luz-transition|luz-transition-mode|<luz-transition|luz-transition\b/);
  });

  it("reads its tokens from the motion family, the two the sheet reads", () => {
    expect(page.body).toMatch(/<a href="\/docs\/tokens\/motion\/">Motion<\/a>/);
    expect(page.body).toContain("--luz-duration-base");
    expect(page.body).toContain("--luz-easing-standard");
  });

  it("has a Spanish translation whose `source` is the hash of this English body, and that says it is pending review", () => {
    const file = "apps/docs/i18n/es/pages/catalog/page-transition.html";
    expect(exists(file), file).toBe(true);
    const { meta, body } = parseTranslation(read(file), file);
    expect(meta.source, "pnpm check:i18n prints the right one").toBe(sourceHash(page.body));
    expect(meta.reviewed, "an agent's translation is published with reviewed: false").toBe(false);
    expect(meta.title).toMatch(/Transición/);
    expect(body).toContain('<div class="docs-component" id="p-page-transition">');
  });
});

/* ---- The pages that link it ---------------------------------------------------- */

describe("which pages link the sheet", () => {
  const linkOf = (html) => [...html.matchAll(/<link\b[^>]*>/g)].map((m) => m[0]).filter((tag) => tag.includes(`${NAME}.css`));

  it("the layout of the docs links it once, as a stylesheet, after core's", () => {
    const html = read("apps/docs/_layouts/page.html");
    const tags = linkOf(html);
    expect(tags).toHaveLength(1);
    expect(tags[0]).toMatch(/rel="stylesheet"/);
    expect(tags[0]).toContain(`href="${SHEET_URL}"`);
    expect(html.indexOf(tags[0]), "after core").toBeGreaterThan(html.indexOf("/packages/core/dist/luz.css"));
    expect(html, "no script of its own").not.toMatch(/page-transition\.(?:min\.)?js/);
  });

  it("the home page links it once", () => {
    const tags = linkOf(read("apps/landing/index.html"));
    expect(tags).toHaveLength(1);
    expect(tags[0]).toContain(`href="${SHEET_URL}"`);
  });

  it("the 404 layout does not: a page with no sheet to match is not part of the fade", () => {
    expect(read("apps/docs/_layouts/not-found.html")).not.toContain(NAME);
    expect(read("apps/docs/404.html")).not.toContain(NAME);
  });

  it("CASCADE ends with it, after the patterns, and a kind's snippet and prompt link it last", () => {
    expect(CASCADE.at(-1)).toBe(NAME);
    expect(new Set(CASCADE).size, "once").toBe(CASCADE.length);
  });
});

/* ---- The accessibility statement ------------------------------------------------ */

describe("the accessibility statement says what the page's Known issues say", () => {
  const known = () => sectionsOf(readPage("accessibility.html").body).get("h-a11y-known");
  const bullet = () => [...known().html.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => ({ html: m[1], text: textOf(m[1]) })).find((i) => /^<strong>\s*Page transition\b/i.test(i.html.trim()));

  it("has a known issue whose bold name says Page transition", () => {
    expect(known(), "a Known issues section").toBeTruthy();
    expect(bullet(), "a bullet <strong>Page transition…</strong>").toBeTruthy();
  });

  it("names the browsers that play it and the one that does not, and says reduced motion stops it", () => {
    const t = bullet()?.text ?? "";
    expect(t).toMatch(/Firefox/);
    expect(t).toMatch(/Chrome|Edge/);
    expect(t).toMatch(/Safari/);
    expect(t).toMatch(/reduced motion/i);
  });
});

/* ---- stylelint: the name in ::view-transition-old(root) is not a bare element ---------------------- */

describe("luz/no-bare-element and the pseudo-elements of a view transition", () => {
  const lint = async (code) => {
    const { results } = await stylelint.lint({
      code,
      codeFilename: "packages/catalog/src/components/fixture.css",
      config: { plugins: [join(repo, "scripts/stylelint/no-bare-element.js")], rules: { "luz/no-bare-element": true } },
    });
    return results[0].warnings.map((w) => w.text);
  };

  it.each(["group", "image-pair", "old", "new"])("accepts ::view-transition-%s(root): `root` is the name of the picture, not a type", async (part) => {
    expect(await lint(`::view-transition-${part}(root) { animation-duration: 1s; }`)).toEqual([]);
    expect(await lint(`:where(:root)::view-transition-${part}(root) { animation-duration: 1s; }`)).toEqual([]);
  });

  it("accepts the whole list of the sheet, three selectors in one rule", async () => {
    const code = ":where(:root)::view-transition-group(root),\n:where(:root)::view-transition-old(root),\n:where(:root)::view-transition-new(root) { animation-duration: 1s; }";
    expect(await lint(code)).toEqual([]);
  });

  it("still rejects a bare `root` type selector, alone or in a list", async () => {
    expect(await lint("root { margin: 0; }")).toHaveLength(1);
    expect(await lint(":where(:root)::view-transition-old(root), root { margin: 0; }")).toHaveLength(1);
    expect(await lint(":is(root) { margin: 0; }")).toHaveLength(1);
  });

  it("still rejects an element in front of the pseudo-element", async () => {
    expect(await lint("html::view-transition-old(root) { animation-duration: 1s; }")).toHaveLength(1);
  });
});
