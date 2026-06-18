/**
 * URL health checker. Issues requests with bounded concurrency (max 10) and
 * records status + any redirect destination. Uses GET (many resort CDNs
 * reject HEAD with 405) but without reading the body, so it stays cheap.
 */
import { browserHeaders, fetchWithTimeout } from "./http";
import type { HealthReport } from "./types";

const MAX_CONCURRENT = 10;

async function checkOne(url: string): Promise<HealthReport[string]> {
  const checked_at = new Date().toISOString();
  try {
    // redirect: "manual" lets us capture the hop; fall back to follow on opaque.
    const res = await fetchWithTimeout(
      url,
      { method: "GET", headers: browserHeaders(), redirect: "manual" },
      10_000,
    );
    const status = res.status;
    const location = res.headers.get("location");
    if (status >= 300 && status < 400 && location) {
      return { status, checked_at, redirect: location };
    }
    return { status, checked_at };
  } catch {
    return { status: 0, checked_at };
  }
}

/**
 * Health-check a list of URLs with a fixed-size worker pool. Returns a map of
 * url → { status, checked_at, redirect? }.
 */
export async function checkUrls(urls: string[]): Promise<HealthReport> {
  const report: HealthReport = {};
  const queue = [...urls];

  async function worker() {
    while (queue.length) {
      const url = queue.shift();
      if (!url) break;
      report[url] = await checkOne(url);
    }
  }

  const workers = Array.from({ length: Math.min(MAX_CONCURRENT, urls.length) }, worker);
  await Promise.all(workers);
  return report;
}
