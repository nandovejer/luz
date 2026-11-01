/**
 * Loading LUZ from a CDN sends the visitor's IP address to the CDN, and the places where a site is told to load it
 * from one say so, with the way out: the README of the repository, the READMEs of tokens, core and catalog (the
 * ones npm shows), and the page that installs LUZ (get-started/index), in English and Spanish.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sourceHash } from "../scripts/docs-site/docs-i18n.js";
import { scanSite } from "../scripts/docs-site/site.js";
import { repo, textOf } from "./helpers/page-facts.js";

const SENTENCE =
  "Loading LUZ from a CDN sends your visitors' IP addresses to the CDN. If you do not want that, install from npm and serve the files from your own server.";
const flat = (text) => text.replace(/[‘’]/g, "'").replace(/\s+/g, " ");
const read = (file) => readFileSync(join(repo, file), "utf-8");
const site = scanSite(join(repo, "apps/docs"), repo);

describe("the CDN sentence", () => {
  for (const file of ["README.md", "packages/tokens/README.md", "packages/core/README.md", "packages/catalog/README.md"]) {
    it(`is in ${file}, once, as a paragraph of its own`, () => {
      const paragraphs = read(file).split(/\n\s*\n/).map(flat);
      expect(paragraphs.filter((p) => p.trim() === SENTENCE)).toHaveLength(1);
    });
  }

  it("is in get-started/index, in English, once", () => {
    const text = flat(textOf(site.byRoute.get("/docs/get-started/").body));
    expect(text.split(SENTENCE)).toHaveLength(2);
  });

  it("is in the Spanish get-started/index: the CDN, the IP addresses, npm and the own server in one paragraph", () => {
    const body = site.docsI18n.byCode.get("es").pages.get("/docs/get-started/").body;
    const paragraphs = [...body.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => textOf(m[1]));
    const found = paragraphs.filter((p) => /\bCDN\b/.test(p) && /direcciones IP/.test(p) && /\bnpm\b/.test(p) && /servidor/.test(p));
    expect(found).toHaveLength(1);
  });

  it("leaves the Spanish pages it touched with the hash of the English body", () => {
    const es = site.docsI18n.byCode.get("es").pages;
    for (const route of ["/docs/get-started/", "/docs/get-started/snippet/", "/docs/catalog/cookie-consent/"]) {
      expect(es.get(route).meta.source, route).toBe(sourceHash(site.byRoute.get(route).body));
    }
  });
});
