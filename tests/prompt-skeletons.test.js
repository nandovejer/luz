/**
 * What the prompts for AI hand to the LLM to copy: a skeleton of the page of each kind of site, the colour mode
 * switcher, and the rules that keep the code it writes inside LUZ.
 *
 *   - each kind prompt (landing, blog, app, docs) holds, in its preset, a fenced `html` skeleton of the page of that
 *     kind; put in a minimal full page with the prompt's own links, `luz-check` finds nothing in it (no block, no
 *     warning), and it uses the pieces of its kind, only classes and elements the same prompt lists, no
 *     root-relative `href="/"`, no `style` attribute and no state class;
 *   - the app's account menu is a `popover` and no `summary` is a `luz-btn`;
 *   - the body of the five prompts holds the colour mode block: core's `<luz-theme-mode>` around its
 *     `fieldset.luz-theme-mode__group`, naming `luz-theme-mode__group` and `luz-theme-mode__option` as core's, and it passes luz-check;
 *   - the rules say no `style` attribute, where `@layer luz, site;` goes, that a state class is never typed, and the
 *     install part says to link only the catalog stylesheets the page uses.
 *
 * The facts are the build's (dist/data), as in tests/check-rules-renamed.test.js. The prompts are assembled from the
 * sources, never read from docs/.
 */
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { assemblePrompt } from "../scripts/docs-site/prompts.js";
import { builtData } from "./helpers/check-fixtures.js";
import { check } from "./helpers/check-run.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const IDS = ["start", "landing", "blog", "app", "docs"];
const KINDS = ["landing", "blog", "app", "docs"];

const prompt = (() => {
  const cache = new Map();
  return (id) => {
    if (!cache.has(id)) cache.set(id, assemblePrompt(id, { root }));
    return cache.get(id);
  };
})();

