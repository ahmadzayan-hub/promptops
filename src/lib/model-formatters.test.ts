import { describe, it, expect } from "vitest";
import { formatPromptFor, type FormatInput } from "./model-formatters";
import type { PromptStyle } from "./ai-models";

const baseInput: FormatInput = {
  raw: "refactor my React table for 50000 rows",
  intent: "coding",
  qa: [
    { question: "Stack?",         answer: "TypeScript + Next.js 14" },
    { question: "Done means?",    answer: "60fps scroll on iPhone 12" }
  ],
  locale: "en"
};

describe("formatPromptFor — text styles", () => {
  it("openai-system has a System section and the task", () => {
    const out = formatPromptFor("openai-system", baseInput);
    expect(out).toContain("# System");
    expect(out).toContain("refactor my React table");
    expect(out).toContain("60fps");
  });

  it("claude-xml wraps in XML tags", () => {
    const out = formatPromptFor("claude-xml", baseInput);
    expect(out).toContain("<role>");
    expect(out).toContain("<task>");
    expect(out).toContain("<format>");
    expect(out).toContain("refactor my React table");
  });

  it("gemini-multimodal mentions structured + JSON", () => {
    const out = formatPromptFor("gemini-multimodal", baseInput);
    expect(out.toLowerCase()).toContain("json");
  });

  it("grok-realtime references real-time data", () => {
    const out = formatPromptFor("grok-realtime", baseInput);
    expect(out.toLowerCase()).toContain("real-time");
  });

  it("deepseek-reason asks for step-by-step reasoning", () => {
    const out = formatPromptFor("deepseek-reason", baseInput);
    expect(out.toLowerCase()).toContain("step-by-step");
  });

  it("llama-instruct uses [INST] markers", () => {
    const out = formatPromptFor("llama-instruct", baseInput);
    expect(out).toContain("[INST]");
    expect(out).toContain("[/INST]");
  });

  it("cohere-tools emits a JSON template", () => {
    const out = formatPromptFor("cohere-tools", baseInput);
    expect(out).toContain('"answer"');
    expect(out).toContain('"confidence"');
  });
});

describe("formatPromptFor — image styles", () => {
  const imgInput: FormatInput = {
    raw: "a cyberpunk lion at neon-lit street",
    intent: "image",
    qa: [{ question: "Style?", answer: "cinematic, high-detail" }],
    locale: "en"
  };

  it("midjourney-args ends with --v 7", () => {
    const out = formatPromptFor("midjourney-args", imgInput);
    expect(out).toContain("--v 7");
    expect(out).toContain("--ar");
    expect(out).toContain("--s");
  });

  it("sdxl-tags has a Negative prompt section", () => {
    const out = formatPromptFor("sdxl-tags", imgInput);
    expect(out.toLowerCase()).toContain("negative prompt:");
    expect(out.toLowerCase()).toContain("dpm++");
  });

  it("flux-natural mentions guidance + steps", () => {
    const out = formatPromptFor("flux-natural", imgInput);
    expect(out.toLowerCase()).toContain("guidance");
    expect(out.toLowerCase()).toContain("steps");
  });
});

describe("formatPromptFor — video", () => {
  const vid: FormatInput = {
    raw: "a falcon flying over Dubai skyline at sunrise",
    intent: "video",
    qa: [{ question: "Length?", answer: "12 seconds" }],
    locale: "en"
  };

  it("sora-shotlist contains a numbered shot list", () => {
    const out = formatPromptFor("sora-shotlist", vid);
    expect(out).toContain("Shots");
    expect(out).toMatch(/1\..*\n2\./);
  });

  it("veo-natural mentions audio sync", () => {
    const out = formatPromptFor("veo-natural", vid);
    expect(out.toLowerCase()).toContain("audio");
  });
});

describe("formatPromptFor — audio + code + generic", () => {
  it("music-prompt has Genre / Mood / Tempo", () => {
    const out = formatPromptFor("music-prompt", { ...baseInput, intent: "audio" });
    expect(out).toContain("Genre:");
    expect(out).toContain("Mood:");
    expect(out).toContain("Tempo:");
  });

  it("tts-elevenlabs uses <voice> + <emotion> tags", () => {
    const out = formatPromptFor("tts-elevenlabs", { ...baseInput, intent: "audio" });
    expect(out).toContain("<voice>");
    expect(out).toContain("<emotion>");
  });

  it("code-spec includes Acceptance criteria + Out of scope", () => {
    const out = formatPromptFor("code-spec", baseInput);
    expect(out).toContain("Acceptance criteria");
    expect(out).toContain("Out of scope");
  });

  it("falls back to generic for an unknown style", () => {
    const out = formatPromptFor("unknown-style" as PromptStyle, baseInput);
    expect(out).toContain("# Task");
    expect(out).toContain("refactor my React table");
  });
});

describe("Arabic locale", () => {
  it("uses Arabic section labels in claude-xml", () => {
    const out = formatPromptFor("claude-xml", { ...baseInput, locale: "ar" });
    expect(out).toMatch(/[؀-ۿ]/);
  });

  it("uses Arabic role + section labels in openai-system", () => {
    const out = formatPromptFor("openai-system", { ...baseInput, locale: "ar" });
    expect(out).toContain("# System");
    // Role line should contain Arabic letters
    expect(out).toMatch(/[؀-ۿ]/);
  });
});
