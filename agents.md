# Codex Welcome — EZ Quiz Web

Hey future helper! This repo ships the [ez-quiz.app](https://ez-quiz.app) PWA plus a few Netlify Functions. It’s a static front end under `public/` (vanilla ES modules) with serverless handlers in `netlify/functions/` for quiz generation and feedback email.

## Orientation
- **Entry point**: `public/index.html` loads slim modules from `public/js/`. State lives in `public/js/state.js`; the generator wiring is in `public/js/generator.js` and delegates to `public/js/api.js` (prefers `/.netlify/functions/generate-quiz`, falls back to `/api/generate`).
- **Styling**: global tokens set in `public/styles.css` (see top-of-file CSS variables); cards/toolbars/veils use shared radius + shadow tokens (`--radius-*`, `--shadow-*`). Keep those consistent when you tweak UI.
- **Quiz Editor**: `public/js/editor.gui.js` controls the Quiz Editor (now a main feature). Toggle lives in Options → Quiz Editor. The Start button shows a brief tooltip when the editor is open (`Start begins the quiz • Generate fills the editor/mirror`).
- **Netlify Functions**: `netlify/functions/generate-quiz.js` calls providers defined in `netlify/functions/lib/providers.js`. Gemini/OpenAI share a strict prompt via `buildPrompt(...)`, and we fall back to Gemini when possible. `send-feedback.js` pipes into Gmail via nodemailer. New providers should extend `providers.js` and update ENV docs.
- **Veil**: `public/js/veil.js` toggles `data-busy` on `<body>` so the overlay truly blocks UI. If you add new modals/FABs, check they obey the busy state.

## Local dev
- Static preview: `python3 -m http.server 8000` inside `public/` (no functions).
- Full stack: `netlify dev` from repo root; copy env vars from `ENV.md`. Use `AI_PROVIDER=echo` if you lack API keys.
- Health: `/.netlify/functions/health` when running through Netlify.

## Visual UI Checks (toolbar + results)

We now ship a viewport‑aware UI check that validates the generator toolbar layout at multiple widths and writes screenshots + measured metrics. It’s designed to prevent regressions where the Difficulty→Length gap grows, or the Length control visually hugs the action buttons at tablet sizes.

- Install once: `npm i` (Puppeteer is a dev dep)
- Run sweep: `npm run ui:check`
  - Artifacts: `.artifacts/ui/toolbar-<viewport>.png` + `.json` and `.artifacts/ui/results-<viewport>.png` + `.json`
  - Default widths: `360,390,414,600,640,720,768,800,820,834,912,1024,1200,1280,1366,1440`
  - Override widths: `UI_CHECK_WIDTHS=375,820,1280 npm run ui:check`
  - Notes: The runner uses a small static server; if blocked, it falls back to inline HTML+CSS (no scripts) to still measure layout. It launches Chromium with sandbox‑safe flags by default.

What it enforces
- Topic→Difficulty and Difficulty→Length wrapper gaps equal within 2px (when on the same row)
- Length→Actions wrapper gap is allowed to stretch, but never less than the field gap
- Visual gaps (interactive elements):
  - Diff→Length ≈ 10px (6–14 acceptable)
  - Length→Actions ≥ 8px (prevents “sticking”)
- Actions stay inside the toolbar (no overflow)

Results checks
- Results header wraps without horizontal overflow at small widths (e.g., 320–375)
- Page and header have no horizontal overflow in Results
- Score bar width stays within its clamp (proportional to viewport, never too small/large)
- Explain button absent in non‑beta mode (beta gating respected)

CI‑friendly: The script exits non‑zero on failure and prints a self‑diagnosing report (selectors, computed grids, gap values, y‑centers, hints) so it’s easy to spot what drifted.

## Recent polish
- 2025-10-22 — Explain (beta) moved to a localized toast (no inline ribbon). Topic input + paperclip unified as a single control with one soft focus border; hover/autofill de‑noised. Stabilized DOM tests (jsdom environment, safer HTML parsing) and used Node Blob for header‑byte tests.
- 2025-10-16 — Results Explain is strictly beta‑gated and won’t render outside beta (checked via `S.settings.betaEnabled` or `body[data-beta]`). Added a tiny dev‑only log for primary action mode changes; enable with `localStorage.setItem('EZQ_DEBUG','1')` to print `[ezq:dev] primary-action` in console.
- 2025-10-14 — Stabilize Jest (in-band); add providers/dom/css tests; ignore .artifacts (via ezq-head).
- Unified UI tokens, lighter shadows, refined Options/Quiz Editor surfaces.
- Removed theme radio row from Options (theme lives in Settings modal only).
- Veil disables the page by default; Start tooltip appears only during Quiz Editor mode.
- Difficulty selector upgraded to a five-step slider (Very Easy → Expert) replacing the old dropdown.
- Privacy/Terms open as in-app modals instead of navigating away from the app.
- Length field gained inline steppers; generator wiring restored to use `getShowQuizEditorPreference()` so UI controls stay interactive after build tweaks.
- 2025-09-19 — Mobile comfort pass; refreshed cache-buster (v1.5.10). Veil strings restored; spinner hides cleanly on “Done”.
- 2025-09-23 — Synced AI generation with the Quiz Editor. Generator dispatches input events so editor cards refresh automatically when quizzes load.
- 2025-09-24 — Rebalanced the generator toolbar (responsive grid) and wrapped editor panes with headers/gradients.
- 2025-09-24 — Smoothed Topic autofill, restored footer reserve tint, bumped cache-busters (v1.5.11) + SW cache v120.
- 2025-09-25 — Softened borders/focus rings, widened toolbar on big phones, cache-buster v1.5.12 + SW cache v121.
- 2025-09-25 — Added client fallback to `/.netlify/functions/generate-quiz` when `/api/generate` is missing.
- 2025-09-26 — Hardened AI endpoint selection; CSP connect-src allowlist for both Netlify fallbacks; backend default `gemini-2.5-flash-lite-preview-09-2025`. Cache-busters v1.5.17 + SW cache v125.
- 2025-09-27 — Removed unused legacy root assets and a stub in `settings.js`. Restored explicit Netlify fallback allowlist.
- 2025-09-30 — Quiet info bar for version/highlights. Version indicator moved into Settings. Settings defaults to prod build v3.3.
- 2025-10-01 — Quiz Editor graduated from beta to stable (main feature). Orientation/docs updated.
- 2025-10-02 — Structured quiz JSON is now opt-in via `format=quiz-json`; legacy `{ title, lines }` always included. Chunked generation helper staged for >50 questions. Footer reserve padding adjusted to avoid the gray strip on beta builds.

## Experimental / Beta Features
We sometimes ship new features in “beta” mode (same build; beta is a runtime flag).

**How to enable**  
- Visit `/beta` to set a `FEATURE_FLAGS=beta` cookie for 24h (redirects home).  
- Or toggle **Settings → Beta features** (writes `EZQ_FLAGS` in localStorage).

**How to gate code**  
- Server (Netlify Functions): import `requireBeta` from `netlify/functions/lib/betaGuard.js` and 403 if not beta.  
- Client: `import { has } from './js/flags.js'` and check `has('beta')` before mounting UI.

**Current beta features**
- **MCP integration** (`netlify/functions/mcp.ts`): Experimental MCP server entrypoint and “lazy explanations” path. This endpoint is beta-gated at the server layer and may change without notice.

**Rules**
- Beta must not break core quiz play/generation.  
- Keep accessibility parity (focus rings, keyboard nav).  
- Log beta errors with a `[beta]` prefix.  
- When a beta feature graduates, remove it from this list and add a dated note in **Recent polish**.

## To-do / Handoff Notes
- If you ship visible UI tweaks, update this note and the Help/README copy so docs stay accurate.
- Keep the service worker + cache busting in sync when touching asset versions (`public/sw.js`, query strings in `index.html`).
- Before promoting quiz v2 to end users: update the client fetch path to send `format=quiz-json`, surface the structured data in UI, and add regression tests for the new payload.
- Next exploration: story-board the explanations UI (visual spec + API hook) before wiring it up so we can document the flow alongside implementation.
- Next agent: append your updates here (date + highlight) so this stays a living log.

### Agent playbook (quick)
- Local smoke: `npm test` (Node tests + DOM/CSS sanity)
- UI snapshot sweep: `npm run ui:check` (review `.artifacts/ui/`)
- Full stack: `netlify dev` (`AI_PROVIDER=echo` if no keys)
- If the toolbar gaps regress, iterate only in `public/styles.css` within `.gen-toolbar` + `.toolbar-left` and re‑run `ui:check` until green.

— Codex (GPT-5)

## Local Head CLI (ezq-head)

Use the local Head coordinator to run sub‑agents, capture artifacts, and (optionally) request Codex proposals. Dry‑run by default; never changes files unless explicitly applied.

- Install: `cd ../ezq-dev-tools && ./scripts/install.sh`
- Quick run: `../ezq-dev-tools/bin/ezq-head run quick`
- Presets: `quick = [smoke, lint, ui, parser, repo]`, `ui-check = [ui, repo]`
- Artifacts: `../ezq-dev-tools/.ezq/runs/<run_id>/artifacts`
- App path override: `EZQ_APP_DIR=$(pwd) ../ezq-dev-tools/bin/ezq-head run quick`
- Apply mode (conflict-sim first): `../ezq-dev-tools/bin/ezq-head apply`

### Codex bridge (MCP-like toolset)

Codex (CLI) can consume a Context Packet built by the Head and return a JSON summary with proposed patch artifacts. Treat this as a tool, similar in spirit to an MCP action:

- Call: `../ezq-dev-tools/bin/ezq-head codex "<one‑sentence brief>" --timebox 120`
- Constraints: whitelist `public/`, `netlify/`, `package.json`; no installs/deletes/renames; minimal diffs
- Output: artifacts at `.ezq/runs/<run_id>/artifacts/codex/{context-packet.json,codex-output.txt}`
- The last line of `codex-output.txt` is JSON: `{ summary, proposed_diffs, verify, uncertainty, next_hint }`
- Review then apply patches manually (or wire auto‑apply later behind conflict simulation)

## Next Agent Agenda
- UI Visual Refresh: soften outlined wrappers (tokens + shadows) with accessible focus states.
- Media Input (Phase 1): PDF/Image import UI stub with drag-drop and file picker; graceful fallback if function not deployed.
- Tests: add DOM/css sanity cases for new UI; keep Jest in-band.
- See: docs/agenda-ui-visual-refresh-media-input.md
