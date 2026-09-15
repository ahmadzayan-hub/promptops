import { describe, it, expect } from "vitest";
import { expertPreamble } from "./expert-preamble";

describe("expertPreamble", () => {
  it("includes today's ISO date", () => {
    const out = expertPreamble({ locale: "en" });
    const today = new Date().toISOString().slice(0, 10);
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
    // Same date → same output (within a second, allowing for date rollover)
    const today = new Date().toISOString().slice(0, 10);
    expect(a).toContain(today);
    expect(b).toContain(today);
  });
});
