import { NextResponse } from "next/server";
import { env, isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";
export async function GET() {
  let ollama: "unconfigured" | "unreachable" | "reachable" = "unconfigured";
  // Do not pretend a Vercel localhost is the user's computer. Probe only an
  // explicitly configured provider, never a URL supplied by an HTTP client.
  if (process.env.OLLAMA_BASE_URL) {
    ollama = "unreachable";
    try {
      const response = await fetch(`${env.ollamaBaseUrl}/api/tags`, { signal: AbortSignal.timeout(2500), cache: "no-store" });
      const data = response.ok ? await response.json() : null;
      if (Array.isArray(data?.models)) ollama = "reachable";
    } catch { /* Report unavailable without leaking provider URLs or errors. */ }
  }
  return NextResponse.json({ status: "ok", service: "promptops", composer: { engine: "local-rules", available: true, requiresAccount: false }, workspace: { configured: isSupabaseConfigured(), verified: false }, ollama: { status: ollama, modelVerified: false } }, { headers: { "Cache-Control": "no-store" } });
}
