/**
 * F6 of .claude/plans/ai-and-catalog-only.md (decisions 39 to 45), the part
 * that reads files: core's cycle variant is the round button fixed at the end
 * corner, so no app copies that look, and every use of `.luz-mode-switcher--cycle`
 * in the repository is either the button of its page or carries
 * `.luz-mode-switcher--inline`. What a browser draws is tests/mode-cycle.spec.js
 * and tests/mode-consent.spec.js.
 *
 *   - apps/site/header.css has no `position: fixed` for `.site-modes`, no rule
 *     for `.site-modes:where(luz-mode)` and no size rule for the button
 *   - core's stylesheet declares the three `--luz-switcher-cycle-*` properties,
 *     the `--inline` modifier and a fixed position under `(scripting: enabled)`
 *   - no inline use is left without `--inline`
 *   - the stage of a specimen in the docs holds the fixed button (`contain`)
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { findAll, hasClass, parse } from "./helpers/html-dom.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(repo, file), "utf-8");

/** Every style rule of a stylesheet, at any depth of @media and @supports: its selector and its declarations. */
function rulesOf(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const out = [];
  const stack = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "{") {
      stack.push({ prelude: text.slice(start, i).trim(), at: [...stack.map((s) => s.prelude)] });
      start = i + 1;
    } else if (c === "}") {
      const open = stack.pop();
      const body = text.slice(start, i);
      if (open && !open.prelude.startsWith("@") && !body.includes("{")) out.push({ selector: open.prelude, body, within: open.at });
      start = i + 1;
    } else if (c === ";" && stack.length === 0) start = i + 1;
  }
  return out;
}

const declares = (body, property, value) => new RegExp(`(?:^|[;\\s])${property}\\s*:\\s*${value}\\s*(?:;|$)`).test(body.trim());

describe("apps/site/header.css does not draw the button: core does", () => {
  const rules = rulesOf(read("apps/site/header.css"));

  it("has no `position: fixed` in a rule for .site-modes", () => {
    const fixed = rules.filter((r) => /\.site-modes/.test(r.selector) && declares(r.body, "position", "fixed"));
    expect(fixed.map((r) => r.selector)).toEqual([]);
  });

  it("has no rule for `.site-modes:where(luz-mode)`", () => {
    expect(rules.filter((r) => /\.site-modes:where\(luz-mode\)/.test(r.selector)).map((r) => r.selector)).toEqual([]);
  });

  it("has no size rule for the cycle button (core's is --luz-control-lg)", () => {
    const sized = rules.filter((r) => /\.luz-mode-cycle/.test(r.selector) && /(?:^|[;\s])(?:inline-size|block-size|width|height)\s*:/.test(r.body));
    expect(sized.map((r) => r.selector)).toEqual([]);
  });

  it("does not round, colour or shadow the button either", () => {
    const looks = rules.filter((r) => /\.luz-mode-cycle/.test(r.selector) && /(?:^|[;\s])(?:border-radius|box-shadow|background)\s*:/.test(r.body));
    expect(looks.map((r) => r.selector)).toEqual([]);
  });
});

describe("core's mode-switcher.css", () => {
  const css = read("packages/core/src/components/mode-switcher.css");
  const rules = rulesOf(css);

  it("declares the three properties of the round button", () => {
    for (const name of ["--luz-switcher-cycle-bg", "--luz-switcher-cycle-border", "--luz-switcher-cycle-text"]) {
      expect(css, name).toContain(`${name}:`);
    }
  });

  it("fixes the cycle group only with scripting on, and not when it is .luz-mode-switcher--inline", () => {
    const fixed = rules.filter((r) => declares(r.body, "position", "fixed") && /luz-mode-switcher--cycle/.test(r.selector));
    expect(fixed.length, "a rule that fixes .luz-mode-switcher--cycle").toBeGreaterThan(0);
    for (const rule of fixed) {
      expect(rule.within.join(" "), rule.selector).toMatch(/scripting:\s*enabled/);
      expect(rule.selector, "the modifier is excluded").toMatch(/:not\(\.luz-mode-switcher--inline\)/);
    }
  });

  it("puts the fixed group at the logical end corner, --luz-space-md from both edges, at --luz-z-raised", () => {
    const rule = rules.find((r) => declares(r.body, "position", "fixed") && /luz-mode-switcher--cycle/.test(r.selector));
    expect(rule && declares(rule.body, "inset-block-end", "var\\(--luz-space-md\\)")).toBe(true);
    expect(rule && declares(rule.body, "inset-inline-end", "var\\(--luz-space-md\\)")).toBe(true);
    expect(rule && declares(rule.body, "z-index", "var\\(--luz-z-raised\\)")).toBe(true);
  });

  it("sizes the button with --luz-control-lg and rounds it with --luz-radius-full", () => {
    const button = rules.find((r) => r.selector.trim() === ".luz-mode-cycle");
    expect(button && declares(button.body, "inline-size", "var\\(--luz-control-lg\\)")).toBe(true);
    expect(button && declares(button.body, "block-size", "var\\(--luz-control-lg\\)")).toBe(true);
    expect(button && declares(button.body, "border-radius", "var\\(--luz-radius-full\\)")).toBe(true);
  });
});

