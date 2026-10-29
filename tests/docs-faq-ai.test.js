/**
 * `<luz-faq>` in the files for an AI agent. The FAQ of "Get started" is a
 * catalog element (light DOM, CSS only): a `<luz-faq>` holding a title, a lead
 * and `details`/`summary` items. `scripts/docs-site/ai.js` writes a page as text
 * for llms-full.txt and for the `index.md` of the page (RL-19: the same page a
 * person reads), and it throws on an element it does not know. This file pins
 * that a page with a `<luz-faq>` is not one of those: every question and its
 * answer come out as readable text, in the page's order, and the real "Get
 * started" page (which has the FAQ) renders to both files.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { decodeEntities } from "../scripts/docs-site/html.js";
import { htmlToText, renderLlmsFull, renderPageMarkdown } from "../scripts/docs-site/ai.js";
import { scanSite } from "../scripts/docs-site/site.js";
import { SITE_URL } from "../vite.config.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = scanSite(join(root, "apps/docs"), root);

/** The text a reader sees: tags out, entities decoded, white space collapsed. */
const plain = (html) => decodeEntities(html.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
/** The same comparison on the converted text: links, code ticks and emphasis written the Markdown way are taken out. */
const flat = (text) => text.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[`*]/g, "").replace(/\s+/g, " ").trim();

const FAQ = `<luz-faq>
  <h2 class="luz-faq__title" id="faq">Frequently asked questions</h2>
  <p class="luz-faq__lead">The short answers, FAQ-LEAD.</p>
  <details class="luz-faq__item">
    <summary class="luz-faq__question">First QUESTION-ONE?</summary>
    <div class="luz-faq__answer" id="faq-one"><p>ANSWER-ONE with <a href="/docs/x/">a link</a> and <code>.luz-code</code>.</p></div>
  </details>
  <details class="luz-faq__item">
    <summary class="luz-faq__question">Second QUESTION-TWO?</summary>
    <div class="luz-faq__answer" id="faq-two"><p>ANSWER-TWO.</p><ul><li>POINT-A</li><li>POINT-B</li></ul></div>
  </details>
</luz-faq>`;

describe("a <luz-faq> as text for an AI agent", () => {
  // converted inside each test, so a throw fails that test with its message and not the whole file
  const convert = () => htmlToText(`<p>BEFORE-FAQ</p>\n${FAQ}\n<p>AFTER-FAQ</p>`, { file: "apps/docs/pages/faq-fixture.html" });

  it("does not throw on the element: it is a container, like a section", () => {
    const text = convert();
    expect(text).toContain("BEFORE-FAQ");
    expect(text).toContain("AFTER-FAQ");
  });

  it("writes the title, the lead, then each question followed by its answer, in the order of the page", () => {
    const text = convert();
    const order = ["BEFORE-FAQ", "Frequently asked questions", "FAQ-LEAD", "QUESTION-ONE", "ANSWER-ONE", "QUESTION-TWO", "ANSWER-TWO", "POINT-A", "POINT-B", "AFTER-FAQ"];
    const at = order.map((word) => text.indexOf(word));
    for (const [i, word] of order.entries()) expect(at[i], `${word} is in the text`).toBeGreaterThan(-1);
    expect(at, "in the order of the page").toEqual([...at].sort((a, b) => a - b));
  });

  it("keeps the answer's link and code the way the rest of the text writes them, and the list as list items", () => {
    const text = convert();
    expect(text).toContain("[a link](/docs/x/)");
    expect(text).toContain("`.luz-code`");
    expect(text).toMatch(/^- POINT-A$/m);
    expect(text).toMatch(/^- POINT-B$/m);
  });

  it("writes the question and its answer in separate blocks, not glued into one line", () => {
    const text = convert();
    const line = text.split("\n").find((l) => l.includes("QUESTION-ONE")) ?? "";
    expect(line).not.toContain("ANSWER-ONE");
  });
});

describe("the real Get started page, which has the FAQ", () => {
  const route = "/docs/get-started/";
  const page = site.byRoute.get(route);
  const items = [...page.body.matchAll(/<details\b[^>]*\bluz-faq__item[^>]*>\s*<summary\b[^>]*>([\s\S]*?)<\/summary>\s*<div\b[^>]*\bluz-faq__answer[^>]*>([\s\S]*?)<\/div>\s*<\/details>/g)].map((m) => ({
    question: plain(m[1]),
    answer: plain(m[2]).slice(0, 48),
  }));

  it("has a <luz-faq> with several questions (the page this test reads)", () => {
    expect(page.body).toContain("<luz-faq>");
    expect(items.length).toBeGreaterThanOrEqual(5);
  });

  const inOrder = (text, label) => {
    expect(items.length, `${label}: the questions of the page`).toBeGreaterThanOrEqual(5);
    const body = flat(text);
    let from = 0;
    for (const { question, answer } of items) {
      const q = body.indexOf(flat(question), from);
      expect(q, `${label}: the question "${question}"`).toBeGreaterThan(-1);
      const a = body.indexOf(flat(answer), q);
      expect(a, `${label}: the start of its answer "${answer}"`).toBeGreaterThan(q);
      from = a;
    }
  };

  it("is in llms-full.txt with every question followed by its answer, in order", () => {
    const full = renderLlmsFull(site, { siteUrl: SITE_URL });
    const start = full.indexOf(`URL: ${SITE_URL}docs/get-started/\n`);
    expect(start, "an entry for /docs/get-started/").toBeGreaterThan(-1);
    const next = full.indexOf("\n## ", start);
    inOrder(full.slice(start, next < 0 ? undefined : next), "llms-full.txt");
  });

  it("is in its Markdown copy (index.md) with every question followed by its answer, in order", () => {
    const md = renderPageMarkdown(site, page, { siteUrl: SITE_URL });
    expect(md.startsWith(`# ${page.meta.title}\n`)).toBe(true);
    inOrder(md, "index.md");
  });
});
