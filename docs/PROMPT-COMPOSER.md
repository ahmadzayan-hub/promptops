# PromptOps: a prompt compiler, not a task executor

## Product outcome

A user can write any non-empty Arabic or English idea, however rough, and get an
editable prompt with role, task, context, constraints, output format and review
criteria. The original input is retained verbatim in a JSON string, not executed.
Missing context, audience and deliverable are explicit placeholders and optional
questions, not fabricated facts. Purpose inference is a small, visible heuristic
that the user can override. It is not semantic understanding by an AI model.

The default is a real deterministic local compiler. It does not need a provider,
API key, account, paid service or server round trip. There are no image-only
style chips on unrelated tasks. An image purpose remains available.

## Review and control

- Build, then edit the generated preview; undo edits back to that generated version.
- Compare with the untouched original. Update after changing the brief; copying
  and downloading stale output are disabled.
- Copy or download only after a user gesture. Clipboard denial leaves the draft
  intact with manual-copy instructions.
- No automatic draft persistence or cloud synchronization. Refreshing clears
  the local draft. Locale/theme preferences are distinct from prompt content.
- Optional server refinement explicitly sends the structured brief to the
  configured authenticated workspace and Ollama. It may persist a session even
  if cancelled or partially failed, which the UI states. Model output requires
  review; local composition is never relabelled as model success.

## Failure that prompted this change

The previous API returned HTTP 200 with `{ unavailable: true }` when Supabase or
Ollama was unavailable. Studio treated every 200 as `{ session: ... }` and read
`session.questions`, throwing the exact screenshot error. A regression test was
first run against that original dereference and failed with the same TypeError.

`studio-api.ts` now validates the envelope and nested collections. It recognizes
legacy 200-unavailable and current 503-unavailable, and rejects null/malformed
sessions, HTML and empty response bodies. API unavailability is now HTTP 503,
not a false success. An error keeps the local input and generated draft intact.
The Studio route also has a React error boundary.

## Shared client contract

`src/lib/prompt-composer.ts` is the only compiler source. The standalone MV3
module `extension/composer.js` is generated with `npm run build:composer`.
`npm run check:composer` proves byte-for-byte parity in CI.

Input: raw <= 8,000 characters; optional purpose, locale, context <= 2,000,
audience <= 500, constraints <= 2,000 and format <= 500. Output contract version 1:
engine `local-rules`, original, purpose, locale, sections, finalPrompt, missing,
questions and changes. There are no execution, credential, persistence or network
capabilities in this compiler. JSON quoting clarifies data boundaries but is not
a claim that arbitrary downstream models are immune to prompt injection.

## Verification and remaining gates

Unit tests cover the exact Arabic request, Unicode and very short input, preserved
whitespace, limits, explicit gaps, purpose overrides and unavailability schemas.
Browser tests cover mobile RTL, desktop, no local POSTs, edit/undo, changed input,
clipboard failure, download, server failure and cancellation races.

CI uses the existing public repository's standard Ubuntu runner, without paid
providers or live database writes. No client release tag or device installation
is part of this change. A Vercel quota block is a deployment gate, not a reason
to claim the new interface is already live. The repository currently has no
license file; this change does not assign one or alter ownership rights.

## Brand illustration provenance

`public/promptops-brand-3d.webp` is a generated decorative folded-document brand
concept, not a product screenshot or evidence of functionality. It was generated
with the available built-in image-generation tool on 23 October 2026; the exact
model identifier was not verified. The original transparent PNG was preserved
separately and the web delivery copy is 256 px, approximately 9 KB. Existing
SVG logo, wordmark and interface icons remain intact. The accent has explicit
dimensions, empty decorative alt text and lazy loading, with no priority/LCP role.
