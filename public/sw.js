/**
 * Service Worker for Offline Caching and Image Optimization
 * Provides offline support and cached image serving
 */

const CACHE_NAME = 'klio-v1';
const IMAGE_CACHE_NAME = 'klio-images-v1';
const API_CACHE_NAME = 'klio-api-v1';

// Assets to cache on install (optional; any failure must not break install)
const STATIC_ASSETS = [
  '/',
  '/home',
  '/for-you',
  '/trending',
  '/leaderboard',
];

// Install event - cache static assets. addAll() throws if any request fails (e.g. 404/500),
// so we add one-by-one and ignore failures so the SW still activates.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        STATIC_ASSETS.map((url) => cache.add(url).catch(() => {}))
      );
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return name !== CACHE_NAME && 
                   name !== IMAGE_CACHE_NAME && 
                   name !== API_CACHE_NAME;
          })
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle image requests with separate cache
  if (isImageRequest(request)) {
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE_NAME));
    return;
  }

  // Handle API requests with stale-while-revalidate
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(staleWhileRevalidateStrategy(request, API_CACHE_NAME));
    return;
  }

  // Handle static assets with cache first
  if (isStaticAsset(request)) {
    event.respondWith(cacheFirstStrategy(request, CACHE_NAME));
    return;
  }

  // Default: network first, fallback to cache
  event.respondWith(networkFirstStrategy(request));
});

/**
 * Check if request is for an image
 */
function isImageRequest(request) {
  const url = new URL(request.url);
  const contentType = request.headers.get('accept') || '';
  
  return (
    url.pathname.match(/\.(jpg|jpeg|png|gif|webp|avif|svg)$/i) ||
    contentType.includes('image/') ||
    url.pathname.includes('/_next/image') ||
    url.hostname.includes('supabase.co')
  );
}

/**
 * Check if request is for a static asset
 */
function isStaticAsset(request) {
  const url = new URL(request.url);
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/static/') ||
    url.pathname.match(/\.(js|css|woff|woff2|ttf|eot)$/i)
  );
}

/**
 * Cache-first strategy - good for images and static assets
 */
async function cacheFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    
    // Only cache successful responses
    if (response.status === 200) {
      // Clone response because response body can only be read once
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Return offline page or error response
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

/**
 * Network-first strategy - good for dynamic content
 */
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Fallback to cache
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    
    if (cached) {
      return cached;
    }
    
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

/**
 * Stale-while-revalidate strategy - good for API responses
 * Serves stale content immediately while fetching fresh data in background
 */
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Fetch fresh data in background
  const fetchPromise = fetch(request).then((response) => {
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  });

  // Return cached version immediately if available, otherwise wait for network
  return cached || fetchPromise;
}

