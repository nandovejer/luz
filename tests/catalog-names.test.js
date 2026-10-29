/**
 * F8 of .claude/plans/ai-and-catalog-only.md, "Los nombres de catalog" (decisions 65 to 69, 72 and 74): every component of
 * @luz-ds/catalog is named for what it is, with no kind of site in the name. The red list of the phase, as a test:
 *
 *   - classes.json and custom-elements.json of catalog have the new names and none of the old, and no
 *     `luz-landing-*`, `luz-cms-*`, `luz-app-*` or `luz-docs-*` but the kept `luz-docs-layout`, `luz-docs-main`, `luz-docs-nav`
 *   - `components/<block>.css` and its `.min.css` exist for every new block, the old files do not
 *   - the exports `./theme-time` and `./cookie-consent` exist, `./mode`, `./consent` and `./color-mode` (F8's name, taken out by the
 *     theme-mode plan, 2026-10-29) do not; the loader, its chunks and the files of dist follow
 *   - what does not change, does not: `getConsent()`, the `data-luz-consent*` attributes, `--luz-consent-h`, the `luz-consent`
 *     key of localStorage and the `luz:consent` event
 *   - the changeset names catalog and check, and its tables have every old name
 *
 * The pages (/docs/catalog/<block>/, en and es, the unions, `fits-kinds`) are in tests/catalog-patterns.test.js; the CSS of each
 * block in tests/catalog-patterns-css.test.js; the sizes in tests/size-guard.test.js; the prompts in tests/prompts.test.js;
 * the rule that tells a project the new name in tests/check-rules-renamed.test.js. The names are typed once, in
 * tests/helpers/catalog-names.js.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CHUNKS, CHUNK_NOW, CLASSES, DOCS_KEPT, ELEMENTS, FILES, LAYOUT, OLD_PAGES, PATTERNS, PROPERTIES, TAGS, THEME_MODE } from "./helpers/catalog-names.js";
import { releaseNotes } from "./helpers/release-notes.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(`${root}${path}`, "utf-8");
const exists = (path) => existsSync(`${root}${path}`);
const json = (path) => JSON.parse(read(path));

const classes = json("packages/catalog/dist/classes.json");
const elements = json("packages/catalog/dist/custom-elements.json");
const manifest = json("packages/catalog/package.json");
const declarations = elements.modules.flatMap((m) => m.declarations ?? []);

/* ---- classes.json -------------------------------------------------------------------------------- */

