---
"@luz-ds/core": patch
"@luz-ds/catalog": patch
"@luz-ds/landing": patch
"@luz-ds/cms": patch
"@luz-ds/app": patch
"@luz-ds/docs": patch
"@luz-ds/check": patch
---

The peer dependencies on `@luz-ds/*` are `^0.1.0 || ^0.2.0`, so the next release (0.2.0 of tokens, core and catalog) is in range. With `^0.1.0` it was not, and changesets would have taken every dependent to 1.0.0.
