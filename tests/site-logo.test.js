/**
 * The logo of LUZ is the prism, one mark (a square, 32 x 32 units) in every place the site draws it:
 * the favicons (apps/site/assets), the header's inline mark (apps/site/_partials/header.html) and the
 * home page's footer brand (apps/landing/index.html). What a browser lays out (22 x 22 px, no sideways
 * scroll, forced colours, right-to-left) is in tests/site-header.spec.js and tests/landing-footer.spec.js.
 *
 * - The prism: an equilateral triangle, three stripes of the brand colour at .25, .45 and .65 between two
 *   solid faces. The same drawing in favicon.svg, logo-mark.svg, the header (every language) and the footer
 *   brand; the first mark (`M8 8h4v28h4v4H8Z`) and the wide wordmark it replaced are nowhere in apps/ or
 *   packages/.
 * - favicon.ico: a valid ICO of 32-bit images at exactly 16, 32 and 48 px, the prism in white.
 * - apple-touch-icon.png: 180 x 180, full-bleed brand blue (iOS rounds it; a transparent corner turns
 *   black), the prism in white and centred.
 * - favicon.svg: a 48 x 48 box with the brand-blue rounded rect and the prism in white, centred.
 * - The inline marks are square, decorative (the link is named by its sr-only "LUZ"), and paint with
 *   currentColor.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { buildSite, landingDocuments, scanSite } from "../scripts/docs-site/site.js";
import { findAll, hasClass, parse, query, textOf } from "./helpers/html-dom.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(repo, file));
const text = (file) => read(file).toString("utf-8");

/**
 * The prism: its drawing and its box (a design asset, not a computed value): three stripes, each with the
 * opacity of its tint, and the two solid faces (an even-odd path of two triangles).
 */
const STRIPES = [
  ["M20.8 10.46 7.04 17.66 23.36 14.89Z", "0.25"],
  ["M23.36 14.89 7.04 17.66 25.92 19.33Z", "0.45"],
  ["M25.92 19.33 7.04 17.66 28.48 23.76Z", "0.65"],
];
const FACES = "M20.8 10.46 16 2.14 7.04 17.66ZM32 29.86 28.48 23.76 7.04 17.66 0 29.86Z";
const OLD_D = "M8 8h4v28h4v4H8Z";
const WORDMARK_D = "M55.5 67.6H89.3V204.4L55.5 238.2Z";
const VIEW_BOX = "0 0 32 32";

/** The points of a path made of absolute M and implicit L pairs, and Z (a polygon): [[x, y], …]. */
function polygonPoints(d) {
  const points = [];
  for (const [, , args] of d.matchAll(/([MLZ])([^MLZ]*)/g)) {
    const n = args.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
    for (let i = 0; i + 1 < n.length; i += 2) points.push([n[i], n[i + 1]]);
  }
  return points;
}

const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
const pathTags = (svg) => [...svg.matchAll(/<path\b[^>]*>/g)].map((m) => m[0]);
const boundsOf = (points) => {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
};
/** The box of the prism in its own 32 units: the faces span all of it. */
const PRISM_BOX = boundsOf(polygonPoints(FACES));
/** The share of its square the prism fills in the plaques (the favicon's design) and its aspect ratio. */
const ASPECT = (PRISM_BOX.x1 - PRISM_BOX.x0) / (PRISM_BOX.y1 - PRISM_BOX.y0);
const brandBlue = () => attr(pathTags(text("apps/site/assets/logo-mark.svg"))[0], "fill").toLowerCase();

