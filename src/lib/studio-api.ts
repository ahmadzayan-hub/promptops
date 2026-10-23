import { z } from "zod";

const SessionSchema = z.object({
  id: z.string().min(1),
  questions: z.array(z.object({ id: z.string(), question: z.string(), position: z.number(), required: z.boolean(), rationale: z.string().nullable().optional() })).default([]),
  prompt_versions: z.array(z.object({ version: z.number(), final_prompt: z.string().min(1), rationale: z.string().nullable().optional() })).default([]),
});
export type StudioSession = z.infer<typeof SessionSchema>;
export function parseStudioSession(value: unknown): StudioSession {
  if (value && typeof value === "object" && "unavailable" in value && value.unavailable === true) {
    const reason = "reason" in value && typeof value.reason === "string" ? value.reason : "unavailable";
    throw new Error(reason);
  }
  const result = z.object({ session: SessionSchema }).safeParse(value);
  if (!result.success) throw new Error("invalid_session_response");
  return result.data.session;
}
export async function postStudioSession(raw: string, target: string, signal?: AbortSignal): Promise<StudioSession> {
  const res = await fetch("/api/sessions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ raw_prompt: raw, target_model: target, quick: true }), signal });
  let body: unknown;
  try { body = await res.json(); } catch { throw new Error("invalid_session_response"); }
  if (!res.ok) {
    const data = body as { reason?: unknown; error?: unknown } | null;
    throw new Error(typeof data?.reason === "string" ? data.reason : typeof data?.error === "string" ? data.error : `request_failed_${res.status}`);
  }
  return parseStudioSession(body);
}
