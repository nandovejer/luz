/**
 * The version a package is at, before and after the release.
 *
 * Until the Version Packages PR is merged, a package is at the version npm has (0.1.0 for the seven the owner
 * published by hand on 2026-10-19, 0.0.0 for catalog, never published). `changeset version` moves it to the next
 * version and writes a `## <version>` heading in its CHANGELOG.md. So a version is right when it is the one
 * npm has, or one the CHANGELOG lists.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const versionOf = (root, name) => JSON.parse(readFileSync(join(root, "packages", name, "package.json"), "utf-8")).version;

/** The version `name` is at is `onNpm`, or it is one its CHANGELOG.md lists. */
export function isNpmOrReleased(root, name, onNpm) {
  const version = versionOf(root, name);
  if (version === onNpm) return true;
  const path = join(root, "packages", name, "CHANGELOG.md");
  return existsSync(path) && readFileSync(path, "utf-8").split("\n").includes(`## ${version}`);
}
