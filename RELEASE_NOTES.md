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

