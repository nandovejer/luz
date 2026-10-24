---
"@luz-ds/tokens": patch
"@luz-ds/core": patch
"@luz-ds/catalog": patch
"@luz-ds/landing": patch
"@luz-ds/cms": patch
"@luz-ds/app": patch
"@luz-ds/docs": patch
"@luz-ds/check": patch
---

The commands the READMEs tell an AI agent to run, `npx @luz-ds/check` and `npx @luz-ds/tokens check-contrast`, now name the version (`npx @luz-ds/check@0.2.0 <files>`), so a release of the tool nobody read does not run by itself in a consumer's agent session; `pnpm release:version` keeps the version in step.
