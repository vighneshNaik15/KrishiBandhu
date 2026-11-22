# KrishiBandhu Implementation Roadmap

**Last updated:** November 17, 2026  
**Approach:** Audited phases with a working, tested vertical slice at each gate

## Repository audit: starting point

The latest source-level findings and validation status are in [the audit report](audit-report.md). The audit confirms that this repository contains a functioning foundation but not every documented module; live Firebase behavior remains dependent on external rule/index deployment and testing.

The repository already contains an App Router application, responsive shared UI, Firebase client setup, AuthContext/role layouts, role-specific registration routes, and typed models/services/pages for farms, crops, jobs/applications, products, and orders. The actual dependency manifest is already on Next.js 16.3.8, React 19.2.8, TypeScript, Tailwind v4, Firebase 12, and `@google/genai` 3; do not downgrade or recreate these.

### Implemented foundation

- Four roles (`farmer`, `worker`, `buyer`, `admin`) in the user model and guarded dashboards.
- Farmer and worker registration forms, password reset/login UI, Firebase Auth/Firestore/Storage initialization.
- Farmer farm and crop list/create/detail routes; forms call Firestore services.
- Farmer job create/list/detail routes, public job listing, worker job/application routes, and Firestore job/application methods.
- Farmer product listing/create/list routes, public marketplace/product detail, and product queries.
- Order model, Firestore read/create/status methods, buyer/farmer dashboard and order routes.
- Reusable buttons, inputs, cards, badges, alerts, layouts, and mobile-responsive styling.
- Market Finder and Storage Finder read the original supplied CSVs from `public/data/`; state/district/group/variety market filters and district-only storage filters are integrated into public navigation and the farmer dashboard. Dataset records are not written to Firestore.

### Incomplete or missing (verified from current code)

- Farmer registration now persists the collected location/contact into `farmerProfiles/{uid}`; a farmer profile read/edit screen is connected. Worker registration still does not persist location/skills to a worker profile. Farm/crop/job/product routes use Auth UID as owner and remain compatible.
- Farm/crop creation and listing are connected, but edit routes linked from list pages are absent; crop creation can omit farm selection when no farms are loaded; owner validation and completion/history flows need coverage.
- Job/application UI and services exist, but service methods permit arbitrary status changes and do not enforce ownership, duplicate applications, open-job eligibility, or safe status transitions. Worker profile persistence/display is absent.
- Product creation and marketplace queries exist, but image upload/edit/delete and robust stock management are incomplete. Search/filter capabilities in the service are narrower than the product scope.
- Orders have a basic service and pages, but there is no verified end-to-end order flow, no atomic stock reservation, no complete buyer order-history/detail workflow, and status updates need participant/state checks.
- The AI Crop Doctor frontend, separate FastAPI service source, and Firebase report rules are now present; actual TensorFlow model loads, Firebase save/history, and live deployment remain unverified. Krishi Mitra chat, expert-request workflow, scheme discovery, notifications, reviews, transaction handling, and broader admin analytics are absent or not integrated. Open-Meteo weather is integrated in the farmer dashboard. Firestore/Storage rules and indexes are local files only and have not been deployed; no emulator security tests are configured.
- Firebase environment configuration is deployment/user setup; no credentials should be fabricated or committed. The initial lint errors in farmer form resolvers and farm-list loading have been fixed; lint now exits successfully with non-blocking warnings.
- No automated test runner/test suite is configured or present. Build/lint and targeted workflow tests need to become phase gates.
- Market/storage finder source data is bundled as public CSV assets; the storage source omits state and most contact numbers, so those values are not inferred.
- Harvest & Storage audit: the existing Storage Finder is district-filtered CSV browsing, not a facility booking directory. Its seven Goa additions are Civil Supplies leads and remain explicitly unverified. The initial code audit found no provider profiles, storage enquiries, map library, facility-admin workflow, or Storage rules; the Phase 5 implementation below now adds the first vertical slice.
- Facility names/capacities/one phone number in the new request are user-supplied provisional research, not verified listings. Keep them pending, preserve unknowns, and never assign facility coordinates without verification. Government market-yard and July 2026 hire-charge claims need authoritative source verification before publication.

The prior status documents described an empty/default Next.js scaffold and conflict with the current source; this audit supersedes those claims.

### Market/Storage Finder ZIP audit

- The archived Flask app referenced `df10.csv` and `main.csv`, while the ZIP supplied differently named CSV files. The integration uses the actual archived records and stores byte-identical copies as the two public finder assets.
- The market dataset fields are `State Name`, `District Name`, `Market Name`, `Variety`, and `Group`; the Flask code expected several absent columns and its market-level first-row grouping discarded variety records. The new mapper uses the real fields and groups only for display, retaining distinct varieties and groups.
- The storage dataset has no state field and contains missing address, manager, mobile, and capacity values. Storage results are district-filtered; missing fields remain unavailable rather than being replaced with invented/default values or rounded capacity.
- Flask/Pandas/Gunicorn dependencies from the ZIP are not part of this Next.js integration; the existing project stack and browser-compatible CSV data flow are retained.

