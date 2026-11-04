---
"@luz-ds/tokens": minor
"@luz-ds/core": minor
"@luz-ds/catalog": minor
"@luz-ds/check": patch
---

**Breaking:** the Auto of `<luz-theme-time>` no longer follows the hour of the day: it follows the system, as core's `<luz-theme-mode>` does. The time of day is now a choice the reader makes: the slider of `variant="bar"`, a moment option (`show="moments"`) or `pin(hour)` set a moment, whose base goes to `data-mode` and `data-theme` and whose name goes to `data-moment`, and the page keeps it (an hour pinned is stored under `luz-light`) until a mode or Auto is chosen. With no hour chosen, `data-moment` is the `data-default` moment of the mode in use (the system's in Auto), so a page's rules for its dark moment still apply when the system is dark, and no moment option is checked.

With no hour chosen, the radio checked in core's `<luz-theme-mode>` is the mode in use (Light or Dark, the system's), and the round button shows its icon and name; `<luz-theme-time>` does that and nothing is stored (core's choice is still Auto). Auto is checked, and the button says so, only while an hour or a moment is chosen. When the system is light, the button's first press goes to Dark, not to the Light already shown. The LUZ site's footer no longer has Auto checked in its markup, so without JavaScript no radio is checked and the page follows the system.

**Who sees a difference:** a page that relied on Auto changing with the clock (dark from 20:30, say). **To keep that:** pin the moment at the visitor's hour yourself, with `pin(hour)`.

`theme-time-boot.js` (the optional script for the head) follows the same rule: it applies an hour only when one is pinned under `luz-light`; otherwise it writes the default moment of the mode core's `theme-boot.js` wrote, and no longer reads the clock. The element no longer checks the clock every minute.

New: `el.dayMoment`, the name of the moment at the hour the slider shows, whether the page shows it or not (the bar's label and sun or moon read it). `el.moment` is the moment the page shows. The `luz-theme-time:change` event is unchanged.

The LUZ site follows this rule: its pages no longer name `data-theme="light"`, so Auto is the system's on the home and in the docs, with or without JavaScript.

`luz-check`: no change; version bump only.
