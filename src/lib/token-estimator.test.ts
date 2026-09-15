import { describe, it, expect } from "vitest";
import {
  estimateTokens,
  estimateTokenRange,
  fitFor,
  formatTokens,
  MODEL_LIMITS
} from "./token-estimator";

describe("estimateTokens", () => {
  it("returns 0 for empty input", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokenRange("").high).toBe(0);
  });

  it("estimates English at roughly chars/4", () => {
    const text = "The quick brown fox jumps over the lazy dog.";
    const e = estimateTokenRange(text);
    // 44 chars → ~11 tokens, with ±15% range
    expect(e.mid).toBeGreaterThanOrEqual(8);
    expect(e.mid).toBeLessThanOrEqual(15);
    expect(e.low).toBeLessThanOrEqual(e.mid);
    expect(e.high).toBeGreaterThanOrEqual(e.mid);
  });

  it("estimates Arabic at a higher token-per-char rate than English", () => {
    const arabic = "حوِّل فكرتك العابرة إلى موجِّه احترافي مُتقَن";
    const english = "Turn your fleeting idea into a polished professional prompt";
    const ar = estimateTokens(arabic);
    const en = estimateTokens(english);
    // Arabic should use more tokens per character than English
    expect(ar / arabic.length).toBeGreaterThan(en / english.length);
  });

  it("range low/mid/high are monotonic", () => {
    const samples = ["a", "Hello world!", "A".repeat(2000)];
    for (const s of samples) {
      const e = estimateTokenRange(s);
      expect(e.low).toBeLessThanOrEqual(e.mid);
      expect(e.mid).toBeLessThanOrEqual(e.high);
    }
  });
});

describe("fitFor", () => {
  it("returns ok well below the warn threshold", () => {
    expect(fitFor(100, "chatgpt")).toBe("ok");
  });

  it("returns warn between warn and hard thresholds", () => {
    const limits = MODEL_LIMITS.chatgpt;
    const inWarn = Math.floor(limits.context * (limits.warnPct + 0.05));
    expect(fitFor(inWarn, "chatgpt")).toBe("warn");
  });

  it("returns over above the hard threshold", () => {
    const limits = MODEL_LIMITS.chatgpt;
    const over = Math.ceil(limits.context * limits.hardPct) + 1;
    expect(fitFor(over, "chatgpt")).toBe("over");
  });
});

describe("formatTokens", () => {
  it("formats < 1k as a plain integer", () => {
    expect(formatTokens(0)).toBe("0");
    expect(formatTokens(999)).toBe("999");
  });

  it("formats thousands with one decimal up to 9.9k", () => {
    expect(formatTokens(1500)).toBe("1.5k");
    expect(formatTokens(9900)).toBe("9.9k");
  });

  it("formats >= 10k without decimals", () => {
    expect(formatTokens(12_345)).toBe("12k");
    expect(formatTokens(128_000)).toBe("128k");
  });

  it("formats millions with the M suffix", () => {
    expect(formatTokens(1_000_000)).toBe("1M");
    expect(formatTokens(1_500_000)).toBe("1.5M");
  });
});
