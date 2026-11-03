/**
 * F8 security audit, hardening L1: the dev server does not serve the
 * repository's private files.
 *
 * vite.config.js sets `root` to the repository and `server.fs.allow` to it, so
 * everything under it is a URL: `GET /.claude/OWNER.md` and
 * `/.claude/settings.local.json` answered 200 with the file. Decision:
 * `server.fs.deny` lists `.env`, `.env.*`, `*.{crt,pem}`, `**\/.git/**` and the
 * checkout's own `<root>/.claude/**` (`ownClaudeDeny(root)`).
 *
 * Why the last one is the absolute path of the root and not `**\/.claude/**`:
 * a git worktree of the owner lives at `<main>/.claude/luz-worktree/<name>/`, so
 * every file of it has `.claude` in its path and the bare pattern matched all of
 * them: `pnpm dev` answered 403 to every page. Decision: only the root's own
 * `.claude/` is private; a `.claude/` deeper in the tree, or above the root, is not.
 *
 * What this file checks, against a real Vite dev server started
 * programmatically from vite.config.js (on a free port of 127.0.0.1, with the
 * websocket and the browser off):
 *   - `ownClaudeDeny(root)` writes the pattern (posix slashes, no trailing slash,
 *     glob characters escaped) and the resolved `server.fs.deny` is the four old
 *     patterns plus it, with no bare `**\/.claude/**`;
 *   - /.claude/OWNER.md, /.claude/settings.json, /.claude/settings.local.json
 *     (the same through /@fs/) and /.git/config are answered 403 or 404 and the
 *     body has none of the file's text;
 *   - the pages and the packages' dist are still served;
 *   - in a temporary root, with that same `deny` list, a `.env`, a
 *     `.env.local`, a `.pem`, a `.crt`, a `.git/config` and a `.claude/` file
 *     are not served and an ordinary file is;
 *   - the same in a root that sits under a `.claude/` folder, as a worktree does,
 *     and in one whose path has glob characters: its pages are served and its own
 *     private files are not.
 *
 * Files under test:
 *   vite.config.js
 */
import { createServer as listenOnFreePort } from "node:net";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer } from "vite";
import * as config from "../vite.config.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const OLD_DENIED = [".env", ".env.*", "*.{crt,pem}", "**/.git/**"];
const BARE_CLAUDE = "**/.claude/**";
const ownClaudeDeny = (path) => {
  expect(typeof config.ownClaudeDeny, "vite.config.js exports ownClaudeDeny").toBe("function");
  return config.ownClaudeDeny(path);
};

const freePort = () =>
  new Promise((resolve, reject) => {
    const probe = listenOnFreePort();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = /** @type {import('node:net').AddressInfo} */ (probe.address());
      probe.close(() => resolve(port));
    });
  });

/** A dev server on a free port of the loopback; strictPort, so it never lands on another worktree's. */
async function start(options) {
  const port = await freePort();
  const server = await createServer({
    logLevel: "silent",
    ...options,
    server: { ...options.server, port, strictPort: true, host: "127.0.0.1", open: false, ws: false },
  });
  await server.listen();
  return { server, origin: `http://127.0.0.1:${port}` };
}

/** The start of a private file, or "" where the file is not there (OWNER.md and settings.local.json are not in git). */
const startOf = (file) => {
  try {
    return readFileSync(join(root, file), "utf-8").slice(0, 60);
  } catch {
    return "";
  }
};

const get = async (origin, path) => {
  const response = await fetch(origin + path);
  return { status: response.status, body: await response.text() };
};

/** The two ways to say no: 403 (restricted) or 404 (not there). Never 200, never a body of the file. */
function expectRefused(result, secret, label) {
  expect([403, 404], `${label}: status ${result.status}`).toContain(result.status);
  if (secret) expect(result.body, `${label}: the body is not the file`).not.toContain(secret);
}

