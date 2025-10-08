# UI Components

This guide anchors the Phase 3 styling baseline. References to `public/styles.css` call out the main branch token definitions that the deleted local file mirrored, and markup references point to `public/ui-kit.html` unless otherwise noted.

## Atoms

### Button

#### Anatomy
- `.btn` provides the base shell (inline-flex alignment, gap `var(--sp-2)`, padding `calc(var(--sp-3) - 1px)` by `var(--sp-5)`, `--r-2` rounding, surface background, focus transitions). Source: public/styles.css:124.
- `.btn--primary` swaps to the accent background with inverse text (`var(--c-accent)`, `var(--c-text-inverse)`); `.btn--ghost` removes the fill for minimal actions. Source: public/styles.css:144 and public/styles.css:150.
- Buttons in the kit place text nodes only, but the spacing supports leading icons or badges without additional wrappers. Example markup: public/ui-kit.html:152-166.

#### States
- Hover shifts background to `var(--c-surface-2)` and active nudges the button by `1px` for tactile feedback. Source: public/styles.css:140-141.
- Disabled buttons use both the `disabled` attribute and `aria-disabled="true"` fallback, reducing opacity to `0.55` and changing the cursor. Source: public/styles.css:142.
- Focus-visible relies on the global outline token `--c-focus`. Source: public/styles.css:106-110.

#### ARIA attributes
- Use `type="button"` on interactive buttons not inside forms to prevent accidental submissions (see public/ui-kit.html:152-166).
- Toggles should update `aria-pressed` (e.g., the theme switch in public/ui-kit.html:122-126).
- When removing `disabled`, clear any `aria-disabled="true"` to restore full semantics.

#### Keyboard interactions
- Space and Enter trigger click activation on focus.
- Tab order follows DOM sequence; avoid `tabindex` overrides unless creating a toolbar grouping.
- Provide ESC handling for global dismiss buttons (the modal close button listens for Escape via script in public/ui-kit.html:305-314).

### Input (Text)

#### Anatomy
- Text inputs use the `.input` class for 100% width, padding `var(--sp-3)`/`var(--sp-4)`, `--r-1` rounding, and subtle border. Source: public/styles.css:182-188.
- Wrapper labels in the kit stack helper text above the control for consistent vertical rhythm. Example: public/ui-kit.html:175-180.

#### States
- Focus-visible swaps the border color to `var(--c-focus)` (public/styles.css:190-191).
- Disabled state inherits native styles; pair with `aria-disabled` when the element remains focusable for description-only fields.

#### ARIA attributes
- Prefer `<label>` for name association. Supplement with `aria-describedby` for helper text in future patterns.
- Use `aria-invalid="true"` when server-side validation fails; style variant to be added when token set expands.

#### Keyboard interactions
- Users rely on standard text input behavior (Tab to focus, typing for data entry).
- Provide clear focus order and avoid overriding arrow-key behavior.

### Select

#### Anatomy
- Native `<select>` uses shared control styling without extra classes (public/styles.css:182-188) and sits in the same label pattern as inputs (public/ui-kit.html:181-187).
- Keep option text concise; rely on design tokens for spacing.

#### States
- Focus ring uses the shared `:focus-visible` rule (public/styles.css:190-191).
- Disabled selects use the native attribute to remove them from tab order.

#### ARIA attributes
- Native selects expose their role automatically; do not override with `role="listbox"` unless replacing the control.
- When pairing with helper text, wire `aria-describedby`.

#### Keyboard interactions
- Up and Down arrows change the highlighted option; typing letters performs type-ahead.
- Space or Enter opens the list on desktop browsers.

### Textarea

#### Anatomy
- Textarea styling matches the select/input block with multiline support. Source: public/styles.css:182-188 and markup at public/ui-kit.html:188-191.
- Rows default to `3` in the kit; adjust per feature needs.

#### States
- Focus ring mirrors other inputs (public/styles.css:190-191).
- Provide disabled or read-only variants via attributes; tokens stay consistent.

#### ARIA attributes
- Use `aria-describedby` for character counts or formatting hints.
- For resizable textareas, leave the native resize handle unless UX dictates otherwise.

#### Keyboard interactions
- Enter inserts new lines; Shift+Tab exits the field.
- Screen reader users expect the control in the normal tab order.

### Badge Pill

#### Anatomy
- `.pill` is an inline-flex capsule with `var(--sp-2)` gap, padding `2px var(--sp-3)`, and the full-round radius token `--r-round`. Source: public/styles.css:195-204.
- Applied in the UI kit to label samples and token chips (public/ui-kit.html:156-159 and public/ui-kit.html:200-204).

#### States
- Default fill uses `var(--c-surface-2)` with a subtle border.
- Custom states swap background and text tokens inline (see accent examples in public/ui-kit.html:200-204).

