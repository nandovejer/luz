---
"@luz-ds/core": patch
---

`MidiPlayer.load(url)` no longer follows redirects: it calls `fetch(url, { redirect: "error" })`, so a MIDI address that redirects fails through the player's error path instead of loading a file from wherever it points. Host the file at the address you give: a redirect now needs its final address.
