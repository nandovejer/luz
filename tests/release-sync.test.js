/**
 * The Version Packages PR keeps the install pages in step with the versions it writes.
 *
 * A page of the docs types the CDN URL of each package (`…/npm/@luz-ds/core@0.1.0/dist/luz.min.css`), and
 * the tests of the docs and of the home compare it with `packages/<name>/package.json`. `changeset version`
 * moves the package versions and nothing else, so `pnpm release:version` runs `scripts/release-sync.js`
 * after it: the URLs of the pages and of their translations take the new versions, and a translation that
 * was in step with its English page (`source`) stays in step. The READMEs of the packages, the root README,
 * SECURITY.md and the quick reference are in the same boat: the version in their snippets is the one of the
 * package it names (a package README ships in its tarball, so it says its own version).
 */
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { sourceHash } from "../scripts/docs-site/docs-i18n.js";
import { releaseDrift, syncVersions } from "../scripts/release-sync.js";

const repo = fileURLToPath(new URL("../", import.meta.url));
const CDN = "https://cdn.jsdelivr.net/npm/@luz-ds";

/** The `.html` files under `dir`, as absolute paths. */
const htmlFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return entry.name.endsWith(".html") ? [path] : [];
  });

let root;
const put = (path, text) => {
  mkdirSync(join(root, path, ".."), { recursive: true });
  writeFileSync(join(root, path), text);
};
const get = (path) => readFileSync(join(root, path), "utf-8");
const manifest = (name, version) => put(`packages/${name}/package.json`, JSON.stringify({ name: `@luz-ds/${name}`, version }));

const english = (tokens, landing) => `
<h2>Install</h2>
<pre><code>&lt;link href="${CDN}/tokens@${tokens}/dist/luz-tokens.min.css"&gt;
&lt;link href="${CDN}/landing@${landing}/dist/landing.min.css"&gt;</code></pre>
<p>Since @luz-ds/core@0.1.0 you can pin a version.</p>
`;
const page = (front, body) => `<!-- luz:page\n${front}\n-->\n${body}`;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "luz-sync-"));
  manifest("tokens", "0.2.0");
  manifest("core", "0.2.0");
  manifest("catalog", "0.2.0");
  manifest("landing", "0.1.4");
  put("apps/docs/pages/get-started/index.html", page("title: Install", english("0.1.0", "0.1.0")));
  put(
    "apps/docs/i18n/es/pages/get-started/index.html",
    page(`title: Instalar\nsource: ${sourceHash(english("0.1.0", "0.1.0"))}\nreviewed: false`, english("0.1.0", "0.1.0")),
  );
  put("packages/core/CHANGELOG.md", `## 0.2.0\n\n- abc1234: see ${CDN}/core@0.1.0/dist/luz.min.css\n`);
  put("packages/core/README.md", `# core\n\n\`\`\`html\n<link href="${CDN}/core@0.1.0/dist/luz.css">\n<script src="${CDN}/catalog@0.1.0/dist/catalog.min.js"></script>\n\`\`\`\n\nA range such as \`@luz-ds/core@3\` cannot carry an SRI hash.\n`);
  put("README.md", `<link href="${CDN}/landing@0.1.0/dist/landing.min.css">\n`);
  put("SECURITY.md", `- Good: \`@luz-ds/core@0.1.0\`\n"${CDN}/core@0.1.0/dist/i18n-es.min.js": "sha384-<hash>"\n`);
  put("dev/QUICK-REFERENCE.md", `<link href=".../@luz-ds/tokens@0.1.0/dist/luz-tokens.css">\n`);
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("syncVersions", () => {
  it("writes the version of each package in the CDN URLs of the English page, and of its translation", () => {
    const changed = syncVersions(root);

    expect(get("apps/docs/pages/get-started/index.html")).toContain(`${CDN}/tokens@0.2.0/dist/luz-tokens.min.css`);
    expect(get("apps/docs/pages/get-started/index.html")).toContain(`${CDN}/landing@0.1.4/dist/landing.min.css`);
    expect(get("apps/docs/i18n/es/pages/get-started/index.html")).toContain(`${CDN}/tokens@0.2.0/dist/luz-tokens.min.css`);
    expect(changed.filter((file) => file.startsWith("apps/"))).toEqual(["apps/docs/i18n/es/pages/get-started/index.html", "apps/docs/pages/get-started/index.html"]);
  });

  it("leaves prose that names a version alone: only the URL of a CDN file is a snippet", () => {
    syncVersions(root);

    expect(get("apps/docs/pages/get-started/index.html")).toContain("Since @luz-ds/core@0.1.0 you can pin a version.");
  });

  it("does not touch a CHANGELOG: it is the history", () => {
    syncVersions(root);

    expect(get("packages/core/CHANGELOG.md")).toContain(`${CDN}/core@0.1.0/dist/luz.min.css`);
  });

  it("moves the `source` of a translation that was in step to the hash of the English page now", () => {
    syncVersions(root);

    const body = get("apps/docs/pages/get-started/index.html").replace(/^<!-- luz:page\n[\s\S]*?\n-->\n/, "");
    expect(get("apps/docs/i18n/es/pages/get-started/index.html")).toContain(`source: ${sourceHash(body)}`);
    expect(sourceHash(body)).not.toBe(sourceHash(english("0.1.0", "0.1.0")));
  });

  it("leaves a translation that was already stale as it is: its `source` still says which text it was made from", () => {
    put(
      "apps/docs/i18n/es/pages/get-started/index.html",
      page("title: Instalar\nsource: 000000000000\nreviewed: false", english("0.1.0", "0.1.0")),
    );

    syncVersions(root);

    expect(get("apps/docs/i18n/es/pages/get-started/index.html")).toContain("source: 000000000000");
  });

  it("changes nothing the second time", () => {
    syncVersions(root);

    expect(syncVersions(root)).toEqual([]);
  });

  it("takes catalog to the version it has, not to the one of core", () => {
    put("apps/docs/pages/get-started/catalog.html", page("title: Catalog", `<code>${CDN}/catalog@0.1.0/dist/catalog.min.css</code>`));
    manifest("catalog", "0.2.1");

    syncVersions(root);

    expect(get("apps/docs/pages/get-started/catalog.html")).toContain(`${CDN}/catalog@0.2.1/dist/catalog.min.css`);
  });
});

