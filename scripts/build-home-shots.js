/**
 * LUZ home — the captures of "What's inside"
 * Photographs live demos of the documentation, one scene per level of
 * adoption that has a panel (1 to 3), in the three base modes, and writes
 * each as AVIF and WebP to apps/landing/assets/inside/<scene>-<mode>.<ext>,
 * at most MAX_BYTES each (the quality steps down until it fits; a capture
 * that never fits fails the run). The home's "Result" tabs show them. The
 * rasters are committed, so a build never needs a browser or ImageMagick;
 * run this after a demo changes and commit the result. The MIT notice
 * (LICENSE) stays in the same folder.
 *
 * Needs the dev server running (`pnpm dev`; LUZ_URL to point elsewhere),
 * Playwright's Chromium and ImageMagick 7 (`magick`) with AVIF and WebP.
 * No npm dependency (red line 1).
 *
 * Usage: node scripts/build-home-shots.js   (or `pnpm home-shots:build`)
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(repoRoot, "apps/landing/assets/inside");
const BASE = process.env.LUZ_URL ?? "http://localhost:5173";
const MODES = ["light", "dark", "high-contrast"];
/** The widest a capture is kept: twice the panel's width on a desktop. */
const WIDTH = 1120;
/** The ceiling of each file, the row "home capture" of budgets.json. */
export const MAX_BYTES = 40 * 1024;

/**
 * The scenes: the page, what to do before the shot, and the element to
 * photograph. The order is the order of the home's levels.
 */
export const SCENES = [
  { name: "tokens", path: "/docs/tokens/color/", selector: "#brand-7 + .docs-token-grid" },
  { name: "core", path: "/docs/components/form/", selector: "[data-docs-specimen] .docs-demo__stage" },
  {
    name: "site",
    path: "/docs/",
    selector: "#luz-search",
    async before(page) {
      await page.keyboard.press("Control+k");
      await page.locator("#luz-search-q").fill("button");
      await page.waitForTimeout(800);
    },
  },
];

/** Encode `png` as `out` at the highest quality that fits MAX_BYTES. */
function encode(png, out) {
  for (let quality = 70; quality >= 20; quality -= 5) {
    execFileSync("magick", [png, "-resize", `${WIDTH}x>`, "-strip", "-quality", String(quality), out]);
    if (statSync(out).size <= MAX_BYTES) return { quality, bytes: statSync(out).size };
  }
  throw new Error(`${out} does not fit in ${MAX_BYTES} bytes even at quality 20: crop the scene`);
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const tmp = mkdtempSync(join(tmpdir(), "luz-home-shots-"));
  const browser = await chromium.launch();
  try {
    for (const mode of MODES) {
      const context = await browser.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
      // The mode the footer's switcher would store; no light of the hour, so each mode is Vejer's own
      await context.addInitScript((m) => {
        localStorage.setItem("luz-theme", m);
      }, mode);
      for (const scene of SCENES) {
        const page = await context.newPage();
        await page.goto(BASE + scene.path, { waitUntil: "networkidle" });
        await page.evaluate((m) => {
          document.documentElement.dataset.theme = m;
          delete document.documentElement.dataset.light;
        }, mode);
        await scene.before?.(page);
        await page.waitForTimeout(600);
        const png = join(tmp, `${scene.name}-${mode}.png`);
        await page.locator(scene.selector).first().screenshot({ path: png });
        for (const ext of ["avif", "webp"]) {
          const out = join(outDir, `${scene.name}-${mode}.${ext}`);
          const { quality, bytes } = encode(png, out);
          console.log(`${scene.name}-${mode}.${ext}  q${quality}  ${(bytes / 1024).toFixed(1)} KB`);
        }
        await page.close();
      }
      await context.close();
    }
  } finally {
    await browser.close();
    rmSync(tmp, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
