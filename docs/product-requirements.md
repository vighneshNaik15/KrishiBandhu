# KrishiBandhu Product Requirements

**Official name:** KrishiBandhu – Your Trusted Partner in Agriculture  
**Status:** Product scope and phased delivery baseline  
**Last updated:** November 2026

## 1. Product vision

KrishiBandhu is an integrated, AI-powered agriculture management platform—not only a product marketplace. It connects farmers, agricultural workers, buyers, and farm service providers through farm management, crop intelligence, labour discovery, service bookings, commerce, weather guidance, and government scheme information.

The first release is a working demonstration of real workflows backed by Firebase, not static screens or buttons without actions. Features are delivered and tested in bounded phases.

## 2. User roles

### Farmer

Register and maintain a profile; manage one or more farms, soil/location details, crops and cultivation history; request AI crop-health analysis; post agricultural jobs and select workers; discover/book farm services; publish products and manage stock, enquiries, and orders; view relevant weather and schemes.

### Worker

Register a profile with location, skills, experience, availability, and optional rate; find jobs; apply and track applications; accept assignments; confirm completed work; receive reviews.

### Buyer

Discover and search agricultural products; enquire and place orders; follow order and transaction status; review completed transactions.

### Admin

Review platform activity; moderate accounts, jobs, products, services, reviews, and reports; maintain verified government scheme information; access administrative analytics. Admin privileges must be granted through a trusted process, not self-selected at registration.

## 3. Functional requirements

### 3.1 Farmer and farm management

- Register farmers and maintain contact, location, and profile information.
- Create, view, update, and archive farms with location, area/unit, soil, and irrigation details.
- Associate crop records with a farmer and farm. Capture crop/category/variety, cultivated area, season, growth stage, sowing and expected/actual harvest dates, and relevant cultivation notes.
- Preserve crop and harvest history when a season is completed; do not silently erase historical records.
- Enforce farmer ownership in Firestore rules and validate submitted data.

### 3.2 AI crop disease detection

- A farmer selects/uploads a plant or crop image; validate file type and size and store images in Firebase Storage with private-by-default access.
- Send the image to Gemini through a server-side Next.js route handler using the existing `@google/genai` SDK. Never expose the API key in browser code.
- Return structured possible disease(s), visible symptoms, confidence/uncertainty, prevention, and safe treatment guidance, with a clear informational-use and expert-verification notice.
- Distinguish an uncertain or unidentifiable image from a confident-looking result. Do not invent pesticide/chemical products, dosages, or application schedules; do not guarantee diagnosis.
- Persist analysis metadata/results only as permitted by the user-facing privacy notice. Handle model, network, invalid-image, and rate-limit failures explicitly.

### 3.3 Labour management

- Workers create/edit profiles with skills, experience, location, availability, and contact preferences.
- Farmers create, publish, update, and close agricultural job posts with skill/category, location, headcount, schedule, and compensation terms.
- Workers search/filter published jobs and apply once per job; they can review or withdraw an eligible application.
- Farmers review applicants, select workers, assign/schedule work, and record completion. Workers can confirm completion where required.
- Enforce ownership and legal status transitions; prevent applications to unavailable/closed jobs.
- Enable ratings/reviews only after a related work engagement is completed; provide report/moderation paths.

### 3.4 Farm services marketplace

- Support service listings for tractor and equipment rental, coconut/areca harvesting, spraying, pruning, irrigation, and land preparation.
- Providers maintain service descriptions, service area, availability, indicative pricing, and contact details.
- Farmers discover services, send enquiries, and request bookings. Providers can accept, decline, or reschedule; both parties can see booking status.
- A booking is not a payment or a guarantee of provider availability. Record agreed terms and transaction status where applicable.

### 3.5 AI and weather advisory

- Present current and forecast weather, including rainfall and temperature, based on a farm/user-selected location using Open-Meteo.
- Explain the source and forecast time; represent missing or stale data honestly.
- Offer crop-specific seasonal and irrigation guidance using recorded crop/location context when available.
- Provide an agricultural chatbot using Gemini, with clear limits, uncertainty, and expert-verification guidance. No unsafe chemical dosage advice.

### 3.6 Agricultural product marketplace

- Farmers create and manage listings with images, category, description, quantity, unit, minimum order, price, location, and listing status.
- Buyers search/discover available listings, view farmer/product information, enquire, and place orders.
- Farmers manage incoming orders and inventory. Order creation must validate listing status and stock atomically; prevent overselling.
- Track order lifecycle and transaction information. Payments are not assumed to be online until a payment provider is explicitly designed and approved.
- Maintain order snapshots so later listing edits do not rewrite historical order details.

### 3.7 Government scheme intelligence

- Display curated schemes with benefits, eligibility, required documents, application steps, official source links, jurisdiction, and last-verified date.
- Discover schemes relevant to user location and disclose when information was last verified.
- Treat scheme information as informational; applications and eligibility decisions remain with the relevant government authority.
- Admins can add/update/deactivate schemes and verify official links.

### 3.8 Supporting platform capabilities

