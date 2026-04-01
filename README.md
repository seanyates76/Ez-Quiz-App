Ez-Quiz App
===========

[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/seanyates76/Ez-Quiz-App/badge?style=flat)](https://securityscorecards.dev/viewer/?uri=github.com/seanyates76/Ez-Quiz-App)
[![License](https://img.shields.io/github/license/seanyates76/Ez-Quiz-App)](LICENSE.txt)
![Production Mirror](https://img.shields.io/badge/Repo-Production%20Mirror-blue)
![JavaScript](https://img.shields.io/badge/JavaScript-ES%20Modules-f7df1e?logo=javascript&logoColor=000&labelColor=f7df1e)
![Node.js](https://img.shields.io/badge/Node.js-Netlify%20Functions-3c873a?logo=nodedotjs&logoColor=fff)
[![Netlify Status](https://api.netlify.com/api/v1/badges/35b8697e-f228-4b5f-8065-6286e05246c8/deploy-status)](https://app.netlify.com/sites/ez-quiz/deploys)

Ez-Quiz is a lightweight quiz app for generating, editing, and playing quizzes in a fast, keyboard-friendly interface.

It is built to be:
- fast and lightweight
- accessible and keyboard-friendly
- privacy-respecting
- easy to use without account friction

Live app
--------
- https://ez-quiz.app/

Features
--------
- Generate quizzes from a topic
- Create and edit quizzes manually
- Multiple formats: Multiple Choice, True/False, Yes/No, Matching
- Installable PWA with cache-safe updates
- Clear results with retake support
- Optional AI-assisted generation and explanation flows

What this repo is
-----------------
This is the **production mirror** for Ez-Quiz.

- **Production repo:** `seanyates76/Ez-Quiz-App`
- **Development source repo:** `seanyates76/Ez-Quiz-Dev`

The app and dependency baseline originate upstream in the development repo and are mirrored here through a filtered sync. This repository exists as the public-facing production/project surface.

Quick start
-----------
```bash
npm install

# Static preview
cd public && python3 -m http.server 8000

# Full local app with Netlify functions
cd ..
netlify dev

# Tests
npm test
npm run ui:check
```

Architecture
------------
- **Front end:** HTML, CSS, vanilla JS ES modules under `public/`
- **Back end:** Netlify Functions under `netlify/functions/`
- **Entry point:** `public/index.html`
- **Client modules:** `public/js/*`
- **Provider logic:** `netlify/functions/lib/providers.js`

Key endpoints
-------------
- `/.netlify/functions/generate-quiz` — generate from topic or seed text
- `/.netlify/functions/send-feedback` — feedback mailer
- `/.netlify/functions/health` — health probe

Environment
-----------
See `ENV.md` for setup details.

Common variables:
- `AI_PROVIDER` = `gemini` | `openai` | `echo`
- provider API keys as needed
- feedback mailer variables for Netlify Functions

Security and quality
--------------------
- Dependabot security updates enabled
- Secret scanning and push protection enabled
- CodeQL and OpenSSF Scorecard workflows enabled

Contributing & policies
-----------------------
- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`
- `CHANGELOG.md`
- License: MIT (`LICENSE.txt`)

Contact
-------
Open an issue or email **ez.quizapp@gmail.com**.

**Trust matters**  
Zero tracking. Zero data sales. AI runs only when explicitly invoked.
