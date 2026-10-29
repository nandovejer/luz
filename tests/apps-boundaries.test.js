/**
 * The three apps (F2 of .claude/plans/luz-home-docs-identity.md, section 3.4):
 * what the home page and the docs share lives in apps/site, and neither
 * app reaches into the other.
 *
 *   apps/site/     the header, the footer, the favicons, the colour mode boot
 *                  and the four lights: depends on no other app
 *   apps/landing/  the home page: no path into apps/docs
 *   apps/docs/     the documentation: no path into apps/landing
 *
 * The search is a text search of paths in every .html, .js, .css and .json
 * file; routes (href="/", "/docs/...") are not paths into an app.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(repo, rel), "utf-8");

/** Every text file of an app, as repo-relative paths (not node_modules, not a build). */
function filesOf(app) {
  const out = [];
  const walk = (dir) => {
    if (!existsSync(join(repo, dir))) return;
    for (const entry of readdirSync(join(repo, dir))) {
      if (entry === "node_modules" || entry === "dist") continue;
      const rel = `${dir}/${entry}`;
      if (statSync(join(repo, rel)).isDirectory()) walk(rel);
      else if (/\.(html|js|css|json)$/.test(entry)) out.push(rel);
    }
  };
  walk(app);
  return out;
}

/** "file:line: text" for each line of the app's files that matches. */
function mentions(app, pattern) {
  return filesOf(app).flatMap((file) =>
    read(file)
      .split("\n")
      .flatMap((line, i) => (pattern.test(line) ? [`${file}:${i + 1}: ${line.trim().slice(0, 90)}`] : [])),
  );
}

describe("no app reaches into another", () => {
  it("apps/landing names nothing of apps/docs", () => {
    expect(mentions("apps/landing", /apps\/docs|\.\.\/docs\//)).toEqual([]);
  });

  it("apps/docs names nothing of apps/landing", () => {
    expect(mentions("apps/docs", /apps\/landing|\.\.\/landing\//)).toEqual([]);
  });

  it("apps/site names nothing of apps/docs or apps/landing", () => {
    expect(existsSync(join(repo, "apps/site")), "apps/site exists").toBe(true);
    expect(filesOf("apps/site").length, "apps/site has files").toBeGreaterThan(0);
    expect(mentions("apps/site", /apps\/(?:docs|landing)|\.\.\/(?:docs|landing)\//)).toEqual([]);
  });
});

describe("apps/site holds what the home page and the docs share", () => {
  const MOVED = [
    ["apps/docs/site-header.css", "apps/site/header.css"],
    ["apps/docs/site-header.js", "apps/site/header.js"],
    ["apps/docs/_partials/header.html", "apps/site/_partials/header.html"],
    ["apps/docs/_partials/site-links.html", "apps/site/_partials/site-links.html"],
    ["apps/docs/_partials/footer.html", "apps/site/_partials/footer.html"],
    ["apps/landing/assets/favicon.ico", "apps/site/assets/favicon.ico"],
    ["apps/landing/assets/favicon.svg", "apps/site/assets/favicon.svg"],
    ["apps/landing/assets/apple-touch-icon.png", "apps/site/assets/apple-touch-icon.png"],
    ["apps/landing/assets/logo-mark.svg", "apps/site/assets/logo-mark.svg"],
  ];

  it.each(MOVED)("%s moved to %s", (from, to) => {
    expect(existsSync(join(repo, to)), `${to} exists`).toBe(true);
    expect(existsSync(join(repo, from)), `${from} is gone`).toBe(false);
  });

  it("has no boot.js: the scripts for the <head> are the packages' (core's theme-boot.js and catalog's theme-time-boot.js), and apps/landing/theme-boot.js is gone", () => {
    expect(existsSync(join(repo, "apps/site/boot.js")), "apps/site/boot.js is gone").toBe(false);
    expect(existsSync(join(repo, "apps/landing/theme-boot.js")), "apps/landing/theme-boot.js is gone").toBe(false);
    expect(existsSync(join(repo, "packages/core/src/theme-boot.js"))).toBe(true);
    expect(existsSync(join(repo, "packages/catalog/src/theme-time-boot.js"))).toBe(true);
  });

  it("has theme-light.css, the four lights", () => {
    expect(existsSync(join(repo, "apps/site/theme-light.css"))).toBe(true);
  });

  it("is the private workspace package @luz-ds/website, on core, site and tokens", () => {
    expect(existsSync(join(repo, "apps/site/package.json")), "apps/site/package.json exists").toBe(true);
    const pkg = JSON.parse(read("apps/site/package.json"));
    expect(pkg.name).toBe("@luz-ds/website");
    expect(pkg.version).toBe("0.0.0");
    expect(pkg.private).toBe(true);
    expect(pkg.dependencies).toEqual({
      "@luz-ds/core": "workspace:*",
      "@luz-ds/catalog": "workspace:*",
      "@luz-ds/tokens": "workspace:*",
    });
  });

  it("is the folder of the shared partials and of nothing else's: no partial is in both folders", () => {
    const names = (dir) => (existsSync(join(repo, dir)) ? readdirSync(join(repo, dir)) : []);
    const both = names("apps/site/_partials").filter((n) => names("apps/docs/_partials").includes(n));
    expect(both).toEqual([]);
  });
});

describe("the header moved to apps/site keeps what it did", () => {
  // The header was redesigned (tests/site-header.spec.js holds how it looks and behaves), so its rules are
  // no longer compared with the old file's: the stylesheet is only held to the boundary, the one thing a
  // move was meant to keep. It lives in apps/site and names no other app, outside its comments.
  const code = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

  it("header.css is in apps/site and no rule or url() of it names another app (only comments may name the new path)", () => {
    expect(existsSync(join(repo, "apps/site/header.css")), "apps/site/header.css exists").toBe(true);
    const css = code(read("apps/site/header.css"));
    expect(css.length, "it has rules").toBeGreaterThan(0);
    expect(css).not.toMatch(/apps\/(?:docs|landing)|\.\.\/(?:docs|landing)\//);
  });

  it("the footer's mode switcher has rules in it, which name `.site-modes` and no other app", () => {
    const css = code(read("apps/site/header.css"));
    expect(css).toContain(".site-modes");
  });

  it("header.js exports initSiteHeader() with no option, still wires the sidebar, and defines <luz-theme-mode> and <luz-theme-time>; the round button is the element's own, so it calls no initThemeCycle()", () => {
    expect(existsSync(join(repo, "apps/site/header.js")), "apps/site/header.js exists").toBe(true);
    const code = read("apps/site/header.js").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
    expect(code).toMatch(/export\s+function\s+initSiteHeader\s*\(\s*\)/);
    expect(code).not.toMatch(/\binitThemeCycle\b/);
    expect(code).toMatch(/\binitSidebar\s*\(/);
    expect(code).toContain("--site-header-h");
    expect(code).toMatch(/import\s*["']\/packages\/core\/dist\/theme-mode\.js["']|from\s*["']\/packages\/core\/dist\/theme-mode\.js["']/);
    expect(code).toMatch(/import\s*["']\/packages\/catalog\/dist\/theme-time\.js["']|from\s*["']\/packages\/catalog\/dist\/theme-time\.js["']/);
    expect(code).not.toMatch(/color-mode/);
    expect(code).not.toMatch(/onModeChange|luz-site-mode|initModes/);
  });
});
