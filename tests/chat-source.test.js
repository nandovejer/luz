/**
 * <luz-chat> of @luz-ds/catalog (experimental), read as text: what no browser
 * needs to see.
 *   - what a model writes never reaches an HTML sink: the two files that draw
 *     it (chat.js and chat-markdown.js) use none (security.md SEC-IDX-2), and
 *     the Markdown is built with createElement and textContent
 *   - the chat's own words (EX-014): English and Spanish have the same keys,
 *     every key is a `data-luz-label-<key>` of the header, and every
 *     placeholder of one is in the other
 *   - the chunk is loaded by catalog.js, the experiment says so in its
 *     exception row, and nothing outside the catalog names it
 * The behaviour is in tests/chat.spec.js and tests/chat-docs.spec.js.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repo = fileURLToPath(new URL("../", import.meta.url));
const FILES = ["packages/catalog/src/chat.js", "packages/catalog/src/chat-markdown.js"];
const read = (rel) => {
  expect(existsSync(join(repo, rel)), `${rel} exists`).toBe(true);
  return readFileSync(join(repo, rel), "utf-8");
};
/** The code of a file, with its comments out: a word in a comment is not a call. */
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/.*$/gm, "$1");

describe("the files that draw what a model writes use no HTML sink", () => {
  const SINKS = [/\binnerHTML\b/, /\bouterHTML\b/, /\binsertAdjacentHTML\b/, /\bdocument\.write\b/, /\beval\s*\(/, /\bnew\s+Function\b/, /\bDOMParser\b/, /\bcreateContextualFragment\b/, /\bsetHTMLUnsafe\b/, /\bsrcdoc\b/, /\bsetAttribute\(\s*["']on/i];

  it.each(FILES)("%s has none", (file) => {
    const source = code(read(file));
    for (const sink of SINKS) expect(source, `${file}: ${sink}`).not.toMatch(sink);
  });

  it("chat-markdown.js builds elements with createElement and writes text with textContent or a string appended", () => {
    const source = code(read("packages/catalog/src/chat-markdown.js"));
    expect(source).toMatch(/createElement\(/);
    expect(source).toMatch(/textContent/);
  });

  it("chat.js gives a link an address only after the page of the source has been matched: a link to an unknown page is text", () => {
    const source = code(read("packages/catalog/src/chat.js"));
    // The address is read through URL and only http(s) is a link; javascript: and data: are never one
    expect(source).toMatch(/new URL\(/);
    expect(source).toMatch(/https\?/);
  });
});

describe("the chat's own words (EX-014)", () => {
  const source = read("packages/catalog/src/chat.js");
  /** The dictionary of a language: `en: { key: "text", … }`. */
  const dictionary = (lang) => {
    const block = new RegExp(`^  ${lang}: \\{\\n([\\s\\S]*?)\\n  \\},?$`, "m").exec(source)?.[1];
    expect(block, `a ${lang} dictionary in chat.js`).toBeTruthy();
    return Object.fromEntries([...block.matchAll(/^\s*([a-z]+): "((?:[^"\\]|\\.)*)",?$/gm)].map((m) => [m[1], m[2]]));
  };
  const en = dictionary("en");
  const es = dictionary("es");
  const header = /^\/\*\*([\s\S]*?)\*\//.exec(source)?.[1] ?? "";
  const labels = [...header.matchAll(/@attr \{string\} data-luz-label-([a-z]+) - /g)].map((m) => m[1]);

  it("has a dozen words at least, in English and in Spanish", () => {
    expect(Object.keys(en).length).toBeGreaterThanOrEqual(12);
    expect(Object.keys(es).length).toBeGreaterThanOrEqual(12);
  });

  it("gives Spanish exactly the keys of English", () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
  });

  it("declares a `data-luz-label-<key>` @attr in the header for every key, and no other", () => {
    expect([...labels].sort()).toEqual(Object.keys(en).sort());
  });

  it("writes no markup and no address in a word (strings are written with textContent)", () => {
    for (const [lang, words] of [["en", en], ["es", es]]) {
      for (const [key, text] of Object.entries(words)) {
        expect(text, `${lang}.${key}`).not.toMatch(/[<&]|:\/\/|www\.|@/);
        expect(text.length, `${lang}.${key}`).toBeGreaterThan(0);
        // the same rule as core's languages: at most 3 x the English + 40
        expect(text.length, `${lang}.${key}`).toBeLessThanOrEqual(en[key].length * 3 + 40);
      }
    }
  });

  it("is written down as an exception, EX-014, next to the dictionary and in EXCEPTIONS.md", () => {
    expect(source).toMatch(/luz-exception: EX-014/);
    expect(read("EXCEPTIONS.md")).toMatch(/^\| EX-014 \| SR-7 \| packages\/catalog\/src\/chat\.js \|/m);
  });
});

describe("the chunk of the chat", () => {
  it("is loaded by catalog.js for a page that has a <luz-chat>, by a literal import", () => {
    const loader = read("packages/catalog/src/catalog.js");
    expect(loader).toMatch(/["']luz-chat["']\s*:\s*\(\)\s*=>\s*import\(\s*["']\.\/chat\.js["']\s*\)/);
    expect(loader).toMatch(/document\.querySelector\(\s*["']luz-chat["']\s*\)/);
  });

  it("is built as a chunk of its own, with its Markdown module as a module, and has the two budget rows", () => {
    const build = read("scripts/build-catalog.js");
    expect(/chunks:\s*\[([^\]]*)\]/.exec(build)?.[1]).toContain('"chat.js"');
    expect(/\bjs:\s*\[([^\]]*)\]/.exec(build)?.[1]).toContain('"chat-markdown.js"');
    const names = JSON.parse(read("budgets.json")).budgets.map((b) => b.name);
    expect(names).toContain("catalog JS lazy chunk: chat");
    expect(names).toContain("catalog component CSS: chat (experimental)");
  });

  it("is named by no source outside the catalog, its docs and the tests (tokens and core know nothing of it)", () => {
    const offenders = [];
    const walk = (dir) => {
      for (const name of readdirSync(join(repo, dir))) {
        if (name === "node_modules" || name === "dist") continue;
        const rel = `${dir}/${name}`;
        if (statSync(join(repo, rel)).isDirectory()) walk(rel);
        else if (/\.(?:css|js|json)$/.test(name) && /luz-chat/.test(readFileSync(join(repo, rel), "utf-8"))) offenders.push(rel);
      }
    };
    expect(existsSync(join(repo, "packages/catalog/src/chat.js")), "the chat exists").toBe(true);
    for (const pkg of ["tokens", "core"]) walk(`packages/${pkg}/src`);
    expect(offenders).toEqual([]);
  });
});
