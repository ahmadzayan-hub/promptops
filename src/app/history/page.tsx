"use client";

/** History — GET /api/sessions returns the org's 50 most recent sessions. */

import { useEffect, useState } from "react";

interface SessionRow {
  id: string;
  raw_prompt: string;
  intent: string | null;
  status: string;
  target_model: string;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  intake: "started",
  clarifying: "awaiting answers",
  ready: "ready to build",
  finalized: "finalized"
};

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/sessions");
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error ? String(json.error) : `failed_${res.status}`);
        if (!cancelled) setSessions(json.sessions ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">History</h1>
      <p className="mt-1 text-sm opacity-70">Your 50 most recent prompt sessions.</p>

      {error && (
        <p role="alert" className="mt-6 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
          {error === "unauthenticated" ? "Sign in to see your history." : error}
        </p>
      )}

      {!error && sessions === null && <p className="mt-6 text-sm opacity-60">Loading…</p>}
      {sessions?.length === 0 && <p className="mt-6 text-sm opacity-70">Nothing here yet.</p>}

      <ul className="mt-6 space-y-3">
        {(sessions ?? []).map((s) => (
          <li key={s.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <p className="line-clamp-2 text-sm">{s.raw_prompt}</p>
            <p className="mt-2 flex flex-wrap gap-x-3 text-xs opacity-60">
              <span>{STATUS_LABEL[s.status] ?? s.status}</span>
              {s.intent && <span>intent: {s.intent}</span>}
              <span>for {s.target_model}</span>
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
