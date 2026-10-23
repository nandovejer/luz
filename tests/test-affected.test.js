/**
 * scripts/test-affected.js: from the files a change touches, which checks run.
 * plan() sorts the files; commands() turns the plan into the steps, cheapest
 * first. `hasFile` is injected, so no test reads the disk.
 */
import { describe, expect, it } from "vitest";
import { commands, plan } from "../scripts/test-affected.js";

const none = () => false;
const only = (...paths) => (p) => paths.includes(p);

describe("plan(): what a change touches", () => {
  it("ignores generated paths (dist/, docs/, .claude/)", () => {
    const p = plan(
      ["dist/luz.css", "docs/index.html", ".claude/plans/x.md"],
      none,
    );
    expect(p.lintJs).toEqual([]);
    expect(p.lintCss).toEqual([]);
    expect(p.unit).toEqual([]);
    expect(p.specs).toEqual([]);
    expect(p.unmapped).toEqual([]);
  });

  it("ignores a dist/ or node_modules/ folder at any depth", () => {
    const p = plan(
      ["packages/core/dist/luz.css", "packages/core/dist/luz.js", "packages/catalog/node_modules/x/index.js"],
      none,
    );
    expect(p.lintJs).toEqual([]);
    expect(p.lintCss).toEqual([]);
    expect(p.unit).toEqual([]);
    expect(p.specs).toEqual([]);
    expect(p.unmapped).toEqual([]);
  });

  it("sends a tests/*.spec.js to the specs", () => {
    const p = plan(["tests/button.spec.js"], none);
    expect(p.specs).toEqual(["tests/button.spec.js"]);
    expect(p.unit).toEqual([]);
  });

  it("sends a tests/*.test.js to the unit tests", () => {
    const p = plan(["tests/layers.test.js"], none);
    expect(p.unit).toEqual(["tests/layers.test.js"]);
    expect(p.specs).toEqual([]);
  });

  it("maps a component stylesheet to the spec of the same name when it exists", () => {
    const p = plan(["packages/core/src/components/button.css"], only("tests/button.spec.js"));
    expect(p.specs).toEqual(["tests/button.spec.js"]);
    expect(p.unmapped).toEqual([]);
  });

  it("reports a component stylesheet with no spec as unmapped, and guesses nothing", () => {
    const p = plan(["packages/core/src/components/widget.css"], none);
    expect(p.unmapped).toEqual(["packages/core/src/components/widget.css"]);
    expect(p.specs).toEqual([]);
  });

  it("maps a docs page to tests/<area>-<slug>.spec.js", () => {
    const p = plan(["apps/docs/pages/components/card.html"], only("tests/components-card.spec.js"));
    expect(p.specs).toEqual(["tests/components-card.spec.js"]);
    expect(p.unmapped).toEqual([]);
  });

  it("lints a scripts/*.js change and runs the unit tests, never unmapped", () => {
    const p = plan(["scripts/check-size.js"], none);
    expect(p.lintJs).toContain("scripts/check-size.js");
    expect(p.unit).toContain("scripts/check-size.js");
    expect(p.unmapped).toEqual([]);
  });

  it("lints a stylesheet with stylelint", () => {
    const p = plan(["packages/core/src/components/button.css"], none);
    expect(p.lintCss).toEqual(["packages/core/src/components/button.css"]);
  });

  it("lists a file once however many times it is changed", () => {
    const p = plan(["tests/button.spec.js", "tests/button.spec.js"], none);
    expect(p.specs).toEqual(["tests/button.spec.js"]);
  });
});

describe("commands(): the steps of a plan", () => {
  const full = {
    lintJs: ["scripts/a.js"],
    lintCss: ["packages/core/src/components/a.css"],
    unit: ["tests/a.test.js"],
    specs: ["tests/a.spec.js"],
    unmapped: [],
  };

  it("returns nothing for an empty plan", () => {
    const empty = { lintJs: [], lintCss: [], unit: [], specs: [], unmapped: [] };
    expect(commands(empty)).toEqual([]);
  });

  it("runs eslint, stylelint, unit, then playwright", () => {
    expect(commands(full).map(([name]) => name)).toEqual(["eslint", "stylelint", "unit", "playwright"]);
  });

  it("runs Playwright on chromium and chromium-nojs with 3 workers, on the specs", () => {
    const [, argv] = commands(full).find(([name]) => name === "playwright");
    expect(argv).toEqual(expect.arrayContaining(["--project=chromium", "--project=chromium-nojs", "--workers=3"]));
    expect(argv).toContain("tests/a.spec.js");
    expect(argv.some((a) => a.startsWith("--project=firefox") || a.startsWith("--project=webkit"))).toBe(false);
  });

  it("leaves out the steps with nothing to run", () => {
    const names = commands({ ...full, lintJs: [], lintCss: [], specs: [] }).map(([name]) => name);
    expect(names).toEqual(["unit"]);
  });
});
