# LLM-first PromptOps: understand, clarify, draft, review

The primary Studio path now uses a configured language model. It does not pass a deterministic template off as model intelligence. The original local composer and browser extension remain explicit privacy alternatives, labeled **no LLM**.

## Actual flow

1. A signed-in workspace member reviews the named destination and explicitly consents. Typing alone sends nothing.
2. One LLM call understands the untouched brief, extracts exact source quotations and asks at most three material questions. The user can correct the original or leave answers unknown.
3. A separate user action sends the original, analysis and optional answers for a structured professional draft: role, task, context, constraints, output, review criteria, explicit assumptions and unresolved details.
4. A fresh call to the **same configured model** reviews the candidate against the original and answers. This is a separate review pass, not an independent model or guaranteed fact checker. Evidence must match actual source and draft substrings; a naked `approved: true` is invalid.
5. At most one repair and one further review follow a failed check. Unresolved failures remain visible as `needs_changes`, never an approved result. Copy requires human review acknowledgement; manual edits invalidate that acknowledgement and the displayed model-review status.

Maximum five calls per complete flow, zero automatic network retries. No tools, task execution, cross-provider fallback, paid upgrade, automatic model substitution or autonomous keyboard replacement. Prompt injection is treated as quoted input data, never instructions to the pipeline. These boundaries reduce risk; semantic fidelity still requires human review. Source-quote coverage can be incomplete and the numeric check is conservative, not a proof of truth.

## Activation, without surprise spending

The existing workspace Supabase authentication/membership configuration is required. `/api/compose` is same-origin and authenticated, not an anonymous proxy. No live database migration or new credentials are needed by this code change.

Choose exactly one server-side provider:

### Existing self-hosted Ollama

Set `PROMPTOPS_LLM_PROVIDER=ollama`, an explicit `OLLAMA_BASE_URL`, and `OLLAMA_MODEL_REASONING` to a model actually installed on that server. The existing Ollama adapter is reused. Model licenses, hardware and hosting requirements apply; this is not an absolute free-service promise. A Vercel localhost is **not** the owner's laptop. Do not expose a local Ollama daemon publicly just to bypass that limitation.

### Optional Groq

Only after the owner has checked the account's current plan, limits and no-spend eligibility, securely configure `PROMPTOPS_LLM_PROVIDER=groq`, `GROQ_API_KEY`, `GROQ_MODEL=openai/gpt-oss-20b` (or `openai/gpt-oss-120b`) and `GROQ_NO_SPEND_CONFIRMED=true`. This flag is an owner's acknowledgement, **not a technical spending cap**. Do not set it on a paid/billable account under a no-spend requirement. No credentials were created, installed or verified during implementation, and no live Groq inference was performed.

Models are centrally allowlisted in `src/lib/llm/config.ts`. The production IDs above were checked on 2026-10-23 in [Groq model docs](https://console.groq.com/docs/models). Llama 3.1 8B and Llama 3.3 70B were removed from the free/developer tiers on August 16, 2026; continued enterprise availability does not establish no-spend eligibility. See [deprecations](https://console.groq.com/docs/deprecations). The adapter uses JSON mode plus strict local validation, not a claimed JSON-schema guarantee. [Structured outputs](https://console.groq.com/docs/structured-outputs).

Provider limits are account/organization dependent. The documented free-plan GPT-OSS limits may be too small for long multi-call flows; check the actual account, shorten the brief or use self-hosted Ollama. [Rate limits](https://console.groq.com/docs/rate-limits). Missing key, missing eligibility acknowledgement, unavailable/retired model, authentication, quota, billing, timeout, malformed response and cancellation are distinct sanitized outcomes. A 429 honors bounded Retry-After, but never automatically retries. A 402 stops instead of enabling billing. Provider response bodies, keys and endpoint credentials are not exposed or logged. [Error codes](https://console.groq.com/docs/errors).

## Cancellation, state and privacy

This new endpoint writes **no workspace session or prompt version**. The draft stays in the tab; refresh closes it. Providers may retain requests under their policies. Existing `/api/sessions` routes and the optional legacy workspace refinement inside local mode retain their old save behavior; they are not this reviewed pipeline.

Cancellation stops waiting and propagates a signal, but cannot prove the provider stopped or did not count usage. Ambiguous outcomes block blind retry until the user acknowledges checking provider activity. No automatic retry occurs. A request UUID plus a body fingerprint suppresses duplicate requests only within one server process for two minutes. Different users never share results. One active request and six starts per workspace/user per two minutes, plus 100 cached requests globally, bound that process. This is **not distributed durable idempotency, a global quota, or an exactly-once billing guarantee**. Scaling/restarts can lose deduplication. No new persistent storage was added to claim otherwise.

Bodies are limited to 64 KB and five seconds before inference; briefs to 8,000 characters; model output to 3,000 tokens per call; each provider call to 30 seconds and the draft phase to 110 seconds. Hosting duration limits can be shorter. GET reports configuration only, always `verified: false`, and makes no inference request.

## Browser, desktop and mobile

The extension remains local-only and performs no provider transmission. It requires explicit selection, preview, confirmation and guarded undo; passwords/payment fields and unsupported rich editors remain blocked. To use the LLM, deliberately paste the selected text into Studio and consent to its displayed destination. No model-assisted extension transmission, native system-wide keyboard or new device permission is claimed or installed.

## Verification and remaining acceptance gate

Unit tests use synthetic credentials and mocked models. Browser tests mock the compose API and verify consent, clarifications, human review, quota and cancellation. They do **not** prove semantic model quality, real-provider availability, account no-spend eligibility, or production activation. Actual acceptance requires an owner-authorized configured provider and an approved non-sensitive Arabic/English test set, including ambiguous input, negations, numbers, missing facts and adversarial instructions. Do not label the deployment fully AI-ready before that succeeds.
