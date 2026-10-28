/**
 * The prompts for AI (.claude/plans/ai-and-catalog-only.md, decisions 11 to 16
 * and 24 to 26, phase F1). Five plain-text prompts, assembled from one body and
 * a preset per kind of site in apps/site/prompts/, served at /prompts/<id>.txt
 * and listed in llms.txt:
 *
 *   start (the general one: the body without a preset), landing, blog, app, docs
 *
 * What these tests pin:
 *
 *   - the five assemble from the same body: each holds every line of it that
 *     has no placeholder; start has no "## The kind of site" section and each
 *     other prompt has exactly its own preset;
 *   - nothing that names the system is typed: no placeholder is left, the
 *     versions of the install lines are those of the packages, every class and
 *     element a prompt names exists in a manifest of a package;
 *   - every link is the published site's or a file of @luz-ds on the CDN;
 *   - each prompt is within the ceiling of its row in budgets.json (16 KiB);
 *   - a placeholder the generator does not know fails with body.md:<line>;
 *   - the canonical URL of each prompt is the site's /prompts/<id>.txt;
 *   - the build emits the five at the root of Pages and the dev server serves
 *     them as plain text; llms.txt lists them under "## Prompts", before
 *     "## Optional".
 *
 * The gate (scripts/check-prompts.js) has its own tests: check-prompts.test.js.
 */
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { docsSite } from "../scripts/docs-site/plugin.js";
import { scanSite } from "../scripts/docs-site/site.js";
import { SITE_URL } from "../vite.config.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(join(root, path), "utf-8");
const json = (path) => JSON.parse(read(path));

/* ---- the module, or a clear failure while it does not exist --------------- */

const MODULE = join(root, "scripts/docs-site/prompts.js");
const generator = existsSync(MODULE) ? await import(/* @vite-ignore */ MODULE) : {};
const member = (name) => {
  if (generator[name] === undefined) throw new Error(`scripts/docs-site/prompts.js does not exist or does not export ${name}`);
  return generator[name];
};
const ai = await import(/* @vite-ignore */ join(root, "scripts/docs-site/ai.js"));
const assemble = (id, options = { root }) => member("assemblePrompt")(id, options);

/** The five prompts, in the order llms.txt lists them, and the preset file of each (none for the general one). */
const IDS = ["start", "landing", "blog", "app", "docs"];
const PRESET_OF = { start: null, landing: "landing", blog: "blog", app: "app", docs: "docs" };
const SITE = "https://nandovejer.github.io/luz/";
const CDN = "https://cdn.jsdelivr.net/npm/@luz-ds/";

const prompt = (() => {
  const cache = new Map();
  return (id) => {
    if (!cache.has(id)) cache.set(id, assemble(id));
    return cache.get(id);
  };
})();

const packages = readdirSync(join(root, "packages"));
const versionOf = (name) => json(`packages/${name}/package.json`).version;

/** Every class and every custom element the manifests of the packages declare. */
const manifests = (() => {
  const classes = new Set();
  const elements = new Set();
  for (const name of packages) {
    const dist = join("packages", name, "dist");
    if (existsSync(join(root, dist, "classes.json"))) for (const c of json(join(dist, "classes.json")).classes) classes.add(c.name);
    if (existsSync(join(root, dist, "custom-elements.json"))) {
      for (const m of json(join(dist, "custom-elements.json")).modules) for (const d of m.declarations ?? []) if (d.tagName) elements.add(d.tagName);
    }
  }
  return { classes, elements };
})();

const temps = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** A throwaway repository: a copy of the sources of the prompts, the real packages linked, and the real budgets. */
function copyOfSources() {
  const dir = mkdtempSync(join(tmpdir(), "luz-prompts-"));
  temps.push(dir);
  mkdirSync(join(dir, "apps/site"), { recursive: true });
  cpSync(join(root, "apps/site/prompts"), join(dir, "apps/site/prompts"), { recursive: true });
  symlinkSync(join(root, "packages"), join(dir, "packages"));
  cpSync(join(root, "budgets.json"), join(dir, "budgets.json"));
  // The patterns of each kind are the catalog pages that name it in `fits-kinds` (F8, decisions 71 and 72)
  mkdirSync(join(dir, "apps/docs/pages"), { recursive: true });
  cpSync(join(root, "apps/docs/pages/catalog"), join(dir, "apps/docs/pages/catalog"), { recursive: true });
  // The hash of a prompt reads the module itself, at this path under the root it is given
  mkdirSync(join(dir, "scripts/docs-site"), { recursive: true });
  cpSync(join(root, "scripts/docs-site/prompts.js"), join(dir, "scripts/docs-site/prompts.js"));
  cpSync(join(root, "scripts/docs-site/kinds.js"), join(dir, "scripts/docs-site/kinds.js"));
  return dir;
}

/* ---- the sources ------------------------------------------------------------ */

describe("the sources of the prompts: one body, a preset per kind, the stacks", () => {
  it("are apps/site/prompts/body.md, presets/{landing,blog,app,docs}.md and stacks.json", () => {
    expect(existsSync(join(root, "apps/site/prompts/body.md"))).toBe(true);
    expect(readdirSync(join(root, "apps/site/prompts/presets")).sort()).toEqual(["app.md", "blog.md", "docs.md", "landing.md"]);
    const stacks = json("apps/site/prompts/stacks.json");
    expect(Array.isArray(stacks.stacks)).toBe(true);
    expect(stacks.stacks.length).toBeGreaterThan(0);
  });

  it("point the four kinds at catalog and at /docs/catalog/, and say which kind's patterns they link: the pages that fit it by `fits-kinds` (a blog's are the blog's: F8 left `cms` as a name of nothing)", () => {
    const kinds = member("PROMPT_KINDS");
    expect(kinds.filter((k) => k.preset).map((k) => [k.id, k.pkg, k.docs, k.patterns])).toEqual([
      ["landing", "catalog", "docs/catalog/", "landing"],
      ["blog", "catalog", "docs/catalog/", "blog"],
      ["app", "catalog", "docs/catalog/", "app"],
      ["docs", "catalog", "docs/catalog/", "docs"],
    ]);
    expect(kinds.find((k) => k.id === "start")).toMatchObject({ pkg: null, docs: null, patterns: null });
  });

  it("are the five prompts of the generator, in this order, each at /prompts/<id>.txt", () => {
    expect(member("PROMPT_KINDS").map((k) => k.id)).toEqual(IDS);
    for (const id of IDS) expect(member("promptRoute")(id)).toBe(`/prompts/${id}.txt`);
    expect(member("PROMPT_SITE")).toBe(SITE_URL);
    expect(SITE_URL).toBe(SITE);
  });
});

