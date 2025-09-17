EZ Quiz Web v1.0.0
===================

Release date: 2025-08-28

Highlights
- Fresh header wordmark, adaptive mobile layout, and refined light‑mode backdrop
- Import UX: drag‑drop .txt, Clear button, right‑aligned tip
- Keyboard shortcuts: Enter to start/advance, Backspace to go back
- Results polish: centered actions; Retake Missed Only from Missed view
- New ratio bar (correct vs incorrect) with accessible legend
- In‑quiz progress bar near timer/counter
- FAQ modal: single scrollbar; Close button always visible
- Color‑coded status (Ready/Info/Warning/Error)
- PWA + hosting: Netlify headers, HTTPS redirects, relative paths, SW versioning
- Security: user content rendered safely (no innerHTML), tightened CSP (no inline scripts)

Getting started
- Paste or import a `.txt` quiz and press Enter to start
- Use Settings for timer and theme
- During quiz: Enter advances or finishes; Backspace goes back
- After finishing: Review Missed or All; optionally Retake Missed Only

Known notes
- Service worker updates require a hard refresh on first deploy (Shift+Reload)
- If the header wordmark source is changed, use `icons/brand-title-source.png`
EZ Quiz Web v1.1.0
===================

Release date: 2025-08-29

Highlights
- ✨ Prompt builder popover with Topic/Length, copy‑to‑clipboard, and Ctrl/Cmd+P shortcut
- Cursor‑positioned toasts for instant feedback
- Settings modal polish: sticky header/footer, grouped sections, small‑screen scrolling
- Header buttons refreshed: grey ⚙, cosmic purple ✨, cooler blue ?
- Support options: desktop Buy Me a Coffee widget; mobile/tablet floating ☕ FAB; footer Support link
- Footer anchored to bottom across devices; safe‑area aware
- Textarea made non‑resizable to protect layout

Docs & security
- README/FAQ updated for the new prompt builder and support info
- CSP updated to allow BMC widget domains and inline styles required by the widget

Notes
- On mobile and tablets the widget is hidden in favor of a native FAB
- If an ad blocker hides the widget on desktop, the Support FAB may appear as fallback
EZ Quiz Web v1.1.1
===================

Release date: 2025-08-29

Fixes & polish
- Modals: stabilized visibility and CSS parsing so Settings/FAQ open reliably
- FAQ: updated AI section to prioritize the ✨ Prompt Builder; manual prompt moved to an advanced section
- Menu: textarea placeholder now reads “Paste text or load file here...”
- Support FAB: removed transform on hover/active to prevent position jump on mobile; subtle brightness feedback only
- Button colors: replaced color-mix fallbacks for broader browser support (grey ⚙, blue ?, purple ✨ retained)
- Tip/Ready: compact, wrapped row under the textarea; button row spacing adjusted
EZ Quiz Web v1.1.2
===================

Release date: 2025-08-29

PWA cache bump
- Service worker cache version bumped to v48 to force fresh assets
- Offline navigation fallback now resolves index.html relative to SW scope for robust subpath hosting

Versioned assets
- index.html now references `style.css?v=1.1.3` and `app.js?v=1.1.3` to bypass long-lived CDN/browser caches
- SW fetch handler serves versioned .css/.js from cached base files when offline
EZ Quiz Web v1.2.0-beta.1
==========================

Release date: 2025-09-07

Highlights
- Clean default face: inline Topic, Length, Difficulty with responsive layout.
- Options hub: new drop-down with Timer, Theme, Question Types, and Save default.
- Advanced only when you want it: disclosure row with caret, ARIA + keyboard friendly, ESC to close.
  - Editor + Mirror: 66/34 side-by-side with shared headers and balanced heights; stacks under 768px.
  - Smarter generation: types and difficulty flow through to API; providers instructed to use only selected types.
  - Support: always-visible Support button; Buy Me a Coffee banner after 1st and every 4th completion; async load; ESC to dismiss; persistent suppression after click.
  - Settings: “Always show advanced options” and “Reset support prompts”; Beta indicator at the bottom.

Notes
- Banner cadence does not show again once clicked on that device (can be reset in Settings).
- Question Types currently constrain generation; they do not filter manually pasted lines.
- CSP allows buymeacoffee widget/script domains; widget loads only when needed.

EZ Quiz Web v1.2.0-beta.4
==========================

Release date: 2025-09-11

Fixes & improvements
- Retake behavior: Main “Retake” always restarts the full quiz, regardless of whether “Missed” or “All” is selected in Results.
- Missed-only option: “Take missed quiz” (under the Retake caret) continues to run only the missed questions from the last attempt.
- Original set preserved: The original question set is stored when a quiz is parsed; full retakes restore from this source even after taking a missed-only run.
- Footer link: The version label is now clickable and links to the full CHANGELOG for quick tester review.
- Offline update: Service worker cache bumped to v58 to pick up the latest JS changes offline.

Tester tips
- To retake the full quiz, click “Retake”. To retake only missed questions, use the caret next to Retake and choose “Take missed quiz”.
- If you previously ran “missed-only”, “Retake” will still restore and run the complete original set.

EZ Quiz Web v1.3.0-beta.0
==========================

Release date: 2025-09-17

Highlights
- UI polish: Removed the subtle gradient backdrop behind floating action buttons (FABs) for a cleaner look; kept soft shadows for depth.
- Mobile hygiene: Added a robust Reset App action (Settings) that clears local data, deletes all caches, and unregisters service workers. Also added URL triggers `?clear=1` and `#clear-cache` for devices stuck on stale assets.
- Versioning: Bumped versioned CSS/JS references in `index.html` and increased the service worker cache version to guarantee fresh loads.
 - Help & FAQ: Sleeker modal with concise Q/A entries (bold questions, no bullets), modal replace-on-open behavior, and subtle entrance transitions.

Notes
- Use `?clear=1` directly in the URL if you cannot access Settings.
- PWAs should be fully closed before using the reset mechanism for best results.
