# Phase 3 — reproducible dependencies and enforced quality checks

## Runtime and package baseline

The application uses Node.js 24.x and npm 11.x. `.nvmrc`, package engines and CI agree on the Node major; Vercel supports Node 24 builds and functions. All direct dependencies have exact versions and the versioned npm v3 lockfile includes transitive versions and integrity hashes. Both CI and the repository's Vercel install command use `npm ci`. Keep manifest and lockfile changes together; do not regenerate the lockfile independently during deployment.

| Package | Reviewed version |
| --- | --- |
| Next.js / eslint-config-next | 16.4.6 |
| React / React DOM | 19.3.1 |
| Firebase client | 13.4.0 |
| Firebase Admin | 14.5.1 |
| TypeScript | 5.9.3 |
| ESLint | 10.15.0 |
| Playwright | 1.65.1 |

Next.js 16 avoids the approaching end of Next.js 15 maintenance support. The existing asynchronous request APIs and modular Firebase Admin imports already meet the migration requirements. The TypeScript configuration uses the required automatic JSX runtime, and `typecheck` generates Next route types before checking a clean checkout. Font packages remain at the phase 2 versions to preserve the reviewed typography. TypeScript remains on its compatible 5.x line; ESLint moves to the supported 10.x line accepted by eslint-config-next 16.4.6.

## Security findings and the scoped override

The baseline resolved from the previous manifest reported 14 affected packages in `npm audit`: 5 high and 9 moderate. These are dependency findings, including propagated findings, not evidence that the deployed application was exploited. Updating the direct packages removes the legacy PostCSS, UUID and Google Cloud dependency findings.

Firebase's Firestore package still requests `@grpc/grpc-js` from an affected older line. A scoped override selects the upstream patched `1.13.6` version only beneath `@firebase/firestore`; other dependency branches retain their normal resolution. The upstream advisory identifies `1.13.6` as patched. Remove the override once Firestore's own dependency requirement resolves to a patched release, after repeating the full checks. Do not accept npm's suggested downgrade to an obsolete Firebase major.

The final lockfile audit reports zero known vulnerabilities as of 2026-11-19. This is a point-in-time dependency check, not a guarantee against unknown vulnerabilities or a substitute for production configuration review. CI runs `npm audit --audit-level=moderate` across development and runtime dependencies and fails on registry errors as well as qualifying findings.

## Effective linting and runtime behavior

The former ESLint file contained only ignore patterns, leaving typed application sources unchecked. The replacement uses the official Next.js Core Web Vitals and TypeScript configurations, scopes typed rules to TS/TSX, checks the CommonJS test harness with its actual Node globals and treats warnings as failures. Generated output is ignored by both lint and Git. No application rule is disabled to make the build pass.

Some transitive lint plugins still declare older ESLint peer ranges, so npm can print peer-resolution warnings. Next.js 16.4.6 explicitly supports ESLint 10 and supplies compatibility wrappers for those plugin APIs. Clean installation and the real lint run are verified without `--force` or `--legacy-peer-deps`; do not add either flag to bypass a future installation failure.

The enabled checks prompted small lifecycle fixes: missing Firebase configuration initializes the admin error state directly; the initial public-API health check follows the authenticated administrator event, while explicit refresh/save actions retain their checking feedback. Account return URLs read browser location through `useSyncExternalStore`, preserving query/hash context and client navigation without synchronously copying derived state in an effect. The newsletter timer and test-loader variable names were corrected without changing provider or persistence behavior.

## CI and ongoing maintenance

CI installs from the lockfile with `npm ci`, caches downloaded npm packages, runs the dependency audit, lint, type check, regression tests, build and Chromium browser suite. It has read-only repository permissions, does not retain checkout credentials and cancels superseded runs to reduce resource use. Official checkout, Node setup and artifact upload actions are pinned to reviewed commit SHAs with release comments.

Dependabot proposes monthly grouped patch/minor npm updates and monthly GitHub Actions updates. Major changes require separate review. No update is merged or published automatically. Review any security alert promptly rather than waiting for the monthly schedule.

The browser suite includes the existing bilingual/responsive checks plus an unconfigured-admin guard and a client-navigation account-return test. External account/newsletter services remain isolated test boundaries; tests do not submit email or write production tenders. Actual Firebase rules/CORS, authenticated production integration and deployment remain phase 4.

## Primary references

- [Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Next.js support policy](https://nextjs.org/support-policy)
- [ESLint version support](https://eslint.org/version-support/)
- [Firebase client release notes](https://firebase.google.com/support/release-notes/js)
- [Firebase Admin release notes](https://firebase.google.com/support/release-notes/admin/node)
- [gRPC upstream security advisory](https://github.com/grpc/grpc-node/security/advisories/GHSA-m9gg-hp2v-232j)
- [Vercel Node.js 24 support](https://vercel.com/changelog/node-js-24-lts-is-now-generally-available-for-builds-and-functions)
