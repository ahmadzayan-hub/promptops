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
it.each([200, 503])("handles unavailable HTTP %i without a TypeError", async status => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ unavailable: true, reason: "llm_unreachable" }), { status })));
  await expect(postStudioSession("test", "generic")).rejects.toThrow("llm_unreachable");
});
it("rejects HTML, even with HTTP 200", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>Login</html>")));
  await expect(postStudioSession("test", "generic")).rejects.toThrow("invalid_session_response");
});
