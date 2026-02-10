# CLAUDE.md — Sayso

This file defines **how Claude must operate inside the Sayso codebase**.
Follow this before writing code, suggesting architecture, or changing behavior.

---

## Project Summary

**Sayso** is a premium local-business discovery & review platform.

Core features:
- Personalized "For You" feed
- Trending / Explore discovery
- Business profiles (reviews, images, maps)
- Business claiming & verification
- Gamification (badges, notifications)
- Onboarding that powers personalization

Cape Town first, designed to scale.

---

## Stack (assume by default)

Frontend:
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion
- Lucide-React
- Mapbox

Backend:
- Supabase (Postgres, Auth, Storage)
- RLS-first security
- SQL migrations for schema changes

---

## Hard Rules (Do Not Break)

### RLS
- Assume RLS is enabled everywhere
- Never disable RLS to fix bugs
- Privileged logic → server routes / edge functions only
- Every new table requires explicit RLS policies

### Onboarding
- Onboarding must never:
  - require refresh
  - lose state
  - infinite-redirect
  - get stuck behind loaders
- If onboarding logic changes, routing and guards must be deterministic

### UI Consistency
- Reuse existing components and spacing
- No random animations or styles
- Motion must be subtle and purposeful
- **Never use `text-xs`** — minimum font size is `text-sm`, prefer `text-base` for readability

### Data & Types
- No `any`
- Explicit TS types for queries, RPCs, aggregates

---

## Conventions

- Components: `PascalCase`
- Hooks: `useSomething`
- Utils: `camelCase`
- DB tables/columns/functions: `snake_case`
- Match existing folder structure — don't invent new ones

---

## Core Data Concepts

Common tables:
- businesses
- business_images
- reviews
- review_images
- user_interests
- user_subcategories
- user_dealbreakers
- business_claims
- notifications
- user_badges

Patterns:
- Aggregated ratings & review counts
- Personalization scoring
- Storage-backed images with policies

---

## Business Claiming Rules

Verification tiers:

1. **Fast**
   - Business email OR phone OTP
   - Auto-verify only if email domain matches website domain
   - No gmail/yahoo/outlook auto-verify

2. **CIPC**
   - Registration number + company name
   - Manual review, no documents

3. **Last resort docs**
   - Letter on business letterhead (authorization)
   - Lease agreement (first page only, personal info removed)

Never store unnecessary personal data.

---

## Personalization

- Must be stable, explainable, non-janky
- Avoid negative or shaming UI insights
- Heavy logic should be memoized or server-side
- Version scoring logic when changing behavior

---

## Discovery diversity (Featured & Trending)

**Diversity is a first-class constraint, not a post-process filter.**

- **Featured** = curated / quality + credibility. Pick the **best per category** (bucket), then show. No global “top N” then group by category — that lets one category dominate.
- **Trending** = momentum / velocity (recent activity). Same rule: request a large pool, take **top N per category**, then limit and interleave so the feed is diverse.
- Do not rank globally then “diversify” after; apply **per-category ranking (or top-per-category selection) before** applying the final limit.
- Headings like “Featured by Category” / “Trending Now” must match the data: category variety must come from the selection logic, not only from UI grouping.

---

## Maps (Mapbox)

- Business markers on For You / Trending
- Cluster when dense
- Clicking marker → preview or profile
- Do not re-init map on every render
- Memoize GeoJSON sources

---

## Auth & Guards

- Supabase Auth is source of truth
- Always handle:
  - loading
  - unauthenticated
  - token refresh
- Guards must not loop or block valid users

---

## Environment Variables

Common:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY (server only)
- NEXT_PUBLIC_MAPBOX_TOKEN

Never expose service role keys.

---

## How Claude Should Work

When implementing changes:
1. Identify user-visible problem
2. Find root cause (UI / data / RLS / routing)
3. Apply smallest safe fix
4. Keep diffs minimal
5. Explain what changed and why

Avoid large rewrites unless explicitly asked.

---

## Output Expectations

- Prefer full file replacements for complex changes
- Otherwise provide clean, scoped diffs
- Include migrations when schema changes
- No hand-waving setup steps
- No new libraries without justification

---

## Absolute "Do Not"

- Disable RLS
- Store sensitive documents by default
- Introduce inconsistent UI patterns
- Leak secrets to the client
- Make breaking schema changes without migrations

---

If something is ambiguous:
- make the safest reversible assumption
- document it
- proceed
