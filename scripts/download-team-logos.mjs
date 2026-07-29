import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

const ROOT=resolve(import.meta.dirname,'..');
const runtime=JSON.parse(await readFile(join(ROOT,'src/data/player-runtime-2026.json'),'utf8'));
const teams=[...new Map(Object.values(runtime.players).map(p=>[String(p.teamId),{id:String(p.teamId),name:p.teamName,leagueId:p.leagueId}])).values()];
const output=join(ROOT,'public/img/teams');
await mkdir(output,{recursive:true});

const slug=name=>name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
async function download(team){
  const pageUrl=`https://www.vlr.gg/team/${team.id}/${slug(team.name)}/`;
  const html=await fetch(pageUrl,{headers:{'user-agent':'Mozilla/5.0 VLM asset downloader'}}).then(r=>{if(!r.ok)throw new Error(`page ${r.status}`);return r.text();});
  const match=html.match(/<img\s+src="([^"]+)"\s+alt="[^"]*team logo"/i)||html.match(/team-header-logo[\s\S]{0,500}?<img\s+src="([^"]+)"/i);
  if(!match)throw new Error('logo not found');
  const sourceUrl=match[1].startsWith('//')?`https:${match[1]}`:new URL(match[1],pageUrl).href;
  const response=await fetch(sourceUrl,{headers:{'user-agent':'Mozilla/5.0 VLM asset downloader'}});if(!response.ok)throw new Error(`image ${response.status}`);
  const input=Buffer.from(await response.arrayBuffer());
  await sharp(input).resize(128,128,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toFile(join(output,`${team.id}.png`));
  return {...team,file:`/img/teams/${team.id}.png`,sourcePage:pageUrl,sourceImage:sourceUrl,status:'downloaded'};
}

const results=[];let cursor=0;
async function worker(){while(cursor<teams.length){const team=teams[cursor++];try{const result=await download(team);results.push(result);console.log(`OK ${team.name}`);}catch(error){results.push({...team,file:null,status:'failed',error:error.message});console.error(`FAIL ${team.name}: ${error.message}`);}}}
await Promise.all(Array.from({length:6},worker));
results.sort((a,b)=>a.leagueId.localeCompare(b.leagueId)||a.name.localeCompare(b.name));
const generatedAt=new Date().toISOString();
await writeFile(join(output,'manifest.json'),JSON.stringify({schemaVersion:1,generatedAt,source:'VLR team profile pages; runtime uses local files only.',teams:results},null,2)+'\n');
await writeFile(join(ROOT,'src/data/team-logos.json'),JSON.stringify({schemaVersion:1,generatedAt,logos:Object.fromEntries(results.filter(x=>x.file).flatMap(x=>[[x.id,x.file],[x.name,x.file]]))},null,2)+'\n');
console.log(`Downloaded ${results.filter(x=>x.file).length}/${results.length} logos.`);
