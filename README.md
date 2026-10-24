# الأهرام | AL AHRAM Legal Consultancy Platform

Next.js + TypeScript bilingual law-office website and role-controlled internal task workspace.

**Status: development foundation and functioning application routes committed. Not deployed, not connected to a production database, and not security-certified.**

## What's included

### Public website (Arabic / English)
- Home, firm introduction, legal services, consultation enquiry form.
- Searchable legal articles, detail pages, related reading and general-information disclaimer.
- Searchable and categorized official resources directory.
- Responsive layout inspired by supplied blue/orange geometric Al Ahram brand identity.
- Editorial article management: drafts → supervisor review → publication.

### Internal workspace
- Supabase email/password authentication, invite-only staff onboarding (server-side service credential required).
- Role separation: supervisor, employee, content editor.
- Task creation by supervisor; multiple assignees; one leader for global state/progress.
- Independent employee progress and personal status, including paused reason.
- Shared progress and notes visible only to participants of that shared task and supervisor (RLS).
- Overall states: new, in progress, paused (reason), awaiting review, **done** and **expired** as distinct closure outcomes. Only supervisor can approve final closure.
- Task history, task checklists and reusable template stages.
- Search/filter on status, priority, and creation/due/closure dates.
- In-app notifications and scheduled-due-reminder SQL routine (cron must be configured).
- Private, short-lived signed download links for **non-sensitive operational attachments only**.
- Private calendar ICS export without case descriptions; no Google/Apple live sync yet.
- XLSX, CSV and DOCX import with human preview, assignee matching and validation; commits each valid row individually (not atomic).
- Supervisor article publishing and verified-link directory admin.

## Run locally

1. `npm install`
2. Copy `.env.example` to `.env.local`.
3. Create a **new dedicated Supabase project**; set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and server-only `SUPABASE_SERVICE_ROLE_KEY`.
4. Run SQL migrations in order under `supabase/migrations/` using the Supabase SQL Editor.
5. Create a staff user in Supabase Auth, then elevate its **known UUID** in SQL: `update public.profiles set role='supervisor' where id='<AUTH_USER_UUID>';` (verify the correct account first).
6. Disable public self-registration for staff and configure SMTP/invitation links.
7. Start with `npm run dev`. Website: `http://localhost:3000/ar`; staff: `http://localhost:3000/login`.
8. Check with `npm run test:smoke`, `npm run typecheck`, and `npm run build`.

The site renders fallback editorial examples without a database, but **staff pages require working authentication and RLS**. There are no shared demo credentials.

## Security and launch blockers

This is **not yet safe for privileged legal case files or client case records**. Sensitive case-file management is outside the first phase. Before real office use, implement and verify CAPTCHA/rate limits on the contact route, malware scanning for operational attachments, MFA, privacy policy/retention process, RLS integration tests, backup/restore, and monitoring. External calendars/push/email require separate integration credentials and appropriate consent. Do not upload case-specific content into external calendars.

**Never commit secrets, client personal data or case documents to this repository.** The repo may be public.

See [Acceptance checklist](docs/acceptance-checklist.md) for authorization, UX and deployment tests.

## Stack
- Next.js App Router, React, TypeScript, CSS with Arabic Cairo / English Montserrat.
- Supabase PostgreSQL + Auth + RLS + private Storage.
- Zod validation; ExcelJS and Mammoth for imports; Lucide icons.
- GitHub Actions workflow for automated install, typecheck and build.