describe("the dev server of vite.config.js", () => {
  let running;
  beforeAll(async () => {
    running = await start({ configFile: join(root, "vite.config.js") });
  }, 60_000);
  afterAll(async () => {
    await running?.server.close();
  });

  it("denies .env, .env.*, certificates and keys, .git and this checkout's own .claude, and no bare .claude", () => {
    const deny = running.server.config.server.fs.deny;
    expect(deny).toEqual(expect.arrayContaining([...OLD_DENIED, ownClaudeDeny(root)]));
    expect(deny).not.toContain(BARE_CLAUDE);
    expect(deny).toHaveLength(OLD_DENIED.length + 1);
  });

  // The first line of each file is enough to know it was served
  const PRIVATE = [
    ["/.claude/OWNER.md", ".claude/OWNER.md"],
    ["/.claude/settings.json", ".claude/settings.json"],
    ["/.claude/settings.local.json", ".claude/settings.local.json"],
  ];
  for (const [url, file] of PRIVATE) {
    it(`does not serve ${url}`, () => {
      const secret = startOf(file);
      return get(running.origin, url).then((result) => expectRefused(result, secret, url));
    });

    it(`does not serve ${url} through /@fs/ either`, () => {
      const secret = startOf(file);
      return get(running.origin, `/@fs${root}${file}`).then((result) => expectRefused(result, secret, `/@fs${root}${file}`));
    });
  }

  it("does not serve /.git/config or /.env", async () => {
    expectRefused(await get(running.origin, "/.git/config"), "[core]", "/.git/config");
    expectRefused(await get(running.origin, "/.env"), "", "/.env");
  });

  it("still serves a docs page", async () => {
    const result = await get(running.origin, "/docs/components/button/");
    expect(result.status).toBe(200);
    expect(result.body).toContain("<h1");
  });

  it("still serves the stylesheet of core's dist", async () => {
    const result = await get(running.origin, "/packages/core/dist/luz.css");
    expect(result.status).toBe(200);
    expect(result.body.length).toBeGreaterThan(1000);
  });
});

describe("the same deny list on a temporary root", () => {
  let dir;
  let running;
  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), "luz-dev-deny-"));
    const files = {
      ".env": "TOKEN=env-secret\n",
      ".env.local": "TOKEN=env-local-secret\n",
      "key.pem": "-----BEGIN PRIVATE KEY-----\npem-secret\n",
      "site.crt": "-----BEGIN CERTIFICATE-----\ncrt-secret\n",
      ".git/config": "[core]\n\tgit-secret = 1\n",
      ".claude/OWNER.md": "claude-secret\n",
      "nested/.claude/notes.txt": "claude-nested-text\n",
      "nested/.git/HEAD": "ref: refs/heads/git-nested-secret\n",
      "public.txt": "public-text\n",
    };
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(join(dir, path, ".."), { recursive: true });
      writeFileSync(join(dir, path), text);
    }
    // The four patterns the repository's own config resolves to, and the own-.claude pattern of this root
    const deny = [...OLD_DENIED, ownClaudeDeny(dir)];
    running = await start({ configFile: false, root: dir, server: { fs: { allow: [dir], deny } } });
  }, 60_000);
  afterAll(async () => {
    await running?.server.close();
    rmSync(dir, { recursive: true, force: true });
  });

  for (const [url, secret] of [
    ["/.env", "env-secret"],
    ["/.env.local", "env-local-secret"],
    ["/key.pem", "pem-secret"],
    ["/site.crt", "crt-secret"],
    ["/.git/config", "git-secret"],
    ["/.claude/OWNER.md", "claude-secret"],
    ["/nested/.git/HEAD", "git-nested-secret"],
  ]) {
    it(`does not serve ${url}`, async () => {
      expectRefused(await get(running.origin, url), secret, url);
    });
  }

  it("serves an ordinary file of the root", async () => {
    const result = await get(running.origin, "/public.txt");
    expect(result.status).toBe(200);
    expect(result.body).toContain("public-text");
  });

  // Decision: only the root's own .claude/ is private; a nested one is an ordinary folder
  it("serves a .claude/ folder deeper in the tree: only the root's own is private", async () => {
    const result = await get(running.origin, "/nested/.claude/notes.txt");
    expect(result.status).toBe(200);
    expect(result.body).toContain("claude-nested-text");
  });
});

describe("ownClaudeDeny", () => {
  it("writes the absolute .claude/** pattern of a root", () => {
    expect(ownClaudeDeny("/home/ana/luz")).toBe("/home/ana/luz/.claude/**");
  });

  it("drops the trailing slash", () => {
    expect(ownClaudeDeny("/home/ana/luz/")).toBe("/home/ana/luz/.claude/**");
  });

  it("writes posix slashes from a Windows-style path", () => {
    expect(ownClaudeDeny("C:\\Users\\ana\\luz\\")).toBe("C:/Users/ana/luz/.claude/**");
  });

  for (const char of "()[]{}*?!+@") {
    it(`escapes ${char} in the path, so it is a letter and not a glob`, () => {
      expect(ownClaudeDeny(`/home/a${char}b/luz`)).toBe(`/home/a\\${char}b/luz/.claude/**`);
    });
  }

  it("is not the bare pattern", () => {
    expect(ownClaudeDeny("/home/ana/luz")).not.toBe(BARE_CLAUDE);
  });
});

