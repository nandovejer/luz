/**
 * The rules of @luz-ds/check for the color mode of the theme-mode release (the plan of 2026-10-29): core's
 * <luz-theme-mode> and catalog's <luz-theme-time> replace core's `.luz-mode-*` switcher and catalog's
 * <luz-color-mode> / <luz-mode>.
 *
 *   - a11y/slider-no-name  blocks a <luz-theme-time variant="bar"> with no data-luz-label-scrub on it or on an
 *                          ancestor in the static markup (the script has no English text of its own, so the slider
 *                          would have no name); a bar built by a script has no tag in the markup and is not raised
 *   - names/renamed        <luz-color-mode> and <luz-mode> are <luz-theme-time>, around <luz-theme-mode> with the
 *                          radios in it; the classes of the switcher are the parts of <luz-theme-mode>; the files
 *                          color-mode.css, color-mode.js and mode.js of catalog are theme-time.css / theme-time.js
 *   - load/package-missing asks for components/theme-time.css when <luz-theme-time> is used and it is not linked
 *
 * The facts are the build's (dist/data), as in tests/check-rules-load.test.js; the projects are temporary folders,
 * and tests/fixtures/check/ has one file for each (fail/a11y-slider-no-name.html, fail/renamed-theme-mode.html and
 * pass/theme-time-bar.html).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { builtData, checkCase, checkJson, fixtureCases, key, passCases, removeWorkspaces, where } from "./helpers/check-fixtures.js";
import { check, links, linkTo, ofRule, page, wordsOf } from "./helpers/check-run.js";
import { checkModule } from "./helpers/check-modules.js";
import { FIXTURES } from "./helpers/check-fixtures.js";

const messages = await checkModule("messages");

afterAll(removeWorkspaces);

const TOKENS = linkTo("tokens", "luz-tokens.min.css");
const CORE = linkTo("core", "luz.min.css");
const THEME_TIME = linkTo("catalog", "components/theme-time.min.css");
const HEAD = links(TOKENS, CORE, THEME_TIME);
const CDN = (version, file) => `  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@${version}/dist/${file}">`;

let data;
beforeAll(async () => {
  const built = await builtData();
  expect(built.error, "the build writes dist/data").toBeNull();
  data = built.data;
});

const RULE = "a11y/slider-no-name";
// The negative tests below hold nothing until the rule exists: each starts by asking for it
const ruleExists = () => expect(Object.keys(messages.MESSAGES), "the rule is in messages.js").toContain(RULE);

const run = (body, head = HEAD) => check({ "index.html": page(body, head) }, { snapshot: data });
const slider = (result) => ofRule(result, "a11y/slider-no-name");

describe("a11y/slider-no-name", () => {
  it("blocks a bar with no data-luz-label-scrub, at the < of its tag, with the sentence the brief wrote", () => {
    const body = '  <main class="o-container"><luz-theme-time variant="bar"></luz-theme-time></main>';
    const html = page(body, HEAD);
    const result = check({ "index.html": html }, { snapshot: data });
    const found = slider(result);
    const at = where(html, "<luz-theme-time");
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ rule: "a11y/slider-no-name", severity: "block", line: at.line, column: at.column });
    expect(found[0].message).toBe('<luz-theme-time variant="bar"> has no data-luz-label-scrub, so its slider has no name; add one in the page\'s language');
    expect(found[0].message.length).toBeLessThanOrEqual(messages.MAX_MESSAGE);
    expect(wordsOf("a11y/slider-no-name", found[0].message)).toBe(true);
    expect(found[0].docs).toBe(messages.docsUrl("a11y/slider-no-name"));
    expect(result.code, "a blocking finding fails the check").toBe(1);
  });

  it("is not raised when the bar carries the label itself", () => {
    ruleExists();
    expect(slider(run('  <luz-theme-time variant="bar" data-luz-label-scrub="Hour of the day"></luz-theme-time>'))).toEqual([]);
  });

  it("is not raised when an ancestor in the static markup carries it (the body, a section, the root)", () => {
    ruleExists();
    for (const wrap of ['<main data-luz-label-scrub="Hour of the day">%</main>', '<div><section data-luz-label-scrub="Hora">%</section></div>']) {
      expect(slider(run(`  ${wrap.replace("%", '<luz-theme-time variant="bar"></luz-theme-time>')}`)), wrap).toEqual([]);
    }
    const onBody = check({ "index.html": page('  <luz-theme-time variant="bar"></luz-theme-time>', HEAD).replace("<body>", '<body data-luz-label-scrub="Hour of the day">') }, { snapshot: data });
    expect(slider(onBody)).toEqual([]);
    const onRoot = check({ "index.html": page('  <luz-theme-time variant="bar"></luz-theme-time>', HEAD).replace('<html lang="en">', '<html lang="en" data-luz-label-scrub="Hour of the day">') }, { snapshot: data });
    expect(slider(onRoot)).toEqual([]);
  });

  it("is not about the saved note: data-luz-label-saved alone does not name the slider", () => {
    expect(slider(run('  <section data-luz-label-saved="Saved"><luz-theme-time variant="bar"></luz-theme-time></section>'))).toHaveLength(1);
  });

  it("is not raised for a <luz-theme-time> that is not a bar, nor for a bar built by a script", () => {
    ruleExists();
    expect(slider(run("  <luz-theme-time><luz-theme-mode inline></luz-theme-mode></luz-theme-time>"))).toEqual([]);
    const script = "  <script>document.body.append(Object.assign(document.createElement('luz-theme-time'), { variant: 'bar' }));</script>";
    expect(slider(run(script))).toEqual([]);
    expect(slider(run('  <script type="module">document.body.insertAdjacentHTML("beforeend", \'<luz-theme-time variant="bar"></luz-theme-time>\');</script>'))).toEqual([]);
  });

  it("raises one finding for each bar that has none, in the order of the page, and none for the one a section names", () => {
    const body = ['  <luz-theme-time variant="bar"></luz-theme-time>', '  <section data-luz-label-scrub="x"><luz-theme-time variant="bar"></luz-theme-time></section>', '  <luz-theme-time variant="bar" show="time"></luz-theme-time>'].join("\n");
    const html = page(body, HEAD);
    const found = slider(check({ "index.html": html }, { snapshot: data }));
    const first = where(html, '<luz-theme-time variant="bar"></luz-theme-time>');
    const third = where(html, '<luz-theme-time variant="bar" show="time">');
    expect(found.map((f) => [f.line, f.column])).toEqual([
      [first.line, first.column],
      [third.line, third.column],
    ]);
  });
});

describe("the fixtures: what tests/fixtures/check says for each", () => {
  const cases = fixtureCases(["a11y/slider-no-name", "names/renamed"]).filter((c) => ["fail/a11y-slider-no-name.html", "fail/renamed-theme-mode.html"].includes(c.path));

  it("has the two files, each with expect comments", () => {
    expect(cases.map((c) => c.path).sort()).toEqual(["fail/a11y-slider-no-name.html", "fail/renamed-theme-mode.html"]);
  });

  it.each(cases)("$path: exactly its expected findings, at the line and column it names, blocking, with the suggestion it names", (entry) => {
    const result = checkCase(entry, ["a11y/slider-no-name", "names/"], { data });
    expect(result.data, `stdout is JSON (stderr: ${result.stderr})`).not.toBeNull();
    expect(result.found.map(key)).toEqual(entry.expected.map((e) => key({ ...e, rule: e.rule.split(":")[0] === "names/renamed" ? "names/renamed" : e.rule })));
    for (const [i, found] of result.found.entries()) {
      expect(found.severity, key(found)).toBe("block");
      expect(found.file).toBe(entry.path);
      expect(wordsOf(found.rule, found.message), `${key(found)} is worded by a template of messages.js`).toBe(true);
      expect(found.docs).toBe(messages.docsUrl(found.rule));
      const wanted = entry.expected[i].options.suggestion;
      if (wanted !== undefined) expect(found.suggestion, key(found)).toBe(wanted);
    }
    expect(result.code).toBe(1);
  });

  it("says nothing else of those two pages: no unknown class, element or attribute, no missing package", () => {
    for (const entry of cases) {
      const result = checkCase(entry, ["class/", "element/", "attr/", "load/", "misuse/"], { data });
      expect(result.found.map(key), entry.path).toEqual([]);
    }
  });

  it("pass/theme-time-bar.html (a bar named by its body, its section and itself; core's button; the moments; a bar built by a script) is a valid page: exit 0 and nothing blocking", () => {
    const entry = passCases().find((c) => c.path === "pass/theme-time-bar.html");
    expect(entry, "the file exists").toBeDefined();
    const result = checkJson([entry.path], FIXTURES, { data });
    expect(result.code, result.stdout).toBe(0);
    expect(result.data.findings.filter((f) => f.severity === "block")).toEqual([]);
    expect(result.data.findings.map(key)).toEqual([]);
  });
});

describe("names/renamed: <luz-color-mode> and <luz-mode> are <luz-theme-time>, around <luz-theme-mode>", () => {
  for (const old of ["luz-color-mode", "luz-mode"]) {
    it(`<${old}>: blocks at its <, names the new tag and says it wraps core's element, with the sentence the brief wrote`, () => {
      const html = page(`  <main class="o-container"><${old} remember><div class="luz-mode-switcher">x</div></${old}></main>`, HEAD);
      const result = check({ "index.html": html }, { snapshot: data });
      const found = ofRule(result, "names/renamed").filter((f) => f.message.includes(`<${old}>`));
      const at = where(html, `<${old}`);
      expect(found).toHaveLength(1);
      expect(found[0]).toMatchObject({ rule: "names/renamed", severity: "block", line: at.line, column: at.column, suggestion: "<luz-theme-time>" });
      expect(found[0].message).toBe(`<${old}> is now <luz-theme-time>, around <luz-theme-mode> with the radios in it; replace the tag and wrap them`);
      expect(found[0].message.length).toBeLessThanOrEqual(messages.MAX_MESSAGE);
      expect(wordsOf("names/renamed", found[0].message)).toBe(true);
      expect(found[0].docs).toBe(messages.docsUrl("names/renamed"));
      expect(result.code).toBe(1);
    });
  }

  it("a tag that was renamed without a wrapper keeps its short sentence: <luz-consent> is <luz-cookie-consent>", () => {
    expect(ofRule(run("  <luz-color-mode></luz-color-mode>"), "names/renamed")[0]?.message, "the wrapper sentence is for the color mode alone").toContain("around <luz-theme-mode>");
    const found = ofRule(run("  <luz-consent></luz-consent>"), "names/renamed");
    expect(found).toHaveLength(1);
    expect(found[0].message).toBe("<luz-consent> is now <luz-cookie-consent>; replace the old tag with the new one");
  });

  it("a page that links catalog 0.0 to 0.2, where the old names are the right ones, is told nothing", () => {
    expect(ofRule(run("  <luz-color-mode></luz-color-mode>"), "names/renamed"), "on a page that pins no old release it is told").toHaveLength(1);
    const head = links(TOKENS, CORE, CDN("0.2.1", "components/color-mode.min.css"));
    const found = ofRule(run('  <luz-color-mode remember><fieldset class="luz-mode-switcher"></fieldset></luz-color-mode>', head), "names/renamed");
    expect(found).toEqual([]);
  });
});

describe("names/renamed: the classes of core's switcher are the parts of <luz-theme-mode>", () => {
  const RENAMED = [
    ["luz-mode-switcher", "luz-theme-mode__group"],
    ["luz-mode-switcher__label", "luz-theme-mode__legend"],
    ["luz-mode-btn", "luz-theme-mode__option"],
    ["luz-mode-btn__input", "luz-theme-mode__input"],
    ["luz-mode-btn__icon", "luz-theme-mode__icon"],
    ["luz-mode-cycle", "luz-theme-mode__button"],
    ["luz-mode-cycle__status", "luz-theme-mode__status"],
  ];

  it.each(RENAMED)(".%s is now .%s: blocks, at the class attribute, with the new class as the suggestion", (old, current) => {
    const body = `  <div class="${old}">x</div>`;
    const found = ofRule(run(body), "names/renamed");
    expect(found, old).toHaveLength(1);
    expect(found[0]).toMatchObject({ rule: "names/renamed", severity: "block", suggestion: `.${current}` });
    expect(found[0].message).toBe(messages.message("names/renamed", { name: old, current }));
    expect(found[0].message).toContain(`.${old}`);
    expect(found[0].message).toContain(`.${current}`);
    expect(wordsOf("names/renamed", found[0].message)).toBe(true);
    const at = page(body, HEAD).split("\n").findIndex((l) => l.includes(`class="${old}"`)) + 1;
    expect(found[0].line).toBe(at);
  });

  it("says nothing of the new parts: they are classes core knows (the block is the tag's, not a class)", () => {
    const body = RENAMED.map(([, current]) => current).map((name) => `  <div class="${name}">x</div>`).join("\n");
    const result = run(body);
    expect(ofRule(result, "names/renamed")).toEqual([]);
    expect(ofRule(result, "class/")).toEqual([]);
  });
});

describe("names/renamed: the modifiers of the switcher are not classes any more", () => {
  const MODIFIERS = [
    ["luz-mode-switcher--inline", ".luz-mode-switcher--inline is now the inline attribute of <luz-theme-mode>; remove the class"],
    ["luz-mode-switcher--cycle", ".luz-mode-switcher--cycle is gone, as the button is the default now; remove --cycle"],
  ];

  it.each(MODIFIERS)(".%s: blocks, at the class attribute, with the literal sentence of the release", (old, sentence) => {
    const body = `  <fieldset class="luz-mode-switcher ${old}">x</fieldset>`;
    const found = ofRule(run(body), "names/renamed").filter((f) => f.message.includes(old));
    expect(found, old).toHaveLength(1);
    expect(found[0]).toMatchObject({ rule: "names/renamed", severity: "block" });
    expect(found[0].message).toBe(sentence);
    expect(found[0].message.length).toBeLessThanOrEqual(messages.MAX_MESSAGE);
    expect(wordsOf("names/renamed", found[0].message)).toBe(true);
    expect(found[0].docs).toBe(messages.docsUrl("names/renamed"));
    const html = page(body, HEAD);
    const at = where(html, `class="luz-mode-switcher ${old}"`);
    expect([found[0].line, found[0].column]).toEqual([at.line, at.column]);
  });

  it("the block alone points at the group, the fieldset core writes now, never at the tag", () => {
    const found = ofRule(run('  <fieldset class="luz-mode-switcher">x</fieldset>'), "names/renamed");
    expect(found.map((f) => f.suggestion)).toEqual([".luz-theme-mode__group"]);
    expect(found[0].message).toBe(".luz-mode-switcher is now .luz-theme-mode__group; replace the old name with the new one");
  });
});

describe("names/renamed: the files of catalog's color mode are theme-time", () => {
  const link = (file) => links(TOKENS, CORE, CDN("0.3.0", file));

  it.each([
    ["components/color-mode.min.css", "components/theme-time.min.css"],
    ["components/color-mode.css", "components/theme-time.css"],
  ])("a stylesheet, %s: blocks and names %s", (old, current) => {
    const found = ofRule(run("  <p>x</p>", link(old)), "names/renamed");
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ rule: "names/renamed", severity: "block" });
    expect(found[0].message).toContain(old.split("/").pop());
    expect(found[0].message).toContain(current.split("/").pop());
  });

  it.each([
    ["color-mode.min.js", "theme-time.min.js"],
    ["mode.min.js", "theme-time.min.js"],
    ["color-mode.js", "theme-time.js"],
  ])("a script, %s: blocks and names %s", (old, current) => {
    const head = `${links(TOKENS, CORE)}  <script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.3.0/dist/${old}"></script>\n`;
    const found = ofRule(run("  <p>x</p>", head), "names/renamed");
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ rule: "names/renamed", severity: "block" });
    expect(found[0].message).toContain(old);
    expect(found[0].message).toContain(current);
  });

  it("the current names are fine", () => {
    expect(ofRule(run("  <p>x</p>", link("components/color-mode.min.css")), "names/renamed"), "the old name is told").toHaveLength(1);
    const head = `${link("components/theme-time.min.css")}  <script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.3.0/dist/theme-time.min.js"></script>\n`;
    expect(ofRule(run('  <luz-theme-time variant="bar" data-luz-label-scrub="x"></luz-theme-time>', head), "names/renamed")).toEqual([]);
  });
});

describe("load/package-missing: <luz-theme-time> needs components/theme-time.css", () => {
  const BODY = '  <luz-theme-time><luz-theme-mode inline></luz-theme-mode></luz-theme-time>';

  it("blocks a page that links core and not the stylesheet, names the tag and the file to add", () => {
    const html = page(BODY, links(TOKENS, CORE));
    const result = check({ "index.html": html }, { snapshot: data });
    const found = ofRule(result, "load/");
    const at = where(html, "<luz-theme-time");
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ rule: "load/package-missing", severity: "block", line: at.line, column: at.column });
    expect(found[0].message).toContain("<luz-theme-time>");
    expect(found[0].message).toContain("components/theme-time.css");
    expect(found[0].message).not.toContain("color-mode");
    expect(wordsOf("load/package-missing", found[0].message)).toBe(true);
  });

  it("asks for the same file for the classes of its parts", () => {
    const found = ofRule(run('  <div class="luz-theme-time__bar">x</div>', links(TOKENS, CORE)), "load/");
    expect(found).toHaveLength(1);
    expect(found[0].message).toContain("components/theme-time.css");
  });

  it("another catalog stylesheet does not stand in for it", () => {
    const found = ofRule(run(BODY, links(TOKENS, CORE, linkTo("catalog", "components/search.min.css"))), "load/");
    expect(found).toHaveLength(1);
    expect(found[0].message).toContain("components/theme-time.css");
  });

  it("is satisfied by the stylesheet, minified or not", () => {
    expect(ofRule(run(BODY, links(TOKENS, CORE)), "load/"), "unlinked it is told").toHaveLength(1);
    for (const file of ["components/theme-time.min.css", "components/theme-time.css"]) {
      expect(ofRule(run(BODY, links(TOKENS, CORE, linkTo("catalog", file))), "load/"), file).toEqual([]);
    }
  });
});

describe("the messages of the release stay within the checker's cap", () => {
  const LONG = "x".repeat(64);

  it("a11y/slider-no-name, with a name as long as a name can be, is at most MAX_MESSAGE characters", () => {
    expect(messages.message("a11y/slider-no-name", { tag: LONG }).length).toBeLessThanOrEqual(messages.MAX_MESSAGE);
    expect(messages.MESSAGES["a11y/slider-no-name"].severity).toBe("block");
  });

  it("every message that names luz-theme-time or luz-theme-mode renders within the cap with names of 64 characters", () => {
    const keys = Object.keys(messages.MESSAGES).filter((k) => /theme-time|theme-mode|slider|element-wrap/.test(k + JSON.stringify(messages.MESSAGES[k].sample ?? {})));
    expect(keys.length).toBeGreaterThan(1);
    for (const k of keys) {
      const vars = Object.fromEntries(Object.keys(messages.MESSAGES[k].sample ?? {}).map((name) => [name, LONG]));
      expect(messages.message(k, vars).length, k).toBeLessThanOrEqual(messages.MAX_MESSAGE);
    }
  });
});
