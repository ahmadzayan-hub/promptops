import { describe, it, expect } from "vitest";
import { analysePrompt } from "./reverse-analyzer";

describe("analysePrompt", () => {
  it("returns a stable shape for empty input", () => {
    const r = analysePrompt("");
    expect(r.score.total).toBe(0);
    expect(r.sections).toEqual([]);
    expect(r.wordCount).toBe(0);
    expect(r.paragraphCount).toBe(0);
  });

  it("extracts markdown-heading sections", () => {
    const text = `# Goal\nDo something.\n\n## Audience\nDevelopers.\n\n### Format\nBullet list.`;
    const r = analysePrompt(text);
    expect(r.sections.some((s) => /goal/i.test(s))).toBe(true);
    expect(r.sections.some((s) => /audience/i.test(s))).toBe(true);
    expect(r.sections.some((s) => /format/i.test(s))).toBe(true);
  });

  it("extracts Claude-style XML tags", () => {
    const text = `<role>You are a helpful assistant.</role>\n<task>Summarise this.</task>`;
    const r = analysePrompt(text);
    expect(r.sections.length).toBeGreaterThan(0);
    expect(r.hasRole).toBe(true);
  });

  it("flags the weakest dimension as a learning target", () => {
    const r = analysePrompt("just refactor this code please");
    expect(r.weakestSuggestion.startsWith("lint.hint.")).toBe(true);
  });

  it("scores a polished prompt as high tier", () => {
    const text = `## Goal
Refactor my React table for 50,000 rows.

### Audience
Senior frontend engineers.

### Format
- Numbered checklist
- One paragraph rationale

### Constraints
TypeScript strict, no new deps.`;
    const r = analysePrompt(text);
    expect(r.score.total).toBeGreaterThanOrEqual(60);
    expect(r.sections.length).toBeGreaterThanOrEqual(3);
  });
});
