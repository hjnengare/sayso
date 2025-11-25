# SEO Metadata Implementation

This document outlines the SEO metadata implementation to prevent duplicate pages and ensure proper canonical tags.

## Overview

All pages now have proper SEO metadata including:
- Unique titles and descriptions
- Canonical URLs to prevent duplicate content
- Open Graph tags for social sharing
- Twitter Card tags
- Proper robots directives

## Canonical Tags

Canonical tags are set on all pages to prevent duplicate content issues:

### Root Page (`/`)
- **Canonical**: Points to `/home`
- **Robots**: `noindex` (since it redirects)
- **Action**: Server-side redirect to `/home`

### Main Pages
- `/home` - Canonical: `/home`
- `/explore` - Canonical: `/explore`
- `/for-you` - Canonical: `/for-you`
- `/trending` - Canonical: `/trending`
- `/leaderboard` - Canonical: `/leaderboard`
- `/events-specials` - Canonical: `/events-specials`
- `/deal-breakers` - Canonical: `/deal-breakers`

### Dynamic Pages
- `/business/[slug]` - Canonical: `/business/[slug]` (uses slug, not ID)
- `/event/[id]` - Canonical: `/event/[id]`
- `/special/[id]` - Canonical: `/special/[id]`
- `/reviewer/[id]` - Canonical: `/reviewer/[id]` (noindex)

### Protected Pages (noindex)
- `/profile` - Canonical: `/profile` (noindex)
- `/saved` - Canonical: `/saved` (noindex)
- `/login` - Canonical: `/login` (noindex)
- `/register` - Canonical: `/register` (noindex)
- `/dm` - Canonical: `/dm` (noindex)
- `/write-review` - Canonical: `/write-review` (noindex)

## Duplicate Content Prevention

### 1. Root Page Redirect
- Root page (`/`) uses server-side redirect to `/home`
- Prevents duplicate content between `/` and `/home`
- Canonical tag points to `/home`

### 2. Business Pages
- Uses slug-based URLs for SEO-friendly URLs
- Automatic redirect from ID-based URLs to slug-based URLs
- Canonical tag always uses slug URL

### 3. URL Normalization
- All trailing slashes handled consistently
- Query parameters don't create duplicate content
- Case-sensitive URLs handled properly

## Metadata Structure

All pages use the `generateSEOMetadata` utility which provides:
- Consistent title format: `{Page Title} | sayso`
- Unique descriptions per page
- Proper Open Graph tags
- Twitter Card tags
- Canonical URLs
- Robots directives

## Implementation Files

- `src/app/lib/utils/seoMetadata.ts` - SEO metadata utility
- `src/app/*/layout.tsx` - Page-specific metadata
- `src/app/page.tsx` - Root page with redirect
- `src/app/sitemap.ts` - XML sitemap generation
- `src/app/robots.ts` - Robots.txt configuration

## Testing

To verify no duplicate pages:
1. Check all pages have unique canonical URLs
2. Verify root page redirects properly
3. Ensure business pages use slugs in canonical tags
4. Confirm protected pages have `noindex` directive
5. Validate sitemap includes all public pages

## Best Practices

1. **Always use canonical tags** - Every page should have a canonical URL
2. **Use slugs for business pages** - Better SEO and prevents ID-based duplicates
3. **Noindex user-specific pages** - Profile, saved, DMs should not be indexed
4. **Server-side redirects** - Use Next.js `redirect()` for permanent redirects
5. **Consistent URL structure** - Use clean, descriptive URLs

---

*Last Updated: SEO metadata implementation complete*

