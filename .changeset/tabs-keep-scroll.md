---
"@luz-ds/core": patch
"@luz-ds/check": patch
---

Tabs: `activateTab()` shows the selected panel before it hides the others. The other way round the page was for a moment shorter than the scroll position, the browser clamped it, and a sticky element above the panels (a stuck row of tabs) came unstuck when you chose another tab while scrolled down.
