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
