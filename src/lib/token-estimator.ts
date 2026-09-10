/**
 * Heuristic token estimator + per-model context-window summary.
 *
 * Real tokenisers ship as multi-MB WASM blobs (tiktoken, sentencepiece).
 * For a free public-trial UI we want a *fast, dependency-free* estimate that
 * is good enough to flag "is this prompt going to fit?" — typically within
 * ±15% of the true count for normal text.
 *
 * Approach:
 *   - English / Latin-script text: ~4.0 chars per token (OpenAI rule of thumb).
 *   - Arabic / Hebrew / Cyrillic: ~3.0 chars per token (more multibyte → more
 *     subword splits; tiktoken/cl100k tends to split Arabic at every word
 *     piece, so word count is a useful floor).
 *   - Whitespace-heavy structured text: nudged up slightly.
 *
 * The output is intentionally a range (low/high) rather than a single number,
 * so the UI shows uncertainty honestly.
 */

import type { TargetModel } from "@/lib/types";

export interface TokenEstimate {
  low: number;
  mid: number;
  high: number;
}

const ARABIC_RE = /[؀-ۿ]/;
const CYRILLIC_RE = /[Ѐ-ӿ]/;
const HEBREW_RE = /[֐-׿]/;
const CJK_RE = /[一-鿿぀-ゟ゠-ヿ]/;

/** Single best-guess (mid). */
export function estimateTokens(text: string): number {
  return estimateTokenRange(text).mid;
}

export function estimateTokenRange(text: string): TokenEstimate {
  const t = text ?? "";
  if (!t.length) return { low: 0, mid: 0, high: 0 };

  // Detect script mix once, weight per-char accordingly
  const hasArabic = ARABIC_RE.test(t);
  const hasCyrillic = CYRILLIC_RE.test(t);
  const hasHebrew = HEBREW_RE.test(t);
  const hasCJK = CJK_RE.test(t);

  // CJK languages: roughly 1 char ≈ 1 token
  if (hasCJK) {
    const mid = Math.ceil(t.length * 1.0);
    return { low: Math.floor(mid * 0.85), mid, high: Math.ceil(mid * 1.2) };
  }

  // Non-Latin scripts split into more subword pieces
  const charsPerToken = hasArabic || hasHebrew || hasCyrillic ? 3.0 : 4.0;

  const baseMid = t.length / charsPerToken;
  // Word count gives a useful floor (BPE rarely produces sub-character tokens)
  const wordFloor = t.split(/\s+/).filter(Boolean).length;
  const mid = Math.max(Math.ceil(baseMid), Math.ceil(wordFloor * 0.6));

  return {
    low: Math.floor(mid * 0.85),
    mid,
    high: Math.ceil(mid * 1.2)
  };
}

/** Per-model context-window guidance for the UI. Values are conservative
 *  documented limits as of late 2025 — used to colour-code the estimate
 *  ("fits comfortably / borderline / over"). */
export interface ModelLimits {
  label: string;
  /** Total input + output context window (tokens). */
  context: number;
  /** Soft warning threshold (% of context) — UI turns amber above this. */
  warnPct: number;
  /** Hard cap (% of context) — UI turns rose above this. */
  hardPct: number;
}

export const MODEL_LIMITS: Record<TargetModel, ModelLimits> = {
  generic: { label: "Generic",  context: 8_000,    warnPct: 0.6, hardPct: 0.85 },
  chatgpt: { label: "ChatGPT",  context: 128_000,  warnPct: 0.6, hardPct: 0.85 },
  claude:  { label: "Claude",   context: 200_000,  warnPct: 0.6, hardPct: 0.85 },
  copilot: { label: "Copilot",  context: 64_000,   warnPct: 0.6, hardPct: 0.85 },
  gemini:  { label: "Gemini",   context: 1_000_000, warnPct: 0.4, hardPct: 0.75 }
};

export type FitTier = "ok" | "warn" | "over";

export function fitFor(tokens: number, model: TargetModel): FitTier {
  const m = MODEL_LIMITS[model];
  const ratio = tokens / m.context;
  if (ratio >= m.hardPct) return "over";
  if (ratio >= m.warnPct) return "warn";
  return "ok";
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 10_000) return Math.round(n / 1000) + "k";
  if (n >= 1_000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}
