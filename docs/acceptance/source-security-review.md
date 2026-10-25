# Source security review — 2026-10-25

**NOT a live database audit, exploit confirmation, or production approval.** Reviewed the six migrations at the PR #6 base `271c61f0e836c0df6941c0d41beec1a9a68dea22`. No SQL has been run and no database has been changed. Existing auth/API/actions/migrations remain unchanged in this review update.

## Migration inventory

| File | SHA-256 | Status |
|---|---|---|
| `202610240001_initial.sql` | `cd5e06d760a957106aa08fdf3ff70ca87ce54a18cf77013c1b3bcab9e87cb418` | Reviewed as source; not applied |
| `202610240002_attachments.sql` | `aa57b453dd14c9dddef139ebedd43f919513e93de4c4707da742b5173e62eb69` | Reviewed as source; not applied |
| `202610240003_reminders_review.sql` | `84ee079db0ee0c91bd0496248cc809a7f73bb835b472b4478eae56b89cc6faae` | Reviewed as source; not applied |
| `202610240004_personal_status.sql` | `6b9d2812747e41eff7aa6a858775c5c4f194fe550f6f195b62783798cfd0dafd` | Reviewed as source; not applied |
| `202610240005_template_creation.sql` | `bf42a0fd25c960166efbfc9b993efba4649161165839da69e27bbc376a508f29` | Reviewed as source; not applied |
| `202610240006_review_feedback.sql` | `db9277a4b10f5c782ff785d6ebcbd00ff7646261b8fdc966697587a4e63d122f` | Reviewed as source; not applied |

## Findings requiring resolution before SQL / production acceptance

1. **High, conditional on deployed function grants:** `set_task_status_secure` and `set_overall_progress_secure` do not explicitly reject `auth.uid() IS NULL`. For a task with `leader_id IS NULL`, `leader_id IS DISTINCT FROM auth.uid()` is false for an anonymous caller. The source revokes `PUBLIC` execution on these RPCs but does not explicitly revoke `anon`; actual default/explicit grants must be audited. If `anon` has a direct EXECUTE grant, the null-leader guard is insufficient. Require an explicit authenticated UID check and explicit least-privilege grants, then test anonymous calls against a known leaderless task. This is a source-level conditional finding, not a demonstrated live exploit.
2. **Medium, closure scope:** task status/progress and assignee updates lock closed tasks, but `task_notes`, `step_completions` and attachment insert policies do not check the parent closure state. Current server-action checks must not be treated as a PostgREST boundary. Decide whether post-closure append/checklist writes are intended; the existing phrase “closed task read-only” suggests they should be denied. Add direct API cases before sign-off.
3. **Medium, attachment integrity:** attachment metadata insert checks membership/uploader but does not bind `storage_path` to `task_id` and `uploader_id`. Storage object RLS independently checks the path and should prevent cross-task downloads for an ordinary caller, so this is not by itself proof of a download leak. Enforce the metadata/path relationship and test cross-task metadata, object upload/read and signed URLs.
4. **Execution surface:** policy helpers and trigger functions retain default EXECUTE unless their actual ACL says otherwise. Trigger-returning functions cannot simply be used as ordinary RPCs, so default execute alone is not an exploit. Review each function's need, schema, `search_path` and grants; review CREATE privileges on `public` because the functions use `public,pg_temp`. Preserve public published-article/link policy dependencies when reducing helper privileges.
5. **Public enquiries:** direct anonymous INSERT is allowed by schema. CAPTCHA/rate limiting only in a website form would not protect direct PostgREST insertion. The eventual design must enforce the chosen controls at the reachable backend boundary.
6. **Operational gates:** malware scanning, MFA, trusted invitations/SMTP, throttling, CAPTCHA, backup/restore, monitoring and retention still require real configuration/evidence. No sensitive legal case files are suitable for Phase 1.

## What was corrected in the supplied QA harness

- 404/500, generic 401/403, invalid JWTs, missing tables/RPCs and schema validation failures can no longer produce a false authorization PASS. Recognized RLS/guard responses and zero-row filtering are checked explicitly.
- Positive checks require actual rows; fixture-dependent groups report BLOCKED when setup fails.
- Legacy service-role JWTs and new secret keys are rejected. Four distinct Auth identities and expected profile roles are verified before writes. Redirects are rejected.
- Dedicated QA purpose, exact project host and explicit write opt-in are required. These declarations do not prove an environment is disposable; owner approval remains mandatory.
- Anonymous draft/link checks use targeted filters rather than sampling the first 100 public rows.
- The misleading “A cannot see B profile” case was renamed: it only reads A's own profile. Cross-user fixture isolation remains part of real integration testing.
- “Read-only” means no business-record writes; real sign-in still creates Auth sessions/audit events.

## Evidence boundaries

Local helper tests validate the test harness only. They do not prove Supabase behavior. No integration test is marked PASS. The supplied test matrix remains PENDING; the complete acceptance checklist is still required. No new migration is proposed as tested, generated or applied.

Relevant primary documentation reviewed: [Database functions](https://supabase.com/docs/guides/database/functions), [Row level security](https://supabase.com/docs/guides/database/postgres/row-level-security), and the Supabase changelog (2026-10-25).
