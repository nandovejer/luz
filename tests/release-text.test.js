/**
 * F3 step 15, rules and release text (.claude/plans/specs/f3-package-model.md,
 * §7 the AGENTS.md rule, §8 the migration notes, §9 step 15). The files are read
 * as text; no browser, no build.
 *
 *   - AGENTS.md and PRINCIPLES.md §6 say the same thing: since F7 (plan ai-and-catalog-only,
 *     decision 35) catalog is the navigation of the site and the pieces with JS or an
 *     identity of their own, and core is everything else (it was "what can go in any
 *     section"); since F5b (plan ai-and-catalog-only) the patterns of a kind of
 *     site (page structure included) are catalog's too, one file each, and there is
 *     no package for a kind of site
 *   - site's README says it too, and says the consent band is fixed at the bottom
 *   - VERSIONING.md does not list a class family that no longer ships
 *   - the changesets of F3 together carry the old -> new table of §8
 *   - the home page's "next" lists, in the three catalogs, have the same keys and
 *     no longer sell a feature grid that became a template
 *
 * Already true when this file was written (so no case here): the structure
 * page's table of parts, VERSIONING.md's layer list with `luz.app`, the four
 * package READMEs naming no `luz-site-*` block and stating the optional site
 * peer, the accessibility statement's no-JS states of search and consent, its
 * Ctrl+K before load and its consent band, and no screen reader named as tested.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { releaseNotes } from "./helpers/release-notes.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(`${root}${path}`, "utf-8");
/** The text between a heading line and the next line that starts with `until`. */
const between = (text, from, until) => {
  const start = text.indexOf(from);
  expect(start, `"${from}" is in the file`).toBeGreaterThanOrEqual(0);
  const rest = text.slice(start + from.length);
  const end = rest.search(until);
  return end === -1 ? rest : rest.slice(0, end);
};

/* ---- The rule, in AGENTS.md and PRINCIPLES.md §6 ---------------------------- */

