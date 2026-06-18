"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  CategorizationRun,
  PopulatedPreset,
  CategorizationMatch,
} from "@/data/preset-types";
import type { RunSummary, ProposedKnowledgeUrl } from "@/lib/trailhead/types";

type Tab = "groups" | "skipped" | "health";

export default function RunReview({
  run,
  populated,
  summary,
}: {
  run: CategorizationRun;
  populated: PopulatedPreset | null;
  summary: RunSummary;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("groups");
  const [rechecking, setRechecking] = useState(false);

  // Lookup: confidence + reasoning for each populated existing_entry slot.
  const matchByEntry = new Map<string, Extract<CategorizationMatch, { match_type: "existing_entry" }>>();
  const matchByPartner = new Map<string, Extract<CategorizationMatch, { match_type: "multi_pass_partner" }>>();
  for (const m of run.matches) {
    if (m.match_type === "existing_entry") matchByEntry.set(`${m.group_id}::${m.entry_key}`, m);
    if (m.match_type === "multi_pass_partner") matchByPartner.set(m.partner_label, m);
  }

  const skipped = run.matches.filter(
    (m): m is Extract<CategorizationMatch, { match_type: "skip" }> => m.match_type === "skip",
  );

  async function recheckHealth() {
    setRechecking(true);
    try {
      await fetch(`/api/runs/${encodeURIComponent(run.bot_id)}/health`, { method: "POST" });
      router.refresh();
    } finally {
      setRechecking(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary card */}
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{run.bot_id}</h1>
            <p className="mt-1 text-sm text-slate-400">
              {run.resort_url} · preset <span className="text-slate-300">{run.preset_id}</span>
            </p>
            {run.sitemap_url && (
              <p className="mt-1 text-xs text-slate-500">sitemap: {run.sitemap_url}</p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              {run.url_count} URLs · {new Date(run.completed_at ?? run.started_at).toLocaleString()}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a className="btn-primary" href={`/api/runs/${encodeURIComponent(run.bot_id)}/preset?format=download`}>
              ⬇ Download Populated Preset
            </a>
            <button className="btn-secondary" onClick={recheckHealth} disabled={rechecking}>
              {rechecking ? "Re-checking…" : "↻ Re-run Health Check"}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <Stat label="Matched" value={summary.existing_entry} hint="existing entries" />
          <Stat label="Proposed" value={summary.propose_new_entry} hint="new entries" />
          <Stat label="Partners" value={summary.multi_pass_partner} hint="multi-pass" />
          <Stat label="Skipped" value={summary.skip} />
          <Stat label="High conf." value={summary.high_confidence} tone="good" hint="≥85" />
          <Stat label="Review" value={summary.needs_review} tone="warn" hint="60–84" />
          <Stat label="Broken" value={summary.broken_urls} tone={summary.broken_urls ? "bad" : undefined} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-800">
        <TabBtn active={tab === "groups"} onClick={() => setTab("groups")}>
          By Group
        </TabBtn>
        <TabBtn active={tab === "skipped"} onClick={() => setTab("skipped")}>
          Skipped URLs ({skipped.length})
        </TabBtn>
        <TabBtn active={tab === "health"} onClick={() => setTab("health")}>
          Health
        </TabBtn>
      </div>

      {tab === "groups" && (
        <div className="space-y-4">
          {!populated ? (
            <p className="text-slate-400">Preset not available — cannot render groups.</p>
          ) : (
            <>
              {populated.knowledgeGroups.map((group) => (
                <div key={group.id} className="card">
                  <h3 className="mb-3 text-sm font-semibold text-slate-200">
                    {group.emoji} {group.label}{" "}
                    <span className="font-normal text-slate-500">({group.id})</span>
                  </h3>
                  <ul className="divide-y divide-slate-800">
                    {group.entries.map((entry) => {
                      const proposed = (entry as ProposedKnowledgeUrl).proposed === true;
                      const match = matchByEntry.get(`${group.id}::${entry.key}`);
                      const confidence = proposed
                        ? (entry as ProposedKnowledgeUrl).proposed_confidence
                        : match?.confidence;
                      const reasoning = proposed
                        ? (entry as ProposedKnowledgeUrl).proposed_reasoning
                        : match?.reasoning;
                      return (
                        <li key={entry.key} className="py-2">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <span className="text-sm text-slate-200">{entry.label}</span>
                              {proposed && (
                                <span className="ml-2 rounded bg-summit/20 px-1.5 py-0.5 text-xs text-summit">
                                  proposed
                                </span>
                              )}
                              <span className="ml-2 text-xs text-slate-500">{entry.key}</span>
                            </div>
                            {typeof confidence === "number" && <ConfidenceBadge value={confidence} />}
                          </div>
                          {entry.url ? (
                            <a
                              href={entry.url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-0.5 block truncate text-xs text-glacier hover:underline"
                            >
                              {entry.url}
                            </a>
                          ) : (
                            <span className="mt-0.5 block text-xs text-slate-600">— empty —</span>
                          )}
                          {reasoning && <p className="mt-0.5 text-xs text-slate-500">{reasoning}</p>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}

              {populated.multiPass.partners.length > 0 && (
                <div className="card">
                  <h3 className="mb-3 text-sm font-semibold text-slate-200">🎟️ Multi-Pass Partners</h3>
                  <ul className="divide-y divide-slate-800">
                    {populated.multiPass.partners.map((p) => {
                      const match = matchByPartner.get(p.label);
                      return (
                        <li key={p.key} className="py-2">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm text-slate-200">{p.label}</span>
                            {match && <ConfidenceBadge value={match.confidence} />}
                          </div>
                          {p.url ? (
                            <a
                              href={p.url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-0.5 block truncate text-xs text-glacier hover:underline"
                            >
                              {p.url}
                            </a>
                          ) : (
                            <span className="mt-0.5 block text-xs text-slate-600">— empty —</span>
                          )}
                          {match?.reasoning && <p className="mt-0.5 text-xs text-slate-500">{match.reasoning}</p>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === "skipped" && (
        <div className="card">
          {skipped.length === 0 ? (
            <p className="text-sm text-slate-400">Nothing skipped.</p>
          ) : (
            <ul className="divide-y divide-slate-800">
              {skipped.map((m, i) => (
                <li key={`${m.url}-${i}`} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 truncate text-xs text-slate-300">{m.url}</span>
                  <span className="shrink-0 rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                    {m.reason}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "health" && (
        <div className="card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="py-2 pr-3 font-medium">URL</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 font-medium">Redirect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {Object.entries(run.health).map(([url, h]) => {
                const broken = h.status === 0 || h.status >= 400;
                return (
                  <tr key={url}>
                    <td className="max-w-[28rem] truncate py-2 pr-3 text-xs text-slate-300">{url}</td>
                    <td className="py-2 pr-3">
                      <span className={broken ? "text-rose-400" : "text-emerald-400"}>
                        {h.status === 0 ? "unreachable" : h.status}
                      </span>
                    </td>
                    <td className="py-2 text-xs text-slate-500">{h.redirect ?? ""}</td>
                  </tr>
                );
              })}
              {Object.keys(run.health).length === 0 && (
                <tr>
                  <td colSpan={3} className="py-3 text-sm text-slate-400">
                    No health data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: "good" | "warn" | "bad";
}) {
  const color =
    tone === "good"
      ? "text-emerald-400"
      : tone === "warn"
        ? "text-amber-400"
        : tone === "bad"
          ? "text-rose-400"
          : "text-slate-100";
  return (
    <div className="rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2">
      <div className={`text-xl font-semibold ${color}`}>{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
      {hint && <div className="text-[10px] text-slate-600">{hint}</div>}
    </div>
  );
}

function ConfidenceBadge({ value }: { value: number }) {
  const cls =
    value >= 85
      ? "bg-emerald-500/15 text-emerald-400"
      : value >= 60
        ? "bg-amber-500/15 text-amber-400"
        : "bg-rose-500/15 text-rose-400";
  return <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${cls}`}>{value}%</span>;
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-glacier text-slate-100"
          : "border-transparent text-slate-400 hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
