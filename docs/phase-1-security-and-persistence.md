# Tenders maintenance — phase 1

## Four phases

1. Security, reliable saves and consistent tender statuses (this change).
2. Navigation, header/footer and visual consistency with the main platform.
3. Dependency maintenance, effective linting and broader regression coverage.
4. Final integration checks, deployment and verification of production configuration.

## Changes in this phase

- Both diagnostic GET and import POST require the existing `x-syrian-renewables-sync-secret` credential. Its value remains server-side; it must never be embedded in the admin frontend or a URL. Unauthenticated requests do not read or write Firestore diagnostics. No new secret or account permission is required.
- Diagnostic events replace the last event instead of merging unrelated historical fields. JSON request bodies are bounded at 1 MiB, including chunked bodies.
- JSON-LD escapes `<` before insertion into HTML. Unknown stored statuses are normalized to a safe `unknown` state before entering Leaflet marker HTML. The public serializer remains a whitelist and continues to omit sources, attachments, notes and new administrative metadata.
- The editor validates required fields, calendar dates/order, coordinate pairs and HTTP(S) links before storage/database writes.
- A draft reserves one document ID and one upload path. Files upload before a new record is committed. A failed upload creates no public record; retrying the same open form reuses its ID/path. A successful upload is reused after a database failure. A transaction preserves `created_at` if acknowledgment was lost after a successful creation. Reloading/discarding the editor ends its in-memory retry context; check the list before starting a new record after an uncertain result.
- Edits explicitly delete cleared optional fields. A transaction rejects stale edits rather than overwriting a newer administrator/import update. New private metadata: `save_operation_id`, `created_by_uid`, `updated_by_uid`, `status_origin`.
- New PDF uploads store a private `pdf_storage_path`, not a reusable download URL. Administrators read these through authenticated Firebase Storage. Existing `pdf_url` values are preserved unless intentionally cleared/replaced; no legacy token rotation or bulk migration is performed.
- PDF uploads require a nonempty PDF signature and a maximum size of **15 MiB, inclusive**, matching the updated Storage rule. Existing Storage admin-only access is retained.
- Cards, details, public filters/API, map and admin statistics use the same effective status. Open pages refresh derived status every 30 seconds and on window focus.
- Import updates preserve awarded/cancelled tenders and explicitly manual statuses. Read/modify/write reconciliation is transactional so a concurrent admin decision is not overwritten.

## Date interpretation

The existing editor records a **date**, not a documented closing hour. New date inputs carry `deadline_precision: date` and remain open through that calendar day in `Asia/Damascus`, expiring at the following local midnight. This is a display convention for date-only records, not a claim about an official submission time. Explicit source timestamps carry `deadline_precision: datetime` and expire at the actual instant.

For compatibility, unmarked legacy deadlines stored at exactly midnight UTC are interpreted as calendar dates, matching the old date-input encoding. Unchanged, explicitly timed deadlines are preserved during unrelated edits. No database migration is run. An explicitly timed legacy midnight deadline needs its precision marked `datetime` to override the compatibility interpretation.

## Validation

Run `npm run test:unit`, `npm run typecheck`, and `npm run build`. The unit suite exercises the actual source against isolated cloud-boundary doubles: upload and commit failures, lost acknowledgment, stale edits, field removal, file validation, authorization, import reconciliation, JSON-LD, private-field serialization and deadline boundaries. It does not contact production Firebase or write production tender records. CI runs this suite before build/browser checks.

The existing ESLint configuration is ineffective for TSX; fixing the general lint/dependency setup belongs to phase 3. A passing existing lint command is not presented as evidence of TSX coverage.

## Production checks reserved for phase 4

- Deploy the app and `firebase/storage.rules` together. The previous committed rule rejected files at/above 15 MiB; the updated rule accepts exactly 15 MiB. Do not raise the frontend limit beyond the deployed rule.
- Confirm the actual deployed Firestore/Storage rules, administrator membership, required composite indexes if any, and the existing webhook credential.
- Verify authenticated `getBlob` reads and bucket CORS for the official tender origin. Storage SDK direct downloads require the bucket's CORS configuration. Do not make files public to resolve CORS errors.
- Review/revoke legacy token URLs only through a separate, deliberate migration with recovery; do not assert that historical download tokens have been revoked by this code change.
- Exercise admin create/edit and upload in a non-production Firebase environment, then verify the final deployment with guest, member and administrator sessions. Check expired filters/details and an import refresh of a cancelled/awarded record.
- Failed/cancelled saves can leave private uploaded objects without a tender reference; no automatic destructive cleanup is introduced. Consider a separate retention-aware cleanup later.

No navigation redesign, library upgrades, production data migration, secret rotation or deployment is included in this phase.
