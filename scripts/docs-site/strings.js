/**
 * LUZ docs site — the strings the generator writes around a page.
 *
 * Everything the generator says in English (the chips, the rail, "Keep going",
 * the page foot, the notice…) is a key of apps/docs/i18n/<code>/strings.json.
 * `makeT` is the function the render code reads them with; `englishT` is the
 * English one for a site that has no apps/docs/i18n folder (a fixture, a
 * consumer of the generator), read from this repository's reference catalog.
 *
 * A value is plain text with `{placeholders}` (one lowercase word), or trusted
 * inline HTML (checked by the loader, i18n.js INLINE_HTML). The caller decides
 * whether to escape it: `t(key, vars)` returns it as written, with the `vars`
 * put in place unescaped.
 *
 * Development tooling only; nothing here ships.
 */
import { readFileSync } from "node:fs";

/** The plural categories of CLDR, in the order a catalog lists them. */
export const PLURAL_CATEGORIES = ["zero", "one", "two", "few", "many", "other"];

/** `{name}` in a value. */
export const PLACEHOLDER = /\{([a-z0-9-]+)\}/g;

/** Put `vars` in the `{placeholders}` of a value; a placeholder with no value is left as written. */
export function fill(text, vars) {
  if (!vars) return text;
  return text
    .split(/\{([a-z0-9-]+)\}/g)
    .map((part, i) => (i % 2 ? (Object.hasOwn(vars, part) ? String(vars[part]) : `{${part}}`) : part))
    .join("");
}

/**
 * The reader of a catalog. `strings`: key → value. `lang`: the code of the
 * language (for its plural rules). `usage`: { used: Set | null }, shared by the
 * views of a site, where the keys read are recorded (a build reports the keys
 * no render used). `file` names the catalog in an error.
 */
export function makeT({ strings, lang, usage, file }) {
  const rules = new Intl.PluralRules(lang);
  const t = (key, vars) => {
    if (!Object.hasOwn(strings, key)) throw new Error(`"${key}" is not in ${file}`);
    usage?.used?.add(key);
    return fill(strings[key], vars);
  };
  /** Mark every key that starts with `prefix` as used (a family of strings only one of which a page needs). */
  t.mark = (prefix) => {
    if (!usage?.used) return;
    for (const key of Object.keys(strings)) if (key.startsWith(prefix)) usage.used.add(key);
  };
  /**
   * The string of `prefix` for the count `n`: `<prefix>.none` for 0 when the
   * catalog has it, else `<prefix>.<category of n>`; `{n}` is the count.
   */
  t.plural = (prefix, n, vars) => {
    t.mark(`${prefix}.`);
    const category = n === 0 && Object.hasOwn(strings, `${prefix}.none`) ? "none" : rules.select(n);
    return t(`${prefix}.${category}`, { n, ...vars });
  };
  t.has = (key) => Object.hasOwn(strings, key);
  t.lang = lang;
  t.file = file;
  return t;
}

const BUNDLED = "apps/docs/i18n/en/strings.json";
let bundled;

/** The English catalog of this repository, for a site with no catalog of its own. */
export function bundledEnglish() {
  if (!bundled) {
    try {
      bundled = JSON.parse(readFileSync(new URL(`../../${BUNDLED}`, import.meta.url), "utf-8"));
    } catch (error) {
      throw new Error(`${BUNDLED}: ${error.message}`);
    }
  }
  return bundled;
}

let english;
/** `t` over the bundled English catalog. */
export function englishT() {
  english ??= makeT({ strings: bundledEnglish(), lang: "en", usage: null, file: BUNDLED });
  return english;
}
