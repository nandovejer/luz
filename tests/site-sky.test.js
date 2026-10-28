/**
 * The sky behind the home page and the docs (apps/site/sky.css): what the
 * files are and who may define it. How it looks and moves is in
 * tests/site-sky.spec.js.
 *
 *   apps/site/sky.css                   the stars, once; by day the sky draws nothing (the clouds went)
 *   apps/site/_partials/sky-filter.html the SVG filter the clouds used (#site-sky-clouds), still included
 *   the home                            `class="... site-sky"` on <main>, the partial at its end
 *   the docs layout                     `class="... site-sky"` on <body>, the partial included
 *
 * The home and the docs only add to it: the home starts the twinkle through two
 * custom properties, the docs cap the opacity of the layers. Neither draws a star.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/** The text of a file, or "" when it is not there, so a missing file fails an assertion and not the whole suite. */
const read = (rel) => (existsSync(join(repo, rel)) ? readFileSync(join(repo, rel), "utf-8") : "");
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

/** [selector, declarations] of every innermost rule of a stylesheet. */
function rules(rel) {
  return [...stripComments(read(rel)).matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => [
    selector.trim().replace(/\s+/g, " "),
    body
      .split(";")
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => d.slice(0, d.indexOf(":")).trim()),
  ]);
}

describe("the files of the sky exist", () => {
  it("apps/site/sky.css exists and is not empty", () => {
    expect(existsSync(join(repo, "apps/site/sky.css"))).toBe(true);
    expect(read("apps/site/sky.css").length).toBeGreaterThan(500);
  });

  it("the partial sky-filter holds the filter #site-sky-clouds, hidden from the accessibility tree", () => {
    const file = "apps/site/_partials/sky-filter.html";
    expect(existsSync(join(repo, file))).toBe(true);
    const html = read(file);
    expect(html).toMatch(/<filter\b[^>]*\bid="site-sky-clouds"/);
    expect(html).toMatch(/<svg\b[^>]*\baria-hidden="true"/);
  });

  it("no partial of the docs app has the same name (a name in both folders fails the build)", () => {
    expect(existsSync(join(repo, "apps/docs/_partials/sky-filter.html"))).toBe(false);
  });
});

describe("the pages that have the sky", () => {
  it("the home: main has the class site-sky, and the partial is the last thing in it", () => {
    const html = read("apps/landing/index.html");
    const main = html.match(/<main\b[^>]*>/)?.[0] ?? "";
    expect(main).toMatch(/\bclass="[^"]*\bsite-sky\b/);
    expect(html.match(/\bsite-sky\b(?!-)/g)?.length, "the class is on one element only").toBe(1);
    expect(html).toMatch(/<!-- luz:include sky-filter -->\s*<\/main>/);
  });

  it("the docs layout: body has the class site-sky, and includes the partial", () => {
    const html = read("apps/docs/_layouts/page.html");
    expect(html.match(/<body\b[^>]*>/)?.[0] ?? "").toMatch(/\bclass="[^"]*\bsite-sky\b/);
    expect(html).toMatch(/<!-- luz:include sky-filter -->/);
    expect(html.indexOf("luz:include sky-filter"), "inside <body>").toBeGreaterThan(html.indexOf("<body"));
  });

  it.each(["apps/docs/_layouts/page.html", "apps/landing/index.html"])("%s links /apps/site/sky.css", (file) => {
    expect(/<link\b[^>]*rel="stylesheet"[^>]*href="\/apps\/site\/sky\.css"/.test(read(file))).toBe(true);
  });

  it("the stylesheet comes before the page's own, so the home and the docs can add to it", () => {
    for (const [file, own] of [
      ["apps/docs/_layouts/page.html", "/apps/docs/reference.css"],
      ["apps/landing/index.html", "/apps/landing/landing.css"],
    ]) {
      const html = read(file);
      expect(html.indexOf("/apps/site/sky.css"), file).toBeGreaterThan(-1);
      expect(html.indexOf("/apps/site/sky.css"), file).toBeLessThan(html.indexOf(own));
    }
  });
});

