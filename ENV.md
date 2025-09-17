Environment Configuration
=========================

Netlify Functions
-----------------

Required for feedback mailer:
- FEEDBACK_EMAIL: Gmail address used to send/receive feedback
- FEEDBACK_PASS: App password for the Gmail account (not your login password)

Optional security:
- ALLOWED_ORIGINS: Comma‑separated list of allowed origins for CORS, e.g.
  - `https://ez-quiz.app,https://staging.ez-quiz.app`
  - Leave empty to allow all origins (not recommended).

AI Generation providers (optional):
- AI_PROVIDER: `gemini`, `openai`, or `echo`
- GEMINI_API_KEY: Google Generative AI key
- GEMINI_MODEL: e.g. `gemini-1.5-flash`
- OPENAI_API_KEY: OpenAI API key
- OPENAI_MODEL: e.g. `gpt-4o-mini`

Notes
- Update Netlify env vars under Site Settings → Environment.
- After changing env vars, trigger a redeploy.
