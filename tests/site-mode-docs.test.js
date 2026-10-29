/**
 * The docs that go with <luz-theme-mode> and <luz-theme-time>
 * (.claude/plans/theme-mode.md section 4): the page of core,
 * apps/docs/pages/components/theme-mode.html, the pattern page of the catalog,
 * apps/docs/pages/catalog/theme-time.html, and the pages that point at them.
 * tests/docs-site.test.js and tests/site-docs.spec.js hold the structure every
 * component and pattern page has and the attributes against the element
 * manifest; this file holds the content only these two elements have:
 *   - the table of the six example moments (their hours, dark or light) agrees
 *     with the markup snippet of the same page and with the moments the site
 *     itself declares in its footer, so the page and the site cannot drift;
 *   - the scripts for the <head> are files now (theme-boot.min.js and
 *     theme-time-boot.min.js): the pages say what they are for, stay short, and
 *     name the exception that lets them block rendering;
 *   - the two-moment example, written with the tokens of
 *     packages/core/src/themes/_template.css;
 *   - the links and sections of the pages around them.
 *
 * The phase table used to be computed from phaseOf(), which is gone: the
 * moments are declared in the page's markup. The sandbox run of the inline
 * boot snippet moved to tests/site-boot.test.js, which runs the two files.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PAGES = "apps/docs/pages";
const MODE_PAGE = `${PAGES}/components/theme-mode.html`;
const TIME_PAGE = `${PAGES}/catalog/theme-time.html`;
const MODE_ROUTE = "/docs/components/theme-mode/";
const TIME_ROUTE = "/docs/catalog/theme-time/";

/** A page's source; a missing page is the assertion that fails, not an ENOENT. */
const page = (rel) => {
  expect(existsSync(join(repo, rel)), `${rel} exists`).toBe(true);
  return readFileSync(join(repo, rel), "utf-8");
};
const decode = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
const text = (html) => decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const frontMatter = (html) =>
  Object.fromEntries(
    [...(/<!--\s*luz:page\n([\s\S]*?)-->/.exec(html)?.[1] ?? "").matchAll(/^(\w[\w-]*):\s*(.*)$/gm)].map((m) => [m[1], m[2].trim()]),
  );
