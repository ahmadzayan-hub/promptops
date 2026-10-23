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
