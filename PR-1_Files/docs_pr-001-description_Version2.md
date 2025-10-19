# PR-001: Import Pipeline Hardening

This PR implements a robust import flow to prevent race conditions and stale UI updates.

Summary
- Adds ImportController to enforce latest-only updates and abort prior imports.
- Integrates magic-byte validation for PDF/JPEG/PNG/GIF before heavy work.
- Centralizes and normalizes hint/status updates; resets file input on all paths.
- Disables the import button while work is pending; re-enables when done.

Why
- Rapid consecutive imports could race and apply stale results.
- MIME-based checks are unreliable; magic bytes are safer.
- Error paths left the same file selected, causing repeated failures.

How
- Tokens gate UI updates; AbortController cancels superseded imports.
- sniffFileKind() validates file headers.
- finally blocks reset file input and control states.

Acceptance criteria
- Only the latest import updates editor and hints.
- Earlier responses are ignored; no flicker.
- File input resets on error/abort/success.
- Hints do not remain stale after success.

Test plan
- Unit tests for sniffFileKind and ImportController.
- E2E: double-trigger import → only last wins; retry clears stale errors.

Notes
- If toBase64/postIngest can’t accept AbortSignal, token checks after each await are sufficient.