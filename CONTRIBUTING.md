Contributing to EZ Quiz Web
===========================

Thanks for your interest in contributing! This project is a lightweight, offline‑first PWA with no build step. Small, focused PRs are welcome.

How to contribute
- File an issue for bugs or small feature requests (use templates).
- Fork and open a pull request describing the change and rationale.
- Keep changes minimal and consistent with existing style; avoid adding dependencies.

Local setup
- No build required. Open `public/index.html`, or serve `public/` via `python3 -m http.server` to enable service worker features.

Coding guidelines
- JS: native ES modules in `public/js`, no frameworks or bundlers.
- CSS: single `public/styles.css`, prefer variables and simple rules.
- Accessibility: preserve visible focus, ARIA labels/roles, keyboard navigation.
- Security: do not inject user content with `innerHTML`.

Versioning & releases
- Update the footer version in `public/index.html`, `package.json` version, and add a `CHANGELOG.md` entry.
- Bump service worker cache and asset query strings to avoid stale clients.

Tests
- This repo doesn’t have automated tests; manual verification is expected. The CI checks version consistency across files.

Code of Conduct
- Be respectful and collaborative. See `CODE_OF_CONDUCT.md`.
