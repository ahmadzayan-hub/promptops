"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, Copy, Fingerprint, LoaderCircle, RotateCcw, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import LocalPromptComposer from "./LocalPromptComposer";
import { availabilitySchema, ComposeClientError, requestComposition, type Availability } from "@/lib/llm/compose-client";
import type { Analysis, ComposeRequest, ComposeResult } from "@/lib/llm/compose-contract";

export default function PromptComposer() {
  const { locale } = useI18n(); const ar = locale === "ar";
  const t = (en: string, arabic: string) => ar ? arabic : en;
  const [local, setLocal] = useState(false); const [localVisited, setLocalVisited] = useState(false);
  const [raw, setRaw] = useState(""); const [answers, setAnswers] = useState<Record<string, string>>({});
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null); const [result, setResult] = useState<ComposeResult | null>(null);
  const [draft, setDraft] = useState(""); const [consent, setConsent] = useState(false); const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState<"understand" | "draft" | null>(null); const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false); const [cooldown, setCooldown] = useState(0); const [copied, setCopied] = useState(false);
  const controller = useRef<AbortController | null>(null); const revision = useRef(0);
  useEffect(() => { const abort = new AbortController(); fetch("/api/compose", { signal: abort.signal }).then(r => r.json()).then(data => { const parsed = availabilitySchema.safeParse(data); if (parsed.success) setAvailability(parsed.data); }).catch(() => {}); return () => { abort.abort(); controller.current?.abort(); }; }, []);
  useEffect(() => { if (!cooldown) return; const timer = setTimeout(() => setCooldown(Math.max(0, cooldown - 1)), 1000); return () => clearTimeout(timer); }, [cooldown]);
  const invalidate = () => { revision.current++; if (controller.current) { controller.current.abort(); controller.current = null; setUncertain(true); } setBusy(null); setResult(null); setDraft(""); setReviewed(false); setCopied(false); };
  const cancel = () => { revision.current++; controller.current?.abort(); controller.current = null; setBusy(null); setUncertain(true); };
  const send = async (phase: "understand" | "draft") => {
    if (!availability?.configured || availability.provider === "unconfigured" || !availability.model || !consent || controller.current || uncertain || cooldown) return;
    const abort = new AbortController(); controller.current = abort; const version = revision.current;
    setBusy(phase); setError(""); setReviewed(false); setCopied(false);
    const common = { requestId: crypto.randomUUID(), raw, locale: ar ? "ar" as const : "en" as const, consent: true as const, provider: availability.provider, model: availability.model };
    const data: ComposeRequest = phase === "understand" ? { ...common, phase } : { ...common, phase, analysis: analysis!, answers };
    try {
      const response = await requestComposition(data, AbortSignal.any([abort.signal, AbortSignal.timeout(115000)]));
      if (abort.signal.aborted || version !== revision.current) return;
      if ("analysis" in response) { setAnalysis(response.analysis); setResult(null); setDraft(""); }
      if ("result" in response) { setResult(response.result); setDraft(response.result.finalPrompt); }
    } catch (e) {
      if (version !== revision.current) return;
      const failure = e instanceof ComposeClientError ? e : new ComposeClientError("request_uncertain", true);
      setError(failure.code); setUncertain(failure.uncertain); setCooldown(failure.retryAfter);
    } finally { if (controller.current === abort) { controller.current = null; setBusy(null); } }
  };
  const errors: Record<string, string> = {
    backend_not_configured: t("Workspace authentication is not configured. The local alternative is available.", "تسجيل الدخول لمساحة العمل غير مُعد. البديل المحلي متاح."),
    unauthenticated: t("Sign in to your workspace before sending to the model.", "سجّل الدخول لمساحة العمل قبل الإرسال للنموذج."),
    missing_key: t("The server owner must configure the chosen provider securely. Do not paste keys here.", "يلزم إعداد المزود بأمان على الخادم. لا تلصق المفاتيح هنا."),
    no_spend_not_confirmed: t("The owner has not confirmed this account is eligible for no-spend use. No model request was made.", "لم يؤكد المالك أهلية الحساب للاستخدام دون إنفاق. لم نرسل طلبًا للنموذج."),
    quota_exhausted: t("The provider quota is exhausted. No automatic retry or paid/provider switch. Wait for the account limit to reset or choose local rules.", "انتهت حصة المزود. لا إعادة تلقائية ولا تحويل مدفوع أو لمزود آخر. انتظر تجدد الحصة أو اختر القواعد المحلية."),
    billing_required: t("The provider requires billing. PromptOps stopped; it will not enable payment or switch providers.", "المزود يطلب تفعيل الدفع. توقف PromptOps ولن يفعّل دفعًا أو يغيّر المزود."),
    model_unavailable: t("The configured model is unavailable or retired. The owner must choose a supported model explicitly.", "النموذج المُعد غير متاح أو متوقف. على المالك اختيار نموذج مدعوم صراحةً."),
    provider_changed: t("Provider configuration changed. Reload before consenting to the new destination.", "تغير إعداد المزود. أعد تحميل الصفحة قبل الموافقة على الوجهة الجديدة."),
    invalid_model_response: t("The model returned invalid structure or evidence. This is not a successful draft.", "أعاد النموذج بنية أو أدلة غير صالحة. هذه ليست صياغة ناجحة."),
  };
  const disabled = !raw.trim() || !consent || !availability?.configured || !availability.workspaceConfigured || !!busy || uncertain || cooldown > 0;
  return <>
    <nav className="prompt-mode" aria-label={t("Composition mode", "طريقة الصياغة")} dir={ar ? "rtl" : "ltr"}>
      <button className={!local ? "is-selected" : ""} type="button" aria-pressed={!local} disabled={!!busy} onClick={() => setLocal(false)}>{t("AI · understand, draft, review", "نموذج LLM · يفهم ويصيغ ويراجع")}</button>
      <button className={local ? "is-selected" : ""} type="button" aria-pressed={local} disabled={!!busy} onClick={() => { setLocalVisited(true); setLocal(true); }}>{t("Local alternative · no LLM", "بديل محلي · دون نموذج LLM")}</button>
    </nav>
    {localVisited && <div hidden={!local}><LocalPromptComposer initialRaw={raw} mainId={local ? "main" : "local-main"} /></div>}{!local && <main id="main" className="prompt-workspace" dir={ar ? "rtl" : "ltr"}>
      <header className="prompt-intro"><div><p className="prompt-eyebrow"><span />{t("YOUR MEANING COMES FIRST", "المعنى أولًا")}</p><h1>{t("Understood. Written.\nThen checked.", "يفهم فكرتك. يصيغها.\nويراجعها.")}</h1><p className="prompt-subtitle">{t("An LLM understands your intent, asks only useful questions, writes a professional prompt, and reviews it against your original. You make the final decision.", "نموذج LLM يفهم قصدك، يسأل فقط عما يغيّر النتيجة، يصيغ برومبت احترافيًا، ثم يراجعه مقابل كلامك الأصلي. والقرار الأخير لك.")}</p></div><aside className="prompt-engine"><Sparkles size={28}/><div><strong>{availability?.configured ? `${availability.provider} · ${availability.model}` : t("Model setup required", "يلزم إعداد النموذج")}</strong><p>{t("Configuration is not a live model test. No unlimited/free-service promise.", "الإعداد لا يعني نجاح اختبار فعلي للنموذج. لا وعد بخدمة مجانية أو غير محدودة.")}</p></div></aside></header>
      <div className="prompt-columns">
        <section className="prompt-panel prompt-input-panel"><div className="prompt-panel-heading"><span className="prompt-step">01</span><div><h2>{t("What do you want to achieve?", "ما الذي تريد إنجازه؟")}</h2><p>{t("Your original stays unchanged. We write a prompt, not execute its task.", "نصك الأصلي يظل كما هو. نصيغ الطلب ولا ننفذ المهمة.")}</p></div></div>
          <label htmlFor="ai-raw" className="sr-only">{t("Original brief", "النص الأصلي")}</label><textarea id="ai-raw" className="prompt-raw" rows={7} maxLength={8000} dir="auto" value={raw} placeholder={t("Describe anything you need help asking an AI to do…", "اكتب أي فكرة تريد تحويلها إلى طلب واضح للذكاء الاصطناعي…")} onChange={e => { invalidate(); setAnalysis(null); setAnswers({}); setRaw(e.target.value); }} />
          <p className="prompt-count">{raw.length} / 8,000</p>
          <div className="prompt-consent"><label><input type="checkbox" checked={consent} onChange={e => { setConsent(e.target.checked); if (!e.target.checked && busy) cancel(); }} />{t("I choose to send this brief and my answers through this workspace server to ", "أختار إرسال النص وإجاباتي عبر خادم مساحة العمل إلى ")}{availability?.provider === "groq" ? "Groq (api.groq.com)" : availability?.provider === "ollama" ? t("the owner's configured Ollama server", "خادم Ollama الذي أعدّه المالك") : t("the provider the owner will configure", "المزود الذي سيعدّه المالك")}{t(" for understanding, drafting and review. Up to five model calls per complete flow; provider retention policies apply. No automatic provider switch.", " للفهم والصياغة والمراجعة. حتى خمسة طلبات للنموذج في كل دورة كاملة، وتطبق سياسة احتفاظ المزود. لا تبديل تلقائي للمزود.")}</label></div>
          {!availability?.configured || !availability.workspaceConfigured ? <p className="prompt-warning">{t("AI is not activated here yet. The owner must configure workspace sign-in and one eligible provider. No model request is enabled in this flow. You can use the clearly labeled local alternative now.", "الذكاء الاصطناعي غير مُفعّل هنا بعد. يلزم إعداد دخول مساحة العمل ومزود واحد مؤهل. الإرسال للنموذج غير مفعّل في هذا المسار. يمكنك استخدام البديل المحلي الموضح الآن.")} <a href="/login">{t("Sign in", "تسجيل الدخول")}</a>{availability?.reason && errors[availability.reason] ? <span> {errors[availability.reason]}</span> : null}</p> : null}
          <button type="button" className="prompt-primary prompt-build" disabled={disabled} onClick={() => send("understand")}><Sparkles size={18}/>{t("Understand my intent", "افهم قصدي")}<ArrowUpRight size={18}/></button>
          {analysis && <div className="prompt-questions"><h3>{t("Understanding to confirm", "فهم النموذج للتأكيد")}</h3><p dir="auto">{analysis.intent}</p><details><summary>{t("Source facts and boundaries", "حقائق وحدود من النص")}</summary><ul>{analysis.protectedQuotes.map(q => <li key={q} dir="auto">{q}</li>)}</ul></details><p>{t("Correct the original if this understanding is wrong. Questions are optional; unknowns remain explicit.", "عدّل النص الأصلي إن كان الفهم غير صحيح. الأسئلة اختيارية، وما لا تجيبه يظل غير محسوم.")}</p>{analysis.questions.map(q => <label className="prompt-ai-question" key={q.id} htmlFor={q.id}>{q.question}<small>{q.why}</small><input id={q.id} maxLength={1000} dir="auto" value={answers[q.id] ?? ""} onChange={e => { invalidate(); setAnswers(a => ({ ...a, [q.id]: e.target.value })); }} /></label>)}<button type="button" className="prompt-primary" disabled={disabled} onClick={() => send("draft")}>{t("Draft & run a separate review", "صِغ وراجع في خطوة منفصلة")}</button></div>}
          <p className="prompt-private"><Fingerprint size={16}/>{t("No workspace session is saved by this flow. Draft stays in this tab; server deduplication is temporary memory only.", "هذا المسار لا يحفظ جلسة في مساحة العمل. المسودة في هذه الصفحة، ومنع التكرار بالخادم مؤقت في الذاكرة فقط.")}</p>
        </section>
        <section className="prompt-panel prompt-output-panel"><div className="prompt-panel-heading"><span className="prompt-step">02</span><div><h2>{t("Professional draft, with review", "صياغة احترافية مع مراجعتها")}</h2><p>{t("A separate review pass uses the same configured model. It is not an independent fact-check or a guarantee of truth.", "مراجعة منفصلة بالنموذج المُعد نفسه، وليست تدقيقًا مستقلًا للحقائق أو ضمانًا للصحة.")}</p></div></div>
          {!result && <div className="prompt-empty"><Sparkles size={36}/><h3>{busy ? t("Working with your chosen model…", "نعمل مع النموذج الذي اخترته…") : t("Understand → clarify → draft → review", "فهم ← توضيح ← صياغة ← مراجعة")}</h3><p>{t("One repair at most if checks find a problem. No canned output presented as AI success.", "محاولة إصلاح واحدة فقط إذا وجدت المراجعة مشكلة. لا نقدّم قالبًا جاهزًا بوصفه نجاحًا للذكاء الاصطناعي.")}</p></div>}
          {result && <><p className="prompt-status">{draft !== result.finalPrompt ? t("Your edits have not been model-reviewed", "تعديلاتك لم يراجعها النموذج") : result.modelReview === "passed" ? t("Model checks passed · human review still required", "اجتازت فحوص النموذج · ما زالت مراجعتك مطلوبة") : t("Review found unresolved issues · not approved", "المراجعة وجدت مشكلات باقية · غير معتمد")}</p>{result.repaired && <p>{t("One repair was attempted and reviewed again.", "جرت محاولة إصلاح واحدة ومراجعتها مجددًا.")}</p>}{result.issues.length > 0 && <ul className="prompt-warning">{result.issues.map((issue, i) => <li key={i} dir="auto">{issue}</li>)}</ul>}
            <label className="sr-only" htmlFor="ai-result">{t("LLM draft", "مسودة النموذج")}</label><textarea id="ai-result" className="prompt-result" rows={20} dir="auto" maxLength={30000} disabled={!!busy} value={draft} onChange={e => { setDraft(e.target.value); setReviewed(false); setCopied(false); }} />
            <details className="prompt-details"><summary>{t("Compare with untouched original", "قارن بالنص الأصلي دون تغيير")}</summary><p className="prompt-original" dir="auto">{raw}</p></details>
            <label className="prompt-consent"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} />{t("I reviewed the original meaning, facts, constraints, assumptions and unresolved issues before using this draft.", "راجعت المعنى والحقائق والقيود والافتراضات والمشكلات الباقية قبل استخدام المسودة.")}</label>
            <div className="prompt-result-actions"><button className="prompt-primary" disabled={!reviewed || !draft.trim() || !!busy} onClick={async () => { try { await navigator.clipboard.writeText(draft); setCopied(true); } catch { setError("clipboard_blocked"); } }}>{copied ? <Check size={17}/> : <Copy size={17}/>} {copied ? t("Copied", "تم النسخ") : t("Copy reviewed prompt", "انسخ البرومبت بعد المراجعة")}</button><button className="prompt-secondary" disabled={draft === result.finalPrompt || !!busy} onClick={() => { setDraft(result.finalPrompt); setReviewed(false); setCopied(false); }}><RotateCcw size={17}/>{t("Undo edits", "تراجع عن التعديلات")}</button></div></>}
          {busy && <p role="status"><LoaderCircle className="animate-spin" size={18}/>{busy === "understand" ? t("Understanding…", "نفهم القصد…") : t("Drafting and reviewing…", "نصيغ ونراجع…")} <button className="prompt-secondary" type="button" onClick={cancel}>{t("Cancel waiting", "إلغاء الانتظار")}</button></p>}
          {error && <p className="prompt-warning" role="alert">{errors[error] ?? (error === "clipboard_blocked" ? t("Clipboard blocked. Select and copy manually.", "المتصفح منع النسخ. حدد النص وانسخه يدويًا.") : t("The request did not complete. Your original is still here. No automatic retry or fallback was made.", "لم يكتمل الطلب. نصك الأصلي موجود. لم نعد المحاولة أو نغيّر المزود تلقائيًا."))}</p>}
          {cooldown > 0 && <p role="status">{t("Provider asks to wait (seconds): ", "المزود يطلب الانتظار (ثانية): ")}{cooldown}</p>}
          {uncertain && <div className="prompt-warning"><p>{t("The outcome is uncertain. Cancel only stops waiting; the provider may finish and count usage. No session is saved, but retrying can repeat model usage. Check provider activity before a new request.", "نتيجة الطلب غير مؤكدة. الإلغاء يوقف الانتظار فقط؛ قد يكمل المزود ويحسب الاستخدام. لا تُحفظ جلسة، لكن المحاولة مجددًا قد تكرر استخدام النموذج. راجع نشاط المزود قبل طلب جديد.")}</p><button className="prompt-secondary" onClick={() => { setUncertain(false); setError(""); }}>{t("I checked; allow a new request", "راجعت الأمر؛ اسمح بطلب جديد")}</button></div>}
        </section>
      </div>
    </main>}
  </>;
}
