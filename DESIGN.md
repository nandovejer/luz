# LUZ design rules

The look of the published system (`@luz-ds/tokens`, `@luz-ds/core`, `@luz-ds/catalog`), written as rules. It is derived from the CSS as it is (the way it looks now is the way it is meant to look), so a rule says what nearly every component already does and a deviation is a finding, not a style.

[PRINCIPLES.md](./PRINCIPLES.md) says what must never happen (red lines `RL-n`) and what should not without a reason (strong rules `SR-n`). This file is the third level: **design rules, `DR-n`**. They are about how a thing looks, never about whether it works, so no check can fail on them, and a reviewer holds a change to them by eye.

**Who reads it.** The agents that write or review CSS (`frontend-engineer`, `ux-designer`, the main session). A person who finds it is welcome, but it is not written for them.

**Never a value.** A rule names tokens (`--luz-*`) and the relations between them, never a size, a colour or a number: the token pages of the docs hold the values, and a value typed here would go stale. `tests/design-md.test.js` checks that every token named here exists, and nothing else.

**Breaking a rule.** A `DR` is broken with the reason written next to it, under its **Exceptions** field, in this file. Never with a `luz-exception` comment and never with a row in [EXCEPTIONS.md](./EXCEPTIONS.md), which are for strong rules. A deviation that is a mistake and not yet fixed is listed in [Open](#open) until it is fixed.

**Scope.** Only the published system. The identity of the LUZ site itself (the light of the home, the chrome of the docs) is out of scope, and a specimen on a docs page always shows Vejer, whatever the light of the page. Where the home shows the system itself (the demo of `#native`) or draws a mark (the word LUZ), a departure from a rule is written under that rule all the same. The packages for one kind of site (`landing`, `cms`, `app`, `docs`) are out of scope too.

**How a rule reads.** Five fields under its heading, after the id: **Rule**, **Why**, **Tokens**, **Look at** (what a reviewer checks, one line each; `ux-designer` runs these at the end of a visual batch and on every new component or pattern) and **Exceptions**.

## Shape

### DR-1 Corners follow containment

**Rule:** a surface that stands on its own (a card, a button, a panel, a menu) takes the medium radius; a text field and a select are a line under the text, not a box, and have no radius; a thing inside another rounded thing, or inline with text (code, a chip, a meter), takes the small one; a pill or a dot takes the full one. There is no larger radius. A part that touches the edge of its neighbour (a row of a joined group) has square corners on the sides that touch.

**Why:** one corner for the surfaces gives the system its softness without making every box a different size of round, and the step down for what is inside keeps the curves concentric.

**Tokens:** `--luz-radius-md`, `--luz-radius-sm`, `--luz-radius-full`.

**Look at:** is every standalone box at the medium radius, and every text field a line? Is an inner or inline part at the small one? Is a pill at the full one? Does a part inside a rounded box use a larger radius than the box? Does a component name a radius token that does not exist?

**Exceptions:** a box that reflows into a plain list on a narrow window (the head of a sortable table) and a dialog that fills the window (the search) are square; a joined group has square corners where its parts touch (the accordion).

### DR-2 Lines have one job each

**Rule:** a line between rows and sections is the divider; the edge of a control (a field, a select, a meter's track) is the input border; the boundary of a thing that must stand out from the page, without a fill, is the outline; emphasis (the current item, an accent edge) is the primary brand colour. A line is a hairline, except an accent bar on the inline start edge, which has one of two widths: the thin one on a box that already has its own border (the alert), the thick one on a block that has no other edge (a quotation, the figure). Nothing names a colour of its own.

**Why:** a reader learns that a quiet line separates and a coloured line points, and a field is always found by its edge, whatever surface it sits on.

**Tokens:** `--luz-divider`, `--luz-input-border`, `--luz-outline`, `--luz-brand-primary`.

**Look at:** is each line the token of its job? Is an accent bar the thin width on a box with its own border and the thick one on a block without? Is a control's edge still visible on the surface it sits on, in the three modes?

**Exceptions:** the two widths of the accent bar (decided 2026-10-24); a transparent border that keeps the box the same size when forced colors paints it is not a line. The round colour-mode button (`.luz-theme-mode__button`) has a hairline edge in `--luz-divider`, about 1.4:1 on the surface, and not `--luz-input-border`: its icon, at 3:1 or more, is what tells the control apart, and the edge only keeps the circle's shape (decided 2026-10-26).

### DR-3 Elevation has three steps

**Rule:** a card at rest has the small shadow and rises to it on hover; a thing that floats over the page without covering it (a dropdown, a picker, a tooltip, a toast, a menu) has the medium one; a layer that covers the page or sits above it while scrolling (a modal, a drawer, the sticky bar) has the large one, with the scrim behind it. Nothing else casts a shadow: flat surfaces are told apart by a line or by a step of surface.

**Why:** the reader reads depth as "how much of the page this covers", and three steps are enough to say it.

**Tokens:** `--luz-shadow-sm`, `--luz-shadow-md`, `--luz-shadow-lg`, `--luz-scrim`.

**Look at:** does a floating thing have a shadow that matches what it covers? Does a flat thing cast one?

**Exceptions:** a shadow used as a technique and not as elevation (a spread that paints a band across the full width of the page) is not a shadow. The fixed round colour-mode button takes `--luz-shadow-sm`, not the md of a floating control: it is a 40 px button, not a surface, and a larger shadow would outweigh the page it sits on (decided 2026-10-26).

## Type and hierarchy

### DR-4 Text takes a step of the scale

**Rule:** the size of any text is a step of the text scale, never a size derived on the spot. Running text is the base step. The dense parts of an interface (labels, table cells, meta lines) are the small and medium steps, chips and captions the extra small, and a title inside a component the large or the extra large. A text field takes the control step, so a phone does not zoom into it. A component may also say `font-size: inherit`: it keeps the step of its parent, so the scale still holds.

**Why:** one scale is what makes the sizes relate to each other, and a size outside it is the one that looks wrong next to its neighbours.

**Tokens:** `--luz-text-xs`, `--luz-text-sm`, `--luz-text-md`, `--luz-text-base`, `--luz-text-lg`, `--luz-text-xl`, `--luz-text-control`.

**Look at:** is every font size a token (or `inherit`)? Is a text field at the control step?

**Exceptions:** the caption of a figure is sized from the text it captions, a little under it, and not from the scale (decided 2026-10-24: a step of the scale would change its look by a pixel; `tests/css-tokens-defined.test.js` names it). The word LUZ in the hero of the home (`.landing-imago`, `apps/landing`) is sized in `em` by media query and not from the scale, because the mark is a drawing and not text: its letters are squeezed and stretched one by one to fit a prism, so a step of the scale would not size it (decided 2026-10-28).

### DR-5 Headings are light, tight and in their own face

**Rule:** a heading is set in the heading face, in a light weight, with tight leading and slightly tight letter spacing (none in a script that joins its letters, such as Arabic). Hierarchy between headings comes from the step of the scale and from the space around them, never from making one bolder.

**Why:** the serif heading at a light weight is the voice of the system; weight is left free to mean "this is the current one" (DR-12).

**Tokens:** `--luz-font-heading`, `--luz-text-primary`.

**Look at:** is a heading bold? Does a heading in a component read as a heading without a weight to tell it apart?

**Exceptions:** the title of a group of the FAQ (`.luz-faq__group-title`, an `h3`) is a label and not a heading to the eye: the sans face, uppercase, medium weight, the small step and centred, in the secondary text colour, as the eyebrow of a section is (decided 2026-10-28; Arabic keeps neither the capitals nor the letter spacing). The question of the FAQ (`.luz-faq__question`) is a `summary`, not a heading, so it takes the body face at semibold, the strong label of DR-6, and not the heading face (decided 2026-10-28).

### DR-6 Weight says what a thing is

**Rule:** running text is regular; the name or label of a thing (a tab, a breadcrumb's current page, a table head, a chip) is medium; the current or selected item and a strong label is semibold; a heading is light (DR-5). No component invents another weight.

**Why:** three weights are enough to separate text, names and the thing you are on, and a reader learns them once.

**Tokens:** `--luz-text-primary`, `--luz-text-secondary`.

**Look at:** is a weight outside regular, medium and semibold used in a component? Is the current item the heaviest in its group?

**Exceptions:** none.

## Rhythm

### DR-7 Padding is a pair, wider inline than block

**Rule:** the padding of a box is two steps of the space scale, the one along the line a step or two above the one across it, never below it. A compact control sits in the small steps, a box in the medium ones, a dialog in the extra large ones. A full-width band takes the large vertical step.

**Why:** text needs more air beside it than above it to look centred in its box, and always taking the pair from the same scale keeps boxes in one family.

**Tokens:** `--luz-space-3xs`, `--luz-space-2xs`, `--luz-space-xs`, `--luz-space-sm`, `--luz-space-md`, `--luz-space-lg`, `--luz-space-xl`, `--luz-space-2xl`.

**Look at:** is the inline padding at least the block padding? Do two like boxes (two controls, two cards) have the same pair?

**Exceptions:** a dense control (a text field, a select, the terminal) and the bars and cells of a layout (the navbar, the sidebar, a table) may take an inline step two above the block one, for the gutter their text needs (decided 2026-10-24).

### DR-8 The gap inside a thing is one step small

**Rule:** the gap between the parts of a component is the extra small step; a tight cluster (an icon and its label, a chip's parts) is the double extra small; a group of controls is the small step; the medium step and up belong to layout (a bar, a search), not to a component's inside.

**Why:** the inside of a component is read as one unit, and a gap that grows with the size of its parts breaks that.

**Tokens:** `--luz-space-xs`, `--luz-space-2xs`, `--luz-space-sm`, `--luz-space-md`, `--luz-space-lg`.

**Look at:** is a component's gap larger than the space between two components next to it?

**Exceptions:** none.

### DR-9 Space between blocks follows a ladder

**Rule:** in running content, siblings are one medium step apart; a heading takes the extra large step above it and the small step below it, so it leads what follows and not what precedes; a rule is set apart by the extra large step on both sides; paragraphs inside a quotation or a list item and the items of a list are closer, by one and by two steps. A component's own margin collapses with the step and does not add to it. A column of unrelated blocks is the stack object, at the small step.

**Why:** a reader finds where one idea ends by the space, so the space has to say it in the same way on every page.

**Tokens:** `--luz-space-md`, `--luz-space-xl`, `--luz-space-sm`, `--luz-space-xs`, `--luz-space-2xs`, `--luz-content-max`.

**Look at:** is a heading closer to what precedes it than to what follows? Do two pages with the same blocks have the same space between them?

**Exceptions:** none.

## Colour and states

### DR-10 Colour carries one meaning at a time

**Rule:** the text colours are a ladder: primary for what is read, secondary for what supports it, muted for a hint, disabled for what is unavailable, and the on-fill colour for text on a brand fill. The brand colour means "act here" or "you are here". Danger, success, warning and info mean a status, are used only for one, and always come with a word or an icon, never as the only sign.

**Why:** if the same colour is a link, a status and a decoration, none of them can be read, and a status that only has a colour is lost to a person who does not see it.

**Tokens:** `--luz-text-primary`, `--luz-text-secondary`, `--luz-text-muted`, `--luz-text-disabled`, `--luz-text-on-fill`, `--luz-brand-primary`, `--luz-color-danger`, `--luz-color-success`, `--luz-color-warning`, `--luz-color-info`.

**Look at:** is a status colour used for something that is not a status? Is a status shown by colour alone? Is the brand colour used for decoration?

**Exceptions:** none.

### DR-11 Surfaces step, they do not mix

**Rule:** the page is the lowest surface; a thing that holds content (a card, a panel, a menu, a dialog) is the surface; a quiet area inside or beside content (code, a track, a banner) is the muted surface; a filled control or a chip is the strong surface. A surface above another is a step apart, and a state steps from its surface (DR-13).

**Why:** the steps are how a box is told from the one under it in the three modes, where a colour of its own would work in only one.

**Tokens:** `--luz-surface-page`, `--luz-surface`, `--luz-surface-muted`, `--luz-surface-strong`, `--luz-surface-hover`, `--luz-surface-pressed`.

**Look at:** is a box the same surface as the one it sits on? Is a surface used for a state?

**Exceptions:** in the home, a panel of the demo of `#native` (the "after" of the HTML as LUZ draws it) has the surface of its frame and is told apart by its border alone, as the boxes of the three modes (`.landing-modes`) already were: the demo shows what the page looks like, so it sits on the page's own surface (decided 2026-10-28).

### DR-12 The current item is told by weight and by a mark

**Rule:** the current, selected or pressed item is heavier (DR-6) and has a mark besides colour: the brand fill with the on-fill text for a chip or a page number, an edge or an underline for a link, a surface step with a line for a tab. The mark is the same family wherever an item is "the one you are on".

**Why:** a person who does not see the colour still finds where they are, and a reader learns one sign.

**Tokens:** `--luz-brand-fill`, `--luz-text-on-fill`, `--luz-brand-primary`, `--luz-surface-muted`.

**Look at:** is the current item told apart in forced colors and in grayscale? Do two groups with a current item use the same sign?

**Exceptions:** the language list takes an edge and a surface for its current language (decided 2026-10-24).

### DR-13 A state is one step from its resting state

**Rule:** hover steps a neutral surface to its hover surface (a component may expose a hover token of its own, as the sidebar and the mode switcher do, if it defaults to the shared one) and the text to the primary colour; a control tinted by the brand steps to the subtle brand fill; a link gains or loses its underline. Pressed is the pressed surface. A thing never moves, grows or changes shape on hover, except that a card raises to the small shadow.

**Why:** a state that is the same small change everywhere is felt and not read, and one that moves is a state that gets in the way.

**Tokens:** `--luz-surface-hover`, `--luz-surface-pressed`, `--luz-brand-subtle`, `--luz-brand-fill-hover`, `--luz-text-primary`, `--luz-outline`, `--luz-text-on-fill`.

**Look at:** does a hover change more than a surface, a text colour and an underline? Does it move anything?

**Exceptions:** a question of the FAQ under the pointer takes the brand colour of the open question, with no underline and no surface step (the summary's hover surface of core goes): the marker, a plus when closed and a minus when open, tells hovered from open, and the open question is also told to assistive technology by its `details`, which exposes the expanded state (decided 2026-10-28). The secondary button (`.luz-btn--secondary` and the bare `button` with `type="button"` or `type="reset"`) steps from the strong surface to `--luz-outline` with `--luz-text-on-fill`, and not to `--luz-surface-hover`: the strong surface is already the deepest, and the hover surface is a hair from it in the three modes, so the hover would not be seen; the pair is held at text contrast by `packages/tokens/lib/contrast.js`. It is a change of colour and surface, as the rule allows, but it is not the shared hover surface and the text is not the primary colour; it comes from the button before the bare elements and is not an owner decision: to confirm.

### DR-14 Disabled is quiet and says so

**Rule:** a disabled thing has the disabled text colour, shows the not-allowed cursor, and has no hover or active state. It is never made unreadable by fading the whole control.

**Why:** a disabled control still has to be read, and it still has to look like it will not answer.

**Tokens:** `--luz-text-disabled`, `--luz-surface-muted`.

**Look at:** is a disabled thing readable? Does it change on hover? Is it told by more than its colour?

**Exceptions:** a control that is drawn without text of its own (a checkbox, a radio, a switch) fades as a whole (decided 2026-10-24). A disabled round colour-mode button keeps its icon colour and says it is disabled with a dashed border, no hover and the not-allowed cursor, as the radios of the same control do (decided 2026-10-26).

### DR-15 One focus ring

**Rule:** the focus indicator is the same ring everywhere: the focus colour, one width, offset from the edge, and drawn inside the edge only when the edge is clipped by its container. The ring is never replaced by a colour change of the thing itself.

**Why:** a keyboard user learns where they are from one sign, in the same place, on every control.

**Tokens:** `--luz-focus-ring`.

**Look at:** is the ring the same width, colour and offset as the others? Is it drawn on a thing with a rounded edge along that edge?

**Exceptions:** a ring on a fill, where the focus colour would not meet its contrast against the fill, takes the colour of the text on that fill (the sidebar and the mode switcher); the offset is wider where a border would swallow the ring (the featured card) or the thumb would (a range) (decided 2026-10-24).

### DR-16 Motion is short and says what changed

**Rule:** a change of state (colour, background, border) takes the fast duration; a change of a surface takes the base one; a thing that moves across the page (a drawer, a panel) takes the slow one, with an easing token. Nothing animates unless the reader asked for a change, and everything stops under reduced motion.

**Why:** a state change that is slow is a state change that can be missed, and one that moves on its own is a distraction.

**Tokens:** `--luz-duration-fast`, `--luz-duration-base`, `--luz-duration-slow`, `--luz-easing-standard`, `--luz-easing-enter`.

**Look at:** does a transition name a duration token? Does a transform name an easing? Is there motion nobody asked for?

**Exceptions:** none.

## Open

Deviations from the rules above that are a mistake and not yet fixed, with the component and the rule.

**Bare elements.** Core also styles the HTML elements with no class (`packages/core/src/elements/`, every selector in `:where()`; a control whose class contains "luz-" is left to its component), draws no style on the structure tags (`div`, `span`, `section`, `header`, `footer`, `nav`, `form` and the like: the layout is the user's, `o-*`), and ships `luz.conditional.css`, the same sheet with the reset and the bare elements only inside `[data-luz]`. They follow every rule above as the components do (the fields and the select are a line, DR-1; the rhythm of bare blocks is DR-9; a bare button is the primary or the secondary of DR-13); what is below is where they do not yet.

**Meter, progress and range (bare).** The track of a bare `meter`, `progress` and `input[type="range"]` is the browser's own and is below 3:1 against the surface in light and in high contrast, where DR-2 asks the edge of a control to be found; the value is in the label, but WCAG 1.4.11 (non-text contrast) is the real issue. The bare `meter` also paints the browser's own green for "good", and DR-10 says green means success. The fix is `appearance: none` with the pseudo-elements of each engine (`.luz-meter` and `.luz-progress` already draw them), and it costs bytes that the core budget has no room for; to decide with a budget row or by leaving the track to the component.

**Checkbox and radio in dark (bare).** The unchecked box of a bare `input[type="checkbox"]` and `input[type="radio"]` is white in dark and in high-contrast dark, because no rule sets `color-scheme: dark` for them (the date and time fields and the select have one): a bright box that does not follow the mode, against DR-11, which says surfaces step with the mode. The fix is a `color-scheme` rule for the dark modes in `elements/forms.css`.

**Space inside a prose list (DR-9).** `.luz-prose` (`components/prose.css`) puts its list items the double extra small step apart, and the blocks inside an item the extra small one; the page-wide rhythm of bare blocks (`elements/text.css`) puts them the extra small and the small step apart, which is what DR-9 says (one and two steps closer than the medium step). A list in `.luz-prose` is a step tighter than the same list outside it, and prose wins by layer. Fix prose to the ladder, or write in DR-9 why running prose is denser.

The first audit (2026-10-24) found eleven. One was a mistake and is fixed: the language switcher's menu read a radius token that does not exist, so it had square corners (`tests/css-tokens-defined.test.js` now fails on any token a stylesheet reads that nothing defines); nothing else derives a font size of its own (the same test holds every component's font size to the scale, except the figure caption, which is sized from the text it captions and is an exception of DR-4). The rest were not mistakes, and each is written as an exception under its rule above, or as a correction of the rule where the rule had it wrong (fields are a line, not a box).

**No tokens for weight and line height.** Components type a weight (three kinds, DR-6) and a line height by hand. Decided on 2026-10-24 not to add tokens for them yet: it would be a release of the tokens package and a sweep of every component for no change to the look. The rules stay in words (DR-5 and DR-6); revisit if a theme needs to change them.