describe("syncVersions: the markdown that shows a snippet", () => {
  it("writes the version of the package it names in a package README, the root README, SECURITY.md and the quick reference", () => {
    const changed = syncVersions(root);

    expect(get("packages/core/README.md")).toContain(`${CDN}/core@0.2.0/dist/luz.css`);
    expect(get("packages/core/README.md")).toContain(`${CDN}/catalog@0.2.0/dist/catalog.min.js`);
    expect(get("README.md")).toContain(`${CDN}/landing@0.1.4/dist/landing.min.css`);
    expect(get("SECURITY.md")).toContain(`${CDN}/core@0.2.0/dist/i18n-es.min.js`);
    expect(get("SECURITY.md")).toContain("`@luz-ds/core@0.2.0`");
    expect(get("dev/QUICK-REFERENCE.md")).toContain(".../@luz-ds/tokens@0.2.0/dist/luz-tokens.css");
    expect(changed).toEqual(expect.arrayContaining(["README.md", "SECURITY.md", "dev/QUICK-REFERENCE.md", "packages/core/README.md"]));
  });

  it("leaves a range alone: `@luz-ds/core@3` is not a version", () => {
    syncVersions(root);

    expect(get("packages/core/README.md")).toContain("`@luz-ds/core@3`");
  });

  it("changes nothing the second time", () => {
    syncVersions(root);

    expect(syncVersions(root)).toEqual([]);
  });
});

