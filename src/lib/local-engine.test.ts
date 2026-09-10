import { describe, it, expect } from "vitest";
import {
  detectIntentLocal,
  generateQuestionsLocal,
  reconstructPromptLocal
} from "./local-engine";

describe("detectIntentLocal", () => {
  it("classifies image-generation prompts as 'image'", () => {
    expect(detectIntentLocal("Generate a Midjourney image of a cyberpunk lion").intent).toBe("image");
    expect(detectIntentLocal("صورة لأسد سايبر بانك بأسلوب ميد جورني").intent).toBe("image");
  });

  it("classifies video prompts as 'video'", () => {
    expect(detectIntentLocal("30s YouTube short, cinematic, 9:16 aspect ratio").intent).toBe("video");
    expect(detectIntentLocal("ريل تيك توك مدّته 30 ثانية").intent).toBe("video");
  });

  it("classifies audio/podcast prompts as 'audio'", () => {
    expect(detectIntentLocal("Outline a 5-episode podcast on stoicism").intent).toBe("audio");
    expect(detectIntentLocal("اكتب نص تعليق صوتي لإعلان قصير").intent).toBe("audio");
  });

  it("prefers 'website' over 'coding' for landing-page prompts", () => {
    const r = detectIntentLocal("Build a landing page hero section for my SaaS");
    expect(r.intent).toBe("website");
  });

  it("prefers 'software' over 'coding' for full-app asks", () => {
    const r = detectIntentLocal("Build an iOS app that tracks reading habits");
    expect(r.intent).toBe("software");
  });

  it("recognises 'report' for whitepaper / case-study language", () => {
    expect(detectIntentLocal("Write a whitepaper on adoption of AI in UAE").intent).toBe("report");
    expect(detectIntentLocal("اكتب تقريرًا عن تبنّي الذكاء الاصطناعي في الإمارات").intent).toBe("report");
  });

  it("falls back to coding/writing for the legacy keywords", () => {
    expect(detectIntentLocal("refactor my React data table").intent).toBe("coding");
    expect(detectIntentLocal("write a tweet for my SaaS").intent).toBe("writing");
  });
});

describe("generateQuestionsLocal", () => {
  it("emits image-specific questions for the image intent", () => {
    const qs = generateQuestionsLocal("a cyberpunk lion", "image", "en");
    expect(qs.length).toBeGreaterThan(0);
    const text = qs.map((q) => q.question).join(" ");
    expect(text.toLowerCase()).toMatch(/style|lighting|composition|subject/);
  });

  it("emits up to 4 questions for production intents and 3 for others", () => {
    const img = generateQuestionsLocal("logo for a coffee shop", "image", "en");
    const writing = generateQuestionsLocal("tweet about coffee", "writing", "en");
    expect(img.length).toBeLessThanOrEqual(4);
    expect(writing.length).toBeLessThanOrEqual(3);
  });

  it("returns Arabic strings for ar locale", () => {
    const qs = generateQuestionsLocal("بودكاست عن العادات", "audio", "ar");
    expect(qs.length).toBeGreaterThan(0);
    expect(qs[0].question).toMatch(/[؀-ۿ]/);
  });
});

describe("reconstructPromptLocal", () => {
  it("appends an image-specific section for image prompts", () => {
    const out = reconstructPromptLocal({
      raw: "a cyberpunk lion",
      intent: "image",
      qa: [],
      targetModel: "chatgpt",
      locale: "en"
    });
    expect(out.final_prompt.toLowerCase()).toContain("style");
    expect(out.final_prompt.toLowerCase()).toContain("negative prompt");
  });

  it("appends a video plan for video prompts", () => {
    const out = reconstructPromptLocal({
      raw: "30s reel",
      intent: "video",
      qa: [],
      targetModel: "claude",
      locale: "en"
    });
    expect(out.final_prompt.toLowerCase()).toContain("shot list");
    expect(out.final_prompt.toLowerCase()).toContain("aspect ratio");
  });

  it("appends a software product spec for software prompts", () => {
    const out = reconstructPromptLocal({
      raw: "habit tracking app",
      intent: "software",
      qa: [],
      targetModel: "chatgpt",
      locale: "en"
    });
    expect(out.final_prompt.toLowerCase()).toContain("acceptance tests");
    expect(out.final_prompt.toLowerCase()).toContain("out of scope");
  });

  it("appends report structure for report prompts", () => {
    const out = reconstructPromptLocal({
      raw: "AI adoption in UAE",
      intent: "report",
      qa: [],
      targetModel: "gemini",
      locale: "en"
    });
    expect(out.final_prompt.toLowerCase()).toContain("executive summary");
    expect(out.final_prompt.toLowerCase()).toContain("references");
  });

  it("does not break legacy intents", () => {
    const out = reconstructPromptLocal({
      raw: "refactor my React table",
      intent: "coding",
      qa: [{ question: "Language?", answer: "TypeScript" }],
      targetModel: "chatgpt",
      locale: "en"
    });
    expect(out.final_prompt).toContain("TypeScript");
    expect(out.final_prompt).toContain("refactor my React table");
  });
});
