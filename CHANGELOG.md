Changelog
=========

2025-09-26 — 1.5.0-beta.9
- Resilience: AI calls now cycle through `/.netlify/functions/generate-quiz`, `/api/generate`, and Netlify hosts (`https://ez-quiz.netlify.app/.netlify/functions/generate-quiz`, `https://eq-quiz.netlify.app/.netlify/functions/generate-quiz`), covering missing rewrites or third-party proxies.
- Maintenance: asset query strings bumped to v1.5.14 and service worker cache advanced to v123 to flush cached modules (api/generator/main/editor).
- Security: CSP `connect-src` now includes the Netlify hosts (including `https://ez-quiz.netlify.app`) so the fallback calls aren’t blocked client-side.

2025-09-26 — 1.5.0-beta.8
- Hotfix: client now calls `/.netlify/functions/generate-quiz` before `/api/generate`, so Start/Generate continue to work even if redirects are missing.
- Maintenance: asset query strings bumped to v1.5.13 and service worker cache advanced to v122 to force-deliver the new module order.

2025-09-25 — 1.5.0-beta.7
- Generator toolbar now opens into a generous two-column layout on 430–720px screens so wide phones have comfortable spacing.
- Inputs, cards, and status chips share softened 1px borders with a muted focus halo for accessible, non-glowy highlights.
- Consistent label spacing and refreshed radius tokens across modals/results keep sections from feeling cramped.
- Maintenance: cache-buster query strings bumped to v1.5.12 and the service worker cache advanced to v121 for fast rollout.

2025-09-24 — 1.5.0-beta.6
- Generator: topic autofill now preserves the dark-theme fill and rounded corners while keeping the new footer spacer tinted to match the canvas.
- Quiz Editor: global key listener guards missing `event.key` values to avoid console errors when the page loads in unusual contexts.
- Maintenance: cache-buster query strings bumped to v1.5.11 and the service worker cache advanced to v120 so clients pick up these fixes.

2025-09-19 — 1.5.0-beta.5
- Generator UI overhaul: inline stepper controls, rebuilt difficulty slider with aligned ticks, rounded toolbar.
- Interactive Editor default: new pill toggle (Interactive/Manual), spelled-out type labels, manual editor hidden until selected.
- Quiz Editor cleanup: question type checkboxes simplified; Debug/Mirror toggle repositioned; text area hidden on IE mode.
- Settings/Options split: theme selection lives in Settings; Options focuses on generation defaults; Quiz Behavior section removed from Settings.
- Prompt improvements: difficulty guidance clarifies scale for providers.
- Assets: cache-buster query strings bumped (v1.5.10) to ensure updated UI loads immediately.

2025-09-11 — 1.3.0-beta.0
- UI: removed subtle gradient backdrop behind floating action buttons; kept clean shadows only.
- Mobile resilience: added Reset App to clear caches and unregister service workers; URL triggers `?clear=1` or `#clear-cache` for stuck clients.
- Assets: bumped versioned CSS/JS query strings; service worker cache bumped to force fresh loads.
- Accessibility: preserved focus styles and keyboard focus trap in feedback panel.
- Docs: updated footer version link; no behavior changes to generation or results.
 - Help: polished modal styling; replaced FAQ with concise Q/A format (bold questions, no bullets); modal replace-on-open and entrance transitions.
 - Added: Interactive Editor (beta) — opt‑in card-based authoring for MC/TF/YN/MT with validation, matching pairs, and live sync to the raw editor.
  - Options: spelled out Question Types and styled them as mobile-friendly chips for better clarity.

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
- Quiz Editor: added “Load last quiz”; persist last lines locally.
- Options: focus trap while open.

2025-09-08 — 1.2.0-beta.2
- Generator: Quiz Editor/Generate always fills Editor + Mirror; runner starts only on Start.
- Options UX: outside-click ignores Topic/Length/Difficulty; Generate clicks no longer close Options.
- Defaults: save/reset generation defaults (Count/Difficulty/Types) in localStorage.
- Help: added What's New + Troubleshooting FAQ accordions; Back to top button; clearer Topic wording.
- SW: network-first for HTML/CSS/JS; faster cache busting on deploy.

2025-09-07 — 1.2.0-beta.1
- New Options drop-down replaces the former Advanced button (now Quiz Editor); houses Timer, Theme, Question Types, and Save default.
- Quiz Editor panel moved under a disclosure (“Quiz Editor”); full keyboard/ARIA support; caret animates on expand/collapse.
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
