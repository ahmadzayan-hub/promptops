/**
 * Local prompt-engineering engine that runs entirely in the browser.
 * Used as a fallback when the server, Supabase or Ollama is unavailable.
 *
 * It is rule-based, deterministic and produces a coherent structured
 * prompt for any of: chatgpt | claude | copilot | gemini | generic.
 *
 * Intents include the original "knowledge work" set (coding, writing, …)
 * plus specialised creative/production intents — image, video, audio,
 * software, website, report — each with its own clarification questions
 * and scaffolded output sections so the platform produces *operational*
 * prompts ready to paste into Midjourney/Runway/Suno/Cursor/etc.
 */

import { ruleBasedGaps } from "@/lib/services/clarification";
import { postFormatForModel } from "@/lib/services/formatter";
import { formatPromptFor } from "@/lib/model-formatters";
import { getModel, type AIModel } from "@/lib/ai-models";
import type { TargetModel } from "@/lib/types";

export type Intent =
  | "coding"
  | "writing"
  | "research"
  | "analysis"
  | "planning"
  | "creative"
  | "design"
  | "conversation"
  | "image"
  | "video"
  | "audio"
  | "software"
  | "website"
  | "report"
  | "other";

interface IntentRule {
  intent: Intent;
  patterns: RegExp[];
}

// Order matters: more specific intents first so they win against broader ones
// (e.g. "build a website" → website, not coding).
const INTENT_RULES: IntentRule[] = [
  {
    intent: "image",
    patterns: [
      /\b(image|photo|picture|illustration|render|midjourney|dall[- ]?e|stable diffusion|sdxl|flux|leonardo|pixel art|wallpaper|poster|sticker|emoji|avatar|cover art)\b/i,
      // Note: \b doesn't match Arabic word boundaries in JS regex (it only
      // recognises ASCII word chars), so Arabic patterns here intentionally
      // omit \b and rely on the distinctiveness of the keywords.
      /(صورة|رسم|رسومات|ميد ?جورني|خلفية|بوستر|ملصق)/
    ]
  },
  {
    intent: "video",
    patterns: [
      /\b(video|reel|short|tiktok|youtube short|trailer|cinematic|storyboard|sora|runway|pika|veo|aspect ratio|fps|cgi|motion graphics|animation)\b/i,
      // "إعلان" / ad is ambiguous between video / audio / image — leave it out.
      /(فيديو|ريل|مقطع|تيك ?توك|سيناريو|مشهد|انيميشن|رسوم متحرّكة)/
    ]
  },
  {
    intent: "audio",
    patterns: [
      /\b(podcast|audio|voice over|tts|narration|jingle|sound effect|sfx|suno|udio|elevenlabs|music|melody|song|episode|interview)\b/i,
      /(بودكاست|صوتي|تعليق صوتي|أغنية|موسيقى|مقابلة|حلقة)/
    ]
  },
  {
    intent: "website",
    patterns: [
      /\b(website|landing page|web ?site|web ?page|homepage|hero section|squarespace|wix|webflow|framer|carrd|tailwind|saas site|portfolio site)\b/i,
      /(موقع|صفحة هبوط|صفحة رئيسية|بورتفوليو)/
    ]
  },
  {
    intent: "software",
    patterns: [
      /\b(build (?:an? |the )?(?:app|application|saas|tool|platform|product)|cli tool|chrome extension|browser extension|mobile app|ios app|android app|electron|desktop app|backend service|api server)\b/i,
      /(تطبيق|برنامج|منصّة|أداة|إضافة متصفّح|تطبيق جوال|واجهة برمجية)/
    ]
  },
  {
    intent: "report",
    patterns: [
      /\b(report|whitepaper|case study|business plan|executive summary|literature review|thesis|dissertation|research paper|study|policy brief)\b/i,
      /(تقرير|أطروحة|ورقة بيضاء|خطّة عمل|ملخّص تنفيذي)/
    ]
  },
  {
    intent: "coding",
    patterns: [
      /\b(refactor|debug|bug|function|class|component|api|endpoint|sql|typescript|python|javascript|react|next\.js|node|test|ci|deploy|docker|kubernetes)\b/i,
      /(كود|برمج|دالة|مكوّن)/
    ]
  },
  {
    intent: "writing",
    patterns: [
      /\b(tweet|post|article|blog|essay|copy|email|reply|caption|headline|newsletter|paragraph)\b/i,
      /(تغريدة|مقال|بريد|رسالة)/
    ]
  },
  {
    intent: "research",
    patterns: [
      /\b(research|summarize|summary|explain|overview|brief|literature|review|state of)\b/i,
      /(لخّص|اشرح|نظرة عامة)/
    ]
  },
  {
    intent: "analysis",
    patterns: [
      /\b(analy[sz]e|compare|contrast|evaluate|metric|benchmark|kpi|dashboard|insight|root cause)\b/i,
      /(حلّل|قارن|قيّم)/
    ]
  },
  {
    intent: "planning",
    patterns: [
      /\b(plan|schedule|roadmap|launch|checklist|milestones?|timeline|sprint|backlog|kanban)\b/i,
      /(خطّة|جدول|خارطة طريق|قائمة)/
    ]
  },
  {
    intent: "creative",
    patterns: [
      /\b(story|fiction|poem|script|character|world ?building|dialogue|lyrics?)\b/i,
      /(قصّة|قصيدة|شخصية)/
    ]
  },
  {
    intent: "design",
    patterns: [
      /\b(logo|design|illustration|mock ?up|wireframe|brand|palette|figma|ui|ux|icon|banner)\b/i,
      /(لوجو|تصميم|شعار|أيقون|واجهة)/
    ]
  },
  {
    intent: "conversation",
    patterns: [
      /\b(advice|opinion|recommend|should i|help me decide|what would you|chat)\b/i,
      /(نصيحة|أنصح|ماذا تقترح)/
    ]
  }
];

