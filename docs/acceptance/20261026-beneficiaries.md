# Beneficiaries and task-list interactions — 26 October 2026

Implemented persistent beneficiary names with supervisor-only creation, case-insensitive duplicate reuse, and a transactional task/client creation RPC. A searchable combobox searches substrings server-side after 200ms; each result page is limited to 50 matches. Task management filters by beneficiary UUID. Staff can only read beneficiary names linked to their assigned tasks; MFA remains required.

Task rows expand on click/keyboard activation. Checklist updates submit the desired checked state, prevent overlapping edits, display pending/error/saved feedback, roll back visual changes on failure, and reload authoritative progress. Only the assigned user updates their own steps; closure rules and shared average progress remain unchanged.

New single-assignee tasks automatically designate that assignee as task leader. Shared leader selection and participant-specific status controls appear only for multiple assignees. Existing task assignments and leaders are not altered. Personal progress remains available for legacy tasks without steps.

Mobile layouts use compact cards, a stacked task row and collapsible advanced filters. Shared CSS adds restrained interaction transitions and respects prefers-reduced-motion. Public labels are Legal topics / Government services / Free consultation and their Arabic equivalents; route URLs remain stable.

Validation: 17 local PostgreSQL/RLS tests passed, including client isolation, rollback, duplicate reuse and MFA. 10 smoke tests passed. TypeScript and 34 isolated UI renders passed. Browser checks used actual components with clearly labelled local synthetic records (no production writes), covering creation mode and one/multiple assignees; 390px Arabic and 768px English responsive views inspected. The temporary review routes were removed before packaging. Full authenticated production browser creation/search/checklist-save acceptance remains unverified.

Supabase advisors: the new authenticated SECURITY DEFINER RPC is intentional, has an empty search_path and checks auth.uid + supervisor + AAL2 before accessing data. Anonymous execution is revoked. Existing leaked-password protection warning remains independent of this change. Remediation references: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable and https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.
