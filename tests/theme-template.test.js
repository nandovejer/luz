/**
 * The theme template (packages/core/src/themes/_template.css) is the starting
 * point of a consumer's theme. It must name every semantic token that the
 * three base modes define, in each of its three blocks, and nothing else, so
 * it never goes stale when a token is added or removed.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const blocks = (css) => [...strip(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selector: selector.replace(/\s+/g, " ").trim(), props: [...body.matchAll(/(--luz-[\w-]+)\s*:/g)].map((m) => m[1]) }));
// Shadows are primitives that a mode redraws; the template names them in dark and high contrast
const colours = (props) => props.filter((p) => !p.startsWith("--luz-shadow-"));

const semantic = blocks(readFileSync(resolve(root, "packages/tokens/src/semantic.css"), "utf-8"));
const template = blocks(readFileSync(resolve(root, "packages/core/src/themes/_template.css"), "utf-8"));

/** The selectors of a rule, split at the commas that are not inside parentheses. */
const selectorsOf = (selector) => {
  const out = [];
  let depth = 0;
  let current = "";
  for (const ch of selector) {
    if (ch === "(" || ch === "[") depth++;
    if (ch === ")" || ch === "]") depth--;
    if (ch === "," && depth === 0) {
      out.push(current.trim());
      current = "";
    } else current += ch;
  }
  return [...out, current.trim()].filter(Boolean);
};
const has = (b, selector) => selectorsOf(b.selector).includes(selector);

// A block of the template answers to data-mode; the first one is also the theme's default
const MODES = [
  ["light", (b) => b.selector.startsWith(":root,") && b.selector.includes('[data-theme="light"]'), (b) => has(b, '[data-theme="my-brand"][data-mode="light"]')],
  ["dark", (b) => b.selector.startsWith('[data-theme="dark"],'), (b) => has(b, '[data-theme="my-brand"][data-mode="dark"]')],
  ["high-contrast", (b) => b.selector.startsWith('[data-theme="high-contrast"],'), (b) => has(b, '[data-theme="my-brand"][data-mode="high-contrast"]')],
];

// Without JavaScript <luz-theme-mode> writes no data-mode: its checked radio picks the block, as semantic.css does for the base themes
const NOJS = (mode) => `:root[data-theme="my-brand"]:not([data-mode]):has(input[name="luz-theme-mode"][value="${mode}"]:checked)`;
// semantic.css wraps its own in :is() so a browser without :has() drops the selector and not the rule; the template may too
const unwrapped = (selector) => selector.replace(/^:is\((.*)\)$/, "$1");

describe("theme template", () => {
  for (const [mode, isSemantic, isTemplate] of MODES) {
    it(`${mode}: names exactly the semantic tokens of the mode`, () => {
      const wanted = semantic.find(isSemantic);
      const got = template.find(isTemplate);
      expect(wanted, `${mode} block of semantic.css`).toBeTruthy();
      expect(got, `${mode} block of the template`).toBeTruthy();
      expect(colours(got.props).sort()).toEqual(colours(wanted.props).sort());
    });
  }

  for (const [mode, isSemantic, isTemplate] of MODES) {
    it(`${mode}: the block also answers to the checked radio of <luz-theme-mode>, with no data-mode written (no JavaScript)`, () => {
      const wanted = semantic.find(isSemantic);
      const carrying = template.filter((b) => selectorsOf(b.selector).some((x) => unwrapped(x) === NOJS(mode)));
      expect(carrying.length, `a rule of the template with ${NOJS(mode)}`).toBeGreaterThan(0);
      expect(colours(carrying.flatMap((b) => b.props)).sort()).toEqual(colours(wanted.props).sort());
      // The data-mode selector of the same mode stays: with JavaScript the attribute is what picks the block
      expect(template.some(isTemplate), `${mode} block`).toBe(true);
    });
  }

  it("the radios' name is the one <luz-theme-mode> documents, and none of the old color-mode switcher's", () => {
    const names = [...readFileSync(resolve(root, "packages/core/src/themes/_template.css"), "utf-8").matchAll(/input\[name="([^"]+)"\]/g)].map((m) => m[1]);
    expect(names.length).toBeGreaterThan(0);
    expect(new Set(names)).toEqual(new Set(["luz-theme-mode"]));
  });

  it("uses one theme name, my-brand, and no other selector", () => {
    expect(template.map((b) => b.selector).filter((s) => !s.includes('data-theme="my-brand"'))).toEqual([]);
  });
});

describe("the themes page lists the tokens of the template", () => {
  it("names every semantic token of the template, and no other", () => {
    const page = readFileSync(resolve(root, "apps/docs/pages/tokens/themes.html"), "utf-8");
    const table = page.split('aria-label="Semantic tokens a theme sets"')[1].split("</table>")[0];
    const listed = [...table.matchAll(/<code>(--luz-[\w-]+)<\/code>/g)].map((m) => m[1]).sort();
    const light = template.find((b) => b.selector.startsWith('[data-theme="my-brand"],'));
    expect(listed).toEqual(colours(light.props).sort());
  });
});
