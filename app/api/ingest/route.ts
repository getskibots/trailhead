import { NextResponse } from "next/server";
import { getPreset } from "@/data/presets";
import { runIngestion, SitemapNotFoundError, type IngestParams } from "@/lib/trailhead/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Ingestion fetches a whole sitemap + calls GPT; give it room.
export const maxDuration = 300;

// POST /api/ingest — run the full pipeline for one resort.
// Body: { bot_id, resort_url, preset_id, custom_prompt_additions? }
// OpenAI runs server-side only; the key never reaches the client.
export async function POST(req: Request) {
  let body: Partial<IngestParams>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ status: "error", error: "Invalid JSON body" }, { status: 400 });
  }

  const { bot_id, resort_url, preset_id, custom_prompt_additions } = body;
  if (!bot_id || !resort_url || !preset_id) {
    return NextResponse.json(
      { status: "error", error: "bot_id, resort_url, and preset_id are required" },
      { status: 400 },
    );
  }

  const preset = getPreset(preset_id);
  if (!preset) {
    return NextResponse.json(
      { status: "error", error: `Unknown preset_id: ${preset_id}` },
      { status: 400 },
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { status: "error", error: "OPENAI_API_KEY is not configured on the server" },
      { status: 500 },
    );
  }

  try {
    const { run, summary } = await runIngestion(
      { bot_id, resort_url, preset_id, custom_prompt_additions },
      preset,
    );
    return NextResponse.json({
      status: "completed",
      run_id: run.bot_id,
      sitemap_url: run.sitemap_url,
      summary,
    });
  } catch (err) {
    if (err instanceof SitemapNotFoundError) {
      return NextResponse.json({ status: "error", error: err.message }, { status: 422 });
    }
    const msg = err instanceof Error ? err.message : "Ingestion failed";
    return NextResponse.json({ status: "error", error: msg }, { status: 500 });
  }
}
