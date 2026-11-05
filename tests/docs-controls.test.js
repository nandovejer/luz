/**
 * The pages of Form fields are pages of controls (front matter `parts: controls`): Inputs, Choice, Values and Field parts. A
 * page is not one component with one pair of tabs: each control is an h2 with its own example and its own Code and Design tabs.
 *
 *   front matter  `parts` is "controls" or empty; the four pages have it, in the group `forms`, `order` 1 to 4, `toc: h2`
 *   structure     h2 = a control, inside div.docs-control, with a summary and an example; each control has a tab row (Code,
 *                 Design) named after it, the two panels with the eleven sections of the template in the order of
 *                 PRINCIPLES SR-5 (h3 for the panel title, h4 for the sections, every id prefixed by the control's), When
 *                 to use and When not to use say something (RL-18), and one Known issues at the end of the page
 *   family notes  at the end, div.docs-family-notes: the Contrast and focus and the Tokens of the page's controls (the figures are
 *                 recomputed in tests/docs-design.test.js); a control's own two sections point at them
 *   sidebar       the group "Form fields" is an ordinary labelled group of the four pages
 *   rail          "On this page" lists the controls, never the notes (tests/docs-rail-controls.test.js)
 *   Select        is a control of Choice, not a page
 *   AI files      llms-full.txt has a page's lead and one entry per control: its summary and its code
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
const SLUGS = ["form-inputs", "form-choice", "form-values", "form-field-parts"];
/** The controls each page must have (it may have more). */
const WANTED = {
  "form-inputs": ["text", "email", "textarea", "range", "color"],
  "form-choice": ["checkbox", "select"],
  "form-values": ["meter", "output"],
  "form-field-parts": ["label", "fieldset"],
};
const pages = controlsPages(site);
const reads = new Map(pages.map((p) => [p.route, readControls(p)]));
const all = pages.flatMap((page) => reads.get(page.route).controls.map((control) => ({ ...control, page, read: reads.get(page.route) })));
const slugOf = (page) => page.route.split("/").filter(Boolean).at(-1);

describe("front matter: parts", () => {
  const PAGE = (extra) => `<!-- luz:page\ntitle: A\ndescription: About A.\narea: components\n${extra}-->\n<p>x</p>\n`;

  it('is "controls" or empty, and nothing else', () => {
    expect(parseFrontMatter(PAGE("parts: controls\n"), "x.html", areas).meta.parts).toBe("controls");
    expect(parseFrontMatter(PAGE(""), "x.html", areas).meta.parts).toBe("");
    for (const value of ["tabs", "Controls", "true"]) expect(() => parseFrontMatter(PAGE(`parts: ${value}\n`), "x.html", areas), value).toThrow(/parts/);
  });

  it("is on the four pages of Form fields, in the group forms, ordered 1 to 4, with an h2 table of contents", () => {
    expect(pages.map(slugOf)).toEqual(SLUGS);
    for (const [i, p] of pages.entries()) {
      expect([p.meta.area, p.meta.group, p.meta.order, p.meta.toc], p.file).toEqual(["components", "forms", String(i + 1), "h2"]);
    }
    expect(site.byRoute.has("/docs/components/form/"), "the page of before the four").toBe(false);
  });

  it("is kept by the page a language shows, translated or not", async () => {
    const { localize } = await docsI18nModule();
    const view = localize(site, site.docsI18n.byCode.get("es"));
    for (const slug of SLUGS) expect(view.byRoute.get(`/es/docs/components/${slug}/`).meta.parts, slug).toBe("controls");
  });
});

