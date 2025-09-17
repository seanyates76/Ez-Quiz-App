EZ Quiz Web
===========

[![Netlify Status](https://api.netlify.com/api/v1/badges/35b8697e-f228-4b5f-8065-6286e05246c8/deploy-status)](https://app.netlify.com/projects/eq-quiz/deploys)

Fast, offline web quiz supporting MC, TF, YN and MT. No backend. Installable PWA. Keyboard friendly.

Links
- Live: https://ez-quiz.app/
- Support: https://www.buymeacoffee.com/seanyates78

Quick Start
- Open `public/index.html` directly, or
- Serve `public/` locally for SW/PWA features: `cd public && python3 -m http.server`

Features
- Generate + Advanced Editor with Mirror; import `.txt` or paste.
- Keyboard: Enter to start/advance; Backspace to go back.
- Timer (elapsed or countdown); theme toggle (dark/light).
- Results: Missed or All, color‑coded answers, Retake (full) + Missed only.
- PWA: offline shell, maskable icons, safe‑area‑aware layout.
- Floating actions: Feedback panel + Support link.
 - Help & FAQ: Sleek modal with concise Q/A format; smooth transitions; opening a new modal replaces the current one.

Prompt Builder
- Press Ctrl/Cmd+P or use the ✨ button to copy a ready‑made AI prompt.
- Paste the AI output into the Editor; the Mirror shows raw lines.

Question Format
Each line uses pipes and semicolons: `TYPE|Question|Options|Answer`
- MC: `MC|Which shape has three sides?|A) Triangle;B) Square|A`
- MC multi: `MC|Which numbers are prime?|A) 2;B) 4;C) 5;D) 9|A,C`
- TF: `TF|The Sun is a star.|T`
- YN: `YN|Is 0 an even number?|Y`
- MT: `MT|Match.|1) L1;2) L2|A) R1;B) R2|1-A,2-B`

Deploy (Netlify)
- Repo includes `netlify.toml` for headers/caching.
- Build: none. Publish dir: `public/`.
- Use a custom domain and enable HTTPS.

Troubleshooting Updates (Mobile/PWA)
- If stuck on an old version: open with `?clear=1` (or `#clear-cache`).
- Or Settings → Reset App: clears caches and unregisters service workers.
- On iOS/Safari, you may need to remove site data and reopen once.

Changelog Highlights
- 1.3.0-beta.0: Removed FAB gradient backdrop; added Reset App and `?clear=1`/`#clear-cache`; bumped asset versions + SW cache.
- Earlier: prompt builder; header wordmark; improved import; single‑scrollbar Help; progress bar; retake polish.

License
MIT — see `LICENSE.txt`.

Contributing & Support
- See `CONTRIBUTING.md` to file issues and PRs.
- If this project helps you, consider coffee: https://www.buymeacoffee.com/seanyates78
