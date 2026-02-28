# Performance Optimization Plan

## Current Status
Your app already has good performance infrastructure:
- ✅ Dynamic imports for non-critical components
- ✅ Image optimization with Next.js Image
- ✅ Code splitting configured
- ✅ Performance monitoring hooks
- ✅ Network-aware image quality
- ✅ Memoization for expensive components

## High-Impact Optimizations (Implement First)

### 1. **Enable Partial Prerendering (PPR)** 🚀
**Impact**: Major - Faster initial page loads
**Effort**: Low

```typescript
// next.config.ts
experimental: {
  ppr: true, // Currently set to false
}
```

### 2. **Implement API Response Caching** 🔥
**Impact**: Major - Reduce server load and response times
**Effort**: Medium

Current issue: Every page load fetches data fresh. Add SWR or React Query:

```bash
npm install swr
# or
npm install @tanstack/react-query
```

### 3. **Add Database Indexes** 📊
**Impact**: Major - Faster queries
**Effort**: Medium

Add indexes to frequently queried fields:
- `businesses.category`
- `businesses.verified`
- `businesses.rating`
- `businesses.created_at`
- `reviews.business_id`

### 4. **Implement Incremental Static Regeneration (ISR)** 🎯
**Impact**: Major - Serve static content, regenerate in background
**Effort**: Medium

For semi-static pages:
- Business directory/explore pages
- Leaderboard
- Trending page

```typescript
export const revalidate = 3600; // Revalidate every hour
```

### 5. **Optimize Images at Build Time** 📸
**Impact**: High - Smaller image sizes
**Effort**: Medium

- Use blur placeholders for all images
- Generate optimized image sizes
- Implement `priority` prop on above-the-fold images
- Consider using AVIF format (already configured)

### 6. **Reduce Bundle Size** 📦
**Impact**: High - Faster downloads
**Effort**: Medium

Current heavy imports to optimize:
- **Framer Motion**: Use `framer-motion/dist/framer-motion` or `motion/react`
- **React Feather**: Import individual icons instead of the whole package
- **Date-fns**: Use specific imports only

```typescript
// Bad
import { ArrowLeft } from 'react-feather';

// Good
import ArrowLeft from 'react-feather/dist/icons/arrow-left';
```

### 7. **Implement Virtual Scrolling** 🔄
**Impact**: High - Better performance with large lists
**Effort**: Medium

For pages with many cards (explore, for-you, trending):
```bash
npm install @tanstack/react-virtual
```

### 8. **Add Request Deduplication** 🎭
**Impact**: Medium - Prevent duplicate API calls
**Effort**: Low

Multiple components fetching the same data simultaneously.

## Medium-Impact Optimizations

### 9. **Optimize Font Loading** 📝
**Impact**: Medium
**Effort**: Low

```typescript
// layout.tsx
const googleSansFont = '"Google Sans", -apple-system, BlinkMacSystemFont, system-ui, sans-serif';
```

### 10. **Add Service Worker for Offline Support** 💾
**Impact**: Medium
**Effort**: High

```bash
npm install next-pwa
```

### 11. **Optimize Third-Party Scripts** 📡
**Impact**: Medium
**Effort**: Low

Use Next.js Script component with optimal loading strategies.

### 12. **Implement Pagination or Infinite Scroll Properly** ♾️
**Impact**: Medium
**Effort**: Medium

Currently loading all items upfront. Implement cursor-based pagination.

### 13. **Reduce Main Thread Work** ⚙️
**Impact**: Medium
**Effort**: Medium

- Move animations to Web Workers
- Use `requestIdleCallback` for non-critical tasks
- Debounce/throttle scroll handlers (already implemented)

### 14. **Optimize CSS Delivery** 🎨
**Impact**: Medium
**Effort**: Low

```typescript
// next.config.ts
experimental: {
  optimizeCss: true, // Already enabled ✅
  cssChunking: 'loose', // Add this
}
```

## Low-Hanging Fruit (Quick Wins)

### 15. **Remove Console Logs in Production** 🔕
```typescript
// Already configured in next.config.ts ✅
```

### 16. **Add Compression** 🗜️
```typescript
// Already enabled ✅
compress: true,
```

