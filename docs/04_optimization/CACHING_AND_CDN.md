# Performance Optimization Documentation

This document outlines all performance optimizations implemented for fast load times, including image optimization, CDN, and caching strategies.

## Overview

The application uses a multi-layered performance optimization strategy:
1. **Image Optimization** - Next.js Image with modern formats (AVIF, WebP)
2. **CDN** - Supabase Storage with built-in CDN + Next.js Image CDN
3. **Caching** - HTTP headers, in-memory cache, and service worker

---

## Image Optimization

### Next.js Image Configuration

**Location:** `next.config.ts`

**Features:**
- **Modern Formats**: AVIF and WebP support for smaller file sizes
- **Device-Specific Sizes**: Optimized image sizes for different devices
- **Minimum Cache TTL**: 60 seconds for optimized images
- **Unoptimized in Development**: Only for faster local development

```typescript
images: {
  formats: ['image/avif', 'image/webp'],
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  minimumCacheTTL: 60,
  remotePatterns: [
    // Supabase Storage (CDN-enabled)
    // Unsplash images
  ],
}
```

### OptimizedImage Component

**Location:** `src/app/components/Performance/OptimizedImage.tsx`

**Features:**
- Automatic quality selection based on use case
- Responsive sizing generation
- Priority preloading for above-the-fold images
- Lazy loading for below-the-fold images
- Blur placeholder support

**Usage:**
```tsx
<OptimizedImage
  src={imageUrl}
  alt="Description"
  width={800}
  height={600}
  priority={true} // For hero images
  quality={90} // Override default if needed
/>
```

### CDN Utilities

**Location:** `src/app/lib/utils/cdnUtils.ts`

**Functions:**
- `getOptimizedImageUrl()` - Get CDN-optimized image URLs
- `getResponsiveSizes()` - Generate responsive image sizes
- `getOptimalQuality()` - Get optimal quality for use case
- `preloadImage()` - Preload images for faster loading
- `lazyLoadImage()` - Lazy load images with Intersection Observer

---

## HTTP Caching

### Cache Headers Utility

**Location:** `src/app/lib/utils/httpCache.ts`

**Features:**
- Configurable cache strategies
- Presets for different content types
- ETag support for 304 Not Modified responses
- Stale-while-revalidate support

### Cache Presets

```typescript
// Static assets - 1 year cache
CachePresets.static()

// API responses - 5 minutes cache, 1 hour stale-while-revalidate
CachePresets.api()

// Business data - 10 minutes cache, 20 minutes on CDN
CachePresets.business()

// Review data - 5 minutes cache
CachePresets.reviews()

// Dynamic content - 1 minute cache, immediate revalidation
CachePresets.dynamic()

// User data - No cache
CachePresets.user()
```

### Implementation in API Routes

**Example:**
```typescript
import { cachedJsonResponse, CachePresets } from '@/app/lib/utils/httpCache';

export async function GET() {
  const data = await fetchData();
  return cachedJsonResponse(data, CachePresets.business());
}
```

### Static Asset Caching

**Location:** `next.config.ts`

**Headers Configuration:**
- Images: `max-age=31536000, immutable` (1 year)
- Static files: `max-age=31536000, immutable` (1 year)
- Next.js optimized images: `max-age=31536000, immutable` (1 year)

---

## In-Memory Caching

### Query Cache

**Location:** `src/app/lib/cache/queryCache.ts`

**Features:**
- TTL-based cache expiration
- Automatic cache eviction (LRU-style)
- Extended TTLs for different content types
- Cache statistics

**Extended TTLs:**
- Business data: 10 minutes
- Business lists: 5 minutes
- Reviews: 5 minutes
- Stats: 15 minutes
- Profiles: 10 minutes

**Usage:**
```typescript
import { queryCache } from '@/app/lib/cache/queryCache';

// Get from cache
const cached = queryCache.get('business:123');

// Set in cache
queryCache.set('business:123', data, 600000); // 10 minutes
```

