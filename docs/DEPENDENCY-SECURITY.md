# Dependency verification, 23 October 2026

The redesign updates Next.js and its ESLint configuration to **15.5.28** and
verifies the installed image dependency is **sharp 0.35.5**. This addresses the
upstream [image-optimization advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw).
No exploit was run against any service.

Scoped same-major overrides keep Next's PostCSS at **8.5.26** and source-map-js at
**1.2.2**, rather than migrating the application to Next 16. See the upstream
[PostCSS fix](https://github.com/postcss/postcss/security/advisories/GHSA-fxqj-rqcc-2cmp)
and [source-map-js release](https://github.com/7rulnik/source-map-js/releases/tag/v1.2.2).
The lockfile and clean-install CI must be retained together with these overrides.

`npm audit --omit=dev` returned zero findings for this candidate. CI now gates
high/critical production dependency findings. This is a dated registry check,
not a guarantee that the application or all dependencies are vulnerability-free.

The earlier full development audit found inherited Vitest/Vite/Tinypool,
brace-expansion and Tailwind/PostCSS-selector advisories. The separately scoped
24 October toolchain repair below removes the high/critical findings; three
moderate package entries remain. Tests run in batch mode on repository-owned
fixtures; do not expose a Vitest UI/API or Vite development server to untrusted
clients. No production or user text is used in these fixtures.

The production deployment gate is separate. A passing candidate audit does not
prove the older currently hosted Vercel deployment has these patches.

## Zod advisory repair, 23 October 2026

After PR13 merged, the registry audit newly blocked the otherwise identical
source tree. The direct dependency `promptops -> zod` was locked at **3.25.76**
under `^3.23.8`. The production audit reported one **high** finding at
`node_modules/zod`: [GHSA-mrhx-c7xc-m3w5 / CVE-2023-54404](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5),
affecting versions `<4.6.6`. The earlier zero-finding result above is historical.

The npm registry's latest 3.x release remains 3.25.76. The maintainer states in
the [v3 tracking issue](https://github.com/colinhacks/zod/issues/6653) that no new
v3 versions are being published, while disputing the advisory's classification.
There is no published same-major fix that clears the reviewed advisory. This
repair therefore pins only Zod to **4.6.7**, the current official patch release;
it is an intentional major runtime migration, not a forced bulk audit fix.
No other locked package changes. See [4.6.6 security fix release](https://github.com/colinhacks/zod/releases/tag/v4.6.6),
[4.6.7 release](https://github.com/colinhacks/zod/releases/tag/v4.6.7), and the
[official migration guide](https://zod.dev/v4/changelog).

### Compatibility and bounded validation

- Zod 4 requires two arguments to `z.record`; the composer keeps string keys,
  optional/empty answers, and its existing q1–q3/count/length refinements.
- Template creation explicitly keeps `body` optional, preserving its prior
  empty-body normalization. Model-output trimming, defaults, strict objects,
  consent, discriminated phases and mandatory human review remain tested.
- The API's `invalid_body` response keeps `issues.formErrors` and
  `issues.fieldErrors`. Zod's human-readable messages and detailed issue codes
  are version-dependent and are not promised byte-for-byte compatible.
- Zod 4's UUID/email validators are stricter. Proper UUIDs and ordinary
  plus-address signup inputs are covered; formerly tolerated nonconforming
  values may now be rejected. There is no new auth/provider configuration.
- Legacy answer batches and extension `qa` arrays now allow at most **100**
  items; parsed Studio questions and version-history arrays allow **1000**
  each. These are new safety limits, not pagination. Responses exceeding the
  Studio caps fail with `invalid_session_response`; no entries are silently
  truncated. Existing LLM-first collection limits are unchanged.

The [upstream fix](https://github.com/colinhacks/zod/pull/6652) rejects oversized
bounded collections before walking their elements. It does **not** cap
unbounded collections or the memory used to receive/parse JSON itself. The new
legacy caps activate that protection and are not a substitute for the dependency
upgrade. LLM-first request bodies retain their existing 64 KB/time limits;
legacy routes still need separately scoped request-byte/rate-limit hardening.

Tests use small synthetic arrays with unreadable elements to prove early
rejection, and mocked routes to prove no database/model call for oversized
inputs. No exhaustion attack, live inference, credential/configuration change,
audit suppression, publication, or deployment is part of this local repair.
The production audit must pass again for the exact published commit, along with
the existing quality and browser checks. The development-tool advisories above
remain separately scoped; zero production findings is not a whole-app guarantee.

## Development-tool repair, 24 October 2026

This separate repair changes development dependencies only, on top of the merged
Zod repair. Application dependencies, source, test assertions, scripts, workflows
and runtime configuration are unchanged. No audit suppression or forced bulk
upgrade is used.

- Pin **Vitest 4.1.12**, the release containing the [v4 mock-hardening backport](https://github.com/vitest-dev/vitest/releases/tag/v4.1.12).
  Vitest 3.2.6 fixes the UI advisory but still depends on vulnerable Tinypool 1.x.
  V4 [removes Tinypool and vite-node](https://v4.vitest.dev/guide/migration), avoiding
  unsupported transitive-major overrides. Vitest 5 is not needed for this scope.
- Explicitly pin its compatible development peer **Vite 6.4.4**, rather than let
  the resolver select a newer major. The [6.4 line still receives security fixes](https://vite.dev/releases);
  [6.4.4 is the patched release](https://github.com/vitejs/vite/releases/tag/v6.4.4)
  outside the reviewed Vite ranges. Both tools support the repository's Node 22
  CI; local validation also uses supported Node 24.
- Update only the two **brace-expansion** lock records to **1.1.21 / 5.0.12**.
  These patched versions satisfy their existing minimatch dependency ranges;
  no ESLint major or override is required. See the [upstream advisory](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr).

### Exposure and verification limits

The original critical [Tinypool worker-option](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3)
and [run-option](https://github.com/advisories/GHSA-85c8-ppgw-ccpr) gadgets require a
separate prototype-pollution primitive. No exploit chain was established here.
The [Vitest UI advisory](https://github.com/advisories/GHSA-5xrq-8626-4rwp) requires
an exposed API/UI or the described Windows UI/browser conditions, absent from
the reviewed Ubuntu batch-test configuration. These are nevertheless relevant
to developer and CI environments, which install and execute this toolchain.
They were not established as public production request-path vulnerabilities.

A clean install with the scoped lockfile passes all **225 existing tests in
27 files**, with no test weakening or application-source adaptation. Exact-head
Node 22 CI must additionally repeat the existing browser/build checks before
merge. The migration changes mock and worker-pool semantics; this is an explicit
test-tool major migration, not a claim that v2/v4 are identical.

The candidate's full audit reports **zero high/critical findings** and **three
moderate package entries**: TailwindCSS, postcss-nested and
postcss-selector-parser, all rooted in the [selector-parser CPU-exhaustion advisory](https://github.com/advisories/GHSA-rj75-hqrm-r3gf).
The production-only audit remains zero. The moderate CSS tooling chain remains
separately scoped rather than forcing a Tailwind major upgrade. Deprecated
ESLint/Supabase helper packages are also not claimed fully modernized.

No public tooling server, exploit, credential change, workflow permission,
database change, manual deployment or subscription is part of this repair.
The hosted application's acceptance and actual deployment commit remain
separate from these source/dependency checks.
