// @ts-check
/**
 * The docs in Spanish and Arabic, measured in a browser (what the accessibility
 * and UX reviews of /es/docs/ and /ar/docs/ found). The generator output the
 * fixture site is enough for is in tests/docs-i18n-review.test.js.
 *
 *   1  in /ar/docs/ every lang="en" element of the chrome and the head is
 *      laid out left to right, and the h1, the lead and the first paragraph
 *      of the body start at the same x
 *   2  the English in an Arabic page uses the font of the English docs
 *   3  the colour-mode button is named in the language of the page at load,
 *      before any click
 *   4  the notice is set at the page's base text size
 *
 * Chromium only: it needs the real layout engine (direction, fonts). The
 * static facts are held without JavaScript by the vitest file.
 */
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const catalog = (/** @type {string} */ code) =>
  JSON.parse(
    readFileSync(
      fileURLToPath(
        new URL(`../apps/landing/i18n/${code}.json`, import.meta.url)
      ),
      "utf-8"
    )
  );

// The chromium-nojs project has javaScriptEnabled: false
test.skip(
  ({ javaScriptEnabled }) => !javaScriptEnabled,
  "a browser measurement: it needs the page scripts"
);

test.use({ viewport: { width: 1280, height: 900 } });

/** A page that is English inside the Arabic chrome, and one that may be translated by the time this runs. */
const AR_PAGES = ["/ar/docs/components/button/", "/ar/docs/get-started/"];

test.describe("English in a right-to-left page", () => {
  for (const url of AR_PAGES) {
    test(`lays out every lang=en element of the chrome left to right on ${url}`, async ({
      page,
    }) => {
      await page.goto(url);
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      const wrong = await page.evaluate(() => {
        const out = [];
        for (const el of document.querySelectorAll('[lang="en"]')) {
          // The search dialog's lists are written by the header partial and filled by the search script
          if (el.closest("luz-search")) continue;
          if (getComputedStyle(el).direction !== "ltr") {
            out.push(
              `${el.localName}${
                el.className
                  ? "." + String(el.className).trim().split(/\s+/).join(".")
                  : ""
              }: ${getComputedStyle(el).direction}`
            );
          }
        }
        return [...new Set(out)];
      });
      expect(wrong, "lang=en elements that are not direction: ltr").toEqual([]);
    });
  }

  test("lays out the h1, the lead, the pager and the sidebar entries of an untranslated page left to right", async ({
    page,
  }) => {
    await page.goto("/ar/docs/components/button/");
    for (const selector of [
      "h1.docs-title",
      "p.luz-docs-page-head__lead",
      '.luz-breadcrumb__item[aria-current="page"]',
      'ul.docs-nav__pages[lang="en"]',
      'ul.docs-nav__pages[lang="en"] a',
      '.luz-sidebar__link[lang="en"]',
      ".luz-docs-pager__title",
      ".luz-docs-rail__list li",
      ".docs-end__links a",
    ]) {
      const found = page.locator(selector);
      const count = await found.count();
      for (let i = 0; i < count; i++) {
        const direction = await found
          .nth(i)
          .evaluate((el) => getComputedStyle(el).direction);
        expect(direction, `${selector} #${i}`).toBe("ltr");
      }
    }
    await expect(page.locator("h1.docs-title")).toHaveCount(1);
    await expect(page.locator("p.luz-docs-page-head__lead")).toHaveCount(1);
  });

  test("lays out the cards of a gallery of untranslated pages left to right", async ({
    page,
  }) => {
    await page.goto("/ar/docs/components/");
    const cards = page.locator('li.docs-card[lang="en"]');
    expect(
      await cards.count(),
      "untranslated cards in the gallery"
    ).toBeGreaterThan(0);
    const directions = await cards.evaluateAll((els) => [
      ...new Set(els.map((el) => getComputedStyle(el).direction)),
    ]);
    expect(directions).toEqual(["ltr"]);
  });

  test("starts the h1, the lead and the first paragraph of the body at the same left edge", async ({
    page,
  }) => {
    await page.goto("/ar/docs/components/button/");
    const lefts = await page.evaluate(() => {
      /** The left edge of the first line of text of an element. */
      const left = (/** @type {Element | null} */ el) => {
        if (!el) return null;
        const range = document.createRange();
        range.selectNodeContents(el);
        const rects = [...range.getClientRects()]
          .filter((r) => r.width > 0)
          .sort((a, b) => a.top - b.top || a.left - b.left);
        return rects[0]?.left ?? null;
      };
      return {
        h1: left(document.querySelector("h1.docs-title")),
        lead: left(document.querySelector("p.luz-docs-page-head__lead")),
        body: left(document.querySelector(".docs-body p")),
      };
    });
    expect(lefts.h1, "h1").not.toBeNull();
    expect(lefts.lead, "lead").not.toBeNull();
    expect(lefts.body, "first paragraph").not.toBeNull();
    expect(
      Math.abs(lefts.h1 - lefts.body),
      `h1 ${lefts.h1} and paragraph ${lefts.body}`
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(lefts.lead - lefts.body),
      `lead ${lefts.lead} and paragraph ${lefts.body}`
    ).toBeLessThanOrEqual(1);
  });
});

