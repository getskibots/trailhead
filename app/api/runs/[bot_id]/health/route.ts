import { NextResponse } from "next/server";
import { getRun, saveRun } from "@/lib/trailhead/store";
import { checkUrls } from "@/lib/trailhead/healthChecker";
import { summarize } from "@/lib/trailhead/summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// POST /api/runs/[bot_id]/health — re-run the health check on the run's URLs
// and persist the updated statuses.
export async function POST(_req: Request, { params }: { params: { bot_id: string } }) {
  const run = await getRun(params.bot_id);
  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const urls = [
    ...new Set(run.matches.filter((m) => m.match_type !== "skip").map((m) => m.url)),
  ];
  run.health = await checkUrls(urls);
  await saveRun(run);

  return NextResponse.json({ status: "completed", health: run.health, summary: summarize(run) });
}
