import { generate } from "./ollama";
import { type ModelConfig } from "./config";
import { ModelError, providerHttpError, transportError } from "./errors";

export type JsonModel = (system: string, data: unknown, signal: AbortSignal) => Promise<unknown>;
/** No SDK auto-retries, model switching, tools, web search, or provider fallback. */
export function jsonModel(config: ModelConfig): JsonModel {
  return async (system, data, signal) => {
    if (signal.aborted) throw transportError(signal);
    let raw: string;
    if (config.provider === "ollama") {
      raw = await generate(JSON.stringify(data), { model: config.model, system, format: "json", signal, maxTokens: 3000 });
    } else {
      const bounded = AbortSignal.any([signal, AbortSignal.timeout(30000)]);
      let response: Response;
      try {
        response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST", cache: "no-store", signal: bounded,
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
          body: JSON.stringify({ model: config.model, messages: [{ role: "system", content: system }, { role: "user", content: JSON.stringify(data) }], response_format: { type: "json_object" }, temperature: 0.2, max_completion_tokens: 3000, stream: false }),
        });
      } catch { throw transportError(bounded); }
      if (!response.ok) throw providerHttpError(response.status, response.headers.get("retry-after"));
      try {
        const body = await response.json();
        if (body?.choices?.[0]?.finish_reason !== "stop" || typeof body?.choices?.[0]?.message?.content !== "string") throw new Error();
        raw = body.choices[0].message.content;
      } catch { if (bounded.aborted) throw transportError(bounded); throw new ModelError("invalid_model_response", 502); }
    }
    if (signal.aborted) throw transportError(signal);
    try { return JSON.parse(raw); } catch { throw new ModelError("invalid_model_response", 502); }
  };
}
