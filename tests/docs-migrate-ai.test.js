/**
 * The page "Migrate a project to LUZ" (/docs/get-started/migrate/) in the files
 * for an AI agent. It is a long page about a workflow (five steps, with the old
 * CSS in a `legacy` layer, `data-luz` and `luz.conditional.css`) whose steps an
 * agent that writes HTML for a new page does not need, so, like the Figma page,
 * llms-full.txt carries its summary and a pointer to its URL, and the file keeps
 * its ideal: 400 KiB, fixed in tests/ai-files.test.js and never raised. The page
 * is listed in llms.txt like any other, with its front matter verbatim, in the
 * reading order of "Get started".
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { renderLlmsFull, renderLlmsTxt, renderPageMarkdown } from "../scripts/docs-site/ai.js";
import { scanSite } from "../scripts/docs-site/site.js";
import { SITE_URL } from "../vite.config.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = scanSite(join(root, "apps/docs"), root);

const ROUTE = "/docs/get-started/migrate/";
const page = site.byRoute.get(ROUTE);
const url = `${SITE_URL}${ROUTE.slice(1)}`;
// The same figure tests/ai-files.test.js keeps llms-full.txt under
const LLMS_FULL_IDEAL = 400 * 1024;
const bytes = (text) => Buffer.byteLength(text, "utf-8");

const txt = renderLlmsTxt(site, { siteUrl: SITE_URL });
const entryOf = (full) => {
  const start = full.indexOf(`URL: ${url}\n`);
  if (start < 0) return null;
  const from = full.lastIndexOf("\n## ", start) + 1;
  const next = full.indexOf("\n## ", start);
  return full.slice(from, next < 0 ? undefined : next);
};

describe("llms.txt lists the migration page", () => {
  it("has the page in the site (the page this file reads)", () => {
    expect(page, `${ROUTE} is a page of apps/docs/pages`).toBeTruthy();
    expect(page.meta.title).toBe("Migrate a project to LUZ");
  });

  it("lists it once, with its title and description verbatim", () => {
    const lines = txt.split("\n").filter((l) => l.includes(`](${url})`));
    expect(lines).toEqual([`- [${page.meta.title}](${url}): ${page.meta.description}`]);
  });

  it("lists it in Get started after Working with AI and before How LUZ is built", () => {
    const urls = [...txt.matchAll(/^- \[[^\]]*\]\(([^)\s]+)\)/gm)].map((m) => m[1]);
    const at = (route) => urls.indexOf(`${SITE_URL}${route.slice(1)}`);
    expect(at("/docs/get-started/ai/")).toBeGreaterThan(-1);
    expect(at(ROUTE)).toBe(at("/docs/get-started/ai/") + 1);
    expect(at("/docs/get-started/how-luz-is-built/")).toBe(at(ROUTE) + 1);
  });
});

describe("llms-full.txt and index.md carry the migration page as a summary with a pointer", () => {
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

  it("keeps llms-full.txt under its ideal with the page in", () => {
    expect(bytes(full())).toBeLessThanOrEqual(LLMS_FULL_IDEAL);
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
