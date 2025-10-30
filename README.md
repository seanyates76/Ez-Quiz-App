EZ Quiz — Beautiful, Fast, Privacy‑First Quizzes
================================================

[![Live](https://img.shields.io/badge/demo-ez--quiz.app-0b7fff)](https://ez-quiz.app/) [![PWA](https://img.shields.io/badge/PWA-installable-blueviolet)](#) [![Netlify Status](https://api.netlify.com/api/v1/badges/35b8697e-f228-4b5f-8065-6286e05246c8/deploy-status)](https://app.netlify.com/projects/eq-quiz/deploys)

Create and play beautiful quizzes in seconds. Mobile‑first, keyboard‑friendly, and open source. Works great online (AI‑powered generation) and gracefully offline.

Highlights
---------
- Instant quizzes from a topic or pasted text; Multiple Choice, True/False, Yes/No, Matching
- Clean, responsive UI with an interactive Editor + live Mirror
- Results you can trust: color‑coded answers, retake full or missed only
- Installable PWA with offline shell and cache‑safe updates
- Privacy‑first: no tracking; AI calls only when you opt in
- Accessible: proper semantics, focus rings, and keyboard flows

Live + Repo
-----------
- App: https://ez-quiz.app/
- This repo: Public mirror of the dev codebase

One‑click Deploy
----------------
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/seanyates76/Ez-Quiz-App)

Quick Start (Local)
-------------------
- Static preview (no functions): `cd public && python3 -m http.server 8000`
- Full stack (Netlify Functions): `netlify dev` from the repo root
  - No keys? Set `AI_PROVIDER=echo` to run without contacting AI providers
- Tests: `npm i && npm test` (Node + jsdom); UI check: `npm run ui:check`

Architecture at a Glance
------------------------
- Client: `public/` vanilla modules (`js/*.js`) + tokens in `styles.css`
- Serverless: Netlify Functions in `netlify/functions/*`
- Generation providers: `netlify/functions/lib/providers.js` (Gemini/OpenAI) via a shared prompt; `AI_PROVIDER=echo` for offline/dev
- Beta gating: `requireBeta` on the server, `flags.js` on the client

Key Endpoints (Netlify Functions)
---------------------------------
- `/.netlify/functions/generate-quiz` → generate from topic/seed text
- `/.netlify/functions/send-feedback` → email feedback (nodemailer)
- `/.netlify/functions/health` → quick health probe

Contributing & OSS
------------------
- We welcome contributions — please read `CONTRIBUTING.md`
- Respectful participation is required — see `CODE_OF_CONDUCT.md`
- Security issues: follow `SECURITY.md`
- License: MIT (`LICENSE.txt`)

Roadmap
-------
- Media input (PDF/image) ingestion with resilient fallbacks
- Explain answers UX (graduates from beta) with accessible patterns
- Additional DOM/CSS regression checks for toolbar/results

Screenshots
-----------
Add screenshots/GIFs here to showcase the toolbar, editor, and results.

