# Codex project handoff — AL AHRAM

Repository: https://github.com/abadry1902/Ahram-platform
Branch: main

## User requirements
1. Continue developing the full bilingual Arabic/English public legal consultancy website and private team workspace.
2. **Use the exact approved logo asset** from the user's approved blue/orange brand board. The currently committed `components/brand.tsx` is an approximate hand-drawn SVG and is **not** the approved logo. Do not re-trace, invent or alter it. Request/import the actual transparent PNG/SVG source, replace the SVG with an image element preserving proportions, and verify desktop/mobile/sidebar variants.
3. Improve homepage hero and banners, legal service cards, article grid, article detail and responsive layouts to match the approved UI showcase. Brand palette: #1546A0, #F47B35, #3578E5, #E8F0FC, #FFE3D0, #FAFAF7. Fonts: Cairo and Montserrat.
4. Each article page must display at least 3 unique recommended articles in a sidebar (desktop) and beneath the article (mobile), prioritizing same-category articles. As of 2026-10-24, this has been implemented on main and there are five fallback bilingual articles.
5. Private workspace must be **real authentication**, not a public demo bypass. No hardcoded supervisor password, no public supervisor signup, no fake seeded confidential records. Create a dedicated Supabase project only with user approval and proper project organization. Do not reuse unrelated EgyToys database. Run SQL migrations in order after auditing RLS and security-definer functions, then create a named supervisor via invite / Auth admin flow. Share invite privately, never commit credentials.
6. Supervisor and task leader alone may change global task status/progress; only supervisor approves closure. Distinct `done` and `expired`. All assigned users see shared notes and teammate progress only within their shared task. Individual statuses are independent.
7. Before production use: auth/RLS integration tests, MFA, rate limiting, CAPTCHA, malware scanning for operational attachments, audit logs, no sensitive case files in Phase 1.

## Dev / QA
- `npm ci`
- `npm run test:smoke`
- `npm run typecheck`
- `npm run build`
- `npm run dev`, then use the local preview (port 3000).
- Verify RTL/LTR, keyboard and mobile breakpoints, published-only article access, correct article recommendations and legal disclaimer.
- Use `docs/acceptance-checklist.md`.

## Current status
- Next.js build passed in GitHub Actions before the latest editorial/design commits; re-run CI after each change.
- GitHub is connected to Vercel for deployment. Supabase is NOT configured for this law-office project.
- This document is a handoff; **it does not mean Codex has been started or connected to the repository**.
