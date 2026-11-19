# Production readiness — 2026-11-19

## Verified before release

- Production uses Firebase project `syrian-energy-tenders` and Node.js 24 on Vercel.
- The currently published Firestore rules were inspected in the project's Firebase Console. They match `firebase/firestore.rules`: tender reads/writes require an existing `admins/{uid}` document; users cannot create administrator documents. Unmatched collections are denied.
- An unauthenticated Firestore REST read is rejected with HTTP 403 / `PERMISSION_DENIED`. The public server API remains available and exposes the limited public field list, without source links, internal notes, private attachment paths, or write metadata.
- Production server credentials are present as sensitive Vercel variables. They were not extracted or copied to Preview. Preview intentionally has no production Admin SDK credentials.
- Authenticated administrator save transactions, stale-edit detection, upload failure, retry idempotency and status preservation are tested against isolated cloud-boundary doubles. No production tender records were added, changed, or deleted for testing.

## PDF capability: provisioned service required

The actual Firebase project is on Spark. Its Storage Console states that a billing account / Blaze upgrade is required; the configured bucket `syrian-energy-tenders.firebasestorage.app` does not exist (HTTP 404). No billing upgrade, bucket creation, rules deployment or CORS change has been performed.

`NEXT_PUBLIC_TENDER_FILE_UPLOADS_ENABLED` therefore defaults to false. The administrator sees a disabled file picker and a clear explanation. Tender saves and validated external PDF URLs remain usable. The save boundary also rejects a selected upload if Storage is unavailable, before any database write. Existing private attachment reads retain their authentication boundary.

After the owner decides to enable paid Firebase billing:

1. Provision Storage in the existing project, choosing its location deliberately.
2. Deploy `firebase/storage.rules`. These restrict reads and PDF writes to administrators and accept nonempty files up to 15 MiB inclusive. Review any cross-service Firestore permission prompt before enabling it.
3. Apply `firebase/storage.cors.json` to the real bucket, for example with `gcloud storage buckets update gs://syrian-energy-tenders.firebasestorage.app --cors-file=firebase/storage.cors.json`. The file allows browser GET only from the official tender origin. CORS grants no authorization; Storage rules still control access.
4. Verify an authenticated administrator upload/read, anonymous and nonadministrator denials, and the size boundary. Use an isolated test object and remove it through the owner console after verification.
5. Set the public upload flag to `true` in the intended Vercel environment and rebuild. Do not enable it merely because a bucket name is configured. Preview origins require a deliberate CORS decision and must not receive production service-account credentials.

No legacy download-token rotation or bulk document migration is included. External PDF links are kept unless an administrator explicitly edits them.

## Release checks

Required checks are clean install / audit, lint with zero warnings, type checking, unit tests, production build and Chromium tests. After the single main-branch release, verify its exact Git SHA on Vercel, public API availability, unauthenticated diagnostics rejection, Arabic/English navigation and account/subscribe controls on the official domain. Record the actual post-release results on the pull request so documentation-only verification does not trigger another production build.

The authenticated live administrator CRUD/upload flow remains unverified until a normal administrator login and provisioned Storage are available. Automated tests and read-only production checks do not substitute for that final service check.
