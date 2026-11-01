/**
 * The Privacy and storage page (apps/docs/pages/privacy.html at /docs/privacy/, and its Spanish translation), read
 * from the sources and from the site as the generator builds it. What a browser does with the banner on it is
 * tests/privacy.spec.js.
 *
 * - The page exists, with the section #cookie-settings (a button that reopens the question, `data-luz-consent-open`,
 *   inside it) and a table of the storage keys whose rows are exactly the keys the code of this site writes: they are
 *   read from the sources, so a key added to the code without a row fails here.
 * - Contact is GitHub Issues only: no e-mail address and no mailto: link. It makes no compliance claim ("GDPR") and
 *   says the site "does not set cookies itself", never the absolute "does not set cookies".
 * - The banner on the page: one <luz-cookie-consent> for one category, youtube; Accept and Reject are both primary
 *   buttons; the checkbox is not ticked; it sits in a [data-docs-specimen], so the generator does not read it as the
 *   page's own markup; the whole site builds with it.
 * - The Spanish translation is a page of its own: unreviewed, with its notice, and a `source` that is the hash of
 *   the English body it translates.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sourceHash } from "../scripts/docs-site/docs-i18n.js";
import { buildSite, scanSite } from "../scripts/docs-site/site.js";
import { find, findAll, hasClass, parse, query, queryAll, textOf as nodeText } from "./helpers/html-dom.js";
import { repo, sectionsOf, textOf } from "./helpers/page-facts.js";

const ROUTE = "/docs/privacy/";
const ES_ROUTE = "/es/docs/privacy/";
const site = scanSite(join(repo, "apps/docs"), repo);
const found = { page: site.byRoute.get(ROUTE), es: site.docsI18n?.byCode.get("es")?.pages.get(ROUTE) };
/** The English page and its Spanish translation; a missing one is a failed assertion, not a crash. */
const english = () => (expect(found.page, "apps/docs/pages/privacy.html exists").toBeTruthy(), found.page);
let built;
/** The whole site, English and Spanish, built once. */
const buildOnce = () => (built ??= buildSite(site, { languages: true, unchecked: ["/", "/es/", "/ar/"] }));
const spanish = () => (expect(found.es, "apps/docs/i18n/es/pages/privacy.html exists").toBeTruthy(), found.es);
const isCheckbox = (n) => n.name === "input" && n.attrs.get("type") === "checkbox";
const read = (file) => readFileSync(join(repo, file), "utf-8");

/** The files that run in the visitor's browser on this site and may write to its storage. */
function sourcesOfStorage() {
  const files = [];
  const walk = (dir, keep) => {
    for (const name of readdirSync(join(repo, dir))) {
      const path = `${dir}/${name}`;
      if (statSync(join(repo, path)).isDirectory()) {
        if (name === "node_modules" || name === "dist") continue;
        walk(path, keep);
      } else if (keep(name)) files.push(path);
    }
  };
  for (const pkg of ["tokens", "core", "catalog"]) walk(`packages/${pkg}/src`, (n) => n.endsWith(".js"));
  for (const app of ["docs", "site", "landing"]) {
    for (const name of readdirSync(join(repo, `apps/${app}`))) if (name.endsWith(".js")) files.push(`apps/${app}/${name}`);
  }
  return files.filter((file) => /localStorage|sessionStorage|document\.cookie/.test(read(file)));
}

/**
 * Every key the code stores something under: a constant named KEY or PIN (STORAGE_KEY, VIEW_KEY…), a literal passed
 * to getItem, setItem or removeItem, the default key of the consent chunks, and the key a page gives a banner.
 */
