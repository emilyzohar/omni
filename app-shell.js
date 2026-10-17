import './notifications.js';
import './release-push.js';
const Browser={open:async({url})=>{window.open(url,'_blank','noopener,noreferrer');}};
const native = true;
document.body.classList.add(native ? 'native-app' : 'web-app');
const add = document.querySelector('[data-app-add]');
function syncAdd() { if (add) add.disabled = document.body.dataset.appReady !== 'true'; }
syncAdd();
new MutationObserver(syncAdd).observe(document.body,{attributes:true,attributeFilter:['data-app-ready']});
add?.addEventListener('click', () => document.dispatchEvent(new CustomEvent('omni:add-content')));
// Preserve selected destinations and tab state when switching app pages.
if (native) {
  document.querySelectorAll('.app-bottom-nav a').forEach(link => {
    if (new URLSearchParams(location.search).has('app-preview')) {
      const url = new URL(link.href); url.searchParams.set('app-preview','1'); link.href = url.href;
    }
    const selected = link.getAttribute('aria-current') === 'page';
    if (selected) link.setAttribute('aria-current','page');
  });
}
function restoreSocialTab() {
  if (document.body.dataset.appReady !== 'true' || document.body.dataset.appView !== 'social') return;
  const tab = new URLSearchParams(location.search).get('tab') || (native ? sessionStorage.getItem('omni.socialTab') : null);
  if (tab) document.querySelector(`[data-social-tab="${CSS.escape(tab)}"]`)?.click();
}
document.querySelectorAll('[data-social-tab]').forEach(button=>button.addEventListener('click',()=>{if(native)sessionStorage.setItem('omni.socialTab',button.dataset.socialTab);}));
restoreSocialTab();
new MutationObserver(restoreSocialTab).observe(document.body,{attributes:true,attributeFilter:['data-app-ready']});
if (native) {
  document.body.classList.add('native-app');
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('download')) return;
    const target = new URL(link.href,location.href);
    if (['http:','https:'].includes(target.protocol) && target.origin !== location.origin) {
      event.preventDefault(); Browser.open({url:target.href}).catch(console.error);
    }
  });

}
{
  // Service workers are for the website; native apps ship their assets locally.
  if ('serviceWorker' in navigator && window.isSecureContext) {
    let refreshingVersion = false;
    const hadController = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || refreshingVersion) return;
      // Keep unsynced work and open editors intact during an app update.
      const pending = Object.keys(localStorage).some(key => key.startsWith('omni.pendingSync:') && localStorage.getItem(key));
      if (pending || document.querySelector('dialog[open]')) return;
      refreshingVersion = true;
      location.reload();
    });
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
        await registration.update();
      } catch (error) { console.warn(error); }
    });
  }
  let installPrompt;
  const install = document.createElement('button');
  install.type='button'; install.textContent='Install'; install.className='app-install-button'; install.hidden=true;
  document.querySelector('.site-header .nav')?.append(install);
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;install.hidden=false;});
  window.addEventListener('appinstalled',()=>{install.hidden=true;installPrompt=null;});
  install.addEventListener('click',async()=>{if(!installPrompt)return;await installPrompt.prompt();installPrompt=null;install.hidden=true;});
}

// Keep background scrolling locked while any modal is open.
function syncModalLock() { document.body.classList.toggle('modal-open', Boolean(document.querySelector('dialog[open]'))); }
new MutationObserver(syncModalLock).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
syncModalLock();
// Keep old calendar bookmarks on the combined Up Next page.
if (document.body.dataset.appView === 'calendar') location.replace(new URL('index.html#track', location.href));
