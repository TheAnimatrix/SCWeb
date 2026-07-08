# SelfCrafted v2.0 Relaunch — Planning Document

> **Status:** Planning / pre-implementation  
> **Date:** July 7, 2026  
> **Scope:** Full design system overhaul + codebase sanitation + relaunch readiness

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Design System — What the Mockups Are Saying](#2-design-system--what-the-mockups-are-saying)
3. [Current State vs Target State](#3-current-state-vs-target-state)
4. [Surface Area of Changes](#4-surface-area-of-changes)
5. [Phase 0 — Foundation & Sanitation](#5-phase-0--foundation--sanitation)
6. [Phase 1 — Design System & Shell](#6-phase-1--design-system--shell)
7. [Phase 2 — Public Pages](#7-phase-2--public-pages)
8. [Phase 3 — Commerce Flow](#8-phase-3--commerce-flow)
9. [Phase 4 — User & Auth](#9-phase-4--user--auth)
10. [Phase 5 — 3DP Portal (FABBLY)](#10-phase-5--3dp-portal-fabbly)
11. [Phase 6 — Data, Backend & New Features](#11-phase-6--data-backend--new-features)
12. [Phase 7 — QA, Performance & Launch](#12-phase-7--qa-performance--launch)
13. [Effort Estimates](#13-effort-estimates)
14. [Open Decisions](#14-open-decisions)
15. [Risk Register](#15-risk-register)
16. [Appendix — File Inventory](#16-appendix--file-inventory)

---

## 1. Executive Summary

SelfCrafted is relaunching with a **fundamentally different visual identity**. The mockups represent a shift from the current **dark, glow-accented, section-colored** aesthetic to a **light, monochrome, engineering-documentation** aesthetic.

This is not a reskin. It is:

| Dimension                    | Scale                                                                   |
| ---------------------------- | ----------------------------------------------------------------------- |
| **Visual paradigm**          | Dark → Light (complete inversion)                                       |
| **Color system**             | Multi-hue section theming → Strict monochrome                           |
| **Information architecture** | Homepage = marketplace → Separate landing + browse                      |
| **Component library**        | ~45 Svelte components, most need restyling or replacement               |
| **Route pages**              | ~20 user-facing pages across 6 route groups                             |
| **Largest files**            | 3DP portal pages (1,100+ lines each), product detail (1,083 lines)      |
| **Technical debt**           | 34 type errors, 82 warnings, dual `$lib` dirs, legacy Svelte 4 remnants |
| **Svelte LOC**               | ~15,600 lines across 70+ `.svelte` files                                |

**Realistic timeline:** 6–10 weeks for one focused developer, or 3–5 weeks with 2 developers working in parallel on design system + page migration.

---

## 2. Design System — What the Mockups Are Saying

### 2.1 Core Aesthetic: "Engineering Documentation Marketplace"

The new identity treats the site like **readable technical infrastructure** — part terminal, part spec sheet, part clean product catalog. It should feel like something a hardware engineer would trust, not a generic e-commerce template.

### 2.2 Visual Language

| Element                | Specification                                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mode**               | Light. White/off-white backgrounds (`#FAFAFA`–`#FFFFFF`), not dark.                                                                         |
| **Palette**            | Strict monochrome. Black (`#000`), near-black text, grays for borders/dividers, white surfaces. No cyan accent, no per-section hue theming. |
| **Borders**            | 1px solid light gray (`#E5E5E5`–`#E0E0E0`). Structure via borders, not shadows/glow.                                                        |
| **Corners**            | Subtle rounding (~4–8px on cards/buttons). Not the current heavy `rounded-2xl` dark cards.                                                  |
| **Shadows**            | Minimal to none. Depth comes from borders and whitespace.                                                                                   |
| **Background texture** | Dot-grid pattern in hero sections only. Remove noise overlay + accent glow orb.                                                             |
| **Effects to remove**  | Smoke particles, hue-rotate logo filters, `shadow-glow`, canvas animations on marketing pages.                                              |

### 2.3 Typography

| Role                   | Font                                                                                    | Usage                                                                           |
| ---------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Display / headings** | Clean geometric sans (keep Figtree or switch to something like Instrument Sans / Geist) | "Parts, products & people.", "Browse creations", product titles                 |
| **Mono / labels**      | Monospace (JetBrains Mono, IBM Plex Mono, or Fira Code)                                 | `sys.status`, `cart[0]`, `spec_sheet.txt`, filter labels, metadata, breadcrumbs |
| **Body**               | Sans, regular weight                                                                    | Descriptions, review text, policy content                                       |

**Copy conventions (important for brand feel):**

- UI labels use `snake_case`: `sign_in`, `add_to_cart`, `start_crafting`, `browse_crafts`
- Bracket notation: `cart[3]`, `[mod.01]`
- Arrow affordances: `browse_all →`, `view_shop →`, `add_to_cart →`
- Code-comment filter headers: `// category`, `// price_range`, `// city`
- File-naming metaphor: `spec_sheet.txt`, `featured_craft.spec`, `lornode_v2.jpg`
- Breadcrumb paths: `home / crafts / products / lornode_v2`

### 2.4 Layout Patterns

#### System Status Bar (new, global)

```
┌─────────────────────────────────────────────────────────────────┐
│ sys.status: relaunching · v2.0          nodes: mumbai · blr … │
└─────────────────────────────────────────────────────────────────┘
```

- Fixed black bar, ~28px tall, white monospace text
- Left: system status + version
- Right: city "nodes" list
- Replaces the current red hiatus banner

#### Main Navigation

```
┌─────────────────────────────────────────────────────────────────┐
│ [SC] selfcrafted.in    crafts  about  3dp_portal    sign_in cart[0] │
└─────────────────────────────────────────────────────────────────┘
```

- White background, bottom border
- Logo: square `SC` mark + wordmark (not the current SVG with hue filters)
- Nav links: lowercase, mono or sans
- Cart shows count in brackets: `cart[n]`
- Optional: centered search bar on browse page (see mockup 2)
- CTA on landing: `start_crafting` (solid black button)

#### Footer

```
┌─────────────────────────────────────────────────────────────────┐
│ selfcrafted.in          /explore      /community     /legal     │
│ tagline + github CTA    crafts        discord        privacy    │
│                         3dp_portal    github         shipping   │
│                         start_crafting about          refunds     │
│ © 2026 selfcrafted_india                    made_with_care // … │
└─────────────────────────────────────────────────────────────────┘
```

- Solid black background, white text
- Three link columns with `/section` headers
- Much more structured than current 3-column footer

### 2.5 Component Patterns

#### Buttons

| Variant       | Style                                                  |
| ------------- | ------------------------------------------------------ |
| **Primary**   | Solid black bg, white text, `→` arrow, slight rounding |
| **Secondary** | White bg, 1px black border, black text                 |
| **Ghost**     | Text only, underline on hover                          |

#### Product Card (browse grid)

```
┌──────────────────────┐
│ [PRODUCT]            │  ← type badge, top-left on image
│                      │
│   (product image)    │
│                      │
├──────────────────────┤
│ LorNode V2    ₹2,400 │  ← title left, price right
│ @animatrix · BLR  ★4.9│  ← maker, city, rating
└──────────────────────┘
```

#### Featured Spec Card (landing hero)

```
┌─ featured_craft.spec ───────── no.001 ─┐
│  [image]  LorNode V2                   │
│           maker: @animatrix            │
│           range: 14 km tested          │
│           stock: 7 units               │
│           rating: 4.9 / 32 reviews     │
│                              ₹2,400    │
└────────────────────────────────────────┘
```

#### Spec Sheet Box (product detail)

```
┌─ spec_sheet.txt ──────────────────────┐
│ mcu        esp32-s3                   │
│ radio      sx1262 · 865 mhz           │
│ range      14 km tested (urban)       │
│ power      120 mah lipo · usb-c       │
│ dimensions 42 × 28 × 12 mm            │
└───────────────────────────────────────┘
```

#### Filter Sidebar (browse page)

- `// category` — checkboxes with counts
- `// price_range` — dual-handle range slider
- `// city` — pill toggles (BLR, MUM, PUN, DEL, HYD)
- `// availability` — toggle switch for in-stock only

#### Product Detail Page

- Two-column hero: media left (gallery + maker card), info right (tags, title, rating, spec sheet, price, stock bar, qty, add to cart)
- Stock indicator: `stock: 7/28 units` with thin progress bar
- Trust signals: checkmark list below CTA
- Tabs: `description` | `docs & firmware` | `reviews (32)`
- Reviews in bordered cards, right column on desktop
- "Pairs well with" related products section

#### Feature Modules (landing)

- Three columns separated by vertical borders
- Corner tags: `[mod.01]`, `[mod.02]`, `[mod.03]`
- Title + one-line description each

### 2.6 Responsive Behavior (inferred)

| Breakpoint | Behavior                                                            |
| ---------- | ------------------------------------------------------------------- |
| Desktop    | Sidebar filters + 3-col product grid; two-column product detail     |
| Tablet     | 2-col grid; filters collapse to drawer/sheet                        |
| Mobile     | Single column; hamburger nav; filter drawer; stacked product detail |

---

## 3. Current State vs Target State

### 3.1 Theme

| Aspect         | Current                                     | Target                                   |
| -------------- | ------------------------------------------- | ---------------------------------------- |
| Color mode     | Dark (`#0c0c0c` bg)                         | Light (`#FAFAFA` / white)                |
| Accent         | Cyan-blue `hsl(205, 100%, 75%)`             | None — black is the accent               |
| Section colors | Per-route hue (orange/cyan/red/blue/green)  | Removed entirely                         |
| Background FX  | Noise texture + glow orb + smoke            | Dot grid in hero only                    |
| Cards          | Dark `#151515`, glow borders, `rounded-2xl` | White, 1px border, subtle radius         |
| Buttons        | Accent-colored, glow effects (`GlowButton`) | Black/white, no glow                     |
| Icons          | Phosphor duotone via Iconify                | Minimal line icons (Lucide), mono weight |

### 3.2 Information Architecture

| Page            | Current Route                            | Target                                                |
| --------------- | ---------------------------------------- | ----------------------------------------------------- |
| Landing / hero  | `/` (also shows product grid)            | `/` — hero, features, fresh listings only             |
| Browse / filter | `/` (same page, client-side filter tabs) | `/crafts` — sidebar filters, search, pagination, sort |
| Product detail  | `/[craft_name]/craft/item=[item]`        | Same route, full redesign                             |
| About           | `/about`                                 | `/about` — restyle                                    |
| Start crafting  | `/crafting`                              | `/crafting` or linked from `start_crafting` CTA       |
| 3DP portal      | `/3dp-portal`                            | `/3dp-portal` — restyle (functionality preserved)     |
| Cart / checkout | `/(cart)/*`                              | Same routes, restyle                                  |
| Auth / profile  | `/user/*`                                | Same routes, restyle                                  |
| Policies        | `/policy`                                | `/policy` — restyle                                   |

**Key IA change:** Split homepage into **landing page** + **browse page**. This is a routing + data-loading refactor, not just CSS.

### 3.3 Features in Mockups Not in Codebase

| Feature                   | Exists?                                  | Work Required                                           |
| ------------------------- | ---------------------------------------- | ------------------------------------------------------- |
| System status bar         | No                                       | New component                                           |
| Global search bar         | No                                       | New UI + search backend (products, makers)              |
| City filter pills         | No                                       | Needs `city` field on products/users + query            |
| Price range slider        | No                                       | Client/server filter on price                           |
| Sort (newest, etc.)       | No                                       | Query param + Supabase ordering                         |
| Pagination                | No                                       | Server-side pagination on product list                  |
| `spec_sheet.txt` display  | Partial (product has fields, no spec UI) | New component + possibly DB schema for structured specs |
| Stock progress bar        | Partial (stock count exists)             | New UI component                                        |
| Maker profile card on PDP | Partial (author info exists)             | New component with shop link                            |
| Favorites / heart button  | No                                       | New feature (DB table + auth)                           |
| `docs & firmware` tab     | Partial (documentation field exists)     | Tab restructure                                         |
| Dot grid background       | No                                       | CSS pattern utility                                     |
| Fresh listings section    | Partial (product grid exists)            | Curated/recent query + new section                      |
| Featured craft spec card  | No                                       | New component + admin/banner config                     |

---

## 4. Surface Area of Changes

### 4.1 By Layer

```
┌─────────────────────────────────────────────────────────────┐
│  DESIGN TOKENS & GLOBAL CSS                    ████████████ │  High
├─────────────────────────────────────────────────────────────┤
│  LAYOUT SHELL (status bar, nav, footer)        ████████████ │  High
├─────────────────────────────────────────────────────────────┤
│  COMPONENT LIBRARY (shadcn + custom)           ██████████░░ │  High
├─────────────────────────────────────────────────────────────┤
│  PUBLIC PAGES (landing, browse, PDP, about)  ████████████ │  Very High
├─────────────────────────────────────────────────────────────┤
│  COMMERCE (cart, checkout, summary)          ████████░░░░ │  Medium-High
├─────────────────────────────────────────────────────────────┤
│  USER / AUTH / PROFILE                       ████████░░░░ │  Medium-High
├─────────────────────────────────────────────────────────────┤
│  3DP PORTAL                                  ██████████░░ │  High (large files)
├─────────────────────────────────────────────────────────────┤
│  DATA LAYER / SUPABASE                       ██████░░░░░░ │  Medium
├─────────────────────────────────────────────────────────────┤
│  TECH DEBT / DEPS / TYPES                    ████████░░░░ │  Medium-High
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Files Directly Impacted (by category)

#### Must rewrite or heavily refactor (20+ files)

- `src/routes/+layout.svelte` (473 lines) — extract shell, remove dark theme logic
- `src/routes/+page.svelte` (641 lines) — split into landing page
- **NEW** `src/routes/crafts/+page.svelte` — browse page with filters
- `src/routes/product_list.svelte` — grid wrapper with new layout
- `src/lib/components/product/product_item.svelte` — full card redesign
- `src/routes/[craft_name]/craft/item=[item]/+page.svelte` (1,083 lines) — PDP overhaul
- `src/routes/about/+page.svelte` (268 lines)
- `src/routes/crafting/+page.svelte` (388 lines)
- `src/routes/(cart)/cart/+page.svelte` (515 lines)
- `src/routes/(cart)/checkout/+page.svelte` (444 lines)
- `src/routes/user/sign/+page.svelte` (400 lines)
- `src/routes/user/(authenticated)/profile/*` (4 pages, ~1,400 lines total)
- `src/app.css` — complete token rewrite
- `tailwind.config.js` + `colors.ts` — consolidate, light theme

#### Must restyle (moderate changes, 15+ files)

- `src/routes/3dp-portal/+page.svelte` (1,107 lines)
- `src/routes/3dp-portal/+layout.svelte`
- `src/routes/3dp-portal/AvailableMakers.svelte` (417 lines)
- `src/routes/3dp-portal/(authenticated)/*` (4 pages, ~2,900 lines)
- `src/routes/(cart)/summary/*` (3 pages)
- `src/routes/policy/+page.svelte` (173 lines)
- All `src/lib/components/ui/*` shadcn primitives (theming)
- `src/lib/components/fundamental/*` (11 components)
- `src/lib/components/maker/*` (7 components)
- `src/lib/components/common/*` (2 components)

#### New components to create (~15–20)

- `SystemStatusBar.svelte`
- `SiteHeader.svelte`
- `SiteFooter.svelte`
- `Breadcrumbs.svelte`
- `SearchBar.svelte`
- `ProductCard.svelte` (replaces `product_item.svelte`)
- `SpecSheet.svelte`
- `FeaturedCraftCard.svelte`
- `MakerCard.svelte`
- `StockBar.svelte`
- `FilterSidebar.svelte`
- `CityPills.svelte`
- `PriceRangeSlider.svelte`
- `FeatureModule.svelte`
- `ReviewCard.svelte`
- `Pagination.svelte`
- `DotGrid.svelte` (background utility)
- `TagBadge.svelte` (PRODUCT / SPARE / FLEA)
- `TrustSignals.svelte`

#### Can delete after migration

- `src/libs/` (entire legacy directory)
- `src/lib/components/effects/Smoke.svelte`
- `src/lib/components/fundamental/GlowButton.svelte`
- `src/lib/components/ui/Drawer.svelte` (custom, duplicate of vaul drawer)
- `src/lib/components/fundamental/test.svelte`
- Section color logic in layout
- `src/routes/styles.css` (legacy font declarations, merge into app.css)

### 4.3 shadcn-svelte Components Needing Theme Update

All primitives inherit from CSS variables. Once tokens are updated, most adapt automatically, but these need explicit review:

| Component       | Notes                                                 |
| --------------- | ----------------------------------------------------- |
| Button          | New variants: primary-black, secondary-outline, ghost |
| Badge           | Mono styling, type tags (PRODUCT/SPARE/FLEA)          |
| Card            | White bg, 1px border, no shadow                       |
| Tabs            | Underline style (not pill)                            |
| Dialog / Drawer | Light theme, border-based                             |
| Select          | Light dropdown styling                                |
| Accordion       | Used on PDP, restyle                                  |
| Separator       | Gray `#E5E5E5`                                        |
| Textarea        | Light input styling                                   |

---

## 5. Phase 0 — Foundation & Sanitation

> **Goal:** Clean codebase so the redesign isn't built on sand.  
> **Duration:** ~1 week  
> **Priority:** Do this first, in parallel with design token work.

### 5.1 Dependency Cleanup

| Action   | Package                               | Reason                               |
| -------- | ------------------------------------- | ------------------------------------ |
| Remove   | `@melt-ui/svelte`                     | Unused (bits-ui used)                |
| Remove   | `svelte-exmarkdown`                   | Unused (snarkdown used)              |
| Remove   | `rehype-raw`                          | Unused                               |
| Remove   | `shader`                              | Unused                               |
| Remove   | `mdsvex`                              | Not configured                       |
| Remove   | `lucide-svelte`                       | Duplicate of `@lucide/svelte`        |
| Pick one | `@iconify/svelte` vs `@lucide/svelte` | Standardize on Lucide for new design |
| Evaluate | `svelte-sonner`                       | Remove if keeping custom Toast       |
| Evaluate | `vaul-svelte@next`                    | Upgrade to stable or keep with pin   |
| Update   | `tailwind-variants@0.1.20`            | Very outdated                        |

### 5.2 Structural Cleanup

- [ ] **Delete `src/libs/`** — legacy Svelte 4 components, duplicate assets
- [ ] **Fix `svelte.config.js` alias** — `$lib` should point to `src/lib` (not `src/libs`)
- [ ] **Remove duplicate assets** — fonts, SVGs exist in both `lib` and `libs`
- [ ] **Delete empty/stub files:**
  - `src/lib/server/auth.ts`
  - `src/lib/client/colors.ts`
  - `src/routes/user/database.types.ts` (regenerate instead)
  - `supabase/seed.sql`
- [ ] **Fix `scgreen`** — referenced in layout but undefined in tailwind config
- [ ] **Remove dead imports** — `Turtle` in `postLogin.ts`, `mod` from `three/tsl`

### 5.3 Svelte 5 Migration Completion

Files still using legacy patterns:

| Pattern                 | Files                                                    |
| ----------------------- | -------------------------------------------------------- |
| `svelte/legacy` `run()` | `+layout.svelte`, `+page.svelte`, cart layout            |
| `$app/stores`           | `+layout.svelte`, PDP, checkout, 3dp pages, cart summary |
| `createEventDispatcher` | `ColorPicker.svelte`, `ModelViewer.svelte`               |

- [ ] Replace all `run()` with `$derived` / `$effect`
- [ ] Migrate `$app/stores` → `$app/state` everywhere
- [ ] Replace `createEventDispatcher` with callback props

### 5.4 Type Safety

Current: **34 errors, 82 warnings** from `svelte-check`.

| Category            | Examples                                             | Fix                                 |
| ------------------- | ---------------------------------------------------- | ----------------------------------- |
| Missing env vars    | `SUPABASE_KEY`, `PUBLIC_RAZORPAY_ID`, etc.           | Create `.env.example`, fix imports  |
| Route params typing | `Property 'id' does not exist on type 'RouteParams'` | Regenerate types / fix param access |
| Nullability         | `HTMLDivElement \| undefined` assignments            | Add guards or `!` assertions        |
| bits-ui API         | `portal` prop, `bind:` on non-bindable               | Update to current bits-ui API       |
| Return types        | `boolean` vs `CResult<string>`                       | Fix function signatures             |

- [ ] Generate Supabase types: `supabase gen types typescript`
- [ ] Create `.env.example` with all required variables
- [ ] Fix all 34 type errors (blocker for CI)
- [ ] Triage 82 warnings (unused CSS, `@apply` in components)

### 5.5 Extract Layout Shell

Current: all nav/footer/banner logic is inline in `+layout.svelte` (473 lines).

- [ ] Extract `SystemStatusBar.svelte`
- [ ] Extract `SiteHeader.svelte` (desktop nav + mobile drawer)
- [ ] Extract `SiteFooter.svelte`
- [ ] Remove hiatus banner (replaced by status bar messaging)
- [ ] Remove section color theming (`primaryColor`, `filter`, hue-rotate)
- [ ] Remove noise background + accent glow orb (or make opt-in)

---

## 6. Phase 1 — Design System & Shell

> **Goal:** Establish tokens, typography, and core components so pages can be built consistently.  
> **Duration:** ~1–1.5 weeks

### 6.1 Design Tokens

Replace the current dual-token system (`app.css` variables + `colors.ts` + hardcoded hex) with a single source of truth.

**New token file:** `src/lib/design/tokens.css` (or update `app.css`)

```css
:root {
	/* Surfaces */
	--sc-bg: #fafafa;
	--sc-surface: #ffffff;
	--sc-surface-raised: #ffffff;
	--sc-border: #e5e5e5;
	--sc-border-strong: #000000;

	/* Text */
	--sc-text: #000000;
	--sc-text-secondary: #666666;
	--sc-text-muted: #999999;

	/* Interactive */
	--sc-primary: #000000;
	--sc-primary-text: #ffffff;
	--sc-focus: #000000;

	/* Status */
	--sc-success: #16a34a;
	--sc-error: #dc2626;
	--sc-warning: #d97706;

	/* Typography */
	--sc-font-sans: 'Figtree', system-ui, sans-serif;
	--sc-font-mono: 'JetBrains Mono', 'Fira Code', monospace;

	/* Spacing scale, radius, etc. */
	--sc-radius: 6px;
	--sc-radius-sm: 4px;
	--sc-radius-lg: 8px;
}
```

- [ ] Define all tokens
- [ ] Map to Tailwind `@theme` (v4 syntax)
- [ ] Remove `colors.ts` SC brand palette (or repurpose for semantic only)
- [ ] Remove all hardcoded hex from components (grep found 40+ files)
- [ ] Add `dot-grid` CSS utility
- [ ] Add mono text utility class (`font-mono`, `text-mono-label`)

### 6.2 Typography Setup

- [ ] Keep Figtree as sans (already loaded)
- [ ] Add JetBrains Mono (or chosen mono) via `@font-face` or npm
- [ ] Remove Orkney (barely used)
- [ ] Define type scale: display, h1, h2, h3, body, mono-label, mono-data
- [ ] Remove `src/routes/styles.css` legacy declarations

### 6.3 Core Component Library

Build these before touching pages:

| Component              | Priority | Notes                                |
| ---------------------- | -------- | ------------------------------------ |
| `ScButton`             | P0       | Wrap shadcn Button with new variants |
| `ScCard`               | P0       | White, bordered                      |
| `ScBadge` / `TagBadge` | P0       | PRODUCT, SPARE, FLEA, OPEN HARDWARE  |
| `ScInput`              | P0       | Light input for search, forms        |
| `Breadcrumbs`          | P0       | Used on every inner page             |
| `Pagination`           | P1       | Browse page                          |
| `DotGrid`              | P1       | Hero background                      |
| `SpecSheet`            | P1       | Key brand component                  |
| `StockBar`             | P1       | Progress bar                         |
| `ReviewCard`           | P1       | PDP + future use                     |
| `TrustSignals`         | P2       | Checkmark list                       |

### 6.4 Shell Assembly

- [ ] Wire up `SystemStatusBar` + `SiteHeader` + `SiteFooter` in `+layout.svelte`
- [ ] Implement responsive mobile nav (keep vaul drawer, restyle)
- [ ] Implement `cart[n]` count display
- [ ] Remove dark mode entirely (or keep as future opt-in, but deprioritize)
- [ ] Verify all route groups inherit the new shell

---

## 7. Phase 2 — Public Pages

> **Goal:** The pages users see first — landing, browse, product detail, about.  
> **Duration:** ~2–3 weeks

### 7.1 Landing Page (`/`)

**Current:** Banner carousel + product grid + feature cards + smoke effect  
**Target:** Hero + feature modules + fresh listings

| Section             | Work                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------ |
| Hero                | Dot grid bg, headline, subtext, CTAs (`browse_crafts →`, `start_selling`), stats row |
| Featured craft card | New `FeaturedCraftCard` component, pull from banner config or top product            |
| Feature modules     | 3-column `[mod.0n]` cards with vertical dividers                                     |
| Fresh listings      | 3–6 recent products using new `ProductCard`                                          |
| Remove              | Banner carousel, smoke effect, inline product grid, client-side filter tabs          |

- [ ] Rewrite `+page.svelte` (or create new, move old logic to `/crafts`)
- [ ] Update `+page.ts` load function (remove full product fetch, add featured + recent)
- [ ] Wire CTAs to `/crafts` and `/crafting`

### 7.2 Browse Page (`/crafts`) — NEW ROUTE

**Current:** Does not exist as separate page (filtering happens on `/`)  
**Target:** Full browse experience per mockup 2

| Feature         | Work                                                              |
| --------------- | ----------------------------------------------------------------- |
| Route           | Create `src/routes/crafts/+page.svelte` + `+page.ts`              |
| Search          | Header search bar (can be global component), filter by name/maker |
| Sidebar filters | `FilterSidebar` with category, price, city, availability          |
| Product grid    | 3-col responsive, new `ProductCard`                               |
| Sort            | Dropdown: newest, price low-high, price high-low, rating          |
| Pagination      | Server-side with page param, ~12–18 per page                      |
| Results count   | "128 results · sort: newest"                                      |
| Breadcrumbs     | `home / crafts`                                                   |

- [ ] Create route and server load with filter query params
- [ ] Build `FilterSidebar.svelte`
- [ ] Build `CityPills.svelte`
- [ ] Build `PriceRangeSlider.svelte`
- [ ] Build `Pagination.svelte`
- [ ] Build `SearchBar.svelte`
- [ ] Update Supabase query to support: type, price range, city, in_stock, sort, pagination
- [ ] Redirect old `/` filter behavior to `/crafts?filter=...`

### 7.3 Product Detail Page

**Current:** 1,083-line monolith with glow effects, dark cards, modals  
**Target:** Clean two-column layout per mockup 3

| Section              | Work                                         |
| -------------------- | -------------------------------------------- |
| Breadcrumbs          | `home / crafts / products / {slug}`          |
| Image gallery        | Main image + thumbnail row + "+N more"       |
| Maker card           | Avatar, name, location, stats, `view_shop →` |
| Tags                 | PRODUCT, category tags (LORA/MESH)           |
| Title + social proof | Rating, review count, sold count             |
| Spec sheet           | `SpecSheet` component from product data      |
| Price + stock        | Large price, `StockBar`, qty selector        |
| CTA                  | `add_to_cart →` + heart/favorite             |
| Trust signals        | Shipping, replacement, support               |
| Tabs                 | description, docs & firmware, reviews        |
| Reviews              | `ReviewCard` list                            |
| Related              | "Pairs well with" using `ProductCard`        |

- [ ] Break `+page.svelte` into sub-components (currently 1,083 lines)
- [ ] Remove glow/mouse-tracking effects on status tags
- [ ] Restyle variant selector, accordion
- [ ] Restyle review modal/form
- [ ] Add structured spec data (may need DB column or JSON field)

### 7.4 About Page (`/about`)

- [ ] Restyle to light theme
- [ ] Update crafter tier visualization (remove gradient SVG icons)
- [ ] Align typography and spacing with new system

### 7.5 Crafting Page (`/crafting`)

- [ ] Restyle to light theme
- [ ] Remove or simplify canvas animation
- [ ] Align with `start_crafting` CTA from landing

### 7.6 Policy Page (`/policy`)

- [ ] Restyle markdown content rendering
- [ ] Update `roadmap.svelte` component styling

---

## 8. Phase 3 — Commerce Flow

> **Goal:** Cart, checkout, and payment confirmation pages match new design.  
> **Duration:** ~1 week

### 8.1 Cart (`/cart`)

- [ ] Restyle line items (white cards, mono metadata)
- [ ] Update quantity controls
- [ ] Restyle subtotal/shipping summary
- [ ] Fix stock race condition (from TODO: can add to cart when out of stock)

### 8.2 Checkout (`/checkout`)

- [ ] Restyle address selection
- [ ] Restyle payment section (Razorpay)
- [ ] Fix env var type errors for Razorpay keys

### 8.3 Order Summary (`/summary/*`)

- [ ] Success page restyle
- [ ] Failure page restyle
- [ ] Fix or remove stub `/summary` 404 page

### 8.4 Cart Layout

- [ ] Restyle `(cart)/+layout.svelte` (currently minimal)
- [ ] Consider checkout step indicator (commented out in current code)

---

## 9. Phase 4 — User & Auth

> **Goal:** Sign-in, profile, and account pages match new design.  
> **Duration:** ~1–1.5 weeks

### 9.1 Sign In (`/user/sign`)

- [ ] Full restyle (remove smoke effect, dark card, glow inputs)
- [ ] Light form styling
- [ ] Google OAuth button restyle

### 9.2 Profile Layout

- [ ] Restyle tab nav (orders, address, account, crafts)
- [ ] Remove orange section theming

### 9.3 Profile Pages

| Page      | Lines | Work                                   |
| --------- | ----- | -------------------------------------- |
| Account   | 271   | Restyle forms, password change         |
| Addresses | 397   | Restyle CRUD, address input components |
| Orders    | 363   | Restyle order cards                    |
| Crafts    | ~200  | Restyle user's published products      |

### 9.4 Profile Fixes

- [ ] Fix stub `profile/+page.svelte` (currently shows "Error")
- [ ] Username auto-generation for Google login (from TODO)
- [ ] Profile picture upload (from TODO)

---

## 10. Phase 5 — 3DP Portal (FABBLY)

> **Goal:** Restyle the largest, most complex section without breaking functionality.  
> **Duration:** ~2–3 weeks

This is the highest-risk area due to file size and complexity.

### 10.1 File Size Reality

| File                                                 | Lines | Complexity                                     |
| ---------------------------------------------------- | ----- | ---------------------------------------------- |
| `3dp-portal/+page.svelte`                            | 1,107 | STL upload, 3D preview, config, maker matching |
| `3dp-portal/(authenticated)/user/[id]/+page.svelte`  | 1,024 | Quote, payment, chat, reviews                  |
| `3dp-portal/(authenticated)/maker/[id]/+page.svelte` | 844   | Order management, quoting, chat                |
| `ModelViewer.svelte`                                 | 1,037 | Three.js STL renderer                          |
| `AvailableMakers.svelte`                             | 417   | Maker matching UI                              |
| `ColorPicker.svelte`                                 | 453   | Filament color selection                       |
| `MessageBoard.svelte`                                | 470   | Chat UI                                        |
| `OrderManagement.svelte`                             | 392   | Maker order workflow                           |
| `FilamentManagement.svelte`                          | 376   | Filament CRUD                                  |

### 10.2 Approach

**Do NOT rewrite functionality.** Restyle in place, extract components where possible.

- [ ] Restyle portal layout tabs (FABBLY / User / Maker)
- [ ] Restyle public quote page (upload, config, preview)
- [ ] Restyle `AvailableMakers` component
- [ ] Restyle user print request list + detail
- [ ] Restyle maker portal + order management
- [ ] Restyle chat (`MessageBoard`)
- [ ] Restyle filament management modals
- [ ] Fix mobile color picker (from TODO)
- [ ] Fix STL error handling (from TODO)
- [ ] Fix infill display bug (from TODO)

### 10.3 Component Extraction (recommended)

Break monolith pages into:

- `PrintRequestConfig.svelte`
- `PrintRequestStatus.svelte`
- `QuotePanel.svelte`
- `ChatPanel.svelte`
- `MakerDashboard.svelte`

This is valuable even beyond the redesign — current pages are unmaintainable at 1,000+ lines.

---

## 11. Phase 6 — Data, Backend & New Features

> **Goal:** Support mockup features that need backend work.  
> **Duration:** ~1–2 weeks (can overlap with Phase 2)

### 11.1 Database Schema Additions

| Feature          | Schema Change                                              |
| ---------------- | ---------------------------------------------------------- |
| City filter      | `city` column on `products` or join through `users`        |
| Structured specs | `specs JSONB` column on `products`                         |
| Favorites        | New `favorites` table (user_id, product_id)                |
| Full-text search | Supabase FTS index on `products.name`, `users.username`    |
| Sort by newest   | Ensure `created_at` column exists and is indexed           |
| Sold count       | `sold_count` column or derived from `purchases`            |
| Product slug     | `slug` column for clean URLs (replace `item=[id]` pattern) |

### 11.2 Supabase Tasks

- [ ] Generate TypeScript types from schema
- [ ] Add RLS policies for new tables (favorites)
- [ ] Create RPC for paginated product search with filters
- [ ] Review and update `constants` table for featured craft config
- [ ] Seed data for development

### 11.3 API / Server Work

- [ ] Paginated product query in `crafts/+page.ts`
- [ ] Search endpoint or client-side FTS
- [ ] Fix `/user/pincode` misnamed route
- [ ] Environment variable documentation (`.env.example`)

---

## 12. Phase 7 — QA, Performance & Launch

> **Duration:** ~1 week

### 12.1 Testing

- [ ] Fix and run `svelte-check` (0 errors target)
- [ ] Run `eslint` + `prettier`
- [ ] Run existing Playwright integration tests (update selectors for new UI)
- [ ] Run Vitest unit tests
- [ ] Manual test: full purchase flow (browse → PDP → cart → checkout → payment)
- [ ] Manual test: 3DP portal flow (upload → quote → pay → chat)
- [ ] Manual test: auth flow (sign up, Google OAuth, profile)
- [ ] Cross-browser: Chrome, Firefox, Safari
- [ ] Responsive: mobile, tablet, desktop
- [ ] Accessibility audit: keyboard nav, screen reader, contrast ratios

### 12.2 Performance

- [ ] Remove unused dependencies (bundle size)
- [ ] Remove Smoke, unused effects
- [ ] Lazy-load Three.js (3DP portal only)
- [ ] Image optimization (product images)
- [ ] Verify Lighthouse scores on landing, browse, PDP

### 12.3 Launch Checklist

- [ ] Remove hiatus banner → update status bar to `sys.status: live · v2.0`
- [ ] Update meta tags, OG images
- [ ] Update favicon if needed
- [ ] Verify Razorpay production keys
- [ ] Verify Supabase production config
- [ ] Deploy to staging, full QA pass
- [ ] Deploy to production
- [ ] Monitor error logs for 48h post-launch

---

## 13. Effort Estimates

### By Phase

| Phase | Description             | Duration   | Dependencies             |
| ----- | ----------------------- | ---------- | ------------------------ |
| 0     | Foundation & sanitation | 5–7 days   | None                     |
| 1     | Design system & shell   | 7–10 days  | Phase 0                  |
| 2     | Public pages            | 10–15 days | Phase 1                  |
| 3     | Commerce flow           | 5–7 days   | Phase 1                  |
| 4     | User & auth             | 7–10 days  | Phase 1                  |
| 5     | 3DP portal              | 10–15 days | Phase 1                  |
| 6     | Data & backend          | 7–10 days  | Can start during Phase 0 |
| 7     | QA & launch             | 5–7 days   | All phases               |

### Total

| Scenario                                         | Timeline   |
| ------------------------------------------------ | ---------- |
| 1 developer, sequential                          | 8–10 weeks |
| 1 developer, aggressive                          | 6–7 weeks  |
| 2 developers (design system + pages in parallel) | 4–5 weeks  |

### Priority Order (if time-constrained)

1. **Phase 0** — can't build on broken foundation
2. **Phase 1** — everything depends on tokens + shell
3. **Phase 2.1 + 2.2 + 2.3** — landing, browse, PDP (the mockup trifecta)
4. **Phase 3** — commerce must work for launch
5. **Phase 4** — auth/profile (required for makers)
6. **Phase 6** — backend features (city filter, search can be v2.1)
7. **Phase 5** — 3DP portal (can launch with basic restyle, polish later)
8. **Phase 2.4–2.6** — about, crafting, policy (lower traffic)

---

## 14. Open Decisions

These need your input before implementation begins:

| #   | Decision                 | Options                                                            | Recommendation                                         |
| --- | ------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------ |
| 1   | **URL structure**        | Keep `/[craft_name]/craft/item=[id]` vs clean `/crafts/lornode-v2` | Clean slugs (better SEO, matches mockup breadcrumbs)   |
| 2   | **Homepage split**       | `/` = landing, `/crafts` = browse                                  | Yes — matches mockups                                  |
| 3   | **Search**               | Client-side filter vs Supabase FTS vs dedicated search             | Supabase FTS for v2.0                                  |
| 4   | **Favorites**            | Launch with heart button vs defer                                  | Defer to v2.1 (saves 2–3 days)                         |
| 5   | **Dark mode**            | Remove entirely vs keep as toggle                                  | Remove for v2.0, add later if needed                   |
| 6   | **3DP portal name**      | Keep "FABBLY" vs rebrand to `3dp_portal`                           | Keep FABBLY internally, display as `3dp_portal` in nav |
| 7   | **Mono font**            | JetBrains Mono vs IBM Plex Mono vs Fira Code                       | JetBrains Mono (pairs well with Figtree)               |
| 8   | **Icon library**         | Standardize on Lucide vs keep Iconify                              | Lucide (lighter, consistent with shadcn)               |
| 9   | **Maker shop pages**     | `/[username]` shop route vs link to filtered browse                | Defer to v2.1                                          |
| 10  | **Status bar content**   | Static vs dynamic (live stats)                                     | Static for launch, dynamic later                       |
| 11  | **Featured craft**       | Manual config vs auto (top rated)                                  | Manual via `constants` table                           |
| 12  | **Payment architecture** | Keep Razorpay vs explore maker-direct payouts                      | Keep Razorpay for v2.0 (TODO item)                     |

---

## 15. Risk Register

| Risk                                       | Impact | Likelihood | Mitigation                                                             |
| ------------------------------------------ | ------ | ---------- | ---------------------------------------------------------------------- |
| 3DP portal breaks during restyle           | High   | Medium     | Restyle only, no logic changes; test STL upload flow after each change |
| Light theme breaks shadcn components       | Medium | High       | Update CSS variables first, test all primitives before pages           |
| Product URL change breaks SEO/bookmarks    | Medium | Medium     | Add redirects from old URLs                                            |
| Missing env vars block build               | High   | High       | Create `.env.example`, fix all 34 type errors in Phase 0               |
| Scope creep (favorites, maker shops, etc.) | High   | High       | Strict defer list for v2.1                                             |
| 1,000+ line files are fragile              | High   | High       | Extract components during restyle, don't just CSS-swap                 |
| City filter needs data not in DB           | Medium | High       | Audit products table early in Phase 6                                  |
| `vaul-svelte@next` instability             | Low    | Medium     | Pin version, test mobile nav thoroughly                                |
| Razorpay integration untested              | High   | Low        | Test payment flow on staging before launch                             |

---

## 16. Appendix — File Inventory

### Route Pages (20 user-facing)

| Route                        | File                    | Lines | Redesign Level    |
| ---------------------------- | ----------------------- | ----- | ----------------- |
| `/`                          | `+page.svelte`          | 641   | Rewrite (landing) |
| `/crafts`                    | **NEW**                 | —     | New page          |
| `/[craft]/craft/item=[item]` | `+page.svelte`          | 1,083 | Heavy refactor    |
| `/about`                     | `+page.svelte`          | 268   | Restyle           |
| `/crafting`                  | `+page.svelte`          | 388   | Restyle           |
| `/policy`                    | `+page.svelte`          | 173   | Restyle           |
| `/cart`                      | `cart/+page.svelte`     | 515   | Restyle           |
| `/checkout`                  | `checkout/+page.svelte` | 444   | Restyle           |
| `/summary/success/...`       | `+page.svelte`          | ~100  | Restyle           |
| `/summary/failure/...`       | `+page.svelte`          | ~100  | Restyle           |
| `/user/sign`                 | `+page.svelte`          | 400   | Restyle           |
| `/user/profile/account`      | `+page.svelte`          | 271   | Restyle           |
| `/user/profile/addresses`    | `+page.svelte`          | 397   | Restyle           |
| `/user/profile/orders`       | `+page.svelte`          | 363   | Restyle           |
| `/user/profile/crafts`       | `+page.svelte`          | ~200  | Restyle           |
| `/3dp-portal`                | `+page.svelte`          | 1,107 | Restyle           |
| `/3dp-portal/user`           | `+page.svelte`          | ~200  | Restyle           |
| `/3dp-portal/user/[id]`      | `+page.svelte`          | 1,024 | Restyle           |
| `/3dp-portal/maker`          | `+page.svelte`          | 292   | Restyle           |
| `/3dp-portal/maker/[id]`     | `+page.svelte`          | 844   | Restyle           |

### Component Inventory (45 components)

| Directory      | Count   | Redesign Level                        |
| -------------- | ------- | ------------------------------------- |
| `ui/` (shadcn) | 13 sets | Theme update                          |
| `fundamental/` | 11      | Most need restyle or removal          |
| `maker/`       | 7       | Restyle                               |
| `product/`     | 1       | Rewrite (ProductCard)                 |
| `common/`      | 2       | Restyle                               |
| `effects/`     | 1       | Remove (Smoke)                        |
| Root           | 1       | Keep (ModelViewer, restyle container) |

### Total Svelte LOC: ~15,600

### Dependencies: 20 production + 26 dev

### Type errors: 34 | Warnings: 82

### Hardcoded hex colors: 40+ files

### Legacy Svelte 4 patterns: 13 files

---

## Next Steps

1. **Review this document** — confirm open decisions (Section 14)
2. **Approve phase order** — or adjust priorities
3. **Begin Phase 0** — dependency cleanup + type fixes + layout extraction
4. **Begin Phase 1 in parallel** — design tokens + core components

Once decisions are confirmed, implementation can start with the design system foundation while sanitation runs in parallel.
