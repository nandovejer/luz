/**
 * The group "Forms" (Spanish "Formularios") of Core, in the docs: the form and the select left "Actions and input" for a group
 * of their own, right after it. Button, copy-button and dropdown stay in Actions.
 *
 * What these tests pin: site.json (id, label, order), the front matter of the pages (the members), the Spanish label, the gallery
 * of Core in English and in Spanish, and the eyebrow of a member page.
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

describe("the group Forms of Core", () => {
  it("is right after Actions and input: id forms, label Forms", () => {
    const groups = area("components").groups;
    expect(groups.map((g) => g.id)).toEqual(GROUPS);
    expect(groups.find((g) => g.id === "forms").label).toBe("Forms");
  });

  it("holds exactly form and select, and Actions keeps button, copy-button and dropdown", () => {
    expect(membersOf("components", "forms")).toEqual(["form", "select"]);
    const actions = membersOf("components", "actions");
    for (const slug of ["button", "copy-button", "dropdown"]) expect(actions, slug).toContain(slug);
    for (const slug of ["form", "select"]) expect(actions, slug).not.toContain(slug);
  });

  it("is called Formularios in Spanish", () => {
    expect(json("apps/docs/i18n/es/strings.json")["group.components.forms"]).toBe("Formularios");
  });

  it.each([
    ["/docs/components/", "Forms", ""],
    ["/es/docs/components/", "Formularios", "/es"],
  ])("%s has a section %s after Actions, with a card to form and to select", (route, heading, prefix) => {
    const html = buildReal().rendered.get(route);
    const sections = [...html.matchAll(/<section class="docs-gallery" aria-labelledby="group-([a-z-]+)">/g)].map((m) => m[1]);
    expect(sections).toEqual(GROUPS);
    const start = html.indexOf('aria-labelledby="group-forms"');
    const section = html.slice(start, html.indexOf("</section>", start));
    expect(section).toContain(`<h2 id="group-forms">${heading}</h2>`);
    const cards = [...section.matchAll(/<h3 class="luz-card__title docs-card__title"><a href="([^"]+)">/g)].map((m) => m[1]);
    expect(cards.sort()).toEqual(["form", "select"].map((slug) => `${prefix}/docs/components/${slug}/`));
  });

  it.each([
    ["/docs/components/form/", "Core", "Forms"],
    ["/docs/components/select/", "Core", "Forms"],
    ["/es/docs/components/form/", "Core", "Formularios"],
    ["/es/docs/components/select/", "Core", "Formularios"],
  ])("%s has the eyebrow of its group, ending in %s", (route, areaLabel, group) => {
    const html = buildReal().rendered.get(route);
    const eyebrow = html.match(/<p class="luz-doc-header__eyebrow">([^<]*)<\/p>/)?.[1];
    expect(eyebrow).toMatch(new RegExp(`^${areaLabel} · ${group}$`));
  });
});
