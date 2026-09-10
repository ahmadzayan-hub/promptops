/**
 * Vision-prompt builders for Reverse mode's image flow.
 *
 * Given an image (uploaded by the user) we produce three production-grade
 * prompts they can paste into any vision-capable model (ChatGPT, Claude,
 * Gemini, Copilot, …):
 *
 *   - "extract":  Read every word in the image, return verbatim text.
 *   - "recreate": Build the design / page / element shown, matching layout,
 *                 colours, typography and structure.
 *   - "rewrite":  Treat the image as content (an email / report / page) and
 *                 produce a NEW piece in the same tone and structure.
 *
 * If the image is small enough we embed its data URL inline (markdown image
 * syntax — vision models render it). If too large, we just describe the
 * attachment so the user knows to drag it into their model's chat box.
 *
 * Pure functions, no I/O.
 */

export type ImageReverseAction = "extract" | "recreate" | "rewrite";

export interface ImagePromptInput {
  /** Original filename (helps the model infer "this is an email screenshot" etc.) */
  fileName: string;
  /** Optional MIME type for clarity. */
  mimeType?: string;
  /** File size in bytes — surfaced so the user knows what they're sending. */
  size: number;
  /** Inlined data URL for small images; empty string for large attachments. */
  dataUrl: string;
  locale: "en" | "ar";
  /** Optional user note ("make it darker", "for engineers", etc.) */
  hint?: string;
}

const LIMITS_NOTE = {
  en: "Note: this image is too large to inline. When you paste this prompt into ChatGPT / Claude / Gemini, drag the file into the chat too.",
  ar: "ملاحظة: الصورة أكبر من أن تُضمَّن هنا. عند لصق هذا الموجِّه في ChatGPT أو Claude أو Gemini، اسحب الملفّ إلى المحادثة أيضًا."
};

function imageBlock(input: ImagePromptInput): string {
  if (input.dataUrl) {
    return `![${input.fileName}](${input.dataUrl})`;
  }
  const sizeKB = Math.round(input.size / 1024);
  const note = input.locale === "ar" ? LIMITS_NOTE.ar : LIMITS_NOTE.en;
  return `> attachment: ${input.fileName} · ${sizeKB} KB · ${input.mimeType ?? "image"}\n>\n> ${note}`;
}

function maybeHint(input: ImagePromptInput, headerEn: string, headerAr: string): string {
  const h = input.hint?.trim();
  if (!h) return "";
  return input.locale === "ar"
    ? `\n\n## ${headerAr}\n${h}`
    : `\n\n## ${headerEn}\n${h}`;
}

// ───────────────────────────────────────────────────────────────────────────

function build_extract(input: ImagePromptInput): string {
  const en = input.locale === "en";
  const block = imageBlock(input);

  return en ? `# Role
You are a careful OCR + transcription assistant.

# Task
Read every word and number visible in the attached image and return them verbatim.

# Image
${block}

# Output format
1. **Plain text**: every word in reading order, preserving line breaks.
2. **Structure**: if the image is a form / table / email / page, mirror its layout with simple markdown (headings, lists, tables).
3. **Untranscribable parts**: where text is unclear, write \`[unreadable]\` instead of guessing.

# Rules
- Do not paraphrase, summarise or translate.
- Do not invent text that isn't in the image.
- Keep the original language (Arabic / English / mixed) exactly as shown.${maybeHint(input, "Notes", "ملاحظات")}`
  : `# الدور
أنت مساعد تفريغ نصوص دقيق.

# المهمّة
اقرأ كل كلمة ورقم ظاهر في الصورة المرفقة، وأعد كتابة النصّ كما هو حرفيًا.

# الصورة
${block}

# صيغة المخرجات
1. **نصّ خام**: كل الكلمات بترتيب القراءة مع الحفاظ على الأسطر.
2. **البنية**: إن كانت الصورة نموذجًا أو جدولًا أو بريدًا أو صفحة، حاكِ بنيتها بـ markdown بسيط (عناوين، قوائم، جداول).
3. **الأجزاء غير الواضحة**: استخدم \`[غير مقروء]\` بدلًا من التخمين.

# القواعد
- لا تُعِد الصياغة، ولا تُلخّص، ولا تُترجم.
- لا تختلق نصًّا غير موجود في الصورة.
- احتفظ باللغة الأصلية (عربية / إنجليزية / مختلطة) كما هي.${maybeHint(input, "Notes", "ملاحظات")}`;
}

