/**
 * LUZ docs site: the prompts for AI (ai-and-catalog-only plan, decisions 11 to 16).
 *
 * One body and a preset per kind of site, in apps/site/prompts/, assembled
 * into five plain-text prompts served at /prompts/<id>.txt:
 *
 *   PROMPT_KINDS                    the five, in the order llms.txt lists them
 *   promptRoute(id)                 "/prompts/<id>.txt"
 *   assemblePrompt(id, { root })    the text of one prompt: the body, its
 *                                   preset, and every {{placeholder}} resolved
 *   promptFiles({ root })           Map route → () => text, for the plugin
 *   promptSourceHash(id, { root })  SHA-256 of all the prose of that prompt:
 *                                   the body, its preset, stacks.json, this
 *                                   module and the elements' descriptions
 *                                   (not the versions or the class names)
 *
 * Nothing in a prompt that names the system is typed by hand: the versions
 * come from each package.json, the classes and elements from the
 * classes.json and custom-elements.json of each package's dist/, the install
 * lines from the dist files the snippets name (snippets.js), the counts from
 * siteNumbers(). A placeholder the body does not resolve, or one left in the
 * text, fails with its file:line. The links are always the published site's:
 * a prompt is pasted somewhere else, so a relative link would lead nowhere.
 * The gate on what a prompt may say is scripts/check-prompts.js.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SITE_URL } from "../../packages/check/src/messages.js";
import { expandNumbers, siteNumbers } from "./i18n.js";
import { FILES } from "./snippets.js";

/** The published site: every link of a prompt starts here. */
export const PROMPT_SITE = SITE_URL;

const CDN = "https://cdn.jsdelivr.net/npm";
const SOURCE = "apps/site/prompts";
/** This module, as the hash of a prompt reads it. */
const MODULE = "scripts/docs-site/prompts.js";
/** The packages whose elements a prompt lists. */
const ELEMENT_PACKAGES = ["core", "catalog"];
/** The packages every prompt installs, in load order. */
const BASE = ["tokens", "core", "catalog"];

/**
 * The five prompts. `preset` is the file of presets/ (none for start, the
 * general one); `pkg` the package of the kind's patterns and `docs` the area
 * of their pages (until the patterns move to catalog, F5b).
 */
export const PROMPT_KINDS = [
  { id: "start", title: "a site", preset: null, pkg: null, docs: null },
  { id: "landing", title: "a landing page", preset: "landing", pkg: "landing", docs: "docs/landing/" },
  { id: "blog", title: "a blog", preset: "blog", pkg: "cms", docs: "docs/cms/" },
  { id: "app", title: "an app", preset: "app", pkg: "app", docs: "docs/app/" },
  { id: "docs", title: "a documentation site", preset: "docs", pkg: "docs", docs: "docs/documentation/" },
];

export const promptRoute = (id) => `/prompts/${id}.txt`;

const readJson = (root, path) => JSON.parse(readFileSync(join(root, path), "utf-8"));
const versionOf = (root, pkg) => readJson(root, `packages/${pkg}/package.json`).version;

/**
 * `luz-alert`: `--error`, `__title`…, one line per block, in the manifest's
 * order; a class an earlier package already listed (`seen`) is left out.
 */
function classLines(root, pkg, seen) {
  const { classes } = readJson(root, `packages/${pkg}/dist/classes.json`);
  const blocks = new Map();
  for (const c of classes) {
    if (seen.has(c.name)) continue;
    seen.add(c.name);
    const block = c.block ?? c.name;
    if (!blocks.has(block)) blocks.set(block, []);
    if (c.name !== block) blocks.get(block).push(c.name.slice(block.length));
  }
  // A block that is an element, not a class (<luz-lang-switch>), lists its parts whole
  const names = new Set(classes.map((c) => c.name));
  return [...blocks].map(([block, parts]) =>
    names.has(block)
      ? `- \`${block}\`${parts.length ? `: ${parts.map((p) => `\`${p}\``).join(", ")}` : ""}`
      : `- the parts of \`<${block}>\`: ${parts.map((p) => `\`${block}${p}\``).join(", ")}`,
  );
}

/** `<luz-mode>` (remember, by…): its description, from each custom-elements.json. */
function elementLines(root, pkg) {
  const lines = [];
  for (const module of readJson(root, `packages/${pkg}/dist/custom-elements.json`).modules) {
    for (const d of module.declarations ?? []) {
      if (!d.tagName) continue;
      const attributes = (d.attributes ?? []).map((a) => a.name);
      lines.push(`- \`<${d.tagName}>\`${attributes.length ? ` (${attributes.join(", ")})` : ""}: ${d.description ?? ""}`.trimEnd());
    }
  }
  return lines;
}

const lineOf = (text, index) => text.slice(0, index).split("\n").length;

