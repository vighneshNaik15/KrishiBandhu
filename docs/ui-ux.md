# UI/UX Design System
## KrishiBandhu — Your Trusted Partner in Agriculture

**Version**: 1.0  
**Status**: Proposed  
**Last Updated**: October 2026

---

## 1. Design Philosophy

KrishiBandhu's visual identity must communicate:

- **Authenticity** — This is real, local, and trustworthy
- **Nature** — Agricultural, green, earthy, coastal
- **Practical** — Clear agricultural workflows before decorative marketing
- **Trustworthy** — Honest about AI uncertainty, service availability, and scheme freshness
- **Modern** — A serious technology company, not a village newsletter
- **Accessible** — Usable by farmers on entry-level Android phones

The design must feel like a serious, integrated agriculture platform: clean, confident, warm, and useful to farmers on entry-level Android phones.

**What to avoid:**
- Generic SaaS startup look (blue buttons, white cards)
- Excessive animations or decorative gradients
- Cluttered information density
- Tourist-brochure "Konkan" clichés
- Tiny touch targets (mobile-first is mandatory)

---

## 2. Color Palette

### Primary Palette

```css
/* Design Tokens */
--color-primary-50:  #f0fdf4;   /* Very light green — backgrounds */
--color-primary-100: #dcfce7;
--color-primary-200: #bbf7d0;
--color-primary-300: #86efac;
--color-primary-400: #4ade80;
--color-primary-500: #22c55e;   /* Primary green — CTAs, active states */
--color-primary-600: #16a34a;   /* Primary darker — hover */
--color-primary-700: #15803d;   /* Deep green */
--color-primary-800: #166534;
--color-primary-900: #14532d;   /* Darkest green */
```

### Earth/Warm Accent (Konkan warmth — terracotta, amber)

```css
--color-accent-50:  #fffbeb;
--color-accent-100: #fef3c7;
--color-accent-200: #fde68a;
--color-accent-300: #fcd34d;
--color-accent-400: #fbbf24;
--color-accent-500: #f59e0b;   /* Amber — secondary CTA, highlights */
--color-accent-600: #d97706;   /* Deeper amber — hover */
--color-accent-700: #b45309;   /* Warm brown */
```

### Neutral / Surface

```css
--color-neutral-0:   #ffffff;
--color-neutral-50:  #fafaf9;   /* Page backgrounds */
--color-neutral-100: #f5f5f4;   /* Card backgrounds */
--color-neutral-200: #e7e5e4;   /* Borders */
--color-neutral-300: #d6d3d1;   /* Dividers */
--color-neutral-400: #a8a29e;   /* Placeholder text */
--color-neutral-500: #78716c;   /* Secondary text */
--color-neutral-600: #57534e;   /* Body text secondary */
--color-neutral-700: #44403c;   /* Body text */
--color-neutral-800: #292524;   /* Headings */
--color-neutral-900: #1c1917;   /* Primary text */
```

### Semantic Colors

```css
--color-success: #16a34a;       /* Order accepted, stock available */
--color-warning: #d97706;       /* Low stock, pending status */
--color-error:   #dc2626;       /* Errors, rejected orders */
--color-info:    #0284c7;       /* Informational messages */
```

### Color Usage Guide

| Element | Color |
|---------|-------|
| Primary CTA button | primary-600 background |
| Primary CTA hover | primary-700 background |
| Secondary button | neutral-100 bg, neutral-800 text |
| Page background | neutral-50 |
| Card background | neutral-0 (white) |
| Card border | neutral-200 |
| Primary heading | neutral-900 |
| Body text | neutral-700 |
| Secondary text | neutral-500 |
| Price | neutral-900, bold |
| "Available" badge | primary-50 bg, primary-700 text |
| "Pending" badge | accent-50 bg, accent-700 text |
| "Rejected" badge | red-50 bg, red-700 text |
| Accent highlight | accent-500 |

---

## 3. Typography

### Font Families

```css
/* Heading font — strong, modern, slightly humanist */
--font-heading: 'Playfair Display', Georgia, serif;

/* Body font — clean, legible, professional */
--font-body: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

/* Monospace — for codes, prices (optional) */
--font-mono: 'JetBrains Mono', monospace;
```

**Rationale**: 
- `Playfair Display` for headings gives the brand a warm, premium, slightly traditional feel — appropriate for authentic food/agriculture
- `Inter` for body text ensures maximum legibility across all screen sizes

### Type Scale

