import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { expertPreamble } from "./expert-preamble";

describe("expertPreamble", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 23, 23, 59, 59)); });
  afterEach(() => vi.useRealTimers());
  it("includes today's local calendar date, not an assumed UTC date", () => {
    const out = expertPreamble({ locale: "en" });
    const today = "2026-10-23";
    expect(out).toContain(today);
  });

  it("includes the seven expert rules", () => {
    const out = expertPreamble({ locale: "en" });
    for (let i = 1; i <= 7; i++) expect(out).toContain(`${i}.`);
    expect(out.toLowerCase()).toContain("never invent code");
    expect(out.toLowerCase()).toContain("close with the next concrete step");
  });

  it("threads the target model name when provided", () => {
    const out = expertPreamble({ locale: "en", modelName: "Claude Opus 4.7" });
    expect(out).toContain("Claude Opus 4.7");
  });

  it("emits Arabic rules when locale=ar", () => {
    const out = expertPreamble({ locale: "ar" });
    expect(out).toMatch(/[؀-ۿ]/);
    expect(out).toContain("سياق التشغيل");
    expect(out).toContain("قواعد الخبراء");
  });

  it("does not double-emit on each call (idempotent shape)", () => {
    const a = expertPreamble({ locale: "en" });
    const b = expertPreamble({ locale: "en" });
    const today = "2026-10-23";
    expect(a).toContain(today);
    expect(b).toContain(today);
  });
  it("updates the date after local midnight", () => {
    expect(expertPreamble({ locale: "en" })).toContain("2026-10-23");
    vi.setSystemTime(new Date(2026, 9, 24, 0, 0, 1));
    expect(expertPreamble({ locale: "en" })).toContain("2026-10-24");
  });
});

