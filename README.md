# Trailhead for Email

> AI guest intake for ski resort Contact Us forms. Turns vague submissions into clear, routed, ready-to-answer requests.

A Get Ski Bots product. Live demo: <https://getskibots.github.io/trailhead/>

## What it does

Resort Contact Us pages get messy. A guest types "I'm wondering about ski lessons for my two kids next weekend" and a vague email lands in a generic inbox — no date, no ages, no ability level, no department routing. Staff round-trip three or four times to get the info they need to actually quote and book.

Trailhead sits in front of the form. It:

- Asks smart follow-up questions before the message is sent
- Pre-fills a clean subject line
- Writes a clear, structured message body
- Identifies missing information
- Routes the request to the right department
- Returns structured data for future CRM/helpdesk integrations

The output is a polished, staff-ready email payload — Trailhead does *not* deliver the email itself. The resort's existing form pipeline (mailto, helpdesk webhook, Salesforce web-to-case, etc.) handles delivery.

## Architecture

```
[ Browser (GH Pages) ]  →→→→  [ Lambda ]  →→→→  [ OpenAI ]
        public                 holds key        returns JSON
   getskibots.github.io     (Function URL)
```

The Lambda exists only to hide the OpenAI key. Everything else — UI, conversation state, copy/send — lives in the browser.

## Repo layout

```
trailhead/
├── src/                 ← React frontend (Vite + TS + Tailwind)
│   ├── components/        ← UI: header, intake form, conversation, email preview
│   ├── lib/               ← types, API client, mock backend
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── lambda/              ← OpenAI proxy (Node 20, AWS Lambda)
│   ├── index.mjs
│   ├── system-prompt.md
│   ├── package.json
│   ├── scripts/build-zip.mjs
│   └── README.md
├── .github/workflows/   ← auto-deploy to GH Pages on push to main
├── public/
└── index.html
```

Frontend and Lambda live in the same repo but deploy independently. The Lambda runs as its own AWS function, isolated from `getskibots/sendy`.

## Development

```sh
npm install
npm run dev          # http://localhost:5173 — uses canned mock responses by default
```

To hit the real Lambda locally, set `VITE_TRAILHEAD_API_URL` in `.env.local`:

```
VITE_TRAILHEAD_API_URL=https://<your-function-url>.lambda-url.us-east-1.on.aws/
```

Visiting any URL with `?mock=1` forces the mock backend regardless of env config — handy for sales-demo fallback when the network is flaky.

## Deploy

**Frontend** — auto-deploys to GitHub Pages on every push to `main` via `.github/workflows/deploy.yml`. Vite `base` is `/trailhead/` when `GITHUB_ACTIONS=true`, `/` in dev.

**Lambda** — see [`lambda/README.md`](lambda/README.md). Build a zip and upload to AWS.

## Companion to Sendy

Trailhead and [Sendy](https://github.com/getskibots/sendy) bracket the resort's guest conversation:

- **Trailhead** polishes the outgoing question on the guest's way in.
- **Sendy** parses inbound emails and drafts the staff reply on the way out.

They share a worldview but not infrastructure. Each is its own repo, its own deployment, its own failure domain.
