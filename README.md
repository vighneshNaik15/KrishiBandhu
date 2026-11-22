# KrishiBandhu – Your Trusted Partner in Agriculture

KrishiBandhu is an integrated, AI-powered agriculture management platform connecting farmers, agricultural workers, buyers, and farm service providers. It brings farm and crop records, crop-health guidance, labour discovery, farm services, agricultural commerce, weather advice, and government scheme information together in one mobile-friendly platform.

## Platform modules

- **Farmer and farm management** — farmer profiles, farm locations and soil details, crop records, cultivation stages, and sowing/harvest history.
- **AI crop disease detection** — the farmer-only AI Crop Doctor sends rice, cotton, maize, or sugarcane images to the separate trained-model inference service. Results are unverified model suggestions, not diagnoses or calibrated probabilities, and require expert verification.
- **Labour management** — worker profiles and skills, job posts, applications, selection, scheduling, completion confirmation, ratings, and reviews.
- **Farm services** — discover and enquire about tractor/equipment rental, harvesting, spraying, pruning, irrigation, and land preparation.
- **AI and weather advisory** — Open-Meteo current/forecast information, crop-aware seasonal and irrigation guidance, and a Gemini agricultural chatbot.
- **Agricultural product marketplace** — farmer listings and stock, buyer discovery, enquiries, orders, and transaction records.
- **Market Finder** — browse the supplied market dataset by state/district and filter the recorded commodity group and varieties.
- **Storage Finder** — browse the supplied storage dataset by district; show source-provided capacity, address, and manager details without filling missing values.
- **Harvest & Storage Services (Goa pilot)** — public harvesting/post-harvest discovery, farmer work requests, worker provider listings, read-only access to previously saved request photos, worker applications and selection, storage enquiries, and admin review. Cold Storage Finder also includes every district in the supplied storage dataset alongside separate Goa leads. The phase is still in progress; initial facility candidates remain provisional and unverified. See the [implementation roadmap](docs/implementation-roadmap.md).
- **Government scheme intelligence** — location-relevant schemes, benefits, eligibility, required documents, application steps, and official links.
- **Platform operations** — notifications, moderation, ratings/reviews, admin dashboards, reports, and analytics.

## Roles

| Role | Main capabilities |
|---|---|
| Farmer | Manage farms and crops, use crop-health/advisory tools, post work, list services/products, and manage applications and orders |
| Worker | Maintain skills and availability, find and apply for work, and track assignments |
| Buyer | Discover farm products, make enquiries and orders, and track transactions |
| Admin | Moderate users and listings, maintain scheme information, and view platform reports |

## Technology

Next.js 16 (App Router), React, TypeScript, Tailwind CSS, Firebase Authentication, Cloud Firestore, read-only Firebase Storage support for legacy photos, a separate Python FastAPI/TensorFlow crop-inference service, the existing Google Gen AI SDK (`@google/genai`), Open-Meteo, Leaflet, and OpenStreetMap. Existing frontend dependency versions and routes are retained; modules are delivered incrementally.

## Current implementation status

This repository is an in-progress foundation, not a production-complete implementation of every module above. Farmer registration and farm/crop records, labour listings/applications, product listings, the Goa Harvest & Storage slice, a farmer weather dashboard, and the AI Crop Doctor source workflow have connected code. The weather dashboard uses India-only Open-Meteo geocoding and current/seven-day forecast data, preferring saved farm coordinates when present and otherwise letting the farmer choose a searched location. Its weather-aware planning notes are general information, not crop-specific advice. The separate crop service, Firebase rules/indexes, and real-user workflows still require setup and deployment; no model inference or Firebase persistence is claimed as tested until those steps pass. Krishi Mitra chat, expert-request workflow, disease-specific reference-backed guidance, scheme discovery, worker profile persistence, general service bookings, and complete buyer checkout are not implemented. In particular, Firestore rules currently deny order creation until a stock-safe flow is added. Local rules and indexes must be published separately; they have not been deployed automatically.

The current source audit, validation results, and remaining gaps are recorded in [the audit report](docs/audit-report.md) and [implementation roadmap](docs/implementation-roadmap.md).

## Repository structure

```text
src/
  app/          Next.js routes and role dashboards
  components/   Shared and feature UI
  features/     Auth and feature logic
  lib/          Firebase setup and shared constants
  models/       TypeScript data models
  services/     Firestore and external-service access
  utils/        Validation and formatting
docs/           Requirements, architecture, schema, and phased roadmap
```

Market Finder and Storage Finder currently read the original CSV datasets packaged in `public/data/`; these are public, read-only source records and are not Firebase collections. The storage dataset does not include state, and manager/contact/capacity/address fields may be missing. Cold Storage Finder retains the district-only filter because the source has no state field; the harvesting-service directory remains a Goa pilot.

## Getting started

### Prerequisites

- Node.js compatible with the installed Next.js 16 version
- npm
- A Firebase project with Authentication and Firestore. Firebase Storage is optional and is used only to read previously saved photos.

### Run locally

```bash
npm install
copy .env.example .env.local
# Set the Firebase values and server-only GEMINI_API_KEY in .env.local.
npm run dev
```

The Gemini key must remain server-side and must not use a `NEXT_PUBLIC_` prefix. Open-Meteo does not require an API key. The crop inference service is separate; its setup, model files, pinned Python runtime, and limits are documented in [the service guide](services/crop-inference/README.md). Configure and deploy Firebase rules/indexes before using real accounts or data. See [architecture](docs/architecture.md) and [database schema](docs/database-schema.md).

### Working without persistent photo storage

Crop Doctor uses the separate Python service to analyze the selected image. The app previews the image and shows the assessment on the current page. **Save report** is disabled while persistent photo storage is unavailable. Existing assessments remain in Disease History, and previously stored photos are shown when they are accessible.

Marketplace listings can be created and edited without photos. Harvest requests can be published using text instructions. The app retains historical image references and shows a placeholder or message when images are unavailable. No new photo is stored through these flows.

## Project documentation

| Document | Purpose |
|---|---|
| [Product requirements](docs/product-requirements.md) | Complete product vision, roles, module requirements, and safety requirements |
| [Architecture](docs/architecture.md) | Existing stack, integration boundaries, security, and system design |
| [Database schema](docs/database-schema.md) | Firestore collections, ownership, and query/index guidance |
| [Implementation roadmap](docs/implementation-roadmap.md) | Audit findings, ordered phases, and completion gates |
| [Implementation status](docs/implementation-status.md) | Repository audit snapshot and current gaps |
| [UI/UX](docs/ui-ux.md) | Mobile-first design principles and interface conventions |

## Delivery approach

Work is phase-gated: complete and verify each vertical workflow before expanding scope. The Open-Meteo farmer weather dashboard and AI Crop Doctor source workflow are present; validate the separate model runtime and publish Firebase rules/indexes before enabling production use. Krishi Mitra chat, expert requests, service bookings, schemes, and operational analytics remain future work. The current repository audit and phase gates are in [the roadmap](docs/implementation-roadmap.md).

## Project identity

**Official name:** KrishiBandhu – Your Trusted Partner in Agriculture  
**Geographic starting point:** Goa and Maharastra, with the data model designed to support wider locations.

Private and proprietary. All rights reserved.
