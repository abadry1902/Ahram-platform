# Release readiness — continuation on 2026-10-26

The user authorized completing the changes and publishing **after readiness is verified**. This supersedes the earlier lack of publishing authorization; it does not turn incomplete integration checks into passing checks.

## Current state verified read-only

- GitHub baseline: `289febee19dab9e042684239a38611058745990b`, branch `feature/task-analytics-audit-20261026`, open Draft PR #7 against `design/al-ahram-v4-review`.
- Sites: `appgprj_6adce2be34f4819197cddee7bdcdda41`, version 9, source `499b855d41f5c981ecd69b8ce1d92c6578c12e1b`. Source helper opened the existing clean checkout successfully. No Sites source files were changed or deployed in this continuation.
- Sites is currently **public** and `WORKSPACE_ENABLED=true`. Earlier documentation saying owner-private/workspace-disabled is historical.
- Supabase: dedicated AL AHRAM project `tfidmxlaugqcwskanmxk`, through the Masterframe 01 connection. Aggregate checks found 1 Auth user, 1 supervisor, 1 verified MFA factor, and 27 tasks. Do not treat it as an empty disposable environment.
- Nine existing remote migrations remain applied. `task_analytics` and `workspace_experience` are still unapplied. Both are now listed in migration-map.md.
- No Supabase test branches exist. No `.env.qa.local` or independent QA credentials were found in the project. Docker/Supabase CLI were not available on PATH.
- Sites environment contains the site URL, dedicated Supabase URL/public key, and workspace enable flag. It does **not** contain a service-role key, VAPID/dispatch configuration or a PDF renderer configuration. Secret values were not written into this report or source.
- Security advisors reported executable authenticated SECURITY DEFINER helpers/RPCs and disabled leaked-password protection. The RPC warnings require review of their deliberate authorization boundaries, not indiscriminate privilege revocation.

## Changes in this continuation

1. Corrected QA authentication: password login is followed by challenge/verification of an existing verified TOTP factor. The OTP is prompted without echo, is not persisted, and cannot be replaced by forged local claims. The final token must have `aal2`, the same user ID, a valid expiration, and pass GoTrue `/user` validation.
2. Explicitly reject the live project reference in synthetic QA configuration, even if someone sets the disposable-purpose flag incorrectly.
3. Added seven mocked authentication regressions, including missing/ambiguous factors, bad codes, failed verification, expired/swapped identities and GoTrue rejection. These test the runner; they do not prove a real login succeeded.
4. Added a real integration suite for individual completion, notification isolation, recoverable deletion, existing-session denial after disabling an employee, report/list/count agreement and push-queue denial. It requires isolated QA accounts and leaves clearly named synthetic tasks for audit. It was syntax-checked, **not executed against Supabase**.
5. Disabled invitation controls when server invitation configuration is missing, replaced raw/duplicate team errors with localized feedback, and distinguish successful invitation from ordinary save success.
6. Show PDF export as unavailable when Chromium is unconfigured instead of presenting a working download action.

## Checks run on the updated source

| Check | Result |
|---|---|
| QA helper/auth runner unit tests | 14 passed, mocked HTTP only |
| Smoke/public-content tests | 10 passed |
| PostgreSQL/RLS/analytics tests | 27 passed, PGlite and simulated claims |
| Analytics/Excel tests | 2 passed |
| Workspace render checks | 36 isolated views, 13 permission assertions passed |
| TypeScript | Passed |
| Next.js production build | Passed, existing lint warnings remain |
| New real workspace integration script | JavaScript syntax passed; real execution blocked on isolated environment/accounts |
| Browser Auth/MFA/save flows | Not run in this continuation |
| Sites/Vinext build for the new features | Not run; runtime reconciliation remains required |

Previously captured screenshots are not presented as new browser verification. No production schema or operational records were changed.

## Remaining release blockers

1. **Isolated integration environment.** Supabase quoted a new branch at `0.01344` per hour. The native tool requires explicit cost confirmation before creating it; no branch or charge was created. Use a schema-only test branch under the dedicated AL AHRAM project, without copying operational task records. Then provision fictitious users, enroll their test MFA factors, run all three integration suites, and test the actual browser save flows.
2. **Deployment runtime.** The development branch is Next.js/Node; Sites is Vinext/Cloudflare. The Node PDF route uses filesystem assets and a local Chromium process, and Web Push uses a Node library. Passing the Next.js build does not establish compatibility with Sites. Reconcile the runtime or choose an explicitly configured compatible hosting path before publication.
3. **Operational configuration.** Team invitation backend/SMTP, push delivery keys and scheduler, and production PDF renderer remain unconfigured/unverified. The availability UI does not mean these requested features are complete.
4. **Release verification.** Confirm backup/restore readiness for existing records, apply only the approved forward migrations after staging passes, deploy the matching application, and verify role flows against the published host. Preserve the current public audience and operational data.

## Integration commands once isolated QA is configured

Run interactively so each existing QA account can complete MFA. Do not put OTPs or TOTP seeds in command arguments, repository files or chat.

```bash
node --env-file=.env.qa.local scripts/qa/01_auth_rls_readonly.mjs
node --env-file=.env.qa.local scripts/qa/02_role_operations_mutating.mjs
node --env-file=.env.qa.local scripts/qa/03_workspace_operations_mutating.mjs
```

For the two mutating suites, `.env.qa.local` must declare `QA_MUTATION_CONFIRM=YES_DISPOSABLE_QA_ONLY`. All suites refuse the production project. The test account role checks run before application-record writes. The new suite attempts restoration in `finally` blocks for the task and employee it disables; inspect any failures and retain the printed synthetic fixture ID for follow-up.
