/**
 * The word LUZ of the header and the footer (`.site-word`, apps/site/header.css) keeps its drawing
 * in forced colors. Firefox 155 forces the colour of the text and loses the foot of the L (the word
 * reads "IUZ"); the filter and the transform of the word make it a drawing, not a line of text,
 * so it opts out of the forced palette and takes the system's text colour itself. Chromium draws
 * it fine either way, so the rule is read from the source here; the Firefox review is in
 * dev/BROWSER-REVIEWS.md.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(repo, "apps/site/header.css"), "utf-8");

/** The text of every `@media (forced-colors: active) { … }` block, braces balanced. */
function forcedBlocks(source) {
  const blocks = [];
  const open = /@media \(forced-colors: active\)\s*\{/g;
  for (let match = open.exec(source); match; match = open.exec(source)) {
    let depth = 1;
    let i = open.lastIndex;
    while (depth && i < source.length) {
      if (source[i] === "{") depth += 1;
      else if (source[i] === "}") depth -= 1;
      i += 1;
    }
    blocks.push(source.slice(open.lastIndex, i - 1));
  }
  return blocks;
}

describe("the word LUZ of the site header in forced colors", () => {
  const rules = forcedBlocks(css).flatMap((block) => block.split("}").map((r) => r.trim()).filter(Boolean));
  const word = rules.filter((r) => /(^|[\s,])\.site-word(?![\w-])/.test(r.split("{")[0]));

  it("has a rule for .site-word inside a forced-colors block", () => {
    expect(word.length).toBeGreaterThan(0);
  });

  it("opts out of the forced palette and takes the system text colour", () => {
    const body = word.join(";");
    expect(body).toMatch(/forced-color-adjust:\s*none/);
    expect(body).toMatch(/color:\s*CanvasText/);
  });
});
