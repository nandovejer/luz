---
"@luz-ds/core": patch
---

`.luz-badge`: the digits sit in the middle of the box. A mono face keeps room for descenders under the digits, so a count looked 0.6 to 2 px high; the badge now has `line-height: 1` and 1 px of padding above, which leaves it within 1 px of the centre in the common system mono faces. The box is still 20 px high.