describe("the core / site rule (spec §7)", () => {
  const layering = between(read("AGENTS.md"), "## Package layering", /\n---\n/);

  it("AGENTS.md's package layering says catalog is the navigation of the site and the pieces with JS or an identity of their own, and core everything else (F7)", () => {
    expect(layering).toMatch(/catalog is the navigation of the site and the pieces with JS or an identity of their own; core, everything else/i);
    expect(layering).not.toMatch(/catalog is what can go in any section/i);
  });

  it("AGENTS.md puts the navbar, the sidebar, the terminal and the timeline in catalog, and says core names nothing of catalog (F7)", () => {
    for (const name of ["navbar", "sidebar", "terminal", "timeline"]) expect(layering, name).toContain(name);
    expect(layering).toMatch(/core names nothing of catalog/i);
    // the layout of core no longer lists the navbar
    expect(layering).not.toMatch(/including the layout every page needs \([^)]*navbar/);
  });

  it("AGENTS.md no longer sorts site by the data it needs or the page structure it holds", () => {
    expect(layering).not.toMatch(/needs data of the site/);
    expect(layering).not.toMatch(/page structure that holds other pieces/);
  });

  it("AGENTS.md says there are no packages for one kind of site: landing, cms, app and docs were four, and their patterns are catalog components", () => {
    expect(layering).toMatch(/There are no packages for one kind of site/);
    for (const kind of ["landing", "cms", "app", "docs"]) expect(layering, kind).toContain(kind);
    expect(layering).toMatch(/catalog components now/i);
  });

  it("AGENTS.md says the patterns of a kind of site are catalog too, one file each, `components/<kind>-<name>.css` and the class `.luz-<kind>-<name>`, composed from core's objects", () => {
    expect(layering).toMatch(/patterns of a kind of site are catalog too, one file each/i);
    expect(layering).toContain("`components/<kind>-<name>.css`");
    expect(layering).toContain("`.luz-<kind>-<name>`");
    expect(layering).toMatch(/composed in the markup from core's objects/);
    expect(layering).toMatch(/page says which kind of site it fits/i);
  });

  it('AGENTS.md says how to add a pattern: one file of catalog, its page, its line in KIND_PATTERNS of kinds.js; and no recipe of a package for a kind', () => {
    expect(layering).toMatch(/To add a pattern of a kind of site: one file in `packages\/catalog\/src\/components\/<kind>-<name>\.css`/);
    expect(layering).toContain("apps/docs/pages/catalog/<kind>-<name>.html");
    expect(layering).toContain("`KIND_PATTERNS` of `scripts/docs-site/kinds.js`");
    expect(layering).not.toMatch(/peerDependenciesMeta[^\n]*optional/);
    expect(layering).not.toMatch(/SITE_KINDS|`<name>:build`|scripts\/build-<name>\.js/);
    expect(layering).not.toMatch(/luz\.(?:landing|cms|app|docs)\b/);
  });

  describe("PRINCIPLES.md §6 \"Core or site\"", () => {
    const bullet = read("PRINCIPLES.md")
      .split("\n")
      .find((line) => line.startsWith("- **Core or catalog.**"));

    it("says the same: catalog is what can go in any section, and the patterns of a kind of site are catalog too, one file each", () => {
      expect(bullet, "the bullet exists").toBeTruthy();
      expect(bullet).toMatch(/`catalog` is the navigation of the site and the pieces with JS or an identity of their own/i);
      expect(bullet).toMatch(/`core` is everything else/i);
      expect(bullet).toMatch(/core names nothing of catalog/i);
      expect(bullet).not.toMatch(/can go in any section/i);
      expect(bullet).toMatch(/patterns of a kind of site[^.]*are catalog too, one file each/i);
      expect(bullet).not.toMatch(/needs data of the site/i);
      expect(bullet).not.toMatch(/page structure[^.]*(never|not)[^.]*`?catalog`?/i);
    });

    it("names the four kinds by their pieces (a landing page, a blog, an application, a documentation page), makes no package of them and puts no kind after catalog", () => {
      for (const word of ["landing page", "blog", "application", "documentation page"]) expect(bullet, word).toContain(word);
      expect(bullet).not.toMatch(/optional/i);
      expect(bullet).not.toMatch(/@luz-ds\/(?:landing|cms|app|docs)\b/);
      expect(bullet).not.toMatch(/catalog\s*→\s*(cms|landing|app)/);
      expect(bullet).not.toMatch(/wordpress/i);
      expect(bullet).toMatch(/template on its docs page/i);
    });
  });
});

/* ---- site's README ---------------------------------------------------------- */

describe("@luz-ds/catalog's README says what site is now", () => {
  const readme = read("packages/catalog/README.md");

  it("sorts its pieces by the new rule, not by the data they need", () => {
    expect(readme).toMatch(/catalog is the navigation of the site and the pieces with JS or an identity of their own/i);
    expect(readme).not.toMatch(/any section/i);
    expect(readme).not.toMatch(/needs data of the site/i);
  });

  it("says where the page structure of the four kinds went: the packages are not published any more, and a pattern is a file of catalog", () => {
    expect(readme).toMatch(/`@luz-ds\/landing`, `@luz-ds\/cms`, `@luz-ds\/app` and `@luz-ds\/docs` are not published any more/);
    expect(readme).toMatch(/## Patterns of a kind of site/);
    for (const name of ["landing-header", "cms-header", "app-header", "docs-shell"]) expect(readme, name).toContain(name);
  });

  it("describes the cookie banner as a band fixed at the bottom of the window, not above the header", () => {
    const consent = between(readme, "## Cookie consent", /\n## /);
    expect(consent).not.toMatch(/above the header/i);
    expect(consent).toMatch(/bottom of the window/i);
  });
});

/* ---- VERSIONING.md ------------------------------------------------------------ */

describe("VERSIONING.md's public API", () => {
  it("does not list `.luz-site-*` classes: site's blocks are `<luz-*>` tags and `.luz-<tag>__*` parts", () => {
    const classes = read("VERSIONING.md")
      .split("\n")
      .find((line) => line.startsWith("| **Classes**"));
    expect(classes, "the Classes row exists").toBeTruthy();
    expect(classes).not.toMatch(/\.luz-site-\*/);
  });
});

/* ---- The changesets of F3: the migration table of spec §8 --------------------- */

describe("the F3 changesets carry the old -> new migration table", () => {
  // The f3-*.md changesets, or their entries in the CHANGELOGs once the Version Packages PR consumed them
  const lines = releaseNotes(root)
    .filter((note) => /^f3-.*\.md$/.test(note.file) || note.released)
    .flatMap((note) => note.text.split("\n"));

  // A row passes when one line of some f3-*.md holds the old name and its replacement
  const ROWS = [
    ["<luz-site-search>", "<luz-search>"],
    ["luz-site-search-trigger", "luz-search__trigger"],
    ["luz-site-consent", "<luz-consent>"],
    ["luz-site-lang-switcher", "luz-lang-switch"],
    ["--luz-site-lang-switcher-top", "--luz-lang-switch-top"],
    ["luz-site-submenu", "<luz-submenu>"],
    ["luz-site-notice", "<luz-banner>"],
    ["luz-site-header", "luz-landing-header"],
    ["luz-site-header", "luz-cms-header"],
    ["--luz-site-header-h", "--luz-bar-h"],
    ["luz-site-hero", "luz-landing-hero"],
    ["luz-site-footer", "luz-landing-footer"],
    ["luz-site-footer", "luz-cms-footer"],
    ["luz-site-page--gradient", ".o-page", "luz-landing-glow"],
    ["luz-site-main", "luz-landing-main"],
    ["luz-site-content", ".o-container"],
    ["luz-site-section", "--band", ".luz-band"],
    ["luz-site-actions", ".o-actions"],
    ["luz-site-skip-link", ".luz-skip-link"],
    ["luz-site-image", ".luz-image"],
    ["luz-site-page-header", "luz-cms-page-header"],
    ["luz-landing-feature-grid", "o-grid--split"],
    ["@luz-ds/catalog/placeholders", /removed|no longer/],
  ];

  it("has at least one f3-*.md changeset", () => {
    expect(lines.length).toBeGreaterThan(0);
  });

  it("shows every removed class, tag and export with its replacement on one row", () => {
    const missing = ROWS.filter((row) =>
      !lines.some((line) => row.every((part) => (part instanceof RegExp ? part.test(line) : line.includes(part)))),
    ).map((row) => row.map(String).join("  ->  "));
    expect(missing).toEqual([]);
  });
});

/* ---- The home page's "next" lists ---------------------------------------------- */

describe("the home page's `inside.kind.*` strings (the kinds of site of the fourth level), in en, es and ar", () => {
  const catalogs = Object.fromEntries(["en", "es", "ar"].map((lang) => [lang, JSON.parse(read(`apps/landing/i18n/${lang}.json`))]));
  const next = (lang) => Object.entries(catalogs[lang]).filter(([key]) => key.startsWith("inside.kind."));

  it("have the same keys in the three catalogs", () => {
    const keys = (lang) => next(lang).map(([key]) => key).sort();
    expect(keys("es")).toEqual(keys("en"));
    expect(keys("ar")).toEqual(keys("en"));
    expect(keys("en")).toEqual(expect.arrayContaining(["landing", "blog", "app", "docs"].flatMap((kind) => [`inside.kind.${kind}.title`, `inside.kind.${kind}.text`, `inside.kind.${kind}.prompt`])));
    expect(keys("en")).toEqual(expect.arrayContaining(["inside.kind.open", "inside.kind.recipes"]));
    expect(keys("en").filter((key) => key.includes(".cms.")), "the blog kind is named blog").toEqual([]);
  });

  it("do not sell a feature grid: it is a template on core's split grid, not a landing component", () => {
    const feature = /feature grid|rejilla de caracter[ií]sticas|شبكة الميزات/i;
    const offenders = ["en", "es", "ar"].flatMap((lang) => next(lang).filter(([, text]) => feature.test(text)).map(([key]) => `${lang}: ${key}`));
    expect(offenders).toEqual([]);
  });
});
