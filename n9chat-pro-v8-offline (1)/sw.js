// N9chat Pro — Service Worker v5 (performance + offline complet)
'use strict';

const CACHE_VERSION = 'n9chat-v6';
const CACHE_STATIC  = CACHE_VERSION + '-static';
const CACHE_CDN     = CACHE_VERSION + '-cdn';

// Assets locaux critiques — mis en cache AVANT que l'app soit visible
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './api.js',
  './manifest.json',
];

// Domaines CDN à mettre en cache au premier accès
const CDN_HOSTS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.jsdelivr.net',
  'unpkg.com',
];

// ── INSTALL ─────────────────────────────────────────────────────
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_STATIC).then(async cache => {
      // On fetch chaque asset séparément pour ne pas bloquer sur un échec
      await Promise.allSettled(
        STATIC_ASSETS.map(url =>
          fetch(url, { cache: 'reload' })
            .then(r => { if (r && r.ok) return cache.put(url, r); })
            .catch(() => {})
        )
      );
    })
  );
});

// ── ACTIVATE — nettoyage agressif des vieux caches ───────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_STATIC && k !== CACHE_CDN)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH ────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // N'intercepter que GET
  if (req.method !== 'GET') return;

  // 1. Groq API + backend API → JAMAIS intercepté par le SW
  //    On laisse le navigateur gérer (succès ou erreur réseau naturelle)
  if (url.hostname.includes('groq.com') ||
      url.hostname.includes('openai.com') ||
      url.port === '3001') {
    return; // pas de respondWith → fetch natif du navigateur
  }

  // 2. Assets locaux → Cache-First avec mise à jour silencieuse
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(req, CACHE_STATIC));
    return;
  }

  // 3. CDN → Cache-First
  if (CDN_HOSTS.some(h => url.hostname.includes(h))) {
    event.respondWith(cacheFirst(req, CACHE_CDN));
    return;
  }

  // 4. Tout le reste → réseau direct
  event.respondWith(
    fetch(req).catch(() => new Response('', { status: 408 }))
  );
});

// ── Cache-First helper ───────────────────────────────────────────
async function cacheFirst(req, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) {
    // Rafraîchissement en arrière-plan (stale-while-revalidate)
    fetch(req).then(r => { if (r && r.ok) cache.put(req, r); }).catch(() => {});
    return cached;
  }
  try {
    const res = await fetch(req);
    if (res && res.ok) {
      const clone = res.clone();
      cache.put(req, clone);
    }
    return res;
  } catch {
    // Fallback: index.html pour navigations
    if (req.mode === 'navigate') {
      const fallback = await cache.match('./index.html');
      if (fallback) return fallback;
    }
    return new Response('', { status: 408 });
  }
}

// ── PUSH NOTIFICATIONS ───────────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'N9chat Pro', body: event.data.text() }; }
  event.waitUntil(
    self.registration.showNotification(data.title || 'N9chat Pro', {
      body:    data.body || '',
      icon:    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" rx="28" fill="%232563eb"/%3E%3Cpath d="M32 68V32L50 50L68 32V68" stroke="white" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" fill="none"/%3E%3C/svg%3E',
      badge:   'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" rx="28" fill="%232563eb"/%3E%3C/svg%3E',
      vibrate: [100, 50, 100],
      tag:     'n9chat-msg',
      renotify: true,
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      for (const c of cs) { if ('focus' in c) return c.focus(); }
      if (clients.openWindow) return clients.openWindow('./');
    })
  );
});