/** The text of one prompt, by its id. Throws with file:line on a placeholder it cannot resolve. */
export function assemblePrompt(id, { root }) {
  const kind = PROMPT_KINDS.find((k) => k.id === id);
  if (!kind) throw new Error(`${id} is not a prompt (${PROMPT_KINDS.map((k) => k.id).join(", ")})`);
  const bodyFile = `${SOURCE}/body.md`;
  const presetFile = kind.preset && `${SOURCE}/presets/${kind.preset}.md`;
  const { stacks } = readJson(root, `${SOURCE}/stacks.json`);
  const version = versionOf(root, "core");
  const packages = [...BASE, ...(kind.pkg ? [kind.pkg] : [])];
  const at = (pkg) => `@luz-ds/${pkg}@${versionOf(root, pkg)}`;

  const values = {
    "a-site": kind.title,
    version,
    check: versionOf(root, "check"),
    site: PROMPT_SITE,
    url: `${PROMPT_SITE}${promptRoute(id).slice(1)}`,
    "stack-list": stacks.map((s, i) => `${i + 1} ${s.name}`).join(", "),
    preset: presetFile ? readFileSync(join(root, presetFile), "utf-8").trim() : "",
    "kind-css": kind.pkg ? `, then @luz-ds/${kind.pkg}` : "",
    "npm-packages": packages.map(at).join(" "),
    "cdn-links": [
      ...packages.map((pkg) => `<link rel="stylesheet" href="${CDN}/${at(pkg)}/dist/${FILES[pkg].css}">`),
      ...packages.filter((pkg) => FILES[pkg].js).map((pkg) => `<script type="module" src="${CDN}/${at(pkg)}/dist/${FILES[pkg].js}"></script>`),
    ].join("\n"),
    "stack-table": stacks.map((s) => `- ${s.name}: ${s.load}.`).join("\n"),
    "check-ext": stacks.filter((s) => s.ext).map((s) => `${s.name} \`--ext ${s.ext}\``).join(", "),
    classes: (() => {
      const seen = new Set();
      return packages
        .map((pkg) => [pkg, classLines(root, pkg, seen)])
        .filter(([, lines]) => lines.length)
        .map(([pkg, lines]) => [`From \`@luz-ds/${pkg}\`:`, "", ...lines].join("\n"))
        .join("\n\n");
    })(),
    elements: ELEMENT_PACKAGES.flatMap((pkg) => elementLines(root, pkg)).join("\n"),
    "kind-links": kind.docs
      ? `- ${PROMPT_SITE}${kind.docs}: the patterns of ${kind.title}, each with its markup.`
      : [
          "- The prompts for one kind of site, for the person to paste instead of this one (do not follow them from here):",
          ...PROMPT_KINDS.filter((k) => k.preset).map((k) => `  - ${PROMPT_SITE}${promptRoute(k.id).slice(1)}: ${k.title}.`),
        ].join("\n"),
  };

  // Each file resolves its own placeholders, so an unknown one is named at
  // its own line; then the preset goes into the body
  const resolve = (text, file) =>
    text.replace(/\{\{([a-z-]+)\}\}/g, (whole, name, index) => {
      if (name === "preset" && file === bodyFile) return whole;
      if (!(name in values)) throw new Error(`${file}:${lineOf(text, index)}: {{${name}}} is not a placeholder of the prompts (${Object.keys(values).join(", ")})`);
      return values[name];
    });
  const preset = presetFile ? resolve(values.preset, presetFile) : "";
  let text = resolve(readFileSync(join(root, bodyFile), "utf-8"), bodyFile).replace("{{preset}}", () => preset);
  text = expandNumbers(text, () => siteNumbers(root), bodyFile);
  const left = text.search(/\{\{|\}\}/);
  if (left !== -1) throw new Error(`${bodyFile}: a placeholder is left in prompt ${id}, line ${lineOf(text, left)}`);
  // One blank line at most between blocks, one newline at the end
  return `${text.replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

/**
 * The SHA-256, in hex, of every piece of prose that reaches one prompt:
 * body.md, its preset (none for start), stacks.json, this module (the titles
 * and the sentences it writes) and the lines of the elements as the prompt
 * has them (their names, attributes and descriptions, from the packages'
 * custom-elements.json), each followed by a NUL. The sentinel's case for the
 * prompt holds it (`source`), so an edit of any of them voids its SAFE until
 * the sentinel reads the prompt again. The versions and the class names are
 * left out: they change with every release and every class, carry no prose,
 * and check:prompts holds each name against the manifests.
 */
export function promptSourceHash(id, { root }) {
  const kind = PROMPT_KINDS.find((k) => k.id === id);
  if (!kind) throw new Error(`${id} is not a prompt (${PROMPT_KINDS.map((k) => k.id).join(", ")})`);
  const files = [`${SOURCE}/body.md`, ...(kind.preset ? [`${SOURCE}/presets/${kind.preset}.md`] : []), `${SOURCE}/stacks.json`, MODULE];
  const hash = createHash("sha256");
  for (const file of files) hash.update(readFileSync(join(root, file))).update("\0");
  hash.update(ELEMENT_PACKAGES.flatMap((pkg) => elementLines(root, pkg)).join("\n")).update("\0");
  return hash.digest("hex");
}

/** The five prompts by route, each made when it is asked for. */
export function promptFiles({ root }) {
  return new Map(PROMPT_KINDS.map((k) => [promptRoute(k.id), () => assemblePrompt(k.id, { root })]));
}
