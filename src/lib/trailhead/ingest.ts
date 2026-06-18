/**
 * Ingestion orchestrator: ties the pipeline together.
 *   sitemap detect → parse → fetch metadata → categorize (GPT) → health check
 * Produces a CategorizationRun, persists it, and returns it with a summary.
 */
import type { CategorizationMatch, CategorizationRun, KnowledgePreset } from "@/data/preset-types";
import type { RunSummary } from "./types";
import { autoDetectSitemap, parseSitemap } from "./sitemap";
import { fetchPageMeta } from "./pageFetcher";
import { categorize } from "./categorizer";
import { checkUrls } from "./healthChecker";
import { saveRun } from "./store";
import { summarize } from "./summary";
import { normalizeDomain } from "./http";

export { summarize };

// Keep prototype runs bounded — an average resort sitemap is ~60 URLs and we
// don't want a 4,000-URL enterprise sitemap to run for an hour.
const MAX_URLS = 150;

export class SitemapNotFoundError extends Error {
  constructor(domain: string) {
    super(`No accessible sitemap found for ${domain}. The site may be bot-protected (Cloudflare) or use a non-standard sitemap location.`);
    this.name = "SitemapNotFoundError";
  }
}

export interface IngestParams {
  bot_id: string;
  resort_url: string;
  preset_id: string;
  custom_prompt_additions?: string;
}

/** Which URLs get a health check: everything we categorized as a real match. */
function urlsToHealthCheck(matches: CategorizationMatch[]): string[] {
  return [
    ...new Set(matches.filter((m) => m.match_type !== "skip").map((m) => m.url)),
  ];
}

/**
 * Run the full ingestion pipeline for one resort against one preset, persist
 * the result, and return { run, summary }. Throws SitemapNotFoundError if no
 * sitemap is reachable (surfaced cleanly to the caller).
 */
export async function runIngestion(
  params: IngestParams,
  preset: KnowledgePreset,
): Promise<{ run: CategorizationRun; summary: RunSummary }> {
  const started_at = new Date().toISOString();
  const origin = normalizeDomain(params.resort_url);

  const sitemapUrl = await autoDetectSitemap(origin);
  if (!sitemapUrl) throw new SitemapNotFoundError(origin);

  let urls = await parseSitemap(sitemapUrl);
  if (urls.length === 0) throw new SitemapNotFoundError(origin);

  const truncated = urls.length > MAX_URLS;
  if (truncated) urls = urls.slice(0, MAX_URLS);

  const pages = await fetchPageMeta(urls);
  // Only categorize pages that actually loaded; dead URLs become skips implicitly.
  const livePages = pages.filter((p) => p.status === 200);

  const matches = await categorize(livePages, preset, params.custom_prompt_additions);

  // Add explicit skips for pages that failed to load, so nothing silently vanishes.
  const matchedUrls = new Set(matches.map((m) => m.url));
  for (const p of pages) {
    if (p.status !== 200 && !matchedUrls.has(p.url)) {
      matches.push({
        url: p.url,
        title: p.title,
        match_type: "skip",
        reason: p.status === 0 ? "fetch failed" : `http ${p.status}`,
      });
    }
  }

  const health = await checkUrls(urlsToHealthCheck(matches));

  const run: CategorizationRun = {
    bot_id: params.bot_id,
    resort_id: deriveResortId(origin),
    resort_url: origin,
    preset_id: params.preset_id,
    started_at,
    completed_at: new Date().toISOString(),
    sitemap_url: sitemapUrl,
    url_count: urls.length,
    matches,
    health,
  };

  await saveRun(run);
  return { run, summary: summarize(run) };
}

function deriveResortId(origin: string): string {
  try {
    return new URL(origin).hostname.replace(/^www\./, "").replace(/\./g, "-");
  } catch {
    return origin.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  }
}
