const CACHE = 'omni-shell-ce7a45e62517';
const SHELL = ["./assets/app-shell-9owihLUK.js","./assets/app-shell-B6zE6GIW.css","./assets/dm-sans-latin-400-normal-BwCSEQnW.woff","./assets/dm-sans-latin-400-normal-CW0RaeGs.woff2","./assets/dm-sans-latin-500-normal-B9HHJjqV.woff2","./assets/dm-sans-latin-500-normal-Dr3UlScf.woff","./assets/dm-sans-latin-600-normal-Aqo67rzb.woff2","./assets/dm-sans-latin-600-normal-BmdmIIQ2.woff","./assets/dm-sans-latin-700-normal-CUSSCpQX.woff","./assets/dm-sans-latin-700-normal-DvUfVpUG.woff2","./assets/inter-latin-400-normal-C38fXH4l.woff2","./assets/inter-latin-400-normal-CyCys3Eg.woff","./assets/inter-latin-500-normal-BL9OpVg8.woff","./assets/inter-latin-500-normal-Cerq10X2.woff2","./assets/inter-latin-600-normal-CiBQ2DWP.woff","./assets/inter-latin-600-normal-LgqL8muc.woff2","./assets/inter-latin-700-normal-BLAVimhd.woff","./assets/inter-latin-700-normal-Yt3aPRUw.woff2","./assets/web-YWSwpDnR.js","./assets/web-nIOJr7os.js","./calendar.html","./discover.html","./icons/icon-1024.png","./icons/icon-192.png","./icons/icon-512.png","./index.html","./library.html","./manifest.webmanifest","./social.html"];
const allowed = new Set(SHELL.map(path=>new URL(path,self.registration.scope).pathname));
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
// Activate on the next normal launch, avoiding a mid-session mixed-version app.
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('omni-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 const root=new URL('./',self.registration.scope).pathname;
 const path=url.pathname===root?new URL('./index.html',self.registration.scope).pathname:url.pathname;
 if(!allowed.has(path))return;
 event.respondWith(fetch(event.request).then(response=>{
  if(response.ok&&!/private|no-store/i.test(response.headers.get('Cache-Control')||'')){
   const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(path,copy)).catch(()=>{}));
  }
  return response;
 }).catch(()=>caches.match(path).then(response=>response||Response.error())));
});
