import { draftPair } from './draft.js';
import { playerOVR } from './ratings.js';
import { freshBox, simOneMap } from './round-engine.js';
import { ST } from './state.js';
import { MAPS } from '../data/leagues.js';

export function makeSchedule(n){
  const ids=[...Array(n).keys()];
  if(n%2)ids.push(-1);
  const m=ids.length, rounds=m-1, half=m/2;
  const arr=ids.slice(); const weeks=[];
  for(let r=0;r<rounds;r++){
    const wk=[];
    for(let i=0;i<half;i++){
      const a=arr[i], b=arr[m-1-i];
      if(a!==-1&&b!==-1) wk.push({home:(r%2?b:a),away:(r%2?a:b),played:false,res:null});
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
    return B.rd-A.rd;
  });
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
    const base=(Math.random()*2-1); // -1..1
    const swing = base*10; // ±10
    const mentalGuard = base<0 ? (pl.mental-80)/5 : 0; // high mental reduces bad days
    f[pl.name]=Math.round(swing + mentalGuard);
  });
  return f;
}

export function teamObj(id){return ST.teams.find(t=>t.id===id);}

/* DEV: skip map veto and play a single Ascent map (Bo1). Set false to restore veto/Bo3. */

export function pickMaps(n){const pool=[...MAPS].sort(()=>Math.random()-.5);return pool.slice(0,n);}

export function simRestOfWeek(wi, skipFx){
  ST.schedule[wi].forEach(f=>{
    if(f.played||f===skipFx)return;
    const res=quickSim(teamObj(f.home),teamObj(f.away));
    f.played=true; f.res={hMaps:res.h,aMaps:res.a};
    const H=ST.standings[f.home],A=ST.standings[f.away];
    H.mapW+=res.h;H.mapL+=res.a;A.mapW+=res.a;A.mapL+=res.h;
    H.rd+=res.rd;A.rd-=res.rd;
    if(res.h>res.a){H.w++;A.l++;}else{A.w++;H.l++;}
  });
  if(firstUnplayedWeek()<0)ST.seasonOver=true;
}
/* headless quick sim for background matches — Bo3, same engine, no replay */

export function quickSim(home,away){
  let hM=0,aM=0,rd=0;
  const maps=pickMaps(3);
  const throwBox=freshBox(home,away);
  for(let m=0;m<3&&hM<2&&aM<2;m++){
    const cc=draftPair(home,away,maps[m]);
    const result=simOneMap(home,away,cc,Math.random()<0.5);
    rd+=(result.h-result.a); if(result.h>result.a)hM++;else aM++;
  }
  return {h:hM,a:aM,rd};
}

/* ---- box score ---- */
