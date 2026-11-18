# KrishiBandhu Source Audit

**Audit scope:** Current application routes, feature/service/model inventory, Firebase configuration and local rules/indexes, dependency scripts, and project documentation.  
**Audit type:** Source-level review. Firebase production configuration, live permissions, provider credentials, and full user workflows were not changed or assumed to be working.

## Executive summary

The project is a real Next.js/Firebase foundation, not a complete implementation of the documented platform vision. Farmer registration, farm/crop records, job posting and applications, product listings, the Goa Harvest & Storage slice, and a farmer weather dashboard have connected UI and service code. Several other routes are absent or point to missing pages. Gemini disease analysis/chat is not integrated, and buyer checkout cannot create an order under the current Firestore rules.

The production build succeeds. ESLint initially reported five errors; this audit pass removed those errors. `npm run lint` now exits successfully with 34 non-blocking warnings. There is no project test script or test suite, and Firebase Emulator configuration is absent.

## Findings

| Priority | Area | Finding | Impact / next step |
|---|---|---|---|
| P0 | Firebase indexes | Composite indexes are declared locally for product, job, order, and farm query shapes. The authenticated farmer dashboard currently reports the farms composite index missing; local declarations do not publish indexes. | Publish `firestore.indexes.json` to the intended Firebase project and wait for the farms index to finish building. The CLI deployment attempt previously failed with HTTP 401 because Google credentials were not authenticated; no indexes were changed. |
| P1 | Orders | `orderService.create()` uses a client `addDoc`, but `firestore.rules` explicitly denies all order creates. No buyer checkout page or caller of `orderService.create()` was found, and there is no server order route. | Implement a trusted atomic order/stock flow before exposing checkout; until then, order creation is unavailable. |
| P1 | Navigation | Dashboard and public navigation link to missing pages, including buyer orders/profile, worker profile, farmer advisory/schemes, multiple admin management pages, and About. Farm cards also link to a missing edit route. | Implement the destinations as real workflows or remove/disable those links until the feature exists. |
| P1 | AI disease and chat | `@google/genai` is installed, but no Gemini import, disease-detection page, or agricultural chat implementation exists. | Implement the server-side Gemini workflow in its gated phase, with validated output, safe treatment guidance, and explicit uncertainty. |
| P1 | Labour profiles | Worker registration collects state and district, but the submit call omits them. Auth registration writes only `users/{uid}` for workers; no worker profile service or Firestore rule exists. `jobService.applyForJob()` uses generated IDs and has no duplicate-application guard. | Persist a validated worker profile and enforce one application per worker/job before treating labour onboarding as complete. |
| P2 | Farm and crops | Farm/crop create and read flows exist; edit links do not resolve. Crop model fields include dates and growth stage, but there is no completed harvest-history workflow. | Add owner-scoped edit and history actions, then verify them against Firestore rules. |
| P2 | Marketplace | Farmer product create/listing and public discovery exist. Product creation initializes `images: []`; there is no product image upload flow. There is no buyer checkout or buyer order-history route. | Complete media and order workflows only with server/rules-enforced inventory validation. |
| P2 | Service marketplace | Worker service listings, admin review, storage enquiries, and Goa harvest requests have connected code. General service booking/assignment is not present. | Complete booking and lifecycle handling separately; do not imply that a listing is a confirmed booking. |
| P2 | Supporting modules | Scheme, transaction, review, notification, report, and admin-log names appear in constants/schema documentation, but no active services or matching Firestore rules were found for them. The generic deny rule blocks those unimplemented collections. | Implement each module with its own validated data flow and rules before exposing its navigation. |
| P2 | Dashboards and errors | Worker metrics are placeholders; farmer dashboard errors are logged without a user-facing error state; admin user-list errors are only logged. | Replace placeholders with real data or explicit “not available” labels and surface load errors. |
| P2 | Tests | No application tests, test runner script, or Firebase Emulator configuration is present. | Add focused tests and emulator rules tests with the feature phases; live Firebase behavior remains unverified. |

## Authentication and authorization review

- The four roles are represented in the user model and guarded dashboard layouts.
- Farmer registration writes `users/{uid}` and `farmerProfiles/{uid}` in one Firestore batch. Its profile field names and timestamps match `validUserCreate()` and `validFarmerProfileCreate()` in the local rules.
- Public registration rules permit only farmer, worker, and buyer roles; they do not permit self-assigned admin roles. User self-updates cannot alter role, active state, or verification state.
- Buyer and worker registration currently create only the canonical user record. `buyerProfiles` is not used by application code. `workerProfiles` is also not yet used, despite the worker form collecting location.
- The local Firestore rules cover `users`, `farmerProfiles`, `farms`, `crops`, `products`, `jobs`, `jobApplications`, `serviceListings`, `storageFacilities`, `storageEnquiries`, and `orders`. Unknown collections remain denied by the catch-all rule.
- The local Storage rules allow only scoped harvest-request images (up to 5 MB and JPEG/PNG/WebP); all other Storage paths are denied. Product/farm image uploads are not implemented.
- Rules and indexes are local files only. No Firebase deployment or emulator security-rule test was performed.