describe("the sky is defined once, in apps/site/sky.css", () => {
  const sky = stripComments(read("apps/site/sky.css"));

  it("it draws the stars on the two layers, and by day (morning, afternoon, sunset over light) nothing: no clouds", () => {
    expect(sky).toMatch(/\.site-sky::before/);
    expect(sky).toMatch(/\.site-sky::after/);
    expect(sky).toMatch(/radial-gradient\(/);
    expect(sky).not.toMatch(/box-shadow:/);
    expect(sky).not.toMatch(/filter:\s*url\(/);
    expect(sky).toMatch(/\.site-sky::after\s*\{[^}]*display:\s*none/);
    const day = rules("apps/site/sky.css").filter(([selector]) => /data-light="morning"/.test(selector));
    expect(day.length, "a rule for the lights of the day").toBeGreaterThan(0);
    for (const [selector, declarations] of day) {
      expect(selector, "over light only").toContain('[data-theme="light"]');
      expect(declarations, selector).toEqual(["display"]);
    }
  });

  it("it is for the lights of the hour, never high contrast, and it switches off under forced colours", () => {
    expect(sky).toMatch(/data-light="night"/);
    expect(sky).toMatch(/data-light="afternoon"/);
    expect(sky).toMatch(/:not\(\[data-theme="high-contrast"\]\)|\[data-theme="light"\]/);
    expect(sky).toMatch(/@media \(forced-colors: active\)[\s\S]*display:\s*none/);
  });

  it("nothing in it moves on a clock: no infinite animation and no twinkle (the home asks for it)", () => {
    expect(sky).not.toMatch(/\binfinite\b/);
    expect(sky).not.toMatch(/landing-twinkle/);
    expect(sky).toMatch(/var\(--site-sky-twinkle-near/);
    expect(sky).toMatch(/var\(--site-sky-twinkle-far/);
  });

  it("it uses tokens only: no hex, rgb(), hsl() or named colour, and it is unlayered", () => {
    expect(sky).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(sky).not.toMatch(/\b(?:rgba?|hsla?|hwb|lab|lch)\(/);
    expect(sky).not.toMatch(/@layer\b/);
  });

  it("the home page does not redefine it: landing.css has no rule of its own on the layers, only the twinkle properties and its keyframes", () => {
    const css = stripComments(read("apps/landing/landing.css"));
    for (const [selector] of rules("apps/landing/landing.css")) {
      expect(selector, "a rule on the layers of the sky").not.toMatch(/\.luz-main::(?:before|after)|\.site-sky::(?:before|after)/);
    }
    expect(css).not.toMatch(/\.luz-main::/);
    expect(css).toMatch(/--site-sky-twinkle-near:/);
    expect(css).toMatch(/--site-sky-twinkle-far:/);
    expect(css).toMatch(/@keyframes landing-twinkle/);
    // no stars of its own: the dots of the sky are `radial-gradient(2px 2px at 45% 55%, …)`
    expect(css).not.toMatch(/radial-gradient\(\s*[\d.]+px [\d.]+px at/);
  });

  it("the docs do not redefine it: reference.css touches the layers of .site-sky for their opacity alone", () => {
    const onLayers = rules("apps/docs/reference.css").filter(([selector]) => /\.site-sky::(?:before|after)/.test(selector));
    expect(onLayers.length, "reference.css caps the layers").toBeGreaterThan(0);
    for (const [selector, declarations] of onLayers) expect(declarations, selector).toEqual(["opacity"]);
    const css = stripComments(read("apps/docs/reference.css"));
    expect(css).not.toMatch(/@keyframes site-sky|--site-sky-twinkle/);
  });

  it("the cap is 0.15 in the dark lights, and only there", () => {
    const css = stripComments(read("apps/docs/reference.css"));
    const cap = css.match(/([^{}]*\.site-sky::before[^{}]*\{[^{}]*opacity:\s*([\d.]+)\s*;[^{}]*\})/);
    expect(cap, "a rule caps the opacity").not.toBeNull();
    expect(Number(cap?.[2])).toBe(0.15);
    expect(cap?.[1]).toMatch(/data-light="night"/);
    expect(cap?.[1]).not.toMatch(/data-light="afternoon"/);
  });
});