/**
 * A dev server whose root is `<tmp>/<parts...>`, with the deny list of the
 * repository's config for that root (the four patterns and ownClaudeDeny(root)).
 */
async function serveRoot(parts, extraDeny = []) {
  const base = mkdtempSync(join(tmpdir(), "luz-dev-deny-"));
  const dir = join(base, ...parts);
  const files = {
    "docs/x.html": "<!doctype html><title>page-title</title><h1>page-served</h1>\n",
    "public.txt": "public-text\n",
    ".claude/OWNER.md": "claude-owner-secret\n",
    ".claude/a/b.txt": "claude-deep-secret\n",
    ".env": "TOKEN=env-secret\n",
    ".git/config": "[core]\n\tgit-secret = 1\n",
  };
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(dir, path, ".."), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  const deny = [...OLD_DENIED, ownClaudeDeny(dir), ...extraDeny];
  const running = await start({ configFile: false, root: dir, server: { fs: { allow: [dir], deny } } });
  return { running, base, dir };
}

/** What a root must do, wherever it sits: its pages are served, its own private files are not. */
function expectRootServed(getRunning) {
  it("serves a page of the root", async () => {
    const result = await get(getRunning().origin, "/docs/x.html");
    expect(result.status).toBe(200);
    expect(result.body).toContain("page-served");
  });

  it("serves an ordinary file of the root", async () => {
    const result = await get(getRunning().origin, "/public.txt");
    expect(result.status).toBe(200);
    expect(result.body).toContain("public-text");
  });

  for (const [url, secret] of [
    ["/.claude/OWNER.md", "claude-owner-secret"],
    ["/.claude/a/b.txt", "claude-deep-secret"],
    ["/.env", "env-secret"],
    ["/.git/config", "git-secret"],
  ]) {
    it(`does not serve ${url}`, async () => {
      expectRefused(await get(getRunning().origin, url), secret, url);
    });
  }
}

describe("a root under a .claude/ folder, as a git worktree of the owner is", () => {
  let served;
  beforeAll(async () => {
    served = await serveRoot(["x", ".claude", "luz-worktree", "wt"]);
  }, 60_000);
  afterAll(async () => {
    await served?.running.server.close();
    rmSync(served.base, { recursive: true, force: true });
  });

  expectRootServed(() => served.running);

  it("does not serve the root's own .claude/ through /@fs/ either", async () => {
    const url = `/@fs${served.dir}/.claude/OWNER.md`;
    expectRefused(await get(served.running.origin, url), "claude-owner-secret", url);
  });
});

describe("a root whose path has glob characters", () => {
  let served;
  beforeAll(async () => {
    served = await serveRoot(["a [b]", "(x){y}+z@1!", "wt"]);
  }, 60_000);
  afterAll(async () => {
    await served?.running.server.close();
    rmSync(served.base, { recursive: true, force: true });
  });

  expectRootServed(() => served.running);
});

describe("the pattern of one root does not reach another", () => {
  let served;
  beforeAll(async () => {
    // The deny list names the .claude/ of a sibling folder, not this root's own
    served = await serveRoot(["a", "wt"], []);
    await served.running.server.close();
    const other = join(served.base, "a", "other");
    mkdirSync(join(other, ".claude"), { recursive: true });
    writeFileSync(join(other, ".claude", "x.txt"), "other-claude-secret\n");
    const deny = [...OLD_DENIED, ownClaudeDeny(other)];
    served.running = await start({ configFile: false, root: join(served.base, "a"), server: { fs: { allow: [join(served.base, "a")], deny } } });
  }, 60_000);
  afterAll(async () => {
    await served?.running.server.close();
    rmSync(served.base, { recursive: true, force: true });
  });

  it("denies .claude/ of the named root", async () => {
    expectRefused(await get(served.running.origin, "/other/.claude/x.txt"), "other-claude-secret", "/other/.claude/x.txt");
  });

  it("serves the .claude/ of a sibling folder that is not named", async () => {
    const result = await get(served.running.origin, "/wt/.claude/OWNER.md");
    expect(result.status).toBe(200);
    expect(result.body).toContain("claude-owner-secret");
  });
});
