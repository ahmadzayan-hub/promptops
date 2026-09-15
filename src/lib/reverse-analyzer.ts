/**
 * Reverse mode — paste a polished prompt and learn what makes it good.
 *
 * Pure-function analyser, no I/O. Reuses scorePrompt for the dimensional
 * breakdown and adds a structural skeleton so the user sees:
 *
 *   - which sections the prompt has (Goal, Audience, Format, Constraints, …)
 *   - how the prompt opens and closes (role / CTA)
 *   - one specific suggestion for the weakest dimension
 *
 * Output is plain data; the renderer lives in components/ReverseMode.tsx.
 */

import { scorePrompt, type QualityBreakdown } from "@/lib/quality-score";
import { detectIntentLocal, type Intent } from "@/lib/local-engine";

const SECTION_RE = /^\s*(?:#{1,4}\s+|<\w+>|[A-Z][A-Za-z][A-Za-z ]{1,28}:)\s*([^\n]+)/gm;

const KNOWN_LABELS: Array<{ re: RegExp; key: string }> = [
  { re: /\b(role|act as|you are)\b/i,                 key: "role" },
  { re: /\b(context|background)\b/i,                  key: "context" },
  { re: /\b(goal|task|objective|requirement)\b/i,     key: "goal" },
  { re: /\b(audience|reader|persona)\b/i,             key: "audience" },
  { re: /\b(format|output|return|deliverable)\b/i,    key: "format" },
  { re: /\b(constraints?|limit|do not|avoid|do(?: |n't))\b/i, key: "constraints" },
  { re: /\b(examples?|few[- ]?shot|sample)\b/i,       key: "examples" },
  { re: /\b(success|criteria|done when|measure)\b/i,  key: "success" },
  { re: /\b(tone|style|voice|mood)\b/i,               key: "tone" }
];

export interface ReverseAnalysis {
  intent: Intent;
  intentConfidence: number;
  score: QualityBreakdown;
  sections: string[];           // detected section labels (deduped, ordered)
  hasRole: boolean;
  hasCta: boolean;
  weakestDimension: keyof Omit<QualityBreakdown, "total" | "tier">;
  weakestSuggestion: string;    // localisable hint key, e.g. "lint.hint.audience"
  wordCount: number;
  paragraphCount: number;
}

function extractSections(text: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  // 1) Markdown headings + "Label:" lines
  let m: RegExpExecArray | null;
  const reCopy = new RegExp(SECTION_RE.source, "gm");
  while ((m = reCopy.exec(text))) {
    const raw = m[0].trim().replace(/[#:<>]+/g, " ").replace(/\s+/g, " ").trim();
    const key = raw.toLowerCase();
    if (!seen.has(key)) { seen.add(key); found.push(raw); }
  }
  // 2) XML-ish Claude tags (<role>, <context>, <task>, <format>)
  const tagMatches = text.match(/<\/?(role|context|task|format|constraints?|examples?)\b[^>]*>/gi) ?? [];
  for (const t of tagMatches) {
    const raw = t.replace(/[<>/]/g, "").trim();
    if (!seen.has(raw.toLowerCase())) {
      seen.add(raw.toLowerCase());
      found.push(raw);
    }
  }
  return found.slice(0, 12);
}

function detectKnownLabels(text: string): Set<string> {
  const out = new Set<string>();
  for (const k of KNOWN_LABELS) if (k.re.test(text)) out.add(k.key);
  return out;
}

function pickWeakest(score: QualityBreakdown): {
  key: keyof Omit<QualityBreakdown, "total" | "tier">;
  hintKey: string;
} {
  const dims: Array<{ k: keyof Omit<QualityBreakdown, "total" | "tier">; hint: string }> = [
    { k: "audience",    hint: "lint.hint.audience" },
    { k: "format",      hint: "lint.hint.format" },
    { k: "structure",   hint: "lint.hint.constraints" },
    { k: "specificity", hint: "lint.hint.examples" },
    { k: "clarity",     hint: "lint.hint.length" }
  ];
  let weakest = dims[0];
  let lowest = score[dims[0].k];
  for (const d of dims) {
    if (score[d.k] < lowest) { lowest = score[d.k]; weakest = d; }
  }
  return { key: weakest.k, hintKey: weakest.hint };
}

export function analysePrompt(text: string): ReverseAnalysis {
  const trimmed = text.trim();
  const intent = detectIntentLocal(trimmed);
  const score = scorePrompt(trimmed);
  const sections = extractSections(trimmed);
  const labels = detectKnownLabels(trimmed);
  const weakest = pickWeakest(score);
  const paragraphs = trimmed ? trimmed.split(/\n{2,}/).filter((p) => p.trim().length > 0).length : 0;
  const words = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;

  return {
    intent: intent.intent,
    intentConfidence: intent.confidence,
    score,
    sections,
    hasRole: labels.has("role"),
    hasCta: /\b(call.to.action|cta|next step|finally|to summari[sz]e)\b/i.test(trimmed)
        || /\b(الخطوة التالية|دعوة للعمل|ختام|خلاصة)\b/.test(trimmed),
    weakestDimension: weakest.key,
    weakestSuggestion: weakest.hintKey,
    wordCount: words,
    paragraphCount: paragraphs
  };
}
