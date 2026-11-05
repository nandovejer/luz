/**
 * The Design tab of the component and pattern pages, and the token gallery,
 * say things about the tokens: a contrast ratio per mode, the tokens a
 * component reads, a colour's value in each mode. None of it is typed by hand
 * (a11y.md HUB-8): this test recomputes every figure from packages/tokens and
 * the component CSS, so a token change that is not carried to the docs fails
 * here, with the page and the row.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { site } from "./helpers/docs-site.js";
import { PATTERN_AREAS } from "./helpers/package-areas.js";
import { MODES, colorTokens, contrast, familyOf, formatRatio, resolveColor, tokensUsedBy } from "./helpers/design-tokens.js";
import { readControls, sectionOf } from "./helpers/docs-controls.js";

const viewPages = site.pages.filter(
  (p) => (p.meta.area === "components" && p.meta.group && p.meta.group !== "helpers") || (PATTERN_AREAS.includes(p.meta.area) && p.meta.group && p.meta.group !== "reference"),
);
// A page of controls (`parts: controls`, Form fields) has one Design tab per control and notes per family: read below
const tabbedPages = viewPages.filter((p) => p.meta.parts !== "controls");
/** The HTML of a Design section: from its h3 to the next h3 or the panel's last line. */
const section = (page, id) => page.body.split(`<h3 id="${id}">`)[1].split(/<h3 |<p class="docs-view__xref">/)[0];
const text = (html) => html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

/** One "Do and don't" section: pairs of a Do then its Don't, each said in words, each stage a picture or code. */
function checkDoDont(html, where) {
  const items = [...html.matchAll(/<figure class="luz-do-dont__item luz-do-dont__item--(do|dont)">\s*<figcaption><strong class="luz-do-dont__verdict">([^<]+)<\/strong>([^<]|<(?!\/figcaption>))+<\/figcaption>\s*(<div class="luz-do-dont__stage"[^>]*>|<pre class="luz-code-block")/g)];
  // One pair for each lesson of the page: a Do, then its Don't
  const verdicts = items.map((m) => [m[1], m[2]]);
  expect(verdicts.length, where).toBeGreaterThanOrEqual(2);
  expect(verdicts, where).toEqual(Array.from({ length: verdicts.length / 2 }, () => [["do", "Do"], ["dont", "Don't"]]).flat());
  for (const m of items) {
    // The caption says why, in words a screen reader gets
    expect(text(m[0]).length, `${where} ${m[1]}`).toBeGreaterThan(30);
    // A live example is a picture: inert, hidden from assistive technology
    // (the caption describes it); a harmful one is code, never live
    if (m[4].startsWith("<div")) expect(m[4], `${where} ${m[1]}`).toBe('<div class="luz-do-dont__stage" inert aria-hidden="true">');
  }
}

/** The rows of a contrast table, recomputed from the tokens: every ratio, and a pair below its minimum says so. Returns the row count. */
function checkContrastRows(html, where) {
  expect(html, where).toMatch(/<strong>Focus:<\/strong>/);
  let rows = 0;
  for (const [row] of html.matchAll(/<tr><td data-label="Part">[\s\S]*?<\/tr>/g)) {
    const cells = [...row.matchAll(/<td data-label="[^"]+"><div>([\s\S]*?)<\/div><\/td>/g)].map((m) => m[1]);
    const [part, pair, ...rest] = cells;
    const tokens = [...pair.matchAll(/<code>--luz-([\w-]+)<\/code>/g)].map((m) => m[1]);
    const [fg, ...bg] = tokens;
    const min = Number(rest.at(-1).replace(":1", ""));
    MODES.forEach((mode, i) => {
      const ratio = contrast(mode, fg, bg.join(" > "));
      const expected = ratio + 1e-9 >= min ? formatRatio(ratio) : `<strong>${formatRatio(ratio)}, fails</strong>`;
      expect(rest[i], `${where} "${text(part)}" in ${mode}`).toBe(expected);
    });
    rows++;
  }
  return rows;
}

/** A "Tokens it uses" section: exactly `used`, each under the page of its family, and the count in the sentence. */
function checkTokenList(html, used, where) {
  const listed = [];
  for (const [, route, dd] of html.matchAll(/<dt><a href="([^"]+)">[^<]+<\/a><\/dt><dd>([\s\S]*?)<\/dd>/g)) {
    for (const [, token] of dd.matchAll(/<code>(--luz-[\w-]+)<\/code>/g)) {
      expect(familyOf(token)[1], `${where} ${token}`).toBe(route);
      listed.push(token);
    }
  }
  expect([...listed].sort(), where).toEqual(used);
  expect(html, where).toContain(`The ${used.length} tokens`);
}

describe("Design tab of every component and pattern page", () => {
  it("covers the 67 pages, the Form fields page (one Design tab per control) among them", () => {
    expect(viewPages).toHaveLength(67);
    expect(viewPages.filter((p) => p.meta.parts === "controls").map((p) => p.route)).toEqual(["/docs/components/form/"]);
  });

  it("Do and don't: a Do then a Don't, labelled with a word, never a live barrier (a11y.md TAB-20)", () => {
    for (const page of tabbedPages) checkDoDont(section(page, "do-dont"), page.file);
  });

  it("Contrast and focus: every ratio is the one the tokens give, and a pair below its minimum says so", () => {
    let rows = 0;
    for (const page of tabbedPages) rows += checkContrastRows(section(page, "contrast"), page.file);
    expect(rows).toBeGreaterThan(100);
  });

  it("Tokens it uses: exactly the tokens the component's CSS reads, each under the page of its family", () => {
    for (const page of tabbedPages) checkTokenList(section(page, "tokens"), tokensUsedBy(page), page.file);
  });
});

