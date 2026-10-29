/**
 * The scripts for the <head> that set the colour mode and the moment before the
 * first paint (F2 of .claude/plans/luz-home-docs-identity.md, section 3.4;
 * EX-009 and EX-012; .claude/plans/theme-mode.md sections 2.8 and 3.8). They are
 * published now: core's packages/core/src/theme-boot.js and catalog's
 * packages/catalog/src/theme-time-boot.js, which apps/site/boot.js was split
 * into. The browser side (the first frame, the six moments on the real pages) is
 * in tests/site-boot.spec.js; here the scripts run in a sandbox with a fake
 * <html>, storage, media queries and clock, core's first and then catalog's,
 * with the moments of the site on the second one's tag (data-moments).
 *
 * The rules, in order:
 *   1. a stored choice under core's "luz-theme" key (light, dark or
 *      high-contrast) is that mode, with its moment pinned: light shows the
 *      moment marked with `*` among the light ones (the afternoon), dark and
 *      high contrast the one among the dark ones (the night);
 *   2. else prefers-contrast: more is the high contrast mode, with the moment of
 *      the local hour (what <luz-theme-time> writes after it upgrades);
 *   3. else the moment of the local hour is data-moment, and its base (dark or
 *      light) is the mode. The system's colour scheme is not read by the
 *      second script (core's alone follows it, and the hour overrides it).
 * Storage may throw. Both scripts are classic (no import) and write nothing.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(repo, rel), "utf-8");
const CORE_BOOT = "packages/core/src/theme-boot.js";
const TIME_BOOT = "packages/catalog/src/theme-time-boot.js";
const exists = (file) => expect(existsSync(join(repo, file)), `${file} exists`).toBe(true);
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/.*$/gm, "$1");

/** The moments the site declares, as they travel on the tag of the second script. */
const MOMENTS_ATTR = "dawn@05:00=dark morning@07:30=light afternoon@12:00=light* sunset@17:30=light dusk@20:30=dark night@22:30=dark*";
/** The same moments, written out: the oracle of the hour (the last one that has started; before the first, the last of the day). */
const LIST = [
  { name: "dawn", from: 5, theme: "dark" },
  { name: "morning", from: 7.5, theme: "light" },
  { name: "afternoon", from: 12, theme: "light" },
  { name: "sunset", from: 17.5, theme: "light" },
  { name: "dusk", from: 20.5, theme: "dark" },
  { name: "night", from: 22.5, theme: "dark" },
];
const momentAt = (hour) => LIST.filter((m) => m.from <= hour).at(-1) ?? LIST.at(-1);
const DARK = LIST.filter((m) => m.theme === "dark").map((m) => m.name);
const kebab = (name) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

const scripts = {};
/**
 * Run the scripts once and return what they wrote on <html> and what they asked of the browser.
 * `time: false` runs core's alone; `moments` is the data-moments of the second one's tag; `brand` is a data-theme the page already has.
 */
function run({ stored, pinned, hour = 14, minute = 0, contrastMore = false, schemeDark = false, storage = "works", time = true, moments = MOMENTS_ATTR, brand } = {}) {
  const files = time ? [CORE_BOOT, TIME_BOOT] : [CORE_BOOT];
  for (const file of files) {
    exists(file);
    scripts[file] ??= new vm.Script(read(file), { filename: file });
  }
  const attrs = new Map();
  if (brand) attrs.set("data-theme", brand);
  const dataset = new Proxy({}, { set: (_, k, v) => (attrs.set(`data-${kebab(String(k))}`, String(v)), true), get: (_, k) => attrs.get(`data-${kebab(String(k))}`) });
  const html = {
    dataset,
    setAttribute: (k, v) => void attrs.set(k, String(v)),
    getAttribute: (k) => (attrs.has(k) ? attrs.get(k) : null),
    hasAttribute: (k) => attrs.has(k),
    removeAttribute: (k) => void attrs.delete(k),
  };
  const reads = [];
  const writes = [];
  const fixed = new Date(2026, 5, 15, hour, minute, 0).getTime();
  const ctx = {
    document: { documentElement: html, currentScript: null },
    matchMedia: (query) => ({
      media: query,
      matches: (contrastMore && /prefers-contrast:\s*more/.test(query)) || (schemeDark && /prefers-color-scheme:\s*dark/.test(query)),
      addEventListener() {},
      addListener() {},
    }),
    Date: class extends Date {
      constructor(...args) {
        if (args.length) super(...args);
        else super(fixed);
      }
      static now() {
        return fixed;
      }
    },
  };
  if (storage === "works") {
    const value = (k) => (k === "luz-theme" && stored !== undefined ? stored : k === "luz-light" && pinned !== undefined ? pinned : null);
    const methods = {
      getItem: (k) => (reads.push(k), value(k)),
      setItem: (k) => void writes.push(k),
      removeItem: (k) => void writes.push(k),
    };
    // localStorage["luz-theme"] reads the key as well as localStorage.getItem("luz-theme")
    ctx.localStorage = new Proxy(methods, { get: (target, k) => (k in target ? target[k] : typeof k === "string" ? (reads.push(k), value(k)) : undefined) });
  } else if (storage === "getItem throws") {
    ctx.localStorage = {
      getItem() {
        throw new DOMException("denied", "SecurityError");
      },
    };
  } else {
    Object.defineProperty(ctx, "localStorage", {
      get() {
        throw new DOMException("denied", "SecurityError");
      },
    });
  }
  ctx.window = ctx;
  ctx.self = ctx;
  vm.createContext(ctx);
  for (const file of files) {
    // The second script reads its moments from its own tag
    ctx.document.currentScript = { getAttribute: (k) => (file === TIME_BOOT && k === "data-moments" ? moments : null) };
    scripts[file].runInContext(ctx);
  }
  return { theme: attrs.get("data-theme") ?? null, mode: attrs.get("data-mode") ?? null, moment: attrs.get("data-moment") ?? null, reads, writes };
}

