import { z } from "zod";

const text = z.string().trim().min(1).max(2000);
export const analysisSchema = z.object({
  intent: text,
  protectedQuotes: z.array(z.string().min(1).max(1500)).min(1).max(20),
  questions: z.array(z.object({ id: z.enum(["q1", "q2", "q3"]), question: text, why: text }).strict()).max(3),
}).strict();
export type Analysis = z.infer<typeof analysisSchema>;
export const draftSchema = z.object({
  role: text, task: text, context: z.string().max(4000), constraints: z.string().max(4000), outputFormat: text, reviewCriteria: text,
  assumptions: z.array(text).max(10), unresolved: z.array(text).max(10),
}).strict();
export type Draft = z.infer<typeof draftSchema>;
export const reviewSchema = z.object({
  meaningPreserved: z.boolean(), noInventedFacts: z.boolean(), constraintsPreserved: z.boolean(),
  coverage: z.array(z.object({ quote: text, draftExcerpt: text }).strict()).max(24),
  issues: z.array(text).max(20),
}).strict();
export type Review = z.infer<typeof reviewSchema>;
const common = { requestId: z.string().uuid(), raw: z.string().min(1).max(8000).refine(s => !!s.trim()), locale: z.enum(["en", "ar"]), consent: z.literal(true), provider: z.enum(["ollama", "groq"]), model: z.string().min(1).max(100) };
export const composeRequestSchema = z.discriminatedUnion("phase", [
  z.object({ ...common, phase: z.literal("understand") }).strict(),
  z.object({ ...common, phase: z.literal("draft"), analysis: analysisSchema, answers: z.record(z.string().max(1000)).refine(a => Object.keys(a).length <= 3 && Object.keys(a).every(k => ["q1", "q2", "q3"].includes(k))) }).strict(),
]);
export type ComposeRequest = z.infer<typeof composeRequestSchema>;
export const composeResultSchema = z.object({
  draft: draftSchema, finalPrompt: z.string().min(1).max(30000), review: reviewSchema,
  modelReview: z.enum(["passed", "needs_changes"]), issues: z.array(z.string()).max(50), repaired: z.boolean(), humanReviewRequired: z.literal(true),
});
export type ComposeResult = z.infer<typeof composeResultSchema>;