describe("one mark everywhere", () => {
  it("the prism's faces span the square viewBox: wide as the box, and a triangle's height", () => {
    expect(PRISM_BOX.x0).toBe(0);
    expect(PRISM_BOX.x1).toBe(32);
    expect(ASPECT, "an equilateral triangle is 2 / sqrt(3) wide for its height").toBeCloseTo(2 / Math.sqrt(3), 1);
  });

  it("logo-mark.svg is the prism in a 32 x 32 box, in the brand blue, titled LUZ, with ten tiny dots in the three tints", () => {
    const svg = text("apps/site/assets/logo-mark.svg");
    expect(attr(svg.match(/<svg\b[^>]*>/)[0], "viewBox")).toBe(VIEW_BOX);
    expect(svg).toContain("<title>LUZ</title>");
    const paths = pathTags(svg);
    for (const [index, [d, opacity]] of STRIPES.entries()) {
      expect(attr(paths[index], "d"), `stripe ${index + 1}`).toBe(d);
      expect(attr(paths[index], "fill-opacity"), `stripe ${index + 1}`).toBe(opacity);
    }
    expect(paths.map((path) => attr(path, "fill")).every((fill) => fill === attr(paths[0], "fill")), "one colour for every part").toBe(true);
    expect(attr(paths[0], "fill")).toMatch(/^#[0-9a-f]{6}$/i);
    // The solid path: the two faces, and the ten dots cut out of them (even-odd). Its triangles are the faces' own
    const solid = paths.find((path) => attr(path, "fill-rule") === "evenodd");
    expect(solid, "the solid faces are an even-odd path").toBeTruthy();
    const subpaths = attr(solid, "d").split("Z").filter(Boolean);
    expect(subpaths, "two faces and ten dots").toHaveLength(12);
    const corners = (d) => polygonPoints(d).map((point) => point.join()).sort();
    expect(corners(subpaths[0]), "the upper face").toEqual(corners(FACES.split("Z")[0]));
    // The dots: the subpaths of the tinted paths after the three stripes
    const dots = paths.slice(STRIPES.length).filter((path) => attr(path, "fill-opacity")).reduce((sum, path) => sum + (attr(path, "d").match(/M/g)?.length ?? 0), 0);
    expect(dots, "the dots, in the tints of the stripes").toBe(10);
    for (const path of paths.slice(STRIPES.length).filter((p) => attr(p, "fill-opacity"))) expect(STRIPES.map(([, o]) => o)).toContain(attr(path, "fill-opacity"));
  });

  it("favicon.svg draws the same prism, in white", () => {
    const paths = pathTags(text("apps/site/assets/favicon.svg"));
    expect(paths.map((path) => attr(path, "d"))).toEqual([...STRIPES.map(([d]) => d), FACES]);
    expect(paths.map((path) => attr(path, "fill-opacity") ?? null)).toEqual([...STRIPES.map(([, o]) => o), null]);
    for (const path of paths) expect(["#fff", "#ffffff"], "white").toContain(attr(path, "fill").toLowerCase());
  });

  it("the old mark and the wide wordmark are nowhere in apps/ or packages/ (the home's sky favicon is not a copy of them)", () => {
    const found = [];
    const walk = (dir) => {
      for (const name of readdirSync(join(repo, dir))) {
        if (name === "node_modules" || name === "dist" || name.startsWith(".")) continue;
        const file = `${dir}/${name}`;
        if (statSync(join(repo, file)).isDirectory()) walk(file);
        else if (/\.(html|svg|css|js|json|md|txt|xml|webmanifest)$/.test(name) && [OLD_D, WORDMARK_D].some((d) => text(file).includes(d))) found.push(file);
      }
    };
    for (const dir of ["apps", "packages"]) walk(dir);
    expect(found).toEqual([]);
  });
});

describe("favicon.svg", () => {
  const svg = text("apps/site/assets/favicon.svg");

  it("is a 48 x 48 box with a rounded rect in the brand blue (the mark's colour) and the mark in white", () => {
    expect(attr(svg.match(/<svg\b[^>]*>/)[0], "viewBox")).toBe("0 0 48 48");
    const rect = svg.match(/<rect\b[^>]*>/)?.[0] ?? "";
    expect(attr(rect, "width")).toBe("48");
    expect(attr(rect, "height")).toBe("48");
    expect(Number(attr(rect, "rx")), "rounded").toBeGreaterThan(0);
    expect(attr(rect, "fill").toLowerCase()).toBe(brandBlue());
  });

  it("centres the prism in the box (the middle within 1.5 unit, the optical centre sits a little low), and it fills about 62 % of the width", () => {
    // The prism sits in a <g transform="translate(x y) scale(k)">: no matrix, no rotation
    const group = svg.match(/<g\b[^>]*>/)?.[0] ?? "";
    const t = attr(group, "transform")?.match(/^translate\(\s*([\d.]+)[\s,]+([\d.]+)\s*\)\s*scale\(\s*([\d.]+)\s*\)$/);
    expect(t, "the prism is placed with translate() scale()").toBeTruthy();
    const [tx, ty, k] = t.slice(1).map(Number);
    const box = { x0: tx + PRISM_BOX.x0 * k, x1: tx + PRISM_BOX.x1 * k, y0: ty + PRISM_BOX.y0 * k, y1: ty + PRISM_BOX.y1 * k };
    expect(Math.abs(box.x0 - (48 - box.x1)), "equal space left and right").toBeLessThanOrEqual(1);
    expect(Math.abs(box.y0 - (48 - box.y1)), "space above and below").toBeLessThanOrEqual(1.5);
    expect((box.x1 - box.x0) / 48, "share of the width").toBeCloseTo(0.62, 1);
    expect(box.y0, "inside the box").toBeGreaterThan(0);
    expect(box.y1).toBeLessThan(48);
  });
});

describe("favicon.ico", () => {
  const ico = read("apps/site/assets/favicon.ico");

  it("is an ICO (type 1) of exactly three images: 16, 32 and 48 px, 32 bits each, inside the file", () => {
    expect(ico.readUInt16LE(0), "reserved").toBe(0);
    expect(ico.readUInt16LE(2), "type: icon").toBe(1);
    const count = ico.readUInt16LE(4);
    const entries = Array.from({ length: count }, (_, i) => {
      const at = 6 + i * 16;
      return {
        width: ico[at] || 256,
        height: ico[at + 1] || 256,
        bits: ico.readUInt16LE(at + 6),
        size: ico.readUInt32LE(at + 8),
        offset: ico.readUInt32LE(at + 12),
      };
    });
    expect(entries.map((e) => e.width).sort((a, b) => a - b)).toEqual([16, 32, 48]);
    for (const e of entries) {
      expect(e.height, `${e.width}px is square`).toBe(e.width);
      expect(e.bits, `${e.width}px is 32-bit`).toBe(32);
      expect(e.offset + e.size, `${e.width}px lies inside the file`).toBeLessThanOrEqual(ico.length);
    }
  });
});

/** How far the prism's middle may be from the plaque's: 3 % of the side and a pixel (the optical centre sits a little low). */
const slack = (side) => Math.ceil(side * 0.03) + 1;

describe("favicon.ico pixels", () => {
  const ico = read("apps/site/assets/favicon.ico");
  const entries = Array.from({ length: ico.readUInt16LE(4) }, (_, i) => ({
    width: ico[6 + i * 16] || 256,
    offset: ico.readUInt32LE(6 + i * 16 + 12),
  }));

  /** The box of the white, opaque pixels of a 32-bit BMP image of an ICO (rows bottom-up, BGRA). */
  function whiteBox({ width, offset }) {
    expect(ico.readUInt32LE(offset), `${width}px: a BMP header of 40 bytes`).toBe(40);
    expect(ico.readUInt16LE(offset + 14), `${width}px: 32 bits`).toBe(32);
    let [x0, y0, x1, y1] = [width, width, -1, -1];
    for (let row = 0; row < width; row++) {
      for (let x = 0; x < width; x++) {
        const at = offset + 40 + ((width - 1 - row) * width + x) * 4;
        if (ico[at] > 240 && ico[at + 1] > 240 && ico[at + 2] > 240 && ico[at + 3] > 240) [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, row), Math.max(x1, x), Math.max(y1, row)];
      }
    }
    return { w: x1 - x0 + 1, h: y1 - y0 + 1, x0, y0, x1, y1 };
  }

  it("draws the white prism in the 32 and 48 px images, as wide as it is high times its aspect, centred", () => {
    for (const e of entries.filter((x) => x.width >= 32)) {
      const box = whiteBox(e);
      expect(box.w, `${e.width}px: there is a white mark`).toBeGreaterThan(0);
      expect(Math.abs(box.w / box.h - ASPECT), `${e.width}px: aspect`).toBeLessThanOrEqual(0.15);
      expect(box.w / e.width, `${e.width}px: share of the width`).toBeGreaterThan(0.5);
      expect(box.w / e.width).toBeLessThan(0.75);
      expect(Math.abs(box.x0 - (e.width - 1 - box.x1)), `${e.width}px: centred across`).toBeLessThanOrEqual(1);
      expect(Math.abs(box.y0 - (e.width - 1 - box.y1)), `${e.width}px: centred down`).toBeLessThanOrEqual(slack(e.width));
    }
  });

  it("draws one in the 16 px image too", () => {
    expect(whiteBox(entries.find((e) => e.width === 16)).w).toBeGreaterThan(0);
  });
});

