/**
 * F6 of .claude/plans/ai-and-catalog-only.md (decisions 39 to 45), the part
 * that reads files: core's <luz-theme-mode> draws the round button fixed at
 * the end corner, so no app copies that look, and every use of the element in
 * the repository is either the button of its page or carries `inline`. What a
 * browser draws is tests/mode-cycle.spec.js and tests/mode-consent.spec.js.
 *
 *   - apps/site/header.css has no `position: fixed` for `.site-modes`, no rule
 *     for `.site-modes:where(luz-theme-mode)` and no size rule for the button
 *   - core's stylesheet declares the three `--luz-theme-mode-*` properties of the
 *     button, and a fixed position only for the `--fixed` modifier the script adds
 *   - no use of the element is left without `inline` unless it is its page's button
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

  it("has no rule for `.site-modes:where(luz-theme-mode)`", () => {
    expect(rules.filter((r) => /\.site-modes:where\(luz-theme-(?:mode|time)\)/.test(r.selector)).map((r) => r.selector)).toEqual([]);
  });

  it("has no size rule for the cycle button (core's is --luz-control-lg)", () => {
    const sized = rules.filter((r) => /\.luz-theme-mode__button/.test(r.selector) && /(?:^|[;\s])(?:inline-size|block-size|width|height)\s*:/.test(r.body));
    expect(sized.map((r) => r.selector)).toEqual([]);
  });

  it("does not round, colour or shadow the button either", () => {
    const looks = rules.filter((r) => /\.luz-theme-mode__button/.test(r.selector) && /(?:^|[;\s])(?:border-radius|box-shadow|background)\s*:/.test(r.body));
    expect(looks.map((r) => r.selector)).toEqual([]);
  });
});

describe("core's theme-mode.css", () => {
  const css = read("packages/core/src/components/theme-mode.css");
  const rules = rulesOf(css);

  it("declares the three properties of the round button", () => {
    for (const name of ["--luz-theme-mode-bg", "--luz-theme-mode-edge", "--luz-theme-mode-text"]) {
      expect(css, name).toContain(`${name}:`);
    }
  });

  it("fixes only the button the script marks `--fixed` (an `inline` element never gets it), and never the bare button", () => {
    const fixed = rules.filter((r) => declares(r.body, "position", "fixed") && /luz-theme-mode__button/.test(r.selector));
    expect(fixed.length, "a rule that fixes the button").toBeGreaterThan(0);
    for (const rule of fixed) expect(rule.selector.trim(), "only the modifier").toBe(".luz-theme-mode__button--fixed");
  });

  it("puts the fixed button at the logical end corner, --luz-space-md from both edges, at --luz-z-raised", () => {
    const rule = rules.find((r) => declares(r.body, "position", "fixed") && /luz-theme-mode__button--fixed/.test(r.selector));
    expect(rule && declares(rule.body, "inset-block-end", "var\\(--luz-space-md\\)")).toBe(true);
    expect(rule && declares(rule.body, "inset-inline-end", "var\\(--luz-space-md\\)")).toBe(true);
    expect(rule && declares(rule.body, "z-index", "var\\(--luz-z-raised\\)")).toBe(true);
  });

  it("sizes the button with --luz-control-lg and rounds it with --luz-radius-full", () => {
    const button = rules.find((r) => r.selector.trim() === ".luz-theme-mode__button");
    expect(button && declares(button.body, "inline-size", "var\\(--luz-control-lg\\)")).toBe(true);
    expect(button && declares(button.body, "block-size", "var\\(--luz-control-lg\\)")).toBe(true);
    expect(button && declares(button.body, "border-radius", "var\\(--luz-radius-full\\)")).toBe(true);
  });
});

/* ---- Every use of the element ------------------------------------------ */

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

/** The files whose one `<luz-theme-mode>` without `inline` is the fixed button of the page. */
const THE_PAGES_BUTTON = [
  "apps/landing/index.html",
  "apps/site/_partials/footer.html",
  "tests/fixtures/mode-cycle.html",
  "tests/fixtures/site-mode.html",
  "tests/fixtures/site-mode-luz.html",
  "tests/fixtures/site-loader-mode-luz.html",
  "tests/fixtures/mode-consent.html",
  "tests/fixtures/mode-switcher.html",
];

