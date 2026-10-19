# Translating the docs

The documentation is in English and Spanish. English is the source of truth. Arabic is planned for the docs but is not published yet, for upkeep: the home page is in English, Spanish and Arabic, and a link from the Arabic home into the docs goes to the English page. What is kept ready for it: the Arabic terms of the glossary, the Arabic font switch (`apps/docs/locale-scripts/ar.json`) and the right-to-left rules. To publish it, add `apps/docs/i18n/ar/strings.json` (the opt-in is the folder) and translate the pages as for Spanish. This page is for whoever translates a page (a person or an agent) and for whoever reviews it. The commands to add a language or a page are in [AGENTS.md](../AGENTS.md) ("Adding a language to the docs", "Translating a docs page"); the principle is in [PRINCIPLES.md](../PRINCIPLES.md) section 5.

## How it fits together

- A language has docs when its folder exists: `apps/docs/i18n/<code>/` (`es`, `ar`). The folder holds `strings.json` (the chrome: sidebar, buttons, rail, footer) and `pages/` (the translated pages).
- A page is translated by adding one file, `apps/docs/i18n/<code>/pages/<same path as the English page>.html`. A page with no file is shown in English inside the translated chrome, marked `lang="en"`, with a notice that links to the English page.
- The reading order, the areas, the groups and every id come from the English page. A translation cannot move them.
- `apps/docs/i18n/glossary.json` holds the terms. Use its word for a term, in every page.

## What is never translated

Copy these as they are:

- The brand and the names: `LUZ`, `GitHub`, `npm`, `pnpm`, `CDN`, `MIT`, `@luz-ds/*`.
- Everything in code: the text inside every `<pre>` and every `<code>` (and `<kbd>`, `<samp>`, `<var>`) is the English text, byte for byte. A test fails the commit if it differs. This includes class names (`.luz-btn`), tokens (`--luz-space-md`), properties, attributes, elements, file names, commands and URLs.
- The ids of the standards: WCAG criteria, EN 301 549, ARIA roles and attributes.
- The names of keys printed on a key (Tab, Enter, Esc, Shift, Ctrl). Space is translated (`Espacio`, `مفتاح المسافة`).
- Numbers, ratios and versions. Every figure of the English page must appear in the translation, in any order and with the separators of your language (`4,5:1` is `4.5:1`, `1.000` and `1 000` are `1,000`); extras are allowed, and a dropped or changed figure fails the test.
- The `id` of a heading and the `href` of a link. Translate the text of a link, never its target. Write internal links as `/docs/…`: the build turns them into the links of the language.

Demos stay English in a translation: the live markup of `[data-docs-specimen]`, the Do and don't stages and the snippets is copied as it is, and the generator marks each of those containers `lang="en"` (and `dir="ltr"` in a right-to-left page); give a container a `lang` of its own to keep it. `pnpm check:strings` does not read the strings inside demos. A code comment inside a code sample stays English.

## Register

**Spanish.** Informal singular, tú, with the imperative for instructions ("Usa", "Añade", "Comprueba"). Never usted, never vosotros, never voseo. Neutral international Spanish. Infinitive or a noun for buttons and labels ("Copiar", "Guardar"). Decimal comma in prose (`4,5:1`), but not inside code. Angular quotes «así». Questions and exclamations open with `¿` and `¡`.

**Arabic.** Modern Standard Arabic. The reader is addressed in the masculine singular imperative ("اختر", "ثبّت", "اقرأ"). Western digits, 0 to 9, never Arabic-Indic digits, with a full stop as the decimal separator. Arabic comma `،`, semicolon `؛` and question mark `؟`. Latin terms stay Latin inside the sentence; do not transliterate them. Put `{column}`, `{mode}` and `{lang}` of the script strings inside a bidi isolate (U+2068 before, U+2069 after). Do not add other direction marks to the text: the CSS mirrors the page and isolates the code.

