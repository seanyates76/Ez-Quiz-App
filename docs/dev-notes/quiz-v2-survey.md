# Quiz v2 Survey — Prompt + Flow Touchpoints

## Prompt construction (server)
- `netlify/functions/lib/providers.js` centralizes prompt assembly via `buildPrompt(topic, count, types, difficulty)` before each provider call, ensuring Gemini/OpenAI share the same format.

## Line generation wiring (server)
- `netlify/functions/generate-quiz.js` calls `generateLines({ provider, model, topic, count, types, difficulty, env })` inside a timeout guard, then reuses the same call when attempting the Gemini fallback.

## UI consumption (client)
- `public/js/api.js` exports `generateWithAI(...)`, which POSTs to the Netlify function endpoints and returns an object limited to `{ title, lines }` for downstream UI modules.
