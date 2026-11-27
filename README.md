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

Next.js 16 (App Router), React, TypeScript, Tailwind CSS, Firebase Authentication, Cloud Firestore, read-only Firebase Storage support for legacy photos, a separate Python FastAPI/TensorFlow crop-inference service, server-side Gemini REST calls, Open-Meteo, Leaflet, and OpenStreetMap.

## Current implementation status

The current release includes role registration, farm and crop records, offline farm sync, labour listings and applications, the Goa Harvest & Storage pilot, weather, and AI advisory and scheme search. Buyers can request orders, and sellers commit stock when accepting them. Payment processing and general service bookings remain outside the current release. Crop Doctor requires the separate inference service, and legacy photos require an accessible Firebase Storage bucket.

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

Keep the Gemini key server-side as `GEMINI_API_KEY`. The free Open-Meteo endpoint requires no key. The crop inference service has its own setup, model files, and pinned Python runtime. See [the service guide](services/crop-inference/README.md).

### Deploy to Vercel

1. After deployment approval, run `npx.cmd vercel@latest link` from the repository root and select or create the Vercel project. Set the framework preset to **Next.js**, Root Directory to the repository root, Node.js to **22.x**, and leave the default install, build, and output settings. Keep **Automatically expose System Environment Variables** enabled for the Vercel build checks.
2. Under **Settings → Environment Variables**, set the production values from [`.env.example`](.env.example). Copy Firebase values from **Project settings → General → Your apps → Web app → SDK setup and configuration**. Keep its Firebase-provided `authDomain` value. Add `GEMINI_API_KEY` as a sensitive server variable for advisory and schemes. Set `NEXT_PUBLIC_CROP_DOCTOR_API_URL` after the separate HTTPS service is ready. The storage bucket is optional for legacy photos. Enable the same variables for Preview only if that environment should use those services.
3. In **Firebase Console → Authentication → Sign-in method**, confirm **Email/Password** is enabled. In **Authentication → Settings → Authorized domains**, add the exact production hostname from Vercel, with no scheme or path. Add a custom domain and any fixed preview hostname you intend to test as separate entries. Do this after the first deploy if the hostname is assigned then. The deployed app uses email/password sign-in and password reset.
4. Run `npx.cmd vercel@latest deploy --prod` from the repository root. Vercel builds the Next.js application using the configured environment variables. Deploy again after changing a `NEXT_PUBLIC_` value so the browser assets pick it up.
5. On the final HTTPS origin, use dedicated test accounts to check farmer, buyer, and worker registration, login and password reset. List a product, request an order and accept it as the seller. Open **My Farms** online until offline access is ready, disconnect, reload and edit a farm, then reconnect and confirm the update. Test advisory and schemes with the Gemini key, plus Crop Doctor after its HTTPS service is configured.

The active Firestore release matched [`deploy/firestore-targeted/candidate.rules`](deploy/firestore-targeted/candidate.rules) in the production audit. All composite indexes used by current screens were ready. Any database changes belong in a separate review and release. See [Vercel deployment from the CLI](https://vercel.com/docs/projects/deploy-from-cli) and [Firebase Authentication troubleshooting](https://firebase.google.com/docs/auth/faq-and-troubleshooting).

Vercel Hobby and the free Open-Meteo endpoint are for non-commercial use. Firebase Auth and Firestore can serve the core app within Spark quotas. Legacy Firebase Storage photos require an accessible Blaze bucket. Gemini text generation has its own quota, and Crop Doctor needs a separate container host. See [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Open-Meteo pricing](https://open-meteo.com/en/pricing), [Firestore quotas](https://firebase.google.com/docs/firestore/pricing), and [Firebase Storage requirements](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024).

### Working without persistent photo storage

Crop Doctor uses the separate Python service to analyze the selected image. The app previews the image and shows the assessment on the current page. **Save report** stores private prediction metadata in Firestore after the reviewed rules and index are active. The selected photo is used for inference only. Existing assessments remain in Disease History, and previously stored photos are shown when they are accessible.

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

Work is phase-gated: complete and verify each vertical workflow before expanding scope. The current repository roadmap and phase gates are in [the roadmap](docs/implementation-roadmap.md).

## Project identity

**Official name:** KrishiBandhu – Your Trusted Partner in Agriculture  
**Geographic starting point:** Goa and Maharastra, with the data model designed to support wider locations.

Private and proprietary. All rights reserved.
