/**
 * The GPT categorization step. For each page it decides one of:
 *   existing_entry | propose_new_entry | multi_pass_partner | skip
 * against the *actual* preset structure (real group_ids / entry_keys /
 * partner_labels). The model never invents IDs for existing_entry matches —
 * we validate references and drop hallucinations.
 *
 * Output is validated with zod. Invalid batches get one stricter retry, then
 * any still-invalid matches are skipped (recorded, not fatal).
 */
import OpenAI from "openai";
import { z } from "zod";
import type { KnowledgePreset } from "@/data/preset-types";
import type { CategorizationMatch } from "@/data/preset-types";
import type { PageMeta } from "./types";

const BATCH_SIZE = 22;
const MODEL = process.env.OPENAI_MODEL || "gpt-4-turbo";

let _client: OpenAI | null = null;
function client(): OpenAI {
  // Lazy init so importing this module doesn't require the key to be set.
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

// --- zod schemas, one per match_type (discriminated union) -----------------

const matchSchema = z.discriminatedUnion("match_type", [
  z.object({
    url: z.string(),
    title: z.string().default(""),
    match_type: z.literal("existing_entry"),
    group_id: z.string(),
    entry_key: z.string(),
    confidence: z.number().min(0).max(100),
    reasoning: z.string().default(""),
  }),
  z.object({
    url: z.string(),
    title: z.string().default(""),
    match_type: z.literal("propose_new_entry"),
    group_id: z.string(),
    proposed_key: z.string(),
    proposed_label: z.string(),
    confidence: z.number().min(0).max(100),
    reasoning: z.string().default(""),
  }),
  z.object({
    url: z.string(),
    title: z.string().default(""),
    match_type: z.literal("multi_pass_partner"),
    partner_label: z.string(),
    confidence: z.number().min(0).max(100),
    reasoning: z.string().default(""),
  }),
  z.object({
    url: z.string(),
    title: z.string().default(""),
    match_type: z.literal("skip"),
    reason: z.string().default("low value"),
  }),
]);

const responseSchema = z.object({ matches: z.array(matchSchema) });

// --- prompt ----------------------------------------------------------------

export function buildSystemPrompt(preset: KnowledgePreset, customAdditions?: string): string {
  const groupsList = preset.knowledgeGroups
    .map(
      (g) =>
        `  ${g.emoji} ${g.label} (id: "${g.id}")\n    Entries:\n${g.entries
          .map((e) => `      - ${e.label} (key: "${e.key}")`)
          .join("\n")}`,
    )
    .join("\n\n");

  const partnersList = preset.multiPass.partners.length
    ? preset.multiPass.partners.map((p) => `  - "${p.label}"`).join("\n")
    : "  (none defined for this preset)";

  return `You are a ski resort website specialist categorizing URLs from a resort's sitemap into a structured knowledge schema.

You are given the resort's preset structure below. For each URL, decide:
- Does it match an existing entry within a knowledge group? (match_type: "existing_entry")
- Does it match a multi-pass partner? (match_type: "multi_pass_partner")
- Should it be added as a new entry within a group? (match_type: "propose_new_entry")
- Should it be skipped? (match_type: "skip") — for confirmation pages, admin forms, image files, thank-you pages, login pages

KNOWLEDGE GROUPS (use these group_ids and entry_keys exactly):

${groupsList}

MULTI-PASS PARTNERS (use these partner_labels exactly):

${partnersList}
${customAdditions ? `\nADDITIONAL CONTEXT FOR THIS RESORT:\n${customAdditions}\n` : ""}
For each URL, return a JSON object with a "matches" array. Each match has this shape:

{
  "url": "...",
  "title": "...",
  "match_type": "existing_entry" | "propose_new_entry" | "multi_pass_partner" | "skip",
  // For existing_entry:
  "group_id": "tickets",       // must be one of the group ids above
  "entry_key": "lift-tickets", // must be one of the entry keys in that group
  // For propose_new_entry:
  "group_id": "tickets",       // best-fit group
  "proposed_key": "season-passes-military",
  "proposed_label": "Military Season Pass",
  // For multi_pass_partner:
  "partner_label": "Ikon Pass",
  // For skip:
  "reason": "confirmation page",
  // Always (except skip): a confidence 0-100 and a one-sentence reasoning
  "confidence": 0,
  "reasoning": "one sentence why"
}

Rules:
- Return exactly one match object per input URL, preserving the input URL string verbatim.
- Use group_ids and entry_keys EXACTLY as listed above. Do not invent new IDs for existing_entry matches.
- Prefer existing_entry > propose_new_entry. Only propose new entries when no existing entry is a reasonable match.
- For propose_new_entry: pick the most relevant existing group_id, then propose a snake-case proposed_key and a clean proposed_label.
- Confidence 0-100 reflects how sure you are this is the right match.
- Skip generously: confirmation pages, thank-you pages, login/admin pages, image-only URLs, and language redirects all get skip.
- Reasoning is one short sentence — for human review.`;
}

function buildUserPrompt(pages: PageMeta[]): string {
  const lines = pages.map((p, i) => {
    const parts = [`${i + 1}. ${p.url}`];
    if (p.title) parts.push(`   title: ${p.title}`);
    if (p.description) parts.push(`   description: ${p.description}`);
    if (p.text) parts.push(`   text: ${p.text}`);
    if (p.status && p.status !== 200) parts.push(`   http_status: ${p.status}`);
    return parts.join("\n");
  });
  return `Categorize these ${pages.length} URLs. Return one match per URL.\n\n${lines.join("\n\n")}`;
}

// --- reference validation ---------------------------------------------------

function buildIndex(preset: KnowledgePreset) {
  const groupEntries = new Map<string, Set<string>>();
  for (const g of preset.knowledgeGroups) {
    groupEntries.set(g.id, new Set(g.entries.map((e) => e.key)));
  }
  const partners = new Set(preset.multiPass.partners.map((p) => p.label));
  return { groupEntries, partners };
}

/** True if a validated match also references real IDs in the preset. */
function referencesValid(
  match: CategorizationMatch,
  idx: ReturnType<typeof buildIndex>,
): boolean {
  switch (match.match_type) {
    case "existing_entry":
      return idx.groupEntries.get(match.group_id)?.has(match.entry_key) ?? false;
    case "propose_new_entry":
      return idx.groupEntries.has(match.group_id);
    case "multi_pass_partner":
      return idx.partners.has(match.partner_label);
    case "skip":
      return true;
  }
}

// --- batch call -------------------------------------------------------------

async function categorizeBatch(
  pages: PageMeta[],
  systemPrompt: string,
  idx: ReturnType<typeof buildIndex>,
): Promise<CategorizationMatch[]> {
  const run = async (stricter: boolean): Promise<CategorizationMatch[]> => {
    const sys = stricter
      ? `${systemPrompt}\n\nIMPORTANT: Your previous response had invalid entries. Use ONLY the exact group_ids, entry_keys, and partner_labels listed above. If unsure, use match_type "skip". Return valid JSON only.`
      : systemPrompt;

    const completion = await client().chat.completions.create({
      model: MODEL,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: sys },
        { role: "user", content: buildUserPrompt(pages) },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = responseSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return [];
    // Keep only matches whose references actually exist in the preset.
    return parsed.data.matches.filter((m) => referencesValid(m, idx)) as CategorizationMatch[];
  };

  try {
    const first = await run(false);
    // Retry once if the batch came back empty or clearly short of one-per-URL.
    if (first.length >= Math.ceil(pages.length * 0.5)) return first;
    const second = await run(true);
    return second.length > first.length ? second : first;
  } catch {
    // One retry on hard failure (rate limit, transient), then give up on batch.
    try {
      return await run(true);
    } catch {
      return [];
    }
  }
}

/**
 * Categorize all pages against the preset. Batches of ~22, sequential to
 * respect rate limits. Returns the flat list of validated matches.
 */
export async function categorize(
  pages: PageMeta[],
  preset: KnowledgePreset,
  customAdditions?: string,
): Promise<CategorizationMatch[]> {
  const systemPrompt = buildSystemPrompt(preset, customAdditions);
  const idx = buildIndex(preset);
  const out: CategorizationMatch[] = [];

  for (let i = 0; i < pages.length; i += BATCH_SIZE) {
    const batch = pages.slice(i, i + BATCH_SIZE);
    const matches = await categorizeBatch(batch, systemPrompt, idx);
    out.push(...matches);
  }
  return out;
}
