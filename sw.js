const CACHE = 'budget-app-v2';
const STATIC_ASSETS = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './KkleBWA.gif',
  './Pig_Coin_00000.png'
];

// 安裝：快取靜態資源（不含 index.html）
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled(STATIC_ASSETS.map(url => cache.add(url).catch(()=>{})))
    ).then(() => self.skipWaiting())
  );
});

// 啟用：清除所有舊版快取
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 攔截請求
self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  const isHTML = url.pathname.endsWith('.html') || url.pathname.endsWith('/');

  if(isHTML){
    // index.html：網路優先，失敗才用快取（確保每次拿最新版）
    e.respondWith(
      fetch(e.request).then(resp => {
        if(resp && resp.status === 200){
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() =>
        caches.match(e.request).then(cached =>
          cached || new Response('離線中，請先連線開啟一次 App', {status: 503})
        )
      )
    );
  } else {
    // 其他資源：快取優先，背景更新
    e.respondWith(
      caches.match(e.request).then(cached => {
        const fetchPromise = fetch(e.request).then(resp => {
          if(resp && resp.status === 200){
            const clone = resp.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return resp;
        }).catch(()=>{});
        return cached || fetchPromise;
      })
    );
  }
});
