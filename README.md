# Ez-Quiz App

[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/seanyates76/Ez-Quiz-App/badge?style=flat)](https://securityscorecards.dev/viewer/?uri=github.com/seanyates76/Ez-Quiz-App)
[![License](https://img.shields.io/github/license/seanyates76/Ez-Quiz-App)](LICENSE)
[![Latest Release](https://img.shields.io/github/v/release/seanyates76/Ez-Quiz-App?include_prereleases)](https://github.com/seanyates76/Ez-Quiz-App/releases)
![Mirror](https://img.shields.io/badge/mirror-automated-blue)

A clean, production-ready quiz application designed for clarity, testability, and deployability.

## Features
- Fast, responsive UI and accessible UX
- Configurable quiz banks and scoring
- Exportable results
- CI-ready and security-scanned
- Tagged releases with changelog

## Quickstart
```bash
# Clone
git clone https://github.com/seanyates76/Ez-Quiz-App.git
cd Ez-Quiz-App

# Install + run (adjust for your stack)
# Node (example):
# npm install
# npm run dev

# Python (example):
# pip install -r requirements.txt
# uvicorn app:app --reload
```

## Tech stack
- App: TODO (React/Next.js? Svelte? FastAPI? Express?)
- CI: GitHub Actions
- Security: OpenSSF Scorecard, secret scanning

## Architecture
- Modular core with clear separation of UI, domain, and data layers
- Deterministic builds and environment-driven config

## Roadmap
- [ ] Authentication
- [ ] Results insights/analytics
- [ ] Pluggable storage backends

## Contributing
See [CONTRIBUTING](CONTRIBUTING.md) and our [Code of Conduct](CODE_OF_CONDUCT.md). Good first issues are labeled “good first issue”.

## Security
Report vulnerabilities via [SECURITY](SECURITY.md).

## License
[MIT](LICENSE)

Contact
-------
Questions or feedback? Open an issue or email ez.quizapp@gmail.com.

Highlights
----------
- Instant quizzes from a topic or pasted notes (MC, TF, YN, MT)
- Clean, responsive UI with an interactive editor + live mirror
- Results you can trust: color‑coded answers; retake full or missed only
- Installable PWA with offline shell and cache‑safe updates
- Privacy‑first: no tracking; AI calls only when you opt in
- Accessible: semantics, focus rings, keyboard flows

Tech Stack
----------
- Front end: HTML/CSS/vanilla JS (ES modules), PWA service worker
- Back end: Netlify Functions (Node, esbuild)
- Tests: Jest + jsdom; UI sweeps via Puppeteer

Security & Quality
------------------
- CodeQL static analysis on PRs and main
- OpenSSF Scorecard scheduled scans
- Dependabot for GitHub Actions

Quick Start (Local)
-------------------
- Static preview: `cd public && python3 -m http.server 8000`
- Full stack: `netlify dev` (set `AI_PROVIDER=echo` for offline)
- Tests: `npm i && npm test`; UI: `npm run ui:check`

Contributing & Policies
-----------------------
- See `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and `SECURITY.md`
- Conventional Commits encouraged; commit lint checks on PRs
- License: MIT (`LICENSE`)

Roadmap
-------
- Media input (PDF/image) with resilient fallbacks
- Answer explanations UX (accessible, non‑blocking)
- Additional UI regression checks for toolbar/results
