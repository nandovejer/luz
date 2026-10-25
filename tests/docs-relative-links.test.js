/**
 * The Pages build writes every internal link as the shortest relative path (not up to the site root and down
 * again), so a page of the docs, which links to its neighbours many times, stays under the ceiling of a docs
 * page (RL-17). The unit cases of relativizeLinks() are in docs-site.test.js; this is the built site: the real
 * apps/docs in every language, with its links relative as the Pages build writes them.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { buildSite, landingDocuments, relativizeLinks, scanSite } from "../scripts/docs-site/site.js";

const root = fileURLToPath(new URL("../", import.meta.url));

let routes;
let pages;

beforeAll(() => {
  const site = scanSite(`${root}apps/docs`, root);
  const landing = landingDocuments(site, "apps/landing/index.html", readFileSync(`${root}apps/landing/index.html`, "utf-8"));
  const { rendered } = buildSite(site, { extra: landing, languages: true, unchecked: landing.map((d) => d.route) });
  routes = new Set(rendered.keys());
  pages = new Map([...rendered].filter(([route]) => route !== "/404.html").map(([route, html]) => [route, relativizeLinks(html, route, routes)]));
}, 300_000);

/** The relative hrefs of a page: not absolute, not a scheme, not a fragment alone. */
const relativeHrefs = (html) =>
  [...html.matchAll(/\shref="([^"]*)"/g)].map((m) => m[1]).filter((href) => href && !href.startsWith("/") && !href.startsWith("#") && !/^[a-z][a-z0-9+.-]*:/i.test(href));

describe("the Pages build writes the shortest relative link", () => {
  it("every relative href of every built page resolves to a page of the site", { timeout: 60_000 }, () => {
    const broken = [];
    let checked = 0;
    for (const [route, html] of pages) {
      for (const href of relativeHrefs(html)) {
        const { pathname } = new URL(href, `https://example.org${route}`);
        checked += 1;
        if (!routes.has(pathname)) broken.push(`${route} -> ${href} (${pathname})`);
      }
    }
    expect(checked, "relative links were found").toBeGreaterThan(1000);
    expect(broken.slice(0, 10)).toEqual([]);
  });

  it("the Spanish HTML index links to a neighbour page as inline/#el-a, which resolves to /es/docs/html/inline/", () => {
    const html = pages.get("/es/docs/html/");
    expect(html, "/es/docs/html/ is built").toBeTruthy();
    expect(relativeHrefs(html)).toContain("inline/#el-a");
    expect(new URL("inline/#el-a", "https://example.org/es/docs/html/").pathname).toBe("/es/docs/html/inline/");
  });

  it("no relative href climbs out of a folder only to go back down into it", { timeout: 60_000 }, () => {
    const roundTrips = [];
    for (const [route, html] of pages) {
      const folders = route.split("/").filter(Boolean);
      for (const href of relativeHrefs(html)) {
        const ups = href.match(/^(?:\.\.\/)*/)[0].length / 3;
        const next = href.slice(ups * 3).split("/")[0];
        if (ups > 0 && folders[folders.length - ups] === next) roundTrips.push(`${route} -> ${href}`);
      }
    }
    expect(roundTrips.slice(0, 10)).toEqual([]);
  });
});
