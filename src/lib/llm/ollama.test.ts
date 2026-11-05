import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateJson } from "./ollama";

const okJson = (response: string) =>
  Promise.resolve(new Response(JSON.stringify({ response, done: true }), { status: 200 }));

describe("generateJson", () => {
  const realFetch = global.fetch;

  beforeEach(() => {
    vi.stubEnv("OLLAMA_BASE_URL", "http://localhost:11434");
  });

  afterEach(() => {
    global.fetch = realFetch;
    vi.unstubAllEnvs();
  });

  it("parses clean JSON output", async () => {
    global.fetch = vi.fn(() => okJson('{"intent":"writing","confidence":0.9}')) as never;
    const out = await generateJson<{ intent: string; confidence: number }>("x");
    expect(out).toMatchObject({ intent: "writing", confidence: 0.9 });
  });

  it("keeps legacy JSON mode even when a format option is provided", async () => {
    const fetch = vi.fn(() => okJson('{"ok":true}'));
    global.fetch = fetch as never;
    await generateJson("x", { format: { type: "object", additionalProperties: false } });
    const init = vi.mocked(global.fetch).mock.calls[0][1];
    expect(JSON.parse(init!.body as string).format).toBe("json");
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("recovers JSON when wrapped in noise", async () => {
    global.fetch = vi.fn(() => okJson('Sure! Here is your output: {"ok":true} done.')) as never;
    const out = await generateJson<{ ok: boolean }>("x");
    expect(out).toEqual({ ok: true });
  });

  it("falls back to a {raw} envelope when JSON cannot be parsed", async () => {
    global.fetch = vi.fn(() => okJson("not json at all")) as never;
    const out = await generateJson("x");
    expect(out).toEqual({ raw: "not json at all" });
  });
});
