import { describe, it, expect, vi } from "vitest";
import { postFormatForModel } from "./formatter";

describe("postFormatForModel", () => {
  it("wraps Claude prompts in <task> when no XML tags present", () => {
    const out = postFormatForModel("Do the thing.", "claude");
    expect(out.startsWith("<task>")).toBe(true);
    expect(out.endsWith("</task>")).toBe(true);
  });

  it("leaves Claude prompts alone when they already use XML tags", () => {
    const input = "<context>x</context><task>y</task>";
    expect(postFormatForModel(input, "claude")).toBe(input);
  });

  it("converts Copilot prompts to comment style", () => {
    const out = postFormatForModel("write a function\nthat sorts", "copilot");
    expect(out.startsWith("// Intent:")).toBe(true);
    expect(out).toContain("// write a function");
    expect(out).toContain("// that sorts");
  });

  it("returns ChatGPT and generic prompts unchanged", () => {
    expect(postFormatForModel("hello", "chatgpt")).toBe("hello");
    expect(postFormatForModel("hello", "generic")).toBe("hello");
  });
});


vi.mock("@/lib/llm/ollama", () => ({ generateJson: vi.fn() }));
import { generateJson } from "@/lib/llm/ollama";
import { reconstructPrompt } from "./formatter";
it.each([null, {}, { raw: "not JSON" }, { final_prompt: "" }, { final_prompt: "  " }, { final_prompt: 10 }])("rejects invalid model output without relabelling a skeleton as AI %#", async output => {
  vi.mocked(generateJson).mockResolvedValueOnce(output as never);
  await expect(reconstructPrompt({ rawPrompt: "write an email", intent: "writing", qa: [] })).rejects.toThrow("invalid_model_response");
});
it("returns only validated model output", async () => {
  vi.mocked(generateJson).mockResolvedValueOnce({ final_prompt: "A verified response shape", rationale: "Structured by model" });
  await expect(reconstructPrompt({ rawPrompt: "test", intent: "other", qa: [] })).resolves.toEqual({ final_prompt: "A verified response shape", rationale: "Structured by model" });
});