/* ---- Every inline use of the cycle variant ----------------------------- */

function htmlFiles(dir) {
  const out = [];
  for (const name of readdirSync(join(repo, dir))) {
    if (name === "node_modules" || name === "dist" || name.startsWith(".")) continue;
    const path = join(dir, name);
    if (statSync(join(repo, path)).isDirectory()) out.push(...htmlFiles(path));
    else if (name.endsWith(".html")) out.push(path);
  }
  return out;
}

/** The files whose one `.luz-mode-switcher--cycle` is the fixed button of the page. */
const THE_PAGES_BUTTON = [
  "apps/landing/index.html",
  "apps/site/_partials/footer.html",
  "tests/fixtures/mode-cycle.html",
  "tests/fixtures/site-mode.html",
  "tests/fixtures/site-mode-luz.html",
  "tests/fixtures/site-loader-mode-luz.html",
  "tests/fixtures/mode-consent.html",
];

const uses = new Map();
for (const file of [...htmlFiles("apps"), ...htmlFiles("tests/fixtures")]) {
  const html = read(file);
  if (!html.includes("luz-mode-switcher--cycle")) continue;
  const groups = findAll(parse(html, file), (n) => hasClass(n, "luz-mode-switcher--cycle"));
  if (groups.length) uses.set(file, groups);
}

const inStage = (node) => {
  for (let up = node.parent; up; up = up.parent) if (hasClass(up, "docs-stage__fixed")) return true;
  return false;
};

describe("every `.luz-mode-switcher--cycle` in the repository", () => {
  it("is found in the files the F6 review lists, and in no other", () => {
    const found = [...uses.keys()].sort();
    const expected = [
      ...THE_PAGES_BUTTON,
      "apps/docs/pages/components/mode-switcher.html",
      "apps/docs/i18n/es/pages/components/mode-switcher.html",
      "tests/fixtures/i18n-languages.html",
    ].sort();
    expect(found).toEqual(expected);
  });

  it("is the one fixed button of its page, or carries .luz-mode-switcher--inline, or sits in a docs stage that holds it", () => {
    const lonely = [];
    for (const [file, groups] of uses) {
      for (const group of groups) {
        const inline = hasClass(group, "luz-mode-switcher--inline");
        if (inline || inStage(group)) continue;
        if (!THE_PAGES_BUTTON.includes(file)) lonely.push(`${file}:${group.open.index}`);
      }
    }
    expect(lonely, "a --cycle in the flow without --inline").toEqual([]);
  });

  it("is exactly one fixed button in each file that is a page's button", () => {
    for (const file of THE_PAGES_BUTTON) {
      const groups = uses.get(file) ?? [];
      const fixed = groups.filter((g) => !hasClass(g, "luz-mode-switcher--inline"));
      expect(fixed.length, file).toBe(1);
    }
  });

  it("is, in the fixtures that are not a page's button, inline: i18n-languages", () => {
    const groups = uses.get("tests/fixtures/i18n-languages.html") ?? [];
    expect(groups.length).toBe(1);
    expect(hasClass(groups[0], "luz-mode-switcher--inline")).toBe(true);
  });
});

describe("the docs stage that holds a fixed demo", () => {
  it("is a containing block for fixed boxes (contain: layout or a transform), so the demo never sits over the site's own button", () => {
    const rules = rulesOf(read("apps/docs/reference.css")).filter((r) => /(^|,)\s*\.docs-stage__fixed\s*(,|$)/.test(r.selector));
    expect(rules.length, "a rule for .docs-stage__fixed").toBeGreaterThan(0);
    expect(rules.some((r) => /(?:^|[;\s])(?:contain\s*:[^;]*\b(?:layout|paint|strict|content)\b|transform\s*:\s*(?!none))/.test(r.body))).toBe(true);
  });

  it("is used by both pages of the component, the English one and the Spanish one", () => {
    for (const file of ["apps/docs/pages/components/mode-switcher.html", "apps/docs/i18n/es/pages/components/mode-switcher.html"]) {
      const groups = uses.get(file) ?? [];
      expect(groups.length, file).toBeGreaterThanOrEqual(3);
      expect(groups.some((g) => hasClass(g, "luz-mode-switcher--inline")), `${file}: an --inline specimen`).toBe(true);
      for (const group of groups) expect(hasClass(group, "luz-mode-switcher--inline") || inStage(group), `${file}:${group.open.index}`).toBe(true);
    }
  });
});