## Phase 0 — Baseline and safety gates (in progress)

**Goal:** Keep the existing app stable and establish testable access/integration patterns.

- [x] Audit app routes, models, services, roles, dependency manifest, and existing workflows.
- [x] Replace marketplace-only requirements and plan with the KrishiBandhu scope.
- [x] Audit and integrate the supplied Market Finder and Storage Finder datasets as read-only modules; retain source records and supported filter dimensions.
- [x] Inspect and resolve the existing lint errors that blocked phase work; do not mass-fix unrelated warnings.
- [ ] Document local Firebase setup, deployable Firestore/Storage rules, and environment requirements.
- [ ] Add focused automated test infrastructure only when chosen features need it.

**Gate:** Existing app builds; role identity and rule expectations are documented; no secrets are committed; bundled finder parsing/filtering is verified against the original data.

## Phase 1 — Farmer onboarding and farm/crop records

**Goal:** Make farmer registration and the foundational farm/cultivation record workflow reliable.

- [x] Persist farmer registration location/contact into `farmerProfiles/{uid}` while retaining existing `users/{uid}` and UID ownership conventions.
- [x] Add profile read/update service and screen; surface profile load/save failures explicitly.
- Complete farm/crop CRUD reachable from current screens: owner-scoped reads/updates, edit forms, farm selection/validation, lifecycle/archive and crop harvest history.
- Validate schemas and handle no-farm, loading, permission, and offline/error cases.
- Add Firestore rules for user/profile/farm/crop ownership.

**Acceptance gate:** A new farmer registers, reloads, views their profile, creates/edits a farm and crop, and cannot read/write another farmer’s records. Verify with lint/build and targeted service/form tests or documented Firebase emulator checks.

## Phase 2 — AI crop disease detection

**Goal:** Deliver a safe, authenticated, traceable workflow using the four supplied trained crop models.

- [x] Inspect H5 architecture, output dimensions, TensorFlow Hub layer metadata, training preprocessing, class order, and report-only validation metrics.
- [x] Add an authenticated FastAPI source service with centralized crop/model/class configuration and model shape checks.
- [x] Add the farmer upload/camera/result/history UI and UID-scoped local rules/index. Existing reports are read-only while new photo uploads are disabled.
- [x] Add model-independent image preprocessing and score uncertainty tests.
- [ ] Run with the pinned Python 3.11 / TensorFlow 2.15 / TensorFlow Hub 0.16 runtime and verify all four real H5 loads and predictions, including provided rice photos.
- [ ] Verify unknown/unrelated/low-quality image behavior with a representative held-out dataset; current softmax/margin heuristics are not calibrated and do not provide out-of-domain detection.
- [ ] Publish and test Firebase rules/indexes in the intended Firebase project or Emulator; verify save/history with farmer accounts.
- [ ] Add reliable local agricultural references and build Krishi Mitra/expert/notification workflows when those modules exist.

**Acceptance gate:** All four real models load with verified output shapes and class order; actual authenticated predictions and Firebase save/history pass in the pinned runtime; unsupported and ambiguous inputs produce explicit uncertainty; deployments are confirmed. Source-level code alone is not completion.

## Phase 3 — Worker profiles and labour workflow

**Goal:** Complete farmer job publishing through worker application and selection.

- Persist worker profile/location/skills/experience/availability.
- Complete job search/filter and farmer job management with input and ownership validation.
- Enforce one eligible application per worker/job; allow only valid apply/withdraw/review/select transitions.
- Add farmer application review, worker selection/assignment, schedule, and completion confirmation.
- Add targeted in-app notifications and completion-gated reviews when lifecycle supports them.
- Add rules and index coverage for public jobs and participant-only applications.

**Acceptance gate:** Farmer posts, worker discovers/applies, farmer reviews/selects, work can be scheduled/completed, and unrelated users cannot alter/read private records.

## Phase 4 — Product listings and buyer orders

**Goal:** Complete the marketplace transaction workflow with reliable inventory.

- Support editing listing details and managing status and stock. Persistent product photo uploads are deferred.
- Complete buyer search/discovery and order confirmation/history/detail.
- Implement atomic stock reservation and idempotent rejection/cancellation restoration.
- Enforce role, owner, price snapshot, quantity, and legal order-state invariants.
- Clarify offline payment/transaction state; do not imply payment settlement.

**Acceptance gate:** Farmer lists a real product; buyer places an order; stock cannot oversell; farmer updates order; both parties see correct history and status.

## Phase 5 — Harvest & Storage Services

**Goal:** Deliver an honest, Goa-first directory and a real harvesting work-request lifecycle, without presenting unverified research as confirmed supply.

