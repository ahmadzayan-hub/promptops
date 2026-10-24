import { describe, expect, it } from "vitest";
import { analysisSchema, composeRequestSchema, composeResultSchema, draftSchema, reviewSchema } from "./compose-contract";

const analysis = { intent: "Write an email", protectedQuotes: ["Do not promise a date."], questions: [] };
const request = { requestId: "8fe477ca-ac1b-403e-8ee5-731f464980ca", raw: "Do not promise a date.", locale: "en", consent: true, provider: "groq", model: "openai/gpt-oss-20b" };
const draft = { role: "Writer", task: "Write an email", context: "", constraints: "Do not promise a date.", outputFormat: "Email", reviewCriteria: "Preserve meaning", assumptions: [], unresolved: [] };
const review = { meaningPreserved: true, noInventedFacts: true, constraintsPreserved: true, coverage: [], issues: [] };

// Small synthetic fixtures prove early rejection without attempting exhaustion.
function unreadableItems(length: number): unknown[] {
  const values = new Array(length);
  Object.defineProperty(values, 0, { get() { throw new Error("oversized element was read"); } });
  return values;
}

describe("Zod 4 compose contract compatibility", () => {
  it.each(["en", "ar"])("parses the %s understanding request without rewriting the original", locale => {
    const raw = "  لا تعد بتاريخ. Do not promise a date.  ";
    expect(composeRequestSchema.parse({ ...request, raw, locale, phase: "understand" }).raw).toBe(raw);
  });

  it.each([{}, { q1: "" }, { q2: "Unknown" }, { q1: "One", q2: "Two", q3: "Three" }])("preserves partial and empty answer records %#", answers => {
    expect(composeRequestSchema.parse({ ...request, phase: "draft", analysis, answers })).toMatchObject({ answers });
  });

  it.each([{ q4: "No" }, { q1: "a".repeat(1001) }, { q1: "One", q2: "Two", q3: "Three", q4: "Four" }, { q1: 10 }])("rejects invalid answer keys, lengths and types %#", answers => {
    expect(composeRequestSchema.safeParse({ ...request, phase: "draft", analysis, answers }).success).toBe(false);
  });

  it.each([{ raw: "   " }, { consent: false }, { phase: "other" }, { unexpected: true }, { requestId: "not-a-uuid" }])("retains refinements, discriminators and strict objects %#", changes => {
    expect(composeRequestSchema.safeParse({ ...request, phase: "understand", ...changes }).success).toBe(false);
  });

  it("preserves the flattened error envelope, not version-specific English messages", () => {
    const parsed = composeRequestSchema.safeParse({ ...request, phase: "understand", raw: " ", consent: false });
    expect(parsed.success).toBe(false);
    if (parsed.success) throw new Error("invalid fixture accepted");
    expect(parsed.error.flatten()).toEqual({ formErrors: [], fieldErrors: { raw: [expect.any(String)], consent: [expect.any(String)] } });
  });

  it("retains trimming, strict model output and mandatory human review", () => {
    expect(analysisSchema.parse({ ...analysis, intent: "  Write an email  " }).intent).toBe("Write an email");
    expect(analysisSchema.safeParse({ ...analysis, approved: true }).success).toBe(false);
    const result = { draft, review, finalPrompt: "Draft", modelReview: "passed", issues: [], repaired: false, humanReviewRequired: true };
    expect(composeResultSchema.parse(result)).toEqual(result);
    expect(composeResultSchema.safeParse({ ...result, humanReviewRequired: false }).success).toBe(false);
  });

  it.each([
    ["protectedQuotes", 21], ["questions", 4],
  ] as const)("rejects oversized analysis %s before reading any element", (key, length) => {
    const parsed = analysisSchema.safeParse({ ...analysis, [key]: unreadableItems(length) });
    expect(parsed.success).toBe(false);
    if (parsed.success) throw new Error("oversized fixture accepted");
    expect(parsed.error.issues).toEqual([expect.objectContaining({ code: "too_big", path: [key] })]);
  });

  it.each(["assumptions", "unresolved"] as const)("rejects oversized draft %s before reading any element", key => {
    const parsed = draftSchema.safeParse({ ...draft, [key]: unreadableItems(11) });
    expect(parsed.success).toBe(false);
    if (parsed.success) throw new Error("oversized fixture accepted");
    expect(parsed.error.issues).toEqual([expect.objectContaining({ code: "too_big", path: [key] })]);
  });

  it.each([["coverage", 25], ["issues", 21]] as const)("rejects oversized review %s before reading any element", (key, length) => {
    const parsed = reviewSchema.safeParse({ ...review, [key]: unreadableItems(length) });
    expect(parsed.success).toBe(false);
    if (parsed.success) throw new Error("oversized fixture accepted");
    expect(parsed.error.issues).toEqual([expect.objectContaining({ code: "too_big", path: [key] })]);
  });

  it("rejects oversized combined review issues before reading any element", () => {
    const parsed = composeResultSchema.safeParse({ draft, review, finalPrompt: "Draft", modelReview: "passed", issues: unreadableItems(51), repaired: false, humanReviewRequired: true });
    expect(parsed.success).toBe(false);
    if (parsed.success) throw new Error("oversized fixture accepted");
    expect(parsed.error.issues).toEqual([expect.objectContaining({ code: "too_big", path: ["issues"] })]);
  });
});
