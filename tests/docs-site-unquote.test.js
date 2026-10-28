/**
 * `unquoteAttributes()` of scripts/docs-site/site.js: the home's pages weigh against the 80 KiB ceiling of a docs page,
 * so an attribute value that needs no quotes is written without them (`class=luz-btn`), two bytes each. Valid HTML5,
 * and nothing else changes: the same attributes with the same values, the same text.
 *
 * - A value is unquoted only when it has no white space, quote, `=`, `<`, `>`, backtick or `&`, and is not empty.
 * - A value that ends with a slash and is the last of its tag keeps its quotes (`href=/>` would read as `/>`), and a
 *   tag that ends with `/>` is left as written.
 * - Nothing inside `<pre>`, `<script>`, `<template>`, `<style>` or `<textarea>` is touched, nor their own tags.
 * - Reading it back gives the page it came from: the tokenizer of @luz-ds/check sees the same attributes before and after.
 */
import { describe, expect, it } from "vitest";
import { unquoteAttributes } from "../scripts/docs-site/site.js";
import { descendants, parse } from "./helpers/html-dom.js";
import { quoted } from "./helpers/quoted-attributes.js";

const attributesOf = (html) => [...descendants(parse(html, "<sample>"))].map((node) => [node.name, [...node.attrs].map(([name, value]) => [name, value])]);

describe("unquoteAttributes: what loses its quotes", () => {
  it("drops the quotes of a value with only letters, digits, dashes, dots, colons, slashes and #", () => {
    expect(unquoteAttributes('<a class="luz-btn luz-btn--lg" href="#inside" id="a-b_c.d:e" data-n="12">x</a>')).toBe('<a class="luz-btn luz-btn--lg" href=#inside id=a-b_c.d:e data-n=12>x</a>');
    expect(unquoteAttributes('<section id="faq" aria-labelledby="faq-title"></section>')).toBe("<section id=faq aria-labelledby=faq-title></section>");
  });

  it("keeps the quotes of a value with white space, a quote, =, <, a backtick or &, and of an empty one", () => {
    for (const value of ["a b", "it's", "a=b", "a<b", "a`b", "a&amp;b", ""]) {
      const tag = `<a title="${value}" href="#x">y</a>`;
      expect(unquoteAttributes(tag), JSON.stringify(value)).toBe(`<a title="${value}" href=#x>y</a>`);
    }
  });

  it("never breaks a tag that holds a > in a quoted value: that value is as it was", () => {
    expect(unquoteAttributes('<a title="a>b">y</a>')).toContain('title="a>b"');
  });

  it("keeps the quotes of a last value that ends with a slash, which would close the tag: href=/> is /> to a tokenizer", () => {
    expect(unquoteAttributes('<a href="/docs/">x</a>')).toBe('<a href="/docs/">x</a>');
    // ... but not when another attribute follows it
    expect(unquoteAttributes('<a href="/docs/" class="k">x</a>')).toBe('<a href=/docs/ class=k>x</a>');
  });

  it("leaves a tag that ends with /> as written, and the tags of a svg with it", () => {
    const svg = '<svg viewBox="0 0 32 32" width="22" height="22"><path fill="currentColor" d="M0 0Z"/><use href="#i0"/></svg><br/><img src="a.png" alt="x"/>';
    expect(unquoteAttributes(svg)).toBe('<svg viewBox="0 0 32 32" width=22 height=22><path fill="currentColor" d="M0 0Z"/><use href="#i0"/></svg><br/><img src="a.png" alt="x"/>');
  });
});

describe("unquoteAttributes: what it leaves alone", () => {
  it("does not touch pre, script, template, style or textarea, nor the tags that open them", () => {
    for (const block of [
      '<pre class="luz-code-block" tabindex="0"><code id="c">&lt;a href="x"&gt;</code></pre>',
      '<script type="module" src="/a.js">let a = "<b class=\\"x\\">";</script>',
      '<template id="t"><p class="q">x</p></template>',
      '<style media="all">a[href="x"] { color: red }</style>',
      '<textarea name="n" rows="3"><p class="x"></textarea>',
    ]) expect(unquoteAttributes(block), block).toBe(block);
  });

  it("changes the tags around them, and only those", () => {
    expect(unquoteAttributes('<div class="a"><pre class="p"><code id="c">x</code></pre><p class="b">y</p></div>')).toBe('<div class=a><pre class="p"><code id="c">x</code></pre><p class=b>y</p></div>');
  });

  it("leaves the text between tags alone: a quoted word in a paragraph is not an attribute", () => {
    expect(unquoteAttributes('<p class="a">Say class="b" aloud, it is <code>a="b"</code>.</p>')).toBe('<p class=a>Say class="b" aloud, it is <code>a="b"</code>.</p>');
  });
});

describe("unquoteAttributes: the same page", () => {
  const sample = `<!DOCTYPE html><html lang="en" dir="ltr"><body class="o-page">
<a class="luz-btn luz-btn--primary luz-btn--lg" href="#inside">Get started</a>
<a href="/docs/">Docs</a><a href="/docs/get-started/" hreflang="en" class="x">Guide</a>
<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i7"/></svg>
<input type="email" value="ana@luz.dev" aria-label="Email address"><img alt="" src="/a.png">
<pre class="luz-code-block" data-lang="css"><code>a { color: red }</code></pre>
<p lang="en" title="it's &amp; more">x</p>
</body></html>`;

  it("reads back with the same elements, the same attributes and the same values", () => {
    expect(attributesOf(unquoteAttributes(sample))).toEqual(attributesOf(sample));
  });

  it("is shorter, and giving the quotes back gives the page it came from", () => {
    const out = unquoteAttributes(sample);
    expect(out.length).toBeLessThan(sample.length);
    expect(attributesOf(quoted(out))).toEqual(attributesOf(sample));
    // Idempotent: what has no quotes to lose is left as it is
    expect(unquoteAttributes(out)).toBe(out);
  });
});