export interface LocalIntent {
  intent: Intent;
  confidence: number;
}

export function detectIntentLocal(raw: string): LocalIntent {
  let best: LocalIntent = { intent: "other", confidence: 0.3 };
  for (const rule of INTENT_RULES) {
    const hits = rule.patterns.filter((p) => p.test(raw)).length;
    if (hits > 0) {
      const conf = Math.min(0.95, 0.7 + hits * 0.1);
      if (conf > best.confidence) best = { intent: rule.intent, confidence: conf };
    }
  }
  return best;
}

interface QuestionTpl {
  slot: string;
  en: string;
  ar: string;
  rationale_en: string;
  rationale_ar: string;
}

const QUESTION_TEMPLATES: Record<Intent, QuestionTpl[]> = {
  coding: [
    { slot: "language", en: "Which language and framework are you using?", ar: "ما اللغة وإطار العمل الذي تستخدمه؟", rationale_en: "Code style and APIs differ by stack.", rationale_ar: "أسلوب الكود وواجهات البرمجة تختلف حسب المنصّة." },
    { slot: "constraint", en: "Any performance, dependency, or style constraints?", ar: "هل توجد قيود على الأداء أو التبعيات أو الأسلوب؟", rationale_en: "Constraints prevent over-engineering.", rationale_ar: "القيود تمنع المبالغة في الحل." },
    { slot: "success", en: "What does 'done' look like, tests, behaviour, output?", ar: "كيف يبدو الإنجاز، اختبارات، سلوك، مخرجات؟", rationale_en: "A success criterion lets the model self-check.", rationale_ar: "معيار النجاح يتيح للنموذج التحقق من نفسه." }
  ],
  writing: [
    { slot: "audience", en: "Who is the target audience?", ar: "من هو الجمهور المستهدف؟", rationale_en: "Audience drives tone and vocabulary.", rationale_ar: "الجمهور يحدّد النبرة والمفردات." },
    { slot: "format", en: "What format, length, structure, examples?", ar: "ما الصيغة المطلوبة، الطول، البنية، الأمثلة؟", rationale_en: "Format avoids guessing.", rationale_ar: "تحديد الصيغة يمنع التخمين." },
    { slot: "goal", en: "What action should the reader take?", ar: "ما الإجراء الذي يجب أن يتّخذه القارئ؟", rationale_en: "A clear CTA shapes the whole piece.", rationale_ar: "دعوة العمل الواضحة تشكّل كامل النص." }
  ],
  research: [
    { slot: "audience", en: "Who is reading this, expert or beginner?", ar: "من القارئ، خبير أم مبتدئ؟", rationale_en: "Depth and jargon depend on this.", rationale_ar: "العمق والمصطلحات تعتمد على ذلك." },
    { slot: "depth", en: "How deep, TL;DR, summary, or deep dive?", ar: "ما عمق التغطية، موجز، ملخّص، أم تفصيلي؟", rationale_en: "Sets the level of detail.", rationale_ar: "يحدّد مستوى التفاصيل." },
    { slot: "sources", en: "Should it cite specific sources or be general?", ar: "هل يجب أن يستشهد بمصادر محدّدة أم يكون عامًا؟", rationale_en: "Avoids fabricated citations.", rationale_ar: "يمنع اختلاق المصادر." }
  ],
  analysis: [
    { slot: "data", en: "What data or context should I assume?", ar: "ما البيانات أو السياق المفترض؟", rationale_en: "Anchors the analysis in reality.", rationale_ar: "يربط التحليل بالواقع." },
    { slot: "frame", en: "Any framework to use (e.g. SWOT, RICE, 5 Whys)?", ar: "هل هناك إطار للاستخدام (مثل SWOT أو RICE أو 5 لماذا)؟", rationale_en: "Frameworks structure the answer.", rationale_ar: "الأطر تنظّم الإجابة." },
    { slot: "decision", en: "What decision should this analysis support?", ar: "ما القرار الذي يجب أن يدعمه هذا التحليل؟", rationale_en: "Focuses on what matters.", rationale_ar: "يركّز على ما يهم." }
  ],
  planning: [
    { slot: "horizon", en: "What's the time horizon, week, month, quarter?", ar: "ما المدى الزمني، أسبوع، شهر، ربع؟", rationale_en: "Determines task granularity.", rationale_ar: "يحدّد دقّة المهام." },
    { slot: "resources", en: "What resources or constraints exist?", ar: "ما الموارد أو القيود المتاحة؟", rationale_en: "Realistic plans need realistic limits.", rationale_ar: "الخطط الواقعية تحتاج حدودًا واقعية." },
    { slot: "success", en: "What does success look like?", ar: "كيف يبدو النجاح؟", rationale_en: "Defines the finish line.", rationale_ar: "يحدّد خطّ النهاية." }
  ],
  creative: [
    { slot: "tone", en: "What tone or mood?", ar: "ما النبرة أو الجو العام؟", rationale_en: "Anchors the voice.", rationale_ar: "يثبّت الصوت السردي." },
    { slot: "length", en: "How long should it be?", ar: "ما الطول المطلوب؟", rationale_en: "Prevents over- or under-writing.", rationale_ar: "يمنع الزيادة أو النقص." },
    { slot: "constraints", en: "Any must-include elements or things to avoid?", ar: "أي عناصر يجب تضمينها أو تجنّبها؟", rationale_en: "Boundaries spark creativity.", rationale_ar: "الحدود تحفّز الإبداع." }
  ],
  design: [
    { slot: "use", en: "Where will this be used (web, mobile, print)?", ar: "أين سيُستخدم هذا (ويب، جوال، طباعة)؟", rationale_en: "Use case constrains style and tech.", rationale_ar: "حالة الاستخدام تحدّد الأسلوب والتقنية." },
    { slot: "vibe", en: "What feeling should it evoke (modern, playful, formal)?", ar: "ما الإحساس الذي يجب أن يستحضره (حديث، مرح، رسمي)؟", rationale_en: "Drives every visual choice.", rationale_ar: "يقود كلّ خيار بصري." },
    { slot: "constraints", en: "Brand colors, references, or things to avoid?", ar: "ألوان الهوية، مراجع، أو أشياء يجب تجنّبها؟", rationale_en: "Anchors output to your brand.", rationale_ar: "يربط النتيجة بهويّتك." }
  ],
  conversation: [
    { slot: "context", en: "Quick context, what led to this question?", ar: "سياق سريع، ما الذي قاد إلى هذا السؤال؟", rationale_en: "Avoids generic advice.", rationale_ar: "يمنع النصيحة العامة." },
    { slot: "constraints", en: "Anything off-limits or already tried?", ar: "أي شيء مستبعد أو سبق أن جُرّب؟", rationale_en: "Saves a back-and-forth.", rationale_ar: "يوفّر جولات إضافية." }
  ],

  image: [
    { slot: "subject",     en: "What is the main subject and the action it's doing?",                  ar: "ما الموضوع الرئيسي وماذا يفعل؟",                          rationale_en: "Subject + action sets the centre of the frame.",                                       rationale_ar: "الموضوع والحركة يحدّدان مركز اللقطة." },
    { slot: "style",       en: "What art style, photo-real, anime, oil painting, 3D, line art?",      ar: "ما الأسلوب الفنّي، واقعي، أنمي، زيتي، ثلاثي الأبعاد، خطوط؟", rationale_en: "Style is the single biggest output lever.",                                            rationale_ar: "الأسلوب هو الرافعة الأكبر للنتيجة." },
    { slot: "lighting",    en: "Lighting and mood (golden hour, neon, studio softbox, dramatic)?",     ar: "الإضاءة والمزاج (ضوء ذهبي، نيون، استوديو، درامي)؟",         rationale_en: "Lighting carries emotion.",                                                            rationale_ar: "الإضاءة تنقل المشاعر." },
    { slot: "composition", en: "Camera framing, wide, close-up, top-down, aspect ratio?",             ar: "تأطير الكاميرا، لقطة عامّة، قريبة، علوية، نسبة الأبعاد؟",  rationale_en: "Composition tells the model where to put things.",                                    rationale_ar: "التأطير يحدّد توزيع العناصر." }
  ],

  video: [
    { slot: "duration",   en: "Total duration and target platform (Reel 9:16, YouTube 16:9, etc.)?",   ar: "المدّة الكلية والمنصّة المستهدفة (ريل 9:16، يوتيوب 16:9، …)؟", rationale_en: "Aspect ratio and length drive every other decision.", rationale_ar: "نسبة الأبعاد والمدّة تحكمان بقيّة القرارات." },
    { slot: "shots",      en: "Roughly how many shots/scenes, and what happens in each?",             ar: "كم عدد اللقطات/المشاهد تقريبًا، وما الذي يحدث في كلّ منها؟",  rationale_en: "Shot list = the storyboard skeleton.",               rationale_ar: "قائمة اللقطات هي هيكل القصّة." },
    { slot: "voice_music", en: "Voice-over language/tone, and music style?",                            ar: "لغة ونبرة التعليق الصوتي، ونمط الموسيقى؟",                    rationale_en: "Audio shapes pacing as much as visuals.",             rationale_ar: "الصوت يصنع الإيقاع كما الصورة." },
    { slot: "cta",        en: "Closing line / call-to-action?",                                         ar: "العبارة الختامية أو دعوة العمل؟",                              rationale_en: "Every short video benefits from a hook + payoff.",    rationale_ar: "كل فيديو قصير يستفيد من خطّاف ونهاية." }
  ],

  audio: [
    { slot: "format",     en: "Podcast episode, voice-over, song, jingle, or sound effect?",            ar: "حلقة بودكاست، تعليق صوتي، أغنية، جينغل، أو مؤثّر صوتي؟",     rationale_en: "Audio format dictates structure and length.",         rationale_ar: "الصيغة الصوتية تحدّد البنية والطول." },
    { slot: "voice",      en: "Voice character, gender, age, language/dialect, mood?",                 ar: "شخصية الصوت، الجنس، العمر، اللغة/اللهجة، المزاج؟",            rationale_en: "Voice details get baked into the TTS prompt.",        rationale_ar: "تفاصيل الصوت تُبنى في موجِّه TTS." },
    { slot: "duration",   en: "Target length (seconds for ad, minutes for episode)?",                   ar: "الطول المستهدف (ثوانٍ للإعلان، دقائق للحلقة)؟",                rationale_en: "Length controls pacing and amount of script.",        rationale_ar: "الطول يضبط الإيقاع وكمّية النصّ." },
    { slot: "music",      en: "Background music, genre, energy, or none?",                              ar: "الموسيقى الخلفية، النوع، الطاقة، أم بدون؟",                   rationale_en: "Music separates a podcast from a tutorial.",           rationale_ar: "الموسيقى تميّز البودكاست عن الشرح." }
  ],

  software: [
    { slot: "platform",    en: "Target platform, web, iOS, Android, desktop, CLI?",                     ar: "المنصّة المستهدفة، ويب، iOS، أندرويد، سطح مكتب، CLI؟",        rationale_en: "Platform decides framework and packaging.",          rationale_ar: "المنصّة تحدّد إطار العمل والتغليف." },
    { slot: "stack",       en: "Preferred stack/language (or 'no preference')?",                         ar: "التقنيات/اللغة المفضّلة (أو «لا تفضيل»)؟",                       rationale_en: "Pinning the stack avoids hallucinated frameworks.",   rationale_ar: "تثبيت التقنيات يمنع اختلاق إطار غير حقيقي." },
    { slot: "features",    en: "Three core features the MVP must have?",                                  ar: "ثلاث ميزات أساسية يجب أن يحويها الإصدار الأول؟",                rationale_en: "Forces ruthless prioritisation.",                     rationale_ar: "يفرض تحديد الأولويات بصرامة." },
    { slot: "data_auth",   en: "Data and auth, local-only, Supabase/Firebase, custom backend?",          ar: "البيانات والمصادقة، محلّيًا، Supabase/Firebase، خادم مخصّص؟",   rationale_en: "Data layer changes the architecture entirely.",      rationale_ar: "طبقة البيانات تغيّر البنية بالكامل." }
  ],

  website: [
    { slot: "purpose",     en: "What is the site for, landing, portfolio, e-commerce, docs, blog?",     ar: "لماذا الموقع، هبوط، بورتفوليو، متجر، توثيق، مدوّنة؟",         rationale_en: "Purpose shapes information architecture.",            rationale_ar: "الغرض يحدّد بنية المعلومات." },
    { slot: "sections",    en: "Which sections are required (hero, features, pricing, FAQ, contact)?",   ar: "الأقسام المطلوبة (هيرو، ميزات، تسعير، أسئلة، تواصل)؟",          rationale_en: "Section list = page outline.",                        rationale_ar: "قائمة الأقسام هي مخطّط الصفحة." },
    { slot: "vibe",        en: "Visual vibe, minimal, bold, editorial, playful, corporate?",            ar: "الإحساس البصري، مينيمال، جريء، تحريري، مرح، شركاتي؟",           rationale_en: "Vibe maps to typography, spacing, colour.",           rationale_ar: "الإحساس يترجم إلى الخطوط والتباعد والألوان." },
    { slot: "constraints", en: "Brand colors, target audience, accessibility or SEO requirements?",      ar: "ألوان الهوية، الجمهور المستهدف، متطلبات الوصول أو SEO؟",         rationale_en: "Constraints prevent generic templates.",              rationale_ar: "القيود تمنع القوالب العامّة." }
  ],

  report: [
    { slot: "purpose",     en: "What decision or action will this report drive?",                        ar: "ما القرار أو الإجراء الذي سيدفعه هذا التقرير؟",                  rationale_en: "A purposeless report is unreadable.",                 rationale_ar: "التقرير بلا غرض غير قابل للقراءة." },
    { slot: "audience",    en: "Who is the primary reader, executive, technical, academic, general?",   ar: "من القارئ الأساسي، تنفيذي، تقني، أكاديمي، عام؟",                rationale_en: "Audience drives depth and jargon.",                   rationale_ar: "الجمهور يحدّد العمق والمصطلحات." },
    { slot: "structure",   en: "Required sections (exec summary, methodology, findings, citations)?",    ar: "الأقسام المطلوبة (ملخّص تنفيذي، منهجية، نتائج، مراجع)؟",         rationale_en: "Structure is half the value of a report.",            rationale_ar: "البنية نصف قيمة التقرير." },
    { slot: "evidence",    en: "Should it cite real sources, internal data, or both?",                   ar: "هل يستشهد بمصادر حقيقية، بيانات داخلية، أم الاثنين؟",            rationale_en: "Evidence policy avoids fabricated citations.",        rationale_ar: "سياسة الأدلّة تمنع اختلاق المصادر." }
  ],

  other: [
    { slot: "audience", en: "Who is this for?", ar: "لمن هذا؟", rationale_en: "Frames the response.", rationale_ar: "يحدّد إطار الجواب." },
    { slot: "format", en: "What output format do you want?", ar: "ما صيغة المخرجات التي تريدها؟", rationale_en: "Clarifies structure.", rationale_ar: "يوضّح البنية." },
    { slot: "success", en: "How will you know it's good?", ar: "كيف ستعرف أنه جيّد؟", rationale_en: "Sets the bar.", rationale_ar: "يحدّد المعيار." }
  ]
};

