/**
 * The select is two layers: the closed box for every browser, and the open list
 * inside @supports (appearance: base-select). The first must not depend on the
 * second, and the second must not leak out of its @supports block.
 *
 * The closed box is one rule for the bare select and for .luz-select
 * (elements/forms.css: `:where(select:not([class*="luz-"]), .luz-select)`), so a
 * select with no class looks like the component; components/select.css keeps
 * only what needs the class or the browser's base-select.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path) => readFileSync(new URL(`../packages/core/src/${path}`, import.meta.url), "utf-8").replace(/\/\*[\s\S]*?\*\//g, "");
const css = source("components/select.css");
const forms = source("elements/forms.css");
/** The innermost rules of elements/forms.css that name .luz-select: the closed box, shared with the bare select. */
const box = [...forms.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selector: selector.trim(), body })).filter((r) => r.selector.includes(".luz-select"));
const START = "@supports (appearance: base-select) {";

/** The CSS with the balanced block that follows `start` cut out. */
function split(source, start) {
  const from = source.indexOf(start);
  let depth = 0;
  for (let i = from + start.length - 1; i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}" && --depth === 0) return [source.slice(0, from) + source.slice(i + 1), source.slice(from, i + 1)];
  }
  throw new Error("unbalanced block");
}

const [layer1, layer2] = split(css, START);

describe("select.css layering", () => {
  it("has one @supports block for base-select", () => {
    expect(css.split(START)).toHaveLength(2);
  });

  it("keeps everything that needs base-select inside the @supports block", () => {
    expect(layer1).not.toMatch(/base-select|::picker|picker-icon|::checkmark|selectedcontent/);
    expect(layer2).toMatch(/::picker\(select\)/);
    expect(layer2).toMatch(/::picker-icon/);
    expect(layer2).toMatch(/::checkmark/);
  });

  it("draws the closed box without the second layer: border, arrow, focus, states, in a rule it shares with the bare select", () => {
    const text = box.map((r) => `${r.selector} {${r.body}}`).join("\n");
    expect(text).toMatch(/appearance:\s*none/);
    expect(text).toMatch(/linear-gradient\([^)]*currentcolor/);
    for (const state of [":hover", ":focus-visible", ":disabled", '[aria-invalid="true"]', "[multiple]"]) expect(text, state).toContain(state);
    expect(forms).toMatch(/@media \(forced-colors: active\)\s*\{[^@]*select/);
    // Every one of those rules is also the bare select's, and none has the second layer in it
    for (const r of box) {
      expect(r.selector, "shared with the bare select").toMatch(/select:not\(\[class\*="luz-"\]\)/);
      expect(r.body + r.selector, "no base-select").not.toMatch(/base-select|::picker/);
    }
  });

  it("does not declare the closed box twice: components/select.css has no appearance: none and no arrow of its own", () => {
    expect(layer1).not.toMatch(/appearance:\s*none/);
    expect(layer1).not.toMatch(/linear-gradient/);
    expect(layer1).not.toMatch(/forced-colors/);
  });

  it("lets the flex select shrink below its longest option", () => {
    // WebKit (Safari 27+) gives a flex select min-width: auto, the width of its
    // longest option, so a narrow page at 400 % text scrolls sideways.
    const rules = [...layer2.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selector: selector.trim(), body }));
    const flex = rules.filter((r) => /appearance:\s*base-select/.test(r.body) && /display:\s*flex/.test(r.body));
    expect(flex.length).toBeGreaterThan(0);
    for (const rule of flex) expect(rule.body, rule.selector).toMatch(/\bmin-(inline-size|width):\s*0\s*;/);
  });

  it("uses no literal colour or physical side, and no primitive token", () => {
    const all = `${css}\n${box.map((r) => r.body).join("\n")}`;
    expect(all).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|var\(--luz-(gray|blue|red|green|yellow|purple)-\d+/);
    expect(all).not.toMatch(/\b(margin|padding|border)-(left|right)\b|\b(left|right):/);
  });
});