describe("the two scripts are classic scripts that carry their exceptions", () => {
  it("have no import and no export, and name EX-009 and EX-012", () => {
    for (const [file, ex] of [[CORE_BOOT, "EX-009"], [TIME_BOOT, "EX-012"]]) {
      exists(file);
      const source = read(file);
      expect(code(source), file).not.toMatch(/\b(?:import|export)\b/);
      expect(source, file).toContain(ex);
    }
  });

  it("are the files EXCEPTIONS.md EX-009 and EX-012 name, and apps/site/boot.js is gone", () => {
    const rows = read("EXCEPTIONS.md").split("\n");
    expect(rows.find((line) => line.startsWith("| EX-009"))).toContain(CORE_BOOT);
    expect(rows.find((line) => line.startsWith("| EX-012"))).toContain(TIME_BOOT);
    expect(existsSync(join(repo, "apps/site/boot.js")), "apps/site/boot.js").toBe(false);
  });

  it("read core's key, luz-theme, never luz-site-mode; the second one also reads luz-light", () => {
    for (const file of [CORE_BOOT, TIME_BOOT]) {
      exists(file);
      expect(code(read(file)), file).toContain("luz-theme");
      expect(code(read(file)), file).not.toContain("luz-site-mode");
    }
    expect(code(read(TIME_BOOT))).toContain("luz-light");
  });
});

describe("core's script alone: the mode of the visitor", () => {
  it("a stored mode is the mode, data-mode and data-theme; no moment is written", () => {
    for (const stored of ["light", "dark", "high-contrast"]) {
      expect(run({ stored, time: false, schemeDark: true, contrastMore: true })).toMatchObject({ theme: stored, mode: stored, moment: null });
    }
  });

  it("with nothing stored it follows the system: prefers-contrast: more, then the dark scheme, then light", () => {
    expect(run({ time: false, contrastMore: true, schemeDark: true })).toMatchObject({ theme: "high-contrast", mode: "high-contrast" });
    expect(run({ time: false, schemeDark: true })).toMatchObject({ theme: "dark", mode: "dark" });
    expect(run({ time: false })).toMatchObject({ theme: "light", mode: "light" });
  });

  it("a page that names a brand keeps its data-theme and gets data-mode", () => {
    expect(run({ time: false, schemeDark: true, brand: "my-brand" })).toMatchObject({ theme: "my-brand", mode: "dark" });
    expect(run({ time: false, stored: "high-contrast", brand: "my-brand" })).toMatchObject({ theme: "my-brand", mode: "high-contrast" });
  });

  it("a stored value that is no mode is ignored, and storage that throws does not stop it", () => {
    expect(run({ time: false, stored: "auto", schemeDark: true })).toMatchObject({ theme: "dark", mode: "dark" });
    for (const storage of ["getItem throws", "localStorage throws"]) expect(run({ time: false, storage, schemeDark: true })).toMatchObject({ theme: "dark", mode: "dark" });
  });

  it("reads only luz-theme, and writes nothing", () => {
    const { reads, writes } = run({ time: false, stored: "dark" });
    expect([...new Set(reads)]).toEqual(["luz-theme"]);
    expect(writes).toEqual([]);
  });
});

