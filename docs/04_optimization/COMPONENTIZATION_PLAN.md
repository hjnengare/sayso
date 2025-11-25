## Componentization Plan

### Largest Author Files Under `src`

| Approx. Size (KB) | Path | Notes |
| ---: | --- | --- |
| 143.3 | `src/app/components/ErrorBoundary/ErrorBoundary.tsx` | Complex fallback UI bundled into one class component. |
| 37.2 | `src/app/reviewer/[id]/page.tsx` | Reviewer profile feature page with inline styling, data shaping, and multiple UI sections. |
| 35.3 | `src/app/business/[id]/edit/page.tsx` | Business editing surface, forms, validation, and preview logic. |
| 30.7 | `src/app/business/[id]/page.tsx` | Business profile view with hero, metrics, reviews, map, and CTA blocks. |
| 27.5 | `src/app/components/Header/Header.tsx` | Monolithic header with navigation, search, notifications, responsive logic. |
| 25.2 | `src/app/profile/page.tsx` | User profile hub that mixes layout, data transforms, and UI. |
| 24.8 | `src/app/discover/reviews/page.tsx` | Discovery page mixing filtering, tabs, and card rendering. |
| 20.6 | `src/app/login/page-old.tsx` | Legacy login experience keeping multiple form variants inline. |
| 19.2 | `src/app/special/[id]/page.tsx` | Special campaign page with bespoke sections and animations. |
| 18.8 | `src/app/components/BusinessCard/BusinessCardCarousel.tsx` | Large carousel with logic, card templates, navigation controls. |

### Organism-Level Decomposition Targets

#### `src/app/reviewer/[id]/page.tsx`
- **Page Layout Shell (organism)** – handles data fetching, global styles injection, scroll state, and layout skeleton.
- **`ReviewerHero` (organism)** – encapsulates header hero (profile photo, badges, actions) composed of `ReviewerAvatar`, `ReviewerMeta`, `ReviewerActions` molecules.
- **`ReviewerStatsGrid` (organism)** – renders metrics cards using `StatCard` molecule.
- **`ReviewerInsights` (organism)** – handles achievements, badge showcase, growth insights.
- **`ReviewerReviewFeed` (organism)** – list + filters around `ReviewItem` molecule, delegates to `PremiumReviewCard` where applicable.
- **`ScrollToTopButton` (molecule)** – reusable floating control observing scroll state.
- Move animation CSS into colocated module or global stylesheet slice; export animation class helpers as tokens.

#### `src/app/business/[id]/page.tsx`
- **`BusinessPageLayout` (organism)** – orchestrates sections, context providers, and data shaping.
- **`BusinessHero` (organism)** – large hero with gallery, rating summary, CTAs.
- **`BusinessHighlights` (organism)** – renders statistics badges, trending info, social proof.
- **`BusinessReviewsSection` (organism)** – wraps review filters + list, reuses card molecules.
- **`BusinessLocationSection` (organism)** – map, directions, hours (extract map widget molecule).
- **`BusinessActionsBar` (molecule)** – share/save/contact controls.
- Factor out utility hooks (e.g., scroll watchers, responsive detection) into `src/app/hooks`.

#### `src/app/business/[id]/edit/page.tsx`
- **`BusinessEditLayout` (organism)** – layout scaffold with breadcrumb, tabs, contextual help.
- **`BusinessDetailsForm` (organism)** – core form composed of fieldset molecules (`BusinessBasicsFields`, `OperatingHoursFields`, `MediaUploader`).
- **`BusinessPreviewPanel` (organism)** – live preview / validation summary separated from form logic.
- **`FormToolbar` (molecule)** – save, publish, discard actions with status indicators.
- Extract validation schemas/utilities into `lib/validation/business`.

#### `src/app/components/Header/Header.tsx`
- **`AppHeader` (organism)** – orchestrates responsive layout and interactions.
- **`PrimaryNav` (organism)** – navigation list built from `NavLink` molecules.
- **`HeaderSearch` (molecule)** – search input, suggestions dropdown.
- **`UserMenu` (molecule)** – profile avatar dropdown and notifications.
- **`MobileHeader` (organism)** – handles hamburger menu, overlays, uses shared atoms.
- Move scroll and collapse logic into dedicated hook `useHeaderBehavior`.

#### `src/app/profile/page.tsx`
- **`ProfilePageLayout` (organism)** – top-level container and data loader.
- **`ProfileHero` (organism)** – avatar, stats, action buttons.
- **`ProfileTabs` (organism)** – tab switcher built from `ProfileTab` molecule.
- **`ProfileActivityFeed` (organism)** – feed list with pagination.
- **`ProfileCollections` (organism)** – saved lists, favorites, etc., leveraging card molecules.

#### `src/app/discover/reviews/page.tsx`
- **`DiscoverReviewsLayout` (organism)** – root layout and data context.
- **`DiscoverFiltersBar` (organism)** – filter chips, sort dropdown, search.
- **`DiscoverReviewGrid` (organism)** – grid/list display of review cards (reusing `ReviewCard` molecules).
- **`TrendSpotlight` (molecule)** – highlight block for trending topics.
- Extract static copy/data into `data/discover` for reuse.

#### `src/app/components/BusinessCard/BusinessCardCarousel.tsx`
- **`BusinessCardCarousel` (organism)** – wrapper that manages scroll, autoplay, responsiveness.
- **`CarouselControls` (molecule)** – next/prev buttons, pagination dots.
- **`BusinessCard` (organism)** – card housing image, rating, summary built from atoms.
- Move animation and measurement helpers into `hooks/useCarousel`.

### Cross-Cutting Steps

- Define shared atoms (typography, buttons, badges) under `src/app/components/ui`.
- Adopt folder-by-component structure (`ComponentName/index.tsx`, `ComponentName.styles.ts`, `ComponentName.types.ts`).
- Add Storybook or Docs page for each new organism to ensure design consistency.
- Update import paths to use barrel files for new organisms/molecules.
- Write unit tests for extracted hooks and molecules; integrate visual regression coverage for top organisms.