function keysTheCodeWrites() {
  const found = new Map();
  const add = (key, file) => found.set(key, [...(found.get(key) ?? []), file]);
  for (const file of sourcesOfStorage()) {
    const text = read(file);
    for (const m of text.matchAll(/const\s+\w*(?:KEY|PIN)\w*\s*=\s*"(luz-[a-z0-9-]+)"/g)) add(m[1], file);
    for (const m of text.matchAll(/(?:get|set|remove)Item\(\s*"(luz-[a-z0-9-]+)"/g)) add(m[1], file);
    if (/luzConsentKey/.test(text)) for (const m of text.matchAll(/"(luz-consent[a-z0-9-]*)"/g)) add(m[1], file);
  }
  const pages = (dir) =>
    readdirSync(join(repo, dir), { recursive: true }).filter((f) => f.endsWith(".html") && !/(^|\/)privacy\.html$/.test(f)).map((f) => `${dir}/${f}`);
  for (const file of [...pages("apps/docs/pages"), ...pages("apps/docs/i18n"), "apps/landing/index.html"]) {
    for (const m of read(file).matchAll(/data-luz-consent-key="(luz-[a-z0-9-]+)"/g)) add(m[1], file);
  }
  return found;
}

/**
 * Two keys are written only by core's applyTheme() for a custom theme (`luz-brand`, `luz-last-mode`). This site
 * registers no custom theme, so it never writes them; they belong to the sites that use LUZ.
 */
const CUSTOM_THEME_KEYS = ["luz-brand", "luz-last-mode"];

describe("the page", () => {
  it("is /docs/privacy/, in the hub, with a title and a description", () => {
    english();
    expect(english().meta.area).toBe("hub");
    expect(english().meta.title).toMatch(/privacy/i);
    expect(english().meta.description.length).toBeGreaterThan(40);
  });

  it("has the section #cookie-settings with a button that reopens the question inside it", () => {
    const section = sectionsOf(english().body).get("cookie-settings");
    expect(section, "an h2 with the id cookie-settings").toBeTruthy();
    const buttons = findAll(parse(section.html), (n) => n.name === "button" && n.attrs.has("data-luz-consent-open"));
    expect(buttons).toHaveLength(1);
    expect(buttons[0].attrs.get("type")).toBe("button");
  });

  it("builds with the whole site: every link, fragment and id resolves", () => {
    const { problems, rendered } = buildOnce();
    expect(rendered.has(ROUTE), `${ROUTE} is rendered`).toBe(true);
    expect(rendered.has(ES_ROUTE), `${ES_ROUTE} is rendered`).toBe(true);
    expect(problems).toEqual([]);
  }, 60000);
});

describe("the table of storage keys", () => {
  const bodyRows = (table) => findAll(table, (n) => n.name === "tr" && n.parent.name === "tbody");
  const rows = (body) => {
    const section = sectionsOf(body).get("storage");
    expect(section, "an h2 with the id storage").toBeTruthy();
    const table = query(parse(section.html), "table");
    expect(table, "a table in #storage").toBeTruthy();
    return bodyRows(table).map((tr) => nodeText(query(tr, "code")));
  };

  it("lists the keys the code of this site writes, and only those (English)", () => {
    const written = keysTheCodeWrites();
    for (const key of CUSTOM_THEME_KEYS) expect(written.has(key), `${key} is still written by core`).toBe(true);
    const expected = [...written.keys()].filter((key) => !CUSTOM_THEME_KEYS.includes(key)).sort();
    expect(expected, "what the scan found").toEqual(["luz-consent", "luz-consent-demo", "luz-docs-view", "luz-light", "luz-theme"]);
    expect(rows(english().body).sort()).toEqual(expected);
  });

  it("is the same list in Spanish", () => {
    expect(rows(spanish().body).sort()).toEqual(rows(english().body).sort());
  });

  it("keeps a row once, with a cell for what it keeps, when it is written and how to remove it", () => {
    for (const body of [english().body, spanish().body]) {
      const keys = rows(body);
      expect(new Set(keys).size).toBe(keys.length);
      for (const tr of bodyRows(parse(sectionsOf(body).get("storage").html))) {
        expect(findAll(tr, (n) => n.name === "td").length, nodeText(tr)).toBe(4);
      }
    }
  });
});

describe("what the page claims", () => {
  const WORDS = [
    ["English", english, /does not set cookies itself/, /does not set (?:any )?cookies(?! itself)/i, /GDPR/],
    ["Spanish", spanish, /no establece cookies por sí mismo/, /no (?:establece|instala|usa|utiliza) (?:ninguna |ninguna de )?cookies(?! por sí)/i, /RGPD|GDPR/],
  ];
  for (const [name, get, itself, absolute, law] of WORDS) {
    it(`${name}: contact is GitHub Issues only, with no e-mail address`, () => {
      const text = `${get().meta.description} ${textOf(get().body)}`;
      expect(text).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.-]+/);
      expect(get().body).not.toMatch(/mailto:/i);
      const hrefs = findAll(parse(get().body), (n) => n.name === "a").map((a) => a.attrs.get("href"));
      expect(hrefs).toContain("https://github.com/nandovejer/luz/issues");
    });

    it(`${name}: says the site does not set cookies itself, never that it sets none`, () => {
      const text = textOf(get().body);
      expect(text).toMatch(itself);
      expect(text).not.toMatch(absolute);
    });

    it(`${name}: makes no claim of compliance with a law`, () => {
      const text = `${get().meta.description} ${textOf(get().body)}`;
      const claim = new RegExp(`(?:${law.source})[^.]{0,60}(?:compl|conform|cumpl|certif|garant)|(?:compl|conform|cumpl|certif|garant)[^.]{0,60}(?:${law.source})`, "i");
      expect(text).not.toMatch(claim);
    });
  }
});