### Optimized Queries

**Location:** `src/app/lib/utils/optimizedQueries.ts`

**Features:**
- Parallel query execution
- Automatic caching with TTL
- Slug and ID lookup support
- Cache invalidation

---

## Service Worker (Offline Caching)

### Service Worker Script

**Location:** `public/sw.js`

**Features:**
- **Cache-First Strategy** for images and static assets
- **Stale-While-Revalidate** for API responses
- **Network-First Strategy** for dynamic content
- Separate caches for different content types:
  - `klio-v1` - Static assets
  - `klio-images-v1` - Images
  - `klio-api-v1` - API responses

### Caching Strategies

1. **Images**: Cache-first (serves from cache immediately, updates in background)
2. **API**: Stale-while-revalidate (serves stale, fetches fresh in background)
3. **Static Assets**: Cache-first (long-term caching)
4. **Dynamic Content**: Network-first (tries network, falls back to cache)

### Registration

**Location:** `src/app/layout.tsx`

The service worker is automatically registered in production mode.

---

## CDN Configuration

### Supabase Storage CDN

Supabase Storage automatically provides CDN for all uploaded images. URLs are already optimized:
- Global CDN distribution
- Automatic HTTPS
- Edge caching

### Next.js Image CDN

Next.js Image component automatically:
- Optimizes images on-demand
- Serves from CDN
- Converts to modern formats (AVIF, WebP)
- Generates responsive sizes

---

## Performance Best Practices

### Image Optimization

1. **Use OptimizedImage Component** for all images
2. **Set priority={true}** for above-the-fold images
3. **Use appropriate quality** based on use case:
   - Hero: 90
   - Gallery: 85
   - Thumbnail: 75
   - Avatar: 80
   - Icon: 60
4. **Provide responsive sizes** for mobile optimization

### Caching Strategy

1. **Static Assets**: Cache forever (immutable)
2. **Business Data**: 10 minutes cache, 1 hour stale-while-revalidate
3. **API Responses**: 5 minutes cache
4. **User Data**: No cache or very short cache

### Service Worker

1. **Images**: Always cache (cache-first)
2. **API**: Stale-while-revalidate for instant loading
3. **Static Assets**: Long-term caching

---

## Monitoring Performance

### Key Metrics

- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1
- **TTFB (Time to First Byte)**: < 800ms

### Tools

- Next.js built-in performance monitoring
- Web Vitals component
- Service Worker cache statistics
- Query cache statistics

---

## Future Optimizations

### Planned Enhancements

1. **Redis Integration**: Replace in-memory cache with Redis for multi-server deployments
2. **Image CDN Migration**: Consider Cloudflare Images or ImageKit for advanced optimization
3. **HTTP/2 Push**: Push critical resources
4. **Resource Hints**: Add more preconnect and prefetch hints
5. **Code Splitting**: Further optimize bundle sizes
6. **Edge Caching**: Implement edge caching with Vercel Edge Network or Cloudflare

---

## Configuration

### Environment Variables

No additional environment variables required. All optimizations work with existing configuration.

### Production vs Development

- **Production**: Full optimization enabled (service worker, image optimization, caching)
- **Development**: Image optimization disabled, service worker disabled (for faster local dev)

---

## Testing

### Verify Image Optimization

1. Check network tab - images should be served as WebP/AVIF
2. Verify Next.js Image optimization is working
3. Check image sizes - should be smaller than originals

### Verify Caching

1. Check response headers - should include `Cache-Control`
2. Test offline mode - should work with service worker
3. Verify stale-while-revalidate - should serve cached data instantly

### Verify CDN

1. Check image URLs - should be from Supabase CDN
2. Test from different locations - should load fast globally
3. Verify cache headers - should have appropriate TTLs

---

*Last Updated: Performance optimization implementation complete*

