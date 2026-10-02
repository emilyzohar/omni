import { readdirSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
export function webAppServiceWorker(){
 let out,publicSource;
 return {
  name:'omni-web-app-service-worker',
  apply:'build',
  configResolved(c){out=resolve(c.root,c.build.outDir);publicSource=c.publicDir||resolve(c.root,'public');},
  closeBundle(){
   // Copy stable public assets explicitly before constructing the cache inventory.
   for(const file of ['manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','assets/index.html']){
    const source=resolve(publicSource,file);
    if(!existsSync(source))throw Error(`Missing source asset: ${source}. Copy the patch's public folder into the project root.`);
    const destination=resolve(out,file);
    mkdirSync(resolve(destination,'..'),{recursive:true});copyFileSync(source,destination);
   }
   function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(resolve(dir,e.name)):[resolve(dir,e.name)]);}
   // Normalize final HTML before cache hashes are computed; never cache a bad launch link.
   for(const name of ['index','calendar','discover','social','library']){
    const page=resolve(out,name+'.html');let html=readFileSync(page,'utf8');
    html=html.replace(/<link\b[^>]*>\s*/gi,tag=>{
     const rel=tag.match(/\brel\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
     const values=(rel?.[1]||rel?.[2]||rel?.[3]||'').toLowerCase().split(/\s+/);
     return values.some(v=>['manifest','apple-touch-icon'].includes(v))?'':tag;
    });
    html=html.replace(/<\/head\s*>/i,'<link rel="manifest" href="/omni/manifest.webmanifest">\n<link rel="apple-touch-icon" href="/omni/icons/icon-192.png">\n</head>');
    writeFileSync(page,html);
   }
   const files=walk(out).filter(f=>/\.(?:html|js|css|woff2?|png|svg|webmanifest)$/.test(f)&&relative(out,f)!=='sw.js').sort();
   for(const required of ['index.html','calendar.html','discover.html','social.html','library.html','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png']) {
    if(!files.some(f=>relative(out,f).replaceAll('\\','/')===required))throw Error(`Missing built web app file: ${required}`);
   }
   const hash=createHash('sha256');for(const f of files){hash.update(relative(out,f));hash.update(readFileSync(f));}
   const cache=`omni-web-vite-${hash.digest('hex').slice(0,14)}`;
   const shell=files.map(f=>'./'+relative(out,f).replaceAll('\\','/'));
   const source=`const CACHE=${JSON.stringify(cache)};
const SHELL=${JSON.stringify(shell)}.map(p=>new URL(p,self.registration.scope).href);
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>(k.startsWith('omni-shell-')||k.startsWith('omni-web-'))&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);u.search='';if(e.request.method!=='GET'||u.origin!==self.location.origin)return;
 if(u.href===self.registration.scope)u.pathname+='index.html';if(!SHELL.includes(u.href))return;
 e.respondWith(caches.match(u.href).then(r=>r||fetch(e.request)));
});
self.addEventListener('push',e=>{
 let p={};try{p=e.data?.json()||{};}catch{p={body:e.data?.text()||''};}
 e.waitUntil(self.registration.showNotification(p.title||'New in Up Next',{body:p.body||'A new release is available.',icon:new URL('icons/icon-192.png',self.registration.scope).href,tag:p.tag||'omni-release',data:{url:'index.html'}}));
});
self.addEventListener('notificationclick',e=>{
 e.notification.close();e.waitUntil((async()=>{const target=new URL('index.html',self.registration.scope).href;const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});const c=windows.find(c=>c.url.startsWith(self.registration.scope));if(c){await c.navigate(target);return c.focus();}return self.clients.openWindow(target);})());
});
`;
   writeFileSync(resolve(out,'sw.js'),source);
  }
 };
}
