Changelog
=========

2025-09-04
- Refactor: switched to native ES modules under `public/js/*` with `js/main.js` entry. Service worker updated to pre‑cache modules. No behavioral changes intended.
- Results UX:
  - Default view shows missed only; “Show all” toggle lists missed first.
  - Color‑coded user answers (green/red) now include full answer text beside the letter.
  - Retake split button caret made very thin and snug to the right of Retake; actions row aligned (Back to Menu left, Retake+caret right).
  - “Show all” moved to the Results header.
- Quiz runner:
  - Progress bar is ARIA‑labeled and placed between the counter and question text.
  - Keyboard hotkeys: MC (A–Z/1–9), TF (T/F), YN (Y/N); Enter/Right to advance, Backspace/Left to go back.
  - Settings: “Require answer to advance” and “Auto‑start after generate”.
  - Sticky nav on mobile; small‑screen button scaling and icon‑only Prev/Next at <=360px.
- Generator:
  - Enter key submits from topic/count/difficulty; input clamping (count 1–50) and default topic hint.
  - AI generation returns a TITLE line; frontend uses it without duplicating “Quiz”.
- Backend (Netlify Functions):
  - Modular providers (Gemini/OpenAI/Echo); returns `{ title, lines }`.
  - Gemini fallback when the primary provider fails; improved 429 handling with Retry‑After.
- Buy Me a Coffee:
  - Widget integrated on desktop only; mobile shows fallback ☕ button.
  - Mutually exclusive: fallback hides only when the widget iframe is present.
- Footer:
  - Centered and kept near the bottom; extra bottom padding with `safe-area-inset-bottom` for gesture bars.
- Branding:
  - Removed light‑mode title padding/badge (awaiting updated logo).
- Legal:
  - Privacy Policy and Terms refreshed for 2025.

2025-08-29
- ✨ Prompt builder popover with Topic/Length, copy‑to‑clipboard, toast, and Ctrl/Cmd+P shortcut.
- Settings modal refined: sticky header/footer, grouped sections, better small‑screen scrolling.
- Header buttons: higher contrast and feedback; added ✨ alongside ? and ⚙.
- Buy Me a Coffee: floating widget (bottom‑right), warm beige color; Support link in footer.
- CSP: allow BMC widget domains and inline styles required by the widget.
- Settings icon button restyled to neutral grey for clarity.

2025-08-28
- New header wordmark; mobile header scales without overlap.
- Light‑mode chip backdrop + stronger header separation.
- Color‑coded status line (Ready/Info/Warning/Error).
- Import UX: drag‑drop `.txt`, Clear button.
- Keyboard shortcuts: Enter to start/advance; Backspace to go back.
- Review flow: Back to Results fixed, Main Menu button added.
- "Retake Missed Only" on Missed Questions review.
- Compact progress bar beside counter/timer.
- FAQ modal: single scrollbar; Close button always visible.
- Security: no innerHTML for user content; tightened CSP; no inline scripts.
- PWA: relative paths; SW cache bumps; Netlify headers + HTTPS redirects.
