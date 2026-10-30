/**
 * The prism of the site's header and the favicon move in a loop that never ends while the system allows motion
 * (owner, 2026-10-30). That departs from PRINCIPLES.md section 2 ("no infinite loops") and from WCAG 2.2.2
 * (Pause, Stop, Hide), so it is written down: a note in the principle and a known issue in the accessibility
 * statement, in English and in Spanish. What this file also keeps, from the sources:
 *
 *  - the favicon animates with its own CSS only (a @keyframes, `infinite`, inside
 *    `@media (prefers-reduced-motion: no-preference)`), with no script in the file and none in the header's
 *    script (it never rewrites the icon);
 *  - the header's CSS plays the loop only under the same media query, and with durations of tokens.
 *
 * What a browser draws is in tests/site-logo-motion.spec.js and tests/site-favicon-motion.spec.js. The geometry
 * of the favicon is still tests/site-logo.test.js.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const text = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf-8");

/** The Known issues section of the statement: from its h2 to the next h2. */
const known = (html) => {
  const start = html.search(/id="h-a11y-known"/);
  if (start === -1) return "";
  const next = html.indexOf("<h2", start + 10);
  return html.slice(start, next === -1 ? undefined : next);
};

/** The body of the first block that opens with `head` (up to its matching brace), and the text without it. */
function block(source, head) {
  const open = source.indexOf(head);
  if (open === -1) return null;
  let depth = 0;
  let end = -1;
  for (let i = source.indexOf("{", open); i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}" && --depth === 0) {
      end = i;
      break;
    }
  }
  return { inside: source.slice(source.indexOf("{", open) + 1, end), outside: source.slice(0, open) + source.slice(end + 1) };
}

const NO_PREFERENCE = "@media (prefers-reduced-motion: no-preference)";

describe("the motion of the logo is a written deviation", () => {
  it("PRINCIPLES.md notes, within three lines of 'no infinite loops', the header's prism and the favicon, WCAG 2.2.2 and reduced motion", () => {
    const lines = text("PRINCIPLES.md").split("\n");
    const at = lines.findIndex((l) => /no infinite loops/i.test(l));
    expect(at, "the 'no infinite loops' line").toBeGreaterThan(-1);
    const near = lines.slice(at, at + 4).join(" ");
    expect(near).toMatch(/prism/i);
    expect(near).toMatch(/header/i);
    expect(near).toMatch(/favicon/i);
    expect(near).toMatch(/\b2\.2\.2\b/);
    expect(near).toMatch(/reduced[- ]motion/i);
  });

  for (const [file, title] of [
    ["apps/docs/pages/accessibility.html", "Motion of the logo"],
    ["apps/docs/i18n/es/pages/accessibility.html", "Movimiento del logo"],
  ]) {
    it(`${file}: the known issues hold «${title}», name WCAG 2.2.2 and Firefox`, () => {
      const section = known(text(file));
      expect(section, "a Known issues section").not.toBe("");
      const item = section.match(new RegExp(`<li><strong>${title}\\.?</strong>[\\s\\S]*?</li>`))?.[0];
      expect(item, `an item whose strong is «${title}»`).toBeTruthy();
      expect(item).toMatch(/\b2\.2\.2\b/);
      expect(item).toMatch(/Firefox/);
    });
  }
});

describe("the favicon animates with its own CSS, and nothing else", () => {
  const svg = text("apps/site/assets/favicon.svg");

  it("has a <style> with a @keyframes, and no script, no event attribute and no external reference", () => {
    expect(svg).toMatch(/<style\b[^>]*>[\s\S]*@keyframes\s+[\w-]+[\s\S]*<\/style>/);
    expect(svg).not.toMatch(/<script\b/i);
    expect(svg).not.toMatch(/\son[a-z]+\s*=/i);
    expect(svg).not.toMatch(/<(?:set|animate|animateTransform|animateMotion)\b/i);
    expect(svg).not.toMatch(/(?:href|src)\s*=\s*["']?\s*(?:https?:|\/\/|data:)/i);
  });

  it("plays only under prefers-reduced-motion: no-preference, and it never ends", () => {
    const media = block(svg, NO_PREFERENCE);
    expect(media, `a ${NO_PREFERENCE} block`).toBeTruthy();
    expect(media.inside, "the loop is declared inside the query").toMatch(/animation[\w-]*\s*:[^;}]*\binfinite\b/);
    expect(media.outside, "no animation is declared outside the query").not.toMatch(/\banimation(?:-name)?\s*:/);
  });

  it("is not rewritten by the header's script (no favicon code in header.js)", () => {
    const js = text("apps/site/header.js");
    expect(js).not.toMatch(/data:image\/svg\+xml/);
    expect(js).not.toMatch(/rel\s*(?:~|\^|\$|\*)?=\s*["']?(?:shortcut )?icon/);
    expect(js).not.toMatch(/favicon/i);
  });
});

describe("the header's prism loops only when motion is allowed, with durations from tokens", () => {
  const css = text("apps/site/header.css");

  it("declares the infinite animation of the mark inside @media (prefers-reduced-motion: no-preference), and plays its keyframes nowhere else", () => {
    const media = block(css, NO_PREFERENCE);
    expect(media, `a ${NO_PREFERENCE} block`).toBeTruthy();
    expect(media.inside).toMatch(/animation[\w-]*\s*:[^;}]*\binfinite\b/);
    expect(media.inside).toMatch(/\.site-header__mark/);
    const keyframes = media.inside.match(/animation[\w-]*\s*:[^;}]*?\b(site-mark-[\w-]+)/)?.[1];
    expect(keyframes, "the loop names its keyframes").toBeTruthy();
    expect(media.outside, "outside the query the keyframes are only defined, never played").not.toMatch(new RegExp(`animation(?:-name)?\\s*:[^;}]*${keyframes}`));
  });

  it("types no duration: every time is a --luz-duration-* token", () => {
    const media = block(css, NO_PREFERENCE);
    const declared = [...media.inside.matchAll(/animation[\w-]*\s*:([^;}]*)[;}]/g)].map((m) => m[1]);
    expect(declared.length).toBeGreaterThan(0);
    for (const value of declared) expect(value, value).not.toMatch(/\d+(?:\.\d+)?m?s\b/);
  });
});
