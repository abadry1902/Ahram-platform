# Verification results — review branch

Latest continuation and current deployment blockers: [release-readiness-20261026.md](release-readiness-20261026.md). The QA runner now has 14 passing unit tests and a real MFA challenge flow; real integration execution remains pending.

No live database writes or Site publication occurred.

| Check | Result | Limits |
|---|---|---|
| npm ci | Passed | Existing dependency deprecation warnings |
| Smoke/public-content tests | 10 passed | Includes published-content recommendation rules |
| QA assertion harness | 7 passed | Validates denial/positive-check semantics |
| PostgreSQL RLS, triggers, analytics, lifecycle and notifications | 27 passed | PGlite with simulated Supabase auth/storage schemas; not JWT/REST integration |
| Analytics filters / Excel | 2 passed | Cairo boundary validation, exact numbers, typed dates, formula neutralization, RTL |
| Workspace render | 36 views / 13 permission assertions passed | Isolated actual React components, synthetic fixtures, disconnected actions |
| Workspace browser layout | 108 viewport cases, no document overflow | 1440, 768, 390px; ar/en; no authenticated save flows |
| Local Next.js public browser | 42 page/viewport cases, HTTP 200, no overflow | Seven public routes × two languages × three sizes |
| Anonymous workspace navigation | Redirected to login | Does not prove authenticated role flows |
| TypeScript | Passed | Rechecked after source changes |
| Next.js production build | Passed | Existing lint warnings; see CI for final remote status |
| Arabic/English PDF | A4, 2 pages each; Cairo embedded | Arabic page visually inspected; production Chromium configuration pending |
| Production Auth/MFA/REST E2E | Not run | Needs staging accounts and separate real integration setup |
| Production download route | Not run | PDF host runtime unconfigured; migration intentionally unapplied |

## Measured local benchmark

`[{"tasks":100,"ms":18.99},{"tasks":1000,"ms":93.34},{"tasks":10000,"ms":441.83}]`

Single process, synthetic tasks, minimal participant fan-out. Includes filtered page plus exact aggregate. These are not production throughput, concurrency or network timings.

## Failures found and corrected during development

- SQL comparison syntax and a TypeScript union constraint were corrected before passing checks.
- Fixed fixture expectations after adding historical-data regression rows.
- Concurrent Next dev/build processes caused transient generated-chunk failures; reran sequentially. This was a test-environment race, not accepted as a passing application run.
- Browser CDN archives were invalid in this runtime. Local QA used an isolated Chromium package extracted from npm; no production renderer settings were changed.
- Automatic review rejected Supabase CLI telemetry; no telemetry retry was attempted. The migration file had already been created. Other installation/testing continued independently.
- Automatic review rejected deletion of generated Next cache; it was preserved under a temporary name instead.

## Acceptance still required

Use docs/acceptance-checklist.md with real staging Auth/MFA users. Validate employee A/B isolation through PostgREST and every save/download flow, large shared-team load, keyboard interactions, PDF production hosting, and final brand-master approval. Do not infer these passed from local SQL, HTML renders, screenshots or CI.
