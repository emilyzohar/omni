import { supabase } from './supabase.js?v=omni-clean-108';
import { PUBLIC_RUNTIME_CONFIG } from './runtime-config.js';
import { releaseWatches } from './release-watches.js';
const buttons=[...document.querySelectorAll('[data-release-alerts]')];
let items=[],timer;
function status(text){document.querySelectorAll('[data-release-alert-status]').forEach(n=>n.textContent=text);}
const supported=()=>window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
async function registration(){return navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready);}
async function session(){const {data,error}=await supabase.auth.getSession();if(error)throw error;if(!data.session)throw Error('Sign in to enable alerts.');return data.session;}
async function render(){let on=false;try{on=!!await (await registration()).pushManager.getSubscription();}catch{}buttons.forEach(b=>{b.hidden=false;b.setAttribute('aria-pressed',String(on));b.textContent=on?'Release alerts on':'New-release alerts';});}
async function sync(){if(!supabase||document.body.dataset.appReady!=='true')return;const auth=await session();const sub=await (await registration()).pushManager.getSubscription();if(!sub)return;const {error}=await supabase.from('web_release_watchlists').upsert({user_id:auth.user.id,watches:releaseWatches(items),updated_at:new Date().toISOString()});if(error)throw error;}
export async function disableReleasePush(){
 if(!supported())return;
 const sub=await (await registration()).pushManager.getSubscription();if(!sub)return;
 if(!supabase)throw Error('Supabase is not configured.');
 const auth=await session();const {error}=await supabase.from('web_push_devices').delete().eq('user_id',auth.user.id).eq('endpoint',sub.endpoint);if(error)throw error;
 if(!await sub.unsubscribe())throw Error('Could not unsubscribe. Retry.');
 await render();status('Release alerts are off on this device.');
}
buttons.forEach(b=>b.addEventListener('click',async()=>{
 b.disabled=true;let created;
 try{ 
  if(!supported())throw Error('On iPhone, add Omni to your Home Screen and open it there to enable alerts.');
  if(!supabase)throw Error('Add your public Supabase settings to runtime-config.js first.');
  const key=PUBLIC_RUNTIME_CONFIG.VITE_WEB_PUSH_PUBLIC_KEY;
  if(!key)throw Error('Set the public Web Push key in runtime-config.js first.');
  if(b.getAttribute('aria-pressed')==='true'){await disableReleasePush();return;}
  // Request permission directly from this tap, before any network operation.
  const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('Allow notifications in your device settings.');
  const reg=await registration();const existing=await reg.pushManager.getSubscription();
  if(existing){await disableReleasePush();return;}
  const auth=await session();const base=key.replace(/-/g,'+').replace(/_/g,'/');const bytes=Uint8Array.from(atob(base+'='.repeat((4-base.length%4)%4)),c=>c.charCodeAt(0));
  created=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});
  const {error}=await supabase.from('web_push_devices').upsert({endpoint:created.endpoint,user_id:auth.user.id,subscription:created.toJSON(),enabled_at:new Date().toISOString()},{onConflict:'endpoint'});if(error)throw error;
  await sync();status('New-release alerts are on, including while Omni is closed.');
 }catch(e){if(created){await supabase.from('web_push_devices').delete().eq('endpoint',created.endpoint);await created.unsubscribe();}status(e.message||'Could not connect release alerts.');}
 finally{b.disabled=false;await render();}
}));
document.addEventListener('omni:release-watchlist',e=>{items=e.detail||[];clearTimeout(timer);timer=setTimeout(()=>sync().catch(e=>status(`Watchlist sync failed: ${e.message}`)),700);});
supabase?.auth.onAuthStateChange(()=>{setTimeout(()=>sync().catch(()=>{}),0);});
if(supported())render();else buttons.forEach(b=>{b.hidden=false;});
