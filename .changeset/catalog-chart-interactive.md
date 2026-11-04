---
"@luz-ds/catalog": minor
"@luz-ds/check": patch
---

`<luz-chart>` gains `type="column"` and `interactive`. With `interactive`, on a line chart or on a column chart (a table with a row per day and a column per series, no class: the script gives it `luz-column-chart`), a header shows each series with its total as a toggle button (`aria-pressed`), which turns that series off and on (the last one shown stays on; the scale does not change), and a readout shows the figures of the day under the pointer or the row that has the focus, with a light band over that day. The rows of the table take the focus, one Tab stop: the arrow keys, Home and End move between them, and Escape puts the readout away. The totals are written with `Intl.NumberFormat` and the script writes no word of its own. Without JavaScript it is the table. `luz-check` knows the new attribute.

The interactive charts are made to be read: each row is named from your own cells ("Apr 1, Desktop 252, Mobile 148"), the script writes the roles of the table (`table`, `row`, `cell` and the rest) so that the rows laid out side by side keep them in Safari with VoiceOver, an off series keeps its cells in the table, and the focus ring is drawn on the plot of a line chart.

A new CSS-only chart: a column chart with several series. A table with a row per category (its name in a `th scope="row"`) and a column per series, up to six, is drawn as groups of columns, each series in its own chart colour, with the head row as the legend; `--luz-column-chart-gap` sets the space between the columns of a group. Write the roles of the table in its markup, as the page does.

Visible changes for every existing column chart: the default bar is narrower (`--luz-column-chart-bar`, `var(--luz-space-lg)` by default, never wider than its column; set `--luz-column-chart-bar: 100%` for the old look), and the names of the columns move below the columns, as an axis, with the figure still above its column. A line chart's title, and the header and readout of the interactive charts, are set in the sans face.
