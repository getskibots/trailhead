/**
 * Sitemap auto-detection + parsing.
 *
 * Detection order: robots.txt `Sitemap:` directive → common well-known paths.
 * Parsing handles both flat <urlset> sitemaps and <sitemapindex> documents
 * (recursively), and skips image-only entries.
 */
import { XMLParser } from "fast-xml-parser";
import { browserHeaders, fetchWithTimeout, normalizeDomain } from "./http";

const COMMON_PATHS = [
  "/sitemap.xml",
  "/sitemap_index.xml",
  "/wp-sitemap.xml",
  "/sitemap-index.xml",
  "/sitemap/sitemap.xml",
];

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  // Force <url>/<sitemap> to always be arrays so we don't branch on shape.
  isArray: (name) => name === "url" || name === "sitemap",
});

async function urlOk(url: string): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(url, { headers: browserHeaders() }, 8_000);
    if (!res.ok) return false;
    const ct = res.headers.get("content-type") ?? "";
    const body = await res.text();
    // Guard against soft-404s that return 200 HTML error pages.
    return ct.includes("xml") || body.trimStart().startsWith("<?xml") || body.includes("<urlset") || body.includes("<sitemapindex");
  } catch {
    return false;
  }
}

/**
 * Find a usable sitemap for a domain. Returns the sitemap URL, or null if
 * none of robots.txt or the common paths yield one.
 */
export async function autoDetectSitemap(domain: string): Promise<string | null> {
  const origin = normalizeDomain(domain);

  // 1. robots.txt
  try {
    const res = await fetchWithTimeout(`${origin}/robots.txt`, { headers: browserHeaders() }, 8_000);
    if (res.ok) {
      const txt = await res.text();
      const matches = [...txt.matchAll(/^\s*Sitemap:\s*(\S+)/gim)].map((m) => m[1].trim());
      for (const sm of matches) {
        if (await urlOk(sm)) return sm;
      }
    }
  } catch {
    // ignore, fall through to common paths
  }

  // 2. common paths
  for (const path of COMMON_PATHS) {
    const candidate = `${origin}${path}`;
    if (await urlOk(candidate)) return candidate;
  }

  return null;
}

interface SitemapXml {
  urlset?: { url?: Array<{ loc?: string; "image:loc"?: unknown }> };
  sitemapindex?: { sitemap?: Array<{ loc?: string }> };
}

/**
 * Parse a sitemap into a flat, de-duplicated list of page URLs. Follows
 * sitemap indexes recursively (bounded depth). Image-only entries are skipped.
 */
export async function parseSitemap(sitemapUrl: string, depth = 0): Promise<string[]> {
  if (depth > 3) return [];

  let xml: string;
  try {
    const res = await fetchWithTimeout(sitemapUrl, { headers: browserHeaders() }, 12_000);
    if (!res.ok) return [];
    xml = await res.text();
  } catch {
    return [];
  }

  let doc: SitemapXml;
  try {
    doc = parser.parse(xml) as SitemapXml;
  } catch {
    return [];
  }

  // Sitemap index → recurse into each child sitemap.
  if (doc.sitemapindex?.sitemap?.length) {
    const childUrls = doc.sitemapindex.sitemap
      .map((s) => s.loc?.trim())
      .filter((l): l is string => Boolean(l));
    const nested = await Promise.all(childUrls.map((u) => parseSitemap(u, depth + 1)));
    return dedupe(nested.flat());
  }

  // Flat urlset → collect <loc>, skipping image-only entries.
  if (doc.urlset?.url?.length) {
    const urls = doc.urlset.url
      .map((entry) => entry.loc?.trim())
      .filter((l): l is string => Boolean(l) && /^https?:\/\//i.test(l!));
    return dedupe(urls);
  }

  return [];
}

function dedupe(urls: string[]): string[] {
  return [...new Set(urls)];
}
