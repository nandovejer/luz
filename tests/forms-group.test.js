/**
 * The group "Form fields" (Spanish "Campos de formulario") of Core, in the docs: four pages of controls, Inputs, Choice, Values and
 * Field parts (the select is a control of Choice since 2026-11-05), left "Actions and input" for a group of their own, right after
 * it. Button, copy-button and dropdown stay in Actions.
 *
 * What these tests pin: site.json (id, label, order, the sidebar flag), the front matter of the pages (the four members and their
 * order), the Spanish label, the gallery of Core in English and in Spanish, and the eyebrow of a member page. The sidebar entries
 * of the group are tests/docs-controls.test.js.
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
  [...site.byRoute.values()].filter((p) => p.meta.area === areaId && p.meta.group === groupId).sort((a, b) => Number(a.meta.order) - Number(b.meta.order) || slugOf(a.route).localeCompare(slugOf(b.route))).map((p) => slugOf(p.route));
const FORMS = ["form-inputs", "form-choice", "form-values", "form-field-parts"];
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

  it("holds exactly the four pages Inputs, Choice, Values and Field parts, in that order, and Actions keeps button, copy-button and dropdown", () => {
    expect(membersOf("components", "forms")).toEqual(FORMS);
    const actions = membersOf("components", "actions");
    for (const slug of ["button", "copy-button", "dropdown"]) expect(actions, slug).toContain(slug);
    for (const slug of [...FORMS, "form", "select"]) expect(actions, slug).not.toContain(slug);
    expect([...site.byRoute.keys()], "no page of the select").not.toContain("/docs/components/select/");
  });

  it("is called Campos de formulario in Spanish", () => {
    expect(json("apps/docs/i18n/es/strings.json")["group.components.forms"]).toBe("Campos de formulario");
  });

  it.each([
    ["/docs/components/", "Form fields", ""],
    ["/es/docs/components/", "Campos de formulario", "/es"],
  ])("%s has a section %s after Actions, with a card to each of the four pages, in their order, and to nothing else", (route, heading, prefix) => {
    const html = buildReal().rendered.get(route);
    const sections = [...html.matchAll(/<section class="docs-gallery" aria-labelledby="group-([a-z-]+)">/g)].map((m) => m[1]);
    expect(sections).toEqual(GROUPS);
    const start = html.indexOf('aria-labelledby="group-forms"');
    const section = html.slice(start, html.indexOf("</section>", start));
    expect(section).toContain(`<h2 id="group-forms">${heading}</h2>`);
    const cards = [...section.matchAll(/<h3 class="luz-card__title docs-card__title"><a href="([^"]+)">/g)].map((m) => m[1]);
    expect(cards).toEqual(FORMS.map((slug) => `${prefix}/docs/components/${slug}/`));
  });

  it.each([
    ["/docs/components/form-inputs/", "Core", "Form fields"],
    ["/docs/components/form-field-parts/", "Core", "Form fields"],
    ["/es/docs/components/form-choice/", "Core", "Campos de formulario"],
    ["/es/docs/components/form-values/", "Core", "Campos de formulario"],
  ])("%s has the eyebrow of its group, ending in %s", (route, areaLabel, group) => {
    const html = buildReal().rendered.get(route);
    const eyebrow = html.match(/<p class="luz-doc-header__eyebrow">([^<]*)<\/p>/)?.[1];
    expect(eyebrow).toMatch(new RegExp(`^${areaLabel} · ${group}$`));
  });
});
