"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface PresetOption {
  id: string;
  label: string;
  emoji: string;
  description?: string;
}

// Ingestion is a single long request (sitemap → fetch → GPT → health). We
// can't stream true progress from one fetch, so we cycle through the real
// pipeline stages on a timer to show the run is alive.
const STAGES = [
  "Detecting sitemap…",
  "Parsing URLs…",
  "Fetching page metadata…",
  "Categorizing with GPT…",
  "Health-checking URLs…",
  "Finishing up…",
];

export default function IngestForm({ presets }: { presets: PresetOption[] }) {
  const router = useRouter();
  const [botId, setBotId] = useState("");
  const [resortUrl, setResortUrl] = useState("");
  const [presetId, setPresetId] = useState(presets[0]?.id ?? "");
  const [custom, setCustom] = useState("");
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const stageTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (stageTimer.current) clearInterval(stageTimer.current);
    };
  }, []);

  function startStageTicker() {
    setStage(0);
    let i = 0;
    stageTimer.current = setInterval(() => {
      // Hold on the last stage until the request actually returns.
      i = Math.min(i + 1, STAGES.length - 1);
      setStage(i);
    }, 4000);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setRunning(true);
    startStageTicker();

    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bot_id: botId.trim(),
          resort_url: resortUrl.trim(),
          preset_id: presetId,
          custom_prompt_additions: custom.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.status === "error") {
        throw new Error(data.error || `Ingestion failed (${res.status})`);
      }
      router.push(`/runs/${encodeURIComponent(data.run_id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ingestion failed");
      setRunning(false);
      if (stageTimer.current) clearInterval(stageTimer.current);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-5">
      <div>
        <label className="label" htmlFor="botId">
          Bot ID
        </label>
        <input
          id="botId"
          className="input"
          placeholder="monarch-test"
          value={botId}
          onChange={(e) => setBotId(e.target.value)}
          required
          disabled={running}
        />
        <p className="mt-1 text-xs text-slate-500">BotScrew anchor — also the run&apos;s filename.</p>
      </div>

      <div>
        <label className="label" htmlFor="resortUrl">
          Resort URL
        </label>
        <input
          id="resortUrl"
          className="input"
          placeholder="https://skimonarch.com"
          value={resortUrl}
          onChange={(e) => setResortUrl(e.target.value)}
          required
          disabled={running}
        />
      </div>

      <div>
        <label className="label" htmlFor="presetId">
          Preset
        </label>
        <select
          id="presetId"
          className="input"
          value={presetId}
          onChange={(e) => setPresetId(e.target.value)}
          disabled={running}
        >
          {presets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.emoji} {p.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="custom">
          Custom prompt additions <span className="text-slate-500">(optional)</span>
        </label>
        <textarea
          id="custom"
          className="input min-h-[80px]"
          placeholder="Anything resort-specific the categorizer should know…"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          disabled={running}
        />
      </div>

      {error && (
        <div className="rounded-md border border-rose-700 bg-rose-950/40 px-3 py-2 text-sm text-rose-300">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={running}>
          {running ? "Running…" : "Run ingestion"}
        </button>
        {running && (
          <span className="flex items-center gap-2 text-sm text-slate-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-glacier" />
            {STAGES[stage]}
          </span>
        )}
      </div>
    </form>
  );
}