describe("a page of controls: the controls", () => {
  it("has, on each of the four pages, its controls (and at least the ones this page is for), each an h2", () => {
    for (const page of pages) {
      const ids = reads.get(page.route).controls.map((c) => c.id);
      expect(ids, page.file).toEqual(expect.arrayContaining(WANTED[slugOf(page)]));
      expect(new Set(ids).size, page.file).toBe(ids.length);
    }
  });

  it("makes Select a control of Choice, and no page of its own", () => {
    expect(reads.get("/docs/components/form-choice/").controls.map((c) => c.id)).toContain("select");
    expect(site.byRoute.has("/docs/components/select/")).toBe(false);
    expect(existsSync(join(repo, "apps/docs/pages/components/select.html"))).toBe(false);
    expect(existsSync(join(repo, "apps/docs/i18n/es/pages/components/select.html"))).toBe(false);
  });

  it("gives every control a summary and a live example, wrapped in .docs-control", () => {
    for (const control of all) {
      const wrapper = control.node.parent;
      expect(wrapper.name === "div" && hasClass(wrapper, "docs-control"), `${control.id} is in div.docs-control`).toBe(true);
      const kids = wrapper.children;
      // The h2, its summary, its example (a specimen), then the tab row
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
    for (const control of all) {
      const nav = control.node.parent.children.find((n) => n.name === "nav");
      expect(nav.attrs.get("class"), control.id).toBe("luz-tabs docs-view-tabs");
      expect(nav.attrs.get("aria-label"), control.id).toBe(`${control.title} documentation`);
      const links = nav.children.filter((n) => n.name === "a");
      expect(links.map((a) => [a.attrs.get("class"), a.attrs.get("href"), a.attrs.get("data-docs-view"), textOf(a)]), control.id).toEqual([
        ["luz-tab", `#${control.id}-code-panel`, "code", "Code"],
        ["luz-tab", `#${control.id}-design-panel`, "design", "Design"],
      ]);
    }
  });

  it("gives each control two panels, titled by an h3, with the eleven sections of the template in order, ids prefixed by the control's", () => {
    for (const control of all) {
      const wrapper = control.node.parent;
      for (const [panel, ids] of [["code", CODE_SECTIONS], ["design", DESIGN_SECTIONS]]) {
        const node = wrapper.children.find((n) => n.attrs.get("id") === `${control.id}-${panel}-panel`);
        expect(node, `${control.id} ${panel} panel`).toBeTruthy();
        expect(node.attrs.get("class"), `${control.id} ${panel} panel`).toBe("luz-tabpanel docs-view");
        const own = findAll(node, (n) => /^h[1-6]$/.test(n.name));
        // The panel title is an h3, the sections h4, nothing else
        expect(own.map((h) => [h.name, h.attrs.get("id")]), `${control.id} ${panel}`).toEqual([
          ["h3", `${control.id}-${panel}`],
          ...ids.map((id) => ["h4", `${control.id}-${id}`]),
        ]);
        expect(own[0].attrs.get("class"), `${control.id} ${panel}`).toBe("docs-view__title");
        expect(textOf(own[0]), `${control.id} ${panel}`).toBe(panel === "code" ? "Code" : "Design");
        // It ends with the one line that points at the other tab
        const last = node.children.at(-1);
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
  });

  it("keeps every section of every control short but not empty, and the markup in a code block", () => {
    for (const control of all) {
      for (const id of [...CODE_SECTIONS, ...DESIGN_SECTIONS]) expect(words(sectionOf(control.read, `${control.id}-${id}`)).length, `${control.id}-${id}`).toBeGreaterThan(5);
      expect(sectionOf(control.read, `${control.id}-markup`), `${control.id}-markup`).toMatch(/<pre\b[^>]*\bdata-lang="html"/);
    }
  });

  it("makes When to use and When not to use say something, for each control (PRINCIPLES RL-18)", () => {
    for (const control of all) {
      for (const id of ["when", "when-not"]) expect(words(sectionOf(control.read, `${control.id}-${id}`)).length, `${control.id}-${id}`).toBeGreaterThan(20);
    }
  });

  it("has every id once on each page, and every link to #id points at one", () => {
    for (const page of pages) {
      const ids = [...page.body.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
      const seen = new Set();
      const twice = ids.filter((id) => (seen.has(id) ? true : (seen.add(id), false)));
      expect(twice, page.file).toEqual([]);
      const dead = [...page.body.matchAll(/\shref="#([^"]+)"/g)].map((m) => m[1]).filter((id) => !seen.has(id));
      expect(dead, page.file).toEqual([]);
    }
  });

  it("has one Known issues per page, the last h2, with a sentence", () => {
    for (const page of pages) {
      const read = reads.get(page.route);
      expect(page.body.match(/\sid="known-issues"/g), page.file).toHaveLength(1);
      expect(read.knownIssues, `${page.file}: the h2 Known issues`).toBeTruthy();
      const h2 = read.headings.filter((h) => h.level === 2);
      expect(h2.at(-1), page.file).toBe(read.knownIssues);
      expect(words(read.between(read.knownIssues, null)).length, page.file).toBeGreaterThan(2);
    }
  });
});

describe("the family notes: one Contrast and focus and one Tokens at the end of each page", () => {
  it("has, in div.docs-family-notes after the controls and before Known issues, the h2s <family>-contrast and <family>-tokens", () => {
    for (const page of pages) {
      const read = reads.get(page.route);
      expect(read.family, `${page.file} has family notes`).toBeTruthy();
      expect(read.notes.map((h) => h.id), page.file).toEqual([`${read.family}-contrast`, `${read.family}-tokens`]);
      const wrapper = read.notes[0].node.parent;
      expect(hasClass(wrapper, "docs-family-notes"), page.file).toBe(true);
      expect(read.notes[1].node.parent, page.file).toBe(wrapper);
      expect(wrapper.open.index, `${page.file}: after the controls`).toBeGreaterThan(read.controls.at(-1).node.parent.open.index);
      expect(wrapper.open.index, `${page.file}: before Known issues`).toBeLessThan(read.knownIssues.node.open.index);
      expect(queryAll(read.tree, "div.docs-family-notes"), page.file).toHaveLength(1);
    }
  });

  it("points each control's Contrast and focus and Tokens it uses at the notes of its page", () => {
    for (const control of all) {
      for (const kind of ["contrast", "tokens"]) {
        expect(sectionOf(control.read, `${control.id}-${kind}`), `${control.id}-${kind}`).toContain(`href="#${control.read.family}-${kind}"`);
      }
    }
  });
});

describe("the sidebar of Form fields", () => {
  // buildSite() renders every page in every language, a few seconds
  beforeAll(() => {
    buildReal();
  }, 120_000);

  const group = (route) => {
    const tree = parse(buildReal().rendered.get(route), route);
    const label = findAll(tree, (n) => n.attrs.get("id") === "nav-forms")[0];
    return { label, links: label ? queryAll(label.parent, "ul.docs-nav__pages").flatMap((ul) => findAll(ul, (n) => n.name === "a")) : [] };
  };

  it("is an ordinary labelled group, Form fields, of the four pages in their order, with the current one marked", () => {
    for (const current of ["/docs/components/form-choice/", "/docs/components/button/"]) {
      const { label, links } = group(current);
      expect(label.name, current).toBe("span");
      expect(textOf(label), current).toBe("Form fields");
      expect(links.map((a) => [a.attrs.get("href"), textOf(a)]), current).toEqual(pages.map((p) => [p.route, p.meta.title]));
      expect(links.filter((a) => a.attrs.has("aria-current")).map((a) => [a.attrs.get("href"), a.attrs.get("aria-current")]), current).toEqual(
        current.includes("form-choice") ? [[current, "page"]] : [],
      );
    }
  });

  it("says Campos de formulario in Spanish, with the four pages (in English until they are translated)", () => {
    const { label, links } = group("/es/docs/components/form-values/");
    expect(textOf(label)).toBe("Campos de formulario");
    expect(links.map((a) => a.attrs.get("href"))).toEqual(SLUGS.map((slug) => `/es/docs/components/${slug}/`));
    expect(links.filter((a) => a.attrs.get("aria-current") === "page").map((a) => a.attrs.get("href"))).toEqual(["/es/docs/components/form-values/"]);
  });
});

describe("the AI files of the pages of controls", () => {
  const norm = (text) => text.replace(/`/g, "").replace(/\s+/g, " ").trim();
  /** The text of inline HTML as it reads: tags dropped without a space, entities decoded. */
  const inline = (html) => norm(decodeEntities(html.replace(/<[^>]+>/g, "")));
  let full;
  const entry = (page) => {
    full ??= renderLlmsFull(site, { siteUrl: "https://luzds.com/" });
    const start = full.indexOf(`URL: https://luzds.com${page.route}\n`);
    expect(start, `an entry for ${page.route} in llms-full.txt`).toBeGreaterThan(0);
    const from = full.lastIndexOf("\n## ", start) + 1;
    const to = full.indexOf("\n## ", start);
    return full.slice(from, to === -1 ? undefined : to);
  };
  const htmlBlocks = (control) =>
    [...sectionOf(control.read, `${control.id}-markup`).matchAll(/<pre\b([^>]*\bdata-lang="html"[^>]*)>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/g)].map((m) => ({
      label: decodeEntities(/\baria-label="([^"]*)"/.exec(m[1])?.[1] ?? ""),
      code: decodeEntities(m[2]).trim(),
    }));
  /** The text of an entry from the heading of a control to the next control or page-level heading. */
  const chunkOf = (text, title) => {
    const start = text.indexOf(`\n### ${title}\n`);
    expect(start, `### ${title}`).toBeGreaterThanOrEqual(0);
    const rest = text.slice(start + 5);
    const end = rest.search(/\n##+ /);
    return rest.slice(0, end === -1 ? undefined : end);
  };
  /** The field wrapper is dropped from a control's markup when its sample is only that wrapper around the control. */
  const isWrapped = (code, page) =>
    slugOf(page) !== "form-field-parts" && code.split("\n")[0] === '<div class="luz-field">' && code.split("\n").at(-1) === "</div>" && !/<label\b.*<output\b/.test(code);

  it("has in llms-full.txt, for each control, its summary and its code only, in the order of the page", () => {
    for (const page of pages) {
      const text = entry(page);
      const plain = norm(text);
      let at = 0;
      for (const control of reads.get(page.route).controls.map((c) => all.find((a) => a.id === c.id && a.page === page))) {
        const own = text.indexOf(`\n### ${control.title}\n`);
        expect(own, `${page.route} ${control.id}`).toBeGreaterThan(at);
        at = own;
        const chunk = chunkOf(text, control.title);
        const summary = textOf(control.node.parent.children[control.node.parent.children.indexOf(control.node) + 1]);
        expect(plain, `${control.id} summary`).toContain(norm(summary));
        const blocks = htmlBlocks(control);
        expect(blocks.length, `${control.id} has markup`).toBeGreaterThanOrEqual(1);
        for (const block of blocks) {
          if (isWrapped(block.code, page)) {
            // The control's own lines, without the label, hint and error of the wrapper
            const lines = block.code
              .split("\n")
              .slice(1, -1)
              .map((l) => l.trim())
              .filter((l) => !/^<(?:label class="luz-field__label|div class="luz-field__(?:helper|error)")/.test(l));
            expect(lines.length, `${control.id} has a control line`).toBeGreaterThanOrEqual(1);
            for (const line of lines) expect(chunk, `${control.id}: ${line}`).toContain(line);
            expect(chunk, `${control.id} leaves the wrapper to the intro of Inputs`).not.toContain("luz-field__label");
            expect(chunk, control.id).not.toContain('class="luz-field"');
          } else {
            expect(chunk, `${control.id} keeps its markup whole`).toContain(block.code);
          }
          // No label line and no heading of its own: the code follows the summary
          expect(chunk, `${control.id}: ${block.label}`).not.toContain(block.label);
        }
        expect(chunk, control.id).not.toContain("Copy the markup");
        // When to use stays on the page
        expect(chunk, `${control.id} has no When to use`).not.toContain("When to use");
        const when = /<p>([\s\S]*?)<\/p>/.exec(sectionOf(control.read, `${control.id}-when`))[1];
        expect(norm(chunk), `${control.id} when`).not.toContain(inline(when));
        // The keys, only when they are one short sentence (100 characters, no list)
        const keys = sectionOf(control.read, `${control.id}-keyboard`);
        const sentence = inline(keys);
        if (!/<(?:ul|ol|table|pre)\b/.test(keys) && /^\s*<p\b[\s\S]*<\/p>\s*$/.test(keys) && sentence.length <= 100) {
          expect(norm(chunk), `${control.id} short keys`).toContain(sentence);
        } else {
          expect(chunk, `${control.id} long keys stay on the page`).not.toContain("Keyboard and ARIA");
        }
      }
    }
  });

  it("shows the field wrapper once, in the intro of Inputs", () => {
    const text = entry(pages[0]);
    const intro = text.slice(0, text.indexOf("\n### "));
    expect(slugOf(pages[0])).toBe("form-inputs");
    expect(intro).toMatch(/```html\n<div class="luz-field">\n\s*<label class="luz-field__label"/);
  });

  it("has the lead of each page, and leaves out the notes of its controls and what is on the page only (variants, how, no JavaScript, when not, do and don't, content, contrast, tokens)", () => {
    for (const page of pages) {
      const text = entry(page);
      const read = reads.get(page.route);
      expect(text, page.route).toContain(page.meta.description);
      for (const note of read.notes) expect(text, note.id).not.toContain(note.text);
      for (const heading of ["Variants and options", "How it works", "Without JavaScript", "When not to use", "Do and don't", "Writing the content", "Contrast and focus", "Tokens it uses"]) {
        expect(text, `${page.route}: ${heading}`).not.toContain(heading);
      }
      expect(text, page.route).toContain("### Known issues");
    }
  });

  it("makes the example document of each page hold the markup of every control, each block under its aria-label", () => {
    const versions = { tokens: "1.0.0", core: "1.0.0", catalog: "1.0.0" };
    const docs = exampleDocuments(site, { csp: "default-src 'self'", versions });
    for (const page of pages) {
      const doc = docs.find((d) => d.route === `/examples/components/${slugOf(page)}.html`);
      expect(doc, `/examples/components/${slugOf(page)}.html`).toBeTruthy();
      for (const control of all.filter((c) => c.page === page)) {
        for (const block of htmlBlocks(control)) {
          expect(doc.html, `${control.id}: ${block.label}`).toContain(block.code);
          expect(doc.html, `${control.id}: ${block.label}`).toContain(`>${block.label.replace(/&/g, "&amp;")}</h2>`);
        }
      }
      // It links to the markup of a control: an id of the page that ends in markup
      const link = /<a href="([^"]*)">[^<]*in the LUZ documentation<\/a>/.exec(doc.html)?.[1];
      const hash = link?.split("#")[1];
      expect(hash, `${page.route}: the link goes to a section of markup`).toMatch(/^(?:[a-z0-9-]+-)?markup$/);
      expect(page.body, page.route).toContain(`id="${hash}"`);
    }
  });
});
