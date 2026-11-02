/**
 * The page "With a bundler or framework" (/docs/get-started/bundler/) in the files for an AI agent. It is a long page of
 * steps (the import order, the layers, the fonts, one block per tool) that an agent writing HTML for a page does not need,
 * so, like the migration and the Figma pages, llms-full.txt carries its summary and a pointer to its URL (SUMMARY_POINTERS
 * in scripts/docs-site/ai.js) and the file keeps its ideal: 416 KiB, fixed in tests/ai-files.test.js and never raised. The
 * page is listed in llms.txt like any other, with its front matter verbatim.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { renderLlmsFull, renderLlmsTxt, renderPageMarkdown } from "../scripts/docs-site/ai.js";
import { scanSite } from "../scripts/docs-site/site.js";
import { SITE_URL } from "../vite.config.js";
import { warnIfOver } from "./helpers/warn-if-over.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = scanSite(join(root, "apps/docs"), root);

const ROUTE = "/docs/get-started/bundler/";
const page = site.byRoute.get(ROUTE);
const url = `${SITE_URL}${ROUTE.slice(1)}`;
// The same figure tests/ai-files.test.js keeps llms-full.txt under
const LLMS_FULL_IDEAL = 416 * 1024;
const bytes = (text) => Buffer.byteLength(text, "utf-8");

const txt = renderLlmsTxt(site, { siteUrl: SITE_URL });
const entryOf = (full) => {
  const start = full.indexOf(`URL: ${url}\n`);
  if (start < 0) return null;
  const from = full.lastIndexOf("\n## ", start) + 1;
  const next = full.indexOf("\n## ", start);
  return full.slice(from, next < 0 ? undefined : next);
};

describe("llms.txt lists the bundler page", () => {
  it("has the page in the site (the page this file reads)", () => {
    expect(page, `${ROUTE} is a page of apps/docs/pages`).toBeTruthy();
    expect(page.meta.title).toBe("With a bundler or framework");
  });

  it("lists it once, with its title and description verbatim", () => {
    const lines = txt.split("\n").filter((l) => l.includes(`](${url})`));
    expect(lines).toEqual([`- [${page.meta.title}](${url}): ${page.meta.description}`]);
  });
});

describe("llms-full.txt and index.md carry the bundler page as a summary with a pointer", () => {
  // computed in each test, so a throw fails that test with its message and not the whole file
  const full = () => renderLlmsFull(site, { siteUrl: SITE_URL });

  it("has an entry with its title, its URL and its description", () => {
    const entry = entryOf(full());
    expect(entry, `an entry with URL: ${url}`).not.toBeNull();
    expect(entry.startsWith(`## ${page.meta.title}\nURL: ${url}\n`)).toBe(true);
    expect(entry).toContain(page.meta.description);
  });

  it("says in one short paragraph after the description where the steps are, and does not copy the page", () => {
    const entry = entryOf(full());
    expect(entry, `an entry with URL: ${url}`).not.toBeNull();
    const after = entry.split(page.meta.description)[1] ?? "";
    expect(after.trim().length, "a summary and a pointer").toBeGreaterThan(40);
    expect(after.trim().split(/\n\s*\n/).length, "one paragraph").toBe(1);
    expect(entry).not.toMatch(/^```/m);
    expect(entry).not.toMatch(/^### /m);
    expect(bytes(entry), "a summary, not the page").toBeLessThan(1500);
  });

  it("keeps llms-full.txt under its ideal with the page in (a warning, to optimise, when over: owner, 2026-11-02)", () => {
    warnIfOver("llms-full.txt", bytes(full()), LLMS_FULL_IDEAL);
    expect(bytes(full()), "the file is built").toBeGreaterThan(0);
  });

  it("writes the same summary to the index.md of the page", () => {
    const entry = entryOf(full());
    expect(entry, `an entry with URL: ${url}`).not.toBeNull();
    const md = renderPageMarkdown(site, page, { siteUrl: SITE_URL });
    expect(md.startsWith(`# ${page.meta.title}\n\n${page.meta.description}\n`)).toBe(true);
    const after = (entry.split(page.meta.description)[1] ?? "").trim();
    expect(after.length).toBeGreaterThan(40);
    expect(md.trim().endsWith(after)).toBe(true);
    expect(md).not.toMatch(/^```/m);
  });
});
