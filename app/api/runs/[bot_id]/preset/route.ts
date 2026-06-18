import { NextResponse } from "next/server";
import { getRun } from "@/lib/trailhead/store";
import { getPreset } from "@/data/presets";
import { populatePreset } from "@/lib/trailhead/presetPopulator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/runs/[bot_id]/preset — the PopulatedPreset derived from the run.
// ?format=json (default) | ?format=download (triggers a file download)
export async function GET(req: Request, { params }: { params: { bot_id: string } }) {
  const run = await getRun(params.bot_id);
  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const preset = getPreset(run.preset_id);
  if (!preset) {
    return NextResponse.json({ error: `Preset ${run.preset_id} no longer exists` }, { status: 500 });
  }

  const populated = populatePreset(preset, run.matches);
  const format = new URL(req.url).searchParams.get("format");

  if (format === "download") {
    const filename = `${run.bot_id}.${run.preset_id}.populated.json`;
    return new NextResponse(JSON.stringify(populated, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  return NextResponse.json(populated);
}
