"use client";

/**
 * The Studio — the whole PromptOps pipeline on one screen.
 *
 * The backend for this already existed and was tested; nothing here
 * re-implements it. The flow mirrors the API exactly:
 *
 *   POST /api/sessions                  raw prompt -> intent + clarifying questions
 *   POST /api/sessions/:id/answers      answers to those questions
 *   POST /api/sessions/:id/finalize     -> a versioned, model-formatted prompt
 *
 * `quick: true` on the first call skips clarification and finalizes in one
 * step, which is what the browser extension does via /api/extension/enhance.
 */

import { useCallback, useMemo, useState } from "react";
import ModelPicker from "@/components/ModelPicker";
import { toTargetModel } from "@/lib/ai-models";
import StylePackPicker from "@/components/StylePackPicker";
import type { TargetModel } from "@/lib/types";

interface Question {
  id: string;
  question: string;
  rationale: string | null;
  required: boolean;
  position: number;
}

interface PromptVersion {
  version: number;
  final_prompt: string;
  rationale: string | null;
}

interface Session {
  id: string;
  intent: string | null;
  intent_confidence: number | null;
  status: string;
  target_model: string;
  questions?: Question[];
  prompt_versions?: PromptVersion[];
}

type Stage = "compose" | "clarify" | "done";

const MAX_PROMPT = 8000;

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    // The API answers 401 unauthenticated / 400 no_org; both are actionable
    // by the person reading, so surface the code rather than a generic error.
    throw new Error(json?.error ? String(json.error) : `request_failed_${res.status}`);
  }
  return json as T;
}

export default function StudioPage() {
  const [raw, setRaw] = useState("");
  // The picker speaks catalogue ids; the API speaks a five-value enum.
  // Keep the id for the picker and narrow only when calling the API.
  const [modelId, setModelId] = useState("generic");
  const model: TargetModel = useMemo(() => toTargetModel(modelId), [modelId]);
  const [stage, setStage] = useState<Stage>("compose");
  const [session, setSession] = useState<Session | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const questions = useMemo(
    () => [...(session?.questions ?? [])].sort((a, b) => a.position - b.position),
    [session]
  );

  const finalPrompt = useMemo(() => {
    const versions = session?.prompt_versions ?? [];
    if (versions.length === 0) return null;
    // finalize() appends a new version each time; the newest is the answer.
    return versions.reduce((a, b) => (b.version > a.version ? b : a));
  }, [session]);

  const missingRequired = questions.some(
    (q) => q.required && !(answers[q.id] ?? "").trim()
  );

  const reset = useCallback(() => {
    setStage("compose");
    setSession(null);
    setAnswers({});
    setError(null);
    setCopied(false);
  }, []);

  async function start(quick: boolean) {
    const prompt = raw.trim();
    if (prompt.length < 3) {
      setError("Write at least a few words first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { session: s } = await postJson<{ session: Session; mode: string }>(
        "/api/sessions",
        { raw_prompt: prompt, target_model: model, quick }
      );
      setSession(s);
      // No questions means the prompt had no gaps worth asking about — go
      // straight to finalize rather than showing an empty clarify step.
      if (quick || (s.questions ?? []).length === 0) {
        if (quick) setStage("done");
        else await finalize(s.id);
      } else {
        setStage("clarify");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  async function finalize(sessionId: string) {
    setBusy(true);
    setError(null);
    try {
      const saved = Object.entries(answers)
        .filter(([, v]) => v.trim())
        .map(([question_id, answer]) => ({ question_id, answer: answer.trim() }));
      if (saved.length > 0) {
        await postJson(`/api/sessions/${sessionId}/answers`, { answers: saved });
      }
      const { session: s } = await postJson<{ session: Session }>(
        `/api/sessions/${sessionId}/finalize`,
        { target_model: model }
      );
      setSession(s);
      setStage("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!finalPrompt) return;
    try {
      await navigator.clipboard.writeText(finalPrompt.final_prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Clipboard was blocked — select the text and copy manually.");
    }
  }

  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Studio</h1>
        <p className="mt-1 text-sm opacity-70">
          A rough idea in. A production prompt out.
        </p>
      </header>

      {error && (
        <div role="alert" className="mb-6 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
          {error === "unauthenticated"
            ? "Sign in to use the Studio."
            : error === "no_org"
            ? "Your account has no organization yet."
            : error}
        </div>
      )}

      {stage === "compose" && (
        <section className="space-y-5">
          <div>
            <label htmlFor="raw" className="mb-2 block text-sm font-medium">
              What do you want the model to do?
            </label>
            <textarea
              id="raw"
              value={raw}
              onChange={(e) => setRaw(e.target.value.slice(0, MAX_PROMPT))}
              rows={7}
              placeholder="write a launch email for our new pricing"
              className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900"
            />
            <p className="mt-1 text-end text-xs opacity-60">
              {raw.length} / {MAX_PROMPT}
            </p>
          </div>

          <ModelPicker value={modelId} onChange={setModelId} />
          <StylePackPicker onPick={(appended) => setRaw((p) => `${p}\n\n${appended}`.trim())} />

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => start(false)}
              disabled={busy || raw.trim().length < 3}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
            >
              {busy ? "Working…" : "Improve it"}
            </button>
            <button
              type="button"
              onClick={() => start(true)}
              disabled={busy || raw.trim().length < 3}
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium disabled:opacity-50 dark:border-slate-700"
            >
              Skip questions
            </button>
          </div>
        </section>
      )}

      {stage === "clarify" && session && (
        <section className="space-y-6">
          <p className="text-sm opacity-70">
            Detected intent: <strong>{session.intent ?? "unknown"}</strong>
            {typeof session.intent_confidence === "number" && (
              <> · {Math.round(session.intent_confidence * 100)}% confident</>
            )}
          </p>

          <ol className="space-y-5">
            {questions.map((q) => (
              <li key={q.id}>
                <label htmlFor={q.id} className="mb-1 block text-sm font-medium">
                  {q.question}
                  {q.required && <span aria-hidden className="ms-1 text-red-600">*</span>}
                  {!q.required && <span className="ms-2 text-xs opacity-60">optional</span>}
                </label>
                {q.rationale && <p className="mb-2 text-xs opacity-60">{q.rationale}</p>}
                <input
                  id={q.id}
                  value={answers[q.id] ?? ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900"
                />
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => finalize(session.id)}
              disabled={busy || missingRequired}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
            >
              {busy ? "Building…" : "Build the prompt"}
            </button>
            <button type="button" onClick={reset} className="rounded-xl border border-slate-300 px-5 py-3 text-sm dark:border-slate-700">
              Start over
            </button>
          </div>
          {missingRequired && (
            <p className="text-xs opacity-70">Answer the required questions to continue.</p>
          )}
        </section>
      )}

      {stage === "done" && (
        <section className="space-y-5">
          {finalPrompt ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-medium">
                  Version {finalPrompt.version} · for {session?.target_model}
                </h2>
                <button type="button" onClick={copy} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-700">
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-900">
{finalPrompt.final_prompt}
              </pre>
              {finalPrompt.rationale && (
                <details className="text-sm">
                  <summary className="cursor-pointer font-medium">Why it changed</summary>
                  <p className="mt-2 opacity-80">{finalPrompt.rationale}</p>
                </details>
              )}
            </>
          ) : (
            <p className="text-sm opacity-70">No prompt version was returned.</p>
          )}
          <button type="button" onClick={reset} className="rounded-xl border border-slate-300 px-5 py-3 text-sm dark:border-slate-700">
            New prompt
          </button>
        </section>
      )}
    </main>
  );
}