describe("a stored choice wins, with its moment pinned", () => {
  it.each([
    ["light", "light", "afternoon"],
    ["dark", "dark", "night"],
    ["high-contrast", "high-contrast", "night"],
  ])("%s is %s, moment %s, at any hour", (stored, theme, moment) => {
    for (const hour of [3, 6, 9, 14, 19, 21, 23]) {
      expect(run({ stored, hour }), `${stored} at ${hour}h`).toMatchObject({ theme, mode: theme, moment });
    }
  });

  it("wins over prefers-contrast: more and over the system's dark scheme", () => {
    expect(run({ stored: "light", hour: 23, contrastMore: true, schemeDark: true })).toMatchObject({ theme: "light", moment: "afternoon" });
    expect(run({ stored: "dark", hour: 10, schemeDark: false })).toMatchObject({ theme: "dark", moment: "night" });
  });

  it("reads core's key and the hour the bar pinned, nothing else, and writes nothing", () => {
    const { reads, writes } = run({ stored: "dark" });
    expect(reads.length).toBeGreaterThan(0);
    expect([...new Set(reads)].every((k) => ["luz-theme", "luz-light"].includes(k))).toBe(true);
    expect(writes).toEqual([]);
  });

  it("a chosen mode wins over an hour the bar pinned (the site never keeps both, but the mode is the footer's)", () => {
    expect(run({ stored: "dark", pinned: "570", hour: 14 })).toMatchObject({ theme: "dark", moment: "night" });
  });

  it("a page that names a brand keeps its data-theme, and the moment follows the mode", () => {
    expect(run({ stored: "dark", brand: "my-brand" })).toMatchObject({ theme: "my-brand", mode: "dark", moment: "night" });
    expect(run({ hour: 9, brand: "my-brand" })).toMatchObject({ theme: "my-brand", mode: "light", moment: "morning" });
  });
});

describe("a stored value that is not a mode is not a choice", () => {
  it.each(["auto", "Dark", "purple", "", " dark", "dark ", "midnight", "1", "null", "undefined", "[object Object]", "__proto__", "light,dark"])("%j falls through to the clock", (stored) => {
    expect(run({ stored, hour: 9 })).toMatchObject({ theme: "light", moment: "morning" });
    expect(run({ stored, hour: 21, minute: 30 })).toMatchObject({ theme: "dark", moment: "dusk" });
  });

  it("falls through to prefers-contrast: more as well", () => {
    expect(run({ stored: "auto", hour: 9, contrastMore: true })).toMatchObject({ theme: "high-contrast", moment: "morning" });
  });

  it("the old key is not read: a value under luz-site-mode changes nothing", () => {
    expect(run({ hour: 9 }).reads).not.toContain("luz-site-mode");
  });
});

describe("an hour pinned by the bar (luz-light, minutes of the day) is the moment of that hour", () => {
  it.each([
    ["1170", "sunset", "light"],
    ["570", "morning", "light"],
    ["360", "dawn", "dark"],
    ["1290", "dusk", "dark"],
    ["0", "night", "dark"],
    ["1439", "night", "dark"],
  ])("%s is %s, %s, whatever the clock says", (pinned, moment, theme) => {
    for (const hour of [3, 9, 14, 21]) expect(run({ pinned, hour }), `pinned ${pinned} at ${hour}h`).toMatchObject({ theme, moment });
  });

  it("prefers-contrast: more is still the high contrast mode, with the pinned moment", () => {
    expect(run({ pinned: "1170", hour: 9, contrastMore: true })).toMatchObject({ theme: "high-contrast", moment: "sunset" });
  });

  it.each(["", "abc", "-1", "1440", "12.5", "1170px", " 1170"])("%j is not an hour: the clock decides", (pinned) => {
    expect(run({ pinned, hour: 9 })).toMatchObject({ theme: "light", moment: "morning" });
  });
});