function build_recreate(input: ImagePromptInput): string {
  const en = input.locale === "en";
  const block = imageBlock(input);

  return en ? `# Role
You are a senior product designer + front-end engineer.

# Task
Recreate the design shown in the attached image. Match its layout, colour palette, typography, spacing, and component structure as faithfully as possible.

# Image
${block}

# Deliverables
1. **Visual breakdown** (one paragraph): what type of artefact is this — landing page, email, dashboard, slide, poster — and what's its intent?
2. **Component tree**: nested list of the major regions and their child elements.
3. **Design tokens** extracted from the image:
   - Colours (hex), at minimum: background, primary text, accent, borders.
   - Typography: estimated typeface family, weights, sizes per role.
   - Spacing scale and corner radii.
4. **Implementation**: clean, modern code that produces the design.
   - If the image is a web design → React + Tailwind, fully responsive.
   - If it's a slide / poster → SVG or HTML/CSS that renders identically.
   - If it's a UI mockup → component-level breakdown ready to wire up.
5. **Accessibility notes**: contrast, focus states, alt text.

# Constraints
- Reproduce, don't reinterpret. Match the original.
- No placeholder text — copy the visible text verbatim.${maybeHint(input, "Style notes", "ملاحظات الأسلوب")}`
  : `# الدور
أنت مصمّم منتجات ومطوّر واجهات أمامية أوّل.

# المهمّة
أعد إنشاء التصميم الظاهر في الصورة المرفقة. حاكِ التخطيط ولوحة الألوان والخطوط والتباعد وبنية المكوّنات بأمانة قدر الإمكان.

# الصورة
${block}

# المخرجات
1. **تحليل بصري** (فقرة واحدة): ما نوع هذا التصميم — صفحة هبوط، بريد، لوحة تحكّم، شريحة، ملصق — وما الغرض منه؟
2. **شجرة المكوّنات**: قائمة متداخلة بالمناطق الرئيسية وعناصرها الفرعية.
3. **رموز التصميم** المستخلصة من الصورة:
   - الألوان (hex): الخلفية، النصّ الأساسي، اللون المميِّز، الحدود — كحدّ أدنى.
   - الخطوط: عائلة الخط المقدَّرة، الأوزان، الأحجام لكل عنصر.
   - مقياس التباعد ونصف الأقطار.
4. **التنفيذ**: كود نظيف وحديث ينتج التصميم.
   - إن كانت الصورة تصميم ويب → React + Tailwind متجاوب.
   - إن كانت شريحة / ملصق → SVG أو HTML/CSS بنفس النتيجة.
   - إن كانت واجهة → تفصيل على مستوى المكوّنات جاهز للربط.
5. **ملاحظات إمكانية الوصول**: التباين، حالات التركيز، النصوص البديلة.

# القيود
- أعد الإنتاج، لا تعيد التفسير. طابق الأصل.
- لا نصّ نائب — انسخ النصوص الظاهرة حرفيًا.${maybeHint(input, "Style notes", "ملاحظات الأسلوب")}`;
}

function build_rewrite(input: ImagePromptInput): string {
  const en = input.locale === "en";
  const block = imageBlock(input);

  return en ? `# Role
You are an expert writer and content analyst.

# Task
The attached image contains text content (an email, report, page, message, social post, or similar). Read it, understand its tone and structure, and produce a NEW piece in the same shape.

# Image
${block}

# Steps
1. **Identify** what kind of content this is (email, formal report, casual message, blog post, etc.) and its register (formal / casual / technical).
2. **Outline** its structure: greeting → context → main point → ask → close, or whatever the original does.
3. **Write a new version** for ${input.hint?.trim() || "the user-supplied scenario"}, keeping:
   - The same tone and register.
   - The same structure.
   - The same visual hierarchy if any (headings, bullets, signature).
4. **Translate** if the user asks (default: keep the original language).

# Output
- The new piece, ready to copy.
- Below it, a one-line note on what you mirrored from the original.${maybeHint(input, "Scenario", "السيناريو")}`
  : `# الدور
أنت كاتب خبير ومحلّل محتوى.

# المهمّة
الصورة المرفقة تحتوي محتوى نصّيًا (بريد، تقرير، صفحة، رسالة، منشور اجتماعي، أو ما شابه). اقرأه وافهم نبرته وبنيته، ثم أنشئ نصًّا جديدًا بنفس الشكل.

# الصورة
${block}

# الخطوات
1. **حدّد** نوع المحتوى (بريد، تقرير رسمي، رسالة عفوية، تدوينة، …) ومستواه (رسمي / غير رسمي / تقني).
2. **استخرج البنية**: تحية → سياق → نقطة رئيسية → طلب → ختام، أو ما يستخدمه الأصل.
3. **اكتب نسخة جديدة** للسيناريو ${input.hint?.trim() || "الذي يطلبه المستخدم"}، مع الحفاظ على:
   - نفس النبرة والمستوى.
   - نفس البنية.
   - نفس التسلسل البصري إن وُجد (عناوين، نقاط، توقيع).
4. **الترجمة** إن طلبها المستخدم (الافتراضي: نفس لغة الأصل).

# المخرجات
- النصّ الجديد جاهزًا للنسخ.
- تحته سطر واحد يوضّح ما حاكاه من الأصل.${maybeHint(input, "Scenario", "السيناريو")}`;
}

// ───────────────────────────────────────────────────────────────────────────

const BUILDERS: Record<ImageReverseAction, (i: ImagePromptInput) => string> = {
  extract:  build_extract,
  recreate: build_recreate,
  rewrite:  build_rewrite
};

export function buildImagePrompt(action: ImageReverseAction, input: ImagePromptInput): string {
  return BUILDERS[action](input);
}
