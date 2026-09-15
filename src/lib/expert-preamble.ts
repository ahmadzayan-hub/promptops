/**
 * Real-time + expert preamble.
 *
 * Every prompt the platform produces gets:
 *   - Today's date so the model knows it's not stuck in stale training data.
 *   - A short "senior expert" rule sheet that bumps quality across every
 *     model family. These rules are the distillation of what consistently
 *     improves output on GPT-5, Claude 4.7, Gemini 3, and the rest:
 *       1. Think, then answer.
 *       2. Cite verifiable facts; flag the rest.
 *       3. Match the user's language and tone.
 *       4. Refuse to invent code, APIs, citations, or numbers.
 *       5. Explicit > implicit. Concrete > abstract.
 *       6. Surface caveats; never bury them.
 *       7. End with the next concrete step.
 *
 * Pure function, no I/O. The date is read from `new Date()` at the moment
 * the prompt is generated, so the preamble is naturally up-to-date.
 */

function todayISO(): string {
  // YYYY-MM-DD in the user's local timezone, which is what humans expect
  // when they read "today's date" inside a prompt.
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const RULES_EN = [
  "Think before you answer; surface reasoning briefly when it changes the conclusion.",
  "Quote facts only when you can verify them. Mark anything else as [unverified] or [speculation].",
  "Match the user's language. If mixed, default to the dominant one.",
  "Never invent code, APIs, citations, file paths, or numbers. If you don't know, say so.",
  "Prefer explicit over implicit, concrete over abstract.",
  "Surface caveats early, not at the end.",
  "Close with the next concrete step the user can take."
];

const RULES_AR = [
  "فكِّر قبل أن تُجيب، وأظهِر استدلالك بإيجاز عند تأثيره على النتيجة.",
  "اقتبس الحقائق التي يمكنك التحقّق منها فقط. علّم الباقي بـ[غير مُتحقَّق منه] أو [تخمين].",
  "طابِق لغة المستخدم. إن كانت مختلطة فاستخدم اللغة المهيمنة.",
  "لا تخترع كودًا أو APIs أو مراجع أو مسارات أو أرقامًا. إن لم تعرف فقُل ذلك.",
  "صريح أفضل من ضمني، ملموس أفضل من مجرّد.",
  "اذكر التحفّظات مبكّرًا لا في الختام.",
  "اختم بخطوة تالية ملموسة يستطيع المستخدم اتخاذها."
];

export interface PreambleOptions {
  locale: "en" | "ar";
  /** Optional: name of the target model so the preamble can mention it. */
  modelName?: string;
}

/**
 * Return the expert preamble + today's date as a single markdown block ready
 * to be prepended to any prompt scaffold.
 */
export function expertPreamble(opts: PreambleOptions): string {
  const en = opts.locale === "en";
  const date = todayISO();
  const rules = (en ? RULES_EN : RULES_AR).map((r, i) => `${i + 1}. ${r}`).join("\n");
  const targetLine = opts.modelName
    ? (en ? `\n- Target model: **${opts.modelName}**` : `\n- النموذج المستهدف: **${opts.modelName}**`)
    : "";

  return en
    ? `<!-- engineered by ZAIan Studio · ${date} -->
# Operating context
- Today's date: **${date}** (use this when reasoning about anything time-sensitive).${targetLine}

# Expert rules (apply silently, never restate)
${rules}

`
    : `<!-- مُعدّ بواسطة زيان ستوديو · ${date} -->
# سياق التشغيل
- تاريخ اليوم: **${date}** (استخدمه عند الاستدلال على أي شيء مرتبط بالزمن).${targetLine}

# قواعد الخبراء (طبّقها بصمت دون إعادة سردها)
${rules}

`;
}
