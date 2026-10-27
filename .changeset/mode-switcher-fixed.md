---
"@luz-ds/core": minor
"@luz-ds/catalog": minor
"@luz-ds/check": patch
---

The cycle variant of the color mode switcher is now the round button the home and the docs show, and with scripting on it is **fixed at the end corner of the window**. **Breaking** for whoever used `.luz-mode-switcher--cycle` in the flow (a sidebar, a settings panel, a demo): add `.luz-mode-switcher--inline` to the same group to keep it where the markup puts it.

- `.luz-mode-switcher--cycle` with scripting on: a circle of `--luz-control-lg` on `--luz-surface`, a hairline of `--luz-divider`, `--luz-shadow-sm` and the icon in `--luz-text-secondary` (`--luz-text-primary` and `--luz-surface-hover` on hover), fixed with `inset-block-end` and `inset-inline-end` of `--luz-space-md` (bottom left in a right-to-left page) at `--luz-z-raised`. The legend stays the group's name, visually hidden. Without scripting the radios stay in the flow, where the markup puts them. Keep one fixed button per page.
- New `.luz-mode-switcher--inline`, used with `--cycle`: the same round button, in the flow and without the shadow.
- The colours of the round button go through three new custom properties the component declares, `--luz-switcher-cycle-bg`, `--luz-switcher-cycle-border` and `--luz-switcher-cycle-text`, so the sidebar's setting still changes them.
- A fixed button never hides what Tab reaches: while it shows, `<html>` gets a `scroll-padding-block-end` of its size and margins. The page keeps the corner free at its end (a footer takes an end padding of `--luz-control-lg` plus two `--luz-space-md`). A disabled round button has a dashed border and no hover, as the radios do.
- Catalog: with `<luz-consent>` showing, the button rides on the top edge of the banner (and the scroll padding adds the banner's height); `<luz-mode>` around a fixed button is `display: contents`, so it leaves no empty block in the flow.
- Catalog: with `<luz-consent>` showing, the sticky docs rail (from 80rem) also keeps the banner's height as end padding and scroll padding, so Tab never leaves its last links under the banner.
- Core: while the mode follows the system or the clock (no mode radio checked: Auto), the round button's name now says "Change color mode. Current: Auto" instead of a dash. New string `modeAuto` (`es` ships; Arabic comes from `data-luz-label-mode-auto`).