```css
--text-xs:   0.75rem;   /* 12px — Labels, captions */
--text-sm:   0.875rem;  /* 14px — Secondary body, table cells */
--text-base: 1rem;      /* 16px — Primary body text (minimum) */
--text-lg:   1.125rem;  /* 18px — Large body, card titles */
--text-xl:   1.25rem;   /* 20px — Section subheadings */
--text-2xl:  1.5rem;    /* 24px — Page section headings */
--text-3xl:  1.875rem;  /* 30px — Dashboard stats */
--text-4xl:  2.25rem;   /* 36px — Page headings */
--text-5xl:  3rem;      /* 48px — Hero headings */
--text-6xl:  3.75rem;   /* 60px — Hero (desktop) */
```

### Font Weights

```css
--font-normal:    400;
--font-medium:    500;
--font-semibold:  600;
--font-bold:      700;
--font-extrabold: 800;
```

### Line Heights

```css
--leading-tight:  1.25;  /* Headings */
--leading-snug:   1.375; /* Subheadings */
--leading-normal: 1.5;   /* Body text */
--leading-relaxed:1.625; /* Long-form text */
```

---

## 4. Spacing System

Based on a 4px base unit (Tailwind-compatible):

```css
--space-1:  0.25rem;  /* 4px */
--space-2:  0.5rem;   /* 8px */
--space-3:  0.75rem;  /* 12px */
--space-4:  1rem;     /* 16px */
--space-5:  1.25rem;  /* 20px */
--space-6:  1.5rem;   /* 24px */
--space-8:  2rem;     /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
--space-24: 6rem;     /* 96px */
```

---

## 5. Border Radius

```css
--radius-sm:   0.25rem;  /* 4px — Badges, tags */
--radius-md:   0.5rem;   /* 8px — Inputs, small cards */
--radius-lg:   0.75rem;  /* 12px — Cards */
--radius-xl:   1rem;     /* 16px — Large cards */
--radius-2xl:  1.5rem;   /* 24px — Modals */
--radius-full: 9999px;   /* Pills, avatars */
```

---

## 6. Shadows

```css
--shadow-sm:   0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md:   0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07);
--shadow-lg:   0 10px 15px -3px rgb(0 0 0 / 0.07), 0 4px 6px -4px rgb(0 0 0 / 0.07);
--shadow-xl:   0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.08);
```

---

## 7. Component Specifications

### 7.1 Buttons

```
PRIMARY BUTTON
─────────────────────────────────────────────
Background: primary-600 (#16a34a)
Text:       white, font-semibold, text-sm
Padding:    12px 24px (mobile: 10px 20px)
Radius:     radius-md (8px)
Hover:      primary-700, slight scale(1.01)
Active:     primary-800
Disabled:   neutral-300 bg, neutral-500 text
Height:     44px minimum (accessibility)
─────────────────────────────────────────────

SECONDARY BUTTON
─────────────────────────────────────────────
Background: white
Border:     1.5px solid neutral-300
Text:       neutral-800, font-medium, text-sm
Hover:      neutral-50 bg, neutral-900 text
─────────────────────────────────────────────

GHOST BUTTON (text link style)
─────────────────────────────────────────────
Background: transparent
Text:       primary-600, font-medium
Hover:      primary-700, underline
─────────────────────────────────────────────

DANGER BUTTON
─────────────────────────────────────────────
Background: red-600
Text:       white
Hover:      red-700
─────────────────────────────────────────────
```

### 7.2 Form Inputs

```
TEXT INPUT
─────────────────────────────────────────────
Background: white
Border:     1.5px solid neutral-300
Radius:     radius-md (8px)
Padding:    10px 14px
Font:       text-base (16px — prevents iOS zoom)
Height:     44px minimum
Focus:      border primary-500, ring primary-100
Error:      border red-500, ring red-100
Label:      neutral-700, text-sm, font-medium
─────────────────────────────────────────────

TEXTAREA
─────────────────────────────────────────────
Same as input, min-height: 120px
─────────────────────────────────────────────

SELECT
─────────────────────────────────────────────
Same as input with chevron icon
─────────────────────────────────────────────
```

### 7.3 Product Card (Marketplace)

```
┌────────────────────────────────────┐
│                                    │
│         Product Image              │  ← aspect-ratio: 4/3, object-cover
│         (with lazy loading)        │     border-radius top
│                                    │
├────────────────────────────────────┤
│ Coconut Oil              🌿 Goa    │  ← name (text-lg, font-semibold)
│ Cold Pressed                       │     location badge
│                                    │
│ ₹250 / litre                       │  ← price (text-xl, font-bold)
│                                    │
│ 📍 Assonora, North Goa             │  ← location detail
│ 🧑‍🌾 Rajesh Naik                  │     farmer name
│ ✅ 20 litres available             │  ← stock indicator
│                                    │
│ [      View Product       ]        │  ← Primary button, full width
└────────────────────────────────────┘

Card styles:
- Background: white
- Border: 1px solid neutral-200
- Radius: radius-lg (12px)
- Shadow: shadow-md on hover
- Transition: shadow 200ms, translateY(-2px) on hover
```

