/**
 * Per-model prompt formatters.
 *
 * Each frontier model has its own idiomatic prompt structure. A perfectly
 * engineered prompt for Claude (XML tags) is *worse* for Midjourney
 * (comma-separated args) and vice versa. This module owns the conversion
 * from a structured intent + Q&A bundle into the exact wire-format each
 * model wants.
 *
 * Pure functions, no I/O. The output is the literal string the user copies
 * and pastes into the target tool.
 */

import type { Intent } from "@/lib/local-engine";
import type { PromptStyle } from "@/lib/ai-models";
import { expertPreamble } from "@/lib/expert-preamble";

export interface FormatInput {
  raw: string;
  intent: Intent;
  qa: ReadonlyArray<{ question: string; answer: string }>;
  locale: "en" | "ar";
  /** Domain-specific scaffold (e.g. image visual spec, video shot list). */
  domainBlock?: string;
  /** Display name of the target model. Used by the expert preamble so the
   *  prompt can address the model by name and reflect the run's date. */
  modelName?: string;
}

const L = {
  en: {
    role:        "Role",
    context:     "Context",
    task:        "Task",
    constraints: "Constraints",
    format:      "Output format",
    success:     "Success criteria",
    audience:    "Audience",
    tone:        "Tone",
    examples:    "Examples",
    answer_with: "Answer with a clear voice, use headings when useful, keep formatting consistent.",
    no_qa:       "(no extra clarifications)",
    direct:      "Start with a direct answer.",
    detail:      "Provide supporting detail or examples next.",
    close:       "Close with a next step or actionable summary.",
    success_1:   "Matches the audience and format above",
    success_2:   "Specific, not generic",
    success_3:   "Ready to copy and use as-is"
  },
  ar: {
    role:        "الدور",
    context:     "السياق",
    task:        "المهمّة",
    constraints: "القيود",
    format:      "صيغة المخرجات",
    success:     "معايير النجاح",
    audience:    "الجمهور",
    tone:        "النبرة",
    examples:    "أمثلة",
    answer_with: "أجب بنبرة واضحة، استخدم عناوين عند الحاجة، وأبق التنسيق متّسقًا.",
    no_qa:       "(لا توجد توضيحات إضافية)",
    direct:      "ابدأ بإجابة مباشرة.",
    detail:      "أضف الدعم أو الأمثلة بعد ذلك.",
    close:       "اختم بخطوة تالية أو خلاصة قابلة للتنفيذ.",
    success_1:   "ملائم للجمهور والصيغة المطلوبَين",
    success_2:   "محدّد لا عام",
    success_3:   "قابل للنسخ والاستخدام مباشرة"
  }
} as const;

const ROLE_BY_INTENT: Record<Intent, { en: string; ar: string }> = {
  coding:       { en: "You are a senior software engineer.",                ar: "أنت مهندس برمجيات أوّل." },
  writing:      { en: "You are an expert copywriter.",                       ar: "أنت كاتب محتوى محترف." },
  research:     { en: "You are a careful research analyst.",                 ar: "أنت محلّل أبحاث دقيق." },
  analysis:     { en: "You are a strategic analyst.",                        ar: "أنت محلّل استراتيجي." },
  planning:     { en: "You are an experienced project planner.",             ar: "أنت مخطّط مشاريع خبير." },
  creative:     { en: "You are a creative writer with a sharp ear.",         ar: "أنت كاتب مبدع بحسّ مرهف." },
  design:       { en: "You are a senior product designer.",                  ar: "أنت مصمّم منتجات أوّل." },
  conversation: { en: "You are a thoughtful advisor.",                       ar: "أنت مستشار حكيم." },
  image:        { en: "You are an expert prompt engineer for image models.", ar: "أنت خبير في صياغة موجِّهات نماذج الصور." },
  video:        { en: "You are an experienced video director.",              ar: "أنت مخرج فيديو خبير." },
  audio:        { en: "You are a producer of audio + music.",                ar: "أنت منتج صوتيات وموسيقى." },
  software:     { en: "You are a staff software architect.",                 ar: "أنت معماري برمجيات أوّل." },
  website:      { en: "You are a senior web designer.",                      ar: "أنت مصمّم ويب أوّل." },
  report:       { en: "You are an analyst producing a decision-grade report.", ar: "أنت محلّل تكتب تقريرًا يدعم اتخاذ قرار." },
  other:        { en: "You are a helpful assistant.",                        ar: "أنت مساعد ذكي." }
};

