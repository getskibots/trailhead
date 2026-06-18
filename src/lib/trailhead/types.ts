/**
 * Trailhead pipeline-internal types. The omni-odin-mirrored types live in
 * src/data/preset-types.ts and must not be touched; these are Trailhead's own
 * working shapes for the sitemap → fetch → categorize → health pipeline.
 */
import type { KnowledgeUrl } from "@/data/preset-types";

/** One page's fetched metadata. status is the HTTP status from the GET. */
export interface PageMeta {
  url: string;
  title: string;
  description: string;
  text?: string; // first ~500 chars of visible text, used to help categorization
  status: number;
  fetched_at: string;
}

/** Per-URL health result. Mirrors CategorizationRun.health value shape. */
export interface HealthResult {
  status: number;
  checked_at: string;
  redirect?: string;
}

export type HealthReport = Record<string, HealthResult>;

/**
 * A KnowledgeUrl in a PopulatedPreset that Trailhead added (not in the source
 * preset). preset-types.ts can't be edited, so the proposed marker lives here.
 */
export interface ProposedKnowledgeUrl extends KnowledgeUrl {
  proposed: true;
  proposed_confidence?: number;
  proposed_reasoning?: string;
}

/** High-level summary returned by the ingest endpoint and shown in the UI. */
export interface RunSummary {
  url_count: number;
  existing_entry: number;
  propose_new_entry: number;
  multi_pass_partner: number;
  skip: number;
  broken_urls: number;
  high_confidence: number; // >= 85
  needs_review: number; // 60–84
  low_confidence: number; // < 60
}