### 7.4 Navigation

```
DESKTOP NAVBAR (sticky, top)
─────────────────────────────────────────────
Background:    white with shadow-sm on scroll
Height:        64px
Logo:          "KrishiBandhu" — font-bold, text-xl, primary-700
Nav links:     Home | Marketplace | Jobs | About (role dashboards provide farm, crop, service and scheme tools)
               text-sm, neutral-700, hover primary-600
CTA:           [Login] (secondary) + [Join as Farmer] (primary)
─────────────────────────────────────────────

MOBILE NAVBAR
─────────────────────────────────────────────
Logo left, hamburger menu right
Slide-in drawer from right
Full-height overlay
Nav links full-width, text-lg
─────────────────────────────────────────────

BOTTOM NAVIGATION (dashboard pages, mobile)
─────────────────────────────────────────────
Fixed bottom, 5 items max
Icon + label (text-xs)
Active: primary-600, inactive: neutral-400
─────────────────────────────────────────────
```

### 7.5 Status Badges

```
PENDING:     amber-50 bg, amber-700 text, amber-200 border
ACCEPTED:    green-50 bg, green-700 text, green-200 border
REJECTED:    red-50 bg, red-700 text, red-200 border
DISPATCHED:  blue-50 bg, blue-700 text, blue-200 border
DELIVERED:   green-100 bg, green-800 text
OUT_OF_STOCK: neutral-100 bg, neutral-500 text
```

### 7.6 Dashboard Cards (Farmer/Admin stat cards)

```
┌──────────────────────────────┐
│ 🛒  Total Orders             │
│                              │
│     24                       │  ← large number, font-bold, text-3xl
│                              │
│ ↑ 3 new today                │  ← secondary text, text-sm
└──────────────────────────────┘

Background: white
Border-left: 4px solid primary-500 (colored accent)
Shadow: shadow-md
```

---

## 8. Responsive Breakpoints

```css
/* Mobile first */
/* xs: 0px — 374px (very small phones) */
/* sm: 375px — default mobile */

@media (min-width: 640px) { /* sm — large phones, small tablets */ }
@media (min-width: 768px) { /* md — tablets */ }
@media (min-width: 1024px) { /* lg — laptops */ }
@media (min-width: 1280px) { /* xl — desktops */ }
@media (min-width: 1536px) { /* 2xl — wide desktops */ }
```

### Grid System

```
Mobile:   1 column
Tablet:   2 columns (marketplace: 2 product cards)
Desktop:  3–4 columns (marketplace: 3–4 product cards)
```

---

## 9. Icons

Use **Lucide React** (already included in many Next.js setups, lightweight, consistent).

Key icons:
- 🏪 `ShoppingBag` — Marketplace
- 🌾 `Sprout` — Farmer / agriculture
- 📦 `Package` — Orders
- 📍 `MapPin` — Location
- 🔍 `Search` — Search
- ➕ `Plus` — Add product
- ✏️ `Pencil` — Edit
- 🗑️ `Trash2` — Delete
- ✅ `CheckCircle` — Accepted/success
- ❌ `XCircle` — Rejected/error
- ⏰ `Clock` — Pending
- 📸 `Camera` — Upload image
- 👤 `User` — Profile

---

## 10. Page Layouts

### Public Layout

```
┌─────────────────────────────────────┐
│ Navbar (sticky)                     │
├─────────────────────────────────────┤
│                                     │
│ Page Content                        │
│                                     │
├─────────────────────────────────────┤
│ Footer                              │
└─────────────────────────────────────┘
```

### Farmer / Buyer Dashboard Layout (Desktop)

```
┌──────────┬──────────────────────────┐
│          │  Top Bar (name, logout)  │
│  Sidebar │──────────────────────────│
│  (200px) │                          │
│          │  Page Content            │
│ - Home   │  (max-width: 1200px)     │
│ - Prods  │                          │
│ - Orders │                          │
│          │                          │
└──────────┴──────────────────────────┘
```

### Farmer / Buyer Dashboard Layout (Mobile)

```
┌─────────────────────────────────────┐
│ Top Bar (logo, profile)             │
├─────────────────────────────────────┤
│                                     │
│ Page Content                        │
│                                     │
├─────────────────────────────────────┤
│ Bottom Nav (fixed)                  │
└─────────────────────────────────────┘
```

---

## 11. First 5 Screens — Specification

### Screen 1: Landing Page

**URL**: `/`

**Sections**:
1. **Navbar** — Logo + nav + CTA buttons
2. **Hero** — Full-width section, warm agricultural imagery, headline: *"Your trusted partner in agriculture"*, role-appropriate CTAs
3. **Platform modules** — farm/crop management, crop intelligence, labour, services, market access, weather and schemes
4. **How It Works** — 3-step visual: List → Discover → Order
5. **For Farmers** — Simple section with farmer join CTA
6. **Why KrishiBandhu** — trust, practical workflows, informed decisions, and local relevance
7. **Categories** — Visual grid of product categories
8. **Footer** — Links, contact, copyright

