# Contributing to EZ-Quiz

Thanks for taking the time to contribute!  
EZ-Quiz is an open-source learning platform built to make self-directed study simple, accessible, and fun.  
We welcome code, documentation, accessibility, and design contributions from anyone aligned with those goals.

---

## 🧩 Project Overview

**Repository:** [Ez-Quiz-App](https://github.com/seanyates76/Ez-Quiz-App)  
**License:** MIT  
**Live App:** [https://ez-quiz.app](https://ez-quiz.app)

The app runs entirely in vanilla JavaScript and is deployed through Netlify.  
Structure overview:
- /public/index.html → core UI layout  
- /public/styles.css → global tokens, theme, and component styling  
- /public/app.js → main logic and quiz state system (window.__EZQ__)  
- /netlify/functions/ → serverless quiz generator & feedback endpoints  

---

## 🚀 How to Contribute

### 1. Fork & Branch
Create a feature branch from main using a clear name:  
feature/improve-parser

### 2. Scope Clearly
Keep PRs small and focused:
- HTML-only: Add or adjust DOM hooks, avoid style or logic edits.  
- CSS-only: Adjust spacing, borders, or themes.  
- JS-only: Update logic or state handling via window.__EZQ__.  

If you’re touching multiple layers (HTML/CSS/JS), split it into multiple PRs unless trivial.

### 3. Follow the House Rules
- Vanilla JS only — no frameworks or build tools.  
- Escape dynamic content with escapeHTML().  
- Use hidden and .is-open for visibility toggling.  
- Keep accessibility intact (focus outlines, tab navigation).  
- Never introduce console errors.  

### 4. Testing
Before committing:
1. Load the app locally or via Netlify Preview.  
2. Generate a quiz (topic: “test”, 5 questions).  
3. Run through keyboard navigation only.  
4. Confirm #generatedMirror output works and no UI regressions occur.

### 5. Commit & PR
Use short, conventional messages:  
feat(ui): refine results summary layout  
fix(parser): handle empty question lines gracefully

Each PR should include:
- Summary of what changed and why.  
- Files touched and scope (HTML/CSS/JS).  
- Manual test steps.  
- Screenshot or Deploy Preview link if applicable.  

---

## ✅ Acceptance Checklist

Before your PR is reviewed:
- [ ] No console errors or linter warnings  
- [ ] Keyboard navigation works  
- [ ] Layouts respect theme tokens  
- [ ] Components have visible focus states  
- [ ] window.__EZQ__ state remains stable  

---

## 💬 Communication

- Open issues for bugs, suggestions, or discussions.  
- Tag maintainers if feedback is blocking (@seanyates76).  
- Abide by our Code of Conduct (./CODE_OF_CONDUCT.md).  
- Respect Netlify preview build time — use one preview per branch.

---

## ❤️ Recognition

Every contributor is listed in the GitHub Insights graph and release changelog.  
Your contributions help make open learning better for everyone.

---

**Maintainer:** [Sean Yates](https://github.com/seanyates76)  
For direct contact or moderation issues: ez.quizapp@gmail.com
