/**
 * <luz-embed> of @luz-ds/catalog, the parts that need no browser (the
 * behaviour is in tests/embed.spec.js):
 *   - embed.js is a lazy chunk like the other six: it imports nothing
 *     (SEC-CHUNK-2), catalog.js loads it by a literal specifier when the page
 *     has a <luz-embed> (SEC-CHUNK-1), scripts/build-catalog.js and
 *     scripts/check-size.js know it;
 *   - its row in budgets.json and in the table of PRINCIPLES.md section 8,
 *     after the theme-time-boot row, a new row and no ceiling raised;
 *   - the package exports it, declares it a side effect and ships it;
 *   - it builds no address and names no provider (RL-12), writes no HTML
 *     (SEC-IDX-2), and leaves Escape alone (RL-3).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

const repo = fileURLToPath(new URL("../", import.meta.url));
const read = (rel) => readFileSync(join(repo, rel), "utf-8");
const SOURCE = "packages/catalog/src/embed.js";
/** The text of the chunk; a missing file is the assertion that fails, not an ENOENT. */
const chunk = () => {
  expect(existsSync(join(repo, SOURCE)), `${SOURCE} exists`).toBe(true);
  return read(SOURCE);
};
/** JS without its comments: a header may say "import" or name an example address in words. */
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/.*$/gm, "$1");

const budgets = JSON.parse(read("budgets.json")).budgets;
const principles = read("PRINCIPLES.md");
const ROW = "catalog JS lazy chunk: embed";

