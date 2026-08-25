/**
 * Catalogue of frontier AI models the platform engineers prompts for.
 *
 * The list is curated, not auto-generated: each entry has a hand-tuned
 * `promptStyle` that maps to the formatting rules in formatter.ts. When a
 * new flagship model ships, add it here AND extend the formatter if its
 * idiomatic prompt structure differs from existing styles.
 *
 * Categories: text | code | image | video | audio
 *
 * The catalogue is the source of truth for:
 *   - the workspace model picker
 *   - the per-model output formatter
 *   - the token-window budget (lib/token-estimator.ts mirrors the values)
 */

export type ModelCategory = "text" | "code" | "image" | "video" | "audio";

export type PromptStyle =
  | "openai-system"      // GPT-5 / GPT-4.1: system + user, JSON-friendly, tool-use aware
  | "claude-xml"         // Claude Opus/Sonnet/Haiku 4.x: XML tags for sections
  | "gemini-multimodal"  // Gemini 3.x: long context, multimodal, structured JSON output
  | "grok-realtime"      // Grok 4: real-time web + X awareness
  | "deepseek-reason"    // DeepSeek R1: chain-of-thought first
  | "llama-instruct"     // Llama 4 instruct
  | "mistral-tight"      // Mistral / Codestral: concise instructions
  | "qwen-bilingual"     // Qwen 3: AR/EN/ZH bilingual
  | "cohere-tools"       // Command R+: tool-call JSON
  | "midjourney-args"    // --ar, --s, --v, --style raw
  | "flux-natural"       // Flux 2: natural-language scene + style
  | "sdxl-tags"          // SDXL/Stable: comma-separated tags + negative
  | "dalle-natural"      // DALL·E 4 / GPT-Image: natural language sentence
  | "ideogram-typo"      // Ideogram: typography-aware
  | "imagen-natural"     // Google Imagen 4
  | "recraft-vector"     // Recraft v3: vector-aware
  | "nano-banana"        // ByteDance Nano Banana
  | "sora-shotlist"      // Sora 2: shot list, camera, action
  | "veo-natural"        // Veo 3: natural-language director's brief
  | "runway-cinematic"   // Runway Gen-4: cinematic adjectives
  | "kling-shotlist"     // Kling 2.5
  | "pika-natural"       // Pika 2.5
  | "luma-natural"       // Luma Ray 2
  | "hailuo-natural"     // Hailuo / MiniMax
  | "seedance-natural"   // ByteDance Seedance
  | "music-prompt"       // Suno v5 / Udio: genre + mood + structure
  | "tts-elevenlabs"     // ElevenLabs v3: voice + emotion tags
  | "code-comments"      // Copilot inline-comment style
  | "code-spec"          // Cursor / Replit / Lovable / Bolt / v0: spec-first
  | "generic";           // Plain-text scaffold

export interface AIModel {
  /** Stable id used in URLs, storage, the API, and the picker. */
  id: string;
  /** Human-friendly display name. */
  name: string;
  vendor: string;
  category: ModelCategory;
  /** Documented context window in tokens (input + output). */
  context: number;
  /** Which prompt-formatting strategy this model favours. */
  promptStyle: PromptStyle;
  /** Short note about strengths, shown as a tooltip in the picker. */
  notes_en: string;
  notes_ar: string;
  /** True when this is the family's current flagship · the picker promotes it. */
  flagship?: boolean;
  /** True if this model accepts images / files as input. */
  multimodal?: boolean;
}