describe("classes.json of catalog has the new names and none of the old", () => {
  const names = classes.classes.map((c) => c.name);
  const blocks = new Set(classes.classes.map((c) => c.block).filter(Boolean));

  it.each([...new Set(CLASSES.map(([, now]) => now))])("has .%s, defined, in luz.catalog", (name) => {
    const own = classes.classes.filter((c) => c.block === name);
    expect(own.length, name).toBeGreaterThan(0);
    expect(own.find((c) => c.name === name), name).toMatchObject({ layer: "luz.catalog", defined: true });
  });

  it.each(CLASSES.map(([old]) => old))("has no .%s, nor a part or a modifier of it", (old) => {
    // `luz-consent` is an old block, but `luz-consent-h` is no class: the manifest lists classes only
    expect(names.filter((name) => name === old || name.startsWith(`${old}__`) || name.startsWith(`${old}--`)), old).toEqual([]);
    expect(blocks.has(old), `block ${old}`).toBe(false);
  });

  it("has no class named for a kind of site, but luz-app-bar and the docs layout (luz-docs-layout, luz-docs-main, luz-docs-nav)", () => {
    const kept = new Set(DOCS_KEPT);
    const stale = classes.classes
      .filter((c) => /^luz-(?:landing|cms|app|docs)-/.test(c.name))
      .filter((c) => !kept.has(c.block ?? c.name) && c.block !== "luz-app-bar" && !c.name.startsWith("luz-app-bar"))
      .map((c) => c.name);
    expect(stale).toEqual([]);
    // the three that stay do exist
    for (const name of DOCS_KEPT) expect(blocks.has(name), name).toBe(true);
  });

  it("names, in the files it lists for a class, only files that exist now: no class points at a file of before F8", () => {
    const files = new Set(classes.classes.flatMap((c) => c.files));
    const old = FILES.map(([name]) => `components/${name}.css`);
    expect([...files].filter((file) => old.includes(file))).toEqual([]);
    for (const file of files) expect(exists(`packages/catalog/dist/${file}`), file).toBe(true);
  });

  it("has the properties under their new names, and none under the old", () => {
    const properties = classes.properties.map((p) => p.name);
    for (const [old, now] of PROPERTIES) {
      expect(properties, `${old} is gone`).not.toContain(old);
      // a knob a consumer sets and the stylesheets only read (--luz-glow-x, --luz-title-accent, --luz-example-w) is not declared: it is in no list
      if (!["--luz-glow-x", "--luz-title-accent", "--luz-example-w"].includes(now)) expect(properties, `${now} is there`).toContain(now);
    }
    expect(properties.filter((name) => /^--luz-(?:landing|cms|app)-/.test(name))).toEqual([]);
  });

  it("keeps the hooks it had: the data-luz-consent* attributes and the rest do not change", () => {
    for (const hook of ["data-luz-consent", "data-luz-consent-ask", "data-luz-consent-close", "data-luz-consent-days", "data-luz-consent-done", "data-luz-consent-key", "data-luz-consent-open", "data-luz-search-src", "data-luz-spy"]) {
      expect(classes.hooks, hook).toContain(hook);
    }
    expect(classes.hooks.filter((hook) => /cookie-consent/.test(hook)), "no hook was renamed with the element").toEqual([]);
  });

  it("has none of core's old switcher classes (luz-mode-switcher, luz-mode-btn, luz-mode-cycle): they are gone with no alias, and core's luz-theme-mode__* are not catalog's", () => {
    const core = json("packages/core/dist/classes.json").classes.map((c) => c.name);
    for (const [old, now] of THEME_MODE.classes) {
      expect(core, `core has no ${old}`).not.toContain(old);
      expect(core.some((name) => name === now || name.startsWith(`${now}`)), `core has ${now}`).toBe(true);
    }
    // catalog's stylesheets may name them (the time refines the mode), but never define one
    expect(classes.classes.filter((c) => c.defined && /^luz-(?:mode|theme-mode)(?:-|_|$)/.test(c.name)).map((c) => c.name), "catalog defines none of them").toEqual([]);
  });
});

/* ---- custom-elements.json ------------------------------------------------------------------------ */

describe("custom-elements.json of catalog has the new elements and none of the old", () => {
  const tags = declarations.map((d) => d.tagName).sort();

  it("holds the eight tags: search, cookie consent, theme time, language switch, submenu, announcement, the FAQ and the timeline", () => {
    expect(tags).toEqual(["luz-announcement", "luz-cookie-consent", "luz-faq", "luz-lang-switch", "luz-search", "luz-submenu", "luz-theme-time", "luz-timeline"]);
    expect(tags).not.toContain("luz-color-mode");
  });

  it.each(THEME_MODE.tags.map(([old]) => old))("has no <%s>: taken out with no alias by the theme-mode plan", (old) => {
    expect(tags).not.toContain(old);
    expect(JSON.stringify(elements)).not.toContain(old);
  });

  it.each(TAGS.map(([old]) => old))("has no <%s>", (old) => {
    expect(tags).not.toContain(old);
    expect(JSON.stringify(elements), `no mention of ${old} as a tag`).not.toContain(`"tagName":"${old}"`);
  });

  it.each(ELEMENTS.filter((e) => e.name !== "search"))("<$tag> names its stylesheet components/$css.css, and that file exists", ({ tag, css }) => {
    const declaration = declarations.find((d) => d.tagName === tag);
    expect(declaration, tag).toBeTruthy();
    expect(declaration.stylesheet).toBe(`components/${css}.css`);
    expect(exists(`packages/catalog/dist/components/${css}.css`)).toBe(true);
  });

  it("the module of each element is the file of its script or of its stylesheet: theme-time.js, cookie-consent.js and components/announcement.css", () => {
    const pathOf = (tag) => elements.modules.find((m) => m.declarations?.some((d) => d.tagName === tag)).path;
    expect(pathOf("luz-theme-time")).toBe("theme-time.js");
    expect(pathOf("luz-cookie-consent")).toBe("cookie-consent.js");
    expect(pathOf("luz-announcement")).toBe("components/announcement.css");
    expect(elements.modules.map((m) => m.path).filter((path) => /(?:^|\/)(?:mode|color-mode|consent|banner)\.(?:js|css)$/.test(path))).toEqual([]);
  });

  it("the event of the time of day is luz-theme-time:change; the cookie consent keeps luz:consent", () => {
    const events = (tag) => (declarations.find((d) => d.tagName === tag).events ?? []).map((e) => e.name);
    expect(events("luz-theme-time")).toEqual(["luz-theme-time:change"]);
    expect(events("luz-cookie-consent")).toEqual(["luz:consent"]);
    expect(JSON.stringify(elements)).not.toContain("luz-mode:change");
    expect(JSON.stringify(elements)).not.toContain("luz-color-mode:change");
  });

  it("the classes of the cookie consent are .luz-cookie-consent and its parts (the element and its class are one block)", () => {
    const own = classes.classes.filter((c) => c.block === "luz-cookie-consent").map((c) => c.name);
    expect(own).toEqual(expect.arrayContaining(["luz-cookie-consent", "luz-cookie-consent__title", "luz-cookie-consent__choices"]));
  });
});

