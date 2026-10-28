# Route and component inventory

Status: review implementation; authenticated functional acceptance remains pending.

| Route source | Change | Visual evidence |
|---|---|---|
| `app/[locale]/about/page.tsx` | Preserved | local Next.js page |
| `app/[locale]/articles/[slug]/page.tsx` | Preserved | not individually browser-tested this change |
| `app/[locale]/articles/guides/[slug]/page.tsx` | Preserved | not individually browser-tested this change |
| `app/[locale]/articles/page.tsx` | Preserved | local Next.js page |
| `app/[locale]/contact/page.tsx` | Updated | local Next.js page |
| `app/[locale]/links/page.tsx` | Preserved | local Next.js page |
| `app/[locale]/page.tsx` | Preserved | local Next.js page |
| `app/[locale]/privacy/page.tsx` | Preserved | local Next.js page |
| `app/[locale]/services/page.tsx` | Preserved | local Next.js page |
| `app/app/archive/page.tsx` | Preserved | isolated component fixtures |
| `app/app/calendar/page.tsx` | Preserved | isolated component fixtures |
| `app/app/content/[id]/page.tsx` | Preserved | isolated component fixtures |
| `app/app/content/page.tsx` | Preserved | isolated component fixtures |
| `app/app/import/page.tsx` | Preserved | isolated component fixtures |
| `app/app/links/page.tsx` | Preserved | isolated component fixtures |
| `app/app/notifications/page.tsx` | Preserved | isolated component fixtures |
| `app/app/page.tsx` | Updated | isolated component fixtures |
| `app/app/reports/[id]/page.tsx` | Updated | isolated component fixtures |
| `app/app/reports/page.tsx` | Updated | isolated component fixtures |
| `app/app/settings/page.tsx` | Preserved | isolated component fixtures |
| `app/app/tasks/[id]/page.tsx` | Updated | isolated component fixtures |
| `app/app/tasks/new/page.tsx` | Preserved | isolated component fixtures |
| `app/app/tasks/page.tsx` | Updated | isolated component fixtures |
| `app/app/team/page.tsx` | Preserved | isolated component fixtures |
| `app/app/templates/page.tsx` | Preserved | isolated component fixtures |
| `app/auth/confirm/page.tsx` | Preserved | not individually browser-tested this change |
| `app/auth/mfa/page.tsx` | Preserved | not individually browser-tested this change |
| `app/auth/setup/page.tsx` | Preserved | not individually browser-tested this change |
| `app/login/page.tsx` | Updated | not individually browser-tested this change |
| `app/page.tsx` | Preserved | not individually browser-tested this change |

## Layouts

- `app/[locale]/layout.tsx`
- `app/app/layout.tsx`
- `app/layout.tsx`

## Components

- `components/analytics-report.tsx`
- `components/analytics-team.tsx`
- `components/article-card.tsx`
- `components/article-options.tsx`
- `components/article-selector.tsx`
- `components/auth-flow.tsx`
- `components/auth-panel.tsx`
- `components/brand.tsx`
- `components/client-picker.tsx`
- `components/consultation-banner.tsx`
- `components/site-footer.tsx`
- `components/site-header.tsx`
- `components/system-state.tsx`
- `components/task-assignees.tsx`
- `components/task-filters.tsx`
- `components/task-list.tsx`
- `components/task-status.tsx`
- `components/task-template-picker.tsx`
- `components/ui/index.tsx`
- `components/work-calendar.tsx`
- `components/workspace-context.tsx`
- `components/workspace-shell.tsx`
- `components/workspace-sidebar.tsx`
