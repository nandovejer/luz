/**
 * Gaps in the prompts for AI that a person following one would hit (the change
 * on fix/prompt-gaps). What these tests pin, as facts and never as prose:
 *
 *   - blog and docs describe <luz-search>'s dialog with `data-luz-search-src`
 *     and `data-luz-search-results`, never the old `data-luz-search-index`, and
 *     link components/search.min.css; landing and app do not link it;
 *   - landing, blog, docs and app say that `luz-nav-toggle` needs the file that
 *     catalog's classes.json gives for it, and link that file's stylesheet; the
 *     file is read from classes.json (a fixture that renames it is followed) and
 *     a class with no file makes assemblePrompt throw, naming prompts.js;
 *   - app says that a part of a stacked bar is sized by `style="--v: 62"`, "the
 *     one `style` allowed", and links components/chart.min.css, naming <luz-chart>;
 *   - no prompt keeps the placeholder `{{nav-toggle-css}}`.
 *
 * The size rule is prompts-concise.test.js; the hashes of the sentinel's cases
 * are check-prompts.test.js and stay red until the sentinel has read the change.
 */
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { assemblePrompt } from "../scripts/docs-site/prompts.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(join(root, path), "utf-8");
const json = (path) => JSON.parse(read(path));

const IDS = ["start", "landing", "blog", "app", "docs"];
const WITH_NAV_TOGGLE = ["landing", "blog", "docs", "app"];

const prompts = Object.fromEntries(IDS.map((id) => [id, assemblePrompt(id, { root })]));

/** What the person reads between the code fences: the prose of a prompt. */
const prose = (text) => {
  let fenced = false;
  return text
    .split("\n")
    .filter((line) => {
      if (line.startsWith("```")) {
        fenced = !fenced;
        return false;
      }
      return !fenced;
    })
    .join("\n");
};

