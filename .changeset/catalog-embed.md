---
"@luz-ds/catalog": patch
"@luz-ds/check": patch
---

Adds `<luz-embed>` to catalog (and to the elements `luz-check` knows): a poster and a play button in place of a player from another site (a video, a map), with the facade technique of lite-youtube-embed in a lazy chunk of its own, `embed.js` (`@luz-ds/catalog/embed`, `components/embed.css`). It builds no address and names no provider: `src` is the full address, written by the author, `https:` or of the page's origin, and the poster and every word are the author's. Nothing is requested from the player's origin until the visitor points at or focuses the button (a `preconnect`) or clicks it (the iframe, with `autoplay`); with `consent="<category>"` nothing is requested until that category of the cookie consent is granted, and the click shows an optional `[data-luz-embed-ask]` question whose buttons (`once`, `always`, `cancel`) play, store the choice and emit `luz:consent`, or go back. Without JavaScript the poster is a link to the video. `catalog.js` loads the chunk when the page has a `<luz-embed>`; a new budget row, `catalog JS lazy chunk: embed` (1.5 kB ideal, 2 kB ceiling), and no existing ceiling changes.
