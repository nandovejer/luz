---
"@luz-ds/core": patch
"@luz-ds/check": patch
---

Three charts drawn from a native element, each a loose sheet linked after `luz.css` (core's CSS has no room left in `luz.css`): `.luz-column-chart` (`@luz-ds/core/components/column-chart.css`), a table whose cells are columns, `--v` from 0 to 1 on each cell; `.luz-stacked-bar` (`components/stacked-bar.css`), the shares of a whole in one bar with a legend of names and figures in text, the series in `--luz-chart-1` to `-6`; and `.luz-heat-map` (`components/heat-map.css`), a table whose cells show a swatch mixed from `--luz-chart-1` into `--luz-chart-track` and the figure under it. The figures are always text; in forced colors the columns, parts and swatches take system colours and an edge, and the parts of a stacked bar are numbered. `--luz-column-chart-color`, `--luz-stacked-bar-color` and `--luz-heat-map-color` set another series.
