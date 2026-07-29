import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { join, resolve } from 'node:path';

const ROOT=resolve(import.meta.dirname,'..','..');
const YEARS=[2021,2022,2023,2024,2025,2026];
const runtime=JSON.parse(await readFile(join(ROOT,'src/data/player-runtime-2026.json'),'utf8'));
const wanted=new Set(Object.values(runtime.players).map(x=>String(x.playerId)).filter(Boolean));
const playerEntities=JSON.parse(await readFile(join(ROOT,'vct_json/data/entities/players.json'),'utf8')).players;
const playerNames=new Map(playerEntities.map(x=>[String(x.id),x.name]));

async function eachJsonl(path,fn){const input=createInterface({input:createReadStream(path,{encoding:'utf8'}),crlfDelay:Infinity});for await(const line of input)if(line)fn(JSON.parse(line));}
const fresh=()=>({rounds:0,r:0,acs:0,kast:0,adr:0,k:0,d:0,a:0,fk:0,fd:0,agents:{},games:new Set()});
function add(out,row){const w=Number(row.rounds)||0;if(!w)return;out.rounds+=w;for(const key of ['r','acs','kast','adr'])out[key]+=Number(row[{r:'rating',acs:'acs',kast:'kast',adr:'adr'}[key]])*w||0;for(const key of ['k','d','a','fk','fd'])out[key]+=Number(row[{k:'kills',d:'deaths',a:'assists',fk:'firstKills',fd:'firstDeaths'}[key]])||0;}
function finish(x){const rounds=x.rounds||1;return {games:x.games.size,rounds:x.rounds,r:+(x.r/rounds).toFixed(2),acs:Math.round(x.acs/rounds),kd:x.d?+(x.k/x.d).toFixed(2):null,kast:+(x.kast/rounds).toFixed(3),adr:+(x.adr/rounds).toFixed(1),kpr:+(x.k/rounds).toFixed(2),apr:+(x.a/rounds).toFixed(2),fkfd:x.fd?+(x.fk/x.fd).toFixed(2):null,k:x.k,d:x.d,a:x.a,fk:x.fk,fd:x.fd};}

const players={};
for(const id of wanted)players[id]={playerId:id,name:playerNames.get(id)||id,years:{}};
for(const year of YEARS){
  const tournaments=new Map();
  await eachJsonl(join(ROOT,`vct_json/data/${year}/tournaments_stages_matches_games_ids.jsonl`),row=>{if(row.refs.tournamentId&&!tournaments.has(String(row.refs.tournamentId)))tournaments.set(String(row.refs.tournamentId),row.values.tournament);});
  await eachJsonl(join(ROOT,`profile_json/data/observations/player-competition/${year}.jsonl`),row=>{
    const id=String(row.playerId);if(!wanted.has(id))return;
    const y=players[id].years[year]??={events:{}};const tid=String(row.tournamentId||'unknown');
    const event=y.events[tid]??={tournamentId:tid,name:tournaments.get(tid)||`Tournament ${tid}`,stats:fresh()};add(event.stats,row);
    for(const agent of row.agentIds||[]){const a=event.stats.agents[agent]??=fresh();add(a,row);}
  });
  await eachJsonl(join(ROOT,`profile_json/data/observations/player-maps/${year}.jsonl`),row=>{
    const id=String(row.playerId);if(!wanted.has(id)||!row.gameId)return;const event=players[id].years[year]?.events?.[String(row.tournamentId||'unknown')];if(!event)return;
    event.stats.games.add(String(row.gameId));for(const agent of row.agentIds||[])event.stats.agents[agent]?.games.add(String(row.gameId));
  });
}
for(const player of Object.values(players))for(const [year,y] of Object.entries(player.years)){
  const annual=fresh();
  y.events=Object.values(y.events).map(event=>{add(annual,{rounds:event.stats.rounds,rating:event.stats.r/event.stats.rounds,acs:event.stats.acs/event.stats.rounds,kast:event.stats.kast/event.stats.rounds,adr:event.stats.adr/event.stats.rounds,kills:event.stats.k,deaths:event.stats.d,assists:event.stats.a,firstKills:event.stats.fk,firstDeaths:event.stats.fd});event.stats.games.forEach(x=>annual.games.add(x));const agents=Object.entries(event.stats.agents).map(([agent,x])=>({agent,...finish(x)})).sort((a,b)=>b.rounds-a.rounds);return {...event,...finish(event.stats),agents,stats:undefined};}).sort((a,b)=>a.name.localeCompare(b.name));
  y.year=Number(year);y.total=finish(annual);
}
await mkdir(join(ROOT,'history_json/data'),{recursive:true});
await writeFile(join(ROOT,'history_json/data/players.json'),JSON.stringify({schemaVersion:1,generatedAt:new Date().toISOString(),years:YEARS,players},null,2)+'\n');
console.log(`Built history for ${Object.keys(players).length} current players.`);
