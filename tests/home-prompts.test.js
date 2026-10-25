/**
 * The sources of the home's fourth level, "Your whole site from a prompt" (.claude/plans/ai-and-catalog-only.md,
 * decision 23, phase F4). The rendered page is tests/home-prompts.spec.js; here the template, the script and the
 * catalogs:
 *
 *  - the template has one opener per prompt, to /prompts/<id>.txt, the ids being those of PROMPT_KINDS (never typed),
 *    and the dialog's partial once;
 *  - landing.js turns the openers into buttons with initPromptDialogs();
 *  - level 4 has no weight: no {{weight4}} in the template, no `inside.upto` in a catalog, no install of a package
 *    for one kind of site in the template or in the catalogs;
 *  - the three catalogs have the same keys for it.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PROMPT_KINDS } from "../scripts/docs-site/prompts.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(repo, path), "utf-8");
const LANGS = ["en", "es", "ar"];
const catalogs = Object.fromEntries(LANGS.map((lang) => [lang, JSON.parse(read(`apps/landing/i18n/${lang}.json`))]));
const home = read("apps/landing/index.html");
const level4 = home.slice(home.indexOf('id="inside-4"'), home.indexOf('id="why"') > 0 ? home.indexOf('id="why"') : undefined);
const KINDS = PROMPT_KINDS.map((kind) => kind.id).filter((id) => id !== "start");

describe("the template of level 4", () => {
  it("has an opener of each of the five prompts, a link to its text, marked and titled", () => {
    for (const { id } of PROMPT_KINDS) {
      expect(level4, id).toMatch(new RegExp(`<a [^>]*href="/prompts/${id}\\.txt"[^>]*\\sdata-prompt-open\\b[^>]*\\sdata-prompt-title="\\{\\{t:inside\\.(kind\\.${id}|start)\\.prompt\\}\\}"`));
    }
    expect(level4.match(/data-prompt-open/g)).toHaveLength(PROMPT_KINDS.length);
  });

  it("names every opener and every recipes link by its words and the title of its card", () => {
    for (const id of KINDS) {
      expect(level4, id).toMatch(new RegExp(`href="/prompts/${id}\\.txt"[^>]*aria-labelledby="in4-${id}-prompt in4-${id}"`));
      expect(level4, id).toMatch(new RegExp(`href="/docs/kinds/${id}/"[^>]*aria-labelledby="in4-${id}-recipes in4-${id}"`));
      expect(level4, id).toMatch(new RegExp(`<h3 id="in4-${id}">`));
    }
  });

  it("has no install tabs, no terminal and no npm command", () => {
    expect(level4).not.toMatch(/luz-terminal|luz-tabs|npm install|cdn\.jsdelivr|data-copy-from/);
  });

  it("has no weight: nothing to measure, so no {{weight4}}", () => {
    expect(home).not.toContain("{{weight4}}");
    expect(level4).not.toContain("{{t:inside.weight}}");
  });

  it("includes the dialog's skeleton once, and the footer lists the four kinds of site", () => {
    expect(home.match(/<!-- luz:include prompt-dialog -->/g)).toHaveLength(1);
    for (const id of KINDS) expect(home, id).toContain(`<a href="/docs/kinds/${id}/">`);
    for (const stale of ["footer.pkg.landing", "footer.pkg.cms", "footer.pkg.app", "footer.pkg.docs"]) expect(home, stale).not.toContain(stale);
  });
});

describe("apps/landing/landing.js", () => {
  const js = read("apps/landing/landing.js");

  it("imports initPromptDialogs from the site's dialog and calls it", () => {
    expect(js).toMatch(/import \{[^}]*\binitPromptDialogs\b[^}]*\} from "\/apps\/site\/prompt-dialog\.js"/);
    expect(js).toMatch(/^initPromptDialogs\(\);/m);
  });

  it("starts the tabs of the panels only: level 4 has no terminal", () => {
    expect(js).not.toContain("luz-terminal");
  });
});

describe("the catalogs, in en, es and ar", () => {
  const level = (lang) => Object.keys(catalogs[lang]).filter((key) => /^(inside\.(kind|start|l4)\.|footer\.kinds$)/.test(key)).sort();

  it("have the same keys for level 4 and the footer's kinds", () => {
    expect(level("es")).toEqual(level("en"));
    expect(level("ar")).toEqual(level("en"));
    expect(level("en")).toEqual(expect.arrayContaining(["inside.l4.p3.name", "inside.l4.p3.text", "inside.start.open", "inside.start.prompt", "inside.start.text", "footer.kinds"]));
  });

  it("have no weight for level 4 and no template line for the old kinds", () => {
    for (const lang of LANGS) {
      const keys = Object.keys(catalogs[lang]);
      expect(keys, lang).not.toContain("inside.upto");
      expect(keys.filter((key) => /^footer\.pkg\.(landing|cms|app|docs)$/.test(key)), lang).toEqual([]);
      expect(keys.filter((key) => key.startsWith("inside.kind.cms")), lang).toEqual([]);
    }
  });

  it("say, in the eyebrow, the four layers of the system in each language", () => {
    expect(catalogs.en["inside.l4.eyebrow"]).toBe("Base + Core + Catalog + your prompt");
    expect(catalogs.en["inside.l4.title"].replace(/<[^>]*>/g, "")).toBe("Your whole site from a prompt");
  });
});
