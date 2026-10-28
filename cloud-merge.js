// Three-way merge: unchanged local fields follow the server; local edits win
// same-field conflicts. Keyed lists retain independent additions and deletions.
export function mergeCloudState(base, local, remote) {
  const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b);
  function merge(b,l,r) {
    if (equal(l,b)) return r;
    if (equal(r,b) || equal(l,r)) return l;
    if ([b,l,r].every(Array.isArray) && [...b,...l,...r].every(v=>v && typeof v==='object' && v.id != null)) {
      const bm=new Map(b.map(v=>[v.id,v])), lm=new Map(l.map(v=>[v.id,v])), rm=new Map(r.map(v=>[v.id,v]));
      return [...new Set([...lm.keys(),...rm.keys()])].flatMap(id=>{
        const value=merge(bm.get(id),lm.get(id),rm.get(id));
        return value===undefined ? [] : [value];
      });
    }
    if ([b,l,r].every(v=>v && typeof v==='object' && !Array.isArray(v))) {
      return Object.fromEntries([...new Set([...Object.keys(b),...Object.keys(l),...Object.keys(r)])].flatMap(k=>{
        const value=merge(b[k],l[k],r[k]);return value===undefined?[]:[[k,value]];
      }));
    }
    return l;
  }
  return merge(base,local,remote);
}

// Legacy caches have no common ancestor. Recover conservatively: retain both
// devices' records; local values win conflicts, while remote-only fields survive.
// Missing records cannot be interpreted as deletions without a baseline.
export function recoverCloudState(local, remote) {
  const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  function recover(l, r) {
    if (l === undefined) return r;
    if (r === undefined) return l;
    if (Array.isArray(l) && Array.isArray(r)) {
      const keyed = [...l,...r].every(v => object(v) && v.id != null);
      if (keyed) {
        const other = new Map(r.map(v => [v.id,v]));
        const ids = new Set(l.map(v => v.id));
        return [...l.map(v => recover(v,other.get(v.id))),...r.filter(v => !ids.has(v.id))];
      }
      const seen = new Set();
      return [...l,...r].filter(v => {
        const key = JSON.stringify(v);
        if (seen.has(key)) return false;
        seen.add(key); return true;
      });
    }
    if (object(l) && object(r)) {
      return Object.fromEntries([...new Set([...Object.keys(l),...Object.keys(r)])].map(k => [k,recover(l[k],r[k])]));
    }
    return l;
  }
  return recover(local,remote);
}
