EZ Quiz Web

Fast, offline web quiz supporting MC, TF, YN and MT question types. No backend. Installable PWA. Keyboard friendly.

Links
- Repo: https://github.com/seanyates76/Ez-Quiz-App
- Pages (after first deploy): https://seanyates76.github.io/Ez-Quiz-App/

Run locally
1) Open `index.html` in a browser.
2) Optional: use a static server for SW/PWA (e.g. `python3 -m http.server`).

Features
- Import via file picker or drag‑drop `.txt`.
- Clear button to reset input.
- Enter to start/advance; Backspace to go back.
- Timer options (elapsed or countdown).
- Review results (missed or all) with Back to Results/Main Menu.
- PWA ready: offline app shell, maskable icons, relative paths for GitHub Pages.

Question format
Each line: `TYPE|Question|Options|Answer`
- MC: `MC|Which shape has three sides?|A) Triangle;B) Square|A`
- MC multi‑answer: `MC|Which numbers are prime?|A) 2;B) 4;C) 5;D) 9|A,C`
- TF: `TF|The Sun is a star.|T`
- YN: `YN|Is 0 an even number?|Y`
- MT: `MT|Match.|1) 22;2) 53|A) SSH;B) DNS|1-A,2-B`

Deploy to GitHub Pages
This repo includes `.github/workflows/pages.yml`. After pushing to `main`:
- GitHub Actions builds and deploys the repository to GitHub Pages automatically.
- The site will be available at `https://<user>.github.io/<repo>/`.

If Pages is not enabled yet:
1) Settings → Pages → Build and deployment → Source: “GitHub Actions”.
2) Re‑run the workflow (Actions tab → Deploy to GitHub Pages → Run workflow).

Notes
- The service worker uses relative paths and scope for subpath hosting.
- Security: user content never injected with `innerHTML`; DOM nodes are used to render results.