function qaBlock(input: FormatInput): string {
  if (!input.qa.length) return L[input.locale].no_qa;
  return input.qa.map((p) => `- ${p.question}\n  > ${p.answer}`).join("\n");
}

// ───────────────────────────────────────────────────────────────────────────
// Style-specific formatters
// ───────────────────────────────────────────────────────────────────────────

function fmt_openai_system(i: FormatInput): string {
  const t = L[i.locale];
  const role = ROLE_BY_INTENT[i.intent][i.locale];
  return `# System
${role}

# ${t.task}
${i.raw}

# ${t.context}
${qaBlock(i)}

# ${t.format}
- ${t.direct}
- ${t.detail}
- ${t.close}

# ${t.success}
- ${t.success_1}
- ${t.success_2}
- ${t.success_3}${i.domainBlock ?? ""}`;
}

function fmt_claude_xml(i: FormatInput): string {
  const t = L[i.locale];
  const role = ROLE_BY_INTENT[i.intent][i.locale];
  return `<role>${role}</role>

<context>
${qaBlock(i)}
</context>

<task>
${i.raw}
</task>

<format>
${t.answer_with}
</format>${i.domainBlock ?? ""}`;
}

function fmt_gemini_multimodal(i: FormatInput): string {
  const t = L[i.locale];
  const role = ROLE_BY_INTENT[i.intent][i.locale];
  return `${role}

## ${t.task}
${i.raw}

## ${t.context}
${qaBlock(i)}

## ${t.format}
Return a structured response. If JSON is appropriate, wrap it in \`\`\`json fences. Cite sources inline as [1], [2] only when verifiable.

## ${t.success}
- ${t.success_1}
- ${t.success_2}
- ${t.success_3}${i.domainBlock ?? ""}`;
}

function fmt_grok_realtime(i: FormatInput): string {
  const t = L[i.locale];
  return `${ROLE_BY_INTENT[i.intent][i.locale]}

Use real-time web/X data when relevant; cite the freshest source.

## ${t.task}
${i.raw}

## ${t.context}
${qaBlock(i)}

## ${t.format}
Lead with what is true *right now*. Date-stamp time-sensitive claims.${i.domainBlock ?? ""}`;
}

function fmt_deepseek_reason(i: FormatInput): string {
  const t = L[i.locale];
  return `${ROLE_BY_INTENT[i.intent][i.locale]}

Think step-by-step before answering. Show your reasoning briefly, then conclude.

## ${t.task}
${i.raw}

## ${t.context}
${qaBlock(i)}

## ${t.format}
1. Brief reasoning chain (≤ 5 steps)
2. Final answer
3. Confidence and what would change it${i.domainBlock ?? ""}`;
}

function fmt_llama_instruct(i: FormatInput): string {
  const t = L[i.locale];
  return `[INST] ${ROLE_BY_INTENT[i.intent][i.locale]}

${t.task}: ${i.raw}

${t.context}:
${qaBlock(i)}

${t.format}: clear sections, concrete examples, no fluff. [/INST]${i.domainBlock ?? ""}`;
}

function fmt_mistral_tight(i: FormatInput): string {
  const t = L[i.locale];
  return `${ROLE_BY_INTENT[i.intent][i.locale]}

${t.task}: ${i.raw}
${t.context}:
${qaBlock(i)}
${t.format}: concise, structured, copy-ready.${i.domainBlock ?? ""}`;
}

function fmt_qwen_bilingual(i: FormatInput): string {
  const t = L[i.locale];
  return `${ROLE_BY_INTENT[i.intent][i.locale]}

## ${t.task}
${i.raw}

## ${t.context}
${qaBlock(i)}

## ${t.format}
Match the language the user wrote in. If mixed, default to the dominant language.${i.domainBlock ?? ""}`;
}

function fmt_cohere_tools(i: FormatInput): string {
  return `${ROLE_BY_INTENT[i.intent][i.locale]}

# Task
${i.raw}

# Context
${qaBlock(i)}

# Output (JSON)
{
  "answer": "string",
  "confidence": 0.0,
  "sources": []
}${i.domainBlock ?? ""}`;
}

// ─── IMAGE STYLES ──────────────────────────────────────────────────────────

function fmt_midjourney_args(i: FormatInput): string {
  // Midjourney prefers a single line: subject, style descriptors, then args
  const ans = i.qa.map((q) => q.answer).filter(Boolean).join(", ");
  const body = `${i.raw}${ans ? ", " + ans : ""}`;
  return `${body} --ar 16:9 --style raw --s 250 --v 7`;
}

