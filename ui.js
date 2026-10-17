// Use the artwork itself as a softly blurred tint. No canvas sampling, CORS
// requests, duplicated downloads, or edits to the sticker system are needed.
const cardSelector = '.upnext-card, .discover-card, .social-feed-card';
function enhanceCard(card) {
  const image = card.querySelector('img');
  const source = image?.getAttribute('src');
  if (source && card.dataset.tintSource !== source) {
    card.style.setProperty('--cover-image', `url(${JSON.stringify(source)})`);
    card.dataset.tintSource = source;
  } else if (!source) {
    card.style.removeProperty('--cover-image');
    delete card.dataset.tintSource;
  }
  card.querySelectorAll('img').forEach(img => {
    img.decoding = 'async';
    if (!card.matches('.upnext-card')) img.loading = 'lazy';
  });
}
const pending = new Set();
let scheduled = false;
function schedule(card) {
  pending.add(card);
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    pending.forEach(card => { if (card.isConnected) enhanceCard(card); });
    pending.clear(); scheduled = false;
  });
}
document.querySelectorAll(cardSelector).forEach(schedule);
new MutationObserver(records => {
  for (const record of records) {
    if (record.type === 'attributes') {
      const card = record.target.closest(cardSelector);
      if (card) schedule(card);
      continue;
    }
    const parent = record.target instanceof Element ? record.target.closest(cardSelector) : null;
    if (parent) schedule(parent);
    for (const node of record.addedNodes) {
      if (!(node instanceof Element)) continue;
      if (node.matches(cardSelector)) schedule(node);
      node.querySelectorAll(cardSelector).forEach(schedule);
    }
  }
}).observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['src'] });

// Use the rendered background so dark controls stay readable in every theme/state.
function controlBackgroundRGBA(value) {
  if (!value || value === 'transparent') return [0,0,0,0];
  const values = value.match(/[\d.]+/g)?.map(Number) || [];
  if (value.startsWith('color(srgb')) return [values[0]*255,values[1]*255,values[2]*255,values[3] ?? 1];
  if (value.startsWith('rgb')) return [values[0],values[1],values[2],values[3] ?? 1];
  return [0,0,0,0];
}
function controlHasDarkBackground(control) {
  let remaining = 1;
  const rgb = [0,0,0];
  for (let node = control; node && remaining > .01; node = node.parentElement) {
    const color = controlBackgroundRGBA(getComputedStyle(node).backgroundColor);
    const alpha = Math.max(0,Math.min(1,color[3]));
    for (let channel=0; channel<3; channel++) rgb[channel] += color[channel]*alpha*remaining;
    remaining *= 1-alpha;
  }
  const linear = rgb.map(value => {
    const channel = (value + 255*remaining)/255;
    return channel <= .04045 ? channel/12.92 : ((channel+.055)/1.055)**2.4;
  });
  return .2126*linear[0]+.7152*linear[1]+.0722*linear[2] <= .18;
}
const contrastControlSelector = 'button,summary,[role="button"],input[type="submit"],input[type="button"]';
const contrastPending = new Set();
let contrastFrame = 0;
function scheduleControlContrast(root) {
  if (!(root instanceof Element)) return;
  if (root.matches(contrastControlSelector)) contrastPending.add(root);
  root.querySelectorAll(contrastControlSelector).forEach(control => contrastPending.add(control));
  if (contrastFrame) return;
  contrastFrame = requestAnimationFrame(() => {
    contrastFrame = 0;
    for (const control of contrastPending) {
      if (!control.isConnected) continue;
      const dark = controlHasDarkBackground(control);
      if (control.classList.contains('omni-dark-control') !== dark) control.classList.toggle('omni-dark-control',dark);
    }
    contrastPending.clear();
  });
}
scheduleControlContrast(document.body);
new MutationObserver(records => {
  for (const record of records) {
    if (record.type === 'attributes') scheduleControlContrast(record.target);
    else for (const node of record.addedNodes) scheduleControlContrast(node);
  }
}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','aria-pressed','aria-selected','disabled','open','data-social-profile-theme','data-calendar-theme']});
for (const type of ['mouseover','mouseout','focusin','focusout']) document.addEventListener(type,event => {
  const control = event.target.closest?.(contrastControlSelector);
  if (control) scheduleControlContrast(control);
});
