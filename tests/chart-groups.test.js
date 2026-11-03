/**
 * The group "Charts" (Spanish "Gráficos") of the docs, in the two areas that have charts:
 *
 *   - Core (area components): the group `data` ("Data") is the group `charts`, in the same place (between Media and Helpers),
 *     holding the four loose sheets: bar-list, column-chart, heat-map and stacked-bar;
 *   - Catalog: a group `charts`, shown in the sidebar, right after Content, holding chart and dashboard (they left Content).
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

describe("the group Charts of Core", () => {
  const groups = () => area("components").groups.map((g) => g.id);

  it("is the old group Data, renamed: id charts, label Charts, between Media and Helpers, and no group data is left", () => {
    expect(area("components").groups.find((g) => g.id === "charts")).toMatchObject({ label: "Charts" });
    expect(groups()).toEqual(["actions", "content", "feedback", "navigation", "media", "charts", "helpers"]);
    expect(groups()).not.toContain("data");
  });

  it("holds bar-list, column-chart, heat-map and stacked-bar, and no page names the group data", () => {
    expect(membersOf("components", "charts")).toEqual(["bar-list", "column-chart", "heat-map", "stacked-bar"]);
    expect(membersOf("components", "data")).toEqual([]);
  });

  it("is called Gráficos in Spanish, and the key of the old group is gone", () => {
    const es = json("apps/docs/i18n/es/strings.json");
    expect(es["group.components.charts"]).toBe("Gráficos");
    expect(es["group.components.data"]).toBeUndefined();
  });

  it.each([
    ["/docs/components/", "Charts", ""],
    ["/es/docs/components/", "Gráficos", "/es"],
  ])("%s has a section %s, between Media and Helpers, with a card to each of the four", (route, heading, prefix) => {
    const html = buildReal().rendered.get(route);
    const sections = [...html.matchAll(/<section class="docs-gallery" aria-labelledby="group-([a-z-]+)">/g)].map((m) => m[1]);
    expect(sections.indexOf("charts"), `${route}: ${sections}`).toBe(sections.indexOf("media") + 1);
    expect(sections.indexOf("helpers")).toBe(sections.indexOf("charts") + 1);
    expect(sections).not.toContain("data");
    const section = html.split('aria-labelledby="group-charts"')[1]?.split("</section>")[0] ?? "";
    expect(section).toContain(`<h2 id="group-charts">${heading}</h2>`);
    const cards = [...section.matchAll(/<h3 class="luz-card__title docs-card__title"><a href="([^"]+)">/g)].map((m) => m[1]);
    expect(cards.sort()).toEqual(["bar-list", "column-chart", "heat-map", "stacked-bar"].map((name) => `${prefix}/docs/components/${name}/`));
  });
});

describe("the group Charts of Catalog", () => {
  const groups = () => area("catalog").groups;

  it("is a group of the sidebar, right after Content: id charts, label Charts", () => {
    expect(groups().map((g) => g.id)).toEqual(["navigation", "page-structure", "content", "charts", "site-wide", "documentation", "reference"]);
    expect(groups().find((g) => g.id === "charts")).toMatchObject({ label: "Charts", sidebar: true });
  });

  it("holds chart and dashboard, and Content no longer does", () => {
    expect(membersOf("catalog", "charts")).toEqual(["chart", "dashboard"]);
    expect(membersOf("catalog", "content")).toEqual(["embed", "faq", "post-list", "social", "stat", "terminal", "timeline", "toc"]);
  });

  it("is called Gráficos in Spanish", () => {
    expect(json("apps/docs/i18n/es/strings.json")["group.catalog.charts"]).toBe("Gráficos");
  });

  it.each([
    ["/docs/catalog/", "Charts", ""],
    ["/es/docs/catalog/", "Gráficos", "/es"],
  ])("%s has a section %s, after Content and before Site-wide, with a card to chart and one to dashboard", (route, heading, prefix) => {
    const html = buildReal().rendered.get(route);
    const sections = [...html.matchAll(/<section class="docs-gallery" aria-labelledby="group-([a-z-]+)">/g)].map((m) => m[1]);
    expect(sections).toEqual(["navigation", "page-structure", "content", "charts", "site-wide", "documentation", "reference"]);
    const start = html.indexOf('aria-labelledby="group-charts"');
    const section = html.slice(start, html.indexOf("</section>", start));
    expect(section).toContain(`<h2 id="group-charts">${heading}</h2>`);
    const cards = [...section.matchAll(/<h3 class="luz-card__title docs-card__title"><a href="([^"]+)">/g)].map((m) => m[1]);
    expect(cards.sort()).toEqual([`${prefix}/docs/catalog/chart/`, `${prefix}/docs/catalog/dashboard/`]);
  });

  it.each([
    ["/docs/catalog/chart/", "Charts", ""],
    ["/es/docs/catalog/chart/", "Gráficos", "/es"],
  ])("%s lists the group %s in the sidebar, with chart and dashboard, and every id of the page is unique", (route, label, prefix) => {
    const html = buildReal().rendered.get(route);
    expect(html).toContain(`<span class="luz-sidebar__section-label" id="nav-charts">${label}</span>`);
    const list = html.split('aria-labelledby="nav-charts"')[1]?.split("</ul>")[0] ?? "";
    expect([...list.matchAll(/href="([^"]+)"/g)].map((m) => m[1]).sort()).toEqual([`${prefix}/docs/catalog/chart/`, `${prefix}/docs/catalog/dashboard/`]);
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i), "ids repeated on the page").toEqual([]);
  });
});