function fmt_flux_natural(i: FormatInput): string {
  return `${i.raw}\n\nStyle: ${i.qa.map((q) => q.answer).filter(Boolean).join(". ") || "photorealistic, cinematic lighting"}.\nNegative: blurry, low contrast, watermark, extra fingers, deformed face.\nParams: 1536×864, steps 28, guidance 3.5.`;
}

function fmt_sdxl_tags(i: FormatInput): string {
  // SDXL is most controllable as comma-separated tags + a separate negative
  const tags = [i.raw, ...i.qa.map((q) => q.answer)].filter(Boolean).join(", ");
  return `${tags}, masterpiece, best quality, highly detailed\n\nNegative prompt: blurry, low quality, watermark, signature, text, extra limbs, deformed, ugly\n\nParams: 1024×1024, sampler DPM++ 2M Karras, steps 35, CFG 6.5, seed -1`;
}

function fmt_dalle_natural(i: FormatInput): string {
  return `Generate an image: ${i.raw}.\n\n${i.qa.map((q) => `${q.question} ${q.answer}`).join(" ")}\n\nQuality: highly detailed, accurate typography if any text appears.`;
}

function fmt_ideogram_typo(i: FormatInput): string {
  return `${i.raw}\n\nMake any typography crisp and correct: spelling, kerning, hierarchy.\n${i.qa.map((q) => q.answer).filter(Boolean).join(". ")}`;
}

function fmt_imagen_natural(i: FormatInput): string {
  return `${i.raw}.\n\n${i.qa.map((q) => `${q.question} ${q.answer}`).join(" ")}\n\nPhotorealistic, natural lighting, sharp focus.`;
}

function fmt_recraft_vector(i: FormatInput): string {
  return `${i.raw}\n\nStyle: vector, flat, brand-ready. ${i.qa.map((q) => q.answer).filter(Boolean).join(". ")}\nFormat: clean shapes, no gradients unless specified.`;
}

function fmt_nano_banana(i: FormatInput): string {
  return `${i.raw}\n\n${i.qa.map((q) => q.answer).filter(Boolean).join(". ")}`;
}

// ─── VIDEO STYLES ──────────────────────────────────────────────────────────

function fmt_sora_shotlist(i: FormatInput): string {
  return `# Sora 2 brief
**Subject + action**: ${i.raw}

**Shots**:
1. Establishing wide, slow push-in, 3s.
2. Medium handheld, subject reaction, 2s.
3. Close-up detail, 2s.
${i.qa.map((q, n) => `${n + 4}. ${q.answer}`).join("\n")}

**Camera**: 35mm, shallow depth of field, natural light.
**Aspect**: 16:9. **Duration**: ~12s.`;
}

function fmt_veo_natural(i: FormatInput): string {
  return `${i.raw}.\n\nDirector's note: ${i.qa.map((q) => q.answer).filter(Boolean).join(" ")}.\n\nAudio: synced ambient + subtle score. Camera: smooth, motivated motion. Aspect 16:9, ~10 s.`;
}

function fmt_runway_cinematic(i: FormatInput): string {
  return `${i.raw}\n\nCinematic, anamorphic lens, soft volumetric light, film grain.\n${i.qa.map((q) => q.answer).filter(Boolean).join(". ")}`;
}

function fmt_kling_shotlist(i: FormatInput): string {
  return fmt_sora_shotlist(i).replace("Sora 2 brief", "Kling 2.5 brief");
}

function fmt_pika_natural(i: FormatInput): string {
  return `${i.raw}. ${i.qa.map((q) => q.answer).filter(Boolean).join(". ")}\nVertical 9:16, ~5s, vibrant colors.`;
}

function fmt_luma_natural(i: FormatInput): string {
  return `${i.raw}. ${i.qa.map((q) => q.answer).filter(Boolean).join(". ")}\nNatural physics, smooth camera motion, golden-hour lighting.`;
}

function fmt_hailuo_natural(i: FormatInput): string { return fmt_pika_natural(i); }
function fmt_seedance_natural(i: FormatInput): string { return fmt_pika_natural(i); }

// ─── AUDIO STYLES ──────────────────────────────────────────────────────────

function fmt_music_prompt(i: FormatInput): string {
  return `Genre: ${i.qa[0]?.answer ?? "lo-fi hip-hop"}\nMood: ${i.qa[1]?.answer ?? "calm, focused"}\nTempo: 90 BPM\nStructure: intro - verse - chorus - bridge - outro\nLyrics: ${i.raw}`;
}