export interface LocalQuestion {
  id: string;
  position: number;
  question: string;
  rationale: string;
  required: boolean;
}

export function generateQuestionsLocal(
  raw: string,
  intent: Intent,
  locale: "en" | "ar"
): LocalQuestion[] {
  const gaps = ruleBasedGaps(raw);
  const list = QUESTION_TEMPLATES[intent] ?? QUESTION_TEMPLATES.other;
  const covered = new Set(gaps.map((g) => g.slot));
  const filtered = list.filter((q) => {
    if (q.slot === "audience") return covered.has("audience");
    if (q.slot === "format") return covered.has("format");
    if (q.slot === "constraint" || q.slot === "constraints" || q.slot === "resources")
      return covered.has("constraints");
    if (q.slot === "success" || q.slot === "decision") return covered.has("success_criteria");
    return true;
  });
  // Take more questions for production-style intents that genuinely need them
  const PRODUCTION_INTENTS: Intent[] = ["image", "video", "audio", "software", "website", "report"];
  const cap = PRODUCTION_INTENTS.includes(intent) ? 4 : 3;
  const chosen = (filtered.length ? filtered : list).slice(0, cap);
  return chosen.map((q, i) => ({
    id: `q${i}`,
    position: i,
    question: locale === "ar" ? q.ar : q.en,
    rationale: locale === "ar" ? q.rationale_ar : q.rationale_en,
    required: i === 0
  }));
}

