import { afterEach, describe, expect, it, vi } from "vitest";
import { handleError } from "./api-helpers";
import { LlmUnreachableError } from "./llm/ollama";
afterEach(() => vi.restoreAllMocks());
describe('public server errors', () => {
  it.each([
    new LlmUnreachableError('https://synthetic-user:synthetic-secret@example.invalid/path?token=synthetic-token'),
    new Error('Failed at https://synthetic-user:synthetic-secret@example.invalid/?token=synthetic-token'),
    new Error('Supabase env not configured: synthetic-secret'),
  ])('does not disclose provider details in responses or logs %#', async error => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = handleError(error);
    const text = await response.text();
    expect(text).not.toMatch(/synthetic|example\.invalid|https:|base_url/);
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/synthetic|example\.invalid|https:/);
    expect([500, 503]).toContain(response.status);
  });
});
