# AL AHRAM analytics: Phase 0 audit — 26 October 2026

Status: read-only source/schema audit completed; implementation and remote Codex task not started. No production publication or database changes authorized by this handoff before review. The full user brief is in request.md.

## Verified source baseline

- Sites project appgprj_6adce2be34f4819197cddee7bdcdda41, version 9, source 499b855d41f5c981ecd69b8ce1d92c6578c12e1b. Retrieved current Site and saved-version provenance; local tracked checkout matches this commit and is clean.
- GitHub main: e326c25227f3c1dfc08379e5c264e13b61a2795d.
- GitHub design/al-ahram-v4-review: b5ed2d90f64688c11ebdc5d861598eec7ae94cd9. Remote refs verified. This contains the current task/client features; starting from main alone would lose them.
- New working branch: feature/task-analytics-audit-20261026, based on b5ed2d9.
- Common tracked files were compared byte-for-byte. Current task features, client controls, CSS and migration files match. Thirteen common paths differ: .env.example, .gitignore, README.md, app/[locale]/contact/page.tsx, app/actions/auth.ts, app/actions/contact.ts, app/login/page.tsx, app/robots.ts, app/sitemap.ts, eslint.config.mjs, lib/auth.ts, package.json, tsconfig.json.
- Sites has Vinext/Cloudflare packaging, pnpm lockfile and lib/readiness.ts. GitHub has Next.js/npm packaging and CI. Preserve both runtime contracts; do not copy configuration wholesale.
- Auth/contact diffs inspected: Sites applies WORKSPACE_ENABLED and enquiry availability gates; GitHub lacks those gates. Reconcile deliberately before any deployment. Public form readiness must reflect actual submission capability.

Source of truth: Sites v9 for deployed behavior, the review branch for the Next.js development baseline, and the live dedicated Supabase schema for existing data. None should overwrite the others without a semantic merge.

## Database findings

Dedicated project: tfidmxlaugqcwskanmxk, Masterframe 01 connection. No unrelated database accessed.

Verified columns: tasks.client_id and clients(id,name,created_by,created_at) exist. task_assignments has progress, updated_at, status and pause_reason, but no completed_at or individual deadline. task_status_history has status transitions with changed_at; task_activity has action/payload/created_at.

Verified policies include MFA restrictions, supervisor client creation, clients limited to related tasks, task-member reads and own-assignment updates. This is inspection, not a fresh full Auth/RLS integration test.

Nine applied migrations were listed: initial, attachments, reminders_review, personal_status, template_creation, review_feedback, require_workspace_mfa, checklist_progress_article_media, task_beneficiaries. Remote migration version timestamps differ from local filenames because deployment used the management API. Reconcile history mapping before CLI pushes; never reapply them blindly or edit applied SQL.

Dashboard reads at most 100 tasks; reports read at most 1000 tasks and 2000 assignments. Existing UI counts therefore cannot serve as authoritative analytics at scale. Task management also uses a bounded list and needs server-side filtering/count/pagination.

Historical completion, deadline revisions and pause intervals cannot be reliably inferred from current row state. Unknown history must stay unknown. Existing status history can support measured review intervals where transitions exist, with missing history flagged.

## Execution sequence and decisions

1. Synchronize application behavior on the feature branch while preserving hosting adapters. Add a migration history map and reconcile readiness gates without enabling unavailable services.
2. Build one typed filter contract and PostgreSQL-backed query layer under caller RLS. Include task UUID/prefix/title search, assignment/leader/client filters, independent date bases, overdue, status, shared count, sort and cursor/page navigation. Desktop filters open by default; URL state, removable chips and per-user saved filters. Preserve inline own-step saves and return navigation.
3. Use the same counting contract for dashboard links, reports and exports. Count distinct tasks at office level and assignments at member level. Every KPI drill-down reproduces its denominator and date basis.
4. Draft forward-only migrations for trustworthy individual completion timestamps/events, immutable deadline history, pause intervals, saved report settings and export audit. New tracking starts from deployment, never fabricated historical dates. Test locally before requesting live application. Completion must follow actual step completion/manual completion behavior; reopen events must be retained.
5. Define Africa/Cairo boundaries and retain UTC instants. Employee on-time denominator is eligible individually completed assignments in the period; compare against the applicable preserved deadline. Missing deadlines/history are excluded and counted explicitly. No retroactive deadline edits to improve scores. Approved pause/leave exceptions require explicit policy; initially report raw elapsed time and show exceptions separately. No complexity weights without approval, no quality score without documented human review. Defer the composite score until defensible inputs exist.
6. Implement reports, team/member detail, workload and operational attention views. Monthly/weekly trends, period comparisons and charts must expose definitions, empty states and drill-downs. Team-wide analytics are supervisor-only; employee views retain own-task access.
7. Server-side ExcelJS export using the same snapshot/filter/query contract, seven sheets, typed values, formula-injection protection, bounded batching and audit records. Build a true paginated A4 PDF with embedded Arabic-capable fonts and approved logo; validate RTL shaping and output rendering. Assess PDF renderer compatibility with the actual target runtime before selecting dependencies. Do not claim browser print or a long screenshot is equivalent.
8. Validate unit math, RLS/Auth integration, all roles, browser E2E, three breakpoints/two languages, artifact content and numeric equality across UI/Excel/PDF. Benchmark 100/1000/10000 synthetic tasks in an isolated database. Deliver draft PR, files/migrations list, screenshots, sample reports and measured results. Do not deploy to production without explicit approval.

## Current blockers and verification limits

Codex Tasks list_environments returned an empty data array on 26 October 2026. No remote task was created, and no task ID exists. A connected registered Codex environment and its real repository cwd are required to transfer execution. Never substitute the scratch container path for an unknown remote path.

This turn only inspected source and schema and saved this audit. No new tests or performance benchmarks ran. Previous CI/build results do not prove Supabase integration. Full production authenticated browser acceptance remains outstanding. No new SQL was applied and no Site version was published.
