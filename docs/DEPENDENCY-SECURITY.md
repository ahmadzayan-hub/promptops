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

The **full development tree is not clean**: inherited Vitest 2/Vite/Tinypool,
brace-expansion and Tailwind/PostCSS-selector tooling still have advisories.
The current Vitest fixes require a separate major test-tool migration. Tests run
in batch mode on repository-owned fixtures; do not expose a Vitest UI/API or Vite
development server to untrusted clients. No production or user text is used in
these fixtures. A dedicated toolchain upgrade should rerun all unit and browser
tests rather than use `npm audit fix --force`.

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
