# PromptOps · ZAIan Studio

> **ZAIan Studio is PromptOps.** One product, two names: PromptOps is the
> platform, ZAIan Studio is the name its browser, desktop and mobile clients
> ship under.

## Product Authority

| | |
|---|---|
| **Primary User** | Builders shipping AI features (this portfolio first) |
| **Job To Be Done** | Manage prompts as governed, versioned, testable release artifacts |
| **System of Record** | Prompt · Version · Model config · Template · Release · Rollback |
| **System of Intelligence** | Model comparison, cost/latency insight, improvement suggestions |
| **Explicit Non-Goals** | Evaluation verdicts (→ AI Assurance Lab / 44) · agent runtime (→ Agentic OS Enterprise) · being a feature inside Maktab |

> Prompt Lifecycle & Model Optimization Platform — not "make my prompt better".

The lifecycle this platform owns:

```
Draft → Test → Compare Models → Evaluate (via AI Assurance Lab)
      → Approve → Version → Deploy → Monitor → Improve
```

A candidate never reaches production on its own:

```
PromptOps ── candidate prompt v17 ──► AI Assurance Lab
                                        ├── PASS ──► production
                                        └── FAIL ──► back to PromptOps
```

## What is here

| Path | What it is |
| --- | --- |
| `src/app/studio` | The pipeline on one screen: intent → gap analysis → clarifying questions → a versioned, model-formatted prompt |
| `src/app/templates`, `src/app/history` | Reusable prompt skeletons; your 50 most recent sessions |
| `src/app/api/sessions/*` | `POST` to start, `/answers` to reply, `/finalize` to build |
| `src/app/api/extension/enhance` | The same pipeline for the clients, authenticated by API key |
| `src/lib/services/*` | `orchestration` (intent), `clarification` (gaps + questions), `formatter` (per-model shaping), `template` |
| `src/lib/ai-models.ts` | ~30 models with the prompt style each favours, and `toTargetModel()` narrowing them to the five the API accepts |
| `extension/` | Browser extension (MV3) — polish prompts inside ChatGPT/Claude/Copilot/Gemini |
| `desktop/` · `mobile/` | Electron shell · Capacitor scaffold |
| `supabase/migrations/0001_init.sql` | organizations · templates · sessions · questions · answers · prompt_versions · api_keys |

## Releasing the clients

The desktop, extension and mobile clients each bake in a fallback URL, so a
correction to it only reaches people who install a new build. Until 2026-08-25
all three pointed at another product's deployment.

`.github/workflows/release-clients.yml` builds them. It is manual by default —
releasing is a decision, not something a push should do — and also runs on a
`client-v*` tag, which additionally publishes a GitHub Release.

| Client | Built by CI | Notes |
|---|---|---|
| `extension/` | yes — zipped for the Chrome Web Store | MV3, no build step; the store still needs the upload done by hand |
| `desktop/` | yes — AppImage, .deb, .exe | macOS is deliberately omitted: an unsigned `.dmg` refuses to open, and notarising needs an Apple Developer certificate this workflow has no access to |
| `mobile/` | **no** | Capacitor with no committed native project. `npm run android:init` generates `android/` locally; until that is committed or generated in the workflow there is nothing to build |

`scripts/check-client-endpoints.mjs` asserts every client defaults to this
app's deployment and mentions no other product's host. CI runs it on every
push, and the release workflow gates on it before building anything — a client
pointing at the wrong host builds and runs perfectly, it just opens somebody
else's app.

### A note on this repository's history

Until 2026-08-25 this repo also contained a second, unrelated application —
an MBA study platform — grafted on top of the PromptOps code: its own schema
(`0003_tweenz_schema.sql`), its own routes, and the branding on every shared
surface. The PromptOps backend was complete and tested underneath it, but no
UI called it, and the clients in `desktop/`, `extension/` and `mobile/` all
pointed at that other app's deployment.

That graft has been removed and the UI those APIs were waiting for is built.
Anything in the git history before that date will show the two products
interleaved.

## Roadmap (P0 → P2)

- ~~**P0 · Identity**~~ — **done.** Every surface is PromptOps: the app, the
  manifest, the service worker, the sitemap, and the clients, which now point
  at this deployment instead of another product's.
- **P0b · Lifecycle states** — wire Draft→…→Improve as first-class states on a
  prompt. `sessions.status` covers intake → clarifying → ready → finalized
  today; approval, release and rollback are not modelled yet.
- **P1 · Platform** — benchmark datasets · A/B tests · cost/latency
  comparison · model adapters · prompt registry · release stages ·
  rollback · API/SDK · extension sync.
- **P2 · Portfolio integration** — production prompts of every portfolio
  product managed here, routed through the AI Gateway, evaluated by the
  Assurance Lab.

## KPIs

`prompt success rate` · `cost` · `latency` · `regression rate`
