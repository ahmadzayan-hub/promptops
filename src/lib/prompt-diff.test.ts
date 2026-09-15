import { describe, it, expect } from "vitest";
import { diffPrompts, diffSummary } from "./prompt-diff";

describe("diffPrompts", () => {
  it("marks every line as added when raw is empty", () => {
    const out = diffPrompts("", "Line 1\nLine 2");
    expect(out).toHaveLength(2);
    expect(out.every((l) => l.kind === "added")).toBe(true);
  });

  it("marks unchanged lines as context", () => {
    const raw = "Hello\nWorld";
    const final = "Hello\nWorld";
    const out = diffPrompts(raw, final);
    expect(out.every((l) => l.kind === "context")).toBe(true);
  });

  it("marks inserted lines as added but keeps surrounding context", () => {
    const raw = "A\nB\nC";
    const final = "A\nNEW\nB\nC";
    const out = diffPrompts(raw, final);
    expect(out.map((l) => l.kind)).toEqual(["context", "added", "context", "context"]);
  });

  it("classifies a polished prompt as mostly-added", () => {
    const raw = "Refactor my React table.";
    const final = `## Goal
Refactor my React table.

### Audience
Senior frontend engineers.

### Format
- Numbered checklist
- One paragraph rationale`;
    const sum = diffSummary(raw, final);
    expect(sum.added).toBeGreaterThan(sum.total / 2);
    expect(sum.pct).toBeGreaterThanOrEqual(50);
  });
});
