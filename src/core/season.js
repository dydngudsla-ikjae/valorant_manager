import { draftPair } from './draft.js';
import { playerAttribute, playerOVR } from './ratings.js';
import { applyRoundStats, finalizeRatings, freshBox, simOneMap } from './round-engine.js';
import { ST } from './state.js';
import { MAPS } from '../data/leagues.js';
import { deriveSeed, random, withSeed } from './rng.js';
import { completeBracketMatch, createDoubleEliminationBracket, readyBracketMatches } from './tournament.js';

export function makeSchedule(n){
  const ids=[...Array(n).keys()];
  if(n%2)ids.push(-1);
  const m=ids.length, rounds=m-1, half=m/2;
  const arr=ids.slice(); const weeks=[];
  for(let r=0;r<rounds;r++){
    const wk=[];
    for(let i=0;i<half;i++){
      const a=arr[i], b=arr[m-1-i];
      if(a!==-1&&b!==-1) wk.push({id:`regular-w${r+1}-m${i+1}`,phase:'regular',week:r,home:(r%2?b:a),away:(r%2?a:b),played:false,res:null});
    }
    weeks.push(wk);
    arr.splice(1,0,arr.pop());
  }
  return weeks;
}

/* ============ HUB RENDER ============ */

export function sortedStandings(){
  return [...ST.teams].sort((a,b)=>{
    const A=ST.standings[a.id],B=ST.standings[b.id];
    if(B.w-A.w)return B.w-A.w;
    if((B.mapW-B.mapL)-(A.mapW-A.mapL))return (B.mapW-B.mapL)-(A.mapW-A.mapL);
    if(B.rd-A.rd)return B.rd-A.rd;
    const direct=ST.schedule.flat().find(f=>f.played&&((f.home===a.id&&f.away===b.id)||(f.home===b.id&&f.away===a.id)));
    if(direct){const homeWon=direct.res.hMaps>direct.res.aMaps;const winner=homeWon?direct.home:direct.away;if(winner===a.id)return-1;if(winner===b.id)return 1;}
    return a.name.localeCompare(b.name);
  });
}

export function createStandings(teams){return Object.fromEntries(teams.map(team=>[team.id,{w:0,l:0,mapW:0,mapL:0,rd:0}]));}

function compactMapResults(mapResults){return(mapResults||[]).filter(Boolean).map(map=>({map:map.map||map.mapName,seed:map.seed||null,h:map.h??map.homeRounds,a:map.a??map.awayRounds,rounds:map.rounds?.length??((map.h??0)+(map.a??0))}));}

export function recordFixtureResult(fx,{hMaps,aMaps,roundDifferential=0,box=null,mapResults=null,seed=null}){
  if(fx.played)return false;
  fx.played=true;fx.res={hMaps,aMaps};
  if((fx.phase||'regular')==='regular'){
    const H=ST.standings[fx.home],A=ST.standings[fx.away];
    H.mapW+=hMaps;H.mapL+=aMaps;A.mapW+=aMaps;A.mapL+=hMaps;H.rd+=roundDifferential;A.rd-=roundDifferential;
    if(hMaps>aMaps){H.w++;A.l++;}else{A.w++;H.l++;}
  }else if(ST.competition?.bracket)completeBracketMatch(ST.competition,fx.id,{hMaps,aMaps});
  ST.matchArchive=ST.matchArchive||[];
  ST.matchArchive.push({id:fx.id||`fixture-${ST.matchArchive.length+1}`,phase:fx.phase||'regular',week:fx.week??null,home:fx.home,away:fx.away,hMaps,aMaps,roundDifferential,seed,box:box?structuredClone(box):null,mapResults:compactMapResults(mapResults)});
  return true;
}