function fmt_tts_elevenlabs(i: FormatInput): string {
  return `<voice>${i.qa[0]?.answer ?? "narrator, male, 30s, neutral accent"}</voice>\n\n${i.raw}\n\n<emotion>${i.qa[1]?.answer ?? "warm, confident"}</emotion>`;
}

// ─── CODE STYLES ───────────────────────────────────────────────────────────

function fmt_code_comments(i: FormatInput): string {
  return `// Task: ${i.raw}
// Context:
${i.qa.map((q) => `// - ${q.question} -> ${q.answer}`).join("\n")}
// Output: idiomatic code, comments only where helpful, include tests when relevant.${i.domainBlock ?? ""}`;
}

function fmt_code_spec(i: FormatInput): string {
  const t = L[i.locale];
  return `# ${t.task}
${i.raw}

## Acceptance criteria
${i.qa.map((q, n) => `${n + 1}. ${q.question} → ${q.answer}`).join("\n") || "1. Builds without errors\n2. Passes the smoke test"}

## Out of scope
- Anything not listed above.

## ${t.format}
Working code in the project's existing style. New files where needed. No placeholder TODOs.${i.domainBlock ?? ""}`;
}

// ─── GENERIC ───────────────────────────────────────────────────────────────

function fmt_generic(i: FormatInput): string {
  const t = L[i.locale];
  return `${ROLE_BY_INTENT[i.intent][i.locale]}

# ${t.task}
${i.raw}

# ${t.context}
${qaBlock(i)}

# ${t.format}
- ${t.direct}
- ${t.detail}
- ${t.close}

# ${t.success}
- ${t.success_1}
- ${t.success_2}
- ${t.success_3}${i.domainBlock ?? ""}`;
}

// ───────────────────────────────────────────────────────────────────────────
// Dispatch
// ───────────────────────────────────────────────────────────────────────────

const FORMATTERS: Record<PromptStyle, (i: FormatInput) => string> = {
  "openai-system":     fmt_openai_system,
  "claude-xml":        fmt_claude_xml,
  "gemini-multimodal": fmt_gemini_multimodal,
  "grok-realtime":     fmt_grok_realtime,
  "deepseek-reason":   fmt_deepseek_reason,
  "llama-instruct":    fmt_llama_instruct,
  "mistral-tight":     fmt_mistral_tight,
  "qwen-bilingual":    fmt_qwen_bilingual,
  "cohere-tools":      fmt_cohere_tools,

  "midjourney-args":   fmt_midjourney_args,
  "flux-natural":      fmt_flux_natural,
  "sdxl-tags":         fmt_sdxl_tags,
  "dalle-natural":     fmt_dalle_natural,
  "ideogram-typo":     fmt_ideogram_typo,
  "imagen-natural":    fmt_imagen_natural,
  "recraft-vector":    fmt_recraft_vector,
  "nano-banana":       fmt_nano_banana,

  "sora-shotlist":     fmt_sora_shotlist,
  "veo-natural":       fmt_veo_natural,
  "runway-cinematic":  fmt_runway_cinematic,
  "kling-shotlist":    fmt_kling_shotlist,
  "pika-natural":      fmt_pika_natural,
  "luma-natural":      fmt_luma_natural,
  "hailuo-natural":    fmt_hailuo_natural,
  "seedance-natural":  fmt_seedance_natural,

  "music-prompt":      fmt_music_prompt,
  "tts-elevenlabs":    fmt_tts_elevenlabs,

  "code-comments":     fmt_code_comments,
  "code-spec":         fmt_code_spec,

  "generic":           fmt_generic
};

/**
 * Styles that take a freeform-text scaffold and benefit from the expert
 * preamble prepended (current date + senior-engineer rules). Argument-style
 * formats — Midjourney `--ar 16:9 --v 7`, SDXL tag lists, music-genre
 * prompts — would only be polluted by markdown text, so they're excluded.
 */
const PREAMBLE_FRIENDLY: ReadonlySet<PromptStyle> = new Set<PromptStyle>([
  "openai-system",
  "claude-xml",
  "gemini-multimodal",
  "grok-realtime",
  "deepseek-reason",
  "llama-instruct",
  "mistral-tight",
  "qwen-bilingual",
  "cohere-tools",
  "code-comments",
  "code-spec",
  "generic"
]);

export function formatPromptFor(style: PromptStyle, input: FormatInput): string {
  const fn = FORMATTERS[style] ?? fmt_generic;
  const body = fn(input);
  if (!PREAMBLE_FRIENDLY.has(style)) return body;
  return expertPreamble({ locale: input.locale, modelName: input.modelName }) + body;
}
