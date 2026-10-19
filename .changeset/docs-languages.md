---
"@luz-ds/tokens": patch
"@luz-ds/check": patch
---

The documentation can be in more than one language. A language has docs when its folder exists, `apps/docs/i18n/<code>/`, and is served at `/<code>/docs/`; a page with no translation is shown in English in the translated chrome, marked `lang="en"` and with a notice that links to the English page. A translation an agent wrote is published with its notice until a named reader reviews it. PRINCIPLES.md section 5 says it, `pnpm check:i18n` lists the translations that are stale, orphaned or waiting for a reader, and `pnpm check:i18n --strict` blocks a release on a stale or orphan one. `@luz-ds/check` ships the same snapshot of the packages, so it releases with them.
