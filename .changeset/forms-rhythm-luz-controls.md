---
"@luz-ds/core": patch
"@luz-ds/check": patch
---

The space between bare controls (a field, a label, a fieldset or a button after another control) is not added to a control that carries a `luz-` class: a `.luz-check-item` or a `.luz-btn` in a flex row of your own no longer starts lower than the first one. It keeps its own spacing.
