import Link from "next/link";
import { notFound } from "next/navigation";
import { getRun } from "@/lib/trailhead/store";
import { getPreset } from "@/data/presets";
import { populatePreset } from "@/lib/trailhead/presetPopulator";
import { summarize } from "@/lib/trailhead/summary";
import RunReview from "./RunReview";

export const dynamic = "force-dynamic";

export default async function RunPage({ params }: { params: { bot_id: string } }) {
  const run = await getRun(params.bot_id);
  if (!run) notFound();

  const preset = getPreset(run.preset_id);
  const populated = preset ? populatePreset(preset, run.matches) : null;
  const summary = summarize(run);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-slate-400 hover:text-slate-200">
          ← All runs
        </Link>
      </div>
      <RunReview run={run} populated={populated} summary={summary} />
    </div>
  );
}
