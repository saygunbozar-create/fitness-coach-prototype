// Coachbook, uygulama verilerinin tamamı için Supabase'e bağlı çalışan, her zaman canlı bir
// araç — bu yüzden bu service worker BİLEREK hiçbir şeyi önbelleğe almıyor. Amacı sadece
// tarayıcıların "Ana Ekrana Ekle" kriterini karşılamak (bir fetch handler'lı service worker
// gerektiriyor). JS bundle'ını önbelleğe alsaydık, her yeni deploy sonrası kullanıcılar eski
// koda takılı kalabilirdi — sessizce debug edilmesi çok zor bir hataya yol açardı.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