/** The decoded text of every `pre.luz-code-block` of a page. */
const codeBlocks = (html) =>
  [...html.matchAll(/<pre\b[^>]*\bluz-code-block\b[^>]*>\s*<code\b[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/g)].map((m) => decode(m[1]));
const rows = (html) => [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => [...m[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => text(c[1])));
const hasLink = (html, route) => new RegExp(`href="${route.replace(/[/]/g, "\\/")}(#[\\w-]*)?"`).test(html);

/** The text of a section: from its heading id to the next heading of the same or a higher level. */
const section = (html, id) => {
  const m = new RegExp(`<h([1-6])\\b[^>]*\\bid="${id}"[^>]*>`).exec(html);
  expect(m, `a heading with id="${id}"`).not.toBeNull();
  const rest = html.slice(m.index + m[0].length);
  const end = new RegExp(`<h[1-${m[1]}]\\b`).exec(rest);
  return end ? rest.slice(0, end.index) : rest;
};

const MOMENTS = ["night", "dawn", "morning", "afternoon", "sunset", "dusk"];
const DARK = new Set(["dawn", "dusk", "night"]);

/** The moments a piece of markup declares: [{ name, from (minutes), theme }], in the order written. */
const declared = (markup) =>
  [...markup.matchAll(/<input\b[^>]*>/g)]
    .map((m) => m[0])
    .filter((tag) => /\bdata-from="/.test(tag))
    .map((tag) => {
      const [h, m] = /\bdata-from="(\d{1,2}):(\d{2})"/.exec(tag).slice(1);
      return { name: /\bvalue="([\w-]+)"/.exec(tag)[1], from: +h * 60 + +m, theme: /\bdata-theme="(light|dark)"/.exec(tag)[1] };
    });
const hhmm = (minute) => `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;

/* ---- The pattern page --------------------------------------------------------- */

describe("apps/docs/pages/catalog/theme-time.html", () => {
  it("is a pattern page of the Catalog area: front matter with the module and the files", () => {
    const meta = frontMatter(page(TIME_PAGE));
    // The group is by function since F5b: the time of day is a piece for the whole site
    expect(meta).toMatchObject({ area: "catalog", group: "site-wide", module: "theme-time.js", toc: "h2,h3" });
    expect(meta.title, "title").toBeTruthy();
    expect(meta.description, "description").toBeTruthy();
    expect(meta.files, "files").toContain("<luz-theme-time>");
  });

  it("has the table of the six example moments, with the hours and the base of the markup snippet of the same page", () => {
    const html = page(TIME_PAGE);
    const snippet = codeBlocks(html).find((block) => block.includes("<luz-theme-time") && block.includes("data-from"));
    expect(snippet, "the markup snippet with the moments").toBeTruthy();
    const moments = declared(snippet);
    expect(moments.map((m) => m.name).sort()).toEqual([...MOMENTS].sort());
    const table = rows(html);
    moments.forEach((moment, i) => {
      const row = table.find((cells) => cells[0]?.toLowerCase() === moment.name);
      expect(row, `a table row whose first cell is "${moment.name}"`).toBeDefined();
      const next = moments[(i + 1) % moments.length];
      expect(row[1], `${moment.name}: from`).toBe(hhmm(moment.from));
      expect(row[2], `${moment.name}: to`).toBe(hhmm(next.from));
      expect(row[3].toLowerCase(), `${moment.name} is ${moment.theme}`).toBe(moment.theme);
      expect(moment.theme, `${moment.name} is ${DARK.has(moment.name) ? "dark" : "light"}`).toBe(DARK.has(moment.name) ? "dark" : "light");
    });
    expect(text(html)).toContain("data-moment");
  });

  it("declares the moments of the site's footer the way its own table does: same names, hours and bases", () => {
    const footer = declared(page("apps/site/_partials/footer.html"));
    const snippet = declared(codeBlocks(page(TIME_PAGE)).find((block) => block.includes("<luz-theme-time") && block.includes("data-from")));
    expect(footer.length).toBe(6);
    expect(footer).toEqual(snippet);
  });

  it("documents the event, with every key of its detail", () => {
    const body = text(page(TIME_PAGE));
    expect(body).toContain("luz-theme-time:change");
    for (const key of ["moment", "pinned"]) expect(body, `detail.${key}`).toMatch(new RegExp(`\\b${key}\\b`));
  });

  it("documents preview(), pin() and unpin(), and the `hour`, `moment`, `moments`, `pinned` and `place` properties of the element", () => {
    const body = text(page(TIME_PAGE));
    for (const method of ["preview(", "pin(", "unpin("]) expect(body).toContain(method);
    for (const property of ["hour", "moment", "moments", "pinned", "place"]) expect(body, `el.${property}`).toMatch(new RegExp(`\\bel\\.${property}\\b`));
  });
});

describe("apps/docs/pages/components/theme-mode.html", () => {
  it("is a component page of the Components area: front matter with the module and the file", () => {
    const meta = frontMatter(page(MODE_PAGE));
    expect(meta).toMatchObject({ area: "components", module: "theme-mode.js", files: "components/theme-mode.css", toc: "h2,h3" });
    expect(meta.title, "title").toBeTruthy();
    expect(meta.description, "description").toBeTruthy();
  });

  it("documents the event, with every key of its detail", () => {
    const body = text(page(MODE_PAGE));
    expect(body).toContain("luz-theme-mode:change");
    for (const key of ["mode", "auto", "user"]) expect(body, `detail.${key}`).toMatch(new RegExp(`\\b${key}\\b`));
  });

  it("documents the `choice` and `mode` properties, refresh() and autoMode", () => {
    const body = text(page(MODE_PAGE));
    expect(body).toMatch(/\bel\.choice\b/);
    expect(body).toMatch(/\bel\.mode\b/);
    expect(body).toContain("refresh(");
    expect(body).toContain("autoMode");
  });

  it("says what it writes on <html>: data-mode, and data-theme unless the page names a brand", () => {
    const body = text(section(page(MODE_PAGE), "how"));
    expect(body).toContain("data-mode");
    expect(body).toContain("data-theme");
    expect(body).toMatch(/\bbrand\b/);
  });
});

/* ---- The scripts for the head -------------------------------------------------- */

describe("the scripts for the <head> on the two pages", () => {
  const PAGES_BOOT = [
    ["components/theme-mode.html", MODE_PAGE, "theme-boot.min.js", "EX-009"],
    ["catalog/theme-time.html", TIME_PAGE, "theme-time-boot.min.js", "EX-012"],
  ];

  it.each(PAGES_BOOT)("%s: says what the script is for, near the snippet: it avoids the flash of the wrong mode on the first paint", (_, file, script) => {
    const html = page(file);
    const body = text(section(html, "boot"));
    expect(body).toContain(script);
    expect(body).toMatch(/\bflash(es)?\b|first paint|never (?:drawn|see)|sees the (?:light )?page light|drawn light first/i);
  });

  it.each(PAGES_BOOT)("%s: the <head> snippet is eight lines or fewer and links the file as a classic script", (_, file, script) => {
    const block = codeBlocks(page(file)).find((b) => b.includes(script));
    expect(block, `a code block that links ${script}`).toBeTruthy();
    const lines = block.split("\n").filter((l) => l.trim());
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.length).toBeLessThanOrEqual(8);
    expect(block).toMatch(new RegExp(`<script src="[^"]*${script.replace(/\./g, "\\.")}"`));
    expect(block, "classic, not a module").not.toMatch(/<script[^>]*type="module"[^>]*boot/);
  });

  it.each(PAGES_BOOT)("%s: says why it blocks rendering, names %s, and is optional", (_, file, _script, exception) => {
    const body = text(section(page(file), "boot"));
    expect(body).toContain(exception);
    expect(body).toMatch(/blocks? rendering/i);
    expect(body).toMatch(/optional/i);
  });

  it("the page of core says what a Content-Security-Policy without 'unsafe-inline' needs: the file on the page's own origin", () => {
    const body = text(section(page(MODE_PAGE), "boot"));
    expect(body).toMatch(/\bCSP\b|Content[- ]Security[- ]Policy/);
    expect(body).toMatch(/unsafe-inline/);
    expect(body).toMatch(/\bown origin\b/);
  });

  it("the page of the catalog tells that the moments of data-moments are written twice and must agree", () => {
    const body = text(section(page(TIME_PAGE), "known-issues"));
    expect(body).toContain("data-moments");
    expect(body).toMatch(/\btogether\b|\bagree\b/);
  });

  it("the data-moments the site pages carry are the six moments of the footer", () => {
    const footer = declared(page("apps/site/_partials/footer.html"));
    const expected = footer.map((m) => `${m.name}@${hhmm(m.from)}=${m.theme}`);
    const strip = (value) => value.split(/\s+/).map((token) => token.replace(/\*$/, ""));
    for (const file of ["apps/docs/_layouts/page.html", "apps/landing/index.html"]) {
      const tag = /<script\b[^>]*theme-time-boot\.min\.js[^>]*>/.exec(page(file))?.[0];
      expect(tag, `${file}: the script for the head of the moments`).toBeTruthy();
      expect(strip(/data-moments="([^"]*)"/.exec(tag)?.[1] ?? ""), file).toEqual(expected);
    }
  });
});

