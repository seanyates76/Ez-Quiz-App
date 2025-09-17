Changelog
=========

2025-09-17 — 1.3.0-beta.0
- UI: removed subtle gradient backdrop behind floating action buttons; kept clean shadows only.
- Mobile resilience: added Reset App to clear caches and unregister service workers; URL triggers `?clear=1` or `#clear-cache` for stuck clients.
- Assets: bumped versioned CSS/JS query strings; service worker cache bumped to force fresh loads.
- Accessibility: preserved focus styles and keyboard focus trap in feedback panel.
- Docs: updated footer version link; no behavior changes to generation or results.
 - Help: polished modal styling; replaced FAQ with concise Q/A format (bold questions, no bullets); modal replace-on-open and entrance transitions.
 - Added: Interactive Editor (beta) — opt‑in card‑based authoring for MC/TF/YN with validation and live sync to the raw editor.
  - Options: spelled out Question Types and styled them as mobile‑friendly chips for better clarity.

2025-09-11 — 1.2.0-beta.4
- Fix (Results → Retake): Main “Retake” now always restarts the full quiz, independent of the Results filter (Missed/All).
- Add (State): Preserve the original full question set on parse; full retakes restore from this source after any missed-only runs.
- UX: “Take missed quiz” remains available under the Retake caret and only retakes missed questions from the last attempt.
- Footer: Version number is now clickable and links to the full changelog.
- PWA: Service worker cache bumped to v58 to ensure updated JS assets are picked up offline.

2025-09-08 — 1.2.0-beta.3
- Feedback: inline panel cooldown (30s), honeypot, unified CORS; a11y (aria-modal, title, focus trap); mail fallback on error; closes after ~1.4s.
- Mirror: reliable visibility toggle; hide container when off; apply state on Options open.
- SW/refresh: poll only when tab is visible; 60s interval.
- Advanced Editor: added “Load last quiz”; persist last lines locally.
- Options: focus trap while open.

2025-09-08 — 1.2.0-beta.2
- Generator: Advanced/Generate always fills Editor + Mirror; runner starts only on Start.
- Options UX: outside-click ignores Topic/Length/Difficulty; Generate clicks no longer close Options.
- Defaults: save/reset generation defaults (Count/Difficulty/Types) in localStorage.
- Help: added What's New + Troubleshooting FAQ accordions; Back to top button; clearer Topic wording.
- SW: network-first for HTML/CSS/JS; faster cache busting on deploy.

2025-09-07 — 1.2.0-beta.1
- New Options drop-down replaces Advanced button; houses Timer, Theme, Question Types, and Save default.
 - Advanced panel moved under a disclosure (“Advanced Editor”); full keyboard/ARIA support; caret animates on expand/collapse.
- Prompt Editor + Mirror now align side-by-side (66/34) with shared headers, min-heights, and mobile stack <768px.
- Mobile generation bar keeps Length + Difficulty side-by-side down to 360px; stacks below.
- Generation pipeline: Difficulty and selected Question Types flow to the API; providers prompt restricted to allowed types; echo respects types.
- BMC support: always-visible Support button; banner appears after 1st and every 4th completion; ESC closes; script loads only on demand; persistent suppression after click.
- Settings: “Always show advanced options” (cookie-based); Support → “Reset support prompts”; Beta label added.
- Accessibility & polish: visible focus outlines; ESC to close Options and return focus; click-away close; subtle expand/collapse animations.

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
