/**
 * The script of the docs 404 page (apps/docs/not-found.js): it picks the language of the page from the browser's
 * own list, and from nothing else. The page is served at any missing URL, so the script must never read the
 * address, the referrer or anything stored, and never send or write anything out (security.md SEC-MISC-5).
 * What it does with a language is tests/not-found-lang.spec.js.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const file = join(repo, "apps/docs/not-found.js");

/** The code only: block comments, line comments and string/template contents out of the way would hide a call, so only comments go. */
const code = () =>
  readFileSync(file, "utf-8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

describe("apps/docs/not-found.js", () => {
  it("exists", () => {
    expect(existsSync(file)).toBe(true);
  });

  it("reads the browser's languages", () => {
    expect(existsSync(file), "the script exists").toBe(true);
    expect(code()).toMatch(/navigator\.languages/);
    expect(code()).toMatch(/navigator\.language\b/);
  });

  const FORBIDDEN = [
    "location",
    "document.URL",
    "document.documentURI",
    "document.baseURI",
    "document.referrer",
    "document.cookie",
    "history",
    "fetch",
    "XMLHttpRequest",
    "sendBeacon",
    "WebSocket",
    "EventSource",
    "localStorage",
    "sessionStorage",
    "indexedDB",
    "cookie",
    "geolocation",
    "eval",
    "Function",
    "innerHTML",
    "outerHTML",
    "insertAdjacentHTML",
    "document.write",
  ];
  for (const word of FORBIDDEN) {
    it(`never mentions ${word}`, () => {
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      expect(existsSync(file), "the script exists").toBe(true);
      expect(code()).not.toMatch(new RegExp(`(^|[^\\w$])${escaped}(?![\\w$])`));
    });
  }

  it("imports nothing and loads nothing", () => {
    expect(existsSync(file), "the script exists").toBe(true);
    expect(code()).not.toMatch(/\bimport\b|\brequire\s*\(/);
  });
});
