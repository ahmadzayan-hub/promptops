import { describe, expect, it } from "vitest";
import { parseStudioSession } from "./studio-api";

describe("Studio unavailable response regression", () => {
  it("reports unavailable instead of reading questions on an absent session", () => {
    expect(() => parseStudioSession({ unavailable: true, reason: "backend_not_configured" }))
      .toThrow("backend_not_configured");
  });
});

import { afterEach, vi } from "vitest";
import { postStudioSession } from "./studio-api";
afterEach(() => vi.unstubAllGlobals());
it.each([undefined, null, {}, { session: null }, { session: {} }, { session: { id: "x", questions: {} } }, { session: { id: "x", prompt_versions: [{}] } }])("rejects malformed response %#", body => {
  expect(() => parseStudioSession(body)).toThrow("invalid_session_response");
});
it("normalizes optional collections only on a valid session", () => {
  expect(parseStudioSession({ session: { id: "x" } })).toEqual({ id: "x", questions: [], prompt_versions: [] });
});
it.each(["questions", "prompt_versions"])("rejects oversized %s without reading elements", key => {
  const collection = new Array(1001);
  Object.defineProperty(collection, 0, { get() { throw new Error("oversized element was read"); } });
  expect(() => parseStudioSession({ session: { id: "x", [key]: collection } })).toThrow("invalid_session_response");
});
it("preserves valid legacy collection entries and nullable fields at the limit", () => {
  const question = { id: "q1", question: "Who?", position: 1, required: true, rationale: null };
  const version = { version: 1, final_prompt: "Draft", rationale: null };
  const session = { id: "x", questions: Array(1000).fill(question), prompt_versions: Array(1000).fill(version) };
  expect(parseStudioSession({ session })).toEqual(session);
});
it.each([200, 503])("handles unavailable HTTP %i without a TypeError", async status => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ unavailable: true, reason: "llm_unreachable" }), { status })));
  await expect(postStudioSession("test", "generic")).rejects.toThrow("llm_unreachable");
});
it("rejects HTML, even with HTTP 200", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>Login</html>")));
  await expect(postStudioSession("test", "generic")).rejects.toThrow("invalid_session_response");
});
