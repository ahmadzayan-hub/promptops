"use client";

/** Templates — GET /api/templates. Org templates plus anything public. */

import { useEffect, useState } from "react";

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  is_public: boolean;
  created_at: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/templates");
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error ? String(json.error) : `failed_${res.status}`);
        if (!cancelled) setTemplates(json.templates ?? []);
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
      <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
      <p className="mt-1 text-sm opacity-70">
        Reusable prompt skeletons. A template fixes the sections; the Studio fills them.
      </p>

      {error && (
        <p role="alert" className="mt-6 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
          {error === "unauthenticated" ? "Sign in to see your templates." : error}
        </p>
      )}

      {!error && templates === null && <p className="mt-6 text-sm opacity-60">Loading…</p>}

      {templates?.length === 0 && (
        <p className="mt-6 text-sm opacity-70">No templates yet.</p>
      )}

      <ul className="mt-6 space-y-3">
        {(templates ?? []).map((t) => (
          <li key={t.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-sm font-medium">{t.name}</h2>
              {t.is_public && (
                <span className="rounded-full border border-slate-300 px-2 py-0.5 text-xs opacity-70 dark:border-slate-700">
                  public
                </span>
              )}
            </div>
            {t.category && <p className="mt-0.5 text-xs opacity-60">{t.category}</p>}
            {t.description && <p className="mt-2 text-sm opacity-75">{t.description}</p>}
          </li>
        ))}
      </ul>
    </main>
  );
}
