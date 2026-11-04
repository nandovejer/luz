/**
 * The group "Charts" (Spanish "Gráficos") of the docs is in one area, Catalog, since the four charts of core moved there
 * (2026-11-03):
 *
 *   - Core (area components) has no group of charts: the group `charts` (once `data`) left it with its four pages;
 *   - Catalog: a group `charts`, shown in the sidebar, right after Content, holding chart and dashboard and the four that came
 *     from core: bar-list, column-chart, stacked-bar and heat-map.
 *
 * What these tests pin: site.json (id, label, order, sidebar flag), the front matter of the pages (their members), the Spanish
 * labels, the gallery of each area in English and in Spanish, and the sidebar of a catalog page. The pages of each chart
 * keep their own tests (tests/bar-list.test.js, chart-sheets.test.js, chart.test.js, dashboard-data.test.js).
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { buildReal, site } from "./helpers/debug-page.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const json = (path) => JSON.parse(readFileSync(join(root, path), "utf-8"));
const siteJson = () => json("apps/docs/site.json");
const area = (id) => siteJson().areas.find((a) => a.id === id);
const slugOf = (route) => route.split("/").filter(Boolean).at(-1);
const membersOf = (areaId, groupId) =>
  [...site.byRoute.values()].filter((p) => p.meta.area === areaId && p.meta.group === groupId).map((p) => slugOf(p.route)).sort();

beforeAll(() => {
  buildReal();
}, 120_000);

describe("Core has no group of charts any more", () => {
  const groups = () => area("components").groups.map((g) => g.id);

  it("has the groups of before the charts and none called charts or data", () => {
    expect(groups()).toEqual(["actions", "content", "feedback", "navigation", "media", "helpers"]);
  });

  it("has no page in a group charts or data: the four pages are catalog's", () => {
    expect(membersOf("components", "charts")).toEqual([]);
    expect(membersOf("components", "data")).toEqual([]);
  });

  it("has no Spanish label for the groups charts or data of Core", () => {
    const es = json("apps/docs/i18n/es/strings.json");
    expect(es["group.components.charts"]).toBeUndefined();
    expect(es["group.components.data"]).toBeUndefined();
  });

  it.each(["/docs/components/", "/es/docs/components/"])("%s has no section of charts, and no card to bar-list, column-chart, heat-map or stacked-bar", (route) => {
    const html = buildReal().rendered.get(route);
    const sections = [...html.matchAll(/<section class="docs-gallery" aria-labelledby="group-([a-z-]+)">/g)].map((m) => m[1]);
    expect(sections).toEqual(["actions", "content", "feedback", "navigation", "media", "helpers"]);
    for (const name of ["bar-list", "column-chart", "heat-map", "stacked-bar"]) expect(html, name).not.toContain(`/docs/components/${name}/`);
  });
});

describe("the group Charts of Catalog", () => {
  const groups = () => area("catalog").groups;

  it("is a group of the sidebar, right after Content: id charts, label Charts", () => {
    expect(groups().map((g) => g.id)).toEqual(["navigation", "page-structure", "content", "charts", "site-wide", "documentation", "reference"]);
    expect(groups().find((g) => g.id === "charts")).toMatchObject({ label: "Charts", sidebar: true });
  });

  it("holds chart, dashboard, the four that came from core and the ring, and Content no longer holds the first two", () => {
    expect(membersOf("catalog", "charts")).toEqual(["bar-list", "chart", "column-chart", "dashboard", "heat-map", "ring", "stacked-bar"]);
    expect(membersOf("catalog", "content")).toEqual(["embed", "faq", "post-list", "social", "stat", "terminal", "timeline", "toc"]);
  });

  it("is called Gráficos in Spanish", () => {
    expect(json("apps/docs/i18n/es/strings.json")["group.catalog.charts"]).toBe("Gráficos");
  });

  it.each([
    ["/docs/catalog/", "Charts", ""],
    ["/es/docs/catalog/", "Gráficos", "/es"],
  ])("%s has a section %s, after Content and before Site-wide, with a card to each of the seven", (route, heading, prefix) => {
    const html = buildReal().rendered.get(route);
    const sections = [...html.matchAll(/<section class="docs-gallery" aria-labelledby="group-([a-z-]+)">/g)].map((m) => m[1]);
    expect(sections).toEqual(["navigation", "page-structure", "content", "charts", "site-wide", "documentation", "reference"]);
    const start = html.indexOf('aria-labelledby="group-charts"');
    const section = html.slice(start, html.indexOf("</section>", start));
    expect(section).toContain(`<h2 id="group-charts">${heading}</h2>`);
    const cards = [...section.matchAll(/<h3 class="luz-card__title docs-card__title"><a href="([^"]+)">/g)].map((m) => m[1]);
    expect(cards.sort()).toEqual(["bar-list", "chart", "column-chart", "dashboard", "heat-map", "ring", "stacked-bar"].map((slug) => `${prefix}/docs/catalog/${slug}/`));
  });

  it.each([
    ["/docs/catalog/chart/", "Charts", ""],
    ["/es/docs/catalog/chart/", "Gráficos", "/es"],
  ])("%s lists the group %s in the sidebar, with the seven, and every id of the page is unique", (route, label, prefix) => {
    const html = buildReal().rendered.get(route);
    expect(html).toContain(`<span class="luz-sidebar__section-label" id="nav-charts">${label}</span>`);
    const list = html.split('aria-labelledby="nav-charts"')[1]?.split("</ul>")[0] ?? "";
    expect([...list.matchAll(/href="([^"]+)"/g)].map((m) => m[1]).sort()).toEqual(["bar-list", "chart", "column-chart", "dashboard", "heat-map", "ring", "stacked-bar"].map((slug) => `${prefix}/docs/catalog/${slug}/`));
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i), "ids repeated on the page").toEqual([]);
  });
});