const SECTION_LABELS = {
  en: { context: "Context", task: "Task", constraints: "Constraints", format: "Output format", success: "Success criteria", original: "Original request" },
  ar: { context: "السياق", task: "المهمّة", constraints: "القيود", format: "صيغة المخرجات", success: "معايير النجاح", original: "الطلب الأصلي" }
};

const ROLE_BY_INTENT: Record<Intent, { en: string; ar: string }> = {
  coding: { en: "You are a senior software engineer.", ar: "أنت مهندس برمجيات أوّل." },
  writing: { en: "You are an expert copywriter.", ar: "أنت كاتب محتوى محترف." },
  research: { en: "You are a careful research analyst.", ar: "أنت محلّل أبحاث دقيق." },
  analysis: { en: "You are a strategic analyst.", ar: "أنت محلّل استراتيجي." },
  planning: { en: "You are an experienced project planner.", ar: "أنت مخطّط مشاريع خبير." },
  creative: { en: "You are a creative writer with a sharp ear.", ar: "أنت كاتب مبدع بحسّ مرهف." },
  design: { en: "You are a senior product designer.", ar: "أنت مصمّم منتجات أوّل." },
  conversation: { en: "You are a thoughtful advisor.", ar: "أنت مستشار حكيم." },
  image: { en: "You are an expert prompt engineer for diffusion image models (Midjourney, SDXL, Flux, DALL·E).", ar: "أنت خبير في صياغة موجِّهات نماذج توليد الصور (Midjourney و SDXL و Flux و DALL·E)." },
  video: { en: "You are an experienced video director writing prompts for AI video tools (Runway, Sora, Pika, Veo).", ar: "أنت مخرج فيديو خبير يكتب موجِّهات لأدوات الفيديو الذكية (Runway و Sora و Pika و Veo)." },
  audio: { en: "You are a producer of podcasts, voice-overs, and music for AI audio tools (ElevenLabs, Suno, Udio).", ar: "أنت منتج بودكاست وتعليق صوتي وموسيقى لأدوات الصوت الذكية (ElevenLabs و Suno و Udio)." },
  software: { en: "You are a staff software architect specifying a buildable product.", ar: "أنت معماري برمجيات أوّل تكتب مواصفات منتج قابل للبناء." },
  website: { en: "You are a senior web designer specifying a buildable site.", ar: "أنت مصمّم ويب أوّل تكتب مواصفات موقع قابل للتنفيذ." },
  report: { en: "You are an analyst producing a decision-grade report.", ar: "أنت محلّل تكتب تقريرًا بدرجة كافية لاتخاذ قرار." },
  other: { en: "You are a helpful assistant.", ar: "أنت مساعد ذكي." }
};

