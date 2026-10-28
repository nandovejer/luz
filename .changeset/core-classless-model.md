---
"@luz-ds/core": minor
"@luz-ds/catalog": minor
"@luz-ds/check": minor
---

The HTML comes out complete with no class. **Breaking:** `classless.css` (`@luz-ds/core/classless.css`) and the `[data-luz-classless]` attribute are gone, with no alias: what they did is now in `luz.css`, for the whole page.

- A bare `button`, `input`, `textarea`, `select`, `label`, checkbox, radio, range, colour and file input, `fieldset` with its `legend`, and `table` with its `caption`, `thead`, `tbody`, `tfoot`, `tr`, `th` and `td` take the look of their component, in `luz.elements` and inside `:where()`, so any class and any rule of yours wins. The space between blocks of text (paragraphs, lists, quotations, headings, `hr`) applies on every page.
- A variant is told by the HTML: a `button` with no `type` and `type="submit"` are the primary action, `type="button"` and `type="reset"` the secondary one, `aria-invalid="true"` an error, `aria-current="page"` the current link, `disabled` disabled. Classes are for what HTML cannot say: `a.luz-btn`, the roles (danger, ghost), the sizes, and what needs markup.
- A bare `details` has no box (a summary and a divider); `.luz-accordion` adds the box and the group. A bare `meter`, `progress`, `textarea`, `pre` and `dialog` are as close as the element allows to `.luz-meter`, `.luz-progress`, `.luz-input--textarea`, `.luz-code-block` and `.luz-modal`.
- Structure has no style: `div`, `span`, `section`, `article`, `aside`, `header`, `footer`, `main`, `search`, `form`, `nav`, `hgroup`, `col` and `colgroup`. `nav` is no longer set in the sans and `hgroup > p` no longer has a subtitle style: put your own font on a component that sits on a `nav`.
- New: `luz.conditional.css` (`@luz-ds/core/conditional.css`), `luz.css` with the reset and the bare elements only inside `[data-luz]`, for a project that already has a design: the document's font, colour and background go to the root of the zone, the tokens stay on `:root`, and objects, components and utilities are not scoped.
- The navbar's links and the links of the contents of an article (`.luz-toc`) set their own `text-decoration`, since `nav a` no longer does; the hover of those links changes colour and does not underline.

If you linked `classless.css`, link `luz.css` and drop the attribute; if you want LUZ in one region of an existing page, link `luz.conditional.css` and put `data-luz` on it.