/* ---- files ----------------------------------------------------------------------------------------- */

describe("components/<block>.css and its .min.css exist for every new block, and the old files do not", () => {
  const NEW = [...PATTERNS, ...LAYOUT, ...ELEMENTS.map((e) => e.css)];

  it.each(NEW)("components/%s.css has its source, its built file and its minified file", (name) => {
    expect(exists(`packages/catalog/src/components/${name}.css`), `src/components/${name}.css`).toBe(true);
    expect(exists(`packages/catalog/dist/components/${name}.css`), `dist/components/${name}.css`).toBe(true);
    expect(exists(`packages/catalog/dist/components/${name}.min.css`), `dist/components/${name}.min.css`).toBe(true);
  });

  it("holds exactly the 31 components of the catalog: the 20 patterns, the four of F7 and the seven elements (theme-time is the color mode's successor), plain and minified", () => {
    const built = readdirSync(`${root}packages/catalog/dist/components`).filter((f) => f.endsWith(".css") && !f.endsWith(".min.css")).map((f) => f.replace(/\.css$/, "")).sort();
    expect(built).toEqual([...new Set(NEW)].sort());
    expect(built).toHaveLength(31);
  });

  it.each(FILES.map(([old]) => old))("components/%s.css is gone, in src, dist and the tarball list", (old) => {
    for (const file of [`src/components/${old}.css`, `dist/components/${old}.css`, `dist/components/${old}.min.css`]) expect(exists(`packages/catalog/${file}`), file).toBe(false);
    const packed = read("packages/catalog/pack-files.txt").split("\n");
    expect(packed).not.toContain(`dist/components/${old}.css`);
    expect(packed).not.toContain(`dist/components/${old}.min.css`);
  });

  it.each(CHUNKS)("the chunk %s.js is gone (and F8's %s.js with it): the one that is there is the successor, plain and minified, with a source", (old, f8) => {
    const current = CHUNK_NOW[old];
    for (const file of [`src/${old}.js`, `dist/${old}.js`, `dist/${old}.min.js`]) expect(exists(`packages/catalog/${file}`), file).toBe(false);
    if (current !== f8) for (const file of [`src/${f8}.js`, `dist/${f8}.js`, `dist/${f8}.min.js`]) expect(exists(`packages/catalog/${file}`), file).toBe(false);
    for (const file of [`src/${current}.js`, `dist/${current}.js`, `dist/${current}.min.js`]) expect(exists(`packages/catalog/${file}`), file).toBe(true);
    const packed = read("packages/catalog/pack-files.txt").split("\n");
    expect(packed).toContain(`dist/${current}.js`);
    expect(packed).toContain(`dist/${current}.min.js`);
    expect(packed).not.toContain(`dist/${old}.js`);
  });
});

/* ---- exports, the loader --------------------------------------------------------------------------- */

