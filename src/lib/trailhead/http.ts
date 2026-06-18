/**
 * Shared outbound-fetch helpers. We present as a real browser (resorts'
 * WAFs reject obvious bots) and stay a good citizen: short timeouts so one
 * slow host can't stall a run, and the caller throttles between requests.
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export function browserHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "User-Agent": UA,
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Upgrade-Insecure-Requests": "1",
    ...extra,
  };
}

/** fetch() with a hard timeout via AbortController. */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 12_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, redirect: "follow" });
  } finally {
    clearTimeout(timer);
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Normalize a user-entered domain/URL to an origin with scheme. */
export function normalizeDomain(input: string): string {
  let s = input.trim();
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    return u.origin;
  } catch {
    return s.replace(/\/+$/, "");
  }
}
