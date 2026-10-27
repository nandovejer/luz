/**
 * The logo of LUZ is one mark (the owner's cropped SVG, 1.57:1) in every place the site draws it:
 * the favicons (apps/site/assets), the header's inline mark (apps/site/_partials/header.html) and the
 * home page's footer brand (apps/landing/index.html). What a browser lays out (35 x 22 px, no
 * sideways scroll, forced colours, right-to-left) is in tests/site-header.spec.js and
 * tests/landing-footer.spec.js.
 *
 * - One path: the same data in favicon.svg, logo-mark.svg, the header (every language) and the footer
 *   brand; the first mark (`M8 8h4v28h4v4H8Z`) is nowhere in apps/ or packages/.
 * - favicon.ico: a valid ICO of 32-bit images at exactly 16, 32 and 48 px.
 * - apple-touch-icon.png: 180 x 180, full-bleed brand blue, the mark in white and centred.
 * - favicon.svg: a 48 x 48 box with the brand-blue rounded rect and the mark in white, centred, at
 *   about 76 % of the width.
 * - The inline marks keep the aspect ratio of the cropped viewBox, are decorative (the link is named
 *   by its sr-only "LUZ"), and paint with currentColor.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { buildSite, landingDocuments, scanSite } from "../scripts/docs-site/site.js";
import { findAll, hasClass, parse, query } from "./helpers/html-dom.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(repo, file));
const text = (file) => read(file).toString("utf-8");

/** The mark: its drawing and the box it is cropped to (a design asset, not a computed value). */
const MARK_D =
  "M55.5 67.6H89.3V204.4L55.5 238.2ZM93 210.1H193.7L160.4 243.4H59.8ZM124.2 67.6H157.4V131.8L124.2 165.1ZM157.3 140.8V153.3A18.1 18.1 0 0 0 193.7 153.3V119.2C204.7 114.2 215.4 110.5 225.9 108.5V153.3A50.4 50.4 0 0 1 128 170.1ZM228.6 67.6H307.4L283 100.4H241.2C225.8 100.4 210 105 193.8 112.5V106.1ZM211.4 208L314.9 69L332.2 101.9L228.7 241ZM261.2 210.1H329.4V243.4H236.5Z";
const OLD_D = "M8 8h4v28h4v4H8Z";
const VIEW_BOX = "55.5 67.6 276.8 175.9";

/** The numbers of the commands of a path in absolute coordinates, and the end points (x, y) of M H V L C A. */
function endPoints(d) {
  const points = [];
  let x = 0;
  let y = 0;
  for (const [, cmd, args] of d.matchAll(/([MHVLCAZ])([^MHVLCAZ]*)/g)) {
    const n = args.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
    if (cmd === "M" || cmd === "L") [x, y] = n;
    else if (cmd === "H") x = n[0];
    else if (cmd === "V") y = n[0];
    else if (cmd === "C") [x, y] = n.slice(4);
    else if (cmd === "A") [x, y] = n.slice(5);
    else continue;
    points.push([x, y]);
  }
  return points;
}

/** The box the mark's end points span (the curves of this mark stay inside it). */
function boundsOf(points) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
const pathOf = (svg) => svg.match(/<path\b[^>]*>/)?.[0] ?? "";

/** Where `matrix(a 0 0 d e f)` puts the mark's box in the favicon's 48 units. */
function placed(svg) {
  const m = attr(pathOf(svg), "transform")?.match(/^matrix\(\s*([^)]*)\)$/)?.[1].split(/[\s,]+/).map(Number);
  expect(m, "the mark has a matrix(a 0 0 d e f) transform").toHaveLength(6);
  const [a, b, c, d, e, f] = m;
  expect([b, c], "the transform only scales and moves").toEqual([0, 0]);
  const box = boundsOf(endPoints(attr(pathOf(svg), "d")));
  return { x0: box.x0 * a + e, x1: box.x1 * a + e, y0: box.y0 * d + f, y1: box.y1 * d + f };
}