test.describe("the font of the English in an Arabic page", () => {
  /** The font-family of the English h1 and of the English text of the body of a page. */
  const fonts = (/** @type {import('@playwright/test').Page} */ page) =>
    page.evaluate(() => {
      const family = (/** @type {Element | null} */ el) =>
        el ? getComputedStyle(el).fontFamily : null;
      return {
        h1: family(document.querySelector("h1.docs-title")),
        body: family(document.querySelector(".docs-body p, .docs-body li")),
        h1Lang:
          document
            .querySelector("h1.docs-title")
            ?.closest("[lang]")
            ?.getAttribute("lang") ?? null,
        bodyLang:
          document
            .querySelector(".docs-body p, .docs-body li")
            ?.closest("[lang]")
            ?.getAttribute("lang") ?? null,
      };
    });

  for (const slug of ["components/button/", "get-started/"]) {
    test(`uses the font of the English page for the English h1 and body on /ar/docs/${slug}`, async ({
      page,
    }) => {
      await page.goto(`/docs/${slug}`);
      const english = await fonts(page);
      expect(english.h1Lang ?? "en").toBe("en");
      await page.goto(`/ar/docs/${slug}`);
      const arabic = await fonts(page);
      // Once a page is translated its own text is Arabic and takes the Arabic stack: only the English islands are compared
      if (arabic.h1Lang === "en")
        expect(arabic.h1, "the English h1").toBe(english.h1);
      if (arabic.bodyLang === "en")
        expect(arabic.body, "the English text of the body").toBe(english.body);
      if (slug === "components/button/")
        expect(
          [arabic.h1Lang, arabic.bodyLang],
          "a page that is not translated is English"
        ).toEqual(["en", "en"]);
    });
  }
});

test.describe("the colour-mode button is named in the language of the page at load", () => {
  for (const [url, code] of /** @type {const} */ ([
    ["/docs/", "en"],
    ["/es/docs/", "es"],
    ["/ar/docs/", "ar"],
  ])) {
    test(`names it in ${code} on ${url}, with no click`, async ({ page }) => {
      const expected = catalog(code)["footer.mode-change"];
      expect(
        expected,
        `footer.mode-change in apps/landing/i18n/${code}.json`
      ).toBeTruthy();
      await page.goto(url);
      await page.waitForSelector("html[data-luz-js]");
      await page.waitForTimeout(1000);
      const button = page.locator(".luz-mode-cycle");
      await expect(button).toHaveCount(1);
      // The text of the catalog, then the current mode may follow ("Cambiar el modo de color. Actual: Auto")
      const label = (await button.getAttribute("aria-label")) ?? "";
      expect(
        label.startsWith(expected),
        `aria-label "${label}" starts with "${expected}"`
      ).toBe(true);
      if (code !== "en")
        expect(label, "no English left in the name").not.toMatch(
          /Change color mode|Current/
        );
    });
  }
});

test.describe("the notice is set at the base text size", () => {
  for (const url of [
    "/es/docs/components/button/",
    "/ar/docs/components/button/",
    "/es/docs/",
    "/ar/docs/",
  ]) {
    test(`sets the text and the link of the notice at the size of the body on ${url}`, async ({
      page,
    }) => {
      await page.goto(url);
      const sizes = await page.evaluate(() => {
        const notice = document.querySelector("main > div.docs-notice");
        if (!notice) return null;
        const size = (/** @type {Element | null} */ el) =>
          el ? getComputedStyle(el).fontSize : null;
        return {
          base: size(document.body),
          text: size(notice.querySelector(".luz-alert__body")),
          link: size(notice.querySelector("a")),
        };
      });
      expect(sizes, "the notice").not.toBeNull();
      expect(sizes?.text, "the sentence").toBe(sizes?.base);
      expect(sizes?.link, "the link").toBe(sizes?.base);
    });
  }
});