**Current implementation status (not yet a completed phase):** The public `/harvest-services` route and navigation are wired; workers can submit provider listings for review; farmers can publish validated North/South Goa requests, view historical request photos when available, and review applications; accepted applications are transactionally linked to worker selection, scheduling and farmer-confirmed completion. Storage enquiry submission, admin review/import UI, Firestore rules, Storage rules, and initial composite indexes have been added locally. The Government Market Yards tab uses the Goa Economic Survey 2025–26 for named yards and Board-level facilities; it does not claim per-yard amenities. An asserted July 2026 custom-hire rate was not confirmed from official sources and is intentionally not shown as a government rate. Rules/indexes are not deployed, and workflows still require emulator/build/manual Firebase validation.

- Reuse `jobs` and `jobApplications` for harvest requests/applications instead of adding duplicate `harvestRequests`/`harvestApplications` collections; extend schemas and rules without weakening existing job access.
- Reuse `serviceListings` for worker/provider harvesting and machinery offers. Workers publish their own service categories, area, skills/equipment, availability and indicative charges; no fabricated provider records.
- Add farmer request fields, image upload with scoped Storage rules, North/South Goa filters, applications, selection, scheduling, completion confirmation and reviews as each lifecycle gate is completed.
- Add `storageFacilities` for admin-managed facility records and storage enquiries for farmer-to-platform requests. Display the user-supplied candidate list as pending/unverified; distinguish listed capacity from available capacity and do not infer price, commodity, temperature, hours or coordinates.
- Add a separate Government Agricultural Market Yard category and post-harvest guidance. Publish government facilities, 21-day storage, and July 2026 custom-hiring rates only with official sources and freshness notes.
- Add a map/list view that renders markers only for coordinates an admin has verified; retain OpenStreetMap attribution and an address-search directions link when coordinates are absent.
- Add admin review for facilities and provider listings, audit/status fields, Firestore indexes/rules, and manual/emulator verification instructions.

**Acceptance gate:** A farmer can submit a validated Goa harvest request and storage enquiry; a worker can publish a provider listing and apply; owners/admins can perform only permitted lifecycle changes; storage and market-yard records show source/verification state; no unknown coordinates or commercial values are presented as facts.

## Phase 6 — Weather and AI advisory

**Goal:** Show useful location-aware weather and crop guidance.

**Current implementation status:** The protected `/farmer/weather` dashboard uses saved farm coordinates when present and otherwise supports India-only Open-Meteo geocoding search. The route enforces the India country code both upstream and when validating returned locations. Next.js Route Handlers validate and cache geocoding and forecast requests. The dashboard displays current temperature/condition, humidity, wind, apparent temperature, current precipitation, and a seven-day forecast with daily highs/lows, rainfall, and precipitation probability. It provides general irrigation, rainfall, harvest, spraying, heat, and heavy-rain planning notes, explicitly not guaranteed or crop-specific recommendations. Search-selected locations are not saved to the farm.

- [x] Add server-side Open-Meteo geocoding and forecast requests with input/response validation, timeouts, caching, and explicit errors.
- [x] Display farm-coordinate weather or let a farmer search and select a location without changing the saved farm.
- [x] Show current conditions, seven-day temperature/rain forecast, source/timezone, and cautious general advisories.
- [ ] Add an explicit farm-coordinate capture/edit flow if persistent GPS coordinates are required; keep exact coordinates private.
- [ ] Add Gemini agricultural chat and crop/season-context advice with safety limits, uncertainty, and expert-verification guidance.

**Weather sub-gate:** API input/response validation, successful Open-Meteo responses, and explicit HTTP error behavior are verified. An authenticated farmer-role browser check remains pending. The full phase remains open until the Gemini advisory workflow is implemented and tested.

## Phase 7 — Government scheme intelligence

**Goal:** Provide verifiable, location-relevant scheme discovery.

- Create/admin-maintain scheme records with official links, benefits, eligibility, documents, application steps, jurisdiction, and last-verified date.
- Filter by user location and surface source/freshness.
- Add admin validation and audit/moderation.

**Acceptance gate:** Admin-managed records are traceable to official sources and users see only active, appropriately scoped information.

## Phase 8 — Platform operations and launch hardening

**Goal:** Make the platform manageable and production-ready.

- Complete notifications, participant-verified reviews, transactions, moderation/reporting, admin dashboards, and analytics.
- Deploy and test Firestore/Storage rules and indexes; document trusted admin provisioning and data retention.
- Add accessibility, low-connectivity, mobile, cross-role, abuse/rate, and integration-failure checks.
- Configure production Firebase/Gemini secrets and deployment/backup procedures.

**Gate:** Critical workflows pass end-to-end; access rules are emulator-tested; production secrets and index/rule deployment are documented; lint/build succeed.

## Sequencing and change control

Complete and test each phase before moving to the next. Keep existing working routes/features. Do not begin all modules in one change, introduce fake content/actions, add dependencies before a phase needs them, or expand beyond these requirements without revisiting scope.
