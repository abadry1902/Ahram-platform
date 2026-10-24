# Ahram Platform | منصة الأهرام

Bilingual (Arabic/English) public website and internal task management platform for Al Ahram Law Office.

## Phase 1 scope
- Public site: services, about, articles, contact, and curated government links.
- Supervisor dashboard: staff, task creation, assignment, workflow templates, review and approval, reports, content approval, import preview and validation.
- Employee dashboard: personal tasks, shared tasks, individual progress, comments, operational attachments, notifications.
- Separate content editor account; publishing requires supervisor approval.
- Arabic RTL and English LTR across public and private interfaces.

## Approved task rules
1. Only the general supervisor can create tasks.
2. Each assignee has independent progress and status.
3. Shared tasks have a designated task leader; only the leader or general supervisor can change overall task status/progress.
4. Shared-task participants see comments and progress for their shared task, but cannot access other tasks unless assigned to them.
5. Workflows contain subtasks and customizable stages by task type.
6. Employee completion enters supervisor review; closing outcomes are **completed (تامة)** and **expired (منقضية)**, separately.
7. Tasks can be paused (متوقفة) with a mandatory reason.
8. Date filters cover creation, due, and completion dates.
9. Uploads allow only non-sensitive operational attachments with server-side validation and access controls.
10. Imports support multiple file types with preview, validation and correction before committing.

## Proposed stack
Next.js App Router, TypeScript, Tailwind CSS, PostgreSQL via Supabase, Zod, and automated tests. Authorization must be enforced server-side and through database RLS, not only hidden UI controls.

## Delivery approach
Implement incrementally: foundation and design system; public pages; authentication/RBAC; task workflows; content management; import and notifications; testing and security review. No production case files or secrets should be committed to this public repository.

> This repository is currently being initialized. This document records the approved scope; it does not imply that features are already implemented.
