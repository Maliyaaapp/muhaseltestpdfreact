// Service worker for Muhasel Finance Management System
// This service worker provides offline functionality

const CACHE_NAME = 'muhasel-cache-v1.0.8';
const OFFLINE_URL = './offline.html';

// Resources to precache
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './assets/index.css',
  './assets/index.js',
  './assets/images/logo.png',
  './favicon.ico'
];

// Install event - precache assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Claiming clients');
      return self.clients.claim();
    })
  );
});

// Skip certain URLs from caching
const shouldNotCache = (url) => {
  return (
    url.href.includes('chrome-extension') ||
    url.href.includes('extension') ||
    url.href.includes('__/') ||
    url.href.includes('analytics') ||
    url.href.includes('sockjs-node') ||
    url.href.includes('hot-update') ||
    url.pathname.includes('hot-update')
  );
};

// Fetch event - network first, then cache, then offline page
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip browser extensions and special URLs
  const url = new URL(event.request.url);
  if (shouldNotCache(url)) {
    return;
  }
  
  // API requests should still be handled but without caching
  if (url.pathname.includes('/api/')) {
    return;
  }

  // Handle fetch event - network first strategy
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache successful responses from our own origin
        if (response.status === 200 && url.origin === self.location.origin) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseClone);
            })
            .catch((err) => {
              console.warn('Cache put error:', err);
            });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // Return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            
            // Return error response for other requests
            return new Response('Network error happened', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Listen for push notifications (future feature)
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  
  const options = {
    body: data.body || 'تم استلام إشعار جديد',
    icon: './assets/images/logo.png',
    badge: './assets/images/badge.png',
    dir: 'rtl', // Right-to-left for Arabic
    data: {
      url: data.url || './'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(
      data.title || 'إشعار من نظام محصل',
      options
    )
  );
}); 