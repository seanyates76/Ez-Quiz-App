Title: Fix IE toggle no-op with lazy init and stronger fallbacks

Summary
- Address reports that “Interactive Editor (beta)” toggle appears to do nothing.
- Add a belt-and-suspenders fallback that lazily initializes the IE module when the toggle is turned ON and no UI is present.
- Keep previous IE v2 improvements: direct handlers, doc-level capture for toolbar clicks, and CSS to ensure the editor is clickable while the app is locked.

Changes
- public/js/patches.js
  - New ensureIEReady(): when the toggle is ON and #interactiveEditor has no UI, dynamically import js/editor.gui.js and set the persisted on-flag so the module enables itself.
  - Maintains visibility fallback that toggles the `hidden` class on #interactiveEditor.

Existing work already on branch (context)
- IE v2 module (public/js/editor.gui.js?v=1.5.17)
  - Fresh toolbar (Add MC/TF/YN, Import from raw, Clear all)
  - Direct per-button handlers and document-capture safety to beat Options’ click-away
  - Sync to #editor/#mirror and call runParseFlow so Start enables
  - Temporary diagnostics (pointerdown/click echoes) and hotkeys M/T/Y
- CSS (public/styles.css)
  - Do not blanket-disable Options panel during quiz
  - Ensure .advanced-body #interactiveEditor has z-index:200 and pointer-events:auto
- Fallback visibility toggle (public/js/patches.js?v=1.5.3)
- SW cache list (public/sw.js) and asset versions updated as per handoff

Verification Steps
1) Serve public/: `cd public && python3 -m http.server`
2) Open Options → Advanced, check “Interactive Editor (beta)”.
   - Expect the mount to unhide and IE UI to appear (toolbar, grid, summary).
   - If UI markup is missing initially, the lazy import builds it immediately.
3) Click Add MC/TF/YN — a card appears, Editor/Mirror update, Start enables.
4) Hotkeys M/T/Y add MC/TF/YN even if pointer events are intercepted.

Edge Cases Covered
- Module not yet initialized or failed earlier: toggle ON triggers dynamic import and enables IE.
- Options click-away capture: IE doc-level capture and pointerdown handlers handle actions before close.
- Locked app state: Options/IE remain interactive; only top generator toolbar is disabled.

Risks / Notes
- If shipping to production, bump the version query for patches.js (e.g., to `?v=1.5.4`) and add it to the SW precache list, then bump `CACHE_NAME` to ensure clients pull this fallback. The current handoff used `?v=1.5.3`.
- Temporary diagnostics in editor.gui.js can be removed once confirmed stable.

Checklist
- [x] Toggle shows/hides IE mount
- [x] Toggle ON lazily initializes IE when needed
- [x] Buttons work through Options click-away and during quiz lock
- [ ] Bump patches.js version and SW cache (post-merge or in a follow-up commit)

Screenshots
- N/A (UI is unchanged; behavior fix only).

Issue
- Fixes: Interactive Editor toggle no-op when module init is delayed or blocked.

