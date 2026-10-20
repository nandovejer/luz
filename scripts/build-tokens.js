/**
 * LUZ Design System — Token Builder
 * Composes dist/ from tracked sources:
 *   luz-tokens.css → fonts/fonts.css (@font-face) + Layer 1 primitives
 *                    (generated from tokens.json) + Layer 2 semantic
 *                    (packages/tokens/src/semantic.css)
 *   tokens.css     → primitives + semantic, no @font-face (bring your own fonts)
 *   fonts.css      → @font-face only
 *   tokens.json    → primitives source, for tooling (colours, scales, the
 *                    typography roles, breakpoints and motion; the Arabic
 *                    role switch and the reduced-motion zeroing are written
 *                    from it)
 *   luz-tokens.dtcg.json → primitives + semantic (three modes) in the W3C
 *                    Design Tokens (DTCG) format, for Figma and other tools
 *   fonts/         → woff2 files + their MIT licence texts
 *   classes.json   → the properties the CSS declares, read back from it
 *                    (scripts/ai-manifests.js)
 *
 * Usage: node scripts/build-tokens.js (from the repo root)
 */

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  copyFileSync,
  readdirSync,
  statSync,
  existsSync,
} from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import * as esbuild from "esbuild";
import { buildDtcg, buildResolver } from "./tokens-dtcg.js";
import { writeManifests } from "./ai-manifests.js";
import { inLuzLayer } from "./luz-layers.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tokensPath = resolve(__dirname, "../packages/tokens/tokens.json");
const distRoot = resolve(__dirname, "../packages/tokens/dist");
const outputPath = resolve(distRoot, "luz-tokens.css");

const semanticPath = resolve(__dirname, "../packages/tokens/src/semantic.css");

const tokens = JSON.parse(readFileSync(tokensPath, "utf-8"));
const semanticCss = readFileSync(semanticPath, "utf-8");
const semanticLayer = `\n\n${semanticCss}`;

// ---- Generate primitives ----
function generatePrimitives(tokens) {
  const lines = [];

  for (const [family, shades] of Object.entries(tokens.color)) {
    lines.push(`  /* ${family.charAt(0).toUpperCase() + family.slice(1)} */`);
    for (const [shade, token] of Object.entries(shades)) {
      lines.push(`  --luz-${family}-${shade}: ${token.value};`);
    }
    lines.push("");
  }

  // A derived size is written as its formula (`from`); `value` stays the
  // resolved default for dist/tokens.json and the DTCG file. `fromRounded`
  // is the same formula with round(): it goes in the @supports block below.
  const rounded = [];

  lines.push("  /* Spacing: --luz-space-unit (0.25rem, the 4px grid) times a step; set the unit on :root */");
  for (const [key, token] of Object.entries(tokens.spacing)) {
    lines.push(`  --luz-space-${key}: ${token.from ?? token.value};`);
  }

  lines.push("\n  /* Control heights */");
  for (const [key, token] of Object.entries(tokens.control)) {
    lines.push(`  --luz-control-${key}: ${token.value};`);
  }

  lines.push("\n  /* Typography: --luz-type-base and --luz-type-ratio size the --luz-text-* steps; set them on :root */");
  for (const [key, token] of Object.entries(tokens.typography)) {
    lines.push(`  --luz-${key}: ${token.from ?? token.value};`);
    if (token.fromRounded) rounded.push(`    --luz-${key}: ${token.fromRounded};`);
  }

  lines.push("\n  /* Radius */");
  for (const [key, token] of Object.entries(tokens.radius)) {
    lines.push(`  --luz-radius-${key}: ${token.value};`);
  }

  lines.push("\n  /* Shadows */");
  for (const [key, token] of Object.entries(tokens.shadow)) {
    lines.push(`  --luz-shadow-${key}: ${token.value};`);
  }

  // A token's description is its comment in the CSS, as it was in core's
  // settings before these moved here
  const said = (token) => (token.description ? ` /* ${token.description} */` : "");

  lines.push("\n  /* Typography roles: headings and running text (serif headings and body, sans for UI, mono for code) */");
  for (const [key, token] of Object.entries(tokens.role)) {
    lines.push(`  --luz-${key}: ${token.from ?? token.value};${said(token)}`);
  }

  lines.push("\n  /* Breakpoints: @media (max-width: var()) does not work in native CSS; a canonical reference for JS and preprocessors */");
  for (const [key, token] of Object.entries(tokens.breakpoint)) {
    lines.push(`  --luz-mq-${key}: ${token.value};${said(token)}`);
  }

  lines.push("\n  /* Motion: durations */");
  for (const [key, token] of Object.entries(tokens.duration)) {
    lines.push(`  --luz-duration-${key}: ${token.value};${said(token)}`);
  }

  lines.push("\n  /* Motion: easing. LUZ's own curves: movement starts promptly and spends\n     most of its time settling, so it reads as calm rather than snappy. */");
  for (const [key, token] of Object.entries(tokens.easing)) {
    lines.push(`  --luz-easing-${key}: ${token.value};${said(token)}`);
  }

  // round() is Baseline "newly available" (2024): a browser without it keeps
  // the plain chain, at most 0.25px away on three heading sizes
  const supports = rounded.length
    ? `\n\n/* Whole 1/16 rem steps, where round() exists (the plain chain above is the fallback) */\n@supports (width: round(1px, 1px)) {\n  :root {\n${rounded.join("\n")}\n  }\n}`
    : "";

  return `:root {\n${lines.join("\n")}\n}${supports}${languageRoles(tokens)}${reducedMotion(tokens)}`;
}

