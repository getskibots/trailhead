import Link from "next/link";
import { listRuns } from "@/lib/trailhead/store";
import { summarize } from "@/lib/trailhead/summary";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const runs = await listRuns();

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Categorization runs</h1>
          <p className="mt-1 text-sm text-slate-400">
            One run per bot. Ingest a resort sitemap to populate its knowledge preset.
          </p>
        </div>
      </div>

      {runs.length === 0 ? (
        <div className="card text-center">
          <p className="text-slate-400">No runs yet.</p>
          <Link href="/ingest" className="btn-primary mt-4">
            Run your first ingestion
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-700">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-850/80 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Bot</th>
                <th className="px-4 py-3 font-medium">Resort</th>
                <th className="px-4 py-3 font-medium">Preset</th>
                <th className="px-4 py-3 font-medium">URLs</th>
                <th className="px-4 py-3 font-medium">Matched</th>
                <th className="px-4 py-3 font-medium">Broken</th>
                <th className="px-4 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {runs.map((run) => {
                const s = summarize(run);
                const matched = s.existing_entry + s.propose_new_entry + s.multi_pass_partner;
                return (
                  <tr key={run.bot_id} className="hover:bg-slate-850/40">
                    <td className="px-4 py-3">
                      <Link href={`/runs/${run.bot_id}`} className="font-medium text-glacier hover:underline">
                        {run.bot_id}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{run.resort_url}</td>
                    <td className="px-4 py-3 text-slate-300">{run.preset_id}</td>
                    <td className="px-4 py-3 text-slate-300">{run.url_count}</td>
                    <td className="px-4 py-3 text-slate-300">{matched}</td>
                    <td className="px-4 py-3">
                      {s.broken_urls > 0 ? (
                        <span className="text-rose-400">{s.broken_urls}</span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(run.completed_at ?? run.started_at).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
