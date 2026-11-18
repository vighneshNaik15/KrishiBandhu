# KrishiBandhu Firestore Data Model

**Last updated:** November 2026  
**Status:** Logical schema baseline; implement and secure incrementally by roadmap phase.

## 1. Modeling rules

- Firebase Auth UID is the canonical user identifier and ownership key.
- Store explicit UID fields on queryable documents so Firestore rules can authorize without trusting the UI.
- Denormalize display snapshots when needed for list/history rendering, never as authorization evidence.
- Use Firestore timestamps for server-created/updated times. Validate status transitions and numerical bounds.
- Soft-archive records that contribute to work, crop, order, review, or transaction history.
- Restrict reads of personal data and exact farm coordinates. Public marketplace queries should expose only listing-safe fields.

## 2. Collections

| Collection | Document ID | Purpose / primary access |
|---|---|---|
| `users` | Auth UID | Role, account status, contact/profile basics; owner/admin |
| `farmerProfiles` | Auth UID | Farmer location/profile; owner only in current rules |
| `workerProfiles` | Auth UID | Planned worker skills, experience, availability and location; not currently used or allowed by rules |
| `buyerProfiles` | Auth UID | Planned buyer preferences/contact details; not currently used or allowed by rules |
| `farms` | Generated ID | Farm location, area, soil and irrigation; owner farmer/admin |
| `crops` | Generated ID | Crop/cultivation/season records; owner farmer/admin |
| `cropDiseaseAnalyses` | Generated ID | User-owned image reference and validated AI analysis; owner/admin under retention policy |
| `jobs` | Generated ID | Farmer job posts and lifecycle; public published subset, owner/admin |
| `jobApplications` | Generated ID | Worker application and farmer/job references; worker, owning farmer, admin |
| `serviceListings` | Generated ID | Worker-owned harvesting/machinery and farm-service offers; public approved active subset, owner/admin |
| `serviceBookings` | Generated ID | Enquiries/booking requests and lifecycle; participants/admin |
| `storageFacilities` | Stable seed ID or generated ID | Admin-managed storage facility lead; public active pending/approved directory fields, admin writes |
| `storageEnquiries` | Generated ID | Farmer enquiry to the platform about a facility; owner/admin |
| `marketYards` | Stable ID | Government-reported market yard; public active subset, admin edits/source verification |
| `postHarvestGuides` | Stable ID | Curated commodity handling guidance; public active subset, admin edits |
| `products` | Generated ID | Agricultural marketplace listings and inventory; public active subset, owner/admin |
| `productEnquiries` | Generated ID | Buyer questions/interest; participants/admin |
| `orders` | Generated ID | Order snapshots, status and delivery details; buyer, farmer participant, admin |
| `transactions` | Generated ID | Payment/settlement status record; parties/admin |
| `schemes` | Stable ID or generated ID | Curated government scheme information and verification metadata; public active subset, admin edits |
| `notifications` | Generated ID | User-targeted event notice/read state; recipient/admin |
| `reviews` | Generated ID | Completed engagement ratings/reviews and reports; participants/public-safe subset/admin |
| `reports` | Generated ID | User-submitted moderation reports; reporter/admin |
| `adminLogs` | Generated ID | Administrative audit actions; admin only |

`farmers` is a legacy collection name retained in constants for compatibility. New farmer profiles use `farmerProfiles/{uid}`; do not silently change existing data reads without a migration plan.

This is the logical model, not a claim that every collection is active. Current application code uses `users`, `farmerProfiles`, `farms`, `crops`, `jobs`, `jobApplications`, `serviceListings`, `storageFacilities`, `storageEnquiries`, `products`, and `orders`. The local Firestore rules explicitly match those collections and deny unknown paths by default. `workerProfiles`, `buyerProfiles`, and the other future collections remain inactive unless separately implemented. Harvesting requests/applications reuse `jobs` and `jobApplications`; machinery offers reuse `serviceListings`. Local Firestore/Storage rules and indexes are not deployed.

## 3. Bundled finder datasets (not Firestore)

The current Market Finder and Storage Finder use the original CSV files in `public/data/market-finder.csv` and `public/data/storage-finder.csv`. Goa Civil Supplies leads are maintained separately in `public/data/goa-storage-leads.csv`; their details are transcribed from indexed text of a Goa Civil Supplies Citizen's Charter PDF uploaded in 2021 because direct PDF retrieval was unavailable. They are explicitly marked unverified for farmer harvest-storage access, addresses, capacities, and current operation. These public read-only assets are intentionally not duplicated into Firestore.

