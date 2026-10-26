/**
 * LUZ — the public cascade layers (one source for every build script).
 *
 * Every LUZ stylesheet puts its rules in a layer inside one container layer,
 * `luz`, so a consumer orders LUZ as a whole (`@layer reset, luz, app;`) and
 * LUZ's own layer names cannot collide with theirs (Tailwind's `components`
 * and `utilities`, for one). The names below are public API: renaming one is
 * a breaking change (VERSIONING, "Cascade layers").
 *
 * Order, first to last (a later layer wins over an earlier one):
 *   luz.tokens      custom properties of @luz-ds/tokens
 *   luz.themes      the shipped custom themes (only custom properties)
 *   luz.settings    configuration custom properties of core
 *   luz.generic     reset
 *   luz.elements    bare HTML elements, at specificity 0
 *   luz.objects     layout (.o-*)
 *   luz.components  .luz-* components
 *   luz.utilities   .u-* helpers: they win over components by order
 *   luz.catalog     the components of @luz-ds/catalog, one stylesheet each:
 *                   the self-contained `<luz-*>` elements and the patterns of
 *                   a kind of site (.luz-landing-*, .luz-cms-*, .luz-app-*,
 *                   .luz-docs-*). Those had a layer of their own per kind
 *                   (luz.landing, luz.cms, luz.app, luz.docs, one package
 *                   each, built on catalog); the packages are gone, so the
 *                   layers are too, and a pattern that refines a catalog or
 *                   a core piece wins by the order its stylesheet is linked
 *                   in (after the piece it refines), as any catalog
 *                   component does
 *   luz.print       what changes on paper (@media print): last, so it wins over
 *                   the screen styles of every package by order
 *
 * Every file repeats the statement first, so the order is the same whichever
 * file a page loads first.
 */
export const LAYERS = ["tokens", "themes", "settings", "generic", "elements", "objects", "components", "utilities", "catalog", "print"];

export const LAYER_ORDER = `@layer ${LAYERS.map((l) => `luz.${l}`).join(", ")};\n`;

/** CSS `css` inside the public layer `name` (without the `luz.` prefix), without the order statement: what follows an inLuzLayer() in the same file. */
export const inLayer = (name, css) => {
  if (!LAYERS.includes(name)) throw new Error(`unknown LUZ layer "${name}"`);
  return `@layer luz.${name} {\n${css}\n}\n`;
};

/** CSS `css` inside the public layer `name` (without the `luz.` prefix), with the order statement first. */
export const inLuzLayer = (name, css) => `${LAYER_ORDER}${inLayer(name, css)}`;
