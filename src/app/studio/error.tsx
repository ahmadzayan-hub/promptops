"use client";
import { useI18n } from "@/lib/i18n/I18nProvider";
export default function StudioError({ reset }: { reset: () => void }) {
  const { locale } = useI18n();
  return <main id="main" className="prompt-workspace"><div className="prompt-panel" role="alert"><h1>{locale === "ar" ? "تعذر عرض الاستوديو" : "The Studio could not be displayed"}</h1><p>{locale === "ar" ? "لم يتم إرسال أي طلب تلقائيًا. أعد المحاولة." : "No prompt was submitted automatically. Please try again."}</p><button className="prompt-primary" onClick={reset}>{locale === "ar" ? "أعد المحاولة" : "Try again"}</button></div></main>;
}