/** The fenced `html` blocks of a text, in order. */
const htmlBlocks = (text) => [...text.matchAll(/```html\n([\s\S]*?)\n```/g)].map((m) => m[1]);
/** The `## The kind of site` section of a kind prompt: from its heading to the next `## `. */
const kindSection = (text) => {
  const start = text.indexOf("## The kind of site");
  return start === -1 ? "" : text.slice(start).split(/\n## /)[0];
};
/** The skeleton of a kind: the fenced html block of its section that is a body. */
const skeletonOf = (id) => htmlBlocks(kindSection(prompt(id))).find((b) => /^<body[\s>]/.test(b));
/** The `<link>` and `<script>` lines the prompt gives for the `<head>`: the first fenced html block that links a stylesheet. */
const headOf = (id) => htmlBlocks(prompt(id)).find((b) => b.includes("<link"));
const fullPage = (id, body) =>
  `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>Page</title>\n${headOf(id)}\n</head>\n${body}\n</html>\n`;

let data;
beforeAll(async () => {
  const built = await builtData();
  expect(built.error, "the build writes dist/data").toBeNull();
  data = built.data;
});
const run = (id, body) => check({ "index.html": fullPage(id, body) }, { snapshot: data });
const problems = (result) => result.findings.filter((f) => f.severity === "block" || f.severity === "warn").map((f) => `${f.severity} ${f.rule} line ${f.line}: ${f.message}`);

/** The classes a prompt lists under "Classes you may use": a block, and its `--modifiers` and `__parts`. */
function listedClasses(text) {
  const section = text.slice(text.indexOf("## Classes you may use"), text.indexOf("## Elements you may use"));
  const allowed = new Set();
  for (const line of section.split("\n").filter((l) => l.startsWith("- "))) {
    const prefix = /\(prefix ([a-z0-9-]+)\)/.exec(line)?.[1];
    let block = prefix ?? null;
    for (const [, token] of line.matchAll(/`([^`]+)`/g)) {
      if (/^(?:__|--)/.test(token)) {
        if (block) allowed.add(block + token);
      } else if (/^(?:luz|o|u|is)-[a-z0-9_-]+$/.test(token)) {
        if (!prefix) block = token;
        allowed.add(token);
      } else if (/^(?:luz-[a-z0-9-]+)(?:__|--)/.test(token)) allowed.add(token);
    }
  }
  return allowed;
}
/** The `<luz-*>` tags a prompt lists under "Elements you may use". */
const listedElements = (text) => {
  const section = text.slice(text.indexOf("## Elements you may use"));
  return new Set([...section.matchAll(/^- `<(luz-[a-z0-9-]+)>`/gm)].map((m) => m[1]));
};
const classTokens = (html) => [...html.matchAll(/\sclass="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/).filter(Boolean));

/** What each skeleton must be made of: the pieces of its kind. */
const USES = {
  landing: ["luz-site-header", "luz-hero", "luz-section", "luz-site-footer"],
  blog: ["luz-masthead", "luz-site-footer"],
  app: ["luz-app-bar", "luz-sidebar", "luz-dashboard"],
  docs: ["luz-docs-layout", "luz-doc-header", "luz-page-rail", "luz-pager"],
};

describe("the skeleton of each kind of site", () => {
  it.each(KINDS)("%s: its preset holds a fenced html skeleton of the page, a body", (id) => {
    expect(kindSection(prompt(id)), `${id}: the section of the kind`).not.toBe("");
    const skeleton = skeletonOf(id);
    expect(skeleton, `${id}: a fenced html block starting with <body in "The kind of site"`).toBeTruthy();
    expect(skeleton.split("\n").length, `${id}: more than a stub`).toBeGreaterThan(8);
  });

  it("the general prompt has no skeleton of a kind: it has no section of one", () => {
    expect(kindSection(prompt("start"))).toBe("");
  });

  it.each(KINDS)("%s: put in a full page with the prompt's own links, luz-check finds no block and no warning", (id) => {
    const skeleton = skeletonOf(id);
    expect(skeleton, `${id}: a skeleton`).toBeTruthy();
    expect(headOf(id), `${id}: the prompt gives the links of the head`).toBeTruthy();
    const result = run(id, skeleton);
    expect(problems(result)).toEqual([]);
    expect(result.code, "the run passes").toBe(0);
  });

  it.each(KINDS)("%s: is made of the pieces of its kind", (id) => {
    const skeleton = skeletonOf(id);
    expect(skeleton, `${id}: a skeleton`).toBeTruthy();
    const tokens = new Set(classTokens(skeleton));
    const has = (name) => [...tokens].some((t) => t === name || t.startsWith(`${name}__`) || t.startsWith(`${name}--`));
    for (const name of USES[id]) expect(has(name), `${id} uses .${name}`).toBe(true);
    if (id === "blog") {
      expect(["luz-page-header", "luz-article-header", "luz-article"].some(has), "blog uses a page header or the pieces of an article").toBe(true);
    }
  });

  it.each(KINDS)("%s: uses only classes and luz elements the same prompt lists", (id) => {
    const skeleton = skeletonOf(id);
    expect(skeleton, `${id}: a skeleton`).toBeTruthy();
    const classes = listedClasses(prompt(id));
    expect(classes.size, "the parser reads the classes section").toBeGreaterThan(100);
    const used = [...new Set(classTokens(skeleton))];
    expect(used.length, `${id}: names classes`).toBeGreaterThan(10);
    expect(used.filter((c) => !classes.has(c)), `${id}: classes the prompt does not list`).toEqual([]);
    const tags = [...new Set([...skeleton.matchAll(/<(luz-[a-z0-9-]+)[\s>/]/g)].map((m) => m[1]))];
    const listed = listedElements(prompt(id));
    expect(tags.filter((t) => !listed.has(t)), `${id}: elements the prompt does not list`).toEqual([]);
  });

  it.each(KINDS)("%s: has no root-relative link, no style attribute and no state class", (id) => {
    const skeleton = skeletonOf(id);
    expect(skeleton, `${id}: a skeleton`).toBeTruthy();
    expect(skeleton, `${id}: no href="/" or src="/…"`).not.toMatch(/\s(?:href|src|action)="\/(?!\/)/);
    expect(skeleton, `${id}: no style attribute`).not.toMatch(/\sstyle=/);
    expect(classTokens(skeleton).filter((c) => /^is-/.test(c)), `${id}: LUZ's scripts set the state classes`).toEqual([]);
  });

  it("the app's account menu is a popover opened by a button, and no summary is a luz-btn", () => {
    const skeleton = skeletonOf("app");
    expect(skeleton, "a skeleton").toBeTruthy();
    const menus = [...skeleton.matchAll(/<(\w+)([^>]*\sclass="[^"]*luz-dropdown__menu[^"]*"[^>]*)>/g)];
    expect(menus.length, "a luz-dropdown__menu").toBeGreaterThan(0);
    for (const [, , attrs] of menus) {
      expect(attrs, "the menu is a popover").toMatch(/\spopover(?:[\s=>]|$)/);
      const id = /\sid="([^"]+)"/.exec(attrs)?.[1];
      expect(id, "the menu has an id").toBeTruthy();
      expect(skeleton, "a button opens it").toMatch(new RegExp(`<button[^>]*\\spopovertarget="${id}"`));
    }
    expect(skeleton, "luz-btn goes on a button or an a, never a summary").not.toMatch(/<summary[^>]*\sclass="[^"]*luz-btn/);
  });
});

