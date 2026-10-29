/**
 * `luz.conditional.css` in the snippet generator. The file is core's, for a
 * project that already has a design: the same as `luz.css` with the reset and
 * the bare elements limited to a region marked `data-luz`. The Install page
 * ("Get started", level 2 for an existing project) and the page "Migrate a
 * project to LUZ" tell the reader to load `luz.conditional.min.css` from the
 * CDN, or `@luz-ds/core/conditional.css` from a bundler. A CDN URL and its hash
 * are never typed (tests/docs-snippets.test.js): scripts/docs-site/snippets.js
 * generates them from the file that `npm pack` ships. So the generator must
 * know this file, with the version of core's package.json and the SHA-384 of
 * the bytes of `packages/core/dist/luz.conditional.min.css`, and the page it
 * writes must show both ways of loading it.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { FILES, renderSnippets, snippetData } from "../scripts/docs-site/snippets.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = "luz.conditional.min.css";
const core = JSON.parse(readFileSync(join(repo, "packages/core/package.json"), "utf-8"));
const URL_OF = `https://cdn.jsdelivr.net/npm/@luz-ds/core@${core.version}/dist/${FILE}`;
const sri = (bytes) => `sha384-${createHash("sha384").update(bytes).digest("base64")}`;

const unescape = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&amp;/g, "&");
/** Every `<code>` of the page, decoded: where the lines a reader copies are. */
const codeOf = (html) => [...html.matchAll(/<code[^>]*>([\s\S]*?)<\/code>/g)].map((m) => unescape(m[1].replace(/<[^>]+>/g, "")));

/** `readFile` of the real repository, except that the conditional file has bytes of its own, so a hash taken from another file fails. */
const BYTES = Buffer.from("/* the conditional stylesheet of this test */\n");
const readFile = (path, encoding) => (String(path).endsWith(`packages/core/dist/${FILE}`) ? BYTES : readFileSync(path, encoding));

describe("the snippet generator offers luz.conditional.min.css", () => {
  const data = () => snippetData({ root: repo, readFile });

  it("lists it among core's files, next to luz.min.css", () => {
    expect(FILES.core.css).toBe("luz.min.css");
    const listed = [FILES.core.css, FILES.core.js, ...FILES.core.chunks, ...Object.values(FILES.core).flat()].filter(Boolean);
    expect(listed).toContain(FILE);
  });

  it("gives it the CDN URL of core's version and the SHA-384 of the bytes of its own file", () => {
    const entry = data().entries[`core/${FILE}`];
    expect(entry, `an entry core/${FILE}`).toBeTruthy();
    expect(entry.url).toBe(URL_OF);
    expect(entry.integrity).toBe(sri(BYTES));
  });

  it("writes, in the page, the <link> from the CDN with its hash, the way every other stylesheet is linked", () => {
    const lines = codeOf(renderSnippets(data())).flatMap((code) => code.split("\n")).filter((l) => l.includes(FILE));
    expect(lines.length, `a line with ${FILE} in a code block of the page`).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line).toContain(`<link rel="stylesheet" href="${URL_OF}"`);
      expect(line).toContain(`integrity="${sri(BYTES)}"`);
      expect(line).toContain('crossorigin="anonymous"');
    }
  });

  it("writes, in the page, the import for a bundler: @luz-ds/core/conditional.css", () => {
    const code = codeOf(renderSnippets(data())).join("\n");
    expect(code).toContain('import "@luz-ds/core/conditional.css";');
  });

  it("is a file core ships and exports under that name", () => {
    expect(readFileSync(join(repo, "packages/core/pack-files.txt"), "utf-8").split("\n").map((l) => l.trim())).toContain(`dist/${FILE}`);
    expect(core.exports["./conditional.css"]).toBe("./dist/luz.conditional.css");
  });

  it("fails with the file name and \"run pnpm build\" when the file is missing", () => {
    const missing = (path, encoding) => {
      if (String(path).endsWith(`packages/core/dist/${FILE}`)) throw new Error("ENOENT");
      return readFileSync(path, encoding);
    };
    expect(() => snippetData({ root: repo, readFile: missing })).toThrow(/luz\.conditional\.min\.css[\s\S]*run pnpm build/);
  });
});
