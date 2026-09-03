# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **Yarn 4** (`.yarn/releases/yarn-4.6.0.cjs`, `nodeLinker: node-modules`). Use `yarn`, not `npm`.

```bash
yarn dev       # Vite dev server
yarn build     # tsc (typecheck, noEmit) && vite build
yarn preview   # serve dist/
```

There is **no test runner and no linter configured**. `yarn build` is the only automated check — and it is a strict one: `tsconfig.json` enables `strict`, `noUnusedLocals` and `noUnusedParameters`, so leftover imports or unused params break the build. Run it before declaring work done.

Environment (`.env` for dev, `.env.production` for prod builds):
`VITE_API_URL` (NestJS backend), `VITE_FIREBASE_*` (Auth + Realtime Database + Storage), `VITE_WOMPI_PUBLIC_KEY` / `VITE_WOMPI_ENV`, `VITE_RAG_URL` / `VITE_RAG_API_KEY` / `VITE_RAG_PLATFORM_ID` (chatbot indexing service).

## Context

React 19 + Vite + TypeScript + **Mantine 7** (all UI; PostCSS preset + breakpoint vars in `postcss.config.cjs`, theme in [src/theme.ts](src/theme.ts), style CSS imported in [src/App.tsx](src/App.tsx)) + react-router-dom 7.

The backend is a separate NestJS + Mongoose repo at `../geniality-renewed-backend` (package name `gencampus-backend`). Frontend service files map 1:1 to backend REST resources; when an endpoint shape is unclear, read the backend controller rather than guessing.

UI text, code comments and commit messages are in **Spanish**. Match that.

## Architecture

### Multi-tenancy: everything hangs off `organizationId` in the URL

Almost every route is `/organization/:organizationId/...` ([src/routes/AppRoutes.tsx](src/routes/AppRoutes.tsx)). The org id in the pathname — not a value captured at login — is the source of truth. [utils/getOrgIdFromPathname.ts](src/utils/getOrgIdFromPathname.ts) extracts it, and both `UserContext` and `OrganizationContext` re-resolve reactively when it changes.

Consequences to respect when adding features:
- A user may belong to several organizations. **Never resolve membership by `userId` alone** — always scope to `(userId, organizationId)` via `fetchOrganizationUserByUserAndOrg`.
- On org switch, stale state must be cleared immediately (both contexts do this) so org A's branding/membership never leaks into org B.
- `OrganizationContext` also drives `document.title` and favicon per org.

White-label domains: [config/customDomains.ts](src/config/customDomains.ts) maps hostnames → org id (and optionally → a specific home path); [components/CustomDomainRedirect.tsx](src/components/CustomDomainRedirect.tsx) rewrites `/` accordingly. Adding a branded domain = adding a line to those maps.

### Auth and sessions

Identity is split: **Firebase Auth** (credentials) + a **backend `User` record** (`_id` used by every API call). `UserContext` ([src/context/UserContext.tsx](src/context/UserContext.tsx)) owns both, plus sign-in/sign-up/sign-out and the admin member-creation helpers (which spin up a *secondary* Firebase app so creating a user doesn't hijack the admin's session).

- `localStorage.myUserInfo` holds the backend user + `sessionToken`. The axios interceptor in [services/api.ts](src/services/api.ts) attaches them as `x-uid` / `x-session-token` headers on every request.
- Device limit: a `401` with body message `SESSION_EXPIRED` triggers a one-shot modal + forced logout in the response interceptor. A manual logout sets a `manualLogout` flag so that path stays silent.
- Remote revocation: [hooks/useRealtimeSession.ts](src/hooks/useRealtimeSession.ts) watches Firebase RTDB `sessions/{uid}/{token}` and signs out when the node disappears or is marked `revoked`. Mounted app-wide via `SessionWatcher`.
- Login inside an org enforces org isolation: if the user isn't a member of *that* org, the Firebase session is torn down and an error with `code === "org/not-member"` is thrown.

### Route guards ([src/routes/guards.tsx](src/routes/guards.tsx))

`RequireAuth` (session only) · `RequireMembership({ checkOrgMembership, checkPayment })` · `RequireAdmin`.

