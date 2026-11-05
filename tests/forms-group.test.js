/**
 * The group "Form fields" (Spanish "Campos de formulario") of Core, in the docs: the form page, whose controls (the select among
 * them, since 2026-11-05) are on one page, left "Actions and input" for a group of its own, right after it. Button, copy-button
 * and dropdown stay in Actions.
 *
 * What these tests pin: site.json (id, label, order, the sidebar flag), the front matter of the pages (the one member), the
 * Spanish label, the gallery of Core in English and in Spanish, and the eyebrow of the member page. The sidebar entries of the
 * group are tests/docs-controls.test.js.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { buildReal, site } from "./helpers/debug-page.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const json = (path) => JSON.parse(readFileSync(join(root, path), "utf-8"));
const area = (id) => json("apps/docs/site.json").areas.find((a) => a.id === id);
const slugOf = (route) => route.split("/").filter(Boolean).at(-1);
const membersOf = (areaId, groupId) =>
  [...site.byRoute.values()].filter((p) => p.meta.area === areaId && p.meta.group === groupId).map((p) => slugOf(p.route)).sort();
const GROUPS = ["actions", "forms", "content", "feedback", "navigation", "media", "helpers"];

beforeAll(() => {
  buildReal();
}, 120_000);

describe("the group Form fields of Core", () => {
  it("is right after Actions and input: id forms, label Form fields, listed in the sidebar", () => {
    const groups = area("components").groups;
    expect(groups.map((g) => g.id)).toEqual(GROUPS);
    const forms = groups.find((g) => g.id === "forms");
    expect(forms.label).toBe("Form fields");
    expect(forms.sidebar).toBe(true);
  });

  it("holds exactly the form page (the select is one of its controls), and Actions keeps button, copy-button and dropdown", () => {
    expect(membersOf("components", "forms")).toEqual(["form"]);
    const actions = membersOf("components", "actions");
    for (const slug of ["button", "copy-button", "dropdown"]) expect(actions, slug).toContain(slug);
    for (const slug of ["form", "select"]) expect(actions, slug).not.toContain(slug);
    expect([...site.byRoute.keys()], "no page of the select").not.toContain("/docs/components/select/");
  });

  it("is called Campos de formulario in Spanish", () => {
    expect(json("apps/docs/i18n/es/strings.json")["group.components.forms"]).toBe("Campos de formulario");
  });

  it.each([
    ["/docs/components/", "Form fields", ""],
    ["/es/docs/components/", "Campos de formulario", "/es"],
  ])("%s has a section %s after Actions, with a card to the form page and to nothing else", (route, heading, prefix) => {
    const html = buildReal().rendered.get(route);
    const sections = [...html.matchAll(/<section class="docs-gallery" aria-labelledby="group-([a-z-]+)">/g)].map((m) => m[1]);
    expect(sections).toEqual(GROUPS);
    const start = html.indexOf('aria-labelledby="group-forms"');
    const section = html.slice(start, html.indexOf("</section>", start));
    expect(section).toContain(`<h2 id="group-forms">${heading}</h2>`);
    const cards = [...section.matchAll(/<h3 class="luz-card__title docs-card__title"><a href="([^"]+)">/g)].map((m) => m[1]);
    expect(cards).toEqual([`${prefix}/docs/components/form/`]);
  });

  it.each([
    ["/docs/components/form/", "Core", "Form fields"],
    ["/es/docs/components/form/", "Core", "Campos de formulario"],
  ])("%s has the eyebrow of its group, ending in %s", (route, areaLabel, group) => {
    const html = buildReal().rendered.get(route);
    const eyebrow = html.match(/<p class="luz-doc-header__eyebrow">([^<]*)<\/p>/)?.[1];
    expect(eyebrow).toMatch(new RegExp(`^${areaLabel} · ${group}$`));
  });
});