describe("with no choice", () => {
  it("prefers-contrast: more is the high contrast mode, with the moment of the local hour, at every minute of the day", () => {
    const wrong = [];
    for (let minute = 0; minute < 24 * 60; minute++) {
      const got = run({ hour: Math.floor(minute / 60), minute: minute % 60, contrastMore: true });
      const moment = momentAt(minute / 60).name;
      if (got.theme !== "high-contrast" || got.mode !== "high-contrast" || got.moment !== moment) wrong.push(`${Math.floor(minute / 60)}:${minute % 60} ${got.theme}/${got.moment}, wanted high-contrast/${moment}`);
    }
    expect(wrong.slice(0, 10)).toEqual([]);
  });

  it("a stored high-contrast still pins the night, whatever the hour", () => {
    expect(run({ stored: "high-contrast", hour: 9, contrastMore: true })).toMatchObject({ theme: "high-contrast", moment: "night" });
  });

  it("the moment is the one of the local hour at every minute of the day, and dawn, dusk and night are dark", () => {
    const wrong = [];
    for (let minute = 0; minute < 24 * 60; minute++) {
      const hour = Math.floor(minute / 60);
      const got = run({ hour, minute: minute % 60 });
      const moment = momentAt(minute / 60).name;
      const theme = DARK.includes(moment) ? "dark" : "light";
      if (got.moment !== moment || got.theme !== theme || got.mode !== theme) wrong.push(`${String(hour).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")} ${got.theme}/${got.moment}, wanted ${theme}/${moment}`);
    }
    expect(wrong.slice(0, 10)).toEqual([]);
  });

  it("turns at the minute: 04:59 night, 05:00 dawn, 07:30 morning, 20:30 dusk, 22:30 night", () => {
    const at = (hour, minute) => run({ hour, minute }).moment;
    expect([at(4, 59), at(5, 0), at(7, 29), at(7, 30), at(20, 29), at(20, 30), at(22, 29), at(22, 30)]).toEqual(["night", "dawn", "dawn", "morning", "sunset", "dusk", "dusk", "night"]);
  });

  it("does not read the system's colour scheme for the moment: the clock decides", () => {
    expect(run({ hour: 14, schemeDark: true })).toMatchObject({ theme: "light", moment: "afternoon" });
    expect(run({ hour: 23, schemeDark: false })).toMatchObject({ theme: "dark", moment: "night" });
  });

  it("writes nothing to storage", () => {
    expect(run({ hour: 9 }).writes).toEqual([]);
  });

  it("with no moments on its tag the second script does nothing, and core's mode stands", () => {
    expect(run({ moments: "", schemeDark: true, hour: 9 })).toMatchObject({ theme: "dark", mode: "dark", moment: null });
  });
});

describe("storage that throws (a sandboxed frame)", () => {
  it.each(["getItem throws", "localStorage throws"])("%s: the clock decides, and the scripts do not throw", (storage) => {
    expect(run({ storage, hour: 9 })).toMatchObject({ theme: "light", moment: "morning" });
    expect(run({ storage, hour: 23 })).toMatchObject({ theme: "dark", moment: "night" });
    expect(run({ storage, hour: 9, contrastMore: true })).toMatchObject({ theme: "high-contrast", moment: "morning" });
  });
});

/* ---- Where they are loaded from ----------------------------------------------- */

describe("the pages load them from the packages, in <head>, as classic scripts, core's first", () => {
  const CORE_SRC = '<script src="/packages/core/dist/theme-boot.min.js"></script>';
  const TIME_SRC = '<script src="/packages/catalog/dist/theme-time-boot.min.js" data-moments=';
  it.each(["apps/docs/_layouts/page.html", "apps/landing/index.html"])("%s", (file) => {
    const html = read(file);
    expect(html).toContain(CORE_SRC);
    expect(html).toContain(TIME_SRC);
    expect(html.indexOf(CORE_SRC), "core's before the catalog's").toBeLessThan(html.indexOf(TIME_SRC));
    expect(html.indexOf(TIME_SRC), "in <head>").toBeLessThan(html.indexOf("</head>"));
    expect(html).not.toContain("apps/site/boot.js");
  });

  it("the not-found page keeps its promise of no script", () => {
    expect(read("apps/docs/_layouts/not-found.html")).not.toMatch(/<script/);
  });

  it("the Pages build emits them unhashed, as theme-boot.js and theme-time-boot.js", () => {
    const plugin = read("scripts/docs-site/plugin.js");
    expect(plugin).toMatch(/src:\s*"\/packages\/core\/dist\/theme-boot\.min\.js",\s*out:\s*"theme-boot\.js"/);
    expect(plugin).toMatch(/src:\s*"\/packages\/catalog\/dist\/theme-time-boot\.min\.js",\s*out:\s*"theme-time-boot\.js"/);
    expect(plugin).not.toContain("apps/site/boot.js");
  });

  it("the favicons are apps/site/assets", () => {
    for (const file of ["apps/docs/_layouts/page.html", "apps/docs/_layouts/not-found.html", "apps/landing/index.html"]) {
      expect(read(file), file).toContain('href="/apps/site/assets/favicon.ico"');
      expect(read(file), file).not.toContain("apps/landing/assets");
    }
  });
});