describe("one mark everywhere", () => {
  it("the mark's own box is the cropped viewBox: the path's end points span it, within 0.2 unit", () => {
    const box = boundsOf(endPoints(MARK_D));
    const [x, y, w, h] = VIEW_BOX.split(" ").map(Number);
    for (const [name, got, want] of [["x0", box.x0, x], ["y0", box.y0, y], ["x1", box.x1, x + w], ["y1", box.y1, y + h]]) {
      expect(Math.abs(got - want), name).toBeLessThanOrEqual(0.2);
    }
  });

  it("logo-mark.svg is the mark, cropped to its box, in the brand blue, titled LUZ", () => {
    const svg = text("apps/site/assets/logo-mark.svg");
    expect(attr(svg.match(/<svg\b[^>]*>/)[0], "viewBox")).toBe(VIEW_BOX);
    expect(attr(pathOf(svg), "d")).toBe(MARK_D);
    expect(svg).toContain("<title>LUZ</title>");
    expect(attr(pathOf(svg), "fill")).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("favicon.svg draws the same path", () => {
    expect(attr(pathOf(text("apps/site/assets/favicon.svg")), "d")).toBe(MARK_D);
  });

  it("the old mark is nowhere in apps/ or packages/ (the home's sky favicon is not a copy of it)", () => {
    const found = [];
    const walk = (dir) => {
      for (const name of readdirSync(join(repo, dir))) {
        if (name === "node_modules" || name === "dist" || name.startsWith(".")) continue;
        const file = `${dir}/${name}`;
        if (statSync(join(repo, file)).isDirectory()) walk(file);
        else if (/\.(html|svg|css|js|json|md|txt|xml|webmanifest)$/.test(name) && text(file).includes(OLD_D)) found.push(file);
      }
    };
    for (const dir of ["apps", "packages"]) walk(dir);
    expect(found).toEqual([]);
  });
});

describe("favicon.svg", () => {
  const svg = text("apps/site/assets/favicon.svg");
  const mark = text("apps/site/assets/logo-mark.svg");

  it("is a 48 x 48 box with a rounded rect in the brand blue (the mark's colour) and the mark in white", () => {
    expect(attr(svg.match(/<svg\b[^>]*>/)[0], "viewBox")).toBe("0 0 48 48");
    const rect = svg.match(/<rect\b[^>]*>/)?.[0] ?? "";
    expect(attr(rect, "width")).toBe("48");
    expect(attr(rect, "height")).toBe("48");
    expect(Number(attr(rect, "rx")), "rounded").toBeGreaterThan(0);
    expect(attr(rect, "fill").toLowerCase()).toBe(attr(pathOf(mark), "fill").toLowerCase());
    expect(["#fff", "#ffffff"]).toContain(attr(pathOf(svg), "fill").toLowerCase());
  });

  it("centres the mark in the box, within 1 unit on each side, at about 76 % of the width", () => {
    const box = placed(svg);
    expect(Math.abs(box.x0 - (48 - box.x1)), "equal space left and right").toBeLessThanOrEqual(1);
    expect(Math.abs(box.y0 - (48 - box.y1)), "equal space above and below").toBeLessThanOrEqual(1);
    expect((box.x1 - box.x0) / 48, "share of the width").toBeCloseTo(0.76, 1);
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

  it("draws the white mark in the 32 and 48 px images, as wide as the mark is (1.57:1), centred", () => {
    const [, , w, h] = VIEW_BOX.split(" ").map(Number);
    for (const e of entries.filter((x) => x.width >= 32)) {
      const box = whiteBox(e);
      expect(box.w, `${e.width}px: there is a white mark`).toBeGreaterThan(0);
      expect(Math.abs(box.w / box.h - w / h), `${e.width}px: aspect`).toBeLessThanOrEqual(0.15);
      expect(box.w / e.width, `${e.width}px: share of the width`).toBeGreaterThan(0.6);
      expect(box.w / e.width).toBeLessThan(0.9);
      expect(Math.abs(box.x0 - (e.width - 1 - box.x1)), `${e.width}px: centred`).toBeLessThanOrEqual(1);
      expect(Math.abs(box.y0 - (e.width - 1 - box.y1)), `${e.width}px: centred`).toBeLessThanOrEqual(1);
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
    return { width, height, bpp, at: (px, py) => [...out.subarray(py * stride + px * bpp, py * stride + px * bpp + 3)] };
  }

  it("is 180 x 180 (the IHDR)", () => {
    expect(png.readUInt32BE(16), "width").toBe(180);
    expect(png.readUInt32BE(20), "height").toBe(180);
  });

  it("is full-bleed brand blue (all four corners, no rounded corners) with the mark in white, centred", () => {
    const img = decode(png);
    const blue = text("apps/site/assets/logo-mark.svg").match(/fill="#([0-9a-f]{6})"/i)[1];
    const want = [0, 2, 4].map((i) => parseInt(blue.slice(i, i + 2), 16));
    for (const [x, y] of [[0, 0], [179, 0], [0, 179], [179, 179]]) expect(img.at(x, y), `corner ${x},${y}`).toEqual(want);
    let [x0, y0, x1, y1] = [180, 180, -1, -1];
    for (let y = 0; y < 180; y++) {
      for (let x = 0; x < 180; x++) {
        if (img.at(x, y).every((v) => v > 240)) [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
      }
    }
    expect(x1, "there is a white mark").toBeGreaterThan(0);
    expect(Math.abs(x0 - (179 - x1)), "equal space left and right").toBeLessThanOrEqual(2);
    expect(Math.abs(y0 - (179 - y1)), "equal space above and below").toBeLessThanOrEqual(2);
    expect((x1 - x0 + 1) / 180, "share of the width").toBeGreaterThan(0.5);
    expect((x1 - x0 + 1) / 180).toBeLessThan(0.9);
    const [, , w, h] = VIEW_BOX.split(" ").map(Number);
    expect((x1 - x0 + 1) / (y1 - y0 + 1), "the mark's aspect ratio").toBeCloseTo(w / h, 1);
  });
});

describe("the inline marks", () => {
  const site = scanSite(join(repo, "apps/docs"), repo);
  const landing = landingDocuments(site, "apps/landing/index.html", text("apps/landing/index.html"));
  const { rendered } = buildSite(site, { extra: landing });
  const homes = landing.map((d) => d.route);
  const [, , w, h] = VIEW_BOX.split(" ").map(Number);

  /** What every inline copy of the mark says about itself. */
  function expectMark(svg, where) {
    expect(svg, `${where}: an svg`).toBeTruthy();
    expect((svg.attrs.get("viewBox") ?? svg.attrs.get("viewbox")), `${where}: the cropped viewBox`).toBe(VIEW_BOX);
    expect(svg.attrs.get("aria-hidden"), `${where}: decorative`).toBe("true");
    expect(svg.attrs.get("focusable"), where).toBe("false");
    const [width, height] = [Number(svg.attrs.get("width")), Number(svg.attrs.get("height"))];
    expect(Math.abs(width / height - w / h), `${where}: ${width} x ${height} keeps the aspect ratio`).toBeLessThanOrEqual(0.03);
    expect(height, `${where}: 22 high`).toBe(22);
    expect(width, `${where}: 35 wide`).toBe(35);
    const path = svg.children.find((n) => n.name === "path");
    expect(path.attrs.get("d"), `${where}: the mark's path`).toBe(MARK_D);
    expect(path.attrs.get("fill"), `${where}: it paints with the link's colour`).toBe("currentColor");
  }

  it("the header's mark, on every page (the home in three languages, a docs page, the 404), is the new one", () => {
    const routes = [...homes, "/docs/", "/docs/components/button/", site.notFound.route];
    for (const route of routes) {
      const tree = parse(rendered.get(route), route);
      const brand = query(tree, "a.site-header__brand");
      const mark = findAll(brand, (n) => n.name === "svg");
      expect(mark, `${route}: one mark in the logo link`).toHaveLength(1);
      expectMark(mark[0], route);
      expect(hasClass(mark[0].parent, "site-header__mark"), `${route}: inside .site-header__mark`).toBe(true);
      expect(brand.html.slice(brand.open.end, brand.close.index), `${route}: the link keeps its LUZ name`).toContain('<span class="u-sr-only">LUZ</span>');
    }
  });

  it("the footer brand of the home, in three languages, is the new mark too, with its sr-only LUZ", () => {
    expect(homes.length).toBeGreaterThanOrEqual(3);
    for (const route of homes) {
      const tree = parse(rendered.get(route), route);
      const brand = query(tree, "p.landing-brand");
      expect(brand, `${route}: the footer brand`).toBeTruthy();
      const marks = findAll(brand, (n) => n.name === "svg");
      expect(marks, `${route}: one mark`).toHaveLength(1);
      expectMark(marks[0], `${route} footer`);
      expect(query(brand, "strong.u-sr-only"), `${route}: the name is still said`).toBeTruthy();
    }
  });

  it("the source of the home page and the header partial hold the new mark, not a copy of the old one", () => {
    for (const file of ["apps/landing/index.html", "apps/site/_partials/header.html"]) {
      expect(text(file), file).toContain(`d="${MARK_D}"`);
      expect(text(file), file).not.toContain(OLD_D);
      expect(text(file), file).not.toContain('viewBox="8 8 32 32" width="22" height="22"');
    }
  });
});
