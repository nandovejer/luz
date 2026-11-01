/**
 * The data palette of a chart (component-gaps plan, 4.1 point 2): the eight
 * semantic tokens, and the pairs they must meet, written here from the brief and
 * not read from packages/tokens/lib/contrast.js, so a test can hold that list
 * (PAIRS) to the brief. Ratios are measured with the engine, never typed.
 *
 *   - each series on the page, surface, hover, muted and strong surfaces: 3:1
 *     (4.5:1 in high contrast);
 *   - the track on the page: 1.5:1; the grid on the page: 1.3:1 (3:1 in high contrast);
 *   - each series on the track: 2:1.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("../../", import.meta.url));
const read = (path) => readFileSync(`${repo}${path}`, "utf-8");

export const SERIES = [1, 2, 3, 4, 5, 6].map((n) => `chart-${n}`);
export const NAMES = [...SERIES, "chart-track", "chart-grid"];
export const TOKENS = NAMES.map((n) => `--luz-${n}`);
export const SURFACES = ["surface-page", "surface", "surface-hover", "surface-muted", "surface-strong"];

/** The pairs of the brief for a mode, in the shape measure() takes. */
export const pairsOf = (mode) => {
  const hc = mode === "high-contrast";
  return [
    { fg: SERIES, bg: SURFACES, min: hc ? 4.5 : 3, kind: "ui", advisory: false },
    { fg: ["chart-track"], bg: ["surface-page"], min: 1.5, kind: "decorative", advisory: false },
    { fg: ["chart-grid"], bg: ["surface-page"], min: hc ? 3 : 1.3, kind: "decorative", advisory: false },
    { fg: SERIES, bg: ["chart-track"], min: 2, kind: "decorative", advisory: false },
  ];
};

/** How many pairs pairsOf() holds: 6 x 5, 1, 1 and 6. */
export const PAIR_COUNT = SERIES.length * SURFACES.length + 1 + 1 + SERIES.length;

const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const squash = (text) => text.replace(/\s+/g, " ").trim();

/** Every "selector { body }" of a stylesheet, with the custom properties of the body in order. */
export const blocksOf = (css) =>
  [...strip(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({
    selector: squash(selector),
    props: [...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], squash(m[2])]),
  }));

export const primitives = (() => {
  const out = {};
  for (const [family, steps] of Object.entries(JSON.parse(read("packages/tokens/tokens.json")).color)) {
    for (const [step, { value }] of Object.entries(steps)) out[`--luz-${family}-${step}`] = value;
  }
  return out;
})();

/** The three blocks of semantic.css that carry a mode: [mode, props as an object]. */
export const semanticModes = () => {
  const blocks = blocksOf(read("packages/tokens/src/semantic.css"));
  const pick = (test) => Object.fromEntries(blocks.find((b) => test(b.selector))?.props ?? []);
  return {
    light: pick((s) => s.startsWith(":root,") && s.includes('[data-theme="light"]')),
    dark: pick((s) => s.startsWith('[data-theme="dark"],')),
    "high-contrast": pick((s) => s.startsWith('[data-theme="high-contrast"],')),
  };
};

/** Every custom property a mode sees: primitives, then the light block, then the mode's own. */
export const valuesFor = (mode) => {
  const modes = semanticModes();
  return { ...primitives, ...modes.light, ...(mode === "light" ? {} : modes[mode]) };
};
