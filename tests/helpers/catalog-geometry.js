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
 *   packGeometry(readings), unpackGeometry(packed)   the file keeps what is the same in every reading once
 *
 * The font. A margin of `auto`, a shrink-to-fit width and the left edge of a centred box are worked out from the width of
 * the text, and the text of a page is drawn with whatever font the machine has for `system-ui`, `sans-serif` or `serif`: the
 * numbers read on one machine were not the ones of the CI runner. So a reading is made with every font token set to ET Book,
 * the face the repository ships (packages/tokens/fonts), loaded before anything is measured: the same bytes everywhere.
 * `fontFamily` is the exception: it is read before that, since it is the token the stylesheet declares (the heading font
 * of `--publication` against the sans of the landing bar) and does not depend on the machine.
 */

import { readFileSync } from "node:fs";

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

/**
 * The fonts the repository ships (packages/tokens/fonts/fonts.css, whose @font-face rules are used as they are), put in the
 * page as data: URLs: nothing is requested, so there is no request to wait for, and the same bytes are drawn on every machine.
 */
const FONT_DIR = new URL("../../packages/tokens/fonts/", import.meta.url);
const FONT_LINK = "packages/tokens/fonts/fonts.css";
const bundledFontCss = () =>
  readFileSync(new URL("fonts.css", FONT_DIR), "utf-8").replace(/url\("\.\/([^"]+\.woff2)"\)/g, (_, file) => `url("data:font/woff2;base64,${readFileSync(new URL(file, FONT_DIR)).toString("base64")}")`);

/** The tokens every stylesheet of catalog reads its families from. */
const FONT_TOKENS = ["--luz-font-sans", "--luz-font-mono", "--luz-font-heading", "--luz-font-body", "--luz-font-serif"];

/**
 * The page again, with every text in the one font that is the same on every machine: ET Book, from the repository. The
 * font rules and the tokens are put in the HTML on its way to the browser (route), so it works with JavaScript off too, where an
 * event of the page never runs; the faces the tokens use are loaded before anything is measured.
 */
async function loadWithBundledFont(page, url) {
  const handler = async (route) => {
    const response = await route.fetch();
    const html = await response.text();
    const tokens = `:root:root { ${FONT_TOKENS.map((token) => `${token}: "ET Book";`).join(" ")} }`;
    // Unlayered, so it beats the layers of tokens, core and catalog whatever the specificity
    await route.fulfill({ response, body: html.replace("</head>", `<style>${bundledFontCss()}\n${tokens}</style></head>`) });
  };
  await page.route(`**${url}`, handler);
  try {
    await page.goto(url);
  } finally {
    await page.unroute(`**${url}`, handler);
  }
  // The faces the page uses are asked for at its first layout. Waiting for them with a promise of the page (document.fonts.load)
  // can hang with JavaScript off, so the page is asked, again and again, what state they are in, until the same answer comes twice.
  let before = "";
  for (let attempt = 0; attempt < 200; attempt++) {
    const state = await page.evaluate(() => {
      document.body.getBoundingClientRect();
      const faces = [...document.fonts];
      return { total: faces.length, loaded: faces.filter((f) => f.status === "loaded").length, loading: faces.filter((f) => f.status === "loading").length, error: faces.filter((f) => f.status === "error").length };
    });
    if (state.error > 0) throw new Error(`a face of ${FONT_LINK} did not load`);
    const now = JSON.stringify(state);
    if (state.loaded > 0 && state.loading === 0 && now === before) return;
    before = now;
    await page.waitForTimeout(50);
  }
  throw new Error(`the faces of ${FONT_LINK} were still not loaded after 10 s: ${before}`);
}

export async function readGeometry(page, spot, width, mode) {
  const url = `/tests/fixtures/${spot.fixture}.html`;
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  // What the stylesheets declare, before the font is replaced
  await page.goto(url);
  const families = await page.evaluate((ids) => Object.fromEntries(ids.map((id) => [id, document.getElementById(id) ? getComputedStyle(document.getElementById(id)).fontFamily : null])), spot.ids);
  await loadWithBundledFont(page, url);
  await page.evaluate((m) => { document.documentElement.dataset.theme = m; }, mode);
  const out = await page.evaluate(
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
  for (const id of spot.ids) if (out[id]) out[id].fontFamily = families[id];
  return out;
}

/* ---- The file: what every reading of an element has the same is written once ---------------------------- */

/** { "fixture width mode": { id: props } } to { fixture: { id: { always, by: { "width mode": the props that differ } } } }. */
export function packGeometry(readings) {
  const packed = {};
  for (const [key, ids] of Object.entries(readings)) {
    const [fixture, ...rest] = key.split(" ");
    for (const [id, props] of Object.entries(ids)) {
      ((packed[fixture] ??= {})[id] ??= { readings: {} }).readings[rest.join(" ")] = props;
    }
  }
  for (const ids of Object.values(packed)) {
    for (const [id, { readings: byKey }] of Object.entries(ids)) {
      const all = Object.values(byKey);
      if (all.some((r) => r === null)) { ids[id] = { always: null }; continue; }
      const names = [...new Set(all.flatMap((r) => Object.keys(r)))];
      const same = names.filter((n) => all.every((r) => r[n] === all[0][n]));
      const always = Object.fromEntries(same.map((n) => [n, all[0][n]]));
      const by = Object.fromEntries(Object.entries(byKey).map(([k, r]) => [k, Object.fromEntries(Object.entries(r).filter(([n]) => !same.includes(n)))]));
      ids[id] = { always, by };
    }
  }
  return packed;
}

/** The reverse: { "fixture width mode": { id: props } }. */
export function unpackGeometry(packed) {
  const readings = {};
  for (const [fixture, ids] of Object.entries(packed)) {
    for (const [id, { always, by }] of Object.entries(ids)) {
      if (always === null) { for (const w of WIDTHS) for (const m of MODES_READ) (readings[`${fixture} ${w} ${m}`] ??= {})[id] = null; continue; }
      for (const [key, differing] of Object.entries(by)) (readings[`${fixture} ${key}`] ??= {})[id] = { ...always, ...differing };
    }
  }
  return readings;
}