describe("apple-touch-icon.png", () => {
  const png = read("apps/site/assets/apple-touch-icon.png");

  /** The pixels of an 8-bit RGB or RGBA, non-interlaced PNG. */
  function decode(buffer) {
    expect(buffer.subarray(0, 8).toString("hex"), "PNG signature").toBe("89504e470d0a1a0a");
    expect(buffer.subarray(12, 16).toString(), "IHDR first").toBe("IHDR");
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    const [depth, colour, , , interlace] = buffer.subarray(24, 29);
    expect([depth, interlace], "8-bit, not interlaced").toEqual([8, 0]);
    const bpp = { 2: 3, 6: 4 }[colour];
    expect(bpp, "RGB or RGBA").toBeTruthy();
    const chunks = [];
    for (let at = 8; at < buffer.length; ) {
      const length = buffer.readUInt32BE(at);
      if (buffer.subarray(at + 4, at + 8).toString() === "IDAT") chunks.push(buffer.subarray(at + 8, at + 8 + length));
      at += 12 + length;
    }
    const raw = inflateSync(Buffer.concat(chunks));
    const stride = width * bpp;
    const out = Buffer.alloc(stride * height);
    for (let row = 0; row < height; row++) {
      const filter = raw[row * (stride + 1)];
      for (let i = 0; i < stride; i++) {
        const x = raw[row * (stride + 1) + 1 + i];
        const a = i >= bpp ? out[row * stride + i - bpp] : 0;
        const b = row ? out[(row - 1) * stride + i] : 0;
        const c = row && i >= bpp ? out[(row - 1) * stride + i - bpp] : 0;
        const paeth = () => {
          const p = a + b - c;
          const [pa, pb, pc] = [Math.abs(p - a), Math.abs(p - b), Math.abs(p - c)];
          return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        };
        out[row * stride + i] = (x + [0, a, b, (a + b) >> 1, paeth()][filter]) & 255;
      }
    }
    return { width, height, bpp, at: (px, py) => [...out.subarray(py * stride + px * bpp, py * stride + px * bpp + 3)], alpha: (px, py) => (bpp === 4 ? out[py * stride + px * bpp + 3] : 255) };
  }

  it("is 180 x 180 (the IHDR)", () => {
    expect(png.readUInt32BE(16), "width").toBe(180);
    expect(png.readUInt32BE(20), "height").toBe(180);
  });

  it("is full-bleed brand blue (all four corners, opaque, no rounded corners: iOS rounds it, and shows a transparent corner black) with the prism in white, centred", () => {
    const img = decode(png);
    const blue = brandBlue().slice(1);
    const want = [0, 2, 4].map((i) => parseInt(blue.slice(i, i + 2), 16));
    for (const [x, y] of [[0, 0], [179, 0], [0, 179], [179, 179]]) {
      expect(img.at(x, y), `corner ${x},${y}`).toEqual(want);
      expect(img.alpha(x, y), `corner ${x},${y} is opaque`).toBe(255);
    }
    let [x0, y0, x1, y1] = [180, 180, -1, -1];
    for (let y = 0; y < 180; y++) {
      for (let x = 0; x < 180; x++) {
        if (img.at(x, y).every((v) => v > 240)) [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
      }
    }
    expect(x1, "there is a white mark").toBeGreaterThan(0);
    expect(Math.abs(x0 - (179 - x1)), "equal space left and right").toBeLessThanOrEqual(2);
    expect(Math.abs(y0 - (179 - y1)), "space above and below").toBeLessThanOrEqual(slack(180));
    expect((x1 - x0 + 1) / 180, "share of the width").toBeGreaterThan(0.5);
    expect((x1 - x0 + 1) / 180).toBeLessThan(0.75);
    expect((x1 - x0 + 1) / (y1 - y0 + 1), "the prism's aspect ratio").toBeCloseTo(ASPECT, 1);
  });
});

describe("the inline marks", () => {
  const site = scanSite(join(repo, "apps/docs"), repo);
  const landing = landingDocuments(site, "apps/landing/index.html", text("apps/landing/index.html"));
  const { rendered } = buildSite(site, { extra: landing });
  const homes = landing.map((d) => d.route);

  /** What every inline copy of the mark says about itself: the prism, square, 22 px, decorative, in the link's colour. */
  function expectMark(svg, where, { focusable = true } = {}) {
    expect(svg, `${where}: an svg`).toBeTruthy();
    expect((svg.attrs.get("viewBox") ?? svg.attrs.get("viewbox")), `${where}: the square viewBox`).toBe(VIEW_BOX);
    expect(svg.attrs.get("aria-hidden"), `${where}: decorative`).toBe("true");
    if (focusable) expect(svg.attrs.get("focusable"), where).toBe("false");
    expect([svg.attrs.get("width"), svg.attrs.get("height")], `${where}: 22 x 22, a square`).toEqual(["22", "22"]);
    const paths = svg.children.filter((n) => n.name === "path");
    expect(paths.map((path) => path.attrs.get("d")), `${where}: the stripes, then the two solid faces`).toEqual([...STRIPES.map(([d]) => d), FACES]);
    expect(paths.map((path) => path.attrs.get("fill-opacity") ?? null), `${where}: the tints`).toEqual([...STRIPES.map(([, o]) => o), null]);
    for (const path of paths) expect(path.attrs.get("fill"), `${where}: it paints with the link's colour`).toBe("currentColor");
    expect(paths[3].attrs.get("fill-rule"), `${where}: the faces are an even-odd path`).toBe("evenodd");
  }

  it("the header's mark, on every page (the home in three languages, a docs page, the 404), is the prism", () => {
    const routes = [...homes, "/docs/", "/docs/components/button/", site.notFound.route];
    for (const route of routes) {
      const tree = parse(rendered.get(route), route);
      const brand = query(tree, "a.site-header__brand");
      const mark = findAll(brand, (n) => n.name === "svg");
      expect(mark, `${route}: one mark in the logo link`).toHaveLength(1);
      expectMark(mark[0], route);
      expect(hasClass(mark[0].parent, "site-header__mark"), `${route}: inside .site-header__mark`).toBe(true);
      expect(textOf(query(brand, "span.u-sr-only")), `${route}: the link keeps its LUZ name`).toBe("LUZ");
    }
  });

  it("the footer brand of the home, in three languages, is the prism too, with its sr-only LUZ", () => {
    expect(homes.length).toBeGreaterThanOrEqual(3);
    for (const route of homes) {
      const tree = parse(rendered.get(route), route);
      const brand = query(tree, "p.landing-brand");
      expect(brand, `${route}: the footer brand`).toBeTruthy();
      const marks = findAll(brand, (n) => n.name === "svg");
      expect(marks, `${route}: one mark`).toHaveLength(1);
      // An svg in a page is not in the tab order in any browser LUZ supports: the footer's omits focusable="false" (the home weighs against its ceiling); spec landing-footer checks the Tab order
      expectMark(marks[0], `${route} footer`, { focusable: false });
      expect(textOf(query(brand, "strong.u-sr-only")), `${route}: the name is still said`).toBe("LUZ");
    }
  });

  it("the source of the home page and the header partial hold the prism, not a copy of an old mark", () => {
    for (const file of ["apps/landing/index.html", "apps/site/_partials/header.html"]) {
      expect(text(file), file).toContain(`d="${FACES}"`);
      for (const [d] of STRIPES) expect(text(file), file).toContain(`d="${d}"`);
      for (const old of [OLD_D, WORDMARK_D]) expect(text(file), file).not.toContain(old);
      expect(text(file), file).not.toMatch(/width="35" height="22"/);
    }
  });
});
