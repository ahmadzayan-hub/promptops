import { describe, it, expect } from "vitest";
import { suggestForDraft, localizedSuggestion } from "./live-suggestions";

describe("suggestForDraft", () => {
  it("returns no suggestions for very short inputs", () => {
    expect(suggestForDraft("hi", {})).toEqual([]);
  });

  it("returns up to N suggestions for a vague prompt", () => {
    const s = suggestForDraft("write something nice for my customers", {}, 3);
    expect(s.length).toBeGreaterThan(0);
    expect(s.length).toBeLessThanOrEqual(3);
  });

  it("recommends 'expand' on very terse drafts", () => {
    const s = suggestForDraft("refactor this function", {}, 5);
    const ids = s.map((x) => x.id);
    expect(ids).toContain("expand");
  });

  it("recommends 'tighten' on very long drafts", () => {
    const long = "word ".repeat(260) + "for a report";
    const s = suggestForDraft(long, {}, 5);
    const ids = s.map((x) => x.id);
    expect(ids).toContain("tighten");
  });

  it("adds anti-hallucination suggestion to research/report drafts", () => {
    const s = suggestForDraft(
      "Write a research summary about the state of vector databases in 2026 for a non-technical CEO.",
      { intent: "research" },
      5
    );
    expect(s.map((x) => x.id)).toContain("anti-hallucination");
  });

  it("does not duplicate suggestions across the result", () => {
    const s = suggestForDraft("plan a four week launch checklist", {}, 5);
    const ids = s.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("localises the public shape", () => {
    const s = suggestForDraft("write a tweet for developers about my saas", {}, 1);
    if (s.length === 0) return;
    const ar = localizedSuggestion(s[0], "ar");
    const en = localizedSuggestion(s[0], "en");
    expect(ar.label).not.toEqual(en.label);
    expect(ar.label.length).toBeGreaterThan(0);
    expect(en.label.length).toBeGreaterThan(0);
  });
});
