# Trailhead Lambda

Stateless OpenAI proxy for the Trailhead for Email frontend. One job: keep the OpenAI key off the public site, validate the response shape, return either a clarifying question or a fully composed staff-facing email.

## Endpoint

Single POST endpoint exposed via AWS Lambda Function URL.

**Request:**

```json
{
  "conversationHistory": [
    { "role": "guest", "text": "I'm wondering about ski lessons for my two kids next weekend." }
  ],
  "action": "next"
}
```

`action` is optional:
- `"next"` (default) — ask the next clarifying question OR compose the final email
- `"regenerate_question"` — generate a different clarifying question for the same context

**Response (question):**

```json
{ "type": "question", "question": "How old are the children?" }
```

**Response (composed email):** the structured payload defined in `system-prompt.md`.

## Environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `OPENAI_API_KEY` | yes | — | OpenAI API key for the Trailhead account |
| `OPENAI_MODEL` | no | `gpt-5.5` | Override the model |
| `ALLOWED_ORIGINS` | no | `https://getskibots.github.io,http://localhost:5173,http://localhost:4173` | Comma-separated CORS allowlist |

## Deploy

```sh
cd lambda
npm install
node ./scripts/build-zip.mjs
```

This produces `function.zip`. Upload via the AWS console or:

```sh
aws lambda update-function-code \
  --function-name trailhead \
  --zip-file fileb://function.zip
```

## Runtime

- Node 20
- Function URL with CORS (handled in code, not the AWS config — so the allowlist stays in version control)
- Recommended timeout: 30s, memory: 512 MB

## Why a separate Lambda from Sendy

`getskibots/sendy` runs the inbound parser and outbound drafter for the JHMR mailbox. Trailhead is a different product surface (public Contact Us page, real-time guest interaction) with different scaling and failure characteristics. Isolating it keeps Sendy's blast radius small and lets Trailhead iterate independently.
