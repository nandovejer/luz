#!/usr/bin/env node
/**
 * The gate of the prompts for AI (ai-and-catalog-only plan, decision 24):
 * `pnpm check:prompts`, in CI and in qa-release. It assembles the five
 * prompts from apps/site/prompts/ (scripts/docs-site/prompts.js) and fails
 * on any of:
 *
 *   - a hidden character (zero width, a Unicode tag, any other format
 *     character, a variation selector, a blank filler) or a bidi control, in
 *     a source or a prompt;
 *   - a URL that is not the published site's or a file of @luz-ds/* on the
 *     CDN, and an address with no scheme (`www.`, `//host`, `host.tld/…`);
 *   - the syntax of a provider: <system>, <developer>, a ```system block,
 *     [INST], <<SYS>>, <|…|>, and "ignore the previous instructions";
 *   - a placeholder left unresolved;
 *   - a prompt that does not hold every line of the body that has no
 *     placeholder (the five come from the same body);
 *   - a class or a custom element that no package's manifest has;
 *   - a prompt over its ceiling, the row "prompts" of budgets.json.
 *
 * Each problem is printed as "file:line: message". Exit 1 on a problem.
 * The prompt-injection sentinel reads every change to apps/site/prompts/ as
 * well (AGENTS.md): this gate is what a machine can say, not the review.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PROMPT_KINDS, PROMPT_SITE, assemblePrompt, promptRoute } from "./docs-site/prompts.js";
import { PUBLISHED } from "./luz-packages.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = "apps/site/prompts";
const CDN = "https://cdn.jsdelivr.net/npm/@luz-ds/";

// Format characters (Cf) hide text, the bidi controls reorder it, variation
// selectors and the blank fillers look like nothing
const HIDDEN = /[\p{Cf}\p{Variation_Selector}\u{E0000}-\u{E007F}\u2028\u2029\u3164\uFFA0\u2800]|\u115F|\u1160/u;
const PROVIDER = [
  [/<\/?\s*(system|developer|assistant|user)\b[^>]*>/i, "a role tag of a provider"],
  [/```\s*(system|developer)\b/i, "a ```system block"],
  [/\[\/?INST\]|<<\/?SYS>>|<\|[^|]*\|>/, "the chat syntax of a provider"],
  [/\b(ignore|disregard|forget)\b[^.\n]{0,40}\b(previous|prior|above|earlier)\b[^.\n]{0,20}\b(instructions?|prompts?|rules)\b/i, "an instruction to ignore earlier instructions"],
];

const lineOf = (text, index) => text.slice(0, index).split("\n").length;

/** Every class and custom element the published packages' manifests know. */
export function knownNames(root = ROOT) {
  const classes = new Set();
  const elements = new Set();
  for (const pkg of PUBLISHED) {
    const dir = join(root, "packages", pkg, "dist");
    let files = [];
    try {
      files = readdirSync(dir);
    } catch {
      continue;
    }
    if (files.includes("classes.json")) {
      for (const c of JSON.parse(readFileSync(join(dir, "classes.json"), "utf-8")).classes) classes.add(c.name);
    }
    if (files.includes("custom-elements.json")) {
      for (const m of JSON.parse(readFileSync(join(dir, "custom-elements.json"), "utf-8")).modules) {
        for (const d of m.declarations ?? []) if (d.tagName) elements.add(d.tagName);
      }
    }
  }
  return { classes, elements };
}

/**
 * The problems of one text, each "file:line: message". `known` is
 * knownNames(); without it the names are not checked (a source file, whose
 * lists are written by the generator).
 */
