/**
 * The Embed page of the docs and the one service it may frame (the policy that
 * lets it is in tests/pages-csp.test.js):
 *   - the host of the video service is in the Embed page, in English and in
 *     Spanish, and in no other page, app file or package source (RL-12: a package
 *     asks nothing of a third party, and no other page names one);
 *   - the live demo agrees with the policy: its player is on the one origin the
 *     policy allows, its poster is a file of this site, it asks before it loads
 *     anything (consent="external" and the ask block), and its words are in the markup.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { EMBED_FRAME_ORIGIN } from "../vite.config.js";

const repo = fileURLToPath(new URL("../", import.meta.url));
const read = (rel) => readFileSync(join(repo, rel), "utf-8");
const EMBED_PAGES = ["apps/docs/pages/catalog/embed.html", "apps/docs/i18n/es/pages/catalog/embed.html"];
// youtu.be is not here: the 404 page links to a video, which names no frame and loads nothing
const SERVICE = /youtube(?:-nocookie)?\.com|ytimg/i;
const TEXT = /\.(?:html|css|js|json|md|txt|svg|vtt)$/;

/** Every text file under `dir` (skipping node_modules and dist), as repo-relative paths. */
function files(dir, out = []) {
  for (const name of readdirSync(join(repo, dir))) {
    if (name === "node_modules" || name === "dist") continue;
    const rel = `${dir}/${name}`;
    if (statSync(join(repo, rel)).isDirectory()) files(rel, out);
    else if (TEXT.test(name)) out.push(rel);
  }
  return out;
}

/** The first <luz-embed> of a page: its opening tag and its markup. */
function demo(rel) {
  const html = read(rel);
  // the element itself, not the `<luz-embed>` of the page's front matter
  const start = html.search(/<luz-embed\s/);
  expect(start, `${rel} has a <luz-embed>`).toBeGreaterThan(-1);
  const end = html.indexOf("</luz-embed>", start);
  const markup = html.slice(start, end + "</luz-embed>".length);
  return { html, markup, tag: markup.slice(0, markup.indexOf(">") + 1) };
}
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

describe("the video service is named by the Embed page only", () => {
  it("is named by the Embed page, in English and in Spanish", () => {
    for (const rel of EMBED_PAGES) expect(read(rel), rel).toMatch(SERVICE);
  });

  it("is named by no other page of the docs, in any language, nor by any other file of the apps", () => {
    const named = files("apps").filter((rel) => !EMBED_PAGES.includes(rel) && SERVICE.test(read(rel)));
    expect(named).toEqual([]);
  });

  it("is named by no source of a package (RL-12), and by no script of the site generator", () => {
    const sources = ["core", "tokens", "catalog", "check"].flatMap((name) => (existsSync(join(repo, `packages/${name}/src`)) ? files(`packages/${name}/src`) : []));
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.filter((rel) => SERVICE.test(read(rel)))).toEqual([]);
    expect(files("scripts/docs-site").filter((rel) => SERVICE.test(read(rel)))).toEqual([]);
  });

  it("is named in the repository's own config only as the origin the policy allows", () => {
    expect(EMBED_FRAME_ORIGIN).toBe("https://www.youtube-nocookie.com");
    expect(read("vite.config.js").match(/youtube[^\s"'`]*/gi)?.every((m) => /^youtube-nocookie/i.test(m))).toBe(true);
  });
});

describe.each(EMBED_PAGES)("the live demo of %s", (rel) => {
  it("loads its player from the one origin the policy allows, over https, with the address written in full", () => {
    const { tag } = demo(rel);
    const src = attr(tag, "src");
    expect(src, "src").toBeTruthy();
    expect(new URL(src).origin).toBe(EMBED_FRAME_ORIGIN);
    expect(new URL(src).protocol).toBe("https:");
  });

  it("has a poster that is a file of this site: a path of its own, not an address, and not an image of the service", () => {
    const { markup } = demo(rel);
    const img = markup.match(/<img\b[^>]*>/)?.[0];
    expect(img, "an <img> in the demo").toBeTruthy();
    const src = attr(img, "src");
    expect(src).toMatch(/^\/(?!\/)/);
    expect(src).not.toMatch(/^[a-z][a-z0-9+.-]*:|^\/\//i);
    expect(markup).not.toMatch(/ytimg|i\.ytimg|img\.youtube/i);
    expect(existsSync(join(repo, src.slice(1))), `${src} exists in the repository`).toBe(true);
    expect(attr(img, "alt"), "a poster is decoration: the title is the name").toBe("");
  });

  it("asks before it loads anything: consent=\"external\" and the ask block with its three answers", () => {
    const { tag, markup } = demo(rel);
    expect(attr(tag, "consent")).toBe("external");
    expect(markup).toMatch(/<div class="luz-embed__ask" data-luz-embed-ask hidden>/);
    const values = [...markup.slice(markup.indexOf("data-luz-embed-ask")).matchAll(/<button\b[^>]*\bvalue="([^"]+)"/g)].map((m) => m[1]);
    expect(values).toEqual(["once", "always", "cancel"]);
  });

  it("keeps its answer under a key of its own, so the demo does not count as an answer for this site", () => {
    const key = attr(demo(rel).tag, "data-luz-consent-key");
    expect(key).toMatch(/^luz-[\w-]+$/);
    expect(key).not.toBe("luz-consent");
  });

  it("is the page without JavaScript: the link points to the video where it lives, and has a visible title", () => {
    const { markup } = demo(rel);
    const link = markup.match(/<a class="luz-embed__link"[^>]*>/)?.[0];
    expect(link).toBeTruthy();
    expect(attr(link, "href")).toMatch(/^https:\/\//);
    expect(markup).toMatch(/<span class="luz-embed__title">[^<]+<\/span>/);
    expect(markup).toMatch(/<span class="u-sr-only">[^<]+<\/span>/);
  });

  it("is inside the specimen of the page and before the Known issues heading", () => {
    const { html } = demo(rel);
    const at = html.search(/<luz-embed\s/);
    expect(at).toBeLessThan(html.indexOf('id="known-issues"'));
    expect(html.slice(0, at)).toMatch(/data-docs-specimen/);
  });
});

describe("the two Embed pages agree", () => {
  it("have the same player, link, poster, consent category and key in the demo", () => {
    const [en, es] = EMBED_PAGES.map((rel) => demo(rel));
    for (const name of ["src", "consent", "data-luz-consent-key"]) expect(attr(es.tag, name), name).toBe(attr(en.tag, name));
    const poster = (d) => attr(d.markup.match(/<img\b[^>]*>/)[0], "src");
    expect(poster(es)).toBe(poster(en));
    const href = (d) => attr(d.markup.match(/<a class="luz-embed__link"[^>]*>/)[0], "href");
    expect(href(es)).toBe(href(en));
  });
});
