/**
 * The files of the new home (F5 of .claude/plans/luz-home-docs-identity.md,
 * section 3.6): what apps/landing/landing.js and landing.css may and may not
 * hold. The page itself is tests/landing.spec.js; the numbers in its copy are
 * tests/landing-numbers.test.js; the catalogs are tests/landing-i18n.test.js.
 *
 *  - landing.js has no mode logic: <luz-color-mode> is the only writer of the colour
 *    mode and of the light (F2); the page asks it to preview, and listens to it.
 *  - landing.css is the home's own and tokens only: no literal colour, no
 *    primitive colour token, and none of the rules the head of a section,
 *    the landing patterns of catalog (section.css, stat.css), already have.
 *  - the template links the stylesheets of the packages it builds on, and
 *    writes the sections of the map in order.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(repo, path), "utf-8");
/** Source without its comments, so a comment may talk about what the code must not do. */
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("apps/landing/landing.js: no mode logic", () => {
  const js = code(read("apps/landing/landing.js"));

  it("does not write the colour mode or the light, read the system's preferences, or keep a choice", () => {
    for (const forbidden of [
      /data-theme/,
      /data-light/,
      /dataset\.(theme|light)\b/,
      /localStorage|sessionStorage/,
      /matchMedia|prefers-color-scheme|prefers-contrast/,
      /\.mode\s*=[^=]/,
    ]) {
      expect(js, String(forbidden)).not.toMatch(forbidden);
    }
  });

  it("names the colour mode only as the radio of <luz-color-mode>, which it checks, and listens to luz-color-mode:change", () => {
    // The page never writes the mode: a box checks the footer's radio, and <luz-color-mode> applies and remembers it
    const names = [...js.matchAll(/\bluz-theme\b/g)].map((m) => js.slice(Math.max(0, m.index - 12), m.index + 12));
    expect(names.length).toBeGreaterThan(0);
    for (const around of names) expect(around, "luz-theme is the radio's name, never a key").toMatch(/input\[name=\\?["']luz-theme/);
    expect(js).toMatch(/\.click\(\)/);
    expect(js).toContain("luz-color-mode:change");
  });

  it("has no HTML sink", () => {
    expect(js).not.toMatch(/\binnerHTML\b|\bouterHTML\b|insertAdjacentHTML|document\.write|\beval\(|new Function/);
  });
});

describe("apps/landing/landing.css: the home's own, on tokens", () => {
  const css = code(read("apps/landing/landing.css"));
  const families = Object.keys(JSON.parse(read("packages/tokens/tokens.json")).color);

  it("has no literal colour", () => {
    // A mask reads the alpha of its stops, never the colour: those declarations are not colours on the page
    const painted = css.replace(/mask(?:-image)?\s*:[^;]*;/g, "");
    expect(painted).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(painted).not.toMatch(/(?<![\w-])(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\(/);
  });

  it("reads no primitive colour token: only the semantic ones", () => {
    for (const family of families) expect(css, family).not.toMatch(new RegExp(`--luz-${family}-\\d`));
  });

  it("does not redo the head of a section or the stat: they are catalog's (section.css, stat.css)", () => {
    for (const selector of [".landing-h2", ".landing-lead", ".landing-points", ".landing-point__title", ".luz-section__title", ".luz-section__eyebrow", ".luz-section__lead", ".luz-stat__value"]) {
      expect(css, selector).not.toContain(selector);
    }
  });

  it("only moves the hero's type to fit the first screen: its voice (family, weight, colour, leading) is the pattern's", () => {
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selector: selector.trim(), body }));
    const ofHero = rules.filter((rule) => /\.luz-hero__(title|lead)\b/.test(rule.selector));
    expect(ofHero.length).toBeGreaterThan(0);
    for (const rule of ofHero) {
      expect(rule.body, rule.selector).not.toMatch(/(?<![\w-])(?:font-family|font-weight|font-style|line-height|letter-spacing|color|text-transform)\s*:/);
      // A size is a step of the scale
      for (const [, value] of rule.body.matchAll(/(?<![\w-])font-size\s*:\s*([^;]+)/g)) expect(value, rule.selector).toMatch(/^var\(--luz-text-/);
    }
  });

  it("does not size the links of the footer's columns: the pattern gives them their block size (24 px)", () => {
    // Every rule whose selector names a footer column, and what it declares
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selector: selector.trim(), body }));
    const ofColumn = rules.filter((rule) => rule.selector.includes(".luz-site-footer__col"));
    expect(ofColumn.length, "the file still styles the current language in the column").toBeGreaterThan(0);
    for (const rule of ofColumn) {
      expect(rule.body, rule.selector).not.toMatch(/(?<![\w-])(?:min-|max-)?(?:block-size|height)\s*:/);
    }
  });

  it("types no absolute font size: a step of the scale, or a multiple of the size around (em)", () => {
    expect(css).not.toMatch(/font-size:\s*[\d.]+(?:px|rem|pt|cm|mm|in|pc)\b/);
    expect(css).not.toMatch(/font-size:\s*[\d.]+\s*;/);
  });
});

describe("apps/landing/index.html: the template of the home", () => {
  const html = read("apps/landing/index.html");

  it("links the file of catalog of each landing pattern it uses before the home's own stylesheet, and keeps the light's (F5b: there is no landing.css)", () => {
    const at = (needle) => html.indexOf(needle);
    expect(at("/packages/landing/"), "the package landing is gone").toBe(-1);
    // Every class of the landing patterns (F8 names: hero, section, stat, glow, main, site-header, site-footer) the template and the partials it includes use is in a file the page links, and the file comes first
    const partials = ["header", "site-links", "prompt-dialog", "sky-filter", "footer"].map((name) => read(`apps/site/_partials/${name}.html`)).join("\n");
    const used = new Set([...(html + partials).matchAll(/\bluz-(?:hero|section|stat|glow|main|site-header|site-footer)(?:__|--)?[a-z0-9_-]*/g)].map((m) => m[0]));
    const classes = JSON.parse(read("packages/catalog/dist/classes.json")).classes;
    const files = new Set([...used].map((name) => classes.find((c) => c.name === name)?.files[0]).filter(Boolean));
    expect(used.size, "the home uses landing patterns").toBeGreaterThan(5);
    for (const name of used) expect(classes.find((c) => c.name === name), `${name} is a class of catalog`).toBeTruthy();
    expect(files.size).toBeGreaterThanOrEqual(3);
    for (const file of files) {
      expect(at(`/packages/catalog/dist/${file}"`), `${file} is linked`).toBeGreaterThan(-1);
      expect(at(`/packages/catalog/dist/${file}"`), `${file} comes before the home's own`).toBeLessThan(at("/apps/landing/landing.css"));
    }
    expect(at("/apps/landing/light/light.css")).toBeGreaterThan(-1);
  });

  it("writes the sections of the home in order: the hero and the light first, then the levels, why, native, modes and the FAQ", () => {
    const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));
    const ids = [...main.matchAll(/<section\b[^>]*\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(ids).toEqual(["hero", "light", "inside", "inside-2", "inside-3", "inside-4", "why", "native", "modes", "faq"]);
    expect(main.match(/<h1\b/g)).toHaveLength(1);
    expect(html, "no link to a section that went").not.toMatch(/href="#(?:fit|type|start)"/);
  });

  it("the first screen holds the hero and the light, and the hero's first action goes to the levels", () => {
    const first = html.slice(html.indexOf('class="landing-first"'), html.indexOf("</main>"));
    expect(first.indexOf('class="landing-first"')).toBe(0);
    const heroAt = first.search(/<section\b[^>]*\sid="hero"/);
    const lightAt = first.search(/<section\b[^>]*\sid="light"/);
    const insideAt = first.search(/<section\b[^>]*\sid="inside"/);
    expect(heroAt).toBeGreaterThan(-1);
    expect(lightAt).toBeGreaterThan(heroAt);
    const closes = first.indexOf("</div>", first.indexOf("</section>", lightAt));
    expect(closes, "the wrapper closes after the light and before the levels").toBeGreaterThan(lightAt);
    expect(closes).toBeLessThan(insideAt);
    expect(first.slice(heroAt, lightAt)).toContain('href="#inside"');
  });

  it("writes the two fit lists at the end of #why, each with its own h3 and its three items, no section of their own", () => {
    const why = html.slice(html.search(/<section\b[^>]*\sid="why"/));
    const body = why.slice(0, why.indexOf("</section>"));
    const fit = body.slice(body.indexOf('class="landing-fit"'));
    expect(fit.indexOf("{{t:fit.good}}")).toBeGreaterThan(-1);
    expect(fit.indexOf("{{t:fit.bad}}")).toBeGreaterThan(fit.indexOf("{{t:fit.good}}"));
    const lists = [...fit.matchAll(/<ul\b[\s\S]*?<\/ul>/g)].map((m) => m[0]);
    expect(lists).toHaveLength(2);
    for (const list of lists) expect(list.match(/<li>/g)).toHaveLength(3);
    // The marks are drawn, not read: the text of the item says it, and the picture is hidden
    for (const list of lists) for (const svg of list.match(/<svg\b[^>]*>/g)) expect(svg).toContain('aria-hidden="true"');
    expect(fit.match(/<h3\b/g)).toHaveLength(2);
    expect(body.indexOf('class="landing-why"'), "after the three words").toBeLessThan(body.indexOf('class="landing-fit"'));
    expect(html).not.toMatch(/<section\b[^>]*\sid="fit"/);
  });

  it("the type section went with its quote and its scale: nothing is left of it", () => {
    expect(html).not.toMatch(/<section\b[^>]*\sid="type"/);
    expect(html).not.toContain("type.scale");
    expect(html).not.toMatch(/landing-type__(scale|aa)/);
  });

  it("types no number, no version and no colour in the copy: the counts are {n:…} in the catalogs, the version is the build's", () => {
    expect(html).not.toMatch(/data-count/);
    expect(html).not.toMatch(/style="[^"]*(#[0-9a-fA-F]{3,8}|rgb\(|hsl\()/);
  });

  it("the three boxes of #modes are scopes: data-theme on a div, one each, a picture hidden from the tree", () => {
    const modes = html.slice(html.search(/<section\b[^>]*\sid="modes"/), html.indexOf("</main>"));
    for (const mode of ["light", "dark", "high-contrast"]) {
      expect(modes.match(new RegExp(`<div\\b[^>]*\\sdata-theme="${mode}"`, "g")) ?? [], mode).toHaveLength(1);
    }
    const pictures = modes.match(/<div class="landing-cut__picture"[^>]*>/g);
    expect(pictures).toHaveLength(3);
    for (const picture of pictures) expect(picture).toMatch(/\binert\b[^>]*aria-hidden="true"/);
  });

  it("each box has a button for its mode, hidden until the script runs: it needs JavaScript, so it is not there without", () => {
    const modes = html.slice(html.search(/<section\b[^>]*\sid="modes"/), html.indexOf("</main>"));
    const buttons = [...modes.matchAll(/<button\b[^>]*>/g)].map((m) => m[0]);
    expect(buttons.map((tag) => tag.match(/data-apply-mode="([^"]+)"/)?.[1])).toEqual(["light", "dark", "high-contrast"]);
    for (const tag of buttons) {
      expect(tag).toContain('type="button"');
      expect(tag).toContain('aria-pressed="false"');
      expect(tag).toMatch(/\shidden\b/);
      expect(tag).toContain("data-needs-js");
    }
  });
});