export const AI_MODELS: ReadonlyArray<AIModel> = [
  // ─── TEXT & REASONING ────────────────────────────────────────────────────
  {
    id: "gpt-5", name: "GPT-5", vendor: "OpenAI", category: "text",
    context: 400_000, promptStyle: "openai-system", flagship: true, multimodal: true,
    notes_en: "OpenAI flagship. Strong at structured output, tool use, multimodal.",
    notes_ar: "نموذج OpenAI الرائد. ممتاز في المخرجات المهيكلة واستخدام الأدوات والوسائط المتعدّدة."
  },
  {
    id: "gpt-5-mini", name: "GPT-5 Mini", vendor: "OpenAI", category: "text",
    context: 200_000, promptStyle: "openai-system", multimodal: true,
    notes_en: "Faster, cheaper sibling of GPT-5. Same prompt style.",
    notes_ar: "نسخة أسرع وأرخص من GPT-5. نفس أسلوب الموجِّه."
  },
  {
    id: "gpt-4.1", name: "GPT-4.1", vendor: "OpenAI", category: "text",
    context: 1_000_000, promptStyle: "openai-system", multimodal: true,
    notes_en: "1M-token long context. Use for big documents, codebase scans.",
    notes_ar: "نافذة سياق مليون توكن. مناسب للمستندات الكبيرة وفحص قواعد الأكواد."
  },
  {
    id: "claude-opus-4-7", name: "Claude Opus 4.7", vendor: "Anthropic", category: "text",
    context: 500_000, promptStyle: "claude-xml", flagship: true, multimodal: true,
    notes_en: "Anthropic flagship. Best at long, careful reasoning. Uses XML sections.",
    notes_ar: "نموذج Anthropic الرائد. الأفضل في الاستدلال الطويل والدقيق. يستخدم أقسام XML."
  },
  {
    id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", vendor: "Anthropic", category: "text",
    context: 200_000, promptStyle: "claude-xml", multimodal: true,
    notes_en: "Balanced Claude tier. Default choice for most workflows.",
    notes_ar: "المستوى المتوازن من Claude. الخيار الافتراضي لمعظم سير العمل."
  },
  {
    id: "claude-haiku-4-5", name: "Claude Haiku 4.5", vendor: "Anthropic", category: "text",
    context: 200_000, promptStyle: "claude-xml", multimodal: true,
    notes_en: "Fast, cheap Claude. Great for high-volume tasks.",
    notes_ar: "Claude سريع ورخيص. ممتاز للمهام بكميّات كبيرة."
  },
  {
    id: "gemini-3-pro", name: "Gemini 3 Pro", vendor: "Google", category: "text",
    context: 2_000_000, promptStyle: "gemini-multimodal", flagship: true, multimodal: true,
    notes_en: "2M-token window, native video/audio understanding.",
    notes_ar: "نافذة سياق 2 مليون توكن، فهم أصلي للفيديو والصوت."
  },
  {
    id: "gemini-3-flash", name: "Gemini 3 Flash", vendor: "Google", category: "text",
    context: 1_000_000, promptStyle: "gemini-multimodal", multimodal: true,
    notes_en: "Fast Gemini for high-volume multimodal work.",
    notes_ar: "Gemini سريع للأعمال متعدّدة الوسائط بكميّات كبيرة."
  },
  {
    id: "grok-4", name: "Grok 4", vendor: "xAI", category: "text",
    context: 256_000, promptStyle: "grok-realtime", flagship: true,
    notes_en: "Real-time web + X timeline awareness. Pick when freshness matters.",
    notes_ar: "وعي فوري بالويب وخطّ X. اختره عندما تكون حداثة المعلومة مهمّة."
  },
  {
    id: "deepseek-r1", name: "DeepSeek R1", vendor: "DeepSeek", category: "text",
    context: 128_000, promptStyle: "deepseek-reason", flagship: true,
    notes_en: "Reasoning specialist. Open-weight, transparent chain-of-thought.",
    notes_ar: "متخصّص في الاستدلال. أوزان مفتوحة وسلسلة تفكير شفّافة."
  },
  {
    id: "deepseek-v3", name: "DeepSeek V3.5", vendor: "DeepSeek", category: "text",
    context: 128_000, promptStyle: "deepseek-reason",
    notes_en: "General-purpose DeepSeek. Strong code + multilingual.",
    notes_ar: "DeepSeek عام الاستخدام. أداء قوي في البرمجة وتعدّد اللغات."
  },
  {
    id: "llama-4-instruct", name: "Llama 4 Instruct", vendor: "Meta", category: "text",
    context: 256_000, promptStyle: "llama-instruct", multimodal: true,
    notes_en: "Meta's open-weight flagship. Self-host friendly.",
    notes_ar: "نموذج Meta الرائد بأوزان مفتوحة. ملائم للاستضافة الذاتية."
  },
  {
    id: "mistral-large-2.1", name: "Mistral Large 2.1", vendor: "Mistral", category: "text",
    context: 128_000, promptStyle: "mistral-tight", flagship: true,
    notes_en: "Concise instruction-following. Strong European data privacy story.",
    notes_ar: "اتّباع تعليمات موجَز. سردية خصوصية بيانات أوروبية قويّة."
  },
  {
    id: "qwen-3-max", name: "Qwen 3 Max", vendor: "Alibaba", category: "text",
    context: 256_000, promptStyle: "qwen-bilingual", flagship: true, multimodal: true,
    notes_en: "Best Arabic + Chinese performance. Strong code reasoning.",
    notes_ar: "أفضل أداء بالعربية والصينية. استدلال برمجي قوي."
  },
  {
    id: "cohere-command-r-plus", name: "Cohere Command R+", vendor: "Cohere", category: "text",
    context: 128_000, promptStyle: "cohere-tools", flagship: true,
    notes_en: "Enterprise RAG + tool calling. JSON-first output.",
    notes_ar: "RAG واستخدام أدوات على مستوى المؤسّسات. مخرجات JSON أولًا."
  },
  {
    id: "reka-core", name: "Reka Core", vendor: "Reka", category: "text",
    context: 128_000, promptStyle: "openai-system", multimodal: true,
    notes_en: "Multimodal reasoning across image + video + text.",
    notes_ar: "استدلال متعدّد الوسائط عبر الصورة والفيديو والنصّ."
  },
  {
    id: "generic", name: "Generic", vendor: "·", category: "text",
    context: 8_000, promptStyle: "generic",
    notes_en: "Plain markdown scaffold. Use when copying to a model not in this list.",
    notes_ar: "هيكل ماركداون عام. استخدمه عند النسخ إلى نموذج خارج القائمة."
  },

  // ─── CODE-FIRST AGENTS ───────────────────────────────────────────────────
  {
    id: "cursor", name: "Cursor", vendor: "Cursor", category: "code",
    context: 200_000, promptStyle: "code-spec", flagship: true,
    notes_en: "Codebase-aware IDE agent. Spec-first prompts work best.",
    notes_ar: "وكيل IDE مدرك للكود. الموجِّهات بأسلوب المواصفات تعمل أفضل."
  },
  {
    id: "github-copilot", name: "GitHub Copilot", vendor: "GitHub", category: "code",
    context: 100_000, promptStyle: "code-comments",
    notes_en: "Inline completions. Comment-style prompts in the editor.",
    notes_ar: "إكمال داخل المحرّر. موجِّهات بأسلوب التعليقات."
  },
  {
    id: "replit-agent", name: "Replit Agent", vendor: "Replit", category: "code",
    context: 100_000, promptStyle: "code-spec",
    notes_en: "End-to-end app builder. Big spec-style prompts.",
    notes_ar: "بناء تطبيق كامل. موجِّهات مواصفات كبيرة."
  },
  {
    id: "lovable", name: "Lovable", vendor: "Lovable", category: "code",
    context: 100_000, promptStyle: "code-spec",
    notes_en: "Web-app generator. Treats your prompt as a product brief.",
    notes_ar: "مولِّد تطبيقات ويب. يعامل موجِّهك كموجَز منتج."
  },
  {
    id: "bolt", name: "Bolt.new", vendor: "StackBlitz", category: "code",
    context: 100_000, promptStyle: "code-spec",
    notes_en: "In-browser full-stack scaffolder. Concise spec works best.",
    notes_ar: "هيكلة مشروع كامل في المتصفّح. مواصفات مختصرة تعمل أفضل."
  },
  {
    id: "v0", name: "v0", vendor: "Vercel", category: "code",
    context: 100_000, promptStyle: "code-spec",
    notes_en: "UI generator. React + shadcn/ui patterns.",
    notes_ar: "مولِّد واجهات. أنماط React و shadcn/ui."
  },
  {
    id: "codestral", name: "Codestral", vendor: "Mistral", category: "code",
    context: 32_000, promptStyle: "mistral-tight",
    notes_en: "Code-only Mistral. Fast at completions and refactors.",
    notes_ar: "Mistral مخصّص للكود. سريع في الإكمال وإعادة الهيكلة."
  },

  // ─── IMAGE ───────────────────────────────────────────────────────────────
  {
    id: "midjourney-v7", name: "Midjourney v7", vendor: "Midjourney", category: "image",
    context: 1_000, promptStyle: "midjourney-args", flagship: true,
    notes_en: "--ar / --s / --style raw / --v 7. Densest aesthetic style.",
    notes_ar: "--ar / --s / --style raw / --v 7. أكثف أسلوب جمالي."
  },
  {
    id: "flux-2-pro", name: "Flux 2 Pro", vendor: "Black Forest Labs", category: "image",
    context: 1_000, promptStyle: "flux-natural", flagship: true,
    notes_en: "Natural-language scene + style. Photorealistic strength.",
    notes_ar: "وصف مشهد وأسلوب بلغة طبيعية. قوّة في الواقعية الفوتوغرافية."
  },
  {
    id: "sdxl-3", name: "Stable Diffusion 3.5 / SDXL 3", vendor: "Stability", category: "image",
    context: 1_000, promptStyle: "sdxl-tags",
    notes_en: "Comma-separated tags + negative prompt. Most controllable open model.",
    notes_ar: "وسوم مفصولة بفواصل + negative prompt. أكثر النماذج المفتوحة قابلية للتحكم."
  },
  {
    id: "dalle-4", name: "DALL·E 4 (GPT-Image-1)", vendor: "OpenAI", category: "image",
    context: 4_000, promptStyle: "dalle-natural", flagship: true,
    notes_en: "Natural-language sentence. Best at typography and instruction-following.",
    notes_ar: "جملة بلغة طبيعية. الأفضل في الطباعة الفنية واتّباع التعليمات."
  },
  {
    id: "ideogram-3", name: "Ideogram v3", vendor: "Ideogram", category: "image",
    context: 1_000, promptStyle: "ideogram-typo",
    notes_en: "Typography champion. Use for posters, logos, packaging.",
    notes_ar: "بطل الطباعة الفنية. للملصقات والشعارات والتغليف."
  },
  {
    id: "imagen-4", name: "Imagen 4", vendor: "Google", category: "image",
    context: 1_000, promptStyle: "imagen-natural",
    notes_en: "Google's image model. Photorealism + safe defaults.",
    notes_ar: "نموذج Google للصور. واقعية فوتوغرافية وإعدادات افتراضية آمنة."
  },
  {
    id: "recraft-v3", name: "Recraft v3", vendor: "Recraft", category: "image",
    context: 1_000, promptStyle: "recraft-vector",
    notes_en: "Vector + raster output. Strongest at brand assets.",
    notes_ar: "مخرجات vector وbitmap. الأقوى في أصول العلامات التجاريّة."
  },
  {
    id: "nano-banana", name: "Nano Banana Pro", vendor: "Google / DeepMind", category: "image",
    context: 1_000, promptStyle: "nano-banana", flagship: true,
    notes_en: "Conversational image edit. Natural-language scene + edits.",
    notes_ar: "تحرير صور حواري. مشهد + تعديلات بلغة طبيعية."
  },

  // ─── VIDEO ───────────────────────────────────────────────────────────────
  {
    id: "sora-2", name: "Sora 2", vendor: "OpenAI", category: "video",
    context: 4_000, promptStyle: "sora-shotlist", flagship: true,
    notes_en: "Shot list + camera + action language. Cinema-grade output.",
    notes_ar: "قائمة لقطات + كاميرا + لغة حركة. مخرجات بمستوى السينما."
  },
  {
    id: "veo-3", name: "Veo 3", vendor: "Google", category: "video",
    context: 4_000, promptStyle: "veo-natural", flagship: true,
    notes_en: "Director's brief in natural language. Best at audio-synced video.",
    notes_ar: "موجَز مخرج بلغة طبيعية. الأفضل في فيديو متزامن مع الصوت."
  },
  {
    id: "runway-gen-4", name: "Runway Gen-4", vendor: "Runway", category: "video",
    context: 2_000, promptStyle: "runway-cinematic",
    notes_en: "Cinematic adjectives + reference image. Strong at stylised motion.",
    notes_ar: "صفات سينمائية + صورة مرجعية. قوي في الحركة المُنمَّقة."
  },
  {
    id: "kling-2-5", name: "Kling 2.5", vendor: "Kuaishou", category: "video",
    context: 2_000, promptStyle: "kling-shotlist",
    notes_en: "Shot-by-shot prompting. Photoreal motion at competitive quality.",
    notes_ar: "موجِّه لكلّ لقطة. حركة واقعية بجودة منافسة."
  },
  {
    id: "pika-2-5", name: "Pika 2.5", vendor: "Pika", category: "video",
    context: 2_000, promptStyle: "pika-natural",
    notes_en: "Natural-language scene. Fast iteration on social-format clips.",
    notes_ar: "وصف مشهد بلغة طبيعية. تكرار سريع لمقاطع تنسيق التواصل الاجتماعي."
  },
  {
    id: "luma-ray-2", name: "Luma Ray 2", vendor: "Luma", category: "video",
    context: 2_000, promptStyle: "luma-natural",
    notes_en: "Natural-language with strong physics + camera control.",
    notes_ar: "لغة طبيعية بفيزياء قوية وتحكّم بالكاميرا."
  },
  {
    id: "hailuo-2", name: "Hailuo 2", vendor: "MiniMax", category: "video",
    context: 2_000, promptStyle: "hailuo-natural",
    notes_en: "Asia-leading character motion. Good with bilingual prompts.",
    notes_ar: "رائد آسيوي في حركة الشخصيات. يعمل جيّدًا مع موجِّهات ثنائية اللغة."
  },
  {
    id: "seedance-1", name: "Seedance", vendor: "ByteDance", category: "video",
    context: 2_000, promptStyle: "seedance-natural",
    notes_en: "ByteDance's TikTok-tuned video model.",
    notes_ar: "نموذج فيديو من ByteDance مضبوط على نمط TikTok."
  },

  // ─── AUDIO ───────────────────────────────────────────────────────────────
  {
    id: "suno-v5", name: "Suno v5", vendor: "Suno", category: "audio",
    context: 1_000, promptStyle: "music-prompt", flagship: true,
    notes_en: "Genre + mood + structure prompt. Full-track music generation.",
    notes_ar: "موجِّه نوع موسيقي + مزاج + بنية. توليد مقطوعة كاملة."
  },
  {
    id: "udio-2", name: "Udio v2", vendor: "Udio", category: "audio",
    context: 1_000, promptStyle: "music-prompt",
    notes_en: "Music + voice. Strong at lyric integration.",
    notes_ar: "موسيقى وصوت. ممتاز في دمج كلمات الأغنية."
  },
  {
    id: "elevenlabs-v3", name: "ElevenLabs v3", vendor: "ElevenLabs", category: "audio",
    context: 4_000, promptStyle: "tts-elevenlabs", flagship: true,
    notes_en: "Best TTS voices. Emotion tags + multilingual including Arabic.",
    notes_ar: "أفضل أصوات TTS. وسوم مشاعر ومتعدّد اللغات بما فيها العربية."
  }
];