### 17. **Prefetch Critical Routes** 🔗
```typescript
// Already implemented via OptimizedLink ✅
```

### 18. **Reduce Animation Complexity** 🎬
**Impact**: Low-Medium
**Effort**: Low

Consider removing or simplifying heavy animations, especially:
- Toast notifications with multiple animations
- Complex scroll-triggered animations
- Excessive blur effects (`backdrop-blur`)

### 19. **Optimize Toast Notifications** 🍞
**Impact**: Low
**Effort**: Low

- Reduce animation complexity
- Limit to 1-2 toasts max (already set)
- Use CSS animations instead of Framer Motion

### 20. **Add Resource Hints** 🔮
```typescript
// layout.tsx - Add to head
<link rel="dns-prefetch" href="https://images.unsplash.com" />
<link rel="preconnect" href="https://your-supabase-url.supabase.co" />
```

## Database & Backend Optimizations

### 21. **Implement Connection Pooling** 🏊
Ensure Supabase connection pooling is optimized.

### 22. **Add Redis Caching** 🔴
For frequently accessed data:
- Trending businesses
- Leaderboard data
- Business of the month

### 23. **Optimize Database Queries** 🔍
- Use `select` to only fetch needed columns
- Implement pagination at DB level
- Use `explain analyze` to find slow queries

### 24. **Implement CDN for Static Assets** 🌐
- Images
- Fonts
- Static JS/CSS bundles

## Monitoring & Analysis

### 25. **Set Up Performance Budgets** 📊
```typescript
// next.config.ts
experimental: {
  performanceBudget: {
    js: 200000, // 200KB
    css: 50000,  // 50KB
  }
}
```

### 26. **Implement Real User Monitoring (RUM)** 📈
Use Vercel Analytics or add custom tracking.

### 27. **Add Lighthouse CI** 🏠
Automate performance testing in CI/CD pipeline.

## Implementation Priority

### Phase 1 (Week 1) - Quick Wins
1. Enable PPR
2. Add API caching with SWR/React Query
3. Optimize individual icon imports
4. Add database indexes
5. Add resource hints

**Expected Impact**: 30-40% faster initial load

### Phase 2 (Week 2) - Major Optimizations
1. Implement ISR for static pages
2. Add virtual scrolling for large lists
3. Optimize image loading with blur placeholders
4. Implement proper pagination

**Expected Impact**: 40-50% better perceived performance

### Phase 3 (Week 3) - Advanced Optimizations
1. Add Redis caching layer
2. Implement service worker
3. Set up CDN
4. Optimize database queries

**Expected Impact**: 20-30% additional improvement

## Specific File Changes Needed

### High Priority Files to Modify:
1. `src/app/hooks/useBusinesses.ts` - Add caching
2. `src/app/explore/page.tsx` - Add virtual scrolling
3. `src/app/for-you/page.tsx` - Add virtual scrolling
4. `src/app/trending/page.tsx` - Add virtual scrolling
5. `next.config.ts` - Enable PPR, add more optimizations
6. `src/app/layout.tsx` - Add resource hints
7. `src/app/components/BusinessCard/*` - Optimize images

### Bundle Analysis
Run these commands to identify bottlenecks:
```bash
# Analyze bundle size
npm run build
npx @next/bundle-analyzer

# Or add to next.config.ts:
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer(nextConfig)
```

## Measurement Targets

### Current (Estimated)
- First Contentful Paint (FCP): ~1.5-2s
- Largest Contentful Paint (LCP): ~2.5-3s
- Time to Interactive (TTI): ~3-4s
- Total Bundle Size: ~500KB+

### Target After Optimizations
- First Contentful Paint (FCP): <1s
- Largest Contentful Paint (LCP): <1.5s
- Time to Interactive (TTI): <2s
- Total Bundle Size: <300KB

## Next Steps

Would you like me to:
1. **Start with Phase 1 optimizations** (SWR caching, PPR, icon imports)?
2. **Analyze bundle size first** to see biggest opportunities?
3. **Implement virtual scrolling** for your large card lists?
4. **Add database indexes** for faster queries?
5. **All of the above** - comprehensive optimization?

Let me know which path you prefer, and I'll implement it!


