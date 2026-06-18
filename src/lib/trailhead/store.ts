/**
 * Prototype-grade persistence: one JSON file per bot_id under data/runs/.
 * No database — filesystem is fine for an internal single-tenant tool. For
 * production this becomes Supabase or similar (deferred).
 */
import { promises as fs } from "fs";
import path from "path";
import type { CategorizationRun } from "@/data/preset-types";

const RUNS_DIR = path.join(process.cwd(), "data", "runs");

/** Restrict bot_id to a safe filename — no path traversal. */
function safeId(botId: string): string {
  const clean = botId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  if (!clean) throw new Error("Invalid bot_id");
  return clean;
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(RUNS_DIR, { recursive: true });
}

export async function saveRun(run: CategorizationRun): Promise<void> {
  await ensureDir();
  const file = path.join(RUNS_DIR, `${safeId(run.bot_id)}.json`);
  await fs.writeFile(file, JSON.stringify(run, null, 2), "utf8");
}

export async function getRun(botId: string): Promise<CategorizationRun | null> {
  try {
    const file = path.join(RUNS_DIR, `${safeId(botId)}.json`);
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as CategorizationRun;
  } catch {
    return null;
  }
}

export async function listRuns(): Promise<CategorizationRun[]> {
  try {
    await ensureDir();
    const files = await fs.readdir(RUNS_DIR);
    const runs = await Promise.all(
      files
        .filter((f) => f.endsWith(".json"))
        .map(async (f) => {
          try {
            return JSON.parse(await fs.readFile(path.join(RUNS_DIR, f), "utf8")) as CategorizationRun;
          } catch {
            return null;
          }
        }),
    );
    return runs
      .filter((r): r is CategorizationRun => r !== null)
      .sort((a, b) => (b.completed_at ?? b.started_at).localeCompare(a.completed_at ?? a.started_at));
  } catch {
    return [];
  }
}
