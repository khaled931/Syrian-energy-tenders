# Phase 2 — platform interface parity

The tender application now uses the main platform's navigation, header, account entry, footer and Kit newsletter implementation in Arabic and English. This change remains on the review branch; production merge and deployment belong to phase 4.

## Reference and navigation

- Reference implementation: `khaled931/Syrian-Renewables-` at `dedfdb1aff6aa36530cfae7670cd8196508049f3`. The subsequent `9ff329335e80eacd0cca036653a3fe9bb1e92a1b` changes dependencies and root routing, not these shared components.
- The public `/api/platform-navigation?locale=ar|en` response supplies each locale's actual order and URLs. Both local snapshots were checked against the live API on 2026-11-18 UTC.
- Seven top-level items contain 45 destinations, including all 14 previously missing destinations. The main renderer opens navigation links in the same tab even when an item's stored `openInNewTab` metadata is true; this app follows the renderer's behavior.
- Server requests use a five-minute revalidation interval and a four-second timeout. Invalid or unavailable responses use the complete versioned snapshot; account data never enters this cache.
- `PLATFORM_NAVIGATION_USE_SNAPSHOT=1` is a CI-only fixture switch. Leave it unset in deployment environments to receive central menu updates.
- The existing `/ar` and `/en` entry redirects remain compatible. Language selection retains a shareable `lang` query parameter, and browser Back restores the preceding language.

## Header and footer

Header dimensions, responsive breakpoints, theme tokens, typography and account styling follow the reference components and CSS. The local logo is the canonical SVG, avoiding a cross-origin image dependency. Footer spacing, four platform links, the data-use policy and seven official social SVG icons follow the shared footer stylesheet. Social icon attribution is retained in `SOCIAL-ICONS-LICENSE.txt`.

## Account and subscription boundaries

- The account control reads the central `/api/account/session` endpoint with credentials and `cache: no-store`; only authentication state, display name and plan remain in memory. It refreshes when the window regains focus and cancels pending requests on cleanup. No token or email is persisted.
- Guests go to the localized central login with a return URL to the tender application; members go to their localized account and see the same name/Free badge behavior as the main site. This control does not replace or weaken the existing tender membership or administrator checks.
- The embedded newsletter uses the canonical Kit form `9aa680b026` and mount/localization/cleanup logic. Provider submission, confirmation and anti-spam handling stay with Kit. Loading, failure and no-JavaScript states retain the canonical subscription-page fallback.
- Automated browser tests replace the external account and Kit boundaries with controlled responses. They do not submit an email or write production tender data. Actual cross-domain authenticated-session verification remains part of phase 4 integration checks.

## Maintenance and validation

Update the snapshot when central navigation changes; retain both locale orders and rerun the parity suite. Shared artwork, newsletter UID, footer styles and social paths should be refreshed from the canonical main-site implementation together, rather than edited independently.

Run `npm run test:unit`, `npm run typecheck`, `npm run build` and `npm run test:e2e`. Browser checks cover all 45 destinations in each language, same-tab behavior, guest/member controls, newsletter validation and failure fallback, language history, theme switching and responsive geometry. The existing TypeScript ESLint coverage issue is tracked for phase 3; a passing legacy lint command alone is not comprehensive lint validation.