/** Domain-specific section blocks appended to the prompt body for production
 *  intents. Each returns plain markdown ready for ChatGPT/Claude/Gemini. */
function domainSections(intent: Intent, locale: "en" | "ar"): string {
  const en = locale === "en";
  switch (intent) {
    case "research":
      // Research prompts often produce confidently-wrong citations — inject
      // the same trust guardrails as reports.
      return en ? `\n\n${ANTI_HALLUCINATION_EN}` : `\n\n${ANTI_HALLUCINATION_AR}`;
    case "image":
      return en
        ? `\n\n# Visual specification\n- **Subject + action**: …\n- **Style**: …\n- **Lighting / mood**: …\n- **Composition**: framing, aspect ratio, focal length\n- **Color palette**: …\n- **Negative prompt** (avoid): blurry, extra fingers, watermark, text\n- **Diffusion params** (when applicable): steps, CFG/guidance, seed`
        : `\n\n# مواصفات بصرية\n- **الموضوع والحركة**: …\n- **الأسلوب**: …\n- **الإضاءة والمزاج**: …\n- **التأطير**: نسبة الأبعاد، البعد البؤري\n- **لوحة الألوان**: …\n- **يُتجنّب** (negative): تشوّش، أصابع زائدة، علامة مائية، نصّ\n- **معاملات النموذج** عند الحاجة: خطوات، CFG، seed`;
    case "video":
      return en
        ? `\n\n# Video plan\n- **Duration / aspect ratio**: …\n- **Shot list** (one line per shot: angle, action, duration)\n- **Voice-over** (language, tone, sample line)\n- **Music** (genre, energy, BPM)\n- **On-screen text / captions**: …\n- **Hook** (first 3 s) + **CTA** (last 3 s)`
        : `\n\n# خطّة الفيديو\n- **المدّة / نسبة الأبعاد**: …\n- **قائمة اللقطات** (سطر لكلّ لقطة: زاوية، حركة، مدّة)\n- **التعليق الصوتي** (اللغة، النبرة، جملة عيّنة)\n- **الموسيقى** (النوع، الطاقة، BPM)\n- **النصّ على الشاشة**: …\n- **الخطّاف** (أول 3 ثوانٍ) و**دعوة العمل** (آخر 3 ثوانٍ)`;
    case "audio":
      return en
        ? `\n\n# Audio production\n- **Format**: episode / VO / song / jingle / SFX\n- **Voice / vocalist**: gender, age, language, dialect, mood\n- **Pacing**: words-per-minute or BPM\n- **Music & SFX cues**: timestamped\n- **Final deliverable**: WAV/MP3, mono/stereo, sample rate`
        : `\n\n# إنتاج صوتي\n- **الصيغة**: حلقة / تعليق صوتي / أغنية / جينغل / مؤثّر\n- **الصوت/المغنّي**: الجنس، العمر، اللغة، اللهجة، المزاج\n- **الإيقاع**: كلمة في الدقيقة أو BPM\n- **مواضع الموسيقى والمؤثّرات**: مع توقيتات\n- **التسليم النهائي**: WAV/MP3، أحادي/ستيريو، معدّل العيّنة`;
    case "software":
      return en
        ? `\n\n# Product spec\n- **Platform**: …\n- **Stack**: language, framework, key libraries\n- **Core features (MVP)**: bullet list, ranked\n- **Data model**: entities + relations\n- **Auth & permissions**: …\n- **Acceptance tests**: 3-5 scenarios\n- **Out of scope**: explicit non-goals`
        : `\n\n# مواصفات المنتج\n- **المنصّة**: …\n- **التقنيات**: اللغة، إطار العمل، المكتبات\n- **الميزات الأساسية (MVP)**: قائمة مرتّبة\n- **نموذج البيانات**: الكيانات والعلاقات\n- **المصادقة والصلاحيات**: …\n- **اختبارات القبول**: 3-5 سيناريوهات\n- **خارج النطاق**: أهداف مستبعَدة صراحة`;
    case "website":
      return en
        ? `\n\n# Site spec\n- **Purpose**: …\n- **Page outline**: hero → … → footer\n- **Hero copy**: headline, sub-headline, primary CTA\n- **Visual system**: colors (hex), typography, spacing scale\n- **Components**: list with one-line descriptions\n- **Responsive breakpoints**: mobile / tablet / desktop\n- **A11y**: contrast, focus states, alt text\n- **SEO**: title tag, meta description, OG image`
        : `\n\n# مواصفات الموقع\n- **الغرض**: …\n- **مخطّط الصفحة**: هيرو → … → فوتر\n- **نسخ الهيرو**: عنوان، عنوان فرعي، CTA رئيسي\n- **النظام البصري**: ألوان (hex)، خطوط، تباعد\n- **المكوّنات**: قائمة بوصف سطر واحد\n- **نقاط الاستجابة**: جوال / تابلت / سطح مكتب\n- **إمكانية الوصول**: تباين، تركيز، نصوص بديلة\n- **SEO**: title, description, OG image`;
    case "report":
      return en
        ? `\n\n# Report structure\n1. **Executive summary** (≤ 150 words, 3 bullets)\n2. **Background & question**\n3. **Methodology** (brief, honest about limits)\n4. **Findings** (numbered, with evidence)\n5. **Recommendations** (action-oriented)\n6. **Risks & open questions**\n7. **References** (cite only verifiable sources)\n\n${ANTI_HALLUCINATION_EN}`
        : `\n\n# هيكل التقرير\n1. **ملخّص تنفيذي** (≤ 150 كلمة، 3 نقاط)\n2. **الخلفية والسؤال**\n3. **المنهجية** (موجزة وصادقة بشأن الحدود)\n4. **النتائج** (مرقّمة مع أدلّة)\n5. **التوصيات** (عملية)\n6. **المخاطر والأسئلة المفتوحة**\n7. **المراجع** (مصادر يمكن التحقّق منها فقط)\n\n${ANTI_HALLUCINATION_AR}`;
    default:
      return "";
  }
}

