const preference='omni.upNextAlerts';
const buttons=[...document.querySelectorAll('[data-upnext-alerts]')];
function status(t){document.querySelectorAll('[data-alert-status]').forEach(n=>n.textContent=t);}
function render(){buttons.forEach(b=>{const on=localStorage.getItem(preference)==='true';b.setAttribute('aria-pressed',String(on));b.textContent=on?'In-app alerts on':'In-app Up Next alerts';});}
buttons.forEach(b=>b.addEventListener('click',async()=>{
 try{
 if(localStorage.getItem(preference)==='true'){localStorage.removeItem(preference);status('In-app alerts are off.');}
 else if(!('Notification' in window)){status('Open the installed Home Screen app to allow notifications.');}
 else if(await Notification.requestPermission()==='granted'){localStorage.setItem(preference,'true');status('Alerts for additions detected while Omni is open. Enable New-release alerts for alerts while closed.');}
 else status('Notifications were not allowed.');
 }catch(e){status(e.message);}render();
}));
document.addEventListener('omni:upnext-added',async e=>{if(localStorage.getItem(preference)!=='true'||!e.detail?.length)return;try{const r=await navigator.serviceWorker.ready;await r.showNotification('New in Up Next',{body:e.detail.slice(0,3).map(i=>i.title).join(', '),tag:'omni-upnext',icon:'icons/icon-192.png'});}catch{}});render();