## Feature inventory

| Module | Current state |
|---|---|
| Farmer onboarding | Connected Firebase Auth and Firestore flow; farmer profile batch is atomic. |
| Farm management | Create/list/detail and soft-delete code exist; edit destination is missing. |
| Crop management | Create/list code exists; no edit or harvest-history flow. |
| Disease detection and AI chat | Not implemented. |
| Labour | Job post/search/detail/application/review code exists; worker profile persistence and duplicate-application protection are incomplete. |
| Farm services | Worker service listing and moderation exist; general booking is incomplete. |
| Harvest & Storage | Goa-focused requests, worker listings, storage enquiries, local rules/indexes, and source-backed storage directory exist; Firestore runtime access depends on published rules/indexes. |
| Weather advisory | Open-Meteo geocoding/forecast routes and a protected farmer dashboard are implemented. The dashboard displays current weather, seven-day forecasts, rainfall, humidity, wind, and general non-crop-specific advisories. Search-selected locations are not persisted; farm coordinate capture is not part of the current form. |
| Product marketplace | Product create/list and public discovery exist; images, buyer checkout, and buyer order history are incomplete. |
| Government schemes | Not implemented beyond planned constants/documentation. |
| Admin | Dashboard and Harvest & Storage review exist; other linked admin pages are missing. |
| Notifications, reviews, transactions, reports | Not implemented as active end-to-end modules. |

## Validation performed

| Check | Result |
|---|---|
| `npm run build` | Passed; Next.js compiled the application and generated the farmer weather page and both weather API routes. |
| `npm run lint` | Passed with 34 warnings and 0 errors after this audit pass. Warnings include unused imports, `<img>` optimization notices, and React Compiler notices for React Hook Form `watch()`. |
| Weather targeted lint and TypeScript | Passed after resolving the weather dashboard hook/static-component lint findings. |
| Weather API smoke checks | The India-only geocoding proxy returned `Panjim, Goa, India` and no results for `Genoa`; a valid forecast returned seven daily records. Invalid short query, out-of-range latitude, and missing longitude each returned HTTP 400. One transient upstream timeout returned HTTP 504 as designed; a retry succeeded. |
| Farmer dashboard browser check | Opened with a farmer account; current weather, forecast, and advisories rendered. Firestore farm loading surfaced the missing farms composite index. The post-change UI showed the India-only search guidance; API checks verified country filtering. |
| Application test suite | Not available: no project test script or source test files found. |
| Firebase Emulator | Not configured in `firebase.json`; no emulator tests run. |
| Firebase production | Not deployed or modified. |

## Changes made during this audit pass

- Replaced four unsafe `as any` form-resolver casts with separate Zod input/output types.
- Reworked the farm-list load state to handle async results, ignore stale responses, and avoid showing one user's farm data after an account switch.
- Confirmed the production build and lint command complete successfully.
- Integrated Open-Meteo geocoding and forecast endpoints, a farmer weather dashboard, and cautious general weather-planning advisories. Search-selected locations remain view-only.

## Next implementation order

1. Complete Firebase launch configuration: publish already-declared indexes and validate rules in an Emulator or controlled Firebase project.
2. Finish farmer farm/crop edit and history flows and surface errors consistently.
3. Implement secure worker profiles and duplicate-safe labour applications, then complete assignment/scheduling/completion.
4. Implement safe Gemini disease analysis/chat; the Open-Meteo weather dashboard is connected, with authenticated browser-flow verification still pending.
5. Add product image handling and a trusted, stock-validated order path before enabling checkout.
6. Implement schemes, general service bookings, notifications, reviews, reports, and admin destinations with rules and tests.

See [implementation roadmap](implementation-roadmap.md) for phase gates and acceptance criteria.

### Manual Firebase index publication

The deployment attempt was not authenticated and made no changes. Sign in with an account that has access to the project, then publish the local composite index manifest with:

```powershell
firebase login
firebase deploy --only firestore:indexes --project krishibandhu-a500e
```

Wait for the indexes to show **Enabled** in Firebase Console before retrying the affected products, jobs, or orders queries. This command does not publish Firestore or Storage rules.
