import { describe, it, expect } from "vitest";
import { scorePrompt } from "./quality-score";

describe("scorePrompt", () => {
  it("scores empty string as zero", () => {
    const s = scorePrompt("");
    expect(s.total).toBe(0);
    expect(s.tier).toBe("low");
  });

  it("scores a one-word prompt as low", () => {
    const s = scorePrompt("refactor");
    expect(s.total).toBeLessThan(20);
    expect(s.tier).toBe("low");
  });

  it("scores a structured prompt with audience+format as high", () => {
    const polished = `## Goal
Refactor my React data table to handle 50,000 rows without jank.

### Audience
For senior frontend engineers familiar with React 18.

### Format
Return:
- a numbered checklist of changes
- a code snippet using \`useMemo\`
- one paragraph of rationale

### Constraints
Must keep TypeScript strict. Avoid dependencies.`;
    const s = scorePrompt(polished);
    expect(s.total).toBeGreaterThanOrEqual(75);
    expect(s.tier).toBe("high");
    expect(s.structure).toBeGreaterThan(10);
    expect(s.audience).toBeGreaterThan(10);
    expect(s.format).toBeGreaterThan(10);
  });

  it("totals are always within [0, 100]", () => {
    const samples = ["", "x", "Hello world", "A".repeat(5000)];
    for (const x of samples) {
      const s = scorePrompt(x);
      expect(s.total).toBeGreaterThanOrEqual(0);
      expect(s.total).toBeLessThanOrEqual(100);
    }
  });

  it("each dimension is within [0, 20]", () => {
    const s = scorePrompt(`# Title\n- a\n- b\n- c\nFor developers, return JSON.`);
    for (const k of ["clarity", "specificity", "structure", "audience", "format"] as const) {
      expect(s[k]).toBeGreaterThanOrEqual(0);
      expect(s[k]).toBeLessThanOrEqual(20);
    }
  });

  it("recognises Arabic structure hints", () => {
    const ar = `السياق: تطبيق ويب\nالهدف: تحسين الأداء بنسبة 40%\nالجمهور: للمطوّرين الجدد\nالمخرجات: قائمة نقاط مرقّمة`;
    const s = scorePrompt(ar);
    expect(s.audience).toBeGreaterThan(0);
    expect(s.structure).toBeGreaterThan(0);
    expect(s.total).toBeGreaterThan(30);
  });
});
