/**
 * Pure-function "live suggestions" engine.
 *
 * Given a draft prompt + light context (which target model, optional intent,
 * UI locale), return up to N short suggestions the user can apply with a
 * single tap. Suggestions are *additions* (markdown blocks) the editor can
 * append, never replacements — that's what makes the UX feel like
 * Grammarly's "accept this fix" without ever clobbering the user's text.
 *
 * Suggestions are derived from the same five-dimension quality score so
 * they're consistent with the rest of the platform's signals.
 *
 * No I/O. Safe to call on every keystroke (debounced upstream).
 */

import { detectIntentLocal, type Intent } from "@/lib/local-engine";
import { scorePrompt } from "@/lib/quality-score";

export type SuggestionKind =
  | "add_audience"
  | "add_format"
  | "add_constraints"
  | "add_examples"
  | "add_role"
  | "add_success"
  | "tighten"
  | "expand"
  | "anti_hallucination";

export interface LiveSuggestion {
  /** Stable id for React keys. */
  id: string;
  /** Machine-readable category. */
  kind: SuggestionKind;
  /** Short label shown on the chip ("Add audience"). */
  label_en: string;
  label_ar: string;
  /** One-line preview shown on hover/expand. */
  preview_en: string;
  preview_ar: string;
  /** Markdown text to append to the user's draft when accepted. */
  append_en: string;
  append_ar: string;
}

/** Context the parent provides — none of these fields are required. */
export interface SuggestionContext {
  intent?: Intent;
  targetModel?: "chatgpt" | "claude" | "copilot" | "gemini" | "generic";
  locale?: "en" | "ar";
}

const TEMPLATES: LiveSuggestion[] = [
  {
    id: "audience",
    kind: "add_audience",
    label_en: "+ Audience",        label_ar: "+ الجمهور",
    preview_en: "Name who reads it so the model picks the right tone.",
    preview_ar: "حدّد القارئ ليختار النموذج النبرة المناسبة.",
    append_en: "\n\n## Audience\n[describe the reader: role, expertise level, language]",
    append_ar: "\n\n## الجمهور\n[صِف القارئ: الدور، مستوى الخبرة، اللغة]"
  },
  {
    id: "format",
    kind: "add_format",
    label_en: "+ Format",          label_ar: "+ التنسيق",
    preview_en: "Tell the model exactly how to lay out the answer.",
    preview_ar: "أخبر النموذج بدقّة كيف يرتّب الإجابة.",
    append_en: "\n\n## Output format\n- Length:\n- Structure (e.g. numbered list, table, JSON):\n- Examples to include:",
    append_ar: "\n\n## صيغة المخرجات\n- الطول:\n- البنية (قائمة مرقّمة، جدول، JSON):\n- أمثلة يجب تضمينها:"
  },
  {
    id: "constraints",
    kind: "add_constraints",
    label_en: "+ Constraints",     label_ar: "+ القيود",
    preview_en: "Spell out what to avoid, saves a re-prompt.",
    preview_ar: "اذكر ما يجب تجنّبه، يوفّر جولة موجِّه إضافية.",
    append_en: "\n\n## Constraints\n- Avoid:\n- Required to include:\n- Hard limits (length, words, tokens):",
    append_ar: "\n\n## القيود\n- تجنّب:\n- يجب تضمين:\n- حدود صارمة (الطول، الكلمات، التوكنز):"
  },
  {
    id: "examples",
    kind: "add_examples",
    label_en: "+ Examples",        label_ar: "+ أمثلة",
    preview_en: "One or two examples teach the model your bar.",
    preview_ar: "مثال أو اثنان يُعلِّمان النموذج معيارك.",
    append_en: "\n\n## Examples\n1. Good example: …\n2. Bad example (avoid this): …",
    append_ar: "\n\n## أمثلة\n1. مثال جيّد: …\n2. مثال سيّئ (تجنّبه): …"
  },
  {
    id: "role",
    kind: "add_role",
    label_en: "+ Role",            label_ar: "+ الدور",
    preview_en: "Naming a role tightens vocabulary and POV.",
    preview_ar: "تحديد دور يُضبط المفردات ووجهة النظر.",
    append_en: "\n\n## Role\nYou are a [role + 1 line of expertise].",
    append_ar: "\n\n## الدور\nأنت [دور + سطر خبرة واحد]."
  },
  {
    id: "success",
    kind: "add_success",
    label_en: "+ Success criteria", label_ar: "+ معايير النجاح",
    preview_en: "Lets the model self-check before answering.",
    preview_ar: "يتيح للنموذج التحقّق قبل الإجابة.",
    append_en: "\n\n## Success criteria\n- The answer is correct when:\n- The answer is wrong if:",
    append_ar: "\n\n## معايير النجاح\n- الإجابة صحيحة عندما:\n- الإجابة خاطئة إذا:"
  },
  {
    id: "anti-hallucination",
    kind: "anti_hallucination",
    label_en: "+ Trust guardrails", label_ar: "+ ضوابط الدقّة",
    preview_en: "Reduces fabricated citations and confident-wrong answers.",
    preview_ar: "يقلّل المراجع المختلقة والإجابات الواثقة الخاطئة.",
    append_en: "\n\n## Trust guardrails\n- Cite only sources you can verify; otherwise say \"unverified\".\n- Mark speculation with [speculation].\n- Acknowledge gaps in data plainly.",
    append_ar: "\n\n## ضوابط الدقّة\n- استشهد فقط بمصادر يمكنك التحقّق منها، وإلا قل «غير مُتحقَّق منه».\n- علّم التخمين بـ«[تخمين]».\n- اعترف بفجوات البيانات صراحةً."
  },
  {
    id: "tighten",
    kind: "tighten",
    label_en: "Tighten",           label_ar: "تكثيف",
    preview_en: "Cut filler, say it in fewer words.",
    preview_ar: "احذف الحشو، قُلها بكلمات أقلّ.",
    append_en: "\n\n[Reviewer note: rewrite the above in ≤ 60 words, removing all filler.]",
    append_ar: "\n\n[ملاحظة مراجِع: أعد كتابة ما سبق في ≤ 60 كلمة بحذف كل الحشو.]"
  },
  {
    id: "expand",
    kind: "expand",
    label_en: "Expand",            label_ar: "توسعة",
    preview_en: "Too terse, add 2-3 specifics.",
    preview_ar: "موجز أكثر مما ينبغي، أضف 2-3 تفاصيل.",
    append_en: "\n\n[Reviewer note: add 2-3 concrete specifics, numbers, named entities, or constraints.]",
    append_ar: "\n\n[ملاحظة مراجِع: أضف 2-3 تفاصيل ملموسة، أرقام أو أسماء أو قيود.]"
  }
];

