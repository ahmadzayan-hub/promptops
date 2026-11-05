import { afterEach, describe, expect, it, vi } from "vitest";
import { getModelConfig, modelAvailability } from "./config";
import { jsonModel } from "./provider";
import { handleError } from "../api-helpers";
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const configure = () => { vi.stubEnv('PROMPTOPS_LLM_PROVIDER', 'groq'); vi.stubEnv('GROQ_API_KEY', 'synthetic-secret-not-a-real-key'); vi.stubEnv('GROQ_NO_SPEND_CONFIRMED', 'true'); vi.stubEnv('GROQ_MODEL', 'openai/gpt-oss-20b'); };
describe('explicit provider configuration', () => {
  it('fails closed without provider, key, or account no-spend confirmation', () => {
    vi.stubEnv('PROMPTOPS_LLM_PROVIDER', ''); expect(() => getModelConfig()).toThrow('provider_not_configured');
    configure(); vi.stubEnv('GROQ_API_KEY', ''); expect(() => getModelConfig()).toThrow('missing_key');
    configure(); vi.stubEnv('GROQ_NO_SPEND_CONFIRMED', ''); expect(() => getModelConfig()).toThrow('no_spend_not_confirmed');
  });
  it.each(['llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'groq/compound', 'unknown'])('rejects retired/unreviewed model %s without auto substitution', model => { configure(); vi.stubEnv('GROQ_MODEL', model); expect(() => getModelConfig()).toThrow('model_unavailable'); });
  it('configuration never claims live verification or exposes keys', () => { configure(); expect(modelAvailability()).toMatchObject({ configured: true, verified: false }); expect(JSON.stringify(modelAvailability())).not.toContain('synthetic'); });
});
describe('provider failures and bounded calls', () => {
  it.each([[401, 'provider_auth'], [403, 'provider_auth'], [402, 'billing_required'], [404, 'model_unavailable'], [410, 'model_unavailable'], [429, 'quota_exhausted'], [500, 'provider_unavailable']])('sanitizes HTTP %s with no retry/fallback', async (status, code) => {
    configure(); const fetch = vi.fn().mockResolvedValue(new Response('synthetic-secret provider internals', { status: Number(status), headers: { 'retry-after': '12' } })); vi.stubGlobal('fetch', fetch);
    let error: unknown; try { await jsonModel(getModelConfig())('system', { original: 'hello' }, new AbortController().signal); } catch (e) { error = e; }
    expect(error).toMatchObject({ code }); expect(fetch).toHaveBeenCalledOnce();
    const response = handleError(error); expect(await response.text()).not.toContain('synthetic');
    if (status === 429) expect(response.headers.get('retry-after')).toBe('12');
  });
  it('handles timeout/cancel without retrying and ignores raw transport errors', async () => {
    configure(); const abort = new AbortController(); const fetch = vi.fn().mockImplementation(() => { abort.abort(new DOMException('secret', 'TimeoutError')); throw new Error('synthetic-secret'); }); vi.stubGlobal('fetch', fetch);
    await expect(jsonModel(getModelConfig())('system', {}, abort.signal)).rejects.toMatchObject({ code: 'provider_timeout' }); expect(fetch).toHaveBeenCalledOnce();
  });
  it.each([{ choices: [{ finish_reason: 'length', message: { content: '{}' } }] }, { choices: [{ finish_reason: 'stop', message: { content: 'not JSON' } }] }, {}])('fails closed on invalid or truncated model output %#', async body => {
    configure(); vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body)))); await expect(jsonModel(getModelConfig())('system', {}, new AbortController().signal)).rejects.toMatchObject({ code: 'invalid_model_response' });
  });
  it('uses only configured Groq endpoint, JSON mode and two separated messages with no tools', async () => {
    configure(); const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: '{"ok":true}' } }] }))); vi.stubGlobal('fetch', fetch);
    expect(await jsonModel(getModelConfig())('system', { original: 'untrusted' }, new AbortController().signal)).toEqual({ ok: true });
    expect(fetch.mock.calls[0][0]).toBe('https://api.groq.com/openai/v1/chat/completions'); const body = JSON.parse(fetch.mock.calls[0][1].body); expect(body.messages).toHaveLength(2); expect(body.tools).toBeUndefined(); expect(body.model).toBe('openai/gpt-oss-20b');
  });
});

describe('provider-specific structured output', () => {
  const schema = { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'], additionalProperties: false };
  const ollama = { provider: 'ollama' as const, model: 'local-model' };
  it.each([undefined, schema])('sends an optional schema only as Ollama format (%#)', async outputSchema => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ response: '{"ok":true}', done: true })));
    vi.stubGlobal('fetch', fetch);
    const signal = new AbortController().signal;
    expect(await jsonModel(ollama)('system', { original: 'hello' }, signal, outputSchema)).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/generate$/);
    expect(JSON.parse(init.body)).toMatchObject({ model: 'local-model', system: 'system', prompt: '{"original":"hello"}', format: outputSchema ?? 'json', stream: false, options: { num_predict: 3000 } });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
  it('keeps Groq JSON mode even when the composer supplies a schema', async () => {
    configure();
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: '{"ok":true}' } }] })));
    vi.stubGlobal('fetch', fetch);
    await jsonModel(getModelConfig())('system', {}, new AbortController().signal, schema);
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(body.format).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain('additionalProperties');
    expect(fetch).toHaveBeenCalledOnce();
  });
  it('does not retry or downgrade when Ollama rejects a schema', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('schema unsupported', { status: 400 }));
    vi.stubGlobal('fetch', fetch);
    await expect(jsonModel(ollama)('system', {}, new AbortController().signal, schema)).rejects.toMatchObject({ code: 'provider_unavailable' });
    expect(fetch).toHaveBeenCalledOnce();
  });
  it('does not send a schema request after cancellation', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const controller = new AbortController(); controller.abort();
    await expect(jsonModel(ollama)('system', {}, controller.signal, schema)).rejects.toMatchObject({ code: 'request_cancelled' });
    expect(fetch).not.toHaveBeenCalled();
  });
});
