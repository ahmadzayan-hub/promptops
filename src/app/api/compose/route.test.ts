import { beforeEach, describe, it, expect, vi } from 'vitest';
import { NextResponse } from 'next/server';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), understand: vi.fn(), draft: vi.fn(), configured: vi.fn(() => true) }));
vi.mock('@/lib/services/auth', () => ({ requireUserOrg: mocks.auth }));
vi.mock('@/lib/env', () => ({ isSupabaseConfigured: mocks.configured, env: {} }));
vi.mock('@/lib/llm/config', () => ({ getModelConfig: () => ({ provider: 'groq', model: 'openai/gpt-oss-20b' }), modelAvailability: () => ({ provider: 'groq', model: 'openai/gpt-oss-20b', configured: true, verified: false }) }));
vi.mock('@/lib/llm/provider', () => ({ jsonModel: () => vi.fn() }));
vi.mock('@/lib/llm/compose-pipeline', () => ({ understand: mocks.understand, createReviewedDraft: mocks.draft }));
import { POST, GET } from './route';
const input = () => ({ requestId: crypto.randomUUID(), phase: 'understand', raw: 'hello', locale: 'en', consent: true, provider: 'groq', model: 'openai/gpt-oss-20b' });
const request = (body: unknown, origin = 'https://promptops.test') => new Request('https://promptops.test/api/compose', { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
beforeEach(() => { vi.clearAllMocks(); mocks.configured.mockReturnValue(true); mocks.auth.mockResolvedValue({ userId: crypto.randomUUID(), orgId: 'org' }); mocks.understand.mockResolvedValue({ intent: 'greeting', protectedQuotes: ['hello'], questions: [] }); });
describe('authenticated stateless compose endpoint', () => {
  it('GET performs no inference and explicitly does not verify model health', async () => { const response = await GET(); expect(await response.json()).toMatchObject({ configured: true, verified: false, saved: false }); expect(mocks.understand).not.toHaveBeenCalled(); });
  it('blocks cross-origin, unauthenticated and nonconsenting requests before inference', async () => {
    expect((await POST(request(input(), 'https://attacker.test'))).status).toBe(403);
    mocks.auth.mockResolvedValueOnce(NextResponse.json({ error: 'unauthenticated' }, { status: 401 })); expect((await POST(request(input()))).status).toBe(401);
    expect((await POST(request({ ...input(), consent: false }))).status).toBe(400); expect(mocks.understand).not.toHaveBeenCalled();
  });
  it('rejects changed destination and never silently switches the model', async () => { expect((await POST(request({ ...input(), provider: 'ollama' }))).status).toBe(409); expect(mocks.understand).not.toHaveBeenCalled(); });
  it('returns actual analysis with no persistent session writes', async () => { const body = input(); const response = await POST(request(body)); expect(await response.json()).toMatchObject({ engine: 'llm', provider: 'groq', saved: false, requestId: body.requestId }); expect(mocks.understand).toHaveBeenCalledOnce(); });
});
