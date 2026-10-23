import { NextResponse } from "next/server";
import { safeRoute } from "@/lib/api-helpers";
import { requireUserOrg } from "@/lib/services/auth";
import { getModelConfig, modelAvailability } from "@/lib/llm/config";
import { composeRequestSchema } from "@/lib/llm/compose-contract";
import { createReviewedDraft, understand } from "@/lib/llm/compose-pipeline";
import { jsonModel } from "@/lib/llm/provider";
import { DuplicateRequestError, oncePerProcess } from "@/lib/llm/request-cache";
import { readComposeBody } from "@/lib/llm/read-body";
import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";
export const maxDuration = 120;
const headers = { "Cache-Control": "no-store" };
// Configuration only: no credential exposure, account/provider calls or inference.
export async function GET() { return NextResponse.json({ ...modelAvailability(), workspaceConfigured: isSupabaseConfigured(), saved: false }, { headers }); }
export const POST = safeRoute(async (request: Request) => {
  // Cookie-authenticated, same-origin, workspace-member only. Not an anonymous proxy.
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "origin_required" }, { status: 403, headers });
  const auth = await requireUserOrg(request.headers.get("x-org-id"));
  if (auth instanceof NextResponse) return auth;
  let input: unknown;
  try { input = await readComposeBody(request); } catch (e) {
    const code = e instanceof Error && ["request_timeout", "request_too_large"].includes(e.message) ? e.message : "invalid_request";
    return NextResponse.json({ error: code }, { status: code === "request_timeout" ? 408 : code === "request_too_large" ? 413 : 400, headers });
  }
  const parsed = composeRequestSchema.safeParse(input);
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400, headers });
  const data = parsed.data;
  const config = getModelConfig();
  if (data.provider !== config.provider || data.model !== config.model) return NextResponse.json({ error: "provider_changed" }, { status: 409, headers });
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(110000)]);
  const model = jsonModel(config);
  try {
    const result = await oncePerProcess(`${auth.orgId}:${auth.userId}`, data.requestId, data, async () => data.phase === "understand" ? { analysis: await understand(data.raw, data.locale, model, signal) } : { result: await createReviewedDraft(data.raw, data.locale, data.analysis, data.answers, model, signal) });
    return NextResponse.json({ ...result, engine: "llm", ...config, saved: false, requestId: data.requestId }, { headers });
  } catch (e) { if (e instanceof DuplicateRequestError) return NextResponse.json({ error: "duplicate_request_conflict" }, { status: 409, headers }); throw e; }
});
