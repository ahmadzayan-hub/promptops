import { ModelError } from "./errors";

// Verified against Groq's production-model and deprecation docs, 2026-10-23.
// Availability and account eligibility are not a promise of unlimited/free use.
export const GROQ_MODELS = ["openai/gpt-oss-20b", "openai/gpt-oss-120b"] as const;
export type ModelConfig = { provider: "ollama" | "groq"; model: string };
export function getModelConfig(): ModelConfig {
  const provider = process.env.PROMPTOPS_LLM_PROVIDER;
  if (provider === "ollama") {
    const model = process.env.OLLAMA_MODEL_REASONING;
    if (!model || !process.env.OLLAMA_BASE_URL) throw new ModelError("provider_not_configured");
    if (!/^[a-zA-Z0-9_.:/-]{1,100}$/.test(model)) throw new ModelError("model_unavailable");
    return { provider, model };
  }
  if (provider === "groq") {
    if (!process.env.GROQ_API_KEY) throw new ModelError("missing_key");
    if (process.env.GROQ_NO_SPEND_CONFIRMED !== "true") throw new ModelError("no_spend_not_confirmed");
    const model = process.env.GROQ_MODEL ?? GROQ_MODELS[0];
    if (!(GROQ_MODELS as readonly string[]).includes(model)) throw new ModelError("model_unavailable");
    return { provider, model };
  }
  throw new ModelError("provider_not_configured");
}
export function modelAvailability() {
  try { return { ...getModelConfig(), configured: true as const, verified: false as const }; }
  catch (e) { return { provider: process.env.PROMPTOPS_LLM_PROVIDER === "groq" ? "groq" as const : process.env.PROMPTOPS_LLM_PROVIDER === "ollama" ? "ollama" as const : "unconfigured" as const, configured: false as const, verified: false as const, reason: e instanceof ModelError ? e.code : "provider_not_configured" }; }
}