---

### Screen 2: Marketplace

**URL**: `/marketplace`

**Layout** (Desktop):
```
┌──────────────┬──────────────────────────────────┐
│  Filters     │  Search bar                      │
│              │──────────────────────────────────│
│  Category    │  Sort: Newest | Price ↑ | Price ↓│
│  ☑ Coconut  │──────────────────────────────────│
│  ☐ Cashew   │  ┌────────┐ ┌────────┐ ┌───────┐│
│  ☐ Mango    │  │ Card   │ │ Card   │ │ Card  ││
│              │  └────────┘ └────────┘ └───────┘│
│  Location    │  ┌────────┐ ┌────────┐ ┌───────┐│
│  ○ All       │  │ Card   │ │ Card   │ │ Card  ││
│  ○ Goa       │  └────────┘ └────────┘ └───────┘│
│  ○ Ratnagiri │                                  │
│              │  [Load more]                     │
│  Price Range │                                  │
│  ₹0 — ₹5000  │                                  │
└──────────────┴──────────────────────────────────┘
```

Mobile: Filters in a slide-up bottom sheet, triggered by "Filter" button.

---

### Screen 3: Product Detail

**URL**: `/marketplace/[productId]`

**Layout**:
```
┌──────────────────────────────────────┐
│  [Image Gallery]                     │
│  (Main image + thumbnails)           │
├────────────────────┬─────────────────┤
│  Product Info      │  Order Box      │
│                    │                 │
│  Cold Pressed      │  ₹250 / litre   │
│  Coconut Oil       │                 │
│                    │  Qty: [  1  ]   │
│  Category: Coconut │                 │
│  Location: Goa     │  [Place Order]  │
│                    │                 │
│  Description...    │  ─ OR ─         │
│                    │                 │
│  ─────────────     │  [Login to Buy] │
│  Farmer Info       │                 │
│                    │  Available: 20L │
│  🧑‍🌾 Rajesh Naik  │                 │
│  📍 North Goa     │                 │
└────────────────────┴─────────────────┘
```

Mobile: Stacked, image full-width, order box below product info.

---

### Screen 4: Farmer Dashboard

**URL**: `/farmer`

**Layout** (mobile-first):
```
┌────────────────────────────────────┐
│  Good morning, Rajesh 👋           │
│                                    │
│  ┌─────────┐ ┌─────────┐          │
│  │ Products │ │ Orders  │          │
│  │    5    │ │    3    │          │
│  └─────────┘ └─────────┘          │
│                                    │
│  🔔 New Order                      │  ← highlighted
│  Priya ordered 3L Coconut Oil      │
│  [View Order]                      │
│                                    │
│  Quick Actions                     │
│  [+ Add Product]  [View Orders]    │
│                                    │
│  My Products                       │
│  ─────────────────────────────     │
│  • Coconut Oil — 20L available     │
│  • Fresh Coconut — 100 pcs         │
└────────────────────────────────────┘
```

---

### Screen 5: Add Product (Farmer)

**URL**: `/farmer/products/new`

**Form Fields**:
1. Product Name (text)
2. Category (select dropdown)
3. Description (textarea)
4. Price per unit (number + unit selector)
5. Quantity available (number)
6. Minimum order quantity (number, default 1)
7. Product images (upload, max 5)
8. Location (auto-filled from farmer profile, editable)

**UX Rules**:
- Simple, one page (no multi-step in Phase 1)
- Clear labels, large touch targets
- Image preview before submit
- Success screen after submission
- Farmer redirected back to "My Products"

---

## 12. Loading & Empty States

Every dynamic page must handle:

| State | Design |
|-------|--------|
| Loading | Skeleton screens (not spinners for content) |
| Empty | Illustration + helpful message + CTA |
| Error | Red alert with retry button |
| Success | Green toast notification (auto-dismiss 3s) |

---

## 13. Accessibility Checklist

- [ ] All images have `alt` text
- [ ] Color contrast ratio ≥ 4.5:1 for body text
- [ ] Color contrast ratio ≥ 3:1 for large text
- [ ] All interactive elements keyboard-navigable
- [ ] Focus rings visible (not just color change)
- [ ] Form inputs have associated labels
- [ ] Error messages linked to inputs via `aria-describedby`
- [ ] Touch targets minimum 44×44px
- [ ] No content conveyed by color alone
- [ ] Font size minimum 16px for inputs (prevents iOS auto-zoom)

---

*Document maintained by the KrishiBandhu team.*
