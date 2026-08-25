import { describe, expect, it } from "vitest";
import { AI_MODELS, getModel, toTargetModel } from "./ai-models";

describe("toTargetModel", () => {
  it("maps the four families the formatter has rules for", () => {
    expect(toTargetModel("gpt-5")).toBe("chatgpt");
    expect(toTargetModel("claude-opus-4-7")).toBe("claude");
    expect(toTargetModel("github-copilot")).toBe("copilot");
  });

  it("falls back to generic rather than guessing a family", () => {
    // Real catalogue ids whose style the formatter has no rules for.
    expect(toTargetModel("nano-banana")).toBe("generic");
    expect(toTargetModel("cohere-command-r-plus")).toBe("generic");
  });

  it("returns generic for an id that is not in the catalogue at all", () => {
    expect(toTargetModel("not-a-model")).toBe("generic");
    expect(toTargetModel("")).toBe("generic");
  });

  it("never returns a value the sessions API would reject", () => {
    // The whole point of the function: every catalogue entry must narrow to
    // one of the five the zod enum on POST /api/sessions accepts.
    const allowed = new Set(["chatgpt", "claude", "copilot", "gemini", "generic"]);
    for (const m of AI_MODELS) {
      expect(allowed.has(toTargetModel(m.id))).toBe(true);
    }
  });

  it("maps by prompt style, so styles agree across the catalogue", () => {
    const byStyle = new Map<string, string>();
    for (const m of AI_MODELS) {
      const target = toTargetModel(m.id);
      const seen = byStyle.get(m.promptStyle);
      if (seen) expect(target).toBe(seen);
      else byStyle.set(m.promptStyle, target);
    }
    expect(byStyle.size).toBeGreaterThan(5);
  });

  it("every catalogue id resolves through getModel", () => {
    for (const m of AI_MODELS) expect(getModel(m.id)).toBeDefined();
  });
});