/*
 * A page of controls: each control's Design tab says what it says on any page (Do and don't), and its Contrast and
 * Tokens sections are the family's notes, which are recomputed here. Which rules of the page's CSS a family's notes
 * document is the one map below: the control's selectors in components/form.css, and the rule of the bare element it
 * shares with elements/forms.css (the text field), read from the stylesheets and never typed as values. The other
 * controls of the form file (pickers, switch, fieldset, meter, output, range, file, colour) are not in any family yet.
 */
const CONTROLS_PAGE = viewPages.find((p) => p.meta.parts === "controls");
const FAMILY_RULES = {
  // Every input rule of the form file and of the bare elements: text, number, dates, colour, file, range, textarea
  inputs: { files: "components/form.css", only: /\.luz-(?:field|input)(?![a-z])/ },
  // The checkbox, the radio buttons and the switch of the form file, and the select
  choice: { files: "components/form.css; components/select.css", only: /^\.luz-(?:check-(?:item|group)(?![\w-])|toggle)|\.luz-select(?![\w-])/ },
  // The output and the meter, with the bare elements' rules for them
  values: { files: "components/form.css; components/meter.css; elements/forms.css", only: /\.luz-(?:output|meter)(?![\w-])|^:where\(output\)|^:where\(meter\)/ },
  // The parts a field is made of: its label, hint and error, the fieldset and the legend
  field: { files: "components/form.css", only: /\.luz-(?:field|fieldset|legend)(?![a-z])|\.luz-input--error(?![\w-])/ },
};

describe("Design notes of a page of controls", () => {
  // A clear failure, not a TypeError, while no page has `parts: controls`
  const controlsRead = () => {
    expect(CONTROLS_PAGE, "a page with the front matter `parts: controls`").toBeTruthy();
    return readControls(CONTROLS_PAGE);
  };

  it("maps every family of the page to its rules (a new family needs a line of the map above)", () => {
    const read = controlsRead();
    expect(read.families.map((f) => f.id).sort()).toEqual(Object.keys(FAMILY_RULES).sort());
  });

  it("Do and don't of each control: a Do then a Don't, labelled with a word, never a live barrier (a11y.md TAB-20)", () => {
    const read = controlsRead();
    for (const family of read.families) for (const control of family.controls) checkDoDont(sectionOf(read, `${control.id}-do-dont`), `${CONTROLS_PAGE.file} #${control.id}`);
  });

  it("Contrast and focus of each family: every ratio is the one the tokens give, and a pair below its minimum says so", () => {
    const read = controlsRead();
    let rows = 0;
    for (const family of read.families) {
      const html = sectionOf(read, `${family.id}-contrast`);
      const found = checkContrastRows(html, `${CONTROLS_PAGE.file} #${family.id}-contrast`);
      expect(found, `${family.id} has rows`).toBeGreaterThanOrEqual(3);
      rows += found;
    }
    expect(rows).toBeGreaterThan(8);
  });

  it("Tokens of each family: exactly the tokens the rules of its controls read, each under the page of its family", () => {
    const read = controlsRead();
    for (const family of read.families) {
      const { files, only } = FAMILY_RULES[family.id];
      const used = tokensUsedBy({ meta: { area: "components", files } }, { only });
      expect(used.length, `${family.id} reads tokens`).toBeGreaterThan(8);
      checkTokenList(sectionOf(read, `${family.id}-tokens`), used, `${CONTROLS_PAGE.file} #${family.id}-tokens`);
    }
  });
});

describe("Token gallery (a11y.md HUB-8)", () => {
  const color = site.byRoute.get("/docs/tokens/color/").body;

  it("shows every semantic colour with its job and its value in light, dark and high contrast, as text", () => {
    const cards = [...color.matchAll(/<li class="docs-token" id="luz-([\w-]+)">([\s\S]*?)<\/li>/g)];
    expect(cards.map((m) => `--luz-${m[1]}`)).toEqual(colorTokens());
    for (const [, name, card] of cards) {
      expect(card, name).toMatch(new RegExp(`<code class="u-select-all">--luz-${name}</code>\\s*<span class="docs-token__role">[^<]{8,}</span>`));
      const modes = [...card.matchAll(/<span class="docs-swatch" data-theme="([\w-]+)" style="--v: var\(--luz-([\w-]+)\)"><\/span>([^<]+)<code>([^<]+)<\/code>/g)];
      expect(modes.map((m) => [m[1], m[2], m[3].trim(), m[4]]), name).toEqual(
        MODES.map((mode, i) => [mode, name, ["Light", "Dark", "High contrast"][i], resolveColor(mode, name)]),
      );
    }
  });

  it("writes each shadow's value next to its specimen", () => {
    const shadows = site.byRoute.get("/docs/tokens/shadows/").body;
    const { shadow } = JSON.parse(readFileSync(new URL("../packages/tokens/tokens.json", import.meta.url), "utf-8"));
    for (const [step, { value }] of Object.entries(shadow)) {
      expect(shadows, step).toContain(`<code>--luz-shadow-${step}</code><br>${value}</div>`);
    }
  });
});
