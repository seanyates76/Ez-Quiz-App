# Quiz v2 JSON Schema

The quiz normalizer (`normalizeQuizV2`) emits a lightweight JSON payload that the UI and MCP tools can consume without relying on plain-text line parsing. Opt in by sending `format=quiz-json` (query parameter, request body, or `x-quiz-format` header). Without the flag the function returns only the legacy `{ title, lines }` payload.

## Top-level object

```json
{
  "title": "",
  "topic": "",
  "questions": []
}
```

| Field    | Type        | Notes                                                                 |
|----------|-------------|-----------------------------------------------------------------------|
| `title`  | string      | Human-readable quiz title. Empty string when the provider omits it. Returned alongside structured data so legacy consumers continue to function. |
| `topic`  | string      | Topic label derived from the request or upstream payload.            |
| `questions` | array<Question> | Ordered list of normalized questions. Limited to the requested `count`. |

> **Normalization:** Both `title` and `topic` are trimmed and whitespace-collapsed. When the upstream payload omits `topic`, we use the request topic to keep downstream analytics stable.

## Question model

Each question includes a `type` discriminator plus type-specific fields. Shared properties:

| Field     | Type   | Notes                                                        |
|-----------|--------|--------------------------------------------------------------|
| `type`    | enum   | One of `MC`, `TF`, `YN`, `MT` (uppercase).                   |
| `prompt`  | string | Trimmed stem text. Validation drops questions with no prompt.|

### Multiple Choice (`MC`)

```json
{
  "type": "MC",
  "prompt": "Which bias describes seeking information that confirms existing beliefs?",
  "options": [
    "Confirmation bias",
    "Anchoring",
    "Availability heuristic",
    "Framing"
  ],
  "correct": [0]
}
```

* `options`: Array of trimmed strings (minimum 2, maximum 8). The normalizer strips leading `A)`, `B)` markers and collapses whitespace.
* `correct`: Array of **0-based** option indexes (sorted ascending, duplicates removed). For single-answer questions this will contain exactly one element; multiple answers are supported when the upstream payload specifies them.

### True/False (`TF`)

```json
{
  "type": "TF",
  "prompt": "Working memory capacity equals long-term memory capacity.",
  "correct": false
}
```

* `correct`: Boolean. Strings like `"T"`, `"true"`, `"yes"`, or numeric representations are coerced accordingly.

### Yes/No (`YN`)

```json
{
  "type": "YN",
  "prompt": "Is the hippocampus primarily involved in forming new memories?",
  "correct": true
}
```

* `correct`: Boolean. Providers that return `"Y"/"N"`, `"yes"/"no"`, or truthy numbers are coerced to a boolean.

### Matching (`MT`)

```json
{
  "type": "MT",
  "prompt": "Match each study design with its hallmark characteristic.",
  "left": [
    "Randomized control trial",
    "Cohort study",
    "Case study"
  ],
  "right": [
    "Participants randomly assigned to intervention or control.",
    "Observes a group with shared characteristics over time.",
    "In-depth examination of a single subject or small group."
  ],
  "matches": [
    [0, 0],
    [1, 1],
    [2, 2]
  ]
}
```

* `left`: Trimmed list of clue strings. Empty entries are discarded.
* `right`: Trimmed list of target strings. Empty entries are discarded.
* `matches`: Array of `[leftIndex, rightIndex]` pairs. Indices are 0-based, duplicates removed, and only retained when both sides fall within range. The normalizer ensures each `left` index appears at most once; questions without a complete set of pairs are dropped.

## Legacy fallback

If the upstream payload is line-based (`MC|prompt|…`), malformed JSON, or empty, the normalizer falls back to `normalizeLegacyLines` and `quizFromLegacyLines`, producing the same structure as above. A failure to extract any valid questions results in an `ERR_INVALID_QUIZ` or `NO_QUESTIONS` error, allowing the caller to retry or surface a 502.

## Guarantees

1. All strings are trimmed and internal whitespace collapsed.
2. Questions outside the requested `types` set are dropped.
3. The result never contains more than the requested `count` questions.
4. Unsupported question formats are ignored rather than causing a hard failure.
5. When the payload cannot be normalized, the function throws with `code` metadata so callers can log `[quiz-v2]` warnings and fall back to legacy output.
6. Even for `format=quiz-json` requests, the legacy `{ title, lines }` payload is emitted alongside the structured object.

Use this schema when building client renderers, MCP tool integrations, or automated QA harnesses for the v2 quiz pipeline.
