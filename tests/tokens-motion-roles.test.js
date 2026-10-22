/**
 * LUZ — motion, typography roles and breakpoints are design decisions, so
 * they belong to @luz-ds/tokens and not to core's settings:
 *
 *   duration   six steps, --luz-duration-*, zeroed under prefers-reduced-motion
 *   easing     five curves, --luz-easing-*
 *   role       --luz-font-heading, --luz-font-body, --luz-text-body; both
 *              faces take the sans on :where(:lang(ar))
 *   breakpoint six widths, --luz-mq-*
 *
 * They are groups of packages/tokens/tokens.json, written into the built
 * stylesheets of @luz-ds/tokens (layer luz.tokens) and exported in DTCG.
 * What stays in core's settings is core's own machinery (z-index, layout
 * widths, the bar, the scrollbar, the size of a form field). The values did
 * not change with the move: the lists below are the ones core's settings
 * declared before it. What a browser computes from them is
 * tests/tokens-motion-roles.spec.js. Run after `pnpm tokens:build`.
 */
import { afterAll, describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { run as luzTokens } from "../packages/tokens/lib/cli.js";
import { buildDtcg } from "../scripts/tokens-dtcg.js";
import { check, ofRule } from "./helpers/check-run.js";
import { miniSnapshot, put, removeWorkspaces } from "./helpers/check-fixtures.js";

afterAll(removeWorkspaces);

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(root, path), "utf-8");
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

/* ---- The values, as core's settings declared them ------------------------------------------- */

const DURATIONS = { instant: "0.05s", fast: "0.1s", base: "0.2s", slow: "0.3s", slower: "0.5s", lazy: "0.8s" };
const EASINGS = {
  standard: "cubic-bezier(0.3, 0, 0.1, 1)",
  enter: "cubic-bezier(0.15, 0.6, 0.3, 1)",
  exit: "cubic-bezier(0.5, 0, 0.85, 0.4)",
  spring: "cubic-bezier(0.3, 1.35, 0.55, 1)",
  linear: "linear",
};
const BREAKPOINTS = { sm: "640px", md: "768px", lg: "1024px", xl: "1280px", xxl: "1536px", xxxl: "1920px" };
const ROLES = {
  "--luz-font-heading": "var(--luz-font-serif)",
  "--luz-font-body": "var(--luz-font-serif)",
  "--luz-text-body": "calc(var(--luz-text-base) * 1.0625)",
};

/** Expected `--luz-*` → value for the unreduced :root. */
const EXPECTED = {
  ...Object.fromEntries(Object.entries(DURATIONS).map(([k, v]) => [`--luz-duration-${k}`, v])),
  ...Object.fromEntries(Object.entries(EASINGS).map(([k, v]) => [`--luz-easing-${k}`, v])),
  ...Object.fromEntries(Object.entries(BREAKPOINTS).map(([k, v]) => [`--luz-mq-${k}`, v])),
  ...ROLES,
};

/** What core's settings keep: its own machinery, not design decisions. */
const STAYS = ["--luz-z-base", "--luz-z-raised", "--luz-z-overlay", "--luz-sidebar-width", "--luz-content-max", "--luz-bar-h", "--luz-scrollbar-size", "--luz-text-control"];

/* ---- CSS readers (no parser: the output of the generator is regular) ------------------------ */

/** The top level of a stylesheet: [{ prelude, body }] with nested blocks kept whole in `body`. */
function topLevel(css) {
  const text = strip(css);
  const out = [];
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf("{", i);
    const semi = text.indexOf(";", i);
    if (open === -1) break;
    if (semi !== -1 && semi < open) {
      i = semi + 1;
      continue;
    }
    let depth = 1;
    let j = open + 1;
    while (depth && j < text.length) {
      depth += text[j] === "{" ? 1 : text[j] === "}" ? -1 : 0;
      j++;
    }
    out.push({ prelude: text.slice(i, open).replace(/\s+/g, " ").trim(), body: text.slice(open + 1, j - 1) });
    i = j;
  }
  return out;
}
const decls = (body) => new Map([...body.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+?)\s*(?:;|$)/g)].map(([, name, value]) => [name, value.replace(/\s+/g, " ").trim()]));
/** White space and a leading zero are the minifier's to drop: compare without them */
const flat = (css) => css.replace(/\s+/g, "").replace(/(^|[^\d])\.(\d)/g, "$10.$2");

/** The layer block of a built file: its rules, whether the file is minified or not. */
function rulesOf(css) {
  const layer = topLevel(css).find((item) => /^@layer luz\.tokens$/.test(item.prelude));
  return layer ? topLevel(layer.body) : topLevel(css);
}
const rootDecls = (css) => new Map(rulesOf(css).filter((r) => r.prelude === ":root").flatMap((r) => [...decls(r.body)]));

