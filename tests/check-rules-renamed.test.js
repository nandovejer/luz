/**
 * The rule `names/renamed` of @luz-ds/check (plan ai-and-catalog-only, decision 69, phase F8): catalog 0.3 renamed
 * its classes, elements, files and chunks, and the old names do nothing, so a page that still writes one is told the
 * new name, not a guess. One finding for every row of the changeset's tables (tests/helpers/catalog-names.js):
 *
 *   - an old class: `names/renamed` (block), with the new class in the message and as the suggestion;
 *     `luz-cms-header` is `luz-site-header` with `--publication` (its own message), `luz-cms-header--masthead`
 *     and its parts are `luz-masthead`; a part and a modifier keep their name under the new block
 *   - an old element: `names/renamed:element`
 *   - a link or a script to an old file of catalog (a component stylesheet, the `mode` and `consent` chunks):
 *     `names/renamed:file`
 *   - an old class in a stylesheet: only a warning (`names/renamed:css`)
 *   - a page that links catalog 0.0 to 0.2, where the old names are the right ones: silent
 *   - the names of a kind of site that were never in the table (`luz-landing-qqq`) are plain unknown classes
 *
 * The facts are the build's (dist/data), as in tests/check-rules-load.test.js; the projects are temporary folders,
 * so no file of tests/fixtures/ is read.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { builtData, checkCase, fixtureCases, key } from "./helpers/check-fixtures.js";
import { CHUNKS, CLASSES, FILES, TAGS } from "./helpers/catalog-names.js";
import { check, links, linkTo, ofRule, page, rulesOf, wordsOf } from "./helpers/check-run.js";
import { checkModule } from "./helpers/check-modules.js";

const messages = await checkModule("messages");
const TOKENS = linkTo("tokens", "luz-tokens.min.css");
const CORE = linkTo("core", "luz.min.css");
const CDN = (version, file) => `  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@${version}/dist/${file}">`;
const SCRIPT = (version, file) => `  <script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@${version}/dist/${file}"></script>\n`;

let data;
beforeAll(async () => {
  const built = await builtData();
  expect(built.error, "the build writes dist/data").toBeNull();
  data = built.data;
});

const run = (body, head = links(TOKENS, CORE)) => check({ "index.html": page(body, head) }, { snapshot: data });
const renamed = (result) => ofRule(result, "names/renamed");

describe("names/renamed: an old class (table 1 of the changeset)", () => {
  it.each(CLASSES.filter(([, , publication]) => publication === undefined))("%s is now %s: blocks, at the class attribute, with the new class as the suggestion", (old, current) => {
    const body = `  <div class="${old}">x</div>`;
    const found = renamed(run(body));
    expect(found, old).toHaveLength(1);
    expect(found[0]).toMatchObject({ rule: "names/renamed", severity: "block", suggestion: `.${current}` });
    expect(found[0].message).toBe(messages.message("names/renamed", { name: old, current }));
    expect(found[0].message).toContain(`.${old}`);
    expect(found[0].message).toContain(`.${current}`);
    expect(wordsOf("names/renamed", found[0].message)).toBe(true);
    expect(found[0].docs).toBe(messages.docsUrl("names/renamed"));
    const at = body.split("\n").findIndex((l) => l.includes(`class="${old}"`)) + 10;
    expect(found[0].line).toBe(at);
  });

  it("luz-cms-header is the bar of a blog: luz-site-header with --publication, said in its own message", () => {
    const found = renamed(run('  <header class="luz-cms-header">x</header>'));
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ rule: "names/renamed", severity: "block", suggestion: ".luz-site-header" });
    expect(found[0].message).toBe(messages.message("names/renamed:publication", { name: "luz-cms-header", current: "luz-site-header" }));
    expect(found[0].message).toContain("--publication");
  });

  it("a part and a modifier keep their name under the new block: .luz-landing-hero__title is .luz-hero__title, .luz-docs-dodont__item--do is .luz-do-dont__item--do", () => {
    const found = renamed(run('  <h1 class="luz-landing-hero__title">x</h1><div class="luz-docs-dodont__item--do">y</div><p class="luz-cms-toc__list">z</p>'));
    expect(found.map((f) => f.suggestion)).toEqual([".luz-hero__title", ".luz-do-dont__item--do", ".luz-toc__list"]);
  });

  it("luz-cms-header--masthead is luz-masthead, and so are the parts the masthead had of its own (__top, __date, __sections)", () => {
    const found = renamed(run('  <header class="luz-cms-header luz-cms-header--masthead"><div class="luz-cms-header__top">a</div><time class="luz-cms-header__date">b</time><nav class="luz-cms-header__sections">c</nav></header>'));
    expect(found.map((f) => f.suggestion)).toEqual([".luz-masthead", ".luz-masthead__top", ".luz-masthead__date", ".luz-masthead__sections"]);
    expect(found.every((f) => f.rule === "names/renamed" && f.severity === "block")).toBe(true);
  });

  it("the parts luz-cms-header kept (__brand, __actions) are the site header's", () => {
    const found = renamed(run('  <header class="luz-cms-header"><a class="luz-cms-header__brand" href="/">x</a><div class="luz-cms-header__actions">y</div></header>'));
    expect(found.map((f) => f.suggestion)).toEqual([".luz-site-header", ".luz-site-header__brand", ".luz-site-header__actions"]);
  });

  it("says nothing of a current name: every block of the table is a class catalog knows", () => {
    const current = [...new Set(CLASSES.map(([, now]) => now))];
    const result = run(current.map((name) => `  <div class="${name}">x</div>`).join("\n"));
    expect(renamed(result)).toEqual([]);
    expect(rulesOf(result, "class/")).toEqual([]);
  });

  it("does not take a current name for an old one: luz-mode-switcher, luz-pagination and the property --luz-consent-h are not in the table", () => {
    const result = run('  <fieldset class="luz-mode-switcher"><span class="luz-mode-btn">x</span></fieldset><nav class="luz-pagination">y</nav>');
    expect(renamed(result)).toEqual([]);
  });

  it("is not about a name nobody had: luz-landing-qqq is an unknown class like any other, and the rule does not guess", () => {
    const result = run('  <p class="luz-landing-qqqqqqqqqq luz-cms-qqqqqqqqqq luz-app-qqqqqqqqqq luz-docs-qqqqqqqqqq">x</p>');
    expect(renamed(result)).toEqual([]);
    expect(ofRule(result, "class/unknown")).toHaveLength(4);
  });
});

describe("names/renamed: the name echoed is capped like every other name (64 characters)", () => {
  const OLD = "luz-landing-hero__";
  const named = (length) => OLD + "a1_-".repeat(40).slice(0, length - OLD.length);
  const sheet = (selector) => ({ "index.html": page('  <p class="o-stack">x</p>', links(TOKENS, CORE, '  <link rel="stylesheet" href="own.css">')), "own.css": `.promo ${selector} {\n  margin: 0;\n}\n` });
  // Unreadable: a control character, a zero-width or bidi control, or the BOM
  const readable = (text) => [...text].every((ch) => {
    const code = ch.codePointAt(0);
    return !(code <= 0x1f || (code >= 0x7f && code <= 0x9f) || (code >= 0x200b && code <= 0x200f) || (code >= 0x202a && code <= 0x202e) || (code >= 0x2066 && code <= 0x2069) || code === 0xfeff);
  });

  it("a class that has an old block but is 100 characters longer gets no names/renamed finding in a page: it is an unknown class with the capped echo", () => {
    const name = OLD + "a".repeat(100);
    const result = run(`  <h1 class="${name}">x</h1>`);
    expect(renamed(result)).toEqual([]);
    expect(ofRule(result, "class/unknown"), "the generic path says it").toHaveLength(1);
  });

  it("the same name in a stylesheet gets no names/renamed:css warning either", () => {
    const result = check(sheet(`.${OLD}${"a".repeat(100)}`), { snapshot: data });
    expect(renamed(result)).toEqual([]);
  });

  it("a name of 65 characters gets no names/renamed finding, and one of exactly 64 characters gets it, in a page and in a stylesheet", () => {
    expect(named(65)).toHaveLength(65);
    expect(named(64)).toHaveLength(64);
    expect(renamed(run(`  <h1 class="${named(65)}">x</h1>`))).toEqual([]);
    const found = renamed(run(`  <h1 class="${named(64)}">x</h1>`));
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ rule: "names/renamed", severity: "block", suggestion: `.luz-hero__${named(64).slice(OLD.length)}` });
    expect(renamed(check(sheet(`.${named(65)}`), { snapshot: data }))).toEqual([]);
    const css = renamed(check(sheet(`.${named(64)}`), { snapshot: data }));
    expect(css).toHaveLength(1);
    expect(css[0]).toMatchObject({ rule: "names/renamed", severity: "warn" });
  });

  it("no finding, from a page or from a stylesheet, has a suggestion over 64 characters or an unreadable one", () => {
    const long = OLD + "a1_-".repeat(40);
    const body = `  <h1 class="${long}">x</h1><h2 class="luz-cms-header__${"b".repeat(100)}">y</h2><p class="luz-cms-toc__list">z</p>`;
    const results = [run(body), check(sheet(`.${long}, .promo .luz-cms-header__${"b".repeat(100)}, .promo .luz-cms-toc__list`), { snapshot: data })];
    for (const result of results) {
      const suggested = result.findings.filter((f) => typeof f.suggestion === "string");
      expect(suggested.length, "the short renamed class still has its suggestion").toBeGreaterThan(0);
      for (const f of suggested) {
        expect(f.suggestion.length, `${f.rule}: ${f.suggestion.slice(0, 80)}`).toBeLessThanOrEqual(64);
        expect(readable(f.suggestion), `${f.rule}: readable`).toBe(true);
      }
    }
  });
});

describe("names/renamed: an old element (table 2)", () => {
  it.each(TAGS)("<%s> is now <%s>: blocks, at the tag, with the new tag in the message and as the suggestion", (old, current) => {
    const body = `  <${old}>x</${old}>`;
    const found = renamed(run(body));
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ rule: "names/renamed", severity: "block", suggestion: `<${current}>` });
    expect(found[0].message).toBe(messages.message("names/renamed:element", { tag: old, current }));
    expect(found[0].message).toContain(`<${old}>`);
    expect(found[0].message).toContain(`<${current}>`);
    expect(found[0].line).toBe(10);
  });

  it("says it once for a tag however often it is written, and the current tags say nothing", () => {
    expect(renamed(run("  <luz-mode>a</luz-mode><luz-mode>b</luz-mode>"))).toHaveLength(2);
    expect(renamed(run("  <luz-color-mode>a</luz-color-mode><luz-cookie-consent>b</luz-cookie-consent><luz-announcement>c</luz-announcement>"))).toEqual([]);
  });
});

describe("names/renamed: a link or a script to an old file of catalog (tables 2 and 3)", () => {
  // the stylesheets of the patterns; the three of the elements (consent, mode, banner) are below, with the chunks
  const unique = FILES.filter(([old]) => !["consent", "mode", "banner"].includes(old));

  it.each(unique)("components/%s.min.css is now components/%s.min.css: blocks, at the <link>, naming both", (old, current) => {
    const head = links(TOKENS, CORE, CDN("0.3.0", `components/${old}.min.css`));
    const found = renamed(run('  <p class="o-stack">x</p>', head));
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ rule: "names/renamed", severity: "block" });
    expect(found[0].message).toBe(messages.message("names/renamed:file", { name: `${old}.min.css`, current: `${current}.min.css` }));
    expect(found[0].message).toContain(`${old}.min.css`);
    expect(found[0].message).toContain(`${current}.min.css`);
    expect(found[0].line, "the third <link> of the head").toBe(8);
  });

  it.each([["consent", "cookie-consent"], ["banner", "announcement"], ["mode", "color-mode"]])("the stylesheet %s.css is %s.css, plain or minified, from a CDN, node_modules or the dev server", (old, current) => {
    for (const href of [`https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.3.0/dist/components/${old}.css`, `node_modules/@luz-ds/catalog/dist/components/${old}.min.css`, `/packages/catalog/dist/components/${old}.css`]) {
      const found = renamed(run('  <p class="o-stack">x</p>', links(TOKENS, CORE, `  <link rel="stylesheet" href="${href}">`)));
      expect(found, href).toHaveLength(1);
      expect(found[0].message, href).toContain(`${current}.`);
    }
  });

  it.each(CHUNKS)("the script %s.min.js is now %s.min.js", (old, current) => {
    const head = links(TOKENS, CORE, "") + SCRIPT("0.3.0", `${old}.min.js`);
    const found = renamed(run('  <p class="o-stack">x</p>', head));
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ rule: "names/renamed", severity: "block" });
    expect(found[0].message).toBe(messages.message("names/renamed:file", { name: `${old}.min.js`, current: `${current}.min.js` }));
  });

  it("says nothing of the current files, and nothing of a file that is not catalog's (a component called hero.css of the project's own)", () => {
    const head = links(TOKENS, CORE, CDN("0.3.0", "components/hero.min.css"), CDN("0.3.0", "components/cookie-consent.min.css"), '  <link rel="stylesheet" href="css/landing-hero.css">', '  <link rel="stylesheet" href="css/consent.css">');
    expect(renamed(run('  <p class="o-stack">x</p>', head))).toEqual([]);
  });

  it("says each old file once, however many pages link it", () => {
    const head = links(TOKENS, CORE, CDN("0.3.0", "components/landing-hero.min.css"));
    const result = check({ "a.html": page('  <p class="o-stack">a</p>', head), "b.html": page('  <p class="o-stack">b</p>', head) }, { snapshot: data });
    expect(renamed(result).map((f) => f.file).sort()).toEqual(["a.html", "b.html"]);
  });
});

describe("names/renamed: an old class in a stylesheet is a warning", () => {
  it("warns, with the same new name, for a selector that names an old class it does not define (names/renamed:css)", () => {
    const css = ".promo .luz-landing-hero__title {\n  margin: 0;\n}\n";
    const result = check({ "index.html": page('  <p class="o-stack">x</p>', links(TOKENS, CORE, '  <link rel="stylesheet" href="own.css">')), "own.css": css }, { snapshot: data });
    const found = renamed(result);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ rule: "names/renamed", severity: "warn", file: "own.css", line: 1, suggestion: ".luz-hero__title" });
    expect(found[0].message).toBe(messages.message("names/renamed:css", { name: "luz-landing-hero__title", current: "luz-hero__title" }));
    expect(result.code, "a warning does not fail the run").toBe(0);
  });

  it("is a block in a page and a warning in a stylesheet, as the variants of messages.js say", () => {
    expect(messages.MESSAGES["names/renamed"].severity).toBe("block");
    expect(messages.MESSAGES["names/renamed:css"].severity).toBe("warn");
    expect(messages.MESSAGES["names/renamed:publication"].severity).toBe("block");
    expect(messages.MESSAGES["names/renamed:element"].severity).toBe("block");
    expect(messages.MESSAGES["names/renamed:file"].severity).toBe("block");
  });
});

describe("names/renamed: a page that pins catalog 0.0 to 0.2 is told nothing (the old names are the right ones there)", () => {
  const PINNED = ["0.0.1", "0.1.0", "0.2.0", "0.2.9"];

  it.each(PINNED)("catalog@%s: an old class, an old tag and an old file are not told", (version) => {
    const head = links(TOKENS, CORE, CDN(version, "components/search.min.css"));
    const body = CLASSES.map(([old]) => `  <div class="${old}">x</div>`).join("\n") + "\n" + TAGS.map(([old]) => `  <${old}>x</${old}>`).join("\n");
    expect(renamed(run(body, head)), `catalog@${version}`).toEqual([]);
    const files = links(TOKENS, CORE, ...FILES.map(([old]) => CDN(version, `components/${old}.min.css`)), CDN(version, "mode.min.js"), CDN(version, "consent.min.js"));
    expect(renamed(run('  <p class="o-stack">x</p>', files)), `${version} files`).toEqual([]);
  });

  it("a script of the pinned release counts as a pin too", () => {
    const head = links(TOKENS, CORE) + SCRIPT("0.2.1", "catalog.min.js");
    expect(renamed(run('  <div class="luz-landing-hero">x</div><luz-mode>y</luz-mode>', head))).toEqual([]);
  });

  it.each(["0.3.0", "0.3.1", "0.10.0", "1.0.0"])("catalog@%s is told: the new names are the ones of that release", (version) => {
    const head = links(TOKENS, CORE, CDN(version, "components/search.min.css"));
    expect(renamed(run('  <div class="luz-landing-hero">x</div><luz-mode>y</luz-mode>', head))).toHaveLength(2);
  });

  it("is told when the page links no catalog at all: nothing says the old names are right", () => {
    expect(renamed(run('  <div class="luz-landing-hero">x</div>'))).toHaveLength(1);
  });
});

/* ---- The fixtures of tests/fixtures/check: one file for every variant -------------------------------- */

