/**
 * Joining the demos of many pages into one (the /debug/ page, plan luz-final-refactor E.3):
 * each demo was written for a page of its own, so its ids repeat (`#panel`, `#name`, `#code-1`).
 * `prefixIds(html, prefix)` of scripts/docs-site/debug.js gives every id of a fragment the prefix
 * of its component, `<prefix>-<id>`, and follows every reference to those ids, so the page has
 * no id twice and nothing points at the wrong demo.
 *
 * References: `for`, `aria-controls`, `aria-labelledby`, `aria-describedby`, `aria-owns` (the
 * last four are lists of ids), `popovertarget`, `commandfor`, `data-copy-from`, `list` and a link
 * to a fragment of the same page (`href="#id"`, an SVG `<use>` included). Only attributes of
 * tags: the text of a page that mentions `id="panel"` is left as it is.
 */
import { describe, expect, it } from "vitest";
import { descendants, findAll, parse } from "./helpers/html-dom.js";

// A module that does not exist yet is a failed expectation, not an error of the loader
const MODULE = "../scripts/docs-site/debug.js";
const { prefixIds } = await import(MODULE).catch(() => ({}));
const prefix = (html, name) => {
  expect(typeof prefixIds, "scripts/docs-site/debug.js exports prefixIds(html, prefix)").toBe("function");
  return prefixIds(html, name);
};

const idsOf = (html) => findAll(parse(html), (n) => n.attrs.has("id")).map((n) => n.attrs.get("id"));
const attrsOf = (html, name) => findAll(parse(html), (n) => n.attrs.has(name)).map((n) => n.attrs.get(name));

const FORM = `<form>
  <label for="name">Name</label>
  <input id="name" aria-describedby="hint name-error" list="options">
  <p id="hint">Your full name.</p>
  <p id="name-error">Required.</p>
  <datalist id="options"><option value="Ada"></option></datalist>
</form>`;

const TABS = `<div class="luz-tabs">
  <button id="tab-1" aria-controls="panel-1" aria-selected="true">One</button>
  <button id="tab-2" aria-controls="panel-2 panel-1">Two</button>
  <div id="panel-1" aria-labelledby="tab-1 tab-2">First</div>
  <div id="panel-2" aria-labelledby="tab-2" aria-owns="panel-1">Second</div>
</div>`;

describe("prefixIds: the ids of a demo get the prefix of its component", () => {
  it("renames every id to <prefix>-<id>", () => {
    expect(idsOf(prefix(FORM, "form"))).toEqual(["form-name", "form-hint", "form-name-error", "form-options"]);
  });

  it("makes the ids of two demos that repeat each other different when they are joined", () => {
    const joined = prefix(TABS, "tabs") + prefix(TABS, "accordion");
    const ids = idsOf(joined);
    expect(ids).toHaveLength(8);
    expect(new Set(ids).size, "no id twice").toBe(8);
  });

  it("follows `for`, `list`, `aria-describedby` (a list of ids) to the renamed ids", () => {
    const out = prefix(FORM, "form");
    expect(attrsOf(out, "for")).toEqual(["form-name"]);
    expect(attrsOf(out, "list")).toEqual(["form-options"]);
    expect(attrsOf(out, "aria-describedby")).toEqual(["form-hint form-name-error"]);
  });

  it("follows `aria-controls`, `aria-labelledby` and `aria-owns`, each a list of ids, keeping the order", () => {
    const out = prefix(TABS, "tabs");
    expect(attrsOf(out, "aria-controls")).toEqual(["tabs-panel-1", "tabs-panel-2 tabs-panel-1"]);
    expect(attrsOf(out, "aria-labelledby")).toEqual(["tabs-tab-1 tabs-tab-2", "tabs-tab-2"]);
    expect(attrsOf(out, "aria-owns")).toEqual(["tabs-panel-1"]);
  });

  it("follows `popovertarget`, `commandfor` and `data-copy-from`", () => {
    const html = `<button popovertarget="menu">Menu</button>
<div id="menu" popover>Items</div>
<button commandfor="dialog" command="show-modal">Open</button>
<dialog id="dialog">Hi</dialog>
<button data-copy-from="code-1">Copy</button>
<pre><code id="code-1">npm i</code></pre>`;
    const out = prefix(html, "demo");
    expect(attrsOf(out, "popovertarget")).toEqual(["demo-menu"]);
    expect(attrsOf(out, "commandfor")).toEqual(["demo-dialog"]);
    expect(attrsOf(out, "data-copy-from")).toEqual(["demo-code-1"]);
    expect(idsOf(out)).toEqual(["demo-menu", "demo-dialog", "demo-code-1"]);
  });

  it("follows a link to a fragment of the page, and an SVG <use>", () => {
    const html = `<a href="#section">Jump</a>
<h2 id="section">Section</h2>
<svg><symbol id="icon"></symbol><use href="#icon"></use></svg>`;
    const out = prefix(html, "demo");
    expect(attrsOf(out, "href")).toEqual(["#demo-section", "#demo-icon"]);
    expect(idsOf(out)).toEqual(["demo-section", "demo-icon"]);
  });

  it("leaves alone a link that is not a fragment of this page", () => {
    const html = `<h2 id="top">Top</h2>
<a href="#">Up</a>
<a href="/docs/components/button/#top">The docs</a>
<a href="https://example.org/#top">Elsewhere</a>`;
    const out = prefix(html, "demo");
    expect(attrsOf(out, "href")).toEqual(["#", "/docs/components/button/#top", "https://example.org/#top"]);
  });

  it("touches attributes of tags only: the text and the code of a demo stay as they were", () => {
    const html = `<p id="note">Give the field <code>id="name"</code> and write <kbd>for="name"</kbd>.</p>
<pre><code>&lt;label for=&quot;name&quot;&gt;Name&lt;/label&gt;</code></pre>`;
    const out = prefix(html, "demo");
    expect(idsOf(out)).toEqual(["demo-note"]);
    expect(out).toContain('<code>id="name"</code>');
    expect(out).toContain('<kbd>for="name"</kbd>');
    expect(out).toContain("&lt;label for=&quot;name&quot;&gt;Name&lt;/label&gt;");
  });

  it("changes nothing else: classes, other attributes, the text and the structure", () => {
    const out = prefix(TABS, "tabs");
    const strip = (html) => html.replace(/\s(id|aria-controls|aria-labelledby|aria-owns)="[^"]*"/g, "");
    expect(strip(out)).toBe(strip(TABS));
    const names = (html) => [...descendants(parse(html))].map((n) => n.name);
    expect(names(out)).toEqual(names(TABS));
  });

  it("returns a fragment with no id as it came", () => {
    const html = '<p class="luz-lead">No ids <a href="/docs/">here</a>.</p>';
    expect(prefix(html, "demo")).toBe(html);
  });
});
