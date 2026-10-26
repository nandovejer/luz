/**
 * LUZ — the published packages, one list for the scripts that pack,
 * check and publish them (check-pack, publish, smoke-consumer).
 *
 * Order matters: a package comes after every package it depends on, so
 * publish.js never uploads one before its peers exist.
 *
 *   BASE       share one version (changesets `fixed`): tokens → core → catalog
 *   PACKAGES   the CSS libraries: BASE. The docs tests and the CSS probes read
 *              this one. (The patterns of a kind of site, landing, cms, app and
 *              docs, were four packages of their own until plan
 *              ai-and-catalog-only, F5b; they are components of catalog now.)
 *   TOOLS      published and with no CSS of their own: dev tools with a bin
 *              (check). Own version, out of the `fixed` group, no layer.
 *   PUBLISHED  PACKAGES then TOOLS: what check-pack, publish and
 *              smoke-consumer pack, check and upload. A tool comes last: its
 *              tarball is built from the others' dist and nothing depends on it.
 */
export const BASE = ["tokens", "core", "catalog"];
export const PACKAGES = [...BASE];
export const TOOLS = ["check"];
export const PUBLISHED = [...PACKAGES, ...TOOLS];
