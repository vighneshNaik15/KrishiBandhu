# KrishiBandhu Architecture

**Official name:** KrishiBandhu – Your Trusted Partner in Agriculture  
**Last updated:** November 2026

## 1. Architecture principles

- Preserve the existing Next.js/Firebase application and dependencies.
- Deliver small, testable feature verticals over shared models, services, and UI conventions.
- Keep secrets and privileged operations server-side; make Firebase rules the actual access-control boundary.
- Use typed Firestore models and explicit validation at user and external-service boundaries.
- Treat AI/weather/public data as fallible; display source, freshness, and uncertainty.

## 2. Existing stack

| Concern | Technology |
|---|---|
| Web application | Next.js 16 App Router, React, TypeScript |
| Styling/UI | Tailwind CSS v4, existing shared UI components, lucide-react |
| Authentication | Firebase Authentication |
| Primary data | Cloud Firestore |
| Historical photo reads | Firebase Storage, when available |
| Crop disease inference | Separate FastAPI service; TensorFlow 2.15 / TensorFlow Hub 0.16; four private mounted H5 models |
| Agricultural chat | Planned server-side use of installed `@google/genai`; no Gemini chat workflow is implemented yet |
| Weather | Open-Meteo geocoding and forecast through Next.js Route Handlers; protected farmer dashboard |
| Maps | Leaflet and OpenStreetMap tiles (Harvest & Storage map; verified points only) |
| Forms | React Hook Form, Zod |

Do not replace working dependencies for this scope. Leaflet has been added for the Harvest & Storage map; map pins require admin-verified coordinates.

### Implemented integration status

- Firebase client initialization, AuthContext, Firestore services, and local Firestore/Storage rules and indexes exist.
- Open-Meteo geocoding and forecast Route Handlers are implemented. The farmer AI Crop Doctor frontend, separate FastAPI source, and owner-scoped Firestore/Storage rules are implemented; the Python service and Firebase changes still require deployment and runtime verification. Gemini chat remains planned.
- Firestore rules and indexes are not automatically published by the application. The local manifest must be deployed and verified separately.

## 3. System boundaries

```text
Mobile/desktop browser
  ├─ Next.js App Router: public routes and role dashboards
  ├─ Firebase client SDK: Auth, Firestore and Storage under user rules
  └─ Next.js Route Handlers
       ├─ Open-Meteo: geocoding and weather forecasts (implemented; no API key)
       └─ Gemini API: agricultural chat (planned; server-only key)

Separate Python crop-inference service
  ├─ Firebase Admin SDK: verify farmer ID token and active role
  ├─ TensorFlow + TensorFlow Hub: load H5 models once and infer
  └─ Mounted model files; no Firebase credentials or model weights in the browser

Firebase
  ├─ Authentication: identity
  ├─ Cloud Firestore: profiles, farms/crops, jobs, listings, orders, schemes
  ├─ Storage: user-submitted/product/service images under Storage rules
  └─ Security rules/indexes: authorization and query support

OpenStreetMap
  └─ Map tiles with visible attribution and applicable usage policy

Bundled public datasets
  └─ Original CSV assets in public/data/ for Market Finder and Storage Finder
```

### Integration boundaries

- **Gemini:** invoke from a Next.js Route Handler, validate request size/MIME and authenticated role, keep `GEMINI_API_KEY` server-only, validate model response into a typed schema, and return explicit errors. Never accept model output as trusted instructions or render raw HTML.
- **Open-Meteo:** `/api/weather/geocode` validates location queries, requests India-only results, filters out any result without the India country code, and caches responses; `/api/weather/forecast` validates coordinates and returns current conditions plus a seven-day forecast. Upstream requests have timeouts and 24-hour geocoding/15-minute forecast revalidation. The protected `/farmer/weather` dashboard uses a farm's saved coordinates when available and otherwise lets the farmer search and select a location. A search selection is view-only and is not written to Firestore. Show explicit unavailable/error states and general, non-crop-specific advisories; do not treat them as official warnings or guaranteed recommendations.
- **Leaflet/OpenStreetMap:** load interactive mapping only in a client component when needed; request explicit location permission; do not expose exact farm coordinates publicly by default; include map attribution.
- **Firebase:** client operations go through feature service modules. Server routes must independently verify Firebase identity/authorization if they access private data or invoke paid/abuse-prone AI services.
- **Crop inference:** the browser sends a Firebase ID token, selected crop, and image to the separate FastAPI service. The service requires an active farmer profile, validates image type/size, selects a model only from the centralized crop mapping, and refuses a loaded model whose input/output shapes do not match that mapping. Model files are mounted outside the image and Git. Firebase client SDK saves reports/images under UID-scoped Firestore and Storage rules. Softmax scores and fixed-class outputs remain unverified suggestions; the models have no validated out-of-domain detector.
- **Market/Storage Finder:** read the source CSVs from `public/data/` through a shared CSV parser and typed feature mappers. These files are public and read-only; do not model them as Firebase collections or fabricate absent fields. The market source supports state/district/group/variety filters; the storage source supports district only because it contains no state field. The Harvest & Storage cold-storage tab combines those district-only source rows with separate Goa leads and any live admin-reviewed `storageFacilities`.
- **Harvest & Storage Services:** reuse `jobs`/`jobApplications` for work requests and applications, and `serviceListings` for worker-owned harvesting/machinery offers. Use `storageFacilities` and `storageEnquiries` for moderated facility records and enquiries. Public discovery exposes only approved active providers, while active pending facility leads are shown explicitly as unverified. Government market-yard names and Board-level amenity information are sourced from the Goa Economic Survey 2025–26; the report does not assign every amenity to each yard. July 2026 hire rates were not verified and are not published as government rates. Map markers are rendered only for admin-verified coordinates.
- Previously saved harvest-request photographs use the private `harvestRequests/{farmerUid}/{jobId}/{fileName}` Storage path. Storage rules check role, request ownership/state, image MIME type and the 5 MB limit; workers may read only public request images or images for requests assigned to them.

