---
"@luz-ds/tokens": patch
"@luz-ds/check": patch
---

Adds the data palette to the semantic tokens, in light, dark and high contrast: `--luz-chart-1` to `--luz-chart-6` (blue, teal, purple, berry, periwinkle, stone), `--luz-chart-track` (the empty part of a bar) and `--luz-chart-grid` (the grid). The series are 3:1 or more on every surface (4.5:1 in high contrast), 0.08 or more apart in OKLab, and 0.05 or more apart with protanopia or deuteranopia; none is red, green or yellow, so the status colours keep their meaning. `luz-tokens check-contrast` measures these pairs too, so a theme that sets its own surfaces now needs chart colours that suit them; the theme template (`themes/_template.css`) names the eight tokens.
