/**
 * Preset registry. Loads the JSON presets that ship with Trailhead and
 * exposes them by id. Add a vertical = drop a JSON file here and register it.
 *
 * Presets are read-only inputs — Trailhead never mutates these. The populated
 * output is a separate PopulatedPreset derived at request time.
 */
import type { KnowledgePreset } from "@/data/preset-types";
import skiResort from "./ski-resort.json";
import lodging from "./lodging.json";

// JSON imports are structurally validated against KnowledgePreset at build time.
const PRESETS: Record<string, KnowledgePreset> = {
  "ski-resort": skiResort as KnowledgePreset,
  lodging: lodging as KnowledgePreset,
};

export function listPresets(): Array<Pick<KnowledgePreset, "id" | "label" | "emoji" | "description">> {
  return Object.values(PRESETS).map((p) => ({
    id: p.id,
    label: p.label,
    emoji: p.emoji,
    description: p.description,
  }));
}

export function getPreset(id: string): KnowledgePreset | null {
  const preset = PRESETS[id];
  if (!preset) return null;
  // Return a deep clone so callers can populate without touching the source.
  return structuredClone(preset);
}

export function presetExists(id: string): boolean {
  return id in PRESETS;
}