/** The catalog stylesheets a prompt links, as `components/<name>.min.css`. */
const catalogLinks = (text) => [...text.matchAll(/<link rel="stylesheet" href="https:\/\/cdn\.jsdelivr\.net\/npm\/@luz-ds\/catalog@[^/"]+\/dist\/(components\/[a-z0-9-]+\.min\.css)">/g)].map((m) => m[1]);

const minified = (file) => file.replace(/\.css$/, ".min.css");
const fileOfNavToggle = (classes) => classes.classes.find((c) => c.name === "luz-nav-toggle")?.files?.[0];

const temps = [];
afterEach(() => {
  while (temps.length) rmSync(temps.pop(), { recursive: true, force: true });
});

/** A copy of the sources whose catalog classes.json is the one `edit` returns; the rest of the packages is linked. */
function withClasses(edit) {
  const dir = mkdtempSync(join(tmpdir(), "luz-prompt-gaps-"));
  temps.push(dir);
  mkdirSync(join(dir, "apps/site"), { recursive: true });
  cpSync(join(root, "apps/site/prompts"), join(dir, "apps/site/prompts"), { recursive: true });
  mkdirSync(join(dir, "apps/docs/pages"), { recursive: true });
  cpSync(join(root, "apps/docs/pages/catalog"), join(dir, "apps/docs/pages/catalog"), { recursive: true });
  mkdirSync(join(dir, "packages/catalog/dist"), { recursive: true });
  for (const pkg of readdirSync(join(root, "packages"))) if (pkg !== "catalog") symlinkSync(join(root, "packages", pkg), join(dir, "packages", pkg));
  for (const entry of readdirSync(join(root, "packages/catalog"))) if (entry !== "dist") symlinkSync(join(root, "packages/catalog", entry), join(dir, "packages/catalog", entry));
  for (const entry of readdirSync(join(root, "packages/catalog/dist"))) if (entry !== "classes.json") symlinkSync(join(root, "packages/catalog/dist", entry), join(dir, "packages/catalog/dist", entry));
  writeFileSync(join(dir, "packages/catalog/dist/classes.json"), JSON.stringify(edit(json("packages/catalog/dist/classes.json"))));
  return dir;
}

describe("blog and docs: the search dialog is described with the attributes the element reads", () => {
  it.each(["blog", "docs"])("%s names data-luz-search-src and data-luz-search-results", (id) => {
    expect(prompts[id]).toContain("data-luz-search-src");
    expect(prompts[id]).toContain("data-luz-search-results");
  });

  it.each(["blog", "docs"])("%s never names data-luz-search-index", (id) => {
    expect(prompts[id]).not.toContain("data-luz-search-index");
  });

  it.each(["blog", "docs"])("%s links components/search.min.css", (id) => {
    expect(catalogLinks(prompts[id])).toContain("components/search.min.css");
  });

  it.each(["landing", "app"])("%s does not link components/search.min.css", (id) => {
    expect(catalogLinks(prompts[id])).not.toContain("components/search.min.css");
  });
});

describe("luz-nav-toggle: the prompts say which stylesheet it needs, and link it", () => {
  const file = fileOfNavToggle(json("packages/catalog/dist/classes.json"));

  it("catalog's classes.json gives components/sidebar.css for it", () => {
    expect(file).toBe("components/sidebar.css");
  });

  it.each(WITH_NAV_TOGGLE)("%s: the prose names luz-nav-toggle and its file on one line", (id) => {
    const line = prose(prompts[id])
      .split("\n")
      .find((l) => l.includes("luz-nav-toggle") && l.includes(file));
    expect(line, `a line of prose with luz-nav-toggle and ${file}`).toBeDefined();
  });

  it.each(WITH_NAV_TOGGLE)("%s: links the stylesheet of that file", (id) => {
    expect(catalogLinks(prompts[id])).toContain(minified(file));
  });

  it.each(WITH_NAV_TOGGLE)("%s: the file in the prose follows classes.json, it is not typed", (id) => {
    const renamed = "components/navbar.css";
    expect(renamed).not.toBe(file);
    const dir = withClasses((classes) => ({
      ...classes,
      classes: classes.classes.map((c) => (c.name === "luz-nav-toggle" ? { ...c, files: [renamed] } : c)),
    }));
    const text = assemblePrompt(id, { root: dir });
    const line = prose(text)
      .split("\n")
      .find((l) => l.includes("luz-nav-toggle") && l.includes(renamed));
    expect(line, `a line of prose with luz-nav-toggle and ${renamed}`).toBeDefined();
    expect(
      prose(text)
        .split("\n")
        .some((l) => l.includes("luz-nav-toggle") && l.includes(file)),
      `no line still names ${file}`,
    ).toBe(false);
  });

  it.each(WITH_NAV_TOGGLE)("%s: throws, naming prompts.js, when classes.json gives luz-nav-toggle no file", (id) => {
    const dir = withClasses((classes) => ({
      ...classes,
      classes: classes.classes.filter((c) => !c.name.startsWith("luz-nav-toggle")),
    }));
    expect(() => assemblePrompt(id, { root: dir })).toThrow(/prompts\.js/);
    expect(() => assemblePrompt(id, { root: dir })).toThrow(/luz-nav-toggle/);
  });

  it.each(IDS)("%s: keeps no {{nav-toggle-css}} placeholder", (id) => {
    expect(prompts[id]).not.toContain("{{nav-toggle-css}}");
    expect(prompts[id]).not.toContain("{{");
  });
});

describe("app: the charts", () => {
  it("says that a part of a stacked bar is sized by style=\"--v: 62\", the one style allowed", () => {
    const text = prose(prompts.app);
    expect(text).toContain('style="--v: 62"');
    expect(text).toContain("the one `style` allowed");
  });

  it("links components/chart.min.css", () => {
    expect(catalogLinks(prompts.app)).toContain("components/chart.min.css");
  });

  it("names <luz-chart> in the prose of its kind-of-site section, not only in the element list", () => {
    const section = prompts.app.split("\n## ").find((s) => s.startsWith("The kind of site"));
    expect(section, "the section").toBeDefined();
    expect(prose(section)).toContain("<luz-chart>");
  });
});
