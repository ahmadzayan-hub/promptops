import { describe, it, expect, vi } from 'vitest';
import { oncePerProcess } from './request-cache';
describe('bounded process-local deduplication, not durable exactly-once', () => {
  it('shares identical in-flight/completed requests but rejects reused IDs with changed data', async () => {
    const run = vi.fn().mockResolvedValue('done'); const id = crypto.randomUUID();
    expect(await Promise.all([oncePerProcess('u1', id, { raw: 'x' }, run), oncePerProcess('u1', id, { raw: 'x' }, run)])).toEqual(['done', 'done']); expect(run).toHaveBeenCalledOnce();
    expect(() => oncePerProcess('u1', id, { raw: 'different' }, run)).toThrow('request_id_conflict');
  });
  it('never shares results across users or retries failed work automatically', async () => {
    const run = vi.fn().mockRejectedValue(new Error('failed')); const id = crypto.randomUUID();
    await expect(oncePerProcess('u1', id, {}, run)).rejects.toThrow('failed'); await expect(oncePerProcess('u1', id, {}, run)).rejects.toThrow('failed'); expect(run).toHaveBeenCalledOnce();
    await expect(oncePerProcess('u2', id, {}, run)).rejects.toThrow('failed'); expect(run).toHaveBeenCalledTimes(2);
  });
});
it('blocks concurrent distinct IDs and bounds per-user starts in this process', async () => {
  const owner = crypto.randomUUID(); let resolve!: (x: string) => void;
  const pending = oncePerProcess(owner, 'first', {}, () => new Promise<string>(r => { resolve = r; }));
  expect(() => oncePerProcess(owner, 'second', {}, async () => 'x')).toThrow('request_capacity');
  await Promise.resolve(); resolve('done'); await pending;
  for (let i = 0; i < 5; i++) await oncePerProcess(owner, `n${i}`, {}, async () => 'done');
  expect(() => oncePerProcess(owner, 'seventh', {}, async () => 'x')).toThrow('request_capacity');
});
