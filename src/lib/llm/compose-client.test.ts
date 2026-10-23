import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestComposition } from './compose-client';
import type { ComposeRequest } from './compose-contract';
const request: ComposeRequest = { requestId: '8fe477ca-ac1b-403e-8ee5-731f464980ca', raw: 'hello', locale: 'en', consent: true, phase: 'understand', provider: 'groq', model: 'openai/gpt-oss-20b' };
afterEach(() => vi.unstubAllGlobals());
describe('client response contract', () => {
  it('distinguishes HTTP 200 unavailable from malformed success instead of reading undefined.questions', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ unavailable: true, reason: 'missing_key' }))));
    await expect(requestComposition(request, new AbortController().signal)).rejects.toMatchObject({ code: 'missing_key', uncertain: false });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ engine: 'llm' }))));
    await expect(requestComposition(request, new AbortController().signal)).rejects.toMatchObject({ code: 'invalid_response', uncertain: true });
  });
  it('rejects a success for a different request/provider and does not retry', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ engine: 'llm', saved: false, requestId: request.requestId, provider: 'ollama', model: 'wrong', analysis: { intent: 'x', protectedQuotes: ['hello'], questions: [] } }))); vi.stubGlobal('fetch', fetch);
    await expect(requestComposition(request, new AbortController().signal)).rejects.toMatchObject({ code: 'invalid_response' }); expect(fetch).toHaveBeenCalledOnce();
  });
  it('preserves uncertainty when a request is cancelled or transport is lost', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError')));
    await expect(requestComposition(request, new AbortController().signal)).rejects.toMatchObject({ uncertain: true });
  });
});