const REPORT_LIKE: Intent[] = ["report", "research", "analysis"];

/** Top-N suggestions ordered by gap size against the score's dimensions. */
export function suggestForDraft(
  text: string,
  ctx: SuggestionContext = {},
  limit = 3
): LiveSuggestion[] {
  const trimmed = (text ?? "").trim();
  if (trimmed.length < 8) return [];

  const intent = ctx.intent ?? detectIntentLocal(trimmed).intent;
  const score = scorePrompt(trimmed);
  const wc = trimmed.split(/\s+/).filter(Boolean).length;

  // Score-driven priority: each gap maps to one suggestion id
  const gaps: Array<{ id: string; weight: number }> = [];
  if (score.audience    < 8) gaps.push({ id: "audience",    weight: 20 - score.audience });
  if (score.format      < 8) gaps.push({ id: "format",      weight: 20 - score.format });
  if (score.structure   < 8) gaps.push({ id: "constraints", weight: 20 - score.structure });
  if (score.specificity < 6) gaps.push({ id: "examples",    weight: 20 - score.specificity });
  if (!/role|act as|you are/i.test(trimmed) && wc > 12)
    gaps.push({ id: "role",     weight: 8 });
  if (!/success|done when|criteria/i.test(trimmed) && wc > 20)
    gaps.push({ id: "success",  weight: 6 });
  if (REPORT_LIKE.includes(intent) && !/cite|verifi|speculation|gap/i.test(trimmed))
    gaps.push({ id: "anti-hallucination", weight: 14 });

  // Length-based suggestions
  if (wc > 220) gaps.push({ id: "tighten", weight: 12 });
  if (wc < 12)  gaps.push({ id: "expand",  weight: 10 });

  gaps.sort((a, b) => b.weight - a.weight);

  const seen = new Set<string>();
  const out: LiveSuggestion[] = [];
  for (const g of gaps) {
    if (seen.has(g.id)) continue;
    const tpl = TEMPLATES.find((s) => s.id === g.id);
    if (!tpl) continue;
    out.push(tpl);
    seen.add(g.id);
    if (out.length >= limit) break;
  }
  return out;
}

/** Public, locale-aware shape for API responses + UI rendering. */
export function localizedSuggestion(s: LiveSuggestion, locale: "en" | "ar") {
  return {
    id: s.id,
    kind: s.kind,
    label: locale === "ar" ? s.label_ar : s.label_en,
    preview: locale === "ar" ? s.preview_ar : s.preview_en,
    append: locale === "ar" ? s.append_ar : s.append_en
  };
}