export function getModel(id: string): AIModel | undefined {
  return AI_MODELS.find((m) => m.id === id);
}

/** Group models by category for the picker. Flagship first inside each group. */
export function groupedModels(): Record<ModelCategory, AIModel[]> {
  const out: Record<ModelCategory, AIModel[]> = {
    text: [], code: [], image: [], video: [], audio: []
  };
  for (const m of AI_MODELS) out[m.category].push(m);
  for (const cat of Object.keys(out) as ModelCategory[]) {
    out[cat].sort((a, b) =>
      (b.flagship ? 1 : 0) - (a.flagship ? 1 : 0)
      || a.vendor.localeCompare(b.vendor)
    );
  }
  return out;
}

export const CATEGORY_LABELS: Record<ModelCategory, { en: string; ar: string; emoji: string }> = {
  text:  { en: "Text & reasoning", ar: "نصّ واستدلال",     emoji: "🧠" },
  code:  { en: "Code & app builders", ar: "برمجة وتطبيقات", emoji: "💻" },
  image: { en: "Image",            ar: "صورة",              emoji: "🖼" },
  video: { en: "Video",            ar: "فيديو",             emoji: "🎬" },
  audio: { en: "Audio & voice",    ar: "صوت وموسيقى",       emoji: "🎙" }
};

