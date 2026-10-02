import { readFileSync,writeFileSync } from 'node:fs';
export function fixManifestLinks(html){
 html=html.replace(/<link\b[^>]*>\s*/gi,tag=>{
  const rel=tag.match(/\brel\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
  const values=(rel?.[1]||rel?.[2]||rel?.[3]||'').toLowerCase().split(/\s+/);
  return values.some(v=>['manifest','apple-touch-icon'].includes(v))?'':tag;
 });
 html=html.replace(/<meta\b[^>]*\bname\s*=\s*["']mobile-web-app-capable["'][^>]*>\s*/gi,'');
 if(!/<\/head\s*>/i.test(html))throw Error('Missing closing head tag');
 return html.replace(/<\/head\s*>/i,'<link rel="manifest" href="/omni/manifest.webmanifest">\n<link rel="apple-touch-icon" href="/omni/icons/icon-192.png">\n<meta name="mobile-web-app-capable" content="yes">\n</head>');
}
for(const name of ['index','calendar','discover','social','library']){
 const file=`${name}.html`;writeFileSync(file,fixManifestLinks(readFileSync(file,'utf8')));
}
console.log('Replaced duplicate manifest/icon links on all five pages.');
