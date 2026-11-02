---
"@luz-ds/core": patch
"@luz-ds/check": patch
---

`.luz-bar-list`: a list of rows, each a name, its figure and a bar under them (a native `meter`, `.luz-bar-list__meter`), in the chart colours (`--luz-chart-1` on `--luz-chart-track`). `--luz-bar-list-color` sets another series for a list or a row, `--luz-bar-list-row-h` gives lists side by side one row height, `.luz-bar-list--cells` cuts the bar into cells and `.luz-bar-list__row--zero` puts the figure of an empty row in the brand colour. It is a loose sheet, `@luz-ds/core/components/bar-list.css`, linked after `luz.css`: core's CSS has no room left in `luz.css`. The home page's weight charts use it.
