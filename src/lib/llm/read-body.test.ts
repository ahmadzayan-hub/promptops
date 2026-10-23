import { afterEach, describe, expect, it, vi } from 'vitest';
import { readComposeBody } from './read-body';
afterEach(() => vi.useRealTimers());
describe('request body bounds', () => {
  it('rejects oversized bodies without trusting Content-Length', async () => { await expect(readComposeBody(new Request('https://example.test', { method: 'POST', body: 'x'.repeat(64001) }))).rejects.toThrow('request_too_large'); });
  it('times out a stalled stream and cancels the reader', async () => {
    vi.useFakeTimers(); const cancel = vi.fn();
    const body = new ReadableStream({ cancel });
    const request = new Request('https://example.test', { method: 'POST', body, duplex: 'half' } as RequestInit);
    const pending = expect(readComposeBody(request)).rejects.toThrow('request_timeout'); await vi.advanceTimersByTimeAsync(5001); await pending; expect(cancel).toHaveBeenCalledOnce();
  });
});
