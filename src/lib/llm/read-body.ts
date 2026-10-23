/** Bound streamed request bodies in bytes and wall time before any model call. */
export async function readComposeBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('invalid_request');
  let timer: ReturnType<typeof setTimeout> | undefined;
  const read = async () => {
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.byteLength; if (size > 64000) throw new Error('request_too_large'); chunks.push(chunk.value); }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new Error('invalid_request'); }
  };
  try { return await Promise.race([read(), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('request_timeout')), 5000); })]); }
  finally { clearTimeout(timer); void reader.cancel().catch(() => {}); }
}
