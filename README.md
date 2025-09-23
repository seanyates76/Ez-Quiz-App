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
- Timer (elapsed or countdown) and theme toggle (dark/light/system) in Settings.
- Results: Missed or All, color‑coded answers, Retake (full) + Missed only.
- PWA: offline shell, maskable icons, safe‑area‑aware layout.
- Floating actions: Feedback panel + Support link.
- Help & FAQ: Sleek modal with concise Q/A format; smooth transitions; opening a new modal replaces the current one.

Interactive Editor (beta)
-------------------------
- Opt‑in, card‑based authoring for MC/TF/YN.
- Enable via Options → Advanced → “Interactive Editor (beta)”.
- Edits stay in sync with the raw Editor/Mirror; the raw parser format remains the source of truth.
- Inline validation ensures each question has a prompt and a marked correct answer.
- Default off for now to keep the classic editor front‑and‑center.

Note: A separate smoke-test page is no longer needed; test directly in Options → Advanced inside the main app.

Appearance and options
- Theme supports Dark, Light, and System (follows OS) and is managed from the Settings modal.
- Question Types are spelled out (Multiple Choice, True/False, Yes/No, Matching) and render as mobile‑friendly chips.

Question Format
Each line uses pipes and semicolons: `TYPE|Question|Options|Answer`

Parsable examples (copy as-is):
```
MC|Which shape has three sides?|A) Triangle;B) Square|A
MC|Which numbers are prime?|A) 2;B) 4;C) 5;D) 9|A,C
TF|The Sun is a star.|T
YN|Is 0 an even number?|Y
MT|Match.|1) L1;2) L2|A) R1;B) R2|1-A,2-B
```
Tip: For multiple correct answers in MC, separate letters with commas (e.g., `A,C`).

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
- Earlier: header wordmark; improved import; single‑scrollbar Help; progress bar; retake polish.

License
MIT — see `LICENSE.txt`.

Contributing & Support
- See `CONTRIBUTING.md` to file issues and PRs.
- If this project helps you, consider coffee: https://www.buymeacoffee.com/seanyates78