#### ARIA attributes
- Use `role="status"` when the pill communicates live updates, as with the theme indicator (public/ui-kit.html:123-126).
- Otherwise treat as decorative text without extra ARIA.

#### Keyboard interactions
- Pills are non-interactive by default; if clickable, upgrade to a button or link and adopt button guidance.

### Tooltip

#### Anatomy
- A dedicated tooltip token is not yet present in `public/styles.css`; current builds rely on native `title` attributes for quick hints (see the floating action buttons in public/index.html:610-626).
- When the tokenized tooltip ships, base it on the same shadow and radius tokens to align with cards and modals.

#### States
- Provide default, persistent, and error-state variants; all should respect light mode swapping via `:root.light`.
- Ensure tooltips remain visible on hover and focus, and dismiss when focus leaves the trigger.

#### ARIA attributes
- Trigger elements should set `aria-describedby` to the tooltip id and update `aria-expanded` if the tooltip is toggled programmatically.
- Tooltips themselves use `role="tooltip"` and stay outside the tab order.

#### Keyboard interactions
- Show on focus and dismiss on Escape.
- Maintain the trigger in the tab sequence; do not make the tooltip focusable unless it contains actionable content.

## Patterns

### Card

#### Anatomy
- `.card` wraps content with border, radius `--r-2`, and `--sh-1` shadow (public/styles.css:154-160).
- Sub-elements `.card__header`, `.card__body`, `.card__footer` handle padding and dividing borders (public/styles.css:161-163).
- UI kit articles demonstrate cards as component containers (public/ui-kit.html:150-208).

#### States
- Cards are static by default; interactive cards should add `:hover` and focus styles consistent with button tokens.
- Light theme automatically adjusts background via `:root.light`.

#### ARIA attributes
- Use semantic elements (`article`, `section`) as in the kit and add `aria-labelledby` when wrapping with generic containers.
- For lists, pair cards with `role="list"` and `role="listitem"` similar to the grid helper block (public/ui-kit.html:217-225).

#### Keyboard interactions
- Static cards have no direct keyboard behavior; interactive cards must expose focus outlines and keyboard activation.

### Modal

#### Anatomy
- `.modal` covers the viewport; `.modal__backdrop` handles the overlay; `.modal__dialog` hosts the content with `--sh-2` depth and padding `var(--sp-6)`. Source: public/styles.css:165-179 and markup at public/ui-kit.html:230-245.
- Internal layout relies on `.stack` and toolbar grouping for actions.

#### States
- `.modal.is-open` toggles display via `grid` (public/styles.css:167).
- Backdrop click and theme tokens adjust automatically.

#### ARIA attributes
- Root container uses `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, and `aria-describedby` (public/ui-kit.html:230-237).
- Close button is a standard `.btn` with clear text (public/ui-kit.html:242-243).

#### Keyboard interactions
- Script traps focus within the dialog and restores focus on close (public/ui-kit.html:283-299 and public/ui-kit.html:305-320).
- Escape dismisses the modal; backdrop click also triggers close.

### Toast

#### Anatomy
- Toast container lives at `#toast` with `role="status"` and `aria-live="polite"` (public/index.html:631). Styling inherits from the deleted stylesheet, so rebuild with surface tokens and `--sh-1` when reinstating.
- Display toggled via the `announce` helper (public/js/patches.js:15-23).

#### States
- Default toast auto-hides after `1600ms`; adapt durations via the helper.
- Extend with success or danger tokens (`--c-success`, `--c-danger`) when semantic feedback is required.

#### ARIA attributes
- Keep the live region hidden when not in use but mounted in the DOM.
- Do not move focus to the toast; rely on polite announcements.

#### Keyboard interactions
- Toasts do not take focus; ensure the triggering action retains focus so Escape continues to act on the original context.

### Toolbar

#### Anatomy
- `.ui-toolbar` is a flex container with wrapping, spacing `var(--sp-4)`, and grouped segments `.ui-toolbar__group` (public/ui-kit.html:14-40 and public/ui-kit.html:112-140).
- Embed buttons, status pills, or filters inside groups to maintain consistent gaps.

#### States
- Toolbars adapt automatically between themes; ensure buttons inside use their native states.
- Provide visual separators if turning a toolbar into a navigation surface.

#### ARIA attributes
- Top toolbar uses `role="banner"` for the kit header; utility toolbar uses `role="region"` with `aria-label` (public/ui-kit.html:112-140).
- When repurposing, prefer `role="toolbar"` with grouped labels and logical tab order.

#### Keyboard interactions
- Maintain horizontal arrow navigation when adopting `role="toolbar"`; otherwise standard tabbing applies.
- Buttons inside the toolbar honor their own keyboard behavior (for example, the theme toggle activates with Space or Enter).

---

Publish this document in the docs folder and circulate the link to the Product and Engineering channels so Phase 3 work stays aligned with the shared styling system.

