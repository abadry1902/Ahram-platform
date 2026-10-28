# Workspace and public experience addendum — 2026-10-26

Review-only changes on `feature/task-analytics-audit-20261026`. No publication or live migration.

## Implemented

- Fixed bottom-left contact button on all layouts; WhatsApp destination intentionally blank. Footer social buttons explicitly unavailable until destinations are supplied.
- Compact image/title service and article cards using existing V4 artwork. Existing logo assets remain unchanged; master-source approval status in `lib/brand-assets.json` remains unchanged.
- Supervisor service covers and government-link covers, with HTTPS URL or re-encoded JPEG upload through the existing public editorial cover bucket. These are public marketing images, never case attachments.
- Seven-stone build/fade loading indicator, form pending states and dismissible bilingual result feedback with safe reason codes. Reduced-motion preference respected.
- Dashboard cards link to database-backed task filters. No-stage checkbox completes only the caller's assignment; shared progress is the average and supervisor closure remains separate.
- Low / Medium / High / Critical labels; stored `urgent` value retained for compatibility with imports and historical records.
- Supervisor-only recoverable task deletion, immutable history and restore from archive. Removed tasks excluded from analytics, dashboard and calendar.
- Invite, promote/demote, disable and restore team accounts; self-role changes and self-disable blocked. Database checks immediately revoke disabled users' existing sessions. Changes logged, no physical record deletion.
- Editable import preview including title, description, assignees, priority and due date; add/remove rows before approval. Partial failures retain failed rows for correction.
- Personal notification badge polls while the app is visible; assignment/activity/note notifications are database scoped. A notification-only service worker, opt-in/out, authenticated token storage and a retrying push outbox/dispatcher are implemented. Lock-screen content is generic, without task titles or client names.
- Reports measure operational volume, individual completion, deadline adherence and delays. No subjective quality score or composite employee ranking.

## Migration for approval

`20261026140337_workspace_experience.sql` follows `20261026074406_task_analytics.sql`. Neither was applied to the live database. Audit in an isolated Supabase environment before approval; database test harness runs the entire ordered migration chain.

New tables: service_media, team_account_events, push_subscriptions, push_outbox. Each has RLS. Mutating definer RPCs explicitly validate active MFA users / supervisor role; queue claiming is service-role only. Historical records are retained.

## External setup still required

1. Approved staging migration and real Auth/MFA test accounts in the AL AHRAM project only (`tfidmxlaugqcwskanmxk`). No EgyToys use.
2. Web Push: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, server-only `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (valid contact), `PUSH_CRON_SECRET`, existing server-only Supabase service role. Configure an authenticated scheduler to POST `/api/push/dispatch` with Bearer cron secret, ideally every minute. Dispatcher rejects a Supabase hostname other than the dedicated project. No secrets committed or generated delivery claimed.
3. HTTPS and explicit user permission. Device/browser install requirements vary. Real iOS/Android delivery has not been tested. UI does not request permission until service configuration is present.
4. Supply and verify WhatsApp number and social destinations. Supply public cover images as desired.
5. PDF export requires configured Node Chromium host, as documented in implementation.md; the Sites runtime is not assumed compatible.

## Verification and limits

27 local PostgreSQL tests pass, including own assignment completion, recoverable deletion, session revocation, personal notification scope and push queue denial. These simulate Supabase auth claims; they are not real GoTrue/JWT/PostgREST integration tests.

10 smoke/public-content tests and 2 analytics/Excel tests pass. 36 isolated workspace component renders and 13 UI role assertions pass. Browser captures cover 108 workspace layout cases and 42 real local Next.js public page cases at desktop/tablet/mobile in Arabic/English; no document overflow. The workspace captures use synthetic fixtures with actions disconnected, clearly labeled in screenshots/README.md. They do not establish successful authenticated save flows.

No actual emails, push notifications, live database changes or production publication were performed. This is a review candidate, not final production acceptance.
