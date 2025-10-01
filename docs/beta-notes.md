# QUIZ_RESPONSE Branch Rollout

This branch gates the structured quiz response pipeline behind the `QUIZ_RESPONSE` environment flag so we can validate v2 without affecting production.

## Enabling the flag

| Scenario            | Steps |
|---------------------|-------|
| **Netlify branch deploy** | Set `QUIZ_RESPONSE=v2` in the branch context. Example: `netlify env:set QUIZ_RESPONSE v2 --context=branch:mcp-implementation`. |
| **Local Netlify dev** | Run `QUIZ_RESPONSE=v2 netlify dev` (or add it to `.env`). |
| **One-off CLI call**  | Prefix the function invocation: `QUIZ_RESPONSE=v2 curl http://localhost:8888/.netlify/functions/generate-quiz`. |

The existing `/beta` edge route still sets the `FEATURE_FLAGS=beta` cookie for UI affordances, but the structured response path is controlled solely by the environment variable above.

## Legacy fallback (`format=legacy-lines`)

- Add `?format=legacy-lines` (or include it in the POST body) to force the function to return the original `title`/`lines` payload even when `QUIZ_RESPONSE` is enabled.
- Prefer this when coordinating with consumers that have not yet adopted the JSON schema.
- Log `{ error, details, fallback: { tried: 'legacy' } }` with a `[quiz-v2][fallback]` prefix so we can audit usage.

## Rollout checklist

1. Enable the flag only on the `mcp-implementation` branch context until QA signs off.
2. Shadow traffic: fetch both JSON and legacy formats and compare normalized results using `normalizeQuizV2`.
3. Monitor Netlify logs for `[quiz-v2]` warnings (validation failures, fallbacks, chunk exhaustion).
4. When ready to graduate, add `QUIZ_RESPONSE=v2` to production context and remove the branch override.
5. Update `agents.md` and release notes to announce the schema once the beta flag is removed.
