import { NextResponse } from "next/server";
import { getRun } from "@/lib/trailhead/store";
import { summarize } from "@/lib/trailhead/summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/runs/[bot_id] — the stored CategorizationRun for inspection/review.
export async function GET(_req: Request, { params }: { params: { bot_id: string } }) {
  const run = await getRun(params.bot_id);
  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }
  return NextResponse.json({ run, summary: summarize(run) });
}
