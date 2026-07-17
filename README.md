Ez-Quiz App
===========

[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/seanyates76/Ez-Quiz-App/badge?style=flat)](https://securityscorecards.dev/viewer/?uri=github.com/seanyates76/Ez-Quiz-App)
[![License](https://img.shields.io/github/license/seanyates76/Ez-Quiz-App)](LICENSE.txt)
![Production Mirror](https://img.shields.io/badge/Repo-Production%20Mirror-blue)
![JavaScript](https://img.shields.io/badge/JavaScript-ES%20Modules-f7df1e?logo=javascript&logoColor=000&labelColor=f7df1e)
![Node.js](https://img.shields.io/badge/Node.js-Netlify%20Functions-3c873a?logo=nodedotjs&logoColor=fff)
[![Netlify Status](https://api.netlify.com/api/v1/badges/35b8697e-f228-4b5f-8065-6286e05246c8/deploy-status)](https://app.netlify.com/sites/ez-quiz/deploys)

EZ Quiz is a lightweight study tool for turning topics, notes, and supported files into focused practice quizzes. Create a quiz, take it, review your results, and use explanations to understand what you missed.

**Live app:** https://ez-quiz.app/

## Release v3.5.0

This release promotes the improved quiz flow to production:

**Create Quiz → Start Quiz → Results → Explanations**

Create Quiz builds the quiz first. Start Quiz becomes available when a valid quiz is ready.

v3.5.0 also adds stronger study-material import, media import, results explanations, safer updates, and clearer result review.

## What EZ Quiz does

- Create quizzes from a topic, pasted study material, or supported imported files/media
- Import readable source material from PDF, images, TXT, Markdown, HTML, CSV, JSON, RTF, and DOCX
- Paste, import, edit, copy, or export quizzes in EZ Quiz line format or `.txt`
- Use Multiple Choice, True/False, Yes/No, and Matching question types
- Choose public quiz lengths of 5, 10, 15, or 20 questions
- Review results, retake missed questions, and request on-demand explanations
- Install the app as a PWA with cache-safe updates
- Use AI only when you choose to generate, import, or explain content

## Development and release source

This repo is the public production repo for EZ Quiz.

Runtime development happens in `seanyates76/Ez-Quiz-Dev`. Production-ready app changes are promoted here through the mirror and release workflow.

Public release docs live here. Deeper runtime setup, deployment configuration, and development workflow notes belong in the development repo.

Project policies and history live in:

- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`
- `CHANGELOG.md`
- `LICENSE.txt`

## Run locally

```bash
npm install

# Static preview
cd public
python3 -m http.server 8000
```

For the full app with Netlify Functions:

```bash
cd ..
netlify dev
```

## Troubleshooting

- If the app says an update is available, refresh to load the new build.
- If a stale build sticks around, use **Settings → Reset App** and reload.
- If generation or import fails, try a smaller source or a shorter quiz.
- If local AI features fail, check your provider configuration in the development repo.

## Contact and trust

Questions, bugs, or feedback: **ez.quizapp@gmail.com**

EZ Quiz is built to stay simple and respectful:

- no tracking
- no data sales
- AI features run only when you choose to generate, import, or explain content

The app primarily runs in the browser. Optional server-backed features are used only when invoked by the user.