describe("syncVersions: the commands an agent is told to run (npx)", () => {
  beforeEach(() => {
    manifest("check", "0.2.0");
    put("README.md", "Run `npx @luz-ds/check@0.1.0 <files>` and `npx @luz-ds/tokens@0.1.0 check-contrast my.css`.\n");
    put("apps/docs/pages/get-started/ai.html", page("title: AI", "<pre><code>npx @luz-ds/check@0.1.0 src --json</code></pre>\n<p>Say <code>npx @luz-ds/check@0.1.0</code>.</p>"));
  });

  it("writes the version of check and of tokens in `npx @luz-ds/<name>@<version>` of the markdown and of the pages", () => {
    syncVersions(root);

    expect(get("README.md")).toContain("`npx @luz-ds/check@0.2.0 <files>`");
    expect(get("README.md")).toContain("`npx @luz-ds/tokens@0.2.0 check-contrast my.css`");
    expect(get("apps/docs/pages/get-started/ai.html")).toContain("npx @luz-ds/check@0.2.0 src --json");
    expect(get("apps/docs/pages/get-started/ai.html")).toContain("<code>npx @luz-ds/check@0.2.0</code>");
  });

  it("moves the `source` of the translation of a page whose command changed", () => {
    const body = get("apps/docs/pages/get-started/ai.html").replace(/^<!-- luz:page\n[\s\S]*?\n-->\n/, "");
    put("apps/docs/i18n/es/pages/get-started/ai.html", page(`title: IA\nsource: ${sourceHash(body)}\nreviewed: false`, body));

    syncVersions(root);

    const after = get("apps/docs/pages/get-started/ai.html").replace(/^<!-- luz:page\n[\s\S]*?\n-->\n/, "");
    expect(get("apps/docs/i18n/es/pages/get-started/ai.html")).toContain(`source: ${sourceHash(after)}`);
    expect(get("apps/docs/i18n/es/pages/get-started/ai.html")).toContain("npx @luz-ds/check@0.2.0 src --json");
  });

  it("is listed by releaseDrift while it says another version, and gone once synced", () => {
    expect(releaseDrift(root)).toContain("README.md:1: @luz-ds/check is at 0.2.0, the URL says 0.1.0");

    syncVersions(root);

    expect(releaseDrift(root)).toEqual([]);
  });
});

describe("releaseDrift", () => {
  it("lists the file and line of a CDN URL that does not say the version of its package", () => {
    const drift = releaseDrift(root).filter((line) => line.startsWith("apps/"));

    expect(drift).toEqual([
      "apps/docs/i18n/es/pages/get-started/index.html:8: @luz-ds/tokens is at 0.2.0, the URL says 0.1.0",
      "apps/docs/i18n/es/pages/get-started/index.html:9: @luz-ds/landing is at 0.1.4, the URL says 0.1.0",
      "apps/docs/pages/get-started/index.html:6: @luz-ds/tokens is at 0.2.0, the URL says 0.1.0",
      "apps/docs/pages/get-started/index.html:7: @luz-ds/landing is at 0.1.4, the URL says 0.1.0",
    ]);
  });

  it("lists the markdown snippets too, with their file and line", () => {
    const drift = releaseDrift(root);

    expect(drift).toContain("README.md:1: @luz-ds/landing is at 0.1.4, the URL says 0.1.0");
    expect(drift).toContain("packages/core/README.md:4: @luz-ds/core is at 0.2.0, the URL says 0.1.0");
    expect(drift).toContain("SECURITY.md:1: @luz-ds/core is at 0.2.0, the URL says 0.1.0");
  });

  it("is empty once the versions are synced", () => {
    syncVersions(root);

    expect(releaseDrift(root)).toEqual([]);
  });
});

describe("this repository", () => {
  it("has no CDN URL in a page, a README or SECURITY.md that says another version than its package", () => {
    expect(releaseDrift(repo)).toEqual([]);
  });

  it("names the version in every `npx @luz-ds/check` and `npx @luz-ds/tokens` an agent can read: a README, a docs page, llms.txt (security audit 2026-10-24)", () => {
    const BARE = /npx @luz-ds\/(check|tokens)(?!@|\$\{)/g;
    const files = [
      "README.md",
      ...readdirSync(join(repo, "packages")).map((name) => `packages/${name}/README.md`),
      "scripts/ai-readme.js",
      "scripts/docs-site/ai.js",
      ...["apps/docs/pages", "apps/docs/i18n/es/pages"].flatMap((dir) => htmlFiles(join(repo, dir)).map((f) => f.slice(repo.length))),
    ].filter((file) => existsSync(join(repo, file)));
    const bare = files.flatMap((file) =>
      readFileSync(join(repo, file), "utf-8")
        .split("\n")
        .flatMap((line, i) => (line.match(BARE) ? [`${file}:${i + 1}`] : [])),
    );

    expect(bare).toEqual([]);
  });

  it("runs the sync between `changeset version` and the README blocks in `pnpm release:version`", () => {
    const script = JSON.parse(readFileSync(`${repo}package.json`, "utf-8")).scripts["release:version"];

    expect(script).toBe("changeset version && node scripts/release-sync.js && node scripts/ai-readme.js --write");
  });
});
