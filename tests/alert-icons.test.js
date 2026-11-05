/**
 * The icon of an alert is an inline SVG of the Icons page, by status, never a text symbol: info is the Info icon, success the
 * Check circle, warning the Warning icon and error the Error icon, which the Icons page lists right after Warning.
 *
 * What these tests pin: every `.luz-alert__icon` of the sources (the docs pages in English and Spanish, the home, the fixtures)
 * and of the rendered site (the notice of an untranslated page is built by the generator) holds an SVG whose shapes are those of
 * its status; the Icons page (English and Spanish) has the Error icon; and the alerts use the very shapes of the Icons page.
 * Text inside a code block is escaped (`&lt;div`), so it is never read as an alert.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { buildReal } from "./helpers/debug-page.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STATUSES = ["info", "success", "warning", "error"];
/** Icons page item id of the icon of each status. */
const ICON_OF = { info: "info", success: "check-circle", warning: "warning", error: "error" };
/** The shapes of the Error icon: a circle and a cross. */
const ERROR_SHAPES = '<circle cx="12" cy="12" r="8.5"/><path d="M9 9l6 6M15 9l-6 6"/>';

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    if (name === "node_modules" || name === "dist") return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
const sources = () =>
  [...walk(join(root, "apps")), ...walk(join(root, "tests/fixtures"))]
    .filter((file) => file.endsWith(".html"))
    .map((file) => ({ name: file.slice(root.length + 1), html: readFileSync(file, "utf-8") }));

/** Every alert icon of a document: its status, its inner markup. A literal `<div class="luz-alert__icon"`, so escaped code never counts. */
function alertIcons(html) {
  const all = html.match(/<div class="luz-alert__icon"/g)?.length ?? 0;
  const found = [...html.matchAll(/<div class="luz-alert ([^"]*)"[^>]*>\s*<div class="luz-alert__icon"[^>]*>([\s\S]*?)<\/div>/g)].map((m) => ({
    status: STATUSES.find((s) => m[1].split(" ").includes(`luz-alert--${s}`)),
    classes: m[1],
    inner: m[2].trim(),
  }));
  return { all, found };
}
const shapesOf = (svg) => svg.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)?.[1].trim();
const iconsPage = (rendered, route) => {
  const html = rendered.get(route);
  const item = (id) => {
    const li = html.match(new RegExp(`<li class="luz-icon-item">(?:(?!</li>)[\\s\\S])*?id="c-icons-${id}">`));
    return li && shapesOf(li[0]);
  };
  return { html, item };
};

let rendered;
let documents;
beforeAll(() => {
  rendered = buildReal().rendered;
  documents = [...sources(), ...[...rendered].map(([route, html]) => ({ name: `rendered ${route}`, html }))];
}, 120_000);

describe("the icon of an alert", () => {
  it("is an SVG with the shapes of its status in every alert of the sources and of the rendered site, never a text symbol", () => {
    const wrong = [];
    const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    let seen = 0;
    for (const { name, html } of documents) {
      const { all, found } = alertIcons(html);
      if (all !== found.length) wrong.push(`${name}: ${all - found.length} alert icon(s) outside a .luz-alert`);
      for (const { status, classes, inner } of found) {
        seen++;
        if (!status) {
          wrong.push(`${name}: no status modifier in "${classes}"`);
          continue;
        }
        counts[status]++;
        const svg = inner.match(/^<svg\b[^>]*>[\s\S]*<\/svg>$/);
        if (!svg) wrong.push(`${name}: the ${status} alert icon is not an SVG: ${inner.slice(0, 40)}`);
      }
    }
    expect(wrong).toEqual([]);
    expect(seen).toBeGreaterThan(8);
    for (const status of STATUSES) expect(counts[status], status).toBeGreaterThan(0);
  });

  it("is a 20 px stroke icon that follows the text colour, hidden from the reader with its container", () => {
    const wrong = [];
    for (const { name, html } of documents) {
      for (const { status, inner } of alertIcons(html).found) {
        const open = inner.match(/^<svg\b[^>]*>/)?.[0] ?? "";
        for (const attr of ['viewBox="0 0 24 24"', 'width="20"', 'height="20"', 'fill="none"', 'stroke="currentColor"', 'focusable="false"'])
          if (!open.includes(attr)) wrong.push(`${name}: the ${status} icon lacks ${attr}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it("holds the shapes of the Icons page for its status (info, check-circle, warning, error)", () => {
    const { item } = iconsPage(rendered, "/docs/components/icons/");
    const wrong = [];
    for (const { name, html } of documents) {
      for (const { status, inner } of alertIcons(html).found) {
        const expected = status === "error" ? ERROR_SHAPES : item(ICON_OF[status]);
        if (!expected) wrong.push(`the Icons page has no ${ICON_OF[status]} icon`);
        else if (shapesOf(inner) !== expected) wrong.push(`${name}: the ${status} alert icon differs from the Icons page`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it("is also an SVG in the notice of an untranslated page, which is an info alert", () => {
    const notices = [...rendered].filter(([, html]) => html.includes("docs-notice"));
    expect(notices.length).toBeGreaterThan(0);
    for (const [route, html] of notices) {
      const notice = html.match(/<div class="luz-alert luz-alert--info docs-notice">\s*<div class="luz-alert__icon"[^>]*>([\s\S]*?)<\/div>/);
      expect(notice, route).not.toBeNull();
      expect(shapesOf(notice[1]), route).toBe(iconsPage(rendered, "/docs/components/icons/").item("info"));
    }
  });
});

describe("the Error icon on the Icons page", () => {
  it.each([
    ["/docs/components/icons/", "Error"],
    ["/es/docs/components/icons/", "Error"],
  ])("%s lists c-icons-error right after Warning, with the circle and the cross and a Copy SVG button", (route, label) => {
    const { html, item } = iconsPage(rendered, route);
    const ids = [...html.matchAll(/<span class="luz-icon-name" id="c-icons-([a-z-]+)">/g)].map((m) => m[1]);
    expect(ids.indexOf("error")).toBe(ids.indexOf("warning") + 1);
    expect(item("error")).toBe(ERROR_SHAPES);
    expect(html).toContain(`<span class="luz-icon-name" id="c-icons-error">${label}</span>`);
    expect(html).toMatch(/<button type="button" class="luz-copy-btn" id="c-icons-error-copy" aria-labelledby="c-icons-error-copy c-icons-error">[^<]+<\/button>/);
  });

  it("is the SVG the error alert uses", () => {
    const { item } = iconsPage(rendered, "/docs/components/icons/");
    const alert = alertIcons(readFileSync(join(root, "apps/docs/pages/components/alert.html"), "utf-8")).found.find((a) => a.status === "error");
    expect(shapesOf(alert.inner)).toBe(item("error"));
  });

  it("has the same icons in English and in Spanish", () => {
    const ids = (route) => [...rendered.get(route).matchAll(/id="c-icons-([a-z-]+)"/g)].map((m) => m[1]);
    expect(ids("/es/docs/components/icons/")).toEqual(ids("/docs/components/icons/"));
  });
});