const BUILT = ["luz-tokens.css", "luz-tokens.min.css", "tokens.css", "tokens.min.css"];
const built = BUILT.every((file) => existsSync(resolve(root, "packages/tokens/dist", file)));

/* ---- tokens.json: the source ----------------------------------------------------------------- */

describe("tokens.json holds motion, roles and breakpoints", () => {
  const tokens = JSON.parse(read("packages/tokens/tokens.json"));

  it("has the groups role, breakpoint, duration and easing", () => {
    for (const group of ["role", "breakpoint", "duration", "easing"]) expect(Object.keys(tokens), group).toContain(group);
  });

  it("has the six durations, five easings and six breakpoints, with the values of before", () => {
    expect(Object.fromEntries(Object.entries(tokens.duration).map(([k, t]) => [k, t.value]))).toEqual(DURATIONS);
    expect(Object.fromEntries(Object.entries(tokens.easing).map(([k, t]) => [k, t.value]))).toEqual(EASINGS);
    expect(Object.fromEntries(Object.entries(tokens.breakpoint).map(([k, t]) => [k, t.value]))).toEqual(BREAKPOINTS);
  });

  it("has the three roles, the faces as the serif and the Arabic switch as the sans", () => {
    expect(Object.keys(tokens.role).sort()).toEqual(["font-body", "font-heading", "text-body"]);
    for (const key of ["font-heading", "font-body"]) {
      expect(tokens.role[key].type, key).toBe("fontFamily");
      expect(tokens.role[key].from, key).toBe("var(--luz-font-serif)");
      expect(tokens.role[key].lang?.ar, key).toBe("var(--luz-font-sans)");
    }
    expect(tokens.role["text-body"].from).toBe("calc(var(--luz-text-base) * 1.0625)");
  });
});

/* ---- The built stylesheets of tokens --------------------------------------------------------- */

describe.skipIf(!built)("the built stylesheets of @luz-ds/tokens carry them", () => {
  for (const file of BUILT) {
    describe(file, () => {
      const css = built ? read(`packages/tokens/dist/${file}`) : "";

      it("declares every duration, easing, breakpoint and role on :root, with the value of before", () => {
        const declared = rootDecls(css);
        for (const [name, value] of Object.entries(EXPECTED)) {
          expect(declared.has(name), `${name} on :root`).toBe(true);
          expect(flat(declared.get(name)), name).toBe(flat(value));
        }
      });

      it("zeroes every duration, and only the durations, under prefers-reduced-motion: reduce", () => {
        const blocks = rulesOf(css).filter((r) => flat(r.prelude) === "@media(prefers-reduced-motion:reduce)");
        expect(blocks, "one reduced-motion block").toHaveLength(1);
        const inner = topLevel(blocks[0].body);
        expect(inner.map((r) => r.prelude)).toEqual([":root"]);
        const zeroed = decls(inner[0].body);
        expect([...zeroed.keys()].sort()).toEqual(Object.keys(DURATIONS).map((k) => `--luz-duration-${k}`).sort());
        for (const [name, value] of zeroed) expect(value, name).toMatch(/^0m?s$/);
      });

      it("switches both faces to the sans on :where(:lang(ar)), a selector of specificity 0", () => {
        const rules = rulesOf(css).filter((r) => r.prelude.includes(":lang("));
        expect(rules.map((r) => r.prelude.replace(/\s+/g, ""))).toEqual([":where(:lang(ar))"]);
        const set = decls(rules[0].body);
        expect([...set.keys()].sort()).toEqual(["--luz-font-body", "--luz-font-heading"]);
        for (const [name, value] of set) expect(value, name).toBe("var(--luz-font-sans)");
      });

      it("keeps all of it in the luz.tokens layer, with nothing outside a layer", () => {
        const outside = topLevel(css).filter((item) => !/^@(layer|font-face)\b/.test(item.prelude));
        expect(outside.map((item) => item.prelude)).toEqual([]);
        expect(topLevel(css).some((item) => item.prelude === "@layer luz.tokens")).toBe(true);
      });
    });
  }
});

/* ---- Core's settings ------------------------------------------------------------------------- */

