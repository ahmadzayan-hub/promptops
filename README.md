# PromptOps

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

## What already works (inherited codebase)

This repository carries the full history of the Prompt Orchestrator
lineage — Next.js + Supabase + Ollama, multi-tenancy, clarification
Q&A, prompt versioning, model-specific formatting, and companion
clients:

| Path | Client |
| --- | --- |
| `src/` | Web app (intake → gap analysis → Q&A → reconstruction) |
| `extension/` | Browser extension (MV3) — polish prompts inside ChatGPT/Claude/Copilot/Gemini |
| `desktop/` | Electron shell |
| `mobile/` | Capacitor scaffold |
| `docs/AUDIT_MASTER_PROMPT.md` | Audit discipline: no 100% claims without evidence; compile is not a passing user journey |

## Roadmap (P0 → P2)

- **P0 · Identity + lifecycle skeleton** — rebrand surfaces to PromptOps;
  wire the Draft→…→Improve stages as first-class states on a prompt.
- **P1 · Platform** — benchmark datasets · A/B tests · cost/latency
  comparison · model adapters · prompt registry · release stages ·
  rollback · API/SDK · extension sync.
- **P2 · Portfolio integration** — production prompts of every portfolio
  product managed here, routed through the AI Gateway, evaluated by the
  Assurance Lab.

## KPIs

`prompt success rate` · `cost` · `latency` · `regression rate`
