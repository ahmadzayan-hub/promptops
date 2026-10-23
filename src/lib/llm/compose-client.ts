import { z } from "zod";
import { analysisSchema, composeResultSchema, type ComposeRequest } from "./compose-contract";
export const availabilitySchema = z.object({ provider: z.enum(["ollama", "groq", "unconfigured"]), model: z.string().optional(), configured: z.boolean(), verified: z.literal(false), workspaceConfigured: z.boolean(), reason: z.string().optional() });
export type Availability = z.infer<typeof availabilitySchema>;
export class ComposeClientError extends Error {
  constructor(readonly code: string, readonly uncertain = false, readonly retryAfter = 0) { super(code); }
}
export async function requestComposition(data: ComposeRequest, signal: AbortSignal) {
  let response: Response;
  try { response = await fetch("/api/compose", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), signal }); }
  catch { throw new ComposeClientError("request_uncertain", true); }
  let json: unknown;
  try { json = await response.json(); } catch { throw new ComposeClientError("invalid_response", true); }
  const failure = z.object({ reason: z.string().optional(), error: z.string().optional(), retryAfter: z.number().positive().max(86400).optional() }).passthrough().safeParse(json);
  if (!response.ok || (json as { unavailable?: boolean })?.unavailable) {
    const code = failure.success ? failure.data.reason ?? failure.data.error ?? "provider_unavailable" : "provider_unavailable";
    throw new ComposeClientError(code, ["provider_timeout", "request_cancelled"].includes(code), failure.success ? failure.data.retryAfter ?? 0 : 0);
  }
  const base = z.object({ engine: z.literal("llm"), provider: z.literal(data.provider), model: z.literal(data.model), saved: z.literal(false), requestId: z.literal(data.requestId) });
  const parsed = data.phase === "understand" ? base.extend({ analysis: analysisSchema }).safeParse(json) : base.extend({ result: composeResultSchema }).safeParse(json);
  if (!parsed.success) throw new ComposeClientError("invalid_response", true);
  return parsed.data;
}
