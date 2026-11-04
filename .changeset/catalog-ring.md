---
"@luz-ds/catalog": minor
"@luz-ds/check": patch
---

`.luz-ring` (`@luz-ds/catalog/components/ring.css`), a half ring for one value over a goal or for up to four series, drawn with CSS alone and no script: the figure and its label are text in the middle, the arc is a picture of them. `--v1` to `--v4` set the values and `--max` the goal, as plain numbers on the figure; `--luz-ring-size` sets its size and `--luz-ring-color` recolours the first series. The ring shrinks to its box and, when it is narrow or the text is large, the figure moves under the arc. In forced colors the series take system colours and a numbered swatch tells them apart; on paper the ring is left out and the text prints. The goal belongs in the label ("1,260 of 2,000 visitors"), because the arc alone does not say it. `luz-check` takes the classes of the ring from catalog.
