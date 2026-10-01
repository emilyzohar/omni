import { createClient } from 'npm:@supabase/supabase-js@2.52.1';
import webpush from 'npm:web-push@3.6.7';
const env=(k:string)=>{const v=Deno.env.get(k);if(!v)throw Error(`Missing ${k}`);return v;};
const respond=(v:unknown,status=200)=>Response.json(v,{status});
function safeEndpoint(endpoint:string){try{const u=new URL(endpoint);return u.protocol==='https:'&&u.port===''&& !u.username&&!u.password&&['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'].includes(u.hostname);}catch{return false;}}
Deno.serve(async req=>{
 if(req.method!=='POST')return respond({error:'POST required'},405);
 const secret=Deno.env.get('WEB_PUSH_CRON_SECRET');if(!secret||req.headers.get('x-cron-secret')!==secret)return respond({error:'Unauthorized'},401);
 let db:any,locked=false;let sent=0,failed=0;
 try{
 db=createClient(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'));
 const lease=await db.rpc('claim_web_push_sender');if(lease.error)throw lease.error;if(!lease.data)return respond({busy:true});locked=true;
 webpush.setVapidDetails(env('WEB_PUSH_SUBJECT'),env('WEB_PUSH_PUBLIC_KEY'),env('WEB_PUSH_PRIVATE_KEY'));
 const timezone=Deno.env.get('WEB_PUSH_TIMEZONE')||'America/Toronto';
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const tvCache=new Map();const started=Date.now();
 for(let offset=0;;offset+=200){
 const page=await db.from('web_push_devices').select('*').order('endpoint').range(offset,offset+199);if(page.error)throw page.error;
 if(!page.data.length)break;
 for(const device of page.data){
 if(Date.now()-started>45000)throw Error('Sender time budget reached; schedule smaller batches for a larger deployment.');
 if(!safeEndpoint(device.endpoint)){failed++;continue;}
 const list=await db.from('web_release_watchlists').select('watches').eq('user_id',device.user_id).maybeSingle();if(list.error)throw list.error;
 for(const w of list.data?.watches||[]){
 let releases:any[]=[];
 if(w.type==='tv'&&w.providerId&&Deno.env.get('TMDB_READ_ACCESS_TOKEN')){
 if(!/^\d+$/.test(w.providerId))continue;
 if(!tvCache.has(w.providerId)){
 const r=await fetch(`https://api.themoviedb.org/3/tv/${w.providerId}`,{headers:{Authorization:`Bearer ${Deno.env.get('TMDB_READ_ACCESS_TOKEN')}`},signal:AbortSignal.timeout(8000)});
 if(!r.ok){failed++;continue;}const d=await r.json();tvCache.set(w.providerId,[d.last_episode_to_air,d.next_episode_to_air].filter(Boolean));
 }
 releases=tvCache.get(w.providerId).filter((e:any)=>e.season_number>Number(w.progress?.nextSeason||1)||(e.season_number===Number(w.progress?.nextSeason||1)&&e.episode_number>=Number(w.progress?.nextEpisode||1))).map((e:any)=>({date:e.air_date,key:`${w.id}:s${e.season_number}e${e.episode_number}:${e.air_date}`,body:`${w.title} · S${e.season_number} E${e.episode_number}${e.name?` · ${e.name}`:''}`}));
 }else if(w.releaseDate){releases=[{date:w.releaseDate,key:`${w.id}:${w.releaseDate}`,body:`${w.title} is now available.`}];}
 const enabledDay=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(device.enabled_at));
 for(const release of releases){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(release.date)||release.date>today||release.date<enabledDay)continue;
 const previous=await db.from('web_push_deliveries').select('release_key').eq('endpoint',device.endpoint).eq('release_key',release.key).maybeSingle();if(previous.error)throw previous.error;if(previous.data)continue;
 try{
 await webpush.sendNotification(device.subscription,JSON.stringify({title:'New in Up Next',body:release.body,tag:release.key}),{TTL:86400,timeout:8000});
 const saved=await db.from('web_push_deliveries').insert({endpoint:device.endpoint,release_key:release.key});if(saved.error)throw saved.error;sent++;
 }catch(error:any){failed++;if(error.statusCode===404||error.statusCode===410){const deleted=await db.from('web_push_devices').delete().eq('endpoint',device.endpoint);if(deleted.error)throw deleted.error;break;}}
 }
 }
 }
 if(page.data.length<200)break;
 }
 return respond({sent,failed});
 }catch(e:any){return respond({error:e.message,sent,failed},500);}
 finally{if(locked)await db.from('web_push_sender_lock').delete().eq('id',1);}
});