- In-app notifications for relevant applications, selections, booking/order updates, and administrative notices.
- Ratings and reviews tied to completed engagements; reporting and moderation.
- Transaction records with parties, amount, method, status, and related order/job/booking. Do not imply payment settlement unless verified.
- Admin dashboards, user/listing moderation, operational reports, and analytics.
- Role-appropriate dashboards and least-privilege access for all four roles.

### 3.9 Market and storage finders

- Market Finder reads the supplied market dataset and lets users select state and district, then filter by the dataset's commodity group and variety fields. Show the recorded market name and available group/variety information.
- Group repeated source rows by market for display while preserving the distinct groups and varieties represented by those rows. Keep the original dataset records unchanged.
- Storage Finder reads the supplied storage dataset and filters by district. The dataset has no state field; do not infer or display a state selector/value.
- Show storage name, type, address, and capacity only when present. Show manager name and mobile number only when present; never generate contact information, facilities, capacities, or substitute values for missing data.
- Treat bundled source data as public, read-only records. Display missing optional values as unavailable or omit them, and provide explicit loading, empty, and error states.

### 3.10 Harvest & Storage Services (Goa pilot)

- Provide separate Harvesting Services, Cold Storage Finder, and Post-Harvest Management sections. Keep harvesting services initially scoped to North Goa and South Goa; Cold Storage Finder must include all districts in the supplied storage dataset and the separate Goa leads.
- The supplied storage dataset has no state field. Offer district-only filtering and do not infer a state for its records.
- Reuse `jobs` and `jobApplications` for farmer harvest/service requests and worker applications; do not create duplicate harvest-request collections. Cover coconut, arecanut, paddy, cashew, mango, and vegetable harvesting; land preparation, tractor/rotavator rental, ploughing, weeding, spraying, pruning, irrigation, and general agricultural labour.
- Harvest requests capture service, district, taluka/village or entered location, approximate land area, crop, date, workers/equipment, budget, instructions, and optional images. Workers/providers use the existing `worker` role, publish their own skills/equipment/service area/availability/indicative charges, browse relevant requests, and apply. Farmers review applications; participants follow valid assignment, schedule, progress, completion, and review states.
- Reuse `serviceListings` for worker-owned provider and machinery offers. Do not seed or imply that a real provider is available until they register and any required moderation is complete.
- The cold-storage directory supports district, taluka, type, commodity, available-capacity, price, and booking filters. Distinguish listed/total capacity from available capacity. Unknown values display as “Not available” or “Not verified”; a listing or enquiry is not a confirmed booking.
- Treat facility names/details supplied as initial research as provisional and pending. Do not invent contact, price, capacity, commodity, storage conditions, opening hours, or coordinates. Goa Krishi Bazar is a separate market/warehouse lead, not automatically a cold-storage facility. Administrators may verify, edit, approve, deactivate, or remove directory records.
- Keep Government Agricultural Market Yards separate from private storage. Show government-reported infrastructure and any free-storage period only with an official source, last-verified date, and an availability disclaimer.
- Add commodity-specific post-harvest information as general education, not certified technical advice. Show government-notified machinery hire charges only with a linked official notification and clarify that rates do not guarantee private-machine availability or pricing.
- Provide list/map views and directions. Map markers require admin-verified coordinates; never geocode or invent facility/provider coordinates without verification. Include OpenStreetMap attribution.
- Protect provider listings, storage enquiries, and harvest workflows with Firebase role/owner rules. Admin-only approval must not be possible through client-supplied role fields.

## 4. Quality, safety, and usability requirements

- Mobile-first, responsive UI suitable for low-end phones and variable connectivity; forms should be short, clear, and recoverable.
- Use typed models, runtime form validation, clear loading/empty/error states, and explicit operation failures.
- Firebase Authentication identifies users; Firestore and Storage rules are the authorization boundary. Client-side route guards improve UX but are not security controls.
- Protect personal contact/location data. Expose only fields required for a stated workflow; use Firebase Storage rules for uploaded content.
- Gemini output is untrusted model output: validate the shape, constrain prompts, do not render unsanitized markup, and communicate uncertainty.
- Never fabricate diagnoses, official scheme benefits, weather values, chemical dosages, or transaction success.
- Provide accessible labels, keyboard interaction, readable contrast, and an expert verification disclaimer for AI guidance.

## 5. Initial demonstration acceptance criteria

The demonstration is considered functionally useful only when the corresponding real data workflows work:

1. A farmer registers and persists a farmer profile, then creates and manages a farm and crop record.
2. The farmer uploads a crop image and receives a validated, safely worded Gemini analysis or a clear error state.
3. A farmer posts a job; a worker profile can find and apply; the farmer can review and select an applicant.
4. A farmer lists a product; a buyer can discover it and place an order; the farmer can manage that order and stock remains consistent.

Each workflow needs role/ownership checks where applicable, validation, error/loading states, and a targeted verification before the next phase is expanded. Dataset-backed finder pages must also be verified against the source records and supported filters.

## 6. Out of scope until explicitly planned

Online payments or escrow, guaranteed disease diagnosis, prescriptive chemical dosage, automated government applications, a logistics fleet, native mobile apps, and expansion beyond the initial region are not implied by this scope.
