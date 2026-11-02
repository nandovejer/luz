/**
 * The picture of the docs 404 page, as a published file (apps/docs/assets/not-found/, apps/docs/404.html):
 *
 *  - it is a WebP (RIFF....WEBP), at most 120,000 B, and the PNG it came from is not published;
 *  - its LICENSE is the repository's, MIT and only MIT (RL-13): no OFL, no Creative Commons, no dual licence;
 *  - the page's source has no img and no figure: the picture is the background of `.docs-not-found::before`.
 * The rendering is tests/not-found-image.spec.js.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(repo, "apps/docs/assets/not-found");
const source = join(repo, "apps/docs/404.html");
const CEILING = 120_000;

const files = () => (existsSync(dir) ? readdirSync(dir) : []);
const webps = () => files().filter((f) => f.endsWith(".webp"));

describe("the 404 picture is a small WebP", () => {
  it("has at least one .webp in apps/docs/assets/not-found/", () => {
    expect(webps().length).toBeGreaterThan(0);
  });

  it("every .webp starts with RIFF....WEBP", () => {
    for (const name of webps()) {
      const head = readFileSync(join(dir, name)).subarray(0, 12);
      expect(head.subarray(0, 4).toString("latin1"), `${name}: RIFF`).toBe("RIFF");
      expect(head.subarray(8, 12).toString("latin1"), `${name}: WEBP`).toBe("WEBP");
    }
  });

  it(`every .webp is at most ${CEILING} B`, () => {
    for (const name of webps()) expect(statSync(join(dir, name)).size, name).toBeLessThanOrEqual(CEILING);
  });

  it("no .png is published beside it", () => {
    expect(files().filter((f) => /\.png$/i.test(f))).toEqual([]);
  });
});

describe("the 404 picture has the repository's licence, and only that", () => {
  const text = () => readFileSync(join(dir, "LICENSE"), "utf-8");

  it("has a LICENSE with the MIT License", () => {
    expect(existsSync(join(dir, "LICENSE"))).toBe(true);
    expect(text()).toContain("MIT License");
  });

  it("names no other licence: no OFL, no Creative Commons, no dual licence", () => {
    expect(text()).not.toMatch(/\bOFL\b|Open Font License|Creative Commons|\bCC[- ]BY|\bCC0\b|dual[- ]licen[cs]|Apache|GPL|BSD/i);
  });
});

describe("the 404 page uses it as a decorative background, not as a picture", () => {
  const html = () => readFileSync(source, "utf-8");
  const css = () => readFileSync(join(repo, "apps/docs/reference.css"), "utf-8");

  it("apps/docs/404.html has no img and no figure", () => {
    expect(html()).not.toMatch(/<img\b/i);
    expect(html()).not.toMatch(/<figure\b/i);
  });

  it("the stylesheet paints 404-matrix-1000.webp as the background of .docs-not-found::before, and that file is published", () => {
    const rule = css().match(/\.docs-not-found::before\s*\{[^}]*\}/)?.[0] ?? "";
    expect(rule, "a .docs-not-found::before rule").not.toBe("");
    expect(rule).toMatch(/url\(["']?[^)"']*404-matrix-1000\.webp["']?\)/);
    expect(webps()).toContain("404-matrix-1000.webp");
  });
});
