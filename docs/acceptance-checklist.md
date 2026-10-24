# Al Ahram — Phase 1 acceptance checks

These manual tests require a dedicated Supabase project and three separate users (supervisor, employee A, employee B). They are NOT evidence that tests have already passed.

## Authorization
- [ ] Unauthenticated visitor is redirected from /app to /login.
- [ ] Supervisor can create a task with A only; B cannot query its id via API, task list, notes, attachments, or calendar feed.
- [ ] Supervisor creates shared task with A and B; both see each other's independent progress and notes only for that task.
- [ ] Employee A cannot create tasks by direct PostgREST or RPC calls.
- [ ] Non-leader cannot call set_task_status_secure or set_overall_progress_secure, including direct RPC.
- [ ] Leader can change overall state/progress until awaiting_review, but cannot mark task done or expired.
- [ ] Supervisor can approve done only from awaiting_review.
- [ ] Supervisor can set expired with mandatory reason and pause with mandatory reason.
- [ ] Individual pauses require reason and do not pause overall task.
- [ ] The two final states remain separately filterable and read-only.
- [ ] Direct SQL/PostgREST attempts to alter task assignment identity are rejected.
- [ ] Content editor cannot publish article by directly setting status='published'.
- [ ] Public visitor sees only published articles and links.

## Experience
- [ ] Full keyboard access, visible focus, 320px mobile layout, logical Arabic RTL and English LTR.
- [ ] Task filters: title, status, creation, due, closure date.
- [ ] Task details, stage checklist, team notes, history, review.
- [ ] XLSX and CSV previews map fields, check dates/assignees, reject duplicates. DOCX import is explicitly reviewed before commit.
- [ ] Invalid uploads, oversized files and nonparticipants cannot access task attachments.
- [ ] Contact form requires CAPTCHA and rate limiting prior to public launch.
- [ ] Scheduled reminders via trusted cron have been enabled and verified.
- [ ] Calendar ICS remains private and contains NO case details.
- [ ] Real business wording, link accuracy, privacy policy and final logo are signed off by the office.

## Deployment gates
- [ ] Environment variables are configured ONLY in hosting secrets.
- [ ] Supabase RLS policies are penetration-tested using real accounts and REST APIs.
- [ ] Auth MFA, invite throttling and email deliverability configured.
- [ ] Private attachment antivirus/content scanning integrated; no sensitive case files in phase one.
- [ ] Production monitoring, backup restore rehearsal, and retention policy complete.
