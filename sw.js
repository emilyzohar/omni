const CACHE='omni-web-v5-social-polish';
const SHELL=['index.html','calendar.html','discover.html','social.html','library.html','style.css','ui.css','app-shell.css','app.js','ui.js','app-shell.js','api.js','config.js','supabase.js','runtime-config.js','notifications.js','release-push.js','release-watches.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png'].map(p=>new URL(p,self.registration.scope).href);
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>(k.startsWith('omni-shell-')||k.startsWith('omni-web-'))&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);u.search='';if(e.request.method!=='GET'||u.origin!==self.location.origin)return;
 if(u.href===self.registration.scope)u.pathname+='index.html';if(!SHELL.includes(u.href))return;
 // Serve a consistent cached app version; updates install as a complete shell.
 e.respondWith(caches.match(u.href).then(r=>r||fetch(e.request)));
});
self.addEventListener('push',e=>{
 let p={};try{p=e.data?.json()||{};}catch{p={body:e.data?.text()||''};}
 e.waitUntil(self.registration.showNotification(p.title||'New in Up Next',{body:p.body||'A new release is available.',icon:new URL('icons/icon-192.png',self.registration.scope).href,tag:p.tag||'omni-release',data:{url:'index.html'}}));
});
self.addEventListener('notificationclick',e=>{
 e.notification.close();e.waitUntil((async()=>{const target=new URL('index.html',self.registration.scope).href;const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});const c=windows.find(c=>c.url.startsWith(self.registration.scope));if(c){await c.navigate(target);return c.focus();}return self.clients.openWindow(target);})());
});