/**
 * Narrow a catalogue model to the `target_model` the API accepts.
 *
 * The catalogue and the API contract disagree in size, deliberately: the
 * catalogue carries ~30 prompt styles across text, code, image, video and
 * audio, while `sessions.target_model` is an enum of five. Sending a raw
 * catalogue id (`nano-banana`, `github-copilot`) to POST /api/sessions is
 * rejected with a 400, so the picker's value has to be narrowed before it
 * crosses that boundary.
 *
 * The mapping is by `promptStyle`, not by id, so a new model inherits the
 * right target the moment it is added to the catalogue with an existing
 * style — no second list to keep in sync.
 *
 * It is lossy on purpose. Everything outside the four families the formatter
 * has real rules for falls back to "generic", which is a working prompt
 * rather than one formatted for the wrong model. Widening the enum would mean
 * teaching formatter.ts each new family first.
 */
export function toTargetModel(modelId: string): "chatgpt" | "claude" | "copilot" | "gemini" | "generic" {
  const style = getModel(modelId)?.promptStyle;
  switch (style) {
    case "openai-system":
      return "chatgpt";
    case "claude-xml":
      return "claude";
    case "gemini-multimodal":
    case "imagen-natural":
    case "veo-natural":
      return "gemini";
    case "code-comments":
    case "code-spec":
      return "copilot";
    default:
      return "generic";
  }
}
