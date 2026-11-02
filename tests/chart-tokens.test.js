/**
 * The data palette of a chart (component-gaps plan, 4.1 point 2 and 4.5 step 1; AGENTS.md "Adding a new
 * semantic token"): `--luz-chart-1` to `-6`, `--luz-chart-track` and `--luz-chart-grid`, in the three modes.
 *
 * What these tests hold: the eight tokens are in the three blocks of semantic.css and of the theme template as a
 * hex or the alias of a primitive; the pairs they must meet are in the contrast engine and the real values meet
 * them; the engine can tell how far apart two colours look (also with a colour vision deficiency); the build check
 * fails on two series that look alike and on a series under 3:1; the docs page of the colours, the themes page and
 * the Figma pages list them and count them from the sources; the deviations are written in DESIGN.md.
 * Every ratio and distance is measured with the engine, none is typed.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, copyFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as contrast from "../packages/tokens/lib/contrast.js";
import { colorTokens, resolveColor } from "./helpers/design-tokens.js";
import { NAMES, PAIR_COUNT, TOKENS, blocksOf, pairsOf, primitives, semanticModes, valuesFor } from "./helpers/chart-palette.js";
import { site } from "./helpers/docs-site.js";

const { PAIRS, createResolver, expandPairs, measure, pairsFor, parseColor } = contrast;
const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(repo, path), "utf-8");
const MODES = ["light", "dark", "high-contrast"];

/* ---- semantic.css (the theme template is held in theme-template.test.js) ------------ */

const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const alias = (value) => value.match(/^var\((--luz-[\w-]+)\)$/)?.[1];

describe("semantic.css names the eight chart tokens in each of its three blocks", () => {
  const modes = semanticModes();

  it.each(MODES)("%s: all eight, each a hex or the alias of a primitive and nothing else", (mode) => {
    for (const token of TOKENS) {
      const value = modes[mode][token];
      expect(value, `${mode}: ${token} is declared`).toBeTruthy();
      const ok = HEX.test(value) || (alias(value) !== undefined && alias(value) in primitives);
      expect(ok, `${mode}: ${token}: ${value} is a hex or var(--luz-<primitive>)`).toBe(true);
    }
  });

  it("the eight come after the code-syntax colours of each block, so the colour page can list them last", () => {
    const names = colorTokens();
    const first = names.indexOf("--luz-chart-1");
    expect(first, "--luz-chart-1 is a colour token").toBeGreaterThan(names.indexOf("--luz-code-literal"));
    expect(names.slice(first)).toEqual(TOKENS);
  });
});

/* ---- The pairs ------------------------------------------------------------------ */

describe("the contrast engine holds the pairs of the palette", () => {
  const strictest = (pairs) => {
    const out = new Map();
    for (const p of expandPairs(pairs)) out.set(`${p.fg}|${p.bg}`, Math.max(p.min, out.get(`${p.fg}|${p.bg}`) ?? 0));
    return out;
  };

  it.each(MODES)("%s: PAIRS (and, in high contrast, HIGH_CONTRAST_PAIRS) hold every pair of the brief, at least as strictly", (mode) => {
    const held = strictest(pairsFor(mode));
    const missing = [];
    for (const p of expandPairs(pairsOf(mode))) {
      if (!(held.get(`${p.fg}|${p.bg}`) >= p.min)) missing.push(`${p.fg} on ${p.bg} needs ${p.min}:1`);
    }
    expect(missing).toEqual([]);
  });

  it("the pairs of the base modes are in PAIRS, so a consumer's own check measures them too", () => {
    const held = strictest(PAIRS);
    expect(held.get("chart-1|surface"), "chart-1 on the card surface").toBeGreaterThanOrEqual(3);
    expect(held.get("chart-grid|surface-page"), "the grid on the page").toBeGreaterThanOrEqual(1.3);
  });

  it.each(MODES)("%s: the real values meet them", (mode) => {
    const { results, unreadable } = measure(createResolver(valuesFor(mode)), pairsOf(mode));
    expect(unreadable.map((u) => `${u.foreground} on ${u.background}: ${u.reason}`)).toEqual([]);
    expect(results).toHaveLength(PAIR_COUNT);
    expect(results.filter((r) => !r.ok).map((r) => `${r.foreground} on ${r.background} is ${r.ratio.toFixed(2)}:1, needs ${r.minimum}:1`)).toEqual([]);
  });
});

/* ---- How far apart colours look ------------------------------------------------------ */