export function checkText(text, file, { known } = {}) {
  const problems = [];
  const at = (index, message) => problems.push(`${file}:${lineOf(text, index)}: ${message}`);
  for (const m of text.matchAll(new RegExp(HIDDEN.source, "gu"))) {
    at(m.index, `a hidden or bidi character, U+${m[0].codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`);
  }
  for (const m of text.matchAll(/\b[a-z][a-z0-9+.-]*:\/\/[^\s`"'<>)]*/gi)) {
    if (!m[0].startsWith(PROMPT_SITE) && !m[0].startsWith(CDN)) at(m.index, `${m[0]} is not a URL of the site (${PROMPT_SITE}) or of @luz-ds on the CDN`);
  }
  for (const m of text.matchAll(/\bwww\.[a-z0-9-]+/gi)) at(m.index, `${m[0]}: an address outside the site`);
  // An address with no scheme: //host/… or host.tld/…, outside the allowed URLs
  const bare = text.replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s`"'<>)]*/gi, (url) => " ".repeat(url.length));
  for (const m of bare.matchAll(/(?<![\w:])\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)+|(?<![\w@/.-])(?:[a-z0-9-]+\.)+[a-z]{2,}\/[^\s`"'<>)]*/gi)) {
    at(m.index, `${m[0]}: an address outside the site`);
  }
  for (const [pattern, what] of PROVIDER) {
    for (const m of text.matchAll(new RegExp(pattern.source, `${pattern.flags}g`))) at(m.index, `${what}: ${m[0]}`);
  }
  if (known) {
    for (const m of text.matchAll(/\{\{|\}\}|\{n:[^}]*\}/g)) at(m.index, `a placeholder is left: ${m[0]}`);
    // `block`: `--modifier`, `__part` on a list line; a bare backticked name anywhere
    for (const line of text.matchAll(/^.*$/gm)) {
      const names = [...line[0].matchAll(/`((?:luz|o|u|is)-[a-z0-9_-]+|--[a-z0-9-]+|__[a-z0-9_-]+)`/g)];
      let block = null;
      for (const n of names) {
        const name = n[1].startsWith("--") || n[1].startsWith("__") ? (block ? `${block}${n[1]}` : null) : n[1];
        if (!name) continue;
        if (!n[1].startsWith("--") && !n[1].startsWith("__")) block = n[1];
        if (!known.classes.has(name)) at(line.index + n.index, `.${name} is not a class of any package`);
      }
    }
    for (const m of text.matchAll(/<(luz-[a-z0-9-]+)[\s>]/g)) {
      if (!known.elements.has(m[1])) at(m.index, `<${m[1]}> is not an element of any package`);
    }
  }
  return problems;
}

/** The lines of the body with no placeholder: every prompt holds each of them. */
export function fixedLines(body) {
  return body.split("\n").filter((line) => line.trim() && !/\{\{|\{n:/.test(line));
}

/** The ceiling of a prompt, in bytes, from budgets.json. */
export function promptCeiling(root = ROOT) {
  const row = JSON.parse(readFileSync(join(root, "budgets.json"), "utf-8")).budgets.find((b) => b.glob === "docs/prompts/**/*.txt");
  if (!row) throw new Error("budgets.json has no row for docs/prompts/**/*.txt");
  return row.max;
}

/** Every problem of the sources and of the five prompts. */
export function checkPrompts(root = ROOT) {
  const problems = [];
  const sources = [`${SOURCE}/body.md`, `${SOURCE}/stacks.json`, ...readdirSync(join(root, SOURCE, "presets")).map((f) => `${SOURCE}/presets/${f}`)];
  for (const file of sources) problems.push(...checkText(readFileSync(join(root, file), "utf-8"), file));
  const known = knownNames(root);
  const fixed = fixedLines(readFileSync(join(root, SOURCE, "body.md"), "utf-8"));
  const ceiling = promptCeiling(root);
  for (const kind of PROMPT_KINDS) {
    const file = promptRoute(kind.id).slice(1);
    let text;
    try {
      text = assemblePrompt(kind.id, { root });
    } catch (error) {
      problems.push(`${file}: ${error.message}`);
      continue;
    }
    problems.push(...checkText(text, file, { known }));
    for (const line of fixed) if (!text.includes(line)) problems.push(`${file}: does not hold the body's line "${line.slice(0, 60)}"`);
    const bytes = Buffer.byteLength(text);
    if (bytes > ceiling) problems.push(`${file}: ${bytes} B, over its ceiling of ${ceiling} B (budgets.json): say less, never raise the ceiling`);
  }
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const problems = checkPrompts();
  for (const p of problems) console.error(p);
  if (problems.length) {
    console.error(`\n✗ ${problems.length} problem${problems.length === 1 ? "" : "s"} in the prompts`);
    process.exit(1);
  }
  console.log(`✓ The ${PROMPT_KINDS.length} prompts are clean: no hidden text, only the site's URLs, every class known, each under its ceiling`);
}