/* ---- The two-moment example ---------------------------------------------------- */

describe("the moment example on the docs page of the catalog", () => {
  const example = () => {
    const found = codeBlocks(page(TIME_PAGE)).find((block) => /\[data-moment=/.test(block) && /--luz-[\w-]+\s*:/.test(block));
    expect(found, "a code block with [data-moment=…] rules that set --luz-* tokens").toBeDefined();
    return found;
  };

  it("has a rule for a dark moment and one for a light moment, under a data-theme of its own", () => {
    const block = example();
    const named = [...block.matchAll(/\[data-moment=["']?(\w+)["']?\]/g)].map((m) => m[1]);
    expect(named.filter((p) => DARK.has(p)), "a dark moment").not.toHaveLength(0);
    expect(named.filter((p) => MOMENTS.includes(p) && !DARK.has(p)), "a light moment").not.toHaveLength(0);
    expect(named.filter((p) => !MOMENTS.includes(p)), "names that are no moment").toEqual([]);
    expect(block).toMatch(/\[data-theme=/);
  });

  it("names the mode (data-mode) for a brand of your own, so a brand's blocks answer to it", () => {
    expect(example()).toMatch(/\[data-theme=["']my-brand["']\]\[data-mode=/);
  });

  it("sets only tokens that packages/core/src/themes/_template.css declares", () => {
    const template = new Set([...readFileSync(join(repo, "packages/core/src/themes/_template.css"), "utf-8").matchAll(/(--luz-[\w-]+)\s*:/g)].map((m) => m[1]));
    const set = [...example().matchAll(/(--luz-[\w-]+)\s*:/g)].map((m) => m[1]);
    expect(set.length).toBeGreaterThan(0);
    expect(set.filter((name) => !template.has(name)), "tokens the template does not declare").toEqual([]);
  });
});

/* ---- The pages around them ------------------------------------------------------- */

describe("the pages that point at the two elements", () => {
  it("each of the two pages links to the other", () => {
    expect(hasLink(page(MODE_PAGE), TIME_ROUTE)).toBe(true);
    expect(hasLink(page(TIME_PAGE), MODE_ROUTE)).toBe(true);
  });

  it("the old pages are gone: components/mode-switcher.html and catalog/color-mode.html, in English and in Spanish", () => {
    for (const rel of [`${PAGES}/components/mode-switcher.html`, `${PAGES}/catalog/color-mode.html`, "apps/docs/i18n/es/pages/components/mode-switcher.html", "apps/docs/i18n/es/pages/catalog/color-mode.html"]) {
      expect(existsSync(join(repo, rel)), rel).toBe(false);
    }
  });

  it("tokens/modes.html has the section \"Letting readers choose\", with a link to each page", () => {
    const html = page(`${PAGES}/tokens/modes.html`);
    const heading = /<h2\b[^>]*\bid="([\w-]+)"[^>]*>\s*Letting readers choose\s*<\/h2>/.exec(html);
    expect(heading, 'an <h2 id="…">Letting readers choose</h2>').not.toBeNull();
    const after = html.slice(heading.index);
    expect(hasLink(after, MODE_ROUTE), "a link to /docs/components/theme-mode/ after the heading").toBe(true);
    expect(hasLink(after, TIME_ROUTE), "a link to /docs/catalog/theme-time/ after the heading").toBe(true);
  });

  it("accessibility.html states the Auto radio and both elements", () => {
    const body = text(page(`${PAGES}/accessibility.html`));
    expect(body).toContain("luz-theme-mode");
    expect(body).toContain("luz-theme-time");
    expect(body).toMatch(/\bAuto\b/);
    expect(body).not.toContain("luz-color-mode");
  });

  it("get-started/javascript.html lists both chunks and links to their pages", () => {
    const html = page(`${PAGES}/get-started/javascript.html`);
    const body = text(html);
    expect(body).toMatch(/\btheme-mode\.js\b/);
    expect(body).toMatch(/\btheme-time\.js\b/);
    expect(hasLink(html, MODE_ROUTE)).toBe(true);
    expect(hasLink(html, TIME_ROUTE)).toBe(true);
  });
});

/* ---- Icons in the labels, the surprises of Auto, the CSP ------------------------- */

const labelsOf = (markup) => [...markup.matchAll(/<label\b[^>]*\bluz-theme-mode__option\b[^>]*>[\s\S]*?<\/label>/g)].map((m) => m[0]);
const ICON = /<svg\b(?=[^>]*\bclass="[^"]*\bluz-theme-mode__icon\b)(?=[^>]*\baria-hidden="true")[^>]*>/;

describe("components/theme-mode.html: the icons are in the labels (the button shows the checked label's icon)", () => {
  it("every label of the markup snippet has a .luz-theme-mode__icon svg with aria-hidden=\"true\", Auto included", () => {
    const snippet = codeBlocks(page(MODE_PAGE)).find((c) => c.includes("<luz-theme-mode>") && c.includes("luz-theme-mode__option"));
    expect(snippet, "the code block with <luz-theme-mode>").toBeTruthy();
    const labels = labelsOf(snippet);
    expect(labels, "four labels").toHaveLength(4);
    for (const l of labels) expect(l, `an icon in ${text(l)}`).toMatch(ICON);
  });

  it("the page says the icons go in the labels, because the button shows the icon of the checked one", () => {
    const body = text(section(page(MODE_PAGE), "markup"));
    expect(body).toMatch(/icons?\b[^.]{0,80}\blabels?\b|\blabels?\b[^.]{0,80}\bicons?\b/i);
    expect(body).toMatch(/\bchecked\b/);
  });

  it("the header comment of theme-mode.js has the icons in its example too", () => {
    const src = readFileSync(join(repo, "packages/core/src/theme-mode.js"), "utf-8");
    expect(src).toMatch(/luz-theme-mode__icon/);
  });
});

describe("what Auto does that a reader would not expect: in the accessibility statement", () => {
  const statement = () => text(page(`${PAGES}/accessibility.html`).split(/Theme mode and theme time/)[1] ?? "");

  it("on this site Auto is dark from 20:30 to 07:30 even when the device is set to light", () => {
    const t = statement();
    expect(t).toMatch(/20:30/);
    expect(t).toMatch(/07:30/);
    expect(t).toMatch(/\b(device|system)\b[^.]{0,60}\b(light|says)\b|\blight\b[^.]{0,60}\b(device|system)\b/i);
  });

  it("prefers-contrast: more gives high contrast in Auto", () => {
    const t = statement();
    expect(t).toMatch(/prefers-contrast/);
    expect(t).toMatch(/high[- ]contrast/i);
  });

  it("the name of the button is the legend and the checked label, and a status region says the new mode", () => {
    const t = statement();
    expect(t).toMatch(/Color mode: Auto/);
    expect(t).toMatch(/status region/i);
  });

  it("a pinned hour stands only in Auto: choosing a mode or Auto, or Escape on the slider, lets it go", () => {
    const t = statement();
    expect(t).toMatch(/Escape/);
    expect(t).toMatch(/\bAuto\b[^.]{0,80}\blets? it go\b|\blets? it go\b/i);
  });
});
