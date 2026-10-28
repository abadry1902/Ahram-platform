# Client demo on the original project — 2026-10-28

The owner explicitly requested using the original project for client demonstration and feature testing, not a final production release. No paid Supabase branch was created.

## Applied state

- GitHub main includes V4 and task analytics/workspace improvements.
- Original Sites project: appgprj_6adce2be34f4819197cddee7bdcdda41. Access changed from public to owner-only custom; no external viewers invited.
- Dedicated database only: tfidmxlaugqcwskanmxk. Forward migrations task_analytics (20261028124023), workspace_experience (20261028124038), explicit_workspace_grants (20261028124322) applied.
- Existing 27 tasks and 27 assignments retained. Hash of original task columns matched before/after the two feature migrations: 97dc468ce8c95a453c5ef94fc0373b62.
- PDF route now returns a protected printable report with native Arabic rendering. The user selects Print / Save PDF, then Save as PDF in the browser dialog. It is not an automatic PDF binary download. Excel remains a direct download. Report content is not sent to an external rendering service.
- Sites package pins lucide-react 0.468.0 to retain the existing social icons. Push configuration response typing fixed for the Worker type environment.
- New explicit table grants remove default TRUNCATE/TRIGGER/REFERENCES access on service_media, push_subscriptions and team_account_events while retaining intended RLS-scoped access.

## Verification

- 53 local tests passed: 10 smoke/public content, 14 auth runner, 27 PostgreSQL/RLS, 2 analytics/Excel.
- 36 isolated component views and 13 UI permission assertions passed.
- Sites TypeScript and Vinext/Cloudflare build passed.
- Dedicated database SQL transaction verified create, own completion/provenance, archive, restore, count consistency, export snapshot and self-account protection; transaction rolled back completely.
- Separate transaction verified AAL1 task/report denial. SQL tests simulate verified JWT claims; these are NOT real GoTrue/browser login tests.
- Existing task list, dashboard and reports all returned 27.

## Remaining test limits

- Browser login/MFA and end-to-end form saves still require an actual authenticated session. No passwords or MFA factors changed.
- Email invitations are unavailable until the server-side invitation credentials and mail delivery are configured.
- Device Push delivery requires VAPID configuration and dispatch scheduling; in-app notifications are implemented separately.
- WhatsApp and social destinations are not supplied.
- Security advisor: intentional authorized SECURITY DEFINER RPC warnings; push_outbox has no user policies by design; leaked-password protection remains disabled.
- Do not describe this as fully accepted production or claim all features have passed browser testing.
