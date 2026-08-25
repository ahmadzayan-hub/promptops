"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";

interface Props {
  className?: string;
}

/**
 * Wordmark for the platform brand: **PromptOps** / **استوديو زيان**.
 * The word means "desk / study / office" in Arabic, and that's the promise:
 * the studio where a rough idea becomes a production prompt.
 *
 * Renders the form matching the active locale and keeps the other form as a
 * small subtitle so both audiences recognise the brand.
 */
export default function Wordmark({ className }: Props) {
  const { locale } = useI18n();

  const en = (
    <span className="font-bold tracking-tight">
      <span className="text-brand-600 dark:text-brand-300">Prompt</span>
      <span className="font-semibold text-slate-800 dark:text-slate-100">Ops</span>
    </span>
  );
  const ar = (
    <span className="font-semibold tracking-tight">
      <span className="text-brand-600 dark:text-brand-300">استوديو</span>
      {" "}
      <span className="text-slate-800 dark:text-slate-100">زيان</span>
    </span>
  );

  return (
    <span className={"flex flex-col leading-tight min-w-0 " + (className ?? "")}>
      <span className="text-base sm:text-lg truncate">
        {locale === "ar" ? ar : en}
      </span>
      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal truncate" aria-hidden="true">
        {locale === "ar" ? "PromptOps" : "استوديو زيان"}
      </span>
    </span>
  );
}
