export function releaseWatches(items) {
 return (Array.isArray(items)?items:[]).filter(i=>!i.completedAt && !['stopped','paused'].includes(i.watchDisposition) && !['stopped'].includes(i.bookDisposition)).map(i=>({id:String(i.id),title:String(i.title||'New release').slice(0,200),type:i.sourceType||i.type||'',providerId:String(i.providerId||''),releaseDate:i.releaseDate||null,progress:i.progress||{}}));
}
