# Security Policy

## Reporting Vulnerabilities

**Please do NOT create a public GitHub issue for security vulnerabilities.**

If you discover a security vulnerability in LUZ Design System, please report it privately:

- **GitHub Security Advisory:** https://github.com/nandovejer/luz/security/advisories/new

**Include in your report:**
- Description of the vulnerability
- Affected versions or components
- Steps to reproduce (if applicable)
- Potential impact
- Your suggested fix (if available)

**Response Timeline:**
- Initial response: Within 48 hours
- Patch release: Within 2 weeks (for critical issues)
- Public disclosure: Only after patch is released

Thank you for helping keep LUZ secure!

---

## Supported Versions

| Version | Status | Support Until | Security Fixes |
|---------|--------|---------------|----------------|
| **0.2.x** | ✅ Active | Current | Yes |
| 0.1.x | ❌ Replaced | Superseded by 0.2.0 (2026-10-24) | No |

---

## Security Best Practices

### When Using LUZ Design System from CDN

1. **Pin an exact version and use Subresource Integrity (SRI)** so a file cannot change under you. Load the layers in order — tokens, core, catalog:

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@luz-ds/tokens@0.2.1/dist/luz-tokens.min.css"
  integrity="sha384-<hash>"
  crossorigin="anonymous"
/>
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.2.1/dist/luz.min.css"
  integrity="sha384-<hash>"
  crossorigin="anonymous"
/>

<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.2.1/dist/catalog.min.css"
  integrity="sha384-<hash>"
  crossorigin="anonymous"
/>

<!-- The import map comes first: an import map after a module script is
     ignored. Each lazy chunk gets its own hash here -->
<script type="importmap">
{
  "integrity": {
    "https://cdn.jsdelivr.net/npm/@luz-ds/core@0.2.1/dist/midi.min.js": "sha384-<hash>",
    "https://cdn.jsdelivr.net/npm/@luz-ds/core@0.2.1/dist/table-sort.min.js": "sha384-<hash>",
    "https://cdn.jsdelivr.net/npm/@luz-ds/core@0.2.1/dist/timeline.min.js": "sha384-<hash>",
    "https://cdn.jsdelivr.net/npm/@luz-ds/core@0.2.1/dist/i18n-es.min.js": "sha384-<hash>",
    "https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.2.1/dist/search.min.js": "sha384-<hash>",
    "https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.2.1/dist/consent.min.js": "sha384-<hash>",
    "https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.2.1/dist/mode.min.js": "sha384-<hash>"
  }
}
</script>

<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.2.1/dist/luz.min.js"
  integrity="sha384-<hash>"
  crossorigin="anonymous"
></script>
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.2.1/dist/catalog.min.js"
  integrity="sha384-<hash>"
  crossorigin="anonymous"
></script>

<!-- Optional, a performance hint only: it starts the download early and
     checks nothing outside Chromium -->
<link
  rel="modulepreload"
  href="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.2.1/dist/search.min.js"
  crossorigin="anonymous"
/>
```

Compute each hash from the file you are pinning:

```bash
curl -s <url> | openssl dgst -sha384 -binary | openssl base64 -A
```

`luz.js` and `catalog.js` are ES modules and must be loaded with `type="module"`. SRI on an entry file does not cover the lazy chunks it imports on demand: core's `midi.js`, `table-sort.js`, `timeline.js` and one language file per language a page declares (`i18n-es.min.js`), and the catalog's `search.js` (on a page with a `<luz-search>`), `consent.js` (on a page with a `<luz-consent>`) and `mode.js` (on a page with a `<luz-mode>`). Each chunk imports nothing, and each entry imports its chunks by fixed names next to it, never a URL built from the page.

To check the chunks, use an import map with an `integrity` section, placed before the first module script, as above: the browser checks each file at the URL listed, whenever the entry imports it. It works in Chrome 127 and later, Safari 18 and later and Firefox 138 and later. An older browser ignores the `integrity` key and loads the chunks unchecked, so there is no protection there. A `<link rel="modulepreload" integrity>` is not a guard outside Chromium: Safari (WebKit) runs the file it preloaded without checking the hash, and Firefox fetches the file again without it, so a wrong hash does not block the file in either. Use `modulepreload` as a performance hint only. For browsers without import map integrity, self-hosting the files or installing from npm are the safe options.

Range URLs such as `@luz-ds/core@3` are fine for prototypes, but they cannot carry an SRI hash and pick up new releases automatically.

2. **Set Content-Security-Policy (CSP) headers:**

```
Content-Security-Policy: 
  script-src 'self' cdn.jsdelivr.net;
  style-src 'self' cdn.jsdelivr.net;
  font-src 'self' cdn.jsdelivr.net;
