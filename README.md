<img src="public/icon.svg" alt="Existing prompt-workspace mark" width="76" height="76">

# PromptOps · ZAIan Studio

**Give a rough idea the structure it needs to become a reusable prompt.**

PromptOps guides builders through intent, missing context, clarifying questions
and model-specific formatting, while retaining sessions and prompt versions.
ZAIan Studio is the name used by its browser, desktop and mobile client packages.

Next.js 15 · React 18 · TypeScript · Supabase · Ollama

[Capabilities](#what-it-helps-you-do) · [Setup](#local-setup) ·
[Clients](#browser-desktop-and-mobile) · [Verification](#verify-changes) ·
[العربية](#بالعربية)

## What it helps you do

| Your task | Repository capability | Important boundary |
| --- | --- | --- |
| Clarify an incomplete request | Intent detection, gap analysis and questions | A model suggestion is not an evaluation verdict |
| Build a useful prompt | Answer-driven reconstruction and target-model formatting | Quality depends on real context and a configured inference service |
| Reuse good work | Templates, session history and stored prompt versions | Approval, production release and rollback states are not yet implemented |
| Work from familiar tools | Web studio, MV3 extension and desktop/client packages | Packaged clients need the correct API endpoint and separate release validation |
| Separate team data | Supabase organizations and row-level policies | Hosted identity and the actual database policies require acceptance testing |

**Idea → Intent → Missing context → Answers → Formatted prompt → Saved version**

## Current status

The canonical source is [`ahmadzayan-hub/promptops`](https://github.com/ahmadzayan-hub/promptops),
branch `main`. The studio is at `/studio`.

The 23 October 2026 integrated source, `0e521daf0d002d6eba7ed374ef44d4f63d281c82`,
passed [quality CI](https://github.com/ahmadzayan-hub/promptops/actions/runs/40004398072)
and [isolated tenant/concurrency checks](https://github.com/ahmadzayan-hub/promptops/actions/runs/40004398035).
This does not establish a current authenticated, durable production installation.

The broader governed prompt lifecycle is the product direction, not a completed
feature claim. Current session states cover intake, clarification, readiness
and finalization. Approval, benchmark/A-B workflows, release stages, rollback
and portfolio assurance integration remain separate work.

**Hosting note:** `vercel.json` currently sets `NEXT_PUBLIC_DEMO_MODE=true`.
A deployed preview therefore must not be presented as the full connected app.
Do not simply disable it before verifying the real backend and inference path.

## Local setup

Quality CI uses Node.js 22 and the committed lockfile.

```bash
git clone https://github.com/ahmadzayan-hub/promptops.git
cd promptops
npm ci
cp .env.example .env.local
```

Configure a dedicated development Supabase project and a reachable Ollama
service before starting the authenticated workflow. The prompt orchestration
code calls `src/lib/llm/ollama.ts`; unrelated provider keys in `.env.example`
do not configure that service.

| Configuration | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Intended Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public client key accepted by `src/lib/env.ts` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only privileged operations, where required |
| `OLLAMA_BASE_URL` | Inference endpoint reachable by the application server |
| `OLLAMA_MODEL_REASONING`, `OLLAMA_MODEL_FAST`, `OLLAMA_MODEL_REWRITE` | Installed models selected for each pipeline stage |
| `NEXT_PUBLIC_APP_URL` | This installation’s origin |
| `EXTENSION_API_KEY` | Existing extension access configuration; never use a shared sample key in production |

Review the [tenant migration checklist](docs/tenant-enrollment-release-review.md)
before applying schema changes. Do not replay a single old migration over a
live database or assume credentials prove correct tenant policies.

```bash
npm run dev
```

Open **http://localhost:3000/studio**. For hosted operation, `localhost:11434`
refers to the host itself, not your laptop. Use only an approved inference
deployment with suitable access controls; do not expose an unprotected model
service to the public internet. Infrastructure and inference costs depend on
the selected services and are not guaranteed to be zero.

## Browser, desktop and mobile

- `extension/`: Chrome Manifest V3 source. The release workflow packages a ZIP;
  store submission is a separate step.
- `desktop/`: Electron packaging for Linux and Windows. The existing workflow
  does not produce a signed/notarized macOS release.
- `mobile/`: Capacitor scaffold. Native project generation, signing and device
  acceptance remain separate; it is not a published mobile app.

The [client release workflow](.github/workflows/release-clients.yml) runs manually
or on `client-v*` tags. A matching tag publishes a release; do not create one as
a casual test. `scripts/check-client-endpoints.mjs` checks the configured client
destinations, but does not prove the destination backend is healthy.

## Verify changes

```bash
node scripts/check-client-endpoints.mjs
npm run typecheck
npm run lint
npm test
npm run build
python3 scripts/test-tenant-rls.py --pg-bin /path/to/postgresql/bin --full-chain --concurrent
```

The PostgreSQL command needs an approved disposable local database environment.
Never point it at production. Real sign-in, tenant isolation through hosted JWTs,
session save/reload and provider failure handling need separate acceptance tests.

## Documentation and source map

- `src/app/studio/`, `src/app/templates/`, `src/app/history/`: user workflows
- `src/app/api/sessions/`: session intake, answers and finalization
- `src/lib/services/`: orchestration, clarification, formatting and templates
- `supabase/`: schema, tenant policies and regression fixtures
- [API](docs/API.md), [desktop](docs/DESKTOP.md) and [mobile](docs/MOBILE.md) guides
- [Tenant release review](docs/tenant-enrollment-release-review.md)
- [Repository guide](docs/REPOSITORY_GUIDE.md): setup caveats, contribution checks and release boundaries

## بالعربية

**PromptOps** يحوّل الفكرة الأولية إلى طلب أوضح للنموذج عبر فهم الهدف وطرح أسئلة
واستكمال السياق وحفظ النسخ. **ZAIan Studio** هو اسم حزم العملاء المرتبطة به.

النسخة الكاملة تحتاج تسجيل دخول وقاعدة بيانات وخدمة استدلال حقيقية ومختبرة.
العرض التجريبي لا يحقق ذلك، كما أن اعتماد الطلبات وإطلاقها والتراجع عنها ليست
دورة مكتملة في التطبيق الحالي. تبقى هذه الحدود واضحة بدل تقديم وعود غير منفذة.

## License and contributions

No repository-wide license file is present in the reviewed source. This README
does not grant or change a license. Preserve existing notices, assets and client
packages. Keep changes reviewable and do not publish keys or private prompts.
