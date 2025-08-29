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

