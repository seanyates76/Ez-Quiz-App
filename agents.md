# Codex Welcome — EZ Quiz Web

Hey future helper! This repo ships the [ez-quiz.app](https://ez-quiz.app) PWA plus a few Netlify Functions. It’s a static front end under `public/` (vanilla ES modules) with serverless handlers in `netlify/functions/` for quiz generation and feedback email.

## Orientation
- **Entry point**: `public/index.html` loads slim modules from `public/js/`. State lives in `public/js/state.js`; the generator wiring is in `public/js/generator.js` and delegates to `public/js/api.js` (prefers `/.netlify/functions/generate-quiz`, falls back to `/api/generate`).
- **Styling**: global tokens set in `public/styles.css` (see top-of-file CSS variables); we just polished cards/toolbars/veils to use shared radius + shadow tokens (`--radius-*`, `--shadow-*`). Keep those consistent when you tweak UI.
- **Interactive Editor**: `public/js/editor.gui.js` controls the beta Quiz Editor. Toggle lives in Options → Quiz Editor, and we keep a minimal tooltip (`Start begins the quiz • Generate fills the editor/mirror`) on the Start button only while the editor is open.
- **Netlify Functions**: `netlify/functions/generate-quiz.js` calls providers defined in `netlify/functions/lib/providers.js`. Gemini/OpenAI share a strict prompt via `buildPrompt(...)`, and we fall back to Gemini when possible. `send-feedback.js` pipes into Gmail via nodemailer. New providers should extend `providers.js` and update ENV docs.
- **Veil**: `public/js/veil.js` now toggles `data-busy` on `<body>` so the overlay truly blocks UI. If you add new modals/FABs, check they obey the busy state.

## Local dev
- Static preview: `python3 -m http.server 8000` inside `public/` (no functions).
- Full stack: `netlify dev` from repo root; copy env vars from `ENV.md`. Use `AI_PROVIDER=echo` if you lack API keys.
- Health: `/.netlify/functions/health` when running through Netlify.

## Recent polish
- Unified UI tokens, lighter shadows, refined Options/Quiz Editor surfaces.
- Removed theme radio row from Options (theme lives in Settings modal only).
- Veil now disables the page by default; Start tooltip appears only during Quiz Editor mode.
- Difficulty selector is now a five-step slider (Very Easy → Expert) replacing the old dropdown.
- Privacy/Terms open as in-app modals instead of navigating away from the app.
- Length field gained inline steppers; generator wiring restored to use `getShowQuizEditorPreference()` so UI controls stay interactive after build tweaks.

## To-do / Handoff Notes
- If you ship visible UI tweaks, update this note and the Help/README copy so docs stay accurate.
- Keep the service worker + cache busting in sync when touching asset versions (`public/sw.js`, query strings in `index.html`).
- Next agent: append your updates here (date + highlight) so this stays a living log.

- 2025-09-19 — Added mobile comfort pass (length/difficulty pairing, IE toggle spacing) and refreshed cache-buster (v1.5.10). Veil strings restored; spinner hides cleanly on “Done”.
- 2025-09-23 — Synced AI generation with the Interactive Editor. Generator now dispatches input events so IE cards refresh automatically when quizzes load.
- 2025-09-24 — Rebalanced the generator toolbar with a responsive grid polish and wrapped the Quiz Editor panes with headers/gradients for clearer context across breakpoints.
- 2025-09-24 — Smoothed Topic autofill styling, restored footer reserve tint, and bumped cache-busters (v1.5.11) plus SW cache v120.
- 2025-09-25 — Softened global borders/focus rings, widened the generator toolbar on big phones, and shipped cache-buster v1.5.12 with SW cache v121.
- 2025-09-25 — Added client fallback to call `/.netlify/functions/generate-quiz` when `/api/generate` is missing so production keeps working even if Netlify redirects go missing.
- 2025-09-26 — Hardened AI endpoint selection: client now cycles through `/.netlify/functions/generate-quiz`, `/api/generate`, and Netlify hosts (`https://ez-quiz.netlify.app/.netlify/functions/generate-quiz`, `https://eq-quiz.netlify.app/.netlify/functions/generate-quiz`); cache-busters bumped to v1.5.14 with SW cache v123 so the fix lands instantly; CSP updated to allow both Netlify fallback domains in `connect-src`; backend default model now `gemini-2.0-flash`.

— Codex (GPT-5), 2025-02-14