/**
 * Anti-hallucination block injected into report + research prompts.
 *
 * These five guardrails materially reduce fabricated citations and
 * confidently-wrong claims across every frontier LLM we tested. They are
 * appended to the prompt body — not hidden — so the user can audit them
 * and the model sees them as part of its instructions.
 */
const ANTI_HALLUCINATION_EN = `# Trust & accuracy guardrails
- **Cite only sources you can verify**. If you don't know, don't invent, state "unverified" or "no reliable source found".
- **Distinguish facts from inferences**. Use phrases like "based on …" / "this suggests …" when extrapolating.
- **Mark speculation explicitly**. Wrap conjecture in "[speculation]" so the reader can filter it.
- **Quote numbers with their source**. Round to a sensible precision; never report false precision.
- **Acknowledge the unknown**. Where data is missing, say so plainly; do not paper over gaps.`;

const ANTI_HALLUCINATION_AR = `# ضوابط الثقة والدقّة
- **استشهد فقط بمصادر يمكنك التحقّق منها**. إن لم تعرف فلا تخترع، قل «غير مُتحقَّق منه» أو «لم يُعثر على مصدر موثوق».
- **ميّز الحقائق عن الاستنتاجات**. استخدم «بناءً على…» أو «يُشير ذلك إلى…» عند الاستنتاج.
- **علّم التخمين صراحةً** بـ«[تخمين]» ليتمكّن القارئ من تصفيته.
- **اذكر الأرقام مع مصدرها**. قرّبها بدقّة معقولة ولا تدّعِ دقّة زائفة.
- **اعترف بالفجوات**. حين تنقص البيانات قل ذلك صراحةً ولا تتجاوزها.`;