describe("colorDistance and simulate", () => {
  const colours = ["#2365a6", "#00736f", "#fc180c", "#006c00", "#ffffff", "#000000"].map(parseColor);
  const red = parseColor("#ff0000");

  it("are exported by the engine", () => {
    expect(typeof contrast.colorDistance).toBe("function");
    expect(typeof contrast.simulate).toBe("function");
  });

  it("colorDistance is 0 for equal colours, with or without a vision type", () => {
    for (const c of colours) {
      expect(contrast.colorDistance(c, { ...c })).toBe(0);
      for (const vision of ["protan", "deutan"]) expect(contrast.colorDistance(c, { ...c }, vision)).toBe(0);
    }
  });

  it("colorDistance is symmetric, and grows with how different the colours are", () => {
    for (const a of colours) {
      for (const b of colours) {
        for (const vision of [undefined, "protan", "deutan"]) {
          expect(contrast.colorDistance(a, b, vision)).toBeCloseTo(contrast.colorDistance(b, a, vision), 10);
        }
      }
    }
    const white = parseColor("#fff");
    const near = contrast.colorDistance(white, parseColor("#fefefe"));
    expect(near).toBeGreaterThan(0);
    expect(contrast.colorDistance(white, parseColor("#000"))).toBeGreaterThan(near);
    expect(contrast.colorDistance(white, parseColor("#000"))).toBeGreaterThan(contrast.colorDistance(white, parseColor("#888")));
  });

  it("simulate gives the same colour for no vision type and for one it does not know", () => {
    const c = parseColor("#2365a6");
    for (const vision of [undefined, "", "none", "unknown", "protanopia"]) {
      const s = contrast.simulate(c, vision);
      expect([s.r, s.g, s.b]).toEqual([c.r, c.g, c.b]);
    }
  });

  it("simulate moves a saturated red for protan and for deutan", () => {
    for (const vision of ["protan", "deutan"]) {
      const seen = contrast.simulate(red, vision);
      expect(contrast.colorDistance(red, seen), vision).toBeGreaterThan(0.1);
    }
  });

  it("a red and a green that look different to most people look alike with protanopia", () => {
    // The reason the series are also held apart as protan and deutan see them
    const [green, orange] = [parseColor("#006c00"), parseColor("#fc180c")];
    expect(contrast.colorDistance(green, orange)).toBeGreaterThan(0.3);
    expect(contrast.colorDistance(green, orange, "protan")).toBeLessThan(0.05);
  });
});

/* ---- scripts/check-contrast.js ----------------------------------------------------- */

/**
 * scripts/check-contrast.js in a copy of the repository's layout: its own file, the tokens package linked, and
 * a theme of core's folder as given, so the script under test is the real one and measures a theme that only
 * sets chart tokens over Vejer's light (anything a theme leaves out falls back to light, as in the browser).
 */
