const fs=require('fs'), vm=require('vm'), assert=require('assert/strict');
const src=fs.readFileSync(require('path').join(__dirname,'..','app.js'),'utf8');
(async()=>{
const cacheSrc=src.slice(src.indexOf('const cacheRequests ='),src.indexOf('\nfunction saveItems()'));
let writes=0,calls=0;const ctx=vm.createContext({state:{cache:{}},CACHE_TTL:3600000,CACHE_KEY:'cache',window:{addEventListener(){}},localStorage:{setItem(){writes++}},setTimeout,clearTimeout,console});
vm.runInContext(cacheSrc,ctx);
ctx.loader=async()=>{calls++; await new Promise(r=>setTimeout(r,5));return {ok:true}};
await vm.runInContext("Promise.all([getCached('x',loader),getCached('x',loader),getCached('x',loader)])",ctx);
assert.equal(calls,1);await vm.runInContext("getCached('x',loader)",ctx);assert.equal(calls,1);
ctx.fail=async()=>{throw Error('offline')};await assert.rejects(vm.runInContext("getCached('retry',fail)",ctx));await vm.runInContext("getCached('retry',loader)",ctx);assert.equal(calls,2);
vm.runInContext('flushApiCache()',ctx);assert.equal(writes,1);console.log('PASS: concurrent requests deduplicate, cached results reuse, failures retry, storage writes batch');
let release,applied=0;const pending=new Map();const remote=new Promise(r=>release=r);
const sync=vm.createContext({localOnlyMode:false,currentUser:{id:'alice'},supabase:{from(){return {select(){return this},eq(){return this},maybeSingle(){return remote}}}},cloudSyncBusy:false,queueCompletionsInFlight:new Set(),localStorage:{getItem:k=>pending.get(k)},scheduleCloudSync(){},lastCloudUpdatedAt:'',persistCloudStateLocally:async()=>{applied++},saveLargeState:async()=>{},buildCloudState:()=>({}),appStarted:false,setSyncStatus(){},console});
vm.runInContext(src.slice(src.indexOf('let cloudRefreshBusy ='),src.indexOf('\nfunction clearLocalSyncedState')),sync);
const refresh=vm.runInContext('refreshCloudProfile()',sync);pending.set('omni.pendingSync:alice','1');release({data:{state:{items:['stale']},updated_at:'2026-10-17'}});await refresh;assert.equal(applied,0);console.log('PASS: a cloud download cannot overwrite a local edit made during the request');
})();
