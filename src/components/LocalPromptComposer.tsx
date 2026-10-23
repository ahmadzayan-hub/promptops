"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowUpRight, Check, CheckCheck, Copy, FileDown, Fingerprint, Keyboard, LoaderCircle, RotateCcw, SlidersHorizontal, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { composePrompt, inferPurpose, MAX_PROMPT_LENGTH, type ComposeResult, type Purpose } from "@/lib/prompt-composer";
import { postStudioSession } from "@/lib/studio-api";

const copy = {
  en: {
    eyebrow: "YOUR INTENT, WELL EXPRESSED", title: "A rough thought.\nA clearer prompt.", subtitle: "Write it your way. Build a structured prompt, fill the gaps you choose, and make it yours before you copy.",
    local: "On-device composer", localNote: "Real, rule-based composition. Not an AI model. No account, API key or network call needed to compose.",
    input: "What are you trying to do?", inputNote: "A sentence, a messy brief, or a whole idea. Your original wording stays intact.", placeholder: "e.g. Help me plan the launch of my app. I don't know where to start…", examples: ["Write an email about a delayed delivery", "Debug a React app without changing its behavior", "Compare two ideas for a small business"],
    purpose: "Purpose", purposes: { auto: "Auto", general: "Anything", writing: "Write", coding: "Build", research: "Research", planning: "Plan", image: "Create an image" }, inferred: "Suggested purpose", optional: "Add details · optional", context: "Context & source material", audience: "Audience", constraints: "Must-haves & boundaries", format: "Desired output", contextHint: "Paste only the context you want included", audienceHint: "Who will use the result?", constraintsHint: "Tone, length, deadlines, budget… only what you know", formatHint: "e.g. An email, numbered steps, or a comparison", build: "Build my prompt", rebuild: "Update my prompt", preview: "Your prompt", previewNote: "Editable. No task execution. Server requests only when you choose.", emptyTitle: "A useful prompt has a clear shape.", emptyNote: "Your idea becomes a task, with context, boundaries and a way to check the result.", sections: ["Role", "Task", "Context", "Constraints", "Output format", "Review criteria"], missing: "Details you can still add", missingNote: "Optional. Unanswered questions stay visible in the prompt, never filled with invented facts.", changes: "What changed", compare: "Compare with your original", original: "Original", generated: "Structured", copy: "Copy prompt", copied: "Copied", download: "Download .txt", undo: "Undo edits", edited: "Edited by you", ready: "Ready to review", stale: "Your brief changed. Update the prompt before copying or downloading.", privacy: "Not saved · no cloud sync", saved: "Saved to your workspace by the server", localEdits: "Server version saved · your later edits are local, not synced", priorSaved: "A prior server version was saved · this draft is local", attempted: "Server request attempted · a partial session may exist in History", safety: "You decide what leaves this page", privacyBody: "Local composition does not transmit your text. Copy and download happen only when you ask. Closing or refreshing clears this draft.", integrations: "Where you already type", browser: "Browser selection", browserBody: "The extension uses a keyboard shortcut or right-click on selected text. Review, confirm replacement, and undo. No background typing capture.", mobile: "Mobile & desktop", mobileBody: "Use this responsive web app today. Native shells are in the repository; system-wide Android and iOS keyboards are not shipped or verified yet.", docs: "Integration guide", server: "Use my connected workspace", serverBody: "Optional: send this structured brief to your configured server and Ollama, and save a session to your signed-in workspace. No new paid provider is used. An unavailable server is an error, not AI success. Cancel stops waiting, but the server may finish and save a session.", serverAction: "Send & refine with Ollama", cancel: "Cancel request", serverBusy: "Waiting for your server…", serverUnavailable: "The server could not complete this request. Your local draft is unchanged. Check sign-in, workspace and Ollama configuration.", error: "That could not be completed. Your input is still here.", clipboardError: "Clipboard access was blocked. Select and copy the prompt manually.", resultLabel: "Editable structured prompt", engine: "Local rules", serverEngine: "Workspace / Ollama", sourceWarning: "Review this model output for invented details before use.", count: "characters", blank: "Start with any non-empty text.",
  },
  ar: {
    eyebrow: "فكرتك، بصياغة أوضح", title: "فكرة على راحتك.\nبرومبت على أصوله.", subtitle: "اكتب بطريقتك. حوّل فكرتك إلى طلب منظم، وأكمل ما تختاره من التفاصيل، ثم راجعه وعدّله قبل النسخ.",
    local: "صياغة على جهازك", localNote: "صياغة فعلية بقواعد محلية، وليست نموذج ذكاء اصطناعي. لا تحتاج حسابًا أو مفتاح API أو اتصالًا بالخادم للصياغة.",
    input: "ما الذي تريد إنجازه؟", inputNote: "جملة، مسودة غير مرتبة، أو فكرة كاملة. نحافظ على كلامك الأصلي كما هو.", placeholder: "مثلًا: ساعدني أخطط لإطلاق تطبيقي، ومش عارف أبدأ منين…", examples: ["اكتب رسالة عن تأخر تسليم طلب", "أصلح تطبيق React دون تغيير سلوكه", "قارن فكرتين لمشروع صغير"],
    purpose: "الهدف", purposes: { auto: "تلقائي", general: "أي شيء", writing: "كتابة", coding: "برمجة", research: "بحث", planning: "تخطيط", image: "إنشاء صورة" }, inferred: "هدف مقترح", optional: "أضف تفاصيل · اختياري", context: "السياق والمواد المرجعية", audience: "الجمهور", constraints: "المتطلبات والحدود", format: "شكل النتيجة", contextHint: "أضف فقط السياق الذي تريد تضمينه", audienceHint: "من سيستخدم النتيجة؟", constraintsHint: "النبرة، الطول، الموعد، الميزانية… فقط ما تعرفه", formatHint: "مثل رسالة، خطوات مرقمة، أو مقارنة", build: "صِغ البرومبت", rebuild: "حدّث البرومبت", preview: "البرومبت الخاص بك", previewNote: "قابل للتعديل. لا تنفيذ للمهمة، والإرسال للخادم باختيارك فقط.", emptyTitle: "الطلب المفيد له بناء واضح.", emptyNote: "فكرتك تصبح مهمة محددة، مع سياق وحدود ومعايير لمراجعة النتيجة.", sections: ["الدور", "المهمة", "السياق", "القيود", "شكل المخرجات", "معايير المراجعة"], missing: "تفاصيل يمكنك إضافتها", missingNote: "اختيارية. تظل الأسئلة غير المجابة واضحة في البرومبت بدل ملئها بمعلومات مختلقة.", changes: "ما الذي تغيّر؟", compare: "قارن بالنص الأصلي", original: "الأصلي", generated: "المنظم", copy: "انسخ البرومبت", copied: "تم النسخ", download: "تنزيل txt", undo: "تراجع عن التعديلات", edited: "عدّلته بنفسك", ready: "جاهز للمراجعة", stale: "تغيّرت فكرتك. حدّث البرومبت قبل نسخه أو تنزيله.", privacy: "غير محفوظ · لا مزامنة سحابية", saved: "حُفظت جلسة في مساحة عملك على الخادم", localEdits: "حُفظت نسخة الخادم · تعديلاتك التالية محلية ولم تتزامن", priorSaved: "حُفظت نسخة سابقة على الخادم · هذه المسودة محلية", attempted: "جرت محاولة إرسال للخادم · قد توجد جلسة جزئية في السجل", safety: "أنت تقرر ما يغادر هذه الصفحة", privacyBody: "الصياغة المحلية لا ترسل نصك. النسخ والتنزيل يتمان بطلبك فقط. إغلاق الصفحة أو تحديثها يمسح هذه المسودة.", integrations: "حيث تكتب بالفعل", browser: "النص المحدد في المتصفح", browserBody: "تعمل الإضافة باختصار لوحة المفاتيح أو النقر بالزر الأيمن على نص محدد. معاينة ثم موافقة على الاستبدال مع التراجع، دون التقاط الكتابة في الخلفية.", mobile: "الموبايل والكمبيوتر", mobileBody: "استخدم تطبيق الويب المتجاوب الآن. توجد حاويات تطبيقات أصلية في المستودع؛ لوحة مفاتيح شاملة لـ Android وiOS لم تُطلق أو تُختبر بعد.", docs: "دليل الدمج", server: "استخدم مساحة عملي المتصلة", serverBody: "اختياري: أرسل هذا الطلب المنظم إلى خادمك وOllama، واحفظ جلسة في مساحة العمل التي سجلت الدخول إليها. لا نستخدم مزودًا مدفوعًا جديدًا. تعذر الخدمة يُعرض كخطأ، وليس نجاحًا مزيفًا. الإلغاء يوقف الانتظار، لكن قد يُكمل الخادم الطلب ويحفظ جلسة.", serverAction: "أرسل وحسّن باستخدام Ollama", cancel: "إلغاء الطلب", serverBusy: "بانتظار خادمك…", serverUnavailable: "لم يُكمل الخادم الطلب. مسودتك المحلية لم تتغير. تحقق من تسجيل الدخول ومساحة العمل وإعداد Ollama.", error: "لم تكتمل العملية. نصك لا يزال موجودًا.", clipboardError: "المتصفح منع النسخ. حدد البرومبت وانسخه يدويًا.", resultLabel: "البرومبت المنظم القابل للتعديل", engine: "قواعد محلية", serverEngine: "مساحة العمل / Ollama", sourceWarning: "راجع مخرجات النموذج للتأكد من عدم اختلاق تفاصيل قبل استخدامها.", count: "حرف", blank: "ابدأ بأي نص غير فارغ.",
  },
};
const purposes: Purpose[] = ["auto", "general", "writing", "coding", "research", "planning", "image"];

