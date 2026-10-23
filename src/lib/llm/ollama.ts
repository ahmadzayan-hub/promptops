import { env } from "@/lib/env";
import { ModelError, providerHttpError, transportError } from "./errors";

export interface OllamaOptions {
  model?: string;
  system?: string;
  temperature?: number;
  format?: "json";
  signal?: AbortSignal;
  maxTokens?: number;
}

interface OllamaResponse {
  response: string;
  done: boolean;
}

/**
 * Single-shot generate against a local Ollama daemon.
 * Self-hosted inference. Hardware, hosting and model-license requirements apply.
 */
export class LlmUnreachableError extends Error {
  readonly code = "llm_unreachable";
  constructor(public baseUrl: string, cause?: unknown) {
    super(`Cannot reach Ollama at ${baseUrl}. Start it with 'ollama serve' or set OLLAMA_BASE_URL.`);
    if (cause) (this as { cause?: unknown }).cause = cause;
  }
}

export async function generate(prompt: string, opts: OllamaOptions = {}): Promise<string> {
  const body = {
    model: opts.model ?? env.ollamaReasoning,
    prompt,
    system: opts.system,
    stream: false,
    format: opts.format,
    options: { temperature: opts.temperature ?? 0.2, ...(opts.maxTokens ? { num_predict: opts.maxTokens } : {}) }
  };

  const signal = opts.signal ? AbortSignal.any([opts.signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000);
  let res: Response;
  try {
    res = await fetch(`${env.ollamaBaseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal
    });
  } catch (e) {
    // Network-level failure (refused, DNS, timeout) · surface a clean error
    if (signal.aborted) throw transportError(signal);
    throw new LlmUnreachableError(env.ollamaBaseUrl, e);
  }

  if (!res.ok) {
    throw providerHttpError(res.status, res.headers.get("retry-after"));
  }
  let data: OllamaResponse;
  try { data = await res.json(); } catch { if (signal.aborted) throw transportError(signal); throw new ModelError("invalid_model_response", 502); }
  if (typeof data?.response !== "string" || !data.response.trim() || data.done !== true || (data as { done_reason?: string }).done_reason === "length") throw new ModelError("invalid_model_response", 502);
  return data.response.trim();
}

/** Generate and parse JSON. Falls back to a {raw} envelope on parse failure. */
export async function generateJson<T = unknown>(
  prompt: string,
  opts: OllamaOptions = {}
): Promise<T | { raw: string }> {
  const raw = await generate(prompt, { ...opts, format: "json" });
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Try to recover the first {...} block
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        /* fallthrough */
      }
    }
    return { raw };
  }
}

