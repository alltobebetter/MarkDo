const CACHE_NAME = 'markdo-v4.0.0';
const STATIC_CACHE = 'markdo-static-v4.0.0';
const DYNAMIC_CACHE = 'markdo-dynamic-v4.0.0';

// 需要缓存的静态资源
const STATIC_ASSETS = [
  './',
  './index.html',
  './script.js',
  './style.css',
  './favicon.svg',
  './favicon-16.svg',
  './manifest.json'
];

// 需要缓存的外部资源
const EXTERNAL_ASSETS = [
  'https://fontsapi.zeoseven.com/292/main/result.css',
  'https://cdn.jsdelivr.net/npm/lucide@0.294.0/dist/umd/lucide.css',
  'https://cdn.jsdelivr.net/npm/lucide@0.294.0/dist/umd/lucide.js',
  'https://cdn.jsdelivr.net/npm/marked@9.1.6/marked.min.js',
  'https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.9.0/styles/github.min.css',
  'https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.9.0/highlight.min.js',
  'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css',
  'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js',
  'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js',
  'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
  'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'
];

// 安装事件
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    Promise.all([
      // 缓存静态资源
      caches.open(STATIC_CACHE).then(cache => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      // 缓存外部资源
      caches.open(DYNAMIC_CACHE).then(cache => {
        console.log('Service Worker: Caching external assets');
        return Promise.allSettled(
          EXTERNAL_ASSETS.map(url => 
            cache.add(url).catch(err => {
              console.warn(`Failed to cache ${url}:`, err);
            })
          )
        );
      })
    ]).then(() => {
      console.log('Service Worker: Installation complete');
      // 强制激活新的Service Worker
      return self.skipWaiting();
    })
  );
});

// 激活事件
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // 删除旧版本的缓存
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activation complete');
      // 立即控制所有客户端
      return self.clients.claim();
    })
  );
});

// 拦截网络请求
self.addEventListener('fetch', event => {
  // 只处理GET请求
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  
  // 处理静态资源
  if (STATIC_ASSETS.some(asset => event.request.url.includes(asset))) {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request);
      })
    );
    return;
  }
  
  // 处理外部资源
  if (EXTERNAL_ASSETS.some(asset => event.request.url.includes(asset))) {
    event.respondWith(
      caches.match(event.request).then(response => {
        if (response) {
          return response;
        }
        
        // 网络优先策略，失败时使用缓存
        return fetch(event.request).then(fetchResponse => {
          // 缓存新的响应
          if (fetchResponse.ok) {
            const responseClone = fetchResponse.clone();
            caches.open(DYNAMIC_CACHE).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return fetchResponse;
        }).catch(() => {
          // 网络失败时返回缓存
          return caches.match(event.request);
        });
      })
    );
    return;
  }
  
  // 其他请求使用网络优先策略
  event.respondWith(
    fetch(event.request).catch(() => {
      // 网络失败时尝试从缓存获取
      return caches.match(event.request);
    })
  );
});



// 推送通知
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'MarkDo有新的更新',
      icon: './favicon.svg',
      badge: './favicon-16.svg',
      vibrate: [100, 50, 100],
      data: data.data || {},
      actions: [
        {
          action: 'open',
          title: '打开应用'
        },
        {
          action: 'close',
          title: '关闭'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'MarkDo', options)
    );
  }
});

// 通知点击事件
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow('./')
    );
  }
});

console.log('Service Worker: Script loaded');
