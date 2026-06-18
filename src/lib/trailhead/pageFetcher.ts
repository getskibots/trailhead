/**
 * Page metadata fetcher. Pulls <title>, <meta name="description">, and the
 * first ~500 chars of visible text for each URL. Throttled (200ms between
 * requests) and error-tolerant: a non-200 or thrown fetch is recorded, not
 * fatal, so one bad page doesn't sink a run.
 */
import { browserHeaders, fetchWithTimeout, sleep } from "./http";
import type { PageMeta } from "./types";

const THROTTLE_MS = 200;
const TEXT_PREVIEW_LEN = 500;

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decodeEntities(m[1]).trim().slice(0, 300) : "";
}

function extractDescription(html: string): string {
  // name="description" or property="og:description", attribute order-agnostic.
  const patterns = [
    /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i,
    /<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i,
    /<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']*)["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return decodeEntities(m[1]).trim().slice(0, 500);
  }
  return "";
}

function extractVisibleText(html: string): string {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  return decodeEntities(stripped).replace(/\s+/g, " ").trim().slice(0, TEXT_PREVIEW_LEN);
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

async function fetchOne(url: string): Promise<PageMeta> {
  const fetched_at = new Date().toISOString();
  try {
    const res = await fetchWithTimeout(url, { headers: browserHeaders() }, 12_000);
    if (!res.ok) {
      return { url, title: "", description: "", status: res.status, fetched_at };
    }
    const html = await res.text();
    return {
      url,
      title: extractTitle(html),
      description: extractDescription(html),
      text: extractVisibleText(html),
      status: res.status,
      fetched_at,
    };
  } catch {
    // 0 = fetch threw (DNS, timeout, TLS). Recorded so the URL still surfaces.
    return { url, title: "", description: "", status: 0, fetched_at };
  }
}

/**
 * Fetch metadata for a list of URLs, sequentially and throttled. Returns one
 * PageMeta per input URL (including failures, with status 0 or the error code).
 */
export async function fetchPageMeta(urls: string[]): Promise<PageMeta[]> {
  const out: PageMeta[] = [];
  for (const url of urls) {
    out.push(await fetchOne(url));
    await sleep(THROTTLE_MS);
  }
  return out;
}