/* ---- the five assemble from one body ---------------------------------------- */

describe("the five prompts assemble from the same body", () => {
  const body = () => read("apps/site/prompts/body.md");
  const fixed = () => body().split("\n").filter((line) => line.trim() && !/\{\{|\{n:/.test(line));

  it.each(IDS)("%s assembles to a non-empty plain text that ends in one newline", (id) => {
    const text = prompt(id);
    expect(typeof text).toBe("string");
    expect(text.length).toBeGreaterThan(500);
    expect(text.endsWith("\n")).toBe(true);
    expect(text.endsWith("\n\n")).toBe(false);
    expect(text).not.toContain("\r");
  });

  it("has lines in the body that are fixed text, so there is something to hold", () => {
    expect(fixed().length).toBeGreaterThan(10);
  });

  it.each(IDS)("%s holds every line of the body that has no placeholder", (id) => {
    const lines = prompt(id).split("\n");
    for (const line of fixed()) expect(lines, `"${line.slice(0, 70)}"`).toContain(line);
  });

  it("start has no section of a kind of site, and each other prompt has exactly its own", () => {
    const heading = "## The kind of site";
    expect(prompt("start")).not.toContain(heading);
    for (const id of IDS.filter((i) => PRESET_OF[i])) {
      const text = prompt(id);
      expect(text.split("\n").filter((l) => l.startsWith(heading)), `${id}: one section of the kind`).toHaveLength(1);
      const preset = read(`apps/site/prompts/presets/${PRESET_OF[id]}.md`).trim();
      // the preset's own heading line and its first paragraph
      const [first, ...rest] = preset.split("\n").filter((l) => l.trim());
      expect(first.startsWith(heading), `${PRESET_OF[id]}.md starts with the heading`).toBe(true);
      expect(text, `${id}: its own preset`).toContain(first);
      expect(text, `${id}: its own preset, body`).toContain(rest[0]);
      for (const other of IDS.filter((i) => PRESET_OF[i] && i !== id)) {
        const foreign = read(`apps/site/prompts/presets/${PRESET_OF[other]}.md`).trim().split("\n")[0];
        expect(text, `${id} does not hold the preset of ${other}`).not.toContain(foreign);
      }
    }
  });

  it.each(IDS)("%s leaves no placeholder behind", (id) => {
    const text = prompt(id);
    expect(text).not.toContain("{{");
    expect(text).not.toContain("}}");
    expect(text).not.toMatch(/\{n:/);
  });

  it("differ from each other: the same body is not the same prompt", () => {
    expect(new Set(IDS.map((id) => prompt(id))).size).toBe(IDS.length);
  });
});

/* ---- versions, links, names: nothing typed ----------------------------------- */

describe("what a prompt says about the system comes from the packages", () => {
  it.each(IDS)("%s: every @luz-ds/<name>@<version> is the version of that package, and the install lines name tokens, core, catalog and the check", (id) => {
    const text = prompt(id);
    const seen = new Map();
    for (const m of text.matchAll(/@luz-ds\/([a-z-]+)@(\d[^\s/`"'<>]*)/g)) seen.set(m[1], new Set([...(seen.get(m[1]) ?? []), m[2]]));
    for (const name of ["tokens", "core", "catalog", "check"]) expect(seen.has(name), `${id}: @luz-ds/${name}@version`).toBe(true);
    for (const [name, versions] of seen) {
      expect(packages, `${id}: @luz-ds/${name} is a package`).toContain(name);
      expect([...versions], `${id}: @luz-ds/${name}`).toEqual([versionOf(name)]);
    }
  });

  it.each(IDS)("%s: catalog is linked a file at a time: components/<name>.min.css of the package, never catalog.min.css", (id) => {
    const text = prompt(id);
    const links = [...text.matchAll(/<link rel="stylesheet" href="https:\/\/cdn\.jsdelivr\.net\/npm\/@luz-ds\/catalog@[^/"]+\/dist\/([^"]+)">/g)].map((m) => m[1]);
    expect(links.length, `${id}: at least one catalog component to link`).toBeGreaterThan(0);
    for (const file of links) {
      expect(file, id).toMatch(/^components\/[a-z0-9-]+\.min\.css$/);
      expect(existsSync(join(root, "packages/catalog/dist", file)), `${id}: ${file} is a file of catalog`).toBe(true);
    }
    expect(text, id).not.toMatch(/catalog(?:\.min)?\.css|@luz-ds\/catalog\/css/);
  });

  it.each(IDS)("%s: every catalog element it lists says its stylesheet, a file of the package", (id) => {
    const text = prompt(id);
    const start = text.indexOf("## Elements you may use\n\n") + "## Elements you may use\n\n".length;
    const lines = text.slice(start).split(/\n\n## /)[0].split("\n");
    const tags = json("packages/catalog/dist/custom-elements.json").modules.flatMap((m) => m.declarations ?? []).filter((d) => d.tagName);
    expect(tags.length).toBeGreaterThanOrEqual(6);
    for (const d of tags) {
      const line = lines.find((l) => l.startsWith(`- \`<${d.tagName}>\``));
      expect(line, `${d.tagName} is listed`).toBeTruthy();
      expect(line.endsWith(` Its stylesheet: \`@luz-ds/catalog/${d.stylesheet}\`.`), line).toBe(true);
      expect(existsSync(join(root, "packages/catalog/dist", d.stylesheet)), `${d.stylesheet} exists`).toBe(true);
    }
  });

  /**
   * The files of the patterns of each kind, in the order of the cascade (CASCADE of kinds.js): the stylesheets of the catalog pages
   * whose `fits-kinds` names the kind and not `any` (F8: no `<kind>-` in the name; the header and the footer are the landing page's
   * and the blog's). The navbar, the sidebar, the terminal and the timeline are catalog's own pieces and are linked beside them.
   */
  const PATTERNS = {
    landing: ["site-header", "hero", "main", "section", "stat", "site-footer", "glow"],
    blog: ["site-header", "masthead", "site-footer", "page-header", "article-header", "article"],
    app: ["app-bar", "dashboard"],
    docs: ["docs-layout", "doc-header", "page-rail", "example", "do-dont", "pager", "page-footer"],
  };
  /** The pages that name each kind in `fits-kinds`, any of them, as a set: the order is the docs' (the `order` of each page). */
  const PAGES = {
    landing: ["hero", "section", "site-footer", "site-header", "stat", "timeline"],
    blog: ["article-header", "masthead", "page-header", "site-footer", "site-header", "timeline", "toc"],
    app: ["app-bar", "dashboard", "sidebar"],
    docs: ["do-dont", "doc-header", "docs-layout", "example", "page-footer", "page-rail", "pager", "sidebar", "terminal"],
  };
  /** The blocks only one kind uses: the classes the other prompts must not list. */
  const EXCLUSIVE = {
    landing: ["luz-hero", "luz-main", "luz-section", "luz-stat", "luz-glow"],
    blog: ["luz-masthead", "luz-page-header", "luz-article-header", "luz-article", "luz-toc"],
    app: ["luz-app-bar", "luz-dashboard"],
    docs: ["luz-docs-layout", "luz-doc-header", "luz-page-rail", "luz-example", "luz-do-dont", "luz-pager", "luz-page-footer"],
  };
  const catalogLinks = (text) => [...text.matchAll(/<link rel="stylesheet" href="https:\/\/cdn\.jsdelivr\.net\/npm\/@luz-ds\/catalog@[^/"]+\/dist\/components\/([a-z0-9-]+)\.min\.css">/g)].map((m) => m[1]);
  const ALL_PATTERN_FILES = [...new Set(Object.values(PATTERNS).flat())];
  const isPattern = (name) => ALL_PATTERN_FILES.includes(name);

  it.each(["landing", "blog", "app", "docs"])("%s: the install lines are tokens, core and catalog, and link every pattern of its kind, in the order of the cascade, after the other catalog files (the kind's patterns come from `fits-kinds`: no package of a kind)", (id) => {
    const text = prompt(id);
    const links = catalogLinks(text);
    expect(links.filter(isPattern), `${id}: its patterns, and no other kind's`).toEqual(PATTERNS[id]);
    // The patterns come last: what they refine is linked before them
    expect(links.slice(links.length - PATTERNS[id].length), id).toEqual(PATTERNS[id]);
    expect(links.slice(0, links.length - PATTERNS[id].length).some(isPattern), `${id}: no pattern among the others`).toBe(false);
    // The pieces of catalog that fit this kind (or any) come with them: the navbar fits any site, the timeline landing and blog, the sidebar app and docs.
    // Landing and blog link the sidebar too: the nav toggle of the site header and of the masthead is defined in the sidebar's file
    const rest = new Set(links);
    for (const name of { landing: ["navbar", "timeline", "sidebar"], blog: ["navbar", "timeline", "sidebar"], app: ["navbar", "sidebar"], docs: ["navbar", "sidebar", "terminal"] }[id]) expect(rest.has(name), `${id} links ${name}`).toBe(true);
    for (const name of { landing: ["terminal"], blog: ["terminal"], app: ["terminal", "timeline"], docs: ["timeline"] }[id]) expect(rest.has(name), `${id} does not link ${name}`).toBe(false);
    // …and the sidebar comes before the headers it serves, in the cascade
    const header = { landing: "site-header", blog: "site-header", app: "app-bar", docs: "docs-layout" }[id];
    expect(links.indexOf("sidebar"), `${id}: sidebar before ${header}`).toBeLessThan(links.indexOf(header));
    if (id === "blog") expect(links.indexOf("sidebar"), "blog: sidebar before masthead").toBeLessThan(links.indexOf("masthead"));
    expect(new Set(links).size, `${id}: each file once`).toBe(links.length);
    expect(text, `${id}: no package of a kind`).not.toMatch(/@luz-ds\/(?:landing|cms|app|docs)(?![\w-])/);
    expect(text, `${id}: the load order names no package of a kind`).not.toMatch(/then @luz-ds\//);
    expect(text, `${id}: its npm line`).toMatch(new RegExp(`npm install @luz-ds/tokens@${versionOf("tokens").replace(/\./g, "\\.")} @luz-ds/core@\\S+ @luz-ds/catalog@\\S+(?: @luz-ds/check@\\S+)?\\n`));
  });

  it("start links no pattern of a kind of site, and names no package of a kind", () => {
    const text = prompt("start");
    expect(catalogLinks(text).filter(isPattern)).toEqual([]);
    expect(text).not.toMatch(/@luz-ds\/(?:landing|cms|app|docs)(?![\w-])/);
  });

  it.each(["landing", "blog", "app", "docs"])("%s: lists the classes of its own patterns from catalog, and none of the other kinds' (by the new names)", (id) => {
    const text = prompt(id);
    for (const block of EXCLUSIVE[id]) expect(text, `${id}: ${block}`).toMatch(new RegExp(`^- \`${block}\``, "m"));
    for (const [other, blocks] of Object.entries(EXCLUSIVE)) {
      if (other !== id) for (const block of blocks) expect(text, `${id}: no class of ${other} (${block})`).not.toMatch(new RegExp(`\`${block}(?:__[a-z-]+|--[a-z-]+)?\``));
    }
    expect(text, `${id}: no class of before F8`).not.toMatch(/`luz-(?:landing|cms)-|`luz-app-(?:header|dashboard)|`luz-docs-(?:shell|page-|rail|pager|example|dodont)/);
  });

  it.each(["landing", "blog", "app", "docs"])("%s: links the docs page of each page that fits its kind, one line each, and no area of a package", (id) => {
    const text = prompt(id);
    const lines = text.split("\n").filter((l) => l.startsWith(`- ${SITE}docs/`));
    const catalogPages = lines.filter((l) => l.startsWith(`- ${SITE}docs/catalog/`)).map((l) => l.slice(`- ${SITE}docs/catalog/`.length).split("/")[0]);
    expect([...catalogPages].sort(), id).toEqual(PAGES[id]);
    expect(new Set(catalogPages).size, `${id}: one line a page`).toBe(catalogPages.length);
    expect(text, id).not.toMatch(/docs\/(?:landing|cms|app|documentation)\//);
    for (const page of catalogPages) expect(existsSync(join(root, `apps/docs/pages/catalog/${page}.html`)), `${id}: ${page} is a page of the docs`).toBe(true);
  });

  it.each(["landing", "blog", "app", "docs"])("%s: each docs line reads `- <url>: markup of the <page>.`, with the page's name in words", (id) => {
    const lines = prompt(id).split("\n").filter((l) => l.startsWith(`- ${SITE}docs/catalog/`));
    expect(lines.length, id).toBeGreaterThan(0);
    for (const line of lines) {
      const slug = line.slice(`- ${SITE}docs/catalog/`.length).split("/")[0];
      expect(line, id).toBe(`- ${SITE}docs/catalog/${slug}/: markup of the ${slug.replace(/-/g, " ")}.`);
    }
  });

  it.each(IDS)("%s: every link starts with the published site or the @luz-ds files on the CDN", (id) => {
    const text = prompt(id);
    const urls = [...text.matchAll(/\b[a-z][a-z0-9+.-]*:\/\/[^\s`"'<>)]*/gi)].map((m) => m[0]);
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) expect(url.startsWith(SITE) || url.startsWith(CDN), `${id}: ${url}`).toBe(true);
    expect(text).not.toMatch(/\bwww\./i);
    // a relative link leads nowhere once the text is pasted into a conversation
    expect(text).not.toMatch(/\]\(\/|href="\/(?!\/)/);
  });

  it.each(IDS)("%s: every class it names exists in the classes.json of some package", (id) => {
    expect(manifests.classes.size).toBeGreaterThan(100);
    const missing = [];
    let named = 0;
    for (const line of prompt(id).split("\n")) {
      let block = null;
      for (const m of line.matchAll(/`((?:luz|o|u|is)-[a-z0-9_-]+|--[a-z0-9-]+|__[a-z0-9_-]+)`/g)) {
        const modifier = m[1].startsWith("--") || m[1].startsWith("__");
        // `luz-alert`: `--error`, `__title`: a modifier or a part is read against the block before it on the line
        const name = modifier ? (block ? block + m[1] : null) : m[1];
        if (!modifier) block = m[1];
        if (!name) continue;
        named += 1;
        if (!manifests.classes.has(name)) missing.push(name);
      }
    }
    expect(named, `${id} names classes`).toBeGreaterThan(20);
    expect(missing, `${id}: names no package has`).toEqual([]);
  });

  it.each(IDS)("%s: every <luz-*> element it names exists in the custom-elements.json of some package", (id) => {
    const named = [...prompt(id).matchAll(/<(luz-[a-z0-9-]+)[\s>/]/g)].map((m) => m[1]);
    expect(named.length, `${id} names elements`).toBeGreaterThan(0);
    expect(named.filter((tag) => !manifests.elements.has(tag)), `${id}: elements no package has`).toEqual([]);
    expect(named, `${id} names <luz-color-mode>, the colour mode switcher`).toContain("luz-color-mode");
    expect(named.filter((tag) => ["luz-mode", "luz-consent", "luz-banner"].includes(tag))).toEqual([]);
  });

  it("the kinds name the classes of their own patterns, from the manifest of their package, and the general prompt names none of them", () => {
    for (const [id, blocks] of Object.entries(EXCLUSIVE)) {
      for (const block of blocks) {
        expect(prompt(id), `${id}: ${block}`).toContain(`\`${block}`);
        expect(prompt("start"), `the general prompt names none of them (${block})`).not.toContain(`\`${block}\``);
      }
    }
  });

  it("takes the patterns of a kind from the `fits-kinds` of the pages: a page that adds a kind adds its file, its classes and its docs line to that prompt, and nothing is listed by hand (decision 72)", () => {
    const dir = copyOfSources();
    // The stat fits landing; the page now fits landing and app
    const stat = join(dir, "apps/docs/pages/catalog/stat.html");
    writeFileSync(stat, readFileSync(stat, "utf-8").replace(/^fits-kinds: .*$/m, "fits-kinds: landing, app"));
    const app = member("assemblePrompt")("app", { root: dir });
    expect(catalogLinks(app), "the app links the stat's file").toContain("stat");
    expect(app).toMatch(/^- `luz-stat`/m);
    expect(app).toContain(`${SITE}docs/catalog/stat/`);
    const blog = member("assemblePrompt")("blog", { root: dir });
    expect(catalogLinks(blog), "the blog does not").not.toContain("stat");
    expect(blog).not.toContain(`${SITE}docs/catalog/stat/`);
    // and a page that leaves a kind takes its file out of that prompt
    writeFileSync(stat, readFileSync(stat, "utf-8").replace(/^fits-kinds: .*$/m, "fits-kinds: app"));
    expect(catalogLinks(member("assemblePrompt")("landing", { root: dir })), "the landing page does not link the stat any more").not.toContain("stat");
  });

  it("links the pieces that fit `any` in every prompt: a page that says `any` is in the five, with its file, and a page of one kind is in no other", () => {
    const dir = copyOfSources();
    const navbar = join(dir, "apps/docs/pages/catalog/navbar.html");
    expect(readFileSync(navbar, "utf-8")).toMatch(/^fits-kinds: any$/m);
    for (const id of ["landing", "blog", "app", "docs"]) expect(catalogLinks(member("assemblePrompt")(id, { root: dir })), id).toContain("navbar");
    // the terminal fits docs: when its page adds app, the app prompt links its file, and the landing page's still does not
    const terminal = join(dir, "apps/docs/pages/catalog/terminal.html");
    expect(catalogLinks(member("assemblePrompt")("app", { root: dir })), "before").not.toContain("terminal");
    writeFileSync(terminal, readFileSync(terminal, "utf-8").replace(/^fits-kinds: .*$/m, "fits-kinds: docs, app"));
    expect(catalogLinks(member("assemblePrompt")("app", { root: dir }))).toContain("terminal");
    expect(catalogLinks(member("assemblePrompt")("landing", { root: dir }))).not.toContain("terminal");
  });

  it("fails, naming the file, when a page of a kind lists a stylesheet that the cascade does not place (CASCADE is the one thing typed)", () => {
    const dir = copyOfSources();
    const pager = join(dir, "apps/docs/pages/catalog/pager.html");
    writeFileSync(pager, readFileSync(pager, "utf-8").replace(/^files: .*$/m, "files: components/pager.css, components/ribbon.css"));
    expect(() => member("assemblePrompt")("docs", { root: dir })).toThrow(/ribbon/);
  });
});

/* ---- the canonical URL --------------------------------------------------------- */

describe("each prompt says its canonical copy is its URL", () => {
  it.each(IDS)("%s says it on a line with its own URL, the site's prompts/<id>.txt, and with no other prompt's", (id) => {
    const url = `${SITE_URL}prompts/${id}.txt`;
    const line = prompt(id).split("\n").find((l) => /canonical/i.test(l) && l.includes(url));
    expect(line, `${id}: a line that says canonical and gives ${url}`).toBeTruthy();
    for (const other of IDS.filter((i) => i !== id)) expect(line, `${id}: not ${other}'s URL`).not.toContain(`${SITE_URL}prompts/${other}.txt`);
  });

  it.each(IDS)("%s tells the reader to check the current version at llms.txt: a prompt has no semver of its own", (id) => {
    expect(prompt(id)).toContain(`${SITE_URL}llms.txt`);
    expect(prompt(id)).toMatch(/\bversion\b/i);
  });
});

/* ---- the other prompts, and the commands, in the body --------------------------------- */

describe("the general prompt lists the other four, for the person and not for the LLM", () => {
  const PHRASE = "for the person to paste instead of this one (do not follow them from here)";

  it("says so on a line, and lists the URLs of landing, blog, app and docs under it", () => {
    const lines = prompt("start").split("\n");
    const at = lines.findIndex((l) => l.includes(PHRASE));
    expect(at, `a line that says "${PHRASE}"`).toBeGreaterThan(-1);
    // the list under the line, up to the first blank line or the next heading
    const under = [];
    for (const line of lines.slice(at + 1)) {
      if (!line.trim() || line.startsWith("#")) break;
      under.push(line);
    }
    const listed = under.join("\n");
    for (const id of IDS.filter((i) => i !== "start")) expect(listed, `${id} under the line`).toContain(`${SITE_URL}prompts/${id}.txt`);
    expect(listed, "not the general prompt itself").not.toContain(`${SITE_URL}prompts/start.txt`);
  });

  it("lists the four URLs only there: none of them stands as a link to follow", () => {
    const lines = prompt("start").split("\n");
    const at = lines.findIndex((l) => l.includes(PHRASE));
    for (const id of IDS.filter((i) => i !== "start")) {
      const holders = lines.map((l, i) => [l, i]).filter(([l]) => l.includes(`${SITE_URL}prompts/${id}.txt`));
      expect(holders.length, `${id}: one line`).toBe(1);
      expect(holders[0][1], `${id} comes after the line that says not to follow it`).toBeGreaterThan(at);
    }
  });
});

describe("every prompt asks, in How we work, for the commands in the summary", () => {
  const section = (id) => {
    const text = prompt(id);
    const start = text.indexOf("## How we work");
    expect(start, `${id}: a "## How we work" section`).toBeGreaterThan(-1);
    const next = text.indexOf("\n## ", start + 1);
    return text.slice(start, next === -1 ? undefined : next);
  };

  it.each(IDS)("%s: the summary includes the commands it will run, the install and the check after each step, before the go", (id) => {
    const lines = section(id).split("\n");
    const item = lines.findIndex((l) => /\bsummary\b/i.test(l));
    expect(item, `${id}: a line about the summary`).toBeGreaterThan(-1);
    const text = lines.slice(item).join("\n");
    expect(text).toMatch(/\bcommands\b/i);
    expect(text).toMatch(/\binstall\b/i);
    expect(text).toContain("npx @luz-ds/check");
    expect(text).toMatch(/after each step/i);
    // they are asked for before the go
    expect(text.search(/\bcommands\b/i)).toBeLessThan(text.indexOf('"go"'));
  });
});

/* ---- the ceiling ----------------------------------------------------------------- */

describe("the ceiling of a prompt", () => {
  const row = () => json("budgets.json").budgets.find((b) => b.glob === "docs/prompts/**/*.txt");

  it("is one row of budgets.json, uncompressed, 16 KiB, and its row of PRINCIPLES.md section 8", () => {
    expect(row()).toMatchObject({ name: "prompts (each, uncompressed)", glob: "docs/prompts/**/*.txt", compression: "none", max: 16 * 1024 });
    expect(row().ideal).toBeLessThan(row().max);
    const principles = read("PRINCIPLES.md").split("\n");
    const cells = principles.find((l) => l.startsWith("|") && /prompts?\b[^|]*\(`docs\/prompts\/\*\*\/\*\.txt`\)|`docs\/prompts/.test(l));
    expect(cells, "a row of the table in PRINCIPLES.md section 8 that names docs/prompts").toBeTruthy();
    expect(cells.split("|").slice(1, -1).map((c) => c.trim()).at(-1)).toBe("16 kB");
  });

  it.each(IDS)("%s is at most that row's ceiling", (id) => {
    expect(Buffer.byteLength(prompt(id))).toBeLessThanOrEqual(row().max);
  });

  // The skeletons and the colour mode switcher are worth their bytes only if the prose stays short: a tighter number, just for this change (budgets.json keeps its row)
  it.each(IDS)("%s is at most 16100 bytes, so the skeletons did not eat the room the ceiling leaves", (id) => {
    expect(Buffer.byteLength(prompt(id))).toBeLessThanOrEqual(16100);
  });
});

/* ---- a placeholder the generator does not know ------------------------------------ */

describe("a placeholder the generator does not know fails with the file and the line", () => {
  /** A copy of the sources whose body has `lines` changed: { [1-based line to insert after]: text }. */
  function withBody(change) {
    const dir = copyOfSources();
    const file = join(dir, "apps/site/prompts/body.md");
    writeFileSync(file, change(readFileSync(file, "utf-8").split("\n")).join("\n"));
    return dir;
  }
  const messageOf = (fn) => {
    try {
      fn();
    } catch (error) {
      return error.message;
    }
    return "";
  };

  it("the unchanged copy assembles, so a failure below is the placeholder's", () => {
    const dir = copyOfSources();
    expect(assemble("start", { root: dir })).toBe(prompt("start"));
    expect(assemble("blog", { root: dir })).toBe(prompt("blog"));
  });

  it.each(["start", "landing"])("%s: an unknown {{nope}} on line 6 of body.md is body.md:6", (id) => {
    const dir = withBody((lines) => [...lines.slice(0, 5), "A line with {{nope}} in it.", ...lines.slice(5)]);
    const message = messageOf(() => assemble(id, { root: dir }));
    expect(message, "assemblePrompt throws").not.toBe("");
    expect(message).toContain("body.md:6");
    expect(message).toContain("nope");
  });

  it.each(["start", "landing", "docs"])("%s: the line is the line of body.md also when the placeholder comes after the preset", (id) => {
    let line;
    const dir = withBody((lines) => {
      const preset = lines.findIndex((l) => l.includes("{{preset}}"));
      expect(preset, "the body has a {{preset}} line").toBeGreaterThan(-1);
      const out = [...lines.slice(0, lines.length - 1), "Another line with {{nope}} in it.", lines.at(-1)];
      line = out.findIndex((l) => l.includes("{{nope}}")) + 1;
      return out;
    });
    const message = messageOf(() => assemble(id, { root: dir }));
    expect(message, "assemblePrompt throws").not.toBe("");
    expect(message).toContain(`body.md:${line}`);
  });

  it("an unknown placeholder in a preset names the preset", () => {
    const dir = copyOfSources();
    const file = join(dir, "apps/site/prompts/presets/landing.md");
    writeFileSync(file, `${readFileSync(file, "utf-8")}\nA line with {{nope}} in it.\n`);
    const message = messageOf(() => assemble("landing", { root: dir }));
    expect(message).toContain("landing.md");
    expect(message).toContain("nope");
    // the other kinds do not read that preset
    expect(() => assemble("blog", { root: dir })).not.toThrow();
  });

  it("an id that is not a prompt fails", () => {
    expect(messageOf(() => assemble("cms"))).not.toBe("");
  });
});

/* ---- served and listed ---------------------------------------------------------------- */

describe("the five are emitted by the build, served in dev and listed in llms.txt", () => {
  const plugin = (relative) => docsSite({ repoRoot: root, relative, outRoot: join(tmpdir(), "luz-prompts-out"), pagesBase: "/luz/", siteUrl: SITE_URL });

  it("promptFiles() maps each route to the text, made when asked for", () => {
    const files = member("promptFiles")({ root });
    expect([...files.keys()]).toEqual(IDS.map((id) => `/prompts/${id}.txt`));
    for (const id of IDS) expect(files.get(`/prompts/${id}.txt`)()).toBe(prompt(id));
  });

  it("the pages build writes prompts/<id>.txt at the root, as the text, with the site's links", () => {
    const emitted = [];
    plugin(true).generateBundle.call({ emitFile: (file) => emitted.push(file) });
    const byName = new Map(emitted.map((f) => [f.fileName, f]));
    for (const id of IDS) {
      const file = byName.get(`prompts/${id}.txt`);
      expect(file, `prompts/${id}.txt is emitted`).toBeTruthy();
      expect(file.type).toBe("asset");
      expect(file.source).toBe(prompt(id));
    }
  });

  it("the pages build writes the link to a prompt relative to its page, so it still leads to the text when the site is not at the root of its host", () => {
    // The home's opener and the docs' ones: a root-absolute /prompts/<id>.txt would be nandovejer.github.io/prompts/…, a 404
    const hook = plugin(true).transformIndexHtml.handler;
    for (const [file, route, up] of [
      ["apps/docs/pages/get-started/ai.html", "/docs/get-started/ai/", "../../../"],
      ["apps/docs/pages/kinds/landing.html", "/docs/kinds/landing/", "../../../"],
    ]) {
      const out = hook(readFileSync(join(root, file), "utf-8"), { filename: join(root, file) });
      expect(out, `${file} links no prompt from the root of the host`).not.toMatch(/href="\/prompts\//);
      const hrefs = [...out.matchAll(/href="([^"]*prompts\/[a-z]+\.txt)"/g)].map((m) => m[1]);
      expect(hrefs.length, `${route} links a prompt`).toBeGreaterThan(0);
      for (const href of hrefs) {
        expect(href.startsWith(`${up}prompts/`), `${href} is relative to ${route}`).toBe(true);
        expect(new URL(href, `https://example.org/luz${route}`).pathname).toMatch(/^\/luz\/prompts\/[a-z]+\.txt$/);
      }
    }
  });

  it("the dev server serves /prompts/<id>.txt as plain text, the same text as the build", async () => {
    const middlewares = [];
    plugin(false).configureServer({
      watcher: { on() {} },
      ws: { send() {} },
      middlewares: { use: (fn) => middlewares.push(fn) },
      transformIndexHtml: async (_file, html) => html,
    });
    const serve = (url) =>
      new Promise((resolve) => {
        const headers = {};
        const res = { statusCode: 200, setHeader: (k, v) => (headers[k.toLowerCase()] = v), end: (body) => resolve({ headers, body, statusCode: res.statusCode }) };
        middlewares[0]({ url, originalUrl: url }, res, () => resolve({ next: true }));
      });
    for (const id of IDS) {
      const served = await serve(`/prompts/${id}.txt`);
      expect(served.next, `/prompts/${id}.txt is answered by the plugin`).toBeUndefined();
      expect(served.headers["content-type"]).toMatch(/^text\/plain; charset=utf-8/);
      expect(served.body).toBe(prompt(id));
    }
  }, 60_000);

  describe("llms.txt", () => {
    const site = scanSite(join(root, "apps/docs"), root);
    const render = (siteUrl) => ai.renderLlmsTxt(site, { siteUrl });
    const sections = (text) => {
      const out = [];
      for (const line of text.split("\n")) {
        const h2 = /^## (.+)$/.exec(line);
        if (h2) out.push({ title: h2[1], items: [] });
        else if (out.length) {
          const item = /^- \[(.*)\]\(([^)\s]+)\): (.*)$/.exec(line);
          if (item) out.at(-1).items.push({ title: item[1], url: item[2], description: item[3] });
        }
      }
      return out;
    };

    it("lists the five under ## Prompts, with their absolute URLs, before ## Optional", () => {
      const parsed = sections(render(SITE_URL));
      const titles = parsed.map((s) => s.title);
      expect(titles.filter((t) => t === "Prompts")).toHaveLength(1);
      expect(titles.indexOf("Prompts")).toBeLessThan(titles.indexOf("Optional"));
      expect(titles.at(-1)).toBe("Optional");
      const listed = parsed.find((s) => s.title === "Prompts");
      expect(listed.items.map((i) => i.url)).toEqual(IDS.map((id) => `${SITE_URL}prompts/${id}.txt`));
      for (const item of listed.items) {
        expect(item.title.length, item.url).toBeGreaterThan(0);
        expect(item.description.length, item.url).toBeGreaterThan(0);
      }
    });

    it("lists them root-absolute in dev", () => {
      const listed = sections(render("")).find((s) => s.title === "Prompts");
      expect(listed.items.map((i) => i.url)).toEqual(IDS.map((id) => `/prompts/${id}.txt`));
    });
  });
});

/* ---- the hash of what a person reviews for a prompt ---------------------------------- */

describe("promptSourceHash: all the prose of a prompt, and nothing a release or a class adds", () => {
  const SRC = "apps/site/prompts";
  const MODULE_FILE = "scripts/docs-site/prompts.js";
  const KINDS_FILE = "scripts/docs-site/kinds.js";
  const filesOf = (id) => [`${SRC}/body.md`, ...(PRESET_OF[id] ? [`${SRC}/presets/${PRESET_OF[id]}.md`] : []), `${SRC}/stacks.json`, MODULE_FILE];
  /** Attribute names as an element line lists them: three or more that share a `data-luz-<group>-` prefix are one entry, `data-luz-<group>-*`, where the first of them stood. */
  const grouped = (names) => {
    const prefix = (name) => /^(data-luz-[a-z0-9]+-)/.exec(name)?.[1];
    const count = (key) => names.filter((n) => prefix(n) === key).length;
    const seen = new Set();
    return names.flatMap((name) => {
      const key = prefix(name);
      if (key === undefined || count(key) < 3) return [name];
      if (seen.has(key)) return [];
      seen.add(key);
      return [`${key}*`];
    });
  };
  /** The element lines as the prompt lists them: catalog's (core defines no tag since F7), `- `<tag>` (attr, attr): description`, joined by a newline. */
  const elementBlock = (dir) =>
    ["catalog"]
      .flatMap((pkg) =>
        JSON.parse(readFileSync(join(dir, `packages/${pkg}/dist/custom-elements.json`), "utf-8")).modules.flatMap((m) =>
          (m.declarations ?? [])
            .filter((d) => d.tagName)
            .map((d) => {
              const attrs = grouped((d.attributes ?? []).map((a) => a.name));
              // Catalog has no bundle (F5a): an element of catalog says the file of its stylesheet
              const sheet = pkg === "catalog" && d.stylesheet ? ` Its stylesheet: \`@luz-ds/catalog/${d.stylesheet}\`.` : "";
              return `- \`<${d.tagName}>\`${attrs.length ? ` (${attrs.join(", ")})` : ""}: ${d.description ?? ""}${sheet}`.trimEnd();
            }),
        ),
      )
      .join("\n");
  /** One line per catalog page that has `fits-kinds`, in the order of the pages: `<slug>|<kinds>|<files>|<order>`, read from the front matter. */
  const patternBlock = (dir) => {
    const folder = join(dir, "apps/docs/pages/catalog");
    return readdirSync(folder)
      .filter((f) => f.endsWith(".html") && !f.startsWith("_"))
      .sort()
      .flatMap((name) => {
        const head = /^<!-- luz:page\n([\s\S]*?)\n-->/.exec(readFileSync(join(folder, name), "utf-8"))?.[1] ?? "";
        const key = (k) => new RegExp(`^${k}: (.*)$`, "m").exec(head)?.[1].trim();
        if (!key("fits-kinds")) return [];
        const kinds = key("fits-kinds").split(",").map((k) => k.trim());
        const files = (key("files") ?? "").split(/[;,]/).map((f) => f.trim());
        return [{ line: `${name.slice(0, -5)}|${kinds.join(",")}|${files.join(",")}|${Number(key("order") ?? 0)}`, order: Number(key("order") ?? 0) }];
      })
      .sort((a, b) => a.order - b.order)
      .map((page) => page.line)
      .join("\n");
  };
  const sha = (dir, id) => {
    const hash = createHash("sha256");
    for (const file of [...filesOf(id), KINDS_FILE]) hash.update(readFileSync(join(dir, file))).update("\0");
    hash.update(elementBlock(dir)).update("\0");
    hash.update(patternBlock(dir)).update("\0");
    return hash.digest("hex");
  };
  const hashes = (dir) => Object.fromEntries(IDS.map((id) => [id, member("promptSourceHash")(id, { root: dir })]));
  const append = (dir, path, text) => writeFileSync(join(dir, path), readFileSync(join(dir, path), "utf-8") + text);
  const expectAllFiveChanged = (before, after, why) => {
    for (const id of IDS) expect(after[id], `${id} after ${why}`).not.toBe(before[id]);
  };

  /** A copy whose packages/catalog/dist/custom-elements.json is its own file, everything else of the packages linked. */
  function withOwnElements(dir) {
    rmSync(join(dir, "packages"));
    mkdirSync(join(dir, "packages/catalog/dist"), { recursive: true });
    for (const pkg of readdirSync(join(root, "packages"))) {
      if (pkg === "catalog") continue;
      symlinkSync(join(root, "packages", pkg), join(dir, "packages", pkg));
    }
    for (const entry of readdirSync(join(root, "packages/catalog"))) {
      if (entry !== "dist") symlinkSync(join(root, "packages/catalog", entry), join(dir, "packages/catalog", entry));
    }
    for (const entry of readdirSync(join(root, "packages/catalog/dist"))) {
      if (entry !== "custom-elements.json") symlinkSync(join(root, "packages/catalog/dist", entry), join(dir, "packages/catalog/dist", entry));
    }
    cpSync(join(root, "packages/catalog/dist/custom-elements.json"), join(dir, "packages/catalog/dist/custom-elements.json"));
    return join(dir, "packages/catalog/dist/custom-elements.json");
  }

  it("is the hex SHA-256 of body.md, the preset (none for start), stacks.json, prompts.js, kinds.js, the element lines of the prompt and the fits-kinds, files and order of each catalog page, each followed by a NUL byte", () => {
    for (const id of IDS) {
      const hash = member("promptSourceHash")(id, { root });
      expect(hash, id).toMatch(/^[0-9a-f]{64}$/);
      expect(hash, id).toBe(sha(root, id));
    }
    expect(new Set(IDS.map((id) => member("promptSourceHash")(id, { root }))).size, "five different hashes").toBe(5);
  });

  it("hashes the element lines exactly as the prompt lists them under ## Elements you may use", () => {
    const text = prompt("start");
    const start = text.indexOf("## Elements you may use\n\n") + "## Elements you may use\n\n".length;
    expect(start, "the prompt has the section").toBeGreaterThan("## Elements you may use\n\n".length - 1);
    const section = text.slice(start).split(/\n\n## /)[0];
    expect(section).toBe(elementBlock(root));
  });

  it("throws for a kind that is not a prompt", () => {
    expect(() => member("promptSourceHash")("nope", { root })).toThrow(/nope/);
  });

  it("ignores what a release or a class adds: another version or another classes.json gives the same hash", () => {
    const dir = copyOfSources();
    const before = hashes(dir);
    // Only the element manifests are read: keep the real ones, change the version and the classes
    const packagesCopy = join(dir, "packages-copy");
    for (const pkg of ["core", "catalog"]) {
      mkdirSync(join(packagesCopy, pkg, "dist"), { recursive: true });
      // core ships no custom-elements.json since F7: the hash reads catalog's only, and must not need core's
      if (pkg === "catalog") cpSync(join(root, "packages", pkg, "dist/custom-elements.json"), join(packagesCopy, pkg, "dist/custom-elements.json"));
      writeFileSync(join(packagesCopy, pkg, "package.json"), JSON.stringify({ name: `@luz-ds/${pkg}`, version: "9.9.9" }));
      writeFileSync(join(packagesCopy, pkg, "dist/classes.json"), JSON.stringify({ classes: [{ name: "luz-new" }] }));
    }
    rmSync(join(dir, "packages"));
    cpSync(packagesCopy, join(dir, "packages"), { recursive: true });
    expect(hashes(dir)).toEqual(before);
  });

  it("changes only the hash of the kind whose preset changed by one byte", () => {
    const dir = copyOfSources();
    const before = hashes(dir);
    append(dir, `${SRC}/presets/app.md`, "x");
    const after = hashes(dir);
    for (const id of IDS) {
      if (id === "app") expect(after[id], "app changed").not.toBe(before[id]);
      else expect(after[id], `${id} did not change`).toBe(before[id]);
    }
  });

  it("changes all five when body.md changes, and all five when stacks.json changes", () => {
    for (const file of ["body.md", "stacks.json"]) {
      const dir = copyOfSources();
      const before = hashes(dir);
      append(dir, `${SRC}/${file}`, " ");
      expectAllFiveChanged(before, hashes(dir), `a change of ${file}`);
    }
  });

  it("lists the attributes of an element grouped by prefix: three or more `data-luz-<group>-…` are one `data-luz-<group>-*`, two stay as they are, the tag and the description do not change", () => {
    const dir = copyOfSources();
    const manifest = withOwnElements(dir);
    const data = JSON.parse(readFileSync(manifest, "utf-8"));
    const declaration = data.modules.flatMap((m) => m.declarations ?? []).find((d) => d.tagName && d.description);
    const names = ["remember", "data-luz-pair-a", "data-luz-pair-b", "data-luz-trio-a", "data-luz-trio-b", "data-luz-trio-c", "data-luz-trio-d"];
    declaration.attributes = names.map((name) => ({ name }));
    writeFileSync(manifest, JSON.stringify(data, null, 2));
    const text = member("assemblePrompt")("start", { root: dir });
    const line = text.split("\n").find((l) => l.startsWith(`- \`<${declaration.tagName}>\``));
    expect(line, `<${declaration.tagName}> is listed`).toBeTruthy();
    expect(line.startsWith(`- \`<${declaration.tagName}>\` (remember, data-luz-pair-a, data-luz-pair-b, data-luz-trio-*): ${declaration.description}`), line).toBe(true);
    expect(line).not.toContain("data-luz-trio-a");
  });

  it("changes all five when the description of an element changes in custom-elements.json", () => {
    const dir = copyOfSources();
    const manifest = withOwnElements(dir);
    const before = hashes(dir);
    const data = JSON.parse(readFileSync(manifest, "utf-8"));
    const declaration = data.modules.flatMap((m) => m.declarations ?? []).find((d) => d.tagName && d.description);
    expect(declaration, "an element of catalog has a description").toBeTruthy();
    declaration.description += " Then do something else.";
    writeFileSync(manifest, JSON.stringify(data, null, 2));
    expectAllFiveChanged(before, hashes(dir), `a change of the description of <${declaration.tagName}>`);
  });

  it("changes all five when one byte of scripts/docs-site/kinds.js changes (it picks the files and pages a prompt lists)", () => {
    const dir = copyOfSources();
    cpSync(join(root, "scripts/docs-site/kinds.js"), join(dir, "scripts/docs-site/kinds.js"));
    const before = hashes(dir);
    append(dir, "scripts/docs-site/kinds.js", "\n// x\n");
    expectAllFiveChanged(before, hashes(dir), "a comment appended to kinds.js");
  });

  it.each([
    ["fits-kinds", "apps/docs/pages/catalog/doc-header.html", /^fits-kinds: docs$/m, "fits-kinds: docs, app"],
    ["files", "apps/docs/pages/catalog/doc-header.html", /^files: components\/doc-header\.css$/m, "files: components/doc-header.css, components/other.css"],
  ])("changes all five when the %s line of the front matter of a catalog page changes", (line, page, pattern, replacement) => {
    const dir = copyOfSources();
    const before = hashes(dir);
    const text = readFileSync(join(dir, page), "utf-8");
    expect(pattern.test(text), `${page} has the ${line} line this test edits`).toBe(true);
    writeFileSync(join(dir, page), text.replace(pattern, replacement));
    expectAllFiveChanged(before, hashes(dir), `a change of ${line} in ${page}`);
  });

  it("leaves all five unchanged when only the body of a catalog page changes, its front matter intact", () => {
    const dir = copyOfSources();
    const before = hashes(dir);
    append(dir, "apps/docs/pages/catalog/doc-header.html", "\n<p>One more paragraph in the body.</p>\n");
    const text = readFileSync(join(dir, "apps/docs/pages/catalog/doc-header.html"), "utf-8");
    writeFileSync(join(dir, "apps/docs/pages/catalog/doc-header.html"), text.replace("<h2 id=\"example\">Example</h2>", "<h2 id=\"example\">Another example title</h2>"));
    expect(hashes(dir)).toEqual(before);
  });

  it("is deterministic: the same files give the same hash, call after call", () => {
    const dir = copyOfSources();
    cpSync(join(root, "scripts/docs-site/kinds.js"), join(dir, "scripts/docs-site/kinds.js"));
    expect(hashes(dir)).toEqual(hashes(dir));
  });

  it("changes all five when one byte of scripts/docs-site/prompts.js changes (a comment line, the copy still imports)", async () => {
    const dir = copyOfSources();
    cpSync(join(root, "scripts"), join(dir, "scripts"), { recursive: true, force: true });
    cpSync(join(root, "package.json"), join(dir, "package.json"));
    symlinkSync(join(root, "node_modules"), join(dir, "node_modules"));
    const before = hashes(dir);
    append(dir, MODULE_FILE, "\n// x\n");
    const copy = await import(/* @vite-ignore */ `${join(dir, MODULE_FILE)}?changed`);
    const after = Object.fromEntries(IDS.map((id) => [id, copy.promptSourceHash(id, { root: dir })]));
    expectAllFiveChanged(before, after, "a comment appended to prompts.js");
    expectAllFiveChanged(before, hashes(dir), "a comment appended to prompts.js, read by the real module");
  });
});
