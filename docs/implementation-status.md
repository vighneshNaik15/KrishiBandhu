# KrishiBandhu Implementation Status

**Audit pass:** Current source inventory and baseline verification  
**Basis:** Direct inspection of application routes, service/model inventory, Firebase configuration/rules/indexes, dependencies, and project documentation. See [the full audit report](audit-report.md). This is not a claim that Firebase workflows have been tested against a configured project.

## What exists

- Next.js 16.3.8 / React 19.2.8 App Router project, TypeScript, Tailwind v4, Firebase 12, and existing Google Gen AI SDK.
- Firebase Auth context, login/registration/password reset screens, role-aware client guards, and farmer/worker/buyer/admin layouts and dashboards. Farmer registration writes the user and farmer profile in one batch; worker registration currently drops its collected district/state.
- Typed models and Firestore services for users, farms, crops, jobs/applications, products, and orders.
- Farmer routes for farms, crops, jobs, products, and orders; worker job/application routes; public job and product discovery.
- Shared responsive UI components and form validation patterns using React Hook Form and Zod.
- Market Finder and Storage Finder pages using the unchanged source CSVs, public navigation links, farmer dashboard actions, and typed filters.
- A protected farmer weather dashboard with Open-Meteo location search, current conditions, seven-day forecasts, rainfall, and general weather-aware planning notes.

## What is partial or missing

| Area | Source-level state |
|---|---|
| Farmer onboarding | Registration writes the user record and a UID-keyed farmer profile with name, phone, district and state. A profile edit screen is connected; Firebase runtime verification is pending. |
| Worker onboarding | Registration writes a user record; no worker profile/skills/availability persistence is connected. |
| Farm/crop management | Create/list/detail routes and services exist. Edit links target routes not present; ownership, lifecycle/history, and full form behavior need validation. |
| Labour | Job and application screens/services exist; worker profile persistence and duplicate-application protection are incomplete. Rules enforce role/ownership and status constraints. |
| Products | Creation and public listing/query exist; image upload and product edit/archive UI are incomplete. |
| Buyer orders | An order model/service and buyer dashboard exist, but no checkout caller or buyer order-history route exists. Local rules intentionally deny order creation pending a trusted stock-reservation flow. |
| Market/Storage Finder | Integrated with the original CSV data. Market search supports state, district, group, and variety; storage supports district only because no state field exists. Optional source omissions remain unfilled. |
| AI disease and chat | Not implemented. `@google/genai` is present, but no Gemini route, image analysis, or agricultural chatbot is connected. |
| Farmer weather | Implemented with Open-Meteo geocoding/forecast Route Handlers and a farmer dashboard. Saved farm coordinates are used when present; otherwise location search is available. Search selections are view-only. Firebase-backed coordinate capture is not present in the farm form. |
| Services, schemes | No integrated listings/booking or scheme discovery workflows found. |
| Notifications, reviews, transactions, admin moderation/reports | Models/constants or dashboard shells may exist, but end-to-end functionality and access rules are not in place. |
| Security/deployment | Firestore/Storage rules and indexes exist locally with a deny-by-default fallback. They are not deployed; production indexes have previously returned missing-index errors. No Firebase Emulator is configured. |
| Tests | No project test runner/test suite is present. Build passes; lint passes with warnings after the initial errors were fixed. |

## Immediate sequence

1. Complete farm/crop edit and history workflows and validate ownership.
2. Deliver safe server-side Gemini image analysis and crop-health workflow.
3. Complete worker profiles and labour lifecycle.
4. Complete product media and a stock-safe buyer order flow.
5. Deploy and verify Firebase rules/indexes and end-to-end workflows.

See the [full audit report](audit-report.md) and [implementation roadmap](implementation-roadmap.md) for findings, phase details, and acceptance criteria. Existing implementation is a foundation, not evidence that a workflow is production-ready.