/* A role's value for a language: one :where(:lang()) rule per language */
function languageRoles(tokens) {
  const byLang = {};
  for (const [key, token] of Object.entries(tokens.role)) {
    for (const [lang, value] of Object.entries(token.lang ?? {})) (byLang[lang] ??= []).push(`  --luz-${key}: ${value};`);
  }
  const notes = {
    ar: `/* Arabic: ET Book has no Arabic letters, so running text and headings take
   the system sans, which has them on every platform (no bundled font, red
   line 13). Zero specificity: your own rule, outside LUZ's layers, still wins. */`,
  };
  return Object.entries(byLang)
    .map(([lang, decls]) => `\n\n${notes[lang] ?? `/* ${lang} */`}\n:where(:lang(${lang})) {\n${decls.join("\n")}\n}`)
    .join("");
}

/* Reduced motion: every duration of tokens.json at 0s */
function reducedMotion(tokens) {
  const zero = Object.keys(tokens.duration).map((key) => `    --luz-duration-${key}: 0s;`);
  return `\n\n/* Reduced motion: one switch. Every transition and animation in LUZ takes
   its duration from these tokens, so zeroing them removes the motion
   everywhere without !important. Never hard-code a duration in a component. */
@media (prefers-reduced-motion: reduce) {
  :root {
${zero.join("\n")}
  }
}`;
}

// Start from a clean dist so removed sources never linger in the tarball
rmSync(distRoot, { recursive: true, force: true });
mkdirSync(distRoot, { recursive: true });

