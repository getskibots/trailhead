/**
 * Preset types for Trailhead.
 *
 * SOURCE OF TRUTH: getskibots/omni-odin → src/data/parent.ts + src/data/presets/index.ts
 *
 * These types are copied here so Trailhead can run standalone during the
 * prototype phase. When Trailhead merges into omni-odin (or becomes a peer),
 * these get replaced by imports from the shared package. For now they MUST
 * stay structurally identical to the omni-odin originals so Trailhead's
 * output is drop-in compatible with applyPreset() over there.
 *
 * If you change a type here, change it in omni-odin too. Or better: settle
 * on shared types as part of the eventual merge.
 */

// ---------------------------------------------------------------------------
// Knowledge entry primitives
// ---------------------------------------------------------------------------

export type KnowledgeNoteType = 'note' | 'rule' | 'critical' | 'script' | 'faq';

export interface KnowledgeNote {
  id: string;
  type: KnowledgeNoteType;
  text: string;
}

/**
 * The atomic knowledge slot. One row in a knowledgeGroups[].entries[] array
 * OR one row in multiPass.partners[]. Trailhead's job is to populate `url`
 * (and optionally propose `notes`) on these.
 */
export interface KnowledgeUrl {
  key: string;        // stable id, snake-case (e.g., 'lift-tickets')
  label: string;      // display name (e.g., 'Lift Tickets')
  url: string;        // <-- Trailhead populates this; '' = empty
  enabled: boolean;
  notes?: KnowledgeNote[];
}

export interface KnowledgeGroup {
  id: string;         // stable group id (e.g., 'tickets')
  emoji: string;
  label: string;      // display name (e.g., 'Tickets')
  entries: KnowledgeUrl[];
}

// ---------------------------------------------------------------------------
// Partner Pass — same shape as KnowledgeUrl, distinct slot in the preset
// ---------------------------------------------------------------------------

export type PartnerPass = KnowledgeUrl;

// ---------------------------------------------------------------------------
// Realtime Flows — the action layer (GSB-built per-resort HTTP endpoints)
// ---------------------------------------------------------------------------

export interface RealtimeFlow {
  key: string;        // e.g., 'get_snow_report'
  label: string;
  enabled: boolean;
  isCustom?: boolean; // partner-declared flows; Trailhead doesn't author these
}

// ---------------------------------------------------------------------------
// The Preset itself
// ---------------------------------------------------------------------------

/**
 * A KnowledgePreset = the swappable "vertical layer" of a resort template.
 * Contains: realtime flows + knowledge groups + multi-pass partners +
 * whether the vertical uses an ecommerce doc.
 *
 * Identity, behavior pillars, boilerplate are NOT preset-owned — they're
 * cross-vertical and live elsewhere.
 */
export interface KnowledgePreset {
  id: string;                 // e.g., 'ski-resort'
  label: string;              // e.g., 'Ski Resort'
  emoji: string;
  version: string;
  description?: string;
  example?: boolean;          // true = starter/example preset, not production-validated
  flows: RealtimeFlow[];
  knowledgeGroups: KnowledgeGroup[];
  multiPass: { partners: PartnerPass[] };
  usesEcommerceDoc: boolean;
}

// ---------------------------------------------------------------------------
// Trailhead-specific types — categorization output
// ---------------------------------------------------------------------------

/**
 * Per-URL categorization result from Trailhead's GPT step.
 * Designed to be reviewable in a UI and mergeable into a KnowledgePreset.
 */
export type CategorizationMatch =
  | {
      url: string;
      title: string;
      match_type: 'existing_entry';
      group_id: string;        // matches KnowledgeGroup.id
      entry_key: string;       // matches KnowledgeUrl.key within that group
      confidence: number;      // 0-100
      reasoning: string;
    }
  | {
      url: string;
      title: string;
      match_type: 'propose_new_entry';
      group_id: string;        // best-fit group for the new entry
      proposed_key: string;    // snake-case
      proposed_label: string;
      confidence: number;
      reasoning: string;
    }
  | {
      url: string;
      title: string;
      match_type: 'multi_pass_partner';
      partner_label: string;   // matches PartnerPass.label (e.g., 'Ikon Pass')
      confidence: number;
      reasoning: string;
    }
  | {
      url: string;
      title: string;
      match_type: 'skip';
      reason: string;          // e.g., 'confirmation page', 'admin form', 'low value'
    };

/**
 * A complete categorization run for one resort against one preset.
 * Persisted per bot_id; the unit Trailhead's UI displays for review.
 */
export interface CategorizationRun {
  bot_id: string;              // BotScrew anchor
  resort_id: string;           // internal slug
  resort_url: string;
  preset_id: string;
  started_at: string;
  completed_at?: string;
  sitemap_url?: string;        // the sitemap that was used
  url_count: number;
  matches: CategorizationMatch[];
  // Health check results layered on top
  health: Record<string, { status: number; checked_at: string; redirect?: string }>;
}

/**
 * The shape Trailhead exports for ingestion into omni-odin's preset state.
 * Drop-in compatible with applyPreset() — replaces flows + knowledgeGroups
 * + multiPass with the populated versions.
 */
export interface PopulatedPreset extends KnowledgePreset {
  // Same shape as input KnowledgePreset, but with URLs filled in where
  // Trailhead matched them. Unmatched entries keep url: ''.
}
