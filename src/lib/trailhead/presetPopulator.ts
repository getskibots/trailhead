/**
 * Merge categorization matches into a preset, producing a PopulatedPreset that
 * is drop-in for omni-odin's applyPreset().
 *
 *   existing_entry      → set `url` on the matching entry
 *   multi_pass_partner  → set `url` on the matching partner
 *   propose_new_entry   → append a new entry to the group, flagged proposed:true
 *   skip                → ignored (lives only in the run record for review)
 *
 * When two matches target the same slot, the higher-confidence one wins.
 */
import type { CategorizationMatch, PopulatedPreset, KnowledgePreset } from "@/data/preset-types";
import type { ProposedKnowledgeUrl } from "./types";

export function populatePreset(
  preset: KnowledgePreset,
  matches: CategorizationMatch[],
): PopulatedPreset {
  // Deep clone so we never mutate the source preset.
  const out = structuredClone(preset) as PopulatedPreset;

  // Track the confidence that last set each slot, so a better match can override.
  const entryConfidence = new Map<string, number>(); // `${groupId}::${entryKey}`
  const partnerConfidence = new Map<string, number>(); // partner label

  for (const m of matches) {
    if (m.match_type === "existing_entry") {
      const group = out.knowledgeGroups.find((g) => g.id === m.group_id);
      const entry = group?.entries.find((e) => e.key === m.entry_key);
      if (!entry) continue;
      const slot = `${m.group_id}::${m.entry_key}`;
      if (m.confidence >= (entryConfidence.get(slot) ?? -1)) {
        entry.url = m.url;
        entryConfidence.set(slot, m.confidence);
      }
    } else if (m.match_type === "multi_pass_partner") {
      const partner = out.multiPass.partners.find((p) => p.label === m.partner_label);
      if (!partner) continue;
      if (m.confidence >= (partnerConfidence.get(m.partner_label) ?? -1)) {
        partner.url = m.url;
        partnerConfidence.set(m.partner_label, m.confidence);
      }
    } else if (m.match_type === "propose_new_entry") {
      const group = out.knowledgeGroups.find((g) => g.id === m.group_id);
      if (!group) continue;
      // Don't duplicate a proposed key already added to this group.
      if (group.entries.some((e) => e.key === m.proposed_key)) continue;
      const proposed: ProposedKnowledgeUrl = {
        key: m.proposed_key,
        label: m.proposed_label,
        url: m.url,
        enabled: false, // proposed entries arrive disabled; an admin enables them
        proposed: true,
        proposed_confidence: m.confidence,
        proposed_reasoning: m.reasoning,
      };
      group.entries.push(proposed);
    }
    // skip → nothing to merge
  }

  return out;
}
