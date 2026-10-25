/**
 * What the home page's build reads besides its template and its catalogs.
 *
 * The generator writes the home's weights, packages, checks and lists
 * ({{weights}}, {{packages}}, {{checks}}, {{weight1}}...{{weight3}},
 * {{list1}}...{{list3}}) from the repository itself for every language it
 * renders, whether the template uses them or not (scripts/docs-site/site.js,
 * languageValues): budgets.json against packages/*\/dist, the packages'
 * manifests, the docs pages of the components, tokens/color.html, the tests
 * and scripts/check-contrast.js, and the catalog keys of their words. A
 * throwaway repository with a small home page of its own therefore gives
 * them to it with this: the real ones, linked or copied, never edited. Run
 * `pnpm build` first (the weights are read from dist).
 */
import { cpSync, readFileSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderDocument, scanSite } from "../../scripts/docs-site/site.js";

/** The real repository (the worktree this file is in). */
const REAL = fileURLToPath(new URL("../../", import.meta.url));

/**
 * Give the throwaway repository `root` what the home page's build reads: the
 * real budgets.json, packages/, tests/ and scripts/ (the last three linked),
 * and the real docs pages (copied to apps/docs/pages). The fixture's own
 * docs site lives elsewhere (its docsDir is not apps/docs), so the real pages
 * are read, never scanned.
 */
export function giveHomeSources(root) {
  cpSync(join(REAL, "budgets.json"), join(root, "budgets.json"));
  for (const name of ["packages", "tests", "scripts"]) symlinkSync(join(REAL, name), join(root, name));
  cpSync(join(REAL, "apps/docs/pages"), join(root, "apps/docs/pages"), { recursive: true });
}

let keys;
/**
 * The catalog keys the generator reads for itself, whatever the template says
 * (the words of the weights, the packages, the checks and the lists), with
 * their real value in `code`: what a small catalog must add for the build to
 * find them. Found by rendering an empty template against the real site.
 */
export function generatorStrings(code) {
  if (!keys) {
    const site = scanSite(join(REAL, "apps/docs"), REAL);
    const used = new Set();
    renderDocument("<p>x</p>", "apps/landing/index.html", "/", site, { locale: site.i18n.default, used });
    keys = [...used];
  }
  const catalog = JSON.parse(readFileSync(join(REAL, `apps/landing/i18n/${code}.json`), "utf-8"));
  return Object.fromEntries(keys.filter((key) => key in catalog).map((key) => [key, catalog[key]]));
}