describe("the colour mode block of the body", () => {
  const blockOf = (id) => htmlBlocks(prompt(id)).find((b) => b.includes("<luz-theme-mode"));

  it.each(IDS)("%s: has core's <luz-theme-mode> around its fieldset.luz-theme-mode__group, Auto first", (id) => {
    const block = blockOf(id);
    expect(block, `${id}: a fenced html block with <luz-theme-mode`).toBeTruthy();
    const open = block.search(/<luz-theme-mode[\s>]/);
    const fieldset = block.search(/<fieldset class="luz-theme-mode__group[\s"]/);
    const close = block.indexOf("</luz-theme-mode>");
    expect(open, `${id}: <luz-theme-mode>`).toBeGreaterThanOrEqual(0);
    expect(fieldset, `${id}: the fieldset is inside`).toBeGreaterThan(open);
    expect(close, `${id}: closed after the fieldset`).toBeGreaterThan(block.indexOf("</fieldset>"));
    expect(block, `${id}: the options are core's`).toContain("luz-theme-mode__option");
    expect(block.indexOf('value="auto"'), `${id}: Auto first`).toBeLessThan(block.indexOf('value="light"'));
    expect(block, `${id}: the old element is gone`).not.toMatch(/luz-color-mode|luz-mode-switcher|luz-mode-btn/);
  });

  it.each(IDS)("%s: says in prose that luz-theme-mode__group and luz-theme-mode__option are core's", (id) => {
    const prose = prompt(id).replace(/```[\s\S]*?```/g, "");
    const line = prose.split("\n").find((l) => l.includes("`luz-theme-mode__group`") && l.includes("`luz-theme-mode__option`"));
    expect(line, `${id}: a line outside the code that names both`).toBeTruthy();
    expect(line, `${id}: and says whose they are`).toMatch(/\bcore\b/i);
  });

  it.each(IDS)("%s: the block passes luz-check, inside a page with the prompt's links", (id) => {
    const block = blockOf(id);
    expect(block, `${id}: the block`).toBeTruthy();
    const result = run(id, `<body>\n<main id="main-content" tabindex="-1">\n<h1>Page</h1>\n${block}\n</main>\n</body>`);
    expect(problems(result)).toEqual([]);
    expect(result.code, "the run passes").toBe(0);
  });
});

describe("the rules of the body", () => {
  const line = (id, start) => prompt(id).split("\n").find((l) => l.startsWith(start));

  it.each(IDS)("%s: round 1 item 5 asks the kind of site `unless a section \"The kind of site\" below says`, not `only when … is missing`", (id) => {
    const text = prompt(id);
    expect(text, id).not.toMatch(/Only when the section/);
    const item = line(id, "5. ");
    expect(item, `${id}: item 5 of round 1`).toBeTruthy();
    expect(item).toContain('unless a section "The kind of site" below says');
  });

  it.each(IDS)("%s: the rules say no `style` attribute", (id) => {
    expect(prompt(id)).toContain("No `style` attribute");
    expect(prompt(id)).not.toMatch(/No inline `style`/);
  });

  it.each(IDS)("%s: the rules say `@layer luz, site;` goes in a `<style>` or a file after LUZ's links", (id) => {
    const rule = line(id, "- No other CSS framework");
    expect(rule, `${id}: the rule of the project's own CSS`).toBeTruthy();
    expect(rule).toContain("@layer luz, site;");
    expect(rule).toContain("`<style>`");
    expect(rule).toContain("after LUZ's links");
  });

  it.each(IDS)("%s: the rules say never to type a state class such as `is-active`", (id) => {
    const rule = prompt(id).split("\n").find((l) => l.startsWith("- ") && l.includes("`is-active`"));
    expect(rule, `${id}: a rule that names is-active`).toBeTruthy();
    expect(rule).toMatch(/never type it/i);
  });

  it.each(IDS)("%s: the install part says to link only the catalog stylesheets the page uses", (id) => {
    const install = prompt(id).split("\n## Install")[1].split("\n## ")[0];
    expect(install).toMatch(/Link only the catalog stylesheets the page uses/);
  });
});
