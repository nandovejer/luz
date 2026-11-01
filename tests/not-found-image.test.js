/**
 * The picture of the docs 404 page, as a published file (apps/docs/assets/not-found/, apps/docs/404.html):
 *
 *  - it is a WebP (RIFF....WEBP), at most 120,000 B, and the PNG it came from is not published;
 *  - its LICENSE is the repository's, MIT and only MIT (RL-13): no OFL, no Creative Commons, no dual licence;
 *  - the page's source has an img with an alt;
 *  - the Pages build serves it from /assets/ with a hashed name, not from /apps/. That is read from docs/404.html,
 *    and only when that file is newer than the page's source: docs/ is generated and git-ignored, and a stale one
 *    says nothing. (`pnpm pages:build` writes it.)
 * The rendering is tests/not-found-image.spec.js.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(repo, "apps/docs/assets/not-found");
const source = join(repo, "apps/docs/404.html");
const built = join(repo, "docs/404.html");
const CEILING = 120_000;

const files = () => (existsSync(dir) ? readdirSync(dir) : []);
const webps = () => files().filter((f) => f.endsWith(".webp"));
const builtIsFresh = existsSync(built) && existsSync(source) && statSync(built).mtimeMs >= statSync(source).mtimeMs;

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

describe("the 404 page uses it", () => {
  it("apps/docs/404.html has an img with a non-empty alt", () => {
    const html = readFileSync(source, "utf-8");
    const img = html.match(/<img\b[^>]*>/i)?.[0] ?? "";
    expect(img, "an img").not.toBe("");
    expect(img).toMatch(/\balt="[^"]{10,}"/);
    expect(img).toMatch(/\.webp"/);
  });

  it.skipIf(!builtIsFresh)("the built docs/404.html serves a hashed .webp from /assets/, not from /apps/", () => {
    const img = readFileSync(built, "utf-8").match(/<img\b[^>]*>/i)?.[0] ?? "";
    const src = img.match(/\bsrc="([^"]+)"/)?.[1] ?? "";
    expect(src, "src").toMatch(/assets\/[^/"]+-[A-Za-z0-9_-]{8}\.webp$/);
    expect(src).not.toContain("/apps/");
    expect(existsSync(join(repo, "docs/assets", src.split("/assets/")[1] ?? "none"))).toBe(true);
  });
});
