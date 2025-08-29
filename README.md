EZ Quiz Web

Netlify

[![Netlify Status](https://api.netlify.com/api/v1/badges/35b8697e-f228-4b5f-8065-6286e05246c8/deploy-status)](https://app.netlify.com/projects/eq-quiz/deploys)

Fast, offline web quiz supporting MC, TF, YN and MT question types. No backend. Installable PWA. Keyboard friendly.

Links
- Live: https://ez-quiz.app/
- Support: https://www.buymeacoffee.com/seanyates78

Run locally
1) Open `index.html` in a browser.
2) Optional: use a static server for SW/PWA (e.g. `python3 -m http.server`).

Features
- Import via file picker or drag‑drop `.txt`.
- Clear button to reset input.
- Enter to start/advance; Backspace to go back.
- Prompt builder (✨) to generate a copyable AI prompt; shortcut Ctrl/Cmd+P.
- Timer options (elapsed or countdown).
- Review results (missed or all) with Back to Results/Main Menu.
- Retake Missed Only from the Missed view.
- Compact progress bar beside counter/timer.
- PWA ready: offline app shell, maskable icons, relative paths for GitHub Pages.
 - Buy Me a Coffee widget (bottom-right) with warm beige styling.

Prompt builder
- Click the ✨ button next to the FAQ in the header (or press Ctrl/Cmd+P).
- Enter a Topic and desired Length; click Copy to place a ready‑made prompt on your clipboard.
- Paste that prompt into your AI tool (e.g., ChatGPT), then paste the generated questions into the input area.

Question format
Each line: `TYPE|Question|Options|Answer`
- MC: `MC|Which shape has three sides?|A) Triangle;B) Square|A`
- MC multi‑answer: `MC|Which numbers are prime?|A) 2;B) 4;C) 5;D) 9|A,C`
- TF: `TF|The Sun is a star.|T`
- YN: `YN|Is 0 an even number?|Y`
- MT: `MT|Match.|1) 22;2) 53|A) SSH;B) DNS|1-A,2-B`

Deploy to Netlify
- The repo includes `netlify.toml` for security headers and caching.
- Connect your repository in Netlify (or drag‑drop); build command: none; publish directory: `.`.
- Add custom domain `ez-quiz.app` and enable HTTPS.

Notes
- The service worker uses relative paths and scope for subpath hosting.
- Security: user content never injected with `innerHTML`; DOM nodes are used to render results.
- Clipboard: uses `navigator.clipboard.writeText` when available (secure contexts), with a fallback on user action.

Changelog (highlights)
- ✨ Prompt builder popover with Topic/Length and copy‑to‑clipboard.
- New header wordmark with adaptive mobile layout.
- Color‑coded status line and improved import UX (drag‑drop + clear).
- Keyboard shortcuts: Enter/Backspace and Enter‑to‑start.
- Review flow fixes + Retake Missed Only.
- Single‑scrollbar FAQ modal; Close button always visible.
- Progress bar in quiz header.

License
MIT — see `LICENSE.txt`.
Support
- If this project helps you, consider buying me a coffee: https://www.buymeacoffee.com/seanyates78
- You’ll also see a floating ☕ button in the app.
