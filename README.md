# 🥾 Trailhead

Internal GSB tool that auto-categorizes a ski resort's website URLs into our
preset knowledge structure. Output is drop-in compatible with omni-odin's
`applyPreset()`.

Given a resort URL and a `KnowledgePreset`, Trailhead:

1. **Detects the sitemap** — robots.txt → common paths → graceful fallback
2. **Fetches page metadata** — title, meta description, visible-text preview (throttled, realistic headers)
3. **Categorizes each URL with GPT** against the preset's *actual* `knowledgeGroups[].entries[]` and `multiPass.partners[]`
4. **Health-checks** matched URLs (HTTP status + redirects)
5. Produces a reviewable **`CategorizationRun`** and a downloadable **`PopulatedPreset`**

Trailhead never invents categories — it populates the slots the preset already
defines, and *proposes* new entries (flagged `proposed: true`, disabled) when
something doesn't fit.

> ℹ️ This repo previously held "Trailhead for Email" (a guest-intake demo). That
> code is preserved on the **`legacy/email-intake`** branch.

---

## Stack

Next.js 14 (App Router) · TypeScript (strict) · Tailwind · OpenAI · fast-xml-parser · zod

## Setup

```bash
npm install
cp .env.local.example .env.local   # then add your OPENAI_API_KEY
npm run dev                          # http://localhost:3000 (or `npm run dev -- --port 5174`)
```

Environment variables:

| var | required | default | notes |
|-----|----------|---------|-------|
| `OPENAI_API_KEY` | ✅ | — | server-side only, never exposed to the client |
| `OPENAI_MODEL` | | `gpt-4-turbo` | set to `gpt-5` / `gpt-4o` etc. if available |

## Usage

1. **Dashboard** (`/`) — lists all runs (one per `bot_id`).
2. **New ingestion** (`/ingest`) — enter a `bot_id`, resort URL, pick a preset,
   optionally add resort-specific prompt context, and run.
3. **Run review** (`/runs/[bot_id]`):
   - **By Group** — every preset entry with its assigned URL, confidence, and GPT reasoning. Proposed entries highlighted.
   - **Skipped URLs** — what Trailhead skipped and why.
   - **Health** — status of every matched URL, broken ones flagged.
   - **Download Populated Preset** → JSON for omni-odin.
   - **Re-run Health Check** → re-checks statuses in place.

Confidence guide: **≥85** auto-accept · **60–84** review · **<60** human decision.

## API

| route | method | purpose |
|-------|--------|---------|
| `/api/ingest` | POST | run the full pipeline (`{ bot_id, resort_url, preset_id, custom_prompt_additions? }`) |
| `/api/runs/[bot_id]` | GET | the stored `CategorizationRun` + summary |
| `/api/runs/[bot_id]/preset` | GET | the `PopulatedPreset` (`?format=download` for a file) |
| `/api/runs/[bot_id]/health` | POST | re-run the health check |
| `/api/presets` | GET | list available presets |

All OpenAI calls are server-side only.

## Storage

Prototype-grade: one JSON file per `bot_id` in `data/runs/` (gitignored). No
database. For production this becomes Supabase or similar — deferred.

## Presets

`src/data/presets/` ships two verticals:

- `ski-resort.json` — production ski preset (18 groups, 7 flows, 3 multi-pass partners)
- `lodging.json` — second vertical, for testing preset-switching

Add a vertical: drop a JSON file in `src/data/presets/` and register it in
`src/data/presets/index.ts`. The types in `src/data/preset-types.ts` mirror
omni-odin's `parent.ts` and **must not be edited** — that's what keeps the
output drop-in compatible.

## Notes & limits (v1 prototype)

- Runs are capped at **150 URLs** (`MAX_URLS` in `src/lib/trailhead/ingest.ts`).
  Monarch's sitemap, for example, has ~850 URLs (mostly blog posts); the cap keeps
  runs and OpenAI cost bounded. Raise it per-need.
- Bot-protected sites (Cloudflare — Jackson Hole, Vail Resorts) will surface
  "sitemap not accessible" and stop. A headless-browser fallback is future work.
- Multi-domain resorts (e.g. `eldora.com` + `store.eldora.com`) only ingest the
  one origin you point at — run each separately for now.
- No auth, no scheduled health checks, no direct omni-odin push — all deferred.

## Deploy

Target: `trailhead.getskibots.com` on Vercel. Set `OPENAI_API_KEY` (and optionally
`OPENAI_MODEL`) in the Vercel project env. Note that `data/runs/` is ephemeral on
Vercel's serverless filesystem — fine for single-session demos; wire durable
storage before relying on persistence in production.