/**
 * Map a free-form model id to its actual catalogue entry.
 *
 * Accepts either a new model id (`gpt-5`, `claude-opus-4-7`, …) or one of
 * the legacy `TargetModel` strings (`chatgpt`, `claude`, `copilot`,
 * `gemini`, `generic`) which we redirect to the current family flagship.
 */
function resolveModel(modelId: string): AIModel {
  const direct = getModel(modelId);
  if (direct) return direct;
  const legacy: Record<string, string> = {
    chatgpt: "gpt-5",
    claude:  "claude-opus-4-7",
    gemini:  "gemini-3-pro",
    copilot: "github-copilot",
    generic: "generic"
  };
  return getModel(legacy[modelId] ?? "generic") ?? (getModel("generic") as AIModel);
}

export function reconstructPromptLocal(opts: {
  raw: string;
  intent: Intent;
  qa: Array<{ question: string; answer: string }>;
  /** Either a TargetModel (legacy) or any AI_MODELS id. */
  targetModel: TargetModel | string;
  locale: "en" | "ar";
}): { final_prompt: string; rationale: string } {
  const { raw, intent, qa, targetModel, locale } = opts;
  const model = resolveModel(targetModel);
  const domainBlock = domainSections(intent, locale);

  // Each model family has its own optimal scaffold. The dispatcher in
  // model-formatters.ts owns the conversion; here we just pass the bundle
  // and the chosen prompt style.
  const body = formatPromptFor(model.promptStyle, {
    raw, intent, qa, locale, domainBlock, modelName: model.name
  });

  // Light post-format pass (whitespace, code-fence cleanup) for legacy
  // TargetModel values; new model ids skip it because the formatters
  // already produce clean output.
  const isLegacy = ["chatgpt", "claude", "copilot", "gemini", "generic"]
    .includes(targetModel as string);
  const formatted = isLegacy
    ? postFormatForModel(body, targetModel as TargetModel)
    : body;

  const rationale =
    locale === "ar"
      ? `أُعيد بناء الموجّه محليًا لنية «${intent}» بأسلوب «${model.promptStyle}» الأنسب لـ ${model.name}.`
      : `Rebuilt locally for intent "${intent}" using the "${model.promptStyle}" style optimised for ${model.name}.`;

  return { final_prompt: formatted, rationale };
}
