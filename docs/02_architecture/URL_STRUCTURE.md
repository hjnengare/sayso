# KLIO URL Structure Documentation

This document provides a comprehensive overview of all routes in the KLIO application.

## Table of Contents
- [Public Routes](#public-routes)
- [Authentication Routes](#authentication-routes)
- [Onboarding Routes](#onboarding-routes)
- [Protected Routes](#protected-routes)
- [Dynamic Routes](#dynamic-routes)
- [API Routes](#api-routes)
- [Admin/Development Routes](#admindevelopment-routes)
- [Empty/Placeholder Directories](#emptyplaceholder-directories)

---

## Public Routes

These routes are accessible without authentication.

### Home & Discovery
- `/` - Root route (redirects to `/home`)
- `/home` - Home page (requires auth - see middleware)
- `/explore` - Explore businesses page
- `/for-you` - Personalized recommendations
- `/trending` - Trending businesses
- `/events-specials` - Events and specials listing
- `/leaderboard` - Leaderboard page (requires auth)
- `/deal-breakers` - Deal breakers page
- `/subcategories` - Subcategories listing
- `/interests` - User interests selection (requires auth)
- `/discover/reviews` - Discover reviews page

### Business Pages
- `/business/[id]` - Business profile page (dynamic)
- `/business/[id]/edit` - Edit business page (dynamic, owner only)
- `/business/[id]/review` - Write review for business (dynamic)
- `/business/login` - Business login page
- `/business/verification-status` - Business verification status page

### Event Pages
- `/event/[id]` - Event detail page (dynamic)
- `/special/[id]` - Special detail page (dynamic)

### Reviewer Pages
- `/reviewer/[id]` - Reviewer profile page (dynamic)

### Messaging
- `/dm` - Direct messages list (requires auth)
- `/dm/[id]` - Individual DM conversation (dynamic, requires auth)

---

## Authentication Routes

These routes handle user authentication.

- `/login` - User login page
- `/register` - User registration page
- `/onboarding` - Onboarding welcome page
- `/forgot-password` - Password reset request
- `/reset-password` - Password reset form
- `/verify-email` - Email verification page
- `/auth/callback` - OAuth callback handler (API route)
- `/auth/auth-code-error` - Auth error page

---

## Onboarding Routes

These routes are part of the onboarding flow (protected - require auth).

- `/interests` - Select user interests (Step 1)
- `/subcategories` - Select subcategories (Step 2)
- `/deal-breakers` - Select deal breakers (Step 3)
- `/complete` - Onboarding completion page

**Middleware Notes:**
- Protected routes require authentication AND email verification
- Unauthenticated users accessing protected routes are redirected to `/onboarding`
- Authenticated users without email verification are redirected to `/verify-email`
- Authenticated users on auth pages are redirected to `/interests` (if verified) or `/verify-email` (if not verified)

---

## Protected Routes

These routes require authentication and email verification.

### User Pages
- `/profile` - User profile page
- `/saved` - Saved items page
- `/write-review` - Write a review page

### Content Pages
- `/home` - Home feed
- `/explore` - Explore businesses
- `/for-you` - Personalized recommendations
- `/trending` - Trending content
- `/leaderboard` - Leaderboard
- `/events-specials` - Events and specials
- `/dm` - Direct messages
- `/dm/[id]` - Individual conversation
- `/reviewer/[id]` - Reviewer profile

---

## Dynamic Routes

Routes with dynamic parameters (e.g., `[id]`).

### Business Routes
- `/business/[id]` - View business profile
  - Example: `/business/123`
  
- `/business/[id]/edit` - Edit business (owner only)
  - Example: `/business/123/edit`
  
- `/business/[id]/review` - Write review for business
  - Example: `/business/123/review`

### Event Routes
- `/event/[id]` - Event detail page
  - Example: `/event/456`

- `/special/[id]` - Special detail page
  - Example: `/special/789`

### Reviewer Routes
- `/reviewer/[id]` - Reviewer profile page
  - Example: `/reviewer/user-123`

### Messaging Routes
- `/dm/[id]` - Individual DM conversation
  - Example: `/dm/conversation-456`

---

## API Routes

### Authentication API
- `GET/POST /api/auth/rate-limit` - Rate limiting for auth endpoints

### Business API
- `GET/POST /api/businesses` - List/create businesses
- `GET/PUT/DELETE /api/businesses/[id]` - Get/update/delete business (dynamic)
- `POST /api/businesses/seed` - Seed businesses (development)
- `POST /api/businesses/update-images` - Update business images

### Reviews API
- `GET/POST /api/reviews` - List/create reviews

### User API
- `GET/PUT /api/user/preferences` - Get/update user preferences
- `GET/PUT /api/user/onboarding` - Get/update onboarding status
- `GET/PUT /api/user/subcategories` - Get/update user subcategories
- `GET/PUT /api/user/deal-breakers` - Get/update user deal breakers
- `GET/PUT /api/user/interests` - Get/update user interests (if implemented)
- `POST /api/user/delete-account` - Delete user account
- `POST /api/user/deactivate-account` - Deactivate user account

### Categories & Interests API
- `GET /api/subcategories` - List subcategories
- `GET/POST /api/deal-breakers` - List/create deal breakers
- `POST /api/seed/interests` - Seed interests (development)

### Testing & Development API
- `GET /api/test-db` - Test database connection

### Auth Callback
- `GET /auth/callback` - OAuth callback handler

---

## Admin/Development Routes

These routes are for administration and development purposes.

- `/admin/seed` - Admin seed page
- `/debug-icons` - Icon debugging page
- `/test-auth` - Authentication testing page
- `/test-supabase` - Supabase connection testing page
- `/manage-business` - Business management page

---

## Empty/Placeholder Directories

These directories exist but don't have page files yet (placeholders for future implementation).

### User Pages
- `/notifications` - Notifications page (empty directory)
- `/settings` - Settings page (empty directory)

### Legal/Info Pages
- `/privacy` - Privacy policy page (empty directory)

### Miscellaneous
- `/all` - All items page (empty directory)

---

## Route Protection Summary

### Public Access (No Auth Required)
- Root route `/` (redirects)
- Authentication pages (`/login`, `/register`)
- Password reset pages (`/forgot-password`, `/reset-password`)
- Auth callback (`/auth/callback`)
- Business login (`/business/login`)
- Business verification status (`/business/verification-status`)
- Admin/development routes
- Empty/placeholder directories

### Requires Authentication Only
- Onboarding pages (`/interests`, `/subcategories`, `/deal-breakers`, `/complete`)
- Email verification page (`/verify-email`)

### Requires Authentication + Email Verification
- `/home`
- `/profile`
- `/explore`
- `/for-you`
- `/trending`
- `/leaderboard`
- `/events-specials`
- `/saved`
- `/write-review`
- `/dm` and `/dm/[id]`
- `/reviewer/[id]`
- `/business/[id]` (viewing)
- `/business/[id]/edit` (also requires business ownership)
- `/business/[id]/review`
- `/event/[id]`
- `/special/[id]`

---

## Middleware Configuration

The middleware (`src/middleware.ts`) handles:
- Supabase authentication cookie management
- Route protection and redirects
- Email verification checks
- Protected route enforcement

**Matcher Pattern:**
- Excludes: `_next/static`, `_next/image`, `favicon.ico`, `api` routes, image files

---

## Notes

1. **Root Route (`/`)**: Automatically redirects to `/home` for authenticated users
2. **Business Routes**: `/business/[id]/edit` requires business ownership verification
3. **Onboarding Flow**: Sequential flow through `/interests` → `/subcategories` → `/deal-breakers` → `/complete`
4. **API Routes**: Most API routes require authentication (handled by Supabase)
5. **Dynamic Routes**: All `[id]` parameters are dynamic and fetched at request time

---

## Future Routes (Planned)

Based on empty directories:
- `/notifications` - User notifications center
- `/settings` - User settings and preferences
- `/privacy` - Privacy policy page
- `/all` - Comprehensive listing page

---

*Last Updated: Generated from codebase scan*
*Next.js Version: 15.5.3 (Turbopack)*

