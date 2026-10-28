> Current status: see [client demo 2026-10-28](client-demo-20261028.md). The NOT APPLIED statements below are historical; all three forward migrations are now applied to the dedicated project.

# Migration history mapping — read-only verification 2026-10-26

Target: `tfidmxlaugqcwskanmxk` only. No production SQL applied in this change.

| Local version | Applied remote version | Name |
|---|---|---|
|202610240001|20261025191501|initial|
|202610240002|20261025191514|attachments|
|202610240003|20261025191519|reminders_review|
|202610240004|20261025191524|personal_status|
|202610240005|20261025191528|template_creation|
|202610240006|20261025191532|review_feedback|
|20261025193510|20261025193635|require_workspace_mfa|
|20261025210845|20261025211518|checklist_progress_article_media|
|20261025222526|20261025223021|task_beneficiaries|
|20261026074406|NOT APPLIED|task_analytics|
|20261026140337|NOT APPLIED|workspace_experience|

Both unapplied entries were rechecked against the dedicated live project's migration history on 2026-10-26 during release preparation. The live project contains operational tasks and must not be used for synthetic integration fixtures.

Do not run a blind `db push`: existing remote versions differ from filenames.
Review the new migration as a single forward-only change, back up, and apply only after approval. Do not edit previously applied migrations or rerun them.

## Security review

- Query functions use SECURITY INVOKER and existing caller task/MFA RLS. No service role is used in application queries.
- Team analytics and exports require supervisor authorization at the database boundary, as well as the server page/route.
- New event/history tables have RLS and SELECT-only grants, scoped to supervisor or members of the same task.
- Trigger functions use an empty search path, qualified tables, and no client EXECUTE grant. Their sole purpose is trusted provenance writes; callers cannot set timestamps or overwrite the baseline deadline.
- `report_export_v1` is intentionally SECURITY DEFINER to append a trusted audit record and enforce a per-user transaction-locked limit (5 snapshots / 10 minutes). It checks non-null auth.uid and MFA-backed is_supervisor before data access. It exports a fixed set of non-confidential fields, max 10,000 tasks, without notes or descriptions. It cannot be used by employees or anonymous callers.
- The migration is transactional. The provenance snapshot temporarily suppresses user assignment triggers under an exclusive table lock, restores each exact previous enabled mode, and changes only new provenance columns. It does not recompute historical progress or fabricate completion events.
- Historical completion dates are not inferred. Current open assignment deadlines are snapshotted. Later edits cannot improve the baseline retroactively. Existing closed assignments remain unknown.
- Audit event means snapshot requested, not that a file was successfully delivered. Failed rendering still consumes a rate-limit slot.
- Local PostgreSQL tests exercise actual RLS/functions/triggers. They do not validate real JWT/GoTrue/PostgREST behavior.

## Release order (not executed)

1. Approve SQL and data definitions; confirm backup/restore and the current schema diff.
2. Reconcile migration-history identifiers deliberately.
3. Apply the reviewed migration to an isolated Supabase staging project and run real Auth/MFA/REST role tests.
4. Configure the Node PDF renderer (sandbox-capable Chromium) or choose a compatible remote rendering service for Cloudflare. Do not copy the Node PDF route into the Sites adapter unmodified.
5. Confirm WORKSPACE_ENABLED and hosting environment readiness; deploy to staging and run all authenticated E2E.
6. Only after review and explicit production approval: apply to live and release the corresponding frontend together.