```

LUZ's chunks, the language files among them, are loaded by a dynamic `import()` from the entry. A CSP that allows scripts by hash or nonce, without `'strict-dynamic'`, blocks that `import()`: the language chunk does not load, and the page falls back to English, with one console warning. Add `'strict-dynamic'`, or allow the origin of the files as above. A language file is a module of the same origin as the entry and runs with its authority; the build writes it from a validated JSON file, so the bytes a contributor wrote are never the module.

3. **Use specific versions** (not latest):
- ✅ Good: `@luz-ds/core@0.2.1`
- ❌ Avoid: `@luz-ds/core@latest`

### When Installing from npm

1. **Always use a lock file** (pnpm-lock.yaml, package-lock.json):
```bash
pnpm install  # Uses pnpm-lock.yaml
```

2. **Use `--save` or `--save-dev`** to update lock file:
```bash
pnpm add @luz-ds/core --save
pnpm add vitest --save-dev
```

3. **Avoid `npm install` without lockfile** in production or CI/CD.

4. **Review dependency changes** in pull requests:
```bash
git diff package.json
git diff pnpm-lock.yaml
```

---

## Supply Chain Security

### For LUZ Package Maintainers

**Publishing:**
- Packages are published only by `.github/workflows/publish.yml`, through npm trusted publishing (OIDC). No npm token is stored in GitHub or on any machine, and every release carries a provenance attestation.
- The publish job runs in the `release` environment, which requires a reviewer's approval.
- The publish job installs with `--ignore-scripts`: no dependency lifecycle script runs while it can mint an OIDC token.
- A release happens only when the changesets "version packages" PR is merged, and only after lint, audit, build, unit tests and the tarball contract check (`pnpm check:pack`) pass.
- Since 0.2.0 nobody publishes from a laptop. The 0.1.0 versions and the placeholder versions of `@luz-ds/catalog` and `@luz-ds/site` were published by hand, before the workflow existed.

**Code Review Requirements:**
- Changes reach `main` through pull requests with passing status checks (branch ruleset).
- CODEOWNERS lists who is asked to review each package. The ruleset does not enforce a code-owner review yet (no required approvals), so today the required status checks are the gate.

**Dependencies:**
- Published packages have zero runtime dependencies.
- Dev dependencies are audited in CI (`pnpm audit --audit-level=high`); only allow-listed packages may run install scripts (`pnpm.onlyBuiltDependencies`).
- GitHub Actions are pinned to commit SHAs and kept current by Dependabot.
- Dependabot waits 7 days (`cooldown`) before proposing a new version, so a compromised release is usually pulled before it reaches a PR.

**Docs site (GitHub Pages):**
- Every page carries a Content Security Policy (`PAGES_CSP` in `vite.config.js`): scripts only from the site, and no `data:` URLs in frames or objects.

---

## Audit History

| Date | Finding | Status | Action |
|------|---------|--------|--------|
| 2026-05-20 | Plaintext npm token committed | ⚠️ Verify | The token is still readable in git history (commits `9669d54`, `9df4341`). It must be revoked on npmjs.com; removing the files did not remove it from history |
| 2026-05-20 | No code owner enforcement | ⚠️ Partly resolved | CODEOWNERS file added; the `main` ruleset does not require a code-owner review yet, so the required status checks are the gate |
| 2026-05-20 | No dependency scanning | ✅ Resolved | Dependabot configured |
| 2026-09-30 | `main` is not protected | ✅ Resolved | A ruleset on `main`: pull request required, the four status checks required (lint, audit, build and unit tests, UI tests), no force-push |
| 2026-09-30 | Publishing used a long-lived npm token, hid failures and skipped CI | ✅ Resolved | OIDC trusted publishing, changesets release PR, CI gate (requires the npm and GitHub settings above) |
| 2026-09-30 | MIDI parser could hang the page on malformed files | ✅ Resolved | Bounds and length validation, size and event limits, regression tests |
| 2026-09-30 | 40 advisories in dev dependencies | ✅ Resolved | vitest upgraded, unused dependencies and stale overrides removed |
| 2026-10-12 | `release` environment missing (GitHub would create it unprotected) and `main` still unprotected | ⚠️ Partly resolved: the environment exists with a required reviewer and `main` has its ruleset; deployments from any branch are still allowed (2026-10-24 audit) | Create `release` with a required reviewer and main-only deployments; add the `main` ruleset; npm trusted publishers point at `publish.yml` + `release` |
| 2026-10-12 | The two token commits are still served by SHA on GitHub | ⚠️ Open | Confirm the token is revoked on npmjs.com, ask GitHub Support to purge `9669d54` and `9df4341`, and set "Require two-factor authentication and disallow tokens" on each `@luz-ds` package (trusted publishing keeps working). The `NPM_TOKEN` secret no longer exists |
| 2026-10-12 | `escapeHtml` did not escape `'`; publish job ran install scripts with `id-token: write`; Pages CSP allowed `data:` frames and objects; no Dependabot cooldown | ✅ Resolved | `&#39;` escaped; `--ignore-scripts` in the publish job; `data:` dropped; 7-day cooldown |
| 2026-10-24 | The READMEs, the docs and `llms.txt` told an AI agent to run `npx @luz-ds/check` and `npx @luz-ds/tokens` with no version, so a bad future release would run in every consumer's agent session | ✅ Resolved | The commands name the version, and `pnpm release:version` keeps it in step |
| 2026-10-24 | `release` accepts deployments from any branch and admins can bypass it; secret scanning, push protection and Dependabot security updates are off; the hand-published placeholder versions of `@luz-ds/catalog` are not deprecated and its `stage` tag still points at one | ⚠️ Open | Settings of the owner: deployment branches "Selected: main" and no admin bypass on `release`; turn the three scanners on; `npm deprecate` the placeholders and `npm dist-tag rm @luz-ds/catalog stage` |
| 2026-10-24 | Dev-only advisories (vitest 4.1.11, fast-uri 3.1.8 through ajv and stylelint): 0 high, 4 moderate, 2 low; none reachable, the packages have no runtime dependencies | ✅ Resolved | vitest `^4.1.12` and an override of `fast-uri` to `^3.1.9` (the patched 3.x, not a new major); `pnpm audit` reports no known vulnerabilities |
| 2026-09-30 | Tarballs shipped without licence texts | ✅ Resolved | LICENSE per package, licence text next to every font (all fonts MIT since 2026-09-30) |

---

## Security Checklist

Before each release:

- [ ] All tests pass (`pnpm test:unit`, `pnpm test:ui`)
- [ ] Linting passes (`pnpm lint:css`, `pnpm lint:js`)
- [ ] No new dependencies added (or justified security exception)
- [ ] Dependencies are up-to-date (check Dependabot alerts)
- [ ] Version bumps follow semver (breaking changes = major)
- [ ] Every change has a changeset (`pnpm changeset`)
- [ ] `pnpm check:pack` passes (tarball contents match the snapshots)
- [ ] CDN URLs are tested (check jsDelivr links)
- [ ] The pull requests of the release are reviewed by the maintainer (CODEOWNERS is not enforced by the ruleset yet)

---

## Contact

**Security Maintainer:** @nandovejer  
**Private reports:** https://github.com/nandovejer/luz/security/advisories/new  
**GitHub Issues:** https://github.com/nandovejer/luz/issues

For non-security questions, use [CONTRIBUTING.md](./CONTRIBUTING.md) or GitHub discussions.

---

**Last Updated:** October 24, 2026
