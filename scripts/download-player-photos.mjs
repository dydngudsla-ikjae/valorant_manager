import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const rosterPath=path.join(ROOT,'src/data/game-rosters-2026.json');
const outDir=path.join(ROOT,'public/img/players');
const manifestPath=path.join(outDir,'manifest.json');
const runtimeMapPath=path.join(ROOT,'src/data/player-images.json');
const api='https://liquipedia.net/valorant/api.php';
const userAgent='VLMPlayerImageCollector/1.0 (non-commercial fan project; local development)';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function apiRequest(params,retries=3){
  const url=new URL(api);
  for(const [key,value] of Object.entries({format:'json',...params})) url.searchParams.set(key,value);
  const response=await fetch(url,{headers:{'User-Agent':userAgent,'Accept-Encoding':'gzip'}});
  if((response.status===429||response.status>=500)&&retries){
    await wait(1800*(4-retries));
    return apiRequest(params,retries-1);
  }
  if(!response.ok) throw new Error(`Liquipedia API ${response.status}: ${await response.text()}`);
  await wait(1100);
  return response.json();
}

const chunks=(items,size)=>Array.from({length:Math.ceil(items.length/size)},(_,i)=>items.slice(i*size,i*size+size));
const cleanTitle=value=>String(value||'').trim().replaceAll('_',' ').toLowerCase();
const extensionFor=(mime,url)=>mime==='image/png'?'png':mime==='image/webp'?'webp':mime==='image/gif'?'gif':/\.png(?:\?|$)/i.test(url)?'png':'jpg';

const roster=JSON.parse(await fs.readFile(rosterPath,'utf8'));
const players=new Map();
for(const team of Object.values(roster.teams)){
  for(const player of [...(team.active||[]),...(team.bench||[])]){
    players.set(String(player.playerId),{playerId:String(player.playerId),name:player.name,teamId:team.teamId,teamName:team.teamName});
  }
}
const list=[...players.values()];
const pageByRequested=new Map();

for(const batch of chunks(list,40)){
  const data=await apiRequest({action:'query',prop:'revisions',rvprop:'content',rvslots:'main',redirects:'1',titles:batch.map(x=>x.name).join('|')});
  const aliases=new Map(batch.map(x=>[cleanTitle(x.name),cleanTitle(x.name)]));
  for(const item of data.query?.normalized||[]) aliases.set(cleanTitle(item.from),cleanTitle(item.to));
  for(const item of data.query?.redirects||[]) aliases.set(cleanTitle(item.from),cleanTitle(item.to));
  const pages=new Map(Object.values(data.query?.pages||{}).map(page=>[cleanTitle(page.title),page]));
  for(const player of batch){
    let title=cleanTitle(player.name);
    for(let i=0;i<3&&aliases.has(title);i++) title=aliases.get(title);
    pageByRequested.set(player.playerId,pages.get(title));
  }
}

const imageRequests=[];
for(const player of list){
  const page=pageByRequested.get(player.playerId);
  const content=page?.revisions?.[0]?.slots?.main?.['*']||page?.revisions?.[0]?.['*']||'';
  const image=content.match(/^\s*\|\s*image\s*=\s*([^\n|}]+)/mi)?.[1]?.trim();
  if(image) imageRequests.push({...player,pageTitle:page.title,image});
}

const imageInfo=new Map();
for(const batch of chunks(imageRequests,40)){
  const data=await apiRequest({action:'query',prop:'imageinfo',iiprop:'url|mime|size',iiurlwidth:'600',titles:batch.map(x=>`File:${x.image}`).join('|')});
  for(const page of Object.values(data.query?.pages||{})){
    const info=page.imageinfo?.[0];
    if(info) imageInfo.set(cleanTitle(page.title.replace(/^File:/i,'')),info);
  }
}

await fs.mkdir(outDir,{recursive:true});
const generatedAt=new Date().toISOString();
const manifest={schemaVersion:1,generatedAt,source:'Liquipedia VALORANT player infobox images',developmentOnly:true,players:{}};
const runtimeMap={};
let downloaded=0;

for(const player of list){
  const page=pageByRequested.get(player.playerId);
  const request=imageRequests.find(x=>x.playerId===player.playerId);
  const info=request&&imageInfo.get(cleanTitle(request.image));
  const base={...player,liquipediaPage:page?.title?`https://liquipedia.net/valorant/${encodeURIComponent(page.title.replaceAll(' ','_'))}`:null,verifiedAt:generatedAt};
  if(!request||!info){
    manifest.players[player.playerId]={...base,status:page?'no_image':'page_not_found'};
    continue;
  }
  const sourceUrl=info.thumburl||info.url;
  const ext=extensionFor(info.mime,sourceUrl);
  const fileName=`${player.playerId}.${ext}`;
  try{
    const response=await fetch(sourceUrl,{headers:{'User-Agent':userAgent,'Accept-Encoding':'gzip'}});
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    await fs.writeFile(path.join(outDir,fileName),Buffer.from(await response.arrayBuffer()));
    const localPath=`/img/players/${fileName}`;
    runtimeMap[player.playerId]=localPath;
    manifest.players[player.playerId]={...base,status:'downloaded',localPath,liquipediaFile:`https://liquipedia.net/valorant/File:${encodeURIComponent(request.image.replaceAll(' ','_'))}`,originalUrl:info.url,downloadUrl:sourceUrl,mime:info.mime,width:info.width,height:info.height};
    downloaded++;
  }catch(error){
    manifest.players[player.playerId]={...base,status:'download_failed',error:error.message,originalUrl:info.url};
  }
}

manifest.summary={players:list.length,downloaded,unavailable:list.length-downloaded};
await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
await fs.writeFile(runtimeMapPath,JSON.stringify(runtimeMap,null,2)+'\n');
console.log(`Player photos: ${downloaded}/${list.length} downloaded`);
console.log(`Manifest: ${path.relative(ROOT,manifestPath)}`);
