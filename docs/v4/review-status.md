# AL AHRAM V4 — review status

**Review only. Not approved for production and not deployed.**

Base: `abadry1902/Ahram-platform`, main commit `e326c25227f3c1dfc08379e5c264e13b61a2795d`.
Feature branch: `design/al-ahram-v4-review`.

## Design system

- Exact V4 palette in `styles/design-tokens.json` and `styles/tokens.css`; Cairo / Montserrat; 24px cards, 12px controls, 28px heroes, low-opacity shadows.
- Shared Button, Input, Select, Textarea, Card, TableContainer, DataTable, EmptyState and PageHeading.
- Shared public header/footer and authenticated sidebar/topbar; role-aware navigation, active states, mobile drawer, keyboard Escape/focus return, language preference cookie.
- Bilingual text for every existing workspace screen; content entered by users is not automatically translated.
- New purpose-made architectural and consultation scenes. These are illustrative, not photographs of the actual office or staff. Reference-board crops are not used as production artwork.
- The approximate SVG logo has been removed. The later user-supplied acceptance kit authorizes temporary derived PNGs, now used without modification; the original transparent master remains pending. See `../acceptance/logo-review-ar.md`. No tracing or invented logo was used.

## Inventory and coverage

The original repository contains **24 page route files, 3 layouts, 5 components and 3 API routes**. The Sites continuation adds privacy and reserved guide routes; V4 adds branded missing/error states. The dynamic article page was checked with all five builtin articles and a reserved guide URL. Both supervisor and employee variants were rendered for the dashboard and task detail.

| Route | V4 UI | AR / EN × desktop / tablet / mobile | Functional verification |
|---|---|---|---|
| `/` | Uses home redirect | Home coverage | Redirect retained |
| `/[locale]` | Applied | Passed | Navigation and mobile menu |
| `/[locale]/about` | Applied | Passed | Read-only page |
| `/[locale]/services` | Applied | Passed | Service links retained |
| `/[locale]/articles` | Applied | Passed | Search, category and empty results checked |
| `/[locale]/articles/[slug]` | Applied | Passed, 5 articles | 3 distinct recommendations, same-category first, disclaimer |
| `/[locale]/articles/guides/[slug]` | Applied | Passed | Reserved public fallback; canonical deduplication |
| `/[locale]/links` | Applied | Passed | Search form and resource links retained |
| `/[locale]/contact` | Applied | Passed | Submission not exercised |
| `/[locale]/privacy` | Applied | Passed | Office wording approval pending |
| `/login` | Applied | Passed | Configuration gate observed; real login pending |
| `/app` | Applied | Passed, supervisor + employee | Isolated component rendering only |
| `/app/tasks` | Applied | Passed | Isolated component rendering only |
| `/app/tasks/new` | Applied | Passed | Save/invite-backed tests pending |
| `/app/tasks/[id]` | Applied | Passed, supervisor + employee | UI role assertions passed; RLS/RPC pending |
| `/app/archive` | Applied | Passed | Done and expired rendered separately |
| `/app/calendar` | Applied | Passed | Private ICS endpoint unchanged; integration pending |
| `/app/reports` | Applied | Passed | Actual aggregation logic retained; fixture rendering |
| `/app/team` | Applied | Passed | Invitation delivery not exercised |
| `/app/content` | Applied | Passed | UI editor/publisher visibility checked; writes pending |
| `/app/content/[id]` | Applied | Passed | Editing form rendered; save pending |
| `/app/links` | Applied | Passed | Publishing actions retained; writes pending |
| `/app/templates` | Applied | Passed | Template creation not exercised |
| `/app/notifications` | Applied | Passed | Mark-read action not exercised |
| `/app/import` | Applied | Passed | Preview/commit contracts retained; real import pending |
| `/app/settings` | Applied | Passed | Account display and language UI |
| Missing / error states | Applied | Passed | Missing article checked; error component isolated |

