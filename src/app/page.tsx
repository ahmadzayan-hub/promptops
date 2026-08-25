import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Ship prompts, not guesses"
};

const STEPS = [
  {
    n: "1",
    en: "Say what you want",
    ar: "قل ما تريد",
    body: "A rough sentence is enough. PromptOps detects the intent behind it before it changes a word."
  },
  {
    n: "2",
    en: "Answer only what is missing",
    ar: "أجب عمّا ينقص فقط",
    body: "It runs a gap analysis and asks about the gaps it found. No generic questionnaire."
  },
  {
    n: "3",
    en: "Get a prompt built for your model",
    ar: "احصل على موجّه مهيّأ لنموذجك",
    body: "The same brief is formatted differently for a system-prompt model than for an XML-tagged one. Every version is saved."
  }
];

export default function HomePage() {
  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-4 py-16">
      <section className="text-center">
        <p className="text-sm font-medium uppercase tracking-widest opacity-60">
          PromptOps · ZAIan Studio
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          Ship prompts, not guesses.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base opacity-75">
          A rough idea goes in. A production prompt comes out — formatted for
          ChatGPT, Claude, Copilot or Gemini, versioned so you can go back.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/studio"
            className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-medium text-white dark:bg-white dark:text-slate-900"
          >
            Open the Studio
          </Link>
        </div>
      </section>

      <section className="mt-16 grid gap-6 sm:grid-cols-3">
        {STEPS.map((s) => (
          <article key={s.n} className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
            <div
              aria-hidden
              className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
            >
              {s.n}
            </div>
            <h2 className="text-sm font-semibold">{s.en}</h2>
            <p className="mt-0.5 text-xs opacity-60" lang="ar" dir="rtl">{s.ar}</p>
            <p className="mt-2 text-sm opacity-75">{s.body}</p>
          </article>
        ))}
      </section>

      <section className="mt-16 rounded-2xl border border-slate-200 p-6 dark:border-slate-800">
        <h2 className="text-sm font-semibold">Also where you already work</h2>
        <p className="mt-2 text-sm opacity-75">
          The same pipeline is available to the browser extension and the
          desktop and mobile shells through an API key, so a prompt can be
          improved without leaving the page you are on.
        </p>
      </section>
    </main>
  );
}