describe("embed.js is a lazy chunk that imports nothing and defines its element once", () => {
  it("has no static import or export-from, no import() and no import.meta (SEC-CHUNK-2)", () => {
    const source = code(chunk());
    expect(source).not.toMatch(/(?:^|[;}\s])(?:import\b(?!\s*[(.])|export\b[^"'();]*?\bfrom\b)/);
    expect(source).not.toMatch(/\bimport\s*\(/);
    expect(source).not.toMatch(/import\.meta/);
  });

  it("defines <luz-embed> behind a guard, so a second copy of the module does not throw (SEC-CHUNK-5)", () => {
    const source = code(chunk());
    expect(source).toMatch(/customElements\.define\(\s*["']luz-embed["']/);
    expect(source).toMatch(/customElements\.get\(\s*["']luz-embed["']\s*\)/);
  });

  it("exports playerURL(el)", () => {
    expect(code(chunk())).toMatch(/export\s+function\s+playerURL\s*\(/);
  });

  it("describes the element in its header, for custom-elements.json", () => {
    expect(chunk()).toMatch(/@element luz-embed\b/);
    for (const attr of ["src", "consent", "data-luz-consent-key"]) expect(chunk(), attr).toMatch(new RegExp(`@attr \\{[^}]+\\} ${attr}\\b`));
    expect(chunk()).toMatch(/@fires luz:consent\b/);
  });
});

describe("embed.js builds no address and names no provider (RL-12)", () => {
  it("has no URL in its code: no scheme with //, no protocol-relative string", () => {
    const source = code(chunk());
    expect(source).not.toMatch(/[a-z][a-z0-9+.-]*:\/\//i);
    expect(source).not.toMatch(/["'`]\/\/[\w.-]+/);
  });

  it("names no provider of video, maps or audio, in its code or in its header", () => {
    const providers = /youtube|youtu\.be|ytimg|vimeo|dailymotion|wistia|twitch|spotify|soundcloud|bandcamp|tiktok|facebook|instagram|twitter|google|gstatic|openstreetmap|mapbox|bing|apple\.com|loom\.com|ted\.com|bilibili|mixcloud/i;
    expect(chunk()).not.toMatch(providers);
  });

  it("makes no request of its own: no fetch, XMLHttpRequest, sendBeacon, WebSocket, EventSource, Image() or script element", () => {
    const source = code(chunk());
    expect(source).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|new\s+Image\b/);
    expect(source).not.toMatch(/createElement\(\s*["']script["']\s*\)/);
  });

  it("opens a connection with a preconnect hint and an iframe only, both of the address the author wrote", () => {
    const source = code(chunk());
    expect(source).toMatch(/preconnect/);
    expect(source).toMatch(/createElement\(\s*["']iframe["']\s*\)/);
    expect(source).toMatch(/referrerPolicy\s*=\s*["']strict-origin-when-cross-origin["']/);
  });
});

describe("embed.js writes no HTML, no text and no Escape", () => {
  it("has no HTML sink (SEC-IDX-2)", () => {
    expect(code(chunk())).not.toMatch(/\binnerHTML\b|\bouterHTML\b|insertAdjacentHTML|document\.write|\beval\(|new Function|setAttribute\(\s*["']on|srcdoc/);
  });

  it("does not intercept Escape (RL-3): the way back is the Not now button", () => {
    expect(code(chunk())).not.toMatch(/Escape|keyCode|["']keydown["']/);
  });

  it("writes no text of its own: every string reaches the page through the markup (no textContent assignment of a literal)", () => {
    expect(code(chunk())).not.toMatch(/\.(?:textContent|innerText)\s*=\s*["'`]/);
  });
});

describe("the budget of the chunk", () => {
  it("has a row after the theme-time-boot row, new, at 1.5 kB with a ceiling of 2 kB", () => {
    const names = budgets.map((b) => b.name);
    const boot = names.findIndex((n) => /^catalog theme-time-boot script/.test(n));
    expect(boot).toBeGreaterThan(-1);
    expect(names[boot + 1]).toBe(ROW);
    expect(budgets[boot + 1]).toEqual({ name: ROW, file: "packages/catalog/dist/embed.min.js", ideal: 1536, max: 2048 });
  });

  it("is in the table of PRINCIPLES.md section 8, after the theme-time boot script, with the same ceiling", () => {
    const rows = principles.split("\n").filter((line) => line.startsWith("| "));
    const boot = rows.findIndex((row) => /^\| `catalog` theme-time boot script/.test(row));
    expect(boot).toBeGreaterThan(-1);
    expect(rows[boot + 1]).toMatch(/^\| `catalog` JS lazy chunk: `embed` \(loaded by `catalog\.js` when the page has a `<luz-embed>`\) \| — \| ≤ 1\.5 kB \| 1\.5 kB \| 2 kB \|$/);
  });

  it("raises no ceiling: the catalog entry and the other chunks keep theirs", () => {
    expect(budgets.find((b) => b.name === "catalog JS")).toMatchObject({ ideal: 1024, max: 2048 });
    expect(budgets.find((b) => b.name === "catalog JS lazy chunk: timeline")).toBeDefined();
    expect(budgets.find((b) => b.name === "catalog JS lazy chunk: theme-time")).toMatchObject({ ideal: 2048, max: 2560 });
    expect(budgets.find((b) => b.name === "catalog JS lazy chunk: theme-time-bar")).toMatchObject({ ideal: 1280, max: 1536 });
  });

  it("is met by the built chunk (needs pnpm build)", () => {
    const file = "packages/catalog/dist/embed.min.js";
    expect(existsSync(join(repo, file)), `${file} exists`).toBe(true);
    expect(gzipSync(readFileSync(join(repo, file)), { level: 9 }).length).toBeLessThanOrEqual(2048);
  });
});

describe("the build, the size guard and the loader know the chunk", () => {
  it("scripts/build-catalog.js builds embed.js as a chunk", () => {
    const chunks = read("scripts/build-catalog.js").match(/chunks:\s*\[([^\]]*)\]/)?.[1] ?? "";
    expect(chunks).toContain('"embed.js"');
  });

  it("scripts/check-size.js expects ./embed.min.js among the imports of the loader", () => {
    const loader = read("scripts/check-size.js").match(/"packages\/catalog\/dist\/catalog\.min\.js":\s*\[([^\]]*)\]/)?.[1] ?? "";
    expect(loader).toContain('"./embed.min.js"');
  });

  it("catalog.js names it as a literal and loads it when the page has a <luz-embed>", () => {
    const loader = read("packages/catalog/src/catalog.js");
    expect(loader).toMatch(/"luz-embed":\s*\(\)\s*=>\s*import\(\s*"\.\/embed\.js"\s*\)/);
    expect(loader).toMatch(/document\.querySelector\(\s*"luz-embed"\s*\)\s*\)\s*load\(\s*"luz-embed"\s*\)/);
  });

  it("the built loader loads ./embed.min.js by a literal (needs pnpm build)", () => {
    const built = read("packages/catalog/dist/catalog.min.js");
    expect(built).toMatch(/\bimport\s*\(\s*["']\.\/embed\.min\.js["']\s*\)/);
  });
});

describe("the package exports, declares and ships it", () => {
  const pkg = () => JSON.parse(read("packages/catalog/package.json"));
  const pack = () => read("packages/catalog/pack-files.txt").split("\n");

  it("exports ./embed as dist/embed.js", () => {
    expect(pkg().exports["./embed"]).toBe("./dist/embed.js");
  });

  it("lists the script, plain and minified, in sideEffects, and the stylesheet is covered by the components glob", () => {
    expect(pkg().sideEffects).toEqual(expect.arrayContaining(["./dist/embed.js", "./dist/embed.min.js"]));
  });

  it("ships the script and the stylesheet, plain and minified", () => {
    for (const file of ["dist/embed.js", "dist/embed.min.js", "dist/components/embed.css", "dist/components/embed.min.css"]) expect(pack(), file).toContain(file);
  });

  it("has a stylesheet of its own, in the luz.catalog layer, with the tag inside :where()", () => {
    expect(existsSync(join(repo, "packages/catalog/src/components/embed.css"))).toBe(true);
    const css = read("packages/catalog/src/components/embed.css");
    expect(css).toMatch(/:where\(luz-embed\)/);
    expect(css).toMatch(/--luz-embed-ratio/);
  });
});