describe("the banner on the page", () => {
  for (const [name, get] of [["English", english], ["Spanish", spanish]]) {
    describe(name, () => {
      const tree = () => parse(get().body);

      it("is one <luz-cookie-consent> of one category, youtube, inside a [data-docs-specimen]", () => {
        const hosts = queryAll(tree(), "luz-cookie-consent");
        expect(hosts).toHaveLength(1);
        let inside = false;
        for (let n = hosts[0].parent; n; n = n.parent) inside ||= !!n.attrs?.has("data-docs-specimen");
        expect(inside, "wrapped in data-docs-specimen").toBe(true);
        expect(findAll(hosts[0], (n) => n.attrs.has("data-luz-consent"))).toHaveLength(1);
        const boxes = findAll(hosts[0], isCheckbox);
        expect(boxes).toHaveLength(1);
        expect(boxes[0].attrs.get("value")).toBe("youtube");
      });

      it("has the checkbox not ticked", () => {
        const [box] = findAll(tree(), isCheckbox);
        expect(box.attrs.has("checked")).toBe(false);
      });

      it("offers Accept and Reject as two buttons that are both primary, with the same classes", () => {
        const ask = find(tree(), (n) => n.attrs.has("data-luz-consent-ask"));
        const buttons = findAll(ask, (n) => n.name === "button" && n.attrs.get("type") === "submit" && ["all", "none"].includes(n.attrs.get("value")));
        expect(buttons.map((b) => b.attrs.get("value"))).toEqual(["all", "none"]);
        for (const button of buttons) expect(hasClass(button, "luz-btn--primary"), nodeText(button)).toBe(true);
        expect(buttons[0].attrs.get("class")).toBe(buttons[1].attrs.get("class"));
      });
    });
  }
});

describe("the Spanish translation", () => {
  it("exists, is not reviewed, names no reviewer and has the hash of the English body as its source", () => {
    spanish();
    expect(spanish().meta.reviewed).toBe(false);
    expect(spanish().meta.reviewer ?? "").toBe("");
    expect(spanish().meta.source).toBe(sourceHash(english().body));
    expect(spanish().stale).toBe(false);
  });

  it("is rendered at /es/docs/privacy/ with the notice that no person has reviewed it", () => {
    const { rendered } = buildOnce();
    const html = rendered.get(ES_ROUTE);
    expect(html, "the rendered page").toBeTruthy();
    const strings = JSON.parse(read("apps/docs/i18n/es/strings.json"));
    const notice = query(parse(html, ES_ROUTE), "div.docs-notice");
    expect(notice, "the notice").toBeTruthy();
    expect(nodeText(notice)).toContain(strings["notice.pending"]);
  }, 60000);

  it("has the section #cookie-settings and its reopen button as the English page does", () => {
    const section = sectionsOf(spanish().body).get("cookie-settings");
    expect(section, "an h2 with the id cookie-settings").toBeTruthy();
    expect(findAll(parse(section.html), (n) => n.name === "button" && n.attrs.has("data-luz-consent-open"))).toHaveLength(1);
  });
});
