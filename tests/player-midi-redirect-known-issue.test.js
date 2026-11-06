import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * `MidiPlayer.load()` no longer follows a redirect (PR #93, `redirect: "error"`), a change a consumer meets with no warning
 * but a changeset. The Player page says it under "Known issues", in English and Spanish (pre-release audit, 2026-11-06).
 */
const PAGES = {
  en: ["apps/docs/pages/components/player.html", /redirect/i, /error/i, /final address/i],
  es: ["apps/docs/i18n/es/pages/components/player.html", /redirige|redirecci/i, /error/i, /direcci[oó]n final/i],
};

const knownIssues = (file) => {
  const html = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  const start = html.indexOf('id="known-issues"');
  const end = html.indexOf('<nav class="luz-tabs docs-view-tabs"', start);
  return html.slice(start, end);
};

describe("the Player page's Known issues say a MIDI address that redirects fails", () => {
  for (const [lang, [file, redirect, error, final]] of Object.entries(PAGES)) {
    it(`${lang}: names the redirect, the error event and the final address`, () => {
      const text = knownIssues(file);
      expect(text).toMatch(redirect);
      expect(text).toMatch(error);
      expect(text).toMatch(final);
    });
  }

  it("en: says the error text differs between browsers, so nothing should match on it", () => {
    expect(knownIssues(PAGES.en[0])).toMatch(/differs? (between|by) browsers?|browser[- ]specific/i);
  });
});