## 4. Application organization

Retain the existing `src/app`, `src/components`, `src/features`, `src/models`, `src/services`, `src/lib`, and `src/utils` organization. Add feature folders/files only with the phase that needs them, for example:

```text
src/
  app/api/                 # Gemini/weather server route handlers as needed
  app/farmer/              # protected farmer routes
  app/worker/              # protected worker routes
  app/buyer/               # protected buyer routes
  app/admin/               # protected admin routes
  features/                # auth and feature-level UI/logic
    resource-finder/       # CSV parsing and market/storage filtering
  models/                  # Firestore domain types
  services/                # Firebase/external data access
  lib/firebase/            # existing Firebase client initialization
services/crop-inference/   # separately deployed FastAPI/TensorFlow service
```

Use the existing AuthContext/role layouts for user experience. They do not replace Firestore/Storage security rules. Next.js 16 calls the pre-request convention `proxy`; do not rely on proxy for full session management or authorization.

## 5. Data and authorization

- `users/{uid}` is the canonical role and account-status record.
- Farmer and worker profile documents use the Firebase UID as document ID, allowing existing pages/services to address a user consistently.
- Farms, crops, jobs, applications, products, orders, service listings/bookings, and other collections contain explicit owner/participant UIDs needed by rules and query patterns.
- Farm coordinates are optional private `GeoPoint` data. Weather reads them only through the farmer-scoped farm query; a searched weather location is not persisted.
- Denormalize display snapshots only where a historical or list view needs them; never use denormalized display data as proof of ownership.
- Query patterns and required indexes are listed in [database-schema.md](database-schema.md).
- Security rules must validate role, owner/participant, allowed changed fields, and critical state transitions. Client-side validation is for UX, not authority.
- Inventory reservation/order creation must use an atomic transaction or trusted server workflow, with rules that prevent arbitrary stock edits.
- Admin role assignment is trusted/manual or server-admin controlled; registration never assigns admin.

## 6. AI safety and privacy

- Treat uploaded images and prompts as untrusted input. Limit payload/image size and permitted MIME types, enforce authenticated use, and set abuse/rate controls before launch.
- Crop-model outputs are possibilities, not diagnoses. Low-score/margin and low-resolution flags are uncalibrated triage heuristics. A high score cannot establish crop identity or exclude diseases outside the fixed labels; require expert verification.
- Disease-specific visual explanations and treatment recommendations must be added only with reliable local agricultural references. The current UI does not infer/localize symptoms or prescribe chemicals.
- Do not request or return unsupported chemical names/dosages. Do not guarantee outcomes.
- Avoid sending unnecessary personal identifiers or precise farm location to AI providers. Explain retention and external processing before enabling the feature.
- Record only the minimum AI analysis data required for user history and service reliability; define retention/deletion policy before production.

## 7. Reliability and observability

- Every asynchronous operation has loading, success, empty, and error states appropriate to the workflow.
- Do not silently substitute fake values when Firebase, Gemini, or weather services fail.
- Log server-side integration errors without secrets, image contents, or unnecessary personal data.
- Add Firestore composite indexes from observed query needs and deploy rules/indexes through the normal Firebase project workflow.

## 8. Deployment and environment

- Firebase client config values use the existing `NEXT_PUBLIC_FIREBASE_*` variables.
- `NEXT_PUBLIC_CROP_DOCTOR_API_URL` is a public service URL, not a secret. The inference service uses server-only Application Default Credentials and `FIREBASE_PROJECT_ID`; never add service-account credentials to the repository or container image.
- `GEMINI_API_KEY` is a server-only secret and must never have a `NEXT_PUBLIC_` prefix.
- Open-Meteo requires no key. Configure rate/usage limits as service policies evolve.
- Keep local, preview, and production Firebase configuration separated. Never commit `.env.local`.
- Run the existing lint/build commands and phase-specific verification before advancing.

## 9. Architecture evolution

The first implementation can use the existing Firebase client SDK/services. Move operations to a trusted server/Cloud Function only when correctness, abuse controls, payment, or atomic multi-party workflows require it. Do not introduce a second database, state-management framework, or dependency replacement without a concrete requirement.


## Photos and inference

- Crop Doctor previews the selected photo locally and sends it to the existing authenticated Python inference service for analysis. The result remains on the current page, and saving new reports is disabled.
- Marketplace listing creation and editing write only listing details to Firestore. New listings initialize the existing `images` field to an empty array. Historical image references are retained.
- New harvest requests publish directly to Firestore with text instructions. New photo uploads are disabled.
- Existing report metadata remains readable under the current owner-only rules. Legacy Firebase Storage photos use bounded, authenticated reads, and missing photos do not prevent reading report or request details. No historical data or assets are migrated or deleted.
