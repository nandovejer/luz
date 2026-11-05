/**
 * A docs page of controls (front matter `parts: controls`): the Form fields page is not one component with one pair of
 * tabs, it is families (h2) of controls (h3), and each control has its own example and its own Code and Design tabs.
 *
 *   front matter  `parts` is "controls" or empty, a translation inherits it (it never says it), and it is on the form page
 *   structure     h2 = a family, h3 = a control inside div.docs-control, each with a summary and an example; each control
 *                 has a tab row (Code, Design) named after it, the two panels with the eleven sections of the template in
 *                 the order of PRINCIPLES SR-5 (h4 for the panel title, h5 for the sections, every id prefixed by the
 *                 control's), When to use and When not to use say something (RL-18), Known issues once at the page's level
 *   family notes  each family ends with div.docs-family-notes: its Contrast and focus and its Tokens (the figures are
 *                 recomputed in tests/docs-design.test.js); a control's own two sections point at them
 *   sidebar       the group "Form fields" has its families as anchor links, and its label is the link to the page
 *   rail          "On this page" lists the families and the controls
 *   Select        is a control of Choice, not a page
 * AI files     llms-full.txt keeps, for each control, its summary, its markup and the lead of when to use it (not its variants, how it works, keys list or when not), and none of the
 *               family notes; the example document of the page (/examples/components/form.html) has every control's markup
 * What a browser does with the rows (they follow one choice) is tests/docs-controls.spec.js.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { exampleDocuments, renderLlmsFull } from "../scripts/docs-site/ai.js";
import { decodeEntities } from "../scripts/docs-site/html.js";
import { parseFrontMatter } from "../scripts/docs-site/site.js";
import { CODE_SECTIONS, DESIGN_SECTIONS, controlsPages, readControls, sectionOf, words } from "./helpers/docs-controls.js";
import { buildReal, repo, site } from "./helpers/debug-page.js";
import { docsI18nModule } from "./helpers/docs-i18n-fixture.js";
import { findAll, hasClass, parse, query, queryAll, textOf } from "./helpers/html-dom.js";

const areas = null;
const page = site.byRoute.get("/docs/components/form/");
const read = readControls(page);
const controls = read.families.flatMap((f) => f.controls.map((c) => ({ ...c, family: f })));
const SECTION_ORDER = [...CODE_SECTIONS, ...DESIGN_SECTIONS];

describe("front matter: parts", () => {
  const PAGE = (extra) => `<!-- luz:page\ntitle: A\ndescription: About A.\narea: components\n${extra}-->\n<p>x</p>\n`;

  it('is "controls" or empty, and nothing else', () => {
    expect(parseFrontMatter(PAGE("parts: controls\n"), "x.html", areas).meta.parts).toBe("controls");
    expect(parseFrontMatter(PAGE(""), "x.html", areas).meta.parts).toBe("");
    for (const value of ["tabs", "Controls", "true"]) expect(() => parseFrontMatter(PAGE(`parts: ${value}\n`), "x.html", areas), value).toThrow(/parts/);
  });

  it("is on the Form fields page, and only pages of the components area use it", () => {
    expect(controlsPages(site).map((p) => p.route)).toContain("/docs/components/form/");
    for (const p of controlsPages(site)) expect(p.meta.area, p.file).toBe("components");
  });

  it("is inherited by a translation of the page, which never writes it", async () => {
    const { localize } = await docsI18nModule();
    const es = site.docsI18n.byCode.get("es");
    const view = localize(site, es).byRoute.get("/es/docs/components/form/");
    expect(view.meta.parts).toBe("controls");
    expect(es.pages.get("/docs/components/form/").meta.parts).toBeUndefined();
  });
});

describe("the Form fields page: families and controls", () => {
  it("has the families Inputs and Choice, before Known issues, and the controls of each", () => {
    const family = (id) => read.families.find((f) => f.id === id);
    expect(read.families.map((f) => f.id)).toEqual(expect.arrayContaining(["inputs", "choice"]));
    expect(family("inputs").controls.map((c) => c.id)).toEqual(expect.arrayContaining(["text", "email"]));
    expect(family("choice").controls.map((c) => c.id)).toEqual(expect.arrayContaining(["checkbox", "select"]));
    expect(page.meta.toc).toBe("h2,h3");
  });

  it("makes Select a control of Choice, and no page of its own", () => {
    expect(site.byRoute.has("/docs/components/select/")).toBe(false);
    expect(existsSync(join(repo, "apps/docs/pages/components/select.html"))).toBe(false);
    expect(existsSync(join(repo, "apps/docs/i18n/es/pages/components/select.html"))).toBe(false);
  });

  it("gives every family a sentence, and every control a summary and a live example, wrapped in .docs-control", () => {
    for (const family of read.families) {
      const intro = words(read.between({ node: family.node }, family.controls[0]));
      expect(intro.length, `${family.id} intro`).toBeGreaterThan(20);
      expect(family.controls.length, family.id).toBeGreaterThanOrEqual(1);
    }
    for (const control of controls) {
      expect(control.node.parent.name === "div" && hasClass(control.node.parent, "docs-control"), `${control.id} is in div.docs-control`).toBe(true);
      const wrapper = control.node.parent;
      const kids = wrapper.children;
      // The h3, its summary, its example (a specimen), then the tab row
      const after = kids.slice(kids.indexOf(control.node) + 1);
      expect(after[0].name, `${control.id} summary`).toBe("p");
      expect(textOf(after[0]).length, `${control.id} summary`).toBeGreaterThan(20);
      const example = after.find((n) => n.attrs.has("data-docs-specimen"));
      expect(example, `${control.id} example`).toBeTruthy();
      const tabs = after.find((n) => n.name === "nav");
      expect(tabs, `${control.id} tab row`).toBeTruthy();
      expect(after.indexOf(example), control.id).toBeLessThan(after.indexOf(tabs));
    }
  });

  it("gives each control its own tab row, Code then Design, named after it", () => {
    for (const control of controls) {
      const nav = control.node.parent.children.find((n) => n.name === "nav");
      expect(nav.attrs.get("class"), control.id).toBe("luz-tabs docs-view-tabs");
      expect(nav.attrs.get("aria-label"), control.id).toBe(`${control.title} documentation`);
      const links = nav.children.filter((n) => n.name === "a");
      expect(
        links.map((a) => [a.attrs.get("class"), a.attrs.get("href"), a.attrs.get("data-docs-view"), textOf(a)]),
        control.id,
      ).toEqual([
        ["luz-tab", `#${control.id}-code-panel`, "code", "Code"],
        ["luz-tab", `#${control.id}-design-panel`, "design", "Design"],
      ]);
    }
  });

  it("gives each control two panels, titled by an h4, with the eleven sections of the template in order, ids prefixed by the control's", () => {
    for (const control of controls) {
      const wrapper = control.node.parent;
      for (const [panel, ids] of [["code", CODE_SECTIONS], ["design", DESIGN_SECTIONS]]) {
        const node = wrapper.children.find((n) => n.attrs.get("id") === `${control.id}-${panel}-panel`);
        expect(node, `${control.id} ${panel} panel`).toBeTruthy();
        expect(node.attrs.get("class"), `${control.id} ${panel} panel`).toBe("luz-tabpanel docs-view");
        const own = findAll(node, (n) => /^h[1-6]$/.test(n.name));
        // The panel title is an h4, the sections h5, nothing else
        expect(own.map((h) => [h.name, h.attrs.get("id")]), `${control.id} ${panel}`).toEqual([
          ["h4", `${control.id}-${panel}`],
          ...ids.map((id) => ["h5", `${control.id}-${id}`]),
        ]);
        expect(own[0].attrs.get("class"), `${control.id} ${panel}`).toBe("docs-view__title");
        expect(textOf(own[0]), `${control.id} ${panel}`).toBe(panel === "code" ? "Code" : "Design");
        // It ends with the one line that points at the other tab
        const last = node.children.filter((n) => n.name !== "#text").at(-1);
        expect(last.name === "p" && hasClass(last, "docs-view__xref"), `${control.id} ${panel} ends with its xref`).toBe(true);
        expect(query(last, "a").attrs.get("href"), `${control.id} ${panel}`).toMatch(new RegExp(`^#${control.id}-[a-z-]+$`));
      }
      expect(control.headings.map((h) => h.id), control.id).toEqual([
        `${control.id}-code`,
        ...CODE_SECTIONS.map((id) => `${control.id}-${id}`),
        `${control.id}-design`,
        ...DESIGN_SECTIONS.map((id) => `${control.id}-${id}`),
      ]);
    }
    expect(SECTION_ORDER).toHaveLength(11);
  });

  it("keeps every section of every control short but not empty, and the markup in a code block", () => {
    for (const control of controls) {
      for (const id of SECTION_ORDER) {
        const html = sectionOf(read, `${control.id}-${id}`);
        expect(words(html).length, `${control.id}-${id}`).toBeGreaterThan(5);
      }
      expect(sectionOf(read, `${control.id}-markup`), `${control.id}-markup`).toMatch(/<pre\b[^>]*\bdata-lang="html"/);
    }
  });

  it("makes When to use and When not to use say something, for each control (PRINCIPLES RL-18)", () => {
    for (const control of controls) {
      for (const id of ["when", "when-not"]) expect(words(sectionOf(read, `${control.id}-${id}`)).length, `${control.id}-${id}`).toBeGreaterThan(20);
    }
  });

  it("has every id once on the page, and every link to #id points at one", () => {
    const ids = [...page.body.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    const seen = new Set();
    const twice = ids.filter((id) => (seen.has(id) ? true : (seen.add(id), false)));
    expect(twice).toEqual([]);
    const dead = [...page.body.matchAll(/\shref="#([^"]+)"/g)].map((m) => m[1]).filter((id) => !seen.has(id));
    expect(dead).toEqual([]);
    // Each tab's panel, and the label of each panel, exist
    for (const control of controls) for (const id of [`${control.id}-code-panel`, `${control.id}-design-panel`]) expect(seen.has(id), id).toBe(true);
  });

  it("has Known issues once, after the families, with a sentence", () => {
    expect(page.body.match(/\sid="known-issues"/g)).toHaveLength(1);
    expect(read.knownIssues, "the h2 Known issues").toBeTruthy();
    expect(read.knownIssues.level).toBe(2);
    const after = read.headings.indexOf(read.knownIssues);
    expect(after).toBeGreaterThan(read.headings.findIndex((h) => h.id === read.families.at(-1).id));
    expect(words(read.between(read.knownIssues, read.headings[after + 1])).length).toBeGreaterThan(4);
  });
});

describe("the family notes: one Contrast and focus and one Tokens at the end of each family", () => {
  it("has, in div.docs-family-notes after the controls of the family, the h3s <family>-contrast and <family>-tokens", () => {
    for (const family of read.families) {
      expect(family.notes.map((h) => h.id), family.id).toEqual([`${family.id}-contrast`, `${family.id}-tokens`]);
      const wrapper = family.notes[0].node.parent;
      expect(hasClass(wrapper, "docs-family-notes"), `${family.id} notes wrapper`).toBe(true);
      expect(family.notes[1].node.parent, family.id).toBe(wrapper);
      const last = family.controls.at(-1).node.parent;
      expect(wrapper.open.index, `${family.id}: after its controls`).toBeGreaterThan(last.open.index);
    }
    expect(queryAll(read.tree, "div.docs-family-notes")).toHaveLength(read.families.length);
  });

  it("points each control's Contrast and focus and Tokens it uses at the family's notes", () => {
    for (const control of controls) {
      for (const kind of ["contrast", "tokens"]) {
        const html = sectionOf(read, `${control.id}-${kind}`);
        expect(html, `${control.id}-${kind}`).toContain(`href="#${control.family.id}-${kind}"`);
      }
    }
  });
});

describe("the sidebar and the rail of the Form fields page", () => {
  // buildSite() renders every page in every language, a few seconds
  beforeAll(() => {
    buildReal();
  }, 120_000);

  const navGroup = (route) => {
    const tree = parse(buildReal().rendered.get(route), route);
    const label = findAll(tree, (n) => n.attrs.get("id") === "nav-forms")[0];
    const group = label?.parent;
    return { label, links: group ? queryAll(group, "ul.docs-nav__pages").flatMap((ul) => findAll(ul, (n) => n.name === "a")) : [] };
  };
  const families = read.families.map((f) => [`/docs/components/form/#${f.id}`, f.title]);

  it("lists, under the label Form fields, the families as anchor links to the page, and nothing else", () => {
    for (const route of ["/docs/components/form/", "/docs/components/button/"]) {
      const { label, links } = navGroup(route);
      expect(textOf(label), route).toBe("Form fields");
      expect(links.map((a) => [a.attrs.get("href"), textOf(a)]), route).toEqual(families);
      for (const a of links) expect(a.attrs.has("aria-current"), `${route} ${a.attrs.get("href")}`).toBe(false);
    }
  });

  it("makes the label the link to the page, and marks it current on the page only", () => {
    const own = navGroup("/docs/components/form/").label;
    expect(own.name).toBe("a");
    expect(own.attrs.get("href")).toBe("/docs/components/form/");
    expect(own.attrs.get("aria-current")).toBe("page");
    const other = navGroup("/docs/components/button/").label;
    expect(other.name).toBe("a");
    expect(other.attrs.get("href")).toBe("/docs/components/form/");
    expect(other.attrs.has("aria-current")).toBe(false);
  });

  it("says Campos de formulario in Spanish, where the page is the link until it is translated to the new structure", () => {
    const { label, links } = navGroup("/es/docs/components/form/");
    expect(textOf(label)).toBe("Campos de formulario");
    expect(links.length).toBeGreaterThanOrEqual(1);
    const anyPage = navGroup("/es/docs/components/button/");
    expect(textOf(anyPage.label)).toBe("Campos de formulario");
    // The label is a link to the page when the Spanish page has the families; either way no link goes to the English select
    for (const a of [...links, ...anyPage.links]) expect(a.attrs.get("href"), "no select page").not.toMatch(/\/components\/select\//);
  });

  it('"On this page" lists the families and, under each, its controls, and no section of a control', () => {
    const tree = parse(buildReal().rendered.get("/docs/components/form/"), "form");
    const rail = query(tree, "nav.luz-page-rail__onpage");
    const top = rail.children.flatMap((c) => findAll(c, (n) => n.name === "ul" && hasClass(n, "luz-page-rail__list")));
    const items = top[0].children.filter((n) => n.name === "li");
    const listed = items.map((li) => {
      const [a, ...rest] = li.children;
      const sub = rest.find((n) => n.name === "ul");
      return [a.attrs.get("href"), sub ? sub.children.filter((n) => n.name === "li").map((n) => n.children[0].attrs.get("href")) : []];
    });
    for (const family of read.families) {
      const found = listed.find(([href]) => href === `#${family.id}`);
      expect(found, family.id).toBeTruthy();
      expect(found[1], family.id).toEqual(expect.arrayContaining(family.controls.map((c) => `#${c.id}`)));
    }
    const all = findAll(rail, (n) => n.name === "a").map((a) => a.attrs.get("href"));
    for (const control of controls) expect(all, `no link to a section of ${control.id}`).not.toContain(`#${control.id}-markup`);
  });
});

describe("the AI files of a page of controls", () => {
  const norm = (text) => text.replace(/`/g, "").replace(/\s+/g, " ").trim();
  /** The text of inline HTML as it reads: tags dropped without a space, entities decoded. */
  const inline = (html) => norm(decodeEntities(html.replace(/<[^>]+>/g, "")));
  const entry = () => {
    const full = renderLlmsFull(site, { siteUrl: "https://luzds.com/" });
    const start = full.indexOf("URL: https://luzds.com/docs/components/form/\n");
    expect(start, "an entry for the form page in llms-full.txt").toBeGreaterThan(0);
    const from = full.lastIndexOf("\n## ", start) + 1;
    const to = full.indexOf("\n## ", start);
    return full.slice(from, to === -1 ? undefined : to);
  };
  const htmlBlocks = (control) =>
    [...sectionOf(read, `${control.id}-markup`).matchAll(/<pre\b([^>]*\bdata-lang="html"[^>]*)>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/g)].map((m) => ({
      label: decodeEntities(/\baria-label="([^"]*)"/.exec(m[1])?.[1] ?? ""),
      code: decodeEntities(m[2]).trim(),
    }));

  /** The text of an entry from the heading of a control to the next control, family or page-level heading. */
  const chunkOf = (text, title) => {
    const start = text.indexOf(`#### ${title}\n`);
    expect(start, `#### ${title}`).toBeGreaterThanOrEqual(0);
    const rest = text.slice(start + 5);
    const end = rest.search(/\n###+ /);
    return rest.slice(0, end === -1 ? undefined : end);
  };
  /** The field wrapper is dropped from a control's markup when its sample is only that wrapper around the control. */
  const isWrapped = (code, family) =>
    family.id !== "field" && code.split("\n")[0] === '<div class="luz-field">' && code.split("\n").at(-1) === "</div>" && !/<label\b.*<output\b/.test(code);

  it("has in llms-full.txt, for each control, its summary and its code only, under its family, with the field wrapper shown once in the family that opens the page", () => {
    const text = entry();
    const plain = norm(text);
    let at = -1;
    for (const family of read.families) {
      const heading = text.indexOf(`### ${family.title}\n`);
      expect(heading, `family ${family.id}`).toBeGreaterThan(at);
      at = heading;
      for (const control of family.controls) {
        const own = text.indexOf(`#### ${control.title}\n`);
        expect(own, `control ${control.id}`).toBeGreaterThan(at);
        at = own;
        const chunk = chunkOf(text, control.title);
        const summary = textOf(control.node.parent.children[control.node.parent.children.indexOf(control.node) + 1]);
        expect(plain, `${control.id} summary`).toContain(norm(summary));
        const blocks = htmlBlocks(control);
        expect(blocks.length, `${control.id} has markup`).toBeGreaterThanOrEqual(1);
        for (const block of blocks) {
          if (isWrapped(block.code, family)) {
            // The control's own lines, without the label, hint and error of the wrapper
            const own = block.code
              .split("\n")
              .slice(1, -1)
              .map((l) => l.trim())
              .filter((l) => !/^<(?:label class="luz-field__label|div class="luz-field__(?:helper|error)")/.test(l));
            expect(own.length, `${control.id} has a control line`).toBeGreaterThanOrEqual(1);
            for (const line of own) expect(chunk, `${control.id}: ${line}`).toContain(line);
            expect(chunk, `${control.id} leaves the wrapper to the family`).not.toContain("luz-field__label");
            expect(chunk, `${control.id}`).not.toContain('class="luz-field"');
          } else {
            expect(chunk, `${control.id} keeps its markup whole`).toContain(block.code);
          }
          // No label line and no heading of its own: the code follows the summary
          expect(chunk, `${control.id}: ${block.label}`).not.toContain(block.label);
        }
        expect(chunk, control.id).not.toContain("##### Copy the markup");
        // When to use stays on the page
        expect(chunk, `${control.id} has no When to use`).not.toContain("##### When to use");
        const when = /<p>([\s\S]*?)<\/p>/.exec(sectionOf(read, `${control.id}-when`))[1];
        expect(norm(chunk), `${control.id} when`).not.toContain(inline(when));
        // The keys, only when they are one short sentence (100 characters, no list)
        const keys = sectionOf(read, `${control.id}-keyboard`);
        const sentence = inline(keys);
        if (!/<(?:ul|ol|table|pre)\b/.test(keys) && /^\s*<p\b[\s\S]*<\/p>\s*$/.test(keys) && sentence.length <= 100) {
          expect(norm(chunk), `${control.id} short keys`).toContain(sentence);
        } else {
          expect(chunk, `${control.id} long keys stay on the page`).not.toContain("##### Keyboard and ARIA");
        }
      }
    }
    // The wrapper, once, in the intro of the family that opens the page
    const first = read.families[0];
    const intro = text.slice(text.indexOf(`### ${first.title}\n`), text.indexOf(`#### ${first.controls[0].title}\n`));
    expect(intro, "the wrapper in the first family's intro").toMatch(/```html\n<div class="luz-field">\n\s*<label class="luz-field__label"/);
  });

  it("leaves out of llms-full.txt the notes of a family, and, for each control, what is on the page only (variants, how, no JavaScript, when not, do and don't, content, contrast, tokens)", () => {
    const text = entry();
    for (const family of read.families) {
      for (const note of family.notes) expect(text, note.id).not.toContain(note.text);
    }
    for (const heading of ["Variants and options", "How it works", "Without JavaScript", "When not to use", "Do and don't", "Writing the content", "Contrast and focus", "Tokens it uses"]) {
      expect(text, `##### ${heading}`).not.toContain(`##### ${heading}`);
    }
    // The page-level sections stay: known issues, and what the controls have in common
    expect(text).toContain("### Known issues");
    expect(text).toContain("### How form fields work");
  });

  it("makes the example document hold the markup of every control, each block under its aria-label", () => {
    const versions = { tokens: "1.0.0", core: "1.0.0", catalog: "1.0.0" };
    const doc = exampleDocuments(site, { csp: "default-src 'self'", versions }).find((d) => d.route === "/examples/components/form.html");
    expect(doc, "/examples/components/form.html").toBeTruthy();
    for (const control of controls) {
      for (const block of htmlBlocks(control)) {
        expect(doc.html, `${control.id}: ${block.label}`).toContain(block.code);
        expect(doc.html, `${control.id}: ${block.label}`).toContain(`>${block.label.replace(/&/g, "&amp;")}</h2>`);
      }
    }
    // The page's own address is in it, and it points at the markup of a control: an id of the page that ends in markup
    const link = /<a href="([^"]*)">[^<]*in the LUZ documentation<\/a>/.exec(doc.html)?.[1];
    expect(link?.split("#")[1], "the link goes to a section of markup").toMatch(/^(?:[a-z0-9-]+-)?markup$/);
    expect(link, "link to the docs page").toBeTruthy();
    const hash = link.split("#")[1];
    if (hash) expect(page.body).toContain(`id="${hash}"`);
  });
});
