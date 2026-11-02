# Prompt constraint benchmark

`goldset.json` contains six synthetic English/Arabic briefs and a versioned,
literal constraint rubric. No customer records or provider credentials belong here.

1. Run each `source` through the current composer using an approved provider.
2. Save the **draft body only**, excluding the appended original-brief reference,
   as `[{"id":"email-budget","prompt":"..."}, ...]` in a local JSON file.
   Including the original appendix would conceal dropped constraints.
3. Run `npm run eval:prompts -- path/to/candidates.json`.
4. Record the source commit, provider/model version, generation parameters and
   report with the run. Compare the same goldset/rubric across versions.

Exit 0 means all literal checks pass, 1 means a rubric failure, 2 means invalid
input. Missing cases fail; duplicate and unknown IDs are rejected. This command
does not contact a model or incur inference costs. CI tests the scorer with
synthetic positive and negative outputs; it does **not** establish model quality.

The rubric is a small regression baseline, not semantic evaluation, prompt
injection certification, or an independent review. A prompt can quote a constraint
while contradicting it elsewhere. Human review of intent, contradictions and
usefulness remains required before accepting a model change. Real provider
acceptance is pending a recorded run with approved inference access.
