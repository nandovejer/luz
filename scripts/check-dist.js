import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));

// One sentinel per package: a missing dist in ANY of them triggers a build.
// Catalog has no bundle: its sentinels are a component file and a pattern of
// a kind of site (the patterns of landing, cms, app and docs are catalog's)
const sentinels = [
  "../packages/tokens/dist/luz-tokens.css",
  "../packages/core/dist/luz.css",
  "../packages/catalog/dist/components/search.css",
  "../packages/catalog/dist/components/landing-hero.css",
  "../packages/check/dist/luz-check.js",
].map((p) => resolve(__dirname, p));

const missing = sentinels.filter((p) => !existsSync(p));

if (missing.length > 0) {
  console.log("dist/ incomplete — running full build...");
  execSync("pnpm build", { stdio: "inherit" });
} else {
  console.log("dist/ exists — skipping build.");
}
