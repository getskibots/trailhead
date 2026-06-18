/**
 * Run summarization — kept dependency-free (no OpenAI/fs imports) so server
 * components can compute counts without bundling the categorization pipeline.
 */
import type { CategorizationRun } from "@/data/preset-types";
import type { RunSummary } from "./types";

export function summarize(run: CategorizationRun): RunSummary {
  const counts = { existing_entry: 0, propose_new_entry: 0, multi_pass_partner: 0, skip: 0 };
  let high = 0;
  let review = 0;
  let low = 0;

  for (const m of run.matches) {
    counts[m.match_type]++;
    if (m.match_type !== "skip") {
      if (m.confidence >= 85) high++;
      else if (m.confidence >= 60) review++;
      else low++;
    }
  }

  const broken = Object.values(run.health).filter(
    (h) => h.status === 0 || h.status >= 400,
  ).length;

  return {
    url_count: run.url_count,
    existing_entry: counts.existing_entry,
    propose_new_entry: counts.propose_new_entry,
    multi_pass_partner: counts.multi_pass_partner,
    skip: counts.skip,
    broken_urls: broken,
    high_confidence: high,
    needs_review: review,
    low_confidence: low,
  };
}