describe("names/renamed: the files of tests/fixtures/check, one for every variant of the rule", () => {
  const cases = fixtureCases(["names/"]);
  // the `expect:` comment of a variant names it (names/renamed:file); a finding carries the base id, and the severity of the variant
  const base = (e) => ({ ...e, rule: e.rule.split(":")[0] });

  it("has a file for the class, :publication, :element, :file (a stylesheet and a chunk) and :css, the blocking ones in fail/ and the warning in warn/", () => {
    const named = cases.flatMap((c) => c.expected.map((e) => [c.path, e.rule]));
    for (const rule of ["names/renamed", "names/renamed:publication", "names/renamed:element", "names/renamed:file"]) {
      expect(named.filter(([path, name]) => name === rule && path.startsWith("fail/")).length, rule).toBeGreaterThan(0);
    }
    expect(named.filter(([path, name]) => name === "names/renamed:css" && path.startsWith("warn/")).length).toBeGreaterThan(0);
    expect(cases.map((c) => c.path)).toEqual(expect.arrayContaining(["fail/renamed-class.html", "fail/renamed-publication.html", "fail/renamed-element.html", "fail/renamed-file.html", "fail/renamed-chunk.html", "warn/renamed-css.css"]));
  });

  it.each(cases)("$path: exactly its expected findings of names/, at the line and column it names, with the suggestion it names", (entry) => {
    const result = checkCase(entry, ["names/"], { data });
    expect(result.data, `stdout is JSON (stderr: ${result.stderr})`).not.toBeNull();
    expect(result.found.map(key)).toEqual(entry.expected.map((e) => key(base(e))));
    for (const [i, found] of result.found.entries()) {
      const wanted = entry.expected[i];
      expect(found.severity, key(found)).toBe(messages.MESSAGES[wanted.rule].severity);
      expect(found.file, key(found)).toBe(entry.path);
      expect(wordsOf(found.rule, found.message), `${key(found)} is worded by a template of messages.js`).toBe(true);
      expect(found.docs, key(found)).toBe(messages.docsUrl(found.rule));
      if (wanted.options.suggestion !== undefined) expect(found.suggestion, key(found)).toBe(wanted.options.suggestion);
    }
    expect(result.code).toBe(entry.folder === "fail" ? 1 : 0);
  });

  it("says nothing else of the old names: the page of the fixtures that names one gets only names/ findings from them", () => {
    for (const entry of cases) {
      const result = checkCase(entry, ["class/", "element/", "load/", "attr/"], { data });
      expect(result.found.map(key), entry.path).toEqual([]);
    }
  });
});
