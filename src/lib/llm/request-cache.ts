import { createHash } from "node:crypto";

// Best-effort duplicate suppression for this process only, NOT durable exactly-once.
// No prompt/database logs. Results expire after 2 minutes; no automatic replay retry.
const active = new Set<string>();
const starts = new Map<string, number[]>();
const requests = new Map<string, { fingerprint: string; expires: number; result: Promise<unknown> }>();
export class DuplicateRequestError extends Error {}
export function oncePerProcess<T>(owner: string, id: string, payload: unknown, run: () => Promise<T>): Promise<T> {
  const now = Date.now();
  for (const [key, value] of requests) if (value.expires <= now) requests.delete(key);
  const key = `${owner}:${id}`;
  const fingerprint = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  const prior = requests.get(key);
  if (prior) {
    if (prior.fingerprint !== fingerprint) throw new DuplicateRequestError("request_id_conflict");
    return prior.result as Promise<T>;
  }
  if (requests.size >= 100) throw new DuplicateRequestError("request_capacity");
  for (const [user, times] of starts) { const recent = times.filter(t => t > now - 120000); if (recent.length) starts.set(user, recent); else starts.delete(user); }
  const recent = starts.get(owner) ?? [];
  if (active.has(owner) || recent.length >= 6) throw new DuplicateRequestError("request_capacity");
  active.add(owner); starts.set(owner, [...recent, now]);
  const result = Promise.resolve().then(run).finally(() => active.delete(owner));
  requests.set(key, { fingerprint, expires: now + 120000, result });
  return result;
}
