/**
 * The footer links to the Privacy and storage page: on the home page in English, Spanish and Arabic (the key
 * footer.privacy of each catalog in apps/landing/i18n, in the Reference group of the site map beside the
 * accessibility statement) and in the footer of the docs in English and Spanish. The order and the count of the
 * home's links are tests/landing-footer-map.test.js.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildSite, landingDocuments, scanSite } from "../scripts/docs-site/site.js";
import { findAll, parse, query, queryAll, textOf } from "./helpers/html-dom.js";
import { repo } from "./helpers/page-facts.js";

const read = (file) => readFileSync(join(repo, file), "utf-8");
const catalog = (code) => JSON.parse(read(`apps/landing/i18n/${code}.json`));
const site = scanSite(join(repo, "apps/docs"), repo);
const landing = landingDocuments(site, "apps/landing/index.html", read("apps/landing/index.html"));
const { rendered } = buildSite(site, { extra: landing, languages: true, unchecked: ["/", "/es/", "/ar/"] });

const linksTo = (route, href) => {
  expect(rendered.has(route), `${route} is a page of the site`).toBe(true);
  const footer = query(parse(rendered.get(route), route), "footer.luz-site-footer");
  expect(footer, `${route}: the site footer`).toBeTruthy();
  return findAll(footer, (n) => n.name === "a" && n.attrs.get("href") === href);
};

describe("the catalogs of the home", () => {
  for (const [code, word] of [["en", /privacy/i], ["es", /privacidad/i], ["ar", /\p{Script=Arabic}/u]]) {
    it(`${code} has footer.privacy, in its own language`, () => {
      const value = catalog(code)["footer.privacy"];
      expect(value, `footer.privacy in ${code}.json`).toBeTruthy();
      expect(value).toMatch(word);
    });
  }
});

describe("the footer of the home page", () => {
  for (const [route, code, href] of [["/", "en", "/docs/privacy/"], ["/es/", "es", "/es/docs/privacy/"], ["/ar/", "ar", "/docs/privacy/"]]) {
    it(`${route} has the link, in the Reference group, named by the catalog`, () => {
      const links = linksTo(route, href);
      expect(links).toHaveLength(1);
      expect(textOf(links[0])).toBe(catalog(code)["footer.privacy"]);
      const group = queryAll(query(parse(rendered.get(route), route), "footer.luz-site-footer"), "div.landing-foot-group")[1];
      expect(findAll(group, (n) => n.name === "a").map((a) => a.attrs.get("href"))).toContain(href);
    });
  }
});

describe("the footer of the docs", () => {
  for (const [route, code, href] of [["/docs/", "en", "/docs/privacy/"], ["/es/docs/", "es", "/es/docs/privacy/"], ["/docs/privacy/", "en", "/docs/privacy/"], ["/es/docs/privacy/", "es", "/es/docs/privacy/"]]) {
    it(`${route} links to Privacy, named by the catalog of its language`, () => {
      const links = linksTo(route, href);
      expect(links).toHaveLength(1);
      expect(textOf(links[0])).toBe(catalog(code)["footer.privacy"]);
    });
  }
});
