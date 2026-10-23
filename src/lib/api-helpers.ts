import { ModelError } from "@/lib/llm/errors";
import { NextResponse } from "next/server";
import { LlmUnreachableError } from "@/lib/llm/ollama";
import { isSupabaseConfigured } from "@/lib/env";

const SUPABASE_NOT_CONFIGURED = /Supabase env not configured|SUPABASE_SERVICE_ROLE_KEY not configured/i;
/** Public errors expose stable categories, never raw provider URLs or secrets. */
export function handleError(error: unknown): NextResponse {
  if (error instanceof ModelError) return NextResponse.json({ unavailable: true, reason: error.code, message: "The model request could not be completed.", ...(error.retryAfter ? { retryAfter: error.retryAfter } : {}) }, { status: error.status, headers: error.retryAfter ? { "Retry-After": String(error.retryAfter) } : {} });
  if (error instanceof LlmUnreachableError) {
    return NextResponse.json({ unavailable: true, reason: "llm_unreachable", message: "The configured language model is unavailable.", hint: "Check the server's Ollama configuration. Your local draft is unchanged." }, { status: 503 });
  }
  if (error instanceof Error && SUPABASE_NOT_CONFIGURED.test(error.message)) {
    return NextResponse.json({ unavailable: true, reason: "backend_not_configured", message: "The workspace service is not configured." }, { status: 503 });
  }
  console.error("[api] internal_error");
  return NextResponse.json({ error: "internal", message: "The server could not complete the request." }, { status: 500 });
}
export function safeRoute<Args extends unknown[]>(handler: (...args: Args) => Promise<NextResponse> | NextResponse) {
  return async (...args: Args): Promise<NextResponse> => {
    if (!isSupabaseConfigured()) return NextResponse.json({ unavailable: true, reason: "backend_not_configured", message: "The workspace service is not configured. Local composition remains available." }, { status: 503 });
    try { return await handler(...args); } catch (error) { return handleError(error); }
  };
}
