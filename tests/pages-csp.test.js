/**
 * The Content-Security-Policy <meta> of the Pages site (vite.config.js, the
 * `pages-csp` plugin): every page has PAGES_CSP, with `frame-src 'self'`, and
 * the Embed page of the catalog, whose live demo loads a player after the
 * visitor agrees, is the one page whose `frame-src` also names the privacy
 * mode of the video service. Its source is matched as the build hands it over:
 * apps/docs/pages/catalog/embed.html, and apps/docs/_virtual/<lang>/catalog/embed.html
 * for a language of the docs. Every other directive is the same everywhere.
 */
import { describe, expect, it } from "vitest";

import config, { PAGES_CSP } from "../vite.config.js";

const FRAME_ORIGIN = "https://www.youtube-nocookie.com";
const HTML = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>x</title></head><body></body></html>';

const plugin = () => {
  const plugins = config({ mode: "pages", command: "build" }).plugins.flat();
  return plugins.find((p) => p?.name === "pages-csp");
};
/** The policy the plugin writes into the page the build hands over at `path`, as { directive: [sources] }. */
function policyOf(path) {
  const html = plugin().transformIndexHtml.handler(HTML, path === undefined ? undefined : { path });
  const metas = [...html.matchAll(/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/g)];
  expect(metas, `${path}: one CSP meta`).toHaveLength(1);
  return parse(metas[0][1]);
}
const parse = (policy) => Object.fromEntries(policy.split(";").map((d) => d.trim()).filter(Boolean).map((d) => { const [name, ...sources] = d.split(/\s+/); return [name, sources]; }));

const EMBED_PAGES = [
  "/apps/docs/pages/catalog/embed.html",
  "/apps/docs/_virtual/es/catalog/embed.html",
  "/apps/docs/_virtual/ar/catalog/embed.html",
];
const OTHER_PAGES = [
  "/apps/docs/pages/catalog/faq.html",
  "/apps/docs/pages/catalog/index.html",
  "/apps/docs/pages/components/player.html",
  "/apps/docs/pages/components/embed.html",
  "/apps/docs/_virtual/es/catalog/faq.html",
  "/apps/docs/_virtual/es/components/embed.html",
  "/apps/docs/pages/catalog/embed.html.old",
  "/apps/docs/pages/catalog/embed/index.html",
  "/apps/docs/pages/catalog/not-embed.html",
  "/apps/landing/index.html",
  "/index.html",
  "/404.html",
  "/docs/catalog/embed/index.html",
];

describe("the CSP of the Pages site and the Embed page", () => {
  it("the plugin is part of the pages build, and not of the dev server", () => {
    expect(plugin()).toBeDefined();
    const dev = config({ mode: "development", command: "serve" }).plugins.flat();
    expect(dev.some((p) => p?.name === "pages-csp")).toBe(false);
  });

  it("PAGES_CSP itself keeps frame-src 'self': no service is named in the policy every page shares", () => {
    expect(parse(PAGES_CSP)["frame-src"]).toEqual(["'self'"]);
    expect(PAGES_CSP).not.toMatch(/youtube/i);
  });

  it.each(EMBED_PAGES)("%s: frame-src is 'self' and the privacy mode of the video service, nothing else", (path) => {
    expect(policyOf(path)["frame-src"]).toEqual(["'self'", FRAME_ORIGIN]);
  });

  it.each(EMBED_PAGES)("%s: every other directive is PAGES_CSP's, word for word", (path) => {
    const { ["frame-src"]: embedFrames, ...others } = policyOf(path);
    const { ["frame-src"]: frames, ...shared } = parse(PAGES_CSP);
    expect(embedFrames).not.toEqual(frames);
    expect(others).toEqual(shared);
    expect(Object.keys(policyOf(path))).toEqual(Object.keys(parse(PAGES_CSP)));
  });

  it.each(OTHER_PAGES)("%s: the policy is PAGES_CSP, with frame-src 'self' only", (path) => {
    expect(policyOf(path)).toEqual(parse(PAGES_CSP));
    expect(policyOf(path)["frame-src"]).toEqual(["'self'"]);
  });

  it("a page handed over with no path gets PAGES_CSP too", () => {
    expect(policyOf(undefined)).toEqual(parse(PAGES_CSP));
  });

  it("the meta is written right after the charset, as before, and the page is otherwise untouched", () => {
    const html = plugin().transformIndexHtml.handler(HTML, { path: EMBED_PAGES[0] });
    expect(html).toMatch(/<meta charset="utf-8">\n {2}<meta http-equiv="Content-Security-Policy" content="[^"]+">/);
    expect(html.replace(/\n {2}<meta http-equiv="Content-Security-Policy"[^>]*>/, "")).toBe(HTML);
  });

  it("no other directive names a third-party host: default-src, script-src, connect-src, img-src and the rest stay as they are", () => {
    for (const path of EMBED_PAGES) {
      const others = Object.fromEntries(Object.entries(policyOf(path)).filter(([name]) => name !== "frame-src"));
      expect(JSON.stringify(others), path).not.toMatch(/youtube|https:\/\/(?!\*)/i);
    }
  });
});