| Asset | Source fields used | Supported filtering |
|---|---|---|
| Market Finder | `State Name`, `District Name`, `Market Name`, `Group`, `Variety` | State, district, group, variety |
| Storage Finder | `District`, `Storage name`, `Type`, `Address`, `Manager Name`, `Mobile No`, `Capacity in MT` | District only; the source has no state field |

Empty optional cells remain unavailable, not default values. Market rows are grouped by market for display, retaining distinct source groups and varieties. If these datasets later become editable/live-updated, define a separate authenticated import and verification workflow rather than exposing client writes to the bundled files.

## 4. Common fields and domain shapes

### `users/{uid}`

```ts
{
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: 'farmer' | 'worker' | 'buyer' | 'admin';
  profileImageUrl?: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

At public registration, users may create only their own profile with the selected `farmer`, `worker`, or `buyer` role. The rules reject `admin`, and users cannot change their role, verification, or active status after creation. New accounts start unverified; the current rules authorize supported role operations based on the selected role and active status, not `isVerified`. Admin accounts must be provisioned through a trusted process. The client currently has no verification-management flow.

### `farmerProfiles/{uid}` and `workerProfiles/{uid}`

Both carry `userId`, display name, phone (private), location (`village?`, `taluka?`, `district`, `state`, `pincode?`), `isActive`, verification state, and timestamps.

Farmer-only profile fields: `farmName?`, `farmDescription?`, `farmSizeAcres?`, `primaryProducts?`, profile/farm image paths.

Worker-only profile fields: `skills: string[]`, `experienceYears?`, `bio?`, `dailyRate?`, `isAvailable`, `rating?`, `totalJobsCompleted`.

Public job discovery must not expose worker phone/email. Reveal contact details only to authorized participants and with appropriate product UX.

### `farms/{farmId}`

```ts
{
  farmId: string;
  farmerId: string;          // farmer UID for legacy/current call sites
  farmerUserId: string;      // Auth UID used by rules
  name: string;
  description?: string;
  village?: string;
  taluka?: string;
  district: string;
  state: string;
  pincode?: string;
  coordinates?: GeoPoint;    // private; do not expose by default
  area: number;
  areaUnit: 'acres' | 'hectares' | 'guntha' | 'sqft';
  soilType?: string;
  irrigationType?: string;
  images: string[];
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

Farm coordinates are optional private `GeoPoint` data. The weather dashboard reads them from the farmer's own farm record when available; otherwise the farmer can search and select a location for that view. Weather responses and search selections are fetched on demand and are not stored in Firestore.

### `crops/{cropId}`

```ts
{
  cropId: string;
  farmId: string;
  farmerId: string;
  farmerUserId: string;
  name: string;
  localName?: string;
  category: string;
  variety?: string;
  season: string;
  cultivatedArea: number;
  areaUnit: string;
  currentGrowthStage: string;
  sowingDate?: Timestamp;
  expectedHarvestDate?: Timestamp;
  actualHarvestDate?: Timestamp;
  irrigationDetails?: string;
  fertilizerDetails?: string;
  pestManagementDetails?: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

Preserve completed crop-season history. Crop disease findings are separate analysis documents and are not confirmed crop diagnoses.

### `cropDiseaseAnalyses/{analysisId}`

```ts
{
  analysisId: string;
  farmerUserId: string;
  farmId?: string;
  cropId?: string;
  imageStoragePath: string;
  imageMimeType: string;
  possibleDiseases: Array<{
    name: string;
    confidence?: number;      // optional calibrated/model-reported value; not certainty
    visibleSymptoms: string[];
  }>;
  uncertainty: string;
  prevention: string[];
  safeTreatmentGuidance: string[];
  expertVerificationRequired: true;
  modelId: string;
  createdAt: Timestamp;
}
```

Only validated structured output is persisted. Keep image access owner-scoped; define deletion/retention behavior before production.

### `jobs/{jobId}` and `jobApplications/{applicationId}`

Jobs include `farmerUserId`, `farmerId`, farmer display snapshot, optional farm reference, title/description/category, workers needed, location, schedule, payment terms, `status`, status history, selected worker UIDs, and timestamps. Harvest-service posts additionally use `requestType: 'harvest_service'`, farm location, approximate area/unit, crop, worker-or-machinery requirement, instructions, and up to three Firebase Storage image paths. `selectedApplicationIds` links each accepted worker UID to the application accepted in the same Firestore transaction. A selected worker can read their assigned request and advance it through work-started and completion-pending; the farmer confirms completion.

Applications include `jobId`, farmer UID, `workerId`/`workerUserId`, worker display snapshot, optional skills/cover note, status (`pending | accepted | rejected | withdrawn | completed`), and timestamps. Farmer acceptance updates the application and job selection atomically. Duplicate-application prevention still needs a trusted uniqueness strategy.

### `serviceListings/{serviceId}` and `serviceBookings/{bookingId}`

Service listing includes `providerId`/`createdBy`, provider display snapshot, service categories, skills/equipment, experience, service-area fields, availability, indicative charges, moderation status, active status, and timestamps. Provider submissions are pending until an admin approves them.

Booking includes `serviceId`, `providerUserId`, `farmerUserId`, service and party snapshots, requested date/time, location, enquiry/terms, status (`requested | accepted | declined | reschedule_requested | cancelled | completed`), status history, and timestamps.

`storageFacilities` currently contains the user-provided provisional lead fields, verification/source metadata, optional contact/capacity/coordinate fields, and active state. Public queries may show active `pending` or `approved` leads with their status; map pins require approved, admin-verified coordinates. `storageFacilities/_directory-config` marks whether the initial lead set was imported. `storageEnquiries` stores farmer-owned enquiries and is not a reservation or availability confirmation.

### `products/{productId}`, `orders/{orderId}`

Products include `farmerId`, `farmerUserId`, farmer display/location snapshots, name/category/description, price/unit, minimum order, `quantityAvailable`, images, active status, and timestamps.

Orders include buyer/farmer UIDs and display snapshots; product ID/name/unit/image/price snapshots; quantity and total; embedded delivery address; status/history; notes; and timestamps. `orders` use statuses such as `pending`, `accepted`, `rejected`, `packed`, `dispatched`, `delivered`, `cancelled`. Inventory changes and order creation must be atomic, and rejection/cancellation stock restoration must not run twice.

### `schemes/{schemeId}`

Include name, description, benefits, eligibility, `requiredDocuments`, application process, official URL/source, state/district applicability, category, active status, `lastVerifiedAt`, verifier/admin UID, and timestamps. Never represent an unverified scheme as currently available.

### `notifications`, `reviews`, `transactions`, moderation

- Notifications: recipient UID, type, title/body, related reference, read state, timestamp.
- Reviews: reviewer/reviewee UIDs, related completed job/order/booking, integer rating 1–5, comment, report/moderation status, timestamp.
- Transactions: related order/job/booking, from/to UIDs, amount/currency, payment method/status, provider reference where applicable, timestamps. A record is not proof of settlement without verified provider status.
- Reports/admin logs: reporter/target/action metadata, timestamps, restricted admin access, and no unnecessary sensitive payload.

## 5. Query/index plan

Create composite indexes only for shipped query shapes. Expected patterns include:

- `farms`: `farmerId + farmerUserId + isActive + createdAt desc`
- `crops`: `farmerUserId + isActive + createdAt desc`; `farmId + isActive + createdAt desc`
- `jobs`: `status + createdAt desc`; `status + district + createdAt desc`; `status + category + createdAt desc`; `status + district + category + createdAt desc`; `farmerUserId + createdAt desc`
- `jobApplications`: `workerId + appliedAt desc`; `jobId + farmerId + appliedAt desc`
- `serviceListings`: `isActive + verificationStatus + createdAt desc`, with optional district and/or `serviceCategories` array filter; `providerId + createdAt desc`
- `storageFacilities`: `facilityKind + isActive + verificationStatus` for public directory reads
- `serviceBookings`: `providerUserId + createdAt desc`; `farmerUserId + createdAt desc`
- `products`: `status + createdAt desc`; `category + status + createdAt desc`; farmer owner + status
- `orders`: `buyerId + createdAt desc`; `farmerUserId + createdAt desc`; status + createdAt desc
- `schemes`: `isActive + state`; add category/district where queries require it
- `notifications`: `userId + isRead + createdAt desc`

Firestore may prompt for additional composite indexes. Do not claim production queries are covered until indexes are deployed and tested.

## 6. Security invariants

1. Users cannot change their own role, verification, or active/suspension flags.
2. Farmers/workers can write only documents owned by their Auth UID.
3. Public reads are limited to active public listings and safe profile fields.
4. Applications and bookings are readable only by their participants/admin; only legal transitions are allowed.
5. Orders are readable by buyer, associated farmer, and admin. Buyer cannot forge price, stock, owner, or status snapshots.
6. Stock reservation is atomic and bounded by currently available stock.
7. Scheme creation/update and admin moderation are admin-only.
8. Storage paths and metadata are checked against authenticated owner, content type, and size.

These are requirements for deployed rules, not guarantees supplied by TypeScript or route guards.
