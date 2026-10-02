import { readFileSync,writeFileSync } from 'node:fs';
for (const name of ['index','calendar','discover','social','library']) {
 const file=`${name}.html`;let html=readFileSync(file,'utf8');
 html=html.replace(/<link\b[^>]*\brel=["']manifest["'][^>]*>\r?\n?/gi,'');
 html=html.replace(/<link\b[^>]*\brel=["']apple-touch-icon["'][^>]*>\r?\n?/gi,'');
 html=html.replace(/<meta\b[^>]*\bname=["']mobile-web-app-capable["'][^>]*>\r?\n?/gi,'');
 html=html.replace('</head>','<link rel="manifest" href="%BASE_URL%manifest.webmanifest">\n<link rel="apple-touch-icon" href="%BASE_URL%icons/icon-192.png">\n<meta name="mobile-web-app-capable" content="yes">\n</head>');
 // Register even if the old shell restricted service workers to desktop mode.
 html=html.replace(/<script\b[^>]*\bdata-omni-sw-fix[^>]*>[\s\S]*?<\/script>\r?\n?/gi,'');
 html=html.replace('</body>',`<script data-omni-sw-fix>
if('serviceWorker' in navigator && window.isSecureContext) {
 window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(console.error));
}
</script>\n</body>`);
 writeFileSync(file,html);
}
console.log('Updated all five pages: stable manifest/icon links and service worker registration.');
