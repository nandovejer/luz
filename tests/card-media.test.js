/**
 * The media card (`.luz-card--media`): what the package lists and what the docs page of the card
 * says about it, in English and in Spanish (SR-9; .claude/plans/component-gaps.md, section 2). The
 * geometry is in tests/card-media.spec.js.
 *
 * Needs `pnpm core:build` first: classes.json of core is read from dist (git-ignored).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sourceHash } from "../scripts/docs-site/docs-i18n.js";
import { docsLanguage } from "./helpers/docs-i18n-fixture.js";
import { site } from "./helpers/docs-site.js";
import { tokensUsedBy } from "./helpers/design-tokens.js";

const ROUTE = "/docs/components/card/";
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf-8");
const css = read("packages/core/src/components/card.css").replace(/\/\*[\s\S]*?\*\//g, "");
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selector: selector.trim(), body }));

describe("card.css, media card", () => {
  const rule = (selector) => rules.find((r) => r.selector === selector);

  it("is a column with no padding of its own, so the image runs to the border", () => {
    const media = rule(".luz-card--media");
    expect(media, ".luz-card--media rule").toBeDefined();
    expect(media.body).toMatch(/display:\s*flex/);
    expect(media.body).toMatch(/flex-direction:\s*column/);
    expect(media.body).toMatch(/padding:\s*0\b/);
  });

  it("crops the image to --luz-card-ratio (16 / 9 without it) and rounds only the top, by the radius less the border", () => {
    const image = rule(".luz-card__media");
    expect(image, ".luz-card__media rule").toBeDefined();
    expect(image.body).toMatch(/aspect-ratio:\s*var\(--luz-card-ratio,\s*16\s*\/\s*9\)/);
    expect(image.body).toMatch(/object-fit:\s*cover/);
    expect(image.body).toMatch(/border-start-start-radius:\s*calc\(var\(--luz-radius-md\)\s*-\s*1px\)/);
    expect(image.body).toMatch(/border-start-end-radius:\s*calc\(var\(--luz-radius-md\)\s*-\s*1px\)/);
    expect(image.body).not.toMatch(/border-end-/);
  });

  it("pushes the actions to the foot of a card as tall as its row", () => {
    const actions = rule(".luz-card--media .luz-card__actions");
    expect(actions, "actions rule").toBeDefined();
    expect(actions.body).toMatch(/margin-block-start:\s*auto/);
  });

  it("does not clip the card: no overflow rule on the media card", () => {
    for (const r of rules.filter((x) => /--media|__media/.test(x.selector))) {
      expect(r.body, r.selector).not.toMatch(/overflow\s*:/);
    }
  });

  it("gives the title link of a linked media card no stacking order of its own", () => {
    for (const r of rules.filter((x) => /--media/.test(x.selector) && /__title a\b/.test(x.selector) && !/::after/.test(x.selector))) {
      expect(r.body, r.selector).not.toMatch(/z-index|position:\s*relative/);
    }
  });
});

describe("classes.json of core", () => {
  const classes = JSON.parse(read("packages/core/dist/classes.json")).classes;
  const byName = new Map(classes.map((c) => [c.name, c]));

  it("lists the modifier, the image and the actions of the media card, in the card's stylesheet", () => {
    for (const name of ["luz-card--media", "luz-card__media", "luz-card__actions"]) {
      const entry = byName.get(name);
      expect(entry, name).toBeDefined();
      expect(entry.kind, name).toBe("component");
      expect(entry.block, name).toBe("luz-card");
      expect(entry.files, name).toContain("components/card.css");
    }
    expect(byName.get("luz-card--media").modifier).toBe("media");
    expect(byName.get("luz-card__media").part).toBe("media");
    expect(byName.get("luz-card__actions").part).toBe("actions");
  });
});

describe("docs page of the card, media card", () => {
  const page = site.byRoute.get(ROUTE);

  it("has the Media card section, in the Code tab's examples, with a live example and a snippet to copy", () => {
    expect(page.body).toMatch(/<h4 id="media-card">/);
    const after = page.body.split('<h4 id="media-card">')[1].split(/<h[1-4] /)[0];
    expect(after).toContain('class="luz-card luz-card--media"');
    expect(after).toContain('class="luz-card__media"');
    expect(after).toContain('class="luz-card__actions');
    // The example is a docs specimen; its snippet is copied from a <code> by id
    expect(after).toContain("data-docs-specimen");
    const copy = after.match(/data-copy-from="([\w-]+)"/)?.[1];
    expect(copy, "the copy button points at the snippet").toBeTruthy();
    expect(after).toMatch(new RegExp(`<code id="${copy}">`));
  });

  it("lists the three new classes in its Variants and options table", () => {
    const variants = page.body.split('<h3 id="variants">')[1].split('<h3 id="how">')[0];
    for (const name of ["luz-card--media", "luz-card__media", "luz-card__actions"]) {
      expect(variants, name).toContain(`<code>.${name}</code>`);
    }
  });

  it("documents --luz-card-ratio, and does not count it as a token it uses", () => {
    expect(page.body).toContain("--luz-card-ratio");
    expect(tokensUsedBy(page)).not.toContain("--luz-card-ratio");
  });

  it("says the title has no link when there are several destinations", () => {
    expect(page.body).toMatch(/Several destinations: no link in the title/);
  });
});

describe("docs page of the card in Spanish, media card", () => {
  const english = site.byRoute.get(ROUTE);
  const spanish = docsLanguage(site, "es").pages.get(ROUTE);

  it("has the same section and snippet ids as the English page", () => {
    expect(spanish, "translation of the card page").toBeDefined();
    expect(spanish.body).toMatch(/<h4 id="media-card">/);
    const copy = english.body.match(/data-copy-from="(code-card-media)"/)?.[1];
    expect(copy).toBe("code-card-media");
    expect(spanish.body).toContain('data-copy-from="code-card-media"');
    expect(spanish.body).toMatch(/<code id="code-card-media">/);
  });

  it("keeps the markup of the snippet byte for byte (what stays English)", () => {
    const code = (body) => body.match(/<code id="code-card-media">([\s\S]*?)<\/code>/)?.[1];
    expect(code(english.body), "English snippet").toContain("luz-card--media");
    expect(code(spanish.body)).toBe(code(english.body));
  });

  it("was made from the English page as it is: its source is the hash of the English body", () => {
    expect(spanish.meta.source).toBe(sourceHash(english.body));
    expect(spanish.stale).toBe(false);
  });
});
