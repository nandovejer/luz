/**
 * The strings of the dialog of a prompt for AI (.claude/plans/ai-and-catalog-only.md, decisions 17 to 22,
 * phase F2): `prompt.*` in the three catalogs of the home (en, es, ar), with the same placeholders in every
 * language, and `pnpm check:strings` still passing. The behaviour of the dialog itself is in
 * tests/prompt-dialog.spec.js.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = (code) => JSON.parse(readFileSync(resolve(root, `apps/landing/i18n/${code}.json`), "utf8"));
const LANGUAGES = ["en", "es", "ar"];
const catalogs = Object.fromEntries(LANGUAGES.map((code) => [code, catalog(code)]));
const promptKeys = (code) => Object.keys(catalogs[code]).filter((key) => key.startsWith("prompt."));
const placeholders = (value) => [...value.matchAll(/\{[^}]+\}/g)].map((m) => m[0]).sort();

// The text the dialog speaks, by key (the keys a brief names: the label of the region, of Copy, the progress,
// the three live-region messages and the end sentence)
const NAMED = ["prompt.region", "prompt.copy", "prompt.read", "prompt.locked", "prompt.unlocked", "prompt.copied", "prompt.failed", "prompt.end"];

describe("the strings of the prompt dialog", () => {
  for (const code of LANGUAGES) {
    it(`${code}: has every string the dialog speaks, none empty`, () => {
      for (const key of NAMED) {
        expect(catalogs[code][key], `${code}.json ${key}`).toBeTypeOf("string");
        expect(catalogs[code][key].trim().length, `${code}.json ${key}`).toBeGreaterThan(0);
      }
    });
  }

  it("the three languages have the same prompt.* keys", () => {
    const en = promptKeys("en").sort();
    expect(en.length).toBeGreaterThanOrEqual(NAMED.length);
    for (const code of ["es", "ar"]) expect(promptKeys(code).sort(), `${code}.json`).toEqual(en);
  });

  it("every language keeps the placeholders of English, and the progress has {n}", () => {
    for (const key of promptKeys("en")) {
      for (const code of ["es", "ar"]) {
        expect(placeholders(catalogs[code][key]), `${code}.json ${key}`).toEqual(placeholders(catalogs.en[key]));
      }
    }
    for (const code of LANGUAGES) expect(placeholders(catalogs[code]["prompt.read"]), `${code}.json`).toEqual(["{n}"]);
  });

  it("the English chrome and the Spanish chrome say what the dialog is specified to say", () => {
    expect(catalogs.en["prompt.copy"]).toBe("Copy the prompt");
    expect(catalogs.en["prompt.region"]).toBe("The prompt");
    expect(catalogs.en["prompt.read"]).toBe("Read {n}%");
    expect(catalogs.en["prompt.locked"]).toBe("Read to the end of the prompt first.");
    expect(catalogs.en["prompt.unlocked"]).toBe("You've read it all. Copy is on.");
    expect(catalogs.en["prompt.copied"]).toBe("Copied the prompt.");
    expect(catalogs.en["prompt.failed"]).toBe("Could not load the prompt: open it as text.");
    expect(catalogs.en["prompt.end"]).toBe("End of the prompt.");
    expect(catalogs.es["prompt.copy"]).toBe("Copiar el prompt");
    expect(catalogs.es["prompt.read"]).toBe("Leído {n} %");
  });

  it("pnpm check:strings passes", () => {
    const run = spawnSync(process.execPath, ["scripts/check-strings.js"], { cwd: root, encoding: "utf8" });
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0);
  });
});
