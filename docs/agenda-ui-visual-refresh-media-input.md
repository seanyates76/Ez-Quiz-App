# Agenda: UI Visual Refresh + Media Input (PDF/Images)

## Goals
- Soften “outlined wrappers” across the app; move to lighter borders, subtle elevation, and cleaner spacing.
- Refresh CSS tokens for radius, shadows, neutral surface, and brand accents (consistent across light/dark).
- Introduce a new Media Input feature to import content from PDFs and images (e.g., syllabi snapshots) to seed quiz topics/questions.
- Keep changes incremental, reversible, and well‑tested (serverless safe; no new deps unless approved).

## Design Approach (Preview)
- Tokens: add `--surface`, `--surface-2`, `--outline`, `--shadow-soft`, `--shadow-strong`, `--radius-md`, `--radius-lg`.
- Replace heavy `outline`/borders on wrappers with: subtle `border-color: var(--outline)` + `box-shadow: var(--shadow-soft)`; balanced padding.
- Button states: soften focus ring and hover shadow; keep accessible contrast.
- Footer: keep current structure; ensure CTA stays centered with dynamic reserve (already done).

## Media Input (Phase 1: UI Stub)
- New card “Import” in the Options area with drag‑drop + file picker.
- Accept types: `application/pdf`, `image/*`.
- Client‑only preview: filename, size, and small thumbnail (for images) — no parsing yet.
- Submit wires to placeholder function `/.netlify/functions/ingest-media` (to add later) with base64 payload (size‑capped) or URL.
- If function unavailable, show friendly “Not enabled” status (no errors in console).

## Serverless Plan (Phase 2, follow‑up)
- Add `ingest-media` Netlify Function:
  - Accept PDF/image (base64) or URL.
  - Extract text (future: pdf.js in function, or provider‑based OCR; to be discussed).
  - Return { text, metadata } that we’ll route to a “topic builder” step.
- Guardrails: size cap (e.g., 2–5MB), rate limit + auth (bearer or beta), timebox extraction.

## Acceptance Criteria
- Visual refresh: wrappers look lighter and more modern (consistent across states), no layout regressions on mobile.
- Media Input stub:
  - Drag‑drop zone visible; accepts files; shows a readable preview status.
  - If function is not deployed, UI surfaces “Not enabled” without breaking other flows.
- Tests: pass; iterate checks: pass.
- No blocking console errors (CSP, SW, or network) in preview.

## Implementation Plan (Incremental)
1) Tokens & Shadows
   - Introduce tokens in `public/styles.css` (keep current tokens; add new; no breaking names).
   - Migrate wrappers (toolbar card, editor card, quiz card) to soft outline + elevation.
   - Tests: CSS token presence; screenshot‑less DOM sanity.

2) Media Input UI Stub
   - Add Import card in Options (same skeleton as existing cards).
   - File input + drag‑drop; show summary; wire disabled “Send” that posts to placeholder path.
   - Tests: DOM ids present; accept attribute; graceful fallback.

3) Function Placeholder (optional in preview PR)
   - Add `ingest-media.js` returning 501 Not Implemented with JSON body and help link.
   - Wire client to display the message as an info panel.

4) Iterate & Polish
   - Run `ezq-head run iterate` and fix minor visual spacing regressions.
   - Add CSP allowances only if needed (no third‑party scripts).

## Tooling & Flow
- Use `ezq-head` tool adapter for proposal + iterate; commit via `pack` only after approval.
- Artifacts to inspect: `checks-summary.json`, `iterate-summary.json`, `ui-audit.md`.

## Risks & Mitigations
- SW cache: bump cache when touching `sw.js` or versioned assets.
- CSP drift: UI audit checks BMC connect/img; add new hosts only when necessary.
- Perf: prefer CSS‑only visual changes; no new runtime deps without approval.

## Timeline (suggested)
- PR A: Tokens + wrapper refresh + tests.
- PR B: Media Input UI stub + tests + placeholder function (optional).
- PR C: Enable extraction backend (scope TBD) and end‑to‑end tests.
