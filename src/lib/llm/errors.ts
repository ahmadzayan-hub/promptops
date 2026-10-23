export type ModelErrorCode = "provider_not_configured" | "missing_key" | "no_spend_not_confirmed" | "model_unavailable" | "provider_auth" | "quota_exhausted" | "billing_required" | "provider_timeout" | "request_cancelled" | "provider_unavailable" | "invalid_model_response";
export class ModelError extends Error {
  constructor(readonly code: ModelErrorCode, readonly status = 503, readonly retryAfter?: number) { super(code); }
}
export function providerHttpError(status: number, retryAfter: string | null = null): ModelError {
  if (status === 401 || status === 403) return new ModelError("provider_auth", 503);
  if (status === 402) return new ModelError("billing_required", 503);
  if (status === 404 || status === 410) return new ModelError("model_unavailable", 503);
  if (status === 429) {
    const seconds = Number(retryAfter);
    return new ModelError("quota_exhausted", 429, Number.isFinite(seconds) && seconds > 0 ? Math.min(Math.ceil(seconds), 86400) : undefined);
  }
  return new ModelError("provider_unavailable", 503);
}
export function transportError(signal: AbortSignal): ModelError {
  return new ModelError(signal.aborted ? (signal.reason?.name === "TimeoutError" ? "provider_timeout" : "request_cancelled") : "provider_unavailable", 503);
}
