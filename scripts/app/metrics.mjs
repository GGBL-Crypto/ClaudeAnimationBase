// Métricas puras dos canais: sem rede, sem banco. Datas ISO, `now` em ms.
const DAY=864e5,t=s=>Date.parse(s),r2=x=>Math.round(x*100)/100,clamp=x=>Math.max(0,Math.min(1,x));
export const isoDuration=s=>{const m=/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(s||'');return m?(+m[1]||0)*86400+(+m[2]||0)*3600+(+m[3]||0)*60+(+m[4]||0):0;};
export const avgViews=(videos,n=30)=>{const v=videos.slice(0,n);return v.length?Math.round(v.reduce((a,x)=>a+x.views,0)/v.length):null;};
export function views30d(snaps,videos,now){
 const s=[...snaps].sort((a,b)=>t(a.at)-t(b.at)),last=s.at(-1),base=s.filter(x=>t(x.at)<=now-30*DAY).at(-1);
 if(base&&base!==last&&base.views!=null&&last.views!=null)return{value:last.views-base.views,source:'snapshots'}; // ponytail: base única antiga cai em vídeos
 const v=videos.filter(x=>t(x.publishedAt)>now-30*DAY);
 return videos.length||last?{value:v.reduce((a,x)=>a+x.views,0),source:'videos'}:{value:null,source:null};
}
export const frequency=(videos,now)=>r2(videos.filter(v=>t(v.publishedAt)>now-90*DAY).length/(90/7));
export const ageDays=(createdAt,now)=>{const d=Math.floor((now-t(createdAt))/DAY);return Number.isNaN(d)?null:d;};
export const disparity=(avg,subs)=>avg==null||!subs?null:avg/subs;
export const scoreParts=({disparity:d,ageDays:a,videoCount:n,daysSinceLast:l})=>({
 disparidade:d==null?0:Math.min(1,d),
 novo:a==null?0:a<=90?1:clamp(1-(a-90)/275),
 enxuto:n<=30?1:clamp(1-(n-30)/70),
 ativo:l==null?0:l<=7?1:clamp(1-(l-7)/23)});
export const score=(parts,w)=>{const tot=Object.values(w).reduce((a,x)=>a+x,0)||1;return Math.round(Object.keys(w).reduce((a,k)=>a+(parts[k]||0)*w[k],0)*100/tot);};
export const revenue=(views,tag,lang,rpm)=>{const r=rpm?.[tag+'|'+lang];return r&&views!=null?r.map(x=>Math.round(x*views/1000)):null;};
export function outlierMultiple(views,channelVideos){
 const v=channelVideos.slice(0,30).map(x=>x.views).sort((a,b)=>a-b),h=v.length>>1;
 const med=v.length%2?v[h]:(v[h-1]+v[h])/2;
 return v.length&&med?r2(views/med):null;
}
export function videoRow(v,channelVideos,now){
 const multiple=outlierMultiple(v.views,channelVideos);
 return{...v,durationS:isoDuration(v.duration),viewsPerDay:Number.isNaN(t(v.publishedAt))?null:Math.round(v.views/Math.max(1,(now-t(v.publishedAt))/DAY)),multiple,nota:multiple==null?null:Math.min(100,Math.round(50*multiple))};
}
export function channelRow(ch,snaps,videos,now,cfg){
 const last=[...snaps].sort((a,b)=>t(a.at)-t(b.at)).at(-1)||{},subs=ch.hiddenSubs?null:last.subs??null;
 const avg=avgViews(videos),v30=views30d(snaps,videos,now),age=ageDays(ch.createdAt,now),vc=last.videos??videos.length;
 const lastPublished=videos.reduce((m,x)=>!m||x.publishedAt>m?x.publishedAt:m,null),daysSinceLast=lastPublished&&!Number.isNaN(t(lastPublished))?Math.floor((now-t(lastPublished))/DAY):null;
 const disp=disparity(avg,subs),parts=scoreParts({disparity:disp,ageDays:age,videoCount:vc,daysSinceLast});
 return{id:ch.id,title:ch.title,handle:ch.handle,country:ch.country,lang:ch.lang,avatar:ch.avatar,tag:ch.tag,faceless:ch.faceless,createdAt:ch.createdAt,updatedAt:last.at??null,
  subs,totalViews:last.views??null,videoCount:vc,avgViews:avg,views30d:v30.value,views30dSource:v30.source,frequency:frequency(videos,now),ageDays:age,
  disparity:disp,scoreParts:parts,score:score(parts,cfg.weights),revenue:revenue(v30.value,ch.tag,ch.lang,cfg.rpm),lastPublished,daysSinceLast,
  topThumbs:[...videos].sort((a,b)=>b.views-a.views).slice(0,3).map(x=>({id:x.id,thumb:x.thumb,views:x.views}))};
}
