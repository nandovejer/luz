/**
 * Arabic docs for the browser tests, without Arabic docs in the repository.
 *
 * The docs are published in English and Spanish; Arabic docs are planned
 * (owner, 2026-10-19), so `apps/docs/i18n/ar/` does not exist and the dev
 * server has no `/ar/docs/`. The generator still supports a right-to-left
 * docs language, and the browser measurements of it (direction of the English
 * islands, fonts, the first line of text, the name of the colour-mode button)
 * need the real CSS and scripts. So a test calls `serveArabicDocs(page)`: the
 * pages under `/ar/docs/` are rendered here, by the real generator, from a
 * copy of the real docs with a stand-in Arabic language (the English catalog
 * written in Arabic letters, every page its English fallback; see
 * tests/helpers/docs-i18n-size-fixture.js), and handed to the browser as the
 * document of that URL. The stylesheets, the scripts and the images are the
 * dev server's own.
 */
import { rmSync } from "node:fs";
import { renderPage, scanSite } from "../../scripts/docs-site/site.js";
import { docsI18nModule } from "./docs-i18n-fixture.js";
import { makeSite } from "./docs-i18n-size-fixture.js";

let built;
/** The localized Arabic site of the stand-in copy, made once per process. */
async function arabicView() {
  if (!built) {
    built = (async () => {
      const copy = makeSite({ languages: ["es", "ar"] });
      const site = scanSite(copy.docsDir, copy.repoRoot);
      const mod = await docsI18nModule();
      const view = mod.localize(site, site.docsI18n.byCode.get("ar"));
      process.once("exit", () => rmSync(copy.repoRoot, { recursive: true, force: true }));
      return view;
    })();
  }
  return built;
}

/** The HTML of a page under /ar/docs/, as the generator renders it in dev. */
export async function arabicDocsHtml(pathname) {
  const view = await arabicView();
  const page = view.byRoute.get(pathname);
  if (!page) throw new Error(`the stand-in Arabic docs have no page ${pathname}`);
  return renderPage(page, view, { dev: true, root: "/" });
}

/** Serve every document under /ar/docs/ of this page from the stand-in. Call it before page.goto. */
export async function serveArabicDocs(page) {
  await page.route("**/ar/docs/**", async (route) => {
    if (route.request().resourceType() !== "document") return route.fallback();
    const { pathname } = new URL(route.request().url());
    try {
      await route.fulfill({ contentType: "text/html; charset=utf-8", body: await arabicDocsHtml(pathname) });
    } catch (error) {
      await route.fulfill({ status: 404, contentType: "text/plain", body: String(error.message) });
    }
  });
}
