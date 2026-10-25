# Source security review — 2026-10-25

**NOT production approval or a completed live Auth/RLS integration test.** The six migrations have now been hardened locally after read-only inspection of the dedicated project's empty application schema and default grants. No remote DDL, business-record writes, Auth account creation or runtime configuration changes have been made. Existing server actions and Auth flows are unchanged.

The existing six files were edited because the dedicated project's migration history is empty and the application has never been configured against it. Apply this reviewed sequence only to a new, approved environment. Do not replay edited historical migrations on an already migrated database; generate a forward migration in that case.

## Migration inventory

| File | SHA-256 | Status |
|---|---|---|
| `202610240001_initial.sql` | `dd180be40001d2086fbc4fbf01d561a96d6c5b244a97d0008eca4ec7a1b6cece` | Local PostgreSQL tests passed; not applied remotely |
| `202610240002_attachments.sql` | `fc6df8e63f57f99b922ab60f2c7ac2f54f66714e28ac8b9b2291b925f45049c7` | Local PostgreSQL tests passed; not applied remotely |
| `202610240003_reminders_review.sql` | `f878f97bc53264c223c9e81193a35cc42b254e08ce4e3ddc576af34f0c3650c4` | Local PostgreSQL tests passed; not applied remotely |
| `202610240004_personal_status.sql` | `7d7e9231a7c045b8e3ddd0f799a8ed8902a6ecf61d5285884d457e03e42d344f` | Local PostgreSQL tests passed; not applied remotely |
| `202610240005_template_creation.sql` | `bb99f0b9a548a7124b0ecda4b10c9799d928322b55d16ec823f62192146ef59c` | Local PostgreSQL tests passed; not applied remotely |
| `202610240006_review_feedback.sql` | `7bbeada8217515bc271905ed3d5fab58af7e4db09bdfa6268fab0f44e86d7f99` | Local PostgreSQL tests passed; not applied remotely |

## Findings requiring resolution before SQL / production acceptance

1. **Resolved locally; remote validation pending:** explicit `auth.uid() IS NULL` rejection now precedes task access in every version of the status/progress RPCs. RPCs revoke both `PUBLIC` and direct `anon` grants and regrant authenticated access deliberately. Default function privileges deny automatic client execution. A local regression test recreates the dedicated project's broad direct default grants and verifies both ACL denial and the UID guard against leaderless tasks, including an intentionally mistaken temporary grant inside the disposable local engine.
2. **Medium, closure scope:** task status/progress and assignee updates lock closed tasks, but `task_notes`, `step_completions` and attachment insert policies do not check the parent closure state. Current server-action checks must not be treated as a PostgREST boundary. Decide whether post-closure append/checklist writes are intended; the existing phrase “closed task read-only” suggests they should be denied. Add direct API cases before sign-off.
3. **Medium, attachment integrity:** attachment metadata insert checks membership/uploader but does not bind `storage_path` to `task_id` and `uploader_id`. Storage object RLS independently checks the path and should prevent cross-task downloads for an ordinary caller, so this is not by itself proof of a download leak. Enforce the metadata/path relationship and test cross-task metadata, object upload/read and signed URLs.
4. **Application execution surface hardened locally:** all application functions use an empty `search_path` and qualified relations; trigger-only functions have no client EXECUTE permission; RLS helpers are authenticated-only; the attachment path parser is now `SECURITY INVOKER`. Anonymous publication policies are separate, so reading published articles/links no longer requires anonymous helper execution. Schema CREATE is denied to client roles. Remote advisors still need re-running after approved migration. The pre-existing platform event-trigger function `rls_auto_enable()` was observed with broad grants; it returns `event_trigger`, so the advisor warning is not proof of an ordinary callable RPC. It was not modified.
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

`npm run test:db-security` runs 11 behavioral tests against local PostgreSQL (PGlite 0.5.10), applying all six migration files in order. Its `auth.users`, `auth.uid()` and Storage schema are minimal test fixtures. It verifies database grants, RLS, role separation, independent progress, review/closure transitions, audit trigger execution and public publication access. It does not verify real Supabase Auth, token validation, PostgREST, Storage APIs, SMTP, MFA, concurrent sessions or deployment configuration.

The seven helper tests validate the REST test harness only. No remote integration test is marked PASS. The supplied test matrix remains PENDING and unresolved findings above remain release blockers. No migration was applied remotely.

Relevant primary documentation reviewed: [Database functions](https://supabase.com/docs/guides/database/functions), [Row level security](https://supabase.com/docs/guides/database/postgres/row-level-security), and the Supabase changelog (2026-10-25).
