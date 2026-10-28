/**
 * The FAQ of the home, read from its sources (the template `apps/landing/index.html` and the three catalogs of
 * `apps/landing/i18n`); what a browser draws is in tests/landing-faq.spec.js.
 *
 * - The same `faq.*` keys in en, es and ar, none missing and none extra (the build also fails on them).
 * - Seventeen questions, each a `faq.<slug>.q` with its answer in `faq.<slug>.a`, or in the parts `.p<n>` / `.ol<n>` of
 *   an answer with several paragraphs or a list; the markup of an answer is the catalog's, inline only.
 * - The template: `luz-faq` with `lang="{{t:faq.lang}}"`, four groups each named by its title, a row of four links to
 *   them, and an id on every answer (`faq-<slug>`), none on the `details`.
 * - The head and the group titles carry the page's language (`{{lang}}`), so in Arabic, where the questions and
 *   answers are English, only they are Arabic.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { findAll, hasClass, parse, query, queryAll } from "./helpers/html-dom.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(repo, path), "utf-8");
const CODES = ["en", "es", "ar"];
const catalogs = Object.fromEntries(CODES.map((code) => [code, JSON.parse(read(`apps/landing/i18n/${code}.json`))]));
const faqKeys = (code) => Object.keys(catalogs[code]).filter((key) => key.startsWith("faq.")).sort();
const GROUPS = ["about", "html", "use", "existing"];

const template = read("apps/landing/index.html");
const tree = parse(template.slice(template.indexOf('<section class="landing-faq"'), template.indexOf("</luz-faq>") + "</luz-faq>".length + "</section>".length), "apps/landing/index.html#faq");
const faq = query(tree, "luz-faq");

describe("the FAQ of the home: the catalogs", () => {
  it("has the same keys in English, Spanish and Arabic", () => {
    expect(faqKeys("en").length).toBeGreaterThan(40);
    expect(faqKeys("es")).toEqual(faqKeys("en"));
    expect(faqKeys("ar")).toEqual(faqKeys("en"));
  });

  it("has seventeen questions, each with an answer, in the three languages", () => {
    const slugs = faqKeys("en").filter((key) => key.endsWith(".q")).map((key) => key.slice(4, -2));
    expect(slugs).toHaveLength(17);
    for (const code of CODES) {
      for (const slug of slugs) {
        expect(catalogs[code][`faq.${slug}.q`], `${code} faq.${slug}.q`).toMatch(/\S.*\?$|\S.*؟$/);
        const answer = Object.keys(catalogs[code]).filter((key) => new RegExp(`^faq\\.${slug}\\.(?:a|p\\d|ol\\d)$`).test(key));
        expect(answer.length, `${code} faq.${slug} has an answer`).toBeGreaterThan(0);
        for (const key of answer) expect(catalogs[code][key].replace(/<[^>]*>/g, "").trim().length, `${code} ${key}`).toBeGreaterThan(8);
      }
    }
  });

  it("names its four groups, its head and the label of its row of links", () => {
    for (const code of CODES) {
      for (const group of GROUPS) expect(catalogs[code][`faq.group.${group}`], `${code} faq.group.${group}`).toBeTruthy();
      for (const key of ["faq.eyebrow", "faq.title", "faq.lead", "faq.nav", "faq.lang"]) expect(catalogs[code][key], `${code} ${key}`).toBeTruthy();
    }
  });

  it("says what the questions are written in: the language of the page, and English in Arabic", () => {
    expect(catalogs.en["faq.lang"]).toBe("en");
    expect(catalogs.es["faq.lang"]).toBe("es");
    expect(catalogs.ar["faq.lang"]).toBe("en");
  });

  it("writes an answer as inline markup only (a, code, span, strong, em), never a block or a script", () => {
    for (const code of CODES) {
      for (const [key, value] of Object.entries(catalogs[code])) {
        if (!key.startsWith("faq.")) continue;
        const tags = [...value.matchAll(/<\/?([a-z][a-z0-9]*)/gi)].map((m) => m[1].toLowerCase());
        for (const tag of tags) expect(["a", "code", "span", "strong", "em"], `${code} ${key}: <${tag}>`).toContain(tag);
      }
    }
  });
});

describe("the FAQ of the home: the template", () => {
  it("is a section named by its title, around one <luz-faq> whose language is the catalog's", () => {
    expect(template).toMatch(/<section class="landing-faq" id="faq" aria-labelledby="faq-title">/);
    expect(faq).not.toBeNull();
    expect(faq.attrs.get("lang")).toBe("{{t:faq.lang}}");
  });

  it("has seventeen questions in four groups, each group named by its title", () => {
    const groups = queryAll(faq, "section.luz-faq__group");
    expect(groups).toHaveLength(4);
    expect(findAll(faq, (n) => n.name === "details" && hasClass(n, "luz-faq__item"))).toHaveLength(17);
    for (const group of groups) {
      const title = query(group, "h3.luz-faq__group-title");
      expect(title, "a heading over its questions").not.toBeNull();
      expect(group.attrs.get("aria-labelledby")).toBe(title.attrs.get("id"));
      expect(title.attrs.get("lang"), "the title is in the language of the page").toBe("{{lang}}");
    }
    expect(groups.map((g) => query(g, "h3").open.index > 0)).toEqual([true, true, true, true]);
  });

  it("puts the title, the lead and the row of links in a head in the language of the page", () => {
    const head = query(faq, "div.landing-faq__head");
    expect(head.attrs.get("lang")).toBe("{{lang}}");
    expect(query(head, "h2.luz-faq__title.landing-inside__title").attrs.get("id")).toBe("faq-title");
    expect(query(head, "p.luz-faq__lead")).not.toBeNull();
    expect(query(head, "p.landing-inside__eyebrow")).not.toBeNull();
    const nav = query(head, "nav.luz-faq__nav");
    expect(nav.attrs.get("aria-label")).toBe("{{t:faq.nav}}");
    const links = findAll(nav, (n) => n.name === "a");
    expect(links).toHaveLength(4);
    const titles = queryAll(faq, "h3.luz-faq__group-title").map((t) => t.attrs.get("id"));
    expect(links.map((a) => a.attrs.get("href"))).toEqual(titles.map((id) => `#${id}`));
  });

  it("gives every answer an id, `faq-<slug>` of its key, and no id to the details", () => {
    const items = findAll(faq, (n) => n.name === "details" && hasClass(n, "luz-faq__item"));
    const ids = [];
    for (const item of items) {
      expect(item.attrs.has("id"), "the id is on the answer, not on the details").toBe(false);
      const answer = query(item, "div.luz-faq__answer");
      const id = answer.attrs.get("id");
      expect(id).toMatch(/^faq-[a-z-]+$/);
      ids.push(id);
      // The question and the answer come from the same keys: faq.<slug>.q and faq.<slug>.a (or its parts)
      const slug = id.slice(4);
      expect(item.html.slice(item.open.index, item.close.index)).toContain(`{{t:faq.${slug}.q}}`);
      expect(item.html.slice(item.open.index, item.close.index)).toMatch(new RegExp(`\\{\\{html:faq\\.${slug}\\.(?:a|p\\d|ol\\d)\\}\\}`));
    }
    expect(new Set(ids).size).toBe(17);
  });

  it("is linked to the stylesheet of the FAQ, and to the sidebar entry of the page", () => {
    expect(template).toContain('href="/packages/catalog/dist/components/faq.css"');
    expect(template).toMatch(/<a class="luz-sidebar__link" href="#faq">\{\{t:faq\.eyebrow\}\}<\/a>/);
  });
});
