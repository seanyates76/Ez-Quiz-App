# Agent Guidelines

## Scope
These instructions apply to the entire `Ez-Quiz-App` repository.

## Workflow expectations
- This project ships as a static site (`public/`) plus Netlify Functions (`netlify/functions`). There is no bundler step.
- Serve the front end with a simple HTTP server when testing (for example, `cd public && python3 -m http.server 8080`) so the service worker and cache logic behave correctly.
- Install Node dependencies with `npm install` when you need to run or update the Netlify Functions. Use `npx netlify dev` (or `npx netlify functions:serve`) to exercise handlers locally, and document any manual verification you perform.
- When introducing or mutating environment variables, document them in `ENV.md` and make sure they are plumbed through Netlify configuration if required.
- If you add or update dependencies, update both `package.json` and the generated lockfile (if present) and confirm Netlify bundling still works.
- Any time you touch user-visible behaviour, sync the help content in `public/index.html`, the footer version stamp, and relevant docs (`README.md`, `CHANGELOG.md`, etc.).

## Asset versioning and caching
- The app relies on hard cache busting. When changing `public/styles.css` or any file in `public/js/`, bump the `?v=` query strings in `public/index.html` and update the matching entries in `public/sw.js`.
- Update `public/sw.js`'s `CACHE_NAME` and precache lists whenever cached assets change so clients pull the latest files.
- Keep the service worker logic intact (navigation network-first, CSS/JS network-first, cache-first fallback for other assets) unless a change has been discussed explicitly.

## Coding standards

### Netlify Functions (`netlify/functions/**/*`)
- Use CommonJS modules with `'use strict';` at the top of each entry file.
- Match the compact formatting already in use: two-space indentation, no space before parentheses in control keywords (`if(foo)`), concise helper functions, and explicit semicolons.
- Maintain the existing CORS helpers, error shapes (`status`, `details`), and JSON response structure so the front end continues to understand responses.
- Keep shared helpers in `netlify/functions/lib/` focused and dependency-light; prefer small pure utilities over large frameworks.

### Front-end JavaScript (`public/js/**/*`)
- Preserve the lightweight module pattern: plain ES modules with named exports and the existing state helpers (`S`, `bindOnce`, etc.). No new frameworks.
- Match the current formatting (two-space indentation, no space before parentheses, prefer concise inline helpers when appropriate) and keep functions small and single-purpose.
- Use DOM helpers from `public/js/utils.js` instead of duplicating query logic, and avoid introducing global variables outside the established `S` state.

### HTML/CSS (`public/**/*.html`, `public/styles.css`)
- Follow the existing formatting: two-space indentation in multi-line blocks and condensed property listings where used.
- Maintain accessibility attributes (`aria-*`, focus order, labels) when editing markup, and ensure any new interactive element has keyboard support.
- Keep utility classes and CSS variables consistent; prefer extending existing tokens (e.g., `--fab-offset-mobile`) instead of creating new global variables.

## Documentation
- Update `README.md`, `CHANGELOG.md`, `ENV.md`, and any other relevant docs when behaviour changes in a user-visible way or when new configuration is required.
- Note any manual verification steps you performed in the PR description so reviewers understand what was exercised.