Two patterns in these guards exist to fix real bugs — preserve them when editing:
1. **Wait for `userId`**: after Firebase resolves, the backend `userId` arrives in a later call. Guards must not decide while `firebaseUser && !userId`, or a valid member gets ejected on reload.
2. **`decidedOrg`**: each guard records which org its decision was computed for and keeps showing the loader until `decidedOrg === organizationId`, so a decision for the previous org is never applied to the new one.

Payment is only enforced when the org's `access_settings.type === "payment"`; free orgs need membership only. Admin access = org **author** OR admin role, centralized in [utils/orgAccess.ts](src/utils/orgAccess.ts) (`isOrgAuthor` / `hasAdminRole`) — both the guard and `MyOrganizations` must use it so they can't drift apart.

### Services layer

[src/services/](src/services/) — one thin module per backend resource, all sharing the `api` axios instance and typed against [services/types.ts](src/services/types.ts). Two deliberate exceptions bypass `api`: [chatbotService.ts](src/services/chatbotService.ts) (separate RAG host with `X-Platform-Id` / `X-Org-Id` / `X-API-Key`) and Firebase SDK calls.

New backend calls belong in a service module, not inline in a component.

### Course / activity domain

`Organization → Event (course) → Module → Activity`, with `Quiz`/exams attached and `ActivityAttendee` / `CourseAttendee` recording progress.

- **Progress is stored as checkpoints, not raw percentages.** [components/ActivityDetail.tsx](src/components/ActivityDetail.tsx) maps video progress to `0 / 25 / 50 / 100` and persists only on crossing a new checkpoint upward; ≥95% counts as 100%. Progress is also flushed on unmount and on `beforeunload`.
- Course progress = completed activities (progress ≥ 100) / total, in [pages/course/hooks/useCourseProgress.ts](src/pages/course/hooks/useCourseProgress.ts), which also auto-enrolls the user as a `CourseAttendee`.
- Video: Vimeo URLs use the Vimeo `@vimeo/player` iframe path (with its own progress events); everything else falls back to `react-player`.
- **Gating rules live on the `Event` document** (`is_linear`, `exam_gating_enabled` / `exam_min_progress` / `exam_locked_message`, the `module_exam_*` set, and `certificate_*`) and are admin-configurable. Gating logic reads those fields — don't hardcode thresholds.
- Time-on-platform tracking is separate from progress: [hooks/activity/](src/hooks/activity/) (`useActivityTracker` session start/end, `useTimeTracker`, `useVisibleTimeTracker`) posts deltas to `/user-activity/*`; mounted app-wide via `ActivityWatcher`.

### Admin

[pages/admin/](src/pages/admin/) is a tabbed console per organization: events/courses (incl. modules, hosts, exams, certificate rules), members (bulk upload via `xlsx`, credentials, payment plans), and org settings (branding, tab titles/visibility, completion messages, email templates built with GrapesJS/TipTap), plus payment reports (Wompi reconciliation, PDFs via `@react-pdf/renderer`).

Member forms are **dynamic**: fields come from the org's `user_properties`, with conditional display resolved by [utils/shouldRenderProperty.ts](src/utils/shouldRenderProperty.ts) (dependency + `triggerValues`). Don't assume a fixed member schema.

### Payments

Wompi checkout: the backend signs the reference (`/wompi/integrity-signature`), the frontend builds the checkout URL ([services/wompiService.ts](src/services/wompiService.ts)), and the user returns to `/organization/:id/pago-exitoso` ([pages/payment/PaymentStatus.tsx](src/pages/payment/PaymentStatus.tsx)), which syncs the transaction. Access is then granted through `PaymentPlan.date_until`.

## Gotchas

- `React.StrictMode` is intentionally disabled in [src/main.tsx](src/main.tsx) — double-invoked effects would duplicate session/tracking side effects. Don't re-enable it casually.
- Some org-specific behavior is hardcoded by id (e.g. the paywall org in `guards.tsx`, the auto payment-plan org in `UserContext.signUp`). Prefer org settings over adding more of these.
- `services/types.ts` interfaces carry loose escape hatches (`[x: string]: any`, duplicated date field spellings) because backend payloads vary; check the actual response before trusting a field name.
