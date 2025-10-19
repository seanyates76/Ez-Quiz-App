# PR-001: Import Pipeline Hardening

Goal
- Eliminate race conditions when users trigger multiple imports.
- Ensure UI state (hints/status/editor) reflects only the latest import.
- Reset the file input on all non-success paths (error/abort/timeout) so users aren’t stuck with the same file.
- Centralize hint/status handling so stale messages don’t persist.

Out of scope
- Drag/drop listener cleanup (handled separately).
- Accessibility label updates and keyboard trap fixes (later PR).
- New feature work.

Affected areas
- generator.js (import UI and handlers)
- Helpers used in import (toBase64, postIngest, runParseFlow, etc.)

High-level approach
1) Introduce an ImportController to enforce “latest-only” semantics:
   - Each import gets a monotonically increasing token (importId).
   - Abort any in-flight work when a new import starts (AbortController).
   - UI updates apply only if token is current.
   - Disable the import trigger while pending (or queue one, optional).

2) Validate input early and consistently:
   - Fail fast on unsupported file types using magic-byte checks (PDF/JPEG/PNG/GIF).
   - Only proceed to heavy async work if validation passes.

3) Make error paths safe and self-healing:
   - Reset file input on all error/abort paths (finally).
   - Clear stale hints when a new attempt starts or on a successful completion.
   - Use a single “setHint/clearHint” flow so messages don’t get stuck.

Acceptance criteria
- Triggering two imports rapidly results in only the most recent import updating the editor and hints.
- Earlier import’s responses are ignored (no flicker or “late” overwrite).
- The import button is disabled while an import is pending, then re-enabled.
- The file input resets on error, abort, or success.
- Hints don’t get stuck in an error state after a successful retry.

Test plan

Unit tests
- sniffFileKind detects pdf/jpeg/png/gif headers and returns unknown for others.
- ImportController: start() aborts previous, tokens increase, isCurrent gating works.
- handleImportFile:
  - With two sequential calls, only the second updates UI/editor.
  - On error/abort, file input is cleared and button re-enabled.

Integration/E2E tests
- Double-click import quickly → final UI reflects only the last file.
- Retry after an error → stale error hint is cleared on the next attempt and success hint shows.
- Abort scenario (start new import before previous finishes) doesn’t mis-update editor.

Dev notes
- If toBase64 or postIngest cannot accept AbortSignal, rely on isCurrent(token) checks after each await.
- If desired, keep the last hint (success/error). Otherwise, clear in finally for a neutral UI.

Checklist
- [ ] ImportController added and wired
- [ ] Button disabled/enabled correctly
- [ ] Magic-byte validation integrated
- [ ] UI updates gated by isCurrent(token)
- [ ] fileInput reset in finally
- [ ] Tests added/updated
- [ ] PR description references this spec and includes screenshots of behavior