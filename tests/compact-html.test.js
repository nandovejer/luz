/**
 * compactHtml() of scripts/docs-site/html.js: the generator drops the
 * indentation and the blank lines a template leaves between tags, so the
 * built pages are smaller, without changing what a browser renders.
 *
 *   - Leading indentation and blank lines are removed.
 *   - One line break stays (it is white space between inline elements).
 *   - <pre>, <textarea>, <script> and <style> keep their content byte for byte.
 */
import { describe, expect, it } from "vitest";
import { compactHtml } from "../scripts/docs-site/html.js";

describe("compactHtml", () => {
  it("strips the indentation at the start of a line", () => {
    expect(compactHtml("<ul>\n    <li>One</li>\n        <li>Two</li>\n</ul>")).toBe(
      "<ul>\n<li>One</li>\n<li>Two</li>\n</ul>",
    );
  });

  it("collapses blank lines into a single line break", () => {
    expect(compactHtml("<p>A</p>\n\n\n   \n\t\n<p>B</p>")).toBe("<p>A</p>\n<p>B</p>");
  });

  it("strips the trailing spaces of a line", () => {
    expect(compactHtml("<p>A</p>   \t\n<p>B</p>")).toBe("<p>A</p>\n<p>B</p>");
  });

  it("keeps a line break between inline elements, so the space between them stays", () => {
    const out = compactHtml("<a href=\"/a/\">One</a>\n      <a href=\"/b/\">Two</a>");
    expect(out).toBe("<a href=\"/a/\">One</a>\n<a href=\"/b/\">Two</a>");
    expect(out).toMatch(/<\/a>\s<a /);
  });

  it("leaves the spaces inside a line alone", () => {
    expect(compactHtml("<p>Some   text  here</p>\n  <p>and   more</p>")).toBe("<p>Some   text  here</p>\n<p>and   more</p>");
  });

  for (const tag of ["pre", "textarea", "script", "style"]) {
    it(`leaves the content of <${tag}> untouched, byte for byte`, () => {
      const inner = `\n    first line   \n\n\n        indented\t\n   \nlast`;
      const block = `<${tag} class="x">${inner}</${tag}>`;
      const out = compactHtml(`<div>\n    <p>A</p>\n\n\n    ${block}\n\n    <p>B</p>\n</div>`);
      expect(out).toContain(block);
      expect(out).toBe(`<div>\n<p>A</p>\n${block}\n<p>B</p>\n</div>`);
    });
  }

  it("compacts the markup around a <pre> but not inside it", () => {
    const pre = "<pre><code>if (a) {\n    b();\n\n}\n</code></pre>";
    expect(compactHtml(`<section>\n        ${pre}\n\n        <p>after</p>\n</section>`)).toBe(
      `<section>\n${pre}\n<p>after</p>\n</section>`,
    );
  });

  it("treats the tag names case-insensitively and does not mistake <prefix> for <pre>", () => {
    const upper = "<PRE>\n   keep\n\n   me\n</PRE>";
    expect(compactHtml(`<div>\n    ${upper}\n</div>`)).toBe(`<div>\n${upper}\n</div>`);
    expect(compactHtml("<prefix>\n    a\n\n    b\n</prefix>")).toBe("<prefix>\na\nb\n</prefix>");
  });

  it("compacts each block on its own when there are several protected elements", () => {
    const a = "<pre>\n  a\n\n</pre>";
    const b = "<script>\n    let x = 1;\n\n    let y = 2;\n</script>";
    expect(compactHtml(`<p>1</p>\n\n  ${a}\n\n    <p>2</p>\n\n  ${b}\n\n  <p>3</p>`)).toBe(
      `<p>1</p>\n${a}\n<p>2</p>\n${b}\n<p>3</p>`,
    );
  });

  it("returns a string with no line breaks as it is", () => {
    expect(compactHtml("<p>one line</p>")).toBe("<p>one line</p>");
  });
});
