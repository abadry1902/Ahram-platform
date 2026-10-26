# Analytics review implementation — 26 October 2026

This branch is a review candidate, NOT production acceptance. No Site version was published and no live migration was applied.

## Baseline and reconciliation

- GitHub branch head verified through API: 73dc0d77b01c4e40f4ce92a2868fee0844a023d4 before edits.
- Sites remains version 9. Existing feature baseline retained. Next.js runtime and npm lockfile retained instead of copying Vinext/Cloudflare packaging.
- Sites workspace readiness and contact-form gates brought into Next.js. `WORKSPACE_ENABLED=true` is required after deployment readiness checks; enquiry submission remains unavailable pending CAPTCHA/rate limiting.
- Dedicated Supabase schema and nine migrations re-read without writes. Mapping is in migration-map.md.
- Existing brand PNG assets preserved exactly. `lib/brand-assets.json` still marks the original master as pending; this change does not falsely certify master-logo approval.

## Implemented

- Unified RLS-scoped task filters: literal title/UUID prefix search, status, priority, assignee, leader, beneficiary, task type, individual/shared, active/overdue, Cairo date ranges and presets, stable sort, server pagination and full counts.
- Open compact desktop filters, two-column small-screen layout, debounced search, removable URL chips, per-user favorites stored on this device, and return-to-filtered-list links.
- Dashboard KPI links with database aggregation instead of the first 100 tasks. Failure is shown as unavailable, not zero.
- Individual completion timestamps, reopen/completion/pause events and immutable deadline-change records. No fabricated historical completion. Frozen measurement deadlines prevent retrospective improvements.
- Supervisor reports: status/workload/priority/monthly closure/on-time charts, review queue with known waiting times, ended review/pause averages, team sort/search/selection comparison, member detail and recorded completion trend, previous-period task KPIs.
- Individual metric drill-downs reproduce assignment conditions within the selected task cohort. Office tasks and participant assignments remain distinct units.
- Seven-sheet Excel, neutralized text formula prefixes, typed dates/numbers, RTL, filters, snapshot metadata and audit/rate limit. Two-page A4 sample PDF with embedded Cairo, existing logo, repeated headers/footers and Arabic shaping. Node PDF endpoint fails clearly when Chromium is unconfigured.
- Local Cairo and Montserrat fonts, their OFL licenses, existing V4 tokens and reduced-motion support retained.

## What is not accepted yet

- Real Supabase Auth/MFA/PostgREST integration and authenticated browser E2E for supervisor/leader/two unrelated employees are NOT run. No test accounts or passwords were invented. Production is unchanged.
- Workspace browser captures render real React components with synthetic isolated fixtures and disconnected actions. They prove layout, not authorization or persistence. Public-page captures come from the local Next.js application.
- Saved filters are local to a browser and user ID; cross-device persistence is not implemented.
- No approved complexity model, leave/exception workflow or documented quality review exists. Composite score is deliberately deferred. Workload is an unweighted count.
- Individual completion duration and due completion ratio cover assignments created after tracking begins; historical start dates remain unknown. Personal pause duration includes recorded ended pauses only. Previous-period task KPIs and member count/duration columns are implemented; full comparison coverage still needs product acceptance.
- PDF runtime on Sites/Cloudflare is not configured; the renderer currently targets Node with sandbox-capable Chromium. Local sample rendering does not certify the production renderer.
- PDF definitions and headline operational charts are present; it is an executive report, not a full task-detail dump. Extended large-team pagination and deployed download flows need staging acceptance.
- The dataset benchmark is in-process PGlite, with tasks and minimal participants; not production network/concurrency or large shared-team load testing.
- Full route acceptance, keyboard interaction and all functional flows are still tracked in docs/acceptance-checklist.md. Build success is not a substitute.

## Run locally

```
npm ci
npm run test:smoke
npm run test:qa-harness
npm run test:db-security
npm run test:analytics
npm run test:ui
npm run typecheck
npm run build
npm run dev
```

`test:db-security` creates `.review/analytics/sample-snapshot.json` using only synthetic local PostgreSQL data; `test:analytics` validates and creates sample Excel files from that snapshot. `test:ui` renders isolated actual components to `.review/output` (never a public authentication bypass).

Browser review: set QA_CHROMIUM_PATH to a local isolated Chromium executable, create the baseline checkout from commit 73dc0d7 with the original renderer, set QA_BASELINE_DIR, and run `node scripts/review/analytics-browser.cjs`. This QA script explicitly uses a non-sandboxed browser only for isolated synthetic local HTML. The production PDF route requires a sandboxed browser.

## Artifacts

- `screenshots/`: actual rendered components and local public pages, named by route/language/breakpoint; `before-*` is the baseline commit.
- `browser-results.json`: fixture viewport/overflow observations.
- `public-browser-results.json`: local Next.js route observations when completed.
- `samples/`: synthetic Arabic/English Excel and PDF; never confidential records.
- `migration-map.md`: draft SQL scope and release order.
