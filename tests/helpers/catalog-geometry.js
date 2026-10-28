/**
 * F8 of .claude/plans/ai-and-catalog-only.md, decision 67: the two unions (the bar of a landing page and of a blog, the
 * two footers) and the masthead change no look. The numbers they must keep were read from the base, `main` before F8, by
 * running `readGeometry()` on the fixtures as they were (with the classes `luz-landing-*` and `luz-cms-*`), and are kept in
 * tests/fixtures/catalog-names-geometry.json; tests/catalog-names.spec.js reads the same things from the fixtures as they
 * are now and compares. Only what does not depend on the font a machine has: the computed values of the box, the colours,
 * the gaps, the type steps, the flex setup, and the width and left edge of a container.
 *
 *   SPOTS         the fixtures and the ids on each (the ids did not change with the classes)
 *   WIDTHS        the windows measured, in CSS px
 *   MODES_READ    the modes measured
 *   readGeometry(page, spot, width, mode)   { [id]: { prop: value, ... } }
 */

export const WIDTHS = [1280, 768, 375];
export const MODES_READ = ["light", "dark"];

/** `boxes`: ids whose left edge and width are read too (a container, never a link whose width follows its text); `heights`: ids whose height is the bar's own. */
export const SPOTS = [
  { fixture: "landing-header", ids: ["hdr", "row", "brand", "actions"], boxes: ["hdr", "row"], heights: ["hdr"] },
  { fixture: "landing-page", ids: ["hdr", "hdr-row", "brand", "hero", "copy", "programme", "ftr", "ftr-row", "ftr-note"], boxes: ["hdr", "hdr-row", "hero", "programme", "ftr", "ftr-row"], heights: [] },
  { fixture: "landing-f4", ids: ["hero-b", "hero-c", "hero-c-title", "sec", "sec-title", "stat", "stat-value", "ftr", "ftr-grid", "col-1", "col-1-title"], boxes: ["hero-b", "hero-c", "sec", "stat", "ftr", "ftr-grid", "col-1"], heights: [] },
  { fixture: "cms-header", ids: ["hdr", "row", "brand", "actions"], boxes: ["hdr", "row"], heights: ["hdr"] },
  { fixture: "cms-masthead", ids: ["hdr", "inner", "top-row", "date", "actions", "brand", "sections"], boxes: ["hdr", "inner", "top-row", "sections"], heights: [] },
  { fixture: "cms-page", ids: ["hdr", "hdr-row", "brand", "ftr", "ftr-row", "ftr-note"], boxes: ["hdr", "hdr-row", "ftr", "ftr-row"], heights: [] },
];

/** These mean nothing on a box that is not a flex or a grid container (a block's `align-items` is never used): not read there. */
const LAYOUT = ["columnGap", "rowGap", "flexDirection", "flexWrap", "justifyContent", "alignItems", "gridTemplateColumns"];

const PROPS = [
  "display", "position", "boxSizing",
  "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  "marginTop", "marginRight", "marginBottom", "marginLeft",
  "borderTopWidth", "borderTopStyle", "borderTopColor", "borderBottomWidth", "borderBottomStyle", "borderBottomColor",
  "backgroundColor", "color",
  "columnGap", "rowGap", "flexDirection", "flexWrap", "justifyContent", "alignItems", "gridTemplateColumns",
  "textAlign", "fontFamily", "fontSize", "fontWeight", "lineHeight", "textDecorationLine", "minHeight",
];

export async function readGeometry(page, spot, width, mode) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`/tests/fixtures/${spot.fixture}.html`);
  await page.evaluate((m) => { document.documentElement.dataset.theme = m; }, mode);
  // The theme changes a colour with a transition on some parts: take the end of it
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ reducedMotion: "reduce" });
  return page.evaluate(
    ({ ids, boxes, heights, props, layout }) => {
      const out = {};
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) { out[id] = null; continue; }
        const cs = getComputedStyle(el);
        const entry = {};
        const container = /flex|grid/.test(cs.display);
        for (const p of props) if (container || !layout.includes(p)) entry[p] = cs[p];
        // gridTemplateColumns is in px: a width that follows the container, not the text, only for a grid
        if (boxes.includes(id)) { const r = el.getBoundingClientRect(); entry.left = Math.round(r.left * 10) / 10; entry.width = Math.round(r.width * 10) / 10; }
        if (heights.includes(id)) entry.height = Math.round(el.getBoundingClientRect().height * 10) / 10;
        out[id] = entry;
      }
      return out;
    },
    { ids: spot.ids, boxes: spot.boxes, heights: spot.heights, props: PROPS, layout: LAYOUT },
  );
}
