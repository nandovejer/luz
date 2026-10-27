/**
 * The docs areas that document a package of patterns. Since plan ai-and-catalog-only (F5b) the patterns of a
 * landing page, a blog, an app and a documentation site are components of @luz-ds/catalog: there is one area
 * of patterns, `catalog` (/docs/catalog/), and no area of a kind of site. The tests that walk "the packages of
 * patterns and their pages" read this one list.
 */
import { readFileSync } from "node:fs";

/** The docs area (its id and its slug) of a package: its own name. */
export const areaOfPackage = (name) => name;

/** The package a docs area documents. */
export const packageOfArea = (area) => area;

/** The areas of the patterns: catalog only. */
export const PATTERN_AREAS = ["catalog"];

/** The areas of a package for one kind of site: none, those packages are gone. */
export const KIND_AREAS = [];

/**
 * The npm package an area's index names in its eyebrow ("Components · @luz-ds/core"), or null for an
 * area that documents no package (Get started, Accessibility, HTML elements). Components document core,
 * Tokens document tokens, and Catalog documents catalog; the name is read from the package.json.
 */
export function eyebrowPackageOf(area) {
  const dir = area === "components" ? "core" : area === "tokens" ? "tokens" : PATTERN_AREAS.includes(area) ? packageOfArea(area) : null;
  if (dir === null) return null;
  return JSON.parse(readFileSync(new URL(`../../packages/${dir}/package.json`, import.meta.url), "utf-8")).name;
}