export function syncCompetitionProgress(){
  const competition=ST.competition;if(!competition)return;
  const anyUnplayed=ST.schedule.some(week=>week.some(fixture=>!fixture.played));if(anyUnplayed)return;
  if(competition.phase==='regular'){
    competition.seeds=sortedStandings().slice(0,competition.qualificationPlaces).map(team=>team.id);
    competition.bracket=createDoubleEliminationBracket(competition.seeds);competition.phase='playoffs';
  }
  if(competition.phase==='playoffs'){
    const ready=readyBracketMatches(competition);
    if(ready.length){const week=ST.schedule.length;ST.schedule.push(ready.map((match,index)=>{match.scheduled=true;return{id:match.id,phase:'playoffs',bracket:match.bracket,label:match.label,week,order:index,home:match.home,away:match.away,bestOf:match.bestOf,played:false,res:null};}));}
  }
  ST.seasonOver=competition.phase==='complete';
}

export function nameById(id){return ST.teams.find(t=>t.id===id).name;}

export function firstUnplayedWeek(){
  for(let i=0;i<ST.schedule.length;i++) if(ST.schedule[i].some(f=>!f.played)) return i;
  return -1;
}

/* ============ SQUAD RENDER ============ */

export function teamPower(t,formMap){
  // weighted by role, plus per-map form swing already baked per player
  let sum=0;
  t.roster.forEach(pl=>{ sum += (playerOVR(pl)+ (formMap[pl.name]||0)); });
  return sum/t.roster.length;
}

export function rollForm(t){ // per-map ±, mental dampens downside
  const f={};
  t.roster.forEach(pl=>{
    const base=(random()*2-1); // -1..1
    const swing = base*10; // ±10
    const resilience=playerAttribute(pl,'consistency')*.6+playerAttribute(pl,'pressure')*.4;
    const mentalGuard = base<0 ? (resilience-60)/8 : 0; // reliable players soften bad days
    f[pl.name]=Math.round(swing + mentalGuard);
  });
  return f;
}

export function teamObj(id){return ST.teams.find(t=>t.id===id);}

/* DEV: skip map veto and play a single Ascent map (Bo1). Set false to restore veto/Bo3. */

export function pickMaps(n){const pool=[...MAPS];for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}return pool.slice(0,n);}

export function simRestOfWeek(wi, skipFx){
  ST.schedule[wi].forEach(f=>{
    if(f.played||f===skipFx)return;
    const seed=deriveSeed(ST.seed,ST.league,'week',wi,'fixture',f.home,f.away);
    const res=quickSim(teamObj(f.home),teamObj(f.away),seed,f.bestOf||ST.matchBestOf||3);
    recordFixtureResult(f,{hMaps:res.h,aMaps:res.a,roundDifferential:res.rd,box:res.box,mapResults:res.mapResults,seed});
  });
  syncCompetitionProgress();
}
/* headless quick sim for background matches — Bo3, same engine, no replay */

export function quickSim(home,away,seed=deriveSeed('quick',home.id,away.id),bestOf=3){
  let hM=0,aM=0,rd=0,totalRounds=0;const mapResults=[];
  const mapsToWin=Math.floor(bestOf/2)+1;
  const maps=withSeed(deriveSeed(seed,'maps'),()=>pickMaps(bestOf));
  const throwBox=freshBox(home,away);
  for(let m=0;m<bestOf&&hM<mapsToWin&&aM<mapsToWin;m++){
    const cc=draftPair(home,away,maps[m]);
    const mapSeed=deriveSeed(seed,'map',m,maps[m]);
    const result=withSeed(mapSeed,()=>simOneMap(home,away,cc,random()<0.5));
    result.rounds.forEach(round=>applyRoundStats(throwBox,round));totalRounds+=result.h+result.a;
    mapResults.push({map:maps[m],seed:mapSeed,h:result.h,a:result.a,rounds:result.h+result.a});
    rd+=(result.h-result.a); if(result.h>result.a)hM++;else aM++;
  }
  finalizeRatings(throwBox,totalRounds);
  return {h:hM,a:aM,rd,seed,bestOf,totalRounds,box:throwBox,mapResults};
}

/* ---- box score ---- */
