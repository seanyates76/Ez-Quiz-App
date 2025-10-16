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

Interactive Editor (beta)
- Feature flag: toggled via checkbox in the Quiz Editor panel; persist with localStorage only.
- State: keep GUI state under `window.__EZQ__.ie` and keep it in sync with the raw Editor/Mirror.
- Scope: MC/TF/YN only. MT may be added later.
- A11y: form fields must be keyboard‑reachable; validation should not rely on color alone.

Versioning & releases
- Update the footer version in `public/index.html`, `package.json` version, and add a `CHANGELOG.md` entry.
- Bump service worker cache and asset query strings to avoid stale clients.

Tests
- This repo doesn’t have automated tests; manual verification is expected. The CI checks version consistency across files.

Local Netlify metadata
- The `.netlify/` folder is created by Netlify CLI (`netlify dev`) and is ignored by Git. It can include a `state.json` with a local `siteId` and a coarse, IP‑based geolocation snapshot used only to emulate `context.geo` in local development.
- This data is not part of the app, is never bundled or deployed, and should not be committed.
- If your tools still surface `.netlify/` changes, you can add a local exclude without touching the repo:
  - `echo .netlify >> .git/info/exclude`
- If `.netlify/` was accidentally committed in a fork, remove it from version control and recommit:
  - `git rm -r --cached .netlify && git commit -m "Remove .netlify from repo"`

Code of Conduct
- Be respectful and collaborative. See `CODE_OF_CONDUCT.md`.
