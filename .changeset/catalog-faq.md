---
"@luz-ds/catalog": minor
"@luz-ds/check": minor
---

New component: `<luz-faq>`, frequently asked questions, in `@luz-ds/catalog/components/faq.css`. A CSS-only tag around native `details`: every answer is in the served HTML, opens with the keyboard and works without JavaScript.

- Parts: `__title`, `__lead`, `__nav` (links to the groups, for a long FAQ), `__group` with its `__group-title`, `__item` (the `details`), `__question` (the `summary`), `__answer` and `__more`.
- Put the `id` on the answer, not on the `details`: a link to it, and the browser's find in page, open the closed question.
- A plus turns into a minus when the question is open, and the open question takes the brand colour. The answers print open.
