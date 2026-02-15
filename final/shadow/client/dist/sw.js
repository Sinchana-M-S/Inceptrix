// Service Worker for Shadow-Labor Ledger PWA
// Enables offline functionality and caching

const CACHE_NAME = 'shadow-ledger-v1';
const OFFLINE_URL = '/offline.html';

// Files to cache for offline use
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// API endpoints to cache responses
const API_CACHE_ROUTES = [
  '/api/vcs/score',
  '/api/activities',
  '/api/advanced/badges',
  '/api/advanced/recommendations'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  
  // Force waiting service worker to become active
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request));
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Handle static assets - cache first
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((response) => {
        // Cache successful responses
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      });
    })
  );
});

// Handle API requests with network-first strategy
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful GET responses
    if (request.method === 'GET' && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache for:', url.pathname);
    
    // Try cache for GET requests
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // Return offline response for failed requests
    return new Response(
      JSON.stringify({ 
        success: false, 
        offline: true, 
        error: 'You are offline. This action will sync when online.' 
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 503
      }
    );
  }
}

// Handle navigation with offline fallback
async function handleNavigationRequest(request) {
  try {
    // Try to get from network
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // Return cached page or offline page
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return caches.match(OFFLINE_URL);
  }
}

// Background sync for offline activities
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-activities') {
    event.waitUntil(syncOfflineActivities());
  }
});

// Sync offline activities when back online
async function syncOfflineActivities() {
  try {
    // Get offline activities from IndexedDB
    const offlineData = await getOfflineData();
    
    if (offlineData.length > 0) {
      console.log('[SW] Syncing', offlineData.length, 'offline activities');
      
      const response = await fetch('/api/advanced/pwa/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offlineData })
      });
      
      if (response.ok) {
        // Clear synced data
        await clearOfflineData();
        console.log('[SW] Offline data synced successfully');
        
        // Notify user
        self.registration.showNotification('Activities Synced!', {
          body: `${offlineData.length} activities synced successfully`,
          icon: '/icons/icon-192.png',
          badge: '/icons/badge.png'
        });
      }
    }
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  const data = event.data?.json() || { title: 'Shadow-Labor Ledger', body: 'New update available' };
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge.png',
      tag: data.tag || 'notification',
      actions: data.actions || [
        { action: 'open', title: 'Open App' },
        { action: 'close', title: 'Dismiss' }
      ]
    })
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Helper: Get offline data (mock - would use IndexedDB in production)
async function getOfflineData() {
  // In production, use IndexedDB
  return [];
}

// Helper: Clear offline data
async function clearOfflineData() {
  // In production, clear IndexedDB
}

console.log('[SW] Service worker loaded');