export default function LocalPromptComposer({ initialRaw = "" }: { initialRaw?: string }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const t = ar ? copy.ar : copy.en;
  const [raw, setRaw] = useState(initialRaw);
  const [purpose, setPurpose] = useState<Purpose>("auto");
  const [details, setDetails] = useState({ context: "", audience: "", constraints: "", format: "" });
  const [result, setResult] = useState<ComposeResult | null>(null);
  const [draft, setDraft] = useState("");
  const [baseline, setBaseline] = useState("");
  const [snapshot, setSnapshot] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);
  const [source, setSource] = useState<"local" | "server">("local");
  const [busy, setBusy] = useState(false);
  const [serverState, setServerState] = useState<"never" | "pending" | "confirmed" | "unknown">("never");
  const controller = useRef<AbortController | null>(null);
  const currentInput = JSON.stringify({ raw, purpose, ...details });
  const latestInput = useRef(currentInput);
  latestInput.current = currentInput;
  const stale = !!result && currentInput !== snapshot;
  const storageLabel = source === "server" ? (draft === baseline ? t.saved : t.localEdits) : serverState === "confirmed" ? t.priorSaved : serverState === "pending" ? t.serverBusy : serverState === "unknown" ? t.attempted : t.privacy;
  useEffect(() => () => { controller.current?.abort(); }, []);
  useEffect(() => { controller.current?.abort(); controller.current = null; setBusy(false); setServerState(s => s === "pending" ? "unknown" : s); setCopied(false); }, [currentInput]);
  const build = () => {
    controller.current?.abort(); controller.current = null; setBusy(false); setServerState(s => s === "pending" ? "unknown" : s);
    try {
      const next = composePrompt({ raw, purpose, ...details });
      setResult(next); setDraft(next.finalPrompt); setBaseline(next.finalPrompt); setSnapshot(currentInput); setSource("local"); setNotice(""); setCopied(false);
    } catch { setNotice(t.blank); }
  };
  const send = async () => {
    if (controller.current || stale || !result || serverState === "unknown") return;
    const abort = new AbortController(); controller.current = abort; setBusy(true); setServerState("pending"); setNotice("");
    const inputAtStart = currentInput;
    try {
      const session = await postStudioSession(draft, "generic", AbortSignal.any([abort.signal, AbortSignal.timeout(45000)]));
      if (abort.signal.aborted || latestInput.current !== inputAtStart) return;
      const version = [...session.prompt_versions].sort((a,b) => b.version-a.version)[0];
      if (!version) throw new Error("invalid_session_response");
      setDraft(version.final_prompt); setBaseline(version.final_prompt); setSource("server"); setServerState("confirmed"); setCopied(false);
    } catch { if (controller.current === abort || !controller.current) setServerState("unknown"); if (!abort.signal.aborted) setNotice(t.serverUnavailable); }
    finally { if (controller.current === abort) { controller.current = null; setBusy(false); } }
  };
  const copyDraft = async () => {
    try { await navigator.clipboard.writeText(draft); setCopied(true); setNotice(""); } catch { setNotice(t.clipboardError); }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([draft], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "promptops-prompt.txt"; a.click(); URL.revokeObjectURL(url);
  };
  const setDetail = (key: keyof typeof details, value: string) => setDetails(d => ({ ...d, [key]: value }));
  return <main id="main" className="prompt-workspace" dir={ar ? "rtl" : "ltr"}>
    <header className="prompt-intro">
      <div><p className="prompt-eyebrow"><span />{t.eyebrow}</p><h1>{t.title}</h1><p className="prompt-subtitle">{t.subtitle}</p></div>
      <aside className="prompt-engine"><Image className="prompt-brand-art" src="/promptops-brand-3d.webp" width={56} height={55} alt="" aria-hidden="true" loading="lazy" unoptimized /><div><strong>{t.local}</strong><p>{t.localNote}</p></div></aside>
    </header>
    <div className="prompt-columns">
      <section className="prompt-panel prompt-input-panel" aria-labelledby="input-heading">
        <div className="prompt-panel-heading"><span className="prompt-step">01</span><div><h2 id="input-heading">{t.input}</h2><p>{t.inputNote}</p></div></div>
        <form onSubmit={e => { e.preventDefault(); build(); }}>
          <label className="sr-only" htmlFor="raw">{t.input}</label>
          <textarea id="raw" dir="auto" className="prompt-raw" placeholder={t.placeholder} value={raw} maxLength={MAX_PROMPT_LENGTH} rows={7} onChange={e => setRaw(e.target.value)} />
          <div className="prompt-count"><span>{raw.length.toLocaleString(ar ? "ar" : "en")} / 8,000 {t.count}</span></div>
          {!raw && <div className="prompt-examples">{t.examples.map(example => <button key={example} type="button" onClick={() => setRaw(example)}>{example}<ArrowUpRight size={15} /></button>)}</div>}
          <fieldset className="prompt-purpose"><legend>{t.purpose}</legend><div>{purposes.map(p => <button key={p} type="button" aria-pressed={purpose === p} className={purpose === p ? "is-selected" : ""} onClick={() => setPurpose(p)}>{t.purposes[p]}</button>)}</div>{raw && purpose === "auto" && <p>{t.inferred}: {t.purposes[inferPurpose(raw)]}</p>}</fieldset>
          <details className="prompt-details"><summary><SlidersHorizontal size={17} />{t.optional}</summary><div className="prompt-detail-fields">
            <label htmlFor="context">{t.context}<textarea id="context" dir="auto" rows={3} maxLength={2000} value={details.context} placeholder={t.contextHint} onChange={e => setDetail("context", e.target.value)} /></label>
            <label htmlFor="audience">{t.audience}<input id="audience" dir="auto" maxLength={500} value={details.audience} placeholder={t.audienceHint} onChange={e => setDetail("audience", e.target.value)} /></label>
            <label htmlFor="constraints">{t.constraints}<textarea id="constraints" dir="auto" rows={2} maxLength={2000} value={details.constraints} placeholder={t.constraintsHint} onChange={e => setDetail("constraints", e.target.value)} /></label>
            <label htmlFor="format">{t.format}<input id="format" dir="auto" maxLength={500} value={details.format} placeholder={t.formatHint} onChange={e => setDetail("format", e.target.value)} /></label>
          </div></details>
          <button className="prompt-primary prompt-build" type="submit" disabled={!raw.trim()}><Sparkles size={18} />{result ? t.rebuild : t.build}<ArrowUpRight size={19} /></button>
        </form>
        <p className="prompt-private"><Fingerprint size={15} />{storageLabel}</p>
      </section>
      <section className="prompt-panel prompt-output-panel" aria-labelledby="output-heading">
        <div className="prompt-panel-heading"><span className="prompt-step">02</span><div><h2 id="output-heading">{t.preview}</h2><p>{t.previewNote}</p></div></div>
        {!result ? <div className="prompt-empty"><div className="prompt-paper"><span /><span /><span />{t.sections.map((label,i) => <div key={label}><b>{String(i+1).padStart(2,"0")}</b><span>{label}</span><Check size={14}/></div>)}</div><h3>{t.emptyTitle}</h3><p>{t.emptyNote}</p></div> : <>
          <div className="prompt-result-meta"><span className="prompt-status"><CheckCheck size={15} />{draft !== baseline ? t.edited : t.ready}</span><span>{source === "server" ? t.serverEngine : t.engine}</span></div>
          {stale && <p className="prompt-warning" role="status">{t.stale}</p>}
          {source === "server" && <p className="prompt-warning">{t.sourceWarning}</p>}
          <label className="sr-only" htmlFor="prompt-result">{t.resultLabel}</label><textarea id="prompt-result" className="prompt-result" dir={result.locale === "ar" ? "rtl" : "ltr"} value={draft} maxLength={30000} rows={18} disabled={busy} onChange={e => { setDraft(e.target.value); setCopied(false); }} />
          <div className="prompt-result-actions"><button className="prompt-primary" type="button" disabled={stale || !draft.trim() || busy} onClick={copyDraft}>{copied ? <Check size={17}/> : <Copy size={17}/>}{copied ? t.copied : t.copy}</button><button className="prompt-secondary" type="button" disabled={stale || !draft.trim() || busy} onClick={download}><FileDown size={17}/>{t.download}</button><button className="prompt-icon-button" type="button" aria-label={t.undo} title={t.undo} disabled={draft === baseline || busy} onClick={() => { setDraft(baseline); setCopied(false); }}><RotateCcw size={18}/></button></div>
          {source === "local" && draft === result.finalPrompt && !stale && <div className="prompt-changes"><strong>{t.changes}</strong><ul>{result.changes.map(change => <li key={change}><Check size={14}/>{change}</li>)}</ul></div>}
          {source === "local" && draft === result.finalPrompt && !stale && !!result.questions.length && <div className="prompt-questions"><h3>{t.missing}</h3><p>{t.missingNote}</p><ul>{result.questions.map(q => <li key={q.id}>{q.question}</li>)}</ul></div>}
          <details className="prompt-details"><summary>{t.compare}</summary><p className="prompt-original" dir="auto">{result.original}</p></details>
          <details className="prompt-details"><summary>{t.server}</summary><p>{t.serverBody}</p><button type="button" className="prompt-secondary" onClick={send} disabled={stale || busy || serverState === "unknown" || !draft.trim() || draft.length > MAX_PROMPT_LENGTH}>{busy ? <LoaderCircle className="animate-spin" size={17}/> : <Sparkles size={17}/>} {busy ? t.serverBusy : t.serverAction}</button>{busy && <button type="button" className="prompt-secondary" onClick={() => { controller.current?.abort(); controller.current = null; setBusy(false); setServerState("unknown"); }}>{t.cancel}</button>}<p className="prompt-private">{storageLabel}</p>{serverState === "unknown" && <p><a href="/history" target="_blank" rel="noreferrer">{ar ? "راجع سجل مساحة العمل أولًا" : "Check workspace History first"}</a><button type="button" className="prompt-secondary" onClick={() => setServerState("never")}>{ar ? "راجعت السجل، اسمح بطلب جديد" : "I checked History; allow a new request"}</button></p>}</details>
        </>}
        {notice && <p className="prompt-warning" role="alert">{notice}</p>}
      </section>
    </div>
    <section className="prompt-bottom"><article><Fingerprint size={22}/><h2>{t.safety}</h2><p>{t.privacyBody}</p></article><article><Keyboard size={22}/><h2>{t.browser}</h2><p>{t.browserBody}</p><a href="https://github.com/ahmadzayan-hub/promptops/blob/main/docs/KEYBOARD-INTEGRATION.md" target="_blank" rel="noreferrer">{t.docs}<ArrowUpRight size={15}/></a></article><article><span className="prompt-platforms">Aa</span><h2>{t.mobile}</h2><p>{t.mobileBody}</p></article></section>
  </main>;
}
