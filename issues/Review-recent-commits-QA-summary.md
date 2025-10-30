# Review: recent commits QA summary

## Commits / PRs reviewed (last 7 days)
- `2412352` (PR #67) — accessibility polish: added `public/js/a11y-announcer.js`, wired announcer + drag-drop cleanup in `public/js/generator.js`, refreshed cache-busters in `public/index.html`, `public/js/main.js`, `public/js/editor.gui.js`, and `public/sw.js`.
- `278f875` (PR #65) / `62873a4` (PR #66) — drag/drop helper + beta gating adjustments (`public/js/drag-drop.js`, `public/js/generator.js`).
- Direct commits `e159c80`, `e952e9a`, `1c40c81`, `067972a`, `18abc85` — beta routing and auto-refresh updates in `public/js/main.js`, `public/js/modals.js`, `public/js/settings.js`, `public/js/auto-refresh.js`, and `netlify/edge-functions/beta.ts`.

## Checklist results
| Layer | Status | Notes |
| --- | --- | --- |
| HTML | ✅ Pass | Cache-buster refresh kept IDs/hooks intact. Help/Settings/Results anchors unchanged. |
| CSS | ✅ Pass | No new CSS in this window; existing tokens unaffected. |
| JS | ⚠️ Fail (Addressed) | PR #67 logic routes through existing modules; drag/drop helper disposes cleanly; beta redirects (`public/js/main.js`) work. However commit `18abc85` cleared the Settings-modal redirect hook, so enabling Beta no longer navigates to `/beta`. Fix provided in this PR by restoring the pending redirect handler (`public/js/modals.js`) and covering backdrop dismissals. |
| Netlify | ✅ Pass | `netlify/edge-functions/beta.ts` now uses `context.next()`; headers preserved. |

## Testing / Verification
- ✅ `npm test --silent`
- Manual Deploy Preview: not run (changes validated via static review; bug reproduced analytically).

## Outcome / Next steps
- Opened fix PR: restores Settings close redirect handling so Beta enablement navigates to `/beta` again.