describe("the exports, the loader and the scripts follow the elements", () => {
  it("exports ./theme-time and ./cookie-consent, and not ./mode, ./color-mode or ./consent", () => {
    expect(manifest.exports["./theme-time"]).toBe("./dist/theme-time.js");
    expect(manifest.exports).not.toHaveProperty("./color-mode");
    expect(manifest.exports["./cookie-consent"]).toBe("./dist/cookie-consent.js");
    expect(manifest.exports).not.toHaveProperty("./mode");
    expect(manifest.exports).not.toHaveProperty("./consent");
    for (const key of ["./search", "./sidebar", "./timeline"]) expect(manifest.exports, key).toHaveProperty(key);
  });

  it("lists the two scripts, plain and minified, as having side effects, and not the old ones", () => {
    for (const file of ["./dist/theme-time.js", "./dist/theme-time.min.js", "./dist/cookie-consent.js", "./dist/cookie-consent.min.js"]) expect(manifest.sideEffects, file).toContain(file);
    expect(manifest.sideEffects.filter((file) => /\/(?:mode|color-mode|consent)(?:\.min)?\.js$/.test(file))).toEqual([]);
  });

  it("the loader maps each element to its chunk by a literal import: luz-cookie-consent to ./cookie-consent.js and luz-theme-time to ./theme-time.js", () => {
    const loader = read("packages/catalog/src/catalog.js").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(loader).toMatch(/["']luz-cookie-consent["']\s*:\s*\(\)\s*=>\s*import\(\s*["']\.\/cookie-consent\.js["']\s*\)/);
    expect(loader).toMatch(/["']luz-theme-time["']\s*:\s*\(\)\s*=>\s*import\(\s*["']\.\/theme-time\.js["']\s*\)/);
    expect(loader).not.toMatch(/["']luz-(?:consent|mode|color-mode)["']/);
    expect(loader).not.toMatch(/import\(\s*["']\.\/(?:consent|mode|color-mode)\.js["']\s*\)/);
  });

  it("the built loader imports the minified chunks by their new names, and the two chunks define the new tags", () => {
    const loader = read("packages/catalog/dist/catalog.min.js");
    expect(loader).toContain("./cookie-consent.min.js");
    expect(loader).toContain("./theme-time.min.js");
    expect(loader).not.toMatch(/\.\/(?:consent|mode|color-mode)\.min\.js/);
    expect(read("packages/catalog/dist/cookie-consent.min.js")).toContain("luz-cookie-consent");
    expect(read("packages/catalog/dist/theme-time.min.js")).toContain("luz-theme-time");
  });

  it("the cookie consent keeps its public face: getConsent(), the storage key luz-consent, the event luz:consent and --luz-consent-h", () => {
    const source = read("packages/catalog/src/cookie-consent.js");
    expect(source).toMatch(/export\s+function\s+getConsent\b/);
    expect(source).toContain('"luz-consent"');
    expect(source).toContain("luz:consent");
    expect(source).toContain("--luz-consent-h");
    expect(read("packages/catalog/src/components/cookie-consent.css")).toContain("--luz-consent-h");
    expect(source, "the element is the new tag").toMatch(/customElements\.define\(\s*["']luz-cookie-consent["']/);
  });

  it("the time of day dispatches luz-theme-time:change, and the pages and scripts that listen use the new events (never luz-mode:change or luz-color-mode:change)", () => {
    expect(read("packages/catalog/src/theme-time.js")).toContain("luz-theme-time:change");
    for (const file of ["apps/landing/landing.js", "apps/landing/light/light.js"]) {
      expect(read(file), file).not.toContain("luz-mode:change");
      expect(read(file), file).not.toContain("luz-color-mode:change");
    }
  });
});

/* ---- the changeset ---------------------------------------------------------------------------------- */

describe("the migration changeset of F8 (decisions 69 and 74)", () => {
  const notes = releaseNotes(root);
  const minor = (note, name) => note.bumps.some((b) => b.name === `@luz-ds/${name}` && b.level === "minor");
  const note = notes.find((n) => /`\.luz-landing-hero` \| `\.luz-hero`/.test(n.text));

  it("exists, is a minor of catalog and of check, and is no bump of a package of a kind", () => {
    expect(note, "a changeset with the table of classes").toBeTruthy();
    expect(minor(note, "catalog")).toBe(true);
    expect(minor(note, "check")).toBe(true);
    for (const name of ["landing", "cms", "app", "docs"]) expect(note.bumps.some((b) => b.name === `@luz-ds/${name}`), name).toBe(false);
  });

  it("says the change is breaking, that there are no aliases, and that luz-check gives the new name", () => {
    expect(note.text).toMatch(/\*\*Breaking:\*\*/);
    expect(note.text).toMatch(/no aliases/i);
    expect(note.text).toMatch(/luz-check/);
  });

  it.each(CLASSES)("table 1 maps the class %s to %s", (old, now) => {
    const rows = note.text.split("\n").filter((line) => line.startsWith("|") && line.includes(`\`.${old}\``));
    expect(rows.length, `a row with .${old}`).toBeGreaterThan(0);
    expect(rows.some((row) => row.includes(`\`.${now}`)), `${old} -> ${now}`).toBe(true);
  });

  it.each(TAGS)("table 2 maps the element <%s> to <%s>", (old, now) => {
    const rows = note.text.split("\n").filter((line) => line.startsWith("|") && line.includes(`\`<${old}>\``));
    expect(rows.some((row) => row.includes(`\`<${now}>`)), `${old} -> ${now}`).toBe(true);
  });

  it.each(CHUNKS)("table 2 maps the subpath @luz-ds/catalog/%s to @luz-ds/catalog/%s, and the file and the event follow", (old, now) => {
    expect(note.text).toMatch(new RegExp(`\`@luz-ds/catalog/${old}\`\\s*\\|\\s*\`@luz-ds/catalog/${now}\``));
    expect(note.text).toContain(`dist/${old}.js`);
    expect(note.text).toContain(`dist/${now}.js`);
  });

  it("maps the event luz-mode:change to luz-color-mode:change", () => {
    expect(note.text).toMatch(/luz-mode:change`\s*\|\s*`luz-color-mode:change`|event `luz-mode:change`[^|]*\|\s*`luz-color-mode:change`/);
  });

  it.each(FILES)("table 3 names the stylesheet %s.css, and the one that replaces it", (old, now) => {
    const rows = note.text.split("\n").filter((line) => line.startsWith("|") && line.includes(`${old}.css`));
    expect(rows.length, `a row with ${old}.css`).toBeGreaterThan(0);
    expect(rows.some((row) => row.includes(`${now}.css`)), `${old}.css -> ${now}.css`).toBe(true);
  });

  it.each(PROPERTIES)("table 4 maps the custom property %s to %s", (old, now) => {
    const rows = note.text.split("\n").filter((line) => line.startsWith("|") && line.includes(`\`${old}`));
    expect(rows.some((row) => row.includes(`\`${now}`)), `${old} -> ${now}`).toBe(true);
  });

  it("says the two unions: luz-site-header with --publication for a blog, luz-masthead as a block of its own, luz-site-footer for both footers", () => {
    expect(note.text).toContain("luz-site-header--publication");
    expect(note.text).toMatch(/`\.luz-masthead`[^\n]*(?:not a modifier|own)|not a modifier of the bar/);
    expect(note.text).toMatch(/__top[\s\S]*__date[\s\S]*__brand[\s\S]*__sections[\s\S]*__actions|__top`, `__brand`, `__date`, `__sections` and `__actions`/);
    expect(note.text).toMatch(/luz-site-footer[^\n]*(?:replaces|union)/);
  });

  it("says what does not change: getConsent(), the luz-theme and luz-consent keys, data-luz-consent*, --luz-consent-h, the event luz:consent", () => {
    for (const kept of ["getConsent()", "luz-theme", "luz-consent", "data-luz-consent", "--luz-consent-h", "luz:consent"]) expect(note.text, kept).toContain(kept);
  });

  it("says the route of every old page, and that there are no redirects", () => {
    expect(note.text).toMatch(/no redirects/i);
    for (const slug of OLD_PAGES) expect(note.text, `/docs/catalog/${slug}/`).toContain(`${slug}/`);
  });
});