Layouts: `app/layout.tsx`, `app/[locale]/layout.tsx`, `app/app/layout.tsx`.
Original components: `brand`, `site-header`, `site-footer`, `task-status`, `workspace-sidebar`.
API routes retained unchanged: `/api/calendar.ics`, `/api/import/preview`, `/api/import/commit`.
Metadata routes retained: `robots.txt`, `sitemap.xml`.
Machine-readable source inventory: `inventory.json`.

## Validation evidence

- GitHub Next.js application: dependency lock generated, `npm ci --ignore-scripts`, smoke/recommendation tests, TypeScript and production build passed. Next.js 15.5.28 was resolved by the repository's existing version range. Dependency declarations were not upgraded.
- 10 smoke/recommendation tests and 13 isolated UI permission assertions. The latter check supervisor/leader/non-leader controls, review lock, closed state and employee CMS restrictions. **They are not auth/RLS integration tests.**
- 198 viewport/language captures: 62 content/role/locale views × 3 sizes, plus 4 error/missing views × 3 sizes. Requested viewport widths: 1280, 768 and 390px; scrollbar reduces the content area by 15px. No root horizontal overflow detected.
- 124 additional layout measurements cover all 62 views at requested widths 320 and 1920px. No root horizontal overflow detected. Intentional table scrollers remain.
- Public category filtering and search submission tested; explicit GET actions fixed a search-submission issue in the Sites runtime.
- Public mobile menu opens and closes with Escape, returning focus to the trigger. Focus styles and reduced-motion CSS are shared.
- `/app/tasks` redirects to the existing configuration/login gate; no public workspace bypass was added.
- Desktop, tablet and mobile contact sheets were visually reviewed. All screenshots are browser captures of rendered application components, not generated mockups.

## Scope and limitations

**GitHub application:** Existing auth, server actions, API routes, Supabase client and all SQL migrations remain unchanged. The new locale action only saves a presentation preference. Existing login/enquiry availability is preserved. No migration, project creation, account invitation or production data mutation occurred.

**Sites review:** Its pre-existing release gates remain disabled until backend setup. Login/contact screenshots reflect that existing configuration. Private-screen screenshots render the same real React page components in a standalone Node test harness with clearly marked synthetic records. The harness has no database access, no working server actions and is outside app routing. It is not included in the published build.

**Unresolved acceptance gates:** original approved transparent PNG/SVG logo; dedicated Supabase organization/project approval and connection; real supervisor/employee integration tests for auth, RLS and RPC; MFA, rate limiting, CAPTCHA, attachment scanning, audit/retention and the existing acceptance checklist. No sensitive case files were introduced. These gaps prevent declaring full functional/production acceptance complete.

## Review and publication

This change is a review candidate. Do not merge to main or deploy the saved Sites version until the user approves. The current live Site and GitHub main are unchanged. All review-only public files are removed before build/package; the maintained test renderer writes to `.review/output` outside the application public directory.

## صفحات المصادقة الإضافية

| المسار | الحالة |
|---|---|
| /auth/confirm | منفذ AR/EN؛ التكامل الحقيقي مع الدعوة معلق |
| /auth/setup | منفذ AR/EN؛ تغيير كلمة المرور يحتاج جلسة وMFA للحساب المسجل |
| /auth/mfa | منفذ AR/EN؛ إعداد TOTP واختيار العامل والتحقق؛ الاختبار الحقيقي معلق |

إجمالي ملفات الصفحات أصبح 29. لقطات الصفحات السابقة لا تغطي صفحات المصادقة الجديدة.

### Auth browser capture — 2026-10-25
8 saved actual browser screenshots cover confirm in Arabic/English at 390, 768 and 1280 px, plus setup and MFA in Arabic at 390 px. The other captured files could not be retained; their screenshots remain incomplete. These show the fail-closed unavailable-session/configuration state only; they do not demonstrate successful invitation, password update or TOTP enrollment. Screenshots: `docs/acceptance/screenshots/auth/`.