/** The fixtures whose one `<luz-theme-mode>` carries `inline`: a page of tests that is not a page of a site. */
const INLINE_FIXTURES = ["tests/fixtures/i18n-languages.html", "tests/fixtures/site-loader-mode.html"];

/** The fixtures of the element's own specs author `inline` from the query string, and those of luz-check are pages to read, not pages to run: neither is a page's button. */
const OWN_FIXTURE = /^tests\/fixtures\/(?:check\/|theme-(?:mode|time))/;

const isElement = (node) => node.name === "luz-theme-mode";
const uses = new Map();
for (const file of [...htmlFiles("apps"), ...htmlFiles("tests/fixtures")]) {
  if (OWN_FIXTURE.test(file)) continue;
  const html = read(file);
  if (!html.includes("<luz-theme-mode")) continue;
  const elements = findAll(parse(html, file), isElement);
  if (elements.length) uses.set(file, elements);
}

const isInline = (node) => node.attrs.has("inline");

const inStage = (node) => {
  for (let up = node.parent; up; up = up.parent) if (hasClass(up, "docs-stage__fixed")) return true;
  return false;
};

describe("every `<luz-theme-mode>` in the repository", () => {
  it("is found in the files the F6 review lists, and in no other", () => {
    const found = [...uses.keys()].sort();
    const expected = [...THE_PAGES_BUTTON, ...INLINE_FIXTURES].sort();
    expect(found).toEqual(expected);
  });

  it("is the one fixed button of its page, or carries `inline`", () => {
    const lonely = [];
    for (const [file, elements] of uses) {
      for (const element of elements) {
        if (isInline(element)) continue;
        if (!THE_PAGES_BUTTON.includes(file)) lonely.push(`${file}:${element.open.index}`);
      }
    }
    expect(lonely, "a <luz-theme-mode> in the flow without `inline`").toEqual([]);
  });

  it("is exactly one fixed button in each file that is a page's button", () => {
    for (const file of THE_PAGES_BUTTON) {
      const elements = uses.get(file) ?? [];
      const fixed = elements.filter((e) => !isInline(e));
      expect(fixed.length, file).toBe(1);
    }
  });

  it("is, in the fixtures that are not a page's button, inline: i18n-languages and the loader's plain page", () => {
    for (const file of INLINE_FIXTURES) {
      const elements = uses.get(file) ?? [];
      expect(elements.length, file).toBe(1);
      expect(isInline(elements[0]), file).toBe(true);
    }
  });
});

describe("the docs stage that holds a fixed demo", () => {
  it("is a containing block for fixed boxes (contain: layout or a transform), so the demo never sits over the site's own button", () => {
    const rules = rulesOf(read("apps/docs/reference.css")).filter((r) => /(^|,)\s*\.docs-stage__fixed\s*(,|$)/.test(r.selector));
    expect(rules.length, "a rule for .docs-stage__fixed").toBeGreaterThan(0);
    expect(rules.some((r) => /(?:^|[;\s])(?:contain\s*:[^;]*\b(?:layout|paint|strict|content)\b|transform\s*:\s*(?!none))/.test(r.body))).toBe(true);
  });

  it("is used by both pages of the component, the English one and the Spanish one: every fixed specimen is in a stage that holds it, and an inline specimen is there too", () => {
    for (const file of ["apps/docs/pages/components/theme-mode.html", "apps/docs/i18n/es/pages/components/theme-mode.html"]) {
      const buttons = findAll(parse(read(file), file), (n) => n.name === "button" && hasClass(n, "luz-theme-mode__button"));
      expect(buttons.length, file).toBeGreaterThanOrEqual(3);
      expect(buttons.some((b) => !hasClass(b, "luz-theme-mode__button--fixed")), `${file}: an inline specimen`).toBe(true);
      for (const button of buttons) expect(!hasClass(button, "luz-theme-mode__button--fixed") || inStage(button), `${file}:${button.open.index}`).toBe(true);
    }
  });
});