// ---- Include the self-hosted fonts (@font-face) ----
let fontFaces = "";
const fontsCssPath = resolve(__dirname, "../packages/tokens/fonts/fonts.css");
try {
  // fonts.css references ./serif/… next to itself; in dist the files live
  // under ./fonts/, so the URLs are rewritten to stay resolvable.
  fontFaces = readFileSync(fontsCssPath, "utf-8").replace(
    /url\((["']?)\.\//g,
    "url($1./fonts/",
  );
} catch (_) {
  console.log(`ℹ️ fonts.css not found at ${fontsCssPath}, skipping font-faces`);
}

const header = `/* ==========================================================================
   LUZ Design System — Tokens
   Generated from tokens.json · Do not edit manually
   ========================================================================== */

/* -------------------------------------------------------------------------
   WEB FONTS (self-hosted)
   -------------------------------------------------------------------------- */`;

const tokensHeader = `/* ==========================================================================
   LUZ Design System — Tokens (no web fonts)
   Generated from tokens.json · Do not edit manually
   ========================================================================== */`;

const layers = `/* -------------------------------------------------------------------------
   LAYER 1: PRIMITIVOS
   Los valores base. Nunca cambian entre temas.
   Regla: los componentes NUNCA usan estas variables directamente.
   -------------------------------------------------------------------------- */\n${generatePrimitives(tokens)}${semanticLayer}`;

async function writeCssWithMin(outPath, css) {
  writeFileSync(outPath, css, "utf-8");
  const { code } = await esbuild.transform(css, { loader: "css", minify: true });
  writeFileSync(outPath.replace(/\.css$/, ".min.css"), code, "utf-8");
}

// The custom properties are in the luz.tokens layer, so a consumer's `app`
// layer can override them; @font-face is not a cascade matter and stays out
const layered = inLuzLayer("tokens", layers);
await writeCssWithMin(outputPath, `${header}\n${fontFaces}\n\n${layered}`);
console.log(`✓ Tokens built (fonts + primitives + semantic) → ${outputPath} (+ min)`);

await writeCssWithMin(resolve(distRoot, "tokens.css"), `${tokensHeader}\n\n${layered}`);
await writeCssWithMin(resolve(distRoot, "fonts.css"), fontFaces);
console.log("✓ Split entries built → tokens.css, fonts.css (+ min)");

copyFileSync(tokensPath, resolve(distRoot, "tokens.json"));
console.log("✓ tokens.json copied → dist/");

writeFileSync(resolve(distRoot, "luz-tokens.dtcg.json"), `${JSON.stringify(buildDtcg(tokens, semanticCss), null, 2)}\n`, "utf-8");
console.log("✓ DTCG tokens → dist/luz-tokens.dtcg.json");

writeFileSync(resolve(distRoot, "luz-tokens.resolver.json"), `${JSON.stringify(buildResolver(tokens, semanticCss), null, 2)}\n`, "utf-8");
console.log("✓ DTCG resolver (the three color modes) → dist/luz-tokens.resolver.json");

// Copy font files and their licence texts
function copyFontDir(fontName) {
  const fontSrc = resolve(__dirname, `../packages/tokens/fonts/${fontName}`);
  const fontDest = resolve(distRoot, `fonts/${fontName}`);
  if (existsSync(fontSrc)) {
    mkdirSync(fontDest, { recursive: true });
    for (const file of readdirSync(fontSrc)) {
      const srcPath = resolve(fontSrc, file);
      const destPath = resolve(fontDest, file);
      if (statSync(srcPath).isFile()) {
        copyFileSync(srcPath, destPath);
      }
    }
    console.log(`✓ ${fontName} fonts copied → ${fontDest}`);
  }
}

["serif"].forEach(copyFontDir);
const fontsSrc = resolve(__dirname, "../packages/tokens/fonts");
for (const file of readdirSync(fontsSrc).filter((f) => f.startsWith("LICENSE"))) {
  copyFileSync(resolve(fontsSrc, file), resolve(distRoot, "fonts", file));
}

let tokenCount = 0;
for (const [key, group] of Object.entries(tokens)) {
  if (key === "$meta") continue;
  for (const item of Object.values(group)) {
    if (item && typeof item === "object" && !item.value) {
      tokenCount += Object.keys(item).length;
    } else {
      tokenCount++;
    }
  }
}
console.log(`✓ ${tokenCount} primitive tokens generated`);

const manifest = writeManifests("tokens");
console.log(`✓ classes.json → ${manifest.classes.length} classes, ${manifest.properties.length} properties`);