describe("the old key and the old paths are gone from the apps", () => {
  it("no file of apps/ or scripts/ names luz-site-mode, apps/site/boot.js, data-light or the old site-header files", () => {
    const hits = [];
    const walk = (dir) => {
      for (const entry of readdirSync(join(repo, dir))) {
        if (entry === "node_modules" || entry === "dist") continue;
        const rel = `${dir}/${entry}`;
        if (statSync(join(repo, rel)).isDirectory()) walk(rel);
        else if (/\.(html|js|css|json)$/.test(entry)) {
          read(rel)
            .split("\n")
            .forEach((line, i) => {
              if (/luz-site-mode|apps\/site\/boot\.js|data-light\b|apps\/docs\/site-header|\.\/site-header\.(?:js|css)/.test(line)) hits.push(`${rel}:${i + 1}: ${line.trim().slice(0, 80)}`);
            });
        }
      }
    };
    walk("apps");
    walk("scripts");
    expect(hits).toEqual([]);
  });
});

describe("the texts that say how the site follows the clock", () => {
  it("AGENTS.md says where the header and the shared partials are, and no longer names the old files", () => {
    const agents = read("AGENTS.md");
    const docsSite = read("dev/DOCS-SITE.md");
    expect(agents).toContain("apps/site/header.js");
    expect(agents).toContain("dev/DOCS-SITE.md");
    for (const text of [agents, docsSite]) {
      expect(text).not.toContain("apps/docs/site-header");
      expect(text).not.toMatch(/apps\/docs\/_partials\/(?:header|site-links|footer)\.html/);
    }
    // "the landing includes the shared partials from apps/site/_partials"
    expect(docsSite).toMatch(/apps\/site\/_partials/);
  });

  it("AGENTS.md describes the site's colour mode with the two elements and the two scripts for the head, not <luz-color-mode> or boot.js", () => {
    const agents = read("AGENTS.md");
    expect(agents).toContain("<luz-theme-time>");
    expect(agents).toContain("<luz-theme-mode>");
    expect(agents).toContain("theme-boot");
    expect(agents).toContain("data-moment");
    expect(agents).not.toContain("luz-color-mode");
    expect(agents).not.toContain("apps/site/boot.js");
  });

  it("dev/STRUCTURE.md lists apps/site and what is in it, without the boot.js that moved to the packages", () => {
    const structure = read("dev/STRUCTURE.md");
    for (const name of ["apps/site", "theme-light.css", "header.js", "header.css", "_partials"]) expect(structure, name).toContain(name);
    expect(structure).not.toMatch(/boot\.js\s+←/);
    expect(structure).toContain("theme-boot.js");
    expect(structure).toContain("theme-time-boot.js");
  });

  it("EX-009 names packages/core/src/theme-boot.js and says that it writes data-mode; EX-012 says the second writes data-moment", () => {
    const rows = read("EXCEPTIONS.md").split("\n");
    const ex9 = rows.find((line) => line.startsWith("| EX-009"));
    const ex12 = rows.find((line) => line.startsWith("| EX-012"));
    expect(ex9).toContain(CORE_BOOT);
    expect(ex9).toContain("data-mode");
    expect(ex9).not.toContain("apps/docs/site-header");
    expect(ex12).toContain(TIME_BOOT);
    expect(ex12).toContain("data-moment");
  });

  it("the accessibility statement says that the site follows the clock in Auto, dark from 20:30 to 07:30, and that its four lights meet the same contrast", () => {
    const page = read("apps/docs/pages/accessibility.html");
    expect(page).toMatch(/\bAuto\b/);
    expect(page).toContain("20:30");
    expect(page).toContain("07:30");
    // In the same item: the four lights and the contrast they meet
    const items = page.split(/<\/li>|<\/p>/);
    expect(items.some((item) => /four lights/i.test(item) && /contrast/i.test(item)), "an item that says the four lights meet the contrast").toBe(true);
    // The clock and the Auto radio about the site itself (not only about <luz-theme-time>)
    expect(items.some((item) => /20:30/.test(item) && /\bAuto\b/.test(item) && /\bsite\b/i.test(item)), "an item that says the site follows the clock in Auto").toBe(true);
  });
});
