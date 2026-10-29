/**
 * The boot script of the color mode (dist/theme-boot.min.js): a classic script
 * for the <head> that writes data-mode (and data-theme, unless the page names a
 * brand) from the stored choice or the system, before the first paint. Run here
 * against a stand-in <html>, with no browser: what it reads, what it writes, and
 * what it must not touch. The same script in a real page, before any module and
 * before the first paint, is tests/theme-mode-boot.spec.js.
 *
 * Needs `pnpm build` first (dist/ is generated).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const repo = fileURLToPath(new URL("../", import.meta.url));
const FILES = ["packages/core/dist/theme-boot.min.js", "packages/core/dist/theme-boot.js"];

/**
 * Run the script on a page with these facts.
 * @param {string} file
 * @param {{ stored?: string | null, dark?: boolean, more?: boolean, theme?: string, mode?: string, storageThrows?: boolean, noMatchMedia?: boolean }} facts
 */
function boot(file, { stored = null, dark = false, more = false, theme, mode, storageThrows = false, noMatchMedia = false } = {}) {
  const attributes = new Map();
  if (theme !== undefined) attributes.set("data-theme", theme);
  if (mode !== undefined) attributes.set("data-mode", mode);
  const writes = [];
  const root = {
    setAttribute: (k, v) => (writes.push(k), attributes.set(k, String(v))),
    getAttribute: (k) => (attributes.has(k) ? attributes.get(k) : null),
    hasAttribute: (k) => attributes.has(k),
    dataset: new Proxy({}, { set: (_, k, v) => (writes.push(`data-${String(k)}`), attributes.set(`data-${String(k)}`, String(v)), true), get: (_, k) => attributes.get(`data-${String(k)}`) }),
  };
  const storageWrites = [];
  const window = {
    localStorage: {
      getItem: (k) => {
        if (storageThrows) throw new Error("SecurityError");
        return k === "luz-theme" ? stored : null;
      },
      setItem: (...a) => storageWrites.push(["set", ...a]),
      removeItem: (...a) => storageWrites.push(["remove", ...a]),
    },
    matchMedia: noMatchMedia ? undefined : (q) => ({ matches: q.includes("prefers-contrast") ? more : q.includes("prefers-color-scheme: dark") ? dark : false }),
  };
  window.window = window;
  const context = vm.createContext({ ...window, window, document: { documentElement: root }, localStorage: window.localStorage });
  vm.runInContext(readFileSync(`${repo}${file}`, "utf-8"), context);
  return { mode: attributes.get("data-mode"), theme: attributes.get("data-theme"), storageWrites, writes };
}

describe.each(FILES)("%s", (file) => {
  it("is a classic script: no import, no export", () => {
    const code = readFileSync(`${repo}${file}`, "utf-8");
    expect(code).not.toMatch(/(?:^|[;}\s])import\b(?!\s*\.)/);
    expect(code).not.toMatch(/(?:^|[;}\s])export\b/);
  });

  it.each(["light", "dark", "high-contrast"])("applies the stored mode %s, whatever the system says", (stored) => {
    const out = boot(file, { stored, dark: stored !== "dark", more: stored !== "high-contrast" });
    expect(out.mode).toBe(stored);
    expect(out.theme).toBe(stored);
  });

  it("with nothing stored follows the system: contrast first, then the color scheme, else light", () => {
    expect(boot(file, { more: true, dark: true }).mode).toBe("high-contrast");
    expect(boot(file, { dark: true }).mode).toBe("dark");
    expect(boot(file, {}).mode).toBe("light");
  });

  it.each(["purple", "Dark", "auto", "", "1", "__proto__", "<script>"])("ignores a stored value that is not a mode (%j) and follows the system", (stored) => {
    expect(boot(file, { stored, dark: true }).mode).toBe("dark");
    expect(boot(file, { stored }).mode).toBe("light");
  });

  it("keeps a brand: data-mode is written, data-theme is not", () => {
    const out = boot(file, { theme: "my-brand", stored: "dark" });
    expect(out.mode).toBe("dark");
    expect(out.theme).toBe("my-brand");
  });

  it("writes data-theme over a base mode already there, and over none", () => {
    expect(boot(file, { theme: "light", stored: "dark" }).theme).toBe("dark");
    expect(boot(file, { theme: "high-contrast", dark: true }).theme).toBe("dark");
  });

  it("reads the storage and never writes it", () => {
    expect(boot(file, { stored: "dark" }).storageWrites).toEqual([]);
    expect(boot(file, { stored: "purple" }).storageWrites).toEqual([]);
  });

  it("writes only data-mode and data-theme", () => {
    expect(new Set(boot(file, { stored: "dark" }).writes)).toEqual(new Set(["data-mode", "data-theme"]));
    expect(new Set(boot(file, { theme: "my-brand" }).writes)).toEqual(new Set(["data-mode"]));
  });

  it("survives a storage that throws (a sandboxed frame) and a browser with no matchMedia", () => {
    expect(boot(file, { storageThrows: true, dark: true }).mode).toBe("dark");
    expect(boot(file, { noMatchMedia: true }).mode).toBe("light");
  });
});