describe("core's settings no longer declare them", () => {
  const settings = strip(read("packages/core/src/settings/_settings.css"));
  const declared = new Set([...settings.matchAll(/(--luz-[\w-]+)\s*:/g)].map((m) => m[1]));

  it("declares none of the durations, easings, breakpoints and roles", () => {
    expect([...declared].filter((name) => Object.hasOwn(EXPECTED, name))).toEqual([]);
  });

  it("has neither the reduced-motion switch nor the Arabic font rule any more", () => {
    expect(settings).not.toMatch(/prefers-reduced-motion/);
    expect(settings).not.toMatch(/:lang\(/);
  });

  it("still declares what is core's own: z-index, layout widths, the bar, the scrollbar and the field text size", () => {
    for (const name of STAYS) expect(declared.has(name), name).toBe(true);
    expect(settings).toMatch(/\(pointer: coarse\)/);
  });

  it.skipIf(!existsSync(resolve(root, "packages/core/dist/luz.css")))("core's built luz.css declares none of them either, and its components still read them", () => {
    const css = strip(read("packages/core/dist/luz.css"));
    const names = Object.keys(EXPECTED);
    const declaredInCore = [...css.matchAll(/(--luz-[\w-]+)\s*:/g)].map((m) => m[1]).filter((name) => names.includes(name));
    expect(declaredInCore).toEqual([]);
    expect(css).toMatch(/var\(--luz-duration-base\)/);
  });
});

/* ---- DTCG -------------------------------------------------------------------------------------- */

describe("the DTCG export has them in primitives", () => {
  const tokens = JSON.parse(read("packages/tokens/tokens.json"));
  const dtcg = buildDtcg(tokens, read("packages/tokens/src/semantic.css"));

  it("has the durations as DTCG durations and the easings as cubic Béziers", () => {
    for (const [key, value] of Object.entries(DURATIONS)) {
      expect(dtcg.primitives.duration[key], key).toMatchObject({ $type: "duration", $value: { value: Number(value.replace("s", "")), unit: "s" } });
    }
    expect(dtcg.primitives.easing.standard).toMatchObject({ $type: "cubicBezier", $value: [0.3, 0, 0.1, 1] });
    expect(dtcg.primitives.easing.linear).toMatchObject({ $type: "cubicBezier", $value: [0, 0, 1, 1] });
    expect(Object.keys(dtcg.primitives.easing).sort()).toEqual(Object.keys(EASINGS).sort());
  });

  it("has the breakpoints as dimensions", () => {
    for (const [key, value] of Object.entries(BREAKPOINTS)) {
      expect(dtcg.primitives.mq[key], key).toMatchObject({ $type: "dimension", $value: { value: Number(value.replace("px", "")), unit: "px" } });
    }
  });

  it("has the two faces as aliases of the serif, not copies of its stack", () => {
    expect(dtcg.primitives.font.serif.$type).toBe("fontFamily");
    expect(dtcg.primitives.font.heading.$value).toBe("{primitives.font.serif}");
    expect(dtcg.primitives.font.body.$value).toBe("{primitives.font.serif}");
  });

  it("has the body size", () => {
    expect(dtcg.primitives.text.body.$type).toBe("dimension");
  });
});

/* ---- The reduced-motion rule is not an ignored condition -------------------------------------- */

describe("luz-tokens check-contrast and luz-check do not report the reduced-motion rule as ignored", () => {
  const TOKENS_CSS = resolve(root, "packages/tokens/dist/tokens.css");
  const MOTION = "@media (prefers-reduced-motion: reduce) {\n  :root {\n    --luz-duration-fast: 0s;\n    --luz-duration-base: 0s;\n  }\n}\n";
  const tokensSays = (name, css) => {
    const result = luzTokens(["check-contrast", name, "--json"], { tokensPath: TOKENS_CSS, read: (path) => (path === name ? css : readFileSync(path, "utf-8")) });
    return JSON.parse(result.stdout);
  };

  it("luz-tokens over LUZ's own tokens has no ignored entry for the reduced-motion rule", () => {
    const report = tokensSays("own.css", read("packages/tokens/dist/tokens.css"));
    expect(report.ok).toBe(true);
    expect(report.ignored.filter((item) => /reduced-motion/.test(item.reason))).toEqual([]);
  });

  it("luz-tokens over a stylesheet with a reduced-motion rule that sets only durations has no ignored entry", () => {
    const report = tokensSays("motion.css", MOTION);
    expect(report.ignored).toEqual([]);
  });

  it("luz-tokens still reports a reduced-motion rule that sets a colour: that one is a condition it does not evaluate", () => {
    const report = tokensSays("motion-colour.css", "@media (prefers-reduced-motion: reduce) {\n  :root {\n    --luz-duration-base: 0s;\n    --luz-text-secondary: #999999;\n  }\n}\n");
    expect(report.ignored.map((item) => item.reason).join("\n")).toMatch(/prefers-reduced-motion/);
  });

  it("luz-tokens still reports another media condition (a width) as ignored", () => {
    const report = tokensSays("width.css", "@media (min-width: 40em) {\n  :root {\n    --luz-text-secondary: #999999;\n  }\n}\n");
    expect(report.ignored).toHaveLength(1);
  });

  it("luz-check over LUZ's own tokens as the project's stylesheet says nothing about an ignored rule", () => {
    const snapshot = miniSnapshot();
    put(snapshot, "tokens/tokens.css", read("packages/tokens/dist/tokens.css"));
    const result = check({ "own.css": read("packages/tokens/dist/tokens.css") + MOTION }, { argv: ["own.css"], snapshot });
    expect(ofRule(result, "theme/advisory")).toEqual([]);
  });
});
