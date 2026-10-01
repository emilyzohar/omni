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
