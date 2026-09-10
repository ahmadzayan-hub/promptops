/**
 * Local prompt-quality scorer (0-100) used by the workspace to tell the user
 * how much value the orchestrator added.
 *
 * The score is intentionally cheap and explainable — it's not a model, just
 * a sum of signals that correlate with "good prompts" in practice:
 *   - clarity     : enough length, complete sentences
 *   - specificity : numbers, named entities, code/identifier-ish tokens
 *   - structure   : explicit sections / headings / lists
 *   - audience    : the prompt names who reads it
 *   - format      : the prompt names a desired output format
 *
 * Each dimension contributes 0-20. Total is clipped to [0, 100].
 *
 * Pure function, no DOM, no I/O — safe to call on every keystroke.
 */

export interface QualityBreakdown {
  total: number;             // 0..100
  tier: "low" | "mid" | "high";
  clarity: number;           // 0..20
  specificity: number;       // 0..20
  structure: number;         // 0..20
  audience: number;          // 0..20
  format: number;            // 0..20
}

const HEADING_RE = /(^|\n)\s*(#{1,4}|[A-Z][A-Za-z ]{2,30}:)\s/m;
const LIST_RE = /(^|\n)\s*([-*]|\d+\.)\s/m;
const NUMBER_RE = /(?:^|\s)\d+(\.\d+)?(?:\s|$|%|st|nd|rd|th|k|m|b)/i;
const CODE_TOKEN_RE = /`[^`]+`|\b[a-z][a-zA-Z0-9_]*\([a-zA-Z0-9_,\s]*\)/;

const AUDIENCE_HINTS = [
  // EN
  "audience", "for a", "for non-technical", "for developers", "for engineers",
  "for executives", "for ceo", "for cto", "beginners", "expert", "team",
  "child", "manager", "investor", "junior", "senior", "tutorial",
  // AR
  "للقارئ", "للمستخدم", "للجمهور", "لمدير", "للمبتدئ", "للخبير", "للمستثمر", "للطالب", "للمطوّرين"
];

const FORMAT_HINTS = [
  // EN
  "bullet", "bullets", "list", "table", "json", "yaml", "markdown", "headings",
  "numbered", "step-by-step", "outline", "summary", "tweet", "email", "checklist",
  // AR
  "نقاط", "قائمة", "جدول", "خطوات", "ملخّص", "بريد", "تغريدة", "عناوين", "json", "ماركداون"
];

const STRUCTURE_HINTS = [
  // EN
  "context:", "role:", "goal:", "constraints:", "examples:", "tone:", "audience:",
  "format:", "output:", "return:", "deliverable:",
  // AR
  "السياق:", "الدور:", "الهدف:", "القيود:", "المخرجات:", "الجمهور:", "النبرة:"
];

function clip20(n: number): number {
  if (n < 0) return 0;
  if (n > 20) return 20;
  return Math.round(n);
}

function tierOf(total: number): QualityBreakdown["tier"] {
  if (total >= 75) return "high";
  if (total >= 45) return "mid";
  return "low";
}

export function scorePrompt(text: string): QualityBreakdown {
  const t = (text ?? "").trim();
  if (!t) {
    return { total: 0, tier: "low", clarity: 0, specificity: 0, structure: 0, audience: 0, format: 0 };
  }

  const lower = t.toLowerCase();
  const words = t.split(/\s+/).filter(Boolean);
  const wc = words.length;
  const sentenceCount = (t.match(/[.!?؟।]+/g) ?? []).length || 1;
  const avgSentence = wc / sentenceCount;

  // ── clarity ── reward enough length + reasonably composed sentences
  let clarity = 0;
  if (wc >= 8) clarity += 6;
  if (wc >= 25) clarity += 4;
  if (wc >= 60) clarity += 4;
  if (avgSentence >= 4 && avgSentence <= 28) clarity += 6;

  // ── specificity ── numbers, code-ish tokens, proper nouns
  let specificity = 0;
  if (NUMBER_RE.test(t)) specificity += 6;
  if (CODE_TOKEN_RE.test(t)) specificity += 6;
  const properNouns = (t.match(/\b[A-Z][a-z]{2,}\b/g) ?? []).length;
  if (properNouns >= 1) specificity += 4;
  if (properNouns >= 3) specificity += 4;

  // ── structure ── headings, lists, explicit "Section:" labels
  let structure = 0;
  if (HEADING_RE.test(t)) structure += 8;
  if (LIST_RE.test(t)) structure += 6;
  for (const h of STRUCTURE_HINTS) {
    if (lower.includes(h)) { structure += 3; break; }
  }
  // multi-paragraph
  if (t.split(/\n{2,}/).length >= 2) structure += 4;

  // ── audience mention
  let audience = 0;
  for (const h of AUDIENCE_HINTS) {
    if (lower.includes(h)) { audience += 14; break; }
  }
  if (/\b(I|we|you)\b/i.test(t) || /\b(أريد|نريد|أنت)\b/.test(t)) audience += 6;

  // ── format mention
  let format = 0;
  for (const h of FORMAT_HINTS) {
    if (lower.includes(h)) { format += 14; break; }
  }
  if (/```|<code|<\/?\w+>/i.test(t)) format += 6;

  clarity = clip20(clarity);
  specificity = clip20(specificity);
  structure = clip20(structure);
  audience = clip20(audience);
  format = clip20(format);
  const total = clarity + specificity + structure + audience + format;
  return { total, tier: tierOf(total), clarity, specificity, structure, audience, format };
}