function runCheckContrast(overrides = {}) {
  const dir = mkdtempSync(join(tmpdir(), "luz-chart-contrast-"));
  try {
    mkdirSync(join(dir, "scripts"));
    mkdirSync(join(dir, "tests/fixtures"), { recursive: true });
    mkdirSync(join(dir, "packages/core/src/themes"), { recursive: true });
    writeFileSync(join(dir, "package.json"), '{"type":"module"}');
    copyFileSync(join(repo, "scripts/check-contrast.js"), join(dir, "scripts/check-contrast.js"));
    copyFileSync(join(repo, "tests/fixtures/red-line-debt.json"), join(dir, "tests/fixtures/red-line-debt.json"));
    symlinkSync(join(repo, "packages/tokens"), join(dir, "packages/tokens"));
    const lines = Object.entries(overrides).map(([name, value]) => `  --luz-${name}: ${value};`).join("\n");
    const css = `[data-theme="probe"] {\n${lines}\n}\n${MODES.map((m) => `[data-theme="probe"][data-mode="${m}"] {\n}`).join("\n")}\n`;
    writeFileSync(join(dir, "packages/core/src/themes/luz-theme-probe.css"), css);
    const done = spawnSync(process.execPath, ["scripts/check-contrast.js"], { cwd: dir, encoding: "utf-8" });
    const output = `${done.stdout}${done.stderr}`;
    return { code: done.status, output, failures: output.split("\n").filter((l) => l.startsWith("✗")) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const names = (line, a, b) => line.includes(`--luz-${a}`) && line.includes(`--luz-${b}`);

/** A palette that is fine in light: the fixture every probe below changes one or two colours of. */
const VALID = {
  "chart-1": "#2365a6",
  "chart-2": "#00736f",
  "chart-3": "#5a248a",
  "chart-4": "#7f004e",
  "chart-5": "#6079c4",
  "chart-6": "#867f7a",
  "chart-track": "#d2c3a9",
  "chart-grid": "#dccdb3",
};
const asValues = (palette) => ({ ...valuesFor("light"), ...Object.fromEntries(Object.entries(palette).map(([k, v]) => [`--luz-${k}`, v])) });
const failing = (palette) => measure(createResolver(asValues(palette)), pairsOf("light")).results.filter((r) => !r.ok);

describe("scripts/check-contrast.js holds the chart tokens", () => {
  it("passes the real tokens", () => {
    const real = spawnSync(process.execPath, [join(repo, "scripts/check-contrast.js")], { encoding: "utf-8" });
    expect(`${real.stdout}${real.stderr}`).not.toMatch(/✗/);
    expect(real.status).toBe(0);
  });

  it("passes a theme whose chart colours are fine (the fixture of the tests below)", () => {
    expect(failing(VALID)).toEqual([]);
    const probe = runCheckContrast(VALID);
    expect(probe.failures).toEqual([]);
    expect(probe.code).toBe(0);
  });

  it("fails, and names both series, when two series are equal", () => {
    const done = runCheckContrast({ ...VALID, "chart-2": VALID["chart-1"] });
    expect(done.code, done.output).toBe(1);
    expect(done.failures.some((l) => names(l, "chart-1", "chart-2")), done.output).toBe(true);
  });

  it("fails when two series are not equal but less than 0.08 apart in OKLab", () => {
    const first = parseColor(VALID["chart-1"]);
    const close = [first.r + 6, first.g + 6, first.b + 6].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
    expect(contrast.colorDistance(first, parseColor(`#${close}`)), "the fixture is under the rule").toBeLessThan(0.08);
    const done = runCheckContrast({ ...VALID, "chart-2": `#${close}` });
    expect(done.code, done.output).toBe(1);
    expect(done.failures.some((l) => names(l, "chart-1", "chart-2")), done.output).toBe(true);
  });

  it("fails, and names the series, when a series falls below 3:1 on the surfaces", () => {
    const palette = { ...VALID, "chart-3": "#e6dfd2" };
    expect(failing(palette).some((r) => r.foreground === "--luz-chart-3" && r.minimum === 3), "the fixture is under 3:1").toBe(true);
    const done = runCheckContrast(palette);
    expect(done.code, done.output).toBe(1);
    expect(done.failures.some((l) => l.includes("--luz-chart-3") && /\d:1/.test(l)), done.output).toBe(true);
  });

  // A pair far apart for most people and alike for one kind of colour blindness: a green and a red of the same lightness
  it.each([
    ["protan", "#006c00", "#fc180c", "deutan"],
    ["deutan", "#00900c", "#d80030", "protan"],
  ])("fails when two series look alike with %s vision (under 0.05 apart) though they are 0.08 apart or more for everyone", (vision, a, b, other) => {
    const [x, y] = [parseColor(a), parseColor(b)];
    expect(contrast.colorDistance(x, y), "the fixture is far apart for everyone").toBeGreaterThanOrEqual(0.08);
    expect(contrast.colorDistance(x, y, vision), `the fixture is alike with ${vision}`).toBeLessThan(0.05);
    expect(contrast.colorDistance(x, y, other), `the fixture is told apart with ${other}`).toBeGreaterThanOrEqual(0.05);
    // They keep 3:1 on every surface and 2:1 on the track, and are told from the other four series by everyone, so only the rule of vision can fail
    const palette = { ...VALID, "chart-4": a, "chart-5": b };
    expect(failing(palette)).toEqual([]);
    for (const name of ["chart-1", "chart-2", "chart-3", "chart-6"]) {
      for (const c of [x, y]) {
        const fixed = parseColor(VALID[name]);
        expect(contrast.colorDistance(c, fixed), `${name} apart`).toBeGreaterThanOrEqual(0.08);
        for (const v of ["protan", "deutan"]) expect(contrast.colorDistance(c, fixed, v), `${name} apart as ${v}`).toBeGreaterThanOrEqual(0.05);
      }
    }
    const done = runCheckContrast(palette);
    expect(done.code, done.output).toBe(1);
    expect(done.failures.some((l) => names(l, "chart-4", "chart-5")), done.output).toBe(true);
  });
});

/* ---- The docs ------------------------------------------------------------------------ */

const COLOUR_ROUTE = "/docs/tokens/color/";
const es = site.docsI18n.byCode.get("es");
const PAGES = [
  ["en", (route) => site.byRoute.get(route)],
  ["es", (route) => es.pages.get(route)],
];

describe.each(PAGES)("the colour page, %s", (lang, pageOf) => {
  const body = pageOf(COLOUR_ROUTE).body;
  const cards = [...body.matchAll(/<li class="docs-token" id="luz-([\w-]+)">([\s\S]*?)<\/li>/g)];

  it("lists every semantic colour in source order, the eight of the charts last", () => {
    expect(cards.map((m) => `--luz-${m[1]}`)).toEqual(colorTokens());
    expect(cards.slice(-8).map((m) => `--luz-${m[1]}`)).toEqual(TOKENS);
  });

  it("puts the eight cards under a 'Charts (8)' group, after the code-syntax group", () => {
    const heads = [...body.matchAll(/<h2 id="([\w-]+)" class="docs-subhead">([^<]+)<\/h2>/g)];
    const last = heads.at(-1);
    expect(last[2], "the last group").toMatch(lang === "en" ? /^Charts \(8\)$/ : /\(8\)$/);
    const group = body.slice(body.indexOf(last[0])).split("</ul>")[0];
    expect([...group.matchAll(/<li class="docs-token" id="luz-([\w-]+)">/g)].map((m) => `--luz-${m[1]}`)).toEqual(TOKENS);
    const codeGroup = body.slice(body.indexOf(heads.at(-2)[0]), body.indexOf(last[0]));
    expect(codeGroup).toContain('id="luz-code-literal"');
    expect(codeGroup).not.toContain("luz-chart-");
  });

  it("shows each chart colour with its value in light, dark and high contrast, as text", () => {
    for (const [, name, card] of cards.slice(-8)) {
      expect(card, name).toMatch(new RegExp(`<code class="u-select-all">--luz-${name}</code>\\s*<span class="docs-token__role">[^<]{8,}</span>`));
      const modes = [...card.matchAll(/<span class="docs-swatch" data-theme="([\w-]+)" style="--v: var\(--luz-([\w-]+)\)"><\/span>([^<]+)<code>([^<]+)<\/code>/g)];
      expect(modes.map((m) => [m[1], m[2], m[4]]), name).toEqual(MODES.map((mode) => [mode, name, resolveColor(mode, name)]));
    }
  });

  it("counts the semantic colours and their groups from the sources, not from what someone typed", () => {
    const summary = body.match(/<summary>([\s\S]*?)<\/summary>/)[1];
    expect(Number(summary.match(/<span data-count="semantic">(\d+)<\/span>/)[1])).toBe(colorTokens().length);
    const groups = [...body.matchAll(/class="docs-subhead"/g)].length;
    expect(Number(summary.match(/\b(\d+) (?:groups|grupos)\b/)[1])).toBe(groups);
  });
});

describe.each(PAGES)("the themes page, %s, lists the eight chart tokens", (lang, pageOf) => {
  it("names each of them once in its table of semantic tokens", () => {
    const body = pageOf("/docs/tokens/themes/").body;
    const table = body.slice(body.indexOf('<table'), body.indexOf("</table>", body.indexOf("--luz-surface-page")));
    for (const token of TOKENS) expect(table.split(`<code>${token}</code>`).length - 1, token).toBe(1);
  });
});

describe.each(PAGES)("the Figma page, %s, says how many semantic colours the file has", (lang, pageOf) => {
  it("says as many as semantic.css has, with the chart colours among them", () => {
    const body = pageOf("/docs/tokens/figma/").body;
    const said = body.match(/<a href="\/docs\/tokens\/color\/">(\d+) (?:colours|colores)<\/a>/);
    expect(said, "a link to the colours with their count").toBeTruthy();
    expect(Number(said[1])).toBe(colorTokens().length);
    expect(colorTokens()).toEqual(expect.arrayContaining(TOKENS));
  });
});

describe("the Spanish pages of the palette follow the English ones", () => {
  it.each(["color", "figma", "themes"])("tokens/%s: its source is the hash of the English body, so it is not stale", (slug) => {
    const route = `/docs/tokens/${slug}/`;
    const page = es.pages.get(route);
    expect(page, `a Spanish page for ${route}`).toBeTruthy();
    expect(page.stale, `${page.file} is stale: pnpm check:i18n prints the right source`).toBe(false);
  });
});

/* ---- DESIGN.md and the changeset ------------------------------------------------------ */

describe("the changeset of the palette", () => {
  it("is .changeset/chart-palette.md and names the tokens and the check packages", () => {
    const text = read(".changeset/chart-palette.md");
    const front = text.match(/^---\n([\s\S]*?)\n---/)[1];
    expect(front).toMatch(/^"@luz-ds\/tokens": (?:patch|minor|major)$/m);
    expect(front).toMatch(/^"@luz-ds\/check": (?:patch|minor|major)$/m);
    expect(text.replace(/^---[\s\S]*?---/, "").trim().length).toBeGreaterThan(40);
  });
});

describe("every token the palette names is a token", () => {
  it("the eight are defined once in each block, with no repeats", () => {
    for (const mode of MODES) {
      const block = blocksOf(read("packages/tokens/src/semantic.css")).find((b) => (mode === "light" ? b.selector.startsWith(":root,") : b.selector.startsWith(`[data-theme="${mode}"],`)));
      const declared = block.props.map(([name]) => name);
      for (const name of NAMES) expect(declared.filter((d) => d === `--luz-${name}`), `${mode}: ${name}`).toHaveLength(1);
    }
  });
});