**Both.** Sentence case in headings and buttons, as in English ("Copy the markup", not "Copy The Markup"). Short sentences and plain words. Verb first in buttons. A link says where it goes. An error says how to fix it. One word for one action, as in the glossary. Keep the length close to the English: the 80 KiB ceiling of a page is also for the Arabic page, and the shared strings use the words the home page already uses.

## Writing a page

1. Copy the English file to the same path under `apps/docs/i18n/<code>/pages/`.
2. Replace the front matter with these keys only:

   ```html
   <!-- luz:page
   title: …
   description: …
   keywords: …
   source: <12 hex>
   reviewed: false
   -->
   ```

   `title` and `description` are required. `keywords` is optional (other names for the page, for the search and the A–Z index). `source` is the first 12 hex of the SHA-256 of the English body, with white space collapsed and trimmed; `pnpm check:i18n` prints the one a page should have. Every other key (`area`, `order`, `group`, `files`, `module`, `toc`, `lead`, `generate`) is inherited and forbidden here.
3. Translate the text between the tags. Keep every tag, attribute, `id`, `class` and `href`, in the same order. Keep entities (`&amp;`, `&lt;`) as written and never write a bare `&` or `<`.
4. Run `pnpm vitest run tests/docs-i18n-pages.test.js`. It fails with `file:line` on any difference of structure: tags, ids and heading levels, link targets, the text of code, the figures, the generated markers.
5. Run `pnpm check:strings` (the file is read in its language: Title Case in Spanish and vague links in both are caught) and `pnpm check:i18n`.

An agent that writes a translation leaves `reviewed: false` and no `reviewer`. The page is published with the notice "This translation is pending review", in its own language.

## When the English page changes

The `source` of the translation is now stale. `pnpm check:i18n` lists it with the hash the page has and the hash it should have, and exits 0. `pnpm check:i18n --strict` exits 1 on a stale or orphan page; `scripts/qa-release.js` runs it, so a stale translation blocks a release, not a commit. Translate the change, then write the new `source`. If the change did not touch the meaning (a typo), you may only update `source`, and say so in the commit.

A structural change (an id, a heading, a link, a figure) fails the tests at once, because the translation no longer matches the English page.

## The owner's review checklist

Per page, in this order:

1. Open `/es/docs/<page>/` (or `/ar/docs/<page>/`) and the English page side by side.
2. The meaning is right and nothing is left out. The headings are in the same order (the test already guarantees the structure).
3. The register is right (tú, or MSA) and the words are the glossary's.
4. Nothing that is code has been translated (`<code>` text is verbatim by test).
5. The numbers match the English tables (also by test).
6. Every link goes to a page in the same language.
7. Read it once with a screen reader: `lang` is right and no English is read with a Spanish or Arabic voice.
8. Set `reviewed: true` and `reviewer: <your GitHub handle>`, then commit as `docs(<code>): review <page>`.

`reviewed: true` needs a `reviewer`, and a `reviewer` needs `reviewed: true`: `pnpm check:i18n` reports the other cases as an error in every mode. The notice goes away only when both are set. A page you have not read stays `reviewed: false`.

`pnpm check:i18n` lists what waits for a reader ("unreviewed"), so the list of the pages left to review is always one command away.

## The glossary

`apps/docs/i18n/glossary.json` has two parts.

- `keep`: what is never translated, as literals and as patterns.
- `terms`: `{ en, es, ar, forms: { es, ar }, avoid: { es, ar }, note }`. `forms` are the inflections a translation may use (plural, feminine). `avoid` lists words that must not be used for the term (for example, the Arabic word for an attribute is not used for a theme). The `note` says where the word comes from: `existing` is how the home page and core already write it; `proposed` is a suggestion that a reader confirms.

Add a term when you choose a word twice. Change a term only with the owner: it changes every page.

## Adding a language

See "Adding a language to the docs" in [AGENTS.md](../AGENTS.md). In short: add the language to the home's registry, create `apps/docs/i18n/<code>/strings.json` from the English catalog, add its terms to the glossary, then translate the pages in the order of the owner's batches (indexes, then Get started, then the accessibility statement). For a right-to-left language, check a long page, the A–Z index and a table page at 320 px.
